package com.tubalhub.messenger

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.*
import org.webrtc.*

class VideoCallActivity : AppCompatActivity() {
    private val auth = FirebaseAuth.getInstance()
    private val db = FirebaseFirestore.getInstance()
    private lateinit var remoteView: SurfaceViewRenderer
    private lateinit var localView: SurfaceViewRenderer
    private lateinit var factory: PeerConnectionFactory
    private lateinit var peer: PeerConnection
    private var localStream: MediaStream? = null
    private var videoCapturer: VideoCapturer? = null
    private var eglBase: EglBase? = null
    private var callListener: ListenerRegistration? = null
    private var callId = ""
    private var isCaller = false
    private var remoteCandidatesSeen = mutableSetOf<String>()
    private var micEnabled = true
    private var cameraEnabled = true

    private val rtcConfig = PeerConnection.RTCConfiguration(listOf(
        PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer(),
        PeerConnection.IceServer.builder("stun:stun1.l.google.com:19302").createIceServer(),
        PeerConnection.IceServer.builder("stun:openrelay.metered.ca:80").createIceServer(),
        PeerConnection.IceServer.builder("turn:openrelay.metered.ca:80").setUsername("openrelayproject").setPassword("openrelayproject").createIceServer(),
        PeerConnection.IceServer.builder("turn:openrelay.metered.ca:443").setUsername("openrelayproject").setPassword("openrelayproject").createIceServer(),
        PeerConnection.IceServer.builder("turn:openrelay.metered.ca:443?transport=tcp").setUsername("openrelayproject").setPassword("openrelayproject").createIceServer(),
        PeerConnection.IceServer.builder("turns:openrelay.metered.ca:443?transport=tcp").setUsername("openrelayproject").setPassword("openrelayproject").createIceServer()
    )).apply { sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_video_call)
        callId = intent.getStringExtra("callId").orEmpty()
        isCaller = intent.getBooleanExtra("isCaller", false)
        if (callId.isBlank() || auth.currentUser == null) { finish(); return }
        remoteView = findViewById(R.id.remoteVideo)
        localView = findViewById(R.id.localVideo)
        findViewById<android.widget.Button>(R.id.endCallButton).setOnClickListener { endCall() }
        findViewById<android.widget.Button>(R.id.muteButton).setOnClickListener { toggleMic() }
        findViewById<android.widget.Button>(R.id.cameraButton).setOnClickListener { toggleCamera() }
        findViewById<android.widget.Button>(R.id.switchCameraButton).setOnClickListener { switchCamera() }
        if (hasMediaPermission()) startCall() else ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO), 4001)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, results: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, results)
        if (requestCode == 4001 && results.all { it == PackageManager.PERMISSION_GRANTED }) startCall() else finish()
    }

    private fun hasMediaPermission() =
        ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED &&
        ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED

    private fun startCall() {
        eglBase = EglBase.create()
        PeerConnectionFactory.initialize(PeerConnectionFactory.InitializationOptions.builder(applicationContext).createInitializationOptions())
        factory = PeerConnectionFactory.builder()
            .setVideoEncoderFactory(DefaultVideoEncoderFactory(eglBase!!.eglBaseContext, true, true))
            .setVideoDecoderFactory(DefaultVideoDecoderFactory(eglBase!!.eglBaseContext))
            .createPeerConnectionFactory()
        remoteView.init(eglBase!!.eglBaseContext, null)
        localView.init(eglBase!!.eglBaseContext, null)
        remoteView.setEnableHardwareScaler(true)
        localView.setEnableHardwareScaler(true)
        localView.setMirror(true)

        val audioTrack = factory.createAudioTrack("audio_" + auth.currentUser!!.uid, factory.createAudioSource(MediaConstraints()))
        videoCapturer = createCameraCapturer()
        val videoSource = factory.createVideoSource(false)
        videoCapturer?.initialize(SurfaceTextureHelper.create("CaptureThread", eglBase!!.eglBaseContext), this, videoSource.capturerObserver)
        videoCapturer?.startCapture(1280, 720, 30)
        val videoTrack = factory.createVideoTrack("video_" + auth.currentUser!!.uid, videoSource)
        videoTrack.addSink(localView)

        localStream = factory.createLocalMediaStream("stream_" + auth.currentUser!!.uid)
        localStream!!.addTrack(audioTrack)
        localStream!!.addTrack(videoTrack)

        peer = factory.createPeerConnection(rtcConfig, object : PeerConnection.Observer {
            override fun onIceCandidate(c: IceCandidate) {
                val data = hashMapOf<String, Any?>("sdpMid" to c.sdpMid, "sdpMLineIndex" to c.sdpMLineIndex, "candidate" to c.sdp)
                val field = if (isCaller) "callerCandidates" else "calleeCandidates"
                db.collection("videoCalls").document(callId).update(field, FieldValue.arrayUnion(data))
            }
            override fun onTrack(t: RtpTransceiver?) {
                val track = t?.receiver?.track()
                if (track is VideoTrack) runOnUiThread { track.addSink(remoteView) }
            }
            override fun onAddTrack(receiver: RtpReceiver?, streams: Array<out MediaStream>?) {
                val track = receiver?.track()
                if (track is VideoTrack) runOnUiThread { track.addSink(remoteView) }
            }
            override fun onAddStream(stream: MediaStream?) { stream?.videoTracks?.firstOrNull()?.addSink(remoteView) }
            override fun onSignalingChange(p0: PeerConnection.SignalingState?) {}
            override fun onIceConnectionChange(p0: PeerConnection.IceConnectionState?) {}
            override fun onIceConnectionReceivingChange(p0: Boolean) {}
            override fun onIceGatheringChange(p0: PeerConnection.IceGatheringState?) {}
            override fun onRemoveStream(p0: MediaStream?) {}
            override fun onDataChannel(p0: DataChannel?) {}
            override fun onRenegotiationNeeded() {}
            override fun onIceCandidatesRemoved(p0: Array<out IceCandidate>?) {}
            override fun onConnectionChange(state: PeerConnection.PeerConnectionState?) {
                if (state == PeerConnection.PeerConnectionState.FAILED || state == PeerConnection.PeerConnectionState.CLOSED) runOnUiThread { finish() }
            }
            override fun onStandardizedIceConnectionChange(p0: PeerConnection.IceConnectionState?) {}
            override fun onSelectedCandidatePairChanged(p0: PeerConnection.CandidatePairChangeEvent?) {}
            override fun onIceCandidateError(p0: PeerConnection.IceCandidateErrorEvent?) {}
        }) ?: run { finish(); return }

        localStream!!.audioTracks.forEach { peer.addTrack(it, listOf(localStream!!.id)) }
        localStream!!.videoTracks.forEach { peer.addTrack(it, listOf(localStream!!.id)) }
        listenToCall()
        if (isCaller) createOffer() else db.collection("videoCalls").document(callId).update("status", "accepted", "updatedAt", FieldValue.serverTimestamp())
    }

    private fun listenToCall() {
        callListener = db.collection("videoCalls").document(callId).addSnapshotListener { snap, error ->
            if (error != null || snap == null || !snap.exists()) return@addSnapshotListener
            if (snap.getString("status") == "ended") { finish(); return@addSnapshotListener }
            val offer = snap.getString("offer")
            val answer = snap.getString("answer")
            if (!isCaller && offer != null && peer.remoteDescription == null) {
                peer.setRemoteDescription(object : SdpObserver {
                    override fun onSetSuccess() { createAnswer() }
                    override fun onCreateSuccess(p0: SessionDescription?) {}
                    override fun onCreateFailure(p0: String?) {}
                    override fun onSetFailure(p0: String?) {}
                }, SessionDescription(SessionDescription.Type.OFFER, offer))
            }
            if (isCaller && answer != null && peer.remoteDescription == null) {
                peer.setRemoteDescription(SimpleSdpObserver(), SessionDescription(SessionDescription.Type.ANSWER, answer))
            }
            val field = if (isCaller) "calleeCandidates" else "callerCandidates"
            (snap.get(field) as? List<*>)?.forEach { raw ->
                val m = raw as? Map<*, *> ?: return@forEach
                val candidate = IceCandidate(m["sdpMid"] as? String, (m["sdpMLineIndex"] as? Number)?.toInt() ?: 0, m["candidate"] as? String ?: return@forEach)
                val key = candidate.sdp
                if (remoteCandidatesSeen.add(key)) peer.addIceCandidate(candidate)
            }
        }
    }

    private fun createOffer() {
        peer.createOffer(object : SimpleSdpObserver() {
            override fun onCreateSuccess(desc: SessionDescription) {
                peer.setLocalDescription(SimpleSdpObserver { 
                    db.collection("videoCalls").document(callId).update(mapOf("offer" to desc.description, "status" to "ringing", "updatedAt" to FieldValue.serverTimestamp()))
                }, desc)
            }
        }, MediaConstraints())
    }

    private fun createAnswer() {
        peer.createAnswer(object : SimpleSdpObserver() {
            override fun onCreateSuccess(desc: SessionDescription) {
                peer.setLocalDescription(SimpleSdpObserver {
                    db.collection("videoCalls").document(callId).update(mapOf("answer" to desc.description, "status" to "accepted", "updatedAt" to FieldValue.serverTimestamp()))
                }, desc)
            }
        }, MediaConstraints())
    }

    private fun createCameraCapturer(): VideoCapturer? {
        val e = Camera2Enumerator(this)
        e.deviceNames.forEach { if (e.isFrontFacing(it)) e.createCapturer(it, null)?.let { c -> return c } }
        e.deviceNames.forEach { e.createCapturer(it, null)?.let { c -> return c } }
        return null
    }

    private fun toggleMic() {
        localStream?.audioTracks?.forEach { it.setEnabled(!it.enabled) }
        micEnabled = !micEnabled
        findViewById<android.widget.Button>(R.id.muteButton).text = if (micEnabled) "Mute" else "Unmute"
    }

    private fun toggleCamera() {
        localStream?.videoTracks?.forEach { it.setEnabled(!it.enabled) }
        cameraEnabled = !cameraEnabled
        findViewById<android.widget.Button>(R.id.cameraButton).text = if (cameraEnabled) "Camera" else "Show"
    }

    private fun switchCamera() { (videoCapturer as? CameraVideoCapturer)?.switchCamera(null) }

    private fun endCall() {
        db.collection("videoCalls").document(callId).update(mapOf("status" to "ended", "updatedAt" to FieldValue.serverTimestamp()))
        finish()
    }

    override fun onDestroy() {
        callListener?.remove()
        runCatching { videoCapturer?.stopCapture() }
        videoCapturer?.dispose()
        localStream?.dispose()
        if (::peer.isInitialized) peer.dispose()
        if (::remoteView.isInitialized) remoteView.release()
        if (::localView.isInitialized) localView.release()
        eglBase?.release()
        if (::factory.isInitialized) factory.dispose()
        super.onDestroy()
    }

    private class SimpleSdpObserver(private val success: (() -> Unit)? = null) : SdpObserver {
        override fun onCreateSuccess(p0: SessionDescription?) {}
        override fun onSetSuccess() { success?.invoke() }
        override fun onCreateFailure(p0: String?) {}
        override fun onSetFailure(p0: String?) {}
    }
}
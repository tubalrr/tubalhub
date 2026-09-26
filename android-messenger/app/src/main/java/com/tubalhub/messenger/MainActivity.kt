package com.tubalhub.messenger

import android.os.Bundle
import android.content.Intent
import androidx.appcompat.app.AlertDialog
import android.Manifest
import android.content.pm.PackageManager
import android.view.Gravity
import android.widget.*
import android.util.Log
import androidx.lifecycle.lifecycleScope
import androidx.credentials.CredentialManager
import androidx.credentials.Credential
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.GoogleAuthProvider
import kotlinx.coroutines.launch
import android.graphics.Typeface
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.View
import android.view.animation.AlphaAnimation
import java.util.HashMap
import androidx.appcompat.app.AppCompatActivity
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.messaging.FirebaseMessaging
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.UpdateAvailability

class MainActivity : AppCompatActivity() {
    private val auth by lazy { FirebaseAuth.getInstance() }
    private val db by lazy { FirebaseFirestore.getInstance() }
    private val root by lazy { LinearLayout(this) }
    private var selectedUid: String? = null
    private var selectedName = "Member"
    private var stopMessages: com.google.firebase.firestore.ListenerRegistration? = null
    private var messageBox: LinearLayout? = null
    private var messageInput: EditText? = null
    private var videoCallButton: Button? = null
    private var incomingCallListener: com.google.firebase.firestore.ListenerRegistration? = null
    private var replyToId: String? = null
    private var replyToText: String? = null
    private var replyToName: String? = null
    private var stopTyping: com.google.firebase.firestore.ListenerRegistration? = null
    private var typingOffRunnable: Runnable? = null
    private var pinnedMessageId: String? = null
    private var typingLabel: TextView? = null
    private var pinnedLabel: TextView? = null
    private lateinit var appUpdateManager: AppUpdateManager
    private val updateRequestCode = 1216

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        root.orientation = LinearLayout.VERTICAL
        root.setPadding(20, 48, 20, 18)
        root.setBackgroundColor(0xFF03100D.toInt())
        window.statusBarColor = 0xFF03100D.toInt()
        window.navigationBarColor = 0xFF020807.toInt()
        appUpdateManager = AppUpdateManagerFactory.create(this)
        checkForPlayStoreUpdate()
        if (auth.currentUser == null) showLogin() else showMessenger()
        if (android.os.Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1001)
        }
    }

    private fun checkForPlayStoreUpdate() {
        appUpdateManager.appUpdateInfo
            .addOnSuccessListener { info ->
                val available = info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
                val allowed = info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)
                if (available && allowed) {
                    appUpdateManager.startUpdateFlowForResult(
                        info,
                        AppUpdateType.IMMEDIATE,
                        this,
                        updateRequestCode
                    )
                }
            }
            .addOnFailureListener { Log.d("TUBAL_HUB_UPDATE", "Play update check unavailable", it) }
    }

    override fun onResume() {
        super.onResume()
        if (::appUpdateManager.isInitialized) {
            appUpdateManager.appUpdateInfo.addOnSuccessListener { info ->
                if (info.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS) {
                    appUpdateManager.startUpdateFlowForResult(
                        info,
                        AppUpdateType.IMMEDIATE,
                        this,
                        updateRequestCode
                    )
                }
            }
        }
    }

    private fun showLogin() {
        root.removeAllViews()
        root.setPadding(20, 48, 20, 20)

        val scroll = ScrollView(this)
        val page = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(4, 12, 4, 20)
        }

        val logo = TextView(this).apply {
            text = "TH"
            textSize = 30f
            gravity = Gravity.CENTER
            setTextColor(0xFF9DFFE0.toInt())
            typeface = Typeface.DEFAULT_BOLD
            background = rounded(0xFF0D4034.toInt(), 70f)
        }
        page.addView(logo, LinearLayout.LayoutParams(86, 86).apply { bottomMargin = 18 })

        val heading = TextView(this).apply {
            text = "TUBAL HUB"
            textSize = 28f
            gravity = Gravity.CENTER
            setTextColor(0xFFF0FFF8.toInt())
            typeface = Typeface.DEFAULT_BOLD
        }
        page.addView(heading)

        val sub = TextView(this).apply {
            text = "Messenger"
            textSize = 21f
            gravity = Gravity.CENTER
            setTextColor(0xFF36E6A3.toInt())
            typeface = Typeface.DEFAULT_BOLD
        }
        page.addView(sub)

        page.addView(text("Connect • Chat • Share • Together").apply {
            gravity = Gravity.CENTER
            setTextColor(0xFFA9BDB6.toInt())
            setPadding(0, 4, 0, 26)
        })

        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(18, 20, 18, 20)
            background = rounded(0xFF0A1D18.toInt(), 26f)
        }

        val email = input("Email", false)
        val password = input("Password", true)
        val login = button("LOGIN").apply {
            background = rounded(0xFF19D98B.toInt(), 18f)
            setTextColor(0xFF03100D.toInt())
            typeface = Typeface.DEFAULT_BOLD
        }
        val google = button("CONTINUE WITH GOOGLE").apply {
            background = rounded(0xFF172A25.toInt(), 18f)
            setTextColor(0xFFEAF7F0.toInt())
        }
        val status = text("").apply {
            gravity = Gravity.CENTER
            setPadding(6, 12, 6, 2)
            setTextColor(0xFFFFB4AB.toInt())
        }

        card.addView(email)
        card.addView(password, LinearLayout.LayoutParams(-1, -2).apply { topMargin = 8 })
        card.addView(login, LinearLayout.LayoutParams(-1, 54).apply { topMargin = 18 })
        card.addView(google, LinearLayout.LayoutParams(-1, 54).apply { topMargin = 10 })
        card.addView(status)

        page.addView(card, LinearLayout.LayoutParams(-1, -2))
        page.addView(text("Sign in using your existing TUBAL HUB account.").apply {
            gravity = Gravity.CENTER
            setTextColor(0xFF78918A.toInt())
            textSize = 12f
            setPadding(8, 18, 8, 8)
        })

        login.setOnClickListener {
            login.isEnabled = false
            google.isEnabled = false
            status.text = "Signing in…"
            auth.signInWithEmailAndPassword(email.text.toString().trim(), password.text.toString())
                .addOnSuccessListener { showMessenger() }
                .addOnFailureListener { e ->
                    status.text = when (e) {
                        is com.google.firebase.auth.FirebaseAuthInvalidCredentialsException -> "Incorrect email or password."
                        is com.google.firebase.auth.FirebaseAuthInvalidUserException -> "Account not found or disabled."
                        else -> e.localizedMessage ?: "Login failed."
                    }
                    login.isEnabled = true
                    google.isEnabled = true
                }
        }
        google.setOnClickListener {
            login.isEnabled = false
            google.isEnabled = false
            status.text = "Opening Google sign-in…"
            signInWithGoogle(status, login, google)
        }

        scroll.addView(page)
        root.addView(scroll, LinearLayout.LayoutParams(-1, -1))
        setContentView(root)
    }

    private fun signInWithGoogle(status: TextView, login: Button, google: Button) {
        val credentialManager = CredentialManager.create(this)
        val googleIdOption = GetGoogleIdOption.Builder()
            .setServerClientId(getString(com.tubalhub.messenger.R.string.default_web_client_id))
            .setFilterByAuthorizedAccounts(false)
            .setAutoSelectEnabled(false)
            .build()
        val request = GetCredentialRequest.Builder()
            .addCredentialOption(googleIdOption)
            .build()

        lifecycleScope.launch {
            try {
                val result = credentialManager.getCredential(this@MainActivity, request)
                val credential: Credential = result.credential
                if (credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                    val googleCredential = GoogleIdTokenCredential.createFrom(credential.data)
                    val firebaseCredential = GoogleAuthProvider.getCredential(googleCredential.idToken, null)
                    auth.signInWithCredential(firebaseCredential)
                        .addOnSuccessListener { showMessenger() }
                        .addOnFailureListener { e ->
                            status.text = "Google sign-in failed: " + (e.localizedMessage ?: "Invalid credential.")
                            login.isEnabled = true
                            google.isEnabled = true
                        }
                } else {
                    status.text = "Google account credential was not recognized."
                    login.isEnabled = true
                    google.isEnabled = true
                }
            } catch (e: Exception) {
                Log.e("TUBAL_HUB_AUTH", "Google sign-in failed", e)
                val detail = e.message?.trim().orEmpty()
                status.text = if (detail.isNotEmpty()) {
                    "Google sign-in error: " + detail
                } else {
                    "Google sign-in failed. Check Google provider, SHA-1, and google-services.json."
                }
                login.isEnabled = true
                google.isEnabled = true
            }
        }
    }

    private fun showMessenger() {
        root.removeAllViews()
        root.setPadding(16, 42, 16, 12)
        val me = auth.currentUser ?: return showLogin()

        val scroll = ScrollView(this)
        val page = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(4, 8, 4, 18)
        }

        val header = LinearLayout(this).apply {
            gravity = Gravity.CENTER_VERTICAL
        }
        val logo = TextView(this).apply {
            text = "TH"
            textSize = 20f
            gravity = Gravity.CENTER
            setTextColor(0xFF9DFFE0.toInt())
            typeface = Typeface.DEFAULT_BOLD
            background = rounded(0xFF0D4034.toInt(), 50f)
        }
        header.addView(logo, LinearLayout.LayoutParams(58, 58))
        val brand = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(14, 0, 8, 0)
        }
        brand.addView(TextView(this).apply {
            text = "TUBAL HUB"
            textSize = 20f
            setTextColor(0xFFF0FFF8.toInt())
            typeface = Typeface.DEFAULT_BOLD
        })
        brand.addView(TextView(this).apply {
            text = "Messenger"
            textSize = 17f
            setTextColor(0xFF36E6A3.toInt())
            typeface = Typeface.DEFAULT_BOLD
        })
        header.addView(brand, LinearLayout.LayoutParams(0, -2, 1f))
        val logout = button("LOG OUT").apply {
            background = rounded(0xFF172A25.toInt(), 16f)
            setTextColor(0xFFEAF7F0.toInt())
        }
        header.addView(logout, LinearLayout.LayoutParams(-2, 50))
        page.addView(header)

        val identityCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(18, 16, 18, 16)
            background = rounded(0xFF0A1D18.toInt(), 24f)
        }
        val identity = me.displayName ?: me.email ?: "Member"
        identityCard.addView(text(identity).apply {
            textSize = 20f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(0xFFF0FFF8.toInt())
            setPadding(0, 0, 0, 2)
        })
        identityCard.addView(text("● Online").apply {
            textSize = 14f
            setTextColor(0xFF36E6A3.toInt())
            setPadding(0, 0, 0, 0)
        })
        page.addView(identityCard, LinearLayout.LayoutParams(-1, -2).apply { topMargin = 16 })

        val tabs = LinearLayout(this).apply {
            background = rounded(0xFF0A1D18.toInt(), 22f)
            setPadding(6, 6, 6, 6)
        }
        listOf("CHATS", "MEMBERS", "CALLS", "MORE").forEachIndexed { index, label ->
            val b = button(label).apply {
                textSize = 12f
                setTextColor(if (index == 0) 0xFF03100D.toInt() else 0xFFB8C9C2.toInt())
                background = rounded(if (index == 0) 0xFF19D98B.toInt() else 0x00172A25, 16f)
            }
            tabs.addView(b, LinearLayout.LayoutParams(0, 48, 1f))
        }
        page.addView(tabs, LinearLayout.LayoutParams(-1, -2).apply { topMargin = 14 })

        val meUid = me.uid
        registerFcmToken(meUid)
        listenForIncomingCalls(meUid)
        logout.setOnClickListener { stopMessages?.remove(); auth.signOut(); showLogin() }

        db.collection("users").document(me.uid).set(
            mapOf(
                "uid" to me.uid,
                "displayName" to (me.displayName ?: me.email?.substringBefore("@") ?: "Member"),
                "email" to (me.email ?: ""),
                "photoURL" to (me.photoUrl?.toString() ?: "")
            ),
            com.google.firebase.firestore.SetOptions.merge()
        )

        val usersTitle = text("Members").apply {
            textSize = 19f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(0xFFF0FFF8.toInt())
            setPadding(4, 18, 4, 10)
        }
        page.addView(usersTitle)

        val users = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }
        val usersScroll = ScrollView(this)
        usersScroll.addView(users)
        page.addView(usersScroll, LinearLayout.LayoutParams(-1, 230))

        db.collection("users").get().addOnSuccessListener { snap ->
            users.removeAllViews()
            snap.documents.forEach { doc ->
                if (doc.id == me.uid) return@forEach
                val name = doc.getString("displayName") ?: doc.getString("email")?.substringBefore("@") ?: "Member"
                val row = button("●   " + name).apply {
                    gravity = Gravity.CENTER_VERTICAL
                    setTextColor(0xFFEAF7F0.toInt())
                    background = rounded(0xFF10241F.toInt(), 18f)
                    setPadding(18, 0, 18, 0)
                }
                row.setOnClickListener { openChat(doc.id, name) }
                users.addView(row, LinearLayout.LayoutParams(-1, 54).apply { bottomMargin = 8 })
            }
            if (users.childCount == 0) users.addView(text("No other members found."))
        }.addOnFailureListener { users.addView(text("Could not load members.")) }

        val chatHeader = LinearLayout(this).apply {
            gravity = Gravity.CENTER_VERTICAL
        }
        val chatTitle = text("Private Chat").apply {
            textSize = 19f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(0xFFF0FFF8.toInt())
            setPadding(4, 8, 4, 8)
        }
        chatHeader.addView(chatTitle, LinearLayout.LayoutParams(0, -2, 1f))
        videoCallButton = button("VIDEO CALL").apply {
            background = rounded(0xFF172A25.toInt(), 16f)
            setTextColor(0xFFEAF7F0.toInt())
            isEnabled = false
        }
        videoCallButton!!.setOnClickListener { startVideoCall() }
        chatHeader.addView(videoCallButton, LinearLayout.LayoutParams(-2, 48))
        page.addView(chatHeader)

        val pinnedView = text("").apply {
            textSize = 11f
            setTextColor(0xFF9DFFE0.toInt())
            visibility = View.GONE
            setPadding(12, 6, 12, 6)
        }
        pinnedLabel = pinnedView
        page.addView(pinnedView, LinearLayout.LayoutParams(-1, -2))

        messageBox = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(4, 4, 4, 4)
        }
        val typingView = text("").apply {
            textSize = 11f
            setTextColor(0xFF55A8FF.toInt())
            visibility = View.GONE
        }
        typingLabel = typingView
        page.addView(typingView, LinearLayout.LayoutParams(-1, 30))

        val replyBar = text("").apply {
            textSize = 11f
            setTextColor(0xFF9DFFE0.toInt())
            visibility = View.GONE
            setOnClickListener { clearReply() }
        }
        page.addView(replyBar, LinearLayout.LayoutParams(-1, 36))

        val chatScroll = ScrollView(this).apply {
            background = rounded(0xFF061611.toInt(), 20f)
            setPadding(8, 8, 8, 8)
        }
        chatScroll.addView(messageBox)
        page.addView(chatScroll, LinearLayout.LayoutParams(-1, 420).apply { bottomMargin = 10 })

        val composer = LinearLayout(this).apply {
            gravity = Gravity.CENTER_VERTICAL
            setPadding(8, 4, 8, 4)
            background = rounded(0xFF10241F.toInt(), 24f)
        }
        messageInput = input("Type a message…", false).apply {
            background = null
            setPadding(10, 0, 8, 0)
        }
        composer.addView(messageInput, LinearLayout.LayoutParams(0, 56, 1f))
        val send = button("➤").apply {
            textSize = 22f
            background = rounded(0xFF19D98B.toInt(), 50f)
            setTextColor(0xFF03100D.toInt())
            typeface = Typeface.DEFAULT_BOLD
        }
        composer.addView(send, LinearLayout.LayoutParams(56, 56))
        page.addView(composer)

        messageInput?.setOnFocusChangeListener { _, hasFocus -> if (!hasFocus) setTyping(false) }
        messageInput?.addTextChangedListener(object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) { if (s?.isNotEmpty() == true) setTyping(true) }
            override fun afterTextChanged(s: android.text.Editable?) = Unit
        })
        send.setOnClickListener { sendMessage() }

        scroll.addView(page)
        root.addView(scroll, LinearLayout.LayoutParams(-1, -1))
        setContentView(root)
    }

    private fun registerFcmToken(uid: String) {
        FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
            db.collection("users").document(uid).set(
                mapOf("fcmToken" to token),
                com.google.firebase.firestore.SetOptions.merge()
            )
        }
    }

    private fun openChat(uid: String, name: String) {
        selectedUid = uid
        selectedName = name
        videoCallButton?.isEnabled = true
        messageBox?.removeAllViews()
        messageBox?.addView(text("Chat with " + name))
        subscribeMessages()
        subscribeTyping()
    }

    private fun startVideoCall() {
        val me = auth.currentUser ?: return
        val target = selectedUid ?: return toast("Select a member first.")
        val callRef = db.collection("videoCalls").document()
        val data = mapOf(
            "callerId" to me.uid,
            "calleeId" to target,
            "callerName" to (me.displayName ?: me.email?.substringBefore("@") ?: "Member"),
            "callerPhotoURL" to (me.photoUrl?.toString() ?: ""),
            "calleeName" to selectedName,
            "media" to "video",
            "status" to "ringing",
            "createdAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
            "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
            "callerCandidates" to emptyList<Any>(),
            "calleeCandidates" to emptyList<Any>()
        )
        callRef.set(data).addOnSuccessListener {
            startActivity(Intent(this, VideoCallActivity::class.java).apply {
                putExtra("callId", callRef.id)
                putExtra("isCaller", true)
            })
        }.addOnFailureListener { e -> toast(e.localizedMessage ?: "Could not start call.") }
    }

    private fun listenForIncomingCalls(uid: String) {
        incomingCallListener?.remove()
        incomingCallListener = db.collection("videoCalls")
            .whereEqualTo("calleeId", uid)
            .whereEqualTo("status", "ringing")
            .limit(1)
            .addSnapshotListener { snap, error ->
                if (error != null || snap == null || snap.isEmpty) return@addSnapshotListener
                val call = snap.documents.first()
                val callerName = call.getString("callerName") ?: "Member"
                AlertDialog.Builder(this)
                    .setTitle("Incoming video call")
                    .setMessage(callerName + " is calling you.")
                    .setPositiveButton("Accept") { _, _ ->
                        startActivity(Intent(this, VideoCallActivity::class.java).apply {
                            putExtra("callId", call.id)
                            putExtra("isCaller", false)
                        })
                    }
                    .setNegativeButton("Decline") { _, _ ->
                        call.reference.update(
                            mapOf("status" to "ended", "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp())
                        )
                    }
                    .setOnCancelListener { }
                    .show()
            }
    }

    private fun subscribeMessages() {
        stopMessages?.remove()
        val me = auth.currentUser ?: return
        val target = selectedUid ?: return
        stopMessages = db.collection("messages")
            .whereArrayContains("participants", me.uid)
            .limit(200)
            .addSnapshotListener { snap, err ->
                if (err != null || snap == null) return@addSnapshotListener
                val items = snap.documents
                    .filter { (it.get("participants") as? List<*>)?.contains(target) == true }
                    .sortedBy { it.getTimestamp("createdAt")?.toDate()?.time ?: 0L }
                items.filter { it.getString("receiverId") == me.uid && it.getTimestamp("seenAt") == null }.forEach { markMessageSeen(it.id) }
                loadReactionSummary(items)
            }
    }

    private fun loadReactionSummary(items: List<com.google.firebase.firestore.DocumentSnapshot>) {
        val me = auth.currentUser ?: return
        messageBox?.removeAllViews()
        if (items.isEmpty()) {
            messageBox?.addView(text("No messages yet."))
            return
        }

        val ids = items.map { it.id }
        val chunks = ids.chunked(30)
        val allReactions = mutableListOf<com.google.firebase.firestore.DocumentSnapshot>()
        var completed = 0

        chunks.forEach { chunk ->
            db.collection("messageReactions")
                .whereIn("messageId", chunk)
                .get()
                .addOnSuccessListener { snap ->
                    allReactions.addAll(snap.documents)
                    completed++
                    if (completed == chunks.size) renderMessages(items, allReactions, me.uid)
                }
                .addOnFailureListener {
                    completed++
                    if (completed == chunks.size) renderMessages(items, allReactions, me.uid)
                }
        }
    }

    private fun renderMessages(
        items: List<com.google.firebase.firestore.DocumentSnapshot>,
        reactions: List<com.google.firebase.firestore.DocumentSnapshot>,
        myUid: String
    ) {
        val counts = mutableMapOf<String, MutableMap<String, Int>>()
        val mine = mutableMapOf<String, String>()
        reactions.forEach { r ->
            val messageId = r.getString("messageId") ?: return@forEach
            val emoji = r.getString("reaction") ?: return@forEach
            val byEmoji = counts.getOrPut(messageId) { mutableMapOf() }
            byEmoji[emoji] = (byEmoji[emoji] ?: 0) + 1
            if (r.getString("uid") == myUid) mine[messageId] = emoji
        }

        messageBox?.removeAllViews()
        val pinned = items.firstOrNull { it.getBoolean("pinnedReal") == true }
        pinnedLabel?.apply {
            if (pinned != null) {
                visibility = View.VISIBLE
                text = "📌 Pinned: " + (pinned.getString("text") ?: "Message")
            } else visibility = View.GONE
        }
        items.forEach {
            val messageId = it.id
            val sender = if (it.getString("senderId") == myUid) "You" else selectedName
            val card = LinearLayout(this)
            card.orientation = LinearLayout.VERTICAL
            card.setPadding(8, 4, 8, 8)
            val messageText = it.getString("text") ?: ""
            val isMine = it.getString("senderId") == myUid
            card.setOnLongClickListener {
                showMessageActions(messageId, messageText, isMine)
                true
            }

            val replyPreview = it.get("replyTo") as? Map<*, *>
            if (replyPreview != null) {
                val preview = text("↩ " + (replyPreview["name"] ?: "Member") + ": " + (replyPreview["preview"] ?: ""))
                preview.textSize = 11f
                preview.setTextColor(0xFF8EB7E8.toInt())
                card.addView(preview)
            }
            val msg = text(sender + ": " + messageText + if (it.getBoolean("editedReal") == true) "  (edited)" else "")
            msg.setTypeface(null, Typeface.NORMAL)
            card.addView(msg)

            val reactionsReal = it.get("reactionsReal") as? Map<*, *> ?: emptyMap<String, Any>()
            if (reactionsReal.isNotEmpty()) {
                val liveCounts = reactionsReal.values.groupingBy { value -> value.toString() }.eachCount()
                val reactionSummary = text(liveCounts.entries.joinToString("  ") { entry -> entry.key + " " + entry.value })
                reactionSummary.textSize = 13f
                card.addView(reactionSummary)
            }

            val summary = counts[messageId]
                ?.filterValues { count -> count > 0 }
                ?.entries
                ?.joinToString("  ") { entry -> entry.key + " " + entry.value }
                ?: ""
            if (summary.isNotEmpty()) {
                val reactionSummary = text(summary)
                reactionSummary.textSize = 13f
                card.addView(reactionSummary)
            }

            val created = it.getTimestamp("createdAt")?.toDate()?.time ?: 0L
            val sentByMe = it.getString("senderId") == myUid
            val status = if (!sentByMe) "" else when {
                it.getTimestamp("seenAt") != null -> "  ✓✓ SEEN"
                it.getTimestamp("deliveredAt") != null -> "  ✓✓ DELIVERED"
                else -> "  ✓ SENT"
            }
            card.addView(text(if (created > 0L) android.text.format.DateFormat.format("hh:mm a", java.util.Date(created)).toString() + status else status).apply {
                textSize = 9f
                setTextColor(if (status.contains("SEEN")) 0xFF55A8FF.toInt() else 0xFF8EA69A.toInt())
            })

            val reactionsRow = LinearLayout(this)
            reactionsRow.orientation = LinearLayout.HORIZONTAL
            listOf("😂", "❤️", "🔥", "😮", "😢").forEach { emoji ->
                val b = Button(this)
                b.text = if (mine[messageId] == emoji) "✓$emoji" else emoji
                b.setPadding(6, 0, 6, 0)
                b.setOnClickListener { reactToMessage(messageId, emoji) }
                reactionsRow.addView(b, LinearLayout.LayoutParams(0, -2, 1f))
            }
            card.addView(reactionsRow)
            messageBox?.addView(card)
        }
    }

    private fun reactToMessage(messageId: String, emoji: String) {
        val me = auth.currentUser ?: return
        val id = messageId + "_" + me.uid
        val ref = db.collection("messageReactions").document(id)
        ref.get().addOnSuccessListener { existing ->
            if (existing.exists() && existing.getString("reaction") == emoji) {
                ref.delete().addOnFailureListener { e -> toast(e.localizedMessage ?: "Reaction failed.") }
                return@addOnSuccessListener
            }

            val target = selectedUid ?: return@addOnSuccessListener
            ref.set(
                mapOf(
                    "messageId" to messageId,
                    "uid" to me.uid,
                    "reaction" to emoji,
                    "participants" to listOf(me.uid, target),
                    "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                )
            ).addOnFailureListener { e -> toast(e.localizedMessage ?: "Reaction failed.") }
        }.addOnFailureListener { e ->
            toast(e.localizedMessage ?: "Reaction failed.")
        }
    }

    private fun showMessageActions(messageId: String, messageText: String, mine: Boolean) {
        val actions = mutableListOf("Reply", "React", "Pin")
        if (mine) {
            actions.add("Edit")
            actions.add("Delete")
        }
        AlertDialog.Builder(this)
            .setTitle("Message")
            .setItems(actions.toTypedArray()) { _, which ->
                when (actions[which]) {
                    "Reply" -> startReply(messageId, messageText)
                    "React" -> showReactionPicker(messageId)
                    "Pin" -> pinMessage(messageId)
                    "Edit" -> editMessage(messageId, messageText)
                    "Delete" -> deleteMessage(messageId)
                }
            }
            .show()
    }

    private fun startReply(messageId: String, messageText: String) {
        replyToId = messageId
        replyToText = messageText
        replyToName = selectedName
        messageInput?.hint = "Replying: " + messageText.take(45)
        messageInput?.requestFocus()
    }

    private fun showReactionPicker(messageId: String) {
        val emojis = arrayOf("😂", "❤️", "🔥", "😮", "😢")
        AlertDialog.Builder(this)
            .setTitle("React")
            .setItems(emojis) { _, which -> reactToMessage(messageId, emojis[which]) }
            .show()
    }

    private fun editMessage(messageId: String, oldText: String) {
        val edit = input("Message", false)
        edit.setText(oldText)
        edit.setSelection(edit.text.length)
        AlertDialog.Builder(this)
            .setTitle("Edit message")
            .setView(edit)
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Save") { _, _ ->
                val newText = edit.text.toString().trim()
                if (newText.isEmpty()) {
                    toast("Message cannot be empty.")
                    return@setPositiveButton
                }
                if (newText.length > 500) {
                    toast("Message is limited to 500 characters.")
                    return@setPositiveButton
                }
                val ref = db.collection("messages").document(messageId)
                ref.get().addOnSuccessListener { snap ->
                    val created = snap.getTimestamp("createdAt")?.toDate()?.time ?: 0L
                    if (created > 0L && System.currentTimeMillis() - created > 10 * 60 * 1000) {
                        toast("Edit is only available within 10 minutes.")
                        return@addOnSuccessListener
                    }
                    val history = (snap.get("editHistoryReal") as? List<*>)?.toMutableList() ?: mutableListOf()
                    history.add(mapOf("text" to (snap.getString("text") ?: ""), "editedAt" to com.google.firebase.firestore.Timestamp.now()))
                    ref.update(mapOf("text" to newText, "textReal" to newText, "editedReal" to true, "editedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(), "editHistoryReal" to history.takeLast(10)))
                }.addOnFailureListener { e -> toast(e.localizedMessage ?: "Edit failed.") }
            }
            .show()
    }

    private fun deleteMessage(messageId: String) {
        AlertDialog.Builder(this)
            .setTitle("Delete message?")
            .setMessage("This message will be removed from the chat.")
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Delete") { _, _ ->
                val ref = db.collection("messages").document(messageId)
                ref.get().addOnSuccessListener { snap ->
                    val created = snap.getTimestamp("createdAt")?.toDate()?.time ?: 0L
                    if (created > 0L && System.currentTimeMillis() - created > 10 * 60 * 1000) {
                        toast("Unsend is only available within 10 minutes.")
                        return@addOnSuccessListener
                    }
                    ref.update(mapOf("deletedReal" to true, "deletedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(), "text" to "", "textReal" to "", "type" to "deleted", "fileNameReal" to ""))
                }.addOnFailureListener { e -> toast(e.localizedMessage ?: "Delete failed.") }
            }
            .show()
    }

    private fun sendMessage() {
        val me = auth.currentUser ?: return
        val target = selectedUid ?: return toast("Select a member first.")
        val body = messageInput?.text?.toString()?.trim().orEmpty()
        if (body.isEmpty()) return
        if (body.length > 500) return toast("Message is limited to 500 characters.")

        db.collection("messages").add(
            mapOf(
                "uid" to me.uid,
                "senderId" to me.uid,
                "receiverId" to target,
                "participants" to listOf(me.uid, target),
                "displayName" to (me.displayName ?: me.email?.substringBefore("@") ?: "Member"),
                "senderPhotoURL" to (me.photoUrl?.toString() ?: ""),
                "text" to body,
                "textReal" to body,
                "fileNameReal" to "",
                "type" to "text",
                "createdAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
                "deliveredAt" to null,
                "seenAt" to null,
                "reactionsReal" to emptyMap<String, String>(),
                "pinnedReal" to false,
                "replyTo" to if (replyToId != null) mapOf("messageId" to replyToId, "name" to (replyToName ?: "Member"), "preview" to (replyToText ?: "")) else null
            )
        ).addOnSuccessListener {
            messageInput?.setText("")
            messageInput?.hint = "Message…"
            clearReply()
            setTyping(false)
        }
            .addOnFailureListener { e -> toast(e.localizedMessage ?: "Send failed.") }
    }

    private fun clearReply() {
        replyToId = null
        replyToText = null
        replyToName = null
        messageInput?.hint = "Type a message…"
    }

    private fun markMessageSeen(messageId: String) {
        val me = auth.currentUser ?: return
        val ref = db.collection("messages").document(messageId)
        ref.update(
            mapOf(
                "deliveredAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
                "seenAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
            )
        ).addOnFailureListener { Log.d("TUBAL_HUB_CHAT", "seen update blocked", it) }
    }

    private fun setTyping(typing: Boolean) {
        val me = auth.currentUser ?: return
        val target = selectedUid ?: return
        val id = me.uid + "_" + target
        db.collection("typing").document(id).set(
            mapOf(
                "senderId" to me.uid,
                "receiverId" to target,
                "participants" to listOf(me.uid, target),
                "typing" to typing,
                "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
            ),
            com.google.firebase.firestore.SetOptions.merge()
        )
    }

    private fun subscribeTyping() {
        stopTyping?.remove()
        val me = auth.currentUser ?: return
        val target = selectedUid ?: return
        stopTyping = db.collection("typing").document(target + "_" + me.uid)
            .addSnapshotListener { snap, _ ->
                val label = findTypingLabel()
                val data = snap?.data
                val fresh = data?.getBoolean("typing") == true
                if (fresh) {
                    label.visibility = View.VISIBLE
                    label.text = selectedName + " is typing...  •••"
                    label.startAnimation(AlphaAnimation(0.45f, 1f).apply { duration = 650; repeatCount = AlphaAnimation.INFINITE; repeatMode = AlphaAnimation.REVERSE })
                } else {
                    label.clearAnimation()
                    label.visibility = View.GONE
                }
            }
    }

    private fun findTypingLabel(): TextView = typingLabel ?: TextView(this).also { typingLabel = it }

    private fun pinMessage(messageId: String) {
        db.collection("messages").document(messageId).update(
            mapOf("pinnedReal" to true, "pinnedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(), "pinnedBy" to auth.currentUser?.uid)
        ).addOnSuccessListener { pinnedMessageId = messageId }.addOnFailureListener { toast(it.localizedMessage ?: "Pin failed.") }
    }

    private fun rounded(color: Int, radius: Float): GradientDrawable =
        GradientDrawable().apply {
            setColor(color)
            cornerRadius = radius
        }

    private fun title(s: String) {
        val v = text(s)
        v.textSize = 28f
        v.gravity = Gravity.CENTER
        root.addView(v)
    }

    private fun text(s: String): TextView = TextView(this).apply {
        text = s
        textSize = 15f
        setTextColor(0xFFEAF7F0.toInt())
        setPadding(10, 12, 10, 12)
    }

    private fun input(hint: String, password: Boolean): EditText = EditText(this).apply {
        this.hint = hint
        setTextColor(0xFFFFFFFF.toInt())
        setHintTextColor(0xFF8EA69A.toInt())
        background = rounded(0xFF10241F.toInt(), 14f)
        setPadding(14, 0, 14, 0)
        if (password) {
            inputType = android.text.InputType.TYPE_CLASS_TEXT or
                android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD
        }
    }

    private fun button(label: String): Button = Button(this).apply {
        text = label
        isAllCaps = false
        minHeight = 0
        minWidth = 0
        stateListAnimator = null
    }

    private fun toast(s: String) = Toast.makeText(this, s, Toast.LENGTH_SHORT).show()

    override fun onDestroy() {
        stopMessages?.remove()
        incomingCallListener?.remove()
        stopTyping?.remove()
        super.onDestroy()
    }
}
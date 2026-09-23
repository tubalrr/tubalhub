package com.tubalhub.messenger

import android.os.Bundle
import android.content.Intent
import androidx.appcompat.app.AlertDialog
import android.Manifest
import android.content.pm.PackageManager
import android.view.Gravity
import android.widget.*
import android.graphics.Typeface
import androidx.appcompat.app.AppCompatActivity
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.messaging.FirebaseMessaging
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        root.orientation = LinearLayout.VERTICAL
        root.setPadding(28, 28, 28, 28)
        root.setBackgroundColor(0xFF020807.toInt())
        if (auth.currentUser == null) showLogin() else showMessenger()
        if (android.os.Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1001)
        }
    }

    private fun showLogin() {
        root.removeAllViews()
        title("TUBAL HUB Messenger")
        root.addView(text("Sign in using your existing TUBAL HUB account."))
        val email = input("Email", false)
        val password = input("Password", true)
        val login = button("LOGIN")
        val status = text("")
        root.addView(email); root.addView(password); root.addView(login); root.addView(status)
        login.setOnClickListener {
            login.isEnabled = false
            status.text = "Signing in…"
            auth.signInWithEmailAndPassword(email.text.toString().trim(), password.text.toString())
                .addOnSuccessListener { showMessenger() }
                .addOnFailureListener { e ->
                    status.text = e.localizedMessage ?: "Login failed."
                    login.isEnabled = true
                }
        }
        setContentView(root)
    }

    private fun showMessenger() {
        root.removeAllViews()
        val me = auth.currentUser ?: return showLogin()
        val header = LinearLayout(this)
        val heading = text("TUBAL HUB Messenger")
        heading.textSize = 22f
        header.addView(heading, LinearLayout.LayoutParams(0, -2, 1f))
        val logout = button("LOG OUT")
        header.addView(logout)
        root.addView(header)
        val identity = me.displayName ?: me.email ?: "Member"
        root.addView(text("Signed in as " + identity))
        registerFcmToken(me.uid)
        listenForIncomingCalls(me.uid)
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

        val usersTitle = text("Members")
        usersTitle.textSize = 18f
        root.addView(usersTitle)
        val users = LinearLayout(this)
        users.orientation = LinearLayout.VERTICAL
        val usersScroll = ScrollView(this)
        usersScroll.addView(users)
        root.addView(usersScroll, LinearLayout.LayoutParams(-1, 0, 0.32f))

        db.collection("users").get().addOnSuccessListener { snap ->
            users.removeAllViews()
            snap.documents.forEach { doc ->
                if (doc.id == me.uid) return@forEach
                val name = doc.getString("displayName") ?: doc.getString("email")?.substringBefore("@") ?: "Member"
                val row = button(name)
                row.setOnClickListener { openChat(doc.id, name) }
                users.addView(row)
            }
            if (users.childCount == 0) users.addView(text("No other members found."))
        }.addOnFailureListener { users.addView(text("Could not load members.")) }

        val chatHeader = LinearLayout(this)
        val chatTitle = text("Private Chat")
        chatTitle.textSize = 18f
        chatHeader.addView(chatTitle, LinearLayout.LayoutParams(0, -2, 1f))
        videoCallButton = button("VIDEO CALL")
        videoCallButton!!.isEnabled = false
        videoCallButton!!.setOnClickListener { startVideoCall() }
        chatHeader.addView(videoCallButton)
        root.addView(chatHeader)
        messageBox = LinearLayout(this)
        messageBox!!.orientation = LinearLayout.VERTICAL
        val chatScroll = ScrollView(this)
        chatScroll.addView(messageBox)
        root.addView(chatScroll, LinearLayout.LayoutParams(-1, 0, 0.55f))

        val composer = LinearLayout(this)
        messageInput = input("Message…", false)
        composer.addView(messageInput, LinearLayout.LayoutParams(0, -2, 1f))
        val send = button("SEND")
        composer.addView(send)
        root.addView(composer)
        send.setOnClickListener { sendMessage() }
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
        items.forEach {
            val messageId = it.id
            val sender = if (it.getString("senderId") == myUid) "You" else selectedName
            val card = LinearLayout(this)
            card.orientation = LinearLayout.VERTICAL
            card.setPadding(8, 4, 8, 8)

            val msg = text(sender + ": " + (it.getString("text") ?: ""))
            msg.setTypeface(null, Typeface.NORMAL)
            card.addView(msg)

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

            val reactionsRow = LinearLayout(this)
            reactionsRow.orientation = LinearLayout.HORIZONTAL
            listOf("👍", "❤️", "😂", "😮", "😢", "😡").forEach { emoji ->
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
                "type" to "text",
                "createdAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
            )
        ).addOnSuccessListener { messageInput?.setText("") }
            .addOnFailureListener { e -> toast(e.localizedMessage ?: "Send failed.") }
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
        if (password) {
            inputType = android.text.InputType.TYPE_CLASS_TEXT or
                android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD
        }
    }

    private fun button(label: String): Button = Button(this).apply {
        text = label
        isAllCaps = false
    }

    private fun toast(s: String) = Toast.makeText(this, s, Toast.LENGTH_SHORT).show()

    override fun onDestroy() {
        stopMessages?.remove()
        incomingCallListener?.remove()
        super.onDestroy()
    }
}
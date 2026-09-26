package com.tubalhub.messenger

// Messenger self-update pipeline release trigger

import android.os.Bundle
import android.net.Uri
import android.provider.Settings
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
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
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import java.util.concurrent.TimeUnit
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
import com.google.firebase.Timestamp
import com.google.firebase.messaging.FirebaseMessaging
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import org.json.JSONObject

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
    private val updateManifestUrl = "https://raw.githubusercontent.com/tubalrr/tubalhub/messenger-apk/version.json"
    private var updateDialog: AlertDialog? = null
    private var phoneVerificationId: String? = null
    private var phoneResendingToken: PhoneAuthProvider.ForceResendingToken? = null
    private var selectedGroupId: String? = null
    private var selectedGroupName = "Group"
    private var stopGroupMessages: com.google.firebase.firestore.ListenerRegistration? = null
    private var groupListView: LinearLayout? = null
    private var groupAdminButton: Button? = null
    private var chatTitleView: TextView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        root.orientation = LinearLayout.VERTICAL
        root.setPadding(20, 48, 20, 18)
        root.setBackgroundColor(0xFF03100D.toInt())
        window.statusBarColor = 0xFF03100D.toInt()
        window.navigationBarColor = 0xFF020807.toInt()
        checkForSelfUpdate()
        if (auth.currentUser == null) showLogin() else showMessenger()
        if (android.os.Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1001)
        }
    }

    private fun checkForSelfUpdate() {
        Thread {
            try {
                val connection = URL(updateManifestUrl + "?v=" + System.currentTimeMillis()).openConnection() as HttpURLConnection
                connection.connectTimeout = 8000
                connection.readTimeout = 8000
                connection.setRequestProperty("Cache-Control", "no-cache, no-store")
                connection.setRequestProperty("Pragma", "no-cache")
                connection.requestMethod = "GET"
                val body = connection.inputStream.bufferedReader().use { it.readText() }
                connection.disconnect()
                val json = JSONObject(body)
                val product = json.optString("product", "")
                val manifestType = json.optString("manifestType", "")
                if (product != "TUBAL HUB Messenger" || manifestType != "android-apk") {
                    throw IllegalStateException("Wrong update manifest")
                }
                val latestVersionCode = json.optInt("versionCode", BuildConfig.VERSION_CODE)
                val latestVersionName = json.optString("versionName", BuildConfig.VERSION_NAME)
                val apkUrl = "https://github.com/tubalrr/tubalhub/releases/download/v" + latestVersionName + "/TUBAL-HUB-Messenger-release.apk"
                val notes = if (json.opt("notes") is org.json.JSONArray) {
                    val array = json.optJSONArray("notes")
                    buildString {
                        for (i in 0 until (array?.length() ?: 0)) {
                            val item = array?.optString(i)?.trim().orEmpty()
                            if (item.isNotBlank()) append("• ").append(item).append("\n")
                        }
                    }.trim()
                } else {
                    json.optString("notes", "New TUBAL HUB Messenger update is available.")
                }
                if (latestVersionCode > BuildConfig.VERSION_CODE && apkUrl.isNotBlank()) {
                    val releaseReady = isReleaseApkReady(apkUrl, latestVersionName)
                    if (!releaseReady) {
                        Log.d("TUBAL_HUB_UPDATE", "Manifest is newer, but its GitHub Release APK is not published yet.")
                        return@Thread
                    }
                    val prefs = getSharedPreferences("tubalhub_update", MODE_PRIVATE)
                    val alreadyShown = prefs.getInt("prompted_version_code", -1) == latestVersionCode
                    if (!alreadyShown) {
                        prefs.edit().putInt("prompted_version_code", latestVersionCode).apply()
                        runOnUiThread { showSelfUpdateDialog(latestVersionName, apkUrl, notes) }
                    }
                }
            } catch (e: Exception) {
                Log.d("TUBAL_HUB_UPDATE", "Self-update check skipped", e)
            }
        }.start()
    }

    private fun isReleaseApkReady(apkUrl: String, versionName: String): Boolean {
        return try {
            if (!apkUrl.contains("/releases/download/v$versionName/TUBAL-HUB-Messenger-release.apk")) {
                return false
            }
            val connection = URL(apkUrl).openConnection() as HttpURLConnection
            connection.connectTimeout = 10000
            connection.readTimeout = 10000
            connection.instanceFollowRedirects = true
            connection.requestMethod = "HEAD"
            connection.connect()
            val ready = connection.responseCode in 200..299
            connection.disconnect()
            ready
        } catch (e: Exception) {
            Log.d("TUBAL_HUB_UPDATE", "Release readiness check failed", e)
            false
        }
    }

    private fun showSelfUpdateDialog(versionName: String, apkUrl: String, notes: String) {
        if (isFinishing) return
        updateDialog?.dismiss()
        updateDialog = AlertDialog.Builder(this)
            .setTitle("TUBAL HUB Messenger • Update available")
            .setMessage("Version " + versionName + " is ready.\n\n" + notes + "\n\nDownload the APK and install it. Android may ask you to allow installs from this source.")
            .setNegativeButton("Later", null)
            .setPositiveButton("Download & Install") { _, _ -> downloadAndInstallUpdate(apkUrl) }
            .create()
        updateDialog?.show()
    }

    private fun downloadAndInstallUpdate(apkUrl: String) {
        Toast.makeText(this, "Downloading update…", Toast.LENGTH_LONG).show()
        Thread {
            try {
                val connection = URL(apkUrl).openConnection() as HttpURLConnection
                connection.connectTimeout = 15000
                connection.readTimeout = 30000
                connection.instanceFollowRedirects = true
                connection.requestMethod = "GET"
                connection.connect()
                if (connection.responseCode !in 200..299) throw IllegalStateException("HTTP " + connection.responseCode)
                val dir = File(cacheDir, "updates").apply { mkdirs() }
                val apkFile = File(dir, "TUBAL-HUB-Messenger-update.apk")
                connection.inputStream.use { input -> apkFile.outputStream().use { output -> input.copyTo(output, 8192) } }
                connection.disconnect()
                runOnUiThread { installDownloadedApk(apkFile) }
            } catch (e: Exception) {
                Log.e("TUBAL_HUB_UPDATE", "Update download failed", e)
                runOnUiThread { Toast.makeText(this, "Update download failed: " + (e.localizedMessage ?: "Check your internet connection."), Toast.LENGTH_LONG).show() }
            }
        }.start()
    }

    private fun installDownloadedApk(apkFile: File) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O && !packageManager.canRequestPackageInstalls()) {
            AlertDialog.Builder(this)
                .setTitle("Allow APK installation")
                .setMessage("Android needs permission to install TUBAL HUB Messenger updates from this source.")
                .setNegativeButton("Cancel", null)
                .setPositiveButton("Open Settings") { _, _ -> startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + packageName))) }
                .show()
            return
        }
        val apkUri = FileProvider.getUriForFile(this, packageName + ".fileprovider", apkFile)
        startActivity(Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(apkUri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        })
    }

    private fun showLogin() {
        root.removeAllViews()
        root.setPadding(0, 0, 0, 0)
        root.setBackground(
            GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(0xFF020907.toInt(), 0xFF062019.toInt(), 0xFF020B08.toInt())
            )
        )

        window.statusBarColor = 0xFF020907.toInt()
        window.navigationBarColor = 0xFF020907.toInt()

        val scroll = ScrollView(this).apply {
            setFillViewport(true)
            isVerticalScrollBarEnabled = false
            overScrollMode = View.OVER_SCROLL_NEVER
        }

        val page = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(18, 22, 18, 30)
        }

        fun spacer(height: Int) = Space(this).apply {
            layoutParams = LinearLayout.LayoutParams(1, height)
        }

        fun gradientBackground(vararg colors: Int, radius: Float = 22f): GradientDrawable =
            GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                colors
            ).apply {
                cornerRadius = radius
            }

        fun glass(radius: Float = 22f, fill: Int = 0xCC081713.toInt()): GradientDrawable =
            GradientDrawable().apply {
                setColor(fill)
                cornerRadius = radius
                setStroke(1, 0x337DFFB4)
            }

        fun sectionLabel(title: String, subtitle: String? = null): LinearLayout {
            val box = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(2, 0, 2, 0)
            }
            box.addView(text(title).apply {
                textSize = 10.5f
                typeface = Typeface.create("sans-serif", Typeface.BOLD)
                setTextColor(0xFF7DFFB4.toInt())
                setPadding(2, 0, 2, 4)
                letterSpacing = 0.12f
            })
            if (!subtitle.isNullOrBlank()) {
                box.addView(text(subtitle).apply {
                    textSize = 12f
                    setTextColor(0xFF8DA89E.toInt())
                    setPadding(2, 0, 2, 7)
                })
            }
            return box
        }

        fun makeFieldLabel(label: String) = text(label).apply {
            textSize = 10.5f
            typeface = Typeface.create("sans-serif", Typeface.BOLD)
            setTextColor(0xFF6F8A80.toInt())
            setPadding(2, 0, 2, 6)
            letterSpacing = 0.08f
        }

        fun styleField(field: EditText) {
            field.background = GradientDrawable().apply {
                setColor(0xFF0B1B16.toInt())
                cornerRadius = 15f
                setStroke(1, 0x2F84B39B)
            }
            field.setPadding(16, 0, 16, 0)
            field.setOnFocusChangeListener { view, hasFocus ->
                (view as EditText).background = GradientDrawable().apply {
                    setColor(0xFF0B1B16.toInt())
                    cornerRadius = 15f
                    setStroke(2, if (hasFocus) 0xFF7DFFB4.toInt() else 0x2F84B39B)
                }
            }
        }

        fun makeDivider(): LinearLayout {
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
            }
            row.addView(View(this).apply {
                setBackgroundColor(0x223D5A50)
            }, LinearLayout.LayoutParams(0, 1, 1f))
            row.addView(text("OR").apply {
                gravity = Gravity.CENTER
                textSize = 10f
                typeface = Typeface.create("sans-serif", Typeface.BOLD)
                setTextColor(0xFF5E776D.toInt())
                setPadding(12, 0, 12, 0)
                letterSpacing = 0.18f
            })
            row.addView(View(this).apply {
                setBackgroundColor(0x223D5A50)
            }, LinearLayout.LayoutParams(0, 1, 1f))
            return row
        }

        val topBadge = TextView(this).apply {
            text = "TUBAL HUB  •  MESSENGER"
            textSize = 10f
            gravity = Gravity.CENTER
            typeface = Typeface.create("sans-serif", Typeface.BOLD)
            setTextColor(0xFF9EF8C1.toInt())
            background = rounded(0x221C5D43, 30f)
            setPadding(16, 8, 16, 8)
            letterSpacing = 0.11f
        }
        page.addView(topBadge, LinearLayout.LayoutParams(-2, -2).apply { topMargin = 2; bottomMargin = 16 })

        val brandMark = TextView(this).apply {
            text = "TH"
            textSize = 28f
            gravity = Gravity.CENTER
            setTextColor(0xFF04130D.toInt())
            typeface = Typeface.create("sans-serif", Typeface.BOLD)
            background = gradientBackground(0xFFB7FFD0.toInt(), 0xFF7DFFB4.toInt(), radius = 28f)
            elevation = 12f
        }
        page.addView(brandMark, LinearLayout.LayoutParams(76, 76).apply { bottomMargin = 15 })

        page.addView(text("Welcome back").apply {
            textSize = 31f
            gravity = Gravity.CENTER
            typeface = Typeface.create("sans-serif", Typeface.BOLD)
            setTextColor(0xFFF3FFF8.toInt())
            setPadding(0, 0, 0, 3)
        })

        page.addView(text("One account. All your conversations.").apply {
            textSize = 14f
            gravity = Gravity.CENTER
            setTextColor(0xFF91AAA0.toInt())
            setPadding(0, 0, 0, 20)
        })

        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(20, 20, 20, 20)
            background = glass(26f, 0xE3071511.toInt())
            elevation = 14f
        }

        val accountHeader = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 0, 0, 10)
        }

        val accountIcon = TextView(this).apply {
            text = "✦"
            textSize = 18f
            gravity = Gravity.CENTER
            setTextColor(0xFF072317.toInt())
            background = rounded(0xFF7DFFB4.toInt(), 14f)
        }
        accountHeader.addView(accountIcon, LinearLayout.LayoutParams(42, 42).apply { rightMargin = 12 })

        accountHeader.addView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(text("Sign in securely").apply {
                textSize = 15f
                typeface = Typeface.create("sans-serif", Typeface.BOLD)
                setTextColor(0xFFF1FFF7.toInt())
                setPadding(0, 0, 0, 2)
            })
            addView(text("Choose how you want to continue").apply {
                textSize = 11.5f
                setTextColor(0xFF78928A.toInt())
                setPadding(0, 0, 0, 0)
            })
        }, LinearLayout.LayoutParams(0, -2, 1f))

        card.addView(accountHeader)

        val emailSection = sectionLabel("EMAIL ACCOUNT", "Use your TUBAL HUB account credentials.")
        card.addView(emailSection)

        val emailLabel = makeFieldLabel("EMAIL ADDRESS")
        card.addView(emailLabel)

        val email = input("you@example.com", false).apply {
            setSingleLine(true)
            inputType = android.text.InputType.TYPE_CLASS_TEXT or
                android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
        }
        styleField(email)
        card.addView(email, LinearLayout.LayoutParams(-1, 56))

        card.addView(makeFieldLabel("PASSWORD"), LinearLayout.LayoutParams(-1, -2).apply { topMargin = 14 })

        val password = input("Enter your password", true).apply {
            setSingleLine(true)
        }
        styleField(password)
        card.addView(password, LinearLayout.LayoutParams(-1, 56))

        val login = button("Sign in with Email").apply {
            textSize = 15f
            background = gradientBackground(0xFFB7FFD0.toInt(), 0xFF7DFFB4.toInt(), radius = 16f)
            setTextColor(0xFF03120B.toInt())
            typeface = Typeface.create("sans-serif", Typeface.BOLD)
            elevation = 6f
        }
        card.addView(login, LinearLayout.LayoutParams(-1, 56).apply { topMargin = 16 })

        card.addView(makeDivider(), LinearLayout.LayoutParams(-1, 26).apply { topMargin = 14; bottomMargin = 8 })

        val google = button("Continue with Google").apply {
            textSize = 15f
            background = rounded(0xFFF9FCFA.toInt(), 16f)
            setTextColor(0xFF17211D.toInt())
            typeface = Typeface.create("sans-serif", Typeface.BOLD)
            elevation = 4f
        }
        card.addView(google, LinearLayout.LayoutParams(-1, 54))

        val guest = button("Continue as Guest").apply {
            textSize = 14f
            background = GradientDrawable().apply {
                setColor(0x00101F1A)
                cornerRadius = 16f
                setStroke(1, 0x557DFFB4)
            }
            setTextColor(0xFFCDEEDB.toInt())
            typeface = Typeface.create("sans-serif", Typeface.BOLD)
        }
        card.addView(guest, LinearLayout.LayoutParams(-1, 52).apply { topMargin = 10 })

        val phoneCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16, 16, 16, 16)
            background = GradientDrawable().apply {
                setColor(0x331C5744)
                cornerRadius = 20f
                setStroke(1, 0x2E7DFFB4)
            }
        }

        val phoneHeader = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        val phoneIcon = TextView(this).apply {
            text = "☎"
            textSize = 16f
            gravity = Gravity.CENTER
            setTextColor(0xFF052016.toInt())
            background = rounded(0xFF9FE8C0.toInt(), 13f)
        }
        phoneHeader.addView(phoneIcon, LinearLayout.LayoutParams(40, 40).apply { rightMargin = 10 })

        phoneHeader.addView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(text("Phone sign-in").apply {
                textSize = 14f
                typeface = Typeface.create("sans-serif", Typeface.BOLD)
                setTextColor(0xFFE8FFF1.toInt())
                setPadding(0, 0, 0, 1)
            })
            addView(text("One-time SMS verification").apply {
                textSize = 11.5f
                setTextColor(0xFF76968A.toInt())
                setPadding(0, 0, 0, 0)
            })
        }, LinearLayout.LayoutParams(0, -2, 1f))

        phoneCard.addView(phoneHeader)

        phoneCard.addView(makeFieldLabel("MOBILE NUMBER"), LinearLayout.LayoutParams(-1, -2).apply { topMargin = 14 })

        val phone = input("+63 9XX XXX XXXX", false).apply {
            inputType = android.text.InputType.TYPE_CLASS_PHONE
            setSingleLine(true)
        }
        styleField(phone)
        phoneCard.addView(phone, LinearLayout.LayoutParams(-1, 54))

        val sendCode = button("Send SMS Code").apply {
            textSize = 14f
            background = rounded(0xFF173B2D.toInt(), 15f)
            setTextColor(0xFF7DFFB4.toInt())
            typeface = Typeface.create("sans-serif", Typeface.BOLD)
        }
        phoneCard.addView(sendCode, LinearLayout.LayoutParams(-1, 50).apply { topMargin = 10 })

        val code = input("6-digit verification code", false).apply {
            inputType = android.text.InputType.TYPE_CLASS_NUMBER
            setSingleLine(true)
        }
        styleField(code)
        phoneCard.addView(code, LinearLayout.LayoutParams(-1, 54).apply { topMargin = 10 })

        val verifyCode = button("Verify & Sign In").apply {
            textSize = 14f
            background = gradientBackground(0xFFA9F6C7.toInt(), 0xFF7DFFB4.toInt(), radius = 14f)
            setTextColor(0xFF04130D.toInt())
            typeface = Typeface.create("sans-serif", Typeface.BOLD)
        }
        phoneCard.addView(verifyCode, LinearLayout.LayoutParams(-1, 50).apply { topMargin = 10 })

        val phoneStatus = text("").apply {
            textSize = 11.5f
            setPadding(3, 8, 3, 0)
            setTextColor(0xFF8FAEA3.toInt())
        }
        phoneCard.addView(phoneStatus)

        code.visibility = View.GONE
        verifyCode.visibility = View.GONE
        card.addView(phoneCard, LinearLayout.LayoutParams(-1, -2).apply { topMargin = 16 })

        val status = text("").apply {
            gravity = Gravity.CENTER
            textSize = 12f
            setPadding(8, 14, 8, 0)
            setTextColor(0xFFFFA3A3.toInt())
        }
        card.addView(status)

        page.addView(card, LinearLayout.LayoutParams(-1, -2))

        val trustRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            setPadding(8, 12, 8, 4)
        }
        trustRow.addView(text("◇").apply {
            textSize = 13f
            setTextColor(0xFF7DFFB4.toInt())
            setPadding(0, 0, 5, 0)
        })
        trustRow.addView(text("Private sign-in • Your account is authenticated securely").apply {
            textSize = 11f
            gravity = Gravity.CENTER
            setTextColor(0xFF617E73.toInt())
            setPadding(0, 0, 0, 0)
        })
        page.addView(trustRow)

        page.addView(text("New here? Create your account on the TUBAL HUB website.").apply {
            gravity = Gravity.CENTER
            textSize = 11.5f
            setTextColor(0xFF536D63.toInt())
            setPadding(12, 10, 12, 4)
        })

        fun setBusy(busy: Boolean) {
            login.isEnabled = !busy
            google.isEnabled = !busy
            guest.isEnabled = !busy
        }

        login.setOnClickListener {
            val eMail = email.text.toString().trim()
            val pass = password.text.toString()
            if (eMail.isEmpty() || pass.isEmpty()) {
                status.setTextColor(0xFFFFA3A3.toInt())
                status.text = "Enter your email and password."
                return@setOnClickListener
            }
            setBusy(true)
            status.setTextColor(0xFF9FE8C0.toInt())
            status.text = "Signing in…"
            auth.signInWithEmailAndPassword(eMail, pass)
                .addOnSuccessListener { showMessenger() }
                .addOnFailureListener { error ->
                    status.setTextColor(0xFFFFA3A3.toInt())
                    status.text = nativeAuthError(error)
                    setBusy(false)
                }
        }

        google.setOnClickListener {
            setBusy(true)
            status.setTextColor(0xFF9FE8C0.toInt())
            status.text = "Choose your Google account…"
            signInWithGoogle(status, login, google)
        }

        guest.setOnClickListener {
            setBusy(true)
            status.setTextColor(0xFF9FE8C0.toInt())
            status.text = "Signing in as Guest…"
            auth.signInAnonymously()
                .addOnSuccessListener { showMessenger() }
                .addOnFailureListener { error ->
                    status.setTextColor(0xFFFFA3A3.toInt())
                    status.text = nativeAuthError(error)
                    setBusy(false)
                }
        }

        sendCode.setOnClickListener {
            val number = phone.text.toString().trim()
            if (number.isEmpty()) {
                phoneStatus.setTextColor(0xFFFFA3A3.toInt())
                phoneStatus.text = "Enter your phone number first."
                return@setOnClickListener
            }
            sendCode.isEnabled = false
            phoneStatus.setTextColor(0xFF9FE8C0.toInt())
            phoneStatus.text = "Sending SMS code…"
            startPhoneVerification(number, phoneStatus, sendCode, code, verifyCode)
        }

        verifyCode.setOnClickListener {
            val verificationId = phoneVerificationId
            val smsCode = code.text.toString().trim()
            if (verificationId.isNullOrBlank()) {
                phoneStatus.setTextColor(0xFFFFA3A3.toInt())
                phoneStatus.text = "Send the verification code first."
                return@setOnClickListener
            }
            if (smsCode.length != 6) {
                phoneStatus.setTextColor(0xFFFFA3A3.toInt())
                phoneStatus.text = "Enter the 6-digit verification code."
                return@setOnClickListener
            }
            verifyCode.isEnabled = false
            phoneStatus.setTextColor(0xFF9FE8C0.toInt())
            phoneStatus.text = "Verifying code…"
            val credential = PhoneAuthProvider.getCredential(verificationId, smsCode)
            auth.signInWithCredential(credential)
                .addOnSuccessListener { showMessenger() }
                .addOnFailureListener { error ->
                    phoneStatus.setTextColor(0xFFFFA3A3.toInt())
                    phoneStatus.text = nativeAuthError(error)
                    verifyCode.isEnabled = true
                }
        }

        scroll.addView(page)
        root.addView(scroll, LinearLayout.LayoutParams(-1, -1))
        setContentView(root)
    }

    private fun startPhoneVerification(
        phoneNumber: String,
        status: TextView,
        sendButton: Button,
        codeInput: EditText,
        verifyButton: Button
    ) {
        val callbacks = object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
            override fun onVerificationCompleted(credential: PhoneAuthCredential) {
                status.setTextColor(0xFFAEBBB2.toInt())
                status.text = "Phone verified. Signing in…"
                auth.signInWithCredential(credential)
                    .addOnSuccessListener { showMessenger() }
                    .addOnFailureListener { error ->
                        status.setTextColor(0xFFFF8D8D.toInt())
                        status.text = nativeAuthError(error)
                        sendButton.isEnabled = true
                    }
            }

            override fun onVerificationFailed(e: com.google.firebase.FirebaseException) {
                status.setTextColor(0xFFFF8D8D.toInt())
                status.text = nativeAuthError(e)
                sendButton.isEnabled = true
            }

            override fun onCodeSent(
                verificationId: String,
                token: PhoneAuthProvider.ForceResendingToken
            ) {
                phoneVerificationId = verificationId
                phoneResendingToken = token
                codeInput.visibility = View.VISIBLE
                verifyButton.visibility = View.VISIBLE
                status.setTextColor(0xFF39FF88.toInt())
                status.text = "Verification code sent by SMS."
                sendButton.isEnabled = true
            }
        }

        val options = PhoneAuthOptions.newBuilder(auth)
            .setPhoneNumber(phoneNumber)
            .setTimeout(60L, TimeUnit.SECONDS)
            .setActivity(this)
            .setCallbacks(callbacks)
            .build()

        PhoneAuthProvider.verifyPhoneNumber(options)
    }

    private fun nativeAuthError(error: Exception): String {
        return when ((error as? com.google.firebase.auth.FirebaseAuthException)?.errorCode) {
            "ERROR_INVALID_EMAIL" -> "Please enter a valid email address."
            "ERROR_INVALID_CREDENTIAL" -> "Incorrect email or password."
            "ERROR_USER_NOT_FOUND" -> "Account not found or disabled."
            "ERROR_WRONG_PASSWORD" -> "Incorrect email or password."
            "ERROR_TOO_MANY_REQUESTS" -> "Too many attempts. Please try again later."
            "ERROR_OPERATION_NOT_ALLOWED" -> "This sign-in method is not enabled in Firebase."
            "ERROR_INVALID_PHONE_NUMBER" -> "Enter a valid phone number with country code, e.g. +63..."
            "ERROR_QUOTA_EXCEEDED" -> "SMS quota reached. Please try again later."
            "ERROR_SESSION_EXPIRED" -> "The verification session expired. Send a new SMS code."
            "ERROR_INVALID_VERIFICATION_CODE" -> "The verification code is invalid."
            "ERROR_MISSING_PHONE_NUMBER" -> "Enter your phone number first."
            else -> error.localizedMessage ?: "Authentication failed. Please try again."
        }
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
        logout.setOnClickListener {
            db.collection("presence").document(me.uid).set(
                mapOf(
                    "online" to false,
                    "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                ),
                com.google.firebase.firestore.SetOptions.merge()
            )
            stopMessages?.remove()
            stopGroupMessages?.remove()
            auth.signOut()
            showLogin()
        }

        val memberName = me.displayName ?: me.email?.substringBefore("@") ?: "Member"
        val memberPhoto = me.photoUrl?.toString() ?: ""

        db.collection("users").document(me.uid).set(
            mapOf(
                "uid" to me.uid,
                "displayName" to memberName,
                "username" to usernameForMember(memberName, me.email),
                "email" to (me.email ?: ""),
                "photoURL" to memberPhoto
            ),
            com.google.firebase.firestore.SetOptions.merge()
        )

        // Public-safe Messenger directory/presence. This avoids exposing private
        // user documents and lets the web Messenger resolve members directly.
        db.collection("presence").document(me.uid).set(
            mapOf(
                "uid" to me.uid,
                "displayName" to memberName,
                "photoURL" to memberPhoto,
                "online" to true,
                "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
            ),
            com.google.firebase.firestore.SetOptions.merge()
        )


        val groupsTitle = text("Groups").apply {
            textSize = 19f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(0xFFF0FFF8.toInt())
            setPadding(4, 18, 4, 10)
        }
        page.addView(groupsTitle)

        val groupActions = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        val createGroup = button("+ Create Group").apply {
            textSize = 12f
            background = rounded(0xFF19D98B.toInt(), 16f)
            setTextColor(0xFF03100D.toInt())
            typeface = Typeface.DEFAULT_BOLD
        }
        val joinGroup = button("Join by Invite").apply {
            textSize = 12f
            background = GradientDrawable().apply {
                setColor(0x00172A25)
                cornerRadius = 16f
                setStroke(1, 0x557DFFB4)
            }
            setTextColor(0xFFBFEFCE.toInt())
        }
        groupActions.addView(createGroup, LinearLayout.LayoutParams(0, 48, 1f).apply { rightMargin = 6 })
        groupActions.addView(joinGroup, LinearLayout.LayoutParams(0, 48, 1f).apply { leftMargin = 6 })
        page.addView(groupActions)

        val groupList = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }
        groupListView = groupList
        val groupScroll = ScrollView(this).apply {
            isVerticalScrollBarEnabled = false
            background = rounded(0xFF061611.toInt(), 20f)
            setPadding(8, 8, 8, 8)
        }
        groupScroll.addView(groupList)
        page.addView(groupScroll, LinearLayout.LayoutParams(-1, 230).apply { topMargin = 10 })

        createGroup.setOnClickListener { showCreateGroupDialog() }
        joinGroup.setOnClickListener { showJoinGroupDialog() }
        loadGroups(groupList, me.uid)

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

        // Use the public-safe presence directory instead of private users/.
        // Firestore rules intentionally allow members to read presence but not
        // other users' private profile documents.
        db.collection("presence").get().addOnSuccessListener { snap ->
            users.removeAllViews()
            snap.documents.forEach { doc ->
                if (doc.id == me.uid) return@forEach
                val name = doc.getString("displayName") ?: "Member"
                val row = button("●   " + name).apply {
                    gravity = Gravity.CENTER_VERTICAL
                    setTextColor(0xFFEAF7F0.toInt())
                    background = rounded(0xFF10241F.toInt(), 18f)
                    setPadding(18, 0, 18, 0)
                }
                row.setOnClickListener { openChat(doc.id, name) }
                users.addView(row, LinearLayout.LayoutParams(-1, 54).apply { bottomMargin = 8 })
            }
            if (users.childCount == 0) users.addView(text("No other members found yet."))
        }.addOnFailureListener {
            users.removeAllViews()
            users.addView(text("Could not load the Messenger directory."))
        }

        val chatHeader = LinearLayout(this).apply {
            gravity = Gravity.CENTER_VERTICAL
        }
        val chatTitle = text("Select a chat").apply {
            also { chatTitleView = it }
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
        groupAdminButton = button("GROUP").apply {
            background = rounded(0xFF173B2D.toInt(), 16f)
            setTextColor(0xFF9DFFE0.toInt())
            visibility = View.GONE
        }
        groupAdminButton!!.setOnClickListener {
            selectedGroupId?.let { showGroupAdminDialog(it) }
        }
        chatHeader.addView(groupAdminButton, LinearLayout.LayoutParams(-2, 48).apply { leftMargin = 6 })
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
        selectedGroupId = null
        selectedGroupName = "Group"
        stopGroupMessages?.remove()
        selectedUid = uid
        selectedName = name
        chatTitleView?.text = "Private Chat • " + name
        groupAdminButton?.visibility = View.GONE
        videoCallButton?.visibility = View.VISIBLE
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
                    history.add(mapOf("text" to (snap.getString("text") ?: ""), "editedAt" to Timestamp.now()))
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

    private fun usernameForMember(displayName: String, email: String?): String {
        val base = displayName.ifBlank { email?.substringBefore("@").orEmpty() }
            .lowercase()
            .replace(Regex("[^a-z0-9_]+"), "_")
            .trim('_')
        return if (base.isBlank()) "member" else base.take(24)
    }

    private fun groupAvatar(name: String, seed: Int): TextView {
        val colors = intArrayOf(
            0xFF7DFFB4.toInt(), 0xFF4DD7FF.toInt(), 0xFFA783FF.toInt(),
            0xFFFFB86B.toInt(), 0xFFFF78B7.toInt()
        )
        val a = colors[Math.floorMod(seed, colors.size)]
        val b = colors[Math.floorMod(seed / 7 + 2, colors.size)]
        return TextView(this).apply {
            text = name.trim().take(2).uppercase()
            textSize = 13f
            gravity = Gravity.CENTER
            typeface = Typeface.create("sans-serif", Typeface.BOLD)
            setTextColor(0xFF04130D.toInt())
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(a, b)
            ).apply { cornerRadius = 18f }
        }
    }

    private fun loadGroups(container: LinearLayout, uid: String) {
        db.collection("groups").whereArrayContains("memberIds", uid).get()
            .addOnSuccessListener { snap ->
                container.removeAllViews()
                val docs = snap.documents.sortedByDescending {
                    it.getTimestamp("updatedAt")?.toDate()?.time ?: 0L
                }
                if (docs.isEmpty()) {
                    container.addView(text("No groups yet. Create one or join with an invite link.").apply {
                        textSize = 12f
                        setTextColor(0xFF6F8B80.toInt())
                    })
                    return@addOnSuccessListener
                }
                docs.forEach { doc ->
                    val name = doc.getString("name")?.trim().orEmpty().ifBlank { "Untitled Group" }
                    val description = doc.getString("description")?.trim().orEmpty()
                    val count = doc.getLong("memberCount")?.toInt()
                        ?: (doc.get("memberIds") as? List<*>)?.size ?: 0
                    val seed = doc.getLong("avatarSeed")?.toInt() ?: name.hashCode()
                    val row = LinearLayout(this).apply {
                        orientation = LinearLayout.HORIZONTAL
                        gravity = Gravity.CENTER_VERTICAL
                        setPadding(10, 8, 10, 8)
                        background = rounded(0xFF10241F.toInt(), 18f)
                    }
                    row.addView(groupAvatar(name, seed), LinearLayout.LayoutParams(52, 52).apply { rightMargin = 12 })
                    val info = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
                    info.addView(text(name).apply {
                        textSize = 14.5f; typeface = Typeface.DEFAULT_BOLD
                        setTextColor(0xFFF0FFF8.toInt()); setPadding(0, 0, 0, 2)
                    })
                    val subtitle = if (description.isBlank()) count.toString() + " members"
                    else count.toString() + " members • " + description
                    info.addView(text(subtitle).apply {
                        textSize = 10.5f; setTextColor(0xFF78948A.toInt())
                        setPadding(0, 0, 0, 0); maxLines = 2
                        ellipsize = android.text.TextUtils.TruncateAt.END
                    })
                    row.addView(info, LinearLayout.LayoutParams(0, -2, 1f))
                    row.setOnClickListener { openGroupChat(doc.id, name) }
                    container.addView(row, LinearLayout.LayoutParams(-1, 68).apply { bottomMargin = 8 })
                }
            }
            .addOnFailureListener {
                container.removeAllViews()
                container.addView(text("Could not load groups. Please try again."))
            }
    }

    private fun showCreateGroupDialog() {
        val me = auth.currentUser ?: return showLogin()
        val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(8, 4, 8, 0) }
        val nameInput = input("Group name", false).apply { setSingleLine(true) }
        val descInput = input("Description (optional)", false).apply { setSingleLine(false); minLines = 2 }
        layout.addView(nameInput, LinearLayout.LayoutParams(-1, 56).apply { bottomMargin = 10 })
        layout.addView(descInput, LinearLayout.LayoutParams(-1, 78).apply { bottomMargin = 10 })
        val selectedIds = mutableListOf<String>()
        val selectButton = button("Select members • 0/49").apply {
            background = rounded(0xFF173B2D.toInt(), 14f); setTextColor(0xFF9DFFE0.toInt()); textSize = 13f
        }
        layout.addView(selectButton, LinearLayout.LayoutParams(-1, 50))
        val dialog = AlertDialog.Builder(this)
            .setTitle("Create Group")
            .setMessage("Add up to 49 other members. You are added as owner and admin.")
            .setView(layout).setNegativeButton("Cancel", null).setPositiveButton("Create", null).create()

        selectButton.setOnClickListener {
            db.collection("users").get().addOnSuccessListener { snap ->
                val members = snap.documents.filter { it.id != me.uid }
                    .sortedBy { it.getString("displayName")?.lowercase().orEmpty() }
                if (members.isEmpty()) { toast("No other members are available yet."); return@addOnSuccessListener }
                val labels = members.map { doc ->
                    val display = doc.getString("displayName")?.trim().orEmpty().ifBlank {
                        doc.getString("username")?.trim().orEmpty().ifBlank { "Member" }
                    }
                    "@" + doc.getString("username")?.trim().orEmpty().ifBlank {
                        usernameForMember(display, doc.getString("email"))
                    }
                }.toTypedArray()
                val checked = BooleanArray(labels.size) { i -> selectedIds.contains(members[i].id) }
                AlertDialog.Builder(this).setTitle("Choose group members (max 49)")
                    .setMultiChoiceItems(labels, checked) { _, which, isChecked ->
                        val id = members[which].id
                        if (isChecked) {
                            if (!selectedIds.contains(id)) {
                                if (selectedIds.size >= 49) { toast("A group can have at most 50 members."); return@setMultiChoiceItems }
                                selectedIds.add(id)
                            }
                        } else selectedIds.remove(id)
                    }
                    .setNegativeButton("Cancel", null)
                    .setPositiveButton("Done") { _, _ -> selectButton.text = "Select members • " + selectedIds.size + "/49" }
                    .show()
            }.addOnFailureListener { toast("Could not load members.") }
        }

        dialog.setOnShowListener {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val groupName = nameInput.text.toString().trim()
                if (groupName.isBlank()) { nameInput.error = "Enter a group name"; return@setOnClickListener }
                if (groupName.length > 80) { nameInput.error = "Group name is limited to 80 characters"; return@setOnClickListener }
                val description = descInput.text.toString().trim().take(240)
                val memberIds = (listOf(me.uid) + selectedIds).distinct()
                if (memberIds.size > 50) { toast("A group can have at most 50 members."); return@setOnClickListener }
                val groupRef = db.collection("groups").document()
                val inviteCode = java.util.UUID.randomUUID().toString().replace("-", "").take(16)
                val seed = (System.currentTimeMillis() and 0x7FFFFFFF).toInt()
                val groupData = hashMapOf<String, Any>(
                    "groupId" to groupRef.id, "name" to groupName, "description" to description,
                    "ownerId" to me.uid, "adminIds" to listOf(me.uid), "memberIds" to memberIds,
                    "memberCount" to memberIds.size, "inviteCode" to inviteCode, "avatarSeed" to seed,
                    "createdAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
                    "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                )
                val inviteRef = db.collection("groupInvites").document(inviteCode)
                val batch = db.batch()
                batch.set(groupRef, groupData)
                batch.set(inviteRef, mapOf(
                    "groupId" to groupRef.id, "groupName" to groupName,
                    "createdBy" to me.uid,
                    "createdAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                ))
                dialog.getButton(AlertDialog.BUTTON_POSITIVE).isEnabled = false
                batch.commit().addOnSuccessListener {
                    dialog.dismiss()
                    groupListView?.let { loadGroups(it, me.uid) }
                    openGroupChat(groupRef.id, groupName)
                    toast("Group created.")
                }.addOnFailureListener { e ->
                    dialog.getButton(AlertDialog.BUTTON_POSITIVE).isEnabled = true
                    toast(e.localizedMessage ?: "Could not create group.")
                }
            }
        }
        dialog.show()
    }

    private fun buildGroupInviteLink(inviteCode: String): String =
        "https://tubalrr.github.io/tubalhub/messenger-apk-design.html?groupInvite=" + inviteCode

    private fun showJoinGroupDialog() {
        val me = auth.currentUser ?: return showLogin()
        val edit = input("Paste invite link or invite code", false).apply { setSingleLine(true) }
        AlertDialog.Builder(this).setTitle("Join Group")
            .setMessage("Paste a TUBAL HUB group invite link or its invite code.")
            .setView(edit).setNegativeButton("Cancel", null)
            .setPositiveButton("Join") { _, _ ->
                val raw = edit.text.toString().trim()
                if (raw.isBlank()) { toast("Paste an invite link or code first."); return@setPositiveButton }
                val code = try {
                    Uri.parse(raw).getQueryParameter("groupInvite") ?: raw.substringAfterLast("/").trim()
                } catch (_: Exception) { raw }
                if (code.isBlank() || code.length > 64) { toast("Invalid invite link."); return@setPositiveButton }
                db.collection("groupInvites").document(code).get().addOnSuccessListener { invite ->
                    if (!invite.exists()) { toast("Invite not found or expired."); return@addOnSuccessListener }
                    val groupId = invite.getString("groupId").orEmpty()
                    if (groupId.isBlank()) { toast("This invite is invalid."); return@addOnSuccessListener }
                    val groupRef = db.collection("groups").document(groupId)
                    groupRef.get().addOnSuccessListener { group ->
                        if (!group.exists()) { toast("Group no longer exists."); return@addOnSuccessListener }
                        val memberIds = (group.get("memberIds") as? List<*>)?.filterIsInstance<String>().orEmpty()
                        val groupName = group.getString("name") ?: "Group"
                        if (memberIds.contains(me.uid)) { openGroupChat(group.id, groupName); return@addOnSuccessListener }
                        if (memberIds.size >= 50) { toast("This group is full (50 members)."); return@addOnSuccessListener }
                        val newIds = (memberIds + me.uid).distinct()
                        groupRef.update(mapOf(
                            "memberIds" to newIds,
                            "memberCount" to newIds.size,
                            "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                        )).addOnSuccessListener {
                            groupListView?.let { loadGroups(it, me.uid) }
                            openGroupChat(group.id, groupName)
                            toast("Joined " + groupName + ".")
                        }.addOnFailureListener { e -> toast(e.localizedMessage ?: "Could not join group.") }
                    }.addOnFailureListener { toast("Could not open the group.") }
                }.addOnFailureListener { toast("Could not validate the invite.") }
            }.show()
    }

    private fun showGroupAdminDialog(groupId: String) {
        val me = auth.currentUser ?: return
        val groupRef = db.collection("groups").document(groupId)
        groupRef.get().addOnSuccessListener { group ->
            if (!group.exists()) return@addOnSuccessListener
            val memberIds = (group.get("memberIds") as? List<*>)?.filterIsInstance<String>().orEmpty()
            val adminIds = (group.get("adminIds") as? List<*>)?.filterIsInstance<String>().orEmpty()
            val ownerId = group.getString("ownerId").orEmpty()
            val isAdmin = adminIds.contains(me.uid)
            val name = group.getString("name") ?: "Group"
            val description = group.getString("description").orEmpty()
            val inviteCode = group.getString("inviteCode").orEmpty()
            val inviteLink = buildGroupInviteLink(inviteCode)
            val actions = mutableListOf("Group info", "Copy invite link", "Share invite link")
            if (isAdmin) {
                actions += "Rename group"; actions += "Edit description"; actions += "Add members"
                actions += "Remove member"; actions += "Manage admins"
            }
            AlertDialog.Builder(this).setTitle(name + " • " + memberIds.size + "/50")
                .setItems(actions.toTypedArray()) { _, which ->
                    when (actions[which]) {
                        "Group info" -> AlertDialog.Builder(this).setTitle(name)
                            .setMessage(if (description.isBlank()) "No description set.

Invite:
" + inviteLink else description + "

Invite:
" + inviteLink)
                            .setPositiveButton("OK", null).show()
                        "Copy invite link" -> {
                            val clipboard = getSystemService(CLIPBOARD_SERVICE) as android.content.ClipboardManager
                            clipboard.setPrimaryClip(android.content.ClipData.newPlainText("TUBAL HUB group invite", inviteLink))
                            toast("Invite link copied.")
                        }
                        "Share invite link" -> shareText("Join my TUBAL HUB group "" + name + "": " + inviteLink)
                        "Rename group" -> promptGroupTextEdit(groupId, "Rename group", name, 80, "name")
                        "Edit description" -> promptGroupTextEdit(groupId, "Edit description", description, 240, "description")
                        "Add members" -> showAddGroupMembersDialog(groupId, memberIds)
                        "Remove member" -> showRemoveGroupMemberDialog(groupId, memberIds, ownerId)
                        "Manage admins" -> showManageGroupAdminsDialog(groupId, memberIds, adminIds, ownerId)
                    }
                }.show()
        }.addOnFailureListener { toast("Could not load group settings.") }
    }

    private fun promptGroupTextEdit(groupId: String, title: String, current: String, max: Int, field: String) {
        val edit = input(title, false).apply { setSingleLine(field == "name"); setText(current); setSelection(text.length) }
        AlertDialog.Builder(this).setTitle(title).setView(edit).setNegativeButton("Cancel", null)
            .setPositiveButton("Save") { _, _ ->
                val value = edit.text.toString().trim()
                if (value.isBlank() && field == "name") { toast("Group name is required."); return@setPositiveButton }
                if (value.length > max) { toast("Maximum " + max + " characters."); return@setPositiveButton }
                db.collection("groups").document(groupId).update(mapOf(
                    field to value, "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                )).addOnSuccessListener {
                    auth.currentUser?.uid?.let { uid -> groupListView?.let { loadGroups(it, uid) } }
                    if (field == "name") { selectedGroupName = value; chatTitleView?.text = "Group • " + value }
                    toast("Group updated.")
                }.addOnFailureListener { e -> toast(e.localizedMessage ?: "Group update failed.") }
            }.show()
    }

    private fun showAddGroupMembersDialog(groupId: String, currentIds: List<String>) {
        val me = auth.currentUser ?: return
        if (currentIds.size >= 50) { toast("This group is already full."); return }
        db.collection("users").get().addOnSuccessListener { snap ->
            val candidates = snap.documents.filter { it.id !in currentIds }
                .sortedBy { it.getString("displayName")?.lowercase().orEmpty() }
            val available = minOf(50 - currentIds.size, candidates.size)
            if (available <= 0) { toast("No other members are available."); return@addOnSuccessListener }
            val labels = candidates.map { doc ->
                val display = doc.getString("displayName")?.trim().orEmpty().ifBlank { "Member" }
                val username = doc.getString("username")?.trim().orEmpty().ifBlank { usernameForMember(display, doc.getString("email")) }
                "@" + username
            }.toTypedArray()
            val chosen = mutableListOf<String>()
            AlertDialog.Builder(this).setTitle("Add members • " + available + " slots available")
                .setMultiChoiceItems(labels, null) { _, which, checked ->
                    val id = candidates[which].id
                    if (checked && chosen.size < available) { if (!chosen.contains(id)) chosen.add(id) }
                    else if (!checked) chosen.remove(id)
                }
                .setNegativeButton("Cancel", null)
                .setPositiveButton("Add") { _, _ ->
                    if (chosen.isEmpty()) return@setPositiveButton
                    val newIds = (currentIds + chosen).distinct().take(50)
                    db.collection("groups").document(groupId).update(mapOf(
                        "memberIds" to newIds, "memberCount" to newIds.size,
                        "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                    )).addOnSuccessListener {
                        loadGroups(groupListView ?: return@addOnSuccessListener, me.uid)
                        toast(chosen.size.toString() + " member(s) added.")
                    }.addOnFailureListener { e -> toast(e.localizedMessage ?: "Could not add members.") }
                }.show()
        }.addOnFailureListener { toast("Could not load member list.") }
    }

    private fun showRemoveGroupMemberDialog(groupId: String, currentIds: List<String>, ownerId: String) {
        val me = auth.currentUser ?: return
        val removable = currentIds.filter { it != ownerId && it != me.uid }
        if (removable.isEmpty()) { toast("No removable members."); return }
        db.collection("users").get().addOnSuccessListener { snap ->
            val labels = removable.map { id ->
                val doc = snap.documents.firstOrNull { it.id == id }
                val display = doc?.getString("displayName")?.trim().orEmpty().ifBlank { "Member" }
                val username = doc?.getString("username")?.trim().orEmpty().ifBlank { usernameForMember(display, doc?.getString("email")) }
                "@" + username
            }.toTypedArray()
            AlertDialog.Builder(this).setTitle("Remove member").setItems(labels) { _, which ->
                confirmRemoveGroupMember(groupId, currentIds, removable[which], me.uid)
            }.show()
        }.addOnFailureListener { toast("Could not load members.") }
    }

    private fun confirmRemoveGroupMember(groupId: String, currentIds: List<String>, removeId: String, actorId: String) {
        val newIds = currentIds.filter { it != removeId }
        val groupRef = db.collection("groups").document(groupId)
        groupRef.get().addOnSuccessListener { group ->
            val adminIds = (group.get("adminIds") as? List<*>)?.filterIsInstance<String>().orEmpty()
            val newAdmins = adminIds.filter { it != removeId }
            groupRef.update(mapOf(
                "memberIds" to newIds, "memberCount" to newIds.size,
                "adminIds" to if (newAdmins.isEmpty()) listOf(group.getString("ownerId").orEmpty()) else newAdmins,
                "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
            )).addOnSuccessListener {
                loadGroups(groupListView ?: return@addOnSuccessListener, actorId)
                toast("Member removed.")
            }.addOnFailureListener { e -> toast(e.localizedMessage ?: "Could not remove member.") }
        }
    }

    private fun showManageGroupAdminsDialog(groupId: String, memberIds: List<String>, adminIds: List<String>, ownerId: String) {
        db.collection("users").get().addOnSuccessListener { snap ->
            val candidates = memberIds.filter { it != ownerId }
            val labels = candidates.map { id ->
                val doc = snap.documents.firstOrNull { it.id == id }
                val display = doc?.getString("displayName")?.trim().orEmpty().ifBlank { "Member" }
                val username = doc?.getString("username")?.trim().orEmpty().ifBlank { usernameForMember(display, doc?.getString("email")) }
                "@" + username
            }.toTypedArray()
            val checked = BooleanArray(labels.size) { i -> adminIds.contains(candidates[i]) }
            AlertDialog.Builder(this).setTitle("Manage admins")
                .setMultiChoiceItems(labels, checked) { _, which, isChecked -> checked[which] = isChecked }
                .setNegativeButton("Cancel", null)
                .setPositiveButton("Save") { _, _ ->
                    val newAdmins = mutableListOf(ownerId)
                    candidates.forEachIndexed { index, id -> if (checked[index]) newAdmins.add(id) }
                    db.collection("groups").document(groupId).update(mapOf(
                        "adminIds" to newAdmins.distinct(),
                        "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                    )).addOnSuccessListener { toast("Admins updated.") }
                        .addOnFailureListener { e -> toast(e.localizedMessage ?: "Could not update admins.") }
                }.show()
        }.addOnFailureListener { toast("Could not load admin list.") }
    }

    private fun shareText(value: String) {
        startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"; putExtra(Intent.EXTRA_TEXT, value)
        }, "Share invite link"))
    }

    private fun openGroupChat(groupId: String, name: String) {
        selectedUid = null
        selectedName = "Group"
        selectedGroupId = groupId
        selectedGroupName = name
        stopMessages?.remove()
        stopTyping?.remove()
        stopGroupMessages?.remove()
        videoCallButton?.isEnabled = false
        videoCallButton?.visibility = View.GONE
        groupAdminButton?.visibility = View.VISIBLE
        chatTitleView?.text = "Group • " + name
        messageBox?.removeAllViews()
        messageBox?.addView(text("Loading group messages…").apply { setTextColor(0xFF78948A.toInt()) })
        subscribeGroupMessages()
    }

    private fun subscribeGroupMessages() {
        stopGroupMessages?.remove()
        val groupId = selectedGroupId ?: return
        stopGroupMessages = db.collection("groupMessages").whereEqualTo("groupId", groupId).limit(200)
            .addSnapshotListener { snap, err ->
                if (err != null || snap == null) {
                    messageBox?.removeAllViews(); messageBox?.addView(text("Could not load group messages."))
                    return@addSnapshotListener
                }
                renderGroupMessages(snap.documents.sortedBy { it.getTimestamp("createdAt")?.toDate()?.time ?: 0L })
            }
    }

    private fun renderGroupMessages(items: List<com.google.firebase.firestore.DocumentSnapshot>) {
        val mine = auth.currentUser?.uid ?: return
        messageBox?.removeAllViews()
        if (items.isEmpty()) { messageBox?.addView(text("No messages yet. Start the conversation.")); return }
        items.forEach { doc ->
            val senderId = doc.getString("senderId").orEmpty()
            val senderName = doc.getString("senderName").orEmpty().ifBlank { "Member" }
            val body = doc.getString("text").orEmpty()
            val bubble = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL; setPadding(12, 10, 12, 10)
                background = rounded(if (senderId == mine) 0xFF123A2B.toInt() else 0xFF10221D.toInt(), 18f)
            }
            bubble.addView(text(if (senderId == mine) "You" else senderName).apply {
                textSize = 10f; typeface = Typeface.DEFAULT_BOLD
                setTextColor(if (senderId == mine) 0xFF7DFFB4.toInt() else 0xFF9CB7AC.toInt())
                setPadding(0, 0, 0, 5)
            })
            bubble.addView(TextView(this).apply {
                setTextColor(0xFFEAF7F0.toInt()); textSize = 15f
                text = highlightedMentions(body)
            })
            val created = doc.getTimestamp("createdAt")?.toDate()?.time ?: 0L
            bubble.addView(text(
                if (created > 0L) android.text.format.DateFormat.format("hh:mm a", java.util.Date(created)).toString() else ""
            ).apply { textSize = 9f; setTextColor(0xFF719085.toInt()); setPadding(0, 7, 0, 0) })
            messageBox?.addView(bubble, LinearLayout.LayoutParams(-2, -2).apply {
                gravity = if (senderId == mine) Gravity.END else Gravity.START; bottomMargin = 8
            })
        }
    }

    private fun highlightedMentions(body: String): android.text.SpannableString {
        val styled = android.text.SpannableString(body)
        Regex("@[A-Za-z0-9_]{1,30}").findAll(body).forEach { match ->
            styled.setSpan(android.text.style.ForegroundColorSpan(0xFF7DFFB4.toInt()),
                match.range.first, match.range.last + 1, android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
            styled.setSpan(android.text.style.StyleSpan(Typeface.BOLD),
                match.range.first, match.range.last + 1, android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        }
        return styled
    }

    private fun sendGroupMessage() {
        val me = auth.currentUser ?: return
        val groupId = selectedGroupId ?: return
        val body = messageInput?.text?.toString()?.trim().orEmpty()
        if (body.isEmpty()) return
        if (body.length > 500) return toast("Message is limited to 500 characters.")
        val name = me.displayName ?: me.email?.substringBefore("@") ?: "Member"
        val username = usernameForMember(name, me.email)
        val mentions = Regex("@[A-Za-z0-9_]{1,30}").findAll(body)
            .map { it.value.removePrefix("@") }.distinct().take(20).toList()
        db.collection("groupMessages").add(mapOf(
            "groupId" to groupId, "senderId" to me.uid, "senderName" to name,
            "senderUsername" to username, "text" to body, "mentions" to mentions,
            "type" to "text", "createdAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
        )).addOnSuccessListener {
            messageInput?.setText(""); messageInput?.hint = "Type a message…"
        }.addOnFailureListener { e -> toast(e.localizedMessage ?: "Group message failed.") }
    }

    private fun sendMessage() {
        if (selectedGroupId != null) {
            sendGroupMessage()
            return
        }
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
                val fresh = data?.get("typing") as? Boolean == true
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
        stopGroupMessages?.remove()
        incomingCallListener?.remove()
        stopTyping?.remove()
        super.onDestroy()
    }
}
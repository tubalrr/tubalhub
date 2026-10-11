package com.tubalhub.app

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.net.http.SslError
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView

/**
 * Hosts individual TUBAL HUB tools. The app's main dashboard remains fully native;
 * this screen is only used when a destination needs its existing web implementation.
 */
class HubWebActivity : Activity() {

    companion object {
        const val EXTRA_TITLE = "com.tubalhub.app.extra.TITLE"
        const val EXTRA_URL = "com.tubalhub.app.extra.URL"
        private const val HOME_URL = "https://tubalrr.github.io/tubalhub/"
        private const val COLOR_INK = 0xFF151620.toInt()
        private const val COLOR_ACCENT = 0xFFE0445D.toInt()
        private const val COLOR_TEXT = 0xFF20212B.toInt()
        private const val COLOR_MUTED = 0xFF656775.toInt()
    }

    private lateinit var webView: WebView
    private lateinit var progress: ProgressBar
    private lateinit var errorPanel: LinearLayout
    private var targetUrl: String = HOME_URL
    private var pageTitle: String = "TUBAL HUB"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        pageTitle = intent.getStringExtra(EXTRA_TITLE).orEmpty().ifBlank { "TUBAL HUB" }
        targetUrl = intent.getStringExtra(EXTRA_URL).orEmpty().ifBlank { HOME_URL }

        window.statusBarColor = COLOR_INK
        window.navigationBarColor = COLOR_INK

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.WHITE)
        }

        val toolbar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(16), 0, dp(16), 0)
            setBackgroundColor(COLOR_INK)
        }

        val back = TextView(this).apply {
            text = "‹"
            textSize = 38f
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            setOnClickListener { finish() }
        }
        toolbar.addView(back, LinearLayout.LayoutParams(dp(42), dp(54)))

        val title = TextView(this).apply {
            text = pageTitle
            textSize = 17f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.WHITE)
            maxLines = 1
            ellipsize = android.text.TextUtils.TruncateAt.END
        }
        toolbar.addView(title, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))

        val home = TextView(this).apply {
            text = "⌂"
            textSize = 25f
            gravity = Gravity.CENTER
            setTextColor(0xFFFFD9E0.toInt())
            setOnClickListener { finish() }
        }
        toolbar.addView(home, LinearLayout.LayoutParams(dp(40), dp(54)))
        root.addView(toolbar, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, dp(58)
        ))

        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100
            progress = 0
            progressTintList = android.content.res.ColorStateList.valueOf(COLOR_ACCENT)
            progressBackgroundTintList =
                android.content.res.ColorStateList.valueOf(0xFFE7E7EC.toInt())
        }
        root.addView(progress, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, dp(3)
        ))

        val frame = FrameLayout(this).apply { setBackgroundColor(Color.WHITE) }
        webView = WebView(this).apply {
            setBackgroundColor(Color.WHITE)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.loadsImagesAutomatically = true
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            settings.javaScriptCanOpenWindowsAutomatically = false
            settings.setSupportMultipleWindows(false)
            settings.mediaPlaybackRequiresUserGesture = true
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
        }

        errorPanel = buildErrorPanel().apply { visibility = View.GONE }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                progress.visibility = View.VISIBLE
                progress.progress = 0
                errorPanel.visibility = View.GONE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                progress.visibility = View.GONE
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) showError()
            }

            override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler?, error: SslError?) {
                handler?.cancel()
                if (error?.url?.let { Uri.parse(it).host } == Uri.parse(targetUrl).host) showError()
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url ?: return false
                val scheme = uri.scheme?.lowercase()
                val currentHost = Uri.parse(targetUrl).host

                if ((scheme == "https" || scheme == "http") &&
                    uri.host.equals(currentHost, ignoreCase = true)
                ) return false

                return try {
                    startActivity(Intent(Intent.ACTION_VIEW, uri))
                    true
                } catch (_: ActivityNotFoundException) {
                    true
                } catch (_: SecurityException) {
                    true
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progress.progress = newProgress
                progress.visibility = if (newProgress >= 100) View.GONE else View.VISIBLE
            }
        }

        frame.addView(webView, FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT
        ))
        frame.addView(errorPanel, FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT
        ))
        root.addView(frame, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f
        ))
        setContentView(root)
        webView.loadUrl(targetUrl)
    }

    private fun buildErrorPanel(): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dp(28), dp(24), dp(28), dp(24))
            setBackgroundColor(Color.WHITE)

            addView(TextView(this@HubWebActivity).apply {
                text = "Connection interrupted"
                textSize = 22f
                typeface = Typeface.DEFAULT_BOLD
                gravity = Gravity.CENTER
                setTextColor(COLOR_TEXT)
            }, LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            ))

            addView(TextView(this@HubWebActivity).apply {
                text = "Check your connection, then try loading this space again."
                textSize = 15f
                gravity = Gravity.CENTER
                setTextColor(COLOR_MUTED)
            }, LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = dp(10); bottomMargin = dp(18) })

            addView(TextView(this@HubWebActivity).apply {
                text = "Retry"
                textSize = 15f
                typeface = Typeface.DEFAULT_BOLD
                gravity = Gravity.CENTER
                setTextColor(Color.WHITE)
                setPadding(dp(25), dp(12), dp(25), dp(12))
                background = android.graphics.drawable.GradientDrawable().apply {
                    cornerRadius = dp(14).toFloat()
                    setColor(COLOR_ACCENT)
                }
                setOnClickListener { webView.loadUrl(targetUrl) }
            }, LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT
            ))
        }
    }

    private fun showError() {
        runOnUiThread {
            progress.visibility = View.GONE
            errorPanel.visibility = View.VISIBLE
        }
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()

    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) webView.goBack() else finish()
    }

    override fun onDestroy() {
        if (::webView.isInitialized) {
            webView.stopLoading()
            webView.webChromeClient = null
            webView.webViewClient = WebViewClient()
            webView.destroy()
        }
        super.onDestroy()
    }
}

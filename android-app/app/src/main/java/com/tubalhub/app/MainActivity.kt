package com.tubalhub.app

import android.annotation.SuppressLint
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.ValueCallback
import android.net.http.SslError
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView

class MainActivity : Activity() {

    companion object {
        private const val HOME_URL = "https://tubalrr.github.io/tubalhub/"
        private const val STATE_WEBVIEW = "tubalhub.webview.state"
        private const val COLOR_INK = 0xFF151620.toInt()
        private const val COLOR_ACCENT = 0xFFE0445D.toInt()
        private const val COLOR_TEXT = 0xFF20212B.toInt()
        private const val COLOR_MUTED = 0xFF656775.toInt()
        private const val FILE_CHOOSER_REQUEST_CODE = 1101
    }

    private lateinit var rootContainer: FrameLayout
    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var errorPanel: LinearLayout
    private var lastUrl: String = HOME_URL
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.statusBarColor = COLOR_INK
        window.navigationBarColor = COLOR_INK
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)

        rootContainer = FrameLayout(this).apply {
            setBackgroundColor(Color.WHITE)
        }

        webView = WebView(this).apply {
            setBackgroundColor(Color.WHITE)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.loadsImagesAutomatically = true
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            settings.javaScriptCanOpenWindowsAutomatically = false
            // Keep new-window links in this WebView instead of creating hidden popup WebViews.
            settings.setSupportMultipleWindows(false)
            settings.mediaPlaybackRequiresUserGesture = true
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            CookieManager.getInstance().setAcceptCookie(true)
            CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)
        }

        progressBar = ProgressBar(
            this,
            null,
            android.R.attr.progressBarStyleHorizontal
        ).apply {
            max = 100
            progress = 0
            progressTintList = android.content.res.ColorStateList.valueOf(COLOR_ACCENT)
            progressBackgroundTintList = android.content.res.ColorStateList.valueOf(0xFFE7E7EC.toInt())
            visibility = View.VISIBLE
        }

        errorPanel = buildErrorPanel().apply {
            visibility = View.GONE
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                if (!url.isNullOrBlank()) lastUrl = url
                errorPanel.visibility = View.GONE
                progressBar.progress = 0
                progressBar.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                progressBar.visibility = View.GONE
                if (!url.isNullOrBlank()) lastUrl = url
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) showLoadError()
            }

            override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler?, error: SslError?) {
                handler?.cancel()
                val failedHost = error?.url?.let { Uri.parse(it).host }
                val activeHost = Uri.parse(lastUrl).host
                if (!failedHost.isNullOrBlank() && failedHost == activeHost) {
                    showLoadError()
                }
            }

            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val uri = request?.url ?: return false
                val scheme = uri.scheme?.lowercase()

                // Keep TUBAL HUB pages inside the app. Open other sites and app links
                // externally so OAuth, downloads and third-party navigation behave normally.
                if (scheme == "https" || scheme == "http") {
                    val internalHost = Uri.parse(HOME_URL).host
                    if (!uri.host.isNullOrBlank() &&
                        uri.host.equals(internalHost, ignoreCase = true)
                    ) {
                        return false
                    }
                }

                openExternalUri(uri)
                return true
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progressBar.progress = newProgress
                progressBar.visibility = if (newProgress >= 100) View.GONE else View.VISIBLE
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                return try {
                    val chooserIntent = fileChooserParams?.createIntent()
                        ?: throw ActivityNotFoundException("No file chooser available")
                    startActivityForResult(chooserIntent, FILE_CHOOSER_REQUEST_CODE)
                    true
                } catch (_: ActivityNotFoundException) {
                    this@MainActivity.filePathCallback?.onReceiveValue(null)
                    this@MainActivity.filePathCallback = null
                    false
                } catch (_: SecurityException) {
                    this@MainActivity.filePathCallback?.onReceiveValue(null)
                    this@MainActivity.filePathCallback = null
                    false
                }
            }

        }

        rootContainer.addView(
            webView,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )
        rootContainer.addView(
            progressBar,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(3),
                Gravity.TOP
            )
        )
        rootContainer.addView(
            errorPanel,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )

        setContentView(rootContainer)

        if (savedInstanceState != null) {
            val webState = savedInstanceState.getBundle(STATE_WEBVIEW)
            if (webState != null) webView.restoreState(webState)
            if (webView.url.isNullOrBlank()) webView.loadUrl(HOME_URL)
        } else {
            webView.loadUrl(HOME_URL)
        }
    }

    private fun openExternalUri(uri: Uri) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
        } catch (_: ActivityNotFoundException) {
            // No installed app can handle this link.
        } catch (_: SecurityException) {
            // Android denied this external intent.
        }
    }

    @Deprecated("Handled by the WebView file chooser.")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            val callback = filePathCallback
            filePathCallback = null
            callback?.onReceiveValue(
                WebChromeClient.FileChooserParams.parseResult(resultCode, data)
            )
            return
        }
        super.onActivityResult(requestCode, resultCode, data)
    }

    private fun buildErrorPanel(): LinearLayout {
        val panel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dp(28), dp(24), dp(28), dp(24))
            setBackgroundColor(Color.WHITE)
        }

        val mark = TextView(this).apply {
            text = "T"
            textSize = 34f
            setTextColor(Color.WHITE)
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(17).toFloat()
                setColor(COLOR_INK)
                setStroke(dp(1), COLOR_ACCENT)
            }
        }
        panel.addView(mark, LinearLayout.LayoutParams(dp(66), dp(66)).apply {
            bottomMargin = dp(22)
        })

        val title = TextView(this).apply {
            text = getString(com.tubalhub.app.R.string.offline_title)
            textSize = 22f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(COLOR_TEXT)
            gravity = Gravity.CENTER
        }
        panel.addView(title, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ))

        val message = TextView(this).apply {
            text = getString(com.tubalhub.app.R.string.offline_message)
            textSize = 15f
            setTextColor(COLOR_MUTED)
            gravity = Gravity.CENTER
            setLineSpacing(dp(3).toFloat(), 1f)
        }
        panel.addView(message, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ).apply {
            topMargin = dp(10)
            bottomMargin = dp(22)
        })

        val retry = Button(this).apply {
            text = getString(com.tubalhub.app.R.string.retry)
            isAllCaps = false
            setTextColor(Color.WHITE)
            background = GradientDrawable().apply {
                cornerRadius = dp(14).toFloat()
                setColor(COLOR_ACCENT)
            }
            setOnClickListener {
                errorPanel.visibility = View.GONE
                progressBar.visibility = View.VISIBLE
                webView.loadUrl(lastUrl.ifBlank { HOME_URL })
            }
        }
        retry.minWidth = dp(150)
        panel.addView(retry, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            dp(48)
        ).apply {
            gravity = Gravity.CENTER
        })

        return panel
    }

    private fun showLoadError() {
        runOnUiThread {
            progressBar.visibility = View.GONE
            errorPanel.visibility = View.VISIBLE
        }
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()

    override fun onSaveInstanceState(outState: Bundle) {
        val webState = Bundle()
        webView.saveState(webState)
        outState.putBundle(STATE_WEBVIEW, webState)
        super.onSaveInstanceState(outState)
    }

    @Deprecated("Deprecated in Android API; retained for compatibility with the selected Activity base class.")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        filePathCallback?.onReceiveValue(null)
        filePathCallback = null
        if (::webView.isInitialized) {
            webView.stopLoading()
            webView.webChromeClient = null
            webView.webViewClient = WebViewClient()
            webView.destroy()
        }
        super.onDestroy()
    }
}

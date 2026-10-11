package com.tubalhub.app

import android.animation.ObjectAnimator
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.animation.LinearInterpolator
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView

/** Branded animated startup screen for TUBAL HUB Android. */
class SplashActivity : Activity() {

    companion object {
        private const val SPLASH_DURATION_MS = 1_750L
        private const val COLOR_INK = 0xFF151620.toInt()
        private const val COLOR_ACCENT = 0xFFE0445D.toInt()
        private const val COLOR_ACCENT_LIGHT = 0xFFFF8497.toInt()
        private const val COLOR_MUTED = 0xFFB8B6C4.toInt()
    }

    private val handler = Handler(Looper.getMainLooper())
    private var navigationStarted = false

    private val launchDashboard = Runnable {
        if (!isFinishing && !isDestroyed && !navigationStarted) {
            navigationStarted = true
            startActivity(Intent(this, MainActivity::class.java))
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
            finish()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = COLOR_INK
        window.navigationBarColor = COLOR_INK
        window.setBackgroundDrawableResource(android.R.color.black)

        val root = FrameLayout(this).apply {
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(0xFF11121A.toInt(), 0xFF1D1826.toInt(), 0xFF311A2A.toInt(), COLOR_INK)
            )
        }

        addOrbit(root, 292, 0x2EFF647D.toInt(), 0xFFFF6B83.toInt(), 0f, 13_000L)
        addOrbit(root, 224, 0x1FFF8497.toInt(), 0xFFB78BFF.toInt(), 90f, 17_000L)
        addAmbientGlow(root)

        val center = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(28), dp(12), dp(28), dp(12))
        }

        val logo = buildLogo()
        center.addView(logo, LinearLayout.LayoutParams(dp(112), dp(112)).apply {
            bottomMargin = dp(27)
        })

        val brand = TextView(this).apply {
            text = "TUBAL HUB"
            textSize = 27f
            letterSpacing = 0.13f
            typeface = Typeface.create("sans-serif", Typeface.BOLD)
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
        }
        center.addView(brand, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
        ))

        val tagline = TextView(this).apply {
            text = "YOUR WORLD. YOUR WAY."
            textSize = 10f
            letterSpacing = 0.21f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            setTextColor(0xFFD8D3E1.toInt())
        }
        center.addView(tagline, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
        ).apply { topMargin = dp(10); bottomMargin = dp(36) })

        val loadingRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        val liveDot = View(this).apply {
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(COLOR_ACCENT_LIGHT)
            }
        }
        loadingRow.addView(liveDot, LinearLayout.LayoutParams(dp(7), dp(7)).apply {
            rightMargin = dp(10)
        })

        val loadingText = TextView(this).apply {
            text = "Preparing your space"
            textSize = 13f
            letterSpacing = 0.02f
            setTextColor(0xFFE3DFE9.toInt())
        }
        loadingRow.addView(loadingText)
        center.addView(loadingRow, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT
        ).apply { bottomMargin = dp(14) })

        val progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100
            progress = 0
            progressTintList = android.content.res.ColorStateList.valueOf(COLOR_ACCENT_LIGHT)
            progressBackgroundTintList =
                android.content.res.ColorStateList.valueOf(0x36FFFFFF.toInt())
            isIndeterminate = false
        }
        center.addView(progress, LinearLayout.LayoutParams(dp(184), dp(3)))

        root.addView(center, FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            Gravity.CENTER
        ))

        val footer = TextView(this).apply {
            text = "CONNECTED SPACES  •  ONE HUB"
            textSize = 9f
            letterSpacing = 0.17f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            setTextColor(COLOR_MUTED)
            alpha = 0.78f
        }
        root.addView(footer, FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            Gravity.BOTTOM
        ).apply {
            leftMargin = dp(18)
            rightMargin = dp(18)
            bottomMargin = dp(31)
        })

        setContentView(root)

        ObjectAnimator.ofPropertyValuesHolder(
            logo,
            android.animation.PropertyValuesHolder.ofFloat(View.SCALE_X, 1f, 1.045f, 1f),
            android.animation.PropertyValuesHolder.ofFloat(View.SCALE_Y, 1f, 1.045f, 1f)
        ).apply {
            duration = 1_450L
            repeatCount = ObjectAnimator.INFINITE
            start()
        }

        ObjectAnimator.ofFloat(liveDot, View.ALPHA, 1f, 0.38f, 1f).apply {
            duration = 850L
            repeatCount = ObjectAnimator.INFINITE
            start()
        }

        ObjectAnimator.ofInt(progress, "progress", 0, 100).apply {
            duration = SPLASH_DURATION_MS - 150L
            start()
        }

        handler.postDelayed(launchDashboard, SPLASH_DURATION_MS)
    }

    private fun buildLogo(): FrameLayout {
        val frame = FrameLayout(this)

        val backplate = View(this).apply {
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(0xFFFF7189.toInt(), 0xFFE0445D.toInt(), 0xFF8D2347.toInt())
            ).apply {
                cornerRadius = dp(31).toFloat()
                setStroke(dp(1), 0x77FFFFFF)
            }
            elevation = dp(12).toFloat()
        }
        frame.addView(backplate, FrameLayout.LayoutParams(
            dp(94), dp(94), Gravity.CENTER
        ))

        val letter = TextView(this).apply {
            text = "T"
            textSize = 65f
            typeface = Typeface.create("sans-serif", Typeface.BOLD)
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            includeFontPadding = false
            setShadowLayer(dp(12).toFloat(), 0f, dp(3).toFloat(), 0x55310E1F)
        }
        frame.addView(letter, FrameLayout.LayoutParams(
            dp(94), dp(94), Gravity.CENTER
        ))

        val badge = TextView(this).apply {
            text = "H"
            textSize = 14f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(12).toFloat()
                setColor(COLOR_INK)
                setStroke(dp(1), 0xFFFF8497.toInt())
            }
            elevation = dp(14).toFloat()
        }
        frame.addView(badge, FrameLayout.LayoutParams(dp(36), dp(36), Gravity.BOTTOM or Gravity.END))
        return frame
    }

    private fun addOrbit(
        root: FrameLayout,
        sizeDp: Int,
        ringColor: Int,
        dotColor: Int,
        startRotation: Float,
        durationMs: Long
    ) {
        val orbit = FrameLayout(this)

        val ring = View(this).apply {
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.TRANSPARENT)
                setStroke(dp(1), ringColor)
            }
        }
        orbit.addView(ring, FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ))

        val dot = View(this).apply {
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(dotColor)
            }
            elevation = dp(3).toFloat()
        }
        orbit.addView(dot, FrameLayout.LayoutParams(dp(7), dp(7), Gravity.TOP or Gravity.CENTER_HORIZONTAL))

        val lp = FrameLayout.LayoutParams(dp(sizeDp), dp(sizeDp), Gravity.CENTER)
        root.addView(orbit, lp)
        orbit.rotation = startRotation
        ObjectAnimator.ofFloat(orbit, View.ROTATION, startRotation, startRotation + 360f).apply {
            duration = durationMs
            repeatCount = ObjectAnimator.INFINITE
            interpolator = LinearInterpolator()
            start()
        }
    }

    private fun addAmbientGlow(root: FrameLayout) {
        val glow = View(this).apply {
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(0x22E0445D, 0x00E0445D)
            ).apply { shape = GradientDrawable.OVAL }
        }
        root.addView(glow, FrameLayout.LayoutParams(dp(320), dp(320), Gravity.CENTER))
        ObjectAnimator.ofPropertyValuesHolder(
            glow,
            android.animation.PropertyValuesHolder.ofFloat(View.SCALE_X, 0.94f, 1.07f, 0.94f),
            android.animation.PropertyValuesHolder.ofFloat(View.SCALE_Y, 0.94f, 1.07f, 0.94f),
            android.animation.PropertyValuesHolder.ofFloat(View.ALPHA, 0.6f, 1f, 0.6f)
        ).apply {
            duration = 2_600L
            repeatCount = ObjectAnimator.INFINITE
            start()
        }
    }

    override fun onDestroy() {
        handler.removeCallbacks(launchDashboard)
        super.onDestroy()
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()
}

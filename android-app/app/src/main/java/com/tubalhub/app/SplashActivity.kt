package com.tubalhub.app

import android.animation.Animator
import android.animation.ObjectAnimator
import android.animation.PropertyValuesHolder
import android.app.Activity
import android.content.Intent
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.animation.DecelerateInterpolator
import android.view.animation.LinearInterpolator
import android.view.animation.OvershootInterpolator
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import kotlin.random.Random

/** Premium animated startup screen for TUBAL HUB Android. */
class SplashActivity : Activity() {

    companion object {
        private const val SPLASH_DURATION_MS = 1_950L
        private const val COLOR_INK = 0xFF0B0D17.toInt()
        private const val COLOR_ACCENT = 0xFFE0445D.toInt()
        private const val COLOR_ACCENT_LIGHT = 0xFFFF91A2.toInt()
        private const val COLOR_MUTED = 0xFFA9A8B8.toInt()
    }

    private val handler = Handler(Looper.getMainLooper())
    private val runningAnimations = mutableListOf<Animator>()
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
            clipChildren = false
            clipToPadding = false
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(
                    0xFF090B13.toInt(),
                    0xFF151321.toInt(),
                    0xFF281521.toInt(),
                    COLOR_INK
                )
            )
        }

        // Quiet atmospheric details sit behind the content.
        root.addView(ParticleFieldView(this), FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ))
        addAmbientGlow(root)
        addOrbit(root, 304, 0x27FF647D.toInt(), 0xFFFF6B83.toInt(), -12f, 15_000L)
        addOrbit(root, 242, 0x20B58DFF.toInt(), 0xFFBCA1FF.toInt(), 52f, 20_000L)
        addOrbit(root, 180, 0x16FFFFFF.toInt(), 0xFFFFA7B5.toInt(), 104f, 25_000L)

        root.addView(buildTopBar(), FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            Gravity.TOP
        ).apply {
            leftMargin = dp(22)
            rightMargin = dp(22)
            topMargin = dp(24)
        })

        val center = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(24), dp(8), dp(24), dp(8))
        }

        val eyebrow = buildEyebrow()
        center.addView(eyebrow, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            dp(30)
        ).apply { bottomMargin = dp(27) })

        val logo = buildLogo()
        center.addView(logo, LinearLayout.LayoutParams(dp(126), dp(126)).apply {
            bottomMargin = dp(22)
        })

        val brand = TextView(this).apply {
            text = "TUBAL HUB"
            textSize = 29f
            letterSpacing = 0.16f
            typeface = Typeface.create("sans-serif", Typeface.BOLD)
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            includeFontPadding = false
            setShadowLayer(dp(18).toFloat(), 0f, dp(2).toFloat(), 0x55FF647D)
        }
        center.addView(brand, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
        ))

        val tagline = TextView(this).apply {
            text = "ONE SPACE. MANY POSSIBILITIES."
            textSize = 10f
            letterSpacing = 0.19f
            typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
            gravity = Gravity.CENTER
            setTextColor(0xFFD4D0DF.toInt())
            includeFontPadding = false
        }
        center.addView(tagline, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
        ).apply { topMargin = dp(10); bottomMargin = dp(29) })

        val statusCard = buildStatusCard()
        center.addView(statusCard, LinearLayout.LayoutParams(dp(252), dp(82)))

        root.addView(center, FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            Gravity.CENTER
        ).apply {
            topMargin = dp(20)
            bottomMargin = dp(14)
        })

        val footer = TextView(this).apply {
            text = "YOUR DIGITAL LIFE, ALL IN ONE PLACE"
            textSize = 9f
            letterSpacing = 0.14f
            typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
            gravity = Gravity.CENTER
            setTextColor(COLOR_MUTED)
            alpha = 0.85f
        }
        root.addView(footer, FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            Gravity.BOTTOM
        ).apply {
            leftMargin = dp(18)
            rightMargin = dp(18)
            bottomMargin = dp(25)
        })

        setContentView(root)

        // Staggered entrances make the first launch feel intentional, not static.
        logo.alpha = 0f
        logo.scaleX = 0.78f
        logo.scaleY = 0.78f
        val logoEntrance = ObjectAnimator.ofPropertyValuesHolder(
            logo,
            PropertyValuesHolder.ofFloat(View.ALPHA, 0f, 1f),
            PropertyValuesHolder.ofFloat(View.SCALE_X, 0.78f, 1.04f, 1f),
            PropertyValuesHolder.ofFloat(View.SCALE_Y, 0.78f, 1.04f, 1f)
        ).apply {
            duration = 720L
            interpolator = OvershootInterpolator(0.65f)
        }
        runAnimation(logoEntrance)

        enterFromBelow(eyebrow, 80L)
        enterFromBelow(brand, 170L)
        enterFromBelow(tagline, 250L)
        enterFromBelow(statusCard, 340L)
        enterFromBelow(footer, 430L)

        ObjectAnimator.ofPropertyValuesHolder(
            logo,
            PropertyValuesHolder.ofFloat(View.SCALE_X, 1f, 1.035f, 1f),
            PropertyValuesHolder.ofFloat(View.SCALE_Y, 1f, 1.035f, 1f)
        ).apply {
            duration = 1_500L
            startDelay = 720L
            repeatCount = ObjectAnimator.INFINITE
        }.also { runAnimation(it) }

        handler.postDelayed(launchDashboard, SPLASH_DURATION_MS)
    }

    private fun buildTopBar(): View {
        val bar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        val miniMark = TextView(this).apply {
            text = "T"
            textSize = 19f
            typeface = Typeface.create("sans-serif", Typeface.BOLD)
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(0xFFFF7189.toInt(), 0xFFB92D53.toInt())
            ).apply {
                cornerRadius = dp(12).toFloat()
                setStroke(dp(1), 0x55FFFFFF)
            }
            elevation = dp(5).toFloat()
        }
        bar.addView(miniMark, LinearLayout.LayoutParams(dp(38), dp(38)).apply {
            rightMargin = dp(10)
        })

        val nameStack = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_VERTICAL
        }
        val name = TextView(this).apply {
            text = "TUBAL HUB"
            textSize = 11f
            letterSpacing = 0.12f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.WHITE)
        }
        val caption = TextView(this).apply {
            text = "CONNECTED EXPERIENCE"
            textSize = 7f
            letterSpacing = 0.13f
            setTextColor(COLOR_MUTED)
        }
        nameStack.addView(name)
        nameStack.addView(caption, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT
        ).apply { topMargin = dp(3) })
        bar.addView(nameStack, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))

        val edition = TextView(this).apply {
            text = "MOBILE  •  v1.2.1"
            textSize = 8f
            letterSpacing = 0.06f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(0xFFE8DCE7.toInt())
            gravity = Gravity.CENTER
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(20).toFloat()
                setColor(0x18FFFFFF)
                setStroke(dp(1), 0x22FFFFFF)
            }
            setPadding(dp(10), dp(8), dp(10), dp(8))
        }
        bar.addView(edition)
        return bar
    }

    private fun buildEyebrow(): View {
        val pill = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            setPadding(dp(13), 0, dp(13), 0)
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(22).toFloat()
                setColor(0x17FFFFFF)
                setStroke(dp(1), 0x27FFFFFF)
            }
        }

        val dot = View(this).apply {
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(COLOR_ACCENT_LIGHT)
            }
            elevation = dp(2).toFloat()
        }
        pill.addView(dot, LinearLayout.LayoutParams(dp(6), dp(6)).apply {
            rightMargin = dp(8)
        })

        val text = TextView(this).apply {
            text = "YOUR PERSONAL DIGITAL HUB"
            textSize = 8f
            letterSpacing = 0.12f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(0xFFECE5F0.toInt())
            gravity = Gravity.CENTER
        }
        pill.addView(text)

        ObjectAnimator.ofFloat(dot, View.ALPHA, 1f, 0.35f, 1f).apply {
            duration = 1_050L
            repeatCount = ObjectAnimator.INFINITE
        }.also { runAnimation(it) }
        return pill
    }

    private fun buildStatusCard(): View {
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(15), dp(12), dp(15), dp(12))
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(0x24FFFFFF, 0x0DFFFFFF)
            ).apply {
                cornerRadius = dp(17).toFloat()
                setStroke(dp(1), 0x2EFFFFFF)
            }
            elevation = dp(8).toFloat()
        }

        val header = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        val statusLabel = TextView(this).apply {
            text = "SETTING UP YOUR SPACE"
            textSize = 8f
            letterSpacing = 0.07f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(0xFFEAE3EF.toInt())
        }
        header.addView(statusLabel, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))

        val percent = TextView(this).apply {
            text = "0%"
            textSize = 9f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(COLOR_ACCENT_LIGHT)
        }
        header.addView(percent)
        card.addView(header, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
        ).apply { bottomMargin = dp(11) })

        val progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100
            this.progress = 0
            progressTintList = android.content.res.ColorStateList.valueOf(COLOR_ACCENT_LIGHT)
            progressBackgroundTintList = android.content.res.ColorStateList.valueOf(0x2AFFFFFF)
            isIndeterminate = false
        }
        card.addView(progress, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, dp(4)
        ).apply { bottomMargin = dp(8) })

        val hint = TextView(this).apply {
            text = "Getting everything ready for you"
            textSize = 9f
            letterSpacing = 0.01f
            setTextColor(COLOR_MUTED)
        }
        card.addView(hint)

        ObjectAnimator.ofInt(progress, "progress", 0, 100).apply {
            duration = SPLASH_DURATION_MS - 160L
            addUpdateListener { animator ->
                percent.text = "${animator.animatedValue as Int}%"
            }
        }.also { runAnimation(it) }

        return card
    }

    private fun buildLogo(): FrameLayout {
        val frame = FrameLayout(this).apply {
            clipChildren = false
            clipToPadding = false
        }

        val halo = View(this).apply {
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(0x22FF536F)
            }
        }
        frame.addView(halo, FrameLayout.LayoutParams(dp(120), dp(120), Gravity.CENTER))

        val rim = View(this).apply {
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(0xFFFFC0C9.toInt(), 0xFFE0445D.toInt(), 0xFF70213F.toInt())
            ).apply {
                cornerRadius = dp(34).toFloat()
                setStroke(dp(1), 0x88FFFFFF.toInt())
            }
            elevation = dp(10).toFloat()
        }
        frame.addView(rim, FrameLayout.LayoutParams(dp(104), dp(104), Gravity.CENTER))

        val tile = View(this).apply {
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(0xFFFF758D.toInt(), 0xFFE0445D.toInt(), 0xFF9F2449.toInt())
            ).apply {
                cornerRadius = dp(30).toFloat()
                setStroke(dp(1), 0x66FFFFFF)
            }
            elevation = dp(12).toFloat()
        }
        frame.addView(tile, FrameLayout.LayoutParams(dp(96), dp(96), Gravity.CENTER))

        val letter = TextView(this).apply {
            text = "T"
            textSize = 68f
            typeface = Typeface.create("sans-serif", Typeface.BOLD)
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            includeFontPadding = false
            setShadowLayer(dp(13).toFloat(), 0f, dp(3).toFloat(), 0x77310E1F)
        }
        frame.addView(letter, FrameLayout.LayoutParams(dp(96), dp(96), Gravity.CENTER))

        val badge = TextView(this).apply {
            text = "H"
            textSize = 14f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(0xFF242333.toInt(), 0xFF10111A.toInt())
            ).apply {
                cornerRadius = dp(13).toFloat()
                setStroke(dp(1), 0xFFFF91A2.toInt())
            }
            elevation = dp(15).toFloat()
        }
        frame.addView(badge, FrameLayout.LayoutParams(dp(37), dp(37), Gravity.BOTTOM or Gravity.END))
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
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(Color.WHITE, dotColor)
            ).apply { shape = GradientDrawable.OVAL }
            elevation = dp(3).toFloat()
        }
        orbit.addView(dot, FrameLayout.LayoutParams(dp(7), dp(7), Gravity.TOP or Gravity.CENTER_HORIZONTAL))

        root.addView(orbit, FrameLayout.LayoutParams(dp(sizeDp), dp(sizeDp), Gravity.CENTER))
        orbit.rotation = startRotation
        ObjectAnimator.ofFloat(orbit, View.ROTATION, startRotation, startRotation + 360f).apply {
            duration = durationMs
            repeatCount = ObjectAnimator.INFINITE
            interpolator = LinearInterpolator()
        }.also { runAnimation(it) }
    }

    private fun addAmbientGlow(root: FrameLayout) {
        val glow = View(this).apply {
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(0x27E0445D, 0x12B24B87, 0x00E0445D)
            ).apply { shape = GradientDrawable.OVAL }
        }
        root.addView(glow, FrameLayout.LayoutParams(dp(330), dp(330), Gravity.CENTER))
        ObjectAnimator.ofPropertyValuesHolder(
            glow,
            PropertyValuesHolder.ofFloat(View.SCALE_X, 0.91f, 1.08f, 0.91f),
            PropertyValuesHolder.ofFloat(View.SCALE_Y, 0.91f, 1.08f, 0.91f),
            PropertyValuesHolder.ofFloat(View.ALPHA, 0.55f, 1f, 0.55f)
        ).apply {
            duration = 3_100L
            repeatCount = ObjectAnimator.INFINITE
        }.also { runAnimation(it) }
    }

    private fun enterFromBelow(view: View, delayMs: Long) {
        view.alpha = 0f
        view.translationY = dp(12).toFloat()
        ObjectAnimator.ofPropertyValuesHolder(
            view,
            PropertyValuesHolder.ofFloat(View.ALPHA, 0f, 1f),
            PropertyValuesHolder.ofFloat(View.TRANSLATION_Y, dp(12).toFloat(), 0f)
        ).apply {
            duration = 520L
            startDelay = delayMs
            interpolator = DecelerateInterpolator()
        }.also { runAnimation(it) }
    }

    private fun runAnimation(animator: Animator) {
        runningAnimations += animator
        animator.start()
    }

    override fun onDestroy() {
        handler.removeCallbacks(launchDashboard)
        runningAnimations.forEach { it.cancel() }
        runningAnimations.clear()
        super.onDestroy()
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()

    /** Lightweight decorative stars; deterministic positions keep the screen stable. */
    private class ParticleFieldView(context: android.content.Context) : View(context) {
        private data class Particle(val x: Float, val y: Float, val radius: Float, val alpha: Int)
        private val particlePaint = Paint(Paint.ANTI_ALIAS_FLAG)
        private val particles = List(48) {
            val random = Random(730 + it * 31)
            Particle(
                x = random.nextFloat(),
                y = random.nextFloat(),
                radius = (0.7f + random.nextFloat() * 1.25f) * resources.displayMetrics.density,
                alpha = 14 + random.nextInt(42)
            )
        }

        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            particlePaint.color = Color.WHITE
            particles.forEachIndexed { index, particle ->
                particlePaint.alpha = particle.alpha
                canvas.drawCircle(
                    particle.x * width,
                    particle.y * height,
                    particle.radius,
                    particlePaint
                )
                if (index % 11 == 0) {
                    particlePaint.alpha = (particle.alpha * 0.65f).toInt()
                    val x = particle.x * width
                    val y = particle.y * height
                    val sparkle = particle.radius * 3.2f
                    canvas.drawLine(x - sparkle, y, x + sparkle, y, particlePaint)
                    canvas.drawLine(x, y - sparkle, x, y + sparkle, particlePaint)
                }
            }
        }
    }
}

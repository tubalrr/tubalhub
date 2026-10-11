package com.tubalhub.app

import android.app.Activity
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
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

/**
 * TUBAL HUB native home experience.
 *
 * The dashboard is intentionally built with Android Views rather than rendering
 * the website in a WebView. Individual spaces open HubWebActivity only after a
 * user chooses that destination.
 */
class MainActivity : Activity() {

    private data class Feature(
        val icon: String,
        val title: String,
        val caption: String,
        val route: String,
        val accent: Int
    )

    companion object {
        private const val BASE_URL = "https://tubalrr.github.io/tubalhub/"
        private const val COLOR_BG = 0xFFF5F3F7.toInt()
        private const val COLOR_CARD = 0xFFFFFFFF.toInt()
        private const val COLOR_INK = 0xFF171821.toInt()
        private const val COLOR_TEXT = 0xFF20212B.toInt()
        private const val COLOR_MUTED = 0xFF777783.toInt()
        private const val COLOR_ACCENT = 0xFFE0445D.toInt()
        private const val COLOR_LINE = 0xFFE9E5EC.toInt()
        private const val COLOR_SOFT_RED = 0xFFFFE8ED.toInt()
        private const val COLOR_SOFT_PURPLE = 0xFFF0EAFE.toInt()
        private const val COLOR_SOFT_BLUE = 0xFFE5F0FF.toInt()
        private const val COLOR_SOFT_GREEN = 0xFFE4F6EB.toInt()
        private const val COLOR_SOFT_GOLD = 0xFFFFF1D7.toInt()
    }

    private lateinit var contentColumn: LinearLayout
    private lateinit var bottomNavigation: LinearLayout
    private var activeTab: String = "Home"
    private var exploreFilter: String = ""

    private val spaces = listOf(
        Feature("✦", "LifeHub", "Plan your day", "lifehub/index.html", COLOR_SOFT_PURPLE),
        Feature("☁", "Payapang Isip", "Pause and reset", "pages/payapang-isip.html", COLOR_SOFT_GREEN),
        Feature("▣", "CTRLZONE", "Gaming & creator tools", "pages/ctrlzone.html", COLOR_SOFT_BLUE),
        Feature("☕", "Kapeng Barako", "Coffee shop", "pages/kapeng-barako.html", COLOR_SOFT_GOLD),
        Feature("◎", "Community", "People & conversations", "pages/community.html", COLOR_SOFT_RED),
        Feature("⌑", "Shop", "Browse digital goods", "pages/shop.html", COLOR_SOFT_PURPLE)
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        activeTab = savedInstanceState?.getString("active_tab") ?: "Home"

        window.statusBarColor = COLOR_INK
        window.navigationBarColor = COLOR_INK
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(COLOR_BG)
        }

        val scroll = ScrollView(this).apply {
            isFillViewport = true
            clipToPadding = false
            overScrollMode = View.OVER_SCROLL_NEVER
        }

        contentColumn = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(12), dp(20), dp(28))
        }
        scroll.addView(contentColumn, FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ))

        bottomNavigation = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            setPadding(dp(8), dp(8), dp(8), dp(8))
            setBackgroundColor(COLOR_INK)
            elevation = dp(14).toFloat()
        }

        root.addView(scroll, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f
        ))
        root.addView(bottomNavigation, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, dp(72)
        ))
        setContentView(root)

        renderTab(activeTab)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        outState.putString("active_tab", activeTab)
        super.onSaveInstanceState(outState)
    }

    private fun renderTab(tab: String) {
        activeTab = tab
        contentColumn.removeAllViews()
        addBrandHeader(contentColumn)

        when (tab) {
            "Explore" -> buildExplore(contentColumn)
            "Community" -> buildCommunity(contentColumn)
            "Profile" -> buildProfile(contentColumn)
            else -> buildHome(contentColumn)
        }
        renderBottomNavigation()
    }

    private fun addBrandHeader(parent: LinearLayout) {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        val mark = TextView(this).apply {
            text = "TH"
            textSize = 14f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(COLOR_ACCENT, 0xFF9D2349.toInt())
            ).apply { cornerRadius = dp(14).toFloat() }
        }
        row.addView(mark, LinearLayout.LayoutParams(dp(44), dp(44)))

        val nameStack = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(11), 0, 0, 0)
        }
        addText(nameStack, "TUBAL HUB", 15f, COLOR_TEXT, bold = true)
        addText(nameStack, "YOUR DIGITAL SPACE", 9f, COLOR_MUTED, bold = true, top = 2)
        row.addView(nameStack, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))

        val search = TextView(this).apply {
            text = "⌕"
            textSize = 25f
            gravity = Gravity.CENTER
            setTextColor(COLOR_TEXT)
            background = rounded(COLOR_CARD, 16, COLOR_LINE)
            isClickable = true
            isFocusable = true
            contentDescription = "Explore TUBAL HUB"
            setOnClickListener { renderTab("Explore") }
        }
        row.addView(search, LinearLayout.LayoutParams(dp(44), dp(44)))
        parent.addView(row, fullWidth().apply { bottomMargin = dp(20) })
    }

    private fun buildHome(parent: LinearLayout) {
        addText(parent, "WELCOME TO YOUR HUB", 10f, COLOR_ACCENT, bold = true, bottom = 6)
        addText(parent, "Your world,\nyour way.", 32f, COLOR_TEXT, bold = true, bottom = 8)
        addText(
            parent,
            "A calmer way to jump between the tools, ideas and communities you care about.",
            14f, COLOR_MUTED, bottom = 20
        )

        addHero(parent)

        addSectionHeader(parent, "Your spaces", "Six ways to get started")
        addFeatureGrid(parent, spaces)

        addSectionHeader(parent, "Made for your flow", "Go straight to what you need")
        addQuickAction(
            parent, "▤", "Read the latest", "News, announcements and stories",
            "pages/news.html", COLOR_SOFT_BLUE
        )
        addQuickAction(
            parent, "◉", "Meet the community", "Feeds, chat and upcoming events",
            "pages/feeds.html", COLOR_SOFT_RED
        )
        addQuickAction(
            parent, "⚙", "Make it yours", "Account and experience settings",
            "pages/settings.html", COLOR_SOFT_PURPLE
        )

        addText(
            parent,
            "One connected platform. Built to give every part of your day a place.",
            12f, COLOR_MUTED, top = 18, bottom = 2
        )
    }

    private fun addHero(parent: LinearLayout) {
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(22), dp(22), dp(22), dp(22))
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(0xFF242431.toInt(), 0xFF361C35.toInt(), 0xFF872A49.toInt())
            ).apply { cornerRadius = dp(26).toFloat() }
            elevation = dp(3).toFloat()
        }

        val pill = TextView(this).apply {
            text = "TUBAL HUB  •  MOBILE"
            textSize = 9f
            typeface = Typeface.DEFAULT_BOLD
            letterSpacing = 0.08f
            setTextColor(0xFFFFD9E0.toInt())
            setPadding(dp(10), dp(7), dp(10), dp(7))
            background = rounded(0x33FFFFFF, 10)
        }
        card.addView(pill, wrapWidth().apply { bottomMargin = dp(17) })

        addText(card, "More room for\neverything.", 27f, Color.WHITE, bold = true, bottom = 8)
        addText(
            card,
            "Your tools, creative spaces and community—together in one app.",
            13f, 0xFFE7DFE9.toInt(), bottom = 20
        )

        val button = TextView(this).apply {
            text = "Explore your hub   →"
            textSize = 13f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(COLOR_INK)
            gravity = Gravity.CENTER
            setPadding(dp(17), dp(12), dp(17), dp(12))
            background = rounded(Color.WHITE, 13)
            isClickable = true
            isFocusable = true
            setOnClickListener { renderTab("Explore") }
        }
        card.addView(button, wrapWidth())
        parent.addView(card, fullWidth().apply { bottomMargin = dp(27) })
    }

    private fun buildExplore(parent: LinearLayout) {
        addText(parent, "DISCOVER", 10f, COLOR_ACCENT, bold = true, bottom = 6)
        addText(parent, "Explore TUBAL HUB", 28f, COLOR_TEXT, bold = true, bottom = 6)
        addText(parent, "Choose a space and keep going. Your dashboard stays native; tools open when you tap them.", 13f, COLOR_MUTED, bottom = 18)

        val searchWrap = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(14), 0, dp(14), 0)
            background = rounded(Color.WHITE, 16, COLOR_LINE)
        }
        val searchIcon = TextView(this).apply {
            text = "⌕"
            textSize = 23f
            setTextColor(COLOR_MUTED)
        }
        searchWrap.addView(searchIcon, LinearLayout.LayoutParams(dp(30), dp(50)))
        val input = EditText(this).apply {
            hint = "Search spaces"
            textSize = 14f
            setTextColor(COLOR_TEXT)
            setHintTextColor(COLOR_MUTED)
            background = null
            setSingleLine(true)
            setPadding(0, 0, 0, 0)
            setText(exploreFilter)
        }
        searchWrap.addView(input, LinearLayout.LayoutParams(0, dp(50), 1f))
        parent.addView(searchWrap, fullWidth().apply { bottomMargin = dp(20) })

        val results = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        parent.addView(results, fullWidth())
        val allFeatures = spaces + listOf(
            Feature("▤", "News & updates", "Stories and announcements", "pages/news.html", COLOR_SOFT_BLUE),
            Feature("✉", "Messages", "Open hub conversations", "pages/chat.html", COLOR_SOFT_GREEN),
            Feature("▣", "Gaming Zone", "Find games and highlights", "pages/gaming-zone.html", COLOR_SOFT_RED),
            Feature("◷", "Events", "What's happening in the hub", "pages/events.html", COLOR_SOFT_GOLD),
            Feature("?", "Help & guides", "Get help and learn the platform", "pages/help.html", COLOR_SOFT_PURPLE),
            Feature("♙", "About TUBAL HUB", "Learn about the platform", "pages/about.html", COLOR_SOFT_BLUE)
        )

        fun drawResults(query: String) {
            results.removeAllViews()
            val matches = allFeatures.filter {
                it.title.contains(query.trim(), ignoreCase = true) ||
                    it.caption.contains(query.trim(), ignoreCase = true)
            }
            if (matches.isEmpty()) {
                addText(results, "No spaces match that search yet.", 14f, COLOR_MUTED, top = 10, bottom = 10)
            } else {
                matches.forEach { feature ->
                    addQuickAction(results, feature.icon, feature.title, feature.caption, feature.route, feature.accent)
                }
            }
        }
        drawResults(exploreFilter)
        input.addTextChangedListener(object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                exploreFilter = s?.toString().orEmpty()
                drawResults(exploreFilter)
            }
            override fun afterTextChanged(s: android.text.Editable?) = Unit
        })
    }

    private fun buildCommunity(parent: LinearLayout) {
        addText(parent, "TOGETHER", 10f, COLOR_ACCENT, bold = true, bottom = 6)
        addText(parent, "Your people,\nyour conversations.", 28f, COLOR_TEXT, bold = true, bottom = 8)
        addText(parent, "Catch up, share something, or find what's coming next.", 14f, COLOR_MUTED, bottom = 20)

        addCommunityBanner(parent)
        addSectionHeader(parent, "Community spaces", "Pick a place to join in")
        addQuickAction(parent, "◎", "Community Feeds", "Posts, reactions and shared moments", "pages/feeds.html", COLOR_SOFT_RED)
        addQuickAction(parent, "✉", "Messages & chat", "Continue the conversation", "pages/chat.html", COLOR_SOFT_GREEN)
        addQuickAction(parent, "◷", "Events", "See community activities", "pages/events.html", COLOR_SOFT_GOLD)
        addQuickAction(parent, "▤", "News & announcements", "Important updates from the hub", "pages/announcements.html", COLOR_SOFT_BLUE)
        addQuickAction(parent, "♙", "Profiles", "Discover people around the platform", "pages/profiles.html", COLOR_SOFT_PURPLE)
    }

    private fun addCommunityBanner(parent: LinearLayout) {
        val banner = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(20), dp(20), dp(20))
            background = GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                intArrayOf(0xFF282737.toInt(), 0xFF4A233E.toInt())
            ).apply { cornerRadius = dp(23).toFloat() }
        }
        addText(banner, "A SPACE TO SHARE", 9f, 0xFFFFD9E0.toInt(), bold = true, bottom = 10)
        addText(banner, "Small updates can start big conversations.", 21f, Color.WHITE, bold = true, bottom = 8)
        addText(banner, "Open the feed to see what's new in your community.", 13f, 0xFFE7DFE9.toInt(), bottom = 15)
        val cta = TextView(this).apply {
            text = "Open Community Feeds   →"
            textSize = 12f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(COLOR_INK)
            gravity = Gravity.CENTER
            setPadding(dp(14), dp(11), dp(14), dp(11))
            background = rounded(Color.WHITE, 12)
            setOnClickListener { openPage("Community Feeds", "pages/feeds.html") }
        }
        banner.addView(cta, wrapWidth())
        parent.addView(banner, fullWidth().apply { bottomMargin = dp(25) })
    }

    private fun buildProfile(parent: LinearLayout) {
        addText(parent, "YOUR SPACE", 10f, COLOR_ACCENT, bold = true, bottom = 6)
        addText(parent, "Make it feel like yours.", 28f, COLOR_TEXT, bold = true, bottom = 7)
        addText(parent, "Open your account, preferences and help resources.", 14f, COLOR_MUTED, bottom = 20)

        val profileCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(22), dp(24), dp(22), dp(24))
            background = rounded(Color.WHITE, 24, COLOR_LINE)
        }
        val initials = TextView(this).apply {
            text = "TH"
            textSize = 22f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(COLOR_ACCENT, 0xFF8D2347.toInt())
            ).apply { cornerRadius = dp(29).toFloat() }
        }
        profileCard.addView(initials, LinearLayout.LayoutParams(dp(68), dp(68)).apply { bottomMargin = dp(13) })
        addText(profileCard, "TUBAL HUB", 17f, COLOR_TEXT, bold = true, bottom = 5)
        addText(profileCard, "One account. Connected spaces.", 12f, COLOR_MUTED, bottom = 16)
        val accountButton = actionButton("Open account & profile", COLOR_ACCENT, Color.WHITE) {
            openPage("My Profile", "pages/profile-tubal.html")
        }
        profileCard.addView(accountButton, fullWidth())
        parent.addView(profileCard, fullWidth().apply { bottomMargin = dp(23) })

        addSectionHeader(parent, "Settings & support", "Manage your experience")
        addQuickAction(parent, "⚙", "Settings", "Account and experience preferences", "pages/settings.html", COLOR_SOFT_PURPLE)
        addQuickAction(parent, "?", "Help center", "Guides and common questions", "pages/help.html", COLOR_SOFT_BLUE)
        addQuickAction(parent, "ⓘ", "About TUBAL HUB", "What brings the spaces together", "pages/about.html", COLOR_SOFT_GREEN)
    }

    private fun addFeatureGrid(parent: LinearLayout, features: List<Feature>) {
        features.chunked(2).forEachIndexed { rowIndex, rowItems ->
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.TOP
            }
            rowItems.forEachIndexed { columnIndex, feature ->
                val card = buildFeatureCard(feature)
                val lp = LinearLayout.LayoutParams(0, dp(166), 1f)
                if (columnIndex == 0 && rowItems.size > 1) lp.rightMargin = dp(10)
                row.addView(card, lp)
            }
            if (rowItems.size == 1) {
                row.addView(View(this), LinearLayout.LayoutParams(0, dp(166), 1f).apply { leftMargin = dp(10) })
            }
            parent.addView(row, fullWidth().apply {
                bottomMargin = if (rowIndex == (features.size - 1) / 2) dp(2) else dp(10)
            })
        }
    }

    private fun buildFeatureCard(feature: Feature): View {
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(14), dp(14), dp(14), dp(14))
            background = rounded(COLOR_CARD, 21, COLOR_LINE)
            elevation = dp(1).toFloat()
            isClickable = true
            isFocusable = true
            setOnClickListener { openPage(feature.title, feature.route) }
        }

        val top = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        val icon = TextView(this).apply {
            text = feature.icon
            textSize = 21f
            gravity = Gravity.CENTER
            setTextColor(COLOR_TEXT)
            background = rounded(feature.accent, 13)
        }
        top.addView(icon, LinearLayout.LayoutParams(dp(42), dp(42)))
        val arrow = TextView(this).apply {
            text = "↗"
            textSize = 17f
            setTextColor(COLOR_MUTED)
            gravity = Gravity.CENTER
        }
        top.addView(View(this), LinearLayout.LayoutParams(0, 1, 1f))
        top.addView(arrow, LinearLayout.LayoutParams(dp(22), dp(30)))
        card.addView(top, fullWidth().apply { bottomMargin = dp(14) })

        addText(card, feature.title, 14f, COLOR_TEXT, bold = true, bottom = 5)
        addText(card, feature.caption, 11f, COLOR_MUTED)
        return card
    }

    private fun addQuickAction(
        parent: LinearLayout,
        icon: String,
        title: String,
        caption: String,
        route: String,
        tint: Int
    ) {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(13), dp(13), dp(13), dp(13))
            background = rounded(Color.WHITE, 18, COLOR_LINE)
            isClickable = true
            isFocusable = true
            setOnClickListener { openPage(title, route) }
        }
        val iconTile = TextView(this).apply {
            text = icon
            textSize = 21f
            gravity = Gravity.CENTER
            setTextColor(COLOR_TEXT)
            background = rounded(tint, 13)
        }
        row.addView(iconTile, LinearLayout.LayoutParams(dp(45), dp(45)))

        val textColumn = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(12), 0, dp(8), 0)
        }
        addText(textColumn, title, 14f, COLOR_TEXT, bold = true, bottom = 3)
        addText(textColumn, caption, 11f, COLOR_MUTED)
        row.addView(textColumn, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))

        val arrow = TextView(this).apply {
            text = "›"
            textSize = 28f
            setTextColor(COLOR_MUTED)
            gravity = Gravity.CENTER
        }
        row.addView(arrow, LinearLayout.LayoutParams(dp(22), dp(42)))
        parent.addView(row, fullWidth().apply { bottomMargin = dp(9) })
    }

    private fun addSectionHeader(parent: LinearLayout, title: String, subtitle: String) {
        val stack = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }
        addText(stack, title, 19f, COLOR_TEXT, bold = true, bottom = 4)
        addText(stack, subtitle, 12f, COLOR_MUTED)
        parent.addView(stack, fullWidth().apply {
            topMargin = dp(3)
            bottomMargin = dp(15)
        })
    }

    private fun renderBottomNavigation() {
        bottomNavigation.removeAllViews()
        listOf(
            Triple("Home", "⌂", "Home"),
            Triple("Explore", "✦", "Explore"),
            Triple("Community", "◎", "Community"),
            Triple("Profile", "♙", "Profile")
        ).forEach { item ->
            val selected = item.first == activeTab
            val navItem = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER
                setPadding(dp(2), dp(3), dp(2), dp(3))
                background = if (selected) rounded(0x33E0445D, 16) else rounded(COLOR_INK, 16)
                isClickable = true
                isFocusable = true
                contentDescription = item.third
                setOnClickListener { renderTab(item.first) }
            }
            val icon = TextView(this).apply {
                text = item.second
                textSize = 21f
                gravity = Gravity.CENTER
                setTextColor(if (selected) 0xFFFF8D9F.toInt() else 0xFFB8B7C1.toInt())
            }
            navItem.addView(icon, LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(26)
            ))
            val label = TextView(this).apply {
                text = item.third
                textSize = 10f
                typeface = if (selected) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
                gravity = Gravity.CENTER
                setTextColor(if (selected) Color.WHITE else 0xFFB8B7C1.toInt())
            }
            navItem.addView(label, LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(19)
            ))
            bottomNavigation.addView(navItem, LinearLayout.LayoutParams(0, dp(54), 1f).apply {
                leftMargin = dp(2)
                rightMargin = dp(2)
            })
        }
    }

    private fun openPage(title: String, route: String) {
        val cleanRoute = route.trimStart('/')
        val intent = Intent(this, HubWebActivity::class.java).apply {
            putExtra(HubWebActivity.EXTRA_TITLE, title)
            putExtra(HubWebActivity.EXTRA_URL, BASE_URL + cleanRoute)
        }
        startActivity(intent)
    }

    private fun actionButton(
        title: String,
        backgroundColor: Int,
        textColor: Int,
        onClick: () -> Unit
    ): TextView {
        return TextView(this).apply {
            text = title
            textSize = 13f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            setPadding(dp(14), dp(13), dp(14), dp(13))
            setTextColor(textColor)
            background = rounded(backgroundColor, 14)
            isClickable = true
            isFocusable = true
            setOnClickListener { onClick() }
        }
    }

    private fun addText(
        parent: LinearLayout,
        value: String,
        size: Float,
        color: Int,
        bold: Boolean = false,
        top: Int = 0,
        bottom: Int = 0
    ): TextView {
        val text = TextView(this).apply {
            this.text = value
            textSize = size
            setTextColor(color)
            if (bold) typeface = Typeface.DEFAULT_BOLD
            includeFontPadding = true
            setLineSpacing(dp(2).toFloat(), 1.0f)
        }
        parent.addView(text, fullWidth().apply {
            topMargin = dp(top)
            bottomMargin = dp(bottom)
        })
        return text
    }

    private fun rounded(color: Int, radiusDp: Int, strokeColor: Int? = null): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dp(radiusDp).toFloat()
            setColor(color)
            if (strokeColor != null) setStroke(dp(1), strokeColor)
        }
    }

    private fun fullWidth(): LinearLayout.LayoutParams =
        LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)

    private fun wrapWidth(): LinearLayout.LayoutParams =
        LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT)

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()
}

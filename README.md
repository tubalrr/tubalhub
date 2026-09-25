# TUBAL HUB

**Three Brands. One Hub.**

TUBAL HUB is a modern web platform combining gaming, creative tools, community features, news, digital products, and creator-focused experiences.

## 🌐 Live Website

https://tubalrr.github.io/tubalhub/

## 🧭 Platform Overview

### 🌌 TUBAL HUB
The main hub for:
- Community
- Feeds
- Games
- News
- Shop
- Profiles
- Chat
- Events
- Settings
- Digital content

### ⚡ CTRLZONE
Gaming and creator command center featuring:
- Games Library
- Gaming discovery
- Highlights
- Creative content
- Motivation

### 🌿 Payapang Isip
A nature-inspired space for peaceful, creative, and AI-assisted experiences.

---

## 📰 Feeds

TUBAL HUB Feeds is the shared social-content stream for published platform content.

### Features
- Real published content from the shared `hubPosts` stream
- Search and filtering
- Latest / popular sorting
- Saved-feed mode
- Progressive loading
- Reactions and reaction summaries
- Nested comments and replies
- Emoji and attachment support
- Share actions and native Web Share API where available
- Real online/offline presence where presence data is available
- Trending and community discovery sections
- No invented members, engagement totals, or published posts

## 🔁 Unified Content Distribution

TUBAL HUB uses the shared `hubPosts` stream to distribute published content across relevant surfaces.

| Content | Destinations |
|---|---|
| Post | Feeds + Community |
| Product | Feeds + Shop |
| Game | Feeds + Games |
| News | Feeds + News |
| Video | Feeds + News |
| Event | Feeds + Events |
| Announcement | Feeds + News + Community |
| Story | Feeds + News |

Admin publishing tools can create and mirror content into the shared stream.

> Firestore rules stored in this repository must still be deployed to the Firebase project before rule changes become active in production.

---

## 🎮 CTRLZONE — Games Library

CTRLZONE includes a full Games Library with search, categories, official links, and responsive layouts.

### Categories
- MOBA
- FPS
- Battle Royale
- Sandbox
- Simulation
- Strategy
- Racing
- RPG

### Featured / Supported Games

Mobile Legends: Bang Bang, Honor of Kings, League of Legends, Dota 2, Pokémon Unite, VALORANT, Counter-Strike 2, Call of Duty, PUBG: Battlegrounds, Apex Legends, Fortnite, Minecraft, Roblox, Terraria, Ultimate Bus Simulator, Euro Truck Simulator 2, Cities: Skylines, The Sims 4, Transport Fever 2, Civilization VI, Age of Empires IV, StarCraft II, Forza Horizon 5, Assetto Corsa, Need for Speed Heat, Genshin Impact, Honkai: Star Rail, Elden Ring, and Final Fantasy XIV.

---

## 🛒 Shop & Digital Products

The Shop supports:
- Digital products
- Mods
- Music & media
- Product management through the admin dashboard
- Firestore-based product loading
- Checkout foundations
- Product licensing and license verification foundations

Digital products may have separate license terms.

> Real payment processing requires a secure backend or payment provider. Payment secrets must never be placed in client-side code.

---

## 📊 Admin Dashboard

The admin dashboard provides real-data management and monitoring tools, including:
- Site statistics
- User/member management
- Online Now presence monitoring
- News and announcements
- Community/chat moderation
- Shop products and orders
- Events
- Sponsored content
- Notifications
- Analytics where the required Firebase data is available

The dashboard is designed around real Firebase/repository data rather than fabricated statistics.

---

## 🔔 Notifications & Presence

The platform supports:
- Persistent notification state
- Mark-all-as-read handling
- Real-time presence data
- Online/offline indicators
- Presence timestamps and expiry windows

Presence is based on the Firebase `presence` collection when available.

---

## 📰 News

The News section supports admin-managed platform, community, and creator updates.

## 👥 Community & Global Chat

- Community hub
- Global chat
- User profiles
- Moderation tools
- Timed chat bans and mute controls
- Admin moderation
- Firebase Authentication / Firestore integration

---

## 🤖 AI Companion

TUBAL HUB includes a lightweight local AI Companion designed to answer questions about the platform and its features.

The current website chatbot uses a local knowledge engine instead of requiring an external AI API for its basic platform-assistance experience.

---

## 🧪 Real Data Policy

TUBAL HUB follows a **real-data-first / no-fake-data** approach.

Empty states intentionally remain empty when there is no actual content.

Optional demo content, where provided, must be explicitly activated by the user, clearly labeled as **[DEMO]**, and must not be presented as real activity.

Real content can come from:
- Firebase
- Browser storage
- Repository-backed JSON data
- Authenticated user activity
- Admin-published content

---

## 🎨 Themes

The website includes multiple visual modes, including:
- Galaxy
- Forest
- Neon Green
- Aurora
- Nebula
- Nexus Aurora Pro
- Dark Glassmorphism / Aurora Mesh

Theme preferences are stored locally in the user's browser.

---

## 🔐 Authentication & Security

Firebase Authentication supports the account system, including:
- Google sign-in
- Guest/anonymous access where enabled
- User profiles
- Persistent authentication

Firestore and Storage security rules are used to restrict protected operations.

Administrative actions are intended for authorized admin accounts only.

> Client-side code must never be treated as a secure location for private credentials, payment secrets, or privileged service-account keys.

---

## 📱 Mobile / WebView

TUBAL HUB is designed for:
- Desktop browsers
- Mobile browsers
- Android WebView-based applications

Responsive layouts, mobile navigation, touch-friendly controls, and local storage support are used throughout the platform.

---

## 📁 Project Structure

```
/
├── index.html
├── tubal-hub-logo.png
├── LICENSE.md
├── COPYRIGHT.md
├── README.md
├── license.html
├── assets/
│   ├── css/
│   ├── js/
│   └── images/
├── admin/
│   └── admin.html
├── functions/
│   └── index.js
└── pages/
    ├── ctrlzone.html
    ├── payapang-isip.html
    ├── shop.html
    ├── news.html
    ├── community.html
    ├── chat.html
    ├── profiles.html
    ├── settings.html
    ├── contact.html
    ├── privacy.html
    ├── cookies.html
    └── terms.html
```

---

## 🛠️ Technology

- HTML5
- CSS3
- JavaScript
- Firebase Authentication
- Firebase Firestore
- Firebase Storage
- Firebase Cloud Functions
- GitHub Pages
- Android WebView compatibility

---

## 📱 Google Play

[Open Google Play](https://play.google.com/store/games?gl=PH)

---

## 📜 License

TUBAL HUB is distributed under the custom **TUBAL HUB Website License** in [LICENSE.md](LICENSE.md).

The license covers TUBAL HUB's original website materials, code, branding, graphics, UI designs, documentation, and other original assets unless otherwise stated.

Third-party libraries, trademarks, logos, games, media, APIs, and other external materials remain subject to their respective owners and licenses.

For permission requests, licensing questions, or copyright reports:

**Email:** tubalrr@gmail.com

See [COPYRIGHT.md](COPYRIGHT.md) for the copyright and infringement policy.

---

## © Copyright

© 2026 TUBAL HUB — All Rights Reserved.

Built and maintained by **TUBAL HUB**.

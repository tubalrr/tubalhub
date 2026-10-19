import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Eye,
  UsersRound,
  Gamepad2,
  Code2,
  Hexagon,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  PanelsTopLeft,
  Send,
  Sparkles,
  Target,
  Waves,
  X,
  Play,
  type LucideIcon,
} from "lucide-react";

type Brand = {
  number: string;
  name: string;
  descriptor: string;
  tagline: string;
  description: string;
  image: string;
  imageAlt: string;
  accent: "blue" | "amber" | "sea";
  icon: LucideIcon;
  features: string[];
  id: string;
  href: string;
  ctaLabel: string;
  contactTopic?: string;
};

const brands: Brand[] = [
  {
    number: "01",
    name: "CTRLZONE",
    descriptor: "GAMING · COMMUNITY",
    tagline: "Find your next level.",
    description:
      "A home for gaming culture, creators, and the communities that form around every match, world, and shared obsession.",
    image:
      "https://images.pexels.com/photos/7915437/pexels-photo-7915437.jpeg?auto=compress&cs=tinysrgb&w=1400",
    imageAlt: "Gaming setup lit by monitors in a dark room",
    accent: "blue",
    icon: Gamepad2,
    features: ["Gaming culture & discovery", "Creator-led communities", "A place to share the play"],
    id: "ctrlzone",
    href: "./pages/gaming-zone.html",
    ctaLabel: "Explore gaming",
  },
  {
    number: "02",
    name: "LifeHub",
    descriptor: "TOOLS · EVERYDAY LIFE",
    tagline: "Make room for what matters.",
    description:
      "Practical digital tools that bring plans, projects, and everyday routines into one calmer, more useful space.",
    image:
      "https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=1400",
    imageAlt: "Warm and minimal workspace with a laptop and notebook",
    accent: "amber",
    icon: PanelsTopLeft,
    features: ["Personal organization", "Projects & daily planning", "Tools designed for real life"],
    id: "lifehub",
    href: "./lifehub/index.html",
    ctaLabel: "Open LifeHub",
  },
  {
    number: "03",
    name: "Payapang Isip",
    descriptor: "WELLBEING · REFLECTION",
    tagline: "A little more breathing room.",
    description:
      "A gentle corner for reflection, mindful routines, and small moments that help make a busy day feel more human.",
    image:
      "https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=1400",
    imageAlt: "Quiet mindfulness practice in a sunlit, peaceful room",
    accent: "sea",
    icon: Waves,
    features: ["Mindful moments", "Reflection & gentle routines", "A softer pace for busy days"],
    id: "payapang-isip",
    href: "./pages/payapang-isip.html",
    ctaLabel: "Explore Payapang Isip",
  },
];

const navItems = [
  { label: "Hub", href: "#hub" },
  { label: "Brands", href: "#brands" },
  { label: "Platform", href: "#platform" },
  { label: "Story", href: "#story" },
  { label: "Connect", href: "#connect" },
];

const platformLinks: {
  title: string;
  category: string;
  description: string;
  href: string;
  icon: LucideIcon;
}[] = [
  { title: "Gaming Zone", category: "PLAY", description: "Game discovery, gaming culture, and CTRLZONE community.", href: "/tubalhub/pages/gaming-zone.html", icon: Gamepad2 },
  { title: "LifeHub — Personal OS", category: "EVERYDAY TOOLS", description: "Open the existing personal organizer for everyday planning and routines.", href: "/tubalhub/lifehub/index.html", icon: PanelsTopLeft },
  { title: "Shop the Hub", category: "DISCOVER", description: "Browse the existing TUBAL HUB shop and featured items.", href: "/tubalhub/pages/shop.html", icon: PanelsTopLeft },
  { title: "Community & Fan Club", category: "COMMUNITY", description: "Connect with people and join the community spaces.", href: "/tubalhub/pages/community.html", icon: UsersRound },
  { title: "Feeds & News", category: "UPDATES", description: "Catch up with community feeds and hub announcements.", href: "/tubalhub/pages/feeds.html", icon: Waves },
  { title: "API Discovery Hub", category: "DEVELOPER TOOLS", description: "Explore APIs and resources from the existing discovery hub.", href: "/tubalhub/pages/api-mega-hub.html", icon: Code2 },
  { title: "Open-source Toolbox", category: "OPEN SOURCE", description: "Find open-source tools and useful developer resources.", href: "/tubalhub/pages/open-source-toolbox.html", icon: Code2 },
  { title: "System Dashboard", category: "WORKSPACE", description: "Open the existing system dashboard and workspace entry.", href: "/tubalhub/pages/system-dashboard.html", icon: PanelsTopLeft },
  { title: "Kapeng Barako", category: "FEATURED BRAND", description: "Visit the Kapeng Barako coffee project page.", href: "/tubalhub/pages/kapeng-barako.html", icon: Sparkles },
  { title: "Payapang Isip", category: "WELLBEING", description: "Open the wellness and reflection space.", href: "/tubalhub/pages/payapang-isip.html", icon: Waves },
  { title: "Calendar & Planning", category: "PLANNING", description: "Access the calendar and planning tools.", href: "/tubalhub/pages/calendar.html", icon: PanelsTopLeft },
  { title: "Tubal Academy", category: "LEARN", description: "Discover learning resources and guides.", href: "/tubalhub/pages/tubal-academy.html", icon: Code2 },
  { title: "Help Center", category: "SUPPORT", description: "Find help, usage guides, and answers to common questions.", href: "/tubalhub/pages/help.html", icon: MessageCircle },
];

function Logo({ compact = false, homeHref = "#hub" }: { compact?: boolean; homeHref?: string }) {
  return (
    <a className={`brand-logo${compact ? " brand-logo--compact" : ""}`} href={homeHref} aria-label="TUBAL HUB home">
      <span className="brand-logo__mark" aria-hidden="true">
        <Hexagon size={31} strokeWidth={1.7} />
        <span className="brand-logo__core" />
      </span>
      <span className="brand-logo__wordmark">
        TUBAL<span>HUB</span>
        {!compact && <small>THREE BRANDS. ONE HUB.</small>}
      </span>
    </a>
  );
}

function Header({ homePrefix = "" }: { homePrefix?: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={`site-header${scrolled ? " site-header--scrolled" : ""}`}>
      <nav className="nav-shell" aria-label="Main navigation">
        <Logo homeHref={`${homePrefix}#hub`} />
        <div className="desktop-nav">
          {navItems.map((item) => (
            <a key={item.href} href={`${homePrefix}${item.href}`}>
              {item.label}
            </a>
          ))}
        </div>
        <a className="button button--nav" href="./app/index.html">
          {homePrefix ? "Hub Home" : "Open Hub"} <ArrowUpRight size={15} />
        </a>
        <button
          className="menu-toggle"
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </nav>
      <div id="mobile-navigation" className={`mobile-nav${menuOpen ? " mobile-nav--open" : ""}`} hidden={!menuOpen}>
        {navItems.map((item) => (
          <a key={item.href} href={`${homePrefix}${item.href}`} onClick={closeMenu}>
            {item.label} <ArrowUpRight size={15} />
          </a>
        ))}
        <a className="mobile-nav__cta" href="./app/index.html" onClick={closeMenu}>
          Open the full Hub <ArrowRight size={16} />
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero section-shell" id="hub" aria-labelledby="hero-title">
      <div className="hero-copy reveal">
        <div className="eyebrow">
          <span className="eyebrow__spark"><Sparkles size={13} /></span>
          One connected ecosystem
        </div>
        <h1 id="hero-title">
          Three Brands.
          <span className="hero-title__gradient">One Hub.</span>
        </h1>
        <p className="hero-lede">
          Different passions. Shared purpose. TUBAL HUB brings commerce, community,
          and culture together in one connected digital home.
        </p>
        <div className="hero-actions">
          <a className="button button--primary" href="#brands">
            Explore the brands <ArrowRight size={17} />
          </a>
          <a className="button button--ghost" href="./app/index.html">
            Open the Hub <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="hero-proof">
          <span><Check size={14} /> Three distinct identities</span>
          <span><Check size={14} /> One shared direction</span>
        </div>
      </div>

      <div className="hero-visual reveal" aria-label="A preview of the three connected TUBAL HUB brands">
        <div className="hero-orbit hero-orbit--outer" />
        <div className="hero-orbit hero-orbit--inner" />
        <div className="hero-visual__glow hero-visual__glow--blue" />
        <div className="hero-visual__glow hero-visual__glow--gold" />
        <div className="hero-photo hero-photo--main">
          <img
            src="https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1400"
            alt="Creative team sharing ideas around a work table"
            loading="eager"
            fetchPriority="high"
          />
          <div className="hero-photo__caption">
            <span className="live-dot" />
            <span><strong>One shared space</strong><small>For what moves you</small></span>
          </div>
        </div>
        <div className="orbit-label orbit-label--top">
          <span className="orbit-label__icon orbit-label__icon--blue"><Gamepad2 size={17} /></span>
          <span><b>CTRLZONE</b><small>Gaming culture</small></span>
        </div>
        <div className="orbit-label orbit-label--bottom">
          <span className="orbit-label__icon orbit-label__icon--gold"><PanelsTopLeft size={17} /></span>
          <span><b>LifeHub</b><small>Everyday tools</small></span>
        </div>
        <div className="orbit-label orbit-label--side">
          <span className="orbit-label__icon orbit-label__icon--sea"><Waves size={17} /></span>
          <span><b>Payapang Isip</b><small>Mindful living</small></span>
        </div>
        <div className="hero-visual__index">TH / 001</div>
      </div>

      <div className="stats-strip reveal" aria-label="TUBAL HUB at a glance">
        <div className="stat-item"><strong>03</strong><span>Distinct brands</span></div>
        <div className="stat-item"><strong>01</strong><span>Connected platform</span></div>
        <div className="stat-item"><strong>12k<span className="stat-plus">+</span></strong><span>Members</span></div>
        <div className="stat-item"><strong>09</strong><span>Cities reached</span></div>
      </div>
      <p className="stats-note">Community figures are provided project targets and should be verified before public launch.</p>
    </section>
  );
}

function BrandCard({ brand }: { brand: Brand }) {
  const Icon = brand.icon;
  return (
    <article id={`brand-${brand.id}`} className={`brand-card brand-card--${brand.accent} reveal`}>
      <div className="brand-card__image-wrap">
        <img src={brand.image} alt={brand.imageAlt} loading="lazy" />
        <div className="brand-card__image-shade" />
        <span className="brand-card__number">{brand.number} / 03</span>
        <span className="brand-card__image-icon"><Icon size={20} /></span>
      </div>
      <div className="brand-card__body">
        <p className="brand-card__descriptor">{brand.descriptor}</p>
        <h3>{brand.name}</h3>
        <p className="brand-card__tagline">{brand.tagline}</p>
        <p className="brand-card__description">{brand.description}</p>
        <ul className="brand-features">
          {brand.features.map((feature) => (
            <li key={feature}><Check size={14} /> {feature}</li>
          ))}
        </ul>
        <a
          className="brand-card__link"
          href={brand.href}
          onClick={() => {
            if (brand.contactTopic) {
              window.dispatchEvent(new CustomEvent("tubalhub:select-topic", { detail: brand.contactTopic }));
            }
          }}
        >
          {brand.ctaLabel} <ArrowUpRight size={16} />
        </a>
      </div>
      <div className="brand-card__edge" aria-hidden="true" />
    </article>
  );
}

function Brands() {
  return (
    <section className="brands-section section-shell section-spacing" id="brands" aria-labelledby="brands-title">
      <div className="section-heading reveal">
        <div className="section-eyebrow"><span>01</span> The brand universe</div>
        <h2 id="brands-title">Three paths.<br /><span className="text-gradient">One bigger picture.</span></h2>
        <p>Each brand stands on its own. Together, they create more ways to discover, connect, and grow.</p>
      </div>
      <div className="brand-grid">
        {brands.map((brand) => <BrandCard key={brand.name} brand={brand} />)}
      </div>
      <div className="brands-bottom reveal">
        <span className="brands-bottom__rule" />
        <p>Different by design. Connected by intention.</p>
        <span className="brands-bottom__rule" />
      </div>
    </section>
  );
}

function Platform() {
  return (
    <section className="platform-section section-shell section-spacing" id="platform" aria-labelledby="platform-title">
      <div className="section-heading reveal">
        <div className="section-eyebrow"><span>THE TOOLKIT</span> Existing features, one place</div>
        <h2 id="platform-title">Your hub is still here.<br /><span className="text-gradient">Now easier to explore.</span></h2>
        <p>The new homepage is connected to the tools and pages already in TUBAL HUB. Open a feature directly below, or enter the full existing hub for the broader navigation.</p>
      </div>
      <div className="platform-grid">
        {platformLinks.map((item) => {
          const Icon = item.icon;
          return (
            <a className="platform-card reveal" href={item.href} key={item.title}>
              <div className="platform-card__top">
                <span className="platform-card__icon"><Icon size={20} /></span>
                <span className="platform-card__category">{item.category}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <span className="platform-card__link">Open feature <ArrowUpRight size={15} /></span>
            </a>
          );
        })}
      </div>
      <div className="platform-footer reveal">
        <span><PanelsTopLeft size={18} /> The legacy hub, existing pages, and tools are being kept in place.</span>
        <a className="button button--primary" href="./app/index.html">Enter full Hub <ArrowRight size={16} /></a>
      </div>
    </section>
  );
}

function Story() {
  return (
    <section className="story-section section-shell section-spacing" id="story" aria-labelledby="story-title">
      <div className="story-visual reveal">
        <img
          src="https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=1400"
          alt="People collaborating at a table in a bright, modern studio"
          loading="lazy"
        />
        <div className="story-visual__frame" />
        <div className="story-stamp">
          <span className="story-stamp__icon"><Hexagon size={24} /></span>
          <strong>One hub.<br />Many ways forward.</strong>
          <small>Built around people</small>
        </div>
        <div className="story-visual__label">A connected point of view <span>↗</span></div>
      </div>
      <div className="story-copy reveal">
        <div className="section-eyebrow"><span>02</span> The reason behind it</div>
        <h2 id="story-title">Good things grow<br /> <span className="text-gradient">better together.</span></h2>
        <p className="story-lede">
          The internet is full of separate places to play, plan, and pause.
          TUBAL HUB is built around a simpler idea: people shouldn't have to
          choose just one part of themselves to belong.
        </p>
        <p>
          We bring distinct brand experiences under one roof while giving each
          the freedom to keep its own voice, community, and character. The hub
          is the connection — not a replacement for what makes each brand special.
        </p>
        <div className="purpose-grid">
          <article className="purpose-card">
            <span className="purpose-card__icon purpose-card__icon--blue"><Target size={19} /></span>
            <h3>Our mission</h3>
            <p>Make useful, welcoming digital experiences easier to find and easier to connect.</p>
          </article>
          <article className="purpose-card">
            <span className="purpose-card__icon purpose-card__icon--gold"><Eye size={19} /></span>
            <h3>Our vision</h3>
            <p>A connected ecosystem where creativity, community, and everyday wellbeing can thrive.</p>
          </article>
        </div>
        <a className="inline-link" href="#connect">Build the next chapter with us <ArrowRight size={16} /></a>
      </div>
    </section>
  );
}

function Connect() {
  const [status, setStatus] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("General enquiry");

  useEffect(() => {
    const selectTopic = (event: Event) => {
      const topicEvent = event as CustomEvent<string>;
      if (topicEvent.detail) setSelectedTopic(topicEvent.detail);
    };
    window.addEventListener("tubalhub:select-topic", selectTopic);
    return () => window.removeEventListener("tubalhub:select-topic", selectTopic);
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const topic = String(form.get("topic") ?? "General enquiry").trim();
    const message = String(form.get("message") ?? "").trim();

    if (!name || !email || !message) {
      setStatus("Please complete all fields before sending.");
      return;
    }

    const subject = encodeURIComponent("TUBAL HUB — " + topic + " (" + name + ")");
    const body = encodeURIComponent(
      "Name: " + name + "\nEmail: " + email + "\nTopic: " + topic + "\n\nMessage:\n" + message,
    );
    setStatus("Your email app should open with the message ready to send. This static page does not store submissions.");
    window.location.href = "mailto:tubalrr@gmail.com?subject=" + subject + "&body=" + body;
  };

  return (
    <section className="connect-section section-shell section-spacing" id="connect" aria-labelledby="connect-title">
      <div className="connect-panel">
        <div className="connect-orb connect-orb--blue" />
        <div className="connect-orb connect-orb--gold" />
        <div className="connect-intro reveal">
          <div className="section-eyebrow"><span>03</span> Start a conversation</div>
          <h2 id="connect-title">Let's make<br /><span className="text-gradient">something connect.</span></h2>
          <p>Have a partnership idea, a question about one of our brands, or a vision that fits the ecosystem? We'd love to hear about it.</p>
          <div className="contact-details">
            <a href="mailto:tubalrr@gmail.com" className="contact-detail">
              <span className="contact-detail__icon"><Mail size={18} /></span>
              <span><small>Email us</small><strong>tubalrr@gmail.com</strong></span>
              <ArrowUpRight size={15} className="contact-detail__arrow" />
            </a>
            <div className="contact-detail">
              <span className="contact-detail__icon"><MapPin size={18} /></span>
              <span><small>Rooted in</small><strong>The Philippines</strong></span>
            </div>
          </div>
          <div className="social-row" aria-label="Social and project links">
            <a href="https://github.com/tubalrr/tubalhub" target="_blank" rel="noreferrer" aria-label="TUBAL HUB on GitHub"><Code2 size={17} /></a>
            <a href="https://www.facebook.com/search/top?q=TUBAL%20HUB" target="_blank" rel="noreferrer" aria-label="Search TUBAL HUB on Facebook"><UsersRound size={17} /></a>
            <a href="https://discord.gg/EnR4KWSum" target="_blank" rel="noreferrer" aria-label="Join TUBAL HUB on Discord"><MessageCircle size={17} /></a>
            <a href="https://www.youtube.com/results?search_query=TUBAL+HUB" target="_blank" rel="noreferrer" aria-label="Search TUBAL HUB on YouTube"><Play size={17} /></a>
          </div>
          <p className="social-note">Social profile links can be swapped for official brand handles before launch.</p>
        </div>

        <form
          className="contact-form reveal"
          onSubmit={handleSubmit}
          aria-label="Contact TUBAL HUB"
        >
          <div className="contact-form__heading">
            <span>YOUR NOTE, OUR NEXT STEP</span>
            <MessageCircle size={20} />
          </div>
          <label htmlFor="contact-name">Your name</label>
          <input id="contact-name" name="name" type="text" autoComplete="name" placeholder="How should we call you?" maxLength={100} required />
          <label htmlFor="contact-email">Email address</label>
          <input id="contact-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} required />
          <label htmlFor="contact-topic">What are you reaching out about?</label>
          <select
            id="contact-topic"
            name="topic"
            value={selectedTopic}
            onChange={(event) => setSelectedTopic(event.target.value)}
          >
            <option>General enquiry</option>
            <option>CTRLZONE</option>
            <option>LifeHub</option>
            <option>Payapang Isip</option>
            <option>Partnership</option>
            <option>Feedback</option>
          </select>
          <label htmlFor="contact-message">What’s on your mind?</label>
          <textarea id="contact-message" name="message" rows={5} placeholder="Tell us a little about your idea..." maxLength={4000} required />
          <button className="button button--primary contact-submit" type="submit">
            Prepare email <Send size={16} />
          </button>
          <p className="form-disclaimer">No account required. Your email app opens with your message prepared; this page doesn't store it.</p>
          {status && <p className="form-status" role="status">{status}</p>}
        </form>
      </div>
    </section>
  );
}

function Footer({ homePrefix = "" }: { homePrefix?: string }) {
  return (
    <footer className="site-footer">
      <div className="footer-main section-shell">
        <div className="footer-brand">
          <Logo compact homeHref={`${homePrefix}#hub`} />
          <p>Three brands. One hub. A connected home for commerce, community, and culture.</p>
          <span className="footer-location"><MapPin size={14} /> Made with intention in the Philippines</span>
        </div>
        <div className="footer-column">
          <strong>Explore</strong>
          <a href={`${homePrefix}#hub`}>The hub</a>
          <a href={`${homePrefix}#brands`}>Our brands</a>
          <a href={`${homePrefix}#story`}>Our story</a>
          <a href={`${homePrefix}#connect`}>Get in touch</a>
          <a href="./app/index.html">Open full Hub <ArrowUpRight size={12} /></a>
        </div>
        <div className="footer-column">
          <strong>The brands</strong>
          <a href={`${homePrefix}#brand-ctrlzone`}>CTRLZONE <ArrowUpRight size={12} /></a>
          <a href={`${homePrefix}#brand-lifehub`}>LifeHub <ArrowUpRight size={12} /></a>
          <a href={`${homePrefix}#brand-payapang-isip`}>Payapang Isip <ArrowUpRight size={12} /></a>
        </div>
        <div className="footer-column footer-column--note">
          <strong>Stay in the loop</strong>
          <p>Partnerships, ideas, or just saying hello — every good connection starts somewhere.</p>
          <a className="footer-email" href="mailto:tubalrr@gmail.com">Send us a note <ArrowRight size={15} /></a>
        </div>
      </div>
      <div className="footer-bottom section-shell">
        <span>© {new Date().getFullYear()} TUBAL HUB. All rights reserved.</span>
        <span>Built for people, not just platforms.</span>
        <a href={`${homePrefix}#hub`}>Back to top ↑</a>
      </div>
    </footer>
  );
}


type RoutePageInfo = {
  title: string;
  category: string;
  description: string;
  highlights: [string, string, string];
};

const routeCatalog: Record<string, RoutePageInfo> = {
  "components/ai-assistant.html": { title: "TUBAL HUB AI Assistant", category: "ASSISTANT / GUIDANCE", description: "A redesigned assistant destination for finding answers, discovering tools, and moving through the TUBAL HUB ecosystem with less friction.", highlights: ["Get oriented with the platform", "Discover relevant project destinations", "Keep useful resources within reach"] },
  "components/update-modal.html": { title: "What’s New", category: "PRODUCT UPDATES", description: "A refreshed updates destination for introducing new platform improvements, design changes, and newly available destinations.", highlights: ["Review the latest platform changes", "Discover new destinations", "Stay aligned with the current Hub experience"] },
  "components/update-notifier.html": { title: "Platform Update Center", category: "RELEASE NOTES", description: "A clearer home for release information and service notices across the TUBAL HUB ecosystem.", highlights: ["Review platform announcements", "Understand what has changed", "Find the relevant tool or destination"] },
  "app/index.html": { title: "The TUBAL HUB Platform", category: "THE FULL HUB", description: "A redesigned launchpad for the whole TUBAL HUB ecosystem. Jump into the projects, resources, and destinations from one clear starting point.", highlights: ["Explore every destination from a single directory", "Find project pages without the old maze of navigation", "Return to the new homepage at any time"] },
  "admin/admin.html": { title: "Admin Workspace", category: "ADMINISTRATION", description: "A refreshed operations surface for organizing the TUBAL HUB project and navigating the available management areas.", highlights: ["A clear starting point for site operations", "Direct links to the platform tools", "Consistent layouts across devices"] },
  "admin/demo.html": { title: "Workspace Preview", category: "ADMIN PREVIEW", description: "A visual preview of the updated TUBAL HUB workspace, redesigned to match the new platform experience.", highlights: ["Preview the shared component system", "Review the new page layout", "Move from preview to the main hub"] },
  "admin/login.html": { title: "Administrator Access", category: "SECURE ACCESS", description: "A refreshed access page for authorized site administration. Administrative credentials and permissions still require their own secure backend.", highlights: ["Clear sign-in entry point", "Security-first navigation", "Return to the main hub when finished"] },
  "pages/about.html": { title: "About TUBAL HUB", category: "OUR STORY", description: "TUBAL HUB connects distinct experiences for gaming, everyday tools, and mindful living without forcing them into one identity.", highlights: ["The reason behind the connected ecosystem", "How the brands fit together", "What we are building next"] },
  "pages/affiliate.html": { title: "Affiliate Program", category: "PARTNER WITH US", description: "Explore partnership opportunities and ways creators or collaborators may connect with the TUBAL HUB ecosystem.", highlights: ["Partnership pathways", "Clear collaboration expectations", "A direct way to start a conversation"] },
  "pages/ai-music.html": { title: "AI Music Studio", category: "CREATE / LISTEN", description: "A refreshed creative space for discovering music experiments, audio ideas, and future AI-assisted music workflows.", highlights: ["Discover music and audio projects", "Collect ideas for future releases", "Find related creative tools"] },
  "pages/announcements.html": { title: "Announcements", category: "THE LATEST", description: "A focused home for product updates, platform announcements, and important community notices.", highlights: ["See what has changed", "Find relevant platform updates", "Move directly to related services"] },
  "pages/api-mega-hub.html": { title: "API Discovery Hub", category: "DEVELOPER TOOLS", description: "Explore an organized gateway for public APIs, integration ideas, and developer resources across the ecosystem.", highlights: ["Discover APIs by use case", "Find building blocks for projects", "Jump to developer and open-source tools"] },
  "pages/calendar.html": { title: "Calendar & Planning", category: "PLAN AHEAD", description: "A redesigned planning destination for dates, schedules, and upcoming milestones in the TUBAL HUB ecosystem.", highlights: ["Keep dates and plans visible", "Connect schedules to your workflow", "Explore related planning tools"] },
  "pages/careers.html": { title: "Careers", category: "BUILD WITH US", description: "Learn about ways to contribute to the TUBAL HUB ecosystem as its projects and communities evolve.", highlights: ["Discover contribution pathways", "Understand the project direction", "Start a conversation about opportunities"] },
  "pages/chat.html": { title: "Community Chat", category: "CONNECT", description: "A refreshed entry to conversation and collaboration spaces across the TUBAL HUB community.", highlights: ["Find your community destinations", "Explore live and social spaces", "Use the right channel for the right conversation"] },
  "pages/checkout-success.html": { title: "Order Confirmation", category: "THANK YOU", description: "A redesigned confirmation destination for the shopping journey. For real orders, verify payment and fulfillment status using the connected order system.", highlights: ["Review your purchase next steps", "Find order and store information", "Return to the Hub when ready"] },
  "pages/checkout.html": { title: "Checkout", category: "SHOPPING JOURNEY", description: "A cleaner checkout destination for the TUBAL HUB store experience. Payment and order processing must be connected to the relevant commerce service.", highlights: ["Review the shopping journey", "Find help for orders and payments", "Return to the store or Hub"] },
  "pages/community-guidelines.html": { title: "Community Guidelines", category: "COMMUNITY FIRST", description: "A clear guide to keeping TUBAL HUB spaces welcoming, constructive, and respectful for everyone.", highlights: ["Respectful participation", "Safer community interactions", "How to report a concern"] },
  "pages/community.html": { title: "Community & Fan Club", category: "FIND YOUR PEOPLE", description: "Discover the community destinations and shared spaces that bring gaming, creators, and TUBAL HUB projects together.", highlights: ["Find community spaces", "Explore events and updates", "Connect through the right platform"] },
  "pages/contact.html": { title: "Contact TUBAL HUB", category: "LET’S CONNECT", description: "Choose the right way to contact the team about a project, partnership, platform question, or feedback.", highlights: ["Contact for general questions", "Share collaboration ideas", "Find helpful links before reaching out"] },
  "pages/cookies.html": { title: "Cookie Policy", category: "PRIVACY & PREFERENCES", description: "Understand how browser storage and cookies may be used by the TUBAL HUB services you visit.", highlights: ["Understand stored preferences", "Review privacy choices", "Find the related policy pages"] },
  "pages/copyright.html": { title: "Copyright & Content", category: "CONTENT RIGHTS", description: "Learn the principles for respecting creative ownership, attribution, and intellectual property across TUBAL HUB content.", highlights: ["Respect authorship and ownership", "Understand reuse expectations", "Know how to raise a rights concern"] },
  "pages/ctrlzone.html": { title: "CTRLZONE", category: "GAMING / COMMUNITY", description: "The gaming identity within TUBAL HUB: a destination for game discovery, creator culture, and communities built around play.", highlights: ["Discover gaming destinations", "Find community and gaming resources", "Explore projects connected to CTRLZONE"] },
  "pages/events.html": { title: "Events", category: "WHAT’S HAPPENING", description: "Find community activities, featured events, and planned moments across TUBAL HUB destinations.", highlights: ["Browse event information", "Know where to participate", "Find news and announcements"] },
  "pages/faq.html": { title: "Frequently Asked Questions", category: "QUICK ANSWERS", description: "Get clear directions to common TUBAL HUB destinations and understand how the connected platform is organized.", highlights: ["Find answers faster", "Understand platform navigation", "Open help resources when needed"] },
  "pages/feeds.html": { title: "Feeds & Updates", category: "THE COMMUNITY PULSE", description: "A redesigned destination for updates and community activity across the TUBAL HUB ecosystem.", highlights: ["Catch up on updates", "Find the latest community destinations", "Jump to news and announcements"] },
  "pages/gaming-zone.html": { title: "Gaming Zone", category: "CTRLZONE / PLAY", description: "Discover gaming culture, game-related resources, community links, and creator destinations in the CTRLZONE experience.", highlights: ["Explore gaming destinations", "Find creator and community spaces", "Connect to related projects"] },
  "pages/guide.html": { title: "How to Use TUBAL HUB", category: "GETTING STARTED", description: "A practical guide to finding your way around the redesigned TUBAL HUB and moving between its connected destinations.", highlights: ["Start from the main Hub", "Use the platform directory", "Find support when you need it"] },
  "pages/help.html": { title: "Help Center", category: "SUPPORT / GUIDANCE", description: "Find clear directions to platform features, support pages, account destinations, and useful resources.", highlights: ["Find support pages quickly", "Understand the available destinations", "Move to the right service"] },
  "pages/ip.html": { title: "Intellectual Property", category: "CREATIVE RIGHTS", description: "Information about intellectual property, attribution, and responsible use of creative work across TUBAL HUB.", highlights: ["Respect original work", "Understand ownership basics", "Know where rights questions belong"] },
  "pages/kapeng-barako.html": { title: "Kapeng Barako", category: "COFFEE / FEATURED PROJECT", description: "Explore the Kapeng Barako coffee project, its brand story, product information, and related storefront destination.", highlights: ["Discover the coffee project", "Find product and store information", "Explore other connected brands"] },
  "pages/library.html": { title: "Resource Library", category: "LEARN / SAVE", description: "A refreshed entry to resource collections, saved references, and knowledge destinations across the ecosystem.", highlights: ["Browse learning resources", "Keep useful references organized", "Discover the developer toolbox"] },
  "pages/license.html": { title: "Licenses", category: "OPEN & RESPONSIBLE", description: "Review license information associated with software, resources, and content in the TUBAL HUB ecosystem.", highlights: ["Understand usage permissions", "Respect attribution requirements", "Find project source information"] },
  "pages/live.html": { title: "Live Space", category: "LIVE / COMMUNITY", description: "A redesigned gateway to live sessions, streaming destinations, and community moments.", highlights: ["Find live destinations", "Explore gaming and community spaces", "Keep up with announcements"] },
  "pages/login.html": { title: "Log In", category: "ACCOUNT ACCESS", description: "A refreshed account entry page. Sign-in, identity verification, and account security depend on the configured authentication service.", highlights: ["Clear account access entry", "Security-aware guidance", "Find sign-up and help destinations"] },
  "pages/moderation.html": { title: "Moderation Center", category: "COMMUNITY SAFETY", description: "A clearer home for community standards, reporting guidance, and moderation-related resources.", highlights: ["Understand community standards", "Find reporting guidance", "Explore help and guidelines"] },
  "pages/news.html": { title: "News & Stories", category: "THE LATEST", description: "Catch up on TUBAL HUB project updates, stories, launches, and community news in one organized destination.", highlights: ["See project updates", "Explore stories and announcements", "Find connected brands"] },
  "pages/open-source-toolbox.html": { title: "Open-source Toolbox", category: "BUILD / DISCOVER", description: "Explore open-source utilities and developer resources that can help you build, learn, and experiment.", highlights: ["Discover useful tools", "Explore APIs and developer resources", "Find learning destinations"] },
  "pages/payapang-isip.html": { title: "Payapang Isip", category: "WELLBEING / REFLECTION", description: "A calmer destination for reflective routines, mindful moments, and gentle tools for everyday wellbeing.", highlights: ["Create space for reflection", "Explore mindful routines", "Find related everyday tools"] },
  "pages/press.html": { title: "Press & Media", category: "MEDIA RESOURCES", description: "Find the public-facing information and project resources useful for sharing or covering the TUBAL HUB ecosystem.", highlights: ["Understand the project story", "Find brand information", "Start a media inquiry"] },
  "pages/privacy.html": { title: "Privacy Policy", category: "YOUR DATA MATTERS", description: "Understand privacy principles and what to consider when using TUBAL HUB services that may store preferences or account information.", highlights: ["Know what data to consider", "Review privacy-related destinations", "Find contact and policy information"] },
  "pages/profile-tubal.html": { title: "TUBAL HUB Profile", category: "PROJECT IDENTITY", description: "A redesigned project profile with the essential identity, direction, and public destinations for TUBAL HUB.", highlights: ["Understand the platform identity", "Find its public destinations", "Explore the connected brands"] },
  "pages/profiles.html": { title: "Community Profiles", category: "PEOPLE / COMMUNITY", description: "Discover profile-related destinations and ways people may represent themselves within the TUBAL HUB community.", highlights: ["Explore community profiles", "Find account-related resources", "Keep participation respectful"] },
  "pages/settings.html": { title: "Settings & Preferences", category: "MAKE IT YOURS", description: "Find guidance for configuring the services and preferences available in the TUBAL HUB ecosystem.", highlights: ["Understand preference options", "Navigate to account tools", "Find support for settings"] },
  "pages/shop.html": { title: "Shop the Hub", category: "DISCOVER / SHOP", description: "Explore the shopping destination and featured products connected to the TUBAL HUB ecosystem.", highlights: ["Browse featured products", "Review order and checkout information", "Find the Kapeng Barako project"] },
  "pages/signup.html": { title: "Create an Account", category: "JOIN THE HUB", description: "A clear account creation entry. Registration and secure account management require the configured authentication provider.", highlights: ["Understand account creation", "Find the sign-in destination", "Review privacy and help information"] },
  "pages/system-dashboard.html": { title: "System Dashboard", category: "THE WORKSPACE", description: "A redesigned command center for finding platform destinations, project resources, and useful tools without the old scattered navigation.", highlights: ["Open core destinations quickly", "Explore developer and planning tools", "Return to the connected platform"] },
  "pages/terms.html": { title: "Terms & Conditions", category: "SERVICE TERMS", description: "Review the terms and usage expectations that apply when using TUBAL HUB services and connected destinations.", highlights: ["Understand use expectations", "Review account and content responsibilities", "Find policy and contact pages"] },
  "pages/tubal-academy.html": { title: "Tubal Academy", category: "LEARN / BUILD", description: "Discover learning resources, guides, and topics that help users build skills and navigate the digital ecosystem.", highlights: ["Find learning destinations", "Build practical skills", "Explore developer resources"] },
  "pages/tubal-dark-modding.html": { title: "Tubal Dark Modding", category: "MODDING / CREATIVE TOOLS", description: "A redesigned entry for modding resources, project notes, and creative customization destinations.", highlights: ["Explore modding resources", "Find related tools", "Discover community and gaming links"] },
  "pages/tubal-dark-tools.html": { title: "Tubal Dark Tools", category: "TOOLS / UTILITIES", description: "Discover utility and tool destinations in a clearer, more consistent TUBAL HUB experience.", highlights: ["Find useful utilities", "Navigate tool categories", "Explore open-source resources"] },
  "lifehub/index.html": { title: "LifeHub — Personal OS", category: "EVERYDAY TOOLS", description: "LifeHub is the everyday organizer destination for planning, personal workflows, notes, goals, habits, and practical routines.", highlights: ["Organize everyday plans", "Find focused planning tools", "Return to the connected Hub"] },
  "lifehub/landing.html": { title: "LifeHub", category: "PERSONAL ORGANIZATION", description: "A redesigned introduction to LifeHub, a personal organizer for everyday planning, habits, notes, and routines.", highlights: ["Understand the LifeHub approach", "Explore planning tools", "Start from the main Hub"] },
  "lifehub-calendar.html": { title: "LifeHub Calendar", category: "CALENDAR / ROUTINES", description: "A focused planning destination for calendars, schedules, and everyday routines.", highlights: ["View planning destinations", "Keep dates visible", "Find connected personal tools"] },
  "lifehub/budget/index.html": { title: "LifeHub Budget", category: "MONEY / PLANNING", description: "A redesigned entry to the budgeting area for organizing spending plans, categories, and financial goals.", highlights: ["Organize budget categories", "Review money-planning concepts", "Find related LifeHub tools"] },
  "lifehub/goals/index.html": { title: "LifeHub Goals", category: "GOALS / PROGRESS", description: "A focused destination for setting goals, identifying next steps, and keeping personal progress visible.", highlights: ["Clarify goals and targets", "Break goals into next steps", "Connect routines with goals"] },
  "lifehub/habits/index.html": { title: "LifeHub Habits", category: "HABITS / CONSISTENCY", description: "A redesigned habits destination for building useful routines and keeping progress easy to understand.", highlights: ["Create consistent routines", "Keep progress visible", "Explore planning and notes"] },
  "lifehub/library/index.html": { title: "LifeHub Library", category: "PERSONAL KNOWLEDGE", description: "A place for personal reading lists, saved references, and learning materials inside the LifeHub ecosystem.", highlights: ["Collect reading and learning", "Keep references organized", "Connect notes with your plans"] },
  "lifehub/notes/index.html": { title: "LifeHub Notes", category: "NOTES / IDEAS", description: "A refreshed destination for capturing ideas, useful notes, and reminders in a calmer personal workspace.", highlights: ["Capture ideas clearly", "Keep notes easy to find", "Link notes to your goals"] },
  "v2/index.html": { title: "TUBAL HUB v2 Archive", category: "PLATFORM ARCHIVE", description: "A redesigned gateway to the earlier platform generation, presented as a modern destination rather than the old interface.", highlights: ["Understand the earlier platform area", "Find modern platform shortcuts", "Return to the current Hub"] },
  "v4.1/index.html": { title: "TUBAL HUB Workspace", category: "PLATFORM WORKSPACE", description: "A refreshed workspace entry for dashboards, analytics-related destinations, and platform tools.", highlights: ["Find workspace destinations", "Explore planning and insights", "Return to the new Hub"] },
  "tubal-dark.html": { title: "Tubal Dark", category: "CREATIVE PROJECT", description: "A refreshed destination for the Tubal Dark project and its creative utilities.", highlights: ["Explore creative project information", "Find related tools and resources", "Discover gaming and developer destinations"] },
  "messenger-apk-design.html": { title: "Messenger APK Design", category: "APP / DESIGN PROJECT", description: "A redesigned project information page for the Messenger APK design concept, with a consistent TUBAL HUB visual language.", highlights: ["Review the project direction", "Find related app resources", "Return to the main Hub"] },
  "license.html": { title: "TUBAL HUB License", category: "LICENSE & ATTRIBUTION", description: "Review general project licensing and attribution information for TUBAL HUB.", highlights: ["Understand licensing basics", "Respect content ownership", "Find related policy pages"] },
  "404.html": { title: "Page Not Found", category: "404 / ROUTE NOT FOUND", description: "The destination could not be found. Use the new TUBAL HUB navigation to return home or explore available features.", highlights: ["Return to the TUBAL HUB homepage", "Browse all platform destinations", "Find support resources"] },
};

function routeTitleFromPath(path: string) {
  const filename = path.split("/").filter(Boolean).pop() || "index";
  return filename.replace(/\.html?$/i, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getPageIcon(category: string): LucideIcon {
  const label = category.toLowerCase();
  if (label.includes("play") || label.includes("gaming") || label.includes("ctrlzone")) return Gamepad2;
  if (label.includes("lifehub") || label.includes("plan") || label.includes("budget") || label.includes("goal") || label.includes("calendar")) return PanelsTopLeft;
  if (label.includes("community") || label.includes("people") || label.includes("account")) return UsersRound;
  if (label.includes("wellbeing") || label.includes("reflection")) return Waves;
  if (label.includes("support") || label.includes("contact") || label.includes("help")) return MessageCircle;
  if (label.includes("developer") || label.includes("open source") || label.includes("build")) return Code2;
  if (label.includes("shop") || label.includes("coffee")) return Sparkles;
  return Hexagon;
}


type FirebaseBrowserRuntime = {
  app: any;
  auth: any;
  authSdk: any;
  firestoreSdk: any;
  functionsSdk: any;
  db: any;
};

async function loadFirebaseBrowserRuntime(): Promise<FirebaseBrowserRuntime> {
  const configUrl = new URL("assets/js/firebase-config.js", document.baseURI).href;
  const authUrl = "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
  const firestoreUrl = "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
  const functionsUrl = "https://www.gstatic.com/firebasejs/12.19.0/firebase-functions.js";
  const [configModule, authSdk, firestoreSdk, functionsSdk]: any[] = await Promise.all([
    import(/* @vite-ignore */ configUrl),
    import(/* @vite-ignore */ authUrl),
    import(/* @vite-ignore */ firestoreUrl),
    import(/* @vite-ignore */ functionsUrl),
  ]);
  return {
    app: configModule.app,
    auth: configModule.auth,
    authSdk,
    firestoreSdk,
    functionsSdk,
    db: firestoreSdk.getFirestore(configModule.app),
  };
}

const apiCategories = [
  {id:"agents",name:"AI Agents",group:"hub",slug:"agents-apis-623",description:"Agent-style services, research helpers and multi-step automation."},
  {id:"ai",name:"AI APIs",group:"hub",slug:"ai-apis-1555",description:"Text, image, classification, generation and analysis services."},
  {id:"automation",name:"Automation",group:"hub",slug:"automation-apis-5653",description:"Workflow-oriented services. Check pricing and access conditions."},
  {id:"business",name:"Business",group:"business",slug:"business-apis-514",description:"Business data, reporting and service integrations."},
  {id:"dev",name:"Developer Tools",group:"hub",slug:"developer-tools-apis-4065",description:"Developer APIs and technical utilities."},
  {id:"ecommerce",name:"E-commerce",group:"business",slug:"ecommerce-apis-2245",description:"Product, store and commerce-related services."},
  {id:"education",name:"Education",group:"hub",slug:"education-apis-46",description:"Education, training and study-related API listings."},
  {id:"creators",name:"Creator Tools",group:"content",slug:"for-creators-apis-16",description:"Tools aimed at creators and publishing workflows."},
  {id:"games",name:"Games",group:"content",slug:"games-apis-6",description:"Game-related API listings and gaming utilities."},
  {id:"integrations",name:"Integrations",group:"hub",slug:"integrations-apis-841",description:"Connectors and integration-oriented services."},
  {id:"jobs",name:"Jobs",group:"business",slug:"jobs-apis-1149",description:"Job and career-related data services."},
  {id:"leads",name:"Lead Generation",group:"business",slug:"lead-generation-apis-4431",description:"Lead-discovery services; review privacy and terms closely."},
  {id:"marketing",name:"Marketing",group:"business",slug:"marketing-apis-290",description:"Campaign, research and growth tooling."},
  {id:"mcp",name:"MCP Servers",group:"hub",slug:"mcp-servers-apis-289",description:"Model Context Protocol server listings for compatible clients."},
  {id:"news",name:"News",group:"content",slug:"news-apis-537",description:"News and current-information services."},
  {id:"opensource",name:"Open Source",group:"hub",slug:"open-source-apis-84",description:"Open-source projects and API resources."},
  {id:"other",name:"Other APIs",group:"all",slug:"other-apis-1944",description:"Miscellaneous entries that sit outside other categories."},
  {id:"realestate",name:"Real Estate",group:"business",slug:"real-estate-apis-1089",description:"Property and real-estate data services."},
  {id:"seo",name:"SEO Tools",group:"business",slug:"seo-tools-apis-903",description:"Search visibility and website optimization services."},
  {id:"social",name:"Social Media",group:"content",slug:"social-media-apis-2786",description:"Social-platform integrations; rules and access vary by platform."},
  {id:"sports",name:"Sports",group:"content",slug:"sports-apis-21",description:"Sports data and related services."},
  {id:"travel",name:"Travel",group:"content",slug:"travel-apis-493",description:"Travel data and destination-related services."},
  {id:"videos",name:"Videos",group:"content",slug:"videos-apis-705",description:"Video discovery, metadata and creator workflow services."},
];

function ApiDiscoveryFeature() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [saved, setSaved] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("tubalhub_api_discovery_saved_v1") || "[]");
      return Array.isArray(parsed) ? parsed.filter((x: unknown): x is string => typeof x === "string") : [];
    } catch { return []; }
  });
  const [message, setMessage] = useState("");
  useEffect(() => {
    try { localStorage.setItem("tubalhub_api_discovery_saved_v1", JSON.stringify(saved)); } catch { /* storage is optional */ }
  }, [saved]);
  const visible = apiCategories.filter((item) => {
    const matchesQuery = (item.name + " " + item.description + " " + item.slug).toLowerCase().includes(query.trim().toLowerCase());
    return matchesQuery && (filter === "all" || item.group === filter);
  });
  const toggleSave = (id: string) => setSaved((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const exportSaved = () => {
    const list = apiCategories.filter((item) => saved.includes(item.id)).map((item) => ({
      name: item.name,
      url: "https://github.com/cporter202/API-mega-list/tree/main/" + item.slug,
      description: item.description,
    }));
    const blob = new Blob([JSON.stringify({exportedAt:new Date().toISOString(),source:"cporter202/API-mega-list",categories:list},null,2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "tubalhub-saved-api-categories.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Exported " + list.length + " saved categories.");
  };
  return (
    <section className="feature-section section-shell section-spacing">
      <div className="feature-heading"><div><span className="section-eyebrow">DISCOVER / EVALUATE / INTEGRATE</span><h2>Find the right API.<br/><span className="text-gradient">Build with intention.</span></h2><p>This is a discovery directory, not an auto-installer. Review each provider’s official documentation, pricing, privacy terms, and rate limits before connecting it.</p></div><a className="button button--ghost" href="https://github.com/cporter202/API-mega-list" target="_blank" rel="noreferrer">Open source list <ArrowUpRight size={15}/></a></div>
      <div className="feature-toolbar"><input type="search" value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search AI, gaming, news, developer tools…" aria-label="Search API categories"/><div className="feature-filter-row">{[["all","All"],["hub","AI & developer"],["business","Business"],["content","Content"]].map(([value,label])=><button type="button" key={value} className={"feature-chip"+(filter===value?" is-active":"")} onClick={()=>setFilter(value)}>{label}</button>)}</div></div>
      <div className="feature-meta-row"><span>{visible.length} categories shown</span><span>{saved.length} saved in this browser</span><button className="feature-text-button" type="button" onClick={exportSaved}>Export saved list ↓</button></div>
      {message && <p className="feature-status" role="status">{message}</p>}
      <div className="feature-card-grid feature-card-grid--three">{visible.map((item)=>(
        <article className="feature-card" key={item.id}><div className="feature-card__top"><span className="feature-card__icon"><Code2 size={19}/></span><button type="button" className={"feature-save"+(saved.includes(item.id)?" is-saved":"")} onClick={()=>toggleSave(item.id)} aria-pressed={saved.includes(item.id)}>{saved.includes(item.id)?"★ Saved":"☆ Save"}</button></div><span className="feature-card__eyebrow">{item.group==="hub"?"PLATFORM & DEVELOPER":item.group==="business"?"BUSINESS":item.group==="content"?"CONTENT":"MISCELLANEOUS"}</span><h3>{item.name}</h3><p>{item.description}</p><a className="feature-card__link" href={"https://github.com/cporter202/API-mega-list/tree/main/"+item.slug} target="_blank" rel="noreferrer">Explore category <ArrowUpRight size={15}/></a></article>
      ))}</div>
      {visible.length===0 && <div className="feature-empty">No categories match that search. Try a broader term.</div>}
      <div className="feature-note-panel"><div><span className="section-eyebrow">BEFORE YOU INTEGRATE</span><h3>Quick safety checklist</h3><p>Keep secrets server-side, verify permissions, and add timeouts and fallback behavior.</p></div><ul><li>Official docs and endpoints checked</li><li>Pricing, free tier and quota understood</li><li>Terms and data-permission reviewed</li><li>API secrets are never committed to frontend code</li><li>Rate limits and provider failures are handled</li></ul></div>
    </section>
  );
}

type StoreProduct = {
  id: string;
  name: string;
  description: string;
  image: string;
  price: number;
  priceLabel: string;
  brandKey: string;
  category: string;
  stock: number | null;
  externalUrl: string;
  productUrl: string;
};

function ShopFeature({ kapengOnly = false }: { kapengOnly?: boolean }) {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState(kapengOnly ? "kapeng" : "all");
  const [cart, setCart] = useState<Record<string, number>>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("tubalhub-shop-cart-v2") || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch { return {}; }
  });
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [notice, setNotice] = useState("");
  const [runtime, setRuntime] = useState<FirebaseBrowserRuntime | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<"bank"|"paypal">("bank");
  const [paymentReference, setPaymentReference] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cleanups: Array<() => void> = [];
    loadFirebaseBrowserRuntime().then((sdk) => {
      if (cancelled) return;
      setRuntime(sdk);
      const authCleanup = sdk.authSdk.onAuthStateChanged(sdk.auth, (user: any) => setCurrentUser(user && !user.isAnonymous ? user : null));
      cleanups.push(authCleanup);
      const productsCleanup = sdk.firestoreSdk.onSnapshot(
        sdk.firestoreSdk.collection(sdk.db, "products"),
        (snapshot: any) => {
          const all = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            const rawPrice = String(data.price ?? "");
            const price = Number(rawPrice.replace(/[^0-9.]/g, "")) || 0;
            return {
              id: doc.id,
              name: String(data.name || "Unnamed Product"),
              description: String(data.description || data.details || ""),
              image: String(data.imageUrl || data.image || ""),
              price,
              priceLabel: rawPrice || (price === 0 ? "Free" : String(price)),
              brandKey: String(data.brandKey || data.brandId || data.collection || data.brandName || "").toLowerCase(),
              category: String(data.category || "Other"),
              stock: Number.isFinite(Number(data.stock)) ? Number(data.stock) : null,
              externalUrl: String(data.externalUrl || ""),
              productUrl: String(data.productUrl || ""),
              sourceType: String(data.sourceType || "admin-managed").toLowerCase(),
              catalogStatus: String(data.catalogStatus || "live").toLowerCase(),
              isDemo: data.isDemo === true,
              isVisible: data.isVisible !== false,
              productType: String(data.productType || "physical"),
            };
          }).filter((item: any) => item.isVisible && !item.isDemo && item.sourceType !== "demo" && item.sourceType !== "external" && item.catalogStatus !== "archived" && item.catalogStatus !== "hidden")
            .filter((item: any) => !kapengOnly || item.brandKey.includes("kapeng"));
          setProducts(all as StoreProduct[]);
          setLoading(false);
          setCatalogError("");
        },
        (error: any) => {
          setLoading(false);
          setCatalogError(error?.message || "The live catalog is not available right now.");
        }
      );
      cleanups.push(productsCleanup);
    }).catch((error: any) => {
      setLoading(false);
      setCatalogError(error?.message || "Could not connect to the live product catalog.");
    });
    return () => {
      cancelled = true;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [kapengOnly]);

  useEffect(() => {
    try { localStorage.setItem("tubalhub-shop-cart-v2", JSON.stringify(cart)); } catch { /* local cart is optional */ }
  }, [cart]);

  const visibleProducts = products.filter((product) => {
    const matchesQuery = (product.name + " " + product.description + " " + product.category + " " + product.brandKey).toLowerCase().includes(query.trim().toLowerCase());
    return matchesQuery && (collection === "all" || (collection === "kapeng" && product.brandKey.includes("kapeng")) || (collection === "th" && !product.brandKey.includes("kapeng")) || product.category.toLowerCase().includes(collection));
  });
  const selected = Object.entries(cart).map(([id,qty]) => ({product:products.find((p)=>p.id===id),qty:Number(qty)||0})).filter((entry)=>entry.product && entry.qty>0) as {product:StoreProduct;qty:number}[];
  const cartCount = selected.reduce((sum,entry)=>sum+entry.qty,0);
  const cartTotal = selected.reduce((sum,entry)=>sum+(entry.product.price*entry.qty),0);
  const updateCart = (id:string, qty:number) => setCart((current)=>{const next={...current};if(qty<=0)delete next[id];else next[id]=Math.min(99,Math.max(1,qty));return next;});

  const placeOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!runtime) { setNotice("Store services are still initializing. Try again in a moment."); return; }
    if (!currentUser) { window.location.href="/tubalhub/pages/login.html?return=shop"; return; }
    if (!selected.length) { setNotice("Add at least one product before placing an order."); return; }
    if (!paymentReference.trim()) { setNotice("Enter the payment reference provided for your order. No payment is collected by this page."); return; }
    setPlacingOrder(true);
    setNotice("");
    try {
      const createShopOrderReal = runtime.functionsSdk.httpsCallable(runtime.functionsSdk.getFunctions(runtime.app), "createShopOrderReal");
      const result = await createShopOrderReal({
        items:selected.map((entry)=>({productId:entry.product.id,qty:entry.qty})),
        paymentMethod,
        paymentReference:paymentReference.trim(),
      });
      const data = (result as any)?.data || {};
      setCart({});
      setPaymentReference("");
      setNotice("Order " + String(data.orderId || "") + " was recorded as pending payment. This page does not process a charge; an administrator must verify the reference.");
    } catch (error: any) {
      setNotice(error?.message || "The secure order service could not create this order. Check the sign-in state and deployed Cloud Function.");
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <section className="feature-section section-shell section-spacing">
      <div className="feature-heading"><div><span className="section-eyebrow">{kapengOnly?"KAPENG BARAKO / STORE":"TUBAL HUB / MARKETPLACE"}</span><h2>{kapengOnly?<>Coffee, curated.<br/><span className="text-gradient">Barako with character.</span></>:<>Discover the collection.<br/><span className="text-gradient">Built around your interests.</span></>}</h2><p>Products come from the live Firestore catalog managed through TUBAL HUB Admin. The cart is saved in this browser; final pricing and stock are verified by the secure order function.</p></div><a className="button button--ghost" href="/tubalhub/pages/system-dashboard.html">Explore the Hub <ArrowUpRight size={15}/></a></div>
      <div className="feature-toolbar"><input type="search" value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search products…" aria-label="Search products"/><div className="feature-filter-row">{(kapengOnly?[["kapeng","Kapeng Barako"]]:[["all","All products"],["kapeng","Kapeng Barako"],["th","TUBAL HUB"]]).map(([value,label])=><button key={value} type="button" className={"feature-chip"+(collection===value?" is-active":"")} onClick={()=>setCollection(value)}>{label}</button>)}</div></div>
      <div className="feature-meta-row"><span>{loading?"Loading live catalog…":visibleProducts.length+" products found"}</span><span>{cartCount} in cart · ₱{cartTotal.toLocaleString("en-PH",{maximumFractionDigits:2})}</span></div>
      {catalogError && <div className="feature-warning" role="status"><b>Live catalog unavailable</b><p>{catalogError}</p><p>No sample inventory is shown as if it were real stock. The store’s product data and checkout depend on Firebase and Cloud Functions being available.</p></div>}
      {!loading && !catalogError && visibleProducts.length===0 && <div className="feature-empty">No published products match this search yet. Check back after products are published from Admin.</div>}
      {loading && <div className="feature-empty">Connecting to the live catalog…</div>}
      <div className="feature-card-grid feature-card-grid--three">{visibleProducts.map((product)=>(
        <article className="feature-card feature-product" key={product.id}>
          {product.image ? <img className="feature-product__image" src={product.image} alt={product.name} loading="lazy"/> : <div className="feature-product__placeholder"><Sparkles size={28}/></div>}
          <span className="feature-card__eyebrow">{product.category}</span><h3>{product.name}</h3><p>{product.description || "Published product from the TUBAL HUB catalog."}</p>
          <div className="feature-product__meta"><strong>₱{product.price.toLocaleString("en-PH",{maximumFractionDigits:2})}</strong><span>{product.stock===null?"Stock status from catalog":product.stock+" in stock"}</span></div>
          <div className="feature-product__actions"><button type="button" className="button button--primary" onClick={()=>updateCart(product.id,(cart[product.id]||0)+1)} disabled={product.stock!==null&&product.stock===0}>Add to cart +</button>{(product.productUrl||product.externalUrl)&&<a className="button button--ghost" href={product.productUrl||product.externalUrl} target="_blank" rel="noreferrer">More details ↗</a>}</div>
          {(cart[product.id]||0)>0 && <div className="feature-quantity"><button type="button" onClick={()=>updateCart(product.id,(cart[product.id]||0)-1)} aria-label={"Remove one "+product.name}>−</button><span>{cart[product.id]} selected</span><button type="button" onClick={()=>updateCart(product.id,(cart[product.id]||0)+1)} aria-label={"Add one "+product.name}>+</button><button type="button" className="feature-text-button" onClick={()=>updateCart(product.id,0)}>Remove</button></div>}
        </article>
      ))}</div>
      <div className="feature-checkout-panel">
        <div><span className="section-eyebrow">YOUR CART</span><h3>{cartCount} item{cartCount===1?"":"s"} · ₱{cartTotal.toLocaleString("en-PH",{maximumFractionDigits:2})}</h3><p>Order pricing and available stock are checked again on the server. This creates a pending order for payment verification; it does not charge a card or wallet.</p>{selected.map((entry)=><div key={entry.product.id} className="feature-cart-row"><span>{entry.product.name} × {entry.qty}</span><b>₱{(entry.product.price*entry.qty).toLocaleString("en-PH",{maximumFractionDigits:2})}</b></div>)}</div>
        <form className="feature-checkout-form" onSubmit={placeOrder}><label>Payment method<select value={paymentMethod} onChange={(e)=>setPaymentMethod(e.target.value as "bank"|"paypal")}><option value="bank">Bank / E-Wallet reference</option><option value="paypal">PayPal reference</option></select></label><label>Payment reference<input value={paymentReference} onChange={(e)=>setPaymentReference(e.target.value)} placeholder="Reference given for this order" /></label><button type="submit" className="button button--primary" disabled={placingOrder||!cartCount}>{placingOrder?"Submitting order…":currentUser?"Create pending order →":"Sign in to order →"}</button><small>{currentUser?"Signed in as "+String(currentUser.email||"account"):"Sign in with your account before placing an order."}</small></form>
      </div>
      {notice && <p className="feature-status" role="status">{notice}</p>}
    </section>
  );
}

type LifeHubItem = {id:string;title:string;detail?:string;date?:string;amount?:number;done?:boolean;completedOn?:string;createdAt?:string};

function LocalLifeHubFeature({kind}:{kind:"tasks"|"notes"|"goals"|"habits"|"budget"|"library"}) {
  const key = "tubalhub_lifehub_"+kind+"_v1";
  const [items,setItems] = useState<LifeHubItem[]>(()=>{
    try { const data=JSON.parse(localStorage.getItem(key)||"[]"); return Array.isArray(data)?data:[]; } catch { return []; }
  });
  const [title,setTitle]=useState("");
  const [detail,setDetail]=useState("");
  const [date,setDate]=useState("");
  const [amount,setAmount]=useState("");
  const [notice,setNotice]=useState("");
  useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(items));}catch{setNotice("Browser storage is unavailable; changes may not persist.");}},[key,items]);
  const today = new Date().toISOString().slice(0,10);
  const config = {
    tasks:{eyebrow:"LIFEHUB / TODAY",title:"Turn plans into progress.",intro:"Add small, clear tasks and mark each one complete. Your list is saved locally in this browser.",submit:"Add task",placeholder:"What needs doing?",detailLabel:"Notes (optional)",amountLabel:"",dateLabel:"Due date"},
    notes:{eyebrow:"LIFEHUB / NOTES",title:"Give your ideas a place.",intro:"Capture notes, reminders, and ideas. Notes stay in this browser unless you export or back them up.",submit:"Save note",placeholder:"Note title",detailLabel:"Note content",amountLabel:"",dateLabel:""},
    goals:{eyebrow:"LIFEHUB / GOALS",title:"Make the next step visible.",intro:"Record a goal, its next step, and a target date. Mark it complete when you’re done.",submit:"Add goal",placeholder:"Goal title",detailLabel:"Next step or notes",amountLabel:"",dateLabel:"Target date"},
    habits:{eyebrow:"LIFEHUB / HABITS",title:"Build routines one day at a time.",intro:"Track useful habits with a simple daily check-in, saved locally on this device.",submit:"Add habit",placeholder:"Habit to practice",detailLabel:"Why it matters (optional)",amountLabel:"",dateLabel:""},
    budget:{eyebrow:"LIFEHUB / BUDGET",title:"See where your money goes.",intro:"Log planned amounts or expenses. These entries are local notes, not a bank connection or accounting record.",submit:"Add entry",placeholder:"Budget item or category",detailLabel:"Category / details",amountLabel:"Amount (₱)",dateLabel:"Date"},
    library:{eyebrow:"LIFEHUB / LIBRARY",title:"Keep useful things within reach.",intro:"Save a resource title and a link or short note for future reference.",submit:"Save resource",placeholder:"Resource title",detailLabel:"URL or notes",amountLabel:"",dateLabel:""},
  }[kind];
  const submit = (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if(!title.trim()) return;
    const newItem:LifeHubItem={id:String(Date.now())+"-"+Math.random().toString(36).slice(2,7),title:title.trim(),detail:detail.trim(),date:date||undefined,amount:kind==="budget"?(Number(amount)||0):undefined,done:false,createdAt:new Date().toISOString()};
    setItems((current)=>[newItem,...current]);setTitle("");setDetail("");setDate("");setAmount("");setNotice(kind==="notes"?"Note saved in this browser.":"Saved in this browser.");
  };
  const toggle = (id:string) => setItems((current)=>current.map((item)=>item.id!==id?item:kind==="habits"?{...item,completedOn:item.completedOn===today?"":today}:{...item,done:!item.done}));
  const remove = (id:string) => { setItems((current)=>current.filter((item)=>item.id!==id));setNotice("Item removed."); };
  const exportData = () => {
    const blob=new Blob([JSON.stringify({kind,exportedAt:new Date().toISOString(),items},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="lifehub-"+kind+"-backup.json";a.click();URL.revokeObjectURL(url);
  };
  const total=items.reduce((sum,item)=>sum+(Number(item.amount)||0),0);
  if(kind==="tasks" && items.length===0) {
    // The dashboard uses the same task tool but also provides shortcuts to the individual personal tools.
  }
  return (
    <section className="feature-section section-shell section-spacing">
      <div className="feature-heading"><div><span className="section-eyebrow">{config.eyebrow}</span><h2>{config.title.replace(/\.$/, "")}<br/><span className="text-gradient">{kind==="tasks"?"One clear next step.":kind==="notes"?"Capture ideas as they come.":kind==="goals"?"Turn intention into progress.":kind==="habits"?"Consistency beats intensity.":kind==="budget"?"Make every peso visible.":"Keep your next discovery close."}</span></h2><p>{config.intro}</p></div><button className="button button--ghost" type="button" onClick={exportData}>Export backup ↓</button></div>
      {kind==="tasks" && <div className="lifehub-quicklinks"><a href="/tubalhub/lifehub/notes/index.html">Notes ↗</a><a href="/tubalhub/lifehub/goals/index.html">Goals ↗</a><a href="/tubalhub/lifehub/habits/index.html">Habits ↗</a><a href="/tubalhub/lifehub/budget/index.html">Budget ↗</a><a href="/tubalhub/lifehub/library/index.html">Library ↗</a><a href="/tubalhub/lifehub-calendar.html">Calendar ↗</a></div>}
      {kind==="budget" && <div className="feature-stat-strip"><div><span>Saved entries</span><strong>{items.length}</strong></div><div><span>Total logged</span><strong>₱{total.toLocaleString("en-PH",{maximumFractionDigits:2})}</strong></div></div>}
      {kind==="tasks" && <div className="feature-stat-strip"><div><span>Open tasks</span><strong>{items.filter((item)=>!item.done).length}</strong></div><div><span>Completed</span><strong>{items.filter((item)=>item.done).length}</strong></div></div>}
      <form className="feature-form feature-form--wide" onSubmit={submit}>
        <div className="feature-form__heading"><span className="section-eyebrow">QUICK CAPTURE</span><h3>{config.submit}</h3></div>
        <label>{kind==="budget"?"Item / category":kind==="notes"?"Title":kind==="library"?"Resource name":"Title"}<input required value={title} onChange={(e)=>setTitle(e.target.value)} placeholder={config.placeholder}/></label>
        {config.detailLabel && <label>{config.detailLabel}<textarea rows={kind==="notes"?4:2} value={detail} onChange={(e)=>setDetail(e.target.value)} placeholder={kind==="library"?"https://… or a short note":"Add extra context…"} /></label>}
        {config.dateLabel && <label>{config.dateLabel}<input type="date" value={date} onChange={(e)=>setDate(e.target.value)} /></label>}
        {kind==="budget" && <label>Amount in Philippine pesos<input required type="number" min="0" step="0.01" value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="0.00"/></label>}
        <button type="submit" className="button button--primary">{config.submit} <ArrowRight size={15}/></button>
      </form>
      {notice && <p className="feature-status" role="status">{notice}</p>}
      <div className="feature-list-heading"><div><span className="section-eyebrow">YOUR {kind.toUpperCase()}</span><h3>{kind==="tasks"?"Task list":kind==="notes"?"Saved notes":kind==="goals"?"Goal list":kind==="habits"?"Habit tracker":kind==="budget"?"Budget entries":"Saved resources"}</h3></div><span>{items.length} items</span></div>
      <div className="feature-record-list">
        {items.map((item)=> {
          const isDone=kind==="habits"?item.completedOn===today:!!item.done;
          return <article className={"feature-record"+(isDone?" is-complete":"")} key={item.id}>
            {(kind==="tasks"||kind==="goals"||kind==="habits")&&<button className={"feature-record__check"+(isDone?" is-checked":"")} type="button" onClick={()=>toggle(item.id)} aria-pressed={isDone}>{isDone?"✓":"○"}</button>}
            <div className="feature-record__body"><h4>{item.title}</h4>{item.detail&&<p>{item.detail}</p>}{item.date&&<small>{kind==="goals"?"Target date":"Date"}: {item.date}</small>}{kind==="budget"&&<strong>₱{(Number(item.amount)||0).toLocaleString("en-PH",{maximumFractionDigits:2})}</strong>}{kind==="habits"&&<small>{isDone?"Checked today":"Not checked today"}</small>}</div>
            <button type="button" className="feature-delete" onClick={()=>remove(item.id)} aria-label={"Remove "+item.title}>Remove</button>
          </article>;
        })}
        {items.length===0&&<div className="feature-empty">Wala pang saved items. Add your first one above.</div>}
      </div>
      <p className="feature-storage-note">Local-first storage: items are saved in this browser only. Use Export backup to make a JSON copy before clearing browser data.</p>
    </section>
  );
}

type CalendarEvent = {id:string;title:string;date:string;detail:string};

function CalendarFeature() {
  const [events,setEvents]=useState<CalendarEvent[]>(()=>{
    try{const parsed=JSON.parse(localStorage.getItem("tubalhub_calendar_events_v1")||"[]");return Array.isArray(parsed)?parsed:[];}catch{return [];}
  });
  const [title,setTitle]=useState("");
  const [date,setDate]=useState(new Date().toISOString().slice(0,10));
  const [detail,setDetail]=useState("");
  const [notice,setNotice]=useState("");
  useEffect(()=>{try{localStorage.setItem("tubalhub_calendar_events_v1",JSON.stringify(events));}catch{setNotice("Browser storage is unavailable; event changes may not persist.");}},[events]);
  const addEvent=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();if(!title.trim()||!date)return;setEvents((current)=>[...current,{id:String(Date.now())+"-"+Math.random().toString(36).slice(2,6),title:title.trim(),date,detail:detail.trim()}].sort((a,b)=>a.date.localeCompare(b.date)));setTitle("");setDetail("");setNotice("Event saved in this browser.");};
  const exportEvents=()=>{const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),events},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="tubalhub-calendar.json";a.click();URL.revokeObjectURL(url);};
  return <section className="feature-section section-shell section-spacing"><div className="feature-heading"><div><span className="section-eyebrow">LIFEHUB / CALENDAR</span><h2>Make time visible.<br/><span className="text-gradient">Plan the next step.</span></h2><p>Add personal events, dates, and reminders. Entries are stored locally in this browser; this is not synced with an external calendar.</p></div><button className="button button--ghost" type="button" onClick={exportEvents}>Export events ↓</button></div><form className="feature-form feature-form--wide" onSubmit={addEvent}><div className="feature-form__heading"><span className="section-eyebrow">NEW EVENT</span><h3>Add to your calendar</h3></div><label>Event title<input required value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="e.g. Project deadline"/></label><label>Date<input required type="date" value={date} onChange={(e)=>setDate(e.target.value)}/></label><label>Notes (optional)<textarea rows={2} value={detail} onChange={(e)=>setDetail(e.target.value)} placeholder="Location, details, or reminder"/></label><button className="button button--primary" type="submit">Save event <ArrowRight size={15}/></button></form>{notice&&<p className="feature-status" role="status">{notice}</p>}<div className="feature-list-heading"><div><span className="section-eyebrow">YOUR SCHEDULE</span><h3>Upcoming and saved events</h3></div><span>{events.length} events</span></div><div className="feature-record-list">{events.map((event)=><article className="feature-record" key={event.id}><span className="feature-record__date">{new Date(event.date+"T12:00:00").toLocaleDateString("en-PH",{month:"short",day:"2-digit"})}</span><div className="feature-record__body"><h4>{event.title}</h4><small>{new Date(event.date+"T12:00:00").toLocaleDateString("en-PH",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</small>{event.detail&&<p>{event.detail}</p>}</div><button type="button" className="feature-delete" onClick={()=>setEvents((current)=>current.filter((item)=>item.id!==event.id))}>Remove</button></article>)}{events.length===0&&<div className="feature-empty">No events yet. Add a date above.</div>}</div><p className="feature-storage-note">Tip: export a backup before clearing browser storage.</p></section>;
}

const faqItems = [
  {q:"What is TUBAL HUB?",a:"TUBAL HUB is the connected home for projects and destinations such as CTRLZONE, LifeHub, Payapang Isip, developer tools, community pages and the shop."},
  {q:"Are all the features connected to a cloud database?",a:"No. Some existing destinations use Firebase, while the rebuilt LifeHub quick tools and calendar currently store entries in this browser only. The interface indicates where data is local."},
  {q:"Can I use the Shop without signing in?",a:"You can browse published catalog items and save a local cart. Creating an order requires a signed-in Firebase account, and the server re-checks product availability and pricing."},
  {q:"Does placing an order charge me automatically?",a:"No. The current callable function records a pending order with a payment reference. It does not charge a card or wallet; payment verification is a separate administrative step."},
  {q:"What happens to my LifeHub notes and tasks?",a:"The rebuilt quick tools save to local browser storage on the current device. Export a JSON backup before clearing browser data or moving to another browser."},
  {q:"How do I contact the TUBAL HUB team?",a:"Use the contact page to compose an email to tubalrr@gmail.com, or use the linked community destination for general discussion."},
  {q:"Can I connect an API from the API Discovery Center automatically?",a:"No. The directory helps you discover categories and save links. Each provider must be evaluated and integrated separately with its own permission, quota, security and data-handling checks."},
  {q:"Where do I report a community concern?",a:"Start with the Community Guidelines and Help Center pages, then contact the team with the relevant context. Do not post private account or payment information publicly."},
];

function FaqFeature() {
  const [query,setQuery]=useState("");
  const visible=faqItems.filter((item)=>(item.q+" "+item.a).toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="feature-section section-shell section-spacing"><div className="feature-heading"><div><span className="section-eyebrow">HELP / ANSWERS</span><h2>Questions, answered.<br/><span className="text-gradient">Find your way.</span></h2><p>Search common questions about the redesigned TUBAL HUB, feature status, and where data is stored.</p></div><a className="button button--ghost" href="/tubalhub/pages/contact.html">Contact support <ArrowUpRight size={15}/></a></div><div className="feature-toolbar"><input type="search" value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search questions…" aria-label="Search frequently asked questions"/></div><div className="feature-faq-list">{visible.map((item)=> <details className="feature-faq-item" key={item.q}><summary>{item.q}<span>+</span></summary><p>{item.a}</p></details>)}{visible.length===0&&<div className="feature-empty">No answer matched that search.</div>}</div></section>;
}

function ContactFeature({page}:{page:RoutePageInfo}) {
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [topic,setTopic]=useState("General question");
  const [message,setMessage]=useState("");
  const [notice,setNotice]=useState("");
  const submit=(event:FormEvent<HTMLFormElement>)=> {
    event.preventDefault();
    const subject=encodeURIComponent("[TUBAL HUB] "+topic);
    const body=encodeURIComponent("Name: "+name+"\nEmail: "+email+"\nTopic: "+topic+"\n\n"+message);
    setNotice("Opening your email app with the message prefilled. If it does not open, email tubalrr@gmail.com directly.");
    window.location.href="mailto:tubalrr@gmail.com?subject="+subject+"&body="+body;
  };
  return <section className="feature-section section-shell section-spacing"><div className="feature-heading"><div><span className="section-eyebrow">{page.category}</span><h2>{page.title}.<br/><span className="text-gradient">Let’s make it clear.</span></h2><p>{page.description} This form opens your email app; it does not send or store the message on this website.</p></div><div className="feature-contact-links"><a href="mailto:tubalrr@gmail.com"><Mail size={17}/> tubalrr@gmail.com</a><a href="https://discord.gg/EnR4KWSum" target="_blank" rel="noreferrer"><MessageCircle size={17}/> TUBAL HUB Discord <ArrowUpRight size={13}/></a></div></div><form className="feature-form" onSubmit={submit}><div className="feature-form__heading"><span className="section-eyebrow">SEND A MESSAGE</span><h3>What can we help with?</h3></div><label>Your name<input required autoComplete="name" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Name"/></label><label>Your email<input required type="email" autoComplete="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Topic<select value={topic} onChange={(e)=>setTopic(e.target.value)}><option>General question</option><option>Partnership</option><option>Shop or order inquiry</option><option>Technical issue</option><option>Feedback</option><option>LifeHub</option><option>CTRLZONE</option><option>Payapang Isip</option></select></label><label>Message<textarea required rows={6} value={message} onChange={(e)=>setMessage(e.target.value)} placeholder="Give us enough context to help…"/></label><button className="button button--primary" type="submit">Prepare email <Send size={15}/></button>{notice&&<p className="feature-status" role="status">{notice}</p>}</form></section>;
}

function CommunityFeature({page}:{page:RoutePageInfo}) {
  const links=[
    {title:"Discord Community",type:"COMMUNITY",description:"Join the existing TUBAL HUB Discord space.",href:"https://discord.gg/EnR4KWSum",external:true},
    {title:"Community Guidelines",type:"SAFETY",description:"Understand expectations for respectful participation.",href:"/tubalhub/pages/community-guidelines.html"},
    {title:"Events",type:"ACTIVITIES",description:"Explore event information and community activities.",href:"/tubalhub/pages/events.html"},
    {title:"Feeds & Updates",type:"UPDATES",description:"Find community and product announcements.",href:"/tubalhub/pages/feeds.html"},
    {title:"Contact the Team",type:"SUPPORT",description:"Send questions, feedback, or collaboration ideas.",href:"/tubalhub/pages/contact.html"},
  ];
  return <section className="feature-section section-shell section-spacing"><div className="feature-heading"><div><span className="section-eyebrow">{page.category}</span><h2>Find your people.<br/><span className="text-gradient">Make space to connect.</span></h2><p>{page.description} Choose the right destination below to join the discussion, follow updates, or contact the team.</p></div></div><div className="feature-card-grid feature-card-grid--three">{links.map((item)=><article className="feature-card" key={item.title}><span className="feature-card__eyebrow">{item.type}</span><h3>{item.title}</h3><p>{item.description}</p><a className="feature-card__link" href={item.href} target={item.external?"_blank":undefined} rel={item.external?"noreferrer":undefined}>Open destination <ArrowUpRight size={15}/></a></article>)}</div></section>;
}

function AccountFeature({routePath}:{routePath:string}) {
  const adminMode=routePath==="admin/login.html";
  const signupMode=routePath==="pages/signup.html";
  const [runtime,setRuntime]=useState<FirebaseBrowserRuntime|null>(null);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false);
  const [forgot,setForgot]=useState(false);
  const [notice,setNotice]=useState("");
  useEffect(()=>{let cancelled=false;loadFirebaseBrowserRuntime().then((sdk)=>{if(!cancelled)setRuntime(sdk);}).catch((error:any)=>{if(!cancelled)setNotice("Firebase could not be initialized: "+(error?.message||"Unknown error"));});return()=>{cancelled=true;};},[]);
  const submit=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    if(!runtime){setNotice("Account service is still initializing. Please try again.");return;}
    setBusy(true);setNotice("");
    try{
      if(forgot){
        await runtime.authSdk.sendPasswordResetEmail(runtime.auth,email.trim());
        setNotice("Password-reset email requested. Check your inbox and spam folder.");
      }else if(signupMode){
        const credential=await runtime.authSdk.createUserWithEmailAndPassword(runtime.auth,email.trim(),password);
        try{await runtime.authSdk.sendEmailVerification(credential.user);}catch{/* account may still be created if email delivery is unavailable */}
        setNotice("Account created. Check your email for verification. You can sign in after registration.");
      }else{
        const credential=await runtime.authSdk.signInWithEmailAndPassword(runtime.auth,email.trim(),password);
        if(adminMode){
          const token=await credential.user.getIdTokenResult();
          const isAdmin=token.claims?.admin===true||(String(credential.user.email||"").toLowerCase()==="tubalrr@gmail.com"&&credential.user.emailVerified===true);
          setNotice(isAdmin?"Signed in with an admin-eligible account. Open the admin workspace to continue.":"Signed in, but this account does not have the required admin authorization. No admin access was granted.");
        }else if(window.location.search.includes("return=shop")){
          window.location.href="/tubalhub/pages/shop.html";
        }else{
          setNotice("Signed in successfully as "+String(credential.user.email||"account")+".");
        }
      }
    }catch(error:any){
      const code=String(error?.code||"");
      const friendly=code.includes("auth/invalid-credential")||code.includes("auth/wrong-password")?"Email or password was not accepted.":code.includes("auth/email-already-in-use")?"An account already uses this email. Try signing in.":code.includes("auth/weak-password")?"Use a stronger password (at least 6 characters).":code.includes("auth/invalid-email")?"Enter a valid email address.":error?.message||"The account request could not be completed.";
      setNotice(friendly);
    }finally{setBusy(false);}
  };
  return <section className="feature-section section-shell section-spacing"><div className="feature-heading"><div><span className="section-eyebrow">{adminMode?"ADMINISTRATION":signupMode?"JOIN THE HUB":"ACCOUNT ACCESS"}</span><h2>{adminMode?"Administrator access.":signupMode?"Create your account.":"Welcome back."}<br/><span className="text-gradient">{adminMode?"Verified identity only.":signupMode?"One account, more ways to connect.":"Pick up where you left off."}</span></h2><p>{adminMode?"Sign-in uses Firebase Authentication. Admin access is only acknowledged for a verified authorized account; the actual management interface still needs its own permission checks.":signupMode?"Create an account with Firebase Authentication. Never share your password with anyone.":"Sign in with your email and password, or request a password-reset email."}</p></div></div><form className="feature-form feature-account-form" onSubmit={submit}><div className="feature-form__heading"><span className="section-eyebrow">{forgot?"PASSWORD RECOVERY":signupMode?"NEW ACCOUNT":"SECURE SIGN-IN"}</span><h3>{forgot?"Reset password":signupMode?"Register with email":"Sign in"}</h3></div><label>Email address<input required type="email" autoComplete="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com"/></label>{!forgot&&<label>Password<input required type="password" minLength={6} autoComplete={signupMode?"new-password":"current-password"} value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="At least 6 characters"/></label>}<button type="submit" className="button button--primary" disabled={busy}>{busy?"Please wait…":forgot?"Send reset email":signupMode?"Create account":"Sign in"} <ArrowRight size={15}/></button>{!signupMode&&!adminMode&&<button type="button" className="feature-text-button" onClick={()=>setForgot((value)=>!value)}>{forgot?"Back to sign-in":"Forgot password?"}</button>}{notice&&<p className="feature-status" role="status">{notice}</p>}{adminMode&&<p className="feature-storage-note">Authentication alone is not proof of administrator privileges. This page does not expose or bypass Firestore security rules.</p>}</form><div className="feature-auth-links"><a href="/tubalhub/pages/signup.html">Create an account ↗</a><a href="/tubalhub/pages/login.html">Sign in ↗</a><a href="/tubalhub/pages/help.html">Help Center ↗</a></div></section>;
}

function RouteSpecificContent({routePath,page}:{routePath:string;page:RoutePageInfo}) {
  if(routePath==="pages/api-mega-hub.html") return <ApiDiscoveryFeature/>;
  if(routePath==="pages/shop.html") return <ShopFeature/>;
  if(routePath==="pages/kapeng-barako.html") return <ShopFeature kapengOnly/>;
  if(routePath==="pages/contact.html"||routePath==="pages/affiliate.html"||routePath==="pages/careers.html"||routePath==="pages/press.html") return <ContactFeature page={page}/>;
  if(routePath==="pages/faq.html"||routePath==="pages/community-guidelines.html") return <FaqFeature/>;
  if(routePath==="pages/community.html"||routePath==="pages/chat.html"||routePath==="pages/events.html"||routePath==="pages/feeds.html") return <CommunityFeature page={page}/>;
  if(routePath==="pages/login.html"||routePath==="pages/signup.html"||routePath==="admin/login.html") return <AccountFeature routePath={routePath}/>;
  if(routePath==="pages/calendar.html"||routePath==="lifehub-calendar.html") return <CalendarFeature/>;
  if(routePath==="lifehub/index.html") return <LocalLifeHubFeature kind="tasks"/>;
  if(routePath==="lifehub/notes/index.html") return <LocalLifeHubFeature kind="notes"/>;
  if(routePath==="lifehub/goals/index.html") return <LocalLifeHubFeature kind="goals"/>;
  if(routePath==="lifehub/habits/index.html") return <LocalLifeHubFeature kind="habits"/>;
  if(routePath==="lifehub/budget/index.html") return <LocalLifeHubFeature kind="budget"/>;
  if(routePath==="lifehub/library/index.html") return <LocalLifeHubFeature kind="library"/>;
  if(routePath==="lifehub/landing.html") return <section className="feature-section section-shell section-spacing"><div className="feature-heading"><div><span className="section-eyebrow">LIFEHUB / PERSONAL ORGANIZATION</span><h2>A calmer way to organize.<br/><span className="text-gradient">One small step at a time.</span></h2><p>LifeHub brings quick capture tools for tasks, notes, goals, habits, budgets, a library and calendar into one consistent experience.</p></div></div><div className="platform-grid legacy-directory-grid">{[{title:"Tasks & daily planning",href:"/tubalhub/lifehub/index.html"},{title:"Notes",href:"/tubalhub/lifehub/notes/index.html"},{title:"Goals",href:"/tubalhub/lifehub/goals/index.html"},{title:"Habits",href:"/tubalhub/lifehub/habits/index.html"},{title:"Budget",href:"/tubalhub/lifehub/budget/index.html"},{title:"Library",href:"/tubalhub/lifehub/library/index.html"},{title:"Calendar",href:"/tubalhub/lifehub-calendar.html"}].map((item)=><a key={item.title} className="platform-card" href={item.href}><h3>{item.title}</h3><p>Open the tool and keep your entries in this browser.</p><span className="platform-card__link">Open tool <ArrowUpRight size={15}/></span></a>)}</div></section>;
  return <section className="legacy-details section-shell section-spacing"><div className="section-heading reveal"><div className="section-eyebrow"><span>01</span> {page.category}</div><h2>{page.title}<br/><span className="text-gradient">A clearer way forward.</span></h2><p>{page.description}</p></div><div className="legacy-detail-grid">{page.highlights.map((highlight,index)=><article className="legacy-detail-card" key={highlight}><span className={"legacy-detail-card__icon"+(index===1?" legacy-detail-card__icon--gold":index===2?" legacy-detail-card__icon--sea":"")}>{index===0?<Check size={21}/>:index===1?<Target size={21}/>:<ArrowRight size={21}/>}</span><h3>{highlight}</h3><p>{index===0?"Clear information and navigation help you understand this destination.":index===1?"This destination follows the same responsive TUBAL HUB visual language.":"Use the connected navigation to continue to another relevant feature."}</p></article>)}</div><div className="legacy-next-panel"><div><div className="section-eyebrow"><span>02</span> CONTINUE EXPLORING</div><h3>Keep moving through the Hub.</h3><p>Browse the available destinations or contact the team if something is missing.</p></div><a className="button button--primary" href="/tubalhub/app/index.html">Open platform directory <ArrowRight size={15}/></a></div></section>;
}

function LegacyRoutePage({ routePath }: { routePath: string }) {
  const [query, setQuery] = useState("");
  const normalizedPath = routePath.replace(/^\/+/, "").toLowerCase() || "app/index.html";
  const page = routeCatalog[normalizedPath] ?? {
    title: routeTitleFromPath(normalizedPath),
    category: "TUBAL HUB DESTINATION",
    description: "A redesigned destination in the connected TUBAL HUB ecosystem. Use the new navigation to discover related brands, tools, and community resources.",
    highlights: ["Explore related project destinations", "Use the shared Hub navigation", "Return to the platform directory at any time"],
  };
  const Icon = getPageIcon(page.category);
  const dashboard = normalizedPath === "app/index.html" || normalizedPath === "pages/system-dashboard.html";
  const filteredLinks = platformLinks.filter((item) => {
    const term = query.trim().toLowerCase();
    return !term || [item.title, item.category, item.description].some((value) => value.toLowerCase().includes(term));
  });
  const currentLinkPath = normalizedPath.replace(/^\.\//, "");
  const relatedLinks = platformLinks.filter((item) => item.href.replace(/^\/tubalhub\//, "").replace(/^\.\//, "").toLowerCase() !== currentLinkPath).slice(0, 4);
  const basePrefix = "/tubalhub/";

  useEffect(() => {
    document.title = "TUBAL HUB — " + page.title;
    const descriptionTag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (descriptionTag) descriptionTag.content = page.description;
    const themeTag = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeTag) themeTag.content = "#07111d";
  }, [normalizedPath, page.title, page.description]);

  return (
    <div className="app-root legacy-app-root">
      <div className="ambient ambient--blue" aria-hidden="true" />
      <div className="ambient ambient--gold" aria-hidden="true" />
      <div className="grid-overlay" aria-hidden="true" />
      <Header homePrefix={basePrefix} />
      <main className="legacy-main">
        <section className="legacy-hero section-shell">
          <div className="legacy-hero__copy reveal">
            <div className="legacy-breadcrumb"><a href={basePrefix}>TUBAL HUB</a><span>/</span><span>{page.category}</span></div>
            <div className="eyebrow"><span className="eyebrow__spark"><Sparkles size={13} /></span>{page.category}</div>
            <h1>{page.title.split(" — ")[0]}<span className="hero-title__gradient">{page.title.includes(" — ") ? " " + page.title.split(" — ").slice(1).join(" — ") : "."}</span></h1>
            <p className="hero-lede">{page.description}</p>
            <div className="hero-actions legacy-hero__actions">
              <a className="button button--primary" href="#legacy-content">Explore this space <ArrowRight size={17} /></a>
              <a className="button button--ghost" href={basePrefix + "#brands"}>View the brands <ArrowUpRight size={16} /></a>
            </div>
            <div className="hero-proof"><span><Check size={14} /> One connected ecosystem</span><span><Check size={14} /> Consistent on every screen</span></div>
          </div>
          <div className="legacy-hero__visual reveal" aria-label="TUBAL HUB destination preview">
            <div className="legacy-hero__glow" />
            <div className="legacy-hero__orb legacy-hero__orb--one" />
            <div className="legacy-hero__orb legacy-hero__orb--two" />
            <div className="legacy-hero__monogram"><Icon size={64} strokeWidth={1.25} /><span>TH / {dashboard ? "HUB" : "SPACE"}</span></div>
            <div className="legacy-float legacy-float--top"><Gamepad2 size={17} /><span><b>CTRLZONE</b><small>Gaming & culture</small></span></div>
            <div className="legacy-float legacy-float--bottom"><PanelsTopLeft size={17} /><span><b>LifeHub</b><small>Everyday tools</small></span></div>
            <div className="legacy-float legacy-float--side"><Waves size={17} /><span><b>Payapang Isip</b><small>Mindful living</small></span></div>
          </div>
        </section>

        <section className="legacy-highlights section-shell reveal" id="legacy-content">
          {page.highlights.map((highlight, index) => (
            <article className="legacy-highlight" key={highlight}>
              <span className="legacy-highlight__number">0{index + 1}</span>
              <h2>{highlight}</h2>
              <p>{index === 0 ? "Start with the key destination and use the connected navigation to continue your workflow." : index === 1 ? "Related pages now share the same visual system, navigation pattern, and responsive layout." : "Your next step is easier to find with the redesigned platform directory and connected brand links."}</p>
            </article>
          ))}
        </section>

        {dashboard ? (
          <section className="legacy-directory section-shell section-spacing" aria-labelledby="legacy-directory-title">
            <div className="section-heading reveal">
              <div className="section-eyebrow"><span>01</span> TUBAL HUB directory</div>
              <h2 id="legacy-directory-title">Everything connected.<br /><span className="text-gradient">One clear starting point.</span></h2>
              <p>Search the redesigned directory to find the project, tool, community, or resource you need.</p>
            </div>
            <div className="legacy-search reveal">
              <Sparkles size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Search destinations, tools, and projects…" aria-label="Search TUBAL HUB destinations" />
              <span>{filteredLinks.length} destinations</span>
            </div>
            <div className="platform-grid legacy-directory-grid">
              {filteredLinks.map((item) => {
                const CardIcon = item.icon;
                return (
                  <a className="platform-card reveal" href={item.href} key={item.title}>
                    <div className="platform-card__top"><span className="platform-card__icon"><CardIcon size={20} /></span><span className="platform-card__category">{item.category}</span></div>
                    <h3>{item.title}</h3><p>{item.description}</p>
                    <span className="platform-card__link">Open destination <ArrowUpRight size={15} /></span>
                  </a>
                );
              })}
            </div>
            {filteredLinks.length === 0 && <p className="legacy-empty">No destinations match that search. Try another term.</p>}
          </section>
        ) : (
          <RouteSpecificContent routePath={normalizedPath} page={page} />
        )}

        {!dashboard && (
          <section className="legacy-related section-shell section-spacing">
            <div className="section-heading reveal">
              <div className="section-eyebrow"><span>03</span> Continue exploring</div>
              <h2>One Hub.<br /><span className="text-gradient">More ways forward.</span></h2>
            </div>
            <div className="platform-grid legacy-related-grid">
              {relatedLinks.map((item) => {
                const CardIcon = item.icon;
                return <a className="platform-card reveal" href={item.href} key={item.title}><div className="platform-card__top"><span className="platform-card__icon"><CardIcon size={20} /></span><span className="platform-card__category">{item.category}</span></div><h3>{item.title}</h3><p>{item.description}</p><span className="platform-card__link">Open destination <ArrowUpRight size={15} /></span></a>;
              })}
            </div>
          </section>
        )}
      </main>
      <Footer homePrefix={basePrefix} />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elements = document.querySelectorAll<HTMLElement>(".reveal");

    if (reducedMotion || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -24px 0px" },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const currentPath = window.location.pathname.replace(/^\/+/, "");
  const routePath = currentPath.startsWith("tubalhub/") ? currentPath.slice("tubalhub/".length) : currentPath;
  if (routePath && routePath !== "index.html") {
    return <LegacyRoutePage routePath={routePath} />;
  }

  return (
    <div className="app-root">
      <div className="ambient ambient--blue" aria-hidden="true" />
      <div className="ambient ambient--gold" aria-hidden="true" />
      <div className="grid-overlay" aria-hidden="true" />
      <Header />
      <main>
        <Hero />
        <Brands />
        <Platform />
        <Story />
        <Connect />
      </main>
      <Footer />
    </div>
  );
}

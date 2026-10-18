import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Eye,
  Facebook,
  Gamepad2,
  Github,
  Hexagon,
  Instagram,
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
  Youtube,
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
  },
];

const navItems = [
  { label: "Hub", href: "#hub" },
  { label: "Brands", href: "#brands" },
  { label: "Story", href: "#story" },
  { label: "Connect", href: "#connect" },
];

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <a className={`brand-logo${compact ? " brand-logo--compact" : ""}`} href="#hub" aria-label="TUBAL HUB home">
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

function Header() {
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
        <Logo />
        <div className="desktop-nav">
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </div>
        <a className="button button--nav" href="#connect">
          Get in touch <ArrowUpRight size={15} />
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
          <a key={item.href} href={item.href} onClick={closeMenu}>
            {item.label} <ArrowUpRight size={15} />
          </a>
        ))}
        <a className="mobile-nav__cta" href="#connect" onClick={closeMenu}>
          Get in touch <ArrowRight size={16} />
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
          <a className="button button--ghost" href="#story">
            Our story <ArrowUpRight size={16} />
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
    <article className={`brand-card brand-card--${brand.accent} reveal`}>
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
        <a className="brand-card__link" href="#connect">
          Discover this brand <ArrowUpRight size={16} />
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();

    if (!name || !email || !message) {
      setStatus("Please complete all fields before sending.");
      return;
    }

    const subject = encodeURIComponent("TUBAL HUB enquiry from " + name);
    const body = encodeURIComponent(
      "Name: " + name + "\nEmail: " + email + "\n\nMessage:\n" + message,
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
            <a href="https://github.com/tubalrr/tubalhub" target="_blank" rel="noreferrer" aria-label="TUBAL HUB on GitHub"><Github size={17} /></a>
            <a href="https://www.facebook.com/search/top?q=TUBAL%20HUB" target="_blank" rel="noreferrer" aria-label="Search TUBAL HUB on Facebook"><Facebook size={17} /></a>
            <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={17} /></a>
            <a href="https://www.youtube.com/results?search_query=TUBAL+HUB" target="_blank" rel="noreferrer" aria-label="Search TUBAL HUB on YouTube"><Youtube size={17} /></a>
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

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-main section-shell">
        <div className="footer-brand">
          <Logo compact />
          <p>Three brands. One hub. A connected home for commerce, community, and culture.</p>
          <span className="footer-location"><MapPin size={14} /> Made with intention in the Philippines</span>
        </div>
        <div className="footer-column">
          <strong>Explore</strong>
          <a href="#hub">The hub</a>
          <a href="#brands">Our brands</a>
          <a href="#story">Our story</a>
          <a href="#connect">Get in touch</a>
        </div>
        <div className="footer-column">
          <strong>The brands</strong>
          <a href="#brands">CTRLZONE <ArrowUpRight size={12} /></a>
          <a href="#brands">LifeHub <ArrowUpRight size={12} /></a>
          <a href="#brands">Payapang Isip <ArrowUpRight size={12} /></a>
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
        <a href="#hub">Back to top ↑</a>
      </div>
    </footer>
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

  return (
    <div className="app-root">
      <div className="ambient ambient--blue" aria-hidden="true" />
      <div className="ambient ambient--gold" aria-hidden="true" />
      <div className="grid-overlay" aria-hidden="true" />
      <Header />
      <main>
        <Hero />
        <Brands />
        <Story />
        <Connect />
      </main>
      <Footer />
    </div>
  );
}

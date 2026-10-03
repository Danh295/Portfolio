import localFont from "next/font/local";
import "./globals.css";
import { site } from "@/config/site";
import { ui } from "@/config/ui";

// Mirrors introPlan() in src/lib/intro.js: boot intro, not yet seen this session, motion ok,
// and not a deep link (a #hash goes straight to its section).
// Only on the home page (the only route that renders the intro, which removes the cover);
// if the intro never mounts (a failed script), a fail-safe uncovers the page after 6s.
const INTRO_COVER =
  ui.introFx === "boot"
    ? `try{var h=document.documentElement,p=location.pathname.replace(/\\/+$/,"");if((p===${JSON.stringify(site.basePath)}||p==="")&&!location.hash&&sessionStorage.getItem("danny-intro")!=="1"&&!matchMedia("(prefers-reduced-motion: reduce)").matches){h.classList.add("boot-intro");h.dataset.loading="true";setTimeout(function(){if(h.classList.contains("boot-intro")){h.classList.remove("boot-intro");delete h.dataset.loading}},6000)}}catch(e){}`
    : "";

// Self-hosted IBM Plex Mono (OFL, fonts/plex/OFL.txt): the site's typeface. It covers
// the box-drawing and block glyphs (U+2500–259F) the banner, frame labels and bars use.
// Two weights only (400, 500): headings use Medium, nothing on the site is bold.
const plex = localFont({
  src: [
    { path: "./fonts/plex/IBMPlexMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/plex/IBMPlexMono-Medium.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-plex",
  display: "swap",
  // No generated system fallback between Plex and JetBrains Mono: it would catch ■ □ ●
  // (wrong width) before the JetBrains fallback in --mono does.
  adjustFontFallback: false,
});

// JetBrains Mono (OFL, fonts/OFL.txt) stays only as a per-glyph fallback for the few
// symbols Plex lacks (■ □ ●). Same 0.6em advance, so mixed runs still line up.
const mono = localFont({
  src: [{ path: "./fonts/JetBrainsMono-Regular.woff2", weight: "400", style: "normal" }],
  variable: "--font-mono",
  display: "swap",
  preload: false,
});

export const metadata = {
  metadataBase: new URL(site.url),
  title: site.title,
  description: site.description,
  keywords: [
    "portfolio",
    "student",
    "developer",
    "software developer",
    "web developer",
    "computer vision",
    "OCR",
    site.name,
    "projects",
    "skills",
    "experience",
  ],
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  alternates: {
    canonical: `${site.url}/`,
  },
  openGraph: {
    type: "website",
    url: `${site.url}/`,
    siteName: site.title,
    title: site.title,
    description: site.description,
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: site.title,
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
  },
  // Listed by hand: Next's generated links left favicon.ico off the home page, so
  // browsers that skip SVG icons asked for /favicon.ico at the domain root (outside
  // /Portfolio) and got a 404. Setting `icons` replaces the generated links, so all three
  // files in src/app are listed here.
  icons: {
    icon: [
      { url: `${site.basePath}/favicon.ico`, sizes: "48x48" },
      { url: `${site.basePath}/icon.svg`, type: "image/svg+xml" },
    ],
    apple: `${site.basePath}/apple-icon.png`,
  },
};

// The pre-paint script sets the saved theme's colour; these cover the first paint and
// visitors without JavaScript.
export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#121211" },
    { media: "(prefers-color-scheme: light)", color: "#F3F2EE" },
  ],
};

// Type-in (globals.css): text that hasn't typed in yet is hidden from the first paint,
// only when motion is allowed. If the app never hydrates (a failed script), the text
// comes back after 8s.
const FX =
  ui.headerFx === "none"
    ? ""
    : `try{var f=document.documentElement;if(!matchMedia("(prefers-reduced-motion: reduce)").matches){f.classList.add("fx");setTimeout(function(){if(!f.dataset.hydrated)f.classList.remove("fx")},8000)}}catch(e){}`;

// Runs before first paint (and before hydration):
// - Theme: the visitor's saved choice, else their OS setting (useTheme keeps it in sync).
// - Mode: a reload returns to terminal mode if that's where the visitor was this session
//   (App reads sessionStorage too); html.boot-term hides the gui until the terminal mounts.
// - Type-in: html.fx (see FX above).
// - Intro: on a visit where the boot intro will play, cover the page (html.boot-intro)
//   from the very first frame, so the homepage doesn't flash before the intro mounts.
// - A reload starts on the hero: drop the #section / #projects/<slug> hash pushed while
//   browsing, and turn off browser scroll restoration (the app drives scrolling). Fresh
//   visits keep their hash, so /#projects links and the redirect stubs still work.
const BOOT = `try{if(localStorage.getItem("danny-keys")==="off")document.documentElement.dataset.keys="off"}catch(e){}try{var d=document.documentElement,t=localStorage.getItem("danny-theme");if(t!=="dark"&&t!=="light")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";d.dataset.theme=t;document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.content=t==="dark"?"#121211":"#F3F2EE"})}catch(e){}try{if(sessionStorage.getItem("danny-mode")==="term")document.documentElement.classList.add("boot-term")}catch(e){}try{history.scrollRestoration="manual";var n=performance.getEntriesByType("navigation")[0];if(n&&n.type==="reload"&&location.hash)history.replaceState(null,"",location.pathname+location.search)}catch(e){}${FX}${INTRO_COVER}`;

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${plex.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

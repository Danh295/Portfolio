import { isCurrent } from "@/lib/dates";

// When the site was built (next.config.mjs; under node tests, now).
const BUILT = new Date(process.env.BUILD_DATE ?? Date.now());

// Newest first, all shown.
// Casing is stored exactly as displayed (nothing transforms it): the site's voice is
// lowercase, including locations; companies, products and acronyms keep their casing.
// `now` (the "● now" badge, the hero's "working" fact) comes from `date` at build time.
const entries = [
  {
    title: "software solutions developer (co-op)",
    company: "IESO",
    loc: "mississauga, on",
    date: "sep 2026 – dec 2026",
    summary:
      "building a Python performance monitor on psutil for a Windows QA server, and code-reviewing data pipelines and Oracle SQL",
    details: [
      "developing a Python performance monitoring wrapper on psutil for a Windows QA server, capturing process-level CPU and memory metrics from scripts without modifying their source",
      "black-box and integration tested psutil, py-spy, line_profiler and tracemalloc against unmodifiable programs, validating Windows compatibility under enterprise-approved packages",
      "benchmarked profiling overhead from 0.5% (psutil) to 31.8% (tracemalloc) and presented the trade-offs to the Solutions Development team, scoping psutil for the first production rollout",
      "code-reviewed Python data pipelines and Oracle SQL queries for correctness, security and maintainability",
    ],
  },
  {
    title: "software developer (co-op)",
    company: "City of Waterloo",
    loc: "waterloo, on",
    date: "jan 2026 – apr 2026",
    summary:
      "built a full-stack web app that digitizes handwritten parking tickets with a 10-stage computer vision pipeline, reaching 92.3% per-field accuracy",
    details: [
      "independently built a full-stack web app to digitize handwritten parking tickets, reaching 92.3% per-field accuracy across 15 extracted fields per page on a 39-page labeled benchmark dataset",
      "designed a 10-stage computer vision pipeline in Python with OpenCV and FastAPI: grid-snap zone detection, contour-based checkbox analysis, and a plate OCR fallback that merges PaddleOCR with a fine-tuned TrOCR model through character-level SequenceMatcher alignment",
      "fine-tuned Microsoft's TrOCR-base-handwritten on real plate crops with PEFT/LoRA, merging the adapter into the base weights at startup so inference adds no latency",
      "shipped a Next.js, React and TypeScript frontend with in-browser camera capture and an editable multi-page review, running fully local inference with no cloud APIs to meet municipal data-privacy requirements",
    ],
  },
  {
    title: "web developer associate",
    company: "CiviConnect",
    loc: "lincoln, on",
    date: "jan 2025 – apr 2025",
    summary:
      "built a travel-agency web app and a law association's client site in React, Next.js and Strapi",
    details: [
      "developed a travel-agency web app for lincoln, on in React, Next.js and Strapi, with a Google Places API map, filterable events, user authentication, reviews and a calendar-based itinerary builder",
      "delivered a client site for the Welland Law Association in React, Tailwind CSS and Next.js, backed by a custom Strapi schema with search and filtering across site content",
    ],
  },
  {
    title: "operations executive member",
    company: "Opportunify",
    loc: "ontario, canada",
    date: "2022 – 2023",
    summary:
      "student-run nonprofit experience focused on operations, coordination, and contributing across initiatives in a fast-moving team environment",
    details: [
      "supported operations and execution work across student-led initiatives",
      "helped keep projects moving through coordination, communication, and practical follow-through",
      "gained early experience working in teams with ownership across multiple responsibilities",
    ],
  },
  {
    title: "chief operations officer",
    company: "Untapped Valley",
    loc: "ontario, canada",
    date: "2022 – 2023",
    summary:
      "student nonprofit leadership role centered on operations, execution, and helping guide initiatives from planning into action",
    details: [
      "led operations-focused work within a student-run nonprofit environment",
      "balanced organization, coordination, and execution across ongoing initiatives",
      "built early leadership experience through accountability, team collaboration, and structured follow-through",
    ],
  },
];

export const experienceEntries = entries.map((e) => ({ ...e, now: isCurrent(e.date, BUILT) }));

import { isCurrent } from "@/lib/dates";

// When the site was built (next.config.mjs; under node tests, now).
const BUILT = new Date(process.env.BUILD_DATE ?? Date.now());

// Newest first. `early: true` roles are folded into one "earlier · n roles" toggle row.
// Casing is stored exactly as displayed (nothing transforms it): the site's voice is
// lowercase, including locations; companies, products and acronyms keep their casing.
// `now` (the "● now" badge, the hero's "working" fact) comes from `date` at build time.
const entries = [
  {
    title: "software solutions developer (co-op)",
    company: "IESO",
    loc: "mississauga, on",
    date: "sep 2026 – dec 2026",
    summary: "working on Python proofs of concept and data pipelines, along with SQL databases",
    details: [
      "building Python proofs of concept",
      "working on data pipelines",
      "working with SQL databases",
    ],
  },
  {
    title: "software developer (co-op)",
    company: "City of Waterloo",
    loc: "waterloo, on",
    date: "jan 2026 – apr 2026",
    summary:
      "built internal software and contributed to practical web-based tools that support day-to-day workflows and service delivery",
    details: [
      "worked across frontend implementation and broader product polish for production-facing internal tools",
      "contributed to UI improvements, maintainable components, and cleaner engineering workflows",
      "focused on reliable delivery, practical collaboration, and learning through shipped work",
    ],
  },
  {
    title: "web developer",
    company: "CiviConnect",
    loc: "ontario, canada",
    date: "2024 – 2025",
    summary:
      "worked on website development and digital experiences with a stronger emphasis on frontend delivery and implementation detail",
    details: [
      "developed websites and supporting pages across multiple initiatives",
      "worked through website builds, JavaScript-heavy frontend work, and Strapi-backed content changes",
      "contributed to design-minded implementation and Figma-based UI translation",
    ],
  },
  {
    title: "operations executive member",
    company: "Opportunify",
    early: true,
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
    early: true,
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

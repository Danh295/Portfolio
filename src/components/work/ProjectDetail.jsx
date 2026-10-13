"use client";

import { useRef } from "react";
import { projects } from "@/data/projects";
import { useTextFx } from "@/lib/useTextFx";
import { pad } from "@/lib/format";
import { fmtDate, repoFor } from "@/lib/github";
import { KeyLabel, TouchText } from "@/components/Hint";
import styles from "./ProjectDetail.module.css";

export default function ProjectDetail({ slug, onBack, onOpen }) {
  const h1 = useRef(null);
  const idx = projects.findIndex((p) => p.slug === slug);
  const p = projects[idx];
  const next = projects[(idx + 1) % projects.length],
    prev = projects[(idx - 1 + projects.length) % projects.length];
  useTextFx(h1, p.title, "set");

  const meta = [
    ["type", p.category],
    ["org", p.org],
  ];
  if (p.role) meta.push(["role", p.role]);
  meta.push(["timeline", p.timeline]);
  if (p.location) meta.push(["location", p.location]);
  meta.push(["context", p.context]);
  const repo = repoFor(p);
  if (repo)
    meta.push([
      "GitHub",
      repo.stars +
        (repo.stars === 1 ? " star" : " stars") +
        (repo.pushedAt ? " · pushed " + fmtDate(repo.pushedAt) : ""),
    ]);
  const links = p.links.length ? p.links : [{ label: "internal project", href: null }];

  return (
    <div className={styles.page}>
      <div className={styles.nav}>
        <button
          type="button"
          onClick={onBack}
          data-key="Escape"
          data-tip="back to ~/projects"
          className={styles.back}
        >
          <KeyLabel className={styles.dim}>[esc]</KeyLabel> ← cd ..
        </button>
        <div className={styles.pn}>
          <button
            type="button"
            onClick={() => onOpen(prev.slug)}
            data-key="ArrowLeft"
            data-tip={prev.title}
            aria-label={"previous project: " + prev.title}
            className={styles.step}
          >
            <KeyLabel className={styles.dim}>[←]</KeyLabel>
            <TouchText>←</TouchText>
            <span className={styles.stepName}> {prev.title}</span>
          </button>
          <button
            type="button"
            onClick={() => onOpen(next.slug)}
            data-key="ArrowRight"
            data-tip={next.title}
            aria-label={"next project: " + next.title}
            className={styles.step}
          >
            <span className={styles.stepName}>{next.title} </span>
            <KeyLabel className={styles.dim}>[→]</KeyLabel>
            <TouchText>→</TouchText>
          </button>
        </div>
      </div>
      <article className={styles.frame}>
        <span className={styles.label}>
          ┤ ~/projects/{p.category}/{p.slug}.md ├
        </span>
        <div className={styles.head}>
          <span className={styles.no}>{pad(idx + 1)}</span>
          <h1
            ref={h1}
            className={styles.h1}
            aria-label={p.title}
            tabIndex={-1}
            data-detail-title=""
          />
        </div>
        <div className={styles.meta}>
          {meta.map(([k, v]) => (
            <div key={k} className={styles.metaCell}>
              <span className={styles.metaKey}>{k}</span>
              <span className={k === "org" ? styles.metaRaw : styles.metaVal}>{v}</span>
            </div>
          ))}
        </div>
        <div className={styles.body}>
          <div className={styles.lead}>
            <p className={styles.purpose}>{p.purpose}</p>
            <div className={styles.leadFoot}>
              <div className={styles.stack}>
                stack: <span className={styles.raw}>{p.tags.join(", ")}</span>
              </div>
              <div className={styles.links}>
                {links.map((l) =>
                  l.href ? (
                    <a
                      key={l.label}
                      href={l.href}
                      target="_blank"
                      rel="noreferrer"
                      data-tip={l.href}
                    >
                      {l.label} ↗
                    </a>
                  ) : (
                    <span key={l.label} className={styles.mid}>
                      {l.label}
                    </span>
                  ),
                )}
              </div>
            </div>
          </div>
          <div className={styles.bullets}>
            {p.bullets.map((b, i) => (
              <div key={i} className={styles.bullet}>
                <span className={styles.n}>{pad(i + 1)}</span>
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}

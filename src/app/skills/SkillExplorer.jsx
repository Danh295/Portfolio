"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import TechTag from "@/components/ui/TechTag";

import styles from "./page.module.css";

/* ── layout constants ───────────────────────────────────────────── */

const CLUSTER_LAYOUT = {
  Frontend: {
    angle: 216,
    mainRadius: 32,
    miniRadius: 16,
    miniSpeed: 52,
    miniDirection: 1,
  },
  Backend: {
    angle: 288,
    mainRadius: 28,
    miniRadius: 12,
    miniSpeed: 44,
    miniDirection: -1,
  },
  "AI / ML": {
    angle: 0,
    mainRadius: 28,
    miniRadius: 13,
    miniSpeed: 38,
    miniDirection: 1,
  },
  "Computer Vision / OCR": {
    angle: 72,
    mainRadius: 30,
    miniRadius: 12,
    miniSpeed: 48,
    miniDirection: -1,
  },
  "Tooling / Infra": {
    angle: 144,
    mainRadius: 26,
    miniRadius: 10,
    miniSpeed: 34,
    miniDirection: 1,
  },
};

const ICON_BASE_SIZE = 50;
const MAIN_ORBIT_SPEED = 90;
const MAIN_ORBIT_LOCKED_SPEED = 140;
const LERP_SPEED = 0.1;

/* 3D tilt — dual-axis wobble */
const TILT_X_BASE = 18;
const TILT_X_AMP = 10;
const TILT_X_PERIOD = 28;
const TILT_Y_BASE = 0;
const TILT_Y_AMP = 8;
const TILT_Y_PERIOD = 36;

/* ── math helpers ───────────────────────────────────────────────── */

function normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360;
}

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

function polarToPercent(angle, radius) {
  const rad = degreesToRadians(angle);

  return {
    x: Number((50 + Math.cos(rad) * radius).toFixed(4)),
    y: Number((50 + Math.sin(rad) * radius).toFixed(4)),
  };
}

function polarToPixel(angle, radiusPx, cx, cy) {
  const rad = degreesToRadians(angle);

  return {
    x: cx + Math.cos(rad) * radiusPx,
    y: cy + Math.sin(rad) * radiusPx,
  };
}

/* ── cluster model ──────────────────────────────────────────────── */

function buildClusterModel(skillGroups) {
  return skillGroups.map((group) => {
    const config = CLUSTER_LAYOUT[group.title];
    const n = group.skills.length;

    const nodes = group.skills.map((skill, i) => ({
      ...skill,
      category: group.title,
      localAngle: (360 / n) * i,
      miniRadius: config.miniRadius,
      scale: 0.82 + skill.displayWeight * 0.28,
    }));

    return {
      title: group.title,
      centerAngle: normalizeAngle(config.angle),
      mainRadius: config.mainRadius,
      miniRadius: config.miniRadius,
      miniSpeed: config.miniSpeed,
      miniDirection: config.miniDirection,
      labelRadius: config.mainRadius,
      nodes,
    };
  });
}

/* ── sub-components ─────────────────────────────────────────────── */

function ProjectTypeBadge({ category }) {
  const toneClass =
    category === "Professional"
      ? styles.badgeProfessional
      : category === "Personal"
        ? styles.badgePersonal
        : styles.badgeHackathon;

  return (
    <span className={`${styles.projectBadge} ${toneClass}`}>{category}</span>
  );
}

function FocusCard({
  activeSkill,
  projectTypeOrder,
  compact = false,
  isLocked = false,
  onUnlock,
}) {
  return (
    <div
      className={`${styles.focusCard} ${compact ? styles.focusCardCompact : ""}`}
    >
      <div className={styles.focusHeader}>
        <div className={styles.focusHeaderRow}>
          <div className={styles.focusTitleGroup}>
            <span className={styles.eyebrow}>
              {isLocked ? "Locked selection" : "Focused skill"}
            </span>
            <h2 className={styles.focusTitle}>{activeSkill.name}</h2>
            <p className={styles.focusSubhead}>{activeSkill.category}</p>
          </div>

          {isLocked && onUnlock ? (
            <button
              type="button"
              className={styles.unlockButton}
              onClick={onUnlock}
              aria-label={`Unlock ${activeSkill.name}`}
            >
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.focusStats}>
        <div className={styles.focusStatCard}>
          <span className={styles.focusStatValue}>
            {activeSkill.projectCount}
          </span>
          <span className={styles.focusStatLabel}>Projects using it</span>
        </div>
        <div className={styles.focusStatCard}>
          <span className={styles.focusStatValue}>
            {
              projectTypeOrder.filter(
                (type) => activeSkill.projectTypeCounts[type] > 0,
              ).length
            }
          </span>
          <span className={styles.focusStatLabel}>Project contexts</span>
        </div>
      </div>

      <div className={styles.breakdownRow}>
        {projectTypeOrder
          .filter((type) => activeSkill.projectTypeCounts[type] > 0)
          .map((type) => (
            <span key={type} className={styles.breakdownPill}>
              <span>{type}</span>
              <strong>{activeSkill.projectTypeCounts[type]}</strong>
            </span>
          ))}
      </div>

      <div className={styles.relatedSection}>
        <div className={styles.relatedHeader}>
          <h3 className={styles.relatedTitle}>Related Projects</h3>
          <span className={styles.relatedMeta}>
            {activeSkill.projectCount} linked build
            {activeSkill.projectCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className={styles.relatedList}>
          {activeSkill.projects.map((project) => (
            <Link
              key={`${activeSkill.name}-${project.slug}`}
              href={`/projects#${project.slug}`}
              className={styles.relatedProject}
            >
              <div className={styles.relatedTop}>
                <h4 className={styles.relatedProjectTitle}>{project.title}</h4>
                <ProjectTypeBadge category={project.category} />
              </div>
              <p className={styles.relatedContext}>{project.context}</p>
              <p className={styles.relatedTimeline}>{project.timeline}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── main component ─────────────────────────────────────────────── */

export default function SkillExplorer({
  skillGroups,
  initialSkillName,
  stats,
  projectTypeOrder,
}) {
  const sceneRef = useRef(null);
  const orbitPlaneRef = useRef(null);
  const orbitFieldRef = useRef(null);
  const coreSlotRef = useRef(null);
  const nodeShellRefs = useRef(new Map());
  const labelRefs = useRef(new Map());
  const miniRingRefs = useRef(new Map());
  const nodePositionsRef = useRef(new Map());
  const slotOffsetRef = useRef(0);
  const orbitAngleRef = useRef(0);
  const miniAnglesRef = useRef({});
  const lastTimestampRef = useRef(null);
  const durationRef = useRef(MAIN_ORBIT_SPEED);
  const sceneSizeRef = useRef({ width: 0, height: 0 });
  const lockedSkillNameRef = useRef(null);
  const hoveredSkillNameRef = useRef(null);
  const sceneReadyRef = useRef(false);

  const skills = useMemo(
    () => skillGroups.flatMap((group) => group.skills),
    [skillGroups],
  );
  const defaultSkillName = initialSkillName ?? skills[0]?.name ?? "";
  const clusters = useMemo(
    () => buildClusterModel(skillGroups),
    [skillGroups],
  );
  const allNodes = useMemo(
    () => clusters.flatMap((c) => c.nodes),
    [clusters],
  );

  const [hoveredSkillName, setHoveredSkillName] = useState(null);
  const [lockedSkillName, setLockedSkillName] = useState(null);
  const [sceneReady, setSceneReady] = useState(false);

  const selectedSkillName =
    lockedSkillName ?? hoveredSkillName ?? defaultSkillName;
  const activeSkill =
    skills.find((s) => s.name === selectedSkillName) ?? skills[0];
  const lockedNode = lockedSkillName
    ? allNodes.find((n) => n.name === lockedSkillName)
    : null;

  durationRef.current = lockedSkillName
    ? MAIN_ORBIT_LOCKED_SPEED
    : MAIN_ORBIT_SPEED;
  lockedSkillNameRef.current = lockedSkillName;

  /* ── scene measurement ──────────────────────────────────────── */

  useLayoutEffect(() => {
    const scene = sceneRef.current;

    if (!scene) {
      return undefined;
    }

    function measure() {
      const w = scene.clientWidth;
      const h = scene.clientHeight;

      sceneSizeRef.current = { width: w, height: h };

      const slotEl = coreSlotRef.current;

      if (slotEl) {
        const sceneRect = scene.getBoundingClientRect();
        const slotRect = slotEl.getBoundingClientRect();

        slotOffsetRef.current =
          slotRect.top + slotRect.height / 2 - (sceneRect.top + sceneRect.height / 2);
      }
    }

    measure();

    const observer = new ResizeObserver(measure);

    observer.observe(scene);

    return () => observer.disconnect();
  }, []);

  /* re-measure slot offset after entrance transitions + lock changes */
  useEffect(() => {
    if (!sceneReady) {
      return undefined;
    }

    function measureSlot() {
      const scene = sceneRef.current;
      const slotEl = coreSlotRef.current;

      if (slotEl && scene) {
        const sceneRect = scene.getBoundingClientRect();
        const slotRect = slotEl.getBoundingClientRect();

        slotOffsetRef.current =
          slotRect.top + slotRect.height / 2 - (sceneRect.top + sceneRect.height / 2);
      }
    }

    /* wait for CSS transitions to settle */
    const id = setTimeout(measureSlot, lockedSkillName ? 250 : 850);

    return () => clearTimeout(id);
  }, [sceneReady, lockedSkillName]);

  /* ── animation loop ─────────────────────────────────────────── */

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReduced) {
      return undefined;
    }

    let rafId;

    function tick(timestamp) {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
        rafId = requestAnimationFrame(tick);

        return;
      }

      const deltaMs = timestamp - lastTimestampRef.current;

      lastTimestampRef.current = timestamp;

      /* main orbit rotation */
      const mainDegsPerMs = 360 / (durationRef.current * 1000);

      orbitAngleRef.current =
        (orbitAngleRef.current + mainDegsPerMs * deltaMs) % 360;

      if (orbitFieldRef.current) {
        orbitFieldRef.current.style.setProperty(
          "--orbit-angle",
          `${orbitAngleRef.current}deg`,
        );
      }

      const { width: sceneW, height: sceneH } = sceneSizeRef.current;

      if (!sceneW || !sceneH) {
        rafId = requestAnimationFrame(tick);

        return;
      }

      const centerX = sceneW / 2;
      const centerY = sceneH / 2;
      const minDim = Math.min(sceneW, sceneH);
      const lockedName = lockedSkillNameRef.current;
      const hoveredName = hoveredSkillNameRef.current;

      /* 3D tilt — dual-axis wobble for oval orbit effect */
      const tiltX =
        TILT_X_BASE +
        Math.sin((timestamp * 2 * Math.PI) / (TILT_X_PERIOD * 1000)) *
          TILT_X_AMP;
      const tiltY =
        TILT_Y_BASE +
        Math.sin((timestamp * 2 * Math.PI) / (TILT_Y_PERIOD * 1000)) *
          TILT_Y_AMP;

      if (orbitPlaneRef.current) {
        orbitPlaneRef.current.style.transform =
          `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      }


      /* phase 1: compute orbital target positions (flat 2D — CSS 3D handles tilt) */
      const targets = new Map();

      clusters.forEach((cluster) => {
        /* slow down mini-orbit when hovering a skill in this cluster (not when locked) */
        const clusterHasHover =
          hoveredName &&
          !lockedName &&
          cluster.nodes.some((n) => n.name === hoveredName);
        const baseMiniDegsPerMs =
          (360 * cluster.miniDirection) / (cluster.miniSpeed * 1000);
        const miniDegsPerMs = clusterHasHover
          ? baseMiniDegsPerMs * 0.2
          : baseMiniDegsPerMs;
        const prevMini = miniAnglesRef.current[cluster.title] ?? 0;

        miniAnglesRef.current[cluster.title] =
          (prevMini + miniDegsPerMs * deltaMs) % 360;

        const miniAngle = miniAnglesRef.current[cluster.title];

        /* cluster center — flat 2D polar position */
        const clusterAngle =
          cluster.centerAngle + orbitAngleRef.current;
        const clusterRadiusPx =
          (cluster.mainRadius / 100) * minDim;
        const { x: cx, y: cy } = polarToPixel(
          clusterAngle,
          clusterRadiusPx,
          centerX,
          centerY,
        );

        /* position mini orbit ring via JS */
        const ringEl = miniRingRefs.current.get(cluster.title);

        if (ringEl) {
          const ringDiameter = ((cluster.miniRadius * 2) / 100) * minDim;

          ringEl.style.setProperty("--ring-x", `${cx}px`);
          ringEl.style.setProperty("--ring-y", `${cy}px`);
          ringEl.style.setProperty("--ring-size", `${ringDiameter}px`);
        }

        cluster.nodes.forEach((skill) => {
          const skillAngle = skill.localAngle + miniAngle;
          const miniRadiusPx = (skill.miniRadius / 100) * minDim;
          const { x: orbitX, y: orbitY } = polarToPixel(
            skillAngle,
            miniRadiusPx,
            cx,
            cy,
          );

          const isLocked = lockedName === skill.name;

          targets.set(skill.name, {
            x: isLocked ? centerX : orbitX,
            y: isLocked ? centerY + slotOffsetRef.current : orbitY,
            isLocked,
          });
        });
      });

      /* phase 2: lerp from current toward target */
      targets.forEach((target, name) => {
        const current = nodePositionsRef.current.get(name);

        if (!current) {
          nodePositionsRef.current.set(name, { x: target.x, y: target.y });

          return;
        }

        const dist = Math.hypot(
          target.x - current.x,
          target.y - current.y,
        );
        const lerp = dist > 8 ? LERP_SPEED : 1.0;

        nodePositionsRef.current.set(name, {
          x: current.x + (target.x - current.x) * lerp,
          y: current.y + (target.y - current.y) * lerp,
        });
      });

      /* phase 3: apply positions to DOM + edge detection */
      nodePositionsRef.current.forEach((pos, name) => {
        const el = nodeShellRefs.current.get(name);

        if (el) {
          el.style.setProperty("--node-x", `${pos.x}px`);
          el.style.setProperty("--node-y", `${pos.y}px`);

          const nearTop = pos.y < 55;
          const nearSide = pos.x < 60 || pos.x > sceneW - 60;

          if (nearTop) {
            el.setAttribute("data-edge", "top");
          } else if (nearSide) {
            el.setAttribute("data-edge", "side");
          } else {
            el.removeAttribute("data-edge");
          }
        }
      });

      /* phase 4: category labels */
      clusters.forEach((cluster) => {
        const labelEl = labelRefs.current.get(cluster.title);

        if (!labelEl) {
          return;
        }

        const clusterAngle =
          cluster.centerAngle + orbitAngleRef.current;
        const labelRadiusPx =
          (cluster.labelRadius / 100) * minDim;
        const lPos = polarToPixel(
          clusterAngle,
          labelRadiusPx,
          centerX,
          centerY,
        );
        const pad = 30;
        const opacity =
          lPos.x < pad ||
          lPos.x > sceneW - pad ||
          lPos.y < 20 ||
          lPos.y > sceneH - 20
            ? 0
            : 1;

        labelEl.style.setProperty("--label-x", `${lPos.x}px`);
        labelEl.style.setProperty("--label-y", `${lPos.y}px`);
        labelEl.style.opacity = opacity;
      });

      /* trigger reveal after first complete frame */
      if (!sceneReadyRef.current) {
        sceneReadyRef.current = true;
        setSceneReady(true);
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, [clusters]);

  /* ── handlers ───────────────────────────────────────────────── */

  function previewSkill(skillName) {
    if (lockedSkillName) {
      return;
    }

    hoveredSkillNameRef.current = skillName;
    setHoveredSkillName(skillName);
  }

  function clearPreview() {
    if (lockedSkillName) {
      return;
    }

    hoveredSkillNameRef.current = null;
    setHoveredSkillName(null);
  }

  function toggleSkillLock(skillName) {
    if (lockedSkillName === skillName) {
      setLockedSkillName(null);

      return;
    }

    setLockedSkillName(skillName);
    setHoveredSkillName(skillName);
  }

  function unlockSelection() {
    hoveredSkillNameRef.current = null;
    setLockedSkillName(null);
    setHoveredSkillName(null);
  }

  /* ── orbit line data ───────────────────────────────────────── */

  const orbitLineData = useMemo(
    () =>
      clusters.map((cluster) => ({
        title: cluster.title,
        center: polarToPercent(cluster.centerAngle, cluster.mainRadius),
      })),
    [clusters],
  );

  /* ── render ─────────────────────────────────────────────────── */

  let revealIndex = 0;

  return (
    <section className={styles.explorerShell}>
      <article className={styles.explorerPanel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.eyebrow}>Project-Driven Skill Map</span>
            <h2 className={styles.panelTitle}>Orbiting around shipped work</h2>
          </div>
          <p className={styles.panelCopy}>
            The orbit maps how the stack clusters across real builds. Select a
            skill to inspect where it shows up and how often it appears.
          </p>
        </div>

        <div className={styles.summaryRow}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryValue}>{stats.skillCount}</span>
            <span className={styles.summaryLabel}>Mapped skills</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryValue}>{stats.projectCount}</span>
            <span className={styles.summaryLabel}>Linked projects</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryValue}>{stats.topSkill}</span>
            <span className={styles.summaryLabel}>Most used right now</span>
          </div>
        </div>

        <div className={styles.explorerContent}>
          <div
            ref={sceneRef}
            className={`${styles.orbitScene} ${sceneReady ? styles.sceneReady : ""}`}
          >
            {/* 3D-tilted orbit plane — CSS perspective handles depth */}
            <div ref={orbitPlaneRef} className={styles.orbitPlane}>
              {/* decorative background */}
              <div className={styles.sceneGlow} />
              <div
                className={`${styles.orbitRing} ${styles.orbitRingOuter}`}
              />
              <div
                className={`${styles.orbitRing} ${styles.orbitRingMid}`}
              />
              <div
                className={`${styles.orbitRing} ${styles.orbitRingInner}`}
              />

              {/* rotating decoration layer */}
              <div ref={orbitFieldRef} className={styles.orbitField}>
                {/* SVG orbit lines from center to each cluster */}
                <svg
                  className={styles.orbitLines}
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {orbitLineData.map(({ title, center }) => (
                    <g key={`line-${title}`}>
                      <line
                        x1="50"
                        y1="50"
                        x2={center.x}
                        y2={center.y}
                        className={styles.orbitLine}
                      />
                      <circle
                        cx={center.x}
                        cy={center.y}
                        r="0.5"
                        className={styles.orbitLineDot}
                      />
                    </g>
                  ))}
                </svg>
              </div>

              {/* mini orbit rings — positioned by JS in screen space */}
              {clusters.map((cluster) => (
                <div
                  key={`ring-${cluster.title}`}
                  ref={(el) => {
                    if (el) {
                      miniRingRefs.current.set(cluster.title, el);
                    } else {
                      miniRingRefs.current.delete(cluster.title);
                    }
                  }}
                  className={styles.miniOrbitRing}
                />
              ))}

              {/* skill icons in orbit (non-locked) — positioned by JS */}
              {allNodes.map((skill) => {
                if (skill.name === lockedSkillName) {
                  return null;
                }

                const isSelected = skill.name === activeSkill?.name;
                const nodeIndex = revealIndex++;

                return (
                  <div
                    key={skill.name}
                    ref={(el) => {
                      if (el) {
                        nodeShellRefs.current.set(skill.name, el);
                      } else {
                        nodeShellRefs.current.delete(skill.name);
                      }
                    }}
                    className={styles.orbitNodeShell}
                    style={{ "--reveal-index": nodeIndex }}
                  >
                    <TechTag
                      as="button"
                      type="button"
                      label={skill.name}
                      iconOnly
                      orbit
                      active={isSelected}
                      className={styles.orbitNode}
                      style={{
                        "--node-scale": `${skill.scale}`,
                        "--icon-size": `${ICON_BASE_SIZE}px`,
                      }}
                      onMouseEnter={() => previewSkill(skill.name)}
                      onMouseLeave={() => clearPreview()}
                      onFocus={() => previewSkill(skill.name)}
                      onClick={() => toggleSkillLock(skill.name)}
                    />
                    <span className={styles.orbitTooltip} role="tooltip">
                      {skill.name}
                    </span>
                  </div>
                );
              })}

              {/* category labels — positioned by JS */}
              {clusters.map((cluster) => (
                <div
                  key={`label-${cluster.title}`}
                  ref={(el) => {
                    if (el) {
                      labelRefs.current.set(cluster.title, el);
                    } else {
                      labelRefs.current.delete(cluster.title);
                    }
                  }}
                  className={styles.categoryLabelAnchor}
                >
                  <span className={styles.categoryLabel}>
                    {cluster.title}
                  </span>
                </div>
              ))}

            </div>

            {/* locked node — rendered outside orbitPlane so it stays flat */}
            {lockedNode && (
              <div
                ref={(el) => {
                  if (el) {
                    nodeShellRefs.current.set(lockedNode.name, el);
                  } else {
                    nodeShellRefs.current.delete(lockedNode.name);
                  }
                }}
                className={`${styles.orbitNodeShell} ${styles.orbitNodeCentered}`}
              >
                <TechTag
                  as="button"
                  type="button"
                  label={lockedNode.name}
                  iconOnly
                  orbit
                  active
                  locked
                  onClose={unlockSelection}
                  className={styles.orbitNode}
                  style={{
                    "--node-scale": `${lockedNode.scale}`,
                    "--icon-size": `${ICON_BASE_SIZE}px`,
                  }}
                  onMouseEnter={() => previewSkill(lockedNode.name)}
                  onMouseLeave={() => clearPreview()}
                  onClick={() => toggleSkillLock(lockedNode.name)}
                  aria-pressed
                />
                <span className={styles.orbitTooltip} role="tooltip">
                  {lockedNode.name}
                </span>
              </div>
            )}

            {/* center hub with icon slot — counter-rotated to stay flat */}
            <div
              className={`${styles.coreLabel} ${
                lockedSkillName ? styles.coreLabelLocked : ""
              }`}
              style={{
                "--slot-size": lockedNode
                  ? `${ICON_BASE_SIZE * lockedNode.scale + 6}px`
                  : `${ICON_BASE_SIZE + 4}px`,
              }}
            >
              <div
                ref={coreSlotRef}
                className={`${styles.coreSlot} ${
                  lockedSkillName ? styles.coreSlotFilled : ""
                }`}
              >
                <svg
                  className={styles.slotRings}
                  viewBox="0 0 100 100"
                  aria-hidden="true"
                >
                  {Array.from(
                    { length: activeSkill.projectCount },
                    (_, i) => {
                      const r =
                        activeSkill.projectCount === 1
                          ? 30
                          : 12 +
                            (i * 30) /
                              (activeSkill.projectCount - 1);

                      return (
                        <circle
                          key={i}
                          cx="50"
                          cy="50"
                          r={r}
                          className={styles.slotRing}
                        />
                      );
                    },
                  )}
                </svg>
              </div>
              <strong className={styles.coreName}>
                {activeSkill.name}
              </strong>
              <span className={styles.coreCategory}>
                {activeSkill.category}
              </span>
            </div>
          </div>

          <aside className={styles.focusSidebar}>
            <FocusCard
              activeSkill={activeSkill}
              projectTypeOrder={projectTypeOrder}
              isLocked={Boolean(lockedSkillName)}
              onUnlock={unlockSelection}
            />
          </aside>
        </div>

        {/* mobile layout */}
        <div className={styles.mobileExplorer}>
          {/* mobile center hub */}
          <div className={styles.mobileHub}>
            <div
              className={`${styles.mobileSlot} ${
                lockedSkillName ? styles.mobileSlotFilled : ""
              }`}
            >
              <TechTag
                label={activeSkill.name}
                iconOnly
                active={Boolean(lockedSkillName)}
                locked={Boolean(lockedSkillName)}
                onClose={lockedSkillName ? unlockSelection : undefined}
                style={{ "--icon-size": "40px" }}
              />
            </div>
            <div className={styles.mobileHubText}>
              <strong className={styles.mobileHubName}>
                {activeSkill.name}
              </strong>
              <span className={styles.mobileHubCategory}>
                {activeSkill.category}
              </span>
              <span className={styles.mobileHubCount}>
                {activeSkill.projectCount} project
                {activeSkill.projectCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {/* mobile skill groups */}
          <div className={styles.mobileGroups}>
            {skillGroups.map((group) => (
              <article key={group.title} className={styles.mobileGroup}>
                <div className={styles.mobileGroupHeader}>
                  <h3 className={styles.mobileGroupTitle}>{group.title}</h3>
                  <span className={styles.mobileGroupMeta}>
                    {group.skills.length} skill
                    {group.skills.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className={styles.mobileNodeRow}>
                  {group.skills.map((skill) => (
                    <TechTag
                      key={skill.name}
                      as="button"
                      type="button"
                      label={skill.name}
                      compact
                      count={skill.projectCount}
                      active={activeSkill?.name === skill.name}
                      locked={lockedSkillName === skill.name}
                      onClose={
                        lockedSkillName === skill.name
                          ? unlockSelection
                          : undefined
                      }
                      onClick={() => toggleSkillLock(skill.name)}
                      aria-pressed={lockedSkillName === skill.name}
                    />
                  ))}
                </div>
              </article>
            ))}
          </div>

          {/* mobile detail card */}
          <FocusCard
            activeSkill={activeSkill}
            projectTypeOrder={projectTypeOrder}
            compact
            isLocked={Boolean(lockedSkillName)}
            onUnlock={unlockSelection}
          />
        </div>
      </article>
    </section>
  );
}

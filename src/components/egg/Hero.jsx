"use client";

import { useEffect, useRef } from "react";
import SectionFrame from "@/components/frame/SectionFrame";
import Hint from "@/components/Hint";
import { homeContent } from "@/data/home";
import { usePlayed, useTextFx } from "@/lib/useTextFx";
import { EGG_PX } from "@/lib/egg/grid";
import EggCanvas from "./EggCanvas";
import styles from "./Hero.module.css";

export default function Hero({
  view,
  handlers,
  boxRef,
  clockRef,
  preRef,
  fxRef,
  announceRef,
  active,
  heroSel,
  rulesOpen,
  onSelectEgg,
  onMore,
  onRules,
  onStart,
  reduce,
  keysOn = true,
}) {
  // Hero stops: the heading (the section header: blinking cursor), then "more…" and
  // the egg's prompt (selected elements: inverted, no cursor).
  const headOn = active && heroSel === "head",
    moreOn = active && heroSel === "more",
    eggOn = active && heroSel === "egg",
    rulesOn = active && heroSel === "rules";
  const h1 = useRef(null),
    stageRef = useRef(null),
    rulesRef = useRef(null);
  const rulesUp = view.briefing || rulesOpen;
  // The rules card takes focus while it's up, so screen readers read the rules (and its
  // "any key" still works: keys go to the page's handler).
  useEffect(() => {
    if (rulesUp) rulesRef.current?.focus({ preventScroll: true, focusVisible: false });
  }, [rulesUp]);
  useTextFx(h1, homeContent.heading, "load", reduce);
  const headPlayed = usePlayed("load", homeContent.heading);

  // The ASCII frame is EGG_PX tall. When the hero is sized to the viewport, shrink
  // the frame to whatever height the stage has left instead of overflowing it.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fit = () =>
      stage.style.setProperty("--egg-scale", String(Math.min(1, stage.clientHeight / EGG_PX)));
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    fit();
    return () => ro.disconnect();
  }, []);

  // Focus moves: the "press start" box → (first round) the rules card → the heating
  // callouts under the pot (simmering… → start!), and "start!" turns into the button that
  // pulls the eggs out, in the same spot. The pot itself only pans.
  const startOverlay = view.stage === 0 && !view.briefing;
  // Stages with something to do after the start: pull the eggs (2), play again (5).
  const action = view.enter && view.stage > 0 && !view.briefing;
  // eslint-disable-next-line no-unused-vars
  const { onClick: _playOnClick, ...panHandlers } = handlers;

  return (
    <SectionFrame
      id="home"
      sec={0}
      title="~/danny"
      titleFx="none"
      right={
        <>
          <Hint>[j/k] move · </Hint>[↲] select
        </>
      }
      active={active}
      caret={false}
      className={styles.hero}
    >
      <div className={styles.intro}>
        <div className={styles.top}>
          <span className={styles.prompt}>{homeContent.prompt}</span>
          <h1
            ref={h1}
            className={headOn ? `${styles.h1} ${styles.caret}` : styles.h1}
            aria-label={homeContent.heading}
            data-fx={headPlayed ? undefined : "pending"}
          >
            {homeContent.heading}
          </h1>
          <div className={styles.seeking}>
            <span className={styles.dot}>●</span>
            <span className={styles.pretty}>{homeContent.seeking}</span>
          </div>
          <p className={styles.lead}>
            {homeContent.intro}{" "}
            <button
              type="button"
              onClick={onMore}
              className={moreOn ? `${styles.more} ${styles.moreOn}` : styles.more}
              aria-current={moreOn ? "true" : undefined}
              data-key="m"
              data-tip="about me"
            >
              <Hint className={styles.pressKey}>[m] </Hint>
              more…
            </button>
          </p>
        </div>
        <div className={styles.facts}>
          {homeContent.facts.map((f) => (
            <div key={f.key} className={styles.fact}>
              <span className={styles.factKey}>{f.key}</span>
              <span>
                {f.value}
                {f.org && <span className={styles.raw}>{f.org}</span>}
                {f.note && (
                  <>
                    <br />
                    {f.note}
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pointer-down anywhere in the egg frame selects its prompt (Enter then plays). */}
      <div ref={boxRef} className={styles.egg} onPointerDown={onSelectEgg}>
        <div className={styles.eggHead}>
          <div className={styles.eggTitleCol}>
            <span className={styles.eggTitleRow}>
              <span className={styles.eggTitle}>{view.title}</span>
            </span>
            <span className={styles.eggSub}>{view.sub}</span>
            <span ref={clockRef} className={styles.clock} aria-live="off" />
          </div>
          {view.stats && (
            <div className={styles.stats}>
              <span className={styles.statsHead}>{view.stats.head}</span>
              {view.stats.rows.map((r) => (
                <div key={r.name} className={styles.statRow}>
                  <span>{r.name}</span>
                  <span className={styles.bar}>{r.bar}</span>
                  <span className={styles.statN}>{r.n}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div ref={stageRef} className={styles.stage}>
          <div className={styles.fit}>
            <div className={styles.scaled}>
              <EggCanvas
                preRef={preRef}
                fxRef={fxRef}
                handlers={panHandlers}
                label={"ascii egg minigame: " + view.title}
              />
            </div>
          </div>
          {/* Overlays over the pot (pointer-events: none, so drags still reach it). */}
          {startOverlay && (
            <div className={styles.overlay}>
              <button
                type="button"
                className={
                  eggOn
                    ? `${styles.box} ${styles.pressStart} ${styles.pressStartOn}`
                    : `${styles.box} ${styles.pressStart}`
                }
                data-egg=""
                onClick={onStart}
                onFocus={onSelectEgg}
              >
                click or <span className={styles.pressKey}>[↲]</span> to start
              </button>
            </div>
          )}
          {rulesUp && (
            <div className={styles.overlay}>
              <div
                ref={rulesRef}
                tabIndex={-1}
                data-clickable=""
                className={styles.rules}
                role="dialog"
                aria-label="how to play"
                onClick={view.briefing ? onStart : onRules}
              >
                <span className={styles.rulesLabel}>┤ how to play ├</span>
                {view.rules.map((r, i) => (
                  <div key={i} className={styles.rule}>
                    <span className={styles.ruleN}>{i + 1}</span>
                    <span>{r}</span>
                  </div>
                ))}
                <div className={styles.rulesGo}>
                  {view.briefing ? (
                    keysOn ? (
                      "click or press any key to proceed"
                    ) : (
                      "click or press enter to proceed"
                    )
                  ) : (
                    <>
                      <Hint className={styles.pressKey}>[i]</Hint>
                      <Hint> or</Hint> click · close
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          {view.rulesSeen && !view.briefing && (
            <button
              type="button"
              onClick={onRules}
              data-key="i"
              className={rulesOn ? `${styles.rulesChip} ${styles.rulesChipOn}` : styles.rulesChip}
              aria-current={rulesOn ? "true" : undefined}
              aria-expanded={!!rulesOpen}
              data-tip="how to play"
            >
              <Hint>[i] </Hint>rules
            </button>
          )}
          {/* Under the pot, so the water stays in view: the heating callouts, then the
              button that plays the stage (click, or Enter/Space with the egg selected). */}
          <div className={`${styles.overlay} ${styles.low}`}>
            <span
              ref={announceRef}
              className={`${styles.box} ${styles.announce}`}
              data-show="false"
              aria-live="polite"
            />
            {action && (
              <button
                key={view.stage}
                type="button"
                data-egg=""
                onClick={onStart}
                className={
                  eggOn
                    ? `${styles.box} ${styles.act} ${styles.actOn}`
                    : `${styles.box} ${styles.act}`
                }
                aria-current={eggOn ? "true" : undefined}
              >
                {view.prompt} <span className={styles.pressKey}>[↲]</span>
              </button>
            )}
          </div>
        </div>
        <div className={styles.eggFoot}>
          <span>↔ drag to reposition</span>
        </div>
      </div>
    </SectionFrame>
  );
}

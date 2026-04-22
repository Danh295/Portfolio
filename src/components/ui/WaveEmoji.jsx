"use client";
import { useRef } from "react";
import styles from "./WaveEmoji.module.css";

export default function WaveEmoji() {
  const emojiRef = useRef(null);

  const restart = () => {
    const el = emojiRef.current;
    if (!el) return;
    el.classList.remove(styles.wave);
    void el.offsetWidth;
    el.classList.add(styles.wave);
  };

  return (
    <span onMouseEnter={restart} role="img" aria-label="Waving hand">
      <span ref={emojiRef} className={`${styles.waveEmoji} ${styles.wave}`}>
        👋
      </span>
    </span>
  );
}

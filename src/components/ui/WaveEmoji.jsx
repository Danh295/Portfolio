"use client";
import { useState } from 'react';
import styles from './WaveEmoji.module.css'; 

export default function WaveEmoji() {
  const [animationKey, setAnimationKey] = useState(0);

  return (
    <span
      onMouseEnter={() => setAnimationKey((value) => value + 1)}
      role="img"
      aria-label="Waving hand"
    >
      <span key={animationKey} className={`${styles.waveEmoji} ${styles.wave}`}>
        👋
      </span>
    </span>
  );
}

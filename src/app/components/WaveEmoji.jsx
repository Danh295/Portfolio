"use client"; 
import React, { useState, useEffect } from 'react';
import styles from './WaveEmoji.module.css'; 

export default function WaveEmoji() {
  const [isWaving, setIsWaving] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // start on hover
  useEffect(() => {
    if (isHovered) {
      setIsWaving(true);
    }
  }, [isHovered]);

  // reset
  useEffect(() => {
    if (isWaving) {
      const timeout = setTimeout(() => {
        setIsWaving(false);
      }, 1750); // match duration of animation

      return () => clearTimeout(timeout); 
    }
  }, [isWaving]);

  return (
    <span
      className={`${styles.waveEmoji} ${isWaving ? styles.wave : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)} 
      role="img"
      aria-label="Waving hand"
    >
      👋
    </span>
  );
}
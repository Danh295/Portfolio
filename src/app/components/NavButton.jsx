import React from 'react';
import styles from './NavButton.module.css';

export default function NavButton({ label, onClick, isActive }) {
  return (
    <button 
        className={`${styles.button} ${isActive? styles.active : styles.inactive}`} 
        onClick={onClick}
    >
        {label}
    </button>
  )
}

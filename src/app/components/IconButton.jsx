"use client"
import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub, faLinkedinIn} from '@fortawesome/free-brands-svg-icons';
import { faEnvelope, faFileArrowDown } from "@fortawesome/free-solid-svg-icons";

import style from './IconButton.module.css';

export default function IconButton({ icon, label, href, onClick }) {

  // Determine icon to render    
  const getIcon = () => {
    switch (icon) {
      case "github":
        return <FontAwesomeIcon icon={faGithub} />;
      case "linkedin":
        return <FontAwesomeIcon icon={faLinkedinIn} />;
      case "email":
        return <FontAwesomeIcon icon={faEnvelope} />;
      case "resume":
        return <FontAwesomeIcon icon={faFileArrowDown} />;
      default:
        return null;
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    if (href) {
      window.open(href, '_blank');
    }
  };

  return (
    <button className={style.iconButton} onClick={handleClick}>
      <span className={style.icon}>{getIcon()}</span>
    </button>
  )
}

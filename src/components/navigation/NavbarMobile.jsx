"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBriefcase,
  faCode,
  faFolderOpen,
  faHouse,
} from "@fortawesome/free-solid-svg-icons";
import { navigationItems } from "@/config/navigation";

import styles from "./NavbarMobile.module.css";

const iconForSection = {
  home: faHouse,
  projects: faFolderOpen,
  experience: faBriefcase,
  skills: faCode,
};

export default function NavbarMobile() {
  const [activeSection, setActiveSection] = useState("home");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const ids = ["home", "projects", "experience", "skills"];
    const observers = [];

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id);
          }
        },
        { rootMargin: "-50% 0px -50% 0px" },
      );

      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <div className={styles.wrapper}>
      <div className={styles.menuCluster}>
        <button
          type="button"
          className={`${styles.menuButton} ${isOpen ? styles.menuButtonOpen : ""}`}
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls="mobile-site-menu"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          <span className={styles.menuTooltip}>{isOpen ? "Close menu" : "Open menu"}</span>
          <span className={styles.menuBars} aria-hidden="true">
            <span className={styles.bar} />
            <span className={styles.bar} />
            <span className={styles.bar} />
          </span>
        </button>

        <nav
          id="mobile-site-menu"
          className={`${styles.dropdown} ${isOpen ? styles.dropdownOpen : ""}`}
          aria-label="Mobile navigation"
          aria-hidden={!isOpen}
        >
          {navigationItems.map((item, index) => {
            const isActive = activeSection === item.id;

            return (
              <a
                href={item.id === "home" ? "#" : `/#${item.id}`}
                key={item.id}
                className={`${styles.navIconButton} ${isActive ? styles.active : ""}`}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.name}
                onClick={(e) => {
                  setIsOpen(false);
                  if (item.id === "home") {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                style={{ transitionDelay: isOpen ? `${index * 40}ms` : "0ms" }}
              >
                <FontAwesomeIcon icon={iconForSection[item.id]} className={styles.icon} />
                <span className={styles.tooltip}>{item.name}</span>
              </a>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

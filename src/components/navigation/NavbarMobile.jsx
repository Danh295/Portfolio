"use client";

import { useEffect, useRef, useState } from "react";
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
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const menuButtonRef = useRef(null);
  const itemRefs = useRef([]);

  useEffect(() => {
    const observers = [];

    navigationItems.forEach((item) => {
      const el = document.getElementById(item.id);
      if (!el) return;

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(item.id);
          }
        },
        { rootMargin: "-50% 0px -50% 0px" },
      );

      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const firstItem = itemRefs.current.find(Boolean);
    firstItem?.focus();

    const focusables = () => [menuButtonRef.current, ...itemRefs.current].filter(Boolean);

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        menuButtonRef.current?.focus();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const nodes = focusables();
      if (nodes.length === 0) {
        return;
      }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.menuCluster}>
        <button
          ref={menuButtonRef}
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
          inert={!isOpen}
        >
          {navigationItems.map((item, index) => {
            const isActive = activeSection === item.id;

            return (
              <a
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
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

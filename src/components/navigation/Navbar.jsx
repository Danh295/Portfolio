"use client";

import { useEffect, useState } from "react";
import IconButton from "@/components/ui/IconButton";
import NavButton from "./NavButton";
import { navigationItems } from "@/config/navigation";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const [activeSection, setActiveSection] = useState("home");
  const [scrolled, setScrolled] = useState(false);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const heroSocial = document.querySelector("[data-hero-social]");
    if (!heroSocial) return;

    const obs = new IntersectionObserver(
      ([entry]) => setShowActions(!entry.isIntersecting),
      { threshold: 0 },
    );
    obs.observe(heroSocial);
    return () => obs.disconnect();
  }, []);

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
            window.history.replaceState(null, "", `/#${id}`);
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
    <nav className={`${styles.navbar} ${scrolled ? styles.navbarCompact : ""}`}>
      <div className={styles.sideSlot} aria-hidden="true" />

      <div className={styles.links}>
        {navigationItems.map((item) => (
          <NavButton
            key={item.id}
            label={item.name}
            href={`/#${item.id}`}
            isActive={activeSection === item.id}
          />
        ))}
      </div>

      <div className={`${styles.actions} ${scrolled ? styles.actionsVisible : styles.actionsHidden}`}>
        <IconButton compact icon="email" label="Email Danny Hu" href="mailto:hudanny295@gmail.com" />
        <IconButton compact icon="github" label="GitHub" href="https://github.com/Danh295" />
        <IconButton compact icon="linkedin" label="LinkedIn" href="https://www.linkedin.com/in/danny-hu-395380225/" />
        <IconButton compact icon="resume" label="Open resume" href="/Danny_s_Resume.pdf" />
      </div>
    </nav>
  );
}

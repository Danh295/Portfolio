"use client";

import { useEffect, useState } from "react";
import { site } from "@/config/site";
import { copyText } from "@/lib/copyText";
import styles from "./Contact.module.css";

/**
 * The email address as plain, selectable text with a copy button, in the page's footer: the
 * bottom bar's `email ↗` link only opens a mail app (and the address was only in its tooltip,
 * which a phone never shows). `note` is the copy button's feedback for a moment.
 */
export default function Contact() {
  // `n` counts copies, so a second copy while the note shows restarts the timer and the live
  // region re-announces (a note that stays "copied" would change nothing).
  const [{ note, n }, setState] = useState({ note: null, n: 0 });

  useEffect(() => {
    if (!n) return;
    const t = setTimeout(() => setState((s) => ({ ...s, note: null })), 2000);
    return () => clearTimeout(t);
  }, [n]);

  return (
    <span className={styles.contact}>
      <span>contact </span>
      <a href={`mailto:${site.email}`} className={styles.address} data-contact-address="">
        {site.email}
      </a>
      <button
        type="button"
        className={styles.copy}
        data-contact-copy=""
        onClick={async () => {
          const ok = await copyText(site.email, navigator);
          setState((s) => ({ note: ok ? "copied" : "failed", n: s.n + 1 }));
        }}
      >
        {note === "copied" ? "copied" : note === "failed" ? "copy failed: select it" : "copy"}
      </button>
      <span className="sr-only" role="status">
        {note === "copied" ? "email address copied" : note === "failed" ? "copy failed" : ""}
        {/* a zero-width mark that flips each copy, so a repeat reads out again */}
        {note && n % 2 ? "\u200b" : ""}
      </span>
    </span>
  );
}

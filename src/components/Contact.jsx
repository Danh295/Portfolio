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
  const [note, setNote] = useState(null);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 2000);
    return () => clearTimeout(t);
  }, [note]);

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
        onClick={async () => setNote((await copyText(site.email, navigator)) ? "copied" : "failed")}
      >
        {note === "copied" ? "copied" : note === "failed" ? "copy failed: select it" : "copy"}
      </button>
      <span className="sr-only" role="status">
        {note === "copied" ? "email address copied" : note === "failed" ? "copy failed" : ""}
      </span>
    </span>
  );
}

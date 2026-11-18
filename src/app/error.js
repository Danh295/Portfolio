"use client";

import { useEffect } from "react";
import { site } from "@/config/site";
import styles from "./error.module.css";

// The route's error boundary (Next's error.js): a render error nothing closer caught lands here
// instead of a blank page, with the ways out that don't depend on the app running: home, the
// resume, an email. The pieces most likely to fail (the shell, the egg) have their own boundary
// (components/Isolate.js), so this is the last resort.
export default function RouteError({ error, retry }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className={styles.page}>
      <div className={styles.frame}>
        <span className={styles.label}>┤ ~/error ├</span>
        <p className={styles.line}>
          <span className={styles.dim}>danny@portfolio ~ %</span> ./app
        </p>
        <p className={styles.err}>zsh: segmentation fault: this page broke while it was loading</p>
        <h1 className={styles.title}>something went wrong</h1>
        <ul className={styles.links}>
          {/* Plain links, not next/link: a full load starts the app from scratch. */}
          <li>
            <a href={`${site.basePath}/`}>cd ~</a>
            <span className={styles.dim}> the home page</span>
          </li>
          <li>
            <a href={site.resume}>resume</a>
            <span className={styles.dim}> the resume, as a page</span>
          </li>
          <li>
            <a href={`mailto:${site.email}`}>contact</a>
            <span className={styles.dim}> {site.email}</span>
          </li>
        </ul>
        <button type="button" className={styles.retry} onClick={() => retry()}>
          try again
        </button>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SpinningEgg from "./SpinningEgg";
import styles from "./NotFound.module.css";

const noopSubscribe = () => () => {};

/** The 404 page: a failed `cd` in the site's shell voice, over a turning pot. */
export default function NotFound() {
  const router = useRouter();
  // The exported 404.html is served for every unknown URL, so the path can only come
  // from the browser; "" on the server and during hydration.
  const path = useSyncExternalStore(
    noopSubscribe,
    () => window.location.pathname,
    () => "",
  );

  // Enter goes home, like the [↲] hint says (a focused link handles its own Enter).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Enter" || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof Element && e.target.closest("a, button")) return;
      router.push("/");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <main className={styles.page}>
      <div className={styles.frame}>
        <span className={styles.label}>┤ ~/404 ├</span>
        <p className={styles.line}>
          <span className={styles.dim}>danny@portfolio ~ %</span> cd {path}
        </p>
        <p className={styles.err}>zsh: no such file or directory: {path}</p>
        <SpinningEgg />
        <h1 className={styles.title}>404 · this egg rolled away</h1>
        <Link href="/" className={styles.home}>
          <span className={styles.dim}>[↲]</span> cd ~
        </Link>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { site } from "@/config/site";
import styles from "./LatestGithubProject.module.css";

const STORAGE_KEY = "latest-github-project";
const GITHUB_API_URL = `https://api.github.com/users/${site.github.username}/repos?sort=created&per_page=1&type=owner`;
const HARDCODED_FALLBACK_REPO = {
  name: "Portfolio",
  description:
    "Personal portfolio site showcasing projects, experience, and current work across software development and ML.",
  language: "Next.js",
  html_url: `${site.github.profile}/Portfolio`,
  created_at: "2025-01-01T00:00:00.000Z",
  fetchedAt: null,
};

function formatDate(dateString) {
  if (!dateString) {
    return "Recently updated";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

function readCachedRepo() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const cached = window.localStorage.getItem(STORAGE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

function writeCachedRepo(repo) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(repo));
  } catch {
    // Ignore storage failures and keep rendering the fetched repo.
  }
}

export default function LatestGithubProject() {
  const [repo, setRepo] = useState(HARDCODED_FALLBACK_REPO);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLatestRepo() {
      const cachedRepo = readCachedRepo();
      if (cachedRepo) {
        setRepo(cachedRepo);
      }

      try {
        const response = await fetch(GITHUB_API_URL, { signal: controller.signal });

        if (!response.ok) {
          throw new Error("Failed to load latest repository");
        }

        const repos = await response.json();
        if (!repos[0]) {
          return;
        }

        const latestRepo = { ...repos[0], fetchedAt: new Date().toISOString() };
        setRepo(latestRepo);
        writeCachedRepo(latestRepo);
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }
      }
    }

    loadLatestRepo();

    return () => controller.abort();
  }, []);

  return (
    <article className={styles.card}>
      <div className={styles.copy}>
        <span className={styles.label}>Latest on GitHub</span>
        <h2 className={styles.title}>{repo.name}</h2>
        <p className={styles.description}>
          {repo.description || "Newest public repository from my GitHub profile."}
        </p>

        <div className={styles.meta}>
          {repo.language ? <span className={styles.chip}>{repo.language}</span> : null}
          <span className={styles.updated}>Created {formatDate(repo.created_at)}</span>
        </div>

        <a
          href={repo.html_url}
          className={styles.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>Open repository</span>
          <FontAwesomeIcon icon={faArrowUpRightFromSquare} className={styles.linkIcon} />
        </a>
      </div>
    </article>
  );
}

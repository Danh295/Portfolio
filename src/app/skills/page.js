"use client";

import { useEffect } from "react";
import { site } from "@/config/site";

const TARGET = `${site.basePath}/#skills`;

export default function SkillsRedirect() {
  useEffect(() => {
    window.location.replace(TARGET);
  }, []);

  return (
    <>
      <meta httpEquiv="refresh" content={`0;url=${TARGET}`} />
      <p style={{ padding: "2rem", textAlign: "center" }}>
        Redirecting to <a href={TARGET}>{TARGET}</a>…
      </p>
    </>
  );
}

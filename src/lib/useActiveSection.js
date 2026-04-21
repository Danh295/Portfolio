"use client";

import { useEffect, useState } from "react";

export function useActiveSection(ids) {
  const [activeId, setActiveId] = useState(ids[0] ?? null);
  const idsKey = ids.join("|");

  useEffect(() => {
    const observers = [];

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveId(id);
          }
        },
        { rootMargin: "-50% 0px -50% 0px" },
      );

      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return activeId;
}

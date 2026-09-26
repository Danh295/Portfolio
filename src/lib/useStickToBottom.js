"use client";

import { useEffect, useRef } from "react";

/**
 * Keep a shell's output pinned to its bottom (the latest prompt):
 * - on first render, and when the content or pane resizes, unless the user scrolled up;
 * - always when `output` changes (a command ran), like a real terminal.
 * `bodyRef` is the scroll container, `contentRef` wraps everything inside it.
 * `remountKey` re-attaches after the pane is swapped out (e.g. vim closing).
 */
export function useStickToBottom(bodyRef, contentRef, output, remountKey) {
  const pinned = useRef(true);

  useEffect(() => {
    const body = bodyRef.current,
      content = contentRef.current;
    if (!body || !content) return;
    pinned.current = true;
    const onScroll = () => {
      pinned.current = body.scrollHeight - body.scrollTop - body.clientHeight < 32;
    };
    const stick = () => {
      if (pinned.current) body.scrollTop = body.scrollHeight;
    };
    const ro = new ResizeObserver(stick);
    ro.observe(body);
    ro.observe(content);
    body.addEventListener("scroll", onScroll, { passive: true });
    stick();
    return () => {
      ro.disconnect();
      body.removeEventListener("scroll", onScroll);
    };
  }, [bodyRef, contentRef, remountKey]);

  // New output always brings the prompt back into view.
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    pinned.current = true;
    body.scrollTop = body.scrollHeight;
  }, [bodyRef, output]);
}

import { useEffect, useRef } from "react";

/** Runs `fn(prev)` after a render in which `value` changed (not on mount). */
export function useOnChange(value, fn) {
  const prev = useRef(value);
  useEffect(() => {
    if (Object.is(prev.current, value)) return;
    const p = prev.current;
    prev.current = value;
    fn(p);
  });
}

import { useEffect, useState } from "react";

// Phones and tablets (< 992px, antd's `lg`) get card layouts instead of tables.
export const COMPACT_BREAKPOINT = 992;

export const useIsCompact = () => {
  const [isCompact, setIsCompact] = useState(window.innerWidth < COMPACT_BREAKPOINT);
  useEffect(() => {
    const handler = () => setIsCompact(window.innerWidth < COMPACT_BREAKPOINT);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isCompact;
};

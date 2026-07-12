"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";

export default function LoadingBar() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevPath = useRef(pathname);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(() => {
    setVisible(true);
    setProgress(15);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setProgress(55), 200);
  }, []);

  const done = useCallback(() => {
    setProgress(100);
    setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 300);
  }, []);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
      start();
      const timeout = setTimeout(done, 500);
      return () => clearTimeout(timeout);
    }
  }, [pathname, start, done]);

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[2px] pointer-events-none">
      <div
        className={`h-full transition-all duration-[400ms] ease-out ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className="h-full bg-white transition-all duration-[400ms] ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

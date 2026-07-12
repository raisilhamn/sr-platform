"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export default function LoadingBar() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      setLoading(true);
      prevPath.current = pathname;
      const timeout = setTimeout(() => setLoading(false), 400);
      return () => clearTimeout(timeout);
    }
  }, [pathname]);

  useEffect(() => {
    function handleStart() { setLoading(true); }
    function handleEnd() { setTimeout(() => setLoading(false), 200); }

    window.addEventListener("beforeunload", handleStart);
    return () => window.removeEventListener("beforeunload", handleStart);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[3px] pointer-events-none">
      <div
        className={`h-full w-full transition-opacity duration-300 ${
          loading ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="h-full w-full bg-gradient-to-r from-transparent via-green-400 to-transparent animate-loading-bar" />
      </div>
    </div>
  );
}

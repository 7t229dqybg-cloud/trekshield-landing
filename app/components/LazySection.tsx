"use client";

import React, { useEffect, useRef, useState } from "react";

interface LazySectionProps {
  children: React.ReactNode;
  className?: string;
  threshold?: number;
  rootMargin?: string;
}

export default function LazySection({
  children,
  className = "",
  threshold = 0.05,
  rootMargin = "0px 0px -50px 0px",
}: LazySectionProps) {
  const [isIntersected, setIsIntersected] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If the browser doesn't support IntersectionObserver, render normally immediately
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      const timer = setTimeout(() => setIsIntersected(true), 0);
      return () => clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersected(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return (
    <div
      ref={elementRef}
      className={`
        transition-all duration-1000 ease-out transform
        ${isIntersected ? "opacity-100 translate-y-0 filter-none" : "opacity-0 translate-y-8 filter blur-[2px]"}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

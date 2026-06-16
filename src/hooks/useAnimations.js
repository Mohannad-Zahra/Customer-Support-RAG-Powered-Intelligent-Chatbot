import { useState, useEffect, useRef } from 'react';

// Animated count-up hook
export function useCountUp(target, duration = 1200, decimals = 0) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (target === null || target === undefined) return;
    const start = performance.now();
    const run = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = eased * target;
      setValue(parseFloat(current.toFixed(decimals)));
      if (progress < 1) rafRef.current = requestAnimationFrame(run);
    };
    rafRef.current = requestAnimationFrame(run);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, decimals]);

  return value;
}

// Intersection observer hook for enter animations
export function useInView(threshold = 0.1) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, inView];
}

// Live clock hook
export function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// Format helpers
export function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateTime(isoString) {
  const d = new Date(isoString);
  return `${formatDate(isoString)} ${formatTime(isoString)}`;
}

export function formatMs(ms) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms}ms`;
}

export function formatPct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface ZoomableVideoProps {
  children: ReactNode;
}

export function ZoomableVideo({ children }: ZoomableVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef(0);

  const clampTranslate = useCallback(
    (x: number, y: number, s: number) => {
      if (s <= 1) return { x: 0, y: 0 };
      const container = containerRef.current;
      if (!container) return { x, y };
      const { clientWidth: w, clientHeight: h } = container;
      const maxX = ((s - 1) * w) / 2;
      const maxY = ((s - 1) * h) / 2;
      return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y)),
      };
    },
    [],
  );

  // Scroll to zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.2 : 0.2;
      setScale((prev) => {
        const next = Math.max(1, Math.min(5, prev + delta));
        if (next <= 1) setTranslate({ x: 0, y: 0 });
        else
          setTranslate((t) => clampTranslate(t.x, t.y, next));
        return next;
      });
    },
    [clampTranslate],
  );

  // Mouse drag to pan
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (scale <= 1) return;
      isDragging.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
    },
    [scale],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current || scale <= 1) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      setTranslate((prev) => clampTranslate(prev.x + dx, prev.y + dy, scale));
    },
    [scale, clampTranslate],
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Touch pinch to zoom + drag to pan
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
      } else if (e.touches.length === 1 && scale > 1) {
        isDragging.current = true;
        lastPos.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    },
    [scale],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const delta = (dist - lastPinchDist.current) * 0.01;
        lastPinchDist.current = dist;
        setScale((prev) => {
          const next = Math.max(1, Math.min(5, prev + delta));
          if (next <= 1) setTranslate({ x: 0, y: 0 });
          else setTranslate((t) => clampTranslate(t.x, t.y, next));
          return next;
        });
      } else if (e.touches.length === 1 && isDragging.current && scale > 1) {
        const dx = e.touches[0].clientX - lastPos.current.x;
        const dy = e.touches[0].clientY - lastPos.current.y;
        lastPos.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        setTranslate((prev) =>
          clampTranslate(prev.x + dx, prev.y + dy, scale),
        );
      }
    },
    [scale, clampTranslate],
  );

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    lastPinchDist.current = 0;
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  // Attach wheel listener with passive: false
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="overflow-hidden"
        style={{ cursor: scale > 1 ? "grab" : "default" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: isDragging.current ? "none" : "transform 0.15s ease-out",
          }}
        >
          {children}
        </div>
      </div>
      {scale > 1 && (
        <button
          onClick={resetZoom}
          className="absolute left-2 top-2 z-10 rounded bg-black/60 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-black/80"
        >
          {scale.toFixed(1)}x — Reset
        </button>
      )}
      {scale <= 1 && (
        <div className="absolute right-2 top-2 z-10 rounded-md bg-primary/80 px-2 py-1">
          <span className="text-[11px] font-medium text-primary-foreground">
            Ctrl+Scroll to zoom
          </span>
        </div>
      )}
    </div>
  );
}

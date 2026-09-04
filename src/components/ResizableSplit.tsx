import { useCallback, useRef, useState, type ReactNode } from "react";

export function ResizableSplit({ left, right }: { left: ReactNode; right: ReactNode }) {
  const [leftPercent, setLeftPercent] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    setLeftPercent(Math.min(75, Math.max(25, percent)));
  }, []);

  const stopDragging = useCallback(() => {
    dragging.current = false;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopDragging);
  }, [onPointerMove]);

  const startDragging = useCallback(() => {
    dragging.current = true;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging);
  }, [onPointerMove, stopDragging]);

  return (
    <div className="resizable-split" ref={containerRef}>
      <div style={{ width: `${leftPercent}%` }}>{left}</div>
      <div className="split-handle" onPointerDown={startDragging} />
      <div style={{ width: `${100 - leftPercent}%` }}>{right}</div>
    </div>
  );
}

import { useEffect, useRef, useState, type ReactNode } from "react";

export function ResizableSplit({ left, right }: { left: ReactNode; right: ReactNode }) {
  const [leftPercent, setLeftPercent] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // Listeners stay attached for the component's whole lifetime (gated by the `dragging` ref)
  // rather than being added/removed per drag — avoids stopDragging needing to reference its own
  // still-initializing `const` to unregister itself, and is simpler besides.
  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPercent(Math.min(75, Math.max(25, percent)));
    }
    function onPointerUp() {
      dragging.current = false;
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  return (
    <div className="resizable-split" ref={containerRef}>
      <div style={{ width: `${leftPercent}%` }}>{left}</div>
      <div className="split-handle" onPointerDown={() => (dragging.current = true)} />
      <div style={{ width: `${100 - leftPercent}%` }}>{right}</div>
    </div>
  );
}

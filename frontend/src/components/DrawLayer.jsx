import { useRef, useState } from "react";

// Transparent input layer over the image. When a draw tool is active it captures
// pointer drags and emits finished shapes (in 0-100 normalized coords) to the
// parent. Renders only the in-progress "draft" shape; committed shapes are drawn
// by an AnnotationLayer underneath.

const clamp = (v) => Math.max(0, Math.min(100, v));
const pct = (v, span) => (v / 100) * span;

const MIN_BOX = 1.5; // ignore accidental tiny drags
const MIN_RADIUS = 1.5;
const FREE_MIN_STEP = 0.6; // min distance between freehand points (in %)

export default function DrawLayer({ tool, color, box, onCommit }) {
  const ref = useRef(null);
  const startRef = useRef(null);
  const draftRef = useRef(null); // source of truth, immune to render timing
  const [draft, setDraft] = useState(null); // mirror for rendering
  const active = tool && tool !== "pointer";
  const { w, h } = box;

  function commitDraft(next) {
    draftRef.current = next;
    setDraft(next);
  }

  function toPct(e) {
    const r = ref.current.getBoundingClientRect();
    return {
      x: clamp(((e.clientX - r.left) / r.width) * 100),
      y: clamp(((e.clientY - r.top) / r.height) * 100),
    };
  }

  function handleDown(e) {
    if (!active) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // no active pointer (e.g. synthetic events) — safe to ignore
    }
    const p = toPct(e);
    startRef.current = p;
    if (tool === "free") commitDraft({ type: "line", color, points: [[p.x, p.y]] });
    else if (tool === "box") commitDraft({ type: "rect", color, x: p.x, y: p.y, w: 0, h: 0 });
    else if (tool === "circle") commitDraft({ type: "circle", color, cx: p.x, cy: p.y, r: 0 });
  }

  function handleMove(e) {
    if (!active || !startRef.current) return;
    const p = toPct(e);
    const s = startRef.current;

    if (tool === "free") {
      const pts = draftRef.current.points;
      const last = pts[pts.length - 1];
      if (Math.hypot(p.x - last[0], p.y - last[1]) < FREE_MIN_STEP) return;
      commitDraft({ ...draftRef.current, points: [...pts, [p.x, p.y]] });
    } else if (tool === "box") {
      commitDraft({
        type: "rect",
        color,
        x: Math.min(s.x, p.x),
        y: Math.min(s.y, p.y),
        w: Math.abs(p.x - s.x),
        h: Math.abs(p.y - s.y),
      });
    } else if (tool === "circle") {
      // radius from center drag, expressed as % of the min image dimension
      const rPx = Math.hypot(pct(p.x - s.x, w), pct(p.y - s.y, h));
      const r = (rPx / Math.min(w, h)) * 100;
      commitDraft({ type: "circle", color, cx: s.x, cy: s.y, r });
    }
  }

  function handleUp() {
    startRef.current = null;
    const d = draftRef.current;
    commitDraft(null);
    if (!d) return;
    if (d.type === "rect" && (d.w < MIN_BOX || d.h < MIN_BOX)) return;
    if (d.type === "circle" && d.r < MIN_RADIUS) return;
    if (d.type === "line" && d.points.length < 2) return;
    onCommit(d);
  }

  if (!w || !h) return null;
  const stroke = Math.max(2, Math.hypot(w, h) * 0.004);

  return (
    <svg
      ref={ref}
      className={`draw-layer ${active ? "is-active" : ""}`}
      width={w}
      height={h}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
    >
      {draft?.type === "rect" && (
        <rect
          x={pct(draft.x, w)}
          y={pct(draft.y, h)}
          width={pct(draft.w, w)}
          height={pct(draft.h, h)}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray="6 5"
        />
      )}
      {draft?.type === "circle" && (
        <circle
          cx={pct(draft.cx, w)}
          cy={pct(draft.cy, h)}
          r={pct(draft.r, Math.min(w, h))}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray="6 5"
        />
      )}
      {draft?.type === "line" && (
        <polyline
          points={draft.points.map(([px, py]) => `${pct(px, w)},${pct(py, h)}`).join(" ")}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

// Renders annotation primitives (percent coords, 0-100) as an SVG overlay.
// `box` is the rendered image size in pixels.

const pct = (v, span) => (v / 100) * span;

function arrowHead(x1, y1, x2, y2, size) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const a = angle - Math.PI / 7;
  const b = angle + Math.PI / 7;
  return [
    [x2, y2],
    [x2 - size * Math.cos(a), y2 - size * Math.sin(a)],
    [x2 - size * Math.cos(b), y2 - size * Math.sin(b)],
  ]
    .map((p) => p.join(","))
    .join(" ");
}

function Label({ x, y, text, color }) {
  if (!text) return null;
  return (
    <text x={x} y={y} className="ann-label" fill="#fff" stroke="rgba(0,0,0,0.55)" strokeWidth="3"
      paintOrder="stroke" style={{ "--c": color }}>
      {text}
    </text>
  );
}

export default function AnnotationLayer({ annotations, box, dashed = false }) {
  const { w, h } = box;
  if (!w || !h || annotations.length === 0) return null;

  const minDim = Math.min(w, h);
  const stroke = Math.max(2, Math.hypot(w, h) * 0.004);
  const fontSize = Math.max(12, minDim * 0.035);

  return (
    <svg
      className={`ann-svg ${dashed ? "ann-svg-dashed" : ""}`}
      width={w}
      height={h}
      style={{ "--fs": `${fontSize}px` }}
    >
      {annotations.map((a, i) => {
        const color = a.color || "#39ff14";
        const delay = `${i * 90}ms`;
        const common = { stroke: color, strokeWidth: stroke, fill: "none", style: { "--d": delay } };

        if (a.type === "circle") {
          const cx = pct(a.cx, w);
          const cy = pct(a.cy, h);
          const r = pct(a.r ?? 8, minDim);
          return (
            <g key={i} className="ann ann-pop" style={{ "--d": delay }}>
              <circle cx={cx} cy={cy} r={r} {...common} />
              <Label x={cx} y={cy - r - 6} text={a.label} color={color} />
            </g>
          );
        }

        if (a.type === "dot") {
          const cx = pct(a.cx, w);
          const cy = pct(a.cy, h);
          return (
            <g key={i} className="ann ann-pop" style={{ "--d": delay }}>
              <circle cx={cx} cy={cy} r={Math.max(4, minDim * 0.012)} fill={color} stroke="#fff" strokeWidth={stroke * 0.5} />
              <Label x={cx} y={cy - minDim * 0.03} text={a.label} color={color} />
            </g>
          );
        }

        if (a.type === "rect") {
          const x = pct(a.x, w);
          const y = pct(a.y, h);
          return (
            <g key={i} className="ann ann-pop" style={{ "--d": delay }}>
              <rect x={x} y={y} width={pct(a.w, w)} height={pct(a.h, h)} rx={stroke * 1.5} {...common} />
              <Label x={x + 4} y={y - 6} text={a.label} color={color} />
            </g>
          );
        }

        if (a.type === "arrow") {
          const x1 = pct(a.x1, w);
          const y1 = pct(a.y1, h);
          const x2 = pct(a.x2, w);
          const y2 = pct(a.y2, h);
          const head = Math.max(10, stroke * 4);
          return (
            <g key={i} className="ann ann-draw" style={{ "--d": delay }}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={stroke} strokeLinecap="round" />
              <polygon points={arrowHead(x1, y1, x2, y2, head)} fill={color} />
              <Label x={x2} y={y2 - head} text={a.label} color={color} />
            </g>
          );
        }

        if (a.type === "line") {
          const pts = a.points.map(([px, py]) => `${pct(px, w)},${pct(py, h)}`).join(" ");
          return (
            <g key={i} className="ann ann-draw" style={{ "--d": delay }}>
              <polyline points={pts} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        }

        if (a.type === "text") {
          return (
            <g key={i} className="ann ann-pop" style={{ "--d": delay }}>
              <Label x={pct(a.x, w)} y={pct(a.y, h)} text={a.text} color={color} />
            </g>
          );
        }

        return null;
      })}
    </svg>
  );
}

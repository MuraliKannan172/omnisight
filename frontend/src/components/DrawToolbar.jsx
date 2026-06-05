// Tool + color picker for drawing on the image to point things out.

const TOOLS = [
  { id: "pointer", label: "Move", icon: "✋", hint: "Pan / no drawing" },
  { id: "box", label: "Box", icon: "▭", hint: "Drag a bounding box" },
  { id: "circle", label: "Circle", icon: "◯", hint: "Click center, drag radius" },
  { id: "free", label: "Draw", icon: "✎", hint: "Freehand scribble" },
];

const COLORS = ["#39ff14", "#ffffff", "#22d3ee", "#ff4d6d", "#fbbf24"];

export default function DrawToolbar({
  tool,
  color,
  onTool,
  onColor,
  onUndo,
  onClear,
  count,
}) {
  return (
    <div className="draw-toolbar">
      <div className="draw-tools" role="group" aria-label="Drawing tools">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            title={t.hint}
            aria-pressed={tool === t.id}
            className={`tool-btn ${tool === t.id ? "tool-on" : ""}`}
            onClick={() => onTool(t.id)}
          >
            <span className="tool-icon" aria-hidden="true">
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="draw-colors" role="group" aria-label="Ink color">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            aria-label={`Ink ${c}`}
            aria-pressed={color === c}
            className={`swatch ${color === c ? "swatch-on" : ""}`}
            style={{ "--c": c }}
            onClick={() => onColor(c)}
          />
        ))}
      </div>

      <div className="draw-edit">
        <button type="button" className="chip" onClick={onUndo} disabled={!count}>
          Undo
        </button>
        <button type="button" className="chip" onClick={onClear} disabled={!count}>
          Clear{count ? ` (${count})` : ""}
        </button>
      </div>
    </div>
  );
}

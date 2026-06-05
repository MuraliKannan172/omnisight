import { useEffect, useRef, useState } from "react";
import AnnotationLayer from "./AnnotationLayer.jsx";
import DrawLayer from "./DrawLayer.jsx";
import DrawToolbar from "./DrawToolbar.jsx";

// Shows the image with the model's SVG annotations layered on top, plus an
// interactive layer where the user can draw boxes / circles / freehand marks to
// point things out. We measure the *rendered* image box so percent coordinates
// map to pixels and circles stay circular on any aspect ratio.
export default function ImageStage({
  image,
  annotations,
  userShapes,
  onAddShape,
  onUndoShape,
  onClearShapes,
  showGrid,
  hasGrid,
  onToggleGrid,
  onReset,
  busy,
}) {
  const frameRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [tool, setTool] = useState("pointer");
  const [color, setColor] = useState("#39ff14");

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [image]);

  return (
    <div className="stage">
      <div className="stage-toolbar">
        <span className="stage-count">
          {annotations.length} model mark{annotations.length === 1 ? "" : "s"}
          {userShapes.length > 0 && ` · ${userShapes.length} yours`}
        </span>
        <div className="stage-actions">
          {hasGrid && (
            <button
              type="button"
              className={`chip ${showGrid ? "chip-on" : ""}`}
              onClick={onToggleGrid}
            >
              {showGrid ? "Hide grid" : "Show grid"}
            </button>
          )}
          <button type="button" className="chip" onClick={onReset}>
            New image
          </button>
        </div>
      </div>

      <DrawToolbar
        tool={tool}
        color={color}
        onTool={setTool}
        onColor={setColor}
        onUndo={onUndoShape}
        onClear={onClearShapes}
        count={userShapes.length}
      />

      <div className="stage-frame-wrap">
        <div className="stage-frame" ref={frameRef}>
          <img className="stage-img" src={image} alt="Uploaded subject" draggable={false} />
          <AnnotationLayer annotations={annotations} box={box} />
          <AnnotationLayer annotations={userShapes} box={box} dashed />
          <DrawLayer tool={tool} color={color} box={box} onCommit={onAddShape} />
          {busy && (
            <div className="stage-scan" aria-hidden="true">
              <div className="scan-line" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

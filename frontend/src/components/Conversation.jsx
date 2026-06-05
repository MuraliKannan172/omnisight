// Scrollable list of question/answer turns with the model's reasoning.

import { useEffect, useRef } from "react";

const SWATCH_LIMIT = 6;

function AnnotationChips({ annotations }) {
  if (!annotations?.length) return null;
  const shown = annotations.slice(0, SWATCH_LIMIT);
  return (
    <div className="turn-chips">
      {shown.map((a, i) => (
        <span key={i} className="ann-chip" style={{ "--c": a.color || "#ff4d6d" }}>
          <span className="ann-dot" />
          {a.label || a.text || a.type}
        </span>
      ))}
      {annotations.length > SWATCH_LIMIT && (
        <span className="ann-chip ann-chip-more">+{annotations.length - SWATCH_LIMIT}</span>
      )}
    </div>
  );
}

export default function Conversation({ turns, error, busy, hasImage }) {
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length, busy, error]);

  if (!hasImage) {
    return (
      <div className="convo convo-empty">
        <p>Upload an image, then ask the model to reason about it visually.</p>
      </div>
    );
  }

  return (
    <div className="convo">
      <div className="convo-scroll">
        {turns.length === 0 && !busy && (
          <p className="convo-hint">Ask your first question below ↓</p>
        )}

        {turns.map((t, i) => (
          <div key={i} className="turn">
            <div className="turn-q">{t.question}</div>
            <div className="turn-a glass-inset">
              <p className="turn-answer">{t.answer || "(no answer)"}</p>
              <AnnotationChips annotations={t.annotations} />
            </div>
          </div>
        ))}

        {busy && (
          <div className="turn">
            <div className="turn-a glass-inset turn-thinking">
              <span className="dots">
                <i />
                <i />
                <i />
              </span>
              Sketching its reasoning…
            </div>
          </div>
        )}

        {error && <div className="turn-error">⚠ {error}</div>}
        <div ref={endRef} />
      </div>
    </div>
  );
}

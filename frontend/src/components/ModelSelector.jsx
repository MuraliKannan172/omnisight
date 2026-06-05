// Dropdown of Ollama models; vision-capable ones are tagged and prioritized.

function formatSize(bytes) {
  if (!bytes) return "cloud";
  const gb = bytes / 1e9;
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${Math.round(bytes / 1e6)} MB`;
}

export default function ModelSelector({ models, value, onChange, error, visionReady }) {
  const vision = models.filter((m) => m.supports_vision);
  const others = models.filter((m) => !m.supports_vision);

  if (error) {
    return <div className="model-error">⚠ {error}</div>;
  }

  return (
    <label className="model-selector">
      <span className="model-label">Model</span>
      <div className="model-field glass-inset">
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {vision.length > 0 && (
            <optgroup label="Vision (recommended)">
              {vision.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name} · {formatSize(m.size)}
                </option>
              ))}
            </optgroup>
          )}
          {others.length > 0 && (
            <optgroup label="Text-only (no image support)">
              {others.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name} · {formatSize(m.size)}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <span className="model-caret" aria-hidden="true">
          ▾
        </span>
      </div>
      {!visionReady && models.length > 0 && (
        <span className="model-warn">No vision model found — image input will fail.</span>
      )}
    </label>
  );
}

import { useRef, useState } from "react";

const MAX_BYTES = 12 * 1024 * 1024;

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

export default function UploadZone({ onImage }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState("");

  async function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setErr("Image must be under 12 MB.");
      return;
    }
    setErr("");
    onImage(await readAsDataUrl(file));
  }

  return (
    <div
      className={`upload-zone ${drag ? "is-drag" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
    >
      <div className="upload-orb" aria-hidden="true" />
      <h2 className="upload-title">Drop an image to begin</h2>
      <p className="upload-hint">
        The model overlays a coordinate grid, then sketches its reasoning —
        circles, arrows and labels — right on top.
      </p>
      <button type="button" className="btn-primary">
        Browse files
      </button>
      {err && <p className="upload-err">{err}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

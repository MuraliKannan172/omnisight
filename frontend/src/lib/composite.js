// Flatten the original image + the user's drawn shapes into a single PNG data
// URL. This is what gets sent to the vision model, so it literally "sees" the
// circles / boxes / freehand marks the user drew to point things out.
//
// Shapes use the same 0-100 normalized coordinate space as model annotations.

const STROKE_FACTOR = 0.004;

/**
 * @param {string} imageSrc - data URL of the original image
 * @param {Array<object>} shapes - user-drawn primitives (circle | rect | line)
 * @returns {Promise<string>} PNG data URL with shapes burned in
 */
export function compositeImage(imageSrc, shapes) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);

      const minDim = Math.min(w, h);
      const lineWidth = Math.max(2, Math.hypot(w, h) * STROKE_FACTOR);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      for (const s of shapes) {
        ctx.strokeStyle = s.color || "#39ff14";
        ctx.lineWidth = lineWidth;
        ctx.beginPath();

        if (s.type === "circle") {
          ctx.arc((s.cx / 100) * w, (s.cy / 100) * h, (s.r / 100) * minDim, 0, Math.PI * 2);
          ctx.stroke();
        } else if (s.type === "rect") {
          ctx.strokeRect((s.x / 100) * w, (s.y / 100) * h, (s.w / 100) * w, (s.h / 100) * h);
        } else if (s.type === "line" && Array.isArray(s.points)) {
          s.points.forEach(([px, py], i) => {
            const X = (px / 100) * w;
            const Y = (py / 100) * h;
            if (i === 0) ctx.moveTo(X, Y);
            else ctx.lineTo(X, Y);
          });
          ctx.stroke();
        }
      }

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Could not load image for compositing."));
    img.src = imageSrc;
  });
}

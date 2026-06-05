// Tiny fetch wrapper for the OmniSight backend.

async function asJson(resp) {
  let body = null;
  try {
    body = await resp.json();
  } catch {
    body = null;
  }
  if (!resp.ok) {
    const detail = body?.detail || `Request failed (${resp.status})`;
    throw new Error(detail);
  }
  return body;
}

export async function fetchModels() {
  const resp = await fetch("/api/models");
  const data = await asJson(resp);
  return data.models ?? [];
}

export async function runSketch({ model, question, image, history }) {
  const resp = await fetch("/api/sketch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, question, image, history }),
  });
  return asJson(resp);
}

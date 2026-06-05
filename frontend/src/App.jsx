import { useEffect, useMemo, useState } from "react";
import { fetchModels, runSketch } from "./api.js";
import { compositeImage } from "./lib/composite.js";
import ModelSelector from "./components/ModelSelector.jsx";
import UploadZone from "./components/UploadZone.jsx";
import ImageStage from "./components/ImageStage.jsx";
import Conversation from "./components/Conversation.jsx";
import QuestionBar from "./components/QuestionBar.jsx";
import "./styles/app.css";

export default function App() {
  const [models, setModels] = useState([]);
  const [model, setModel] = useState("");
  const [modelsError, setModelsError] = useState("");

  const [image, setImage] = useState(null); // original data URL
  const [annotations, setAnnotations] = useState([]);
  const [userShapes, setUserShapes] = useState([]); // marks the user drew
  const [turns, setTurns] = useState([]); // { question, answer, annotations }
  const [history, setHistory] = useState([]); // backend text history

  const [showGrid, setShowGrid] = useState(false);
  const [griddedImage, setGriddedImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchModels()
      .then((list) => {
        setModels(list);
        const firstVision = list.find((m) => m.supports_vision);
        setModel(firstVision?.name ?? list[0]?.name ?? "");
      })
      .catch((e) => setModelsError(e.message));
  }, []);

  const visionReady = useMemo(
    () => models.some((m) => m.supports_vision),
    [models]
  );

  function resetConversation(nextImage) {
    setImage(nextImage);
    setAnnotations([]);
    setUserShapes([]);
    setTurns([]);
    setHistory([]);
    setGriddedImage(null);
    setError("");
  }

  async function ask(question) {
    if (!image || !model || busy) return;
    setBusy(true);
    setError("");
    try {
      // Burn the user's drawings into the image so the model sees what they marked.
      const sent =
        userShapes.length > 0 ? await compositeImage(image, userShapes) : image;
      const res = await runSketch({ model, question, image: sent, history });
      setAnnotations(res.annotations ?? []);
      setGriddedImage(res.gridded_image ?? null);
      setTurns((prev) => [
        ...prev,
        { question, answer: res.answer, annotations: res.annotations ?? [] },
      ]);
      setHistory((prev) => [
        ...prev,
        { role: "user", content: question },
        { role: "assistant", content: res.raw ?? res.answer ?? "" },
      ]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell">
      <header className="topbar glass">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ✦
          </span>
          <div>
            <h1 className="brand-title">OmniSight</h1>
            <p className="brand-sub">Local vision reasoning · Ollama</p>
          </div>
        </div>
        <div className="topbar-right">
          <ModelSelector
            models={models}
            value={model}
            onChange={setModel}
            error={modelsError}
            visionReady={visionReady}
          />
        </div>
      </header>

      <main className="layout">
        <section className="stage-col glass">
          {image ? (
            <ImageStage
              image={showGrid && griddedImage ? griddedImage : image}
              annotations={annotations}
              userShapes={userShapes}
              onAddShape={(s) => setUserShapes((prev) => [...prev, s])}
              onUndoShape={() => setUserShapes((prev) => prev.slice(0, -1))}
              onClearShapes={() => setUserShapes([])}
              showGrid={showGrid}
              hasGrid={Boolean(griddedImage)}
              onToggleGrid={() => setShowGrid((v) => !v)}
              onReset={() => resetConversation(null)}
              busy={busy}
            />
          ) : (
            <UploadZone onImage={(dataUrl) => resetConversation(dataUrl)} />
          )}
        </section>

        <section className="side-col glass">
          <Conversation turns={turns} error={error} busy={busy} hasImage={Boolean(image)} />
          <QuestionBar
            disabled={!image || !model || busy}
            busy={busy}
            onAsk={ask}
            placeholder={
              turns.length
                ? "Ask a follow-up…"
                : "Mark the image with the tools above, then ask…"
            }
          />
        </section>
      </main>
    </div>
  );
}

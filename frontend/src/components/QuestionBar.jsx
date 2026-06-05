import { useState } from "react";

export default function QuestionBar({ disabled, busy, onAsk, placeholder }) {
  const [text, setText] = useState("");

  function submit(e) {
    e.preventDefault();
    const q = text.trim();
    if (!q || disabled) return;
    onAsk(q);
    setText("");
  }

  return (
    <form className="qbar glass-inset" onSubmit={submit}>
      <textarea
        className="qbar-input"
        rows={1}
        value={text}
        placeholder={placeholder}
        disabled={disabled && !busy}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) submit(e);
        }}
      />
      <button type="submit" className="qbar-send" disabled={disabled || !text.trim()}>
        {busy ? <span className="spinner" /> : "Sketch ✦"}
      </button>
    </form>
  );
}

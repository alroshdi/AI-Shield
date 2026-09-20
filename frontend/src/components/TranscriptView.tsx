import type { TranscriptTurn } from "../types";

export function TranscriptView({ turns }: { turns: TranscriptTurn[] }) {
  return (
    <div className="flex flex-col gap-2">
      {turns.map((turn, i) => {
        const isUser = turn.role === "user";
        return (
          <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed"
              style={{
                background: isUser ? "var(--series-1)" : "var(--surface-2)",
                color: isUser ? "#ffffff" : "var(--text-primary)",
                border: isUser ? "none" : "1px solid var(--border)",
                borderBottomRightRadius: isUser ? 4 : undefined,
                borderBottomLeftRadius: !isUser ? 4 : undefined,
              }}
            >
              <div
                className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: isUser ? "rgba(255,255,255,0.75)" : "var(--text-muted)" }}
              >
                {isUser ? "Attacker" : "Target agent"}
              </div>
              {turn.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}

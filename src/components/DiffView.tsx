import { diffLines } from "diff";

export function DiffView({ before, after }: { before: string; after: string }) {
  const parts = diffLines(before, after);

  return (
    <div className="diff-view">
      {parts.map((part, i) => (
        <div key={i} className={part.added ? "diff-added" : part.removed ? "diff-removed" : "diff-same"}>
          {part.value
            .replace(/\n$/, "")
            .split("\n")
            .map((line, j) => (
              <div key={j}>
                <span className="diff-marker">{part.added ? "+" : part.removed ? "-" : " "}</span>
                {line}
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}

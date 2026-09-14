function RenderHtml({ text }) {
  return <span dangerouslySetInnerHTML={{ __html: text }} />;
}

export function LessonBlocks({ blocks }) {
  return (
    <div className="prose-prose space-y-4 text-[15px] leading-relaxed">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "h3":
            return (
              <h3 key={i} className="!mb-2 pt-2 text-lg font-serif font-bold text-gold">
                <RenderHtml text={block.text} />
              </h3>
            );
          case "p":
            return (
              <p key={i} className="text-body">
                <RenderHtml text={block.text} />
              </p>
            );
          case "bullet":
            return (
              <ul key={i} className="space-y-2 pl-1">
                {(Array.isArray(block.text) ? block.text : [block.text]).map((item, j) => (
                  <li key={j} className="flex gap-3">
                    <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" />
                    <span>
                      <RenderHtml text={item} />
                    </span>
                  </li>
                ))}
              </ul>
            );
          case "tip":
            return (
              <div key={i} className="rounded-xl border border-gold/30 bg-goldsoft p-4 text-sm">
                <div className="sys-label mb-2 text-gold">Dica do guia</div>
                <RenderHtml text={block.text} />
              </div>
            );
          case "exercise":
            return (
              <div key={i} className="rounded-xl border border-line bg-soft p-4 text-sm">
                <div className="sys-label mb-2 text-muted">Exercício de treino</div>
                <RenderHtml text={block.text} />
              </div>
            );
          case "quote":
            return (
              <blockquote key={i} className="border-l-2 border-gold pl-4 text-lg font-serif italic text-muted">
                <RenderHtml text={block.text} />
              </blockquote>
            );
          default:
            return (
              <p key={i}>
                <RenderHtml text={block.text} />
              </p>
            );
        }
      })}
    </div>
  );
}
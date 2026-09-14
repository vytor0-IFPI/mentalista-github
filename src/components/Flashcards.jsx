import { useState } from "react";

export function FlashcardSession({ cards, submit, onDone, emptyText = "Nenhum flashcard aqui ainda." }) {
  const [state, setState] = useState({ idx: 0, flipped: false, results: [] });

  const done = state.idx >= cards.length;
  const card = done ? null : cards[state.idx];

  function flip() {
    setState((s) => ({ ...s, flipped: !s.flipped }));
  }

  async function answer(quality) {
    const current = cards[state.idx];
    const results = [...state.results, { card: current, quality }];
    try {
      await submit(current.id, quality);
    } catch {
      /* segue a revisão mesmo se a API falhar */
    }
    if (current && state.idx + 1 >= cards.length && onDone) onDone(results);
    setState({ idx: state.idx + 1, flipped: false, results });
  }

  if (!cards.length) return <p className="text-sm text-muted">{emptyText}</p>;

  if (done) {
    const good = state.results.filter((r) => r.quality === "good").length;
    return (
      <div className="panel rounded-2xl p-8 text-center">
        <div className="text-3xl">🎉</div>
        <p className="mt-2 font-serif text-lg font-bold">Revisão concluída</p>
        <p className="mt-1 text-sm text-muted">
          Você lembrou de {good} de {state.results.length} flashcards.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex justify-between text-[11px] text-muted">
        <span>
          {state.idx + 1} / {cards.length}
        </span>
        <span>Clique no card para virar</span>
      </div>
      <button
        onClick={flip}
        className="panel flex min-h-[150px] w-full flex-col justify-center rounded-2xl p-6 text-left"
      >
        {!state.flipped ? (
          <p className="font-serif text-lg font-semibold">{card.front}</p>
        ) : (
          <div>
            <p className="sys-label mb-2 text-gold">Resposta</p>
            <p className="text-sm leading-relaxed">{card.back}</p>
          </div>
        )}
      </button>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button onClick={() => answer("again")} className="btn-ghost">
          Ainda não
        </button>
        <button onClick={() => answer("good")} className="btn-primary">
          Lembrei ✓
        </button>
      </div>
    </div>
  );
}
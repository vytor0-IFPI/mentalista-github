import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { FlashcardSession } from "../components/Flashcards";

export function ReviewPage() {
  const [batch, setBatch] = useState(null);
  const [finished, setFinished] = useState(false);
  const [results, setResults] = useState([]);
  const [resetKey, setResetKey] = useState(0);

  function load() {
    api.get("cards").then(setBatch).catch(() => setBatch({ due: [], dueCount: 0, total: 0, boxes: [0, 0, 0, 0, 0, 0] }));
  }

  useEffect(load, []);

  async function handleDone(res) {
    setResults(res);
    setFinished(true);
    const fresh = await api.get("cards").catch(() => batch);
    setBatch(fresh);
  }

  if (!batch) return <div className="flex justify-center py-24"><div className="pulse-dot" /></div>;

  const inProgress = finished && batch.dueCount > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="sys-label text-gold">Repetição espaçada</p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Revisão</h1>
          <p className="mt-1 text-sm text-muted">
            {batch.dueCount} cards para revisar hoje · {batch.total} no total
          </p>
        </div>
        <Link to="/cursos" className="btn-ghost !py-2 text-sm">Estudar mais cursos</Link>
      </div>

      {batch.dueCount === 0 ? (
        <div className="panel rounded-2xl p-12 text-center">
          <div className="text-4xl">⚡</div>
          <h2 className="mt-3 font-serif text-xl font-bold">Tudo em dia!</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Você revisou todos os flashcards pendentes. Volte quando o próximo lote vencer
            (os intervalos crescem conforme você lembra).
          </p>
          <Link to="/cursos" className="btn-primary mt-6 inline-flex">Continuar aprendendo</Link>
        </div>
      ) : finished && !inProgress ? (
        <div className="panel rounded-2xl p-8 text-center">
          <div className="text-4xl">✅</div>
          <h2 className="mt-3 font-serif text-xl font-bold">Lote concluído!</h2>
          <p className="mt-2 text-sm text-muted">
            {results.length} cards revisados e programados para o próximo intervalo.
          </p>
          <Link to="/painel" className="btn-primary mt-6 inline-flex">Voltar ao painel</Link>
        </div>
      ) : (
        <>
          <FlashcardSession
            key={resetKey}
            cards={batch.due}
            submit={(cardId, quality) => api.post("review", { cardId, quality })}
            onDone={handleDone}
            emptyText="Nada pendente por aqui."
          />
          {inProgress && (
            <button onClick={() => { setFinished(false); setResetKey((k) => k + 1); }} className="btn-primary mt-6 w-full">
              Continuar revisando ({batch.dueCount} restantes)
            </button>
          )}
        </>
      )}

      <div className="panel mt-10 rounded-2xl p-5">
        <p className="sys-label mb-3 text-muted">Caixas de repetição</p>
        <div className="flex items-end gap-2">
          {batch.boxes.map((n, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] text-muted">{n}</span>
              <div
                className="w-full rounded-t bg-gold/40"
                style={{ height: `${Math.max(6, (n / Math.max(1, ...batch.boxes)) * 56)}px` }}
              />
              <span className="text-[10px] text-muted">{i + 1}d</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-[11px] text-muted">
          Quanto mais você lembra, maior o intervalo até a próxima revisão.
        </p>
      </div>
    </div>
  );
}
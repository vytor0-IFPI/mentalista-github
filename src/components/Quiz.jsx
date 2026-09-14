import { useState } from "react";

export function Quiz({ questions, initialScore = null, onComplete }) {
  const [answers, setAnswers] = useState(() => new Array(questions.length).fill(null));
  const [submitted, setSubmitted] = useState(initialScore != null);
  const [score, setScore] = useState(initialScore ?? 0);
  const [busy, setBusy] = useState(false);

  const answeredAll = answers.every((a) => a != null);

  function pick(i, opt) {
    setAnswers((prev) => {
      const next = [...prev];
      next[i] = opt;
      return next;
    });
  }

  async function submit() {
    if (!answeredAll || busy) return;
    const correct = questions.reduce((n, q, i) => n + (answers[i] === q.correctIndex ? 1 : 0), 0);
    const sc = Math.round((correct / questions.length) * 100);
    setScore(sc);
    setSubmitted(true);
    setBusy(true);
    try {
      await onComplete(sc);
    } finally {
      setBusy(false);
    }
  }

  function redo() {
    setAnswers(new Array(questions.length).fill(null));
    setSubmitted(false);
    setScore(0);
  }

  return (
    <div className="panel rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="sys-label text-gold">Quiz do capítulo</p>
          <h3 className="mt-1 font-serif text-lg font-bold">Teste seu aprendizado</h3>
        </div>
        {submitted && (
          <span className="rounded-full bg-gold/15 px-3 py-1 text-sm font-bold text-gold">
            Nota: {score}%
          </span>
        )}
      </div>

      <div className="mt-5 space-y-6">
        {questions.map((q, qi) => {
          const chosen = answers[qi];
          const isCorrect = chosen === q.correctIndex;
          const showResult = submitted && chosen != null;
          return (
            <div key={q.id}>
              <p className="font-medium">
                <span className="text-gold">{qi + 1}.</span> {q.question}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {q.options.map((opt, oi) => {
                  const isSelected = chosen === oi;
                  const showCorrect = submitted && oi === q.correctIndex;
                  const showWrong = submitted && isSelected && oi !== q.correctIndex;
                  return (
                    <button
                      key={oi}
                      onClick={() => !submitted && pick(qi, oi)}
                      disabled={submitted}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        showCorrect
                          ? "border-green-500/60 bg-green-500/10 text-green-600 dark:text-green-400"
                          : showWrong
                            ? "border-red-500/60 bg-red-500/10 text-red-600 dark:text-red-400"
                            : isSelected
                              ? "border-gold bg-goldsoft text-gold"
                              : "border-line text-body hover:border-gold/50"
                      }`}
                    >
                      <span className="mr-1.5 text-muted">{String.fromCharCode(65 + oi)}.</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {showResult && (
                <p className={`mt-2 text-xs ${isCorrect ? "text-green-600 dark:text-green-400" : "text-muted"}`}>
                  {isCorrect ? "✓ Correto." : "✗ "}
                  {q.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex gap-3">
        {!submitted ? (
          <button onClick={submit} disabled={!answeredAll || busy} className="btn-primary">
            {busy ? "Enviando…" : answeredAll ? "Enviar respostas" : "Responda todas as perguntas"}
          </button>
        ) : (
          <button onClick={redo} className="btn-ghost">
            Refazer quiz
          </button>
        )}
      </div>
    </div>
  );
}
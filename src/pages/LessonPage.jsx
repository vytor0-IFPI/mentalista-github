import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { LessonBlocks } from "../components/LessonBlocks";
import { Quiz } from "../components/Quiz";
import { FlashcardSession } from "../components/Flashcards";
import { resourceIcon } from "./CoursePage";

export function LessonPage() {
  const { slug, lessonSlug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [completing, setCompleting] = useState(false);

  function load() {
    setLoading(true);
    api
      .get(`lesson/${slug}/${lessonSlug}`)
      .then((d) => {
        setData(d);
        setNote(d.note || "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setData(null);
    setError(null);
    load();
  }, [slug, lessonSlug]);

  async function complete(score = 0) {
    setCompleting(true);
    try {
      await api.post("progress", { lessonId: data.lesson.id, score });
      load();
    } finally {
      setCompleting(false);
    }
  }

  async function saveNote() {
    await api.put("notes", { lessonId: data.lesson.id, content: note });
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2500);
  }

  if (loading || !data) return <div className="flex justify-center py-24"><div className="pulse-dot" /></div>;
  if (error) return <div className="py-24 text-center text-muted">{error}</div>;

  const { lesson, prev, next, module: mod, course } = data;
  const isQuiz = lesson.kind === "quiz";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav className="mb-6 text-xs text-muted">
        <Link to="/cursos" className="hover:text-gold">Cursos</Link>
        <span className="mx-2">/</span>
        <Link to={`/curso/${course.slug}`} className="hover:text-gold">{course.title}</Link>
        <span className="mx-2">/</span>
        <span>{lesson.title}</span>
      </nav>

      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="sys-label text-gold">{mod.title}</span>
          {lesson.done && (
            <span className="rounded-full bg-green-500/15 px-2 py-1 font-semibold text-green-600 dark:text-green-400">
              Concluída ✓
            </span>
          )}
          {isQuiz && lesson.score != null && (
            <span className="rounded-full bg-gold/15 px-2 py-1 font-semibold text-gold">
              Melhor nota: {lesson.score}%
            </span>
          )}
        </div>
        <h1 className="mt-2 font-serif text-2xl font-bold sm:text-3xl">{lesson.title}</h1>
        {lesson.summary && <p className="mt-2 text-sm text-muted">{lesson.summary}</p>}
      </div>

      {isQuiz ? (
        lesson.questions?.length ? (
          <>
            <Quiz questions={lesson.questions} initialScore={lesson.score} onComplete={(sc) => complete(sc)} />
            {lesson.cards?.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-3 font-serif text-lg font-bold">Flashcards deste capítulo</h2>
                <FlashcardSession
                  cards={lesson.cards}
                  submit={(cardId, quality) => api.post("review", { cardId, quality })}
                  emptyText="Nenhum flashcard ainda."
                />
              </div>
            )}
          </>
        ) : (
          <div className="panel rounded-2xl p-6 text-sm text-muted">Este quiz ainda não foi publicado.</div>
        )
      ) : (
        <>
          <LessonBlocks blocks={lesson.blocks} />

          {lesson.resources?.length > 0 && (
            <div className="panel mt-8 rounded-2xl p-5">
              <h3 className="font-serif font-bold">Recursos desta lição</h3>
              <ul className="mt-3 divide-y divide-line">
                {lesson.resources.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="text-gold">{resourceIcon(r.type)}</span>
                    <a className="hover:text-gold" target="_blank" rel="noreferrer" href={r.url || "#"}>
                      {r.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 text-center">
            {lesson.done ? (
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Lição concluída. Siga em frente! ✓
              </p>
            ) : (
              <button onClick={() => complete(0)} disabled={completing} className="btn-primary">
                {completing ? "Registrando…" : "Concluir lição"}
              </button>
            )}
          </div>
        </>
      )}

      <div className="panel mt-10 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-serif font-bold">Anotações</h3>
          {noteSaved && <span className="text-xs text-green-600 dark:text-green-400">Salva ✓</span>}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={5}
          placeholder="Escreva aqui o que ficou desse capítulo…"
          className="mt-3 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-gold"
        />
        <button onClick={saveNote} className="btn-ghost mt-3 !py-2 text-sm">Salvar anotação</button>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link to={`/curso/${course.slug}/${prev.slug}`} className="panel rounded-2xl p-4 hover:border-gold">
            <p className="sys-label mb-1 text-gold">← Anterior</p>
            <p className="text-sm font-medium">{prev.title}</p>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link to={`/curso/${course.slug}/${next.slug}`} className="panel rounded-2xl p-4 text-right hover:border-gold">
            <p className="sys-label mb-1 text-gold">Próximo →</p>
            <p className="text-sm font-medium">{next.title}</p>
          </Link>
        ) : (
          <Link to={`/curso/${course.slug}`} className="panel rounded-2xl p-4 text-right hover:border-gold">
            <p className="sys-label mb-1 text-gold">Voltar ao curso →</p>
            <p className="text-sm font-medium">Concluir e ver progresso</p>
          </Link>
        )}
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { resourceIcon } from "./CoursePage";

export function LibraryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("resources")
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const groups = items.reduce((acc, item) => {
    const key = item.course?.title || "Materiais gerais";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <p className="sys-label text-gold">Biblioteca</p>
      <h1 className="mt-1 font-serif text-3xl font-bold">Materiais e cheatsheets</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        PDFs, cheatsheets, links e referências para consultar quando quiser — organizados por curso.
      </p>

      {loading ? (
        <div className="flex justify-center py-16"><div className="pulse-dot" /></div>
      ) : items.length === 0 ? (
        <div className="panel mt-8 rounded-2xl p-12 text-center text-sm text-muted">
          A biblioteca ainda está vazia. <Link className="text-gold" to="/cursos">Veja os cursos →</Link>
        </div>
      ) : (
        Object.entries(groups).map(([group, rows]) => (
          <section key={group} className="mt-10">
            <h2 className="mb-3 font-serif text-lg font-bold">{group}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((r) => (
                <article key={r.id} className="panel flex flex-col rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-2xl">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-goldsoft text-lg">
                      {resourceIcon(r.type)}
                    </span>
                    <span className="sys-label text-muted">{r.type}</span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold">{r.title}</h3>
                  {r.content && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted">{r.content}</p>}
                  <div className="mt-auto pt-4">
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noreferrer" className="btn-ghost w-full !py-2 text-xs">
                        Abrir material
                      </a>
                    ) : (
                      <span className="text-[11px] text-muted">{r.course?.title || "Conteúdo interno"}</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
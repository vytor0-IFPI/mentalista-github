import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, fmtDuration } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { CourseCard } from "../components/CourseCard";

const FEATURES = [
  { icon: "🔍", title: "Observação nível detetive", text: "Varredura de 5 segundos, microexpressões e pistas cruzadas para ler o que ninguém vê." },
  { icon: "🧊", title: "Leitura a frio", text: "Do efeito Barnum aos boat statements — leituras éticas, calibradas pela reação." },
  { icon: "🕯️", title: "Rapport e influência", text: "Espelhamento, reflexo linguístico e os 6 princípios de persuasão de Cialdini." },
  { icon: "🏛️", title: "Palácio da memória", text: "Repetição espaçada, flashcards e o método de locus para nomes e fatos." },
  { icon: "🕵️", title: "Detector de mentiras", text: "Baseline, teste do desvio e o silêncio que confessa — o protocolo do caso." },
  { icon: "🎭", title: "Personas e presença", text: "Como Jane adota personas e como você controla a impressão que causa." },
];

export function HomePage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("courses")
      .then(setCourses)
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, []);

  const featured = courses.filter((c) => c.featured).slice(0, 3);

  return (
    <div>
      <section className="grid-hairline relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-cover bg-center opacity-25 dark:opacity-15" style={{ backgroundImage: "url(/series/bg.jpg)" }} />
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-24 md:grid-cols-2 md:items-center">
          <div>
            <p className="sys-label mb-4 text-gold">Curso online · Psicologia aplicada</p>
            <h1 className="hero-glow font-serif text-4xl font-bold leading-tight sm:text-5xl">
              Aprenda a enxergar o que as pessoas não mostram.
            </h1>
            <p className="mt-4 max-w-md text-muted">
              18 capítulos, mais de 60 lições, quizzes e um plano de 30 dias para transformar
              observação, memória e rapport em habilidade real — sem mística, só treino.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {user ? (
                <Link to="/painel" className="btn-primary">Meu painel</Link>
              ) : (
                <>
                  <Link to="/criar-conta" className="btn-primary">Criar conta grátis</Link>
                  <Link to="/cursos" className="btn-ghost">Ver cursos</Link>
                </>
              )}
            </div>
            <p className="mt-4 text-xs text-muted">
              Conta demo: <span className="font-mono">demo@mentalistas.com · mentalista123</span>
            </p>
          </div>
          <div className="panel hidden rounded-2xl p-6 md:block">
            <div className="sys-label mb-3 text-muted">O que você vai dominar</div>
            <ul className="space-y-3 text-sm">
              {["A regra dos 5 segundos da observação", "Três pistas independentes antes de apostar", "O teste do desvio contra mentiras", "O silêncio que confessa", "O palácio da memória em 10 minutos/dia", "Rapport, espelhamento e influência ética"].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold/20 text-[10px] text-gold">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-serif font-bold">Cursos em destaque</h2>
            <p className="mt-1 text-sm text-muted">Comece pelo curso completo ou entre por uma trilha rápida.</p>
          </div>
          <Link to="/cursos" className="btn-ghost !py-2 text-sm">Todos os cursos →</Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><div className="pulse-dot" /></div>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {featured.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8">
          <h2 className="text-2xl font-serif font-bold">Por que funciona</h2>
          <p className="mt-1 text-sm text-muted">Técnicas reais de psicologia, treino diário e ética.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="panel rounded-2xl p-5">
              <div className="text-2xl">{f.icon}</div>
              <h3 className="mt-3 font-serif font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="panel rounded-2xl bg-gradient-to-br from-gold/10 to-transparent p-8 text-center">
          <h2 className="text-xl font-serif font-bold">Calma. Tem a sua própria agenda.</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
            Este curso não ensina a enganar ninguém — ensina a observar, entender e fazer o outro
            se sentir visto. Técnica com ética é ofício.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {user ? (
              <Link to="/painel" className="btn-primary">Continuar aprendendo</Link>
            ) : (
              <Link to="/criar-conta" className="btn-primary">Começar agora — grátis</Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">O Método Patrick Jane</p>
          <p className="mt-1 max-w-sm text-xs text-muted">
            Plataforma educacional de observação, leitura a frio, rapport, memória e influência.
            Conteúdo inspirado na série <em>The Mentalist</em>, baseado em psicologia verificável.
          </p>
        </div>
        <div className="flex gap-6 text-xs text-muted">
          <Link to="/cursos" className="hover:text-gold">Cursos</Link>
          <Link to="/revisao" className="hover:text-gold">Revisão</Link>
          <Link to="/biblioteca" className="hover:text-gold">Biblioteca</Link>
          <Link to="/conquistas" className="hover:text-gold">Conquistas</Link>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-[11px] text-muted">
        Projeto educacional de fãs — sem afiliação com a CBS. Apenas para estudo e prática ética.
      </div>
    </footer>
  );
}
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="sys-label text-gold">Erro 404</p>
      <h1 className="mt-2 font-serif text-4xl font-bold">Você se perdeu?</h1>
      <p className="mt-3 text-sm text-muted">
        Nenhum truque mentalista vai trazer essa página de volta. Vamos para um lugar conhecido?
      </p>
      <Link to="/" className="btn-primary mt-6">Voltar ao início</Link>
    </div>
  );
}
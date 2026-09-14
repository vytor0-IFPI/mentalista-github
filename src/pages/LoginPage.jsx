import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate(location.state?.from || "/painel", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <div className="panel rounded-2xl p-8">
        <p className="sys-label mb-2 text-gold">Acesso</p>
        <h1 className="font-serif text-2xl font-bold">Entrar</h1>
        <p className="mt-1 text-sm text-muted">Continue de onde parou.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">E-mail</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-gold"
              placeholder="voce@email.com"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Senha</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-gold"
              placeholder="••••••••"
            />
          </label>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-4 text-xs text-muted">
          Ainda não tem conta?{" "}
          <Link to="/criar-conta" className="text-gold hover:underline">Crie grátis</Link>
        </p>
      </div>

      <p className="mt-4 text-center text-xs text-muted">
        Conta demo: <span className="font-mono">demo@mentalistas.com · mentalista123</span>
      </p>
    </div>
  );
}
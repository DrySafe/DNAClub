import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../config/supabaseClient.js";
export default function Recovery() {
  const updating =
    new URLSearchParams(window.location.hash.slice(1)).get("type") ===
      "recovery" ||
    new URLSearchParams(window.location.search).get("mode") === "reset";
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const result = updating
        ? await supabase.auth.updateUser({ password: data.password })
        : await supabase.auth.resetPasswordForEmail(data.email, {
            redirectTo: `${window.location.origin}/recuperar-senha?mode=reset`,
          });
      if (result.error) throw result.error;
      setMessage(
        updating
          ? "Senha atualizada. Você já pode acessar sua conta."
          : "Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>{updating ? "Definir nova senha" : "Recuperar senha"}</h1>
        {message && (
          <p className="notice success" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <form onSubmit={submit} className="form-grid">
          {updating ? (
            <label>
              Nova senha
              <input name="password" type="password" required minLength={8} />
            </label>
          ) : (
            <label>
              E-mail
              <input name="email" type="email" required />
            </label>
          )}
          <button className="primary" disabled={busy}>
            {" "}
            {busy ? "Enviando…" : "Continuar"}
          </button>
        </form>
        <Link className="auth-link" to="/login">
          Voltar ao login
        </Link>
      </section>
    </main>
  );
}

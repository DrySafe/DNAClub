import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../../config/supabaseClient.js";
import { publicInfo } from "../../services/portalService.js";

export default function Registration() {
  const [params] = useSearchParams();
  const code = params.get("ref") || "";
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    let live = true;
    publicInfo(code)
      .then((data) => live && setInfo(data))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [code]);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const f = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (code && !info?.referrer)
        throw new Error(
          "O código de indicação não foi encontrado. Peça o link correto à revendedora.",
        );
      const { error: e } = await supabase.auth.signUp({
        email: f.email,
        password: f.password,
        options: {
          emailRedirectTo: `${window.location.origin}/app/inicio`,
          data: {
            full_name: f.full_name,
            cpf_cnpj: f.cpf_cnpj.replace(/\D/g, ""),
            phone: f.phone,
            referral_code: info?.referrer?.code || "",
          },
        },
      });
      if (e) throw e;
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <Link className="brand" to="/login">
        DNA <span>DEPILAMOR</span>
      </Link>
      <section className="auth-card">
        <p className="eyebrow">BEM-VINDA AO CLUBE</p>
        <h1>{code ? "Uma indicação especial" : "Sua conta no Clube DNA"}</h1>
        {info?.referrer && (
          <p>
            Você foi indicada por <strong>{info.referrer.name}</strong>. A
            equipe confirmará sua elegibilidade no primeiro pedido.
          </p>
        )}
        {!code && (
          <p>Acompanhe suas compras, campanhas e benefícios em um só lugar.</p>
        )}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        {done ? (
          <div className="notice success">
            <h2>Cadastro enviado</h2>
            <p>
              Se necessário, confirme seu e-mail para acessar a conta. O
              cadastro não concede benefícios automaticamente.
            </p>
            <Link to="/app/inicio">Acessar minha conta →</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="form-grid">
            <label>
              Nome completo
              <input
                name="full_name"
                autoComplete="name"
                required
                minLength={3}
              />
            </label>
            <label>
              CPF ou CNPJ
              <input
                name="cpf_cnpj"
                inputMode="numeric"
                required
                pattern="[0-9. /\-]{11,18}"
              />
            </label>
            <label>
              WhatsApp
              <input name="phone" type="tel" autoComplete="tel" required />
            </label>
            <label>
              E-mail
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Senha
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <label className="check">
              <input type="checkbox" required /> Entendo que a indicação deve
              ser informada antes de concluir o primeiro pedido e depende de
              validação.
            </label>
            <button
              className="primary"
              disabled={busy || !info || (code && !info.referrer)}
            >
              {busy ? "Cadastrando…" : "Criar minha conta"}
            </button>
          </form>
        )}
        <Link className="auth-link" to="/login">
          Já tenho uma conta
        </Link>
      </section>
    </main>
  );
}

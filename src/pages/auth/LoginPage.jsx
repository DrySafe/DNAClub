import Brand from "../../components/Brand.jsx";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../config/supabaseClient.js";
import {
  ShieldCheck,
  UserCheck,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

export default function LoginPage() {
  const [isManagerTab, setIsManagerTab] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw new Error("E-mail ou senha incorretos.");

      // Procura o perfil no Supabase para redirecionar corretamente
      const { data: profile, error: profileError } = await supabase
        .from("dna_members")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        navigate("/app/inicio");
        return;
      }

      // Redireciona com base no perfil (role)
      if (profile.role === "admin" || profile.role === "financeiro") {
        navigate("/app/inicio");
      } else {
        navigate("/app/inicio");
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page login-page">
      <section className="login-story" aria-label="Clube DNA Depilamor">
        <Brand to="/login" light />
        <div className="login-story-content">
          <p className="eyebrow">PERTENCER TEM SEUS BENEFÍCIOS</p>
          <h1>
            Uma conexão.
            <br />
            Muitas conquistas.
          </h1>
          <p>
            Seu espaço para acompanhar os benefícios e aproveitar ainda mais a
            sua relação com a Depilamor.
          </p>
          <div className="login-story-tags">
            <span>Cashback</span>
            <span>Descontos</span>
            <span>Campanhas</span>
          </div>
        </div>
        <p className="login-story-footer">Clube DNA · Depilamor</p>
      </section>
      <div className="login-content">
        <section className="auth-card login-card">
          <p className="eyebrow">BEM-VINDA AO CLUBE</p>
          <h2>
            Seu próximo benefício
            <br />
            começa aqui.
          </h2>
          <p>Acesse sua conta para acompanhar suas conquistas.</p>
          <div className="login-tabs" role="group" aria-label="Tipo de acesso">
            <button
              type="button"
              aria-pressed={!isManagerTab}
              className={!isManagerTab ? "selected" : ""}
              onClick={() => {
                setIsManagerTab(false);
                setErrorMessage("");
              }}
            >
              <UserCheck size={16} /> Cliente / Revendedora
            </button>
            <button
              type="button"
              aria-pressed={isManagerTab}
              className={isManagerTab ? "selected" : ""}
              onClick={() => {
                setIsManagerTab(true);
                setErrorMessage("");
              }}
            >
              <ShieldCheck size={16} /> Gestão / Admin
            </button>
          </div>
          {errorMessage && (
            <div className="notice error login-error" role="alert">
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}
          <form className="form-grid" onSubmit={handleLogin}>
            <label htmlFor="login-email">E-mail</label>
            <div className="login-field">
              <Mail size={18} aria-hidden="true" />
              <input
                id="login-email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </div>
            <label htmlFor="login-password">Senha</label>
            <div className="login-field">
              <Lock size={18} aria-hidden="true" />
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
              />
            </div>
            <Link className="login-recovery" to="/recuperar-senha">
              Esqueceu a senha?
            </Link>
            <button type="submit" disabled={loading} className="primary">
              {loading ? (
                "Entrando…"
              ) : (
                <>
                  Entrar na Plataforma <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
          <p className="login-signup">
            Ainda não tem conta? <Link to="/cadastro">Cadastre-se</Link>
          </p>
        </section>
        <p className="login-footnote">Seus benefícios, em um só lugar.</p>
      </div>
    </main>
  );
}

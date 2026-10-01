import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export function ProtectedRoute({ allowedRoles }) {
  const { user, profile, loading, error, logout, refreshProfile } = useAuth();
  if (loading)
    return (
      <main className="portal-loading" role="status">
        Carregando sua conta…
      </main>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (error || !profile)
    return (
      <main className="portal-loading">
        <h1>Não foi possível abrir o portal</h1>
        <p role="alert">{error || "Perfil não encontrado."}</p>
        <button onClick={refreshProfile}>Tentar novamente</button>{" "}
        <button onClick={() => logout().catch(() => refreshProfile())}>
          Sair
        </button>
      </main>
    );
  if (allowedRoles && !allowedRoles.includes(profile.role))
    return <Navigate to="/app/inicio" replace />;
  return <Outlet />;
}

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ProtectedRoute } from "./routes/ProtectedRoute.jsx";
import LoginPage from "./pages/auth/LoginPage.jsx";
import Registration from "./pages/portal/Registration.jsx";
import Portal from "./pages/portal/Portal.jsx";
import Recovery from "./pages/portal/Recovery.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/indicacao" element={<Registration />} />
          <Route path="/cadastro" element={<Registration />} />
          <Route path="/recuperar-senha" element={<Recovery />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/app/:section" element={<Portal />} />
          </Route>
          <Route
            path="/dashboard"
            element={<Navigate to="/app/inicio" replace />}
          />
          <Route
            path="/gerente/*"
            element={<Navigate to="/app/inicio" replace />}
          />
          <Route path="*" element={<Navigate to="/app/inicio" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

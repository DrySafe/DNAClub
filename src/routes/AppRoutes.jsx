import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'

// Importações com extensão explicita .jsx
import LoginPage from '../pages/auth/LoginPage.jsx'
import DashboardRevendedor from '../pages/revendedor/Dashboard.jsx'
import DashboardGerente from '../pages/gerente/DashboardGerente.jsx'
import CadastroIndicado from '../pages/cliente/CadastroIndicado.jsx'

export function AppRoutes() {
  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/indicacao" element={<CadastroIndicado />} />

      {/* Área Exclusiva da Revendedora */}
      <Route element={<ProtectedRoute allowedRoles={['revendedor']} />}>
        <Route path="/dashboard" element={<DashboardRevendedor />} />
      </Route>

      {/* Área Exclusiva de Gestão (Admin / Financeiro) */}
      <Route element={<ProtectedRoute allowedRoles={['admin', 'financeiro']} />}>
        <Route path="/gerente/*" element={<DashboardGerente />} />
      </Route>

      {/* Redirecionamento Padrão */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
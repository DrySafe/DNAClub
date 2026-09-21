import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'

// Páginas
import LoginPage from '../pages/auth/LoginPage'
import DashboardRevendedor from '../pages/revendedor/Dashboard'
import DashboardGerente from '../pages/gerente/DashboardGerente'
import CadastroIndicado from '../pages/cliente/CadastroIndicado'

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
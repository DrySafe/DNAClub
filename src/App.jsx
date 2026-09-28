import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/LoginPage.jsx'
import DashboardRevendedor from './pages/revendedor/Dashboard.jsx'
import DashboardGerente from './pages/gerente/DashboardGerente.jsx'
import IndicacaoPublica from './pages/IndicacaoPublica.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/indicacao" element={<IndicacaoPublica />} />
        <Route path="/dashboard" element={<DashboardRevendedor />} />
        <Route path="/gerente" element={<DashboardGerente />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

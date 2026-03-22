import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import DashboardGeral from './pages/DashboardGeral'
import DashboardFretes from './pages/Dashboard'
import Cadastros from './pages/Cadastros'
import Veiculos from './pages/Veiculos'
import Produtos from './pages/Produtos'
import Precos from './pages/Precos'
import Ordens from './pages/Ordens'
import Romaneios from './pages/Romaneios'
import Operacoes from './pages/Operacoes'
import Admin from './pages/Admin'
import Importacao from './pages/Importacao'
import DashboardContratos from './pages/DashboardContratos'
import ContratosVenda from './pages/ContratosVenda'
import CompraInsumos from './pages/CompraInsumos'
import Safra from './pages/Safra'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          {/* Dashboard Geral */}
          <Route path="/" element={<DashboardGeral />} />

          {/* FretAgru */}
          <Route path="/frete/dashboard" element={<DashboardFretes />} />
          <Route path="/frete/operacoes" element={<Operacoes />} />
          <Route path="/frete/ordens" element={<Ordens />} />
          <Route path="/frete/romaneios" element={<Romaneios />} />
          <Route path="/frete/veiculos" element={<Veiculos />} />
          <Route path="/frete/precos" element={<Precos />} />
          <Route path="/frete/importacao" element={<Importacao />} />

          {/* ContAgru */}
          <Route path="/contratos/dashboard" element={<DashboardContratos />} />
          <Route path="/contratos/venda" element={<ContratosVenda />} />
          <Route path="/contratos/compra" element={<CompraInsumos />} />

          {/* Universal */}
          <Route path="/cadastros" element={<Cadastros />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/safra" element={<Safra />} />
          <Route path="/admin" element={<Admin />} />

          {/* Redirects de compatibilidade (rotas antigas) */}
          <Route path="/operacoes" element={<Navigate to="/frete/operacoes" replace />} />
          <Route path="/ordens" element={<Navigate to="/frete/ordens" replace />} />
          <Route path="/romaneios" element={<Navigate to="/frete/romaneios" replace />} />
          <Route path="/veiculos" element={<Navigate to="/frete/veiculos" replace />} />
          <Route path="/precos" element={<Navigate to="/frete/precos" replace />} />
          <Route path="/importacao" element={<Navigate to="/frete/importacao" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <Toaster position="top-right" />
    </BrowserRouter>
  )
}

export default App

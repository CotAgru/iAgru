import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Cadastros from './pages/Cadastros'
import Veiculos from './pages/Veiculos'
import Produtos from './pages/Produtos'
import Precos from './pages/Precos'
import Ordens from './pages/Ordens'
import Romaneios from './pages/Romaneios'
import Operacoes from './pages/Operacoes'
import Admin from './pages/Admin'
import Importacao from './pages/Importacao'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/operacoes" element={<Operacoes />} />
          <Route path="/ordens" element={<Ordens />} />
          <Route path="/romaneios" element={<Romaneios />} />
          <Route path="/cadastros" element={<Cadastros />} />
          <Route path="/veiculos" element={<Veiculos />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/precos" element={<Precos />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/importacao" element={<Importacao />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <Toaster position="top-right" />
    </BrowserRouter>
  )
}

export default App

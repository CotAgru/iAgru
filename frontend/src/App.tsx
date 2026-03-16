import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Fornecedores from './pages/Fornecedores'
import Veiculos from './pages/Veiculos'
import Locais from './pages/Locais'
import Produtos from './pages/Produtos'
import Precos from './pages/Precos'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/fornecedores" element={<Fornecedores />} />
          <Route path="/veiculos" element={<Veiculos />} />
          <Route path="/locais" element={<Locais />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/precos" element={<Precos />} />
        </Routes>
      </Layout>
      <Toaster position="top-right" />
    </BrowserRouter>
  )
}

export default App

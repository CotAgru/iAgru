import { ReactNode, useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Truck, Users, Package, DollarSign, LayoutDashboard, CarFront, ClipboardList, FileText, Menu, X, FolderOpen, ChevronDown, ChevronRight, Settings } from 'lucide-react'

const topItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
]

const operacaoChildren = [
  { path: '/operacoes', label: 'Operações', icon: FolderOpen },
  { path: '/ordens', label: 'Ordens de Carregamento', icon: ClipboardList },
  { path: '/romaneios', label: 'Romaneios', icon: FileText },
]

const bottomItems = [
  { path: '/cadastros', label: 'Cadastros', icon: Users },
  { path: '/veiculos', label: 'Veículos', icon: CarFront },
  { path: '/produtos', label: 'Produtos', icon: Package },
  { path: '/precos', label: 'Preços Contratados', icon: DollarSign },
]

const adminItems = [
  { path: '/admin', label: 'Administração', icon: Settings },
]

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isOperacaoActive = operacaoChildren.some(c => location.pathname === c.path)
  const [opOpen, setOpOpen] = useState(isOperacaoActive)

  useEffect(() => { setSidebarOpen(false) }, [location.pathname])
  useEffect(() => { if (isOperacaoActive) setOpOpen(true) }, [isOperacaoActive])

  const NavLink = ({ path, label, icon: Icon, indent }: { path: string; label: string; icon: any; indent?: boolean }) => {
    const isActive = location.pathname === path
    return (
      <Link to={path}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${indent ? 'pl-9' : ''} ${
          isActive ? 'bg-green-700 text-white' : 'text-green-100 hover:bg-green-700/50'
        }`}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        {label}
      </Link>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-green-800 text-white flex flex-col
        transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 border-b border-green-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-8 h-8" />
              <div>
                <h1 className="text-xl font-bold">FretAgru</h1>
                <p className="text-xs text-green-300">Gestão de Fretes</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:bg-green-700 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {topItems.map(item => <NavLink key={item.path} {...item} />)}

          {/* Operacao - grupo pai */}
          <button onClick={() => setOpOpen(!opOpen)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full ${
              isOperacaoActive ? 'bg-green-700/70 text-white' : 'text-green-100 hover:bg-green-700/50'
            }`}>
            <FolderOpen className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-left">Operação</span>
            {opOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {opOpen && (
            <div className="space-y-0.5">
              {operacaoChildren.map(item => <NavLink key={item.path} {...item} indent />)}
            </div>
          )}

          <div className="border-t border-green-700 my-2" />
          {bottomItems.map(item => <NavLink key={item.path} {...item} />)}
          <div className="border-t border-green-700 my-2" />
          {adminItems.map(item => <NavLink key={item.path} {...item} />)}
        </nav>
        <div className="p-4 border-t border-green-700 text-xs text-green-300">
          <p>iAgru Ecossistema</p>
          <p>v1.0.0</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden bg-green-800 text-white p-3 flex items-center gap-3 shadow-md">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 hover:bg-green-700 rounded-lg">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Truck className="w-6 h-6" />
            <span className="font-bold text-lg">FretAgru</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <div className="p-3 sm:p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

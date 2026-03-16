import { ReactNode, useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Truck, Users, Package, DollarSign, LayoutDashboard, CarFront, ClipboardList, FileText, Menu, X } from 'lucide-react'

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/ordens', label: 'Ordens de Carregamento', icon: ClipboardList },
  { path: '/romaneios', label: 'Romaneios', icon: FileText },
  { path: '/cadastros', label: 'Cadastros', icon: Users },
  { path: '/veiculos', label: 'Veiculos', icon: CarFront },
  { path: '/produtos', label: 'Produtos', icon: Package },
  { path: '/precos', label: 'Precos Contratados', icon: DollarSign },
]

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Fechar sidebar ao navegar no mobile
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
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
                <p className="text-xs text-green-300">Gestao de Fretes</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:bg-green-700 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-green-700 text-white'
                    : 'text-green-100 hover:bg-green-700/50'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-green-700 text-xs text-green-300">
          <p>iAgru Ecossistema</p>
          <p>v1.0.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header com hamburger */}
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

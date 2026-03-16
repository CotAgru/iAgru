import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Truck, Users, Package, DollarSign, LayoutDashboard, CarFront, ClipboardList, FileText } from 'lucide-react'

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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-green-800 text-white flex flex-col">
        <div className="p-4 border-b border-green-700">
          <div className="flex items-center gap-2">
            <Truck className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold">FretAgru</h1>
              <p className="text-xs text-green-300">Gestao de Fretes</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
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
                <Icon className="w-5 h-5" />
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
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

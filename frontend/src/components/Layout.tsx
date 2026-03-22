import { ReactNode, useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Truck, Users, Package, DollarSign, LayoutDashboard, CarFront,
  ClipboardList, FileText, Menu, X, FolderOpen, ChevronDown,
  ChevronRight, Settings, Upload, Sprout, ShoppingCart,
  BarChart3, FileSignature, Wheat
} from 'lucide-react'

interface NavItem {
  path: string
  label: string
  icon: any
}

interface ModuleGroup {
  id: string
  label: string
  icon: any
  color: string
  children: NavItem[]
}

const MODULES: ModuleGroup[] = [
  {
    id: 'fretagru',
    label: 'FretAgru',
    icon: Truck,
    color: 'text-emerald-300',
    children: [
      { path: '/frete/dashboard', label: 'Dashboard Fretes', icon: BarChart3 },
      { path: '/frete/operacoes', label: 'Operações', icon: FolderOpen },
      { path: '/frete/ordens', label: 'Ordens de Carregamento', icon: ClipboardList },
      { path: '/frete/romaneios', label: 'Romaneios', icon: FileText },
      { path: '/frete/veiculos', label: 'Veículos', icon: CarFront },
      { path: '/frete/precos', label: 'Preços Contratados', icon: DollarSign },
      { path: '/frete/importacao', label: 'Importação', icon: Upload },
    ],
  },
  {
    id: 'contagru',
    label: 'ContAgru',
    icon: FileSignature,
    color: 'text-blue-300',
    children: [
      { path: '/contratos/dashboard', label: 'Dashboard Contratos', icon: BarChart3 },
      { path: '/contratos/venda', label: 'Contratos de Venda', icon: ShoppingCart },
      { path: '/contratos/compra', label: 'Compra de Insumos', icon: Package },
    ],
  },
]

const GERAL_ITEMS: NavItem[] = [
  { path: '/cadastros', label: 'Cadastros', icon: Users },
  { path: '/produtos', label: 'Produtos', icon: Package },
  { path: '/safra', label: 'Safra', icon: Wheat },
]

const SISTEMA_ITEMS: NavItem[] = [
  { path: '/admin', label: 'Administração', icon: Settings },
]

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const getActiveModule = (): string | null => {
    if (location.pathname.startsWith('/frete')) return 'fretagru'
    if (location.pathname.startsWith('/contratos')) return 'contagru'
    return null
  }

  const [openModules, setOpenModules] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    MODULES.forEach(m => { initial[m.id] = false })
    const active = location.pathname.startsWith('/frete') ? 'fretagru' :
                   location.pathname.startsWith('/contratos') ? 'contagru' : null
    if (active) initial[active] = true
    return initial
  })

  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  useEffect(() => {
    const active = getActiveModule()
    if (active) setOpenModules(prev => ({ ...prev, [active]: true }))
  }, [location.pathname])

  const toggleModule = (id: string) => {
    setOpenModules(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const NavLink = ({ path, label, icon: Icon, indent }: NavItem & { indent?: boolean }) => {
    const isActive = location.pathname === path
    return (
      <Link to={path}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${indent ? 'pl-9' : ''} ${
          isActive ? 'bg-green-700 text-white' : 'text-green-100 hover:bg-green-700/50'
        }`}>
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">{label}</span>
      </Link>
    )
  }

  const activeModule = getActiveModule()
  const activeModuleData = MODULES.find(m => m.id === activeModule)

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
        {/* Header */}
        <div className="p-4 border-b border-green-700">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Sprout className="w-8 h-8 text-green-300" />
              <div>
                <h1 className="text-xl font-bold">iAgru</h1>
                <p className="text-xs text-green-300">Plataforma Agrícola</p>
              </div>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:bg-green-700 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {/* Dashboard Geral */}
          <NavLink path="/" label="Dashboard Geral" icon={LayoutDashboard} />

          {/* Módulos */}
          {MODULES.map(mod => {
            const isOpen = openModules[mod.id]
            const isModActive = mod.children.some(c => location.pathname === c.path)
            const ModIcon = mod.icon
            return (
              <div key={mod.id} className="mt-1">
                <button onClick={() => toggleModule(mod.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors w-full ${
                    isModActive ? 'bg-green-700/70 text-white' : 'text-green-100 hover:bg-green-700/50'
                  }`}>
                  <ModIcon className={`w-5 h-5 flex-shrink-0 ${mod.color}`} />
                  <span className="flex-1 text-left">{mod.label}</span>
                  {isOpen ? <ChevronDown className="w-4 h-4 opacity-60" /> : <ChevronRight className="w-4 h-4 opacity-60" />}
                </button>
                {isOpen && (
                  <div className="space-y-0.5 mt-0.5">
                    {mod.children.map(item => (
                      <NavLink key={item.path} {...item} indent />
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Separador — Geral */}
          <div className="pt-2 pb-1">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-green-500">Geral</p>
          </div>
          {GERAL_ITEMS.map(item => <NavLink key={item.path} {...item} />)}

          {/* Separador — Sistema */}
          <div className="pt-2 pb-1">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-green-500">Sistema</p>
          </div>
          {SISTEMA_ITEMS.map(item => <NavLink key={item.path} {...item} />)}
        </nav>

        <div className="p-3 border-t border-green-700">
          <p className="text-xs text-green-400 px-1">iAgru v2.0.0</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden bg-green-800 text-white p-3 flex items-center gap-3 shadow-md">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 hover:bg-green-700 rounded-lg">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Sprout className="w-6 h-6 text-green-300" />
            <span className="font-bold text-lg">iAgru</span>
            {activeModuleData && (
              <span className="text-xs bg-green-700 px-2 py-0.5 rounded-full">{activeModuleData.label}</span>
            )}
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

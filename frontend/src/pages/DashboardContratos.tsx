import { FileSignature, ShoppingCart, Package, BarChart3 } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function DashboardContratos() {
  const cards = [
    { label: 'Contratos de Venda', value: '0', icon: ShoppingCart, color: 'bg-blue-500', link: '/contratos/venda' },
    { label: 'Compra de Insumos', value: '0', icon: Package, color: 'bg-indigo-500', link: '/contratos/compra' },
    { label: 'Volume Vendido (ton)', value: '0', icon: BarChart3, color: 'bg-teal-500', link: '/contratos/venda' },
    { label: 'Volume Insumos (ton)', value: '0', icon: BarChart3, color: 'bg-amber-500', link: '/contratos/compra' },
  ]

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <FileSignature className="w-7 h-7 text-blue-600" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">ContAgru — Dashboard</h1>
            <p className="text-sm text-gray-500">Gestão de Contratos de Venda e Compra de Insumos</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {cards.map(card => {
          const Icon = card.icon
          return (
            <Link key={card.label} to={card.link}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{card.value}</p>
                </div>
                <div className={`${card.color} p-2.5 rounded-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
        <FileSignature className="w-16 h-16 text-blue-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Módulo em Desenvolvimento</h3>
        <p className="text-sm text-blue-600 max-w-md mx-auto">
          O ContAgru está sendo preparado para gerenciar seus contratos de venda de commodities
          e compras de insumos agrícolas. Em breve disponível!
        </p>
      </div>
    </div>
  )
}

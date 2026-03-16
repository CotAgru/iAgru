import { useEffect, useState } from 'react'
import { Users, CarFront, MapPin, Package, DollarSign } from 'lucide-react'
import { getFornecedores, getVeiculos, getLocais, getProdutos, getPrecos } from '../services/api'

export default function Dashboard() {
  const [stats, setStats] = useState({ fornecedores: 0, veiculos: 0, locais: 0, produtos: 0, precos: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getFornecedores().catch(() => []),
      getVeiculos().catch(() => []),
      getLocais().catch(() => []),
      getProdutos().catch(() => []),
      getPrecos().catch(() => []),
    ]).then(([f, v, l, p, pr]) => {
      setStats({
        fornecedores: f.length,
        veiculos: v.length,
        locais: l.length,
        produtos: p.length,
        precos: pr.length,
      })
      setLoading(false)
    })
  }, [])

  const cards = [
    { label: 'Fornecedores', value: stats.fornecedores, icon: Users, color: 'bg-blue-500' },
    { label: 'Veiculos', value: stats.veiculos, icon: CarFront, color: 'bg-purple-500' },
    { label: 'Origens/Destinos', value: stats.locais, icon: MapPin, color: 'bg-orange-500' },
    { label: 'Produtos', value: stats.produtos, icon: Package, color: 'bg-emerald-500' },
    { label: 'Precos Contratados', value: stats.precos, icon: DollarSign, color: 'bg-rose-500' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {loading ? (
        <p className="text-gray-500">Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{card.label}</p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">{card.value}</p>
                  </div>
                  <div className={`${card.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Bem-vindo ao FretAgru</h2>
        <p className="text-gray-600">
          Sistema de gestao de fretes agricolas do ecossistema iAgru.
          Controle o escoamento de graos para armazens e o transporte de insumos como calcario,
          gesso agricola e fertilizantes.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-800 mb-2">Escoamento de Graos</h3>
            <p>Controle os fretes de soja, milho, sorgo e feijao da lavoura ate o armazem ou industria.</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <h3 className="font-semibold text-amber-800 mb-2">Transporte de Insumos</h3>
            <p>Gerencie o frete de calcario, gesso, fertilizantes e outros insumos ate a fazenda.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

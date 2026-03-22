import { useEffect, useState } from 'react'
import { FileSignature, ShoppingCart, Package, BarChart3, Loader2, DollarSign } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getContratosVenda, getComprasInsumo } from '../services/api'
import { fmtInt, fmtDec, fmtBRL } from '../utils/format'

export default function DashboardContratos() {
  const [vendas, setVendas] = useState<any[]>([])
  const [compras, setCompras] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getContratosVenda().catch(() => []), getComprasInsumo().catch(() => [])])
      .then(([v, c]) => { setVendas(v); setCompras(c) })
      .finally(() => setLoading(false))
  }, [])

  const volumeVendido = vendas.reduce((s, v) => s + (v.volume_tons || 0), 0)
  const valorVendas = vendas.reduce((s, v) => s + ((v.volume_tons || 0) * (v.preco_valor || 0)), 0)
  const qtdCompras = compras.length
  const valorCompras = compras.reduce((s, c) => s + ((c.quantidade || 0) * (c.preco_valor || 0)), 0)

  const vendasPorStatus = vendas.reduce((acc: Record<string, number>, v) => {
    acc[v.status] = (acc[v.status] || 0) + 1; return acc
  }, {})

  const cards = [
    { label: 'Contratos de Venda', value: fmtInt(vendas.length), icon: ShoppingCart, color: 'bg-blue-500', link: '/contratos/venda' },
    { label: 'Compra de Insumos', value: fmtInt(qtdCompras), icon: Package, color: 'bg-indigo-500', link: '/contratos/compra' },
    { label: 'Volume Vendido (ton)', value: fmtDec(volumeVendido, 1), icon: BarChart3, color: 'bg-teal-500', link: '/contratos/venda' },
    { label: 'Valor Total Vendas', value: fmtBRL(valorVendas), icon: DollarSign, color: 'bg-emerald-500', link: '/contratos/venda' },
  ]

  const statusLabels: Record<string, { label: string; color: string }> = {
    negociacao: { label: 'Negociação', color: 'bg-yellow-400' },
    fixado: { label: 'Fixado', color: 'bg-blue-400' },
    em_execucao: { label: 'Em Execução', color: 'bg-green-400' },
    liquidado: { label: 'Liquidado', color: 'bg-gray-400' },
    cancelado: { label: 'Cancelado', color: 'bg-red-400' },
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /><span className="ml-3 text-gray-500">Carregando...</span></div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status dos contratos de venda */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Contratos de Venda por Status</h3>
          {vendas.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Nenhum contrato cadastrado</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(vendasPorStatus).map(([status, count]) => {
                const info = statusLabels[status] || { label: status, color: 'bg-gray-400' }
                const pct = vendas.length > 0 ? ((count as number) / vendas.length * 100) : 0
                return (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{info.label}</span>
                      <span className="font-medium text-gray-800">{fmtInt(count as number)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${info.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Resumo compras de insumos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Resumo — Compra de Insumos</h3>
          {compras.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Nenhuma compra cadastrada</p>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total de Compras</span>
                <span className="text-lg font-bold text-gray-800">{fmtInt(qtdCompras)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Valor Total Estimado</span>
                <span className="text-lg font-bold text-indigo-600">{fmtBRL(valorCompras)}</span>
              </div>
              <div className="border-t pt-3 mt-3">
                <h4 className="text-xs font-medium text-gray-500 mb-2">Últimas compras</h4>
                {compras.slice(0, 5).map((c: any) => (
                  <div key={c.id} className="flex justify-between text-sm py-1">
                    <span className="text-gray-600 truncate max-w-[60%]">{c.produto_nome} — {c.fornecedor_nome}</span>
                    <span className="font-medium text-gray-800">{fmtBRL(c.preco_valor * c.quantidade)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

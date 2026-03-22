import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Truck, FileSignature, Users, Package, Loader2, ArrowRight, FileText, ClipboardList, Scale, DollarSign, ShoppingCart } from 'lucide-react'
import { getCadastros, getVeiculos, getProdutos, getPrecos, getOrdens, getRomaneios, getOperacoes, getContratosVenda, getComprasInsumo } from '../services/api'
import { fmtInt, fmtDec, fmtBRL } from '../utils/format'

export default function DashboardGeral() {
  const [loading, setLoading] = useState(true)
  const [cadastros, setCadastros] = useState<any[]>([])
  const [veiculos, setVeiculos] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [precos, setPrecos] = useState<any[]>([])
  const [ordens, setOrdens] = useState<any[]>([])
  const [romaneios, setRomaneios] = useState<any[]>([])
  const [operacoes, setOperacoes] = useState<any[]>([])
  const [contratosVenda, setContratosVenda] = useState<any[]>([])
  const [comprasInsumo, setComprasInsumo] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      getCadastros().catch(() => []),
      getVeiculos().catch(() => []),
      getProdutos().catch(() => []),
      getPrecos().catch(() => []),
      getOrdens().catch(() => []),
      getRomaneios().catch(() => []),
      getOperacoes().catch(() => []),
      getContratosVenda().catch(() => []),
      getComprasInsumo().catch(() => []),
    ]).then(([c, v, p, pr, o, r, ops, cv, ci]) => {
      setCadastros(c); setVeiculos(v); setProdutos(p); setPrecos(pr)
      setOrdens(o); setRomaneios(r); setOperacoes(ops)
      setContratosVenda(cv); setComprasInsumo(ci)
      setLoading(false)
    })
  }, [])

  const pesoTotal = useMemo(() =>
    romaneios.reduce((acc: number, r: any) => acc + (r.peso_liquido || 0), 0)
  , [romaneios])

  const volumeVendido = useMemo(() =>
    contratosVenda.reduce((s: number, v: any) => s + (v.volume_tons || 0), 0)
  , [contratosVenda])

  const valorTotalVendas = useMemo(() =>
    contratosVenda.reduce((s: number, v: any) => s + ((v.volume_tons || 0) * (v.preco_valor || 0)), 0)
  , [contratosVenda])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        <span className="ml-3 text-gray-500">Carregando dashboard...</span>
      </div>
    )
  }

  const modules = [
    {
      id: 'fretagru',
      title: 'FretAgru',
      subtitle: 'Gestão de Fretes',
      icon: Truck,
      color: 'bg-emerald-600',
      lightColor: 'bg-emerald-50 border-emerald-200',
      link: '/frete/dashboard',
      stats: [
        { label: 'Operações', value: fmtInt(operacoes.length), icon: ClipboardList },
        { label: 'Ordens', value: fmtInt(ordens.length), icon: ClipboardList },
        { label: 'Romaneios', value: fmtInt(romaneios.length), icon: FileText },
        { label: 'Peso (ton)', value: fmtDec(pesoTotal / 1000, 1), icon: Scale },
      ],
    },
    {
      id: 'contagru',
      title: 'ContAgru',
      subtitle: 'Gestão de Contratos',
      icon: FileSignature,
      color: 'bg-blue-600',
      lightColor: 'bg-blue-50 border-blue-200',
      link: '/contratos/dashboard',
      stats: [
        { label: 'Contratos Venda', value: fmtInt(contratosVenda.length), icon: ShoppingCart },
        { label: 'Compra Insumos', value: fmtInt(comprasInsumo.length), icon: Package },
        { label: 'Volume (ton)', value: fmtDec(volumeVendido, 1), icon: Scale },
        { label: 'Valor Total', value: fmtBRL(valorTotalVendas), icon: DollarSign },
      ],
    },
  ]

  const universalStats = [
    { label: 'Cadastros', value: fmtInt(cadastros.length), icon: Users, link: '/cadastros', color: 'text-purple-600 bg-purple-100' },
    { label: 'Produtos', value: fmtInt(produtos.length), icon: Package, link: '/produtos', color: 'text-orange-600 bg-orange-100' },
    { label: 'Veículos', value: fmtInt(veiculos.length), icon: Truck, link: '/frete/veiculos', color: 'text-rose-600 bg-rose-100' },
    { label: 'Preços', value: fmtInt(precos.length), icon: DollarSign, link: '/frete/precos', color: 'text-teal-600 bg-teal-100' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Dashboard Geral</h1>
        <p className="text-sm text-gray-500 mt-1">Visão consolidada da plataforma iAgru</p>
      </div>

      {/* Cards universais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {universalStats.map(stat => {
          const Icon = stat.icon
          return (
            <Link key={stat.label} to={stat.link}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Módulos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {modules.map(mod => {
          const ModIcon = mod.icon
          return (
            <div key={mod.id} className={`rounded-xl border ${mod.lightColor} overflow-hidden`}>
              <div className={`${mod.color} px-5 py-4 flex items-center justify-between`}>
                <div className="flex items-center gap-3 text-white">
                  <ModIcon className="w-7 h-7" />
                  <div>
                    <h2 className="text-lg font-bold">{mod.title}</h2>
                    <p className="text-xs opacity-80">{mod.subtitle}</p>
                  </div>
                </div>
                <Link to={mod.link}
                  className="flex items-center gap-1.5 text-white/90 hover:text-white text-sm font-medium">
                  Ver mais <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {mod.stats.map(stat => {
                  const StatIcon = stat.icon
                  return (
                    <div key={stat.label} className="bg-white rounded-lg p-3 text-center shadow-sm">
                      <StatIcon className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                      <p className="text-lg font-bold text-gray-800">{stat.value}</p>
                      <p className="text-[11px] text-gray-500">{stat.label}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

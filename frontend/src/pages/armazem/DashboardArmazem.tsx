import { useEffect, useState, useMemo } from 'react'
import { Warehouse, Package, TrendingUp, TrendingDown, Users, Scale, ArrowUp, ArrowDown, ArrowUpDown, CreditCard } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { getRomaneiosArmazem, getUnidadesArmazenadoras, getProdutos, getCadastros, getCobrancas, getQuebraTecnica } from '../../services/api'
import { fmtInt, fmtDec, fmtBRL } from '../../utils/format'

type SortDir = 'asc' | 'desc'

export default function DashboardArmazem() {
  const [romaneios, setRomaneios] = useState<any[]>([])
  const [unidades, setUnidades] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [cadastros, setCadastros] = useState<any[]>([])
  const [cobrancas, setCobrancas] = useState<any[]>([])
  const [quebras, setQuebras] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [unidadeSel, setUnidadeSel] = useState('KG')

  useEffect(() => {
    Promise.all([
      getRomaneiosArmazem(),
      getUnidadesArmazenadoras(),
      getProdutos(),
      getCadastros(),
      getCobrancas(),
      getQuebraTecnica(),
    ]).then(([r, u, p, c, cob, q]) => {
      setRomaneios(r)
      setUnidades(u)
      setProdutos(p)
      setCadastros(c)
      setCobrancas(cob)
      setQuebras(q)
    }).finally(() => setLoading(false))
  }, [])

  const conv = (kg: number) => {
    if (unidadeSel === 'SC') return kg / 60
    if (unidadeSel === 'TN') return kg / 1000
    return kg
  }

  const entradas = romaneios.filter(r => r.tipo === 'entrada' && r.status !== 'cancelado')
  const saidas = romaneios.filter(r => r.tipo === 'saida' && r.status !== 'cancelado')

  const totalEntradas = entradas.reduce((s, r) => s + (r.peso_corrigido || 0), 0)
  const totalSaidas = saidas.reduce((s, r) => s + (r.peso_corrigido || 0), 0)
  const estoqueTotal = totalEntradas - totalSaidas

  const totalDescontos = entradas.reduce((s, r) => s + (r.desconto_total || 0), 0)
  const totalQuebraAcum = quebras.reduce((s: number, q: any) => s + (q.quebra_kg || 0), 0)
  const totalCobAberto = cobrancas.filter((c: any) => c.status === 'aberto').reduce((s: number, c: any) => s + (c.valor_total || 0), 0)
  const totalCobPago = cobrancas.filter((c: any) => c.status === 'pago').reduce((s: number, c: any) => s + (c.valor_total || 0), 0)

  // Movimentação mensal (para gráfico)
  const movMensal = useMemo(() => {
    const map: Record<string, { mes: string, entradas: number, saidas: number }> = {}
    const ativos = romaneios.filter(r => r.status !== 'cancelado' && r.data_emissao)
    ativos.forEach(r => {
      const d = new Date(r.data_emissao)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      if (!map[key]) map[key] = { mes: label, entradas: 0, saidas: 0 }
      if (r.tipo === 'entrada') map[key].entradas += r.peso_corrigido || 0
      else if (r.tipo === 'saida') map[key].saidas += r.peso_corrigido || 0
    })
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({ ...v, entradas: conv(v.entradas), saidas: conv(v.saidas) }))
  }, [romaneios, unidadeSel])

  const CORES_PIE = ['#d97706', '#059669', '#2563eb', '#dc2626', '#7c3aed', '#ea580c', '#0891b2']

  // Estoque por produto
  const estoquePorProduto = useMemo(() => {
    const map: Record<string, { produto: string, entradas: number, saidas: number }> = {}
    entradas.forEach(r => {
      const nome = r.produto_nome || 'Sem produto'
      if (!map[nome]) map[nome] = { produto: nome, entradas: 0, saidas: 0 }
      map[nome].entradas += r.peso_corrigido || 0
    })
    saidas.forEach(r => {
      const nome = r.produto_nome || 'Sem produto'
      if (!map[nome]) map[nome] = { produto: nome, entradas: 0, saidas: 0 }
      map[nome].saidas += r.peso_corrigido || 0
    })
    return Object.values(map).map(v => ({ ...v, saldo: v.entradas - v.saidas }))
  }, [romaneios])

  // Top depositantes
  const topDepositantes = useMemo(() => {
    const map: Record<string, { nome: string, entradas: number, saidas: number }> = {}
    entradas.forEach(r => {
      const nome = r.depositante_nome || 'Sem depositante'
      if (!map[nome]) map[nome] = { nome, entradas: 0, saidas: 0 }
      map[nome].entradas += r.peso_corrigido || 0
    })
    saidas.forEach(r => {
      const nome = r.depositante_nome || 'Sem depositante'
      if (!map[nome]) map[nome] = { nome, entradas: 0, saidas: 0 }
      map[nome].saidas += r.peso_corrigido || 0
    })
    return Object.values(map)
      .map(v => ({ ...v, saldo: v.entradas - v.saidas }))
      .sort((a, b) => b.saldo - a.saldo)
      .slice(0, 10)
  }, [romaneios])

  const [sortProd, setSortProd] = useState<{ col: string, dir: SortDir }>({ col: 'saldo', dir: 'desc' })
  const [sortDep, setSortDep] = useState<{ col: string, dir: SortDir }>({ col: 'saldo', dir: 'desc' })

  const sortedProdutos = useMemo(() => {
    const arr = [...estoquePorProduto]
    arr.sort((a: any, b: any) => {
      const va = a[sortProd.col], vb = b[sortProd.col]
      if (typeof va === 'number') return sortProd.dir === 'asc' ? va - vb : vb - va
      return sortProd.dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
    return arr
  }, [estoquePorProduto, sortProd])

  const sortedDepositantes = useMemo(() => {
    const arr = [...topDepositantes]
    arr.sort((a: any, b: any) => {
      const va = a[sortDep.col], vb = b[sortDep.col]
      if (typeof va === 'number') return sortDep.dir === 'asc' ? va - vb : vb - va
      return sortDep.dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
    return arr
  }, [topDepositantes, sortDep])

  const SortHeader = ({ label, col, sort, setSort }: { label: string, col: string, sort: any, setSort: any }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100"
      onClick={() => setSort({ col, dir: sort.col === col && sort.dir === 'asc' ? 'desc' : 'asc' })}>
      <span className="flex items-center gap-1">
        {label}
        {sort.col === col ? (sort.dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
      </span>
    </th>
  )

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" /></div>

  return (
    <div className="space-y-6">
      {/* Header sticky */}
      <div className="sticky top-0 z-20 bg-gray-50 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 py-3 mb-4 border-b border-gray-200 shadow-sm flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Dashboard Armazém</h1>
        <div className="flex items-center gap-2">
          {['KG', 'SC', 'TN'].map(u => (
            <button key={u} onClick={() => setUnidadeSel(u)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${unidadeSel === u ? 'bg-amber-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'}`}>
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><TrendingUp className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Total Entradas</p>
              <p className="text-lg font-bold text-gray-800">{fmtDec(conv(totalEntradas))} {unidadeSel}</p>
              <p className="text-xs text-gray-400">{fmtInt(entradas.length)} romaneios</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg"><TrendingDown className="w-5 h-5 text-red-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Total Saídas</p>
              <p className="text-lg font-bold text-gray-800">{fmtDec(conv(totalSaidas))} {unidadeSel}</p>
              <p className="text-xs text-gray-400">{fmtInt(saidas.length)} romaneios</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg"><Warehouse className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Estoque Atual</p>
              <p className="text-lg font-bold text-gray-800">{fmtDec(conv(estoqueTotal))} {unidadeSel}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg"><Scale className="w-5 h-5 text-purple-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Total Descontos</p>
              <p className="text-lg font-bold text-gray-800">{fmtDec(conv(totalDescontos))} {unidadeSel}</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs extras */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg"><TrendingDown className="w-5 h-5 text-orange-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Quebra Técnica Acumulada</p>
              <p className="text-lg font-bold text-orange-600">{fmtDec(conv(totalQuebraAcum))} {unidadeSel}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg"><CreditCard className="w-5 h-5 text-yellow-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Cobranças em Aberto</p>
              <p className="text-lg font-bold text-yellow-700">{fmtBRL(totalCobAberto)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><CreditCard className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Cobranças Pagas</p>
              <p className="text-lg font-bold text-green-700">{fmtBRL(totalCobPago)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Movimentação Mensal */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Movimentação Mensal ({unidadeSel})</h2>
          {movMensal.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={movMensal}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => fmtDec(Number(v))} />
                <Legend />
                <Bar dataKey="entradas" name="Entradas" fill="#059669" radius={[4,4,0,0]} />
                <Bar dataKey="saidas" name="Saídas" fill="#dc2626" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Estoque por Produto - Pie */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Estoque por Produto ({unidadeSel})</h2>
          {estoquePorProduto.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={estoquePorProduto.map(p => ({ name: p.produto, value: conv(p.saldo) }))}
                  cx="50%" cy="50%" outerRadius={90} dataKey="value"
                  label={({ name, value }: any) => `${name}: ${fmtDec(value)}`}
                >
                  {estoquePorProduto.map((_, i) => <Cell key={i} fill={CORES_PIE[i % CORES_PIE.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmtDec(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estoque por Produto */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Package className="w-4 h-4" /> Estoque por Produto</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b">
                <SortHeader label="Produto" col="produto" sort={sortProd} setSort={setSortProd} />
                <SortHeader label={`Entradas (${unidadeSel})`} col="entradas" sort={sortProd} setSort={setSortProd} />
                <SortHeader label={`Saídas (${unidadeSel})`} col="saidas" sort={sortProd} setSort={setSortProd} />
                <SortHeader label={`Saldo (${unidadeSel})`} col="saldo" sort={sortProd} setSort={setSortProd} />
              </tr></thead>
              <tbody>
                {sortedProdutos.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-4 text-gray-400">Sem dados</td></tr>
                ) : sortedProdutos.map((p, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{p.produto}</td>
                    <td className="px-3 py-2 text-right text-green-600">{fmtDec(conv(p.entradas))}</td>
                    <td className="px-3 py-2 text-right text-red-600">{fmtDec(conv(p.saidas))}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmtDec(conv(p.saldo))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Depositantes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> Top Depositantes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b">
                <SortHeader label="Depositante" col="nome" sort={sortDep} setSort={setSortDep} />
                <SortHeader label={`Entradas (${unidadeSel})`} col="entradas" sort={sortDep} setSort={setSortDep} />
                <SortHeader label={`Saídas (${unidadeSel})`} col="saidas" sort={sortDep} setSort={setSortDep} />
                <SortHeader label={`Saldo (${unidadeSel})`} col="saldo" sort={sortDep} setSort={setSortDep} />
              </tr></thead>
              <tbody>
                {sortedDepositantes.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-4 text-gray-400">Sem dados</td></tr>
                ) : sortedDepositantes.map((d, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{d.nome}</td>
                    <td className="px-3 py-2 text-right text-green-600">{fmtDec(conv(d.entradas))}</td>
                    <td className="px-3 py-2 text-right text-red-600">{fmtDec(conv(d.saidas))}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmtDec(conv(d.saldo))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

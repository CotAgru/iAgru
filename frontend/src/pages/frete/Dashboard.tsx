import { useEffect, useState, useMemo, useCallback } from 'react'
import { Truck, Scale, TrendingUp, DollarSign, FileText, Loader2, Filter, X, ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, ChevronRight, MapPin, BarChart3, AlertTriangle, Droplets } from 'lucide-react'
import { getCadastros, getVeiculos, getProdutos, getPrecos, getOrdens, getRomaneios, getOperacoes, getAnosSafra, getSafras, getTiposTicket } from '../../services/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts'
import { fmtInt, fmtDec, fmtBRL } from '../../utils/format'

const COLORS = ['#16a34a', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d', '#65a30d', '#ea580c', '#6366f1']
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

type ViewMode = 'transportadora' | 'placa' | 'motorista'
type SortDir = 'asc' | 'desc' | null
type UnitMode = 'kg' | 'sc' | 'tn'

const UNIT_LABELS: Record<UnitMode, string> = { kg: 'kg', sc: 'sc', tn: 'ton' }
const DESCONTOS_COLS = [
  { key: 'umidade', field: 'umidade_desc', label: 'Umidade' },
  { key: 'impureza', field: 'impureza_desc', label: 'Impureza' },
  { key: 'avariados', field: 'avariados_desc', label: 'Avariados' },
  { key: 'ardidos', field: 'ardidos_desc', label: 'Ardidos' },
  { key: 'esverdeados', field: 'esverdeados_desc', label: 'Esverdeados' },
  { key: 'partidos', field: 'partidos_desc', label: 'Partidos' },
  { key: 'quebrados', field: 'quebrados_desc', label: 'Quebrados' },
]

const convertVol = (kg: number, unit: UnitMode): number => {
  switch (unit) { case 'tn': return kg / 1000; case 'sc': return kg / 60; default: return kg }
}
const fmtVol = (kg: number, unit: UnitMode): string => {
  if (!kg) return '-'
  const v = convertVol(kg, unit)
  return unit === 'kg' ? fmtInt(v) : fmtDec(v, 2)
}
const vlrUnitMult = (unit: UnitMode): number => {
  switch (unit) { case 'tn': return 1000; case 'sc': return 60; default: return 1 }
}

const cadNome = (id: string, cadastros: any[]) => {
  const c = cadastros.find((x: any) => x.id === id)
  return c?.nome_fantasia || c?.nome || '-'
}

export default function Dashboard() {
  const [cadastros, setCadastros] = useState<any[]>([])
  const [veiculos, setVeiculos] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [precos, setPrecos] = useState<any[]>([])
  const [ordens, setOrdens] = useState<any[]>([])
  const [romaneios, setRomaneios] = useState<any[]>([])
  const [operacoes, setOperacoes] = useState<any[]>([])
  const [anosSafra, setAnosSafra] = useState<any[]>([])
  const [safras, setSafras] = useState<any[]>([])
  const [tiposTicket, setTiposTicket] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros globais
  const [filtroAnoSafra, setFiltroAnoSafra] = useState<string>('')
  const [filtroSafra, setFiltroSafra] = useState<string>('')
  const [filtroOrigem, setFiltroOrigem] = useState<string>('')
  const [filtroDestino, setFiltroDestino] = useState<string>('')
  const [filtroTransportadora, setFiltroTransportadora] = useState<string>('')
  const [filtroMotorista, setFiltroMotorista] = useState<string>('')
  const [filtroPlaca, setFiltroPlaca] = useState<string>('')
  const [filtroProduto, setFiltroProduto] = useState<string>('')
  const [filtroTipoTicket, setFiltroTipoTicket] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  // Unidade de exibição
  const [unidadeBI, setUnidadeBI] = useState<UnitMode>('sc')
  const uLabel = UNIT_LABELS[unidadeBI]

  // Visão de tabela
  const [viewMode, setViewMode] = useState<ViewMode>('transportadora')
  const [sortKey, setSortKey] = useState<string>('vlrTotal')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Seções colapsáveis
  const [secaoGraficos, setSecaoGraficos] = useState(true)
  const [secaoTabela, setSecaoTabela] = useState(true)
  const [secaoRotas, setSecaoRotas] = useState(true)
  const [secaoDescontos, setSecaoDescontos] = useState(true)
  const [secaoFreteExcedente, setSecaoFreteExcedente] = useState(true)

  useEffect(() => {
    Promise.all([
      getCadastros().catch(() => []),
      getVeiculos().catch(() => []),
      getProdutos().catch(() => []),
      getPrecos().catch(() => []),
      getOrdens().catch(() => []),
      getRomaneios().catch(() => []),
      getOperacoes().catch(() => []),
      getAnosSafra().catch(() => []),
      getSafras().catch(() => []),
      getTiposTicket().catch(() => []),
    ]).then(([c, v, p, pr, o, r, ops, as_, sf, tt]) => {
      setCadastros(c); setVeiculos(v); setProdutos(p); setPrecos(pr)
      setOrdens(o); setRomaneios(r); setOperacoes(ops); setAnosSafra(as_); setSafras(sf); setTiposTicket(tt)
      setLoading(false)
    })
  }, [])

  // Calcular valor unitário frete por kg de um romaneio
  const calcVlrUnitKg = useCallback((item: any): number => {
    if (!item.ordem_id) return 0
    const ordem = ordens.find((o: any) => o.id === item.ordem_id)
    if (!ordem?.preco_id) return 0
    const preco = precos.find((p: any) => p.id === ordem.preco_id)
    if (!preco?.valor) return 0
    switch (preco.unidade_preco) {
      case 'R$/ton': return preco.valor / 1000
      case 'R$/sc': return preco.valor / 60
      default: return 0
    }
  }, [ordens, precos])

  // Calcular valor total frete de um romaneio (peso_liquido × vlr_unit)
  const calcVlrFrete = useCallback((item: any): number => {
    const pesoKg = item.peso_liquido || 0
    if (!pesoKg) return 0
    const vlrUnit = calcVlrUnitKg(item)
    return pesoKg * vlrUnit
  }, [calcVlrUnitKg])

  // Aplicar filtros globais
  const filteredRomaneios = useMemo(() => {
    return romaneios.filter((r: any) => {
      if (filtroAnoSafra && r.ano_safra_id !== filtroAnoSafra) return false
      if (filtroSafra) {
        const safraIds = r.safra_ids || []
        if (!safraIds.includes(filtroSafra)) return false
      }
      if (filtroOrigem && r.origem_id !== filtroOrigem) return false
      if (filtroDestino && r.destinatario_id !== filtroDestino) return false
      if (filtroTransportadora && r.transportadora_id !== filtroTransportadora) return false
      if (filtroMotorista && r.motorista_id !== filtroMotorista) return false
      if (filtroPlaca) {
        const veic = veiculos.find((v: any) => v.id === r.veiculo_id)
        if (!veic || veic.placa !== filtroPlaca) return false
      }
      if (filtroProduto && r.produto_id !== filtroProduto) return false
      if (filtroTipoTicket && r.tipo_ticket_id !== filtroTipoTicket) return false
      return true
    })
  }, [romaneios, filtroAnoSafra, filtroSafra, filtroOrigem, filtroDestino, filtroTransportadora, filtroMotorista, filtroPlaca, filtroProduto, filtroTipoTicket, veiculos])

  const activeFiltersCount = [filtroAnoSafra, filtroSafra, filtroOrigem, filtroDestino, filtroTransportadora, filtroMotorista, filtroPlaca, filtroProduto, filtroTipoTicket].filter(Boolean).length

  const clearFilters = () => {
    setFiltroAnoSafra(''); setFiltroSafra(''); setFiltroOrigem(''); setFiltroDestino('')
    setFiltroTransportadora(''); setFiltroMotorista(''); setFiltroPlaca(''); setFiltroProduto(''); setFiltroTipoTicket('')
  }

  // KPIs
  const kpis = useMemo(() => {
    const totalViagens = filteredRomaneios.length
    const volSDescKg = filteredRomaneios.reduce((s: number, r: any) => s + (r.peso_liquido || 0), 0)
    const volCDescKg = filteredRomaneios.reduce((s: number, r: any) => s + (r.peso_corrigido || r.peso_liquido || 0), 0)
    const vlrTotal = filteredRomaneios.reduce((s: number, r: any) => s + calcVlrFrete(r), 0)
    const vlrUnitMedio = volSDescKg > 0 ? (vlrTotal / volSDescKg) * vlrUnitMult(unidadeBI) : 0
    return { totalViagens, volSDescKg, volCDescKg, vlrTotal, vlrUnitMedio }
  }, [filteredRomaneios, calcVlrFrete, unidadeBI])

  // Listas para filtros
  const transportadorasList = useMemo(() => cadastros.filter((c: any) => (c.tipos || []).includes('Transportadora')), [cadastros])
  const motoristasList = useMemo(() => cadastros.filter((c: any) => (c.tipos || []).includes('Motorista')), [cadastros])
  const origensList = useMemo(() => {
    const ids = new Set(romaneios.map((r: any) => r.origem_id).filter(Boolean))
    return cadastros.filter((c: any) => ids.has(c.id))
  }, [cadastros, romaneios])
  const destinosList = useMemo(() => {
    const ids = new Set(romaneios.map((r: any) => r.destinatario_id).filter(Boolean))
    return cadastros.filter((c: any) => ids.has(c.id))
  }, [cadastros, romaneios])
  const placasList = useMemo(() => {
    const ids = new Set(romaneios.map((r: any) => r.veiculo_id).filter(Boolean))
    return veiculos.filter((v: any) => ids.has(v.id))
  }, [veiculos, romaneios])

  // Dados agrupados por visão (transportadora/placa/motorista)
  const tabelaDados = useMemo(() => {
    const mapa: Record<string, { key: string; label: string; viagens: number; volSDesc: number; volCDesc: number; vlrTotal: number }> = {}
    filteredRomaneios.forEach((r: any) => {
      let groupKey = ''
      let groupLabel = ''
      if (viewMode === 'transportadora') {
        groupKey = r.transportadora_id || '_sem'
        groupLabel = r.transportadora_id ? cadNome(r.transportadora_id, cadastros) : 'Sem Transportadora'
      } else if (viewMode === 'placa') {
        const veic = veiculos.find((v: any) => v.id === r.veiculo_id)
        groupKey = r.veiculo_id || '_sem'
        groupLabel = veic?.placa || 'Sem Placa'
      } else {
        groupKey = r.motorista_id || '_sem'
        groupLabel = r.motorista_id ? cadNome(r.motorista_id, cadastros) : 'Sem Motorista'
      }
      if (!mapa[groupKey]) mapa[groupKey] = { key: groupKey, label: groupLabel, viagens: 0, volSDesc: 0, volCDesc: 0, vlrTotal: 0 }
      mapa[groupKey].viagens++
      mapa[groupKey].volSDesc += (r.peso_liquido || 0)
      mapa[groupKey].volCDesc += (r.peso_corrigido || r.peso_liquido || 0)
      mapa[groupKey].vlrTotal += calcVlrFrete(r)
    })
    let arr = Object.values(mapa)
    // Calcular vlrUnitMedio (R$/ton)
    const arrWithUnit = arr.map(item => ({
      ...item,
      vlrUnitMedio: item.volSDesc > 0 ? (item.vlrTotal / item.volSDesc) * vlrUnitMult(unidadeBI) : 0
    }))
    // Ordenação
    if (sortKey && sortDir) {
      arrWithUnit.sort((a: any, b: any) => {
        const va = sortKey === 'label' ? a.label.toLowerCase() : a[sortKey]
        const vb = sortKey === 'label' ? b.label.toLowerCase() : b[sortKey]
        if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
        return sortDir === 'asc' ? va - vb : vb - va
      })
    }
    return arrWithUnit
  }, [filteredRomaneios, viewMode, cadastros, veiculos, calcVlrFrete, sortKey, sortDir, unidadeBI])

  // Dados agrupados por rota (origem → destino)
  const rotasDados = useMemo(() => {
    const mapa: Record<string, { rota: string; origId: string; destId: string; viagens: number; volSDesc: number; volCDesc: number; vlrTotal: number }> = {}
    filteredRomaneios.forEach((r: any) => {
      const origNome = r.origem_id ? cadNome(r.origem_id, cadastros) : 'N/D'
      const destNome = r.destinatario_id ? cadNome(r.destinatario_id, cadastros) : 'N/D'
      const key = `${r.origem_id || ''}_${r.destinatario_id || ''}`
      if (!mapa[key]) mapa[key] = { rota: `${origNome} → ${destNome}`, origId: r.origem_id, destId: r.destinatario_id, viagens: 0, volSDesc: 0, volCDesc: 0, vlrTotal: 0 }
      mapa[key].viagens++
      mapa[key].volSDesc += (r.peso_liquido || 0)
      mapa[key].volCDesc += (r.peso_corrigido || r.peso_liquido || 0)
      mapa[key].vlrTotal += calcVlrFrete(r)
    })
    return Object.values(mapa).sort((a, b) => b.vlrTotal - a.vlrTotal)
  }, [filteredRomaneios, cadastros, calcVlrFrete])

  // Descontos por origem
  const descontosPorOrigem = useMemo(() => {
    const mapa: Record<string, any> = {}
    filteredRomaneios.forEach((r: any) => {
      const origId = r.origem_id || '_sem'
      const origNome = r.origem_id ? cadNome(r.origem_id, cadastros) : 'Sem Origem'
      if (!mapa[origId]) {
        mapa[origId] = { origId, origNome, viagens: 0, pesoLiq: 0, descontoTotal: 0,
          umidade: 0, impureza: 0, avariados: 0, ardidos: 0, esverdeados: 0, partidos: 0, quebrados: 0 }
      }
      mapa[origId].viagens++
      mapa[origId].pesoLiq += (r.peso_liquido || 0)
      mapa[origId].umidade += (r.umidade_desc || 0)
      mapa[origId].impureza += (r.impureza_desc || 0)
      mapa[origId].avariados += (r.avariados_desc || 0)
      mapa[origId].ardidos += (r.ardidos_desc || 0)
      mapa[origId].esverdeados += (r.esverdeados_desc || 0)
      mapa[origId].partidos += (r.partidos_desc || 0)
      mapa[origId].quebrados += (r.quebrados_desc || 0)
      const descTotal = (r.umidade_desc || 0) + (r.impureza_desc || 0) + (r.avariados_desc || 0) + (r.ardidos_desc || 0) + (r.esverdeados_desc || 0) + (r.partidos_desc || 0) + (r.quebrados_desc || 0)
      mapa[origId].descontoTotal += descTotal
    })
    return Object.values(mapa)
      .map((item: any) => ({ ...item, percDesconto: item.pesoLiq > 0 ? (item.descontoTotal / item.pesoLiq) * 100 : 0 }))
      .sort((a: any, b: any) => b.percDesconto - a.percDesconto)
  }, [filteredRomaneios, cadastros])

  // Frete excedente por rota (frete pago por volume não vendável)
  const freteExcedenteDados = useMemo(() => {
    const mapa: Record<string, any> = {}
    filteredRomaneios.forEach((r: any) => {
      const origNome = r.origem_id ? cadNome(r.origem_id, cadastros) : 'N/D'
      const destNome = r.destinatario_id ? cadNome(r.destinatario_id, cadastros) : 'N/D'
      const key = `${r.origem_id || ''}_${r.destinatario_id || ''}`
      if (!mapa[key]) mapa[key] = { rota: `${origNome} \u2192 ${destNome}`, origId: r.origem_id, destId: r.destinatario_id, viagens: 0, volSDesc: 0, volCDesc: 0, volPerdido: 0, fretePago: 0, freteExcedente: 0 }
      const pesoLiq = r.peso_liquido || 0
      const pesoCorr = r.peso_corrigido || r.peso_liquido || 0
      const diff = pesoLiq - pesoCorr
      const vlrUnitKg = calcVlrUnitKg(r)
      mapa[key].viagens++
      mapa[key].volSDesc += pesoLiq
      mapa[key].volCDesc += pesoCorr
      mapa[key].volPerdido += diff
      mapa[key].fretePago += pesoLiq * vlrUnitKg
      mapa[key].freteExcedente += diff * vlrUnitKg
    })
    return Object.values(mapa).sort((a: any, b: any) => b.freteExcedente - a.freteExcedente)
  }, [filteredRomaneios, cadastros, calcVlrUnitKg])

  const totaisFreteExcedente = useMemo(() => {
    const totVolPerdido = freteExcedenteDados.reduce((s: number, r: any) => s + r.volPerdido, 0)
    const totFreteExcedente = freteExcedenteDados.reduce((s: number, r: any) => s + r.freteExcedente, 0)
    const totFretePago = freteExcedenteDados.reduce((s: number, r: any) => s + r.fretePago, 0)
    return { totVolPerdido, totFreteExcedente, totFretePago }
  }, [freteExcedenteDados])

  // Peso transportado por mês
  const pesoMensal = useMemo(() => {
    const mapa: Record<string, { sDesc: number; cDesc: number }> = {}
    filteredRomaneios.forEach((r: any) => {
      const dt = r.data_saida_origem || r.data_emissao || r.created_at
      if (!dt) return
      const d = new Date(dt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!mapa[key]) mapa[key] = { sDesc: 0, cDesc: 0 }
      mapa[key].sDesc += (r.peso_liquido || 0)
      mapa[key].cDesc += (r.peso_corrigido || r.peso_liquido || 0)
    })
    return Object.entries(mapa)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([k, v]) => {
        const [y, m] = k.split('-')
        return { mes: `${MESES[parseInt(m) - 1]}/${y.slice(2)}`, sDesc: Math.round(convertVol(v.sDesc, unidadeBI) * 100) / 100, cDesc: Math.round(convertVol(v.cDesc, unidadeBI) * 100) / 100 }
      })
  }, [filteredRomaneios, unidadeBI])

  // Valor frete mensal
  const freteMensal = useMemo(() => {
    const mapa: Record<string, number> = {}
    filteredRomaneios.forEach((r: any) => {
      const dt = r.data_saida_origem || r.data_emissao || r.created_at
      if (!dt) return
      const d = new Date(dt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      mapa[key] = (mapa[key] || 0) + calcVlrFrete(r)
    })
    return Object.entries(mapa)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([k, v]) => {
        const [y, m] = k.split('-')
        return { mes: `${MESES[parseInt(m) - 1]}/${y.slice(2)}`, valor: Math.round(v * 100) / 100 }
      })
  }, [filteredRomaneios, calcVlrFrete])

  // Peso por produto
  const pesoPorProduto = useMemo(() => {
    const mapa: Record<string, { nome: string; peso: number; id: string | null }> = {}
    filteredRomaneios.forEach((r: any) => {
      const prod = r.produto_id ? produtos.find((p: any) => p.id === r.produto_id) : null
      const nome = prod?.nome || r.produto || 'Outros'
      if (!mapa[nome]) mapa[nome] = { nome, peso: 0, id: prod?.id || null }
      mapa[nome].peso += (r.peso_liquido || 0)
    })
    return Object.values(mapa).sort((a, b) => b.peso - a.peso).slice(0, 8)
      .map(item => ({ name: item.nome, value: Math.round(convertVol(item.peso, unidadeBI) * 100) / 100, id: item.id }))
  }, [filteredRomaneios, produtos, unidadeBI])

  // Tipo de Ticket (usando filteredRomaneios)
  const tipoTicketDados = useMemo(() => {
    const mapa: Record<string, number> = {}
    filteredRomaneios.forEach((r: any) => {
      const tipo = tiposTicket.find(t => t.id === r.tipo_ticket_id)
      const nome = tipo?.nome || 'Sem Tipo'
      mapa[nome] = (mapa[nome] || 0) + 1
    })
    return Object.entries(mapa).map(([k, v]) => ({ name: k, value: v, id: tiposTicket.find(t => t.nome === k)?.id || null }))
  }, [filteredRomaneios, tiposTicket])

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? null : 'asc')
      if (sortDir === 'desc') setSortKey('')
    } else {
      setSortKey(key); setSortDir('desc')
    }
  }

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ArrowUpDown className="w-3 h-3 text-gray-300" />
    if (sortDir === 'asc') return <ArrowUp className="w-3 h-3 text-green-600" />
    return <ArrowDown className="w-3 h-3 text-green-600" />
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            {p.name}: <span className="font-semibold">{p.dataKey === 'valor' ? fmtBRL(p.value) : `${fmtDec(p.value, 2)} ${uLabel}`}</span>
          </p>
        ))}
      </div>
    )
  }

  const FilterSelect = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) => (
    <div className="min-w-[160px]">
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white">
        <option value="">Todos</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )

  const SectionHeader = ({ title, open, toggle, icon: Icon }: { title: string; open: boolean; toggle: () => void; icon: any }) => (
    <button onClick={toggle} className="flex items-center gap-2 mb-3 group">
      {open ? <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-green-600" /> : <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-green-600" />}
      <Icon className="w-4 h-4 text-green-600" />
      <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{title}</h2>
    </button>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        <span className="ml-3 text-gray-500">Carregando BI...</span>
      </div>
    )
  }

  return (
    <div>
      <div className="sticky top-0 z-20 bg-gray-50 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 py-3 mb-4 border-b border-gray-200 shadow-sm flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">BI Fretes</h1>
        <div className="flex items-center gap-2">
          {/* Seletor de unidade */}
          <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden">
            {(['kg', 'sc', 'tn'] as UnitMode[]).map(u => (
              <button key={u} onClick={() => setUnidadeBI(u)}
                className={`px-3 py-2 text-xs font-bold uppercase transition-colors ${unidadeBI === u ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                {UNIT_LABELS[u]}
              </button>
            ))}
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${activeFiltersCount > 0 ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            <Filter className="w-4 h-4" />
            Filtros {activeFiltersCount > 0 && <span className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{activeFiltersCount}</span>}
          </button>
          {activeFiltersCount > 0 && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 border border-red-200">
              <X className="w-3 h-3" /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* Filtros Ativos (estilo Power BI) */}
      {activeFiltersCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-blue-700 uppercase">Filtros Ativos:</span>
            {filtroAnoSafra && (
              <div className="flex items-center gap-1 bg-white border border-blue-300 rounded-full px-3 py-1 text-xs font-medium text-blue-800">
                <span>Ano Safra: {anosSafra.find(a => a.id === filtroAnoSafra)?.nome}</span>
                <button onClick={() => setFiltroAnoSafra('')} className="ml-1 hover:bg-blue-100 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </div>
            )}
            {filtroSafra && (
              <div className="flex items-center gap-1 bg-white border border-blue-300 rounded-full px-3 py-1 text-xs font-medium text-blue-800">
                <span>Safra: {safras.find(s => s.id === filtroSafra)?.nome}</span>
                <button onClick={() => setFiltroSafra('')} className="ml-1 hover:bg-blue-100 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </div>
            )}
            {filtroProduto && (
              <div className="flex items-center gap-1 bg-white border border-blue-300 rounded-full px-3 py-1 text-xs font-medium text-blue-800">
                <span>Produto: {produtos.find(p => p.id === filtroProduto)?.nome}</span>
                <button onClick={() => setFiltroProduto('')} className="ml-1 hover:bg-blue-100 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </div>
            )}
            {filtroOrigem && (
              <div className="flex items-center gap-1 bg-white border border-blue-300 rounded-full px-3 py-1 text-xs font-medium text-blue-800">
                <span>Origem: {cadNome(filtroOrigem, cadastros)}</span>
                <button onClick={() => setFiltroOrigem('')} className="ml-1 hover:bg-blue-100 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </div>
            )}
            {filtroDestino && (
              <div className="flex items-center gap-1 bg-white border border-blue-300 rounded-full px-3 py-1 text-xs font-medium text-blue-800">
                <span>Destino: {cadNome(filtroDestino, cadastros)}</span>
                <button onClick={() => setFiltroDestino('')} className="ml-1 hover:bg-blue-100 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </div>
            )}
            {filtroTransportadora && (
              <div className="flex items-center gap-1 bg-white border border-blue-300 rounded-full px-3 py-1 text-xs font-medium text-blue-800">
                <span>Transportadora: {cadNome(filtroTransportadora, cadastros)}</span>
                <button onClick={() => setFiltroTransportadora('')} className="ml-1 hover:bg-blue-100 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </div>
            )}
            {filtroMotorista && (
              <div className="flex items-center gap-1 bg-white border border-blue-300 rounded-full px-3 py-1 text-xs font-medium text-blue-800">
                <span>Motorista: {cadNome(filtroMotorista, cadastros)}</span>
                <button onClick={() => setFiltroMotorista('')} className="ml-1 hover:bg-blue-100 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </div>
            )}
            {filtroPlaca && (
              <div className="flex items-center gap-1 bg-white border border-blue-300 rounded-full px-3 py-1 text-xs font-medium text-blue-800">
                <span>Placa: {filtroPlaca}</span>
                <button onClick={() => setFiltroPlaca('')} className="ml-1 hover:bg-blue-100 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </div>
            )}
            {filtroTipoTicket && (
              <div className="flex items-center gap-1 bg-white border border-blue-300 rounded-full px-3 py-1 text-xs font-medium text-blue-800">
                <span>Tipo Ticket: {tiposTicket.find(t => t.id === filtroTipoTicket)?.nome}</span>
                <button onClick={() => setFiltroTipoTicket('')} className="ml-1 hover:bg-blue-100 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </div>
            )}
            <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors">
              <X className="w-3 h-3" /> Limpar Tudo
            </button>
          </div>
        </div>
      )}

      {/* Painel de filtros */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 animate-in fade-in">
          <div className="flex flex-wrap gap-3">
            <FilterSelect label="Ano Safra" value={filtroAnoSafra} onChange={setFiltroAnoSafra}
              options={anosSafra.map(a => ({ value: a.id, label: a.nome }))} />
            <FilterSelect label="Safra" value={filtroSafra} onChange={setFiltroSafra}
              options={safras.filter(s => !filtroAnoSafra || s.ano_safra_id === filtroAnoSafra).map(s => ({ value: s.id, label: s.nome }))} />
            <FilterSelect label="Produto" value={filtroProduto} onChange={setFiltroProduto}
              options={produtos.map(p => ({ value: p.id, label: p.nome }))} />
            <FilterSelect label="Origem" value={filtroOrigem} onChange={setFiltroOrigem}
              options={origensList.map(c => ({ value: c.id, label: c.nome_fantasia || c.nome }))} />
            <FilterSelect label="Destino" value={filtroDestino} onChange={setFiltroDestino}
              options={destinosList.map(c => ({ value: c.id, label: c.nome_fantasia || c.nome }))} />
            <FilterSelect label="Transportadora" value={filtroTransportadora} onChange={setFiltroTransportadora}
              options={transportadorasList.map(c => ({ value: c.id, label: c.nome_fantasia || c.nome }))} />
            <FilterSelect label="Motorista" value={filtroMotorista} onChange={setFiltroMotorista}
              options={motoristasList.map(c => ({ value: c.id, label: c.nome }))} />
            <FilterSelect label="Placa" value={filtroPlaca} onChange={v => setFiltroPlaca(v)}
              options={placasList.map(v => ({ value: v.placa, label: v.placa }))} />
            <FilterSelect label="Tipo Ticket" value={filtroTipoTicket} onChange={setFiltroTipoTicket}
              options={tiposTicket.map(t => ({ value: t.id, label: t.nome }))} />
          </div>
        </div>
      )}

      {/* Cards KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Total Viagens</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{fmtInt(kpis.totalViagens)}</p>
            </div>
            <div className="bg-teal-500 p-2.5 rounded-lg"><FileText className="w-5 h-5 text-white" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Vol. s/Desc ({uLabel})</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{fmtVol(kpis.volSDescKg, unidadeBI)}</p>
            </div>
            <div className="bg-green-600 p-2.5 rounded-lg"><Scale className="w-5 h-5 text-white" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Vol. c/Desc ({uLabel})</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{fmtVol(kpis.volCDescKg, unidadeBI)}</p>
            </div>
            <div className="bg-blue-600 p-2.5 rounded-lg"><TrendingUp className="w-5 h-5 text-white" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Vlr Unit Médio (R$/{uLabel})</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{fmtBRL(kpis.vlrUnitMedio)}</p>
            </div>
            <div className="bg-orange-500 p-2.5 rounded-lg"><DollarSign className="w-5 h-5 text-white" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-shadow col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Vlr Total a Pagar</p>
              <p className="text-2xl font-bold text-red-700 mt-1">{fmtBRL(kpis.vlrTotal)}</p>
            </div>
            <div className="bg-red-600 p-2.5 rounded-lg"><Truck className="w-5 h-5 text-white" /></div>
          </div>
        </div>
      </div>

      {/* Seção: Gráficos */}
      <SectionHeader title="Gráficos" open={secaoGraficos} toggle={() => setSecaoGraficos(!secaoGraficos)} icon={BarChart3} />
      {secaoGraficos && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Volume transportado por mês */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Volume Transportado por Mês ({uLabel})</h3>
              {pesoMensal.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={pesoMensal}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="sDesc" name={`s/Desc (${uLabel})`} fill="#16a34a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cDesc" name={`c/Desc (${uLabel})`} fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-400 text-sm text-center py-12">Sem dados</p>}
            </div>

            {/* Valor frete mensal */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Valor Frete por Mês</h3>
              {freteMensal.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={freteMensal}>
                    <defs>
                      <linearGradient id="colorFrete" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$ ${fmtInt(v)}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="valor" name="Frete" stroke="#16a34a" fill="url(#colorFrete)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-400 text-sm text-center py-12">Sem dados</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Peso por produto */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Volume por Produto ({uLabel})</h3>
              {pesoPorProduto.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={pesoPorProduto} cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={2} dataKey="value"
                      label={({ name, value }) => `${name}: ${fmtDec(value, 2)}`}
                      onClick={(data: any) => { if (data.id) { setFiltroProduto(data.id); setShowFilters(true) } }}>
                      {pesoPorProduto.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} className="cursor-pointer hover:opacity-80" />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => `${fmtDec(v, 2)} ${uLabel}`} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-400 text-sm text-center py-12">Sem dados</p>}
            </div>

            {/* Tipo Ticket */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Tipo Ticket</h3>
              {tipoTicketDados.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={tipoTicketDados} cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3} dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      onClick={(data: any) => { if (data.id) { setFiltroTipoTicket(data.id); setShowFilters(true) } }}>
                      {tipoTicketDados.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} className="cursor-pointer hover:opacity-80" />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-400 text-sm text-center py-12">Sem dados</p>}
            </div>
          </div>
        </>
      )}

      {/* Seção: Tabela analítica por Transportadora/Placa/Motorista */}
      <SectionHeader title="Análise por Transportadora / Placa / Motorista" open={secaoTabela} toggle={() => setSecaoTabela(!secaoTabela)} icon={Truck} />
      {secaoTabela && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
          {/* Tabs de visão */}
          <div className="flex border-b border-gray-200">
            {([['transportadora', 'Transportadora'], ['placa', 'Placa'], ['motorista', 'Motorista']] as [ViewMode, string][]).map(([key, label]) => (
              <button key={key} onClick={() => setViewMode(key)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${viewMode === key ? 'text-green-700 border-b-2 border-green-600 bg-green-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100" onClick={() => toggleSort('label')}>
                    <div className="flex items-center gap-1">{viewMode === 'transportadora' ? 'Transportadora' : viewMode === 'placa' ? 'Placa' : 'Motorista'} <SortIcon colKey="label" /></div>
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100" onClick={() => toggleSort('viagens')}>
                    <div className="flex items-center gap-1 justify-end">Viagens <SortIcon colKey="viagens" /></div>
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100" onClick={() => toggleSort('volSDesc')}>
                    <div className="flex items-center gap-1 justify-end">Vol. s/Desc ({uLabel}) <SortIcon colKey="volSDesc" /></div>
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100" onClick={() => toggleSort('volCDesc')}>
                    <div className="flex items-center gap-1 justify-end">Vol. c/Desc ({uLabel}) <SortIcon colKey="volCDesc" /></div>
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100" onClick={() => toggleSort('vlrUnitMedio')}>
                    <div className="flex items-center gap-1 justify-end">Vlr Unit (R$/{uLabel}) <SortIcon colKey="vlrUnitMedio" /></div>
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100" onClick={() => toggleSort('vlrTotal')}>
                    <div className="flex items-center gap-1 justify-end">Vlr Total <SortIcon colKey="vlrTotal" /></div>
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">%</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tabelaDados.map((row) => (
                  <tr key={row.key} className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      if (viewMode === 'transportadora' && row.key !== '_sem') { setFiltroTransportadora(row.key); setShowFilters(true) }
                      if (viewMode === 'motorista' && row.key !== '_sem') { setFiltroMotorista(row.key); setShowFilters(true) }
                      if (viewMode === 'placa' && row.key !== '_sem') {
                        const veic = veiculos.find(v => v.id === row.key)
                        if (veic) { setFiltroPlaca(veic.placa); setShowFilters(true) }
                      }
                    }}>
                    <td className="px-4 py-3 font-medium text-gray-800">{row.label}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmtInt(row.viagens)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmtVol(row.volSDesc, unidadeBI)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmtVol(row.volCDesc, unidadeBI)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmtBRL(row.vlrUnitMedio)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">{fmtBRL(row.vlrTotal)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{kpis.vlrTotal > 0 ? fmtDec((row.vlrTotal / kpis.vlrTotal) * 100, 1) + '%' : '-'}</td>
                  </tr>
                ))}
                {tabelaDados.length > 0 && (
                  <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                    <td className="px-4 py-3 text-gray-800">TOTAL</td>
                    <td className="px-4 py-3 text-right text-gray-800">{fmtInt(tabelaDados.reduce((s, r) => s + r.viagens, 0))}</td>
                    <td className="px-4 py-3 text-right text-gray-800">{fmtVol(tabelaDados.reduce((s, r) => s + r.volSDesc, 0), unidadeBI)}</td>
                    <td className="px-4 py-3 text-right text-gray-800">{fmtVol(tabelaDados.reduce((s, r) => s + r.volCDesc, 0), unidadeBI)}</td>
                    <td className="px-4 py-3 text-right text-gray-800">{fmtBRL(kpis.vlrUnitMedio)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{fmtBRL(tabelaDados.reduce((s, r) => s + r.vlrTotal, 0))}</td>
                    <td className="px-4 py-3 text-right text-gray-800">100%</td>
                  </tr>
                )}
              </tbody>
            </table>
            {tabelaDados.length === 0 && <p className="text-gray-400 text-sm text-center py-8">Sem dados para os filtros selecionados</p>}
          </div>
        </div>
      )}

      {/* Seção: Análise por Rota (Origem → Destino) */}
      <SectionHeader title="Análise por Rota (Origem → Destino)" open={secaoRotas} toggle={() => setSecaoRotas(!secaoRotas)} icon={MapPin} />
      {secaoRotas && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Rota</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Viagens</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Vol. s/Desc ({uLabel})</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Vol. c/Desc ({uLabel})</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Vlr Total</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">%</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rotasDados.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      if (row.origId) setFiltroOrigem(row.origId)
                      if (row.destId) setFiltroDestino(row.destId)
                      setShowFilters(true)
                    }}>
                    <td className="px-4 py-3 font-medium text-gray-800">{row.rota}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmtInt(row.viagens)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmtVol(row.volSDesc, unidadeBI)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmtVol(row.volCDesc, unidadeBI)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">{fmtBRL(row.vlrTotal)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{kpis.vlrTotal > 0 ? fmtDec((row.vlrTotal / kpis.vlrTotal) * 100, 1) + '%' : '-'}</td>
                  </tr>
                ))}
                {rotasDados.length > 0 && (
                  <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                    <td className="px-4 py-3 text-gray-800">TOTAL</td>
                    <td className="px-4 py-3 text-right text-gray-800">{fmtInt(rotasDados.reduce((s, r) => s + r.viagens, 0))}</td>
                    <td className="px-4 py-3 text-right text-gray-800">{fmtVol(rotasDados.reduce((s, r) => s + r.volSDesc, 0), unidadeBI)}</td>
                    <td className="px-4 py-3 text-right text-gray-800">{fmtVol(rotasDados.reduce((s, r) => s + r.volCDesc, 0), unidadeBI)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{fmtBRL(rotasDados.reduce((s, r) => s + r.vlrTotal, 0))}</td>
                    <td className="px-4 py-3 text-right text-gray-800">100%</td>
                  </tr>
                )}
              </tbody>
            </table>
            {rotasDados.length === 0 && <p className="text-gray-400 text-sm text-center py-8">Sem dados para os filtros selecionados</p>}
          </div>
        </div>
      )}

      {/* Seção: Análise de Descontos por Origem */}
      <SectionHeader title="Análise de Descontos por Origem" open={secaoDescontos} toggle={() => setSecaoDescontos(!secaoDescontos)} icon={Droplets} />
      {secaoDescontos && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-3 font-semibold text-gray-600">Origem</th>
                  <th className="text-right px-3 py-3 font-semibold text-gray-600">Viagens</th>
                  <th className="text-right px-3 py-3 font-semibold text-gray-600">P.Líq ({uLabel})</th>
                  <th className="text-right px-3 py-3 font-semibold text-gray-600">Desc Total ({uLabel})</th>
                  <th className="text-right px-3 py-3 font-semibold text-gray-600">% Desc</th>
                  {DESCONTOS_COLS.map(d => (
                    <th key={d.key} className="text-right px-2 py-3 font-semibold text-gray-600 text-xs">{d.label} ({uLabel})</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {descontosPorOrigem.map((row: any) => (
                  <tr key={row.origId} className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => { if (row.origId !== '_sem') { setFiltroOrigem(row.origId); setShowFilters(true) } }}>
                    <td className="px-3 py-2.5 font-medium text-gray-800">{row.origNome}</td>
                    <td className="px-3 py-2.5 text-right text-gray-700">{fmtInt(row.viagens)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-700">{fmtVol(row.pesoLiq, unidadeBI)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-red-600">{fmtVol(row.descontoTotal, unidadeBI)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${row.percDesconto > 5 ? 'bg-red-100 text-red-700' : row.percDesconto > 2 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {fmtDec(row.percDesconto, 2)}%
                      </span>
                    </td>
                    {DESCONTOS_COLS.map(d => (
                      <td key={d.key} className="px-2 py-2.5 text-right text-gray-600 text-xs">{fmtVol(row[d.key], unidadeBI)}</td>
                    ))}
                  </tr>
                ))}
                {descontosPorOrigem.length > 0 && (
                  <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                    <td className="px-3 py-2.5 text-gray-800">TOTAL</td>
                    <td className="px-3 py-2.5 text-right text-gray-800">{fmtInt(descontosPorOrigem.reduce((s: number, r: any) => s + r.viagens, 0))}</td>
                    <td className="px-3 py-2.5 text-right text-gray-800">{fmtVol(descontosPorOrigem.reduce((s: number, r: any) => s + r.pesoLiq, 0), unidadeBI)}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-red-600">{fmtVol(descontosPorOrigem.reduce((s: number, r: any) => s + r.descontoTotal, 0), unidadeBI)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {(() => {
                        const totPeso = descontosPorOrigem.reduce((s: number, r: any) => s + r.pesoLiq, 0)
                        const totDesc = descontosPorOrigem.reduce((s: number, r: any) => s + r.descontoTotal, 0)
                        return <span className="text-xs font-bold">{totPeso > 0 ? fmtDec((totDesc / totPeso) * 100, 2) + '%' : '-'}</span>
                      })()}
                    </td>
                    {DESCONTOS_COLS.map(d => (
                      <td key={d.key} className="px-2 py-2.5 text-right text-gray-800 text-xs font-bold">
                        {fmtVol(descontosPorOrigem.reduce((s: number, r: any) => s + r[d.key], 0), unidadeBI)}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
            {descontosPorOrigem.length === 0 && <p className="text-gray-400 text-sm text-center py-8">Sem dados</p>}
          </div>
        </div>
      )}

      {/* Seção: Frete Excedente (pago por volume não vendável) */}
      <SectionHeader title="Frete Excedente — Custo do Volume Não Vendável" open={secaoFreteExcedente} toggle={() => setSecaoFreteExcedente(!secaoFreteExcedente)} icon={AlertTriangle} />
      {secaoFreteExcedente && (
        <>
          {/* Mini-cards do frete excedente */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-xs text-red-600 font-medium">Volume Perdido (s/Desc - c/Desc)</p>
              <p className="text-xl font-bold text-red-700 mt-1">{fmtVol(totaisFreteExcedente.totVolPerdido, unidadeBI)} <span className="text-sm font-normal">{uLabel}</span></p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-xs text-red-600 font-medium">Frete Pago pelo Volume Perdido</p>
              <p className="text-xl font-bold text-red-700 mt-1">{fmtBRL(totaisFreteExcedente.totFreteExcedente)}</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <p className="text-xs text-orange-600 font-medium">% do Frete Total</p>
              <p className="text-xl font-bold text-orange-700 mt-1">
                {totaisFreteExcedente.totFretePago > 0 ? fmtDec((totaisFreteExcedente.totFreteExcedente / totaisFreteExcedente.totFretePago) * 100, 2) + '%' : '-'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Rota (Origem → Destino)</th>
                    <th className="text-right px-3 py-3 font-semibold text-gray-600">Viagens</th>
                    <th className="text-right px-3 py-3 font-semibold text-gray-600">Vol. s/Desc ({uLabel})</th>
                    <th className="text-right px-3 py-3 font-semibold text-gray-600">Vol. c/Desc ({uLabel})</th>
                    <th className="text-right px-3 py-3 font-semibold text-red-600">Vol. Perdido ({uLabel})</th>
                    <th className="text-right px-3 py-3 font-semibold text-gray-600">Frete Pago</th>
                    <th className="text-right px-3 py-3 font-semibold text-red-600">Frete Excedente</th>
                    <th className="text-right px-3 py-3 font-semibold text-gray-600">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {freteExcedenteDados.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        if (row.origId) setFiltroOrigem(row.origId)
                        if (row.destId) setFiltroDestino(row.destId)
                        setShowFilters(true)
                      }}>
                      <td className="px-4 py-2.5 font-medium text-gray-800">{row.rota}</td>
                      <td className="px-3 py-2.5 text-right text-gray-700">{fmtInt(row.viagens)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-700">{fmtVol(row.volSDesc, unidadeBI)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-700">{fmtVol(row.volCDesc, unidadeBI)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-red-600">{fmtVol(row.volPerdido, unidadeBI)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-700">{fmtBRL(row.fretePago)}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-red-700">{fmtBRL(row.freteExcedente)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-500">{row.fretePago > 0 ? fmtDec((row.freteExcedente / row.fretePago) * 100, 1) + '%' : '-'}</td>
                    </tr>
                  ))}
                  {freteExcedenteDados.length > 0 && (
                    <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                      <td className="px-4 py-2.5 text-gray-800">TOTAL</td>
                      <td className="px-3 py-2.5 text-right text-gray-800">{fmtInt(freteExcedenteDados.reduce((s: number, r: any) => s + r.viagens, 0))}</td>
                      <td className="px-3 py-2.5 text-right text-gray-800">{fmtVol(freteExcedenteDados.reduce((s: number, r: any) => s + r.volSDesc, 0), unidadeBI)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-800">{fmtVol(freteExcedenteDados.reduce((s: number, r: any) => s + r.volCDesc, 0), unidadeBI)}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-red-600">{fmtVol(totaisFreteExcedente.totVolPerdido, unidadeBI)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-800">{fmtBRL(totaisFreteExcedente.totFretePago)}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-red-700">{fmtBRL(totaisFreteExcedente.totFreteExcedente)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-800">{totaisFreteExcedente.totFretePago > 0 ? fmtDec((totaisFreteExcedente.totFreteExcedente / totaisFreteExcedente.totFretePago) * 100, 1) + '%' : '-'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              {freteExcedenteDados.length === 0 && <p className="text-gray-400 text-sm text-center py-8">Sem dados</p>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Plus, Pencil, Trash2, X, ClipboardCheck, ArrowUp, ArrowDown, ArrowUpDown, Eye, Calculator } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getRomaneiosArmazem, createRomaneioArmazem, updateRomaneioArmazem, deleteRomaneioArmazem,
  getUnidadesArmazenadoras, getEstruturasByUnidade, getProdutos, getCadastros, getVeiculos,
  getAnosSafra, getSafras, getTabelasDescontoPorProduto, getFaixasDesconto, getRomaneios,
} from '../../services/api'
import { fmtInt, fmtDec, fmtData } from '../../utils/format'
import SearchableSelect from '../../components/SearchableSelect'
import Pagination from '../../components/Pagination'

type SortDir = 'asc' | 'desc'

const fmtKg = (v: number | null | undefined): string => {
  if (v === null || v === undefined) return ''
  return Math.round(v).toLocaleString('pt-BR')
}

const fmtPerc = (v: number | null | undefined): string => {
  if (v === null || v === undefined) return ''
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const parseNum = (v: string): number | null => {
  if (!v) return null
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}

export default function RomaneioEntrada() {
  const [romaneios, setRomaneios] = useState<any[]>([])
  const [unidades, setUnidades] = useState<any[]>([])
  const [estruturas, setEstruturas] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [cadastros, setCadastros] = useState<any[]>([])
  const [veiculos, setVeiculos] = useState<any[]>([])
  const [anosSafra, setAnosSafra] = useState<any[]>([])
  const [safras, setSafras] = useState<any[]>([])
  const [romaneiosFrete, setRomaneiosFrete] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [showView, setShowView] = useState<any | null>(null)
  const [sort, setSort] = useState<{ col: string; dir: SortDir }>({ col: 'created_at', dir: 'desc' })

  const [form, setForm] = useState<any>({
    unidade_id: '', estrutura_id: '', depositante_id: '', produto_id: '',
    safra_id: '', ano_safra_id: '', transportadora_id: '', motorista_id: '',
    veiculo_id: '', placa: '', nfe_numero: '', nfe_serie: '', data_emissao: '',
    peso_bruto: '', tara: '', umidade_perc: '', impureza_perc: '', avariados_perc: '',
    ardidos_perc: '', esverdeados_perc: '', partidos_perc: '', quebrados_perc: '',
    transgenia: '', observacoes: '', status: 'recebido',
    romaneio_frete_id: '',
  })

  const romaneioFreteOpts = useMemo(() => romaneiosFrete.map((r: any) => ({
    value: r.id,
    label: `#${r.numero_romaneio || '-'} — ${r.ordem_nome || 'S/Ordem'} — ${r.placa || 'S/Placa'} — ${fmtKg(r.peso_liquido)} kg`,
  })), [romaneiosFrete])

  // Descontos calculados (display only)
  const [descontos, setDescontos] = useState({
    peso_liquido: 0, umidade_desc: 0, impureza_desc: 0, avariados_desc: 0, ardidos_desc: 0,
    esverdeados_desc: 0, partidos_desc: 0, quebrados_desc: 0, desconto_total: 0, peso_corrigido: 0,
  })

  // Tabelas de desconto carregadas para o produto selecionado
  const [tabelasDesc, setTabelasDesc] = useState<any[]>([])
  const [faixasMap, setFaixasMap] = useState<Record<string, any[]>>({})

  const load = async () => {
    setLoading(true)
    try {
      const [r, u, p, c, v, a, s, rf] = await Promise.all([
        getRomaneiosArmazem('entrada'), getUnidadesArmazenadoras(), getProdutos(),
        getCadastros(), getVeiculos(), getAnosSafra(), getSafras(), getRomaneios(),
      ])
      setRomaneios(r)
      setUnidades(u)
      setProdutos(p)
      setCadastros(c)
      setVeiculos(v)
      setAnosSafra(a)
      setSafras(s)
      setRomaneiosFrete(rf)
    } catch (e: any) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Carregar estruturas quando unidade muda
  useEffect(() => {
    if (form.unidade_id) {
      getEstruturasByUnidade(form.unidade_id).then(setEstruturas).catch(() => setEstruturas([]))
    } else {
      setEstruturas([])
    }
  }, [form.unidade_id])

  // Carregar tabelas de desconto quando produto muda
  useEffect(() => {
    if (form.produto_id) {
      getTabelasDescontoPorProduto(form.produto_id).then(async (tabelas) => {
        setTabelasDesc(tabelas)
        const map: Record<string, any[]> = {}
        for (const t of tabelas) {
          const faixas = await getFaixasDesconto(t.id)
          map[t.tipo_desconto] = faixas
        }
        setFaixasMap(map)
      }).catch(() => { setTabelasDesc([]); setFaixasMap({}) })
    } else {
      setTabelasDesc([])
      setFaixasMap({})
    }
  }, [form.produto_id])

  // Calcular descontos automaticamente
  const calcularDescontos = useCallback(() => {
    const pesoBruto = parseNum(form.peso_bruto) || 0
    const tara = parseNum(form.tara) || 0
    const pesoLiquido = pesoBruto - tara

    const calcDesc = (tipo: string, percField: string): number => {
      const perc = parseNum(form[percField])
      if (perc === null || perc === undefined) return 0
      const faixas = faixasMap[tipo]
      if (!faixas || faixas.length === 0) return 0

      // Encontrar tabela correspondente
      const tabela = tabelasDesc.find(t => t.tipo_desconto === tipo)
      const baseIsenta = tabela?.base_isenta || 0

      if (perc <= baseIsenta) return 0

      // Interpolar na tabela de faixas
      let descPerc = 0
      const sorted = [...faixas].sort((a, b) => a.grau - b.grau)
      
      if (perc <= sorted[0].grau) {
        descPerc = sorted[0].desconto
      } else if (perc >= sorted[sorted.length - 1].grau) {
        descPerc = sorted[sorted.length - 1].desconto
      } else {
        for (let i = 0; i < sorted.length - 1; i++) {
          if (perc >= sorted[i].grau && perc <= sorted[i + 1].grau) {
            const ratio = (perc - sorted[i].grau) / (sorted[i + 1].grau - sorted[i].grau)
            descPerc = sorted[i].desconto + ratio * (sorted[i + 1].desconto - sorted[i].desconto)
            break
          }
        }
      }

      return pesoLiquido * (descPerc / 100)
    }

    const umidade_desc = calcDesc('umidade', 'umidade_perc')
    const impureza_desc = calcDesc('impureza', 'impureza_perc')
    const avariados_desc = calcDesc('avariados', 'avariados_perc')
    const ardidos_desc = calcDesc('ardidos', 'ardidos_perc')
    const esverdeados_desc = calcDesc('esverdeados', 'esverdeados_perc')
    const partidos_desc = calcDesc('partidos', 'partidos_perc')
    const quebrados_desc = calcDesc('quebrados', 'quebrados_perc')

    const desconto_total = umidade_desc + impureza_desc + avariados_desc + ardidos_desc + esverdeados_desc + partidos_desc + quebrados_desc
    const peso_corrigido = pesoLiquido - desconto_total

    setDescontos({
      peso_liquido: pesoLiquido, umidade_desc, impureza_desc, avariados_desc, ardidos_desc,
      esverdeados_desc, partidos_desc, quebrados_desc, desconto_total, peso_corrigido,
    })
  }, [form.peso_bruto, form.tara, form.umidade_perc, form.impureza_perc, form.avariados_perc, form.ardidos_perc, form.esverdeados_perc, form.partidos_perc, form.quebrados_perc, faixasMap, tabelasDesc])

  useEffect(() => { calcularDescontos() }, [calcularDescontos])

  const depositanteOpts = useMemo(() => cadastros.map(c => ({ value: c.id, label: c.nome_fantasia || c.nome })), [cadastros])
  const transportadoraOpts = useMemo(() => cadastros.filter(c => (c.tipos || []).includes('Transportadora')).map(c => ({ value: c.id, label: c.nome_fantasia || c.nome })), [cadastros])
  const motoristaOpts = useMemo(() => cadastros.filter(c => (c.tipos || []).includes('Motorista')).map(c => ({ value: c.id, label: c.nome_fantasia || c.nome })), [cadastros])
  const veiculoOpts = useMemo(() => veiculos.map(v => ({ value: v.id, label: `${v.placa} - ${v.proprietario_nome || ''}` })), [veiculos])

  const openCreate = () => {
    setEditId(null)
    setForm({
      unidade_id: unidades[0]?.id || '', estrutura_id: '', depositante_id: '', produto_id: '',
      safra_id: '', ano_safra_id: '', transportadora_id: '', motorista_id: '',
      veiculo_id: '', placa: '', nfe_numero: '', nfe_serie: '', data_emissao: new Date().toISOString().split('T')[0],
      peso_bruto: '', tara: '', umidade_perc: '', impureza_perc: '', avariados_perc: '',
      ardidos_perc: '', esverdeados_perc: '', partidos_perc: '', quebrados_perc: '',
      transgenia: '', observacoes: '', status: 'recebido',
      romaneio_frete_id: '',
    })
    setShowModal(true)
  }

  const openEdit = (r: any) => {
    setEditId(r.id)
    setForm({
      unidade_id: r.unidade_id || '', estrutura_id: r.estrutura_id || '', depositante_id: r.depositante_id || '',
      produto_id: r.produto_id || '', safra_id: r.safra_id || '', ano_safra_id: r.ano_safra_id || '',
      transportadora_id: r.transportadora_id || '', motorista_id: r.motorista_id || '',
      veiculo_id: r.veiculo_id || '', placa: r.placa || '', nfe_numero: r.nfe_numero || '', nfe_serie: r.nfe_serie || '',
      data_emissao: r.data_emissao || '',
      peso_bruto: r.peso_bruto ? String(r.peso_bruto) : '', tara: r.tara ? String(r.tara) : '',
      umidade_perc: r.umidade_perc != null ? String(r.umidade_perc).replace('.', ',') : '',
      impureza_perc: r.impureza_perc != null ? String(r.impureza_perc).replace('.', ',') : '',
      avariados_perc: r.avariados_perc != null ? String(r.avariados_perc).replace('.', ',') : '',
      ardidos_perc: r.ardidos_perc != null ? String(r.ardidos_perc).replace('.', ',') : '',
      esverdeados_perc: r.esverdeados_perc != null ? String(r.esverdeados_perc).replace('.', ',') : '',
      partidos_perc: r.partidos_perc != null ? String(r.partidos_perc).replace('.', ',') : '',
      quebrados_perc: r.quebrados_perc != null ? String(r.quebrados_perc).replace('.', ',') : '',
      transgenia: r.transgenia || '', observacoes: r.observacoes || '', status: r.status || 'recebido',
      romaneio_frete_id: r.romaneio_frete_id || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.unidade_id) return toast.error('Unidade é obrigatória')
    if (!form.depositante_id) return toast.error('Depositante é obrigatório')
    if (!form.produto_id) return toast.error('Produto é obrigatório')
    try {
      const payload: any = {
        tipo: 'entrada',
        unidade_id: form.unidade_id,
        estrutura_id: form.estrutura_id || null,
        depositante_id: form.depositante_id,
        produto_id: form.produto_id,
        safra_id: form.safra_id || null,
        ano_safra_id: form.ano_safra_id || null,
        transportadora_id: form.transportadora_id || null,
        motorista_id: form.motorista_id || null,
        veiculo_id: form.veiculo_id || null,
        placa: form.placa || null,
        nfe_numero: form.nfe_numero || null,
        nfe_serie: form.nfe_serie || null,
        data_emissao: form.data_emissao || null,
        peso_bruto: parseNum(form.peso_bruto),
        tara: parseNum(form.tara),
        peso_liquido: descontos.peso_liquido,
        umidade_perc: parseNum(form.umidade_perc),
        impureza_perc: parseNum(form.impureza_perc),
        avariados_perc: parseNum(form.avariados_perc),
        ardidos_perc: parseNum(form.ardidos_perc),
        esverdeados_perc: parseNum(form.esverdeados_perc),
        partidos_perc: parseNum(form.partidos_perc),
        quebrados_perc: parseNum(form.quebrados_perc),
        transgenia: form.transgenia || null,
        umidade_desc: descontos.umidade_desc,
        impureza_desc: descontos.impureza_desc,
        avariados_desc: descontos.avariados_desc,
        ardidos_desc: descontos.ardidos_desc,
        esverdeados_desc: descontos.esverdeados_desc,
        partidos_desc: descontos.partidos_desc,
        quebrados_desc: descontos.quebrados_desc,
        desconto_total: descontos.desconto_total,
        peso_corrigido: descontos.peso_corrigido,
        status: form.status,
        observacoes: form.observacoes || null,
        data_hora_entrada: new Date().toISOString(),
        romaneio_frete_id: form.romaneio_frete_id || null,
      }
      if (editId) {
        await updateRomaneioArmazem(editId, payload)
        toast.success('Romaneio atualizado')
      } else {
        await createRomaneioArmazem(payload)
        toast.success('Romaneio de entrada criado')
      }
      setShowModal(false)
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este romaneio?')) return
    try {
      await deleteRomaneioArmazem(id)
      toast.success('Romaneio excluído')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const sorted = useMemo(() => {
    const arr = [...romaneios]
    arr.sort((a: any, b: any) => {
      const va = a[sort.col], vb = b[sort.col]
      if (sort.col === 'created_at' || sort.col === 'data_emissao') {
        return sort.dir === 'asc' ? String(va || '').localeCompare(String(vb || '')) : String(vb || '').localeCompare(String(va || ''))
      }
      if (typeof va === 'number' && typeof vb === 'number') return sort.dir === 'asc' ? va - vb : vb - va
      return sort.dir === 'asc' ? String(va || '').localeCompare(String(vb || '')) : String(vb || '').localeCompare(String(va || ''))
    })
    return arr
  }, [romaneios, sort])

  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize)

  const SortHeader = ({ label, col }: { label: string; col: string }) => (
    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap"
      onClick={() => setSort({ col, dir: sort.col === col && sort.dir === 'asc' ? 'desc' : 'asc' })}>
      <span className="flex items-center gap-1">
        {label}
        {sort.col === col ? (sort.dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
      </span>
    </th>
  )

  const statusColor = (s: string) => {
    if (s === 'recebido') return 'bg-green-100 text-green-700'
    if (s === 'classificando') return 'bg-yellow-100 text-yellow-700'
    if (s === 'cancelado') return 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-700'
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2"><ClipboardCheck className="w-6 h-6 text-amber-600" /> Romaneios de Entrada</h1>
        <button onClick={openCreate} className="flex items-center gap-1 bg-amber-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-amber-700">
          <Plus className="w-4 h-4" /> Novo Romaneio
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-gray-50">
            <SortHeader label="#" col="numero_romaneio" />
            <SortHeader label="Data" col="data_emissao" />
            <SortHeader label="Depositante" col="depositante_nome" />
            <SortHeader label="Produto" col="produto_nome" />
            <SortHeader label="Peso Bruto" col="peso_bruto" />
            <SortHeader label="Tara" col="tara" />
            <SortHeader label="Peso Líq." col="peso_liquido" />
            <SortHeader label="Desc. Total" col="desconto_total" />
            <SortHeader label="Peso Corrig." col="peso_corrigido" />
            <SortHeader label="Status" col="status" />
            <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600">Ações</th>
          </tr></thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={11} className="text-center py-8 text-gray-400">Nenhum romaneio de entrada</td></tr>
            ) : paged.map(r => (
              <tr key={r.id} className="border-b hover:bg-gray-50">
                <td className="px-2 py-2 font-mono text-xs">{r.numero_romaneio}</td>
                <td className="px-2 py-2 whitespace-nowrap">{r.data_emissao ? fmtData(r.data_emissao) : '-'}</td>
                <td className="px-2 py-2 truncate max-w-[150px]">{r.depositante_nome}</td>
                <td className="px-2 py-2">{r.produto_nome}</td>
                <td className="px-2 py-2 text-right">{fmtKg(r.peso_bruto)}</td>
                <td className="px-2 py-2 text-right">{fmtKg(r.tara)}</td>
                <td className="px-2 py-2 text-right">{fmtKg(r.peso_liquido)}</td>
                <td className="px-2 py-2 text-right text-red-600">{fmtKg(r.desconto_total)}</td>
                <td className="px-2 py-2 text-right font-semibold">{fmtKg(r.peso_corrigido)}</td>
                <td className="px-2 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(r.status)}`}>{r.status}</span></td>
                <td className="px-2 py-2">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => setShowView(r)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Ver"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => openEdit(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Editar"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(r.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination currentPage={page} totalItems={sorted.length} pageSize={pageSize} onPageChange={setPage} />
      </div>

      {/* Modal Criar/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl my-4">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10 rounded-t-xl">
              <h2 className="text-lg font-semibold">{editId ? 'Editar' : 'Novo'} Romaneio de Entrada</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              {/* Identificação */}
              <div className="border rounded-lg p-3 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Identificação</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Unidade *</label>
                    <select value={form.unidade_id} onChange={e => setForm({ ...form, unidade_id: e.target.value, estrutura_id: '' })} className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="">Selecione...</option>
                      {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Estrutura</label>
                    <select value={form.estrutura_id} onChange={e => setForm({ ...form, estrutura_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="">Nenhuma</option>
                      {estruturas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Data Emissão</label>
                    <input type="date" value={form.data_emissao} onChange={e => setForm({ ...form, data_emissao: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Depositante *</label>
                    <SearchableSelect options={depositanteOpts} value={form.depositante_id} onChange={v => setForm({ ...form, depositante_id: v })} placeholder="Buscar depositante..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Produto *</label>
                    <select value={form.produto_id} onChange={e => setForm({ ...form, produto_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="">Selecione...</option>
                      {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ano Safra</label>
                    <select value={form.ano_safra_id} onChange={e => setForm({ ...form, ano_safra_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="">-</option>
                      {anosSafra.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">NFe Número</label>
                    <input value={form.nfe_numero} onChange={e => setForm({ ...form, nfe_numero: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">NFe Série</label>
                    <input value={form.nfe_serie} onChange={e => setForm({ ...form, nfe_serie: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>

              {/* Transporte */}
              <div className="border rounded-lg p-3 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Transporte</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Transportadora</label>
                    <SearchableSelect options={transportadoraOpts} value={form.transportadora_id} onChange={v => setForm({ ...form, transportadora_id: v })} placeholder="Buscar..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Motorista</label>
                    <SearchableSelect options={motoristaOpts} value={form.motorista_id} onChange={v => setForm({ ...form, motorista_id: v })} placeholder="Buscar..." />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Veículo</label>
                    <SearchableSelect options={veiculoOpts} value={form.veiculo_id} onChange={v => { setForm({ ...form, veiculo_id: v, placa: veiculos.find(ve => ve.id === v)?.placa || form.placa }) }} placeholder="Buscar placa..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Placa</label>
                    <input value={form.placa} onChange={e => setForm({ ...form, placa: e.target.value.toUpperCase() })} className="w-full border rounded-lg px-3 py-2 text-sm" maxLength={8} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Romaneio FretAgru (vínculo)</label>
                  <SearchableSelect options={romaneioFreteOpts} value={form.romaneio_frete_id} onChange={v => setForm({ ...form, romaneio_frete_id: v })} placeholder="Vincular romaneio de frete..." />
                </div>
              </div>

              {/* Pesagem */}
              <div className="border rounded-lg p-3 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Pesagem (kg)</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Peso Bruto</label>
                    <input value={form.peso_bruto} onChange={e => setForm({ ...form, peso_bruto: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="30000" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tara</label>
                    <input value={form.tara} onChange={e => setForm({ ...form, tara: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="12000" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Peso Líquido</label>
                    <div className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 font-semibold">{fmtKg(descontos.peso_liquido)}</div>
                  </div>
                </div>
              </div>

              {/* Classificação */}
              <div className="border rounded-lg p-3 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Calculator className="w-4 h-4" /> Classificação (%)
                  {tabelasDesc.length > 0 && <span className="text-xs text-green-600 font-normal">({tabelasDesc.length} tabelas de desconto ativas)</span>}
                  {tabelasDesc.length === 0 && form.produto_id && <span className="text-xs text-orange-500 font-normal">(sem tabela de desconto para este produto)</span>}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: 'umidade_perc', label: 'Umidade', desc: descontos.umidade_desc },
                    { key: 'impureza_perc', label: 'Impureza', desc: descontos.impureza_desc },
                    { key: 'avariados_perc', label: 'Avariados', desc: descontos.avariados_desc },
                    { key: 'ardidos_perc', label: 'Ardidos', desc: descontos.ardidos_desc },
                    { key: 'esverdeados_perc', label: 'Esverdeados', desc: descontos.esverdeados_desc },
                    { key: 'partidos_perc', label: 'Partidos', desc: descontos.partidos_desc },
                    { key: 'quebrados_perc', label: 'Quebrados', desc: descontos.quebrados_desc },
                  ].map(({ key, label, desc }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                      <input value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} className="w-full border rounded-lg px-3 py-1.5 text-sm" placeholder="0,00" />
                      {desc > 0 && <p className="text-[10px] text-red-500 mt-0.5">Desc: {fmtKg(desc)} kg</p>}
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Transgenia</label>
                    <input value={form.transgenia} onChange={e => setForm({ ...form, transgenia: e.target.value })} className="w-full border rounded-lg px-3 py-1.5 text-sm" />
                  </div>
                </div>
              </div>

              {/* Resultado */}
              <div className="border-2 border-amber-300 rounded-lg p-3 bg-amber-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Resultado</h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-gray-500">Desconto Total</p>
                    <p className="text-lg font-bold text-red-600">{fmtKg(descontos.desconto_total)} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Peso Corrigido</p>
                    <p className="text-lg font-bold text-green-700">{fmtKg(descontos.peso_corrigido)} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">% Desconto</p>
                    <p className="text-lg font-bold text-gray-700">{descontos.peso_liquido > 0 ? fmtPerc(descontos.desconto_total / descontos.peso_liquido * 100) : '0,00'}%</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t sticky bottom-0 bg-white rounded-b-xl">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visualização */}
      {showView && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Romaneio #{showView.numero_romaneio}</h2>
              <button onClick={() => setShowView(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-gray-500">Data:</span> {showView.data_emissao ? fmtData(showView.data_emissao) : '-'}</div>
                <div><span className="text-gray-500">Status:</span> <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(showView.status)}`}>{showView.status}</span></div>
                <div><span className="text-gray-500">Depositante:</span> {showView.depositante_nome}</div>
                <div><span className="text-gray-500">Produto:</span> {showView.produto_nome}</div>
                <div><span className="text-gray-500">Unidade:</span> {showView.unidade_nome}</div>
                <div><span className="text-gray-500">Placa:</span> {showView.placa || '-'}</div>
              </div>
              <hr />
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-xs text-gray-500">Peso Bruto</p><p className="font-semibold">{fmtKg(showView.peso_bruto)}</p></div>
                <div><p className="text-xs text-gray-500">Tara</p><p className="font-semibold">{fmtKg(showView.tara)}</p></div>
                <div><p className="text-xs text-gray-500">Peso Líquido</p><p className="font-semibold">{fmtKg(showView.peso_liquido)}</p></div>
              </div>
              <hr />
              <h3 className="font-semibold text-gray-700">Classificação / Descontos</h3>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {[
                  { l: 'Umidade', p: showView.umidade_perc, d: showView.umidade_desc },
                  { l: 'Impureza', p: showView.impureza_perc, d: showView.impureza_desc },
                  { l: 'Avariados', p: showView.avariados_perc, d: showView.avariados_desc },
                  { l: 'Ardidos', p: showView.ardidos_perc, d: showView.ardidos_desc },
                  { l: 'Esverdeados', p: showView.esverdeados_perc, d: showView.esverdeados_desc },
                  { l: 'Partidos', p: showView.partidos_perc, d: showView.partidos_desc },
                  { l: 'Quebrados', p: showView.quebrados_perc, d: showView.quebrados_desc },
                ].map(({ l, p, d }) => (
                  <div key={l} className="flex justify-between border-b py-1">
                    <span>{l}: {p != null ? fmtPerc(p) + '%' : '-'}</span>
                    <span className="text-red-500">{d ? '-' + fmtKg(d) + ' kg' : ''}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 text-center mt-2 border-2 border-amber-300 rounded-lg p-2 bg-amber-50">
                <div><p className="text-xs text-gray-500">Desc. Total</p><p className="font-bold text-red-600">{fmtKg(showView.desconto_total)} kg</p></div>
                <div><p className="text-xs text-gray-500">Peso Corrigido</p><p className="font-bold text-green-700">{fmtKg(showView.peso_corrigido)} kg</p></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

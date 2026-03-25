import { useEffect, useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, X, Table2, ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, ChevronRight, Copy, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { getTabelasDesconto, createTabelaDesconto, updateTabelaDesconto, deleteTabelaDesconto, getFaixasDesconto, createFaixaDesconto, deleteFaixaDesconto, deleteFaixasDescontoPorTabela, getProdutos, getAnosSafra } from '../../services/api'
import { fmtDec } from '../../utils/format'

type SortDir = 'asc' | 'desc'

const TIPOS_DESCONTO = [
  { value: 'umidade', label: 'Umidade' },
  { value: 'impureza', label: 'Impureza' },
  { value: 'avariados', label: 'Avariados' },
  { value: 'ardidos', label: 'Ardidos' },
  { value: 'esverdeados', label: 'Esverdeados' },
  { value: 'partidos', label: 'Partidos' },
  { value: 'quebrados', label: 'Quebrados' },
]

export default function TabelasDesconto() {
  const [tabelas, setTabelas] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [anosSafra, setAnosSafra] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [faixas, setFaixas] = useState<any[]>([])
  const [loadingFaixas, setLoadingFaixas] = useState(false)
  const [showFaixaModal, setShowFaixaModal] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [sort, setSort] = useState<{ col: string; dir: SortDir }>({ col: 'nome', dir: 'asc' })

  const [form, setForm] = useState({
    nome: '', produto_id: '', tipo_desconto: 'umidade', base_isenta: '',
    ano_safra_id: '', vigencia_inicio: '', vigencia_fim: '', observacoes: '',
  })

  const load = async () => {
    setLoading(true)
    try {
      const [t, p, a] = await Promise.all([getTabelasDesconto(), getProdutos(), getAnosSafra()])
      setTabelas(t)
      setProdutos(p)
      setAnosSafra(a)
    } catch (e: any) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const loadFaixas = async (tabelaId: string) => {
    setLoadingFaixas(true)
    try {
      const data = await getFaixasDesconto(tabelaId)
      setFaixas(data)
    } catch (e: any) { toast.error(e.message) }
    setLoadingFaixas(false)
  }

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      loadFaixas(id)
    }
  }

  const openCreate = () => {
    setEditId(null)
    setForm({ nome: '', produto_id: '', tipo_desconto: 'umidade', base_isenta: '', ano_safra_id: '', vigencia_inicio: '', vigencia_fim: '', observacoes: '' })
    setShowModal(true)
  }

  const openEdit = (t: any) => {
    setEditId(t.id)
    setForm({
      nome: t.nome || '',
      produto_id: t.produto_id || '',
      tipo_desconto: t.tipo_desconto || 'umidade',
      base_isenta: t.base_isenta != null ? String(t.base_isenta).replace('.', ',') : '',
      ano_safra_id: t.ano_safra_id || '',
      vigencia_inicio: t.vigencia_inicio || '',
      vigencia_fim: t.vigencia_fim || '',
      observacoes: t.observacoes || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.nome.trim()) return toast.error('Nome é obrigatório')
    if (!form.produto_id) return toast.error('Produto é obrigatório')
    try {
      const payload = {
        ...form,
        base_isenta: form.base_isenta ? parseFloat(form.base_isenta.replace(',', '.')) : 0,
        ano_safra_id: form.ano_safra_id || null,
      }
      if (editId) {
        await updateTabelaDesconto(editId, payload)
        toast.success('Tabela atualizada')
      } else {
        await createTabelaDesconto(payload)
        toast.success('Tabela criada')
      }
      setShowModal(false)
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta tabela e todas as suas faixas?')) return
    try {
      await deleteTabelaDesconto(id)
      toast.success('Tabela excluída')
      if (expandedId === id) setExpandedId(null)
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const handleDeleteFaixa = async (id: string) => {
    try {
      await deleteFaixaDesconto(id)
      toast.success('Faixa excluída')
      if (expandedId) loadFaixas(expandedId)
    } catch (e: any) { toast.error(e.message) }
  }

  const openBulkAdd = () => {
    setBulkText('')
    setShowFaixaModal(true)
  }

  const handleBulkSave = async () => {
    if (!expandedId) return
    const lines = bulkText.trim().split('\n').filter(l => l.trim())
    if (lines.length === 0) return toast.error('Nenhuma faixa informada')

    const parsed: { grau: number; desconto: number }[] = []
    for (const line of lines) {
      const parts = line.split(/[;\t,]/).map(s => s.trim().replace(',', '.'))
      if (parts.length < 2) {
        toast.error(`Linha inválida: "${line}" — formato: grau;desconto`)
        return
      }
      const grau = parseFloat(parts[0].replace(',', '.'))
      const desconto = parseFloat(parts[1].replace(',', '.'))
      if (isNaN(grau) || isNaN(desconto)) {
        toast.error(`Valores inválidos na linha: "${line}"`)
        return
      }
      parsed.push({ grau, desconto })
    }

    try {
      for (const f of parsed) {
        await createFaixaDesconto({ tabela_id: expandedId, ...f })
      }
      toast.success(`${parsed.length} faixas adicionadas`)
      setShowFaixaModal(false)
      loadFaixas(expandedId)
    } catch (e: any) { toast.error(e.message) }
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!expandedId) return toast.error('Expanda uma tabela antes de importar')
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(ws)

      if (rows.length === 0) return toast.error('Planilha vazia')

      // Detectar colunas (aceita variações)
      const grauKey = Object.keys(rows[0]).find(k => /grau|teor|%/i.test(k)) || Object.keys(rows[0])[0]
      const descKey = Object.keys(rows[0]).find(k => /desc|desconto|perc/i.test(k)) || Object.keys(rows[0])[1]

      if (!grauKey || !descKey) return toast.error('Colunas não encontradas. Use: grau | desconto')

      const parsed: { grau: number; desconto: number }[] = []
      for (const row of rows) {
        const grau = typeof row[grauKey] === 'number' ? row[grauKey] : parseFloat(String(row[grauKey]).replace(',', '.'))
        const desconto = typeof row[descKey] === 'number' ? row[descKey] : parseFloat(String(row[descKey]).replace(',', '.'))
        if (!isNaN(grau) && !isNaN(desconto)) parsed.push({ grau, desconto })
      }

      if (parsed.length === 0) return toast.error('Nenhuma faixa válida encontrada na planilha')

      for (const f of parsed) {
        await createFaixaDesconto({ tabela_id: expandedId, ...f })
      }
      toast.success(`${parsed.length} faixas importadas do Excel`)
      loadFaixas(expandedId)
    } catch (err: any) { toast.error('Erro ao ler planilha: ' + err.message) }
    e.target.value = ''
  }

  const handleClearFaixas = async () => {
    if (!expandedId) return
    if (!confirm('Excluir TODAS as faixas desta tabela?')) return
    try {
      await deleteFaixasDescontoPorTabela(expandedId)
      toast.success('Faixas excluídas')
      loadFaixas(expandedId)
    } catch (e: any) { toast.error(e.message) }
  }

  const sorted = useMemo(() => {
    const arr = [...tabelas]
    arr.sort((a: any, b: any) => {
      const va = a[sort.col], vb = b[sort.col]
      if (typeof va === 'number' && typeof vb === 'number') return sort.dir === 'asc' ? va - vb : vb - va
      return sort.dir === 'asc' ? String(va || '').localeCompare(String(vb || '')) : String(vb || '').localeCompare(String(va || ''))
    })
    return arr
  }, [tabelas, sort])

  const SortHeader = ({ label, col }: { label: string; col: string }) => (
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2"><Table2 className="w-6 h-6 text-amber-600" /> Tabelas de Desconto</h1>
        <button onClick={openCreate} className="flex items-center gap-1 bg-amber-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-amber-700">
          <Plus className="w-4 h-4" /> Nova Tabela
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-gray-50">
            <th className="w-8"></th>
            <SortHeader label="Nome" col="nome" />
            <SortHeader label="Produto" col="produto_nome" />
            <SortHeader label="Tipo" col="tipo_desconto" />
            <SortHeader label="Base Isenta" col="base_isenta" />
            <SortHeader label="Ano Safra" col="ano_safra_nome" />
            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">Ações</th>
          </tr></thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhuma tabela cadastrada</td></tr>
            ) : sorted.map(t => (
              <>
                <tr key={t.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(t.id)}>
                  <td className="px-2 py-2 text-center">
                    {expandedId === t.id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  </td>
                  <td className="px-3 py-2 font-medium">{t.nome}</td>
                  <td className="px-3 py-2">{t.produto_nome}</td>
                  <td className="px-3 py-2 capitalize">{TIPOS_DESCONTO.find(td => td.value === t.tipo_desconto)?.label || t.tipo_desconto}</td>
                  <td className="px-3 py-2 text-right">{t.base_isenta != null ? fmtDec(t.base_isenta) + '%' : '-'}</td>
                  <td className="px-3 py-2">{t.ano_safra_nome || '-'}</td>
                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(t)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(t.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
                {expandedId === t.id && (
                  <tr key={`${t.id}-faixas`}>
                    <td colSpan={7} className="bg-amber-50/50 px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-700">Faixas de Desconto ({faixas.length})</h3>
                        <div className="flex gap-2">
                          <label className="flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 cursor-pointer">
                            <Upload className="w-3 h-3" /> Importar Excel
                            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportExcel} className="hidden" />
                          </label>
                          <button onClick={openBulkAdd} className="flex items-center gap-1 bg-amber-600 text-white px-2 py-1 rounded text-xs hover:bg-amber-700">
                            <Plus className="w-3 h-3" /> Adicionar Faixas
                          </button>
                          {faixas.length > 0 && (
                            <button onClick={handleClearFaixas} className="flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">
                              <Trash2 className="w-3 h-3" /> Limpar Todas
                            </button>
                          )}
                        </div>
                      </div>
                      {loadingFaixas ? (
                        <div className="text-center py-2"><div className="animate-spin inline-block rounded-full h-5 w-5 border-b-2 border-amber-600" /></div>
                      ) : faixas.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-2">Nenhuma faixa cadastrada</p>
                      ) : (
                        <div className="max-h-64 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead><tr className="border-b">
                              <th className="px-2 py-1 text-left font-semibold text-gray-600">Grau (%)</th>
                              <th className="px-2 py-1 text-left font-semibold text-gray-600">Desconto (%)</th>
                              <th className="px-2 py-1 text-center font-semibold text-gray-600 w-16">Ação</th>
                            </tr></thead>
                            <tbody>
                              {faixas.map(f => (
                                <tr key={f.id} className="border-b hover:bg-white">
                                  <td className="px-2 py-1">{fmtDec(f.grau)}</td>
                                  <td className="px-2 py-1">{fmtDec(f.desconto)}</td>
                                  <td className="px-2 py-1 text-center">
                                    <button onClick={() => handleDeleteFaixa(f.id)} className="p-0.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3" /></button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Tabela */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editId ? 'Editar' : 'Nova'} Tabela de Desconto</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ex: Soja - Umidade - Safra 25/26" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Produto *</label>
                  <select value={form.produto_id} onChange={e => setForm({ ...form, produto_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">Selecione...</option>
                    {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Desconto *</label>
                  <select value={form.tipo_desconto} onChange={e => setForm({ ...form, tipo_desconto: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {TIPOS_DESCONTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Isenta (%)</label>
                  <input value={form.base_isenta} onChange={e => setForm({ ...form, base_isenta: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ex: 14,00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ano Safra</label>
                  <select value={form.ano_safra_id} onChange={e => setForm({ ...form, ano_safra_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">Todas</option>
                    {anosSafra.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vigência Início</label>
                  <input type="date" value={form.vigencia_inicio} onChange={e => setForm({ ...form, vigencia_inicio: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vigência Fim</label>
                  <input type="date" value={form.vigencia_fim} onChange={e => setForm({ ...form, vigencia_fim: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Faixas em Lote */}
      {showFaixaModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Adicionar Faixas em Lote</h2>
              <button onClick={() => setShowFaixaModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-500">Cole as faixas no formato <strong>grau;desconto</strong> (uma por linha). Aceita separador ponto-e-vírgula, TAB ou vírgula.</p>
              <p className="text-xs text-gray-400">Exemplo: 14,50;1,72</p>
              <textarea
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                rows={12}
                placeholder={"13,00;0\n13,50;0\n14,00;0\n14,50;1,72\n15,00;2,30"}
              />
              <p className="text-xs text-gray-400">{bulkText.trim().split('\n').filter(l => l.trim()).length} linhas</p>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowFaixaModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleBulkSave} className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700">Salvar Faixas</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

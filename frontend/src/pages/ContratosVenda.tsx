import { useEffect, useState } from 'react'
import { ShoppingCart, Plus, Pencil, Trash2, X, Loader2, Search, FileSpreadsheet } from 'lucide-react'
import toast from 'react-hot-toast'
import { getContratosVenda, createContratoVenda, updateContratoVenda, deleteContratoVenda, getCadastros, getProdutos, getSafras } from '../services/api'
import { useSort } from '../hooks/useSort'
import SortHeader from '../components/SortHeader'
import { fmtBRL, fmtDec, fmtData } from '../utils/format'
import { exportToExcel } from '../utils/export'

const STATUS_OPTIONS = [
  { value: 'negociacao', label: 'Negociação', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'fixado', label: 'Fixado', color: 'bg-blue-100 text-blue-700' },
  { value: 'em_execucao', label: 'Em Execução', color: 'bg-green-100 text-green-700' },
  { value: 'liquidado', label: 'Liquidado', color: 'bg-gray-100 text-gray-700' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-100 text-red-700' },
]

const MODALIDADES = ['FOB', 'CIF']
const UNIDADES_PRECO = ['R$/ton', 'R$/sc']

const emptyForm = {
  numero_contrato: '', comprador_id: '', corretor_id: '', produto_id: '', safra_id: '',
  volume_tons: '', preco_valor: '', preco_unidade: 'R$/ton', modalidade: 'FOB',
  data_contrato: '', data_entrega_inicio: '', data_entrega_fim: '', status: 'negociacao',
  local_entrega_id: '', observacoes: '', ativo: true,
}

export default function ContratosVenda() {
  const [items, setItems] = useState<any[]>([])
  const [cadastros, setCadastros] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [safras, setSafras] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [busca, setBusca] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([getContratosVenda().catch(() => []), getCadastros(), getProdutos(), getSafras().catch(() => [])])
      .then(([cv, c, p, s]) => { setItems(cv); setCadastros(c); setProdutos(p); setSafras(s) })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const compradores = cadastros.filter(c => (c.tipos || []).some((t: string) => ['Comprador', 'Industria', 'Armazem', 'Porto'].includes(t)))
  const corretores = cadastros.filter(c => (c.tipos || []).includes('Corretor'))
  const locaisEntrega = cadastros.filter(c => (c.tipos || []).some((t: string) => ['Armazem', 'Industria', 'Porto', 'Fazenda'].includes(t)))

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (item: any) => {
    setEditing(item)
    setForm({
      numero_contrato: item.numero_contrato || '',
      comprador_id: item.comprador_id || '', corretor_id: item.corretor_id || '',
      produto_id: item.produto_id || '', safra_id: item.safra_id || '',
      volume_tons: item.volume_tons != null ? String(item.volume_tons) : '',
      preco_valor: item.preco_valor != null ? String(item.preco_valor) : '',
      preco_unidade: item.preco_unidade || 'R$/ton', modalidade: item.modalidade || 'FOB',
      data_contrato: item.data_contrato || '', data_entrega_inicio: item.data_entrega_inicio || '',
      data_entrega_fim: item.data_entrega_fim || '', status: item.status || 'negociacao',
      local_entrega_id: item.local_entrega_id || '', observacoes: item.observacoes || '',
      ativo: item.ativo,
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.comprador_id || !form.produto_id || !form.volume_tons || !form.preco_valor) {
      toast.error('Comprador, Produto, Volume e Preço são obrigatórios'); return
    }
    setSaving(true)
    try {
      const payload: any = {
        ...form,
        volume_tons: parseFloat(form.volume_tons),
        preco_valor: parseFloat(form.preco_valor),
        corretor_id: form.corretor_id || null,
        safra_id: form.safra_id || null,
        local_entrega_id: form.local_entrega_id || null,
        data_contrato: form.data_contrato || null,
        data_entrega_inicio: form.data_entrega_inicio || null,
        data_entrega_fim: form.data_entrega_fim || null,
        observacoes: form.observacoes || null,
        numero_contrato: form.numero_contrato || null,
      }
      if (editing) await updateContratoVenda(editing.id, payload)
      else await createContratoVenda(payload)
      toast.success(editing ? 'Contrato atualizado' : 'Contrato cadastrado')
      setShowForm(false); load()
    } catch (err: any) { toast.error('Erro: ' + (err?.message || '')) }
    finally { setSaving(false) }
  }

  const remove = async (id: string) => {
    if (!confirm('Deseja remover este contrato?')) return
    try { await deleteContratoVenda(id); toast.success('Removido'); load() }
    catch { toast.error('Erro ao remover') }
  }

  const filtered = items.filter(i => {
    if (!busca) return true
    const term = busca.toLowerCase()
    return (i.comprador_nome || '').toLowerCase().includes(term) ||
      (i.produto_nome || '').toLowerCase().includes(term) ||
      (i.corretor_nome || '').toLowerCase().includes(term) ||
      (i.numero_contrato || '').toLowerCase().includes(term) ||
      (i.safra_nome || '').toLowerCase().includes(term)
  })

  const { sortedData: sorted, sortKey, sortDirection, toggleSort } = useSort(filtered)

  const getStatusBadge = (status: string) => {
    const s = STATUS_OPTIONS.find(o => o.value === status)
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s?.color || 'bg-gray-100 text-gray-600'}`}>{s?.label || status}</span>
  }

  const handleExportExcel = () => {
    exportToExcel({
      filename: 'contratos_venda_contagru', title: 'Contratos de Venda',
      columns: [
        { key: 'numero_contrato', label: 'Nº Contrato' },
        { key: 'comprador_nome', label: 'Comprador' },
        { key: 'produto_nome', label: 'Produto' },
        { key: 'safra_nome', label: 'Safra' },
        { key: 'volume_tons', label: 'Volume (ton)' },
        { key: 'preco_valor', label: 'Preço' },
        { key: 'preco_unidade', label: 'Unidade' },
        { key: 'modalidade', label: 'Modalidade' },
        { key: 'status', label: 'Status' },
      ],
      data: sorted,
      getValue: (item, key) => {
        if (key === 'volume_tons') return fmtDec(item.volume_tons, 2)
        if (key === 'preco_valor') return fmtBRL(item.preco_valor)
        if (key === 'status') return STATUS_OPTIONS.find(o => o.value === item.status)?.label || item.status
        return item[key] || ''
      }
    })
    toast.success(`${sorted.length} contratos exportados`)
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /><span className="ml-3 text-gray-500">Carregando...</span></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Contratos de Venda</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportExcel} className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 text-sm" title="Exportar Excel">
            <FileSpreadsheet className="w-4 h-4" /><span className="hidden sm:inline">Excel</span>
          </button>
          <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 sm:px-4 rounded-lg hover:bg-blue-700 text-sm sm:text-base whitespace-nowrap">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Novo</span> Contrato
          </button>
        </div>
      </div>

      <div className="mb-4 relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
        <input type="text" placeholder="Buscar por comprador, produto, safra, nº contrato..." value={busca} onChange={e => setBusca(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
      </div>

      <p className="text-xs text-gray-500 mb-2">{filtered.length} de {items.length} contratos</p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-gray-50 border-b">
            <tr>
              <SortHeader label="Nº" field="numero_contrato" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
              <SortHeader label="Comprador" field="comprador_nome" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
              <SortHeader label="Produto" field="produto_nome" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
              <SortHeader label="Safra" field="safra_nome" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
              <SortHeader label="Volume (ton)" field="volume_tons" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} align="right" />
              <SortHeader label="Preço" field="preco_valor" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} align="right" />
              <th className="px-4 py-3 font-semibold text-gray-600 text-center">Mod.</th>
              <SortHeader label="Status" field="status" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
              <th className="text-right px-4 py-3 font-semibold text-gray-600 w-24">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map((item: any) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">{item.numero_contrato || '-'}</td>
                <td className="px-4 py-3 font-medium">{item.comprador_nome}</td>
                <td className="px-4 py-3 text-gray-600">{item.produto_nome}</td>
                <td className="px-4 py-3 text-gray-600">{item.safra_nome || '-'}</td>
                <td className="px-4 py-3 text-right">{fmtDec(item.volume_tons, 2)}</td>
                <td className="px-4 py-3 text-right">{fmtBRL(item.preco_valor)} <span className="text-xs text-gray-400">{item.preco_unidade}</span></td>
                <td className="px-4 py-3 text-center text-xs font-medium">{item.modalidade}</td>
                <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                <td className="px-4 py-3 text-right space-x-1">
                  <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Nenhum contrato cadastrado</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Editar' : 'Novo'} Contrato de Venda</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nº Contrato</label>
                  <input type="text" value={form.numero_contrato} onChange={e => setForm(f => ({ ...f, numero_contrato: e.target.value }))}
                    placeholder="Ex: CV-001" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modalidade</label>
                  <select value={form.modalidade} onChange={e => setForm(f => ({ ...f, modalidade: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comprador *</label>
                  <select value={form.comprador_id} onChange={e => setForm(f => ({ ...f, comprador_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Selecione</option>
                    {compradores.map(c => <option key={c.id} value={c.id}>{c.nome_fantasia || c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Corretor</label>
                  <select value={form.corretor_id} onChange={e => setForm(f => ({ ...f, corretor_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Nenhum</option>
                    {corretores.map(c => <option key={c.id} value={c.id}>{c.nome_fantasia || c.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Produto *</label>
                  <select value={form.produto_id} onChange={e => setForm(f => ({ ...f, produto_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Selecione</option>
                    {produtos.filter(p => p.ativo).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Safra</label>
                  <select value={form.safra_id} onChange={e => setForm(f => ({ ...f, safra_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Nenhuma</option>
                    {safras.filter(s => s.ativo).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Local Entrega</label>
                  <select value={form.local_entrega_id} onChange={e => setForm(f => ({ ...f, local_entrega_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Nenhum</option>
                    {locaisEntrega.map(l => <option key={l.id} value={l.id}>{l.nome_fantasia || l.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Volume (ton) *</label>
                  <input type="number" step="0.01" value={form.volume_tons} onChange={e => setForm(f => ({ ...f, volume_tons: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço *</label>
                  <input type="number" step="0.01" value={form.preco_valor} onChange={e => setForm(f => ({ ...f, preco_valor: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div className="col-span-2 sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidade Preço</label>
                  <select value={form.preco_unidade} onChange={e => setForm(f => ({ ...f, preco_unidade: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    {UNIDADES_PRECO.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Contrato</label>
                  <input type="date" value={form.data_contrato} onChange={e => setForm(f => ({ ...f, data_contrato: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entrega Início</label>
                  <input type="date" value={form.data_entrega_inicio} onChange={e => setForm(f => ({ ...f, data_entrega_inicio: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entrega Fim</label>
                  <input type="date" value={form.data_entrega_fim} onChange={e => setForm(f => ({ ...f, data_entrega_fim: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <label className="text-sm text-gray-700">Ativo</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Cancelar</button>
              <button onClick={save} disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

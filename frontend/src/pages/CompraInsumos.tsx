import { useEffect, useState } from 'react'
import { Package, Plus, Pencil, Trash2, X, Loader2, Search, FileSpreadsheet } from 'lucide-react'
import toast from 'react-hot-toast'
import { getComprasInsumo, createCompraInsumo, updateCompraInsumo, deleteCompraInsumo, getCadastros, getProdutos, getSafras } from '../services/api'
import { useSort } from '../hooks/useSort'
import SortHeader from '../components/SortHeader'
import { fmtBRL, fmtDec, fmtData } from '../utils/format'
import { exportToExcel } from '../utils/export'

const STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'entregue', label: 'Entregue', color: 'bg-blue-100 text-blue-700' },
  { value: 'pago', label: 'Pago', color: 'bg-green-100 text-green-700' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-100 text-red-700' },
]

const UNIDADES_MEDIDA = ['ton', 'kg', 'l', 'sc', 'un']
const UNIDADES_PRECO = ['R$/ton', 'R$/kg', 'R$/l', 'R$/sc', 'R$/un']

const emptyForm = {
  numero_contrato: '', fornecedor_id: '', produto_id: '', safra_id: '',
  quantidade: '', unidade_medida: 'ton', preco_valor: '', preco_unidade: 'R$/ton',
  data_contrato: '', data_entrega_prevista: '', status: 'pendente',
  observacoes: '', ativo: true,
}

export default function CompraInsumos() {
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
    Promise.all([getComprasInsumo().catch(() => []), getCadastros(), getProdutos(), getSafras().catch(() => [])])
      .then(([ci, c, p, s]) => { setItems(ci); setCadastros(c); setProdutos(p); setSafras(s) })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const fornecedores = cadastros.filter(c => (c.tipos || []).some((t: string) => ['Fornecedor', 'Industria'].includes(t)))

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (item: any) => {
    setEditing(item)
    setForm({
      numero_contrato: item.numero_contrato || '',
      fornecedor_id: item.fornecedor_id || '', produto_id: item.produto_id || '',
      safra_id: item.safra_id || '',
      quantidade: item.quantidade != null ? String(item.quantidade) : '',
      unidade_medida: item.unidade_medida || 'ton',
      preco_valor: item.preco_valor != null ? String(item.preco_valor) : '',
      preco_unidade: item.preco_unidade || 'R$/ton',
      data_contrato: item.data_contrato || '', data_entrega_prevista: item.data_entrega_prevista || '',
      status: item.status || 'pendente', observacoes: item.observacoes || '', ativo: item.ativo,
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.fornecedor_id || !form.produto_id || !form.quantidade || !form.preco_valor) {
      toast.error('Fornecedor, Produto, Quantidade e Preço são obrigatórios'); return
    }
    setSaving(true)
    try {
      const payload: any = {
        ...form,
        quantidade: parseFloat(form.quantidade),
        preco_valor: parseFloat(form.preco_valor),
        safra_id: form.safra_id || null,
        data_contrato: form.data_contrato || null,
        data_entrega_prevista: form.data_entrega_prevista || null,
        observacoes: form.observacoes || null,
        numero_contrato: form.numero_contrato || null,
      }
      if (editing) await updateCompraInsumo(editing.id, payload)
      else await createCompraInsumo(payload)
      toast.success(editing ? 'Compra atualizada' : 'Compra cadastrada')
      setShowForm(false); load()
    } catch (err: any) { toast.error('Erro: ' + (err?.message || '')) }
    finally { setSaving(false) }
  }

  const remove = async (id: string) => {
    if (!confirm('Deseja remover esta compra?')) return
    try { await deleteCompraInsumo(id); toast.success('Removido'); load() }
    catch { toast.error('Erro ao remover') }
  }

  const filtered = items.filter(i => {
    if (!busca) return true
    const term = busca.toLowerCase()
    return (i.fornecedor_nome || '').toLowerCase().includes(term) ||
      (i.produto_nome || '').toLowerCase().includes(term) ||
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
      filename: 'compra_insumos_contagru', title: 'Compra de Insumos',
      columns: [
        { key: 'numero_contrato', label: 'Nº Contrato' },
        { key: 'fornecedor_nome', label: 'Fornecedor' },
        { key: 'produto_nome', label: 'Produto' },
        { key: 'safra_nome', label: 'Safra' },
        { key: 'quantidade', label: 'Quantidade' },
        { key: 'unidade_medida', label: 'Unidade' },
        { key: 'preco_valor', label: 'Preço' },
        { key: 'status', label: 'Status' },
      ],
      data: sorted,
      getValue: (item, key) => {
        if (key === 'quantidade') return fmtDec(item.quantidade, 2)
        if (key === 'preco_valor') return fmtBRL(item.preco_valor)
        if (key === 'status') return STATUS_OPTIONS.find(o => o.value === item.status)?.label || item.status
        return item[key] || ''
      }
    })
    toast.success(`${sorted.length} compras exportadas`)
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /><span className="ml-3 text-gray-500">Carregando...</span></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-indigo-600" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Compra de Insumos</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportExcel} className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 text-sm" title="Exportar Excel">
            <FileSpreadsheet className="w-4 h-4" /><span className="hidden sm:inline">Excel</span>
          </button>
          <button onClick={openNew} className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 sm:px-4 rounded-lg hover:bg-indigo-700 text-sm sm:text-base whitespace-nowrap">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nova</span> Compra
          </button>
        </div>
      </div>

      <div className="mb-4 relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
        <input type="text" placeholder="Buscar por fornecedor, produto, safra, nº contrato..." value={busca} onChange={e => setBusca(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm" />
      </div>

      <p className="text-xs text-gray-500 mb-2">{filtered.length} de {items.length} compras</p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-gray-50 border-b">
            <tr>
              <SortHeader label="Nº" field="numero_contrato" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
              <SortHeader label="Fornecedor" field="fornecedor_nome" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
              <SortHeader label="Produto" field="produto_nome" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
              <SortHeader label="Safra" field="safra_nome" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
              <SortHeader label="Quantidade" field="quantidade" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} align="right" />
              <SortHeader label="Preço" field="preco_valor" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} align="right" />
              <SortHeader label="Entrega" field="data_entrega_prevista" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
              <SortHeader label="Status" field="status" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
              <th className="text-right px-4 py-3 font-semibold text-gray-600 w-24">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map((item: any) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">{item.numero_contrato || '-'}</td>
                <td className="px-4 py-3 font-medium">{item.fornecedor_nome}</td>
                <td className="px-4 py-3 text-gray-600">{item.produto_nome}</td>
                <td className="px-4 py-3 text-gray-600">{item.safra_nome || '-'}</td>
                <td className="px-4 py-3 text-right">{fmtDec(item.quantidade, 2)} <span className="text-xs text-gray-400">{item.unidade_medida}</span></td>
                <td className="px-4 py-3 text-right">{fmtBRL(item.preco_valor)} <span className="text-xs text-gray-400">{item.preco_unidade}</span></td>
                <td className="px-4 py-3 text-gray-600">{item.data_entrega_prevista ? fmtData(item.data_entrega_prevista) : '-'}</td>
                <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                <td className="px-4 py-3 text-right space-x-1">
                  <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Nenhuma compra cadastrada</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Editar' : 'Nova'} Compra de Insumo</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nº Contrato</label>
                  <input type="text" value={form.numero_contrato} onChange={e => setForm(f => ({ ...f, numero_contrato: e.target.value }))}
                    placeholder="Ex: CI-001" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor *</label>
                  <select value={form.fornecedor_id} onChange={e => setForm(f => ({ ...f, fornecedor_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option value="">Selecione</option>
                    {fornecedores.map(c => <option key={c.id} value={c.id}>{c.nome_fantasia || c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Produto *</label>
                  <select value={form.produto_id} onChange={e => setForm(f => ({ ...f, produto_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option value="">Selecione</option>
                    {produtos.filter(p => p.ativo).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Safra</label>
                  <select value={form.safra_id} onChange={e => setForm(f => ({ ...f, safra_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option value="">Nenhuma</option>
                    {safras.filter(s => s.ativo).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade *</label>
                  <input type="number" step="0.01" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                  <select value={form.unidade_medida} onChange={e => setForm(f => ({ ...f, unidade_medida: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    {UNIDADES_MEDIDA.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço *</label>
                  <input type="number" step="0.01" value={form.preco_valor} onChange={e => setForm(f => ({ ...f, preco_valor: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unid. Preço</label>
                  <select value={form.preco_unidade} onChange={e => setForm(f => ({ ...f, preco_unidade: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    {UNIDADES_PRECO.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Contrato</label>
                  <input type="date" value={form.data_contrato} onChange={e => setForm(f => ({ ...f, data_contrato: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entrega Prevista</label>
                  <input type="date" value={form.data_entrega_prevista} onChange={e => setForm(f => ({ ...f, data_entrega_prevista: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <label className="text-sm text-gray-700">Ativo</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Cancelar</button>
              <button onClick={save} disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2">
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

import { useEffect, useState } from 'react'
import { Package, Plus, Pencil, Trash2, X, Loader2, Search, FileSpreadsheet, Upload, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { getComprasInsumo, createCompraInsumo, updateCompraInsumo, deleteCompraInsumo, getCadastros, getProdutos, getSafras, getTiposContrato, getUnidadesMedida } from '../services/api'
import SearchableSelect from '../components/SearchableSelect'
import InfoTooltip from '../components/InfoTooltip'
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
  numero_contrato: '', fornecedor_id: '', produto_id: '', safra_id: '', ano_safra: '',
  tipo_contrato_id: '', quantidade: '', unidade_medida_id: '', valor_unitario: '', valor_total: '',
  data_contrato: '', data_entrega_prevista: '', status: 'pendente',
  observacoes: '', ativo: true, arquivo_url: '',
}

export default function CompraInsumos() {
  const [items, setItems] = useState<any[]>([])
  const [cadastros, setCadastros] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [safras, setSafras] = useState<any[]>([])
  const [tiposContrato, setTiposContrato] = useState<any[]>([])
  const [unidadesMedida, setUnidadesMedida] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [busca, setBusca] = useState('')
  const [uploadingFile, setUploadingFile] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const load = () => {
    setLoading(true)
    Promise.all([
      getComprasInsumo().catch(() => []), 
      getCadastros(), 
      getProdutos(), 
      getSafras().catch(() => []),
      getTiposContrato().catch(() => []),
      getUnidadesMedida().catch(() => [])
    ])
      .then(([ci, c, p, s, tc, um]) => { 
        setItems(ci); 
        setCadastros(c); 
        setProdutos(p); 
        setSafras(s);
        setTiposContrato(tc);
        setUnidadesMedida(um);
      })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const fornecedores = cadastros.filter(c => (c.tipos || []).some((t: string) => ['Fornecedor', 'Industria'].includes(t)))

  const openNew = () => { setEditing(null); setForm(emptyForm); setSelectedFile(null); setShowForm(true) }
  const openEdit = (item: any) => {
    setEditing(item)
    setForm({
      numero_contrato: item.numero_contrato || '',
      fornecedor_id: item.fornecedor_id || '', produto_id: item.produto_id || '',
      safra_id: item.safra_id || '', ano_safra: item.ano_safra || '',
      tipo_contrato_id: item.tipo_contrato_id || '',
      quantidade: item.quantidade != null ? String(item.quantidade) : '',
      unidade_medida_id: item.unidade_medida_id || '',
      valor_unitario: item.valor_unitario != null ? String(item.valor_unitario) : '',
      valor_total: item.valor_total != null ? String(item.valor_total) : '',
      data_contrato: item.data_contrato || '', data_entrega_prevista: item.data_entrega_prevista || '',
      status: item.status || 'pendente', observacoes: item.observacoes || '', ativo: item.ativo,
      arquivo_url: item.arquivo_url || '',
    })
    setSelectedFile(null)
    setShowForm(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        toast.error('Arquivo muito grande. Máximo 10MB')
        return
      }
      setSelectedFile(file)
    }
  }

  const uploadFile = async (): Promise<string | null> => {
    if (!selectedFile) return form.arquivo_url || null
    
    setUploadingFile(true)
    try {
      const timestamp = Date.now()
      const fileName = `${timestamp}_${selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('bucket', 'contratosdecompra-img')
      formData.append('fileName', fileName)
      
      const resp = await fetch('/api/upload-file', {
        method: 'POST',
        body: formData
      })
      
      if (!resp.ok) throw new Error('Erro ao fazer upload')
      const data = await resp.json()
      return data.publicUrl
    } catch (err: any) {
      toast.error('Erro ao fazer upload: ' + (err?.message || ''))
      return null
    } finally {
      setUploadingFile(false)
    }
  }

  const save = async () => {
    if (!form.fornecedor_id || !form.produto_id || !form.quantidade || !form.valor_unitario) {
      toast.error('Fornecedor, Produto, Quantidade e Valor Unitário são obrigatórios'); return
    }
    setSaving(true)
    try {
      const arquivoUrl = await uploadFile()
      
      const quantidade = parseFloat(form.quantidade)
      const valorUnitario = parseFloat(form.valor_unitario)
      const valorTotal = quantidade * valorUnitario
      
      const payload: any = {
        ...form,
        quantidade,
        valor_unitario: valorUnitario,
        valor_total: valorTotal,
        ano_safra: form.ano_safra ? parseInt(form.ano_safra) : null,
        safra_id: form.safra_id || null,
        tipo_contrato_id: form.tipo_contrato_id || null,
        unidade_medida_id: form.unidade_medida_id || null,
        data_contrato: form.data_contrato || null,
        data_entrega_prevista: form.data_entrega_prevista || null,
        observacoes: form.observacoes || null,
        numero_contrato: form.numero_contrato || null,
        arquivo_url: arquivoUrl || null,
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
              {/* Linha 1: Ano Safra / Safra / Tipo Contrato */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ano Safra</label>
                  <input type="number" value={form.ano_safra} onChange={e => setForm(f => ({ ...f, ano_safra: e.target.value }))}
                    placeholder="2024" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Safra</label>
                  <SearchableSelect
                    value={form.safra_id}
                    onChange={(val) => setForm(f => ({ ...f, safra_id: val }))}
                    options={[{ value: '', label: 'Nenhuma' }, ...safras.filter(s => s.ativo && (!form.ano_safra || s.ano === parseInt(form.ano_safra))).map(s => ({ value: s.id, label: s.nome }))]}
                    placeholder="Selecione a safra"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Contrato</label>
                  <SearchableSelect
                    value={form.tipo_contrato_id}
                    onChange={(val) => setForm(f => ({ ...f, tipo_contrato_id: val }))}
                    options={[{ value: '', label: 'Selecione' }, ...tiposContrato.map(t => ({ value: t.id, label: t.nome }))]}
                    placeholder="Selecione o tipo"
                  />
                </div>
              </div>

              {/* Linha 2: Nº Contrato / Data Contrato / Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nº Contrato</label>
                  <input type="text" value={form.numero_contrato} onChange={e => setForm(f => ({ ...f, numero_contrato: e.target.value }))}
                    placeholder="Ex: CI-001" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    Data Contrato
                    <InfoTooltip text="Data de fechamento do contrato" />
                  </label>
                  <input type="date" value={form.data_contrato} onChange={e => setForm(f => ({ ...f, data_contrato: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Linha 3: Fornecedor / Entrega Prevista */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor *</label>
                  <SearchableSelect
                    value={form.fornecedor_id}
                    onChange={(val) => setForm(f => ({ ...f, fornecedor_id: val }))}
                    options={[{ value: '', label: 'Selecione' }, ...fornecedores.map(c => ({ value: c.id, label: c.nome_fantasia || c.nome }))]}
                    placeholder="Selecione o fornecedor"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entrega Prevista</label>
                  <input type="date" value={form.data_entrega_prevista} onChange={e => setForm(f => ({ ...f, data_entrega_prevista: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
              </div>

              {/* Linha 4: Produto / Quantidade / Unidade / Valor un / Valor Total */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Produto *</label>
                  <SearchableSelect
                    value={form.produto_id}
                    onChange={(val) => setForm(f => ({ ...f, produto_id: val }))}
                    options={[{ value: '', label: 'Selecione' }, ...produtos.filter(p => p.ativo).map(p => ({ value: p.id, label: p.nome }))]}
                    placeholder="Selecione o produto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade *</label>
                  <input type="number" step="0.01" value={form.quantidade}
                    onChange={e => {
                      const q = e.target.value
                      const vTotal = q && form.valor_unitario ? (parseFloat(q) * parseFloat(form.valor_unitario)).toFixed(2) : ''
                      setForm(f => ({ ...f, quantidade: q, valor_total: vTotal }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                  <SearchableSelect
                    value={form.unidade_medida_id}
                    onChange={(val) => setForm(f => ({ ...f, unidade_medida_id: val }))}
                    options={[{ value: '', label: 'Selecione' }, ...unidadesMedida.map(u => ({ value: u.id, label: `${u.nome} (${u.simbolo})` }))]}
                    placeholder="Un. medida"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor un *</label>
                  <input type="number" step="0.01" value={form.valor_unitario}
                    onChange={e => {
                      const vu = e.target.value
                      const vTotal = vu && form.quantidade ? (parseFloat(form.quantidade) * parseFloat(vu)).toFixed(2) : ''
                      setForm(f => ({ ...f, valor_unitario: vu, valor_total: vTotal }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total</label>
                  <input type="text" value={form.valor_total} readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium" />
                </div>
              </div>

              {/* Linha 5: Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              
              {/* Upload de Arquivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Upload className="w-4 h-4" /> Anexar Arquivo (PDF, Imagem - máx 10MB)
                </label>
                <div className="space-y-2">
                  <input 
                    type="file" 
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  {selectedFile && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <FileText className="w-4 h-4" />
                      {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                  {form.arquivo_url && !selectedFile && (
                    <a href={form.arquivo_url} target="_blank" rel="noopener noreferrer" 
                      className="flex items-center gap-2 text-sm text-indigo-600 hover:underline">
                      <FileText className="w-4 h-4" />
                      Ver arquivo anexado
                    </a>
                  )}
                  {uploadingFile && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Fazendo upload...
                    </div>
                  )}
                </div>
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

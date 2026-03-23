import { useEffect, useState } from 'react'
import { ShoppingCart, Plus, Pencil, Trash2, X, Loader2, Search, FileSpreadsheet, Upload, FileText, Settings, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { getContratosVenda, createContratoVenda, updateContratoVenda, deleteContratoVenda, getCadastros, getProdutos, getSafras, getAnosSafra, getTiposContrato, getUnidadesMedida, syncContratoVendaSafras } from '../services/api'
import SearchableSelect from '../components/SearchableSelect'
import MultiSearchableSelect from '../components/MultiSearchableSelect'
import InfoTooltip from '../components/InfoTooltip'
import { useSort } from '../hooks/useSort'
import SortHeader from '../components/SortHeader'
import { fmtBRL, fmtDec, fmtData, fmtNumInput, parseNumInput, handleDecInput, handleIntInput } from '../utils/format'
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
  numero_contrato: '', comprador_id: '', corretor_id: '', produto_id: '', ano_safra_id: '',
  safra_ids: [] as string[],
  tipo_contrato_id: '', quantidade: '', unidade_medida_id: '', valor_unitario: '', valor_total: '',
  modalidade: 'FOB', data_contrato: '', data_entrega_inicio: '', data_entrega_fim: '', status: 'negociacao',
  local_entrega_id: '', observacoes: '', ativo: true, arquivo_url: '',
}

export default function ContratosVenda() {
  const [items, setItems] = useState<any[]>([])
  const [cadastros, setCadastros] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [safras, setSafras] = useState<any[]>([])
  const [anosSafra, setAnosSafra] = useState<any[]>([])
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
  const [unidadeExibicao, setUnidadeExibicao] = useState('tn')
  const [showColumnConfig, setShowColumnConfig] = useState(false)
  const [columns, setColumns] = useState([
    { key: 'numero_contrato', label: 'Nº', visible: true, order: 1 },
    { key: 'comprador_nome', label: 'Comprador', visible: true, order: 2 },
    { key: 'produto_nome', label: 'Produto', visible: true, order: 3 },
    { key: 'safras_nomes', label: 'Safras', visible: true, order: 4 },
    { key: 'volume', label: 'Volume', visible: true, order: 5 },
    { key: 'preco_valor', label: 'Preço', visible: true, order: 6 },
    { key: 'modalidade', label: 'Mod.', visible: true, order: 7 },
    { key: 'status', label: 'Status', visible: true, order: 8 },
  ])

  const load = () => {
    setLoading(true)
    Promise.all([
      getContratosVenda().catch(() => []), 
      getCadastros(), 
      getProdutos(), 
      getSafras().catch(() => []),
      getAnosSafra().catch(() => []),
      getTiposContrato().catch(() => []),
      getUnidadesMedida().catch(() => [])
    ])
      .then(([cv, c, p, s, as, tc, um]) => { 
        setItems(cv); 
        setCadastros(c); 
        setProdutos(p); 
        setSafras(s);
        setAnosSafra(as);
        setTiposContrato(tc);
        setUnidadesMedida(um);
      })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])


  const compradores = cadastros.filter(c => (c.tipos || []).some((t: string) => ['Comprador', 'Industria', 'Armazem', 'Porto'].includes(t)))
  const corretores = cadastros.filter(c => (c.tipos || []).includes('Corretor'))
  const locaisEntrega = cadastros.filter(c => (c.tipos || []).some((t: string) => ['Armazem', 'Industria', 'Porto', 'Fazenda'].includes(t)))

  const openNew = () => { setEditing(null); setForm(emptyForm); setSelectedFile(null); setShowForm(true) }
  const openEdit = (item: any) => {
    setEditing(item)
    setForm({
      numero_contrato: item.numero_contrato || '',
      comprador_id: item.comprador_id || '', corretor_id: item.corretor_id || '',
      produto_id: item.produto_id || '', ano_safra_id: item.ano_safra_id || '',
      safra_ids: item.safra_ids || [],
      tipo_contrato_id: item.tipo_contrato_id || '',
      quantidade: item.quantidade != null ? fmtNumInput(item.quantidade) : '',
      unidade_medida_id: item.unidade_medida_id || '',
      valor_unitario: item.valor_unitario != null ? fmtNumInput(item.valor_unitario, 2) : '',
      valor_total: item.valor_total != null ? fmtNumInput(item.valor_total, 2) : '',
      modalidade: item.modalidade || 'FOB',
      data_contrato: item.data_contrato || '', data_entrega_inicio: item.data_entrega_inicio || '',
      data_entrega_fim: item.data_entrega_fim || '', status: item.status || 'negociacao',
      local_entrega_id: item.local_entrega_id || '', observacoes: item.observacoes || '',
      ativo: item.ativo, arquivo_url: item.arquivo_url || '',
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
      formData.append('bucket', 'contratosdevenda-img')
      formData.append('fileName', fileName)
      
      console.log('Enviando arquivo:', { bucket: 'contratosdevenda-img', fileName })
      
      const resp = await fetch('/api/upload-file', {
        method: 'POST',
        body: formData
      })
      
      const data = await resp.json()
      console.log('Resposta da API:', data)
      
      if (!resp.ok) {
        const errorMsg = data.error || data.message || `HTTP ${resp.status}`
        throw new Error(errorMsg)
      }
      
      toast.success('Arquivo enviado com sucesso!')
      return data.publicUrl
    } catch (err: any) {
      console.error('Erro no upload:', err)
      toast.error(`Erro ao enviar arquivo: ${err?.message || 'Erro desconhecido'}`)
      return null
    } finally {
      setUploadingFile(false)
    }
  }

  const deleteFile = async () => {
    if (!form.arquivo_url) return
    
    if (!confirm('Deseja remover o arquivo anexado?')) return
    
    try {
      // Extrair nome do arquivo da URL
      const urlParts = form.arquivo_url.split('/')
      const fileName = urlParts[urlParts.length - 1]
      
      const resp = await fetch('/api/delete-file', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket: 'contratosdevenda-img', fileName })
      })
      
      if (!resp.ok) {
        const data = await resp.json()
        throw new Error(data.error || 'Erro ao remover arquivo')
      }
      
      // Limpar URL do arquivo no formulário
      setForm(prev => ({ ...prev, arquivo_url: '' }))
      toast.success('Arquivo removido com sucesso!')
    } catch (err: any) {
      console.error('Erro ao remover arquivo:', err)
      toast.error(`Erro ao remover arquivo: ${err?.message || 'Erro desconhecido'}`)
    }
  }

  const save = async () => {
    if (!form.comprador_id || !form.produto_id || !form.quantidade || !form.valor_unitario) {
      toast.error('Comprador, Produto, Quantidade e Valor Unitário são obrigatórios'); return
    }
    setSaving(true)
    try {
      // Upload do arquivo se houver
      const arquivoUrl = await uploadFile()
      
      // Calcular valor total (parse dos valores formatados pt-BR)
      const quantidade = parseNumInput(form.quantidade) || 0
      const valorUnitario = parseNumInput(form.valor_unitario) || 0
      const valorTotal = quantidade * valorUnitario
      
      const { safra_ids, ...formRest } = form
      const payload: any = {
        ...formRest,
        quantidade,
        valor_unitario: valorUnitario,
        valor_total: valorTotal,
        ano_safra_id: form.ano_safra_id || null,
        corretor_id: form.corretor_id || null,
        tipo_contrato_id: form.tipo_contrato_id || null,
        unidade_medida_id: form.unidade_medida_id || null,
        local_entrega_id: form.local_entrega_id || null,
        data_contrato: form.data_contrato || null,
        data_entrega_inicio: form.data_entrega_inicio || null,
        data_entrega_fim: form.data_entrega_fim || null,
        observacoes: form.observacoes || null,
        numero_contrato: form.numero_contrato || null,
        arquivo_url: arquivoUrl || null,
      }
      let result: any
      if (editing) { result = await updateContratoVenda(editing.id, payload) }
      else { result = await createContratoVenda(payload) }
      await syncContratoVendaSafras(result.id, safra_ids)
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
      (i.safras_nomes || []).join(' ').toLowerCase().includes(term)
  })

  const { sortedData: sorted, sortKey, sortDirection, toggleSort } = useSort(filtered)

  const getStatusBadge = (status: string) => {
    const s = STATUS_OPTIONS.find(o => o.value === status)
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s?.color || 'bg-gray-100 text-gray-600'}`}>{s?.label || status}</span>
  }

  const convertVolume = (quantidade: number, fatorOrigem: number, simboloDestino: string) => {
    const unidadeDestino = unidadesMedida.find(u => u.simbolo === simboloDestino)
    if (!unidadeDestino) return quantidade
    return (quantidade * fatorOrigem) / unidadeDestino.fator_conversao
  }

  const convertPrice = (precoUnitario: number, fatorOrigem: number, simboloDestino: string) => {
    const unidadeDestino = unidadesMedida.find(u => u.simbolo === simboloDestino)
    if (!unidadeDestino) return precoUnitario
    return (precoUnitario * unidadeDestino.fator_conversao) / fatorOrigem
  }

  const visibleColumns = columns.filter(c => c.visible).sort((a, b) => a.order - b.order)

  const toggleColumn = (key: string) => {
    setColumns(cols => cols.map(c => c.key === key ? { ...c, visible: !c.visible } : c))
  }

  const reorderColumn = (key: string, newOrder: number) => {
    setColumns(cols => cols.map(c => c.key === key ? { ...c, order: newOrder } : c))
  }

  const restoreDefaultColumns = () => {
    setColumns([
      { key: 'numero_contrato', label: 'Nº', visible: true, order: 1 },
      { key: 'comprador_nome', label: 'Comprador', visible: true, order: 2 },
      { key: 'produto_nome', label: 'Produto', visible: true, order: 3 },
      { key: 'safras_nomes', label: 'Safras', visible: true, order: 4 },
      { key: 'volume', label: 'Volume', visible: true, order: 5 },
      { key: 'preco_valor', label: 'Preço', visible: true, order: 6 },
      { key: 'modalidade', label: 'Mod.', visible: true, order: 7 },
      { key: 'status', label: 'Status', visible: true, order: 8 },
    ])
  }

  const handleExportExcel = () => {
    exportToExcel({
      filename: 'contratos_venda_contagru', title: 'Contratos de Venda',
      columns: [
        { key: 'numero_contrato', label: 'Nº Contrato' },
        { key: 'comprador_nome', label: 'Comprador' },
        { key: 'produto_nome', label: 'Produto' },
        { key: 'safras_nomes', label: 'Safras' },
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
          <button onClick={handleExportExcel} className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm sm:text-base whitespace-nowrap">
            <FileSpreadsheet className="w-4 h-4" /><span className="hidden sm:inline">Excel</span>
          </button>
          <button onClick={() => setShowColumnConfig(true)} className="flex items-center gap-2 bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 text-sm">
            <Settings className="w-4 h-4" /> Colunas
          </button>
          <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 sm:px-4 rounded-lg hover:bg-blue-700 text-sm sm:text-base whitespace-nowrap">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Novo</span> Contrato
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input type="text" placeholder="Buscar por comprador, produto, safra, nº contrato..." value={busca} onChange={e => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
        </div>
        <select value={unidadeExibicao} onChange={e => setUnidadeExibicao(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-medium">
          {unidadesMedida.filter(u => u.ativo && u.grupo === 'sólido').map(u => (
            <option key={u.id} value={u.simbolo}>{u.simbolo.toUpperCase()}</option>
          ))}
        </select>
      </div>

      <p className="text-xs text-gray-500 mb-2">{filtered.length} de {items.length} contratos</p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-gray-50 border-b">
            <tr>
              {visibleColumns.map(col => {
                if (col.key === 'volume') {
                  return <SortHeader key={col.key} label={`Volume (${unidadeExibicao})`} field="volume_tons" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} align="right" />
                }
                if (col.key === 'preco_valor') {
                  return <SortHeader key={col.key} label={col.label} field={col.key} sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} align="right" />
                }
                if (col.key === 'modalidade') {
                  return <th key={col.key} className="px-4 py-3 font-semibold text-gray-600 text-center">{col.label}</th>
                }
                return <SortHeader key={col.key} label={col.label} field={col.key} sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
              })}
              <th className="text-right px-4 py-3 font-semibold text-gray-600 w-24">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map((item: any) => (
              <tr key={item.id} className="hover:bg-gray-50">
                {visibleColumns.map(col => {
                  if (col.key === 'numero_contrato') return <td key={col.key} className="px-4 py-3 text-gray-600">{item.numero_contrato || '-'}</td>
                  if (col.key === 'comprador_nome') return <td key={col.key} className="px-4 py-3 font-medium">{item.comprador_nome}</td>
                  if (col.key === 'produto_nome') return <td key={col.key} className="px-4 py-3 text-gray-600">{item.produto_nome}</td>
                  if (col.key === 'safras_nomes') return <td key={col.key} className="px-4 py-3 text-gray-600">{item.safras_nomes?.length > 0 ? item.safras_nomes.join(', ') : '-'}</td>
                  if (col.key === 'volume') {
                    const volumeConvertido = convertVolume(item.volume_tons || 0, item.unidade_fator || 1, unidadeExibicao)
                    return <td key={col.key} className="px-4 py-3 text-right font-medium">{fmtDec(volumeConvertido, 2)}</td>
                  }
                  if (col.key === 'preco_valor') {
                    const precoConvertido = convertPrice(item.preco_valor || 0, item.unidade_fator || 1, unidadeExibicao)
                    return <td key={col.key} className="px-4 py-3 text-right">{fmtBRL(precoConvertido)} <span className="text-xs text-gray-400">/{unidadeExibicao}</span></td>
                  }
                  if (col.key === 'modalidade') return <td key={col.key} className="px-4 py-3 text-center text-xs font-medium">{item.modalidade}</td>
                  if (col.key === 'status') return <td key={col.key} className="px-4 py-3">{getStatusBadge(item.status)}</td>
                  return <td key={col.key} className="px-4 py-3">-</td>
                })}
                <td className="px-4 py-3 text-right space-x-1">
                  <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && <tr><td colSpan={visibleColumns.length + 1} className="px-4 py-8 text-center text-gray-400">Nenhum contrato cadastrado</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-8">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Editar' : 'Novo'} Contrato de Venda</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              {/* Linha 1: Ano Safra / Safra / Modalidade Frete */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ano Safra</label>
                  <SearchableSelect value={form.ano_safra_id} onChange={val => setForm(f => ({ ...f, ano_safra_id: val, safra_ids: [] }))}
                    options={[{ value: '', label: 'Todos' }, ...anosSafra.filter((a: any) => a.ativo).map((a: any) => ({ value: a.id, label: a.nome }))]} placeholder="Ano Safra" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Safras (pode selecionar mais de uma)</label>
                  <MultiSearchableSelect
                    values={form.safra_ids}
                    onChange={(vals) => setForm(f => ({ ...f, safra_ids: vals }))}
                    options={safras.filter(s => s.ativo && (!form.ano_safra_id || s.ano_safra_id === form.ano_safra_id)).map(s => ({ value: s.id, label: s.nome }))}
                    placeholder="Selecione as safras..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    Modalidade Frete
                    <InfoTooltip text="FOB: Frete pago pelo comprador | CIF: Frete pago pelo vendedor" />
                  </label>
                  <SearchableSelect value={form.modalidade} onChange={val => setForm(f => ({ ...f, modalidade: val }))}
                    options={MODALIDADES.map(m => ({ value: m, label: m }))} placeholder="Modalidade" />
                </div>
              </div>

              {/* Linha 2: Nº Contrato / Data Contrato / Tipo Contrato */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nº Contrato</label>
                  <input type="text" value={form.numero_contrato} onChange={e => setForm(f => ({ ...f, numero_contrato: e.target.value }))}
                    placeholder="Ex: CV-001" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    Data Contrato
                    <InfoTooltip text="Data de fechamento do contrato" />
                  </label>
                  <input type="date" value={form.data_contrato} onChange={e => setForm(f => ({ ...f, data_contrato: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
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

              {/* Linha 3: Data Inicial Entrega / Data Final Entrega / Corretor */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial Entrega</label>
                  <input type="date" value={form.data_entrega_inicio} onChange={e => setForm(f => ({ ...f, data_entrega_inicio: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Final Entrega</label>
                  <input type="date" value={form.data_entrega_fim} onChange={e => setForm(f => ({ ...f, data_entrega_fim: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Corretor</label>
                  <SearchableSelect
                    value={form.corretor_id}
                    onChange={(val) => setForm(f => ({ ...f, corretor_id: val }))}
                    options={[{ value: '', label: 'Nenhum' }, ...corretores.map(c => ({ value: c.id, label: c.nome_fantasia || c.nome }))]}
                    placeholder="Selecione o corretor"
                  />
                </div>
              </div>

              {/* Linha 4: Comprador / Local Entrega */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comprador *</label>
                  <SearchableSelect
                    value={form.comprador_id}
                    onChange={(val) => setForm(f => ({ ...f, comprador_id: val }))}
                    options={[{ value: '', label: 'Selecione' }, ...compradores.map(c => ({ value: c.id, label: c.nome_fantasia || c.nome }))]}
                    placeholder="Selecione o comprador"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Local de Entrega</label>
                  <SearchableSelect
                    value={form.local_entrega_id}
                    onChange={(val) => setForm(f => ({ ...f, local_entrega_id: val }))}
                    options={[{ value: '', label: 'Nenhum' }, ...locaisEntrega.map(l => ({ value: l.id, label: l.nome_fantasia || l.nome }))]}
                    placeholder="Selecione o local"
                  />
                </div>
              </div>

              {/* Linha 5: Produto / Quantidade / Unidade / Valor un / Valor Total */}
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
                  <input type="text" inputMode="decimal" value={form.quantidade} 
                    onChange={e => {
                      const q = handleIntInput(e.target.value)
                      const qNum = parseNumInput(q)
                      const vuNum = parseNumInput(form.valor_unitario)
                      const vTotal = qNum && vuNum ? fmtNumInput(qNum * vuNum, 2) : ''
                      setForm(f => ({ ...f, quantidade: q, valor_total: vTotal }))
                    }}
                    placeholder="600.000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
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
                  <input type="text" inputMode="decimal" value={form.valor_unitario}
                    onChange={e => {
                      const vu = handleDecInput(e.target.value)
                      const vuNum = parseNumInput(vu)
                      const qNum = parseNumInput(form.quantidade)
                      const vTotal = vuNum && qNum ? fmtNumInput(qNum * vuNum, 2) : ''
                      setForm(f => ({ ...f, valor_unitario: vu, valor_total: vTotal }))
                    }}
                    placeholder="0,00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total</label>
                  <input type="text" value={form.valor_total} readOnly
                    placeholder="Calculado"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium" />
                </div>
              </div>

              {/* Linha 6: Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {selectedFile && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <FileText className="w-4 h-4" />
                      {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                  {form.arquivo_url && !selectedFile && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-green-600" />
                          <span className="text-sm text-green-800 font-medium">Arquivo anexado</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a href={form.arquivo_url} target="_blank" rel="noopener noreferrer" 
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" /> Ver
                          </a>
                          <button onClick={deleteFile} 
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors flex items-center gap-1">
                            <Trash2 className="w-3.5 h-3.5" /> Excluir
                          </button>
                        </div>
                      </div>
                    </div>
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

      {/* Modal Configuração de Colunas */}
      {showColumnConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Configurações de Colunas</h2>
              <button onClick={() => setShowColumnConfig(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-sm text-gray-600 mb-4">Selecione quais colunas exibir e defina a ordem (1 = primeira coluna):</p>
              <div className="space-y-2">
                {columns.map(col => (
                  <div key={col.key} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <input type="checkbox" checked={col.visible} onChange={() => toggleColumn(col.key)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="flex-1 text-sm font-medium">{col.label}</span>
                    <input type="number" min="1" max={columns.length} value={col.order}
                      onChange={e => reorderColumn(col.key, parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between p-4 border-t">
              <button onClick={restoreDefaultColumns}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                Restaurar Padrão
              </button>
              <button onClick={() => setShowColumnConfig(false)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

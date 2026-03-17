import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Filter, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { getProdutos, createProduto, updateProduto, deleteProduto } from '../services/api'
import ViewModal, { Field } from '../components/ViewModal'

const TIPOS = ['Grao', 'Insumo']
const UNIDADES = ['ton', 'kg', 'sc', 'l']
const emptyForm = { nome: '', tipo: 'Grao', unidade_medida: 'ton', observacoes: '', ativo: true }

export default function Produtos() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState<{id: string, field: string, value: string}[]>([])
  const [showFilterOptions, setShowFilterOptions] = useState(false)
  const [viewingItem, setViewingItem] = useState<any>(null)

  const load = () => { setLoading(true); getProdutos().then(setItems).catch(() => toast.error('Erro ao carregar')).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (item: any) => {
    setEditing(item)
    setForm({ nome: item.nome, tipo: item.tipo, unidade_medida: item.unidade_medida, observacoes: item.observacoes || '', ativo: item.ativo })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.nome || !form.tipo) { toast.error('Nome e tipo são obrigatórios'); return }
    try {
      if (editing) { await updateProduto(editing.id, form); toast.success('Produto atualizado') }
      else { await createProduto(form); toast.success('Produto cadastrado') }
      setShowForm(false); load()
    } catch { toast.error('Erro ao salvar') }
  }

  const remove = async (id: string) => {
    if (!confirm('Deseja remover este produto?')) return
    try { await deleteProduto(id); toast.success('Produto removido'); load() }
    catch { toast.error('Erro ao remover') }
  }

  const FILTER_FIELDS = [
    { key: 'tipo', label: 'Tipo', type: 'select', options: () => TIPOS.map(t => ({ value: t, label: t })) },
    { key: 'unidade', label: 'Unidade de Medida', type: 'select', options: () => UNIDADES.map(u => ({ value: u, label: u })) },
    { key: 'nome', label: 'Nome do Produto', type: 'text' },
  ]

  const addFilter = (field: string) => {
    setActiveFilters([...activeFilters, { id: Date.now().toString(), field, value: '' }])
    setShowFilterOptions(false)
  }

  const updateFilterValue = (id: string, value: string) => {
    setActiveFilters(activeFilters.map(f => f.id === id ? { ...f, value } : f))
  }

  const removeFilter = (id: string) => {
    setActiveFilters(activeFilters.filter(f => f.id !== id))
  }

  const clearAllFilters = () => {
    setActiveFilters([])
    setSearchTerm('')
  }

  const filteredItems = items.filter(item => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const matchesSearch = (
        (item.nome || '').toLowerCase().includes(term) ||
        (item.tipo || '').toLowerCase().includes(term) ||
        (item.unidade_medida || '').toLowerCase().includes(term)
      )
      if (!matchesSearch) return false
    }
    for (const filter of activeFilters) {
      if (!filter.value) continue
      switch (filter.field) {
        case 'tipo': if (item.tipo !== filter.value) return false; break
        case 'unidade': if (item.unidade_medida !== filter.value) return false; break
        case 'nome': if (!(item.nome || '').toLowerCase().includes(filter.value.toLowerCase())) return false; break
      }
    }
    return true
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Produtos Transportados</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 sm:px-4 rounded-lg hover:bg-green-700 text-sm sm:text-base whitespace-nowrap"><Plus className="w-4 h-4" /> <span className="hidden sm:inline">Novo</span> Produto</button>
      </div>

      <div className="mb-4 space-y-3">
        <div className="relative flex-1">
          <input type="text" placeholder="Buscar por nome, tipo, unidade..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
          <Filter className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
        </div>
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            {activeFilters.map((filter) => {
              const fieldDef = FILTER_FIELDS.find(f => f.key === filter.field)
              if (!fieldDef) return null
              return (
                <div key={filter.id} className="flex items-center gap-2 bg-gray-100 rounded-lg p-2 pr-3">
                  <span className="text-xs font-medium text-gray-600">{fieldDef.label}:</span>
                  {fieldDef.type === 'select' ? (
                    <select value={filter.value} onChange={e => updateFilterValue(filter.id, e.target.value)}
                      className="text-sm border-0 bg-transparent focus:ring-0 p-0 pr-6">
                      <option value="">Selecione...</option>
                      {fieldDef.options && fieldDef.options().map((opt: any) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" value={filter.value} onChange={e => updateFilterValue(filter.id, e.target.value)}
                      placeholder="Digite..." className="text-sm border-0 bg-transparent focus:ring-0 p-0 w-32" />
                  )}
                  <button onClick={() => removeFilter(filter.id)} className="p-1 hover:bg-gray-200 rounded">
                    <X className="w-3 h-3 text-gray-500" />
                  </button>
                </div>
              )
            })}
            <button onClick={clearAllFilters} className="text-xs text-red-600 hover:text-red-700 font-medium px-2">Limpar todos</button>
          </div>
        )}
        <div className="relative">
          <button onClick={() => setShowFilterOptions(!showFilterOptions)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            <Plus className="w-4 h-4" /> Adicionar Filtro <ChevronDown className="w-4 h-4" />
          </button>
          {showFilterOptions && (
            <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto w-64">
              {FILTER_FIELDS.filter(f => !activeFilters.find(af => af.field === f.key)).map(field => (
                <button key={field.key} onClick={() => addFilter(field.key)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">{field.label}</button>
              ))}
              {FILTER_FIELDS.filter(f => !activeFilters.find(af => af.field === f.key)).length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">Todos os filtros já foram adicionados</div>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? <p className="text-gray-500">Carregando...</p> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto -mx-3 sm:mx-0">
          <table className="w-full text-sm min-w-[450px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nome</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Unidade</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredItems.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setViewingItem(item)}>
                  <td className="px-4 py-3 font-medium">{item.nome}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${item.tipo === 'Grao' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{item.tipo === 'Grao' ? 'Grao' : 'Insumo'}</span></td>
                  <td className="px-4 py-3 text-gray-600">{item.unidade_medida}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${item.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.ativo ? 'Ativo' : 'Inativo'}</span></td>
                  <td className="px-4 py-3 text-right space-x-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhum produto cadastrado</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white sm:rounded-xl shadow-xl w-full max-w-md sm:mx-4 max-h-screen sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                  <select value={form.unidade_medida} onChange={e => setForm({...form, unidade_medida: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={save} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização */}
      <ViewModal
        title="Detalhes do Produto"
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        onEdit={() => { openEdit(viewingItem); setViewingItem(null) }}
      >
        {viewingItem && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Nome" value={viewingItem.nome} />
            <Field label="Tipo" value={viewingItem.tipo} />
            <Field label="Unidade de Medida" value={viewingItem.unidade_medida} />
            <Field label="Status" value={viewingItem.ativo ? 'Ativo' : 'Inativo'} />
            <Field label="Observações" value={viewingItem.observacoes} full />
          </dl>
        )}
      </ViewModal>
    </div>
  )
}

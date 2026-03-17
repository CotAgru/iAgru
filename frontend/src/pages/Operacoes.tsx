import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, FolderOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { getOperacoes, createOperacao, updateOperacao, deleteOperacao, getAnosSafra } from '../services/api'

const STATUS_OPS = [
  { value: 'ativa', label: 'Ativa', color: 'bg-green-100 text-green-700' },
  { value: 'encerrada', label: 'Encerrada', color: 'bg-gray-100 text-gray-700' },
  { value: 'cancelada', label: 'Cancelada', color: 'bg-red-100 text-red-700' },
]

const emptyForm = {
  nome: '', descricao: '', data_inicio: '', data_fim: '', status: 'ativa', ano_safra_id: '', ativo: true,
}

export default function Operacoes() {
  const [items, setItems] = useState<any[]>([])
  const [anosSafra, setAnosSafra] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)

  const load = () => {
    setLoading(true)
    Promise.all([getOperacoes(), getAnosSafra()])
      .then(([ops, as]) => { setItems(ops); setAnosSafra(as) })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (item: any) => {
    setEditing(item)
    setForm({
      nome: item.nome || '', descricao: item.descricao || '',
      data_inicio: item.data_inicio || '', data_fim: item.data_fim || '',
      status: item.status || 'ativa', ano_safra_id: item.ano_safra_id || '', ativo: item.ativo,
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.nome.trim()) { toast.error('Nome da operação é obrigatório'); return }
    const payload = {
      ...form,
      descricao: form.descricao || null,
      data_inicio: form.data_inicio || null,
      data_fim: form.data_fim || null,
      ano_safra_id: form.ano_safra_id || null,
    }
    try {
      if (editing) { await updateOperacao(editing.id, payload); toast.success('Operação atualizada') }
      else { await createOperacao(payload); toast.success('Operação criada') }
      setShowForm(false); load()
    } catch { toast.error('Erro ao salvar') }
  }

  const remove = async (id: string) => {
    if (!confirm('Deseja remover esta operação?')) return
    try { await deleteOperacao(id); toast.success('Operação removida'); load() }
    catch { toast.error('Erro ao remover') }
  }

  const statusInfo = (s: string) => STATUS_OPS.find(x => x.value === s) || STATUS_OPS[0]

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-green-700" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Operações</h1>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 sm:px-4 rounded-lg hover:bg-green-700 text-sm sm:text-base whitespace-nowrap">
          <Plus className="w-4 h-4" /> Nova Operação
        </button>
      </div>

      {loading ? <p className="text-gray-500">Carregando...</p> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item: any) => {
            const st = statusInfo(item.status)
            return (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-800 text-base">{item.nome}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                </div>
                {item.descricao && <p className="text-sm text-gray-500 mb-2 line-clamp-2">{item.descricao}</p>}
                {item.ano_safra_nome && <p className="text-xs text-blue-600 font-medium mb-2">Safra: {item.ano_safra_nome}</p>}
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                  {item.data_inicio && <span>Início: {item.data_inicio}</span>}
                  {item.data_fim && <span>Fim: {item.data_fim}</span>}
                  {!item.data_inicio && !item.data_fim && <span>Criado em {new Date(item.created_at).toLocaleDateString('pt-BR')}</span>}
                </div>
                <div className="flex justify-end gap-1 border-t pt-2">
                  <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            )
          })}
          {items.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma operação cadastrada</p>
              <p className="text-xs mt-1">Crie uma operação para organizar suas ordens e romaneios</p>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white sm:rounded-xl shadow-xl w-full max-w-lg sm:mx-4 max-h-screen sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Editar Operação' : 'Nova Operação'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Operação *</label>
                <input type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})}
                  placeholder="Ex: Colheita Soja 24/25"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
                  <input type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
                  <input type="date" value={form.data_fim} onChange={e => setForm({...form, data_fim: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    {STATUS_OPS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ano Safra</label>
                  <select value={form.ano_safra_id} onChange={e => setForm({...form, ano_safra_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="">Selecione...</option>
                    {anosSafra.filter((a: any) => a.ativo).map((a: any) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={save} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

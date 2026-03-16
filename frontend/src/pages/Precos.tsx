import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { getPrecos, createPreco, updatePreco, deletePreco, getLocais, getProdutos, getFornecedores } from '../services/api'

const UNIDADES_PRECO = ['R$/ton', 'R$/sc', 'R$/km', 'R$/viagem']
const emptyForm = { origem_id: '', destino_id: '', produto_id: '', fornecedor_id: '', valor: '', unidade_preco: 'R$/ton', distancia_km: '', vigencia_inicio: '', vigencia_fim: '', observacoes: '', ativo: 1 }

export default function Precos() {
  const [items, setItems] = useState<any[]>([])
  const [locais, setLocais] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [fornecedores, setFornecedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)

  const load = () => {
    setLoading(true)
    Promise.all([getPrecos(), getLocais(), getProdutos(), getFornecedores()])
      .then(([p, l, pr, f]) => { setItems(p); setLocais(l); setProdutos(pr); setFornecedores(f) })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (item: any) => {
    setEditing(item)
    setForm({ origem_id: item.origem_id, destino_id: item.destino_id, produto_id: item.produto_id, fornecedor_id: item.fornecedor_id || '', valor: item.valor?.toString() || '', unidade_preco: item.unidade_preco || 'R$/ton', distancia_km: item.distancia_km?.toString() || '', vigencia_inicio: item.vigencia_inicio || '', vigencia_fim: item.vigencia_fim || '', observacoes: item.observacoes || '', ativo: item.ativo })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.origem_id || !form.destino_id || !form.produto_id || !form.valor) { toast.error('Origem, destino, produto e valor sao obrigatorios'); return }
    const data = { ...form, valor: Number(form.valor), distancia_km: form.distancia_km ? Number(form.distancia_km) : null }
    try {
      if (editing) { await updatePreco(editing.id, data); toast.success('Preco atualizado') }
      else { await createPreco(data); toast.success('Preco cadastrado') }
      setShowForm(false); load()
    } catch { toast.error('Erro ao salvar') }
  }

  const remove = async (id: string) => {
    if (!confirm('Deseja remover este preco?')) return
    try { await deletePreco(id); toast.success('Preco removido'); load() } catch { toast.error('Erro ao remover') }
  }

  const fmtCur = (v: number) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Precos Contratados</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"><Plus className="w-4 h-4" /> Novo Preco</button>
      </div>
      {loading ? <p className="text-gray-500">Carregando...</p> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Origem</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Destino</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Produto</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Fornecedor</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Valor</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Dist.</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.origem_nome}</td>
                  <td className="px-4 py-3">{item.destino_nome}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${item.produto_tipo === 'Grao' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{item.produto_nome}</span></td>
                  <td className="px-4 py-3 text-gray-600">{item.fornecedor_nome || 'Geral'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-700">{fmtCur(item.valor)} <span className="text-xs text-gray-400 font-normal">{item.unidade_preco}</span></td>
                  <td className="px-4 py-3 text-right text-gray-600">{item.distancia_km ? `${item.distancia_km} km` : '-'}</td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhum preco cadastrado</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Editar Preco' : 'Novo Preco'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Origem *</label>
                <select value={form.origem_id} onChange={e => setForm({...form, origem_id: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  <option value="">Selecione...</option>
                  {locais.map((l: any) => <option key={l.id} value={l.id}>{l.nome} ({l.tipo})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destino *</label>
                <select value={form.destino_id} onChange={e => setForm({...form, destino_id: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  <option value="">Selecione...</option>
                  {locais.map((l: any) => <option key={l.id} value={l.id}>{l.nome} ({l.tipo})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Produto *</label>
                <select value={form.produto_id} onChange={e => setForm({...form, produto_id: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  <option value="">Selecione...</option>
                  {produtos.map((p: any) => <option key={p.id} value={p.id}>{p.nome} ({p.tipo})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
                <select value={form.fornecedor_id} onChange={e => setForm({...form, fornecedor_id: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  <option value="">Todos (preco geral)</option>
                  {fornecedores.map((f: any) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$) *</label>
                  <input type="number" step="0.01" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                  <select value={form.unidade_preco} onChange={e => setForm({...form, unidade_preco: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    {UNIDADES_PRECO.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dist. (km)</label>
                  <input type="number" value={form.distancia_km} onChange={e => setForm({...form, distancia_km: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes</label>
                <textarea value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
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

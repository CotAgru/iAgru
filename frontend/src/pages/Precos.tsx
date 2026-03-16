import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getPrecos, createPreco, updatePreco, deletePreco, getCadastros, getProdutos } from '../services/api'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
const UNIDADES_PRECO = ['R$/ton', 'R$/sc', 'R$/km', 'R$/viagem']
const TIPOS_ORIGEM_DESTINO = ['Fazenda', 'Armazem', 'Industria', 'Porto', 'Fornecedor']
const TIPOS_TRANSPORTADOR = ['Transportadora', 'Motorista']
const emptyForm = { origem_id: '', destino_id: '', produto_id: '', fornecedor_id: '', valor: '', unidade_preco: 'R$/ton', distancia_km: '', vigencia_inicio: '', vigencia_fim: '', observacoes: '', ativo: true }

export default function Precos() {
  const [items, setItems] = useState<any[]>([])
  const [allCadastros, setAllCadastros] = useState<any[]>([])
  const [origemDestino, setOrigemDestino] = useState<any[]>([])
  const [transportadores, setTransportadores] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)
  const [calcDist, setCalcDist] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([getPrecos(), getCadastros(), getProdutos()])
      .then(([p, c, pr]) => {
        setItems(p)
        setAllCadastros(c)
        setOrigemDestino(c.filter((x: any) => (x.tipos || []).some((t: string) => TIPOS_ORIGEM_DESTINO.includes(t))))
        setTransportadores(c.filter((x: any) => (x.tipos || []).some((t: string) => TIPOS_TRANSPORTADOR.includes(t))))
        setProdutos(pr)
      })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  // Calcular distancia automatica via Directions API
  const calcularDistancia = async (origemId: string, destinoId: string) => {
    if (!origemId || !destinoId || !GOOGLE_MAPS_API_KEY) return
    const origem = allCadastros.find((c: any) => c.id === origemId)
    const destino = allCadastros.find((c: any) => c.id === destinoId)
    if (!origem || !destino) return
    const origemStr = origem.latitude && origem.longitude
      ? `${origem.latitude},${origem.longitude}`
      : `${origem.cidade}, ${origem.uf}, Brasil`
    const destinoStr = destino.latitude && destino.longitude
      ? `${destino.latitude},${destino.longitude}`
      : `${destino.cidade}, ${destino.uf}, Brasil`
    setCalcDist(true)
    try {
      const resp = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origemStr)}&destination=${encodeURIComponent(destinoStr)}&key=${GOOGLE_MAPS_API_KEY}`)
      const data = await resp.json()
      if (data.routes?.[0]?.legs?.[0]?.distance) {
        const km = Math.round(data.routes[0].legs[0].distance.value / 1000)
        setForm(prev => ({ ...prev, distancia_km: km.toString() }))
      }
    } catch { /* silencioso */ }
    finally { setCalcDist(false) }
  }

  const onOrigemChange = (id: string) => {
    setForm(prev => ({ ...prev, origem_id: id }))
    if (id && form.destino_id) calcularDistancia(id, form.destino_id)
  }
  const onDestinoChange = (id: string) => {
    setForm(prev => ({ ...prev, destino_id: id }))
    if (form.origem_id && id) calcularDistancia(form.origem_id, id)
  }

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (item: any) => {
    setEditing(item)
    setForm({ origem_id: item.origem_id, destino_id: item.destino_id, produto_id: item.produto_id, fornecedor_id: item.fornecedor_id || '', valor: item.valor?.toString() || '', unidade_preco: item.unidade_preco || 'R$/ton', distancia_km: item.distancia_km?.toString() || '', vigencia_inicio: item.vigencia_inicio || '', vigencia_fim: item.vigencia_fim || '', observacoes: item.observacoes || '', ativo: item.ativo })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.origem_id || !form.destino_id || !form.produto_id || !form.valor) { toast.error('Origem, destino, produto e valor sao obrigatorios'); return }
    const payload: any = {
      origem_id: form.origem_id,
      destino_id: form.destino_id,
      produto_id: form.produto_id,
      fornecedor_id: form.fornecedor_id || null,
      valor: Number(form.valor),
      unidade_preco: form.unidade_preco,
      distancia_km: form.distancia_km ? Number(form.distancia_km) : null,
      observacoes: form.observacoes || null,
      ativo: form.ativo,
    }
    if (form.vigencia_inicio) payload.vigencia_inicio = form.vigencia_inicio
    if (form.vigencia_fim) payload.vigencia_fim = form.vigencia_fim
    try {
      if (editing) { await updatePreco(editing.id, payload); toast.success('Preco atualizado') }
      else { await createPreco(payload); toast.success('Preco cadastrado') }
      setShowForm(false); load()
    } catch (err: any) { toast.error('Erro ao salvar: ' + (err?.message || '')); console.error(err) }
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
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Transportador</th>
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
                <select value={form.origem_id} onChange={e => onOrigemChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  <option value="">Selecione...</option>
                  {origemDestino.map((l: any) => <option key={l.id} value={l.id}>{l.nome_fantasia || l.nome} ({(l.tipos||[]).join(', ')})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destino *</label>
                <select value={form.destino_id} onChange={e => onDestinoChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  <option value="">Selecione...</option>
                  {origemDestino.map((l: any) => <option key={l.id} value={l.id}>{l.nome_fantasia || l.nome} ({(l.tipos||[]).join(', ')})</option>)}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Transportador</label>
                <select value={form.fornecedor_id} onChange={e => setForm({...form, fornecedor_id: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  <option value="">Todos (preco geral)</option>
                  {transportadores.map((f: any) => <option key={f.id} value={f.id}>{f.nome_fantasia || f.nome}</option>)}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dist. (km) {calcDist && <Loader2 className="w-3 h-3 inline animate-spin" />}</label>
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

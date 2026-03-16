import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'
import { getOrdens, createOrdem, updateOrdem, deleteOrdem, getCadastros, getProdutos, getVeiculos, getPrecos } from '../services/api'

const STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'em_andamento', label: 'Em Andamento', color: 'bg-blue-100 text-blue-700' },
  { value: 'concluido', label: 'Concluido', color: 'bg-green-100 text-green-700' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-100 text-red-700' },
]
const TIPOS_ORIGEM = ['Fazenda', 'Armazem', 'Industria', 'Porto', 'Fornecedor']
const TIPOS_TRANSP = ['Transportadora', 'Motorista']

const emptyForm = {
  status: 'pendente', origem_id: '', destino_id: '', produto_id: '',
  transportador_id: '', motorista_id: '', veiculo_id: '', preco_id: '',
  quantidade_prevista: '', unidade: 'ton', observacoes: '', ativo: true,
}

export default function Ordens() {
  const [items, setItems] = useState<any[]>([])
  const [origens, setOrigens] = useState<any[]>([])
  const [transportadores, setTransportadores] = useState<any[]>([])
  const [motoristas, setMotoristas] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [veiculos, setVeiculos] = useState<any[]>([])
  const [precos, setPrecos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)

  const load = () => {
    setLoading(true)
    Promise.all([getOrdens(), getCadastros(), getProdutos(), getVeiculos(), getPrecos()])
      .then(([o, c, p, v, pr]) => {
        setItems(o)
        setOrigens(c.filter((x: any) => (x.tipos || []).some((t: string) => TIPOS_ORIGEM.includes(t))))
        setTransportadores(c.filter((x: any) => (x.tipos || []).some((t: string) => TIPOS_TRANSP.includes(t))))
        setMotoristas(c.filter((x: any) => (x.tipos || []).includes('Motorista')))
        setProdutos(p)
        setVeiculos(v)
        setPrecos(pr)
      })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (item: any) => {
    setEditing(item)
    setForm({
      status: item.status || 'pendente',
      origem_id: item.origem_id, destino_id: item.destino_id,
      produto_id: item.produto_id,
      transportador_id: item.transportador_id || '',
      motorista_id: item.motorista_id || '',
      veiculo_id: item.veiculo_id || '',
      preco_id: item.preco_id || '',
      quantidade_prevista: item.quantidade_prevista?.toString() || '',
      unidade: item.unidade || 'ton',
      observacoes: item.observacoes || '', ativo: item.ativo,
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.origem_id || !form.destino_id || !form.produto_id) {
      toast.error('Origem, destino e produto sao obrigatorios'); return
    }
    const payload: any = {
      status: form.status,
      origem_id: form.origem_id,
      destino_id: form.destino_id,
      produto_id: form.produto_id,
      transportador_id: form.transportador_id || null,
      motorista_id: form.motorista_id || null,
      veiculo_id: form.veiculo_id || null,
      preco_id: form.preco_id || null,
      quantidade_prevista: form.quantidade_prevista ? Number(form.quantidade_prevista) : null,
      unidade: form.unidade,
      observacoes: form.observacoes || null,
      ativo: form.ativo,
    }
    try {
      if (editing) { await updateOrdem(editing.id, payload); toast.success('Ordem atualizada') }
      else { await createOrdem(payload); toast.success('Ordem criada') }
      setShowForm(false); load()
    } catch (err: any) { toast.error('Erro ao salvar: ' + (err?.message || '')); console.error(err) }
  }

  const remove = async (id: string) => {
    if (!confirm('Deseja remover esta ordem?')) return
    try { await deleteOrdem(id); toast.success('Ordem removida'); load() }
    catch { toast.error('Erro ao remover') }
  }

  const statusInfo = (s: string) => STATUS_OPTIONS.find(x => x.value === s) || STATUS_OPTIONS[0]

  // Filtrar veiculos pelo motorista ou transportador selecionado
  const veiculosFiltrados = veiculos.filter((v: any) => {
    if (form.motorista_id && v.cadastro_id === form.motorista_id) return true
    if (form.transportador_id && v.cadastro_id === form.transportador_id) return true
    if (!form.motorista_id && !form.transportador_id) return true
    return false
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Ordens de Carregamento</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
          <Plus className="w-4 h-4" /> Nova Ordem
        </button>
      </div>

      {loading ? <p className="text-gray-500">Carregando...</p> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Origem</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Destino</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Produto</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Motorista</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Veiculo</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Qtd</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item: any) => {
                const st = statusInfo(item.status)
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{item.numero_ordem}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span></td>
                    <td className="px-4 py-3 font-medium">{item.origem_nome}</td>
                    <td className="px-4 py-3">{item.destino_nome}</td>
                    <td className="px-4 py-3">{item.produto_nome}</td>
                    <td className="px-4 py-3 text-gray-600">{item.motorista_nome || '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{item.veiculo_placa || '-'}</td>
                    <td className="px-4 py-3 text-right">{item.quantidade_prevista ? `${item.quantidade_prevista} ${item.unidade}` : '-'}</td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => remove(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                )
              })}
              {items.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Nenhuma ordem cadastrada</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Editar Ordem' : 'Nova Ordem de Carregamento'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Produto *</label>
                  <select value={form.produto_id} onChange={e => setForm({...form, produto_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="">Selecione...</option>
                    {produtos.map((p: any) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Origem *</label>
                  <select value={form.origem_id} onChange={e => setForm({...form, origem_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="">Selecione...</option>
                    {origens.map((l: any) => <option key={l.id} value={l.id}>{l.nome_fantasia || l.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destino *</label>
                  <select value={form.destino_id} onChange={e => setForm({...form, destino_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="">Selecione...</option>
                    {origens.map((l: any) => <option key={l.id} value={l.id}>{l.nome_fantasia || l.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transportadora</label>
                  <select value={form.transportador_id} onChange={e => setForm({...form, transportador_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="">Selecione...</option>
                    {transportadores.map((t: any) => <option key={t.id} value={t.id}>{t.nome_fantasia || t.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motorista</label>
                  <select value={form.motorista_id} onChange={e => setForm({...form, motorista_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="">Selecione...</option>
                    {motoristas.map((m: any) => <option key={m.id} value={m.id}>{m.nome_fantasia || m.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Veiculo</label>
                  <select value={form.veiculo_id} onChange={e => setForm({...form, veiculo_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="">Selecione...</option>
                    {veiculosFiltrados.map((v: any) => <option key={v.id} value={v.id}>{v.placa} ({v.tipo_caminhao})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qtd Prevista</label>
                  <input type="number" step="0.001" value={form.quantidade_prevista} onChange={e => setForm({...form, quantidade_prevista: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                  <select value={form.unidade} onChange={e => setForm({...form, unidade: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="ton">ton</option>
                    <option value="sc">sc</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preco Contratado (vinculo)</label>
                <select value={form.preco_id} onChange={e => setForm({...form, preco_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  <option value="">Nenhum</option>
                  {precos.map((p: any) => <option key={p.id} value={p.id}>{p.origem_nome} → {p.destino_nome} | {p.produto_nome} | {p.valor} {p.unidade_preco}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes</label>
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
    </div>
  )
}

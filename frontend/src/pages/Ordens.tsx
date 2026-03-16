import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Truck, User, Minus } from 'lucide-react'
import toast from 'react-hot-toast'
import { getOrdens, createOrdem, updateOrdem, deleteOrdem, getCadastros, getProdutos, getVeiculos, getPrecos, getOrdemTransportadores, addOrdemTransportador, removeOrdemTransportador } from '../services/api'

const STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'em_andamento', label: 'Em Andamento', color: 'bg-blue-100 text-blue-700' },
  { value: 'concluido', label: 'Concluido', color: 'bg-green-100 text-green-700' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-100 text-red-700' },
]
const TIPOS_ORIGEM = ['Fazenda', 'Armazem', 'Industria', 'Porto', 'Fornecedor']

const emptyForm = {
  nome_ordem: '', status: 'pendente', origem_id: '', destino_id: '', produto_id: '',
  preco_id: '', quantidade_prevista: '', unidade: 'ton', observacoes: '', ativo: true,
}

export default function Ordens() {
  const [items, setItems] = useState<any[]>([])
  const [allCadastros, setAllCadastros] = useState<any[]>([])
  const [origens, setOrigens] = useState<any[]>([])
  const [transportadoras, setTransportadoras] = useState<any[]>([])
  const [allMotoristas, setAllMotoristas] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [veiculos, setVeiculos] = useState<any[]>([])
  const [precos, setPrecos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)

  // Transportadores vinculados a ordem (junction table)
  const [ordemTransps, setOrdemTransps] = useState<any[]>([])
  const [addTranspId, setAddTranspId] = useState('')
  const [addMotoristaId, setAddMotoristaId] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([getOrdens(), getCadastros(), getProdutos(), getVeiculos(), getPrecos()])
      .then(([o, c, p, v, pr]) => {
        setItems(o)
        setAllCadastros(c)
        setOrigens(c.filter((x: any) => (x.tipos || []).some((t: string) => TIPOS_ORIGEM.includes(t))))
        setTransportadoras(c.filter((x: any) => (x.tipos || []).includes('Transportadora')))
        setAllMotoristas(c.filter((x: any) => (x.tipos || []).includes('Motorista')))
        setProdutos(p)
        setVeiculos(v)
        setPrecos(pr)
      })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const loadOrdemTransps = async (ordemId: string) => {
    try {
      const data = await getOrdemTransportadores(ordemId)
      setOrdemTransps(data)
    } catch { setOrdemTransps([]) }
  }

  const openNew = () => { setEditing(null); setForm(emptyForm); setOrdemTransps([]); setShowForm(true) }
  const openEdit = async (item: any) => {
    setEditing(item)
    setForm({
      nome_ordem: item.nome_ordem || '',
      status: item.status || 'pendente',
      origem_id: item.origem_id, destino_id: item.destino_id,
      produto_id: item.produto_id,
      preco_id: item.preco_id || '',
      quantidade_prevista: item.quantidade_prevista?.toString() || '',
      unidade: item.unidade || 'ton',
      observacoes: item.observacoes || '', ativo: item.ativo,
    })
    await loadOrdemTransps(item.id)
    setShowForm(true)
  }

  const save = async () => {
    if (!form.nome_ordem.trim()) { toast.error('Nome da Ordem e obrigatorio'); return }
    if (!form.origem_id || !form.destino_id || !form.produto_id) {
      toast.error('Origem, destino e produto sao obrigatorios'); return
    }
    const payload: any = {
      nome_ordem: form.nome_ordem,
      status: form.status,
      origem_id: form.origem_id,
      destino_id: form.destino_id,
      produto_id: form.produto_id,
      preco_id: form.preco_id || null,
      quantidade_prevista: form.quantidade_prevista ? Number(form.quantidade_prevista) : null,
      unidade: form.unidade,
      observacoes: form.observacoes || null,
      ativo: form.ativo,
    }
    try {
      let result: any
      if (editing) {
        result = await updateOrdem(editing.id, payload)
        toast.success('Ordem atualizada')
      } else {
        result = await createOrdem(payload)
        toast.success('Ordem criada')
        // Abrir para editar para poder adicionar transportadores
        setEditing(result)
        await loadOrdemTransps(result.id)
      }
      load()
    } catch (err: any) { toast.error('Erro ao salvar: ' + (err?.message || '')); console.error(err) }
  }

  const handleAddTransportadora = async () => {
    if (!editing?.id || !addTranspId) return
    // Ao selecionar transportadora, traz motoristas vinculados a ela
    const motoristosVinculados = allMotoristas.filter(m => m.transportador_id === addTranspId)
    try {
      if (motoristosVinculados.length > 0) {
        // Adicionar cada motorista vinculado
        for (const mot of motoristosVinculados) {
          const veiculo = veiculos.find((v: any) => v.cadastro_id === mot.id)
          await addOrdemTransportador({
            ordem_id: editing.id,
            transportador_id: addTranspId,
            motorista_id: mot.id,
            veiculo_id: veiculo?.id || null,
          })
        }
        toast.success(`Transportadora + ${motoristosVinculados.length} motorista(s) adicionado(s)`)
      } else {
        await addOrdemTransportador({
          ordem_id: editing.id,
          transportador_id: addTranspId,
          motorista_id: null,
          veiculo_id: null,
        })
        toast.success('Transportadora adicionada')
      }
      setAddTranspId('')
      await loadOrdemTransps(editing.id)
    } catch (err: any) { toast.error('Erro: ' + (err?.message || '')) }
  }

  const handleAddMotorista = async () => {
    if (!editing?.id || !addMotoristaId) return
    const mot = allMotoristas.find(m => m.id === addMotoristaId)
    const veiculo = veiculos.find((v: any) => v.cadastro_id === addMotoristaId)
    try {
      await addOrdemTransportador({
        ordem_id: editing.id,
        transportador_id: mot?.transportador_id || null,
        motorista_id: addMotoristaId,
        veiculo_id: veiculo?.id || null,
      })
      toast.success('Motorista adicionado')
      setAddMotoristaId('')
      await loadOrdemTransps(editing.id)
    } catch (err: any) { toast.error('Erro: ' + (err?.message || '')) }
  }

  const handleRemoveTransp = async (id: string) => {
    try {
      await removeOrdemTransportador(id)
      setOrdemTransps(prev => prev.filter(t => t.id !== id))
    } catch { toast.error('Erro ao remover') }
  }

  const remove = async (id: string) => {
    if (!confirm('Deseja remover esta ordem?')) return
    try { await deleteOrdem(id); toast.success('Ordem removida'); load() }
    catch { toast.error('Erro ao remover') }
  }

  const statusInfo = (s: string) => STATUS_OPTIONS.find(x => x.value === s) || STATUS_OPTIONS[0]

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
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Numero</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nome</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Origem</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Destino</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Produto</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Qtd</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item: any) => {
                const st = statusInfo(item.status)
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-blue-600 font-semibold">{item.numero_ordem_fmt || item.numero_ordem}</td>
                    <td className="px-4 py-3 font-medium">{item.nome_ordem || '-'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span></td>
                    <td className="px-4 py-3">{item.origem_nome}</td>
                    <td className="px-4 py-3">{item.destino_nome}</td>
                    <td className="px-4 py-3">{item.produto_nome}</td>
                    <td className="px-4 py-3 text-right">{item.quantidade_prevista ? `${item.quantidade_prevista} ${item.unidade}` : '-'}</td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => remove(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                )
              })}
              {items.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Nenhuma ordem cadastrada</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editing ? `Editar Ordem ${editing.numero_ordem_fmt || ''}` : 'Nova Ordem de Carregamento'}
              </h2>
              <button onClick={() => { setShowForm(false); load() }} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              {/* Nome + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Ordem *</label>
                  <input type="text" value={form.nome_ordem} onChange={e => setForm({...form, nome_ordem: e.target.value})}
                    placeholder="Ex: Transporte Soja Catalao"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              {editing && (
                <p className="text-xs text-gray-500">Numero gerado: <span className="font-mono font-semibold text-blue-600">{editing.numero_ordem_fmt || 'sera gerado ao salvar'}</span></p>
              )}

              {/* Origem + Destino */}
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

              {/* Produto + Qtd + Unidade */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Produto *</label>
                  <select value={form.produto_id} onChange={e => setForm({...form, produto_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="">Selecione...</option>
                    {produtos.map((p: any) => <option key={p.id} value={p.id}>{p.nome}</option>)}
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
                    <option value="ton">ton</option><option value="sc">sc</option><option value="kg">kg</option>
                  </select>
                </div>
              </div>

              {/* Preco Vinculado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preco Contratado (vinculo)</label>
                <select value={form.preco_id} onChange={e => setForm({...form, preco_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  <option value="">Nenhum</option>
                  {precos.map((p: any) => <option key={p.id} value={p.id}>{p.origem_nome} → {p.destino_nome} | {p.produto_nome} | {p.valor} {p.unidade_preco}</option>)}
                </select>
              </div>

              {/* Observacoes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes</label>
                <textarea value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>

              {/* Botao salvar antes de adicionar transportadores */}
              {!editing && (
                <div className="border-t pt-3">
                  <button onClick={save} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                    Salvar e Continuar (adicionar transportadores/motoristas)
                  </button>
                </div>
              )}

              {/* TRANSPORTADORES / MOTORISTAS (so aparece apos salvar) */}
              {editing && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Transportadores e Motoristas</h3>

                  {/* Adicionar transportadora */}
                  <div className="flex gap-2 mb-2">
                    <select value={addTranspId} onChange={e => setAddTranspId(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="">Selecionar Transportadora...</option>
                      {transportadoras.map((t: any) => <option key={t.id} value={t.id}>{t.nome_fantasia || t.nome}</option>)}
                    </select>
                    <button onClick={handleAddTransportadora} disabled={!addTranspId}
                      className="flex items-center gap-1 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 text-sm whitespace-nowrap">
                      <Truck className="w-4 h-4" /> + Transportadora
                    </button>
                  </div>

                  {/* Adicionar motorista avulso */}
                  <div className="flex gap-2 mb-3">
                    <select value={addMotoristaId} onChange={e => setAddMotoristaId(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="">Selecionar Motorista...</option>
                      {allMotoristas.map((m: any) => <option key={m.id} value={m.id}>{m.nome_fantasia || m.nome}</option>)}
                    </select>
                    <button onClick={handleAddMotorista} disabled={!addMotoristaId}
                      className="flex items-center gap-1 px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 text-sm whitespace-nowrap">
                      <User className="w-4 h-4" /> + Motorista
                    </button>
                  </div>

                  {/* Lista de vinculos */}
                  {ordemTransps.length > 0 ? (
                    <div className="space-y-2">
                      {ordemTransps.map((ot: any) => (
                        <div key={ot.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border">
                          <div className="flex items-center gap-3 text-sm">
                            {ot.transportador && (
                              <span className="flex items-center gap-1 text-orange-700 font-medium">
                                <Truck className="w-3.5 h-3.5" />{ot.transportador.nome_fantasia || ot.transportador.nome}
                              </span>
                            )}
                            {ot.motorista && (
                              <span className="flex items-center gap-1 text-indigo-700">
                                <User className="w-3.5 h-3.5" />{ot.motorista.nome_fantasia || ot.motorista.nome}
                              </span>
                            )}
                            {ot.veiculos && (
                              <span className="text-xs text-gray-500 font-mono">{ot.veiculos.placa}</span>
                            )}
                          </div>
                          <button onClick={() => handleRemoveTransp(ot.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-2">Nenhum transportador/motorista adicionado</p>
                  )}
                </div>
              )}
            </div>
            {editing && (
              <div className="flex justify-end gap-2 p-4 border-t">
                <button onClick={() => { setShowForm(false); load() }} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Fechar</button>
                <button onClick={save} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Salvar Alteracoes</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

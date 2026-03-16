import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Truck, User, Minus, Check, CarFront, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getOrdens, createOrdem, updateOrdem, deleteOrdem, getCadastros, getProdutos, getVeiculos, getPrecos, getOrdemTransportadores, addOrdemTransportador, removeOrdemTransportador, getOperacoes, createCadastro, createProduto, createPreco } from '../services/api'

const STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'em_andamento', label: 'Em Andamento', color: 'bg-blue-100 text-blue-700' },
  { value: 'concluido', label: 'Concluido', color: 'bg-green-100 text-green-700' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-100 text-red-700' },
]
const TIPOS_ORIGEM = ['Fazenda', 'Armazem', 'Industria', 'Porto', 'Fornecedor']

const emptyForm = {
  nome_ordem: '', status: 'pendente', operacao_id: '', origem_id: '', destino_id: '', produto_id: '',
  preco_id: '', quantidade_prevista: '', unidade: 'ton', observacoes: '', ativo: true,
}

// Estilo da opcao "+ Novo" nos selects (CSS inline pois <option> tem limitacoes)
const NOVO_LABEL = '\u2795 Novo cadastro...'
const NOVO_PROD_LABEL = '\u2795 Novo produto...'
const NOVO_PRECO_LABEL = '\u2795 Novo preco...'
const NOVO_TRANSP_LABEL = '\u2795 Nova transportadora...'
const NOVO_MOT_LABEL = '\u2795 Novo motorista...'

export default function Ordens() {
  const [items, setItems] = useState<any[]>([])
  const [allCadastros, setAllCadastros] = useState<any[]>([])
  const [origens, setOrigens] = useState<any[]>([])
  const [transportadoras, setTransportadoras] = useState<any[]>([])
  const [allMotoristas, setAllMotoristas] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [veiculos, setVeiculos] = useState<any[]>([])
  const [precos, setPrecos] = useState<any[]>([])
  const [operacoes, setOperacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)

  // Transportadores vinculados a ordem (junction table)
  const [ordemTransps, setOrdemTransps] = useState<any[]>([])
  // Transportadora selecionada e motoristas com checkboxes
  const [selectedTranspId, setSelectedTranspId] = useState('')

  // Pop-up inline: tipo e contexto
  const [popupType, setPopupType] = useState<string | null>(null)
  const [popupContext, setPopupContext] = useState('')
  const [savingPopup, setSavingPopup] = useState(false)
  const [miniCadForm, setMiniCadForm] = useState({ nome: '', nome_fantasia: '', cpf_cnpj: '', tipos: [] as string[], uf: '', cidade: '', transportador_id: '' })
  const [miniProdForm, setMiniProdForm] = useState({ nome: '', tipo: 'Grao', unidade_medida: 'ton' })
  const [miniPrecoForm, setMiniPrecoForm] = useState({ origem_id: '', destino_id: '', produto_id: '', fornecedor_id: '', valor: '', unidade_preco: 'R$/ton' })

  const load = () => {
    setLoading(true)
    Promise.all([getOrdens(), getCadastros(), getProdutos(), getVeiculos(), getPrecos(), getOperacoes()])
      .then(([o, c, p, v, pr, ops]) => {
        setItems(o)
        setAllCadastros(c)
        setOrigens(c.filter((x: any) => (x.tipos || []).some((t: string) => TIPOS_ORIGEM.includes(t))))
        setTransportadoras(c.filter((x: any) => (x.tipos || []).includes('Transportadora')))
        setAllMotoristas(c.filter((x: any) => (x.tipos || []).includes('Motorista')))
        setProdutos(p)
        setVeiculos(v)
        setPrecos(pr)
        setOperacoes(ops)
      })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }

  const reloadData = async () => {
    try {
      const [c, p, v, pr, ops] = await Promise.all([getCadastros(), getProdutos(), getVeiculos(), getPrecos(), getOperacoes()])
      setAllCadastros(c)
      setOrigens(c.filter((x: any) => (x.tipos || []).some((t: string) => TIPOS_ORIGEM.includes(t))))
      setTransportadoras(c.filter((x: any) => (x.tipos || []).includes('Transportadora')))
      setAllMotoristas(c.filter((x: any) => (x.tipos || []).includes('Motorista')))
      setProdutos(p)
      setVeiculos(v)
      setPrecos(pr)
      setOperacoes(ops)
    } catch {}
  }

  useEffect(() => { load() }, [])

  // Precos filtrados por origem×destino
  const precosFiltrados = (form.origem_id && form.destino_id)
    ? precos.filter((p: any) => p.origem_id === form.origem_id && p.destino_id === form.destino_id)
    : precos

  // Motoristas filtrados pela transportadora selecionada
  const motoristasDaTransp = selectedTranspId
    ? allMotoristas.filter(m => m.transportador_id === selectedTranspId)
    : []

  // Veiculos de um motorista
  const veiculosDoMot = (motId: string) => veiculos.filter((v: any) => v.cadastro_id === motId)

  const loadOrdemTransps = async (ordemId: string) => {
    try {
      const data = await getOrdemTransportadores(ordemId)
      setOrdemTransps(data)
    } catch { setOrdemTransps([]) }
  }

  const openNew = () => { setEditing(null); setForm(emptyForm); setOrdemTransps([]); setSelectedTranspId(''); setShowForm(true) }
  const openEdit = async (item: any) => {
    setEditing(item)
    setForm({
      nome_ordem: item.nome_ordem || '',
      status: item.status || 'pendente',
      operacao_id: item.operacao_id || '',
      origem_id: item.origem_id, destino_id: item.destino_id,
      produto_id: item.produto_id,
      preco_id: item.preco_id || '',
      quantidade_prevista: item.quantidade_prevista?.toString() || '',
      unidade: item.unidade || 'ton',
      observacoes: item.observacoes || '', ativo: item.ativo,
    })
    setSelectedTranspId('')
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
      operacao_id: form.operacao_id || null,
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
        setEditing(result)
        await loadOrdemTransps(result.id)
      }
      load()
    } catch (err: any) { toast.error('Erro ao salvar: ' + (err?.message || '')); console.error(err) }
  }

  // Ao selecionar transportadora, carregar seus motoristas/placas automaticamente
  const handleSelectTransp = async (transpId: string) => {
    if (transpId === '__novo__') { openPopupCadastro('transportadora'); return }
    setSelectedTranspId(transpId)
    if (!editing?.id || !transpId) return

    const motorsVinculados = allMotoristas.filter(m => m.transportador_id === transpId)
    try {
      // Adicionar transportadora com todos seus motoristas
      if (motorsVinculados.length > 0) {
        for (const mot of motorsVinculados) {
          const veic = veiculos.find((v: any) => v.cadastro_id === mot.id)
          await addOrdemTransportador({
            ordem_id: editing.id,
            transportador_id: transpId,
            motorista_id: mot.id,
            veiculo_id: veic?.id || null,
          })
        }
        toast.success(`Transportadora + ${motorsVinculados.length} motorista(s) vinculado(s)`)
      } else {
        await addOrdemTransportador({
          ordem_id: editing.id,
          transportador_id: transpId,
          motorista_id: null,
          veiculo_id: null,
        })
        toast.success('Transportadora adicionada')
      }
      await loadOrdemTransps(editing.id)
    } catch (err: any) { toast.error('Erro: ' + (err?.message || '')) }
  }

  const handleAddMotoristaAvulso = async (motId: string) => {
    if (motId === '__novo__') { openPopupCadastro('motorista'); return }
    if (!editing?.id || !motId) return
    const mot = allMotoristas.find(m => m.id === motId)
    const veic = veiculos.find((v: any) => v.cadastro_id === motId)
    try {
      await addOrdemTransportador({
        ordem_id: editing.id,
        transportador_id: mot?.transportador_id || null,
        motorista_id: motId,
        veiculo_id: veic?.id || null,
      })
      toast.success('Motorista adicionado')
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

  // === Pop-up open helpers ===
  const openPopupCadastro = (context: string) => {
    const defaultTipos = context === 'transportadora' ? ['Transportadora'] : context === 'motorista' ? ['Motorista'] : []
    setMiniCadForm({ nome: '', nome_fantasia: '', cpf_cnpj: '', tipos: defaultTipos, uf: '', cidade: '', transportador_id: '' })
    setPopupContext(context)
    setPopupType('cadastro')
  }
  const openPopupProduto = () => {
    setMiniProdForm({ nome: '', tipo: 'Grao', unidade_medida: 'ton' })
    setPopupType('produto')
  }
  const openPopupPreco = () => {
    setMiniPrecoForm({ origem_id: form.origem_id, destino_id: form.destino_id, produto_id: form.produto_id || '', fornecedor_id: '', valor: '', unidade_preco: 'R$/ton' })
    setPopupType('preco')
  }

  // === Pop-up save handlers ===
  const savePopupCadastro = async () => {
    if (!miniCadForm.nome.trim()) { toast.error('Nome e obrigatorio'); return }
    setSavingPopup(true)
    try {
      const payload: any = { nome: miniCadForm.nome, nome_fantasia: miniCadForm.nome_fantasia || null, cpf_cnpj: miniCadForm.cpf_cnpj || null, tipos: miniCadForm.tipos, uf: miniCadForm.uf || null, cidade: miniCadForm.cidade || null, ativo: true }
      if (popupContext === 'motorista' && miniCadForm.transportador_id) payload.transportador_id = miniCadForm.transportador_id
      const created = await createCadastro(payload)
      await reloadData()
      if (popupContext === 'origem') setForm(prev => ({ ...prev, origem_id: created.id, preco_id: '' }))
      else if (popupContext === 'destino') setForm(prev => ({ ...prev, destino_id: created.id, preco_id: '' }))
      toast.success('Cadastro criado!')
      setPopupType(null)
    } catch (err: any) { toast.error('Erro: ' + (err?.message || '')) }
    finally { setSavingPopup(false) }
  }

  const savePopupProduto = async () => {
    if (!miniProdForm.nome.trim()) { toast.error('Nome e obrigatorio'); return }
    setSavingPopup(true)
    try {
      const created = await createProduto({ nome: miniProdForm.nome, tipo: miniProdForm.tipo, unidade_medida: miniProdForm.unidade_medida, ativo: true })
      await reloadData()
      setForm(prev => ({ ...prev, produto_id: created.id }))
      toast.success('Produto criado!')
      setPopupType(null)
    } catch (err: any) { toast.error('Erro: ' + (err?.message || '')) }
    finally { setSavingPopup(false) }
  }

  const savePopupPreco = async () => {
    if (!miniPrecoForm.origem_id || !miniPrecoForm.destino_id || !miniPrecoForm.produto_id || !miniPrecoForm.valor) {
      toast.error('Origem, destino, produto e valor sao obrigatorios'); return
    }
    setSavingPopup(true)
    try {
      const created = await createPreco({ origem_id: miniPrecoForm.origem_id, destino_id: miniPrecoForm.destino_id, produto_id: miniPrecoForm.produto_id, fornecedor_id: miniPrecoForm.fornecedor_id || null, valor: Number(miniPrecoForm.valor), unidade_preco: miniPrecoForm.unidade_preco, ativo: true })
      await reloadData()
      setForm(prev => ({ ...prev, preco_id: created.id }))
      toast.success('Preco criado!')
      setPopupType(null)
    } catch (err: any) { toast.error('Erro: ' + (err?.message || '')) }
    finally { setSavingPopup(false) }
  }

  const handleSelectChange = (field: string, value: string) => {
    if (value === '__novo__') {
      if (field === 'origem_id') openPopupCadastro('origem')
      else if (field === 'destino_id') openPopupCadastro('destino')
      else if (field === 'produto_id') openPopupProduto()
      else if (field === 'preco_id') openPopupPreco()
      return
    }
    if (field === 'origem_id' || field === 'destino_id') {
      setForm(prev => ({ ...prev, [field]: value, preco_id: '' }))
    } else {
      setForm(prev => ({ ...prev, [field]: value }))
    }
  }

  const statusInfo = (s: string) => STATUS_OPTIONS.find(x => x.value === s) || STATUS_OPTIONS[0]

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Ordens de Carregamento</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 sm:px-4 rounded-lg hover:bg-green-700 text-sm sm:text-base whitespace-nowrap">
          <Plus className="w-4 h-4" /> Nova Ordem
        </button>
      </div>

      {loading ? <p className="text-gray-500">Carregando...</p> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto -mx-3 sm:mx-0">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Numero</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Operacao</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nome</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Origem</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Destino</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Produto</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item: any) => {
                const st = statusInfo(item.status)
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-blue-600 font-semibold">{item.numero_ordem_fmt || item.numero_ordem}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.operacao_nome || '-'}</td>
                    <td className="px-4 py-3 font-medium">{item.nome_ordem || '-'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span></td>
                    <td className="px-4 py-3">{item.origem_nome}</td>
                    <td className="px-4 py-3">{item.destino_nome}</td>
                    <td className="px-4 py-3">{item.produto_nome}</td>
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
          <div className="bg-white sm:rounded-xl shadow-xl w-full max-w-3xl sm:mx-4 max-h-screen sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editing ? `Editar Ordem ${editing.numero_ordem_fmt || ''}` : 'Nova Ordem de Carregamento'}
              </h2>
              <button onClick={() => { setShowForm(false); load() }} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">

              {/* Operacao */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Operacao</label>
                <select value={form.operacao_id} onChange={e => setForm({...form, operacao_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  <option value="">Nenhuma (avulsa)</option>
                  {operacoes.map((op: any) => <option key={op.id} value={op.id}>{op.nome}</option>)}
                </select>
              </div>

              {/* Nome da Ordem */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Ordem *</label>
                <input type="text" value={form.nome_ordem} onChange={e => setForm({...form, nome_ordem: e.target.value})}
                  placeholder="Ex: Colheita GO SJ 25/26"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
              {editing && (
                <p className="text-xs text-gray-500">Numero gerado: <span className="font-mono font-semibold text-blue-600">{editing.numero_ordem_fmt || 'sera gerado ao salvar'}</span></p>
              )}

              {/* Origem + Destino */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Origem *</label>
                  <select value={form.origem_id} onChange={e => handleSelectChange('origem_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="">Selecione...</option>
                    {origens.map((l: any) => <option key={l.id} value={l.id}>{l.nome_fantasia || l.nome}</option>)}
                    <option value="__novo__" className="font-semibold text-green-700 bg-green-50">{NOVO_LABEL}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destino *</label>
                  <select value={form.destino_id} onChange={e => handleSelectChange('destino_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="">Selecione...</option>
                    {origens.map((l: any) => <option key={l.id} value={l.id}>{l.nome_fantasia || l.nome}</option>)}
                    <option value="__novo__" className="font-semibold text-green-700 bg-green-50">{NOVO_LABEL}</option>
                  </select>
                </div>
              </div>

              {/* Produto + Qtd + Unidade */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Produto *</label>
                  <select value={form.produto_id} onChange={e => handleSelectChange('produto_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="">Selecione...</option>
                    {produtos.map((p: any) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    <option value="__novo__" className="font-semibold text-green-700 bg-green-50">{NOVO_PROD_LABEL}</option>
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

              {/* Preco Vinculado - filtrado por origem×destino */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preco Contratado (vinculo)
                  {form.origem_id && form.destino_id && <span className="text-xs text-green-600 ml-1">filtrado pela rota</span>}
                </label>
                <select value={form.preco_id} onChange={e => handleSelectChange('preco_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  <option value="">Nenhum</option>
                  {precosFiltrados.map((p: any) => <option key={p.id} value={p.id}>{p.origem_nome} → {p.destino_nome} | {p.produto_nome} | {p.valor} {p.unidade_preco}</option>)}
                  <option value="__novo__" className="font-semibold text-green-700 bg-green-50">{NOVO_PRECO_LABEL}</option>
                </select>
                {form.origem_id && form.destino_id && precosFiltrados.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Nenhum preco cadastrado para esta rota.</p>
                )}
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

                  {/* Selecionar transportadora - ao selecionar, vincula automaticamente motoristas+placas */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Adicionar Transportadora (vincula motoristas automaticamente)</label>
                    <select value="" onChange={e => handleSelectTransp(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="">Selecionar Transportadora...</option>
                      {transportadoras.map((t: any) => {
                        const mots = allMotoristas.filter(m => m.transportador_id === t.id)
                        return <option key={t.id} value={t.id}>{t.nome_fantasia || t.nome} ({mots.length} mot.)</option>
                      })}
                      <option value="__novo__" className="font-semibold text-green-700 bg-green-50">{NOVO_TRANSP_LABEL}</option>
                    </select>
                  </div>

                  {/* Adicionar motorista avulso */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ou adicionar motorista avulso</label>
                    <select value="" onChange={e => handleAddMotoristaAvulso(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="">Selecionar Motorista...</option>
                      {allMotoristas.map((m: any) => {
                        const veics = veiculos.filter((v: any) => v.cadastro_id === m.id)
                        const placaStr = veics.map((v: any) => v.placa).join(', ')
                        return <option key={m.id} value={m.id}>{m.nome_fantasia || m.nome}{placaStr ? ` [${placaStr}]` : ''}</option>
                      })}
                      <option value="__novo__" className="font-semibold text-green-700 bg-green-50">{NOVO_MOT_LABEL}</option>
                    </select>
                  </div>

                  {/* Lista de vinculos */}
                  {ordemTransps.length > 0 ? (
                    <div className="space-y-2">
                      {ordemTransps.map((ot: any) => (
                        <div key={ot.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border">
                          <div className="flex items-center gap-2 text-sm flex-wrap">
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
                              <span className="flex items-center gap-1 text-xs text-gray-500 font-mono bg-white px-1.5 py-0.5 rounded border">
                                <CarFront className="w-3 h-3" />{ot.veiculos.placa}
                              </span>
                            )}
                          </div>
                          <button onClick={() => handleRemoveTransp(ot.id)} className="p-1 text-red-500 hover:bg-red-50 rounded flex-shrink-0">
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

      {/* Pop-up: Novo Cadastro */}
      {popupType === 'cadastro' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-white sm:rounded-xl shadow-2xl w-full max-w-md sm:mx-4 max-h-screen sm:max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b bg-green-50">
              <h2 className="text-base font-semibold text-green-800">
                {popupContext === 'transportadora' ? 'Nova Transportadora' : popupContext === 'motorista' ? 'Novo Motorista' : 'Novo Cadastro'}
              </h2>
              <button onClick={() => setPopupType(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome / Razao Social *</label>
                <input type="text" value={miniCadForm.nome} onChange={e => setMiniCadForm({...miniCadForm, nome: e.target.value})}
                  placeholder="Nome completo ou razao social" autoFocus
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Fantasia</label>
                <input type="text" value={miniCadForm.nome_fantasia} onChange={e => setMiniCadForm({...miniCadForm, nome_fantasia: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CPF / CNPJ</label>
                <input type="text" value={miniCadForm.cpf_cnpj} onChange={e => setMiniCadForm({...miniCadForm, cpf_cnpj: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
              {(popupContext === 'origem' || popupContext === 'destino') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo(s)</label>
                  <div className="flex flex-wrap gap-2">
                    {TIPOS_ORIGEM.map(t => (
                      <label key={t} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="checkbox" checked={miniCadForm.tipos.includes(t)}
                          onChange={e => setMiniCadForm(prev => ({ ...prev, tipos: e.target.checked ? [...prev.tipos, t] : prev.tipos.filter(x => x !== t) }))}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                        {t}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {(popupContext === 'transportadora' || popupContext === 'motorista') && (
                <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                  Tipo: <span className="font-semibold">{miniCadForm.tipos.join(', ')}</span>
                </p>
              )}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
                  <input type="text" maxLength={2} value={miniCadForm.uf} onChange={e => setMiniCadForm({...miniCadForm, uf: e.target.value.toUpperCase()})}
                    placeholder="GO" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                  <input type="text" value={miniCadForm.cidade} onChange={e => setMiniCadForm({...miniCadForm, cidade: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
              </div>
              {popupContext === 'motorista' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transportadora vinculada</label>
                  <select value={miniCadForm.transportador_id} onChange={e => setMiniCadForm({...miniCadForm, transportador_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="">Nenhuma</option>
                    {transportadoras.map((t: any) => <option key={t.id} value={t.id}>{t.nome_fantasia || t.nome}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setPopupType(null)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Cancelar</button>
              <button onClick={savePopupCadastro} disabled={savingPopup}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                {savingPopup && <Loader2 className="w-4 h-4 animate-spin" />}
                {savingPopup ? 'Salvando...' : 'Criar Cadastro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pop-up: Novo Produto */}
      {popupType === 'produto' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-white sm:rounded-xl shadow-2xl w-full max-w-sm sm:mx-4">
            <div className="flex items-center justify-between p-4 border-b bg-green-50">
              <h2 className="text-base font-semibold text-green-800">Novo Produto</h2>
              <button onClick={() => setPopupType(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input type="text" value={miniProdForm.nome} onChange={e => setMiniProdForm({...miniProdForm, nome: e.target.value})}
                  placeholder="Ex: Soja em grao" autoFocus
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select value={miniProdForm.tipo} onChange={e => setMiniProdForm({...miniProdForm, tipo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="Grao">Grao</option><option value="Insumo">Insumo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                  <select value={miniProdForm.unidade_medida} onChange={e => setMiniProdForm({...miniProdForm, unidade_medida: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="ton">ton</option><option value="kg">kg</option><option value="sc">sc</option><option value="l">l</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setPopupType(null)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Cancelar</button>
              <button onClick={savePopupProduto} disabled={savingPopup}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                {savingPopup && <Loader2 className="w-4 h-4 animate-spin" />}
                {savingPopup ? 'Salvando...' : 'Criar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pop-up: Novo Preco Contratado */}
      {popupType === 'preco' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-white sm:rounded-xl shadow-2xl w-full max-w-md sm:mx-4 max-h-screen sm:max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b bg-green-50">
              <h2 className="text-base font-semibold text-green-800">Novo Preco Contratado</h2>
              <button onClick={() => setPopupType(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              {form.origem_id && form.destino_id && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Origem e destino preenchidos da ordem
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Origem *</label>
                  <select value={miniPrecoForm.origem_id} onChange={e => setMiniPrecoForm({...miniPrecoForm, origem_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm">
                    <option value="">Selecione...</option>
                    {origens.map((l: any) => <option key={l.id} value={l.id}>{l.nome_fantasia || l.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destino *</label>
                  <select value={miniPrecoForm.destino_id} onChange={e => setMiniPrecoForm({...miniPrecoForm, destino_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm">
                    <option value="">Selecione...</option>
                    {origens.map((l: any) => <option key={l.id} value={l.id}>{l.nome_fantasia || l.nome}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Produto *</label>
                <select value={miniPrecoForm.produto_id} onChange={e => setMiniPrecoForm({...miniPrecoForm, produto_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  <option value="">Selecione...</option>
                  {produtos.map((p: any) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transportador</label>
                <select value={miniPrecoForm.fornecedor_id} onChange={e => setMiniPrecoForm({...miniPrecoForm, fornecedor_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  <option value="">Todos (preco geral)</option>
                  {transportadoras.map((t: any) => <option key={t.id} value={t.id}>{t.nome_fantasia || t.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$) *</label>
                  <input type="number" step="0.01" value={miniPrecoForm.valor} onChange={e => setMiniPrecoForm({...miniPrecoForm, valor: e.target.value})}
                    autoFocus={!!(form.origem_id && form.destino_id)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                  <select value={miniPrecoForm.unidade_preco} onChange={e => setMiniPrecoForm({...miniPrecoForm, unidade_preco: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="R$/ton">R$/ton</option><option value="R$/sc">R$/sc</option><option value="R$/km">R$/km</option><option value="R$/viagem">R$/viagem</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setPopupType(null)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Cancelar</button>
              <button onClick={savePopupPreco} disabled={savingPopup}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                {savingPopup && <Loader2 className="w-4 h-4 animate-spin" />}
                {savingPopup ? 'Salvando...' : 'Criar Preco'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

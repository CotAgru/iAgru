import { useEffect, useState, useCallback, useRef } from 'react'
import { Plus, Pencil, Trash2, X, Search, Loader2, MapPin, CarFront, Filter, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCadastros, createCadastro, updateCadastro, deleteCadastro, createVeiculo, getVeiculos } from '../services/api'
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
const DEFAULT_CENTER = { lat: -15.7801, lng: -47.9292 }

const TODOS_TIPOS = ['Armazem', 'Fazenda', 'Fornecedor', 'Industria', 'Motorista', 'Outro', 'Porto', 'Produtor', 'Transportadora']
const TIPOS_COM_LOCALIZACAO = ['Fazenda', 'Armazem', 'Industria', 'Porto', 'Fornecedor']

const TIPOS_CAMINHAO = [
  { nome: 'Toco', eixos: 2, peso_pauta_kg: 8000 },
  { nome: 'Truck', eixos: 3, peso_pauta_kg: 14000 },
  { nome: 'Bi-Truck', eixos: 4, peso_pauta_kg: 20000 },
  { nome: 'Carreta LS', eixos: 5, peso_pauta_kg: 27000 },
  { nome: 'Carreta', eixos: 6, peso_pauta_kg: 37000 },
  { nome: 'Bitrem', eixos: 7, peso_pauta_kg: 42000 },
  { nome: 'Rodotrem', eixos: 9, peso_pauta_kg: 57000 },
  { nome: 'Treminhao', eixos: 9, peso_pauta_kg: 57000 },
  { nome: 'Outro', eixos: 0, peso_pauta_kg: 0 },
]

interface Cadastro {
  id: string
  cpf_cnpj: string | null
  nome: string
  nome_fantasia: string | null
  telefone1: string | null
  telefone2: string | null
  uf: string
  cidade: string
  tipos: string[]
  latitude: number | null
  longitude: number | null
  observacoes: string | null
  transportador_id: string | null
  ativo: boolean
}

interface UF { id: number; sigla: string; nome: string }
interface Cidade { id: number; nome: string }

const emptyForm = {
  cpf_cnpj: '', nome: '', nome_fantasia: '', telefone1: '', telefone2: '',
  uf: 'GO', cidade: '', tipos: [] as string[],
  latitude: null as number | null, longitude: null as number | null,
  observacoes: '', transportador_id: '', ativo: true,
}

const emptyVeiculoForm = { placa: '', tipo_caminhao: 'Carreta', eixos: 6, peso_pauta_kg: 37000, marca: '', modelo: '', ano: '' }

// Formatar telefone: (xx) xxxxx-xxxx ou (xx) xxxx-xxxx
const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length === 0) return ''
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0,2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
}

// Componente para centralizar o mapa na cidade
function MapCenterUpdater({ cidade, uf }: { cidade: string; uf: string }) {
  const map = useMap()
  const lastSearch = useRef('')

  useEffect(() => {
    if (!map || !cidade || !uf || !GOOGLE_MAPS_API_KEY) return
    const key = `${cidade}-${uf}`
    if (key === lastSearch.current) return
    lastSearch.current = key

    fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cidade + ', ' + uf + ', Brasil')}&key=${GOOGLE_MAPS_API_KEY}`)
      .then(r => r.json())
      .then(data => {
        if (data.results?.[0]) {
          const { lat, lng } = data.results[0].geometry.location
          map.panTo({ lat, lng })
          const bounds = data.results[0].geometry.viewport
          if (bounds) {
            const gBounds = new google.maps.LatLngBounds(
              { lat: bounds.southwest.lat, lng: bounds.southwest.lng },
              { lat: bounds.northeast.lat, lng: bounds.northeast.lng }
            )
            map.fitBounds(gBounds)
          } else {
            map.setZoom(12)
          }
        }
      })
      .catch(() => {})
  }, [map, cidade, uf])

  return null
}

export default function Cadastros() {
  const [items, setItems] = useState<Cadastro[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Cadastro | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')

  const [ufs, setUfs] = useState<UF[]>([])
  const [cidades, setCidades] = useState<Cidade[]>([])
  const [loadingCnpj, setLoadingCnpj] = useState(false)
  const [loadingCidades, setLoadingCidades] = useState(false)
  const [isCnpj, setIsCnpj] = useState(false)

  // Modal de veiculo inline (motorista)
  const [showVeiculoForm, setShowVeiculoForm] = useState(false)
  const [veiculoForm, setVeiculoForm] = useState(emptyVeiculoForm)
  const [savedMotoristaId, setSavedMotoristaId] = useState<string | null>(null)
  const [allVeiculos, setAllVeiculos] = useState<any[]>([])
  const [filtroUf, setFiltroUf] = useState('')
  const [filtroCidade, setFiltroCidade] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([getCadastros(), getVeiculos()])
      .then(([c, v]) => { setItems(c); setAllVeiculos(v) })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  // Carregar UFs do IBGE
  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
      .then(r => r.json())
      .then((data: UF[]) => setUfs(data))
      .catch(() => {})
  }, [])

  // Carregar cidades quando UF mudar
  const carregarCidades = useCallback((uf: string) => {
    if (!uf) { setCidades([]); return Promise.resolve([]) }
    setLoadingCidades(true)
    return fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`)
      .then(r => r.json())
      .then((data: Cidade[]) => { setCidades(data); return data })
      .catch(() => { setCidades([]); return [] as Cidade[] })
      .finally(() => setLoadingCidades(false))
  }, [])

  useEffect(() => { carregarCidades(form.uf) }, [form.uf, carregarCidades])

  // Detectar se e CNPJ (14+ digitos)
  useEffect(() => {
    const digits = form.cpf_cnpj.replace(/\D/g, '')
    setIsCnpj(digits.length >= 14)
  }, [form.cpf_cnpj])

  // Buscar CNPJ na BrasilAPI
  const buscarCnpj = async () => {
    const digits = form.cpf_cnpj.replace(/\D/g, '')
    if (digits.length !== 14) { toast.error('CNPJ deve ter 14 digitos'); return }
    setLoadingCnpj(true)
    try {
      const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`)
      if (!resp.ok) throw new Error('CNPJ nao encontrado')
      const data = await resp.json()
      const novaUf = data.uf || form.uf

      // Carregar cidades da UF retornada e depois setar a cidade
      let cidadesCarregadas: Cidade[] = []
      if (novaUf) {
        cidadesCarregadas = await carregarCidades(novaUf)
      }

      // Encontrar cidade pelo nome (case-insensitive)
      const cidadeEncontrada = cidadesCarregadas.find(
        c => c.nome.toLowerCase() === (data.municipio || '').toLowerCase()
      )

      setForm(prev => ({
        ...prev,
        nome: data.razao_social || prev.nome,
        nome_fantasia: data.nome_fantasia || '',
        uf: novaUf,
        cidade: cidadeEncontrada ? cidadeEncontrada.nome : data.municipio || prev.cidade,
        telefone1: data.ddd_telefone_1 ? `(${data.ddd_telefone_1.substring(0,2)})${data.ddd_telefone_1.substring(2)}` : prev.telefone1,
        telefone2: data.ddd_telefone_2 ? `(${data.ddd_telefone_2.substring(0,2)})${data.ddd_telefone_2.substring(2)}` : prev.telefone2,
      }))
      toast.success('Dados do CNPJ carregados')
    } catch { toast.error('Erro ao buscar CNPJ') }
    finally { setLoadingCnpj(false) }
  }

  const toggleTipo = (tipo: string) => {
    setForm(prev => ({
      ...prev,
      tipos: prev.tipos.includes(tipo) ? prev.tipos.filter(t => t !== tipo) : [...prev.tipos, tipo],
    }))
  }

  const mostraLocalizacao = form.tipos.some(t => TIPOS_COM_LOCALIZACAO.includes(t))
  const mostraMotorista = form.tipos.includes('Motorista')
  const mostraTransportadora = form.tipos.includes('Transportadora')

  // Listas filtradas para vinculos
  const transportadorasList = items.filter(i => (i.tipos || []).includes('Transportadora'))
  const motoristasVinculados = editing && mostraTransportadora
    ? items.filter(i => (i.tipos || []).includes('Motorista') && i.transportador_id === editing.id)
    : []

  // Veiculos do motorista atual
  const veiculosDoMotorista = (savedMotoristaId || editing?.id)
    ? allVeiculos.filter((v: any) => v.cadastro_id === (savedMotoristaId || editing?.id))
    : []

  // Veiculos dos motoristas vinculados a transportadora
  const veiculosTransportadora = motoristasVinculados.flatMap(m =>
    allVeiculos.filter((v: any) => v.cadastro_id === m.id).map(v => ({ ...v, motorista_nome: m.nome_fantasia || m.nome }))
  )

  // Placas por cadastro_id (para coluna na tabela)
  const placasPorCadastro = (cadastroId: string) =>
    allVeiculos.filter((v: any) => v.cadastro_id === cadastroId).map((v: any) => v.placa)

  const openNew = () => { setEditing(null); setForm(emptyForm); setSavedMotoristaId(null); setShowForm(true) }
  const openEdit = (item: Cadastro) => {
    setEditing(item)
    setForm({
      cpf_cnpj: item.cpf_cnpj || '', nome: item.nome, nome_fantasia: item.nome_fantasia || '',
      telefone1: item.telefone1 || '', telefone2: item.telefone2 || '',
      uf: item.uf, cidade: item.cidade, tipos: item.tipos || [],
      latitude: item.latitude, longitude: item.longitude,
      observacoes: item.observacoes || '', transportador_id: item.transportador_id || '', ativo: item.ativo,
    })
    setSavedMotoristaId(item.id)
    setShowForm(true)
  }

  const save = async () => {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return }
    if (!form.uf) { toast.error('UF é obrigatória'); return }
    if (!form.cidade) { toast.error('Cidade é obrigatória'); return }
    if (form.tipos.length === 0) { toast.error('Selecione pelo menos um Tipo'); return }
    const payload = {
      ...form,
      cpf_cnpj: form.cpf_cnpj || null,
      nome_fantasia: form.nome_fantasia || null,
      telefone1: form.telefone1 || null,
      telefone2: form.telefone2 || null,
      observacoes: form.observacoes || null,
      latitude: form.latitude || null,
      longitude: form.longitude || null,
      transportador_id: form.transportador_id || null,
    }
    try {
      let result: any
      if (editing) { result = await updateCadastro(editing.id, payload); toast.success('Cadastro atualizado') }
      else { result = await createCadastro(payload); toast.success('Cadastro criado') }
      setSavedMotoristaId(result?.id || editing?.id || null)
      if (mostraMotorista && !editing) {
        // Manter form aberto para permitir cadastrar veiculo
        setEditing(result)
      } else {
        setShowForm(false)
      }
      load()
    } catch { toast.error('Erro ao salvar') }
  }

  const onVeiculoTipoChange = (tipo: string) => {
    const found = TIPOS_CAMINHAO.find(t => t.nome === tipo)
    setVeiculoForm(prev => ({ ...prev, tipo_caminhao: tipo, eixos: found?.eixos ?? 0, peso_pauta_kg: found?.peso_pauta_kg ?? 0 }))
  }

  const saveVeiculo = async () => {
    const ownerId = savedMotoristaId || editing?.id
    if (!ownerId) { toast.error('Salve o cadastro do motorista primeiro'); return }
    if (!veiculoForm.placa) { toast.error('Placa é obrigatória'); return }
    try {
      await createVeiculo({
        cadastro_id: ownerId,
        placa: veiculoForm.placa.toUpperCase(),
        tipo_caminhao: veiculoForm.tipo_caminhao,
        eixos: veiculoForm.eixos,
        peso_pauta_kg: veiculoForm.peso_pauta_kg,
        marca: veiculoForm.marca || null,
        modelo: veiculoForm.modelo || null,
        ano: veiculoForm.ano ? Number(veiculoForm.ano) : null,
        ativo: true,
      })
      toast.success('Veiculo cadastrado e vinculado!')
      setVeiculoForm(emptyVeiculoForm)
      // Recarregar veiculos para mostrar na lista
      const v = await getVeiculos()
      setAllVeiculos(v)
    } catch { toast.error('Erro ao cadastrar veiculo') }
  }

  const remove = async (id: string) => {
    if (!confirm('Deseja remover este cadastro?')) return
    try { await deleteCadastro(id); toast.success('Cadastro removido'); load() }
    catch { toast.error('Erro ao remover') }
  }

  const filtered = items.filter(i => {
    if (filtroTipo && !(i.tipos || []).includes(filtroTipo)) return false
    if (filtroUf && i.uf !== filtroUf) return false
    if (filtroCidade && i.cidade !== filtroCidade) return false
    if (filtroAtivo === 'ativo' && !i.ativo) return false
    if (filtroAtivo === 'inativo' && i.ativo) return false
    if (!busca) return true
    const term = busca.toLowerCase()
    return i.nome?.toLowerCase().includes(term) || i.nome_fantasia?.toLowerCase().includes(term) ||
      i.cpf_cnpj?.toLowerCase().includes(term) || i.cidade?.toLowerCase().includes(term) ||
      placasPorCadastro(i.id).some(p => p.toLowerCase().includes(term))
  })

  const ufsDisponiveis = [...new Set(items.map(i => i.uf))].sort()
  const cidadesDisponiveis = filtroUf ? [...new Set(items.filter(i => i.uf === filtroUf).map(i => i.cidade))].sort() : []
  const hasActiveFilters = filtroTipo || filtroUf || filtroCidade || filtroAtivo || busca
  const clearAllFilters = () => { setFiltroTipo(''); setFiltroUf(''); setFiltroCidade(''); setFiltroAtivo(''); setBusca('') }

  const tipoColors: Record<string, string> = {
    Fazenda: 'bg-green-100 text-green-700', Armazem: 'bg-blue-100 text-blue-700',
    Industria: 'bg-purple-100 text-purple-700', Porto: 'bg-cyan-100 text-cyan-700',
    Fornecedor: 'bg-amber-100 text-amber-700', Transportadora: 'bg-rose-100 text-rose-700',
    Motorista: 'bg-indigo-100 text-indigo-700', Outro: 'bg-gray-100 text-gray-700',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Cadastros</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 sm:px-4 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base whitespace-nowrap">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Novo</span> Cadastro
        </button>
      </div>

      {/* Barra de busca + botao filtros */}
      <div className="mb-3 flex gap-2 items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input type="text" placeholder="Buscar nome, CNPJ, cidade, placa..." value={busca} onChange={e => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
            showFilters || hasActiveFilters ? 'bg-green-50 border-green-400 text-green-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}>
          <Filter className="w-4 h-4" /> Filtros
          {hasActiveFilters && <span className="bg-green-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
            {[filtroTipo, filtroUf, filtroCidade, filtroAtivo].filter(Boolean).length}
          </span>}
        </button>
      </div>

      {/* Painel de filtros expansivel */}
      {showFilters && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
          {/* Tipos como chips */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Tipo</label>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setFiltroTipo('')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  !filtroTipo ? 'bg-green-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:border-green-400'
                }`}>Todos</button>
              {TODOS_TIPOS.map(t => (
                <button key={t} onClick={() => setFiltroTipo(filtroTipo === t ? '' : t)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    filtroTipo === t
                      ? `${tipoColors[t] || 'bg-gray-600 text-white'} ring-1 ring-offset-1 ring-green-500`
                      : 'bg-white border border-gray-300 text-gray-600 hover:border-green-400'
                  }`}>{t}</button>
              ))}
            </div>
          </div>

          {/* UF + Cidade + Status */}
          <div className="flex gap-2 flex-wrap">
            <div className="min-w-[100px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">UF</label>
              <select value={filtroUf} onChange={e => { setFiltroUf(e.target.value); setFiltroCidade('') }}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm">
                <option value="">Todas</option>
                {ufsDisponiveis.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            {filtroUf && cidadesDisponiveis.length > 0 && (
              <div className="min-w-[140px] flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Cidade</label>
                <select value={filtroCidade} onChange={e => setFiltroCidade(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm">
                  <option value="">Todas</option>
                  {cidadesDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
            <div className="min-w-[100px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select value={filtroAtivo} onChange={e => setFiltroAtivo(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm">
                <option value="">Todos</option>
                <option value="ativo">Ativos</option>
                <option value="inativo">Inativos</option>
              </select>
            </div>
          </div>

          {/* Limpar filtros */}
          {hasActiveFilters && (
            <button onClick={clearAllFilters} className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700">
              <XCircle className="w-3.5 h-3.5" /> Limpar todos os filtros
            </button>
          )}
        </div>
      )}

      {/* Contador de resultados */}
      <div className="mb-2 text-xs text-gray-400 flex items-center gap-2">
        <span>{filtered.length} de {items.length} cadastros</span>
        {hasActiveFilters && <span className="text-green-600 font-medium">(filtrado)</span>}
      </div>

      {/* Tabela */}
      {loading ? <p className="text-gray-500">Carregando...</p> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto -mx-3 sm:mx-0">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nome</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">CPF/CNPJ</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Placa</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Cidade/UF</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Tipos</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Telefone</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(item => {
                const placas = placasPorCadastro(item.id)
                return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.nome_fantasia || item.nome}</div>
                    {item.nome_fantasia && <div className="text-xs text-gray-400">{item.nome}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{item.cpf_cnpj || '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {placas.length > 0 ? placas.map(p => (
                      <span key={p} className="inline-block bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded mr-1 mb-0.5">{p}</span>
                    )) : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.cidade}/{item.uf}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(item.tipos || []).map(t => (
                        <span key={t} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${tipoColors[t] || tipoColors.Outro}`}>{t}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{item.telefone1 || '-'}</td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
                )
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhum cadastro encontrado</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white sm:rounded-xl shadow-xl w-full max-w-2xl sm:mx-4 max-h-screen sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Editar Cadastro' : 'Novo Cadastro'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              {/* CPF/CNPJ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ</label>
                <div className="flex gap-2">
                  <input type="text" value={form.cpf_cnpj} onChange={e => setForm({...form, cpf_cnpj: e.target.value})}
                    placeholder="00.000.000/0000-00"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                  {isCnpj && (
                    <button onClick={buscarCnpj} disabled={loadingCnpj}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 text-sm whitespace-nowrap">
                      {loadingCnpj ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Buscar CNPJ
                    </button>
                  )}
                </div>
              </div>

              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome / Razão Social *</label>
                <input type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>

              {/* Nome Fantasia (so aparece se CNPJ) */}
              {isCnpj && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Fantasia</label>
                  <input type="text" value={form.nome_fantasia} onChange={e => setForm({...form, nome_fantasia: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
              )}

              {/* Telefones */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone 1</label>
                  <input type="text" value={form.telefone1} onChange={e => setForm({...form, telefone1: formatPhone(e.target.value)})}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone 2</label>
                  <input type="text" value={form.telefone2} onChange={e => setForm({...form, telefone2: formatPhone(e.target.value)})}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
              </div>

              {/* UF + Cidade (IBGE) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UF *</label>
                  <select value={form.uf} onChange={e => setForm({...form, uf: e.target.value, cidade: ''})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="">Selecione...</option>
                    {ufs.map(u => <option key={u.sigla} value={u.sigla}>{u.sigla} - {u.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cidade *</label>
                  {loadingCidades ? (
                    <div className="flex items-center gap-2 px-3 py-2 text-gray-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</div>
                  ) : (
                    <select value={form.cidade} onChange={e => setForm({...form, cidade: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                      <option value="">Selecione...</option>
                      {cidades.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                    </select>
                  )}
                </div>
              </div>

              {/* Tipos (multi-select em blocos) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo * <span className="text-xs text-gray-400">(selecione um ou mais)</span></label>
                <div className="grid grid-cols-4 gap-2">
                  {TODOS_TIPOS.map(tipo => {
                    const selected = form.tipos.includes(tipo)
                    return (
                      <button key={tipo} type="button" onClick={() => toggleTipo(tipo)}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                          selected
                            ? 'bg-green-600 text-white border-green-600 shadow-sm'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-green-400 hover:text-green-600'
                        }`}>
                        {tipo}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Localizacao com Google Maps (condicional) */}
              {mostraLocalizacao && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />Localizacao <span className="text-xs text-gray-400">(clique no mapa para marcar)</span>
                  </label>
                  {GOOGLE_MAPS_API_KEY ? (
                    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                      <div className="rounded-lg overflow-hidden border border-gray-300" style={{ height: 280 }}>
                        <Map
                          defaultCenter={form.latitude && form.longitude ? { lat: form.latitude, lng: form.longitude } : DEFAULT_CENTER}
                          defaultZoom={form.latitude ? 14 : 4}
                          gestureHandling="greedy"
                          mapId="cadastro-map"
                          onClick={(e: any) => {
                            const lat = e.detail?.latLng?.lat
                            const lng = e.detail?.latLng?.lng
                            if (lat != null && lng != null) {
                              setForm(prev => ({ ...prev, latitude: lat, longitude: lng }))
                            }
                          }}
                        >
                          <MapCenterUpdater cidade={form.cidade} uf={form.uf} />
                          {form.latitude && form.longitude && (
                            <AdvancedMarker position={{ lat: form.latitude, lng: form.longitude }} />
                          )}
                        </Map>
                      </div>
                    </APIProvider>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <input type="number" step="any" placeholder="Latitude" value={form.latitude ?? ''}
                        onChange={e => setForm({...form, latitude: e.target.value ? Number(e.target.value) : null})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                      <input type="number" step="any" placeholder="Longitude" value={form.longitude ?? ''}
                        onChange={e => setForm({...form, longitude: e.target.value ? Number(e.target.value) : null})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                    </div>
                  )}
                  {form.latitude && form.longitude && (
                    <p className="text-xs text-gray-500 mt-1">Lat: {form.latitude.toFixed(6)}, Lng: {form.longitude.toFixed(6)}</p>
                  )}
                </div>
              )}

              {/* Vincular Motorista a Transportadora */}
              {mostraMotorista && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transportadora (vinculo)</label>
                  <select value={form.transportador_id} onChange={e => setForm({...form, transportador_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="">Autonomo (sem transportadora)</option>
                    {transportadorasList.map(t => <option key={t.id} value={t.id}>{t.nome_fantasia || t.nome}</option>)}
                  </select>
                </div>
              )}

              {/* Motoristas e Veiculos vinculados (quando tipo Transportadora) */}
              {mostraTransportadora && editing && (
                <div className="border border-rose-200 bg-rose-50 rounded-lg p-3">
                  <span className="text-sm font-medium text-rose-700">Motoristas e Veiculos vinculados a esta Transportadora</span>
                  {motoristasVinculados.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {motoristasVinculados.map(m => {
                        const veicsMot = allVeiculos.filter((v: any) => v.cadastro_id === m.id)
                        return (
                          <div key={m.id} className="bg-white rounded-lg px-3 py-2 border border-rose-100">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="w-2 h-2 bg-rose-400 rounded-full" />
                              <span className="font-medium text-gray-700">{m.nome_fantasia || m.nome}</span>
                            </div>
                            {veicsMot.length > 0 && (
                              <div className="ml-4 mt-1 flex flex-wrap gap-1">
                                {veicsMot.map((v: any) => (
                                  <span key={v.id} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-mono">
                                    <CarFront className="w-3 h-3" />{v.placa} <span className="text-gray-400 font-sans">({v.tipo_caminhao})</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Nenhum motorista vinculado. Vincule motoristas editando o cadastro deles e selecionando esta transportadora.</p>
                  )}
                </div>
              )}

              {/* Veiculos do Motorista (quando tipo Motorista e editando) */}
              {mostraMotorista && editing && (
                <div className="border border-indigo-200 bg-indigo-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-indigo-700"><CarFront className="w-4 h-4 inline mr-1" />Veiculos do Motorista</span>
                    <button type="button" onClick={() => { setVeiculoForm(emptyVeiculoForm); setShowVeiculoForm(!showVeiculoForm) }}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Cadastrar Veiculo
                    </button>
                  </div>

                  {/* Lista de veiculos ja cadastrados */}
                  {veiculosDoMotorista.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {veiculosDoMotorista.map((v: any) => (
                        <div key={v.id} className="flex items-center gap-3 bg-white rounded px-3 py-2 border border-indigo-100 text-sm">
                          <span className="font-mono font-semibold text-indigo-800">{v.placa}</span>
                          <span className="text-gray-500">{v.tipo_caminhao}</span>
                          {v.marca && <span className="text-gray-400 text-xs">{v.marca} {v.modelo || ''}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {veiculosDoMotorista.length === 0 && !showVeiculoForm && (
                    <p className="text-xs text-gray-500 mb-2">Nenhum veiculo cadastrado para este motorista.</p>
                  )}

                  {showVeiculoForm && (
                    <div className="mt-2 space-y-3 border-t border-indigo-200 pt-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Placa *</label>
                          <input type="text" value={veiculoForm.placa} onChange={e => setVeiculoForm({...veiculoForm, placa: e.target.value.toUpperCase()})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Tipo Caminhao *</label>
                          <select value={veiculoForm.tipo_caminhao} onChange={e => onVeiculoTipoChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                            {TIPOS_CAMINHAO.map(t => <option key={t.nome} value={t.nome}>{t.nome} ({t.eixos} eixos - {t.peso_pauta_kg.toLocaleString('pt-BR')} kg)</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Marca</label>
                          <input type="text" value={veiculoForm.marca} onChange={e => setVeiculoForm({...veiculoForm, marca: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Modelo</label>
                          <input type="text" value={veiculoForm.modelo} onChange={e => setVeiculoForm({...veiculoForm, modelo: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Ano</label>
                          <input type="number" value={veiculoForm.ano} onChange={e => setVeiculoForm({...veiculoForm, ano: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                        </div>
                      </div>
                      <button type="button" onClick={saveVeiculo}
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
                        Salvar Veiculo Vinculado
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Observações */}
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
    </div>
  )
}

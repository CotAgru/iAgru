import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, X, Search, Loader2, MapPin, CarFront, ChevronDown, FileSpreadsheet, Merge } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCadastros, createCadastro, updateCadastro, deleteCadastro, createVeiculo, getVeiculos, getTiposCaminhao, getUnidadesArmazenadoras, createUnidadeArmazenadora, updateUnidadeArmazenadora } from '../services/api'
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import ViewModal, { Field } from '../components/ViewModal'
import SearchableSelect from '../components/SearchableSelect'
import { useSort } from '../hooks/useSort'
import SortHeader from '../components/SortHeader'
import { fmtInt } from '../utils/format'
import Pagination, { usePagination } from '../components/Pagination'
import { exportToExcel } from '../utils/export'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
const DEFAULT_CENTER = { lat: -15.7801, lng: -47.9292 }

const TODOS_TIPOS = ['Armazem', 'Comprador', 'Corretor', 'Fazenda', 'Fornecedor', 'Industria', 'Motorista', 'Outro', 'Porto', 'Produtor', 'Transportadora']
const TIPOS_COM_LOCALIZACAO = ['Fazenda', 'Armazem', 'Industria', 'Porto', 'Fornecedor']

interface Cadastro {
  id: string
  cpf_cnpj: string | null
  nome: string
  nome_fantasia: string | null
  apelido: string | null
  tipo_pessoa: 'fisica' | 'juridica' | 'estrangeira'
  telefone1: string | null
  telefone2: string | null
  uf: string
  cidade: string
  codigo_ibge: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  inscricao_estadual: string | null
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
  cpf_cnpj: '', nome: '', nome_fantasia: '', apelido: '', tipo_pessoa: 'juridica' as 'fisica' | 'juridica' | 'estrangeira',
  telefone1: '', telefone2: '',
  uf: 'GO', cidade: '', codigo_ibge: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '',
  inscricao_estadual: '',
  tipos: [] as string[],
  latitude: null as number | null, longitude: null as number | null,
  observacoes: '', transportador_id: '', ativo: true,
  // Campos específicos de Armazém
  armazem_sigla: '',
  armazem_tipo: 'armazem' as 'armazem' | 'silo' | 'tulha',
  armazem_capacidade_tons: '',
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
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<Cadastro[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const pagination = usePagination(25)
  const [editing, setEditing] = useState<Cadastro | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [busca, setBusca] = useState('')
  const [activeFilters, setActiveFilters] = useState<{id: string, field: string, value: string}[]>([])
  const [showFilterOptions, setShowFilterOptions] = useState(false)

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
  const [tiposCaminhao, setTiposCaminhao] = useState<any[]>([])
  const [viewingItem, setViewingItem] = useState<any>(null)

  // Mesclar cadastros
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([])
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [mergeKeepId, setMergeKeepId] = useState<string | null>(null)
  const [mergingCadastros, setMergingCadastros] = useState(false)
  
  // Unidades Armazenadoras
  const [unidadesArmazenadoras, setUnidadesArmazenadoras] = useState<any[]>([])
  const [unidadeArmazem, setUnidadeArmazem] = useState<any>(null)

  const load = () => {
    setLoading(true)
    Promise.all([getCadastros(), getVeiculos(), getTiposCaminhao(), getUnidadesArmazenadoras()])
      .then(([c, v, tc, ua]) => { 
        setItems(c); 
        setAllVeiculos(v); 
        setTiposCaminhao(tc.filter((t: any) => t.ativo))
        setUnidadesArmazenadoras(ua)
      })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  // Detectar parâmetros da URL para abrir modal automaticamente
  useEffect(() => {
    const novoArmazem = searchParams.get('novo')
    const editarId = searchParams.get('editar')
    
    if (novoArmazem === 'armazem' && !showForm) {
      // Abrir modal de novo cadastro com tipo Armazem pré-selecionado
      setEditing(null)
      setForm({ ...emptyForm, tipos: ['Armazem'] })
      setShowForm(true)
      // Limpar parâmetro da URL
      searchParams.delete('novo')
      setSearchParams(searchParams, { replace: true })
    } else if (editarId && items.length > 0 && !showForm) {
      // Abrir modal de edição do cadastro
      const itemToEdit = items.find(i => i.id === editarId)
      if (itemToEdit) {
        openEdit(itemToEdit)
        // Limpar parâmetro da URL
        searchParams.delete('editar')
        setSearchParams(searchParams, { replace: true })
      }
    }
  }, [searchParams, items, showForm])

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
  const mostraArmazem = form.tipos.includes('Armazem')

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

  const openNew = () => { setEditing(null); setForm(emptyForm); setSavedMotoristaId(null); setUnidadeArmazem(null); setShowForm(true) }
  const openEdit = (item: Cadastro) => {
    setEditing(item)
    // Buscar dados de unidade armazenadora se for tipo Armazem
    const unidade = unidadesArmazenadoras.find(u => u.cadastro_id === item.id)
    setUnidadeArmazem(unidade || null)
    
    setForm({
      cpf_cnpj: item.cpf_cnpj || '', nome: item.nome, nome_fantasia: item.nome_fantasia || '',
      apelido: item.apelido || '', tipo_pessoa: item.tipo_pessoa || 'juridica',
      telefone1: item.telefone1 || '', telefone2: item.telefone2 || '',
      uf: item.uf, cidade: item.cidade, codigo_ibge: item.codigo_ibge || '',
      cep: item.cep || '', logradouro: item.logradouro || '', numero: item.numero || '',
      complemento: item.complemento || '', bairro: item.bairro || '',
      inscricao_estadual: item.inscricao_estadual || '',
      tipos: item.tipos || [],
      latitude: item.latitude, longitude: item.longitude,
      observacoes: item.observacoes || '', transportador_id: item.transportador_id || '', ativo: item.ativo,
      // Dados de armazém
      armazem_sigla: unidade?.sigla || '',
      armazem_tipo: unidade?.tipo || 'armazem',
      armazem_capacidade_tons: unidade?.capacidade_total_tons ? String(unidade.capacidade_total_tons) : '',
    })
    setSavedMotoristaId(null)
    setShowForm(true)
  }

  const save = async () => {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return }
    if (!form.uf) { toast.error('UF é obrigatória'); return }
    if (!form.cidade) { toast.error('Cidade é obrigatória'); return }
    if (form.tipos.length === 0) { toast.error('Selecione pelo menos um Tipo'); return }
    
    // IMPORTANTE: Separar campos de armazém do payload principal
    // Os campos armazem_* devem ir apenas para unidades_armazenadoras, não para cadastros
    const { armazem_sigla, armazem_tipo, armazem_capacidade_tons, ...dadosCadastro } = form
    
    const payload = {
      ...dadosCadastro,
      cpf_cnpj: dadosCadastro.cpf_cnpj || null,
      nome_fantasia: dadosCadastro.nome_fantasia || null,
      telefone1: dadosCadastro.telefone1 || null,
      telefone2: dadosCadastro.telefone2 || null,
      observacoes: dadosCadastro.observacoes || null,
      latitude: dadosCadastro.latitude || null,
      longitude: dadosCadastro.longitude || null,
      transportador_id: dadosCadastro.transportador_id || null,
    }
    try {
      let result: any
      if (editing) { result = await updateCadastro(editing.id, payload); toast.success('Cadastro atualizado') }
      else { result = await createCadastro(payload); toast.success('Cadastro criado') }
      
      const cadastroId = result?.id || editing?.id
      setSavedMotoristaId(cadastroId || null)
      
      // Salvar/atualizar unidade armazenadora se tipo Armazem selecionado
      if (mostraArmazem && cadastroId) {
        const armazemPayload = {
          cadastro_id: cadastroId,
          sigla: form.armazem_sigla || null,
          tipo: form.armazem_tipo,
          capacidade_total_tons: form.armazem_capacidade_tons ? Number(form.armazem_capacidade_tons) : null,
          ativo: true
        }
        
        if (unidadeArmazem) {
          await updateUnidadeArmazenadora(unidadeArmazem.id, armazemPayload)
        } else {
          await createUnidadeArmazenadora(armazemPayload)
        }
      }
      
      if (mostraMotorista && !editing) {
        // Manter form aberto para permitir cadastrar veiculo
        setEditing(result)
      } else {
        setShowForm(false)
      }
      load()
    } catch (err: any) { 
      console.error('Erro ao salvar:', err)
      toast.error('Erro ao salvar: ' + (err?.message || ''))
    }
  }

  const onVeiculoTipoChange = (tipo: string) => {
    const found = tiposCaminhao.find((t: any) => t.nome === tipo)
    setVeiculoForm(prev => ({ ...prev, tipo_caminhao: tipo, eixos: found?.eixos ?? 0, peso_pauta_kg: found?.peso_pauta_kg ?? 0 }))
  }

  const saveVeiculo = async () => {
    const ownerId = savedMotoristaId || editing?.id
    if (!ownerId) { toast.error('Salve o cadastro do motorista primeiro'); return }
    if (!veiculoForm.placa) { toast.error('Placa é obrigatória'); return }
    if (!veiculoForm.tipo_caminhao) { toast.error('Tipo de caminhão é obrigatório'); return }
    try {
      await createVeiculo({
        cadastro_id: ownerId,
        placa: veiculoForm.placa.toUpperCase(),
        tipo_caminhao: veiculoForm.tipo_caminhao,
        eixos: veiculoForm.eixos || 0,
        peso_pauta_kg: veiculoForm.peso_pauta_kg || 0,
        marca: veiculoForm.marca || null,
        modelo: veiculoForm.modelo || null,
        ano: veiculoForm.ano ? Number(veiculoForm.ano) : null,
        ativo: true,
      })
      toast.success('Veículo cadastrado e vinculado!')
      setVeiculoForm(emptyVeiculoForm)
      setShowVeiculoForm(false)
      // Recarregar veiculos para mostrar na lista
      const v = await getVeiculos()
      setAllVeiculos(v)
    } catch (err: any) { 
      console.error('Erro ao cadastrar veículo:', err)
      toast.error(`Erro ao cadastrar veículo: ${err?.message || 'Erro desconhecido'}`) 
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Deseja remover este cadastro?')) return
    try { await deleteCadastro(id); toast.success('Cadastro removido'); load() }
    catch { toast.error('Erro ao remover') }
  }

  const addFilter = (field: string) => {
    setActiveFilters([...activeFilters, {id: Date.now().toString(), field, value: ''}])
    setShowFilterOptions(false)
  }
  const removeFilter = (id: string) => setActiveFilters(activeFilters.filter(f => f.id !== id))
  const updateFilterValue = (id: string, value: string) => {
    setActiveFilters(activeFilters.map(f => f.id === id ? {...f, value} : f))
  }
  const clearAllFilters = () => { setActiveFilters([]); setBusca('') }

  // Toggle seleção para mesclagem
  const toggleSelectForMerge = (id: string) => {
    setSelectedForMerge(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  // Abrir modal de mesclagem
  const openMergeModal = () => {
    if (selectedForMerge.length !== 2) {
      toast.error('Selecione exatamente 2 cadastros para mesclar')
      return
    }
    setMergeKeepId(selectedForMerge[0])
    setShowMergeModal(true)
  }

  // Mesclar cadastros
  const handleMergeCadastros = async () => {
    if (!mergeKeepId || selectedForMerge.length !== 2) return
    const removeId = selectedForMerge.find(id => id !== mergeKeepId)
    if (!removeId) return

    if (!confirm(`Confirma a mesclagem?\n\nCadastro ativo: ${items.find(i => i.id === mergeKeepId)?.nome}\nCadastro que será desativado: ${items.find(i => i.id === removeId)?.nome}\n\nTodos os vínculos serão transferidos.`)) return

    setMergingCadastros(true)
    try {
      const resp = await fetch('/api/merge-cadastros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepId: mergeKeepId, removeId })
      })
      if (!resp.ok) throw new Error(await resp.text())
      toast.success('Cadastros mesclados com sucesso!')
      setShowMergeModal(false)
      setSelectedForMerge([])
      setMergeKeepId(null)
      load()
    } catch (err: any) {
      toast.error('Erro ao mesclar: ' + (err?.message || ''))
    } finally {
      setMergingCadastros(false)
    }
  }

  const FILTER_FIELDS = [
    {key: 'nome', label: 'Nome', type: 'text'},
    {key: 'cpf_cnpj', label: 'CPF/CNPJ', type: 'text'},
    {key: 'uf', label: 'UF', type: 'select', options: () => ufsDisponiveis},
    {key: 'cidade', label: 'Cidade', type: 'text'},
    {key: 'tipo', label: 'Tipo', type: 'select', options: () => TODOS_TIPOS},
    {key: 'ativo', label: 'Ativo', type: 'select', options: () => ['Sim', 'Não']},
  ]

  const hasAtivoFilter = activeFilters.some(f => f.field === 'ativo' && f.value)

  const filtered = items.filter(i => {
    // Por padrão, esconder cadastros inativos (mesclados) — exceto se houver filtro 'ativo' explícito
    if (!hasAtivoFilter && i.ativo === false) return false
    // Filtros avançados
    for (const filter of activeFilters) {
      if (!filter.field || !filter.value) continue
      if (filter.field === 'nome' && !i.nome?.toLowerCase().includes(filter.value.toLowerCase())) return false
      if (filter.field === 'cpf_cnpj' && !i.cpf_cnpj?.toLowerCase().includes(filter.value.toLowerCase())) return false
      if (filter.field === 'uf' && i.uf !== filter.value) return false
      if (filter.field === 'cidade' && !i.cidade?.toLowerCase().includes(filter.value.toLowerCase())) return false
      if (filter.field === 'tipo' && !(i.tipos || []).includes(filter.value)) return false
      if (filter.field === 'ativo') {
        if (filter.value === 'Sim' && !i.ativo) return false
        if (filter.value === 'Não' && i.ativo) return false
      }
    }
    // Busca geral
    if (!busca) return true
    const term = busca.toLowerCase()
    return i.nome?.toLowerCase().includes(term) || i.nome_fantasia?.toLowerCase().includes(term) ||
      i.cpf_cnpj?.toLowerCase().includes(term) || i.cidade?.toLowerCase().includes(term) ||
      placasPorCadastro(i.id).some(p => p.toLowerCase().includes(term))
  })

  const { sortedData: sortedFiltered, sortKey, sortDirection, toggleSort } = useSort(filtered)

  const ufsDisponiveis = [...new Set(items.map(i => i.uf))].sort()

  const tipoColors: Record<string, string> = {
    Fazenda: 'bg-green-100 text-green-700', Armazem: 'bg-blue-100 text-blue-700',
    Industria: 'bg-purple-100 text-purple-700', Porto: 'bg-cyan-100 text-cyan-700',
    Fornecedor: 'bg-amber-100 text-amber-700', Transportadora: 'bg-rose-100 text-rose-700',
    Motorista: 'bg-indigo-100 text-indigo-700', Outro: 'bg-gray-100 text-gray-700',
  }

  const handleExportExcel = () => {
    exportToExcel({
      filename: 'cadastros_fretagru',
      title: 'Cadastros',
      columns: [
        { key: 'nome', label: 'Nome' },
        { key: 'nome_fantasia', label: 'Nome Fantasia' },
        { key: 'cpf_cnpj', label: 'CPF/CNPJ' },
        { key: 'telefone1', label: 'Telefone' },
        { key: 'uf', label: 'UF' },
        { key: 'cidade', label: 'Cidade' },
        { key: 'tipos', label: 'Tipos' },
        { key: 'ativo', label: 'Ativo' },
      ],
      data: sortedFiltered,
      getValue: (item, key) => {
        if (key === 'tipos') return (item.tipos || []).join(', ')
        if (key === 'ativo') return item.ativo ? 'Sim' : 'Não'
        return item[key] || ''
      }
    })
    toast.success(`${sortedFiltered.length} cadastros exportados`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Cadastros</h1>
        <div className="flex gap-2">
          {selectedForMerge.length === 2 && (
            <button onClick={openMergeModal} className="flex items-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 text-sm font-medium">
              <Merge className="w-4 h-4" /> Mesclar {selectedForMerge.length}
            </button>
          )}
          <button onClick={handleExportExcel} className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 text-sm" title="Exportar Excel">
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button onClick={openNew} className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 sm:px-4 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base whitespace-nowrap">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Novo</span> Cadastro
          </button>
        </div>
      </div>

      {/* Barra de busca */}
      <div className="mb-3 flex gap-2 items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input type="text" placeholder="Buscar por nome, CNPJ, cidade, placa..." value={busca} onChange={e => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm" />
        </div>
      </div>

      {/* Filtros avançados */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {activeFilters.length > 0 && (
          <>
            {activeFilters.map(filter => {
              const fieldDef = FILTER_FIELDS.find(f => f.key === filter.field)
              return (
                <div key={filter.id} className="flex items-center gap-2 bg-gray-100 rounded-lg p-2 pr-3">
                  <span className="text-xs font-medium text-gray-600">{fieldDef?.label || filter.field}:</span>
                  {fieldDef?.type === 'select' ? (
                    <select value={filter.value} onChange={e => updateFilterValue(filter.id, e.target.value)}
                      className="text-sm border-0 bg-transparent focus:ring-0 p-0 pr-6">
                      <option value="">Selecione...</option>
                      {(fieldDef.options?.() || []).map((opt: any) => (
                        <option key={opt} value={opt}>{opt}</option>
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
          </>
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

      {/* Contador de resultados */}
      <div className="mb-2 text-xs text-gray-400 flex items-center gap-2">
        <span>{filtered.length} de {items.length} cadastros</span>
        {(activeFilters.length > 0 || busca) && <span className="text-green-600 font-medium">(filtrado)</span>}
      </div>

      {/* Tabela */}
      {loading ? <p className="text-gray-500">Carregando...</p> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto -mx-3 sm:mx-0">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="w-10 px-3 py-3"></th>
                <SortHeader field="nome" label="Nome" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
                <SortHeader field="cpf_cnpj" label="CPF/CNPJ" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Placa</th>
                <SortHeader field="cidade" label="Cidade/UF" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Tipos</th>
                <SortHeader field="telefone1" label="Telefone" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pagination.paginate(sortedFiltered).map(item => {
                const placas = placasPorCadastro(item.id)
                const isSelected = selectedForMerge.includes(item.id)
                return (
                <tr key={item.id} className={`hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-purple-50' : ''}`} onClick={() => setViewingItem(item)}>
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => toggleSelectForMerge(item.id)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                  </td>
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
                  <td className="px-4 py-3 text-right space-x-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
                )
              })}
              {sortedFiltered.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Nenhum cadastro encontrado</td></tr>}
            </tbody>
          </table>
          <Pagination
            currentPage={pagination.page}
            totalItems={sortedFiltered.length}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            onPageSizeChange={(s) => { pagination.setPageSize(s); pagination.resetPage() }}
          />
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

              {/* Apelido */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apelido</label>
                <input type="text" value={form.apelido} onChange={e => setForm({...form, apelido: e.target.value})}
                  placeholder="Nome usado para identificação e busca"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                <p className="text-xs text-gray-500 mt-1">Como este cadastro aparecerá nas buscas (se vazio, usa Nome Fantasia ou Nome)</p>
              </div>

              {/* Tipo Pessoa + Inscrição Estadual */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Pessoa</label>
                  <SearchableSelect value={form.tipo_pessoa} onChange={val => setForm({...form, tipo_pessoa: val as 'fisica' | 'juridica' | 'estrangeira'})}
                    options={[{ value: 'fisica', label: 'Física' }, { value: 'juridica', label: 'Jurídica' }, { value: 'estrangeira', label: 'Estrangeira' }]} placeholder="Tipo Pessoa" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inscrição Estadual</label>
                  <input type="text" value={form.inscricao_estadual} onChange={e => setForm({...form, inscricao_estadual: e.target.value})}
                    placeholder="IE (se aplicável)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
              </div>

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
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UF *</label>
                  <SearchableSelect value={form.uf} onChange={val => setForm({...form, uf: val, cidade: '', codigo_ibge: ''})}
                    options={[{ value: '', label: 'Selecione...' }, ...ufs.map(u => ({ value: u.sigla, label: `${u.sigla} - ${u.nome}` }))]} placeholder="UF" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cidade *</label>
                  {loadingCidades ? (
                    <div className="flex items-center gap-2 px-3 py-2 text-gray-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</div>
                  ) : (
                    <SearchableSelect value={form.cidade} onChange={val => {
                      const cidadeSelecionada = cidades.find(c => c.nome === val)
                      setForm({
                        ...form, 
                        cidade: val,
                        codigo_ibge: cidadeSelecionada ? String(cidadeSelecionada.id) : ''
                      })
                    }}
                      options={[{ value: '', label: 'Selecione...' }, ...cidades.map(c => ({ value: c.nome, label: c.nome }))]} placeholder="Cidade" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código IBGE</label>
                  <input type="text" value={form.codigo_ibge} readOnly
                    placeholder="Preenchido automaticamente"
                    title="Preenchido automaticamente ao selecionar a cidade"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed" />
                </div>
              </div>

              {/* Endereço Completo */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                  <input type="text" value={form.cep} onChange={e => setForm({...form, cep: e.target.value})}
                    placeholder="00000-000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro</label>
                  <input type="text" value={form.logradouro} onChange={e => setForm({...form, logradouro: e.target.value})}
                    placeholder="Rua, Avenida, etc"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                  <input type="text" value={form.numero} onChange={e => setForm({...form, numero: e.target.value})}
                    placeholder="123"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                  <input type="text" value={form.bairro} onChange={e => setForm({...form, bairro: e.target.value})}
                    placeholder="Centro, etc"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
                  <input type="text" value={form.complemento} onChange={e => setForm({...form, complemento: e.target.value})}
                    placeholder="Sala 101, Bloco A"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
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

              {/* Campos específicos de Armazém (condicional) */}
              {mostraArmazem && (
                <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full" />
                    <span className="text-sm font-semibold text-blue-800">Dados Específicos do Armazém</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sigla</label>
                      <input type="text" value={form.armazem_sigla} onChange={e => setForm({...form, armazem_sigla: e.target.value})}
                        placeholder="Ex: ARM01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                      <select value={form.armazem_tipo} onChange={e => setForm({...form, armazem_tipo: e.target.value as 'armazem' | 'silo' | 'tulha'})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="armazem">Armazém</option>
                        <option value="silo">Silo</option>
                        <option value="tulha">Tulha</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Capacidade (Ton)</label>
                      <input type="number" step="0.01" value={form.armazem_capacidade_tons} 
                        onChange={e => setForm({...form, armazem_capacidade_tons: e.target.value})}
                        placeholder="Ex: 5.000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                  </div>
                  
                  <p className="text-xs text-blue-600 mt-2">
                    ℹ️ Estes dados serão usados no módulo SilAgru para gestão de armazenagem.
                  </p>
                </div>
              )}

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
                  <SearchableSelect value={form.transportador_id} onChange={val => setForm({...form, transportador_id: val})}
                    options={[{ value: '', label: 'Autônomo (sem transportadora)' }, ...transportadorasList.map(t => ({ value: t.id, label: t.nome_fantasia || t.nome }))]} placeholder="Transportadora" />
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
                          <SearchableSelect value={veiculoForm.tipo_caminhao} onChange={val => onVeiculoTipoChange(val)}
                            options={tiposCaminhao.map((t: any) => ({ value: t.nome, label: `${t.nome} (${t.eixos} eixos - ${fmtInt(t.peso_pauta_kg)} kg)` }))} placeholder="Tipo Caminhão" />
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

      {/* Modal de Visualização */}
      <ViewModal
        title="Detalhes do Cadastro"
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        onEdit={() => { openEdit(viewingItem); setViewingItem(null) }}
      >
        {viewingItem && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Nome Fantasia" value={viewingItem.nome_fantasia} />
            <Field label="Razão Social" value={viewingItem.nome} />
            <Field label="CPF/CNPJ" value={viewingItem.cpf_cnpj} />
            <Field label="Telefone 1" value={viewingItem.telefone1} />
            <Field label="Telefone 2" value={viewingItem.telefone2} />
            <Field label="UF" value={viewingItem.uf} />
            <Field label="Cidade" value={viewingItem.cidade} />
            <Field label="Tipos" value={(viewingItem.tipos || []).join(', ')} />
            <Field label="Status" value={viewingItem.ativo ? 'Ativo' : 'Inativo'} />
            <Field label="Latitude" value={viewingItem.latitude} />
            <Field label="Longitude" value={viewingItem.longitude} />
            {viewingItem.tipos?.includes('Motorista') && viewingItem.transportador_id && (
              <Field label="Transportadora" value={items.find(i => i.id === viewingItem.transportador_id)?.nome_fantasia || items.find(i => i.id === viewingItem.transportador_id)?.nome} />
            )}
            <Field label="Placas Vinculadas" value={placasPorCadastro(viewingItem.id).join(', ') || 'Nenhuma'} full />
            <Field label="Observações" value={viewingItem.observacoes} full />
          </dl>
        )}
      </ViewModal>

      {/* Modal de Mesclagem */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Merge className="w-5 h-5 text-purple-600" /> Mesclar Cadastros
              </h2>
              <button onClick={() => setShowMergeModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Selecione qual cadastro deve permanecer <strong>ativo</strong>. O outro será desativado e todos os vínculos (ordens de carregamento, romaneios, preços) serão transferidos para o cadastro ativo.
              </p>

              {selectedForMerge.map(id => {
                const cadastro = items.find(i => i.id === id)
                if (!cadastro) return null
                return (
                  <div key={id} className={`border rounded-lg p-4 cursor-pointer transition-all ${mergeKeepId === id ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' : 'border-gray-200 hover:border-purple-300'}`}
                    onClick={() => setMergeKeepId(id)}>
                    <div className="flex items-start gap-3">
                      <input 
                        type="radio" 
                        checked={mergeKeepId === id}
                        onChange={() => setMergeKeepId(id)}
                        className="mt-1 w-4 h-4 text-purple-600"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800">{cadastro.nome_fantasia || cadastro.nome}</div>
                        {cadastro.nome_fantasia && <div className="text-xs text-gray-500">{cadastro.nome}</div>}
                        <div className="text-sm text-gray-600 mt-1">
                          {cadastro.cpf_cnpj && <span className="font-mono">{cadastro.cpf_cnpj}</span>}
                          {cadastro.cidade && <span className="ml-2">• {cadastro.cidade}/{cadastro.uf}</span>}
                        </div>
                        {cadastro.tipos && cadastro.tipos.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {cadastro.tipos.map(t => (
                              <span key={t} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-2">
                <span className="text-yellow-600 text-xl">⚠️</span>
                <div className="text-sm text-yellow-800">
                  <strong>Atenção:</strong> Esta ação não pode ser desfeita. O cadastro não selecionado será marcado como inativo.
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setShowMergeModal(false)} 
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button onClick={handleMergeCadastros} disabled={mergingCadastros || !mergeKeepId}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  {mergingCadastros ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mesclando...
                    </>
                  ) : (
                    <>
                      <Merge className="w-4 h-4" />
                      Confirmar Mesclagem
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

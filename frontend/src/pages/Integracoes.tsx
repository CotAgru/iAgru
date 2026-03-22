import { useEffect, useState } from 'react'
import { Link2, Loader2, CheckCircle2, XCircle, RefreshCw, Trash2, Eye, EyeOff, X, ArrowRight, Check, Filter, BarChart3, ArrowUpDown, Upload, Download, Link as LinkIcon, Search, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getIntegracaoByProvedor, upsertIntegracao, deleteIntegracao, getCulturas, createCultura, getTiposSafra, createTipoSafra, getAnosSafra, createAnoSafra, upsertSafraFromAegro, getImportedAegroSafras, getCadastros, getImportedAegroCadastros, upsertCadastroAegroKey, createCadastroFromAegro } from '../services/api'
import { aegroTestConnection, aegroGetCrops, aegroGetCompanies, aegroCreateCompany } from '../services/aegro'
import { fmtData } from '../utils/format'

const FARM_ID_PADRAO = '61af6824b4d7196ebc0076f0'

// Mapa de type Aegro → nome cultura em pt-BR
const AEGRO_TYPE_MAP: Record<string, string> = {
  soy: 'Soja', corn: 'Milho', sorghum: 'Sorgo', beans: 'Feijão', bean: 'Feijão',
  cotton: 'Algodão', wheat: 'Trigo', coffee: 'Café', sugarcane: 'Cana-de-Açúcar',
  rice: 'Arroz', oat: 'Aveia', citrus: 'Citros', barley: 'Cevada', sunflower: 'Girassol',
  peanut: 'Amendoim', potato: 'Batata', tobacco: 'Tabaco', millet: 'Milheto',
  other: 'Geral', grass: 'Pastagem', eucalyptus: 'Eucalipto',
}

// Sync Cadastros
type SyncStatus = 'linked' | 'only_iagru' | 'only_aegro' | 'match_suggestion'
interface CompanySync {
  // Dados Aegro
  aegroKey: string | null
  aegroName: string | null
  aegroTradeName: string | null
  aegroCpfCnpj: string | null
  aegroPhone: string | null
  aegroState: string | null
  aegroCity: string | null
  aegroRaw: any // dados brutos do Aegro para debug/referência
  // Dados iAgru
  iagruId: string | null
  iagruNome: string | null
  iagruNomeFantasia: string | null
  iagruCpfCnpj: string | null
  iagruTelefone: string | null
  iagruUf: string | null
  iagruCidade: string | null
  iagruTipos: string[]
  // Status
  status: SyncStatus
  matchField: string | null // campo que gerou o match ('cpf_cnpj' | 'nome')
  processing: boolean
  done: boolean
  error: string | null
}

interface CropMapping {
  cropKey: string
  cropName: string
  aegroType: string
  startDate: string | null
  endDate: string | null
  areaHa: number | null
  culturaId: string
  tipoSafraId: string
  anoSafraId: string
  selected: boolean
  alreadyImported: boolean
  hasChanges: boolean
}

export default function Integracoes() {
  const [loading, setLoading] = useState(true)
  const [aegro, setAegro] = useState<any>(null)
  const [token, setToken] = useState('')
  const [farmId, setFarmId] = useState(FARM_ID_PADRAO)
  const [farmNome, setFarmNome] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [farms, setFarms] = useState<any[]>([])
  const [importResult, setImportResult] = useState<{ total: number } | null>(null)

  // Modal de mapeamento
  const [showMapModal, setShowMapModal] = useState(false)
  const [loadingCrops, setLoadingCrops] = useState(false)
  const [savingImport, setSavingImport] = useState(false)
  const [cropMappings, setCropMappings] = useState<CropMapping[]>([])
  const [culturas, setCulturas] = useState<any[]>([])
  const [tiposSafra, setTiposSafra] = useState<any[]>([])
  const [anosSafra, setAnosSafra] = useState<any[]>([])
  const [newCultura, setNewCultura] = useState('')
  const [newTipoSafra, setNewTipoSafra] = useState('')
  const [newAnoSafra, setNewAnoSafra] = useState('')
  // Filtros do modal
  const [filterNome, setFilterNome] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterAnoSafra, setFilterAnoSafra] = useState('')

  // Modal Sync Cadastros
  const [showSyncCadModal, setShowSyncCadModal] = useState(false)
  const [loadingSyncCad, setLoadingSyncCad] = useState(false)
  const [companySyncs, setCompanySyncs] = useState<CompanySync[]>([])
  const [syncCadFilter, setSyncCadFilter] = useState<'' | 'linked' | 'only_iagru' | 'only_aegro' | 'match_suggestion'>('')
  const [syncCadSearch, setSyncCadSearch] = useState('')
  // Preview antes de enviar ao Aegro
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewData, setPreviewData] = useState<{ idx: number; sync: CompanySync; payload: any } | null>(null)

  // Stats de sincronização (dashboard)
  const [syncStats, setSyncStats] = useState<{
    loading: boolean
    totalAegro: number
    imported: number
    newCrops: number
    changed: number
  } | null>(null)

  const loadSyncStats = async (tkn: string) => {
    setSyncStats({ loading: true, totalAegro: 0, imported: 0, newCrops: 0, changed: 0 })
    try {
      const [cropsData, imported] = await Promise.all([
        aegroGetCrops(tkn.trim()),
        getImportedAegroSafras(),
      ])
      const crops = cropsData?.items || (Array.isArray(cropsData) ? cropsData : [])
      const importedMap = new Map(imported.map((s: any) => [s.aegro_crop_key, s]))

      const normDate = (d: any) => d ? String(d).slice(0, 10) : ''
      const normArea = (a: any) => a != null ? Math.round(Number(a) * 100) / 100 : null

      let newCount = 0
      let changedCount = 0
      for (const crop of crops) {
        const key = crop.key || ''
        const existing = importedMap.get(key)
        if (!existing) {
          newCount++
        } else {
          const cropName = crop.name || ''
          const areaHa = crop.totalArea?.magnitude || crop.area?.magnitude || null
          const startDate = crop.startDate || null
          const endDate = crop.endDate || null
          const changed = existing.nome !== cropName ||
            normArea(existing.area_ha) !== normArea(areaHa) ||
            normDate(existing.data_inicio) !== normDate(startDate) ||
            normDate(existing.data_fim) !== normDate(endDate)
          if (changed) changedCount++
        }
      }

      setSyncStats({
        loading: false,
        totalAegro: crops.length,
        imported: imported.length,
        newCrops: newCount,
        changed: changedCount,
      })
    } catch {
      setSyncStats(null)
    }
  }

  const loadAegro = async () => {
    setLoading(true)
    try {
      const data = await getIntegracaoByProvedor('aegro')
      if (data) {
        setAegro(data)
        setToken(data.token || '')
        setFarmId(data.farm_id || FARM_ID_PADRAO)
        setFarmNome(data.farm_nome || '')
      }
    } catch {
      // tabela pode não existir ainda
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAegro().then(() => {
      // Stats serão carregados quando o token estiver disponível
    })
  }, [])

  // Carregar stats quando conectado e token disponível
  useEffect(() => {
    if (aegro?.status === 'conectado' && token.trim()) {
      loadSyncStats(token)
    }
  }, [aegro?.status])

  const handleConnect = async () => {
    if (!token.trim()) { toast.error('Informe o token da API Aegro'); return }
    setConnecting(true)
    try {
      const result = await aegroTestConnection(token.trim())
      if (!result.success) {
        toast.error('Falha na conexão: ' + (result.error || 'Token inválido'))
        setConnecting(false)
        return
      }

      setFarms(result.farms)

      // Aegro retorna key no formato "farm::id" e campo "name"
      const extractId = (f: any) => f?.key?.replace('farm::', '') || f?._id || f?.id || ''
      let selectedFarm = result.farms.find((f: any) => extractId(f) === farmId || f?.key === `farm::${farmId}`)
      if (!selectedFarm && result.farms.length > 0) {
        selectedFarm = result.farms[0]
      }

      const nome = selectedFarm?.name || selectedFarm?.nome || 'Fazenda conectada'
      const fid = extractId(selectedFarm) || farmId
      const farmKey = selectedFarm?.key || `farm::${fid}`

      const saved = await upsertIntegracao('aegro', {
        token: token.trim(),
        farm_id: fid,
        farm_nome: nome,
        status: 'conectado',
        ultimo_sync: new Date().toISOString(),
        config: { farmKey, farms: result.farms.map((f: any) => ({ key: f.key, id: extractId(f), name: f.name || f.nome })) },
      })

      setAegro(saved)
      setFarmId(fid)
      setFarmNome(nome)
      toast.success(`Conectado ao Aegro — ${nome}`)
    } catch (err: any) {
      toast.error('Erro: ' + (err?.message || 'Falha na conexão'))
    }
    setConnecting(false)
  }

  const handleReconnect = async () => {
    setTestingConnection(true)
    try {
      const result = await aegroTestConnection(token.trim())
      if (result.success) {
        setFarms(result.farms)
        const selectedFarm = result.farms.find((f: any) => f._id === farmId || f.id === farmId)
        const nome = selectedFarm?.name || selectedFarm?.nome || farmNome

        await upsertIntegracao('aegro', {
          status: 'conectado',
          ultimo_sync: new Date().toISOString(),
          farm_nome: nome,
          config: { farms: result.farms.map((f: any) => ({ id: f._id || f.id, name: f.name || f.nome })) },
        })
        setFarmNome(nome)
        setAegro((prev: any) => ({ ...prev, status: 'conectado', ultimo_sync: new Date().toISOString() }))
        toast.success('Reconectado com sucesso!')
      } else {
        await upsertIntegracao('aegro', { status: 'erro' })
        setAegro((prev: any) => ({ ...prev, status: 'erro' }))
        toast.error('Falha: ' + (result.error || 'Token inválido'))
      }
    } catch (err: any) {
      toast.error('Erro: ' + (err?.message || ''))
    }
    setTestingConnection(false)
  }

  const handleDisconnect = async () => {
    if (!confirm('Deseja desconectar o Aegro? O token será removido.')) return
    try {
      if (aegro?.id) await deleteIntegracao(aegro.id)
      setAegro(null)
      setToken('')
      setFarmNome('')
      setFarms([])
      toast.success('Aegro desconectado')
    } catch { toast.error('Erro ao desconectar') }
  }

  // === ABRIR MODAL DE MAPEAMENTO ===
  const handleOpenImportCrops = async () => {
    if (!token.trim()) { toast.error('Token não encontrado'); return }
    setLoadingCrops(true)
    setShowMapModal(true)
    setImportResult(null)
    setFilterNome('')
    setFilterType('')
    setFilterAnoSafra('')
    try {
      // Buscar crops do Aegro + dados auxiliares + safras já importadas em paralelo
      const [cropsData, cults, tipos, anos, imported] = await Promise.all([
        aegroGetCrops(token.trim()),
        getCulturas(),
        getTiposSafra(),
        getAnosSafra(),
        getImportedAegroSafras(),
      ])
      const crops = cropsData?.items || (Array.isArray(cropsData) ? cropsData : [])
      if (crops.length === 0) { toast.error('Nenhuma safra encontrada no Aegro'); setShowMapModal(false); setLoadingCrops(false); return }

      setCulturas(cults)
      setTiposSafra(tipos)
      setAnosSafra(anos)

      // Mapa de safras já importadas por aegro_crop_key
      const importedMap = new Map(imported.map((s: any) => [s.aegro_crop_key, s]))

      // Pré-mapear cada crop
      const cultMap = new Map<string, string>(cults.map((c: any) => [c.nome.toLowerCase(), c.id]))
      const tipoMap = new Map<string, string>(tipos.map((t: any) => [t.nome.toLowerCase(), t.id]))
      const anoMap = new Map<string, string>(anos.map((a: any) => [a.nome?.toLowerCase(), a.id]))

      const mappings: CropMapping[] = crops.map((crop: any) => {
        const aegroType = crop.type || ''
        const cropName = crop.name || ''
        const cropKey = crop.key || ''
        const startDate = crop.startDate || null
        const endDate = crop.endDate || null
        const areaHa = crop.totalArea?.magnitude || crop.area?.magnitude || null

        // Verificar se já foi importada
        const existingImport = importedMap.get(cropKey)
        const alreadyImported = !!existingImport

        // Auto-detectar cultura pelo type do Aegro
        const cultNome = AEGRO_TYPE_MAP[aegroType.toLowerCase()] || ''
        let culturaId = cultMap.get(cultNome.toLowerCase()) || ''

        // Auto-detectar tipo safra pelo nome
        const lower = cropName.toLowerCase()
        let tipoSafraId = ''
        if (lower.includes('safrinha') || lower.includes('2a safra')) tipoSafraId = tipoMap.get('safrinha') || tipoMap.get('2ª safrinha') || ''
        else if (lower.includes('inverno')) tipoSafraId = tipoMap.get('inverno') || ''
        else if (lower.includes('verão') || lower.includes('verao') || lower.includes('1a safra')) tipoSafraId = tipoMap.get('verão') || tipoMap.get('1ª safra') || ''

        // Auto-detectar ano safra pelo nome da crop
        let anoSafraId = ''
        const anoMatch = cropName.match(/(\d{2,4})\/(\d{2,4})/)
        if (anoMatch) {
          const a = anoMatch[1].slice(-2)
          const b = anoMatch[2].slice(-2)
          // xx/xx onde ambos são iguais = NÃO é ano safra válido, pular
          if (a !== b) {
            const anoNome = `${a}/${b}`
            anoSafraId = anoMap.get(anoNome.toLowerCase()) || ''
          }
        } else if (startDate) {
          const y = new Date(startDate).getFullYear()
          const m = new Date(startDate).getMonth()
          const anoNome = m >= 6 ? `${y % 100}/${(y + 1) % 100}` : `${(y - 1) % 100}/${y % 100}`
          anoSafraId = anoMap.get(anoNome) || ''
        }

        // Se já importada, usar os dados existentes para pré-preencher e comparar
        if (alreadyImported && existingImport) {
          culturaId = existingImport.cultura_id || culturaId
          tipoSafraId = existingImport.tipo_safra_id || tipoSafraId
          anoSafraId = existingImport.ano_safra_id || anoSafraId
        }

        // Verificar se os dados mudaram comparando com o que já está no DB
        // Normalizar datas (YYYY-MM-DD), area (arredondar), e null/undefined
        const normDate = (d: any) => d ? String(d).slice(0, 10) : ''
        const normArea = (a: any) => a != null ? Math.round(Number(a) * 100) / 100 : null
        let hasChanges = false
        if (alreadyImported && existingImport) {
          hasChanges = existingImport.nome !== cropName ||
            normArea(existingImport.area_ha) !== normArea(areaHa) ||
            normDate(existingImport.data_inicio) !== normDate(startDate) ||
            normDate(existingImport.data_fim) !== normDate(endDate)
        }

        return {
          cropKey,
          cropName,
          aegroType,
          startDate,
          endDate,
          areaHa,
          culturaId,
          tipoSafraId,
          anoSafraId,
          selected: !alreadyImported, // Não selecionar as já importadas por padrão
          alreadyImported,
          hasChanges,
        }
      })

      // Ordenar: novas primeiro, já importadas por último
      mappings.sort((a, b) => {
        if (a.alreadyImported !== b.alreadyImported) return a.alreadyImported ? 1 : -1
        return a.cropName.localeCompare(b.cropName)
      })

      setCropMappings(mappings)
    } catch (err: any) {
      toast.error('Erro ao buscar safras: ' + (err?.message || ''))
      setShowMapModal(false)
    }
    setLoadingCrops(false)
  }

  // === CRIAR ITEM AUXILIAR INLINE ===
  const handleCreateCultura = async () => {
    if (!newCultura.trim()) return
    try {
      const created = await createCultura({ nome: newCultura.trim(), tipo_cadastro: 'api', origem_cadastro: 'aegro' })
      setCulturas(prev => [...prev, created])
      setNewCultura('')
      toast.success(`Cultura "${created.nome}" criada`)
    } catch (err: any) { toast.error(err?.message || 'Erro ao criar cultura') }
  }

  const handleCreateTipoSafra = async () => {
    if (!newTipoSafra.trim()) return
    try {
      const created = await createTipoSafra({ nome: newTipoSafra.trim(), tipo_cadastro: 'api', origem_cadastro: 'aegro' })
      setTiposSafra(prev => [...prev, created])
      setNewTipoSafra('')
      toast.success(`Tipo "${created.nome}" criado`)
    } catch (err: any) { toast.error(err?.message || 'Erro ao criar tipo') }
  }

  const handleCreateAnoSafra = async () => {
    if (!newAnoSafra.trim()) return
    try {
      const created = await createAnoSafra({ nome: newAnoSafra.trim(), tipo_cadastro: 'api', origem_cadastro: 'aegro' })
      setAnosSafra(prev => [...prev, created])
      setNewAnoSafra('')
      toast.success(`Ano safra "${created.nome}" criado`)
    } catch (err: any) { toast.error(err?.message || 'Erro ao criar ano') }
  }

  // === ATUALIZAR MAPEAMENTO DE UMA CROP ===
  const updateMapping = (idx: number, field: keyof CropMapping, value: any) => {
    setCropMappings(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m))
  }

  // === FILTRO: extrair ano safra do nome da crop (ex: "STR SJ 21/22" → "21/22") ===
  const extractAnoFromName = (name: string) => {
    const match = name.match(/(\d{2,4})\/(\d{2,4})/)
    if (!match) return ''
    return `${match[1].slice(-2)}/${match[2].slice(-2)}`
  }

  // === LISTA FILTRADA (calculada) ===
  const getFilteredIndices = () => {
    return cropMappings.map((m, idx) => {
      const matchNome = !filterNome || m.cropName.toLowerCase().includes(filterNome.toLowerCase())
      const matchType = !filterType || m.aegroType.toLowerCase() === filterType.toLowerCase()
      const matchAno = !filterAnoSafra || extractAnoFromName(m.cropName) === filterAnoSafra
      return matchNome && matchType && matchAno ? idx : -1
    }).filter(i => i >= 0)
  }

  const filteredIndices = getFilteredIndices()
  const filteredMappings = filteredIndices.map(i => ({ ...cropMappings[i], _idx: i }))

  // Valores únicos para dropdown de filtro Type
  const uniqueTypes = [...new Set(cropMappings.map(m => m.aegroType).filter(Boolean))].sort()
  // Valores únicos para dropdown de filtro Ano (extraído do nome)
  const uniqueAnos = [...new Set(cropMappings.map(m => extractAnoFromName(m.cropName)).filter(Boolean))].sort()

  // === APLICAR MESMO VALOR PARA CROPS FILTRADAS/VISÍVEIS ===
  const applyToAll = (field: 'culturaId' | 'tipoSafraId' | 'anoSafraId', value: string) => {
    const visibleSet = new Set(filteredIndices)
    setCropMappings(prev => prev.map((m, i) => visibleSet.has(i) ? { ...m, [field]: value } : m))
  }

  // === CONFIRMAR IMPORTAÇÃO ===
  const hasActiveFilter = !!(filterNome || filterType || filterAnoSafra)

  const handleConfirmImport = async () => {
    // Se há filtro ativo, importar apenas as filtradas+selecionadas
    const candidates = hasActiveFilter
      ? filteredMappings.filter(m => m.selected)
      : cropMappings.filter(m => m.selected)
    if (candidates.length === 0) { toast.error('Selecione ao menos uma safra'); return }

    // Validar mapeamento
    const invalid = candidates.filter(m => !m.culturaId || !m.anoSafraId)
    if (invalid.length > 0) {
      toast.error(`${invalid.length} safra(s) sem cultura ou ano safra definido. Preencha todos os campos obrigatórios.`)
      return
    }

    const selected = candidates

    setSavingImport(true)
    try {
      let count = 0
      for (const m of selected) {
        const payload: any = {
          nome: m.cropName,
          ano_safra_id: m.anoSafraId,
          cultura_id: m.culturaId,
          tipo_safra_id: m.tipoSafraId || null,
          data_inicio: m.startDate,
          data_fim: m.endDate,
          area_ha: m.areaHa,
          observacoes: `Importado do Aegro (${m.cropKey})`,
          ativo: true,
          tipo_cadastro: 'api',
          origem_cadastro: 'aegro',
        }
        await upsertSafraFromAegro(m.cropKey, payload)
        count++
      }

      await upsertIntegracao('aegro', { ultimo_sync: new Date().toISOString() })
      setAegro((prev: any) => ({ ...prev, ultimo_sync: new Date().toISOString() }))
      setImportResult({ total: count })
      setShowMapModal(false)
      toast.success(`${count} safras importadas com sucesso!`)
      // Recarregar stats
      if (token.trim()) loadSyncStats(token)
    } catch (err: any) {
      toast.error('Erro na importação: ' + (err?.message || ''))
    }
    setSavingImport(false)
  }

  // === SYNC CADASTROS ===
  const normCnpj = (v: string | null | undefined) => (v || '').replace(/\D/g, '')
  const normName = (v: string | null | undefined) => (v || '').toLowerCase().trim().replace(/\s+/g, ' ')

  const handleOpenSyncCadastros = async () => {
    setShowSyncCadModal(true)
    setLoadingSyncCad(true)
    setSyncCadFilter('')
    setSyncCadSearch('')
    try {
      // Buscar dados dos dois lados em paralelo
      const [cadastrosData, companiesData] = await Promise.all([
        getCadastros(),
        aegroGetCompanies(token.trim(), 1, 500),
      ])
      const cadastros: any[] = cadastrosData || []
      const companies: any[] = companiesData?.items || (Array.isArray(companiesData) ? companiesData : [])

      // Mapa por CPF/CNPJ (normalizado, sem pontuação)
      const cadByCnpj = new Map<string, any>()
      const cadByName = new Map<string, any>()
      for (const c of cadastros) {
        const cnpj = normCnpj(c.cpf_cnpj)
        if (cnpj.length >= 11) cadByCnpj.set(cnpj, c)
        cadByName.set(normName(c.nome), c)
        if (c.nome_fantasia) cadByName.set(normName(c.nome_fantasia), c)
      }

      const usedCadIds = new Set<string>()
      const usedAegroKeys = new Set<string>()
      const syncs: CompanySync[] = []

      // 1. Cadastros já vinculados (têm aegro_company_key)
      for (const cad of cadastros) {
        if (cad.aegro_company_key) {
          const aegroMatch = companies.find((co: any) => co.key === cad.aegro_company_key)
          syncs.push({
            aegroKey: cad.aegro_company_key,
            aegroName: aegroMatch?.name || null,
            aegroTradeName: aegroMatch?.tradeName || null,
            aegroCpfCnpj: aegroMatch?.cpfCnpj || null,
            aegroPhone: aegroMatch?.phone || null,
            aegroState: aegroMatch?.state || null,
            aegroCity: aegroMatch?.city || null,
            aegroRaw: aegroMatch || null,
            iagruId: cad.id,
            iagruNome: cad.nome,
            iagruNomeFantasia: cad.nome_fantasia,
            iagruCpfCnpj: cad.cpf_cnpj,
            iagruTelefone: cad.telefone1,
            iagruUf: cad.uf,
            iagruCidade: cad.cidade,
            iagruTipos: cad.tipos || [],
            status: 'linked',
            matchField: 'aegro_company_key',
            processing: false, done: false, error: null,
          })
          usedCadIds.add(cad.id)
          if (aegroMatch) usedAegroKeys.add(aegroMatch.key)
        }
      }

      // 2. Tentar matching por CPF/CNPJ e nome para os não vinculados
      for (const co of companies) {
        if (usedAegroKeys.has(co.key)) continue
        const cnpj = normCnpj(co.cpfCnpj)
        let matchedCad: any = null
        let matchField = ''

        if (cnpj.length >= 11 && cadByCnpj.has(cnpj)) {
          matchedCad = cadByCnpj.get(cnpj)
          matchField = 'cpf_cnpj'
        }
        if (!matchedCad) {
          // Tentar por nome
          const nameMatch = cadByName.get(normName(co.name)) || cadByName.get(normName(co.tradeName))
          if (nameMatch && !usedCadIds.has(nameMatch.id)) {
            matchedCad = nameMatch
            matchField = 'nome'
          }
        }

        if (matchedCad && !usedCadIds.has(matchedCad.id)) {
          syncs.push({
            aegroKey: co.key,
            aegroName: co.name,
            aegroTradeName: co.tradeName || null,
            aegroCpfCnpj: co.cpfCnpj || null,
            aegroPhone: co.phone || null,
            aegroState: co.state || null,
            aegroCity: co.city || null,
            aegroRaw: co,
            iagruId: matchedCad.id,
            iagruNome: matchedCad.nome,
            iagruNomeFantasia: matchedCad.nome_fantasia,
            iagruCpfCnpj: matchedCad.cpf_cnpj,
            iagruTelefone: matchedCad.telefone1,
            iagruUf: matchedCad.uf,
            iagruCidade: matchedCad.cidade,
            iagruTipos: matchedCad.tipos || [],
            status: 'match_suggestion',
            matchField,
            processing: false, done: false, error: null,
          })
          usedCadIds.add(matchedCad.id)
          usedAegroKeys.add(co.key)
        } else {
          // Apenas Aegro
          syncs.push({
            aegroKey: co.key,
            aegroName: co.name,
            aegroTradeName: co.tradeName || null,
            aegroCpfCnpj: co.cpfCnpj || null,
            aegroPhone: co.phone || null,
            aegroState: co.state || null,
            aegroCity: co.city || null,
            aegroRaw: co,
            iagruId: null, iagruNome: null, iagruNomeFantasia: null,
            iagruCpfCnpj: null, iagruTelefone: null, iagruUf: null, iagruCidade: null, iagruTipos: [],
            status: 'only_aegro',
            matchField: null,
            processing: false, done: false, error: null,
          })
          usedAegroKeys.add(co.key)
        }
      }

      // 3. Cadastros iAgru sem match (não vinculados, não matcharam)
      for (const cad of cadastros) {
        if (usedCadIds.has(cad.id)) continue
        syncs.push({
          aegroKey: null, aegroName: null, aegroTradeName: null,
          aegroCpfCnpj: null, aegroPhone: null, aegroState: null, aegroCity: null, aegroRaw: null,
          iagruId: cad.id,
          iagruNome: cad.nome,
          iagruNomeFantasia: cad.nome_fantasia,
          iagruCpfCnpj: cad.cpf_cnpj,
          iagruTelefone: cad.telefone1,
          iagruUf: cad.uf,
          iagruCidade: cad.cidade,
          iagruTipos: cad.tipos || [],
          status: 'only_iagru',
          matchField: null,
          processing: false, done: false, error: null,
        })
      }

      // Ordenar: sugestões primeiro, depois only_iagru, only_aegro, linked por último
      const statusOrder: Record<SyncStatus, number> = { match_suggestion: 0, only_iagru: 1, only_aegro: 2, linked: 3 }
      syncs.sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || (a.iagruNome || a.aegroName || '').localeCompare(b.iagruNome || b.aegroName || ''))

      setCompanySyncs(syncs)
    } catch (err: any) {
      toast.error('Erro ao buscar cadastros: ' + (err?.message || ''))
      setShowSyncCadModal(false)
    }
    setLoadingSyncCad(false)
  }

  // Ação: vincular cadastro iAgru com company Aegro (salvar aegro_company_key)
  const handleLinkCadastro = async (idx: number) => {
    const s = companySyncs[idx]
    if (!s.iagruId || !s.aegroKey) return
    setCompanySyncs(prev => prev.map((item, i) => i === idx ? { ...item, processing: true } : item))
    try {
      await upsertCadastroAegroKey(s.iagruId, s.aegroKey)
      setCompanySyncs(prev => prev.map((item, i) => i === idx ? { ...item, status: 'linked', processing: false, done: true, matchField: item.matchField || 'manual' } : item))
      toast.success(`Vinculado: ${s.iagruNome}`)
    } catch (err: any) {
      setCompanySyncs(prev => prev.map((item, i) => i === idx ? { ...item, processing: false, error: err?.message || 'Erro' } : item))
      toast.error('Erro ao vincular: ' + (err?.message || ''))
    }
  }

  // Ação: abrir preview antes de enviar ao Aegro
  const handleSendToAegro = (idx: number) => {
    const s = companySyncs[idx]
    if (!s.iagruId || !s.iagruNome?.trim()) {
      toast.error('Nome do cadastro é obrigatório')
      return
    }
    
    // Montar payload conforme schema oficial da API Aegro
    const payload: any = {
      name: s.iagruNome.trim(),
      tradeName: (s.iagruNomeFantasia?.trim() || s.iagruNome.trim()), // Apelido obrigatório - usa nome_fantasia ou nome
      legalName: s.iagruNome.trim(), // Nome legal/razão social
      types: ['PROVIDER'], // Fornecedor por padrão (fixo no Aegro)
    }
    
    // Tipos iAgru → observations (formato: #TipoCadastro - Motorista;Fornecedor;)
    if (s.iagruTipos && s.iagruTipos.length > 0) {
      const tiposStr = s.iagruTipos.join(';')
      payload.observations = `#TipoCadastro - ${tiposStr};`
    }
    
    // fiscalNumber (CPF/CNPJ) - objeto
    if (s.iagruCpfCnpj?.trim()) {
      const cnpj = s.iagruCpfCnpj.replace(/\D/g, '')
      payload.fiscalNumber = {
        code: cnpj,
        countryCode: 'BR',
        fiscalNumberType: cnpj.length === 14 ? 'CNPJ' : 'CPF'
      }
    }
    
    // address - objeto (se tiver UF ou cidade)
    if (s.iagruUf?.trim() || s.iagruCidade?.trim()) {
      payload.address = {
        country: { isoCode: 'BR' }
      }
      if (s.iagruUf?.trim()) {
        payload.address.countryDivision = { isoCode: `BR-${s.iagruUf.trim()}` }
      }
      if (s.iagruCidade?.trim()) {
        payload.address.city = { name: s.iagruCidade.trim() }
      }
    }
    
    // contact - objeto (se tiver telefone)
    if (s.iagruTelefone?.trim()) {
      const phone = s.iagruTelefone.replace(/\D/g, '')
      payload.contact = { phone }
    }

    setPreviewData({ idx, sync: s, payload })
    setShowPreviewModal(true)
  }

  // Confirmar envio após preview
  const handleConfirmSendToAegro = async () => {
    if (!previewData) return
    const { idx, sync: s, payload } = previewData
    setShowPreviewModal(false)
    setCompanySyncs(prev => prev.map((item, i) => i === idx ? { ...item, processing: true } : item))
    try {
      const result = await aegroCreateCompany(token.trim(), payload)
      const newKey = result?.key || result?.companyKey || ''
      if (newKey) {
        await upsertCadastroAegroKey(s.iagruId!, newKey)
        setCompanySyncs(prev => prev.map((item, i) => i === idx ? {
          ...item, aegroKey: newKey, aegroName: s.iagruNome, status: 'linked', processing: false, done: true, matchField: 'enviado',
        } : item))
        toast.success(`Enviado ao Aegro: ${s.iagruNome} → key: ${newKey}`)
      } else {
        throw new Error('Aegro não retornou company key')
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Erro desconhecido'
      console.error('Erro ao enviar para Aegro:', err)
      setCompanySyncs(prev => prev.map((item, i) => i === idx ? { ...item, processing: false, error: errorMsg } : item))
      toast.error(`Erro ao enviar: ${errorMsg}`)
    } finally {
      setPreviewData(null)
    }
  }

  // Ação: importar company do Aegro para o iAgru (criar cadastro)
  const handleImportFromAegro = async (idx: number) => {
    const s = companySyncs[idx]
    if (!s.aegroKey) return
    setCompanySyncs(prev => prev.map((item, i) => i === idx ? { ...item, processing: true } : item))
    try {
      const payload = {
        nome: s.aegroName || '',
        nome_fantasia: s.aegroTradeName || null,
        cpf_cnpj: s.aegroCpfCnpj || null,
        telefone1: s.aegroPhone || null,
        uf: s.aegroState || 'GO',
        cidade: s.aegroCity || '',
        tipos: ['Fornecedor'],
        ativo: true,
        aegro_company_key: s.aegroKey,
      }
      const created = await createCadastroFromAegro(payload)
      setCompanySyncs(prev => prev.map((item, i) => i === idx ? {
        ...item,
        iagruId: created.id,
        iagruNome: created.nome,
        iagruNomeFantasia: created.nome_fantasia,
        iagruCpfCnpj: created.cpf_cnpj,
        iagruTelefone: created.telefone1,
        iagruUf: created.uf,
        iagruCidade: created.cidade,
        iagruTipos: created.tipos || [],
        status: 'linked', processing: false, done: true, matchField: 'importado',
      } : item))
      toast.success(`Importado do Aegro: ${s.aegroName}`)
    } catch (err: any) {
      setCompanySyncs(prev => prev.map((item, i) => i === idx ? { ...item, processing: false, error: err?.message || 'Erro' } : item))
      toast.error('Erro ao importar: ' + (err?.message || ''))
    }
  }

  // Filtro do modal sync cadastros
  const filteredSyncs = companySyncs.filter(s => {
    if (syncCadFilter && s.status !== syncCadFilter) return false
    if (syncCadSearch) {
      const term = syncCadSearch.toLowerCase()
      const haystack = [s.iagruNome, s.iagruNomeFantasia, s.iagruCpfCnpj, s.aegroName, s.aegroTradeName, s.aegroCpfCnpj].filter(Boolean).join(' ').toLowerCase()
      if (!haystack.includes(term)) return false
    }
    return true
  })

  const syncCadCounts = {
    linked: companySyncs.filter(s => s.status === 'linked').length,
    match: companySyncs.filter(s => s.status === 'match_suggestion').length,
    onlyIagru: companySyncs.filter(s => s.status === 'only_iagru').length,
    onlyAegro: companySyncs.filter(s => s.status === 'only_aegro').length,
  }

  const isConnected = aegro?.status === 'conectado'

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-green-600" /><span className="ml-3 text-gray-500">Carregando...</span></div>

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Link2 className="w-7 h-7 text-green-600" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Integrações</h1>
            <p className="text-sm text-gray-500">Conecte a iAgru com seu sistema de gestão para sincronizar dados automaticamente</p>
          </div>
        </div>
      </div>

      {/* Card Aegro */}
      <div className="bg-white rounded-xl shadow-sm border border-green-200 max-w-2xl">
        <div className="p-5 sm:p-6">
          {/* Header do card */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-green-700">A</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Aegro</h3>
                <p className="text-xs text-gray-500">Gestão agrícola integrada</p>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {isConnected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {isConnected ? 'Conectado' : 'Desconectado'}
            </div>
          </div>

          {/* Fazenda conectada */}
          {isConnected && farmNome && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-500">Fazenda conectada:</p>
              <p className="font-semibold text-gray-800">{farmNome}</p>
              {aegro?.ultimo_sync && (
                <p className="text-xs text-gray-400 mt-1">Último sync: {fmtData(aegro.ultimo_sync)}</p>
              )}
            </div>
          )}

          {/* Token */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Token da API Aegro</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="aegro_..."
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm font-mono"
                />
                <button onClick={() => setShowToken(!showToken)} className="absolute right-2 top-2 text-gray-400 hover:text-gray-600">
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {isConnected ? (
                <button onClick={handleReconnect} disabled={testingConnection}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 disabled:opacity-50 whitespace-nowrap">
                  {testingConnection ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Reconectar
                </button>
              ) : (
                <button onClick={handleConnect} disabled={connecting}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50 whitespace-nowrap">
                  {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  Conectar
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Solicite seu token em <a href="mailto:token@aegro.com.br" className="text-green-600 hover:underline">token@aegro.com.br</a> (apenas o proprietário da assinatura pode solicitar)
            </p>
          </div>

          {/* Farm ID */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Farm ID</label>
            <input
              type="text"
              value={farmId}
              onChange={e => setFarmId(e.target.value)}
              placeholder="ID da fazenda no Aegro"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">Identificador da fazenda no Aegro. Todas as APIs são vinculadas a este ID.</p>
          </div>

          {/* Farms disponíveis */}
          {farms.length > 1 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Fazendas disponíveis no token</label>
              <div className="space-y-1">
                {farms.map((f: any) => {
                  const fid = f._id || f.id
                  const isSelected = fid === farmId
                  return (
                    <button key={fid} onClick={() => { setFarmId(fid); setFarmNome(f.name || f.nome || '') }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                        isSelected ? 'bg-green-50 border-green-300 text-green-700 font-medium' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}>
                      {f.name || f.nome} <span className="text-xs text-gray-400 font-mono ml-2">{fid}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Sincronização */}
          {isConnected && (
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-green-600" /> Sincronização de dados
                </p>
                {syncStats && !syncStats.loading && (
                  <button onClick={() => loadSyncStats(token)} className="text-[11px] text-gray-400 hover:text-green-600 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> atualizar
                  </button>
                )}
              </div>

              {/* Dashboard de stats */}
              {syncStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-center">
                    <p className="text-lg font-bold text-blue-700">
                      {syncStats.loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : syncStats.totalAegro}
                    </p>
                    <p className="text-[10px] text-blue-600 font-medium uppercase tracking-wide">Total Aegro</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 text-center">
                    <p className="text-lg font-bold text-green-700">
                      {syncStats.loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : syncStats.imported}
                    </p>
                    <p className="text-[10px] text-green-600 font-medium uppercase tracking-wide">Importadas</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 text-center">
                    <p className="text-lg font-bold text-orange-700">
                      {syncStats.loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : syncStats.newCrops}
                    </p>
                    <p className="text-[10px] text-orange-600 font-medium uppercase tracking-wide">Novas</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 text-center">
                    <p className="text-lg font-bold text-yellow-700">
                      {syncStats.loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : syncStats.changed}
                    </p>
                    <p className="text-[10px] text-yellow-600 font-medium uppercase tracking-wide">Alteradas</p>
                  </div>
                </div>
              )}

              {/* Botões de ação */}
              <div className="flex flex-wrap gap-2">
                <button onClick={handleOpenImportCrops} disabled={loadingCrops}
                  className="px-4 py-2 border border-green-300 text-green-700 rounded-lg text-sm font-medium bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-60">
                  {loadingCrops ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</span> : 'Importar Safras (crops)'}
                </button>
                <button disabled className="px-4 py-2 border border-green-300 text-green-700 rounded-lg text-sm font-medium bg-green-50 opacity-60 cursor-not-allowed">
                  Importar Produtos (elements)
                </button>
                <button onClick={handleOpenSyncCadastros} disabled={loadingSyncCad}
                  className="px-4 py-2 border border-green-300 text-green-700 rounded-lg text-sm font-medium bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-60">
                  {loadingSyncCad ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</span> : <span className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Sync Cadastros</span>}
                </button>
              </div>
              {importResult && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-700 font-medium">Importação concluída!</p>
                  <p className="text-xs text-green-600 mt-1">{importResult.total} safras processadas. Acesse a página Safra para visualizar.</p>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">As safras importadas ficam vinculadas ao Aegro pelo crop_key. Re-importar atualiza os dados sem duplicar.</p>
            </div>
          )}

          {/* Desconectar */}
          {isConnected && (
            <div className="mt-4">
              <button onClick={handleDisconnect} className="flex items-center gap-2 text-red-500 hover:text-red-600 text-sm font-medium">
                <Trash2 className="w-4 h-4" /> Desconectar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info futuras integrações */}
      <p className="text-xs text-gray-400 mt-6 max-w-2xl">
        Mais integrações em breve. Tem sugestão? Fale conosco em <a href="mailto:contato@cotagru.com.br" className="text-green-600 hover:underline">contato@cotagru.com.br</a>
      </p>

      {/* ========== MODAL MAPEAMENTO DE/PARA ========== */}
      {/* ========== MODAL PREVIEW ANTES DE ENVIAR AO AEGRO ========== */}
      {showPreviewModal && previewData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 overflow-y-auto py-4 px-2">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-2">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-orange-50">
              <div>
                <h2 className="text-lg font-bold text-orange-800 flex items-center gap-2">
                  <Upload className="w-5 h-5" /> Confirmar Envio ao Aegro
                </h2>
                <p className="text-sm text-orange-600 mt-0.5">Revise os dados antes de enviar</p>
              </div>
              <button onClick={() => { setShowPreviewModal(false); setPreviewData(null) }} className="p-2 hover:bg-orange-100 rounded-lg">
                <X className="w-5 h-5 text-orange-700" />
              </button>
            </div>

            {/* Mapeamento De → Para */}
            <div className="p-4 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-700 uppercase mb-2">Cadastro iAgru → Empresa Aegro</p>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 text-sm">
                  <div className="text-right">
                    <p className="font-semibold text-gray-700">iAgru</p>
                  </div>
                  <div className="flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Aegro API</p>
                  </div>

                  {/* Nome */}
                  <div className="text-right text-gray-600 border-t pt-2">
                    <span className="text-xs text-gray-400">nome:</span> <span className="font-medium">{previewData.sync.iagruNome}</span>
                  </div>
                  <div className="flex items-center justify-center border-t pt-2">
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <div className="text-gray-600 border-t pt-2">
                    <span className="text-xs text-gray-400">name:</span> <span className="font-medium">{previewData.payload.name}</span>
                  </div>

                  {/* Nome Fantasia */}
                  {previewData.payload.tradeName && (
                    <>
                      <div className="text-right text-gray-600 border-t pt-2">
                        <span className="text-xs text-gray-400">nome_fantasia:</span> <span className="font-medium">{previewData.sync.iagruNomeFantasia}</span>
                      </div>
                      <div className="flex items-center justify-center border-t pt-2">
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                      <div className="text-gray-600 border-t pt-2">
                        <span className="text-xs text-gray-400">tradeName:</span> <span className="font-medium">{previewData.payload.tradeName}</span>
                      </div>
                    </>
                  )}

                  {/* CPF/CNPJ */}
                  {previewData.payload.cpfCnpj && (
                    <>
                      <div className="text-right text-gray-600 border-t pt-2 font-mono text-xs">
                        <span className="text-xs text-gray-400">cpf_cnpj:</span> <span className="font-medium">{previewData.sync.iagruCpfCnpj}</span>
                      </div>
                      <div className="flex items-center justify-center border-t pt-2">
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                      <div className="text-gray-600 border-t pt-2 font-mono text-xs">
                        <span className="text-xs text-gray-400">cpfCnpj:</span> <span className="font-medium">{previewData.payload.cpfCnpj}</span>
                      </div>
                    </>
                  )}

                  {/* Telefone */}
                  {previewData.payload.phone && (
                    <>
                      <div className="text-right text-gray-600 border-t pt-2">
                        <span className="text-xs text-gray-400">telefone1:</span> <span className="font-medium">{previewData.sync.iagruTelefone}</span>
                      </div>
                      <div className="flex items-center justify-center border-t pt-2">
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                      <div className="text-gray-600 border-t pt-2">
                        <span className="text-xs text-gray-400">phone:</span> <span className="font-medium">{previewData.payload.phone}</span>
                      </div>
                    </>
                  )}

                  {/* UF */}
                  {previewData.payload.state && (
                    <>
                      <div className="text-right text-gray-600 border-t pt-2">
                        <span className="text-xs text-gray-400">uf:</span> <span className="font-medium">{previewData.sync.iagruUf}</span>
                      </div>
                      <div className="flex items-center justify-center border-t pt-2">
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                      <div className="text-gray-600 border-t pt-2">
                        <span className="text-xs text-gray-400">state:</span> <span className="font-medium">{previewData.payload.state}</span>
                      </div>
                    </>
                  )}

                  {/* Cidade */}
                  {previewData.payload.city && (
                    <>
                      <div className="text-right text-gray-600 border-t pt-2">
                        <span className="text-xs text-gray-400">cidade:</span> <span className="font-medium">{previewData.sync.iagruCidade}</span>
                      </div>
                      <div className="flex items-center justify-center border-t pt-2">
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                      <div className="text-gray-600 border-t pt-2">
                        <span className="text-xs text-gray-400">city:</span> <span className="font-medium">{previewData.payload.city}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* JSON Preview */}
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Payload JSON (será enviado para POST /pub/v1/companies)</p>
                <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs overflow-x-auto font-mono">
{JSON.stringify(previewData.payload, null, 2)}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
              <button onClick={() => { setShowPreviewModal(false); setPreviewData(null) }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100">
                Cancelar
              </button>
              <button onClick={handleConfirmSendToAegro}
                className="px-5 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 flex items-center gap-2">
                <Upload className="w-4 h-4" /> Confirmar e Enviar ao Aegro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL SYNC CADASTROS ========== */}
      {showSyncCadModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-2 px-2">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] xl:max-w-6xl my-2 flex flex-col max-h-[96vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Building2 className="w-5 h-5 text-green-600" /> Sync Cadastros — iAgru ↔ Aegro</h2>
                <p className="text-sm text-gray-500 mt-0.5">Vincule, envie ou importe cadastros entre os dois sistemas</p>
              </div>
              <button onClick={() => setShowSyncCadModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            {loadingSyncCad ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                <span className="ml-3 text-gray-500">Buscando cadastros do iAgru e Aegro...</span>
              </div>
            ) : (
              <>
                {/* Stats mini-cards + filtros */}
                <div className="p-3 bg-gray-50 border-b shrink-0 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button onClick={() => setSyncCadFilter(syncCadFilter === 'match_suggestion' ? '' : 'match_suggestion')}
                      className={`rounded-lg p-2 text-center border transition-colors ${syncCadFilter === 'match_suggestion' ? 'bg-purple-100 border-purple-400 ring-2 ring-purple-300' : 'bg-purple-50 border-purple-200 hover:bg-purple-100'}`}>
                      <p className="text-lg font-bold text-purple-700">{syncCadCounts.match}</p>
                      <p className="text-[10px] text-purple-600 font-medium uppercase">Sugestões</p>
                    </button>
                    <button onClick={() => setSyncCadFilter(syncCadFilter === 'only_iagru' ? '' : 'only_iagru')}
                      className={`rounded-lg p-2 text-center border transition-colors ${syncCadFilter === 'only_iagru' ? 'bg-orange-100 border-orange-400 ring-2 ring-orange-300' : 'bg-orange-50 border-orange-200 hover:bg-orange-100'}`}>
                      <p className="text-lg font-bold text-orange-700">{syncCadCounts.onlyIagru}</p>
                      <p className="text-[10px] text-orange-600 font-medium uppercase">Apenas iAgru</p>
                    </button>
                    <button onClick={() => setSyncCadFilter(syncCadFilter === 'only_aegro' ? '' : 'only_aegro')}
                      className={`rounded-lg p-2 text-center border transition-colors ${syncCadFilter === 'only_aegro' ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-300' : 'bg-blue-50 border-blue-200 hover:bg-blue-100'}`}>
                      <p className="text-lg font-bold text-blue-700">{syncCadCounts.onlyAegro}</p>
                      <p className="text-[10px] text-blue-600 font-medium uppercase">Apenas Aegro</p>
                    </button>
                    <button onClick={() => setSyncCadFilter(syncCadFilter === 'linked' ? '' : 'linked')}
                      className={`rounded-lg p-2 text-center border transition-colors ${syncCadFilter === 'linked' ? 'bg-green-100 border-green-400 ring-2 ring-green-300' : 'bg-green-50 border-green-200 hover:bg-green-100'}`}>
                      <p className="text-lg font-bold text-green-700">{syncCadCounts.linked}</p>
                      <p className="text-[10px] text-green-600 font-medium uppercase">Vinculados</p>
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                    <input value={syncCadSearch} onChange={e => setSyncCadSearch(e.target.value)}
                      placeholder="Buscar por nome, CNPJ..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                  </div>
                </div>

                {/* Tabela */}
                <div className="overflow-auto flex-1">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                      <tr className="text-left text-xs text-gray-500 uppercase">
                        <th className="px-3 py-2 w-24">Status</th>
                        <th className="px-3 py-2">Cadastro iAgru</th>
                        <th className="px-3 py-2 w-10 text-center"><ArrowUpDown className="w-3.5 h-3.5 mx-auto" /></th>
                        <th className="px-3 py-2">Empresa Aegro</th>
                        <th className="px-3 py-2">CPF/CNPJ</th>
                        <th className="px-3 py-2">UF/Cidade</th>
                        <th className="px-3 py-2 w-32 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSyncs.length === 0 && (
                        <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhum cadastro encontrado com este filtro</td></tr>
                      )}
                      {filteredSyncs.map((s, idx) => {
                        // Achar o index real no array original para ações
                        const realIdx = companySyncs.indexOf(s)
                        const statusBadge = {
                          linked: <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold"><CheckCircle2 className="w-3 h-3" /> Vinculado</span>,
                          match_suggestion: <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-semibold"><LinkIcon className="w-3 h-3" /> Match{s.matchField === 'cpf_cnpj' ? ' (CNPJ)' : ' (Nome)'}</span>,
                          only_iagru: <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-semibold">Apenas iAgru</span>,
                          only_aegro: <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold">Apenas Aegro</span>,
                        }[s.status]

                        return (
                          <tr key={realIdx} className={`border-b hover:bg-gray-50 ${s.done ? 'bg-green-50/50' : ''} ${s.error ? 'bg-red-50/50' : ''}`}>
                            <td className="px-3 py-2">{statusBadge}</td>
                            <td className="px-3 py-2">
                              {s.iagruNome ? (
                                <div>
                                  <p className="font-medium text-gray-800 text-xs">{s.iagruNome}</p>
                                  {s.iagruNomeFantasia && <p className="text-[10px] text-gray-400">{s.iagruNomeFantasia}</p>}
                                  {s.iagruTipos.length > 0 && (
                                    <div className="flex gap-1 mt-0.5 flex-wrap">{s.iagruTipos.map(t => <span key={t} className="text-[9px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">{t}</span>)}</div>
                                  )}
                                </div>
                              ) : <span className="text-gray-300 text-xs">—</span>}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {s.status === 'match_suggestion' && <ArrowRight className="w-4 h-4 text-purple-400 mx-auto" />}
                              {s.status === 'linked' && <LinkIcon className="w-4 h-4 text-green-400 mx-auto" />}
                            </td>
                            <td className="px-3 py-2">
                              {s.aegroName ? (
                                <div>
                                  <p className="font-medium text-gray-800 text-xs">{s.aegroName}</p>
                                  {s.aegroTradeName && <p className="text-[10px] text-gray-400">{s.aegroTradeName}</p>}
                                </div>
                              ) : <span className="text-gray-300 text-xs">—</span>}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-600 font-mono">
                              {s.iagruCpfCnpj || s.aegroCpfCnpj || <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-600">
                              {s.iagruUf || s.aegroState ? `${s.iagruUf || s.aegroState || ''}${s.iagruCidade || s.aegroCity ? ` / ${s.iagruCidade || s.aegroCity}` : ''}` : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {s.processing && <Loader2 className="w-4 h-4 animate-spin text-green-600 mx-auto" />}
                              {s.done && <span className="text-green-600 text-xs font-medium flex items-center justify-center gap-1"><Check className="w-3.5 h-3.5" /> OK</span>}
                              {s.error && <span className="text-red-500 text-[10px]" title={s.error}>Erro</span>}
                              {!s.processing && !s.done && !s.error && s.status === 'match_suggestion' && (
                                <button onClick={() => handleLinkCadastro(realIdx)}
                                  className="px-2.5 py-1 bg-purple-600 text-white rounded text-[11px] font-medium hover:bg-purple-700 flex items-center gap-1 mx-auto">
                                  <LinkIcon className="w-3 h-3" /> Vincular
                                </button>
                              )}
                              {!s.processing && !s.done && !s.error && s.status === 'only_iagru' && (
                                <button onClick={() => handleSendToAegro(realIdx)}
                                  className="px-2.5 py-1 bg-orange-600 text-white rounded text-[11px] font-medium hover:bg-orange-700 flex items-center gap-1 mx-auto">
                                  <Upload className="w-3 h-3" /> Enviar
                                </button>
                              )}
                              {!s.processing && !s.done && !s.error && s.status === 'only_aegro' && (
                                <button onClick={() => handleImportFromAegro(realIdx)}
                                  className="px-2.5 py-1 bg-blue-600 text-white rounded text-[11px] font-medium hover:bg-blue-700 flex items-center gap-1 mx-auto">
                                  <Download className="w-3 h-3" /> Importar
                                </button>
                              )}
                              {!s.processing && !s.done && !s.error && s.status === 'linked' && (
                                <span className="text-green-500 text-[10px]">Sincronizado</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-3 border-t bg-gray-50 rounded-b-xl shrink-0">
                  <div className="text-xs text-gray-500">
                    {filteredSyncs.length} de {companySyncs.length} cadastros
                    {syncCadFilter && <span className="text-blue-500 ml-1">(filtrado: {syncCadFilter === 'match_suggestion' ? 'sugestões' : syncCadFilter === 'only_iagru' ? 'apenas iAgru' : syncCadFilter === 'only_aegro' ? 'apenas Aegro' : 'vinculados'})</span>}
                  </div>
                  <button onClick={() => setShowSyncCadModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100">
                    Fechar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========== MODAL MAPEAMENTO DE/PARA ========== */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-2 px-2">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] xl:max-w-6xl my-2 flex flex-col max-h-[96vh]">
            {/* Header do modal */}
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Importar Safras — Mapeamento De/Para</h2>
                <p className="text-sm text-gray-500 mt-0.5">Vincule os dados do Aegro aos campos da iAgru antes de importar</p>
              </div>
              <button onClick={() => setShowMapModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {loadingCrops ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                <span className="ml-3 text-gray-500">Buscando safras do Aegro...</span>
              </div>
            ) : (
              <>
                {/* Barra superior: Criar itens + Filtros */}
                <div className="p-3 bg-gray-50 border-b shrink-0 space-y-3">
                  {/* Criar novos itens auxiliares */}
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Criar novos itens auxiliares</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="flex gap-1">
                        <input value={newCultura} onChange={e => setNewCultura(e.target.value)} placeholder="Nova cultura..."
                          className="flex-1 px-2 py-1.5 border rounded-lg text-sm" onKeyDown={e => e.key === 'Enter' && handleCreateCultura()} />
                        <button onClick={handleCreateCultura} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">+</button>
                      </div>
                      <div className="flex gap-1">
                        <input value={newTipoSafra} onChange={e => setNewTipoSafra(e.target.value)} placeholder="Novo tipo safra..."
                          className="flex-1 px-2 py-1.5 border rounded-lg text-sm" onKeyDown={e => e.key === 'Enter' && handleCreateTipoSafra()} />
                        <button onClick={handleCreateTipoSafra} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">+</button>
                      </div>
                      <div className="flex gap-1">
                        <input value={newAnoSafra} onChange={e => setNewAnoSafra(e.target.value)} placeholder="Novo ano safra (ex: 25/26)..."
                          className="flex-1 px-2 py-1.5 border rounded-lg text-sm" onKeyDown={e => e.key === 'Enter' && handleCreateAnoSafra()} />
                        <button onClick={handleCreateAnoSafra} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">+</button>
                      </div>
                    </div>
                  </div>
                  {/* Filtros Aegro */}
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Filter className="w-3 h-3" /> Filtrar dados do Aegro
                      {(filterNome || filterType || filterAnoSafra) && (
                        <button onClick={() => { setFilterNome(''); setFilterType(''); setFilterAnoSafra('') }}
                          className="ml-2 text-[10px] text-red-500 hover:text-red-700 font-normal underline">limpar filtros</button>
                      )}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input value={filterNome} onChange={e => setFilterNome(e.target.value)} placeholder="Filtrar por nome..."
                        className="px-2 py-1.5 border rounded-lg text-sm" />
                      <select value={filterType} onChange={e => setFilterType(e.target.value)}
                        className="px-2 py-1.5 border rounded-lg text-sm">
                        <option value="">Todos os types</option>
                        {uniqueTypes.map(t => <option key={t} value={t}>{t.toUpperCase()} {AEGRO_TYPE_MAP[t.toLowerCase()] ? `(${AEGRO_TYPE_MAP[t.toLowerCase()]})` : ''}</option>)}
                      </select>
                      <select value={filterAnoSafra} onChange={e => setFilterAnoSafra(e.target.value)}
                        className="px-2 py-1.5 border rounded-lg text-sm">
                        <option value="">Todos os períodos</option>
                        {uniqueAnos.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    {(filterNome || filterType || filterAnoSafra) && (
                      <p className="text-[11px] text-blue-600 mt-1">
                        Mostrando {filteredMappings.length} de {cropMappings.length} safras — "Aplicar a todos" afeta apenas as filtradas
                      </p>
                    )}
                  </div>
                </div>

                {/* Tabela de mapeamento */}
                <div className="overflow-auto flex-1 min-h-0">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                      <tr>
                        <th className="px-2 py-2 text-left w-8">
                          <input type="checkbox"
                            checked={filteredMappings.length > 0 && filteredMappings.every(m => m.selected)}
                            onChange={e => {
                              const visibleSet = new Set(filteredIndices)
                              setCropMappings(prev => prev.map((m, i) => visibleSet.has(i) ? { ...m, selected: e.target.checked } : m))
                            }}
                            className="rounded border-gray-300" />
                        </th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">Nome da Safra</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">Type</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">Período</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">Área</th>
                        <th className="px-1 py-2 text-center text-xs text-gray-400 w-6"><ArrowRight className="w-3 h-3 mx-auto" /></th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-green-700 min-w-[130px]">
                          <div>Cultura *</div>
                          {culturas.length > 0 && (
                            <select className="mt-0.5 text-[11px] border rounded px-1 py-0.5 font-normal text-gray-500 w-full"
                              onChange={e => { if (e.target.value) applyToAll('culturaId', e.target.value); e.target.value = '' }}>
                              <option value="">{filterNome || filterType || filterAnoSafra ? 'aplicar filtradas' : 'aplicar a todos'}</option>
                              {culturas.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                            </select>
                          )}
                        </th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-green-700 min-w-[130px]">
                          <div>Tipo Safra</div>
                          {tiposSafra.length > 0 && (
                            <select className="mt-0.5 text-[11px] border rounded px-1 py-0.5 font-normal text-gray-500 w-full"
                              onChange={e => { if (e.target.value) applyToAll('tipoSafraId', e.target.value); e.target.value = '' }}>
                              <option value="">{filterNome || filterType || filterAnoSafra ? 'aplicar filtradas' : 'aplicar a todos'}</option>
                              {tiposSafra.map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                            </select>
                          )}
                        </th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-green-700 min-w-[110px]">
                          <div>Ano Safra *</div>
                          {anosSafra.length > 0 && (
                            <select className="mt-0.5 text-[11px] border rounded px-1 py-0.5 font-normal text-gray-500 w-full"
                              onChange={e => { if (e.target.value) applyToAll('anoSafraId', e.target.value); e.target.value = '' }}>
                              <option value="">{filterNome || filterType || filterAnoSafra ? 'aplicar filtradas' : 'aplicar a todos'}</option>
                              {anosSafra.map((a: any) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                            </select>
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredMappings.map((m) => {
                        const idx = m._idx
                        const hasError = m.selected && (!m.culturaId || !m.anoSafraId)
                        return (
                          <tr key={m.cropKey} className={`
                            ${m.alreadyImported && !m.hasChanges ? 'bg-green-50/50 opacity-70' : ''}
                            ${m.alreadyImported && m.hasChanges ? 'bg-yellow-50' : ''}
                            ${!m.alreadyImported && hasError ? 'bg-red-50' : ''}
                            ${!m.alreadyImported && !hasError && m.selected ? 'bg-white' : ''}
                            ${!m.selected && !m.alreadyImported ? 'bg-gray-50 opacity-60' : ''}
                            hover:bg-green-50/30
                          `}>
                            <td className="px-2 py-1.5">
                              <input type="checkbox" checked={m.selected} onChange={e => updateMapping(idx, 'selected', e.target.checked)}
                                className="rounded border-gray-300" />
                            </td>
                            <td className="px-2 py-1.5 text-xs whitespace-nowrap">
                              <span className="font-medium text-gray-800">{m.cropName}</span>
                              {m.alreadyImported && !m.hasChanges && (
                                <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> importada
                                </span>
                              )}
                              {m.alreadyImported && m.hasChanges && (
                                <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-700">
                                  ↻ dados alterados
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                {m.aegroType || '—'}
                              </span>
                              {AEGRO_TYPE_MAP[m.aegroType?.toLowerCase()] && (
                                <span className="text-[10px] text-gray-400 ml-1">({AEGRO_TYPE_MAP[m.aegroType.toLowerCase()]})</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5 text-[11px] text-gray-500 whitespace-nowrap">
                              {m.startDate ? fmtData(m.startDate) : '—'} {m.endDate ? `→ ${fmtData(m.endDate)}` : ''}
                            </td>
                            <td className="px-2 py-1.5 text-xs text-gray-600 whitespace-nowrap">{m.areaHa != null ? `${m.areaHa.toLocaleString('pt-BR')} ha` : '—'}</td>
                            <td className="px-1 py-1.5 text-center"><ArrowRight className="w-3 h-3 text-green-500 mx-auto" /></td>
                            <td className="px-2 py-1.5">
                              <select value={m.culturaId} onChange={e => updateMapping(idx, 'culturaId', e.target.value)}
                                className={`w-full px-1.5 py-1 border rounded text-xs ${!m.culturaId && m.selected ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}>
                                <option value="">Selecione</option>
                                {culturas.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                              </select>
                            </td>
                            <td className="px-2 py-1.5">
                              <select value={m.tipoSafraId} onChange={e => updateMapping(idx, 'tipoSafraId', e.target.value)}
                                className="w-full px-1.5 py-1 border border-gray-300 rounded text-xs">
                                <option value="">Opcional</option>
                                {tiposSafra.map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                              </select>
                            </td>
                            <td className="px-2 py-1.5">
                              <select value={m.anoSafraId} onChange={e => updateMapping(idx, 'anoSafraId', e.target.value)}
                                className={`w-full px-1.5 py-1 border rounded text-xs ${!m.anoSafraId && m.selected ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}>
                                <option value="">Selecione</option>
                                {anosSafra.map((a: any) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                              </select>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer do modal */}
                {(() => {
                  const importCandidates = hasActiveFilter
                    ? filteredMappings.filter(m => m.selected)
                    : cropMappings.filter(m => m.selected)
                  const invalidCount = importCandidates.filter(m => !m.culturaId || !m.anoSafraId).length
                  const importedCount = cropMappings.filter(m => m.alreadyImported).length
                  return (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-t bg-gray-50 rounded-b-xl shrink-0">
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <p>
                          {hasActiveFilter ? (
                            <><b>{importCandidates.length}</b> de {filteredMappings.length} filtradas selecionadas <span className="text-gray-400">(total: {cropMappings.length})</span></>
                          ) : (
                            <>{importCandidates.length} de {cropMappings.length} selecionadas</>
                          )}
                          {importedCount > 0 && (
                            <span className="text-green-600 ml-1">({importedCount} já importadas)</span>
                          )}
                        </p>
                        {invalidCount > 0 && (
                          <p className="text-red-500">{invalidCount} com campos obrigatórios vazios</p>
                        )}
                        {hasActiveFilter && (
                          <p className="text-blue-500">Importação aplicará apenas às safras filtradas e selecionadas</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowMapModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100">
                          Cancelar
                        </button>
                        <button onClick={handleConfirmImport} disabled={savingImport || importCandidates.length === 0}
                          className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                          {savingImport ? <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</> : <><Check className="w-4 h-4" /> Confirmar ({importCandidates.length})</>}
                        </button>
                      </div>
                    </div>
                  )
                })()}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

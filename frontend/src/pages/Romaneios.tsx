import { useEffect, useState, useRef, useMemo } from 'react'
import { Plus, Pencil, Trash2, X, Camera, Upload, Loader2, FileText, Sparkles, Settings, ZoomIn, Filter, ChevronDown, ExternalLink, Package, Truck, Scale, Target, ArrowUp, ArrowDown, ArrowUpDown, GripVertical } from 'lucide-react'
import toast from 'react-hot-toast'
import { getRomaneios, createRomaneio, updateRomaneio, deleteRomaneio, getOrdens, getOperacoes, getCadastros, getVeiculos, getProdutos, getTiposNf, getTiposTicket, getAnosSafra, getSafras, uploadRomaneioImage, getPrecos, syncRomaneioSafras, getContratosVenda, getUnidadesMedida } from '../services/api'
import ViewModal, { Field, Section } from '../components/ViewModal'
import SearchableSelect from '../components/SearchableSelect'
import MultiSearchableSelect from '../components/MultiSearchableSelect'
import { fmtData, fmtInt, fmtBRL } from '../utils/format'
import Pagination, { usePagination } from '../components/Pagination'
import ExportButtons from '../components/ExportButtons'
import { exportToPDF, exportToExcel } from '../utils/export'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''

// Formatação kg: 45000 → "45.000" (separador milhar com ponto)
const fmtKg = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined || v === '') return ''
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\./g, '').replace(',', '.'))
  if (isNaN(n)) return ''
  return Math.round(n).toLocaleString('pt-BR')
}
// Parse kg formatado → number: "45.000" → 45000
const parseKg = (v: string): number | null => {
  if (!v) return null
  const n = parseInt(v.replace(/\./g, ''), 10)
  return isNaN(n) ? null : n
}
// Formatação percentual: 12.5 → "12,50" (decimal com vírgula)
const fmtPerc = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined || v === '') return ''
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'))
  if (isNaN(n)) return ''
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
// Parse percentual → number: "12,50" → 12.5
const parsePerc = (v: string): number | null => {
  if (!v) return null
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}
// Formatação kg com decimais: 537.93 → "537,93" | 1200.5 → "1.200,50"
const fmtKgDec = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined || v === '') return ''
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\./g, '').replace(',', '.'))
  if (isNaN(n)) return ''
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
// Parse kg decimal formatado → number: "537,93" → 537.93
const parseKgDec = (v: string): number | null => {
  if (!v) return null
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}
// Normalizar símbolo de unidade: 'sc/60kg' → 'sc', 'tn' → 'tn', 'kg' → 'kg'
const normalizeUnit = (u: string): string => {
  const lower = u.toLowerCase()
  if (lower.startsWith('sc')) return 'sc'
  if (lower === 'tn' || lower === 'ton') return 'tn'
  if (lower === 'g') return 'g'
  return lower
}
// Converter valor de KG para unidade selecionada
const convertFromKg = (valorKg: number, unidade: string): number => {
  switch (normalizeUnit(unidade)) {
    case 'tn': return valorKg / 1000
    case 'sc': return valorKg / 60
    case 'g': return valorKg * 1000
    default: return valorKg // kg
  }
}
// Formatar volume convertido
const fmtVolume = (valorKg: number | string | null | undefined, unidade: string): string => {
  if (valorKg === null || valorKg === undefined || valorKg === '' || valorKg === 0) return '-'
  const n = typeof valorKg === 'number' ? valorKg : parseFloat(String(valorKg).replace(/\./g, '').replace(',', '.'))
  if (isNaN(n) || n === 0) return '-'
  const convertido = convertFromKg(n, unidade)
  const isKg = normalizeUnit(unidade) === 'kg'
  if (isKg) return Math.round(convertido).toLocaleString('pt-BR')
  return convertido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
// Para exibição na tabela (genérico)
const fmtNum = fmtKg

const KG_FIELDS = ['peso_bruto','tara','peso_liquido','desconto_kg','peso_corrigido','umidade_desc','impureza_desc','avariados_desc','ardidos_desc','esverdeados_desc','partidos_desc','quebrados_desc']
const PERC_FIELDS = ['umidade_perc','impureza_perc','avariados_perc','ardidos_perc','esverdeados_perc','partidos_perc','quebrados_perc']

const emptyForm = {
  operacao_id: '', ordem_id: '',
  numero_ticket: '', tipo_ticket_id: '', nfe_numero: '', tipo_nf_id: '',
  data_saida_origem: '', data_entrada_destino: '', data_saida_destino: '',
  origem_id: '', destinatario_id: '', produtor_id: '', cnpj_cpf: '',
  produto_id: '', veiculo_id: '', placa: '', motorista_id: '', transportadora_id: '', ano_safra_id: '', contrato_venda_id: '',
  safra_ids: [] as string[],
  peso_bruto: '', tara: '', peso_liquido: '',
  umidade_perc: '', impureza_perc: '', avariados_perc: '',
  ardidos_perc: '', esverdeados_perc: '', partidos_perc: '',
  quebrados_perc: '',
  umidade_desc: '', impureza_desc: '', avariados_desc: '',
  ardidos_desc: '', esverdeados_desc: '', partidos_desc: '',
  quebrados_desc: '',
  desconto_kg: '', peso_corrigido: '',
  transgenia: '', observacoes: '', ativo: true,
}

export default function Romaneios() {
  const [items, setItems] = useState<any[]>([])
  const [ordens, setOrdens] = useState<any[]>([])
  const [operacoes, setOperacoes] = useState<any[]>([])
  const [cadastros, setCadastros] = useState<any[]>([])
  const [veiculos, setVeiculos] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [tiposNf, setTiposNf] = useState<any[]>([])
  const [tiposTicket, setTiposTicket] = useState<any[]>([])
  const [anosSafra, setAnosSafra] = useState<any[]>([])
  const [safras, setSafras] = useState<any[]>([])
  const [precos, setPrecos] = useState<any[]>([])
  const [contratosVenda, setContratosVenda] = useState<any[]>([])
  const [unidadesMedida, setUnidadesMedida] = useState<any[]>([])
  const [unidadeExibicao, setUnidadeExibicao] = useState('kg')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [showColumnConfig, setShowColumnConfig] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const pagination = usePagination(25)
  const [activeFilters, setActiveFilters] = useState<{id: string, field: string, value: string}[]>([])
  const [showFilterOptions, setShowFilterOptions] = useState(false)
  const [viewingItem, setViewingItem] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Configuração de colunas (localStorage) - TODOS os campos do romaneio
  const DEFAULT_COLUMNS = [
    { key: 'operacao', label: 'Operação', visible: true, order: 1 },
    { key: 'ordem', label: 'Ordem Carreg.', visible: true, order: 2 },
    { key: 'data_saida', label: 'Data Saída Origem', visible: true, order: 3 },
    { key: 'produtor', label: 'Produtor', visible: true, order: 4 },
    { key: 'produto', label: 'Produto', visible: true, order: 5 },
    { key: 'origem', label: 'Origem', visible: true, order: 6 },
    { key: 'destino', label: 'Destino', visible: true, order: 7 },
    { key: 'placa', label: 'Placa', visible: true, order: 8 },
    { key: 'ticket', label: 'Ticket', visible: true, order: 9 },
    { key: 'peso_liq_sdesc', label: 'P.Líq s/desc', visible: true, order: 10 },
    { key: 'peso_liq_cdesc', label: 'P.Líq c/desc', visible: true, order: 11 },
    { key: 'motorista', label: 'Motorista', visible: false, order: 12 },
    { key: 'transportadora', label: 'Transportadora', visible: false, order: 13 },
    { key: 'contrato_venda', label: 'Contrato Venda', visible: false, order: 14 },
    { key: 'ano_safra', label: 'Ano Safra', visible: false, order: 15 },
    { key: 'tipo_ticket', label: 'Tipo Ticket', visible: false, order: 16 },
    { key: 'tipo_nf', label: 'Tipo NF', visible: false, order: 17 },
    { key: 'nfe', label: 'NF-e', visible: false, order: 18 },
    { key: 'data_entrada_destino', label: 'Data Entrada Destino', visible: false, order: 19 },
    { key: 'data_saida_destino', label: 'Data Saída Destino', visible: false, order: 20 },
    { key: 'tempo_permanencia', label: 'Tempo Permanência', visible: false, order: 21 },
    { key: 'cnpj_cpf', label: 'CNPJ/CPF', visible: false, order: 22 },
    { key: 'peso_bruto', label: 'Peso Bruto', visible: false, order: 23 },
    { key: 'tara', label: 'Tara', visible: false, order: 24 },
    { key: 'peso_liquido', label: 'Peso Líquido', visible: false, order: 25 },
    { key: 'umidade_perc', label: 'Umidade %', visible: false, order: 26 },
    { key: 'impureza_perc', label: 'Impureza %', visible: false, order: 27 },
    { key: 'avariados_perc', label: 'Avariados %', visible: false, order: 28 },
    { key: 'ardidos_perc', label: 'Ardidos %', visible: false, order: 29 },
    { key: 'esverdeados_perc', label: 'Esverdeados %', visible: false, order: 30 },
    { key: 'partidos_perc', label: 'Partidos %', visible: false, order: 31 },
    { key: 'quebrados_perc', label: 'Quebrados %', visible: false, order: 32 },
    { key: 'umidade_desc', label: 'Desc. Umidade (kg)', visible: false, order: 33 },
    { key: 'impureza_desc', label: 'Desc. Impureza (kg)', visible: false, order: 34 },
    { key: 'avariados_desc', label: 'Desc. Avariados (kg)', visible: false, order: 35 },
    { key: 'ardidos_desc', label: 'Desc. Ardidos (kg)', visible: false, order: 36 },
    { key: 'esverdeados_desc', label: 'Desc. Esverdeados (kg)', visible: false, order: 37 },
    { key: 'partidos_desc', label: 'Desc. Partidos (kg)', visible: false, order: 38 },
    { key: 'quebrados_desc', label: 'Desc. Quebrados (kg)', visible: false, order: 39 },
    { key: 'desconto_total', label: 'Desconto Total (kg)', visible: false, order: 40 },
    { key: 'peso_corrigido', label: 'Peso Corrigido', visible: false, order: 41 },
    { key: 'transgenia', label: 'Transgenia', visible: false, order: 42 },
    { key: 'observacoes', label: 'Observações', visible: false, order: 43 },
    { key: 'valor_unitario_frete', label: 'Valor Unitário Frete', visible: false, order: 44 },
    { key: 'valor_frete', label: 'Valor Frete', visible: false, order: 45 },
  ]
  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem('romaneios_columns')
    if (!saved) return DEFAULT_COLUMNS
    
    const savedCols = JSON.parse(saved)
    // Merge: adicionar novas colunas que não existem no localStorage
    const savedKeys = new Set(savedCols.map((c: any) => c.key))
    const newCols = DEFAULT_COLUMNS.filter(c => !savedKeys.has(c.key))
    const merged = [...savedCols, ...newCols]
    
    // Se houve merge, salvar de volta
    if (newCols.length > 0) {
      localStorage.setItem('romaneios_columns', JSON.stringify(merged))
    }
    
    return merged
  })

  const load = () => {
    setLoading(true)
    Promise.all([getRomaneios(), getOrdens(), getOperacoes(), getCadastros(), getVeiculos(), getProdutos(), getTiposNf(), getTiposTicket(), getAnosSafra(), getSafras().catch(() => []), getPrecos(), getContratosVenda().catch(() => []), getUnidadesMedida().catch(() => [])])
      .then(([r, o, ops, cad, veic, prod, tnf, tt, as_, sf, pr, cv, um]) => {
        setItems(r); setOrdens(o); setOperacoes(ops); setCadastros(cad)
        setVeiculos(veic); setProdutos(prod); setTiposNf(tnf); setTiposTicket(tt); setAnosSafra(as_); setSafras(sf); setPrecos(pr); setContratosVenda(cv); setUnidadesMedida(um)
      })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }

  // Calcular valor unitário do frete com conversão de unidade
  const calcularValorUnitarioFrete = (item: any, unidade: string): string => {
    if (!item.ordem_id) return '-'
    const ordem = ordens.find((o: any) => o.id === item.ordem_id)
    if (!ordem?.preco_id) return '-'
    const preco = precos.find((p: any) => p.id === ordem.preco_id)
    if (!preco?.valor) return '-'
    
    let valorPorTn = 0
    switch (preco.unidade_preco) {
      case 'R$/ton':
        valorPorTn = preco.valor
        break
      case 'R$/sc':
        valorPorTn = preco.valor * (1000 / 60) // 1 ton = 16.67 sacas
        break
      case 'R$/viagem':
      case 'R$/km':
        return '-' // N/A para estas unidades
      default:
        return '-'
    }
    
    // Converter para unidade solicitada
    let valorConvertido = 0
    switch (normalizeUnit(unidade)) {
      case 'tn':
        valorConvertido = valorPorTn
        break
      case 'kg':
        valorConvertido = valorPorTn / 1000
        break
      case 'sc':
        valorConvertido = valorPorTn * (60 / 1000)
        break
      default:
        return '-'
    }
    
    return fmtBRL(valorConvertido)
  }

  // Cálculo automático de frete: peso × preço
  const calcularFrete = (item: any): { valor: number | null; label: string } => {
    if (!item.ordem_id) return { valor: null, label: '-' }
    const ordem = ordens.find((o: any) => o.id === item.ordem_id)
    if (!ordem?.preco_id) return { valor: null, label: '-' }
    const preco = precos.find((p: any) => p.id === ordem.preco_id)
    if (!preco?.valor) return { valor: null, label: '-' }
    const pesoKg = item.peso_corrigido || item.peso_liquido || 0
    if (!pesoKg) return { valor: null, label: '-' }
    let valorFrete = 0
    switch (preco.unidade_preco) {
      case 'R$/ton':
        valorFrete = (pesoKg / 1000) * preco.valor
        break
      case 'R$/sc':
        valorFrete = (pesoKg / 60) * preco.valor
        break
      case 'R$/viagem':
        valorFrete = preco.valor
        break
      case 'R$/km':
        valorFrete = (preco.distancia_km || 0) * preco.valor
        break
      default:
        return { valor: null, label: '-' }
    }
    return { valor: valorFrete, label: fmtBRL(valorFrete) }
  }
  useEffect(() => { load() }, [])

  // Listas filtradas
  const produtoresList = cadastros.filter((c: any) => (c.tipos || []).includes('Produtor'))
  const motoristasList = cadastros.filter((c: any) => (c.tipos || []).includes('Motorista'))
  const transportadorasList = cadastros.filter((c: any) => (c.tipos || []).includes('Transportadora'))
  const origensList = cadastros.filter((c: any) => (c.tipos || []).some((t: string) => ['Fazenda','Armazem','Industria','Porto','Fornecedor'].includes(t)))

  // Definição de campos filtráveis (sistema de filtros avançados)
  const FILTER_FIELDS = [
    { key: 'operacao', label: 'Operação', type: 'select', options: () => operacoes.map(o => ({ value: o.id, label: o.nome })) },
    { key: 'ordem', label: 'Ordem de Carregamento', type: 'select', options: () => ordens.map(o => ({ value: o.id, label: `#${o.numero_ordem_fmt || o.numero_ordem} - ${o.nome_ordem || ''} (${o.origem_nome} → ${o.destino_nome})` })) },
    { key: 'produtor', label: 'Produtor', type: 'select', options: () => produtoresList.map(p => ({ value: p.id, label: p.nome_fantasia || p.nome })) },
    { key: 'produto', label: 'Produto', type: 'select', options: () => produtos.map(p => ({ value: p.id, label: p.nome })) },
    { key: 'origem', label: 'Origem', type: 'select', options: () => origensList.map(o => ({ value: o.id, label: o.nome_fantasia || o.nome })) },
    { key: 'destino', label: 'Destino', type: 'select', options: () => origensList.map(o => ({ value: o.id, label: o.nome_fantasia || o.nome })) },
    { key: 'veiculo', label: 'Veículo/Placa', type: 'select', options: () => veiculos.map(v => ({ value: v.id, label: v.placa })) },
    { key: 'motorista', label: 'Motorista', type: 'select', options: () => motoristasList.map(m => ({ value: m.id, label: m.nome })) },
    { key: 'transportadora', label: 'Transportadora', type: 'select', options: () => transportadorasList.map(t => ({ value: t.id, label: t.nome_fantasia || t.nome })) },
    { key: 'ticket', label: 'Nº Ticket', type: 'text' },
    { key: 'nfe', label: 'NF-e', type: 'text' },
    { key: 'ano_safra', label: 'Ano Safra', type: 'select', options: () => anosSafra.map(a => ({ value: a.id, label: a.descricao })) },
    { key: 'tipo_ticket', label: 'Tipo Ticket', type: 'select', options: () => tiposTicket.map(t => ({ value: t.id, label: t.nome })) },
    { key: 'tipo_nf', label: 'Tipo NF', type: 'select', options: () => tiposNf.map(t => ({ value: t.id, label: t.nome })) },
    { key: 'data_saida', label: 'Data Saída Origem', type: 'date' },
    { key: 'transgenia', label: 'Transgenia', type: 'select', options: () => [{ value: 'Sim', label: 'Sim' }, { value: 'Não', label: 'Não' }] },
  ]

  const addFilter = (field: string) => {
    const id = Date.now().toString()
    setActiveFilters([...activeFilters, { id, field, value: '' }])
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

  const openNew = () => { setEditing(null); setForm(emptyForm); setImagePreview(null); setImageError(false); setShowForm(true) }
  const openEdit = (item: any) => {
    setEditing(item)
    setForm({
      operacao_id: item.operacao_id || '', ordem_id: item.ordem_id || '',
      numero_ticket: item.numero_ticket || '', tipo_ticket_id: item.tipo_ticket_id || '',
      nfe_numero: item.nfe_numero || '', tipo_nf_id: item.tipo_nf_id || '',
      data_saida_origem: item.data_saida_origem || item.data_emissao || '',
      data_entrada_destino: item.data_entrada_destino || '',
      data_saida_destino: item.data_saida_destino || '',
      origem_id: item.origem_id || '', destinatario_id: item.destinatario_id || '',
      produtor_id: item.produtor_id || '', cnpj_cpf: item.cnpj_cpf || '',
      produto_id: item.produto_id || '', veiculo_id: item.veiculo_id || '',
      placa: item.placa || '',
      motorista_id: item.motorista_id || '', transportadora_id: item.transportadora_id || '',
      ano_safra_id: item.ano_safra_id || '', contrato_venda_id: item.contrato_venda_id || '',
      safra_ids: item.safra_ids || [],
      peso_bruto: fmtKg(item.peso_bruto), tara: fmtKg(item.tara),
      peso_liquido: fmtKg(item.peso_liquido),
      umidade_perc: fmtPerc(item.umidade_perc), impureza_perc: fmtPerc(item.impureza_perc),
      avariados_perc: fmtPerc(item.avariados_perc), ardidos_perc: fmtPerc(item.ardidos_perc),
      esverdeados_perc: fmtPerc(item.esverdeados_perc), partidos_perc: fmtPerc(item.partidos_perc),
      quebrados_perc: fmtPerc(item.quebrados_perc),
      umidade_desc: fmtKg(item.umidade_desc), impureza_desc: fmtKg(item.impureza_desc),
      avariados_desc: fmtKg(item.avariados_desc), ardidos_desc: fmtKg(item.ardidos_desc),
      esverdeados_desc: fmtKg(item.esverdeados_desc), partidos_desc: fmtKg(item.partidos_desc),
      quebrados_desc: fmtKg(item.quebrados_desc),
      desconto_kg: fmtKg(item.desconto_kg), peso_corrigido: fmtKg(item.peso_corrigido),
      transgenia: item.transgenia || '', observacoes: item.observacoes || '', ativo: item.ativo,
    })
    setImagePreview(item.imagem_url || null)
    setImageError(false)
    setShowForm(true)
  }

  // Auto-preencher ao selecionar Ordem
  const handleOrdemChange = (ordemId: string) => {
    const ordem = ordens.find((o: any) => o.id === ordemId)
    const updates: any = { ordem_id: ordemId }
    if (ordem) {
      updates.origem_id = ordem.origem_id || ''
      updates.destinatario_id = ordem.destino_id || ''
      updates.produto_id = ordem.produto_id || ''
      // Ano safra da operação
      if (ordem.operacao_id) {
        const op = operacoes.find((o: any) => o.id === ordem.operacao_id)
        if (op?.ano_safra_id) updates.ano_safra_id = op.ano_safra_id
        if (!form.operacao_id) updates.operacao_id = ordem.operacao_id
      }
    }
    setForm(prev => ({ ...prev, ...updates }))
  }

  // Filtro cascata veículo → motorista → transportadora
  const handleVeiculoChange = (veiculoId: string) => {
    const veic = veiculos.find((v: any) => v.id === veiculoId)
    const updates: any = { veiculo_id: veiculoId }
    if (veic?.cadastro_id) {
      const mot = cadastros.find((c: any) => c.id === veic.cadastro_id)
      if (mot) {
        updates.motorista_id = mot.id
        if (mot.transportador_id) updates.transportadora_id = mot.transportador_id
      }
    }
    setForm(prev => ({ ...prev, ...updates }))
  }

  const handleMotoristaChange = (motId: string) => {
    const mot = cadastros.find((c: any) => c.id === motId)
    const updates: any = { motorista_id: motId }
    if (mot?.transportador_id) updates.transportadora_id = mot.transportador_id
    // Buscar veículo vinculado
    const veic = veiculos.find((v: any) => v.cadastro_id === motId)
    if (veic) updates.veiculo_id = veic.id
    setForm(prev => ({ ...prev, ...updates }))
  }

  const handleTranspChange = (transpId: string) => {
    setForm(prev => ({ ...prev, transportadora_id: transpId }))
  }

  // Auto-preencher Operação → Ano Safra + Safras
  const handleOperacaoChange = (opId: string) => {
    const op = operacoes.find((o: any) => o.id === opId)
    const updates: any = { operacao_id: opId, ordem_id: '' }
    if (op?.ano_safra_id) updates.ano_safra_id = op.ano_safra_id
    if (op?.safra_ids?.length > 0) updates.safra_ids = [...op.safra_ids]
    else updates.safra_ids = []
    setForm(prev => ({ ...prev, ...updates }))
  }

  // Cálculo automático descontos (valores podem ter decimais como "537,93")
  const calcDescontoTotal = (f: typeof form) => {
    const descs = [f.umidade_desc, f.impureza_desc, f.avariados_desc, f.ardidos_desc, f.esverdeados_desc, f.partidos_desc, f.quebrados_desc]
    return descs.reduce((sum, d) => sum + (parseKgDec(d) || 0), 0)
  }

  // Handler para campos kg: formata com separador de milhar e recalcula dependentes
  const handleKgChange = (field: string, raw: string) => {
    const digits = raw.replace(/\D/g, '')
    const formatted = digits ? parseInt(digits, 10).toLocaleString('pt-BR') : ''
    const next = { ...form, [field]: formatted }
    // Auto-calc peso_liquido = peso_bruto - tara
    if (field === 'peso_bruto' || field === 'tara') {
      const pb = parseKg(field === 'peso_bruto' ? formatted : next.peso_bruto) || 0
      const ta = parseKg(field === 'tara' ? formatted : next.tara) || 0
      const pl = pb > 0 && ta > 0 ? pb - ta : 0
      next.peso_liquido = pl > 0 ? fmtKg(pl) : ''
      // Recalcular peso corrigido
      const dt = calcDescontoTotal(next)
      next.peso_corrigido = pl > 0 ? fmtKg(pl - dt) : ''
    }
    setForm(next)
  }

  // Handler para campos desc (kg) com recálculo de desconto total e peso corrigido - aceita decimais
  const handleDescChange = (field: string, raw: string) => {
    // Permitir dígitos, ponto (milhar) e vírgula (decimal)
    let clean = raw.replace(/[^\d.,]/g, '')
    // Garantir apenas uma vírgula decimal
    const parts = clean.split(',')
    if (parts.length > 2) clean = parts[0] + ',' + parts.slice(1).join('')
    const next = { ...form, [field]: clean }
    const dt = calcDescontoTotal(next)
    const pl = parseKg(next.peso_liquido) || 0
    next.desconto_kg = dt > 0 ? fmtKg(dt) : ''
    next.peso_corrigido = pl > 0 ? fmtKg(Math.round(pl - dt)) : ''
    setForm(next)
  }

  const handlePercChange = (field: string, raw: string) => {
    let clean = raw.replace(/[^\d,]/g, '')
    const parts = clean.split(',')
    if (parts.length > 2) clean = parts[0] + ',' + parts.slice(1).join('')
    setForm(prev => ({ ...prev, [field]: clean }))
  }

  const handleImageSelect = async (file: File) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string)
      setImagePreview(base64)
      setImageError(false)
      if (GEMINI_API_KEY) { await processOCR(base64) }
      else { toast('Defina VITE_GEMINI_API_KEY para OCR automático', { icon: 'ℹ️' }) }
    }
    reader.readAsDataURL(file)
  }

  const processOCR = async (base64Image: string) => {
    setOcrLoading(true)
    try {
      const base64Data = base64Image.split(',')[1]
      if (!base64Data) { toast.error('Imagem inválida'); return }
      const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/jpeg'
      
      const prompt = `Analise esta imagem de um romaneio/ticket de pesagem agrícola brasileiro.
Extraia os seguintes campos e retorne APENAS um JSON válido (sem markdown, sem comentários, sem blocos de código):
{
  "numero_ticket": "",
  "data_saida_origem": "YYYY-MM-DD",
  "cnpj_cpf": "",
  "nfe_numero": "",
  "peso_bruto": 0,
  "tara": 0,
  "peso_liquido": 0,
  "umidade_perc": 0,
  "impureza_perc": 0,
  "avariados_perc": 0,
  "ardidos_perc": 0,
  "esverdeados_perc": 0,
  "partidos_perc": 0,
  "quebrados_perc": 0,
  "desconto_kg": 0,
  "peso_corrigido": 0,
  "transgenia": "Sim|Não|"
}
Use 0 para campos numéricos não encontrados e "" para textos. Pesos em KG inteiros (sem decimais). Porcentagens com até 3 decimais.`

      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Data } }] }] }) }
      )
      
      if (!resp.ok) {
        const errText = await resp.text()
        if (resp.status === 429) {
          toast.error('Limite de requisições da API Gemini atingido. Aguarde alguns minutos e tente novamente.')
        } else {
          toast.error(`Erro na API Gemini (${resp.status})`)
        }
        return
      }
      
      const data = await resp.json()
      
      if (data.error) {
        toast.error(`Erro Gemini: ${data.error.message || 'desconhecido'}`)
        return
      }
      
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      
      // Limpar markdown code blocks se existirem
      const cleanText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '')
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/)
      
      if (jsonMatch) {
        const p = JSON.parse(jsonMatch[0])
        setForm(prev => ({
          ...prev,
          numero_ticket: p.numero_ticket || prev.numero_ticket,
          data_saida_origem: p.data_saida_origem || prev.data_saida_origem,
          cnpj_cpf: p.cnpj_cpf || prev.cnpj_cpf,
          nfe_numero: p.nfe_numero || prev.nfe_numero,
          peso_bruto: p.peso_bruto ? fmtKg(p.peso_bruto) : prev.peso_bruto,
          tara: p.tara ? fmtKg(p.tara) : prev.tara,
          peso_liquido: p.peso_liquido ? fmtKg(p.peso_liquido) : prev.peso_liquido,
          umidade_perc: p.umidade_perc ? fmtPerc(p.umidade_perc) : prev.umidade_perc,
          impureza_perc: p.impureza_perc ? fmtPerc(p.impureza_perc) : prev.impureza_perc,
          avariados_perc: p.avariados_perc ? fmtPerc(p.avariados_perc) : prev.avariados_perc,
          ardidos_perc: p.ardidos_perc ? fmtPerc(p.ardidos_perc) : prev.ardidos_perc,
          esverdeados_perc: p.esverdeados_perc ? fmtPerc(p.esverdeados_perc) : prev.esverdeados_perc,
          partidos_perc: p.partidos_perc ? fmtPerc(p.partidos_perc) : prev.partidos_perc,
          quebrados_perc: p.quebrados_perc ? fmtPerc(p.quebrados_perc) : prev.quebrados_perc,
          desconto_kg: p.desconto_kg ? fmtKg(p.desconto_kg) : prev.desconto_kg,
          peso_corrigido: p.peso_corrigido ? fmtKg(p.peso_corrigido) : prev.peso_corrigido,
          transgenia: p.transgenia || prev.transgenia,
        }))
        toast.success('Dados extraídos com IA!')
      } else {
        toast.error('Não foi possível extrair dados da imagem')
      }
    } catch (err: any) {
      toast.error(`Erro ao processar: ${err.message || 'desconhecido'}`)
    }
    finally { setOcrLoading(false) }
  }

  const ordensFiltradas = form.operacao_id ? ordens.filter((o: any) => o.operacao_id === form.operacao_id) : ordens

  const save = async () => {
    if (!form.ordem_id) { toast.error('Selecione uma Ordem de Carregamento'); return }
    if (form.safra_ids.length === 0 && form.ano_safra_id) { toast.error('É obrigatório selecionar pelo menos uma safra'); return }
    const safraIdsToSync = [...form.safra_ids]
    const payload: any = {}
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'safra_ids') return
      if (KG_FIELDS.includes(k)) { payload[k] = parseKg(v as string) }
      else if (PERC_FIELDS.includes(k)) { payload[k] = parsePerc(v as string) }
      else if (v === '' || v === undefined) { payload[k] = null }
      else { payload[k] = v }
    })
    try {
      // Upload imagem via Supabase Storage (se for base64 nova)
      if (imagePreview && imagePreview.startsWith('data:')) {
        try {
          const publicUrl = await uploadRomaneioImage(imagePreview, editing?.id)
          payload.imagem_url = publicUrl
        } catch (uploadErr: any) {
          toast.error('Erro ao enviar imagem. Salvando sem imagem.')
        }
      }
      let result: any
      if (editing) { result = await updateRomaneio(editing.id, payload); toast.success('Romaneio atualizado') }
      else { result = await createRomaneio(payload); toast.success('Romaneio cadastrado') }
      await syncRomaneioSafras(result.id, safraIdsToSync)
      setShowForm(false); load()
    } catch (err: any) { toast.error('Erro ao salvar: ' + (err?.message || '')) }
  }

  const remove = async (id: string) => {
    if (!confirm('Deseja remover este romaneio?')) return
    try { await deleteRomaneio(id); toast.success('Romaneio removido'); load() }
    catch { toast.error('Erro ao remover') }
  }

  // Helper: nome do cadastro por id
  const cadNome = (id: string) => { const c = cadastros.find((x: any) => x.id === id); return c?.nome_fantasia || c?.nome || '' }
  const prodNome = (id: string) => { const p = produtos.find((x: any) => x.id === id); return p?.nome || '' }
  const veicPlaca = (id: string) => { const v = veiculos.find((x: any) => x.id === id); return v?.placa || '' }

  // Veículos filtrados pelo motorista/transportadora selecionados
  const veiculosFiltrados = form.motorista_id
    ? veiculos.filter((v: any) => v.cadastro_id === form.motorista_id)
    : form.transportadora_id
      ? veiculos.filter((v: any) => { const mot = cadastros.find((c: any) => c.id === v.cadastro_id); return mot?.transportador_id === form.transportadora_id })
      : veiculos

  // Motoristas filtrados pela transportadora
  const motoristasFiltrados = form.transportadora_id
    ? motoristasList.filter((m: any) => m.transportador_id === form.transportadora_id)
    : motoristasList

  // Contratos de venda filtrados pelo ano safra selecionado
  const contratosFiltrados = form.ano_safra_id
    ? contratosVenda.filter((cv: any) => {
        // Verificar se o contrato tem safras relacionadas ao ano safra selecionado
        const safrasDoContrato = cv.contrato_venda_safras || []
        return safrasDoContrato.some((cvs: any) => {
          const safra = safras.find(s => s.id === cvs.safra_id)
          return safra?.ano_safra_id === form.ano_safra_id
        })
      })
    : contratosVenda

  // Configuração de colunas
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const saveColumns = (cols: typeof columns) => {
    setColumns(cols)
    localStorage.setItem('romaneios_columns', JSON.stringify(cols))
  }
  const toggleColumn = (key: string) => {
    const updated = columns.map((c: any) => c.key === key ? { ...c, visible: !c.visible } : c)
    saveColumns(updated)
  }
  const handleDragStart = (idx: number) => {
    setDragIndex(idx)
  }
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === idx) return
    const sorted = [...columns].sort((a: any, b: any) => a.order - b.order)
    const [moved] = sorted.splice(dragIndex, 1)
    sorted.splice(idx, 0, moved)
    const reordered = sorted.map((c: any, i: number) => ({ ...c, order: i + 1 }))
    setColumns(reordered)
    setDragIndex(idx)
  }
  const handleDragEnd = () => {
    setDragIndex(null)
    localStorage.setItem('romaneios_columns', JSON.stringify(columns))
  }

  // Obter valor de célula da tabela
  const getCellValue = (item: any, colKey: string) => {
    switch (colKey) {
      case 'operacao': return operacoes.find(o => o.id === item.operacao_id)?.nome || '-'
      case 'ordem': return item.ordem_nome || '-'
      case 'data_saida': return fmtData(item.data_saida_origem || item.data_emissao) || '-'
      case 'produtor': return item.produtor_id ? cadNome(item.produtor_id) : item.produtor || '-'
      case 'produto': return item.produto_id ? prodNome(item.produto_id) : item.produto || '-'
      case 'origem': return item.origem_id ? cadNome(item.origem_id) : '-'
      case 'destino': return item.destinatario_id ? cadNome(item.destinatario_id) : '-'
      case 'placa': return item.veiculo_id ? veicPlaca(item.veiculo_id) : item.placa || '-'
      case 'ticket': return item.numero_ticket || '-'
      case 'peso_liq_sdesc': return fmtVolume(item.peso_liquido, unidadeExibicao)
      case 'peso_liq_cdesc': return fmtVolume(item.peso_corrigido, unidadeExibicao)
      case 'motorista': return item.motorista_id ? cadNome(item.motorista_id) : '-'
      case 'transportadora': return item.transportadora_id ? cadNome(item.transportadora_id) : '-'
      case 'contrato_venda': {
        const cv = contratosVenda.find(c => c.id === item.contrato_venda_id)
        return cv ? `${cv.numero_contrato || 'S/N'} - ${cv.comprador?.nome_fantasia || cv.comprador?.nome || ''}` : '-'
      }
      case 'ano_safra': return anosSafra.find(a => a.id === item.ano_safra_id)?.nome || '-'
      case 'tipo_ticket': return tiposTicket.find(t => t.id === item.tipo_ticket_id)?.nome || '-'
      case 'tipo_nf': return tiposNf.find(t => t.id === item.tipo_nf_id)?.nome || '-'
      case 'nfe': return item.nfe_numero || '-'
      case 'data_entrada_destino': return fmtData(item.data_entrada_destino) || '-'
      case 'data_saida_destino': return fmtData(item.data_saida_destino) || '-'
      case 'peso_bruto': return fmtVolume(item.peso_bruto, unidadeExibicao)
      case 'tara': return fmtVolume(item.tara, unidadeExibicao)
      case 'peso_liquido': return fmtVolume(item.peso_liquido, unidadeExibicao)
      case 'umidade_perc': return item.umidade_perc != null ? fmtPerc(item.umidade_perc) : '-'
      case 'impureza_perc': return item.impureza_perc != null ? fmtPerc(item.impureza_perc) : '-'
      case 'avariados_perc': return item.avariados_perc != null ? fmtPerc(item.avariados_perc) : '-'
      case 'ardidos_perc': return item.ardidos_perc != null ? fmtPerc(item.ardidos_perc) : '-'
      case 'esverdeados_perc': return item.esverdeados_perc != null ? fmtPerc(item.esverdeados_perc) : '-'
      case 'partidos_perc': return item.partidos_perc != null ? fmtPerc(item.partidos_perc) : '-'
      case 'quebrados_perc': return item.quebrados_perc != null ? fmtPerc(item.quebrados_perc) : '-'
      case 'umidade_desc': return fmtVolume(item.umidade_desc, unidadeExibicao)
      case 'impureza_desc': return fmtVolume(item.impureza_desc, unidadeExibicao)
      case 'avariados_desc': return fmtVolume(item.avariados_desc, unidadeExibicao)
      case 'ardidos_desc': return fmtVolume(item.ardidos_desc, unidadeExibicao)
      case 'esverdeados_desc': return fmtVolume(item.esverdeados_desc, unidadeExibicao)
      case 'partidos_desc': return fmtVolume(item.partidos_desc, unidadeExibicao)
      case 'quebrados_desc': return fmtVolume(item.quebrados_desc, unidadeExibicao)
      case 'desconto_total': return fmtVolume(item.desconto_kg, unidadeExibicao)
      case 'peso_corrigido': return fmtVolume(item.peso_corrigido, unidadeExibicao)
      case 'transgenia': return item.transgenia || '-'
      case 'observacoes': return item.observacoes || '-'
      case 'cnpj_cpf': return item.cnpj_cpf || '-'
      case 'valor_unitario_frete': return calcularValorUnitarioFrete(item, unidadeExibicao)
      case 'valor_frete': return calcularFrete(item).label
      case 'tempo_permanencia': {
        if (!item.data_entrada_destino || !item.data_saida_destino) return '-'
        const entrada = new Date(item.data_entrada_destino)
        const saida = new Date(item.data_saida_destino)
        const diff = saida.getTime() - entrada.getTime()
        if (diff <= 0) return '-'
        const horas = Math.floor(diff / 3600000)
        const mins = Math.floor((diff % 3600000) / 60000)
        return `${horas}h${mins > 0 ? ` ${mins}min` : ''}`
      }
      default: return '-'
    }
  }

  // Filtro de busca com filtros avançados
  const filteredItems = items.filter(item => {
    // Busca por texto livre
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const matchesSearch = (
        (item.ordem_nome || '').toLowerCase().includes(term) ||
        (item.numero_ticket || '').toLowerCase().includes(term) ||
        (item.produtor_id ? cadNome(item.produtor_id) : item.produtor || '').toLowerCase().includes(term) ||
        (item.produto_id ? prodNome(item.produto_id) : item.produto || '').toLowerCase().includes(term) ||
        (item.veiculo_id ? veicPlaca(item.veiculo_id) : item.placa || '').toLowerCase().includes(term)
      )
      if (!matchesSearch) return false
    }

    // Filtros avançados (todos devem passar)
    for (const filter of activeFilters) {
      if (!filter.value) continue
      
      switch (filter.field) {
        case 'operacao':
          if (item.operacao_id !== filter.value) return false
          break
        case 'ordem':
          if (item.ordem_id !== filter.value) return false
          break
        case 'produtor':
          if (item.produtor_id !== filter.value) return false
          break
        case 'produto':
          if (item.produto_id !== filter.value) return false
          break
        case 'origem':
          if (item.origem_id !== filter.value) return false
          break
        case 'destino':
          if (item.destinatario_id !== filter.value) return false
          break
        case 'veiculo':
          if (item.veiculo_id !== filter.value) return false
          break
        case 'motorista':
          if (item.motorista_id !== filter.value) return false
          break
        case 'transportadora':
          if (item.transportadora_id !== filter.value) return false
          break
        case 'ticket':
          if (!(item.numero_ticket || '').toLowerCase().includes(filter.value.toLowerCase())) return false
          break
        case 'nfe':
          if (!(item.nfe_numero || '').toLowerCase().includes(filter.value.toLowerCase())) return false
          break
        case 'ano_safra':
          if (item.ano_safra_id !== filter.value) return false
          break
        case 'tipo_ticket':
          if (item.tipo_ticket_id !== filter.value) return false
          break
        case 'tipo_nf':
          if (item.tipo_nf_id !== filter.value) return false
          break
        case 'data_saida':
          if (item.data_saida_origem !== filter.value) return false
          break
        case 'transgenia':
          if (item.transgenia !== filter.value) return false
          break
      }
    }

    return true
  })

  // Colunas visíveis ordenadas
  const visibleColumns = columns.filter((c: any) => c.visible).sort((a: any, b: any) => a.order - b.order)

  // Ordenação por colunas
  const [romSortKey, setRomSortKey] = useState<string | null>(null)
  const [romSortDir, setRomSortDir] = useState<'asc' | 'desc' | null>(null)

  const toggleRomSort = (key: string) => {
    if (romSortKey !== key) { setRomSortKey(key); setRomSortDir('asc') }
    else if (romSortDir === 'asc') { setRomSortDir('desc') }
    else { setRomSortKey(null); setRomSortDir(null) }
  }

  // Mapear colKey para campo raw sortável
  const getSortValue = (item: any, colKey: string): any => {
    switch (colKey) {
      case 'operacao': return operacoes.find(o => o.id === item.operacao_id)?.nome || ''
      case 'ordem': return item.ordem_nome || ''
      case 'data_saida': return item.data_saida_origem || item.data_emissao || ''
      case 'data_entrada_destino': return item.data_entrada_destino || ''
      case 'data_saida_destino': return item.data_saida_destino || ''
      case 'produtor': return item.produtor_id ? cadNome(item.produtor_id) : item.produtor || ''
      case 'produto': return item.produto_id ? prodNome(item.produto_id) : item.produto || ''
      case 'origem': return item.origem_id ? cadNome(item.origem_id) : ''
      case 'destino': return item.destinatario_id ? cadNome(item.destinatario_id) : ''
      case 'placa': return item.veiculo_id ? veicPlaca(item.veiculo_id) : item.placa || ''
      case 'ticket': return item.numero_ticket || ''
      case 'peso_liq_sdesc': return item.peso_liquido ?? 0
      case 'peso_liq_cdesc': return item.peso_corrigido ?? 0
      case 'motorista': return item.motorista_id ? cadNome(item.motorista_id) : ''
      case 'transportadora': return item.transportadora_id ? cadNome(item.transportadora_id) : ''
      case 'contrato_venda': {
        const cv = contratosVenda.find(c => c.id === item.contrato_venda_id)
        return cv ? `${cv.numero_contrato || ''}` : ''
      }
      case 'ano_safra': return anosSafra.find(a => a.id === item.ano_safra_id)?.nome || ''
      case 'peso_bruto': return item.peso_bruto ?? 0
      case 'tara': return item.tara ?? 0
      case 'peso_liquido': return item.peso_liquido ?? 0
      case 'desconto_total': return item.desconto_kg ?? 0
      case 'peso_corrigido': return item.peso_corrigido ?? 0
      default: return getCellValue(item, colKey)
    }
  }

  const sortedFilteredItems = useMemo(() => {
    if (!romSortKey || !romSortDir) return filteredItems
    const dir = romSortDir === 'asc' ? 1 : -1
    return [...filteredItems].sort((a, b) => {
      let va = getSortValue(a, romSortKey)
      let vb = getSortValue(b, romSortKey)
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
      va = String(va).toLowerCase()
      vb = String(vb).toLowerCase()
      return va.localeCompare(vb, 'pt-BR') * dir
    })
  }, [filteredItems, romSortKey, romSortDir])

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Romaneios</h1>
        <div className="flex gap-2">
          <select value={unidadeExibicao} onChange={e => setUnidadeExibicao(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm font-medium bg-white">
            {unidadesMedida.filter(u => u.ativo && u.grupo === 'sólido').map(u => (
              <option key={u.id} value={u.simbolo}>{u.simbolo.toUpperCase()}</option>
            ))}
          </select>
          <ExportButtons
            onExportExcel={() => {
              const cols = visibleColumns.map((c: any) => ({ key: c.key, label: c.label, align: ['peso_liq_sdesc','peso_liq_cdesc','valor_frete'].includes(c.key) ? 'right' as const : 'left' as const }))
              exportToExcel({ filename: 'romaneios', title: 'Romaneios', columns: cols, data: sortedFilteredItems, getValue: (item, key) => getCellValue(item, key) })
            }}
            onExportPDF={() => {
              const cols = visibleColumns.map((c: any) => ({ key: c.key, label: c.label, align: ['peso_liq_sdesc','peso_liq_cdesc','valor_frete'].includes(c.key) ? 'right' as const : 'left' as const }))
              exportToPDF({ filename: 'romaneios', title: 'Romaneios', columns: cols, data: sortedFilteredItems, getValue: (item, key) => getCellValue(item, key) })
            }}
          />
          <button onClick={() => setShowColumnConfig(true)} className="flex items-center gap-2 bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 text-sm">
            <Settings className="w-4 h-4" /> Colunas
          </button>
          <button onClick={openNew} className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 sm:px-4 rounded-lg hover:bg-green-700 text-sm sm:text-base whitespace-nowrap">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Novo</span> Romaneio
          </button>
        </div>
      </div>

      {/* Área de filtros */}
      <div className="mb-4 space-y-3">
        {/* Busca por texto livre */}
        <div className="relative flex-1">
          <input type="text" placeholder="Buscar por ordem, ticket, produtor, produto, placa..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
          <Filter className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
        </div>

        {/* Filtros ativos */}
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
                  ) : fieldDef.type === 'date' ? (
                    <input type="date" value={filter.value} onChange={e => updateFilterValue(filter.id, e.target.value)}
                      className="text-sm border-0 bg-transparent focus:ring-0 p-0" />
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
            <button onClick={clearAllFilters} className="text-xs text-red-600 hover:text-red-700 font-medium px-2">
              Limpar todos
            </button>
          </div>
        )}

        {/* Botão adicionar filtro */}
        <div className="relative">
          <button onClick={() => setShowFilterOptions(!showFilterOptions)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            <Plus className="w-4 h-4" />
            Adicionar Filtro
            <ChevronDown className="w-4 h-4" />
          </button>
          
          {showFilterOptions && (
            <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto w-64">
              {FILTER_FIELDS.filter(f => !activeFilters.find(af => af.field === f.key)).map(field => (
                <button key={field.key} onClick={() => addFilter(field.key)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">
                  {field.label}
                </button>
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
          <table className="w-full text-sm min-w-[750px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                {visibleColumns.map((col: any) => {
                  const volumeKeys = ['peso_liq_sdesc','peso_liq_cdesc','peso_bruto','tara','peso_liquido','desconto_total','peso_corrigido','umidade_desc','impureza_desc','avariados_desc','ardidos_desc','esverdeados_desc','partidos_desc','quebrados_desc']
                  const isRight = volumeKeys.includes(col.key) || ['valor_frete','valor_unitario_frete'].includes(col.key)
                  const isActive = romSortKey === col.key
                  const unitLabel = normalizeUnit(unidadeExibicao) === 'kg' ? 'kg' : unidadeExibicao
                  const displayLabel = col.key === 'valor_unitario_frete' 
                    ? `Vlr Unit Frete (R$/${unitLabel})` 
                    : volumeKeys.includes(col.key) && normalizeUnit(unidadeExibicao) !== 'kg'
                      ? `${col.label.replace(/ \(kg\)$/, '')} (${unitLabel})`
                      : col.label
                  return (
                    <th key={col.key}
                      className={`px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100 transition-colors ${isRight ? 'text-right' : 'text-left'}`}
                      onClick={() => toggleRomSort(col.key)}>
                      <div className={`flex items-center gap-1 ${isRight ? 'justify-end' : ''}`}>
                        <span>{displayLabel}</span>
                        {isActive && romSortDir === 'asc' && <ArrowUp className="w-3.5 h-3.5 text-green-600" />}
                        {isActive && romSortDir === 'desc' && <ArrowDown className="w-3.5 h-3.5 text-green-600" />}
                        {!isActive && <ArrowUpDown className="w-3.5 h-3.5 text-gray-300" />}
                      </div>
                    </th>
                  )
                })}
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pagination.paginate(sortedFilteredItems).map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setViewingItem(item)}>
                  {visibleColumns.map((col: any) => (
                    <td key={col.key} className={`px-4 py-3 ${['peso_liq_sdesc','peso_liq_cdesc'].includes(col.key) ? 'text-right font-semibold' : ''} ${col.key === 'ordem' ? 'text-xs text-blue-600 font-semibold' : ''} ${['placa','ticket'].includes(col.key) ? 'font-mono text-xs' : ''}`}>
                      {getCellValue(item, col.key)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right space-x-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {sortedFilteredItems.length === 0 && <tr><td colSpan={visibleColumns.length + 1} className="px-4 py-8 text-center text-gray-400">Nenhum romaneio encontrado</td></tr>}
            </tbody>
          </table>
          <Pagination
            currentPage={pagination.page}
            totalItems={sortedFilteredItems.length}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            onPageSizeChange={(s) => { pagination.setPageSize(s); pagination.resetPage() }}
          />
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white sm:rounded-xl shadow-xl w-full max-w-3xl sm:mx-4 max-h-screen sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Editar Romaneio' : 'Novo Romaneio'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">

              {/* Operação + Ordem */}
              <div className="border-2 border-orange-200 bg-orange-50 rounded-lg p-3 space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-orange-700 mb-1">Operação</label>
                  <SearchableSelect value={form.operacao_id} onChange={val => handleOperacaoChange(val)}
                    options={[{ value: '', label: 'Todas as operações' }, ...operacoes.map((op: any) => ({ value: op.id, label: op.nome }))]} placeholder="Selecione a operação" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-orange-700 mb-1">Ordem de Carregamento *</label>
                  <SearchableSelect value={form.ordem_id} onChange={val => handleOrdemChange(val)}
                    options={[{ value: '', label: 'Selecione a Ordem...' }, ...ordensFiltradas.map((o: any) => ({ value: o.id, label: `#${o.numero_ordem_fmt || o.numero_ordem} - ${o.nome_ordem || ''} (${o.origem_nome} → ${o.destino_nome})` }))]} placeholder="Selecione a ordem" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-orange-700 mb-1">Ano Safra *</label>
                    <SearchableSelect value={form.ano_safra_id} onChange={val => setForm(prev => ({ ...prev, ano_safra_id: val, safra_ids: [] }))}
                      options={[{ value: '', label: 'Selecione...' }, ...anosSafra.filter((a: any) => a.ativo).map((a: any) => ({ value: a.id, label: a.nome }))]} placeholder="Ano Safra" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-orange-700 mb-1">Safras * (mín. 1)</label>
                    <MultiSearchableSelect
                      values={form.safra_ids}
                      onChange={vals => setForm(prev => ({ ...prev, safra_ids: vals }))}
                      options={safras.filter(s => s.ativo && (!form.ano_safra_id || s.ano_safra_id === form.ano_safra_id)).map(s => ({ value: s.id, label: s.nome }))}
                      placeholder="Selecione as safras..."
                      minSelected={1}
                    />
                  </div>
                </div>
              </div>

              {/* Upload / Camera com OCR */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">Digitalizar Romaneio com IA</span>
                  {ocrLoading && <Loader2 className="w-4 h-4 animate-spin text-purple-600" />}
                </div>
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) handleImageSelect(e.target.files[0]) }} />
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) handleImageSelect(e.target.files[0]) }} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={ocrLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm">
                    <Upload className="w-4 h-4" /> Anexar Imagem
                  </button>
                  <button type="button" onClick={() => cameraInputRef.current?.click()} disabled={ocrLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm">
                    <Camera className="w-4 h-4" /> Tirar Foto
                  </button>
                </div>
                {ocrLoading && <p className="text-sm text-purple-600 mt-2">Analisando imagem com Gemini AI...</p>}
                {imagePreview && (
                  <div className="mt-3 relative">
                    <div className="relative group cursor-pointer" onClick={() => {
                      if (imagePreview.startsWith('data:')) {
                        setLightboxImage(imagePreview)
                      } else {
                        window.open(imagePreview, '_blank')
                      }
                    }}>
                      <img src={imagePreview} alt="Romaneio" 
                        className="w-full max-h-64 rounded-lg border shadow-sm object-contain bg-gray-100" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center rounded-lg">
                        <div className="flex flex-col items-center gap-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          {imagePreview.startsWith('data:') ? (
                            <><ZoomIn className="w-8 h-8" /><span className="text-sm font-semibold">Ampliar</span></>
                          ) : (
                            <><ExternalLink className="w-8 h-8" /><span className="text-sm font-semibold">Abrir</span></>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null)
                        setForm(prev => ({ ...prev, imagem_url: null }))
                        toast.success('Imagem removida')
                      }}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 shadow-lg transition-colors z-10"
                      title="Excluir imagem"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Identificação: Ticket + NF-e */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">N° Ticket</label>
                  <input type="text" value={form.numero_ticket} onChange={e => setForm({...form, numero_ticket: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipo Ticket</label>
                  <SearchableSelect value={form.tipo_ticket_id} onChange={val => setForm({...form, tipo_ticket_id: val})}
                    options={[{ value: '', label: 'Selecione...' }, ...tiposTicket.filter((t: any) => t.ativo).map((t: any) => ({ value: t.id, label: t.nome }))]} placeholder="Tipo Ticket" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">NF-e</label>
                  <input type="text" value={form.nfe_numero} onChange={e => setForm({...form, nfe_numero: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipo NF</label>
                  <SearchableSelect value={form.tipo_nf_id} onChange={val => setForm({...form, tipo_nf_id: val})}
                    options={[{ value: '', label: 'Selecione...' }, ...tiposNf.filter((t: any) => t.ativo).map((t: any) => ({ value: t.id, label: t.nome }))]} placeholder="Tipo NF" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contrato de Venda</label>
                  <SearchableSelect value={form.contrato_venda_id} onChange={val => setForm({...form, contrato_venda_id: val})}
                    options={[{ value: '', label: 'Nenhum' }, ...contratosFiltrados.map((cv: any) => ({ value: cv.id, label: `${cv.numero_contrato || 'S/N'} - ${cv.comprador?.nome_fantasia || cv.comprador?.nome || ''} (${cv.produtos?.nome || ''})` }))]} placeholder="Contrato de Venda" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Transgenia</label>
                  <SearchableSelect value={form.transgenia} onChange={val => setForm({...form, transgenia: val})}
                    options={[{ value: '', label: 'Selecione...' }, { value: 'Sim', label: 'Sim' }, { value: 'Não', label: 'Não' }]} placeholder="Transgenia" />
                </div>
              </div>

              {/* Origem, Destinatário, Produto (auto-preenchidos pela ordem) */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Origem</label>
                  <SearchableSelect value={form.origem_id} onChange={val => setForm({...form, origem_id: val})}
                    options={[{ value: '', label: 'Selecione...' }, ...origensList.map((c: any) => ({ value: c.id, label: c.nome_fantasia || c.nome }))]} placeholder="Origem" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Destinatário</label>
                  <SearchableSelect value={form.destinatario_id} onChange={val => setForm({...form, destinatario_id: val})}
                    options={[{ value: '', label: 'Selecione...' }, ...origensList.map((c: any) => ({ value: c.id, label: c.nome_fantasia || c.nome }))]} placeholder="Destinatário" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Produto</label>
                  <SearchableSelect value={form.produto_id} onChange={val => setForm({...form, produto_id: val})}
                    options={[{ value: '', label: 'Selecione...' }, ...produtos.map((p: any) => ({ value: p.id, label: p.nome }))]} placeholder="Produto" />
                </div>
              </div>

              {/* Produtor + CNPJ/CPF */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Produtor</label>
                  <SearchableSelect value={form.produtor_id} onChange={val => {
                    const prod = cadastros.find((c: any) => c.id === val)
                    setForm({...form, produtor_id: val, cnpj_cpf: prod?.cpf_cnpj || form.cnpj_cpf})
                  }}
                    options={[{ value: '', label: 'Selecione...' }, ...produtoresList.map((c: any) => ({ value: c.id, label: c.nome_fantasia || c.nome }))]} placeholder="Produtor" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">CNPJ/CPF</label>
                  <input type="text" value={form.cnpj_cpf} onChange={e => setForm({...form, cnpj_cpf: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>

              {/* Placa, Motorista, Transportadora (filtro cascata) */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Placa</label>
                  <SearchableSelect value={form.veiculo_id} onChange={val => handleVeiculoChange(val)}
                    options={[{ value: '', label: 'Selecione...' }, ...veiculosFiltrados.map((v: any) => ({ value: v.id, label: `${v.placa} (${v.tipo_caminhao})` }))]} placeholder="Placa" />
                  {!form.veiculo_id && form.placa && (
                    <div className="mt-1 flex items-center gap-2 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                      <span className="font-mono font-semibold">{form.placa}</span>
                      <span className="text-amber-600">(placa não cadastrada)</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Motorista</label>
                  <SearchableSelect value={form.motorista_id} onChange={val => handleMotoristaChange(val)}
                    options={[{ value: '', label: 'Selecione...' }, ...motoristasFiltrados.map((c: any) => ({ value: c.id, label: c.nome_fantasia || c.nome }))]} placeholder="Motorista" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Transportadora</label>
                  <SearchableSelect value={form.transportadora_id} onChange={val => handleTranspChange(val)}
                    options={[{ value: '', label: 'Selecione...' }, ...transportadorasList.map((c: any) => ({ value: c.id, label: c.nome_fantasia || c.nome }))]} placeholder="Transportadora" />
                </div>
              </div>

              {/* Pesagem */}
              <div className="border-t pt-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Pesagem</h3>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Peso Bruto (kg)</label>
                    <input type="text" inputMode="numeric" value={form.peso_bruto} onChange={e => handleKgChange('peso_bruto', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tara (kg)</label>
                    <input type="text" inputMode="numeric" value={form.tara} onChange={e => handleKgChange('tara', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Peso Líquido S/Desc (kg)</label>
                    <input type="text" value={form.peso_liquido} readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold bg-gray-50" />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Data Saída Origem</label>
                    <input type="date" value={form.data_saida_origem} onChange={e => setForm({...form, data_saida_origem: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Data Entrada Destino</label>
                    <input type="datetime-local" value={form.data_entrada_destino} onChange={e => setForm({...form, data_entrada_destino: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Data Saída Destino</label>
                    <input type="datetime-local" value={form.data_saida_destino} onChange={e => setForm({...form, data_saida_destino: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tempo Permanência</label>
                    <input type="text" readOnly value={(() => {
                      if (!form.data_entrada_destino || !form.data_saida_destino) return ''
                      const ini = new Date(form.data_entrada_destino).getTime()
                      const fim = new Date(form.data_saida_destino).getTime()
                      if (isNaN(ini) || isNaN(fim) || fim <= ini) return ''
                      const diffMin = Math.round((fim - ini) / 60000)
                      const h = Math.floor(diffMin / 60)
                      const m = diffMin % 60
                      return h > 0 ? `${h}h ${m}min` : `${m}min`
                    })()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-blue-50 font-semibold text-blue-700" />
                  </div>
                </div>
              </div>

              {/* Classificação / Descontos */}
              <div className="border-t pt-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Classificação / Descontos</h3>
                <div className="grid grid-cols-4 gap-x-3 gap-y-2">
                  {[
                    { perc: 'umidade_perc', desc: 'umidade_desc', label: 'Umidade' },
                    { perc: 'impureza_perc', desc: 'impureza_desc', label: 'Impureza' },
                    { perc: 'avariados_perc', desc: 'avariados_desc', label: 'Avariados' },
                    { perc: 'ardidos_perc', desc: 'ardidos_desc', label: 'Ardidos' },
                    { perc: 'esverdeados_perc', desc: 'esverdeados_desc', label: 'Esverdeados' },
                    { perc: 'partidos_perc', desc: 'partidos_desc', label: 'Partidos' },
                    { perc: 'quebrados_perc', desc: 'quebrados_desc', label: 'Quebrados' },
                  ].map(({ perc, desc, label }) => (
                    <div key={perc} className="space-y-1">
                      <label className="block text-xs font-medium text-gray-700">{label} %</label>
                      <input type="text" inputMode="decimal" value={(form as any)[perc]} onChange={e => handlePercChange(perc, e.target.value)}
                        placeholder="0,00" className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
                      <label className="block text-xs text-gray-500">{label} Desc</label>
                      <input type="text" inputMode="numeric" value={(form as any)[desc]} onChange={e => handleDescChange(desc, e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
                    </div>
                  ))}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-orange-700">Desconto Total (kg)</label>
                    <input type="text" value={form.desconto_kg} readOnly
                      className="w-full px-2 py-1.5 border border-orange-300 rounded-lg text-sm bg-orange-50 font-semibold" />
                    <label className="block text-xs font-medium text-green-700 mt-1">Peso Líquido C/Desc (kg)</label>
                    <input type="text" value={form.peso_corrigido} readOnly
                      className="w-full px-2 py-1.5 border border-green-300 rounded-lg text-sm bg-green-50 font-bold" />
                  </div>
                </div>
              </div>

              {/* Observações (rodapé com mais espaço) */}
              <div className="border-t pt-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} rows={4}
                  placeholder="Observações sobre esta carga..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
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
        title="Detalhes do Romaneio"
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        onEdit={() => { openEdit(viewingItem); setViewingItem(null) }}
      >
        {viewingItem && (
          <>
            <Section title="Operação e Documentação" icon={<FileText className="w-5 h-5" />}>
              <Field label="Operação" value={operacoes.find(o => o.id === viewingItem.operacao_id)?.nome} highlight />
              <Field label="Ordem Carregamento" value={viewingItem.ordem_nome} highlight />
              <Field label="Ticket" value={viewingItem.numero_ticket} />
              <Field label="Tipo Ticket" value={tiposTicket.find(t => t.id === viewingItem.tipo_ticket_id)?.nome} />
              <Field label="NF-e" value={viewingItem.nfe_numero} />
              <Field label="Tipo NF" value={tiposNf.find(t => t.id === viewingItem.tipo_nf_id)?.nome} />
              <Field label="Data Saída Origem" value={fmtData(viewingItem.data_saida_origem)} />
              <Field label="Data Entrada Destino" value={fmtData(viewingItem.data_entrada_destino)} />
            </Section>

            <Section title="Origem, Destino e Produto" icon={<Target className="w-5 h-5" />}>
              <Field label="Origem" value={viewingItem.origem_id ? cadNome(viewingItem.origem_id) : '-'} />
              <Field label="Destino" value={viewingItem.destinatario_id ? cadNome(viewingItem.destinatario_id) : '-'} />
              <Field label="Produtor" value={viewingItem.produtor_id ? cadNome(viewingItem.produtor_id) : viewingItem.produtor} />
              <Field label="CNPJ/CPF" value={viewingItem.cnpj_cpf} />
              <Field label="Produto" value={viewingItem.produto_id ? prodNome(viewingItem.produto_id) : viewingItem.produto} />
              <Field label="Ano Safra" value={anosSafra.find(a => a.id === viewingItem.ano_safra_id)?.nome} />
              <Field label="Contrato Venda" value={(() => { const cv = contratosVenda.find(c => c.id === viewingItem.contrato_venda_id); return cv ? `${cv.numero_contrato || 'S/N'} - ${cv.comprador?.nome_fantasia || cv.comprador?.nome || ''}` : '-' })()} />
            </Section>

            <Section title="Transporte" icon={<Truck className="w-5 h-5" />}>
              <Field label="Placa" value={viewingItem.veiculo_id ? veicPlaca(viewingItem.veiculo_id) : viewingItem.placa} />
              <Field label="Motorista" value={viewingItem.motorista_id ? cadNome(viewingItem.motorista_id) : '-'} />
              <Field label="Transportadora" value={viewingItem.transportadora_id ? cadNome(viewingItem.transportadora_id) : '-'} />
              <Field label="Transgenia" value={viewingItem.transgenia} />
            </Section>

            <Section title="Pesagem e Qualidade" icon={<Scale className="w-5 h-5" />}>
              <Field label="Peso Bruto (kg)" value={viewingItem.peso_bruto ? fmtNum(viewingItem.peso_bruto) : '-'} />
              <Field label="Tara (kg)" value={viewingItem.tara ? fmtNum(viewingItem.tara) : '-'} />
              <Field label="Peso Líquido (kg)" value={viewingItem.peso_liquido ? fmtNum(viewingItem.peso_liquido) : '-'} highlight />
              <Field label="Peso Corrigido (kg)" value={viewingItem.peso_corrigido ? fmtNum(viewingItem.peso_corrigido) : '-'} highlight />
              <Field label="Umidade %" value={viewingItem.umidade_perc ? fmtPerc(viewingItem.umidade_perc) : '-'} />
              <Field label="Impureza %" value={viewingItem.impureza_perc ? fmtPerc(viewingItem.impureza_perc) : '-'} />
              <Field label="Avariados %" value={viewingItem.avariados_perc ? fmtPerc(viewingItem.avariados_perc) : '-'} />
              <Field label="Ardidos %" value={viewingItem.ardidos_perc ? fmtPerc(viewingItem.ardidos_perc) : '-'} />
              <Field label="Desc. Total (kg)" value={viewingItem.desconto_kg ? fmtNum(viewingItem.desconto_kg) : '-'} />
            </Section>

            {(() => {
              const frete = calcularFrete(viewingItem)
              if (frete.valor !== null) {
                const ordem = ordens.find((o: any) => o.id === viewingItem.ordem_id)
                const preco = ordem?.preco_id ? precos.find((p: any) => p.id === ordem.preco_id) : null
                return (
                  <Section title="Valor do Frete" icon={<Scale className="w-5 h-5" />}>
                    <Field label="Valor do Frete" value={frete.label} highlight />
                    <Field label="Preço Contratado" value={preco ? `${fmtBRL(preco.valor)} ${preco.unidade_preco}` : '-'} />
                    <Field label="Base de Cálculo" value={viewingItem.peso_corrigido ? `${fmtNum(viewingItem.peso_corrigido)} kg (corrigido)` : viewingItem.peso_liquido ? `${fmtNum(viewingItem.peso_liquido)} kg (líquido)` : '-'} />
                  </Section>
                )
              }
              return null
            })()}

            {viewingItem.imagem_url && (
              <Section title="Anexo do Romaneio" icon={<Camera className="w-5 h-5" />}>
                <div className="col-span-full">
                  <a 
                    href={viewingItem.imagem_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <div className="relative group cursor-pointer">
                      <img src={viewingItem.imagem_url} alt="Romaneio" 
                        className="w-full max-h-64 rounded-lg border shadow-sm object-contain bg-gray-100" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center rounded-lg">
                        <div className="flex flex-col items-center gap-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink className="w-8 h-8" />
                          <span className="text-sm font-semibold">Abrir em nova aba</span>
                        </div>
                      </div>
                    </div>
                  </a>
                </div>
              </Section>
            )}

            {viewingItem.observacoes && (
              <Section title="Observações" icon={<Package className="w-5 h-5" />}>
                <Field label="Observações" value={viewingItem.observacoes} full />
              </Section>
            )}
          </>
        )}
      </ViewModal>

      {/* Lightbox imagem */}
      {lightboxImage && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setLightboxImage(null)}>
          <button onClick={() => setLightboxImage(null)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full">
            <X className="w-6 h-6 text-white" />
          </button>
          <img src={lightboxImage} alt="Romaneio ampliado" className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Modal configurador de colunas */}
      {showColumnConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Configurações de Colunas</h2>
              <button onClick={() => setShowColumnConfig(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-4 pt-3 pb-1">
              <p className="text-xs text-gray-500">Arraste para reordenar. Marque o checkbox para exibir na tabela.</p>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="space-y-1">
                {[...columns].sort((a: any, b: any) => a.order - b.order).map((col: any, idx: number) => (
                  <div
                    key={col.key}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all select-none ${
                      dragIndex === idx ? 'bg-green-50 border-green-300 shadow-md scale-[1.02]' : 'bg-gray-50 border-transparent hover:bg-gray-100'
                    } cursor-grab active:cursor-grabbing`}
                  >
                    <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <input
                      type="checkbox"
                      checked={col.visible}
                      onChange={() => toggleColumn(col.key)}
                      className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500 flex-shrink-0"
                    />
                    <span className={`flex-1 text-sm ${col.visible ? 'font-medium text-gray-800' : 'text-gray-500'}`}>
                      {col.label}
                    </span>
                    <span className="text-xs text-gray-400 w-5 text-center">{idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between gap-2 p-4 border-t">
              <button onClick={() => { saveColumns(DEFAULT_COLUMNS); localStorage.removeItem('romaneios_columns'); toast.success('Colunas restauradas para padrão') }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                Restaurar Padrão
              </button>
              <button onClick={() => setShowColumnConfig(false)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

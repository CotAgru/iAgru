import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

// =============================================================
// iAgru - Utilitários de Importação de Dados
// =============================================================

export interface ImportColumn {
  key: string
  label: string
  required?: boolean
  example?: string
  hint?: string
}

export interface ImportStepConfig {
  id: string
  title: string
  description: string
  icon: string
  columns: ImportColumn[]
  sheetName: string
}

// --- Configurações de cada etapa de importação ---

export const IMPORT_STEPS: ImportStepConfig[] = [
  {
    id: 'cadastros',
    title: 'Cadastros',
    description: 'Produtores, motoristas, transportadoras, fornecedores e locais',
    icon: 'Users',
    sheetName: 'Cadastros',
    columns: [
      { key: 'nome', label: 'Nome *', required: true, example: 'João da Silva', hint: 'Nome completo ou razão social' },
      { key: 'nome_fantasia', label: 'Nome Fantasia', example: 'Fazenda Boa Vista' },
      { key: 'cpf_cnpj', label: 'CPF/CNPJ', example: '123.456.789-00' },
      { key: 'telefone1', label: 'Telefone', example: '(64) 99999-0000' },
      { key: 'uf', label: 'UF *', required: true, example: 'GO', hint: 'Sigla do estado (2 letras)' },
      { key: 'cidade', label: 'Cidade *', required: true, example: 'Catalão' },
      { key: 'tipos', label: 'Tipos *', required: true, example: 'Produtor, Motorista', hint: 'Separar por vírgula: Produtor, Motorista, Transportadora, Fornecedor, Local' },
      { key: 'observacoes', label: 'Observações', example: '' },
    ],
  },
  {
    id: 'produtos',
    title: 'Produtos',
    description: 'Grãos e insumos transportados',
    icon: 'Package',
    sheetName: 'Produtos',
    columns: [
      { key: 'nome', label: 'Nome *', required: true, example: 'Soja em Grão' },
      { key: 'tipo', label: 'Tipo *', required: true, example: 'Grao', hint: 'Grao ou Insumo' },
      { key: 'unidade_medida', label: 'Unidade *', required: true, example: 'ton', hint: 'ton, kg, sc ou l' },
      { key: 'observacoes', label: 'Observações', example: '' },
    ],
  },
  {
    id: 'veiculos',
    title: 'Veículos',
    description: 'Caminhões e carretas da frota',
    icon: 'CarFront',
    sheetName: 'Veiculos',
    columns: [
      { key: 'placa', label: 'Placa *', required: true, example: 'ABC1D23', hint: 'Placa do veículo' },
      { key: 'proprietario', label: 'Proprietário *', required: true, example: 'João da Silva', hint: 'Nome do proprietário (deve existir em Cadastros)' },
      { key: 'tipo_caminhao', label: 'Tipo *', required: true, example: 'Carreta', hint: 'Carreta, Truck, Toco, Bitruck, Rodotrem, Vanderleia, 3/4' },
      { key: 'eixos', label: 'Eixos *', required: true, example: '6' },
      { key: 'peso_pauta_kg', label: 'Peso Pauta (kg) *', required: true, example: '37000' },
      { key: 'marca', label: 'Marca', example: 'Volvo' },
      { key: 'modelo', label: 'Modelo', example: 'FH 540' },
      { key: 'ano', label: 'Ano', example: '2022' },
      { key: 'observacoes', label: 'Observações', example: '' },
    ],
  },
  {
    id: 'precos',
    title: 'Preços Contratados',
    description: 'Tabelas de frete contratadas com fornecedores',
    icon: 'DollarSign',
    sheetName: 'Precos',
    columns: [
      { key: 'origem', label: 'Origem *', required: true, example: 'Fazenda Santa Rita', hint: 'Nome do local de origem (deve existir em Cadastros)' },
      { key: 'destino', label: 'Destino *', required: true, example: 'Cargill Catalão', hint: 'Nome do destino (deve existir em Cadastros)' },
      { key: 'produto', label: 'Produto *', required: true, example: 'Soja em Grão', hint: 'Nome do produto (deve existir em Produtos)' },
      { key: 'fornecedor', label: 'Fornecedor', example: 'Transportes Silva', hint: 'Nome do fornecedor de frete' },
      { key: 'valor', label: 'Valor *', required: true, example: '85,50', hint: 'Valor do frete' },
      { key: 'unidade_preco', label: 'Unidade Preço *', required: true, example: 'R$/ton', hint: 'R$/ton, R$/km ou R$/viagem' },
      { key: 'distancia_km', label: 'Distância (km)', example: '120' },
      { key: 'vigencia_inicio', label: 'Vigência Início', example: '01/01/2025', hint: 'DD/MM/AAAA' },
      { key: 'vigencia_fim', label: 'Vigência Fim', example: '31/12/2025', hint: 'DD/MM/AAAA' },
    ],
  },
  {
    id: 'operacoes',
    title: 'Operações',
    description: 'Operações de colheita/transporte por safra',
    icon: 'FolderOpen',
    sheetName: 'Operacoes',
    columns: [
      { key: 'nome', label: 'Nome *', required: true, example: 'Colheita Soja 24/25', hint: 'Nome descritivo da operação' },
      { key: 'descricao', label: 'Descrição', example: 'Colheita de soja safra 24/25 - Fazenda Santa Rita' },
      { key: 'ano_safra', label: 'Ano Safra *', required: true, example: '24/25', hint: 'Ex: 24/25, 25/26' },
      { key: 'data_inicio', label: 'Data Início', example: '15/02/2025', hint: 'DD/MM/AAAA' },
      { key: 'data_fim', label: 'Data Fim', example: '15/05/2025', hint: 'DD/MM/AAAA' },
      { key: 'status', label: 'Status', example: 'ativa', hint: 'ativa, encerrada ou cancelada' },
    ],
  },
  {
    id: 'ordens',
    title: 'Ordens de Carregamento',
    description: 'Ordens vinculadas a operações',
    icon: 'ClipboardList',
    sheetName: 'Ordens',
    columns: [
      { key: 'operacao', label: 'Operação *', required: true, example: 'Colheita Soja 24/25', hint: 'Nome da operação (deve existir)' },
      { key: 'origem', label: 'Origem *', required: true, example: 'Fazenda Santa Rita', hint: 'Nome do local de origem' },
      { key: 'destino', label: 'Destino *', required: true, example: 'Cargill Catalão', hint: 'Nome do destino' },
      { key: 'produto', label: 'Produto *', required: true, example: 'Soja em Grão' },
      { key: 'nome_ordem', label: 'Nome da Ordem', example: 'Colheita GO SJ 25/26' },
      { key: 'quantidade_prevista', label: 'Qtd Prevista', example: '5000', hint: 'Quantidade prevista em toneladas' },
      { key: 'unidade', label: 'Unidade', example: 'ton', hint: 'ton ou kg' },
      { key: 'status', label: 'Status', example: 'pendente', hint: 'pendente, em_andamento, concluida, cancelada' },
      { key: 'observacoes', label: 'Observações', example: '' },
    ],
  },
  {
    id: 'romaneios',
    title: 'Romaneios',
    description: 'Tickets de pesagem e documentos de frete',
    icon: 'FileText',
    sheetName: 'Romaneios',
    columns: [
      { key: 'ordem', label: 'Ordem', example: 'Colheita GO SJ 25/26', hint: 'Nome da ordem de carregamento' },
      { key: 'operacao', label: 'Operação', example: 'Colheita Soja 24/25', hint: 'Nome da operação' },
      { key: 'ano_safra', label: 'Ano Safra', example: '24/25' },
      { key: 'produtor', label: 'Produtor', example: 'Pedro Henrique Braga Costa' },
      { key: 'produto', label: 'Produto', example: 'Soja em Grão' },
      { key: 'origem', label: 'Origem', example: 'Fazenda Santa Rita' },
      { key: 'destino', label: 'Destino', example: 'Cargill Catalão' },
      { key: 'placa', label: 'Placa *', required: true, example: 'ABC1D23' },
      { key: 'motorista', label: 'Motorista', example: 'José Santos' },
      { key: 'transportadora', label: 'Transportadora', example: 'Transportes Silva' },
      { key: 'numero_ticket', label: 'Nº Ticket *', required: true, example: '14102' },
      { key: 'data_saida_origem', label: 'Data Saída Origem', example: '01/03/2026', hint: 'DD/MM/AAAA' },
      { key: 'data_entrada_destino', label: 'Data Entrada Destino', example: '01/03/2026', hint: 'DD/MM/AAAA' },
      { key: 'peso_bruto', label: 'Peso Bruto (kg) *', required: true, example: '46780' },
      { key: 'tara', label: 'Tara (kg) *', required: true, example: '14102' },
      { key: 'peso_liquido', label: 'Peso Líquido (kg)', example: '32678', hint: 'Se vazio, calcula: bruto - tara' },
      { key: 'umidade_perc', label: 'Umidade (%)', example: '13,5' },
      { key: 'impureza_perc', label: 'Impureza (%)', example: '1,2' },
      { key: 'avariados_perc', label: 'Avariados (%)', example: '0' },
      { key: 'ardidos_perc', label: 'Ardidos (%)', example: '0' },
      { key: 'desconto_kg', label: 'Desconto (kg)', example: '500' },
      { key: 'peso_corrigido', label: 'Peso Corrigido (kg)', example: '32178', hint: 'Se vazio, calcula: líquido - desconto' },
      { key: 'nfe_numero', label: 'NFe Número', example: '123456' },
      { key: 'nfe_serie', label: 'NFe Série', example: '1' },
      { key: 'observacoes', label: 'Observações', example: '' },
    ],
  },
]

// --- Gerar planilha template para download ---

export function downloadTemplate(step: ImportStepConfig) {
  const headers = step.columns.map(c => c.label)
  const examples = step.columns.map(c => c.example || '')
  const hints = step.columns.map(c => c.hint || '')

  const ws = XLSX.utils.aoa_to_sheet([
    headers,
    hints,   // Linha 2 = dicas
    examples // Linha 3 = exemplo
  ])

  // Largura das colunas
  ws['!cols'] = step.columns.map(c => ({
    wch: Math.max(c.label.length, (c.example || '').length, (c.hint || '').length, 15) + 2
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, step.sheetName)

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  saveAs(blob, `template_${step.id}_fretagru.xlsx`)
}

// --- Ler planilha importada ---

export function parseExcelFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { raw: false })
        // Remover linhas de dicas/exemplo (se existirem)
        const filtered = json.filter(row => {
          const firstVal = Object.values(row)[0]
          if (!firstVal) return false
          // Se a primeira coluna parece ser uma dica (começa com hint), pula
          if (typeof firstVal === 'string' && (firstVal.startsWith('Nome completo') || firstVal.startsWith('Ex:') || firstVal === '')) return false
          return true
        })
        resolve(filtered)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// --- Mapear cabeçalhos da planilha para keys do sistema ---

export function mapHeaders(rows: Record<string, string>[], step: ImportStepConfig): Record<string, any>[] {
  // Criar mapa label → key
  const labelToKey: Record<string, string> = {}
  step.columns.forEach(col => {
    labelToKey[col.label.toLowerCase().replace(/\s*\*\s*$/, '').trim()] = col.key
    labelToKey[col.key.toLowerCase()] = col.key
    // Sem asterisco
    labelToKey[col.label.toLowerCase().replace(' *', '').trim()] = col.key
  })

  return rows.map(row => {
    const mapped: Record<string, any> = {}
    Object.entries(row).forEach(([header, value]) => {
      const normalizedHeader = header.toLowerCase().replace(/\s*\*\s*$/, '').trim()
      const key = labelToKey[normalizedHeader]
      if (key && value != null && String(value).trim() !== '') {
        mapped[key] = String(value).trim()
      }
    })
    return mapped
  }).filter(row => Object.keys(row).length > 0)
}

// --- Validar dados importados ---

export interface ValidationError {
  row: number
  field: string
  message: string
}

export function validateRows(rows: Record<string, any>[], step: ImportStepConfig): ValidationError[] {
  const errors: ValidationError[] = []
  const requiredFields = step.columns.filter(c => c.required)

  rows.forEach((row, index) => {
    requiredFields.forEach(field => {
      if (!row[field.key] || String(row[field.key]).trim() === '') {
        errors.push({
          row: index + 1,
          field: field.label,
          message: `Campo obrigatório "${field.label}" não preenchido`
        })
      }
    })

    // Validações específicas por tipo de step
    if (step.id === 'cadastros') {
      if (row.uf && row.uf.length !== 2) {
        errors.push({ row: index + 1, field: 'UF', message: 'UF deve ter exatamente 2 letras' })
      }
    }

    if (step.id === 'veiculos') {
      if (row.eixos && isNaN(Number(row.eixos))) {
        errors.push({ row: index + 1, field: 'Eixos', message: 'Eixos deve ser um número' })
      }
      if (row.peso_pauta_kg && isNaN(parseNumber(row.peso_pauta_kg))) {
        errors.push({ row: index + 1, field: 'Peso Pauta', message: 'Peso pauta deve ser um número' })
      }
    }

    if (step.id === 'romaneios') {
      if (row.peso_bruto && isNaN(parseNumber(row.peso_bruto))) {
        errors.push({ row: index + 1, field: 'Peso Bruto', message: 'Peso bruto deve ser um número' })
      }
      if (row.tara && isNaN(parseNumber(row.tara))) {
        errors.push({ row: index + 1, field: 'Tara', message: 'Tara deve ser um número' })
      }
    }
  })

  return errors
}

// --- Helpers de parse ---

/** Parse número no formato BR (1.234,56) ou EN (1234.56) → number */
export function parseNumber(v: string | number | null | undefined): number {
  if (v == null || v === '') return NaN
  if (typeof v === 'number') return v
  const s = String(v).trim()
  // Se tem vírgula como decimal (BR)
  if (s.includes(',')) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.'))
  }
  return parseFloat(s)
}

/** Parse data DD/MM/AAAA → YYYY-MM-DD */
export function parseDateBR(v: string | null | undefined): string | null {
  if (!v) return null
  const s = String(v).trim()
  // Já no formato ISO?
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10)
  // DD/MM/AAAA
  const match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (match) {
    const [, d, m, y] = match
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

/** Resolver nome de cadastro → ID, criando se necessário */
export async function resolveOrCreate(
  supabase: any,
  table: string,
  nameField: string,
  name: string,
  existingData: any[],
  extraFields?: Record<string, any>
): Promise<string | null> {
  if (!name) return null
  const normalizedName = name.trim().toLowerCase()

  // Procurar no cache local
  const found = existingData.find((item: any) => {
    const n1 = (item.nome || '').trim().toLowerCase()
    const n2 = (item.nome_fantasia || '').trim().toLowerCase()
    return n1 === normalizedName || n2 === normalizedName
      || n1.includes(normalizedName) || normalizedName.includes(n1)
      || (n2 && (n2.includes(normalizedName) || normalizedName.includes(n2)))
  })

  if (found) return found.id

  return null // Não encontrou - será tratado no UI
}

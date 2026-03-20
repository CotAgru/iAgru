import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, Download, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft, FileSpreadsheet, Trash2, Eye, Loader2, Users, Package, CarFront, DollarSign, FolderOpen, ClipboardList, FileText, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { IMPORT_STEPS, downloadTemplate, parseExcelFile, mapHeaders, validateRows, parseNumber, parseDateBR } from '../utils/importHelpers'
import type { ImportStepConfig, ValidationError } from '../utils/importHelpers'

const STEP_ICONS: Record<string, any> = {
  Users, Package, CarFront, DollarSign, FolderOpen, ClipboardList, FileText
}

interface StepState {
  status: 'pending' | 'uploaded' | 'validated' | 'importing' | 'done' | 'error'
  data: Record<string, any>[]
  errors: ValidationError[]
  fileName?: string
  importedCount?: number
}

export default function Importacao() {
  const [activeStep, setActiveStep] = useState(0)
  const [stepStates, setStepStates] = useState<Record<string, StepState>>(() => {
    const initial: Record<string, StepState> = {}
    IMPORT_STEPS.forEach(s => {
      initial[s.id] = { status: 'pending', data: [], errors: [] }
    })
    return initial
  })
  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentStep = IMPORT_STEPS[activeStep]
  const currentState = stepStates[currentStep.id]

  const updateStep = useCallback((stepId: string, update: Partial<StepState>) => {
    setStepStates(prev => ({ ...prev, [stepId]: { ...prev[stepId], ...update } }))
  }, [])

  // --- Upload de arquivo ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const rawRows = await parseExcelFile(file)
      const mappedRows = mapHeaders(rawRows, currentStep)

      if (mappedRows.length === 0) {
        toast.error('Planilha vazia ou colunas não reconhecidas')
        return
      }

      const errors = validateRows(mappedRows, currentStep)

      updateStep(currentStep.id, {
        status: errors.length > 0 ? 'uploaded' : 'validated',
        data: mappedRows,
        errors,
        fileName: file.name,
      })

      setShowPreview(true)

      if (errors.length > 0) {
        toast.error(`${errors.length} erro(s) encontrado(s). Corrija a planilha e reimporte.`)
      } else {
        toast.success(`${mappedRows.length} registro(s) carregados com sucesso!`)
      }
    } catch (err: any) {
      toast.error('Erro ao ler arquivo: ' + (err.message || 'formato inválido'))
    }

    // Limpar input para permitir reimportação do mesmo arquivo
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // --- Importar dados no Supabase ---
  const handleImport = async () => {
    if (currentState.errors.length > 0) {
      toast.error('Corrija os erros antes de importar')
      return
    }

    updateStep(currentStep.id, { status: 'importing' })

    try {
      let count = 0

      switch (currentStep.id) {
        case 'cadastros':
          count = await importCadastros(currentState.data)
          break
        case 'produtos':
          count = await importProdutos(currentState.data)
          break
        case 'veiculos':
          count = await importVeiculos(currentState.data)
          break
        case 'precos':
          count = await importPrecos(currentState.data)
          break
        case 'operacoes':
          count = await importOperacoes(currentState.data)
          break
        case 'ordens':
          count = await importOrdens(currentState.data)
          break
        case 'romaneios':
          count = await importRomaneios(currentState.data)
          break
      }

      updateStep(currentStep.id, { status: 'done', importedCount: count })
      toast.success(`${count} registro(s) importados com sucesso!`)
    } catch (err: any) {
      updateStep(currentStep.id, { status: 'error' })
      toast.error('Erro na importação: ' + (err.message || 'erro desconhecido'))
    }
  }

  // --- Funções de importação por entidade ---

  async function importCadastros(rows: Record<string, any>[]) {
    let count = 0
    for (const row of rows) {
      const tipos = row.tipos
        ? row.tipos.split(',').map((t: string) => t.trim()).filter(Boolean)
        : ['Local']

      const { error } = await supabase.from('cadastros').insert({
        nome: row.nome,
        nome_fantasia: row.nome_fantasia || null,
        cpf_cnpj: row.cpf_cnpj || null,
        telefone1: row.telefone1 || null,
        uf: (row.uf || 'GO').toUpperCase(),
        cidade: row.cidade || 'Não informada',
        tipos,
        observacoes: row.observacoes || null,
        ativo: true,
      })
      if (error) throw error
      count++
    }
    return count
  }

  async function importProdutos(rows: Record<string, any>[]) {
    let count = 0
    for (const row of rows) {
      const { error } = await supabase.from('produtos').insert({
        nome: row.nome,
        tipo: row.tipo || 'Grao',
        unidade_medida: row.unidade_medida || 'ton',
        observacoes: row.observacoes || null,
        ativo: true,
      })
      if (error) throw error
      count++
    }
    return count
  }

  async function importVeiculos(rows: Record<string, any>[]) {
    // Buscar cadastros existentes para resolver proprietário
    const { data: cadastros } = await supabase.from('cadastros').select('id, nome, nome_fantasia')
    let count = 0

    for (const row of rows) {
      const propName = (row.proprietario || '').trim().toLowerCase()
      const prop = cadastros?.find((c: any) => {
        const n1 = (c.nome || '').toLowerCase()
        const n2 = (c.nome_fantasia || '').toLowerCase()
        return n1 === propName || n2 === propName || n1.includes(propName) || propName.includes(n1)
      })

      if (!prop) {
        throw new Error(`Proprietário "${row.proprietario}" não encontrado em Cadastros. Importe cadastros primeiro.`)
      }

      const { error } = await supabase.from('veiculos').insert({
        placa: (row.placa || '').toUpperCase().trim(),
        cadastro_id: prop.id,
        tipo_caminhao: row.tipo_caminhao || 'Carreta',
        eixos: Number(row.eixos) || 6,
        peso_pauta_kg: parseNumber(row.peso_pauta_kg) || 37000,
        marca: row.marca || null,
        modelo: row.modelo || null,
        ano: row.ano ? Number(row.ano) : null,
        observacoes: row.observacoes || null,
        ativo: true,
      })
      if (error) throw error
      count++
    }
    return count
  }

  async function importPrecos(rows: Record<string, any>[]) {
    const { data: cadastros } = await supabase.from('cadastros').select('id, nome, nome_fantasia')
    const { data: produtos } = await supabase.from('produtos').select('id, nome')
    let count = 0

    for (const row of rows) {
      const findCad = (name: string) => {
        const n = (name || '').trim().toLowerCase()
        return cadastros?.find((c: any) =>
          (c.nome || '').toLowerCase() === n ||
          (c.nome_fantasia || '').toLowerCase() === n ||
          (c.nome || '').toLowerCase().includes(n) ||
          n.includes((c.nome || '').toLowerCase())
        )
      }

      const origem = findCad(row.origem)
      const destino = findCad(row.destino)
      const produto = produtos?.find((p: any) => (p.nome || '').toLowerCase() === (row.produto || '').trim().toLowerCase())
      const fornecedor = row.fornecedor ? findCad(row.fornecedor) : null

      if (!origem) throw new Error(`Origem "${row.origem}" não encontrada em Cadastros`)
      if (!destino) throw new Error(`Destino "${row.destino}" não encontrado em Cadastros`)
      if (!produto) throw new Error(`Produto "${row.produto}" não encontrado em Produtos`)

      const { error } = await supabase.from('precos_contratados').insert({
        origem_id: origem.id,
        destino_id: destino.id,
        produto_id: produto.id,
        fornecedor_id: fornecedor?.id || null,
        valor: parseNumber(row.valor),
        unidade_preco: row.unidade_preco || 'R$/ton',
        distancia_km: row.distancia_km ? parseNumber(row.distancia_km) : null,
        vigencia_inicio: parseDateBR(row.vigencia_inicio),
        vigencia_fim: parseDateBR(row.vigencia_fim),
        ativo: true,
      })
      if (error) throw error
      count++
    }
    return count
  }

  async function importOperacoes(rows: Record<string, any>[]) {
    const { data: safras } = await supabase.from('ano_safra').select('id, nome')
    let count = 0

    for (const row of rows) {
      const safra = safras?.find((s: any) => s.nome === (row.ano_safra || '').trim())

      const { error } = await supabase.from('operacoes').insert({
        nome: row.nome,
        descricao: row.descricao || null,
        ano_safra_id: safra?.id || null,
        data_inicio: parseDateBR(row.data_inicio),
        data_fim: parseDateBR(row.data_fim),
        status: row.status || 'ativa',
        ativo: true,
      })
      if (error) throw error
      count++
    }
    return count
  }

  async function importOrdens(rows: Record<string, any>[]) {
    const { data: cadastros } = await supabase.from('cadastros').select('id, nome, nome_fantasia')
    const { data: produtos } = await supabase.from('produtos').select('id, nome')
    const { data: operacoes } = await supabase.from('operacoes').select('id, nome')
    let count = 0

    for (const row of rows) {
      const findCad = (name: string) => {
        const n = (name || '').trim().toLowerCase()
        return cadastros?.find((c: any) =>
          (c.nome || '').toLowerCase() === n || (c.nome_fantasia || '').toLowerCase() === n ||
          (c.nome || '').toLowerCase().includes(n) || n.includes((c.nome || '').toLowerCase())
        )
      }

      const operacao = operacoes?.find((o: any) => (o.nome || '').toLowerCase() === (row.operacao || '').trim().toLowerCase())
      const origem = findCad(row.origem)
      const destino = findCad(row.destino)
      const produto = produtos?.find((p: any) => (p.nome || '').toLowerCase() === (row.produto || '').trim().toLowerCase())

      if (!operacao) throw new Error(`Operação "${row.operacao}" não encontrada`)
      if (!origem) throw new Error(`Origem "${row.origem}" não encontrada em Cadastros`)
      if (!destino) throw new Error(`Destino "${row.destino}" não encontrado em Cadastros`)
      if (!produto) throw new Error(`Produto "${row.produto}" não encontrado em Produtos`)

      const { error } = await supabase.from('ordens_carregamento').insert({
        operacao_id: operacao.id,
        origem_id: origem.id,
        destino_id: destino.id,
        produto_id: produto.id,
        nome_ordem: row.nome_ordem || null,
        quantidade_prevista: row.quantidade_prevista ? parseNumber(row.quantidade_prevista) : null,
        unidade: row.unidade || 'ton',
        status: row.status || 'pendente',
        observacoes: row.observacoes || null,
        ativo: true,
      })
      if (error) throw error
      count++
    }
    return count
  }

  async function importRomaneios(rows: Record<string, any>[]) {
    const { data: cadastros } = await supabase.from('cadastros').select('id, nome, nome_fantasia, tipos')
    const { data: produtos } = await supabase.from('produtos').select('id, nome')
    const { data: veiculos } = await supabase.from('veiculos').select('id, placa')
    const { data: ordens } = await supabase.from('ordens_carregamento').select('id, nome_ordem, numero_ordem_fmt')
    const { data: operacoes } = await supabase.from('operacoes').select('id, nome')
    const { data: safras } = await supabase.from('ano_safra').select('id, nome')
    let count = 0

    for (const row of rows) {
      const findCad = (name: string, tipo?: string) => {
        if (!name) return null
        const n = name.trim().toLowerCase()
        return cadastros?.find((c: any) => {
          const match = (c.nome || '').toLowerCase() === n ||
            (c.nome_fantasia || '').toLowerCase() === n ||
            (c.nome || '').toLowerCase().includes(n) ||
            n.includes((c.nome || '').toLowerCase())
          if (!match) return false
          if (tipo) return (c.tipos || []).includes(tipo)
          return true
        })
      }

      const ordem = row.ordem
        ? ordens?.find((o: any) =>
            (o.nome_ordem || '').toLowerCase() === row.ordem.trim().toLowerCase() ||
            (o.numero_ordem_fmt || '').toLowerCase() === row.ordem.trim().toLowerCase()
          )
        : null

      const operacao = row.operacao
        ? operacoes?.find((o: any) => (o.nome || '').toLowerCase() === row.operacao.trim().toLowerCase())
        : null

      const safra = row.ano_safra
        ? safras?.find((s: any) => s.nome === row.ano_safra.trim())
        : null

      const veiculo = row.placa
        ? veiculos?.find((v: any) => v.placa.toUpperCase() === row.placa.trim().toUpperCase())
        : null

      const produtor = findCad(row.produtor, 'Produtor')
      const produto = row.produto
        ? produtos?.find((p: any) => (p.nome || '').toLowerCase() === row.produto.trim().toLowerCase())
        : null
      const motorista = findCad(row.motorista, 'Motorista')
      const transportadora = findCad(row.transportadora, 'Transportadora')
      const origem = findCad(row.origem)
      const destino = findCad(row.destino)

      const pesoBruto = parseNumber(row.peso_bruto) || 0
      const tara = parseNumber(row.tara) || 0
      const pesoLiquido = row.peso_liquido ? parseNumber(row.peso_liquido) : (pesoBruto - tara)
      const descontoKg = row.desconto_kg ? parseNumber(row.desconto_kg) : 0
      const pesoCorrigido = row.peso_corrigido ? parseNumber(row.peso_corrigido) : (pesoLiquido - descontoKg)

      const { error } = await supabase.from('romaneios').insert({
        ordem_id: ordem?.id || null,
        operacao_id: operacao?.id || null,
        ano_safra_id: safra?.id || null,
        produtor_id: produtor?.id || null,
        produtor: row.produtor || null,
        produto_id: produto?.id || null,
        produto: row.produto || null,
        origem_id: origem?.id || null,
        destinatario_id: destino?.id || null,
        fornecedor_destinatario: row.destino || null,
        veiculo_id: veiculo?.id || null,
        placa: row.placa || null,
        motorista_id: motorista?.id || null,
        motorista: row.motorista || null,
        transportadora_id: transportadora?.id || null,
        transportadora: row.transportadora || null,
        numero_ticket: row.numero_ticket || null,
        data_saida_origem: parseDateBR(row.data_saida_origem) || row.data_saida_origem || null,
        data_entrada_destino: parseDateBR(row.data_entrada_destino) || row.data_entrada_destino || null,
        peso_bruto: pesoBruto || null,
        tara: tara || null,
        peso_liquido: pesoLiquido || null,
        umidade_perc: row.umidade_perc ? parseNumber(row.umidade_perc) : null,
        impureza_perc: row.impureza_perc ? parseNumber(row.impureza_perc) : null,
        avariados_perc: row.avariados_perc ? parseNumber(row.avariados_perc) : null,
        ardidos_perc: row.ardidos_perc ? parseNumber(row.ardidos_perc) : null,
        desconto_kg: descontoKg || null,
        peso_corrigido: pesoCorrigido || null,
        nfe_numero: row.nfe_numero || null,
        nfe_serie: row.nfe_serie || null,
        observacoes: row.observacoes || null,
        ativo: true,
      })
      if (error) throw error
      count++
    }
    return count
  }

  // --- Limpar dados do step ---
  const handleClear = () => {
    updateStep(currentStep.id, { status: 'pending', data: [], errors: [], fileName: undefined, importedCount: undefined })
    setShowPreview(false)
  }

  // --- Contagem de steps concluídos ---
  const completedSteps = IMPORT_STEPS.filter(s => stepStates[s.id].status === 'done').length
  const Icon = STEP_ICONS[currentStep.icon] || FileText

  return (
    <div className="max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Importação de Dados</h1>
          <p className="text-sm text-gray-500 mt-1">Importe fretes das últimas safras em etapas</p>
        </div>
        <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
          {completedSteps}/{IMPORT_STEPS.length} etapas concluídas
        </div>
      </div>

      {/* Wizard Steps - horizontal em desktop, vertical em mobile */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        {/* Step Navigator */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-3 bg-green-50 border-b border-green-100">
              <p className="text-sm font-semibold text-green-800">Etapas de Importação</p>
            </div>
            <div className="divide-y divide-gray-100">
              {IMPORT_STEPS.map((step, idx) => {
                const state = stepStates[step.id]
                const StepIcon = STEP_ICONS[step.icon] || FileText
                const isActive = idx === activeStep
                return (
                  <button
                    key={step.id}
                    onClick={() => { setActiveStep(idx); setShowPreview(false) }}
                    className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-colors ${
                      isActive ? 'bg-green-50 border-l-4 border-green-600' : 'hover:bg-gray-50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      state.status === 'done' ? 'bg-green-100 text-green-600' :
                      state.status === 'error' ? 'bg-red-100 text-red-600' :
                      isActive ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {state.status === 'done' ? <CheckCircle2 className="w-4 h-4" /> :
                       state.status === 'error' ? <AlertCircle className="w-4 h-4" /> :
                       <StepIcon className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${isActive ? 'text-green-800' : 'text-gray-700'}`}>
                        {idx + 1}. {step.title}
                      </p>
                      {state.status === 'done' && (
                        <p className="text-xs text-green-600">{state.importedCount} importados</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    Etapa {activeStep + 1}: {currentStep.title}
                  </h2>
                  <p className="text-sm text-gray-500">{currentStep.description}</p>
                </div>
              </div>

              {/* Status badge */}
              {currentState.status !== 'pending' && (
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mt-2 ${
                  currentState.status === 'done' ? 'bg-green-100 text-green-700' :
                  currentState.status === 'error' ? 'bg-red-100 text-red-700' :
                  currentState.status === 'importing' ? 'bg-blue-100 text-blue-700' :
                  currentState.status === 'validated' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {currentState.status === 'done' && <><CheckCircle2 className="w-3 h-3" /> {currentState.importedCount} registros importados</>}
                  {currentState.status === 'error' && <><AlertCircle className="w-3 h-3" /> Erro na importação</>}
                  {currentState.status === 'importing' && <><Loader2 className="w-3 h-3 animate-spin" /> Importando...</>}
                  {currentState.status === 'validated' && <><CheckCircle2 className="w-3 h-3" /> {currentState.data.length} registros prontos</>}
                  {currentState.status === 'uploaded' && <><AlertCircle className="w-3 h-3" /> {currentState.errors.length} erro(s) encontrado(s)</>}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 sm:p-6">
              {currentState.status === 'done' ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-800">Importação concluída!</h3>
                  <p className="text-sm text-gray-500 mt-1">{currentState.importedCount} registro(s) de {currentStep.title} importados</p>
                  <div className="flex gap-3 justify-center mt-4">
                    <button onClick={handleClear} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                      Reimportar
                    </button>
                    {activeStep < IMPORT_STEPS.length - 1 && (
                      <button
                        onClick={() => { setActiveStep(prev => prev + 1); setShowPreview(false) }}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Próxima etapa <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Download Template + Upload */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    {/* Download Template */}
                    <button
                      onClick={() => downloadTemplate(currentStep)}
                      className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-green-300 rounded-xl hover:bg-green-50 hover:border-green-400 transition-colors group"
                    >
                      <Download className="w-8 h-8 text-green-500 group-hover:text-green-600" />
                      <span className="text-sm font-medium text-green-700">Baixar Planilha Modelo</span>
                      <span className="text-xs text-gray-500">Preencha e importe de volta</span>
                    </button>

                    {/* Upload */}
                    <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-blue-300 rounded-xl hover:bg-blue-50 hover:border-blue-400 transition-colors cursor-pointer group">
                      <Upload className="w-8 h-8 text-blue-500 group-hover:text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">Importar Planilha</span>
                      <span className="text-xs text-gray-500">
                        {currentState.fileName || 'Clique ou arraste o arquivo .xlsx'}
                      </span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Colunas esperadas */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Colunas da planilha:</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {currentStep.columns.map(col => (
                        <span
                          key={col.key}
                          className={`px-2 py-1 rounded text-xs ${
                            col.required ? 'bg-green-100 text-green-700 font-medium' : 'bg-gray-100 text-gray-600'
                          }`}
                          title={col.hint}
                        >
                          {col.label}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">* campos obrigatórios em verde</p>
                  </div>

                  {/* Erros de validação */}
                  {currentState.errors.length > 0 && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" />
                        {currentState.errors.length} erro(s) de validação
                      </h4>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {currentState.errors.slice(0, 20).map((err, i) => (
                          <p key={i} className="text-xs text-red-600">
                            Linha {err.row}: {err.message}
                          </p>
                        ))}
                        {currentState.errors.length > 20 && (
                          <p className="text-xs text-red-500 font-medium">
                            ... e mais {currentState.errors.length - 20} erros
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Preview da planilha */}
                  {currentState.data.length > 0 && showPreview && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-700">
                          Pré-visualização ({currentState.data.length} linhas)
                        </h4>
                        <div className="flex gap-2">
                          <button onClick={() => setShowPreview(false)} className="text-xs text-gray-500 hover:text-gray-700">
                            Ocultar
                          </button>
                          <button onClick={handleClear} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
                            <Trash2 className="w-3 h-3" /> Limpar
                          </button>
                        </div>
                      </div>
                      <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                        <table className="w-full text-xs min-w-[600px]">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-2 py-2 text-left font-semibold text-gray-600">#</th>
                              {currentStep.columns.map(col => (
                                <th key={col.key} className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">
                                  {col.label.replace(' *', '')}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {currentState.data.slice(0, 50).map((row, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-2 py-1.5 text-gray-400">{idx + 1}</td>
                                {currentStep.columns.map(col => (
                                  <td key={col.key} className="px-2 py-1.5 text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                                    {row[col.key] || <span className="text-gray-300">—</span>}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {currentState.data.length > 50 && (
                        <p className="text-xs text-gray-400 mt-1">Mostrando 50 de {currentState.data.length} linhas</p>
                      )}
                    </div>
                  )}

                  {/* Preview toggle se dados carregados mas preview oculta */}
                  {currentState.data.length > 0 && !showPreview && (
                    <button
                      onClick={() => setShowPreview(true)}
                      className="mb-4 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Eye className="w-4 h-4" /> Ver {currentState.data.length} registros carregados
                    </button>
                  )}

                  {/* Botão de importar */}
                  {currentState.data.length > 0 && currentState.errors.length === 0 && currentState.status !== 'importing' && (
                    <button
                      onClick={handleImport}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                      <FileSpreadsheet className="w-5 h-5" />
                      Confirmar Importação ({currentState.data.length} registros)
                    </button>
                  )}

                  {currentState.status === 'importing' && (
                    <div className="flex items-center gap-3 text-blue-600">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm font-medium">Importando dados... aguarde</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-4">
            <button
              disabled={activeStep === 0}
              onClick={() => { setActiveStep(prev => prev - 1); setShowPreview(false) }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <span className="text-sm text-gray-400 self-center">
              Etapa {activeStep + 1} de {IMPORT_STEPS.length}
            </span>
            <button
              disabled={activeStep === IMPORT_STEPS.length - 1}
              onClick={() => { setActiveStep(prev => prev + 1); setShowPreview(false) }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Próxima <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

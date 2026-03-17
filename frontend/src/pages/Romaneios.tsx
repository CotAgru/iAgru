import { useEffect, useState, useRef } from 'react'
import { Plus, Pencil, Trash2, X, Camera, Upload, Loader2, FileText, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { getRomaneios, createRomaneio, updateRomaneio, deleteRomaneio, getOrdens, getOperacoes, getCadastros, getVeiculos, getProdutos, getTiposNf, getTiposTicket, getAnosSafra } from '../services/api'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''

// Formatação numérica: 14.000 / 1.000
const fmtNum = (v: string | number | null) => {
  if (v === null || v === undefined || v === '') return ''
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (isNaN(n)) return ''
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
}
// Parse de string formatada para number string
const parseNum = (v: string) => v.replace(/\./g, '').replace(',', '.')

const emptyForm = {
  operacao_id: '', ordem_id: '',
  numero_ticket: '', tipo_ticket_id: '', nfe_numero: '', tipo_nf_id: '', data_emissao: '',
  origem_id: '', destinatario_id: '', produtor_id: '', cnpj_cpf: '',
  produto_id: '', veiculo_id: '', motorista_id: '', transportadora_id: '', ano_safra_id: '',
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
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const load = () => {
    setLoading(true)
    Promise.all([getRomaneios(), getOrdens(), getOperacoes(), getCadastros(), getVeiculos(), getProdutos(), getTiposNf(), getTiposTicket(), getAnosSafra()])
      .then(([r, o, ops, cad, veic, prod, tnf, tt, as_]) => {
        setItems(r); setOrdens(o); setOperacoes(ops); setCadastros(cad)
        setVeiculos(veic); setProdutos(prod); setTiposNf(tnf); setTiposTicket(tt); setAnosSafra(as_)
      })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  // Listas filtradas
  const produtoresList = cadastros.filter((c: any) => (c.tipos || []).includes('Produtor'))
  const motoristasList = cadastros.filter((c: any) => (c.tipos || []).includes('Motorista'))
  const transportadorasList = cadastros.filter((c: any) => (c.tipos || []).includes('Transportadora'))
  const origensList = cadastros.filter((c: any) => (c.tipos || []).some((t: string) => ['Fazenda','Armazem','Industria','Porto','Fornecedor'].includes(t)))

  const openNew = () => { setEditing(null); setForm(emptyForm); setImagePreview(null); setShowForm(true) }
  const openEdit = (item: any) => {
    setEditing(item)
    setForm({
      operacao_id: item.operacao_id || '', ordem_id: item.ordem_id || '',
      numero_ticket: item.numero_ticket || '', tipo_ticket_id: item.tipo_ticket_id || '',
      nfe_numero: item.nfe_numero || '', tipo_nf_id: item.tipo_nf_id || '',
      data_emissao: item.data_emissao || '',
      origem_id: item.origem_id || '', destinatario_id: item.destinatario_id || '',
      produtor_id: item.produtor_id || '', cnpj_cpf: item.cnpj_cpf || '',
      produto_id: item.produto_id || '', veiculo_id: item.veiculo_id || '',
      motorista_id: item.motorista_id || '', transportadora_id: item.transportadora_id || '',
      ano_safra_id: item.ano_safra_id || '',
      peso_bruto: item.peso_bruto?.toString() || '', tara: item.tara?.toString() || '',
      peso_liquido: item.peso_liquido?.toString() || '',
      umidade_perc: item.umidade_perc?.toString() || '', impureza_perc: item.impureza_perc?.toString() || '',
      avariados_perc: item.avariados_perc?.toString() || '', ardidos_perc: item.ardidos_perc?.toString() || '',
      esverdeados_perc: item.esverdeados_perc?.toString() || '', partidos_perc: item.partidos_perc?.toString() || '',
      quebrados_perc: item.quebrados_perc?.toString() || '',
      umidade_desc: item.umidade_desc?.toString() || '', impureza_desc: item.impureza_desc?.toString() || '',
      avariados_desc: item.avariados_desc?.toString() || '', ardidos_desc: item.ardidos_desc?.toString() || '',
      esverdeados_desc: item.esverdeados_desc?.toString() || '', partidos_desc: item.partidos_desc?.toString() || '',
      quebrados_desc: item.quebrados_desc?.toString() || '',
      desconto_kg: item.desconto_kg?.toString() || '', peso_corrigido: item.peso_corrigido?.toString() || '',
      transgenia: item.transgenia || '', observacoes: item.observacoes || '', ativo: item.ativo,
    })
    setImagePreview(item.imagem_url || null)
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

  // Auto-preencher Operação → Ano Safra
  const handleOperacaoChange = (opId: string) => {
    const op = operacoes.find((o: any) => o.id === opId)
    const updates: any = { operacao_id: opId, ordem_id: '' }
    if (op?.ano_safra_id) updates.ano_safra_id = op.ano_safra_id
    setForm(prev => ({ ...prev, ...updates }))
  }

  // Cálculo automático descontos
  const calcDescontoTotal = (f: typeof form) => {
    const descs = [f.umidade_desc, f.impureza_desc, f.avariados_desc, f.ardidos_desc, f.esverdeados_desc, f.partidos_desc, f.quebrados_desc]
    return descs.reduce((sum, d) => sum + (d ? parseFloat(d) || 0 : 0), 0)
  }
  const calcPesoCorrigido = (f: typeof form) => {
    const pl = parseFloat(f.peso_liquido) || 0
    const dt = calcDescontoTotal(f)
    return pl > 0 ? (pl - dt) : 0
  }
  const updateDescField = (field: string, value: string) => {
    const next = { ...form, [field]: value }
    const dt = calcDescontoTotal(next)
    const pc = parseFloat(next.peso_liquido) || 0
    setForm({ ...next, desconto_kg: dt > 0 ? dt.toString() : '', peso_corrigido: pc > 0 ? (pc - dt).toString() : '' })
  }

  const handleImageSelect = async (file: File) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string)
      setImagePreview(base64)
      if (GEMINI_API_KEY) { await processOCR(base64) }
      else { toast('Defina VITE_GEMINI_API_KEY para OCR automático', { icon: 'ℹ️' }) }
    }
    reader.readAsDataURL(file)
  }

  const processOCR = async (base64Image: string) => {
    setOcrLoading(true)
    try {
      const base64Data = base64Image.split(',')[1]
      const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/jpeg'
      const prompt = `Analise esta imagem de um romaneio/ticket de pesagem agrícola brasileiro.
Extraia os seguintes campos e retorne APENAS um JSON válido (sem markdown, sem comentários):
{
  "numero_ticket": "",
  "data_emissao": "YYYY-MM-DD",
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
Use 0 para campos numéricos não encontrados e "" para textos. Pesos em KG.`
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Data } }] }] }) }
      )
      const data = await resp.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const p = JSON.parse(jsonMatch[0])
        setForm(prev => ({
          ...prev,
          numero_ticket: p.numero_ticket || prev.numero_ticket,
          data_emissao: p.data_emissao || prev.data_emissao,
          cnpj_cpf: p.cnpj_cpf || prev.cnpj_cpf,
          nfe_numero: p.nfe_numero || prev.nfe_numero,
          peso_bruto: p.peso_bruto ? p.peso_bruto.toString() : prev.peso_bruto,
          tara: p.tara ? p.tara.toString() : prev.tara,
          peso_liquido: p.peso_liquido ? p.peso_liquido.toString() : prev.peso_liquido,
          umidade_perc: p.umidade_perc ? p.umidade_perc.toString() : prev.umidade_perc,
          impureza_perc: p.impureza_perc ? p.impureza_perc.toString() : prev.impureza_perc,
          avariados_perc: p.avariados_perc ? p.avariados_perc.toString() : prev.avariados_perc,
          ardidos_perc: p.ardidos_perc ? p.ardidos_perc.toString() : prev.ardidos_perc,
          esverdeados_perc: p.esverdeados_perc ? p.esverdeados_perc.toString() : prev.esverdeados_perc,
          partidos_perc: p.partidos_perc ? p.partidos_perc.toString() : prev.partidos_perc,
          quebrados_perc: p.quebrados_perc ? p.quebrados_perc.toString() : prev.quebrados_perc,
          desconto_kg: p.desconto_kg ? p.desconto_kg.toString() : prev.desconto_kg,
          peso_corrigido: p.peso_corrigido ? p.peso_corrigido.toString() : prev.peso_corrigido,
          transgenia: p.transgenia || prev.transgenia,
        }))
        toast.success('Dados extraídos com IA!')
      } else { toast.error('Não foi possível extrair dados') }
    } catch (err) { console.error('OCR error:', err); toast.error('Erro ao processar imagem') }
    finally { setOcrLoading(false) }
  }

  const ordensFiltradas = form.operacao_id ? ordens.filter((o: any) => o.operacao_id === form.operacao_id) : ordens

  const NUMERIC_FIELDS = ['peso_bruto','tara','peso_liquido','umidade_perc','impureza_perc','avariados_perc','ardidos_perc','esverdeados_perc','partidos_perc','quebrados_perc','desconto_kg','peso_corrigido','umidade_desc','impureza_desc','avariados_desc','ardidos_desc','esverdeados_desc','partidos_desc','quebrados_desc']

  const save = async () => {
    if (!form.ordem_id) { toast.error('Selecione uma Ordem de Carregamento'); return }
    const payload: any = {}
    Object.entries(form).forEach(([k, v]) => {
      if (NUMERIC_FIELDS.includes(k)) { payload[k] = v ? Number(v) : null }
      else if (v === '' || v === undefined) { payload[k] = null }
      else { payload[k] = v }
    })
    if (imagePreview && imagePreview.startsWith('data:')) payload.imagem_url = imagePreview
    try {
      if (editing) { await updateRomaneio(editing.id, payload); toast.success('Romaneio atualizado') }
      else { await createRomaneio(payload); toast.success('Romaneio cadastrado') }
      setShowForm(false); load()
    } catch (err: any) { toast.error('Erro ao salvar: ' + (err?.message || '')); console.error(err) }
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Romaneios</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 sm:px-4 rounded-lg hover:bg-green-700 text-sm sm:text-base whitespace-nowrap">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Novo</span> Romaneio
        </button>
      </div>

      {loading ? <p className="text-gray-500">Carregando...</p> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto -mx-3 sm:mx-0">
          <table className="w-full text-sm min-w-[750px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Ordem</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Ticket</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Data</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Produtor</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Produto</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Placa</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">P.Líq (kg)</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-blue-600 font-semibold">{item.ordem_nome || '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{item.numero_ticket || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{item.data_emissao || '-'}</td>
                  <td className="px-4 py-3 font-medium">{item.produtor_id ? cadNome(item.produtor_id) : item.produtor || '-'}</td>
                  <td className="px-4 py-3">{item.produto_id ? prodNome(item.produto_id) : item.produto || '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{item.veiculo_id ? veicPlaca(item.veiculo_id) : item.placa || '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold">{item.peso_liquido ? fmtNum(item.peso_liquido) : '-'}</td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Nenhum romaneio cadastrado</td></tr>}
            </tbody>
          </table>
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
                  <select value={form.operacao_id} onChange={e => handleOperacaoChange(e.target.value)}
                    className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white">
                    <option value="">Todas as operações</option>
                    {operacoes.map((op: any) => <option key={op.id} value={op.id}>{op.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-orange-700 mb-1">Ordem de Carregamento *</label>
                  <select value={form.ordem_id} onChange={e => handleOrdemChange(e.target.value)}
                    className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white">
                    <option value="">Selecione a Ordem...</option>
                    {ordensFiltradas.map((o: any) => (
                      <option key={o.id} value={o.id}>
                        #{o.numero_ordem_fmt || o.numero_ordem} - {o.nome_ordem || ''} ({o.origem_nome} → {o.destino_nome})
                      </option>
                    ))}
                  </select>
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
                  <div className="mt-3">
                    <img src={imagePreview} alt="Romaneio" className="max-h-48 rounded-lg border shadow-sm object-contain" />
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
                  <select value={form.tipo_ticket_id} onChange={e => setForm({...form, tipo_ticket_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Selecione...</option>
                    {tiposTicket.filter((t: any) => t.ativo).map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">NF-e</label>
                  <input type="text" value={form.nfe_numero} onChange={e => setForm({...form, nfe_numero: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipo NF</label>
                  <select value={form.tipo_nf_id} onChange={e => setForm({...form, tipo_nf_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Selecione...</option>
                    {tiposNf.filter((t: any) => t.ativo).map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data Emissão</label>
                  <input type="date" value={form.data_emissao} onChange={e => setForm({...form, data_emissao: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ano Safra</label>
                  <select value={form.ano_safra_id} onChange={e => setForm({...form, ano_safra_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50">
                    <option value="">Selecione...</option>
                    {anosSafra.filter((a: any) => a.ativo).map((a: any) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Transgenia</label>
                  <select value={form.transgenia} onChange={e => setForm({...form, transgenia: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Selecione...</option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                </div>
              </div>

              {/* Origem, Destinatário, Produto (auto-preenchidos pela ordem) */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Origem</label>
                  <select value={form.origem_id} onChange={e => setForm({...form, origem_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-green-50">
                    <option value="">Selecione...</option>
                    {origensList.map((c: any) => <option key={c.id} value={c.id}>{c.nome_fantasia || c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Destinatário</label>
                  <select value={form.destinatario_id} onChange={e => setForm({...form, destinatario_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-green-50">
                    <option value="">Selecione...</option>
                    {origensList.map((c: any) => <option key={c.id} value={c.id}>{c.nome_fantasia || c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Produto</label>
                  <select value={form.produto_id} onChange={e => setForm({...form, produto_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-green-50">
                    <option value="">Selecione...</option>
                    {produtos.map((p: any) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
              </div>

              {/* Produtor + CNPJ/CPF */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Produtor</label>
                  <select value={form.produtor_id} onChange={e => {
                    const prod = cadastros.find((c: any) => c.id === e.target.value)
                    setForm({...form, produtor_id: e.target.value, cnpj_cpf: prod?.cpf_cnpj || form.cnpj_cpf})
                  }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Selecione...</option>
                    {produtoresList.map((c: any) => <option key={c.id} value={c.id}>{c.nome_fantasia || c.nome}</option>)}
                  </select>
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
                  <select value={form.veiculo_id} onChange={e => handleVeiculoChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono">
                    <option value="">Selecione...</option>
                    {veiculosFiltrados.map((v: any) => <option key={v.id} value={v.id}>{v.placa} ({v.tipo_caminhao})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Motorista</label>
                  <select value={form.motorista_id} onChange={e => handleMotoristaChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Selecione...</option>
                    {motoristasFiltrados.map((c: any) => <option key={c.id} value={c.id}>{c.nome_fantasia || c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Transportadora</label>
                  <select value={form.transportadora_id} onChange={e => handleTranspChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Selecione...</option>
                    {transportadorasList.map((c: any) => <option key={c.id} value={c.id}>{c.nome_fantasia || c.nome}</option>)}
                  </select>
                </div>
              </div>

              {/* Pesagem */}
              <div className="border-t pt-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Pesagem</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Peso Bruto (kg)</label>
                    <input type="text" inputMode="decimal" value={form.peso_bruto} onChange={e => setForm({...form, peso_bruto: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tara (kg)</label>
                    <input type="text" inputMode="decimal" value={form.tara} onChange={e => setForm({...form, tara: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Peso Líquido S/Desc (kg)</label>
                    <input type="text" inputMode="decimal" value={form.peso_liquido} onChange={e => {
                      const next = {...form, peso_liquido: e.target.value}
                      const dt = calcDescontoTotal(next)
                      const pl = parseFloat(e.target.value) || 0
                      setForm({...next, peso_corrigido: pl > 0 ? (pl - dt).toString() : ''})
                    }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold" />
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
                      <input type="text" inputMode="decimal" value={(form as any)[perc]} onChange={e => setForm({...form, [perc]: e.target.value})}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
                      <label className="block text-xs text-gray-500">{label} Desc</label>
                      <input type="text" inputMode="decimal" value={(form as any)[desc]} onChange={e => updateDescField(desc, e.target.value)}
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
    </div>
  )
}

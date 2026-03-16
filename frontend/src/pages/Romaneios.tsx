import { useEffect, useState, useRef } from 'react'
import { Plus, Pencil, Trash2, X, Camera, Upload, Loader2, FileText, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { getRomaneios, createRomaneio, updateRomaneio, deleteRomaneio, getOrdens } from '../services/api'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''

const TIPOS_DOC = [
  { value: 'ticket_pesagem', label: 'Ticket de Pesagem' },
  { value: 'ficha_circulacao', label: 'Ficha de Circulacao' },
  { value: 'romaneio_entrada', label: 'Romaneio de Entrada' },
]

const emptyForm = {
  ordem_id: '',
  numero_ticket: '', tipo_documento: 'ticket_pesagem', data_emissao: '',
  local_pesagem: '', fornecedor_destinatario: '', produtor: '',
  cnpj_cpf: '', placa: '', motorista: '', transportadora: '',
  produto: '', safra: '', nfe_numero: '', nfe_serie: '',
  peso_bruto: '', tara: '', peso_liquido: '',
  umidade_perc: '', impureza_perc: '', avariados_perc: '',
  ardidos_perc: '', esverdeados_perc: '', partidos_perc: '',
  quebrados_perc: '', desconto_kg: '', peso_corrigido: '',
  data_hora_entrada: '', data_hora_saida: '',
  transgenia: '', observacoes: '', ativo: true,
}

export default function Romaneios() {
  const [items, setItems] = useState<any[]>([])
  const [ordens, setOrdens] = useState<any[]>([])
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
    Promise.all([getRomaneios(), getOrdens()])
      .then(([r, o]) => { setItems(r); setOrdens(o) })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openNew = () => { setEditing(null); setForm(emptyForm); setImagePreview(null); setShowForm(true) }
  const openEdit = (item: any) => {
    setEditing(item)
    setForm({
      ordem_id: item.ordem_id || '',
      numero_ticket: item.numero_ticket || '', tipo_documento: item.tipo_documento || 'ticket_pesagem',
      data_emissao: item.data_emissao || '', local_pesagem: item.local_pesagem || '',
      fornecedor_destinatario: item.fornecedor_destinatario || '', produtor: item.produtor || '',
      cnpj_cpf: item.cnpj_cpf || '', placa: item.placa || '',
      motorista: item.motorista || '', transportadora: item.transportadora || '',
      produto: item.produto || '', safra: item.safra || '',
      nfe_numero: item.nfe_numero || '', nfe_serie: item.nfe_serie || '',
      peso_bruto: item.peso_bruto?.toString() || '', tara: item.tara?.toString() || '',
      peso_liquido: item.peso_liquido?.toString() || '',
      umidade_perc: item.umidade_perc?.toString() || '', impureza_perc: item.impureza_perc?.toString() || '',
      avariados_perc: item.avariados_perc?.toString() || '', ardidos_perc: item.ardidos_perc?.toString() || '',
      esverdeados_perc: item.esverdeados_perc?.toString() || '', partidos_perc: item.partidos_perc?.toString() || '',
      quebrados_perc: item.quebrados_perc?.toString() || '', desconto_kg: item.desconto_kg?.toString() || '',
      peso_corrigido: item.peso_corrigido?.toString() || '',
      data_hora_entrada: item.data_hora_entrada || '', data_hora_saida: item.data_hora_saida || '',
      transgenia: item.transgenia || '', observacoes: item.observacoes || '', ativo: item.ativo,
    })
    setImagePreview(item.imagem_url || null)
    setShowForm(true)
  }

  const handleImageSelect = async (file: File) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string)
      setImagePreview(base64)
      if (GEMINI_API_KEY) {
        await processOCR(base64)
      } else {
        toast('Defina VITE_GEMINI_API_KEY para OCR automatico', { icon: 'ℹ️' })
      }
    }
    reader.readAsDataURL(file)
  }

  const processOCR = async (base64Image: string) => {
    setOcrLoading(true)
    try {
      const base64Data = base64Image.split(',')[1]
      const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/jpeg'

      const prompt = `Analise esta imagem de um romaneio/ticket de pesagem agricola brasileiro.
Extraia os seguintes campos e retorne APENAS um JSON valido (sem markdown, sem comentarios):
{
  "numero_ticket": "",
  "tipo_documento": "ticket_pesagem|ficha_circulacao|romaneio_entrada",
  "data_emissao": "YYYY-MM-DD",
  "local_pesagem": "",
  "fornecedor_destinatario": "",
  "produtor": "",
  "cnpj_cpf": "",
  "placa": "",
  "motorista": "",
  "transportadora": "",
  "produto": "",
  "safra": "",
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
  "transgenia": ""
}
Use 0 para campos numericos nao encontrados e "" para textos. Pesos em KG.`

      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: base64Data } }
              ]
            }]
          })
        }
      )
      const data = await resp.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

      // Extrair JSON da resposta (pode vir com ```json ... ```)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        setForm(prev => ({
          ...prev,
          numero_ticket: parsed.numero_ticket || prev.numero_ticket,
          tipo_documento: parsed.tipo_documento || prev.tipo_documento,
          data_emissao: parsed.data_emissao || prev.data_emissao,
          local_pesagem: parsed.local_pesagem || prev.local_pesagem,
          fornecedor_destinatario: parsed.fornecedor_destinatario || prev.fornecedor_destinatario,
          produtor: parsed.produtor || prev.produtor,
          cnpj_cpf: parsed.cnpj_cpf || prev.cnpj_cpf,
          placa: parsed.placa || prev.placa,
          motorista: parsed.motorista || prev.motorista,
          transportadora: parsed.transportadora || prev.transportadora,
          produto: parsed.produto || prev.produto,
          safra: parsed.safra || prev.safra,
          nfe_numero: parsed.nfe_numero || prev.nfe_numero,
          peso_bruto: parsed.peso_bruto ? parsed.peso_bruto.toString() : prev.peso_bruto,
          tara: parsed.tara ? parsed.tara.toString() : prev.tara,
          peso_liquido: parsed.peso_liquido ? parsed.peso_liquido.toString() : prev.peso_liquido,
          umidade_perc: parsed.umidade_perc ? parsed.umidade_perc.toString() : prev.umidade_perc,
          impureza_perc: parsed.impureza_perc ? parsed.impureza_perc.toString() : prev.impureza_perc,
          avariados_perc: parsed.avariados_perc ? parsed.avariados_perc.toString() : prev.avariados_perc,
          ardidos_perc: parsed.ardidos_perc ? parsed.ardidos_perc.toString() : prev.ardidos_perc,
          esverdeados_perc: parsed.esverdeados_perc ? parsed.esverdeados_perc.toString() : prev.esverdeados_perc,
          partidos_perc: parsed.partidos_perc ? parsed.partidos_perc.toString() : prev.partidos_perc,
          quebrados_perc: parsed.quebrados_perc ? parsed.quebrados_perc.toString() : prev.quebrados_perc,
          desconto_kg: parsed.desconto_kg ? parsed.desconto_kg.toString() : prev.desconto_kg,
          peso_corrigido: parsed.peso_corrigido ? parsed.peso_corrigido.toString() : prev.peso_corrigido,
          transgenia: parsed.transgenia || prev.transgenia,
        }))
        toast.success('Dados extraidos do romaneio com IA!')
      } else {
        toast.error('Nao foi possivel extrair dados da imagem')
      }
    } catch (err) {
      console.error('OCR error:', err)
      toast.error('Erro ao processar imagem com IA')
    }
    finally { setOcrLoading(false) }
  }

  const save = async () => {
    if (!form.ordem_id) { toast.error('Selecione uma Ordem de Carregamento'); return }
    const payload: any = {}
    Object.entries(form).forEach(([k, v]) => {
      if (['peso_bruto','tara','peso_liquido','umidade_perc','impureza_perc','avariados_perc','ardidos_perc','esverdeados_perc','partidos_perc','quebrados_perc','desconto_kg','peso_corrigido'].includes(k)) {
        payload[k] = v ? Number(v) : null
      } else if (v === '' || v === undefined) {
        payload[k] = null
      } else {
        payload[k] = v
      }
    })
    if (imagePreview && imagePreview.startsWith('data:')) {
      payload.imagem_url = imagePreview
    }
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

  const f = (v: string) => setForm(prev => ({ ...prev, ...{ [v]: '' } }))

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
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Data</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Produtor</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Produto</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Placa</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">P.Liq (kg)</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-blue-600 font-semibold">{item.ordem_nome || '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{item.numero_ticket || '-'}</td>
                  <td className="px-4 py-3 text-xs">{TIPOS_DOC.find(t => t.value === item.tipo_documento)?.label || item.tipo_documento}</td>
                  <td className="px-4 py-3 text-gray-600">{item.data_emissao || '-'}</td>
                  <td className="px-4 py-3 font-medium">{item.produtor || item.fornecedor_destinatario || '-'}</td>
                  <td className="px-4 py-3">{item.produto || '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{item.placa || '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold">{item.peso_liquido ? Number(item.peso_liquido).toLocaleString('pt-BR') : '-'}</td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Nenhum romaneio cadastrado</td></tr>}
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

              {/* Ordem de Carregamento vinculada */}
              <div className="border-2 border-orange-200 bg-orange-50 rounded-lg p-3">
                <label className="block text-sm font-semibold text-orange-700 mb-1">Ordem de Carregamento *</label>
                <select value={form.ordem_id} onChange={e => setForm({...form, ordem_id: e.target.value})}
                  className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white">
                  <option value="">Selecione a Ordem...</option>
                  {ordens.map((o: any) => (
                    <option key={o.id} value={o.id}>
                      {o.numero_ordem_fmt || o.numero_ordem} - {o.nome_ordem || ''} ({o.origem_nome} → {o.destino_nome})
                    </option>
                  ))}
                </select>
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
                    <img src={imagePreview} alt="Romaneio" className="max-h-48 rounded-lg border shadow-sm" />
                  </div>
                )}
              </div>

              {/* Identificacao */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">N Ticket</label>
                  <input type="text" value={form.numero_ticket} onChange={e => setForm({...form, numero_ticket: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipo Documento</label>
                  <select value={form.tipo_documento} onChange={e => setForm({...form, tipo_documento: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {TIPOS_DOC.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data Emissao</label>
                  <input type="date" value={form.data_emissao} onChange={e => setForm({...form, data_emissao: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Local Pesagem</label>
                  <input type="text" value={form.local_pesagem} onChange={e => setForm({...form, local_pesagem: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fornecedor / Destinatario</label>
                  <input type="text" value={form.fornecedor_destinatario} onChange={e => setForm({...form, fornecedor_destinatario: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Produtor</label>
                  <input type="text" value={form.produtor} onChange={e => setForm({...form, produtor: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">CNPJ/CPF</label>
                  <input type="text" value={form.cnpj_cpf} onChange={e => setForm({...form, cnpj_cpf: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Produto</label>
                  <input type="text" value={form.produto} onChange={e => setForm({...form, produto: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Placa</label>
                  <input type="text" value={form.placa} onChange={e => setForm({...form, placa: e.target.value.toUpperCase()})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Motorista</label>
                  <input type="text" value={form.motorista} onChange={e => setForm({...form, motorista: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Transportadora</label>
                  <input type="text" value={form.transportadora} onChange={e => setForm({...form, transportadora: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Safra</label>
                  <input type="text" value={form.safra} onChange={e => setForm({...form, safra: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>

              {/* Pesagem */}
              <div className="border-t pt-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Pesagem</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Peso Bruto (kg)</label>
                    <input type="number" step="0.001" value={form.peso_bruto} onChange={e => setForm({...form, peso_bruto: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tara (kg)</label>
                    <input type="number" step="0.001" value={form.tara} onChange={e => setForm({...form, tara: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Peso Liquido (kg)</label>
                    <input type="number" step="0.001" value={form.peso_liquido} onChange={e => setForm({...form, peso_liquido: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold" />
                  </div>
                </div>
              </div>

              {/* Classificacao / Descontos */}
              <div className="border-t pt-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Classificacao / Descontos</h3>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Umidade %</label>
                    <input type="number" step="0.01" value={form.umidade_perc} onChange={e => setForm({...form, umidade_perc: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Impureza %</label>
                    <input type="number" step="0.01" value={form.impureza_perc} onChange={e => setForm({...form, impureza_perc: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Avariados %</label>
                    <input type="number" step="0.01" value={form.avariados_perc} onChange={e => setForm({...form, avariados_perc: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Partidos %</label>
                    <input type="number" step="0.01" value={form.partidos_perc} onChange={e => setForm({...form, partidos_perc: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3 mt-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Esverdeados %</label>
                    <input type="number" step="0.01" value={form.esverdeados_perc} onChange={e => setForm({...form, esverdeados_perc: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Quebrados %</label>
                    <input type="number" step="0.01" value={form.quebrados_perc} onChange={e => setForm({...form, quebrados_perc: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Desconto (kg)</label>
                    <input type="number" step="0.001" value={form.desconto_kg} onChange={e => setForm({...form, desconto_kg: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Peso Corrigido (kg)</label>
                    <input type="number" step="0.001" value={form.peso_corrigido} onChange={e => setForm({...form, peso_corrigido: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold" />
                  </div>
                </div>
              </div>

              {/* Extras */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">NF-e</label>
                  <input type="text" value={form.nfe_numero} onChange={e => setForm({...form, nfe_numero: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Transgenia</label>
                  <input type="text" value={form.transgenia} onChange={e => setForm({...form, transgenia: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Observacoes</label>
                  <input type="text" value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
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

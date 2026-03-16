import { useEffect, useState, useRef } from 'react'
import { Plus, Pencil, Trash2, X, Loader2, FileDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { getPrecos, createPreco, updatePreco, deletePreco, getCadastros, getProdutos } from '../services/api'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
const UNIDADES_PRECO = ['R$/ton', 'R$/sc', 'R$/km', 'R$/viagem']
const TIPOS_ORIGEM_DESTINO = ['Fazenda', 'Armazem', 'Industria', 'Porto', 'Fornecedor']
const TIPOS_TRANSPORTADOR = ['Transportadora', 'Motorista']
const emptyForm = { origem_id: '', destino_id: '', produto_id: '', fornecedor_id: '', valor: '', unidade_preco: 'R$/ton', distancia_km: '', vigencia_inicio: '', vigencia_fim: '', observacoes: '', ativo: true }

export default function Precos() {
  const [items, setItems] = useState<any[]>([])
  const [allCadastros, setAllCadastros] = useState<any[]>([])
  const [origemDestino, setOrigemDestino] = useState<any[]>([])
  const [transportadores, setTransportadores] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)
  const [calcDist, setCalcDist] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([getPrecos(), getCadastros(), getProdutos()])
      .then(([p, c, pr]) => {
        setItems(p)
        setAllCadastros(c)
        setOrigemDestino(c.filter((x: any) => (x.tipos || []).some((t: string) => TIPOS_ORIGEM_DESTINO.includes(t))))
        setTransportadores(c.filter((x: any) => (x.tipos || []).some((t: string) => TIPOS_TRANSPORTADOR.includes(t))))
        setProdutos(pr)
      })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  // Carregar Google Maps script para usar DistanceMatrixService
  const mapsLoaded = useRef(false)
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || mapsLoaded.current) return
    if ((window as any).google?.maps) { mapsLoaded.current = true; return }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry`
    script.async = true
    script.onload = () => { mapsLoaded.current = true }
    document.head.appendChild(script)
  }, [])

  // Calcular distancia automatica via DistanceMatrixService (client-side, sem CORS)
  const calcularDistancia = async (origemId: string, destinoId: string) => {
    if (!origemId || !destinoId || !GOOGLE_MAPS_API_KEY) return
    const origem = allCadastros.find((c: any) => c.id === origemId)
    const destino = allCadastros.find((c: any) => c.id === destinoId)
    if (!origem || !destino) return

    const origemLatLng = origem.latitude && origem.longitude
      ? { lat: origem.latitude, lng: origem.longitude }
      : null
    const destinoLatLng = destino.latitude && destino.longitude
      ? { lat: destino.latitude, lng: destino.longitude }
      : null

    const origemReq = origemLatLng
      ? new google.maps.LatLng(origemLatLng.lat, origemLatLng.lng)
      : `${origem.cidade}, ${origem.uf}, Brasil`
    const destinoReq = destinoLatLng
      ? new google.maps.LatLng(destinoLatLng.lat, destinoLatLng.lng)
      : `${destino.cidade}, ${destino.uf}, Brasil`

    // Esperar Google Maps carregar
    const waitForMaps = () => new Promise<void>((resolve) => {
      const check = () => { if ((window as any).google?.maps) resolve(); else setTimeout(check, 200) }
      check()
    })
    await waitForMaps()

    setCalcDist(true)
    try {
      const service = new google.maps.DistanceMatrixService()
      const result = await service.getDistanceMatrix({
        origins: [origemReq],
        destinations: [destinoReq],
        travelMode: google.maps.TravelMode.DRIVING,
      })
      const element = result.rows?.[0]?.elements?.[0]
      if (element?.status === 'OK' && element.distance) {
        const km = Math.round(element.distance.value / 1000)
        setForm(prev => ({ ...prev, distancia_km: km.toString() }))
        toast.success(`Distancia calculada: ${km} km`)
      }
    } catch (err) { console.error('Erro ao calcular distancia:', err) }
    finally { setCalcDist(false) }
  }

  const onOrigemChange = (id: string) => {
    setForm(prev => ({ ...prev, origem_id: id }))
    if (id && form.destino_id) calcularDistancia(id, form.destino_id)
  }
  const onDestinoChange = (id: string) => {
    setForm(prev => ({ ...prev, destino_id: id }))
    if (form.origem_id && id) calcularDistancia(form.origem_id, id)
  }

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (item: any) => {
    setEditing(item)
    setForm({ origem_id: item.origem_id, destino_id: item.destino_id, produto_id: item.produto_id, fornecedor_id: item.fornecedor_id || '', valor: item.valor?.toString() || '', unidade_preco: item.unidade_preco || 'R$/ton', distancia_km: item.distancia_km?.toString() || '', vigencia_inicio: item.vigencia_inicio || '', vigencia_fim: item.vigencia_fim || '', observacoes: item.observacoes || '', ativo: item.ativo })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.origem_id || !form.destino_id || !form.produto_id || !form.valor) { toast.error('Origem, destino, produto e valor sao obrigatorios'); return }
    const payload: any = {
      origem_id: form.origem_id,
      destino_id: form.destino_id,
      produto_id: form.produto_id,
      fornecedor_id: form.fornecedor_id || null,
      valor: Number(form.valor),
      unidade_preco: form.unidade_preco,
      distancia_km: form.distancia_km ? Number(form.distancia_km) : null,
      observacoes: form.observacoes || null,
      ativo: form.ativo,
    }
    if (form.vigencia_inicio) payload.vigencia_inicio = form.vigencia_inicio
    if (form.vigencia_fim) payload.vigencia_fim = form.vigencia_fim
    try {
      if (editing) { await updatePreco(editing.id, payload); toast.success('Preco atualizado') }
      else { await createPreco(payload); toast.success('Preco cadastrado') }
      setShowForm(false); load()
    } catch (err: any) { toast.error('Erro ao salvar: ' + (err?.message || '')); console.error(err) }
  }

  const remove = async (id: string) => {
    if (!confirm('Deseja remover este preco?')) return
    try { await deletePreco(id); toast.success('Preco removido'); load() } catch { toast.error('Erro ao remover') }
  }

  const fmtCur = (v: number) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  // Gerar documento de detalhamento do preco
  const gerarDocumento = (item: any) => {
    const origem = allCadastros.find((c: any) => c.id === item.origem_id)
    const destino = allCadastros.find((c: any) => c.id === item.destino_id)

    // Mapa estatico com trajeto
    let mapaHtml = ''
    if (GOOGLE_MAPS_API_KEY) {
      const origemMarker = origem?.latitude && origem?.longitude
        ? `${origem.latitude},${origem.longitude}`
        : `${origem?.cidade || ''},${origem?.uf || ''},Brasil`
      const destinoMarker = destino?.latitude && destino?.longitude
        ? `${destino.latitude},${destino.longitude}`
        : `${destino?.cidade || ''},${destino?.uf || ''},Brasil`
      const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=760x300&maptype=roadmap`
        + `&markers=color:green%7Clabel:A%7C${encodeURIComponent(origemMarker)}`
        + `&markers=color:red%7Clabel:B%7C${encodeURIComponent(destinoMarker)}`
        + `&path=enc:&sensor=false`
        + `&key=${GOOGLE_MAPS_API_KEY}`
      const dirMapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=760x300&maptype=roadmap`
        + `&markers=color:0x16a34a%7Clabel:A%7C${encodeURIComponent(origemMarker)}`
        + `&markers=color:0xdc2626%7Clabel:B%7C${encodeURIComponent(destinoMarker)}`
        + `&path=color:0x2563eb%7Cweight:4%7C${encodeURIComponent(origemMarker)}%7C${encodeURIComponent(destinoMarker)}`
        + `&key=${GOOGLE_MAPS_API_KEY}`
      mapaHtml = `
      <div class="section">
        <h2>Mapa do Trajeto</h2>
        <div style="text-align:center;border-radius:10px;overflow:hidden;border:1px solid #ddd">
          <img src="${dirMapUrl}" alt="Mapa do trajeto" style="width:100%;max-width:760px;display:block;margin:0 auto" />
        </div>
        <div style="display:flex;justify-content:center;gap:20px;margin-top:8px;font-size:12px;color:#666">
          <span><span style="color:#16a34a;font-weight:bold">A</span> = Origem</span>
          <span><span style="color:#dc2626;font-weight:bold">B</span> = Destino</span>
        </div>
      </div>`
    }

    const html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Detalhamento de Preco - FretAgru</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
  .header { text-align: center; border-bottom: 3px solid #16a34a; padding-bottom: 15px; margin-bottom: 20px; }
  .header h1 { color: #16a34a; margin: 0; font-size: 24px; }
  .header p { color: #666; margin: 5px 0 0; }
  .section { margin-bottom: 20px; }
  .section h2 { font-size: 16px; color: #16a34a; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .field { padding: 8px; background: #f9fafb; border-radius: 6px; }
  .field label { font-size: 11px; color: #888; display: block; }
  .field span { font-size: 14px; font-weight: 600; }
  .valor-destaque { text-align: center; padding: 20px; background: #f0fdf4; border: 2px solid #16a34a; border-radius: 10px; margin: 15px 0; }
  .valor-destaque .valor { font-size: 32px; font-weight: bold; color: #16a34a; }
  .valor-destaque .unidade { font-size: 14px; color: #666; }
  .rota { padding: 15px; background: #eff6ff; border-radius: 10px; text-align: center; }
  .rota .distancia { font-size: 24px; font-weight: bold; color: #2563eb; }
  .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #999; border-top: 1px solid #ddd; padding-top: 10px; }
  @media print { body { padding: 0; } }
</style></head><body>
  <div class="header">
    <h1>FretAgru - Detalhamento de Preco</h1>
    <p>Documento gerado em ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR')}</p>
  </div>
  <div class="section">
    <h2>Rota</h2>
    <div class="grid">
      <div class="field"><label>Origem</label><span>${item.origem_nome || '-'}</span></div>
      <div class="field"><label>Destino</label><span>${item.destino_nome || '-'}</span></div>
      <div class="field"><label>Cidade Origem</label><span>${origem?.cidade || '-'}/${origem?.uf || '-'}</span></div>
      <div class="field"><label>Cidade Destino</label><span>${destino?.cidade || '-'}/${destino?.uf || '-'}</span></div>
    </div>
    ${item.distancia_km ? `<div class="rota" style="margin-top:10px"><div class="distancia">${item.distancia_km} km</div><div style="color:#666;font-size:12px">Distancia estimada via rota rodoviaria</div></div>` : ''}
  </div>
  ${mapaHtml}
  <div class="section">
    <h2>Produto e Transportador</h2>
    <div class="grid">
      <div class="field"><label>Produto</label><span>${item.produto_nome || '-'}</span></div>
      <div class="field"><label>Transportador</label><span>${item.fornecedor_nome || 'Preco Geral (todos)'}</span></div>
    </div>
  </div>
  <div class="valor-destaque">
    <div class="valor">${fmtCur(item.valor)}</div>
    <div class="unidade">${item.unidade_preco}</div>
  </div>
  ${item.observacoes ? `<div class="section"><h2>Observacoes</h2><p>${item.observacoes}</p></div>` : ''}
  <div class="footer">
    <p>FretAgru - iAgru Ecossistema | Documento informativo de precificacao de frete</p>
  </div>
</body></html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (win) win.onload = () => { URL.revokeObjectURL(url) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Precos Contratados</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 sm:px-4 rounded-lg hover:bg-green-700 text-sm sm:text-base whitespace-nowrap"><Plus className="w-4 h-4" /> <span className="hidden sm:inline">Novo</span> Preco</button>
      </div>
      {loading ? <p className="text-gray-500">Carregando...</p> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto -mx-3 sm:mx-0">
          <table className="w-full text-sm min-w-[650px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-3 sm:px-4 py-3 font-semibold text-gray-600">Origem</th>
                <th className="text-left px-3 sm:px-4 py-3 font-semibold text-gray-600">Destino</th>
                <th className="text-left px-3 sm:px-4 py-3 font-semibold text-gray-600">Produto</th>
                <th className="text-left px-3 sm:px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Transportador</th>
                <th className="text-right px-3 sm:px-4 py-3 font-semibold text-gray-600">Valor</th>
                <th className="text-right px-3 sm:px-4 py-3 font-semibold text-gray-600">Dist.</th>
                <th className="text-right px-3 sm:px-4 py-3 font-semibold text-gray-600">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.origem_nome}</td>
                  <td className="px-4 py-3">{item.destino_nome}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${item.produto_tipo === 'Grao' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{item.produto_nome}</span></td>
                  <td className="px-3 sm:px-4 py-3 text-gray-600 hidden md:table-cell">{item.fornecedor_nome || 'Geral'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-700">{fmtCur(item.valor)} <span className="text-xs text-gray-400 font-normal">{item.unidade_preco}</span></td>
                  <td className="px-4 py-3 text-right text-gray-600">{item.distancia_km ? `${item.distancia_km} km` : '-'}</td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button onClick={() => gerarDocumento(item)} title="Gerar documento" className="p-1.5 text-green-600 hover:bg-green-50 rounded"><FileDown className="w-4 h-4" /></button>
                    <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhum preco cadastrado</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white sm:rounded-xl shadow-xl w-full max-w-lg sm:mx-4 max-h-screen sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Editar Preco' : 'Novo Preco'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Origem *</label>
                <select value={form.origem_id} onChange={e => onOrigemChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  <option value="">Selecione...</option>
                  {origemDestino.map((l: any) => <option key={l.id} value={l.id}>{l.nome_fantasia || l.nome} ({(l.tipos||[]).join(', ')})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destino *</label>
                <select value={form.destino_id} onChange={e => onDestinoChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  <option value="">Selecione...</option>
                  {origemDestino.map((l: any) => <option key={l.id} value={l.id}>{l.nome_fantasia || l.nome} ({(l.tipos||[]).join(', ')})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Produto *</label>
                <select value={form.produto_id} onChange={e => setForm({...form, produto_id: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  <option value="">Selecione...</option>
                  {produtos.map((p: any) => <option key={p.id} value={p.id}>{p.nome} ({p.tipo})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transportador</label>
                <select value={form.fornecedor_id} onChange={e => setForm({...form, fornecedor_id: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  <option value="">Todos (preco geral)</option>
                  {transportadores.map((f: any) => <option key={f.id} value={f.id}>{f.nome_fantasia || f.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$) *</label>
                  <input type="number" step="0.01" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                  <select value={form.unidade_preco} onChange={e => setForm({...form, unidade_preco: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    {UNIDADES_PRECO.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dist. (km) {calcDist && <Loader2 className="w-3 h-3 inline animate-spin" />}</label>
                  <input type="number" value={form.distancia_km} onChange={e => setForm({...form, distancia_km: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes</label>
                <textarea value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
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

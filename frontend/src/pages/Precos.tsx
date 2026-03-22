import { useEffect, useState, useRef } from 'react'
import { Plus, Pencil, Trash2, X, TrendingUp, TrendingDown, Filter, FileDown, Loader2, ChevronDown, FileSpreadsheet } from 'lucide-react'
import toast from 'react-hot-toast'
import { getPrecos, createPreco, updatePreco, deletePreco, getCadastros, getProdutos } from '../services/api'
import ViewModal, { Field } from '../components/ViewModal'
import { useSort } from '../hooks/useSort'
import SortHeader from '../components/SortHeader'
import { fmtBRL, fmtInt, fmtData } from '../utils/format'
import Pagination, { usePagination } from '../components/Pagination'
import { exportToExcel } from '../utils/export'

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
  const [searchTerm, setSearchTerm] = useState('')
  const pagination = usePagination(25)
  const [activeFilters, setActiveFilters] = useState<{id: string, field: string, value: string}[]>([])
  const [showFilterOptions, setShowFilterOptions] = useState(false)
  const [calcDist, setCalcDist] = useState(false)
  const [viewingItem, setViewingItem] = useState<any>(null)

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
    } catch { toast.error('Erro ao calcular distância') }
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
    if (!form.origem_id || !form.destino_id || !form.produto_id || !form.valor) { toast.error('Origem, destino, produto e valor são obrigatórios'); return }
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
    } catch (err: any) { toast.error('Erro ao salvar: ' + (err?.message || '')) }
  }

  const remove = async (id: string) => {
    if (!confirm('Deseja remover este preco?')) return
    try { await deletePreco(id); toast.success('Preco removido'); load() } catch { toast.error('Erro ao remover') }
  }

  const fmtCur = (v: number) => fmtBRL(v)

  // Gerar documento de detalhamento do preco
  const FILTER_FIELDS = [
    { key: 'origem', label: 'Origem', type: 'select', options: () => origemDestino.map((o: any) => ({ value: o.id, label: o.nome_fantasia || o.nome })) },
    { key: 'destino', label: 'Destino', type: 'select', options: () => origemDestino.map((o: any) => ({ value: o.id, label: o.nome_fantasia || o.nome })) },
    { key: 'produto', label: 'Produto', type: 'select', options: () => produtos.map((p: any) => ({ value: p.id, label: p.nome })) },
    { key: 'fornecedor', label: 'Transportador', type: 'select', options: () => transportadores.map((t: any) => ({ value: t.id, label: t.nome_fantasia || t.nome })) },
    { key: 'unidade', label: 'Unidade de Pre\u00e7o', type: 'select', options: () => UNIDADES_PRECO.map(u => ({ value: u, label: u })) },
  ]

  const addFilter = (field: string) => {
    setActiveFilters([...activeFilters, { id: Date.now().toString(), field, value: '' }])
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

  const gerarDocumento = (item: any) => {
    const origem = allCadastros.find((c: any) => c.id === item.origem_id)
    const destino = allCadastros.find((c: any) => c.id === item.destino_id)

    // Mapa com rota real usando Google Maps Embed API (modo directions)
    let mapaHtml = ''
    if (GOOGLE_MAPS_API_KEY) {
      const origemQuery = origem?.latitude && origem?.longitude
        ? `${origem.latitude},${origem.longitude}`
        : `${origem?.cidade || ''},${origem?.uf || ''},Brasil`
      const destinoQuery = destino?.latitude && destino?.longitude
        ? `${destino.latitude},${destino.longitude}`
        : `${destino?.cidade || ''},${destino?.uf || ''},Brasil`
      const embedUrl = `https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_API_KEY}`
        + `&origin=${encodeURIComponent(origemQuery)}`
        + `&destination=${encodeURIComponent(destinoQuery)}`
        + `&mode=driving`
      mapaHtml = `
      <div class="section">
        <h2>Mapa do Trajeto (Rota Rodoviária)</h2>
        <div style="text-align:center;border-radius:10px;overflow:hidden;border:1px solid #ddd">
          <iframe src="${embedUrl}" width="760" height="350" style="border:0;width:100%;max-width:760px;display:block;margin:0 auto" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
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

  const filteredItems = items.filter(item => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const matchesSearch = (
        (item.origem_nome || '').toLowerCase().includes(term) ||
        (item.destino_nome || '').toLowerCase().includes(term) ||
        (item.produto_nome || '').toLowerCase().includes(term) ||
        (item.fornecedor_nome || '').toLowerCase().includes(term) ||
        (item.unidade_preco || '').toLowerCase().includes(term)
      )
      if (!matchesSearch) return false
    }
    for (const filter of activeFilters) {
      if (!filter.value) continue
      switch (filter.field) {
        case 'origem': if (item.origem_id !== filter.value) return false; break
        case 'destino': if (item.destino_id !== filter.value) return false; break
        case 'produto': if (item.produto_id !== filter.value) return false; break
        case 'fornecedor': if (item.fornecedor_id !== filter.value) return false; break
        case 'unidade': if (item.unidade_preco !== filter.value) return false; break
      }
    }
    return true
  })

  const { sortedData: sortedItems, sortKey, sortDirection, toggleSort } = useSort(filteredItems)

  const handleExportExcel = () => {
    exportToExcel({
      filename: 'precos_contratados_fretagru',
      title: 'Preços Contratados',
      columns: [
        { key: 'origem_nome', label: 'Origem' },
        { key: 'destino_nome', label: 'Destino' },
        { key: 'produto_nome', label: 'Produto' },
        { key: 'fornecedor_nome', label: 'Fornecedor' },
        { key: 'valor', label: 'Valor' },
        { key: 'unidade_preco', label: 'Unidade' },
        { key: 'distancia_km', label: 'Distância (km)' },
        { key: 'vigencia_inicio', label: 'Vigência Início' },
        { key: 'vigencia_fim', label: 'Vigência Fim' },
        { key: 'ativo', label: 'Ativo' },
      ],
      data: sortedItems,
      getValue: (item, key) => {
        if (key === 'valor') return fmtBRL(item.valor)
        if (key === 'distancia_km') return item.distancia_km ? fmtInt(item.distancia_km) : ''
        if (key === 'vigencia_inicio') return item.vigencia_inicio ? fmtData(item.vigencia_inicio) : ''
        if (key === 'vigencia_fim') return item.vigencia_fim ? fmtData(item.vigencia_fim) : ''
        if (key === 'ativo') return item.ativo ? 'Sim' : 'Não'
        return item[key] || ''
      }
    })
    toast.success(`${sortedItems.length} preços exportados`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Precos Contratados</h1>
        <div className="flex gap-2">
          <button onClick={handleExportExcel} className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 text-sm" title="Exportar Excel">
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button onClick={openNew} className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 sm:px-4 rounded-lg hover:bg-green-700 text-sm sm:text-base whitespace-nowrap"><Plus className="w-4 h-4" /> <span className="hidden sm:inline">Novo</span> Preco</button>
        </div>
      </div>

      <div className="mb-4 space-y-3">
        <div className="relative flex-1">
          <input type="text" placeholder="Buscar por origem, destino, produto, fornecedor..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
          <Filter className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
        </div>
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            {activeFilters.map((filter) => {
              const fieldDef = FILTER_FIELDS.find(f => f.key === filter.field)
              if (!fieldDef) return null
              return (
                <div key={filter.id} className="flex items-center gap-2 bg-gray-100 rounded-lg p-2 pr-3">
                  <span className="text-xs font-medium text-gray-600">{fieldDef.label}:</span>
                  <select value={filter.value} onChange={e => updateFilterValue(filter.id, e.target.value)}
                    className="text-sm border-0 bg-transparent focus:ring-0 p-0 pr-6">
                    <option value="">Selecione...</option>
                    {fieldDef.options && fieldDef.options().map((opt: any) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <button onClick={() => removeFilter(filter.id)} className="p-1 hover:bg-gray-200 rounded">
                    <X className="w-3 h-3 text-gray-500" />
                  </button>
                </div>
              )
            })}
            <button onClick={clearAllFilters} className="text-xs text-red-600 hover:text-red-700 font-medium px-2">Limpar todos</button>
          </div>
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
                <div className="px-4 py-3 text-sm text-gray-500 text-center">Todos os filtros j\u00e1 foram adicionados</div>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? <p className="text-gray-500">Carregando...</p> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto -mx-3 sm:mx-0">
          <table className="w-full text-sm min-w-[650px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <SortHeader field="origem_nome" label="Origem" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
                <SortHeader field="destino_nome" label="Destino" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
                <SortHeader field="produto_nome" label="Produto" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
                <SortHeader field="fornecedor_nome" label="Transportador" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
                <SortHeader field="valor" label="Valor" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} align="right" />
                <SortHeader field="distancia_km" label="Dist." sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} align="right" />
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pagination.paginate(sortedItems).map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setViewingItem(item)}>
                  <td className="px-4 py-3 font-medium">{item.origem_nome}</td>
                  <td className="px-4 py-3">{item.destino_nome}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${item.produto_tipo === 'Grao' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{item.produto_nome}</span></td>
                  <td className="px-4 py-3 text-gray-600">{item.fornecedor_nome || 'Geral'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-700">{fmtCur(item.valor)} <span className="text-xs text-gray-400 font-normal">{item.unidade_preco}</span></td>
                  <td className="px-4 py-3 text-right text-gray-600">{item.distancia_km ? `${fmtInt(item.distancia_km)} km` : '-'}</td>
                  <td className="px-4 py-3 text-right space-x-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => gerarDocumento(item)} title="Gerar documento" className="p-1.5 text-green-600 hover:bg-green-50 rounded"><FileDown className="w-4 h-4" /></button>
                    <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {sortedItems.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhum preco cadastrado</td></tr>}
            </tbody>
          </table>
          <Pagination
            currentPage={pagination.page}
            totalItems={sortedItems.length}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            onPageSizeChange={(s) => { pagination.setPageSize(s); pagination.resetPage() }}
          />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
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

      {/* Modal de Visualização */}
      <ViewModal
        title="Detalhes do Preço Contratado"
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        onEdit={() => { openEdit(viewingItem); setViewingItem(null) }}
      >
        {viewingItem && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Origem" value={viewingItem.origem_nome} />
            <Field label="Destino" value={viewingItem.destino_nome} />
            <Field label="Produto" value={viewingItem.produto_nome} />
            <Field label="Tipo Produto" value={viewingItem.produto_tipo} />
            <Field label="Transportador" value={viewingItem.fornecedor_nome || 'Preço Geral (todos)'} />
            <Field label="Valor" value={fmtCur(viewingItem.valor)} />
            <Field label="Unidade de Preço" value={viewingItem.unidade_preco} />
            <Field label="Distância (km)" value={viewingItem.distancia_km ? `${fmtInt(viewingItem.distancia_km)} km` : '-'} />
            <Field label="Vigência Início" value={fmtData(viewingItem.vigencia_inicio) || '-'} />
            <Field label="Vigência Fim" value={fmtData(viewingItem.vigencia_fim) || '-'} />
            <Field label="Status" value={viewingItem.ativo ? 'Ativo' : 'Inativo'} />
            <Field label="Observações" value={viewingItem.observacoes} full />
          </dl>
        )}
      </ViewModal>
    </div>
  )
}

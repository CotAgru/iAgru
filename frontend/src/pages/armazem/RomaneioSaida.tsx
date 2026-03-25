import { useEffect, useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, X, Package, ArrowUp, ArrowDown, ArrowUpDown, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getRomaneiosArmazem, createRomaneioArmazem, updateRomaneioArmazem, deleteRomaneioArmazem,
  getUnidadesArmazenadoras, getProdutos, getCadastros, getVeiculos, getAnosSafra, getSafras,
  getContratosVenda,
} from '../../services/api'
import { fmtInt, fmtDec, fmtData } from '../../utils/format'
import SearchableSelect from '../../components/SearchableSelect'
import Pagination from '../../components/Pagination'

type SortDir = 'asc' | 'desc'

const fmtKg = (v: number | null | undefined): string => {
  if (v === null || v === undefined) return ''
  return Math.round(v).toLocaleString('pt-BR')
}

export default function RomaneioSaida() {
  const [romaneios, setRomaneios] = useState<any[]>([])
  const [unidades, setUnidades] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [cadastros, setCadastros] = useState<any[]>([])
  const [veiculos, setVeiculos] = useState<any[]>([])
  const [anosSafra, setAnosSafra] = useState<any[]>([])
  const [contratos, setContratos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [showView, setShowView] = useState<any | null>(null)
  const [sort, setSort] = useState<{ col: string; dir: SortDir }>({ col: 'created_at', dir: 'desc' })

  const [form, setForm] = useState<any>({
    unidade_id: '', depositante_id: '', produto_id: '', safra_id: '', ano_safra_id: '',
    transportadora_id: '', motorista_id: '', veiculo_id: '', placa: '',
    nfe_numero: '', nfe_serie: '', data_emissao: '',
    peso_bruto: '', tara: '', observacoes: '', status: 'expedido',
    contrato_venda_id: '',
  })

  const load = async () => {
    setLoading(true)
    try {
      const [r, u, p, c, v, a, ct] = await Promise.all([
        getRomaneiosArmazem('saida'), getUnidadesArmazenadoras(), getProdutos(),
        getCadastros(), getVeiculos(), getAnosSafra(), getContratosVenda(),
      ])
      setRomaneios(r)
      setUnidades(u)
      setProdutos(p)
      setCadastros(c)
      setVeiculos(v)
      setAnosSafra(a)
      setContratos(ct)
    } catch (e: any) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const depositanteOpts = useMemo(() => cadastros.map(c => ({ value: c.id, label: c.nome_fantasia || c.nome })), [cadastros])
  const transportadoraOpts = useMemo(() => cadastros.filter(c => (c.tipos || []).includes('Transportadora')).map(c => ({ value: c.id, label: c.nome_fantasia || c.nome })), [cadastros])
  const motoristaOpts = useMemo(() => cadastros.filter(c => (c.tipos || []).includes('Motorista')).map(c => ({ value: c.id, label: c.nome_fantasia || c.nome })), [cadastros])
  const veiculoOpts = useMemo(() => veiculos.map(v => ({ value: v.id, label: `${v.placa} - ${v.proprietario_nome || ''}` })), [veiculos])
  const contratoOpts = useMemo(() => contratos.map((c: any) => ({
    value: c.id,
    label: `#${c.numero_contrato || '-'} — ${c.comprador_nome || ''} — ${c.produto_nome || ''} — ${c.volume_tons ? fmtKg(c.volume_tons * 1000) + ' kg' : ''}`,
  })), [contratos])

  const openCreate = () => {
    setEditId(null)
    setForm({
      unidade_id: unidades[0]?.id || '', depositante_id: '', produto_id: '', safra_id: '', ano_safra_id: '',
      transportadora_id: '', motorista_id: '', veiculo_id: '', placa: '',
      nfe_numero: '', nfe_serie: '', data_emissao: new Date().toISOString().split('T')[0],
      peso_bruto: '', tara: '', observacoes: '', status: 'expedido',
      contrato_venda_id: '',
    })
    setShowModal(true)
  }

  const openEdit = (r: any) => {
    setEditId(r.id)
    setForm({
      unidade_id: r.unidade_id || '', depositante_id: r.depositante_id || '', produto_id: r.produto_id || '',
      safra_id: r.safra_id || '', ano_safra_id: r.ano_safra_id || '',
      transportadora_id: r.transportadora_id || '', motorista_id: r.motorista_id || '',
      veiculo_id: r.veiculo_id || '', placa: r.placa || '',
      nfe_numero: r.nfe_numero || '', nfe_serie: r.nfe_serie || '', data_emissao: r.data_emissao || '',
      peso_bruto: r.peso_bruto ? String(r.peso_bruto) : '', tara: r.tara ? String(r.tara) : '',
      observacoes: r.observacoes || '', status: r.status || 'expedido',
      contrato_venda_id: r.contrato_venda_id || '',
    })
    setShowModal(true)
  }

  const parseNum = (v: string): number | null => {
    if (!v) return null
    const n = parseFloat(v.replace(/\./g, '').replace(',', '.'))
    return isNaN(n) ? null : n
  }

  const pesoLiquido = (parseNum(form.peso_bruto) || 0) - (parseNum(form.tara) || 0)

  const handleSave = async () => {
    if (!form.unidade_id) return toast.error('Unidade é obrigatória')
    if (!form.depositante_id) return toast.error('Depositante é obrigatório')
    if (!form.produto_id) return toast.error('Produto é obrigatório')
    try {
      const payload: any = {
        tipo: 'saida',
        unidade_id: form.unidade_id,
        depositante_id: form.depositante_id,
        produto_id: form.produto_id,
        safra_id: form.safra_id || null,
        ano_safra_id: form.ano_safra_id || null,
        transportadora_id: form.transportadora_id || null,
        motorista_id: form.motorista_id || null,
        veiculo_id: form.veiculo_id || null,
        placa: form.placa || null,
        nfe_numero: form.nfe_numero || null,
        nfe_serie: form.nfe_serie || null,
        data_emissao: form.data_emissao || null,
        peso_bruto: parseNum(form.peso_bruto),
        tara: parseNum(form.tara),
        peso_liquido: pesoLiquido,
        peso_corrigido: pesoLiquido,
        desconto_total: 0,
        status: form.status,
        observacoes: form.observacoes || null,
        data_hora_saida: new Date().toISOString(),
        contrato_venda_id: form.contrato_venda_id || null,
      }
      if (editId) {
        await updateRomaneioArmazem(editId, payload)
        toast.success('Romaneio atualizado')
      } else {
        await createRomaneioArmazem(payload)
        toast.success('Romaneio de saída criado')
      }
      setShowModal(false)
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este romaneio?')) return
    try {
      await deleteRomaneioArmazem(id)
      toast.success('Romaneio excluído')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const sorted = useMemo(() => {
    const arr = [...romaneios]
    arr.sort((a: any, b: any) => {
      const va = a[sort.col], vb = b[sort.col]
      if (typeof va === 'number' && typeof vb === 'number') return sort.dir === 'asc' ? va - vb : vb - va
      return sort.dir === 'asc' ? String(va || '').localeCompare(String(vb || '')) : String(vb || '').localeCompare(String(va || ''))
    })
    return arr
  }, [romaneios, sort])

  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize)

  const SortHeader = ({ label, col }: { label: string; col: string }) => (
    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap"
      onClick={() => setSort({ col, dir: sort.col === col && sort.dir === 'asc' ? 'desc' : 'asc' })}>
      <span className="flex items-center gap-1">
        {label}
        {sort.col === col ? (sort.dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
      </span>
    </th>
  )

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2"><Package className="w-6 h-6 text-amber-600" /> Romaneios de Saída</h1>
        <button onClick={openCreate} className="flex items-center gap-1 bg-amber-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-amber-700">
          <Plus className="w-4 h-4" /> Novo Romaneio
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-gray-50">
            <SortHeader label="#" col="numero_romaneio" />
            <SortHeader label="Data" col="data_emissao" />
            <SortHeader label="Depositante" col="depositante_nome" />
            <SortHeader label="Produto" col="produto_nome" />
            <SortHeader label="Peso Bruto" col="peso_bruto" />
            <SortHeader label="Tara" col="tara" />
            <SortHeader label="Peso Líq." col="peso_liquido" />
            <SortHeader label="Status" col="status" />
            <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600">Ações</th>
          </tr></thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8 text-gray-400">Nenhum romaneio de saída</td></tr>
            ) : paged.map((r: any) => (
              <tr key={r.id} className="border-b hover:bg-gray-50">
                <td className="px-2 py-2 font-mono text-xs">{r.numero_romaneio}</td>
                <td className="px-2 py-2 whitespace-nowrap">{r.data_emissao ? fmtData(r.data_emissao) : '-'}</td>
                <td className="px-2 py-2 truncate max-w-[150px]">{r.depositante_nome}</td>
                <td className="px-2 py-2">{r.produto_nome}</td>
                <td className="px-2 py-2 text-right">{fmtKg(r.peso_bruto)}</td>
                <td className="px-2 py-2 text-right">{fmtKg(r.tara)}</td>
                <td className="px-2 py-2 text-right font-semibold">{fmtKg(r.peso_liquido)}</td>
                <td className="px-2 py-2"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{r.status}</span></td>
                <td className="px-2 py-2">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => setShowView(r)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => openEdit(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(r.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination currentPage={page} totalItems={sorted.length} pageSize={pageSize} onPageChange={setPage} />
      </div>

      {/* Modal Criar/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editId ? 'Editar' : 'Novo'} Romaneio de Saída</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Unidade *</label>
                  <select value={form.unidade_id} onChange={e => setForm({ ...form, unidade_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">Selecione...</option>
                    {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data Emissão</label>
                  <input type="date" value={form.data_emissao} onChange={e => setForm({ ...form, data_emissao: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ano Safra</label>
                  <select value={form.ano_safra_id} onChange={e => setForm({ ...form, ano_safra_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">-</option>
                    {anosSafra.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Depositante *</label>
                  <SearchableSelect options={depositanteOpts} value={form.depositante_id} onChange={v => setForm({ ...form, depositante_id: v })} placeholder="Buscar..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Produto *</label>
                  <select value={form.produto_id} onChange={e => setForm({ ...form, produto_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">Selecione...</option>
                    {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Transportadora</label>
                  <SearchableSelect options={transportadoraOpts} value={form.transportadora_id} onChange={v => setForm({ ...form, transportadora_id: v })} placeholder="Buscar..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Motorista</label>
                  <SearchableSelect options={motoristaOpts} value={form.motorista_id} onChange={v => setForm({ ...form, motorista_id: v })} placeholder="Buscar..." />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Veículo</label>
                  <SearchableSelect options={veiculoOpts} value={form.veiculo_id} onChange={v => setForm({ ...form, veiculo_id: v, placa: veiculos.find(ve => ve.id === v)?.placa || form.placa })} placeholder="Buscar placa..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Placa</label>
                  <input value={form.placa} onChange={e => setForm({ ...form, placa: e.target.value.toUpperCase() })} className="w-full border rounded-lg px-3 py-2 text-sm" maxLength={8} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Peso Bruto (kg)</label>
                  <input value={form.peso_bruto} onChange={e => setForm({ ...form, peso_bruto: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tara (kg)</label>
                  <input value={form.tara} onChange={e => setForm({ ...form, tara: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Peso Líquido</label>
                  <div className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 font-semibold">{fmtKg(pesoLiquido)}</div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Contrato de Venda (vínculo ContAgru)</label>
                <SearchableSelect options={contratoOpts} value={form.contrato_venda_id} onChange={v => setForm({ ...form, contrato_venda_id: v })} placeholder="Vincular contrato de venda..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">NFe Número</label>
                  <input value={form.nfe_numero} onChange={e => setForm({ ...form, nfe_numero: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">NFe Série</label>
                  <input value={form.nfe_serie} onChange={e => setForm({ ...form, nfe_serie: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visualização */}
      {showView && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Saída #{showView.numero_romaneio}</h2>
              <button onClick={() => setShowView(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-gray-500">Data:</span> {showView.data_emissao ? fmtData(showView.data_emissao) : '-'}</div>
                <div><span className="text-gray-500">Status:</span> {showView.status}</div>
                <div><span className="text-gray-500">Depositante:</span> {showView.depositante_nome}</div>
                <div><span className="text-gray-500">Produto:</span> {showView.produto_nome}</div>
                <div><span className="text-gray-500">Placa:</span> {showView.placa || '-'}</div>
                <div><span className="text-gray-500">Unidade:</span> {showView.unidade_nome}</div>
              </div>
              <hr />
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-xs text-gray-500">Peso Bruto</p><p className="font-semibold">{fmtKg(showView.peso_bruto)}</p></div>
                <div><p className="text-xs text-gray-500">Tara</p><p className="font-semibold">{fmtKg(showView.tara)}</p></div>
                <div><p className="text-xs text-gray-500">Peso Líquido</p><p className="font-bold text-amber-700">{fmtKg(showView.peso_liquido)}</p></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

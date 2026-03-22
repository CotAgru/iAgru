import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Loader2, Wheat } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getAnosSafra, createAnoSafra, updateAnoSafra, deleteAnoSafra,
  getCulturas, createCultura, updateCultura, deleteCultura,
  getTiposSafra, createTipoSafra, updateTipoSafra, deleteTipoSafra,
  getSafras, createSafra, updateSafra, deleteSafra,
} from '../services/api'
import { fmtDec, fmtData } from '../utils/format'
import SortHeader from '../components/SortHeader'
import { useSort } from '../hooks/useSort'

type Tab = 'ano_safra' | 'culturas' | 'tipos_safra' | 'safras'

const TABS: { key: Tab; label: string }[] = [
  { key: 'ano_safra', label: 'Ano Safra' },
  { key: 'culturas', label: 'Culturas' },
  { key: 'tipos_safra', label: 'Tipos de Safra' },
  { key: 'safras', label: 'Safras' },
]

const emptySafraForm = {
  nome: '', ano_safra_id: '', cultura_id: '', tipo_safra_id: '',
  data_inicio: '', data_fim: '', area_ha: '', producao_estimada_ton: '',
  observacoes: '', ativo: true,
}

export default function Safra() {
  const [tab, setTab] = useState<Tab>('ano_safra')
  const [anosSafra, setAnosSafra] = useState<any[]>([])
  const [culturas, setCulturas] = useState<any[]>([])
  const [tiposSafra, setTiposSafra] = useState<any[]>([])
  const [safras, setSafras] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [formNome, setFormNome] = useState('')
  const [formAtivo, setFormAtivo] = useState(true)
  const [safraForm, setSafraForm] = useState(emptySafraForm)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([getAnosSafra(), getCulturas().catch(() => []), getTiposSafra().catch(() => []), getSafras().catch(() => [])])
      .then(([as, cu, ts, sa]) => { setAnosSafra(as); setCulturas(cu); setTiposSafra(ts); setSafras(sa) })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const { sortedData: sortedSafras, sortKey, sortDirection, toggleSort } = useSort(safras)

  const openNew = () => {
    setEditing(null); setFormNome(''); setFormAtivo(true)
    setSafraForm(emptySafraForm); setShowForm(true)
  }

  const openEdit = (item: any) => {
    setEditing(item)
    if (tab === 'safras') {
      setSafraForm({
        nome: item.nome || '',
        ano_safra_id: item.ano_safra_id || '',
        cultura_id: item.cultura_id || '',
        tipo_safra_id: item.tipo_safra_id || '',
        data_inicio: item.data_inicio || '',
        data_fim: item.data_fim || '',
        area_ha: item.area_ha != null ? String(item.area_ha) : '',
        producao_estimada_ton: item.producao_estimada_ton != null ? String(item.producao_estimada_ton) : '',
        observacoes: item.observacoes || '',
        ativo: item.ativo,
      })
    } else {
      setFormNome(item.nome); setFormAtivo(item.ativo)
    }
    setShowForm(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      if (tab === 'safras') {
        if (!safraForm.nome.trim() || !safraForm.ano_safra_id || !safraForm.cultura_id) {
          toast.error('Nome, Ano Safra e Cultura são obrigatórios'); setSaving(false); return
        }
        const payload: any = {
          nome: safraForm.nome.trim(),
          ano_safra_id: safraForm.ano_safra_id,
          cultura_id: safraForm.cultura_id,
          tipo_safra_id: safraForm.tipo_safra_id || null,
          data_inicio: safraForm.data_inicio || null,
          data_fim: safraForm.data_fim || null,
          area_ha: safraForm.area_ha ? parseFloat(safraForm.area_ha) : null,
          producao_estimada_ton: safraForm.producao_estimada_ton ? parseFloat(safraForm.producao_estimada_ton) : null,
          observacoes: safraForm.observacoes || null,
          ativo: safraForm.ativo,
        }
        if (editing) await updateSafra(editing.id, payload)
        else await createSafra(payload)
      } else {
        if (!formNome.trim()) { toast.error('Nome é obrigatório'); setSaving(false); return }
        const payload = { nome: formNome.trim(), ativo: formAtivo }
        if (tab === 'ano_safra') {
          if (editing) await updateAnoSafra(editing.id, payload)
          else await createAnoSafra(payload)
        } else if (tab === 'culturas') {
          if (editing) await updateCultura(editing.id, payload)
          else await createCultura(payload)
        } else if (tab === 'tipos_safra') {
          if (editing) await updateTipoSafra(editing.id, payload)
          else await createTipoSafra(payload)
        }
      }
      toast.success(editing ? 'Atualizado!' : 'Criado!')
      setShowForm(false); load()
    } catch (err: any) { toast.error('Erro: ' + (err?.message || '')) }
    finally { setSaving(false) }
  }

  const remove = async (id: string) => {
    if (!confirm('Deseja remover este registro?')) return
    try {
      if (tab === 'ano_safra') await deleteAnoSafra(id)
      else if (tab === 'culturas') await deleteCultura(id)
      else if (tab === 'tipos_safra') await deleteTipoSafra(id)
      else await deleteSafra(id)
      toast.success('Removido!'); load()
    } catch { toast.error('Erro ao remover') }
  }

  const currentSimpleItems = tab === 'ano_safra' ? anosSafra : tab === 'culturas' ? culturas : tiposSafra
  const currentLabel = TABS.find(t => t.key === tab)?.label || ''
  const isSimpleTab = tab !== 'safras'
  const placeholder = tab === 'ano_safra' ? 'Ex: 25/26' : tab === 'culturas' ? 'Ex: Soja' : 'Ex: Safrinha'

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Wheat className="w-7 h-7 text-amber-600" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Safra</h1>
          <p className="text-sm text-gray-500">Gestão de safras, culturas e períodos agrícolas</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.key ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Header com botão Novo */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-700">Cadastro de {currentLabel}</h3>
        <button onClick={openNew} className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 text-sm">
          <Plus className="w-4 h-4" /> Novo
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-8 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
        </div>
      ) : isSimpleTab ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nome</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 w-20">Ativo</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {currentSimpleItems.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.nome}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {item.ativo ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {currentSimpleItems.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">Nenhum registro</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <SortHeader label="Nome" field="nome" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
                <SortHeader label="Ano Safra" field="ano_safra_nome" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
                <SortHeader label="Cultura" field="cultura_nome" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
                <SortHeader label="Tipo" field="tipo_safra_nome" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Área (ha)</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Prod. Est. (ton)</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 w-20">Ativo</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedSafras.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.nome}</td>
                  <td className="px-4 py-3 text-gray-600">{item.ano_safra_nome}</td>
                  <td className="px-4 py-3 text-gray-600">{item.cultura_nome}</td>
                  <td className="px-4 py-3 text-gray-600">{item.tipo_safra_nome || '-'}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{item.area_ha ? fmtDec(item.area_ha, 1) : '-'}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{item.producao_estimada_ton ? fmtDec(item.producao_estimada_ton, 1) : '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {item.ativo ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {sortedSafras.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Nenhuma safra cadastrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de formulário — Simples (Ano Safra, Culturas, Tipos Safra) */}
      {showForm && isSimpleTab && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Editar' : 'Novo'} {currentLabel}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input type="text" value={formNome} onChange={e => setFormNome(e.target.value)} autoFocus
                  placeholder={placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={formAtivo} onChange={e => setFormAtivo(e.target.checked)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                <label className="text-sm text-gray-700">Ativo</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Cancelar</button>
              <button onClick={save} disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de formulário — Safras (completo) */}
      {showForm && !isSimpleTab && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Editar' : 'Nova'} Safra</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Safra *</label>
                <input type="text" value={safraForm.nome}
                  onChange={e => setSafraForm(f => ({ ...f, nome: e.target.value }))} autoFocus
                  placeholder="Ex: Soja Verão 24/25"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ano Safra *</label>
                  <select value={safraForm.ano_safra_id}
                    onChange={e => setSafraForm(f => ({ ...f, ano_safra_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="">Selecione</option>
                    {anosSafra.filter(a => a.ativo).map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cultura *</label>
                  <select value={safraForm.cultura_id}
                    onChange={e => setSafraForm(f => ({ ...f, cultura_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="">Selecione</option>
                    {culturas.filter(c => c.ativo).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Safra</label>
                  <select value={safraForm.tipo_safra_id}
                    onChange={e => setSafraForm(f => ({ ...f, tipo_safra_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="">Nenhum</option>
                    {tiposSafra.filter(t => t.ativo).map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
                  <input type="date" value={safraForm.data_inicio}
                    onChange={e => setSafraForm(f => ({ ...f, data_inicio: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
                  <input type="date" value={safraForm.data_fim}
                    onChange={e => setSafraForm(f => ({ ...f, data_fim: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Área (ha)</label>
                  <input type="number" step="0.1" value={safraForm.area_ha}
                    onChange={e => setSafraForm(f => ({ ...f, area_ha: e.target.value }))}
                    placeholder="Ex: 500"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Produção Estimada (ton)</label>
                  <input type="number" step="0.1" value={safraForm.producao_estimada_ton}
                    onChange={e => setSafraForm(f => ({ ...f, producao_estimada_ton: e.target.value }))}
                    placeholder="Ex: 3000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea value={safraForm.observacoes}
                  onChange={e => setSafraForm(f => ({ ...f, observacoes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={safraForm.ativo}
                  onChange={e => setSafraForm(f => ({ ...f, ativo: e.target.checked }))}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                <label className="text-sm text-gray-700">Ativo</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Cancelar</button>
              <button onClick={save} disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

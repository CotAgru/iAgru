import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Settings, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getAnosSafra, createAnoSafra, updateAnoSafra, deleteAnoSafra,
  getTiposNf, createTipoNf, updateTipoNf, deleteTipoNf,
  getTiposTicket, createTipoTicket, updateTipoTicket, deleteTipoTicket,
  getTiposCaminhao, createTipoCaminhao, updateTipoCaminhao, deleteTipoCaminhao,
} from '../services/api'

type Tab = 'ano_safra' | 'tipos_nf' | 'tipos_ticket' | 'tipos_caminhao'

const TABS: { key: Tab; label: string }[] = [
  { key: 'ano_safra', label: 'Ano Safra' },
  { key: 'tipos_nf', label: 'Tipo NF' },
  { key: 'tipos_ticket', label: 'Tipo Ticket' },
  { key: 'tipos_caminhao', label: 'Tipo Caminhão' },
]

function SimpleTable({
  items, loading, onAdd, onEdit, onDelete, label,
}: {
  items: any[]; loading: boolean; onAdd: () => void; onEdit: (item: any) => void; onDelete: (id: string) => void; label: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-700">Cadastro de {label}</h3>
        <button onClick={onAdd} className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 text-sm">
          <Plus className="w-4 h-4" /> Novo
        </button>
      </div>
      {loading ? <p className="text-gray-400 text-sm">Carregando...</p> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nome</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 w-20">Ativo</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.nome}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {item.ativo ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button onClick={() => onEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">Nenhum registro</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function Admin() {
  const [tab, setTab] = useState<Tab>('ano_safra')
  const [anosSafra, setAnosSafra] = useState<any[]>([])
  const [tiposNf, setTiposNf] = useState<any[]>([])
  const [tiposTicket, setTiposTicket] = useState<any[]>([])
  const [tiposCaminhao, setTiposCaminhao] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [formNome, setFormNome] = useState('')
  const [formAtivo, setFormAtivo] = useState(true)
  const [formEixos, setFormEixos] = useState(0)
  const [formPesoPauta, setFormPesoPauta] = useState(0)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([getAnosSafra(), getTiposNf(), getTiposTicket(), getTiposCaminhao()])
      .then(([as, tn, tt, tc]) => { setAnosSafra(as); setTiposNf(tn); setTiposTicket(tt); setTiposCaminhao(tc) })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openNew = () => { 
    setEditing(null); setFormNome(''); setFormAtivo(true); setFormEixos(0); setFormPesoPauta(0); setShowForm(true) 
  }
  const openEdit = (item: any) => { 
    setEditing(item); setFormNome(item.nome); setFormAtivo(item.ativo)
    setFormEixos(item.eixos || 0); setFormPesoPauta(item.peso_pauta_kg || 0); setShowForm(true) 
  }

  const save = async () => {
    if (!formNome.trim()) { toast.error('Nome é obrigatório'); return }
    if (tab === 'tipos_caminhao' && formEixos < 0) { toast.error('Eixos deve ser >= 0'); return }
    if (tab === 'tipos_caminhao' && formPesoPauta < 0) { toast.error('Peso pauta deve ser >= 0'); return }
    setSaving(true)
    try {
      const payload: any = { nome: formNome.trim(), ativo: formAtivo }
      if (tab === 'tipos_caminhao') {
        payload.eixos = formEixos
        payload.peso_pauta_kg = formPesoPauta
      }
      if (tab === 'ano_safra') {
        if (editing) await updateAnoSafra(editing.id, payload)
        else await createAnoSafra(payload)
      } else if (tab === 'tipos_nf') {
        if (editing) await updateTipoNf(editing.id, payload)
        else await createTipoNf(payload)
      } else if (tab === 'tipos_ticket') {
        if (editing) await updateTipoTicket(editing.id, payload)
        else await createTipoTicket(payload)
      } else {
        if (editing) await updateTipoCaminhao(editing.id, payload)
        else await createTipoCaminhao(payload)
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
      else if (tab === 'tipos_nf') await deleteTipoNf(id)
      else if (tab === 'tipos_ticket') await deleteTipoTicket(id)
      else await deleteTipoCaminhao(id)
      toast.success('Removido!'); load()
    } catch { toast.error('Erro ao remover') }
  }

  const currentItems = tab === 'ano_safra' ? anosSafra : tab === 'tipos_nf' ? tiposNf : tab === 'tipos_ticket' ? tiposTicket : tiposCaminhao
  const currentLabel = TABS.find(t => t.key === tab)?.label || ''

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-7 h-7 text-gray-600" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Administração</h1>
          <p className="text-sm text-gray-500">Gerencie cadastros do sistema</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <SimpleTable
        items={currentItems}
        loading={loading}
        onAdd={openNew}
        onEdit={openEdit}
        onDelete={remove}
        label={currentLabel}
      />

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white sm:rounded-xl shadow-xl w-full max-w-sm sm:mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Editar' : 'Novo'} {currentLabel}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input type="text" value={formNome} onChange={e => setFormNome(e.target.value)} autoFocus
                  placeholder={tab === 'ano_safra' ? 'Ex: 25/26' : tab === 'tipos_caminhao' ? 'Ex: Carreta' : 'Ex: Remessa para Depósito'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
              {tab === 'tipos_caminhao' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número de Eixos *</label>
                    <input type="number" value={formEixos} onChange={e => setFormEixos(Number(e.target.value))} min="0"
                      placeholder="Ex: 6"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Peso Pauta (kg) *</label>
                    <input type="number" value={formPesoPauta} onChange={e => setFormPesoPauta(Number(e.target.value))} min="0"
                      placeholder="Ex: 30000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                  </div>
                </>
              )}
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
    </div>
  )
}

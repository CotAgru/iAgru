import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Settings, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getTiposNf, createTipoNf, updateTipoNf, deleteTipoNf,
  getTiposTicket, createTipoTicket, updateTipoTicket, deleteTipoTicket,
  getTiposCaminhao, createTipoCaminhao, updateTipoCaminhao, deleteTipoCaminhao,
  getUnidadesMedida, createUnidadeMedida, updateUnidadeMedida, deleteUnidadeMedida,
  getTiposContrato, createTipoContrato, updateTipoContrato, deleteTipoContrato,
  getTiposArmazem, createTipoArmazem, updateTipoArmazem, deleteTipoArmazem,
} from '../services/api'
import { fmtInt, fmtDec } from '../utils/format'

type Tab = 'tipos_nf' | 'tipos_ticket' | 'tipos_caminhao' | 'unidades_medida' | 'tipos_contrato' | 'tipos_armazem'

const TABS: { key: Tab; label: string }[] = [
  { key: 'tipos_nf', label: 'Tipo NF' },
  { key: 'tipos_ticket', label: 'Tipo Ticket' },
  { key: 'tipos_caminhao', label: 'Tipo Caminhão' },
  { key: 'unidades_medida', label: 'Unidade de Medida' },
  { key: 'tipos_contrato', label: 'Tipo Contrato Venda' },
  { key: 'tipos_armazem', label: 'Tipo Armazém' },
]

const GRUPOS_UNIDADE = ['sólido', 'líquido', 'unitário']

function SimpleTable({
  items, loading, onAdd, onEdit, onDelete, label, extraColumns,
}: {
  items: any[]; loading: boolean; onAdd: () => void; onEdit: (item: any) => void; onDelete: (id: string) => void; label: string;
  extraColumns?: { key: string; label: string; align?: string; render: (item: any) => React.ReactNode }[];
}) {
  const cols = extraColumns || []
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-700">Cadastro de {label}</h3>
        <button onClick={onAdd} className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 text-sm">
          <Plus className="w-4 h-4" /> Novo
        </button>
      </div>
      {loading ? <p className="text-gray-400 text-sm">Carregando...</p> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nome</th>
                {cols.map(c => (
                  <th key={c.key} className={`px-4 py-3 font-semibold text-gray-600 ${c.align === 'right' ? 'text-right' : 'text-center'} w-32`}>{c.label}</th>
                ))}
                <th className="text-center px-4 py-3 font-semibold text-gray-600 w-20">Ativo</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.nome}</td>
                  {cols.map(c => (
                    <td key={c.key} className={`px-4 py-3 text-gray-600 ${c.align === 'right' ? 'text-right' : 'text-center'}`}>{c.render(item)}</td>
                  ))}
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
              {items.length === 0 && <tr><td colSpan={2 + cols.length + 1} className="px-4 py-8 text-center text-gray-400">Nenhum registro</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function Admin() {
  const [tab, setTab] = useState<Tab>('tipos_nf')
  const [tiposNf, setTiposNf] = useState<any[]>([])
  const [tiposTicket, setTiposTicket] = useState<any[]>([])
  const [tiposCaminhao, setTiposCaminhao] = useState<any[]>([])
  const [unidadesMedida, setUnidadesMedida] = useState<any[]>([])
  const [tiposContrato, setTiposContrato] = useState<any[]>([])
  const [tiposArmazem, setTiposArmazem] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [formNome, setFormNome] = useState('')
  const [formAtivo, setFormAtivo] = useState(true)
  const [formEixos, setFormEixos] = useState(0)
  const [formPesoPauta, setFormPesoPauta] = useState(0)
  // Unidade de Medida
  const [formSimbolo, setFormSimbolo] = useState('')
  const [formGrupo, setFormGrupo] = useState('sólido')
  const [formFatorConversao, setFormFatorConversao] = useState('1')
  const [formDescricao, setFormDescricao] = useState('')
  // Tipo Contrato
  const [formCor, setFormCor] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([getTiposNf(), getTiposTicket(), getTiposCaminhao(), getUnidadesMedida().catch(() => []), getTiposContrato().catch(() => []), getTiposArmazem().catch(() => [])])
      .then(([tn, tt, tc, um, tcon, tarm]) => { setTiposNf(tn); setTiposTicket(tt); setTiposCaminhao(tc); setUnidadesMedida(um); setTiposContrato(tcon); setTiposArmazem(tarm) })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openNew = () => { 
    setEditing(null); setFormNome(''); setFormAtivo(true); setFormEixos(0); setFormPesoPauta(0)
    setFormSimbolo(''); setFormGrupo('sólido'); setFormFatorConversao('1'); setFormDescricao('')
    setFormCor(''); setShowForm(true) 
  }
  const openEdit = (item: any) => { 
    setEditing(item); setFormNome(item.nome); setFormAtivo(item.ativo)
    setFormEixos(item.eixos || 0); setFormPesoPauta(item.peso_pauta_kg || 0)
    setFormSimbolo(item.simbolo || ''); setFormGrupo(item.grupo || 'sólido')
    setFormFatorConversao(item.fator_conversao != null ? String(item.fator_conversao) : '1')
    setFormDescricao(item.descricao || ''); setFormCor(item.cor || '')
    setShowForm(true) 
  }

  const save = async () => {
    if (!formNome.trim()) { toast.error('Nome é obrigatório'); return }
    if (tab === 'tipos_caminhao' && formEixos < 0) { toast.error('Eixos deve ser >= 0'); return }
    if (tab === 'tipos_caminhao' && formPesoPauta < 0) { toast.error('Peso pauta deve ser >= 0'); return }
    if (tab === 'unidades_medida' && !formSimbolo.trim()) { toast.error('Símbolo é obrigatório'); return }
    if (tab === 'unidades_medida' && !formGrupo) { toast.error('Grupo é obrigatório'); return }
    setSaving(true)
    try {
      const payload: any = { nome: formNome.trim(), ativo: formAtivo }
      if (tab === 'tipos_caminhao') {
        payload.eixos = formEixos
        payload.peso_pauta_kg = formPesoPauta
      } else if (tab === 'unidades_medida') {
        payload.simbolo = formSimbolo.trim()
        payload.grupo = formGrupo
        payload.fator_conversao = parseFloat(formFatorConversao.replace(',', '.')) || 1
        payload.descricao = formDescricao || null
      } else if (tab === 'tipos_contrato') {
        payload.descricao = formDescricao || null
        payload.cor = formCor || null
      } else if (tab === 'tipos_armazem') {
        payload.descricao = formDescricao || null
      }
      if (tab === 'tipos_nf') {
        if (editing) await updateTipoNf(editing.id, payload)
        else await createTipoNf(payload)
      } else if (tab === 'tipos_ticket') {
        if (editing) await updateTipoTicket(editing.id, payload)
        else await createTipoTicket(payload)
      } else if (tab === 'tipos_caminhao') {
        if (editing) await updateTipoCaminhao(editing.id, payload)
        else await createTipoCaminhao(payload)
      } else if (tab === 'unidades_medida') {
        if (editing) await updateUnidadeMedida(editing.id, payload)
        else await createUnidadeMedida(payload)
      } else if (tab === 'tipos_contrato') {
        if (editing) await updateTipoContrato(editing.id, payload)
        else await createTipoContrato(payload)
      } else if (tab === 'tipos_armazem') {
        if (editing) await updateTipoArmazem(editing.id, payload)
        else await createTipoArmazem(payload)
      }
      toast.success(editing ? 'Atualizado!' : 'Criado!')
      setShowForm(false); load()
    } catch (err: any) { toast.error('Erro: ' + (err?.message || '')) }
    finally { setSaving(false) }
  }

  const remove = async (id: string) => {
    if (!confirm('Deseja remover este registro?')) return
    try {
      if (tab === 'tipos_nf') await deleteTipoNf(id)
      else if (tab === 'tipos_ticket') await deleteTipoTicket(id)
      else if (tab === 'tipos_caminhao') await deleteTipoCaminhao(id)
      else if (tab === 'unidades_medida') await deleteUnidadeMedida(id)
      else if (tab === 'tipos_contrato') await deleteTipoContrato(id)
      else if (tab === 'tipos_armazem') await deleteTipoArmazem(id)
      toast.success('Removido!'); load()
    } catch { toast.error('Erro ao remover') }
  }

  const currentItems = tab === 'tipos_nf' ? tiposNf : tab === 'tipos_ticket' ? tiposTicket : tab === 'tipos_caminhao' ? tiposCaminhao : tab === 'unidades_medida' ? unidadesMedida : tab === 'tipos_contrato' ? tiposContrato : tiposArmazem
  const currentLabel = TABS.find(t => t.key === tab)?.label || ''

  const extraColumns = tab === 'tipos_caminhao'
    ? [
        { key: 'eixos', label: 'Eixos', render: (item: any) => item.eixos || 0 },
        { key: 'peso_pauta_kg', label: 'Peso Pauta (kg)', render: (item: any) => fmtInt(item.peso_pauta_kg || 0) },
      ]
    : tab === 'unidades_medida'
    ? [
        { key: 'simbolo', label: 'Símbolo', render: (item: any) => <span className="font-mono font-bold text-blue-700">{item.simbolo}</span> },
        { key: 'grupo', label: 'Grupo', render: (item: any) => <span className="capitalize">{item.grupo}</span> },
        { key: 'fator_conversao', label: 'Fator Conversão', align: 'right' as const, render: (item: any) => fmtDec(item.fator_conversao, 6) },
      ]
    : tab === 'tipos_contrato'
    ? [
        { key: 'descricao', label: 'Descrição', render: (item: any) => item.descricao || '-' },
      ]
    : tab === 'tipos_armazem'
    ? [
        { key: 'descricao', label: 'Descrição', render: (item: any) => item.descricao || '-' },
      ]
    : undefined

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
        extraColumns={extraColumns}
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
                  placeholder={tab === 'tipos_caminhao' ? 'Ex: Carreta' : tab === 'unidades_medida' ? 'Ex: Quilograma' : tab === 'tipos_contrato' ? 'Ex: Fixo' : 'Ex: Remessa para Depósito'}
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
              {tab === 'unidades_medida' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Símbolo *</label>
                      <input type="text" value={formSimbolo} onChange={e => setFormSimbolo(e.target.value)}
                        placeholder="Ex: kg, tn, lt"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Grupo *</label>
                      <select value={formGrupo} onChange={e => setFormGrupo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                        {GRUPOS_UNIDADE.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fator de Conversão *</label>
                    <input type="text" value={formFatorConversao} onChange={e => setFormFatorConversao(e.target.value)}
                      placeholder="Ex: 1000 (1 tn = 1000 kg)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                    <p className="text-xs text-gray-400 mt-1">Quantas unidades base equivalem a 1 desta unidade (ex: 1 tn = 1.000 kg → fator = 1000)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                    <input type="text" value={formDescricao} onChange={e => setFormDescricao(e.target.value)}
                      placeholder="Ex: 1 tonelada = 1000 kg"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                  </div>
                </>
              )}
              {tab === 'tipos_contrato' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                    <input type="text" value={formDescricao} onChange={e => setFormDescricao(e.target.value)}
                      placeholder="Ex: Contrato com preço fixado"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                  </div>
                </>
              )}
              {tab === 'tipos_armazem' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                    <input type="text" value={formDescricao} onChange={e => setFormDescricao(e.target.value)}
                      placeholder="Ex: Estrutura convencional de armazenamento"
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

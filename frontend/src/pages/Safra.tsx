import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Loader2, Wheat } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAnosSafra, createAnoSafra, updateAnoSafra, deleteAnoSafra } from '../services/api'

type Tab = 'ano_safra' | 'culturas' | 'tipos_safra' | 'safras'

const TABS: { key: Tab; label: string }[] = [
  { key: 'ano_safra', label: 'Ano Safra' },
  { key: 'culturas', label: 'Culturas' },
  { key: 'tipos_safra', label: 'Tipos de Safra' },
  { key: 'safras', label: 'Safras' },
]

export default function Safra() {
  const [tab, setTab] = useState<Tab>('ano_safra')
  const [anosSafra, setAnosSafra] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [formNome, setFormNome] = useState('')
  const [formAtivo, setFormAtivo] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    getAnosSafra()
      .then(setAnosSafra)
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openNew = () => { setEditing(null); setFormNome(''); setFormAtivo(true); setShowForm(true) }
  const openEdit = (item: any) => { setEditing(item); setFormNome(item.nome); setFormAtivo(item.ativo); setShowForm(true) }

  const save = async () => {
    if (!formNome.trim()) { toast.error('Nome é obrigatório'); return }
    setSaving(true)
    try {
      const payload = { nome: formNome.trim(), ativo: formAtivo }
      if (tab === 'ano_safra') {
        if (editing) await updateAnoSafra(editing.id, payload)
        else await createAnoSafra(payload)
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
      toast.success('Removido!'); load()
    } catch { toast.error('Erro ao remover') }
  }

  const isComingSoon = tab !== 'ano_safra'

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

      {isComingSoon ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
          <Wheat className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-amber-800 mb-2">Em Breve</h3>
          <p className="text-sm text-amber-600 max-w-md mx-auto">
            {tab === 'culturas' && 'Cadastro de culturas agrícolas (Soja, Milho, Sorgo, Feijão, etc.). Será implementado na próxima fase com a Migration v12.'}
            {tab === 'tipos_safra' && 'Cadastro de tipos de safra (Verão, Safrinha, Inverno). Será implementado na próxima fase com a Migration v12.'}
            {tab === 'safras' && 'Gestão completa de safras combinando Ano Safra + Cultura + Tipo (ex: "Soja Verão 24/25"). Será implementado na próxima fase com a Migration v12.'}
          </p>
        </div>
      ) : (
        <>
          {/* Tabela Ano Safra */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-700">Cadastro de Ano Safra</h3>
            <button onClick={openNew} className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 text-sm">
              <Plus className="w-4 h-4" /> Novo
            </button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-400 py-8 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
            </div>
          ) : (
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
                  {anosSafra.map((item: any) => (
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
                  {anosSafra.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">Nenhum ano safra cadastrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal de formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white sm:rounded-xl shadow-xl w-full max-w-sm sm:mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Editar' : 'Novo'} Ano Safra</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input type="text" value={formNome} onChange={e => setFormNome(e.target.value)} autoFocus
                  placeholder="Ex: 25/26"
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
    </div>
  )
}

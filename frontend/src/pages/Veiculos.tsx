import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { getVeiculos, createVeiculo, updateVeiculo, deleteVeiculo, getCadastros } from '../services/api'

// Tipos ANTT com correlacao eixos / peso pauta (carga liquida)
const TIPOS_CAMINHAO = [
  { nome: 'Toco', eixos: 2, peso_pauta_kg: 8000 },
  { nome: 'Truck', eixos: 3, peso_pauta_kg: 14000 },
  { nome: 'Bi-Truck', eixos: 4, peso_pauta_kg: 20000 },
  { nome: 'Carreta LS', eixos: 5, peso_pauta_kg: 27000 },
  { nome: 'Carreta', eixos: 6, peso_pauta_kg: 37000 },
  { nome: 'Bitrem', eixos: 7, peso_pauta_kg: 42000 },
  { nome: 'Rodotrem', eixos: 9, peso_pauta_kg: 57000 },
  { nome: 'Treminhao', eixos: 9, peso_pauta_kg: 57000 },
  { nome: 'Outro', eixos: 0, peso_pauta_kg: 0 },
]

const emptyForm = { cadastro_id: '', placa: '', tipo_caminhao: 'Carreta', eixos: 6, peso_pauta_kg: 37000, marca: '', modelo: '', ano: '', observacoes: '', ativo: true }

export default function Veiculos() {
  const [items, setItems] = useState<any[]>([])
  const [proprietarios, setProprietarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)

  const load = () => {
    setLoading(true)
    Promise.all([getVeiculos(), getCadastros()])
      .then(([v, c]) => {
        setItems(v)
        setProprietarios(c.filter((x: any) => (x.tipos || []).some((t: string) => ['Transportadora', 'Motorista'].includes(t))))
      })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const onTipoChange = (tipo: string) => {
    const found = TIPOS_CAMINHAO.find(t => t.nome === tipo)
    setForm(prev => ({
      ...prev,
      tipo_caminhao: tipo,
      eixos: found?.eixos ?? 0,
      peso_pauta_kg: found?.peso_pauta_kg ?? 0,
    }))
  }

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (item: any) => {
    setEditing(item)
    setForm({
      cadastro_id: item.cadastro_id, placa: item.placa, tipo_caminhao: item.tipo_caminhao,
      eixos: item.eixos, peso_pauta_kg: item.peso_pauta_kg,
      marca: item.marca || '', modelo: item.modelo || '',
      ano: item.ano?.toString() || '', observacoes: item.observacoes || '', ativo: item.ativo,
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.cadastro_id || !form.placa || !form.tipo_caminhao) { toast.error('Proprietário, placa e tipo são obrigatórios'); return }
    const data = { ...form, ano: form.ano ? Number(form.ano) : null }
    try {
      if (editing) { await updateVeiculo(editing.id, data); toast.success('Veículo atualizado') }
      else { await createVeiculo(data); toast.success('Veiculo cadastrado') }
      setShowForm(false); load()
    } catch { toast.error('Erro ao salvar') }
  }

  const remove = async (id: string) => {
    if (!confirm('Deseja remover este veiculo?')) return
    try { await deleteVeiculo(id); toast.success('Veiculo removido'); load() }
    catch { toast.error('Erro ao remover') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Veiculos</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 sm:px-4 rounded-lg hover:bg-green-700 text-sm sm:text-base whitespace-nowrap"><Plus className="w-4 h-4" /> <span className="hidden sm:inline">Novo</span> Veiculo</button>
      </div>

      {loading ? <p className="text-gray-500">Carregando...</p> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto -mx-3 sm:mx-0">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Placa</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Tipo Caminhao</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Eixos</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Marca/Modelo</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Proprietário</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Peso Pauta (Kg)</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium">{item.placa}</td>
                  <td className="px-4 py-3">{item.tipo_caminhao}</td>
                  <td className="px-4 py-3 text-center">{item.eixos}</td>
                  <td className="px-4 py-3 text-gray-600">{[item.marca, item.modelo].filter(Boolean).join(' ') || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{item.proprietario_nome || '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold">{item.peso_pauta_kg ? Number(item.peso_pauta_kg).toLocaleString('pt-BR') : '-'}</td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhum veiculo cadastrado</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white sm:rounded-xl shadow-xl w-full max-w-lg sm:mx-4 max-h-screen sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Editar Veiculo' : 'Novo Veiculo'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proprietario (Transportadora/Motorista) *</label>
                <select value={form.cadastro_id} onChange={e => setForm({...form, cadastro_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  <option value="">Selecione...</option>
                  {proprietarios.map((f: any) => <option key={f.id} value={f.id}>{f.nome_fantasia || f.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Placa *</label>
                  <input type="text" value={form.placa} onChange={e => setForm({...form, placa: e.target.value.toUpperCase()})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Caminhao *</label>
                  <select value={form.tipo_caminhao} onChange={e => onTipoChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    {TIPOS_CAMINHAO.map(t => <option key={t.nome} value={t.nome}>{t.nome} ({t.eixos} eixos)</option>)}
                  </select>
                </div>
              </div>

              {/* Eixos e Peso Pauta (preenchidos automaticamente) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Eixos</label>
                  <input type="number" value={form.eixos} readOnly
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso Pauta (Kg)</label>
                  <input type="number" value={form.peso_pauta_kg} readOnly
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 font-semibold" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                  <input type="text" value={form.marca} onChange={e => setForm({...form, marca: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                  <input type="text" value={form.modelo} onChange={e => setForm({...form, modelo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
                <input type="number" value={form.ano} onChange={e => setForm({...form, ano: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
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

import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Warehouse, Plus, Pencil, MapPin, Loader2, Filter, X, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCadastros, getUnidadesArmazenadoras } from '../../services/api'
import { fmtInt } from '../../utils/format'
import MultiSearchableSelect from '../../components/MultiSearchableSelect'

export default function UnidadesArmazenadoras() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [armazens, setArmazens] = useState<any[]>([])
  const [unidades, setUnidades] = useState<any[]>([])
  
  // Sistema de filtros
  const [busca, setBusca] = useState('')
  const [activeFilters, setActiveFilters] = useState<{id: string, field: string, value: string[]}[]>([])
  const [showFilterOptions, setShowFilterOptions] = useState(false)
  
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [cadastros, unidadesData] = await Promise.all([
          getCadastros(),
          getUnidadesArmazenadoras()
        ])
        
        // Filtrar apenas cadastros do tipo Armazem
        const armazensCadastrados = cadastros.filter((c: any) => 
          (c.tipos || []).includes('Armazem')
        )
        
        // Enriquecer com dados de unidades armazenadoras
        const armazensComUnidade = armazensCadastrados.map((arm: any) => {
          const unidade = unidadesData.find((u: any) => u.cadastro_id === arm.id)
          return {
            ...arm,
            unidade_sigla: unidade?.sigla,
            unidade_tipo: unidade?.tipo,
            unidade_capacidade: unidade?.capacidade_total_tons
          }
        })
        
        setArmazens(armazensComUnidade)
        setUnidades(unidadesData)
      } catch (err: any) {
        toast.error('Erro ao carregar armazéns: ' + (err?.message || ''))
      } finally {
        setLoading(false)
      }
    }
    
    load()
  }, [])
  
  const handleNovoCadastro = () => {
    navigate('/cadastros?novo=armazem')
  }
  
  const handleEditar = (armazemId: string) => {
    navigate(`/cadastros?editar=${armazemId}`)
  }

  // Funções de filtro
  const addFilter = (field: string) => {
    const id = Date.now().toString()
    setActiveFilters([...activeFilters, { id, field, value: [] }])
    setShowFilterOptions(false)
  }

  const removeFilter = (id: string) => {
    setActiveFilters(activeFilters.filter(f => f.id !== id))
  }

  const updateFilterValue = (id: string, value: string[]) => {
    setActiveFilters(activeFilters.map(f => f.id === id ? { ...f, value } : f))
  }

  // Opções de filtros disponíveis
  const availableFilters = [
    { field: 'cidade', label: 'Cidade' },
    { field: 'uf', label: 'UF' },
    { field: 'tipo', label: 'Tipo' },
  ]

  const unusedFilters = availableFilters.filter(
    af => !activeFilters.some(f => f.field === af.field)
  )

  // Lógica de filtragem
  const filtered = useMemo(() => {
    let result = [...armazens]

    // Busca global
    if (busca.trim()) {
      const lower = busca.toLowerCase()
      result = result.filter(arm =>
        (arm.nome_fantasia || arm.nome || '').toLowerCase().includes(lower) ||
        (arm.unidade_sigla || '').toLowerCase().includes(lower) ||
        (arm.cidade || '').toLowerCase().includes(lower) ||
        (arm.uf || '').toLowerCase().includes(lower)
      )
    }

    // Filtros ativos
    activeFilters.forEach(filter => {
      if (filter.value.length === 0) return
      
      result = result.filter(arm => {
        const fieldValue = filter.field === 'tipo' 
          ? arm.unidade_tipo 
          : arm[filter.field]
        
        return filter.value.includes(String(fieldValue || ''))
      })
    })

    return result
  }, [armazens, busca, activeFilters])

  // Opções para cada filtro
  const getFilterOptions = (field: string) => {
    const uniqueValues = new Set(
      armazens.map(arm => {
        if (field === 'tipo') return arm.unidade_tipo
        return arm[field]
      }).filter(Boolean)
    )
    return Array.from(uniqueValues).sort().map(v => ({ value: String(v), label: String(v) }))
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-blue-600" /> 
            Unidades Armazenadoras
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie os armazéns cadastrados no sistema
          </p>
        </div>
        <button 
          onClick={handleNovoCadastro}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
        >
          <Plus className="w-4 h-4" /> 
          <span className="hidden sm:inline">Cadastrar Novo</span> Armazém
        </button>
      </div>

      {/* Área de Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
        {/* Busca Global */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, sigla, cidade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filtros Ativos */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeFilters.map(filter => {
              const filterDef = availableFilters.find(f => f.field === filter.field)
              return (
                <div key={filter.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <span className="text-xs font-medium text-gray-600">{filterDef?.label}:</span>
                  <MultiSearchableSelect
                    values={filter.value}
                    onChange={(values) => updateFilterValue(filter.id, values)}
                    options={getFilterOptions(filter.field)}
                    placeholder={`Selecione ${filterDef?.label.toLowerCase()}...`}
                  />
                  <button
                    onClick={() => removeFilter(filter.id)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Remover filtro"
                  >
                    <X className="w-3 h-3 text-gray-500" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Botão Adicionar Filtro */}
        {unusedFilters.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowFilterOptions(!showFilterOptions)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Adicionar Filtro
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showFilterOptions && (
              <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-64">
                {unusedFilters.map(filter => (
                  <button
                    key={filter.field}
                    onClick={() => addFilter(filter.field)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm first:rounded-t-lg last:rounded-b-lg transition-colors"
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contador de Resultados */}
        <div className="text-sm text-gray-600">
          Mostrando <strong>{filtered.length}</strong> de <strong>{armazens.length}</strong> armazéns
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gray-100 rounded-full">
              <Warehouse className="w-12 h-12 text-gray-400" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum armazém cadastrado</h3>
          <p className="text-gray-500 mb-4">
            Cadastre seu primeiro armazém para começar a gestão de armazenagem.
          </p>
          <button 
            onClick={handleNovoCadastro}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Cadastrar Primeiro Armazém
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Sigla</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Cidade</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">UF</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tipo</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Capacidade (ton)</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((arm: any) => (
                  <tr key={arm.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {arm.nome_fantasia || arm.nome}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {arm.unidade_sigla || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {arm.cidade}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{arm.uf}</td>
                    <td className="px-4 py-3">
                      {arm.unidade_tipo ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                          {arm.unidade_tipo}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium">
                      {arm.unidade_capacidade ? fmtInt(arm.unidade_capacidade) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditar(arm.id)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Editar armazém"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
            Total: <strong>{armazens.length}</strong> {armazens.length === 1 ? 'armazém' : 'armazéns'} cadastrado{armazens.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Warehouse className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-900 mb-1">
              Cadastro Integrado
            </h4>
            <p className="text-sm text-blue-700">
              Os armazéns agora são gerenciados através da tela de <strong>Cadastros</strong>. 
              Ao cadastrar um novo armazém, você terá acesso aos campos específicos de Sigla, Tipo e Capacidade.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

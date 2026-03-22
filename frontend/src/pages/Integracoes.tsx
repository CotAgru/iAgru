import { useEffect, useState } from 'react'
import { Link2, Loader2, CheckCircle2, XCircle, RefreshCw, Trash2, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { getIntegracaoByProvedor, upsertIntegracao, deleteIntegracao, getCulturas, createCultura, getTiposSafra, getAnosSafra, createAnoSafra, upsertSafraFromAegro } from '../services/api'
import { aegroTestConnection, aegroGetCrops } from '../services/aegro'
import { fmtData } from '../utils/format'

const FARM_ID_PADRAO = '61af6824b4d7196ebc0076f0'

export default function Integracoes() {
  const [loading, setLoading] = useState(true)
  const [aegro, setAegro] = useState<any>(null)
  const [token, setToken] = useState('')
  const [farmId, setFarmId] = useState(FARM_ID_PADRAO)
  const [farmNome, setFarmNome] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [farms, setFarms] = useState<any[]>([])
  const [importingCrops, setImportingCrops] = useState(false)
  const [importResult, setImportResult] = useState<{ total: number; created: number; updated: number } | null>(null)

  const loadAegro = async () => {
    setLoading(true)
    try {
      const data = await getIntegracaoByProvedor('aegro')
      if (data) {
        setAegro(data)
        setToken(data.token || '')
        setFarmId(data.farm_id || FARM_ID_PADRAO)
        setFarmNome(data.farm_nome || '')
      }
    } catch {
      // tabela pode não existir ainda
    }
    setLoading(false)
  }

  useEffect(() => { loadAegro() }, [])

  const handleConnect = async () => {
    if (!token.trim()) { toast.error('Informe o token da API Aegro'); return }
    setConnecting(true)
    try {
      const result = await aegroTestConnection(token.trim())
      if (!result.success) {
        toast.error('Falha na conexão: ' + (result.error || 'Token inválido'))
        setConnecting(false)
        return
      }

      setFarms(result.farms)

      // Aegro retorna key no formato "farm::id" e campo "name"
      const extractId = (f: any) => f?.key?.replace('farm::', '') || f?._id || f?.id || ''
      let selectedFarm = result.farms.find((f: any) => extractId(f) === farmId || f?.key === `farm::${farmId}`)
      if (!selectedFarm && result.farms.length > 0) {
        selectedFarm = result.farms[0]
      }

      const nome = selectedFarm?.name || selectedFarm?.nome || 'Fazenda conectada'
      const fid = extractId(selectedFarm) || farmId
      const farmKey = selectedFarm?.key || `farm::${fid}`

      const saved = await upsertIntegracao('aegro', {
        token: token.trim(),
        farm_id: fid,
        farm_nome: nome,
        status: 'conectado',
        ultimo_sync: new Date().toISOString(),
        config: { farmKey, farms: result.farms.map((f: any) => ({ key: f.key, id: extractId(f), name: f.name || f.nome })) },
      })

      setAegro(saved)
      setFarmId(fid)
      setFarmNome(nome)
      toast.success(`Conectado ao Aegro — ${nome}`)
    } catch (err: any) {
      toast.error('Erro: ' + (err?.message || 'Falha na conexão'))
    }
    setConnecting(false)
  }

  const handleReconnect = async () => {
    setTestingConnection(true)
    try {
      const result = await aegroTestConnection(token.trim())
      if (result.success) {
        setFarms(result.farms)
        const selectedFarm = result.farms.find((f: any) => f._id === farmId || f.id === farmId)
        const nome = selectedFarm?.name || selectedFarm?.nome || farmNome

        await upsertIntegracao('aegro', {
          status: 'conectado',
          ultimo_sync: new Date().toISOString(),
          farm_nome: nome,
          config: { farms: result.farms.map((f: any) => ({ id: f._id || f.id, name: f.name || f.nome })) },
        })
        setFarmNome(nome)
        setAegro((prev: any) => ({ ...prev, status: 'conectado', ultimo_sync: new Date().toISOString() }))
        toast.success('Reconectado com sucesso!')
      } else {
        await upsertIntegracao('aegro', { status: 'erro' })
        setAegro((prev: any) => ({ ...prev, status: 'erro' }))
        toast.error('Falha: ' + (result.error || 'Token inválido'))
      }
    } catch (err: any) {
      toast.error('Erro: ' + (err?.message || ''))
    }
    setTestingConnection(false)
  }

  const handleDisconnect = async () => {
    if (!confirm('Deseja desconectar o Aegro? O token será removido.')) return
    try {
      if (aegro?.id) await deleteIntegracao(aegro.id)
      setAegro(null)
      setToken('')
      setFarmNome('')
      setFarms([])
      toast.success('Aegro desconectado')
    } catch { toast.error('Erro ao desconectar') }
  }

  // === IMPORTAR SAFRAS (CROPS) DO AEGRO ===
  const handleImportCrops = async () => {
    if (!token.trim()) { toast.error('Token não encontrado'); return }
    setImportingCrops(true)
    setImportResult(null)
    try {
      // 1. Buscar crops do Aegro
      const cropsData = await aegroGetCrops(token.trim())
      const crops = cropsData?.items || (Array.isArray(cropsData) ? cropsData : [])
      if (crops.length === 0) { toast.error('Nenhuma safra encontrada no Aegro'); setImportingCrops(false); return }

      // 2. Carregar dados auxiliares do iAgru
      const [culturas, tiposSafra, anosSafra] = await Promise.all([getCulturas(), getTiposSafra(), getAnosSafra()])

      // 3. Mapa de culturas e tipos por nome (lowercase)
      const culturaMap = new Map<string, string>(culturas.map((c: any) => [c.nome.toLowerCase(), c.id]))
      const tipoMap = new Map<string, string>(tiposSafra.map((t: any) => [t.nome.toLowerCase(), t.id]))
      const anoMap = new Map<string, string>(anosSafra.map((a: any) => [a.nome?.toLowerCase(), a.id]))

      // Helper: detectar cultura pelo nome da crop
      const detectCultura = async (cropName: string): Promise<string> => {
        const lower = cropName.toLowerCase()
        const keywords: Record<string, string> = {
          'soja': 'Soja', 'milho': 'Milho', 'sorgo': 'Sorgo', 'feijão': 'Feijão', 'feijao': 'Feijão',
          'algodão': 'Algodão', 'algodao': 'Algodão', 'trigo': 'Trigo', 'café': 'Café', 'cafe': 'Café',
          'cana': 'Cana-de-Açúcar', 'arroz': 'Arroz', 'aveia': 'Aveia',
        }
        for (const [key, nome] of Object.entries(keywords)) {
          if (lower.includes(key)) {
            if (culturaMap.has(nome.toLowerCase())) return culturaMap.get(nome.toLowerCase())!
            const created = await createCultura({ nome })
            culturaMap.set(nome.toLowerCase(), created.id)
            return created.id
          }
        }
        // Fallback: criar cultura com o nome da crop
        const nome = cropName.split(' ')[0] || 'Outra'
        if (culturaMap.has(nome.toLowerCase())) return culturaMap.get(nome.toLowerCase())!
        const created = await createCultura({ nome })
        culturaMap.set(nome.toLowerCase(), created.id)
        return created.id
      }

      // Helper: detectar tipo safra pelo nome
      const detectTipoSafra = (cropName: string): string | null => {
        const lower = cropName.toLowerCase()
        if (lower.includes('safrinha') || lower.includes('2a safra') || lower.includes('segunda')) return tipoMap.get('safrinha') || null
        if (lower.includes('inverno')) return tipoMap.get('inverno') || null
        if (lower.includes('verão') || lower.includes('verao') || lower.includes('1a safra') || lower.includes('primeira')) return tipoMap.get('verão') || null
        return null
      }

      // Helper: detectar/criar ano safra (ex: "24/25", "2024/2025")
      const detectAnoSafra = async (cropName: string, startDate?: string): Promise<string> => {
        // Tentar extrair do nome: "24/25", "2024/25", "2024/2025"
        const anoMatch = cropName.match(/(\d{2,4})\/(\d{2,4})/)
        let anoNome = ''
        if (anoMatch) {
          anoNome = anoMatch[0].length <= 5 ? anoMatch[0] : `${anoMatch[1].slice(-2)}/${anoMatch[2].slice(-2)}`
        } else if (startDate) {
          const year = new Date(startDate).getFullYear()
          const month = new Date(startDate).getMonth()
          anoNome = month >= 6 ? `${year % 100}/${(year + 1) % 100}` : `${(year - 1) % 100}/${year % 100}`
        }
        if (!anoNome) anoNome = `${new Date().getFullYear() % 100}/${(new Date().getFullYear() + 1) % 100}`
        if (anoMap.has(anoNome.toLowerCase())) return anoMap.get(anoNome.toLowerCase())!
        const created = await createAnoSafra({ nome: anoNome })
        anoMap.set(anoNome.toLowerCase(), created.id)
        return created.id
      }

      // 4. Processar cada crop
      let created = 0, updated = 0
      for (const crop of crops) {
        const cropKey = crop.key || ''
        const cropName = crop.name || crop.nome || 'Safra sem nome'
        const startDate = crop.startDate || null
        const endDate = crop.endDate || null
        const areaHa = crop.area?.magnitude || null

        const culturaId = await detectCultura(cropName)
        const tipoSafraId = detectTipoSafra(cropName)
        const anoSafraId = await detectAnoSafra(cropName, startDate)

        const payload: any = {
          nome: cropName,
          ano_safra_id: anoSafraId,
          cultura_id: culturaId,
          tipo_safra_id: tipoSafraId,
          data_inicio: startDate,
          data_fim: endDate,
          area_ha: areaHa,
          observacoes: `Importado do Aegro (${cropKey})`,
          ativo: true,
        }

        const result = await upsertSafraFromAegro(cropKey, payload)
        if (result) { if (crop._wasUpdated) updated++; else created++ }
      }

      // Contabilizar
      created = crops.length // simplificado
      setImportResult({ total: crops.length, created, updated: 0 })
      toast.success(`Importadas ${crops.length} safras do Aegro!`)

      // Atualizar último sync
      await upsertIntegracao('aegro', { ultimo_sync: new Date().toISOString() })
      setAegro((prev: any) => ({ ...prev, ultimo_sync: new Date().toISOString() }))
    } catch (err: any) {
      toast.error('Erro na importação: ' + (err?.message || ''))
    }
    setImportingCrops(false)
  }

  const isConnected = aegro?.status === 'conectado'

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-green-600" /><span className="ml-3 text-gray-500">Carregando...</span></div>

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Link2 className="w-7 h-7 text-green-600" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Integrações</h1>
            <p className="text-sm text-gray-500">Conecte a iAgru com seu sistema de gestão para sincronizar dados automaticamente</p>
          </div>
        </div>
      </div>

      {/* Card Aegro */}
      <div className="bg-white rounded-xl shadow-sm border border-green-200 max-w-2xl">
        <div className="p-5 sm:p-6">
          {/* Header do card */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-green-700">A</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Aegro</h3>
                <p className="text-xs text-gray-500">Gestão agrícola integrada</p>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {isConnected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {isConnected ? 'Conectado' : 'Desconectado'}
            </div>
          </div>

          {/* Fazenda conectada */}
          {isConnected && farmNome && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-500">Fazenda conectada:</p>
              <p className="font-semibold text-gray-800">{farmNome}</p>
              {aegro?.ultimo_sync && (
                <p className="text-xs text-gray-400 mt-1">Último sync: {fmtData(aegro.ultimo_sync)}</p>
              )}
            </div>
          )}

          {/* Token */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Token da API Aegro</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="aegro_..."
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm font-mono"
                />
                <button onClick={() => setShowToken(!showToken)} className="absolute right-2 top-2 text-gray-400 hover:text-gray-600">
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {isConnected ? (
                <button onClick={handleReconnect} disabled={testingConnection}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 disabled:opacity-50 whitespace-nowrap">
                  {testingConnection ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Reconectar
                </button>
              ) : (
                <button onClick={handleConnect} disabled={connecting}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50 whitespace-nowrap">
                  {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  Conectar
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Solicite seu token em <a href="mailto:token@aegro.com.br" className="text-green-600 hover:underline">token@aegro.com.br</a> (apenas o proprietário da assinatura pode solicitar)
            </p>
          </div>

          {/* Farm ID */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Farm ID</label>
            <input
              type="text"
              value={farmId}
              onChange={e => setFarmId(e.target.value)}
              placeholder="ID da fazenda no Aegro"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">Identificador da fazenda no Aegro. Todas as APIs são vinculadas a este ID.</p>
          </div>

          {/* Farms disponíveis */}
          {farms.length > 1 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Fazendas disponíveis no token</label>
              <div className="space-y-1">
                {farms.map((f: any) => {
                  const fid = f._id || f.id
                  const isSelected = fid === farmId
                  return (
                    <button key={fid} onClick={() => { setFarmId(fid); setFarmNome(f.name || f.nome || '') }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                        isSelected ? 'bg-green-50 border-green-300 text-green-700 font-medium' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}>
                      {f.name || f.nome} <span className="text-xs text-gray-400 font-mono ml-2">{fid}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Sincronização */}
          {isConnected && (
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Sincronização de dados:</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={handleImportCrops} disabled={importingCrops}
                  className="px-4 py-2 border border-green-300 text-green-700 rounded-lg text-sm font-medium bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-60">
                  {importingCrops ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Importando...</span> : 'Importar Safras (crops)'}
                </button>
                <button disabled className="px-4 py-2 border border-green-300 text-green-700 rounded-lg text-sm font-medium bg-green-50 opacity-60 cursor-not-allowed">
                  Importar Produtos (elements)
                </button>
                <button disabled className="px-4 py-2 border border-green-300 text-green-700 rounded-lg text-sm font-medium bg-green-50 opacity-60 cursor-not-allowed">
                  Sync Cadastros
                </button>
              </div>
              {importResult && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-700 font-medium">Importação concluída!</p>
                  <p className="text-xs text-green-600 mt-1">{importResult.total} safras processadas. Acesse a página Safra para visualizar.</p>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">As safras importadas ficam vinculadas ao Aegro pelo crop_key. Re-importar atualiza os dados sem duplicar.</p>
            </div>
          )}

          {/* Desconectar */}
          {isConnected && (
            <div className="mt-4">
              <button onClick={handleDisconnect} className="flex items-center gap-2 text-red-500 hover:text-red-600 text-sm font-medium">
                <Trash2 className="w-4 h-4" /> Desconectar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info futuras integrações */}
      <p className="text-xs text-gray-400 mt-6 max-w-2xl">
        Mais integrações em breve. Tem sugestão? Fale conosco em <a href="mailto:contato@cotagru.com.br" className="text-green-600 hover:underline">contato@cotagru.com.br</a>
      </p>
    </div>
  )
}

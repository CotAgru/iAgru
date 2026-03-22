/**
 * Serviço de integração com a API do Aegro
 * Usa proxy Vercel serverless (/api/aegro-proxy) para contornar CORS
 * Documentação Aegro: https://api.aegro.com.br
 */

async function aegroFetch(endpoint: string, token: string) {
  const resp = await fetch('/api/aegro-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, token }),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }))
    throw new Error(err?.error || err?.detail || `Erro ${resp.status}`)
  }
  return resp.json()
}

// Testar conexão — busca as farms vinculadas ao token
export async function aegroTestConnection(token: string): Promise<{ success: boolean; farms: any[]; error?: string }> {
  try {
    const farms = await aegroFetch('/farms', token)
    return { success: true, farms: Array.isArray(farms) ? farms : [] }
  } catch (err: any) {
    return { success: false, farms: [], error: err.message }
  }
}

// Buscar fazendas
export async function aegroGetFarms(token: string): Promise<any[]> {
  return aegroFetch('/farms', token)
}

// Buscar safras (crops) de uma fazenda
export async function aegroGetCrops(token: string, farmId: string): Promise<any[]> {
  return aegroFetch(`/farms/${farmId}/crops`, token)
}

// Buscar elementos (produtos/insumos) — via catálogo
export async function aegroGetElements(token: string, catalogId: string): Promise<any[]> {
  return aegroFetch(`/catalogs/${catalogId}/elements`, token)
}

// Buscar catálogos de uma fazenda
export async function aegroGetCatalogs(token: string, farmId: string): Promise<any[]> {
  return aegroFetch(`/farms/${farmId}/catalogs`, token)
}

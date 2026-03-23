/**
 * Serviço de integração com a API Pública do Aegro
 * Documentação: https://app.aegro.com.br/docs/public-api/
 * Base URL: https://app.aegro.com.br/pub/v1
 * Auth Header: Aegro-Public-API-Key
 * Proxy: /api/aegro-proxy (Vercel Serverless Function)
 */

// Chamada via proxy — contorna CORS
// method: método HTTP explícito (POST, PUT, GET). Se omitido, o proxy infere.
async function aegroFetch(endpoint: string, token: string, body?: any, method?: string) {
  const resp = await fetch('/api/aegro-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, token, body, method }),
  })
  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({ error: resp.statusText }))
    // Criar erro com mensagem legível mas preservar todos os detalhes
    const error: any = new Error(errorData?.error || errorData?.detail || `Aegro API erro ${resp.status}`)
    error.status = resp.status
    error.response = errorData // Toda a resposta do proxy (error, detail, url, statusText)
    throw error
  }
  return resp.json()
}

// === CONEXÃO ===

// Testar conexão — busca a propriedade (farm) vinculada ao token
export async function aegroTestConnection(token: string): Promise<{ success: boolean; farms: any[]; error?: string }> {
  try {
    const farm = await aegroFetch('/farms', token)
    // A API retorna um objeto (a farm vinculada ao token) ou array
    const farms = Array.isArray(farm) ? farm : [farm]
    return { success: true, farms: farms.filter(Boolean) }
  } catch (err: any) {
    return { success: false, farms: [], error: err.message }
  }
}

// === PROPRIEDADE ===

export async function aegroGetFarm(token: string): Promise<any> {
  return aegroFetch('/farms', token)
}

// === SAFRAS (Crops) ===

export async function aegroGetCrops(token: string, page = 1, size = 100): Promise<any> {
  return aegroFetch('/crops/filter', token, { page, size })
}

// === TALHÕES ===

export async function aegroGetGlebes(token: string, page = 1, size = 100): Promise<any> {
  return aegroFetch('/glebes/filter', token, { page, size })
}

// === CATÁLOGOS ===

export async function aegroGetCatalogs(token: string, page = 1, size = 100): Promise<any> {
  return aegroFetch('/catalogs/filter', token, { page, size })
}

// === ELEMENTOS (Produtos/Insumos) ===

export async function aegroGetElements(token: string, page = 1, size = 100): Promise<any> {
  return aegroFetch('/elements/filter', token, { page, size })
}

// === EMPRESAS (Fornecedores) ===

export async function aegroGetCompanies(token: string, page = 1, size = 100): Promise<any> {
  return aegroFetch('/companies/filter', token, { page, size })
}

export async function aegroGetCompanyByKey(token: string, companyKey: string): Promise<any> {
  return aegroFetch(`/companies/${companyKey}`, token, undefined, 'GET')
}

export async function aegroCreateCompany(token: string, data: any): Promise<any> {
  return aegroFetch('/companies', token, data, 'POST')
}

export async function aegroUpdateCompany(token: string, companyKey: string, data: any): Promise<any> {
  return aegroFetch(`/companies/${companyKey}`, token, data, 'PUT')
}

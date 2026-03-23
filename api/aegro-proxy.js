/**
 * Vercel Serverless Function — Proxy para API Aegro
 * Contorna o bloqueio de CORS fazendo a chamada server-side
 * 
 * Uso: POST /api/aegro-proxy
 * Body: { endpoint: "/farms", token: "aegro_...", method?: "GET"|"POST"|"PUT", body?: {...} }
 * 
 * Se 'method' não for informado, infere: POST para /filter, GET para demais.
 */

export default async function handler(req, res) {
  // CORS headers para permitir chamadas do frontend
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' })
  }

  const { endpoint, token: rawToken } = req.body || {}

  if (!endpoint || !rawToken) {
    return res.status(400).json({ error: 'Parâmetros obrigatórios: endpoint, token' })
  }

  // Sanitizar token: remover espaços, quebras de linha, tabs (comum ao copiar de email)
  const token = rawToken.replace(/[\s\r\n\t]/g, '')

  // URL e header conforme documentação oficial: https://app.aegro.com.br/docs/public-api/
  const AEGRO_BASE = 'https://app.aegro.com.br/pub/v1'

  // Método HTTP: usar explícito se fornecido, senão inferir (POST para /filter, GET para demais)
  const { body: requestBody, method: explicitMethod } = req.body || {}
  const method = explicitMethod || (endpoint.endsWith('/filter') ? 'POST' : 'GET')

  try {
    const fetchOptions = {
      method,
      headers: {
        'Aegro-Public-API-Key': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    }

    // Adicionar body para requisições POST e PUT
    if ((method === 'POST' || method === 'PUT') && requestBody) {
      fetchOptions.body = JSON.stringify(requestBody)
    }

    const response = await fetch(`${AEGRO_BASE}${endpoint}`, fetchOptions)

    const text = await response.text()

    if (!response.ok) {
      // Tentar parsear resposta de erro como JSON
      let errorDetail = text
      try {
        errorDetail = JSON.parse(text)
      } catch {
        // Se não for JSON válido, manter como texto
      }
      
      return res.status(response.status).json({
        error: `Aegro API erro ${response.status}`,
        detail: errorDetail,
        url: `${AEGRO_BASE}${endpoint}`,
        statusText: response.statusText,
      })
    }

    // 204 = No Content
    if (response.status === 204 || !text) {
      return res.status(200).json([])
    }

    let data
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }

    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({
      error: 'Erro ao conectar com Aegro API',
      detail: err.message,
    })
  }
}

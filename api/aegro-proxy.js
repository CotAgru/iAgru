/**
 * Vercel Serverless Function — Proxy para API Aegro
 * Contorna o bloqueio de CORS fazendo a chamada server-side
 * 
 * Uso: POST /api/aegro-proxy
 * Body: { endpoint: "/farms", token: "aegro_..." }
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

  const { endpoint, token } = req.body || {}

  if (!endpoint || !token) {
    return res.status(400).json({ error: 'Parâmetros obrigatórios: endpoint, token' })
  }

  const AEGRO_BASE = 'https://api.aegro.com.br/api/v1'

  try {
    const response = await fetch(`${AEGRO_BASE}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const text = await response.text()

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Aegro API erro ${response.status}`,
        detail: text,
      })
    }

    let data
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }

    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao conectar com Aegro API', detail: err.message })
  }
}

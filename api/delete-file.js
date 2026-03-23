import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')
  
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  try {
    const { bucket, fileName } = req.body

    if (!bucket || !fileName) {
      return res.status(400).json({ error: 'bucket e fileName são obrigatórios' })
    }

    // Validar buckets permitidos
    const allowedBuckets = ['contratosdevenda-img', 'contratosdecompra-img']
    if (!allowedBuckets.includes(bucket)) {
      return res.status(400).json({ error: 'Bucket não permitido' })
    }

    // Remover arquivo do Supabase Storage
    const { error } = await supabase.storage
      .from(bucket)
      .remove([fileName])

    if (error) {
      console.error('Erro ao remover arquivo:', error)
      throw new Error(error.message)
    }

    return res.status(200).json({
      success: true,
      message: 'Arquivo removido com sucesso'
    })

  } catch (err) {
    console.error('Erro ao remover arquivo:', err)
    return res.status(500).json({ 
      error: err.message || 'Erro ao remover arquivo'
    })
  }
}

import { createClient } from '@supabase/supabase-js'
import formidable from 'formidable'
import fs from 'fs'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export const config = {
  api: {
    bodyParser: false,
  },
}

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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  try {
    // Parse form data
    const form = formidable({ maxFileSize: 10 * 1024 * 1024 }) // 10MB
    
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err)
        else resolve([fields, files])
      })
    })

    const bucket = Array.isArray(fields.bucket) ? fields.bucket[0] : fields.bucket
    const fileName = Array.isArray(fields.fileName) ? fields.fileName[0] : fields.fileName
    const file = Array.isArray(files.file) ? files.file[0] : files.file

    if (!bucket || !fileName || !file) {
      return res.status(400).json({ error: 'bucket, fileName e file são obrigatórios' })
    }

    // Validar buckets permitidos
    const allowedBuckets = ['contratosdevenda-img', 'contratosdecompra-img']
    if (!allowedBuckets.includes(bucket)) {
      return res.status(400).json({ error: 'Bucket não permitido' })
    }

    // Ler arquivo
    const fileBuffer = fs.readFileSync(file.filepath)
    const contentType = file.mimetype || 'application/octet-stream'

    // Upload para Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileBuffer, {
        contentType,
        upsert: false,
      })

    if (error) {
      console.error('Erro ao fazer upload:', error)
      throw new Error(error.message)
    }

    // Gerar URL pública manualmente
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${fileName}`

    return res.status(200).json({
      success: true,
      publicUrl,
      path: data.path,
    })

  } catch (err) {
    console.error('Erro no upload:', err)
    return res.status(500).json({ 
      error: err.message || 'Erro ao fazer upload do arquivo'
    })
  }
}

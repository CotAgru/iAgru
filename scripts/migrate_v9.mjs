import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Erro: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devem estar definidos')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const sql = readFileSync(join(__dirname, '../supabase/migration_v9_tipos_caminhao_eixos.sql'), 'utf-8')

const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--'))

console.log(`Executando ${statements.length} statements da migration v9...`)

for (const stmt of statements) {
  console.log('\n→', stmt.substring(0, 80) + '...')
  const { error } = await supabase.rpc('exec_sql', { sql_query: stmt })
  if (error) {
    console.error('Erro:', error.message)
  } else {
    console.log('✓ OK')
  }
}

console.log('\nMigration v9 concluída!')

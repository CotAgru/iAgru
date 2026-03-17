const fs = require('fs')
const path = require('path')

// Ler .env
const envPath = path.resolve(__dirname, '../frontend/.env')
const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)
const env = {}
lines.forEach(l => {
  const idx = l.indexOf('=')
  if (idx > 0) env[l.substring(0, idx).trim()] = l.substring(idx + 1).trim()
})

const url = env['VITE_SUPABASE_URL']
const key = env['VITE_SUPABASE_ANON_KEY']

if (!url || !key) {
  console.error('Variaveis nao encontradas')
  process.exit(1)
}

console.log('URL:', url)
console.log('Key:', key.substring(0, 20) + '...')

const policies = [
  {
    name: 'allow_public_insert_romaneios',
    operation: 'INSERT',
    definition: "bucket_id = 'romaneios-img'"
  },
  {
    name: 'allow_public_select_romaneios', 
    operation: 'SELECT',
    definition: "bucket_id = 'romaneios-img'"
  },
  {
    name: 'allow_public_update_romaneios',
    operation: 'UPDATE', 
    definition: "bucket_id = 'romaneios-img'"
  },
  {
    name: 'allow_public_delete_romaneios',
    operation: 'DELETE',
    definition: "bucket_id = 'romaneios-img'"
  }
]

async function createPoliciesViaSQL() {
  // Tentar via SQL endpoint (precisa service role key)
  // Com anon key nao vai funcionar, mas vamos tentar
  
  const sqlStatements = policies.map(p => {
    if (p.operation === 'INSERT') {
      return `CREATE POLICY "${p.name}" ON storage.objects FOR ${p.operation} WITH CHECK (${p.definition});`
    }
    return `CREATE POLICY "${p.name}" ON storage.objects FOR ${p.operation} USING (${p.definition});`
  }).join('\n')

  console.log('\nSQL a executar:')
  console.log(sqlStatements)
  console.log('')

  // Tentar via rpc
  try {
    const resp = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'apikey': key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sqlStatements })
    })
    console.log('RPC Status:', resp.status)
    const text = await resp.text()
    console.log('RPC Resp:', text)
    
    if (resp.status !== 200) {
      console.log('\n⚠️  RPC nao disponivel com anon key.')
      console.log('Tentando abordagem alternativa...\n')
      return false
    }
    return true
  } catch (err) {
    console.log('RPC falhou:', err.message)
    return false
  }
}

async function testUploadAfterFix() {
  console.log('\n--- Testando upload ---')
  const resp = await fetch(`${url}/storage/v1/object/romaneios-img/test_${Date.now()}.txt`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'apikey': key,
      'Content-Type': 'text/plain',
      'x-upsert': 'true'
    },
    body: 'test content'
  })
  
  console.log('Upload status:', resp.status)
  const text = await resp.text()
  console.log('Upload resp:', text)
  
  if (resp.status === 200) {
    console.log('\n✅ UPLOAD FUNCIONOU!')
    return true
  } else {
    console.log('\n❌ UPLOAD AINDA FALHA')
    console.log('\n========================================')
    console.log('INSTRUÇÕES: Execute o SQL abaixo no')
    console.log('Supabase Dashboard > SQL Editor:')
    console.log('========================================\n')
    console.log(`-- Politicas de Storage para romaneios-img
CREATE POLICY "allow_public_insert_romaneios" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'romaneios-img');

CREATE POLICY "allow_public_select_romaneios" ON storage.objects
  FOR SELECT USING (bucket_id = 'romaneios-img');

CREATE POLICY "allow_public_update_romaneios" ON storage.objects
  FOR UPDATE USING (bucket_id = 'romaneios-img');

CREATE POLICY "allow_public_delete_romaneios" ON storage.objects
  FOR DELETE USING (bucket_id = 'romaneios-img');`)
    console.log('\n========================================')
    return false
  }
}

async function main() {
  const rpcOk = await createPoliciesViaSQL()
  if (!rpcOk) {
    console.log('Testando upload direto...')
  }
  await testUploadAfterFix()
}

main()

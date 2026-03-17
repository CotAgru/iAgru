const { readFileSync } = require('fs')
const { resolve } = require('path')

// Ler .env
const envPath = resolve(__dirname, '../frontend/.env')
const envContent = readFileSync(envPath, 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/)
  if (m) env[m[1].trim()] = m[2].trim()
})

const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseKey = env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Variaveis nao encontradas')
  process.exit(1)
}

console.log('URL:', supabaseUrl)
console.log('Key:', supabaseKey.substring(0, 20) + '...')

async function testUpload() {
  // Testar upload via REST API diretamente
  const testContent = Buffer.from('teste de upload')
  const fileName = `test_${Date.now()}.txt`
  
  console.log('\n--- Tentando upload via REST API ---')
  console.log('Bucket: romaneios-img')
  console.log('Arquivo:', fileName)
  
  const uploadUrl = `${supabaseUrl}/storage/v1/object/romaneios-img/${fileName}`
  console.log('URL:', uploadUrl)
  
  try {
    const resp = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'text/plain',
        'x-upsert': 'true'
      },
      body: testContent
    })
    
    const status = resp.status
    const text = await resp.text()
    
    console.log('\nStatus:', status)
    console.log('Resposta:', text)
    
    if (status === 200) {
      console.log('\n✅ Upload funcionou!')
      
      // Limpar
      const delResp = await fetch(`${supabaseUrl}/storage/v1/object/romaneios-img`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prefixes: [fileName] })
      })
      console.log('Limpeza:', delResp.status)
    } else {
      console.log('\n❌ Upload FALHOU!')
      console.log('\n🔧 SOLUÇÃO: Execute este SQL no SQL Editor do Supabase:')
      console.log(`
CREATE POLICY "Allow public uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'romaneios-img');

CREATE POLICY "Allow public reads" ON storage.objects
  FOR SELECT USING (bucket_id = 'romaneios-img');

CREATE POLICY "Allow public updates" ON storage.objects
  FOR UPDATE USING (bucket_id = 'romaneios-img');

CREATE POLICY "Allow public deletes" ON storage.objects
  FOR DELETE USING (bucket_id = 'romaneios-img');
`)
    }
  } catch (err) {
    console.error('Erro:', err)
  }
}

testUpload()

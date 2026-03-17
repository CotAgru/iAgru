import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Ler .env manualmente
const envPath = resolve(__dirname, '../frontend/.env')
const envContent = readFileSync(envPath, 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=')
  if (key && vals.length) env[key.trim()] = vals.join('=').trim()
})

const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseKey = env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis não encontradas no .env')
  process.exit(1)
}

console.log('🔧 URL:', supabaseUrl)
console.log('🔑 Key:', supabaseKey.substring(0, 20) + '...')

const supabase = createClient(supabaseUrl, supabaseKey)

async function testStorage() {
  console.log('\n=== TESTE DE STORAGE ===\n')

  // 1. Listar buckets
  console.log('1️⃣ Listando buckets...')
  const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets()
  if (bucketsErr) {
    console.error('❌ Erro ao listar buckets:', bucketsErr)
  } else {
    console.log('✅ Buckets encontrados:', buckets.map(b => `${b.name} (public: ${b.public})`))
  }

  // 2. Verificar se bucket romaneios-img existe
  const bucket = buckets?.find(b => b.name === 'romaneios-img')
  if (!bucket) {
    console.log('\n❌ Bucket romaneios-img NÃO existe! Criando...')
    const { error: createErr } = await supabase.storage.createBucket('romaneios-img', {
      public: true,
      fileSizeLimit: 10485760,
    })
    if (createErr) {
      console.error('❌ Erro ao criar bucket:', createErr)
      return
    }
    console.log('✅ Bucket criado!')
  } else {
    console.log(`\n✅ Bucket romaneios-img existe (public: ${bucket.public})`)
  }

  // 3. Tentar fazer upload de teste
  console.log('\n2️⃣ Tentando upload de teste...')
  const testBlob = new Blob(['test content'], { type: 'text/plain' })
  const testFileName = `test_${Date.now()}.txt`
  
  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from('romaneios-img')
    .upload(testFileName, testBlob, { contentType: 'text/plain', upsert: true })
  
  if (uploadErr) {
    console.error('❌ ERRO NO UPLOAD:', uploadErr)
    console.error('   Mensagem:', uploadErr.message)
    console.error('   Status:', uploadErr.statusCode)
    console.error('')
    console.error('🔧 SOLUÇÃO: Você precisa criar políticas de Storage no Supabase!')
    console.error('   Acesse: Supabase Dashboard > Storage > Policies')
    console.error('   Ou execute o SQL abaixo no SQL Editor do Supabase:')
    console.error('')
    console.error(`
-- Permitir upload para todos (anon e authenticated)
CREATE POLICY "Allow public uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'romaneios-img');

-- Permitir leitura para todos
CREATE POLICY "Allow public reads" ON storage.objects
  FOR SELECT USING (bucket_id = 'romaneios-img');

-- Permitir update para todos
CREATE POLICY "Allow public updates" ON storage.objects
  FOR UPDATE USING (bucket_id = 'romaneios-img');

-- Permitir delete para todos  
CREATE POLICY "Allow public deletes" ON storage.objects
  FOR DELETE USING (bucket_id = 'romaneios-img');
`)
  } else {
    console.log('✅ Upload de teste OK:', uploadData)
    
    // Limpar arquivo de teste
    await supabase.storage.from('romaneios-img').remove([testFileName])
    console.log('🧹 Arquivo de teste removido')
    
    // Gerar URL pública
    const { data: urlData } = supabase.storage.from('romaneios-img').getPublicUrl(testFileName)
    console.log('🔗 URL pública seria:', urlData.publicUrl)
  }

  // 4. Verificar arquivos no bucket
  console.log('\n3️⃣ Listando arquivos no bucket...')
  const { data: files, error: filesErr } = await supabase.storage.from('romaneios-img').list()
  if (filesErr) {
    console.error('❌ Erro ao listar arquivos:', filesErr)
  } else {
    console.log(`✅ ${files.length} arquivo(s) no bucket`)
    files.forEach(f => console.log(`   - ${f.name} (${f.metadata?.size || '?'} bytes)`))
  }
}

testStorage()

import db from './db';

async function migrate() {
await db.ready();

console.log('Criando tabelas do FretAgru...\n');

db.exec(`
  CREATE TABLE IF NOT EXISTS fornecedores (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    cpf_cnpj TEXT,
    telefone TEXT,
    email TEXT,
    endereco TEXT,
    cidade TEXT,
    estado TEXT,
    observacoes TEXT,
    ativo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS veiculos (
    id TEXT PRIMARY KEY,
    fornecedor_id TEXT NOT NULL,
    placa TEXT NOT NULL,
    tipo TEXT NOT NULL,
    marca TEXT,
    modelo TEXT,
    ano INTEGER,
    capacidade_kg REAL,
    observacoes TEXT,
    ativo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)
  );

  CREATE TABLE IF NOT EXISTS locais (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL,
    endereco TEXT,
    cidade TEXT,
    estado TEXT,
    observacoes TEXT,
    ativo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS produtos (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL,
    unidade_medida TEXT NOT NULL DEFAULT 'ton',
    observacoes TEXT,
    ativo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS precos_contratados (
    id TEXT PRIMARY KEY,
    origem_id TEXT NOT NULL,
    destino_id TEXT NOT NULL,
    produto_id TEXT NOT NULL,
    fornecedor_id TEXT,
    valor REAL NOT NULL,
    unidade_preco TEXT NOT NULL DEFAULT 'R$/ton',
    distancia_km REAL,
    vigencia_inicio TEXT,
    vigencia_fim TEXT,
    observacoes TEXT,
    ativo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (origem_id) REFERENCES locais(id),
    FOREIGN KEY (destino_id) REFERENCES locais(id),
    FOREIGN KEY (produto_id) REFERENCES produtos(id),
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)
  );
`);

console.log('✅ Tabela: fornecedores');
console.log('✅ Tabela: veiculos');
console.log('✅ Tabela: locais');
console.log('✅ Tabela: produtos');
console.log('✅ Tabela: precos_contratados');
console.log('\n🎉 Banco de dados criado com sucesso!');
}

migrate().catch(console.error);

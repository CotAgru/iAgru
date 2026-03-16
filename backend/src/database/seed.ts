import db from './db';
import { v4 as uuid } from 'uuid';

async function seed() {
await db.ready();

console.log('Inserindo dados iniciais...\n');

const fIds = [uuid(), uuid(), uuid()];
const insertF = db.prepare('INSERT INTO fornecedores (id, nome, cpf_cnpj, telefone, cidade, estado) VALUES (?, ?, ?, ?, ?, ?)');
insertF.run(fIds[0], 'Transportes Silva Ltda', '12.345.678/0001-90', '(64) 99999-1111', 'Rio Verde', 'GO');
insertF.run(fIds[1], 'Joao Caminhoneiro ME', '987.654.321-00', '(64) 99999-2222', 'Jatai', 'GO');
insertF.run(fIds[2], 'Rodograos Transportes', '98.765.432/0001-10', '(62) 99999-3333', 'Goiania', 'GO');
console.log('✅ 3 fornecedores inseridos');

const insertV = db.prepare('INSERT INTO veiculos (id, fornecedor_id, placa, tipo, marca, modelo, ano, capacidade_kg) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
insertV.run(uuid(), fIds[0], 'ABC-1234', 'Carreta', 'Scania', 'R450', 2022, 37000);
insertV.run(uuid(), fIds[0], 'DEF-5678', 'Bitrem', 'Volvo', 'FH540', 2023, 57000);
insertV.run(uuid(), fIds[1], 'GHI-9012', 'Truck', 'Mercedes', 'Atego 2430', 2021, 16000);
insertV.run(uuid(), fIds[2], 'JKL-3456', 'Rodotrem', 'Scania', 'R500', 2023, 74000);
console.log('✅ 4 veiculos inseridos');

const lIds = [uuid(), uuid(), uuid(), uuid(), uuid(), uuid()];
const insertL = db.prepare('INSERT INTO locais (id, nome, tipo, cidade, estado) VALUES (?, ?, ?, ?, ?)');
insertL.run(lIds[0], 'Fazenda Santa Maria', 'Fazenda', 'Rio Verde', 'GO');
insertL.run(lIds[1], 'Fazenda Boa Esperanca', 'Fazenda', 'Jatai', 'GO');
insertL.run(lIds[2], 'Armazem Central Rio Verde', 'Armazem', 'Rio Verde', 'GO');
insertL.run(lIds[3], 'Caramuru Alimentos', 'Industria', 'Itumbiara', 'GO');
insertL.run(lIds[4], 'Terminal Portuario Santos', 'Porto', 'Santos', 'SP');
insertL.run(lIds[5], 'Calcario Montividiu', 'Fornecedor', 'Montividiu', 'GO');
console.log('✅ 6 locais inseridos');

const pIds = [uuid(), uuid(), uuid(), uuid(), uuid(), uuid(), uuid(), uuid(), uuid()];
const insertP = db.prepare('INSERT INTO produtos (id, nome, tipo, unidade_medida) VALUES (?, ?, ?, ?)');
insertP.run(pIds[0], 'Soja em Grao', 'Grao', 'ton');
insertP.run(pIds[1], 'Milho em Grao', 'Grao', 'ton');
insertP.run(pIds[2], 'Sorgo em Grao', 'Grao', 'ton');
insertP.run(pIds[3], 'Feijao', 'Grao', 'ton');
insertP.run(pIds[4], 'Calcario', 'Insumo', 'ton');
insertP.run(pIds[5], 'Gesso Agricola', 'Insumo', 'ton');
insertP.run(pIds[6], 'Fertilizante MAP', 'Insumo', 'ton');
insertP.run(pIds[7], 'Fertilizante KCL', 'Insumo', 'ton');
insertP.run(pIds[8], 'Fertilizante Formulado', 'Insumo', 'ton');
console.log('✅ 9 produtos inseridos');

const insertPr = db.prepare('INSERT INTO precos_contratados (id, origem_id, destino_id, produto_id, fornecedor_id, valor, unidade_preco, distancia_km) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
insertPr.run(uuid(), lIds[0], lIds[2], pIds[0], fIds[0], 45.00, 'R$/ton', 15);
insertPr.run(uuid(), lIds[0], lIds[3], pIds[0], fIds[2], 120.00, 'R$/ton', 250);
insertPr.run(uuid(), lIds[1], lIds[2], pIds[1], fIds[0], 55.00, 'R$/ton', 90);
insertPr.run(uuid(), lIds[5], lIds[0], pIds[4], fIds[1], 35.00, 'R$/ton', 40);
insertPr.run(uuid(), lIds[5], lIds[0], pIds[5], fIds[1], 35.00, 'R$/ton', 40);
console.log('✅ 5 precos contratados inseridos');

console.log('\n🎉 Dados iniciais inseridos com sucesso!');
}

seed().catch(console.error);

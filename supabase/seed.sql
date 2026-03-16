-- FretAgru - Dados iniciais (seed)
-- Execute apos a migration.sql

-- Fornecedores
INSERT INTO fornecedores (nome, cpf_cnpj, telefone, cidade, estado) VALUES
  ('Transportes Silva Ltda', '12.345.678/0001-90', '(64) 99999-1111', 'Rio Verde', 'GO'),
  ('Joao Caminhoneiro ME', '987.654.321-00', '(64) 99999-2222', 'Jatai', 'GO'),
  ('Rodograos Transportes', '98.765.432/0001-10', '(62) 99999-3333', 'Goiania', 'GO');

-- Locais
INSERT INTO locais (nome, tipo, cidade, estado) VALUES
  ('Fazenda Santa Maria', 'Fazenda', 'Rio Verde', 'GO'),
  ('Fazenda Boa Esperanca', 'Fazenda', 'Jatai', 'GO'),
  ('Armazem Central Rio Verde', 'Armazem', 'Rio Verde', 'GO'),
  ('Caramuru Alimentos', 'Industria', 'Itumbiara', 'GO'),
  ('Terminal Portuario Santos', 'Porto', 'Santos', 'SP'),
  ('Calcario Montividiu', 'Fornecedor', 'Montividiu', 'GO');

-- Produtos
INSERT INTO produtos (nome, tipo, unidade_medida) VALUES
  ('Soja em Grao', 'Grao', 'ton'),
  ('Milho em Grao', 'Grao', 'ton'),
  ('Sorgo em Grao', 'Grao', 'ton'),
  ('Feijao', 'Grao', 'ton'),
  ('Calcario', 'Insumo', 'ton'),
  ('Gesso Agricola', 'Insumo', 'ton'),
  ('Fertilizante MAP', 'Insumo', 'ton'),
  ('Fertilizante KCL', 'Insumo', 'ton'),
  ('Fertilizante Formulado', 'Insumo', 'ton');

-- Veiculos (referenciando fornecedores)
INSERT INTO veiculos (fornecedor_id, placa, tipo, marca, modelo, ano, capacidade_kg)
SELECT f.id, v.placa, v.tipo, v.marca, v.modelo, v.ano, v.capacidade_kg
FROM (VALUES
  ('Transportes Silva Ltda', 'ABC-1234', 'Carreta', 'Scania', 'R450', 2022, 37000),
  ('Transportes Silva Ltda', 'DEF-5678', 'Bitrem', 'Volvo', 'FH540', 2023, 57000),
  ('Joao Caminhoneiro ME', 'GHI-9012', 'Truck', 'Mercedes', 'Atego 2430', 2021, 16000),
  ('Rodograos Transportes', 'JKL-3456', 'Rodotrem', 'Scania', 'R500', 2023, 74000)
) AS v(fornecedor_nome, placa, tipo, marca, modelo, ano, capacidade_kg)
JOIN fornecedores f ON f.nome = v.fornecedor_nome;

-- Precos contratados
INSERT INTO precos_contratados (origem_id, destino_id, produto_id, fornecedor_id, valor, unidade_preco, distancia_km)
SELECT o.id, d.id, p.id, f.id, pc.valor, pc.unidade_preco, pc.distancia_km
FROM (VALUES
  ('Fazenda Santa Maria', 'Armazem Central Rio Verde', 'Soja em Grao', 'Transportes Silva Ltda', 45.00, 'R$/ton', 15),
  ('Fazenda Santa Maria', 'Caramuru Alimentos', 'Soja em Grao', 'Rodograos Transportes', 120.00, 'R$/ton', 250),
  ('Fazenda Boa Esperanca', 'Armazem Central Rio Verde', 'Milho em Grao', 'Transportes Silva Ltda', 55.00, 'R$/ton', 90),
  ('Calcario Montividiu', 'Fazenda Santa Maria', 'Calcario', 'Joao Caminhoneiro ME', 35.00, 'R$/ton', 40),
  ('Calcario Montividiu', 'Fazenda Santa Maria', 'Gesso Agricola', 'Joao Caminhoneiro ME', 35.00, 'R$/ton', 40)
) AS pc(origem_nome, destino_nome, produto_nome, fornecedor_nome, valor, unidade_preco, distancia_km)
JOIN locais o ON o.nome = pc.origem_nome
JOIN locais d ON d.nome = pc.destino_nome
JOIN produtos p ON p.nome = pc.produto_nome
JOIN fornecedores f ON f.nome = pc.fornecedor_nome;

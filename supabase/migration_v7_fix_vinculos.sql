-- =====================================================================
-- FretAgru v7 - VARREDURA E CORREÇÃO DE VÍNCULOS
-- Corrige romaneios antigos que têm campos TEXT mas sem foreign keys
-- Execute no Supabase Dashboard > SQL Editor
-- =====================================================================

-- =====================================================================
-- PASSO 1: Relatório de diagnóstico (rode primeiro para ver o estado)
-- =====================================================================

-- 1a) Placas em romaneios que NÃO existem na tabela veiculos
SELECT DISTINCT UPPER(TRIM(r.placa)) as placa_orfan, 
       COUNT(*) as qtd_romaneios,
       r.motorista as motorista_texto
FROM romaneios r
WHERE r.placa IS NOT NULL 
  AND TRIM(r.placa) != ''
  AND r.veiculo_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM veiculos v WHERE UPPER(v.placa) = UPPER(TRIM(r.placa))
  )
GROUP BY UPPER(TRIM(r.placa)), r.motorista
ORDER BY placa_orfan;

-- 1b) Placas em romaneios que EXISTEM em veiculos mas não estão vinculadas
SELECT DISTINCT UPPER(TRIM(r.placa)) as placa, v.id as veiculo_id_existente,
       COUNT(*) as qtd_romaneios_sem_vinculo
FROM romaneios r
JOIN veiculos v ON UPPER(v.placa) = UPPER(TRIM(r.placa))
WHERE r.veiculo_id IS NULL
  AND r.placa IS NOT NULL AND TRIM(r.placa) != ''
GROUP BY UPPER(TRIM(r.placa)), v.id
ORDER BY placa;

-- 1c) Motoristas em romaneios sem motorista_id
SELECT DISTINCT TRIM(r.motorista) as motorista_texto, COUNT(*) as qtd
FROM romaneios r
WHERE r.motorista IS NOT NULL AND TRIM(r.motorista) != ''
  AND r.motorista_id IS NULL
GROUP BY TRIM(r.motorista) ORDER BY motorista_texto;

-- 1d) Transportadoras em romaneios sem transportadora_id
SELECT DISTINCT TRIM(r.transportadora) as transp_texto, COUNT(*) as qtd
FROM romaneios r
WHERE r.transportadora IS NOT NULL AND TRIM(r.transportadora) != ''
  AND r.transportadora_id IS NULL
GROUP BY TRIM(r.transportadora) ORDER BY transp_texto;

-- 1e) Produtos em romaneios sem produto_id
SELECT DISTINCT TRIM(r.produto) as produto_texto, COUNT(*) as qtd
FROM romaneios r
WHERE r.produto IS NOT NULL AND TRIM(r.produto) != ''
  AND r.produto_id IS NULL
GROUP BY TRIM(r.produto) ORDER BY produto_texto;

-- 1f) Produtores em romaneios sem produtor_id
SELECT DISTINCT TRIM(r.produtor) as produtor_texto, COUNT(*) as qtd
FROM romaneios r
WHERE r.produtor IS NOT NULL AND TRIM(r.produtor) != ''
  AND r.produtor_id IS NULL
GROUP BY TRIM(r.produtor) ORDER BY produtor_texto;

-- 1g) Origens/destinos em romaneios sem origem_id ou destinatario_id
SELECT DISTINCT TRIM(r.fornecedor_destinatario) as destino_texto, COUNT(*) as qtd
FROM romaneios r
WHERE r.fornecedor_destinatario IS NOT NULL AND TRIM(r.fornecedor_destinatario) != ''
  AND r.destinatario_id IS NULL
GROUP BY TRIM(r.fornecedor_destinatario) ORDER BY destino_texto;

-- =====================================================================
-- PASSO 2: Criar cadastro genérico para veículos sem proprietário
-- =====================================================================
INSERT INTO cadastros (nome, nome_fantasia, tipos, ativo)
SELECT 'Proprietário Não Identificado', 'Prop. Desconhecido', ARRAY['Motorista']::TEXT[], true
WHERE NOT EXISTS (SELECT 1 FROM cadastros WHERE nome = 'Proprietário Não Identificado');

-- =====================================================================
-- PASSO 3: Criar veículos que existem em romaneios mas NÃO em veiculos
-- =====================================================================

-- 3a) Primeiro, tenta vincular pela coluna motorista TEXT → cadastro existente
-- Para cada placa órfã, tenta encontrar o motorista correspondente
-- Se não encontrar, usa o cadastro genérico
INSERT INTO veiculos (cadastro_id, placa, tipo_caminhao, eixos, peso_pauta_kg, observacoes)
SELECT DISTINCT ON (UPPER(TRIM(r.placa)))
  COALESCE(
    -- Tenta achar motorista pelo nome TEXT do romaneio
    (SELECT c.id FROM cadastros c 
     WHERE r.motorista IS NOT NULL AND TRIM(r.motorista) != ''
       AND (LOWER(c.nome) LIKE '%' || LOWER(TRIM(r.motorista)) || '%'
         OR LOWER(c.nome_fantasia) LIKE '%' || LOWER(TRIM(r.motorista)) || '%')
     LIMIT 1),
    -- Fallback: cadastro genérico
    (SELECT id FROM cadastros WHERE nome = 'Proprietário Não Identificado' LIMIT 1)
  ) as cadastro_id,
  UPPER(TRIM(r.placa)) as placa,
  'Carreta' as tipo_caminhao,
  6 as eixos,
  37000 as peso_pauta_kg,
  'Veículo criado automaticamente a partir de romaneio antigo' as observacoes
FROM romaneios r
WHERE r.placa IS NOT NULL 
  AND TRIM(r.placa) != ''
  AND r.veiculo_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM veiculos v WHERE UPPER(v.placa) = UPPER(TRIM(r.placa))
  );

-- =====================================================================
-- PASSO 4: Vincular romaneios → veículos (por placa TEXT)
-- =====================================================================
UPDATE romaneios r
SET veiculo_id = v.id
FROM veiculos v
WHERE UPPER(TRIM(r.placa)) = UPPER(v.placa)
  AND r.veiculo_id IS NULL
  AND r.placa IS NOT NULL
  AND TRIM(r.placa) != '';

-- =====================================================================
-- PASSO 5: Vincular motoristas por nome TEXT → cadastro existente
-- =====================================================================
UPDATE romaneios r
SET motorista_id = sub.cad_id
FROM (
  SELECT r2.id as rom_id, c.id as cad_id
  FROM romaneios r2
  JOIN cadastros c ON (
    LOWER(TRIM(r2.motorista)) = LOWER(c.nome)
    OR LOWER(TRIM(r2.motorista)) = LOWER(c.nome_fantasia)
    OR LOWER(c.nome) LIKE '%' || LOWER(TRIM(r2.motorista)) || '%'
  )
  WHERE r2.motorista IS NOT NULL AND TRIM(r2.motorista) != ''
    AND r2.motorista_id IS NULL
    AND 'Motorista' = ANY(c.tipos)
) sub
WHERE r.id = sub.rom_id;

-- =====================================================================
-- PASSO 6: Vincular transportadoras por nome TEXT → cadastro existente
-- =====================================================================
UPDATE romaneios r
SET transportadora_id = sub.cad_id
FROM (
  SELECT r2.id as rom_id, c.id as cad_id
  FROM romaneios r2
  JOIN cadastros c ON (
    LOWER(TRIM(r2.transportadora)) = LOWER(c.nome)
    OR LOWER(TRIM(r2.transportadora)) = LOWER(c.nome_fantasia)
    OR LOWER(c.nome) LIKE '%' || LOWER(TRIM(r2.transportadora)) || '%'
  )
  WHERE r2.transportadora IS NOT NULL AND TRIM(r2.transportadora) != ''
    AND r2.transportadora_id IS NULL
    AND 'Transportadora' = ANY(c.tipos)
) sub
WHERE r.id = sub.rom_id;

-- =====================================================================
-- PASSO 7: Vincular produtos por nome TEXT → produto existente
-- =====================================================================
UPDATE romaneios r
SET produto_id = p.id
FROM produtos p
WHERE r.produto IS NOT NULL AND TRIM(r.produto) != ''
  AND r.produto_id IS NULL
  AND (
    LOWER(TRIM(r.produto)) = LOWER(p.nome)
    OR LOWER(p.nome) LIKE '%' || LOWER(TRIM(r.produto)) || '%'
    OR LOWER(TRIM(r.produto)) LIKE '%' || LOWER(p.nome) || '%'
  );

-- =====================================================================
-- PASSO 8: Vincular produtores por nome TEXT → cadastro existente
-- =====================================================================
UPDATE romaneios r
SET produtor_id = sub.cad_id
FROM (
  SELECT r2.id as rom_id, c.id as cad_id
  FROM romaneios r2
  JOIN cadastros c ON (
    LOWER(TRIM(r2.produtor)) = LOWER(c.nome)
    OR LOWER(TRIM(r2.produtor)) = LOWER(c.nome_fantasia)
    OR LOWER(c.nome) LIKE '%' || LOWER(TRIM(r2.produtor)) || '%'
  )
  WHERE r2.produtor IS NOT NULL AND TRIM(r2.produtor) != ''
    AND r2.produtor_id IS NULL
    AND 'Produtor' = ANY(c.tipos)
) sub
WHERE r.id = sub.rom_id;

-- =====================================================================
-- PASSO 9: Vincular destinos por nome TEXT → cadastro existente
-- =====================================================================
UPDATE romaneios r
SET destinatario_id = sub.cad_id
FROM (
  SELECT r2.id as rom_id, c.id as cad_id
  FROM romaneios r2
  JOIN cadastros c ON (
    LOWER(TRIM(r2.fornecedor_destinatario)) = LOWER(c.nome)
    OR LOWER(TRIM(r2.fornecedor_destinatario)) = LOWER(c.nome_fantasia)
    OR LOWER(c.nome) LIKE '%' || LOWER(TRIM(r2.fornecedor_destinatario)) || '%'
  )
  WHERE r2.fornecedor_destinatario IS NOT NULL AND TRIM(r2.fornecedor_destinatario) != ''
    AND r2.destinatario_id IS NULL
) sub
WHERE r.id = sub.rom_id;

-- =====================================================================
-- PASSO 10: Relatório final - campos que AINDA não foram vinculados
-- =====================================================================

-- 10a) Placas ainda sem vínculo (deveria ser zero agora)
SELECT 'PLACAS SEM VINCULO' as tipo, UPPER(TRIM(placa)) as valor, COUNT(*) as qtd
FROM romaneios WHERE placa IS NOT NULL AND TRIM(placa) != '' AND veiculo_id IS NULL
GROUP BY UPPER(TRIM(placa));

-- 10b) Motoristas ainda sem vínculo
SELECT 'MOTORISTAS SEM VINCULO' as tipo, TRIM(motorista) as valor, COUNT(*) as qtd
FROM romaneios WHERE motorista IS NOT NULL AND TRIM(motorista) != '' AND motorista_id IS NULL
GROUP BY TRIM(motorista);

-- 10c) Transportadoras ainda sem vínculo
SELECT 'TRANSPORTADORAS SEM VINCULO' as tipo, TRIM(transportadora) as valor, COUNT(*) as qtd
FROM romaneios WHERE transportadora IS NOT NULL AND TRIM(transportadora) != '' AND transportadora_id IS NULL
GROUP BY TRIM(transportadora);

-- 10d) Produtos ainda sem vínculo
SELECT 'PRODUTOS SEM VINCULO' as tipo, TRIM(produto) as valor, COUNT(*) as qtd
FROM romaneios WHERE produto IS NOT NULL AND TRIM(produto) != '' AND produto_id IS NULL
GROUP BY TRIM(produto);

-- 10e) Produtores ainda sem vínculo
SELECT 'PRODUTORES SEM VINCULO' as tipo, TRIM(produtor) as valor, COUNT(*) as qtd
FROM romaneios WHERE produtor IS NOT NULL AND TRIM(produtor) != '' AND produtor_id IS NULL
GROUP BY TRIM(produtor);

-- 10f) Destinos ainda sem vínculo
SELECT 'DESTINOS SEM VINCULO' as tipo, TRIM(fornecedor_destinatario) as valor, COUNT(*) as qtd
FROM romaneios WHERE fornecedor_destinatario IS NOT NULL AND TRIM(fornecedor_destinatario) != '' AND destinatario_id IS NULL
GROUP BY TRIM(fornecedor_destinatario);

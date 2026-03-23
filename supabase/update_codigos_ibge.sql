-- Script para atualizar códigos IBGE dos cadastros existentes
-- Este script atualiza apenas as principais cidades de Goiás
-- Execute no SQL Editor do Supabase

-- Catalão/GO
UPDATE cadastros SET codigo_ibge = '5205109' WHERE uf = 'GO' AND cidade = 'Catalão' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Goiânia/GO
UPDATE cadastros SET codigo_ibge = '5208707' WHERE uf = 'GO' AND cidade = 'Goiânia' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Anápolis/GO
UPDATE cadastros SET codigo_ibge = '5201108' WHERE uf = 'GO' AND cidade = 'Anápolis' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Aparecida de Goiânia/GO
UPDATE cadastros SET codigo_ibge = '5201405' WHERE uf = 'GO' AND cidade = 'Aparecida de Goiânia' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Rio Verde/GO
UPDATE cadastros SET codigo_ibge = '5218805' WHERE uf = 'GO' AND cidade = 'Rio Verde' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Luziânia/GO
UPDATE cadastros SET codigo_ibge = '5212501' WHERE uf = 'GO' AND cidade = 'Luziânia' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Jataí/GO
UPDATE cadastros SET codigo_ibge = '5211909' WHERE uf = 'GO' AND cidade = 'Jataí' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Caldas Novas/GO
UPDATE cadastros SET codigo_ibge = '5204508' WHERE uf = 'GO' AND cidade = 'Caldas Novas' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Itumbiara/GO
UPDATE cadastros SET codigo_ibge = '5211503' WHERE uf = 'GO' AND cidade = 'Itumbiara' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Formosa/GO
UPDATE cadastros SET codigo_ibge = '5208004' WHERE uf = 'GO' AND cidade = 'Formosa' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Novo Gama/GO
UPDATE cadastros SET codigo_ibge = '5215231' WHERE uf = 'GO' AND cidade = 'Novo Gama' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Senador Canedo/GO
UPDATE cadastros SET codigo_ibge = '5220454' WHERE uf = 'GO' AND cidade = 'Senador Canedo' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Trindade/GO
UPDATE cadastros SET codigo_ibge = '5221403' WHERE uf = 'GO' AND cidade = 'Trindade' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Águas Lindas de Goiás/GO
UPDATE cadastros SET codigo_ibge = '5200258' WHERE uf = 'GO' AND cidade = 'Águas Lindas de Goiás' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Valparaíso de Goiás/GO
UPDATE cadastros SET codigo_ibge = '5221858' WHERE uf = 'GO' AND cidade = 'Valparaíso de Goiás' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Cidade Ocidental/GO
UPDATE cadastros SET codigo_ibge = '5205497' WHERE uf = 'GO' AND cidade = 'Cidade Ocidental' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Planaltina/GO
UPDATE cadastros SET codigo_ibge = '5217302' WHERE uf = 'GO' AND cidade = 'Planaltina' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Goianésia/GO
UPDATE cadastros SET codigo_ibge = '5208905' WHERE uf = 'GO' AND cidade = 'Goianésia' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Inhumas/GO
UPDATE cadastros SET codigo_ibge = '5210406' WHERE uf = 'GO' AND cidade = 'Inhumas' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Padre Bernardo/GO
UPDATE cadastros SET codigo_ibge = '5215603' WHERE uf = 'GO' AND cidade = 'Padre Bernardo' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Cristianópolis/GO
UPDATE cadastros SET codigo_ibge = '5206206' WHERE uf = 'GO' AND cidade = 'Cristianópolis' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Cumari/GO
UPDATE cadastros SET codigo_ibge = '5206305' WHERE uf = 'GO' AND cidade = 'Cumari' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Paracatu/MG
UPDATE cadastros SET codigo_ibge = '3147105' WHERE uf = 'MG' AND cidade = 'Paracatu' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Araxá/MG
UPDATE cadastros SET codigo_ibge = '3104007' WHERE uf = 'MG' AND cidade = 'Araxá' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Uberaba/MG
UPDATE cadastros SET codigo_ibge = '3170107' WHERE uf = 'MG' AND cidade = 'Uberaba' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Uberlândia/MG
UPDATE cadastros SET codigo_ibge = '3170206' WHERE uf = 'MG' AND cidade = 'Uberlândia' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Patos de Minas/MG
UPDATE cadastros SET codigo_ibge = '3148004' WHERE uf = 'MG' AND cidade = 'Patos de Minas' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Montes Claros/MG
UPDATE cadastros SET codigo_ibge = '3143302' WHERE uf = 'MG' AND cidade = 'Montes Claros' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Brasília/DF
UPDATE cadastros SET codigo_ibge = '5300108' WHERE uf = 'DF' AND cidade = 'Brasília' AND (codigo_ibge IS NULL OR codigo_ibge = '');

-- Listar cadastros que ainda não têm código IBGE (para revisão manual)
SELECT id, nome, cidade, uf, codigo_ibge 
FROM cadastros 
WHERE (codigo_ibge IS NULL OR codigo_ibge = '') 
  AND cidade IS NOT NULL 
  AND cidade != ''
ORDER BY uf, cidade;

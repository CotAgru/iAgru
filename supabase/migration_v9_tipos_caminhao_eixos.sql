-- =====================================================================
-- FretAgru v9 - ADICIONAR CAMPOS EIXOS E PESO_PAUTA_KG EM TIPOS_CAMINHAO
-- Adicionar campos para normalizar dados de tipos de caminhão
-- =====================================================================

-- Adicionar campos eixos e peso_pauta_kg
ALTER TABLE tipos_caminhao 
ADD COLUMN eixos INTEGER NOT NULL DEFAULT 0,
ADD COLUMN peso_pauta_kg INTEGER NOT NULL DEFAULT 0;

-- Atualizar dados existentes com valores reais
UPDATE tipos_caminhao SET eixos = 6, peso_pauta_kg = 30000 WHERE nome = 'Carreta';
UPDATE tipos_caminhao SET eixos = 3, peso_pauta_kg = 14000 WHERE nome = 'Truck';
UPDATE tipos_caminhao SET eixos = 2, peso_pauta_kg = 6000 WHERE nome = 'Toco';
UPDATE tipos_caminhao SET eixos = 4, peso_pauta_kg = 23000 WHERE nome = 'Bitruck';
UPDATE tipos_caminhao SET eixos = 9, peso_pauta_kg = 57000 WHERE nome = 'Rodotrem';
UPDATE tipos_caminhao SET eixos = 7, peso_pauta_kg = 45000 WHERE nome = 'Vanderleia';
UPDATE tipos_caminhao SET eixos = 2, peso_pauta_kg = 3500 WHERE nome = '3/4';

-- Adicionar tipos que estavam faltando
INSERT INTO tipos_caminhao (nome, eixos, peso_pauta_kg, ativo) VALUES
('Carreta LS', 5, 27000, true),
('Bitrem', 7, 45000, true),
('Treminhao', 9, 57000, true),
('Outro', 0, 0, true)
ON CONFLICT (nome) DO UPDATE SET 
  eixos = EXCLUDED.eixos,
  peso_pauta_kg = EXCLUDED.peso_pauta_kg;

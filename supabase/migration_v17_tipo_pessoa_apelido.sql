-- Migration v17: Adicionar tipo_pessoa e apelido em cadastros
-- Tipo pessoa: fisica, juridica, estrangeira (inferido por CPF/CNPJ)
-- Apelido: nome de exibição/busca (similar ao tradeName do Aegro)

ALTER TABLE cadastros ADD COLUMN IF NOT EXISTS tipo_pessoa TEXT DEFAULT 'juridica' CHECK (tipo_pessoa IN ('fisica', 'juridica', 'estrangeira'));
ALTER TABLE cadastros ADD COLUMN IF NOT EXISTS apelido TEXT;

-- Campos de endereço completo (compatível com Aegro)
ALTER TABLE cadastros ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE cadastros ADD COLUMN IF NOT EXISTS logradouro TEXT;
ALTER TABLE cadastros ADD COLUMN IF NOT EXISTS numero TEXT;
ALTER TABLE cadastros ADD COLUMN IF NOT EXISTS complemento TEXT;
ALTER TABLE cadastros ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE cadastros ADD COLUMN IF NOT EXISTS codigo_ibge TEXT; -- Código IBGE da cidade (obrigatório no Aegro)

-- Inscrição estadual
ALTER TABLE cadastros ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT;
ALTER TABLE cadastros ADD COLUMN IF NOT EXISTS inscricao_estadual_tipo TEXT DEFAULT 'contribuinte' CHECK (inscricao_estadual_tipo IN ('contribuinte', 'isento', 'nao_contribuinte'));

-- Atualizar tipo_pessoa existente baseado no tamanho do CPF/CNPJ
UPDATE cadastros 
SET tipo_pessoa = CASE 
  WHEN LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(cpf_cnpj, '.', ''), '-', ''), '/', ''), ' ', '')) = 11 THEN 'fisica'
  WHEN LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(cpf_cnpj, '.', ''), '-', ''), '/', ''), ' ', '')) = 14 THEN 'juridica'
  ELSE 'juridica'
END
WHERE cpf_cnpj IS NOT NULL AND cpf_cnpj != '';

-- Atualizar apelido com nome_fantasia ou nome se não existir
UPDATE cadastros
SET apelido = COALESCE(NULLIF(nome_fantasia, ''), nome)
WHERE apelido IS NULL;

-- Índice para busca por apelido
CREATE INDEX IF NOT EXISTS idx_cadastros_apelido ON cadastros(apelido);

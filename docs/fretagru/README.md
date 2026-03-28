# FretAgru — Módulo de Gestão de Fretes Agrícolas

> Módulo do ecossistema iAgru para gestão completa de fretes agrícolas.

## Visão Geral

O FretAgru gerencia todo o ciclo de fretes agrícolas: desde o planejamento (operações e ordens de carregamento) até a execução (romaneios de pesagem), com controle de veículos, preços contratados e BI analítico completo.

## Páginas (7)

| Página | Rota | Descrição |
|--------|------|-----------|
| Dashboard Fretes | `/frete/dashboard` | BI completo: 7 KPIs, filtros avançados, gráficos Recharts, tabelas analíticas |
| Operações | `/frete/operacoes` | Agrupamento lógico de ordens/romaneios por safra |
| Ordens de Carregamento | `/frete/ordens` | Planejamento: origem, destino, produto, transportadores |
| Romaneios | `/frete/romaneios` | Ticket de pesagem: pesos, descontos (7 tipos), dados de frete, imagens |
| Veículos | `/frete/veiculos` | Cadastro: placa, tipo, eixos, peso pauta, proprietário |
| Preços Contratados | `/frete/precos` | Preço por rota/produto (R$/ton, R$/sc, R$/viagem, R$/km) |
| Importação | `/frete/importacao` | Wizard 7 etapas para importação de dados via Excel |

## Funcionalidades Principais

- **7 tipos de desconto** nos romaneios: umidade, impureza, avariados, ardidos, esverdeados, partidos, quebrados
- **Cálculo automático**: peso corrigido = peso líquido - descontos
- **🎯 BI Dashboard Interligado (estilo Power BI)**:
  - **9 filtros globais**: Ano Safra, Safra, Produto, Origem, Destino, Transportadora, Motorista, Placa, Tipo Ticket
  - **Header de filtros ativos**: Badges azuis clicáveis mostrando filtros aplicados, remoção individual com X, botão "Limpar Tudo"
  - **Gráficos clicáveis**: Clicar em qualquer fatia/barra aplica filtro automaticamente (Tipo Ticket, Volume por Produto)
  - **Tabelas clicáveis**: Clicar em linha aplica filtro (Transportadora, Motorista, Placa, Rotas)
  - **4 gráficos**: Volume mensal, Valor frete mensal, Volume por produto, Tipo Ticket
  - **5 KPIs**: Total Viagens, Vol. s/Desc, Vol. c/Desc, Vlr Unit Médio, Vlr Total a Pagar
  - Frete Excedente por rota, Análise de descontos por origem
- **Seletor de unidade**: KG/SC/TN com reconversão de volumes
- **Importação Excel**: Wizard 7 etapas com mapeamento de colunas, preview e validação
- **Vinculação**: romaneio ↔ contrato de venda (ContAgru)
- **Exportação**: PDF e Excel em todas as tabelas
- **Romaneio PDF Individual**: Botão "Exportar PDF" no modal de detalhes gera documento oficial formatado com cabeçalho, seções organizadas (identificação, rota, produtor, transporte, pesagem, descontos, valor do frete), rodapé e branding iAgru
- **Anexar PDFs e Imagens**: Suporte completo para anexar imagens ou PDFs aos romaneios via botão "Anexar Arquivo" ou "Tirar Foto", com upload automático ao Supabase Storage bucket `romaneios-img`
- **Preview Inteligente**: Card azul diferenciado para PDFs mostrando nome do arquivo, imagem preview para fotos, consistente entre formulário de edição e modal de visualização
- **OCR com IA**: Digitalização automática de romaneios em papel usando Gemini AI (apenas para imagens), extração de campos: ticket, pesos, descontos, datas, CNPJs

## Lógicas Complexas

### ⚠️ Cálculo de Frete — REGRA FUNDAMENTAL
```
valor_frete = peso_liquido × valor_unitario_por_kg
```

**IMPORTANTE:** O frete é **SEMPRE** calculado sobre o **PESO LÍQUIDO** (sem desconto), **NUNCA** sobre o peso corrigido.

**Base de Cálculo exibida nas telas:**
- Modal "Detalhes do Romaneio" → mostra `Base de Cálculo: XX.XXX kg (líquido)`
- PDF exportado do romaneio → mostra `Base de Cálculo: XX.XXX kg (líquido)`
- Cálculo interno da função `calcularFrete()` → usa `item.peso_liquido`

**Justificativa:** O transportador é pago pelo volume transportado (peso bruto - tara = peso líquido). Os descontos de qualidade (umidade, impureza, etc.) afetam apenas o peso vendável (peso corrigido), mas não reduzem o trabalho de transporte realizado.

### Frete Excedente (Custo do Volume Não Vendável)
```
Volume Perdido = peso_liquido - peso_corrigido
Frete Excedente = Volume Perdido × valor_unitario_por_kg
```

**Conceito:** O "frete excedente" é o custo do frete pago por volume que foi transportado mas não é vendável devido aos descontos de qualidade. É um indicador de perda financeira no Dashboard.

### Conversão de Unidades
- KG é a unidade base no banco
- SC (saca) = kg / 60
- TN (tonelada) = kg / 1000

## Status: ✅ Produção

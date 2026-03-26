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
- **BI Dashboard**: Volume s/Desconto vs c/Desconto, Frete Excedente por rota, Análise de descontos por origem
- **Seletor de unidade**: KG/SC/TN com reconversão de volumes
- **Importação Excel**: Wizard 7 etapas com mapeamento de colunas, preview e validação
- **Vinculação**: romaneio ↔ contrato de venda (ContAgru)
- **Exportação**: PDF e Excel em todas as tabelas
- **Romaneio PDF Individual**: Botão "Exportar PDF" no modal de detalhes gera documento oficial formatado com cabeçalho, seções organizadas (identificação, rota, produtor, transporte, pesagem, descontos, valor do frete), rodapé e branding iAgru

## Lógicas Complexas

### Cálculo de Frete
```
valor_frete = peso_liquido × valor_unitario_por_kg
```
> Usa peso_liquido (sem desconto), NÃO peso_corrigido.

### Frete Excedente
```
Volume Perdido = peso_liquido - peso_corrigido
Frete Excedente = Volume Perdido × valor_unitario_por_kg
```

### Conversão de Unidades
- KG é a unidade base no banco
- SC (saca) = kg / 60
- TN (tonelada) = kg / 1000

## Status: ✅ Produção

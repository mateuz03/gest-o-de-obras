
# AI Construct Estimator — Plano de Implementação

## Visão Geral
App web para análise de plantas baixas usando IA (Gemini via Lovable AI), que gera estimativas detalhadas de materiais de construção com exportação em PDF e Excel.

## Abordagem Técnica para Análise de Plantas
- **Motor**: Gemini 2.5 Pro (multimodal, excelente para análise de imagens e raciocínio complexo)
- **Método**: Enviar imagem/PDF da planta para o modelo com prompt especializado de engenharia civil. O modelo interpreta paredes, portas, janelas, escala e dimensões diretamente — sem necessidade de OpenCV
- **Guia de escala**: O prompt instrui a IA a identificar indicadores de escala (cotas, legenda, escala gráfica) e usar proporções para calcular dimensões reais

## Stack
- **Frontend**: React + Tailwind + shadcn/ui
- **Backend**: Lovable Cloud (Supabase) — auth, banco de dados, edge functions
- **IA**: Lovable AI Gateway (Gemini 2.5 Pro) via edge function
- **Exportação**: PDF (client-side) + Excel (client-side)

## Páginas e Funcionalidades

### 1. Landing Page
- Hero com descrição do produto e CTA "Começar Análise"
- Como funciona (3 passos: Upload → IA Analisa → Resultados)

### 2. Autenticação
- Login/Cadastro com email e senha
- Perfil do usuário (nome, empresa)

### 3. Dashboard
- Lista de análises anteriores com data, nome do projeto e status
- Botão "Nova Análise"

### 4. Nova Análise (fluxo principal)
- **Step 1**: Upload de imagem (JPG/PNG) ou PDF da planta baixa
- **Step 2**: Formulário com dados complementares (escala se conhecida, tipo de construção, região/cidade para preços)
- **Step 3**: Processamento — enviar para edge function que chama Gemini
- **Step 4**: Resultados em tabelas organizadas por categoria:

#### Tabelas de Resultado:
| Categoria | Itens Estimados |
|-----------|----------------|
| **Estrutura** | Tijolos, cimento (sacos), areia (m³), vergalhões (barras/kg) |
| **Acabamento** | Piso (m²), tinta (latas), gesso (m²) |
| **Instalações** | Fiação elétrica (metros), tubulação hidráulica (metros), pontos elétricos, pontos hidráulicos |
| **Recomendações** | Top 3 marcas custo-benefício por item principal |

### 5. Exportação
- Botão "Exportar PDF" — relatório formatado com logo e tabelas
- Botão "Exportar Excel" — planilha com todas as tabelas de materiais

## Banco de Dados (Supabase)
- **profiles**: id, user_id, nome, empresa
- **analyses**: id, user_id, nome_projeto, imagem_url, dados_input, resultado_json, created_at
- Storage bucket para uploads de plantas

## Edge Function: analyze-blueprint
- Recebe imagem (base64) + dados complementares
- Envia para Gemini 2.5 Pro com prompt de engenharia civil
- Retorna JSON estruturado com todas as estimativas
- Trata erros 429/402

## User Stories do MVP
1. Como usuário, quero me cadastrar e fazer login para salvar minhas análises
2. Como usuário, quero fazer upload de uma planta baixa (imagem ou PDF)
3. Como usuário, quero informar a escala e tipo de construção antes da análise
4. Como usuário, quero ver os resultados organizados em tabelas por categoria
5. Como usuário, quero receber recomendações de marcas para cada material
6. Como usuário, quero exportar os resultados em PDF e Excel
7. Como usuário, quero acessar análises anteriores no meu dashboard

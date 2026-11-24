# Estado do Projeto

## O que esta pronto

### Backend (completo)
- API REST Flask com rotas: `/dados`, `/dados/ultimo`, `/clima`, `/comparativo`, `/alerta-chuva`
- Modelo SQLAlchemy mapeando a tabela `mqtt` no MySQL
- Conexao MQTT: recebe leituras da caixinha, converte unidades, grava no banco
- Alerta de chuva: logica de tendencia pressao/umidade com limiares configuraveis
- Notificacao por e-mail via SMTP (dispara na transicao sem-alerta -> alerta)
- Integracao com API externa Open-Meteo para clima do local
- Schema SQL com tabela e dados de exemplo

### Frontend — Tarefa 1 (completa)
- Dashboard HTML servida pelo Flask em `GET /`
- 7 cards de indicadores: temperatura, pressao, umidade, CO2, particula 1, particula 2, altitude
- Card de alerta de chuva com destaque visual (verde/vermelho conforme estado)
- Tabela com os ultimos 20 registros
- Horario da ultima leitura visivel
- Estilo dark theme com paleta azul/verde, CSS puro
- JS consome as rotas da API via fetch, com tratamento de erro

### Frontend — Tarefa 2 (completa)
- 3 graficos de linha (Chart.js 4.4.1 via CDN) na secao "Tendencias"
- Grafico 1: temperatura (vermelho, eixo Y esquerdo) + umidade (azul, eixo Y direito) — largura total
- Grafico 2: pressao (verde) — meia largura
- Grafico 3: CO2 (laranja, eixo Y esquerdo) + particula 1 (roxo) + particula 2 (ciano, eixo Y direito) — meia largura
- Dados de /dados?limit=50, invertidos para ordem cronologica
- Labels no eixo X em formato dd/mm HH:MM
- Visual integrado ao dark theme (gridlines sutis, texto claro, fundo transparente)
- Tratamento de erro: exibe mensagem se o fetch falhar

### Frontend — Tarefa 3 (completa)
- Polling automatico a cada 30s: atualiza cards, alerta, graficos e tabela
- Graficos atualizados via `.update()` (sem destruir/recriar instancias Chart.js)
- Indicador "Atualizado ha Xs" no header com contador incrementando a cada 1s
- Botao pausar/retomar polling (icone alterna entre pause e play)
- Animacao flash nos cards quando um valor muda (borda azul + sombra, 0.6s)
- Falha no fetch nao interrompe o polling — mantem dados anteriores e tenta no proximo ciclo

### Frontend — Tarefa 4 (completa)
- Secao "Comparativo: Caixinha vs Clima Externo" entre graficos e tabela
- 3 cards comparativos: temperatura, umidade e pressao
- Cada card: valor caixinha, valor externo (Open-Meteo) e delta com seta e cor
- Delta: azul (acima), laranja (abaixo), verde (igual, diff < 0.1)
- Mapeamento campos: caixinha temperature/humidity/pressure → externo temperatura/umidade/pressao
- Trata externo null ("Indisponivel") e caixinha null ("Sem dados")
- Fonte e horario externo exibidos abaixo dos cards
- Integrado ao polling de 30s via `carregarComparativo()` em `executarPolling()`

### Frontend — Tarefa 5 (completa)
- Responsividade com 2 breakpoints: tablet (max 900px) e mobile (max 600px)
- Cards: 4 colunas (desktop) → 2 (tablet) → 1 (mobile)
- Graficos: 2 colunas → 1 coluna em tablet e mobile
- Comparativo: 3 colunas → 2 (tablet) → 1 (mobile)
- Card de alerta: layout vertical em mobile (flex-direction column)
- Tabela: font-size reduzido em mobile, scroll horizontal preservado
- Favicon SVG inline (emoji termometro)
- Animacao fade-in cascata nos cards ao carregar
- Tipografia: font-smoothing antialiased, tabular-nums nos valores numericos
- Header com fontes ajustadas em mobile

## Decisoes tecnicas — Tarefa 1
- CSS puro sem framework, conforme requisito
- JS vanilla sem dependencias externas
- Fetch no DOMContentLoaded (sem polling automatico — previsto para tarefa 3)
- Grid de 4 colunas para os cards (7 cards = 4+3, ultima linha com 3)

## Decisoes tecnicas — Tarefa 2
- Chart.js 4.4.1 via CDN (cdnjs.cloudflare.com), sem instalacao local
- Funcao auxiliar `opcoesBase()` para reutilizar configuracao entre graficos (scales, cores, responsive)
- Primeiro grafico ocupa largura total (grid-column: 1 / -1), os outros dois lado a lado
- Dados invertidos com .reverse() no JS (API retorna desc, graficos precisam de ordem cronologica asc)

## Decisoes tecnicas — Tarefa 3
- Charts criados uma unica vez em `carregarGraficos()`; polling usa `atualizarGraficos()` que atualiza `.data` e chama `.update()`
- Funcao `atualizarCard()` compara valor atual com novo antes de atualizar; se mudou, dispara animacao `card-flash` via classe CSS
- `void card.offsetWidth` forca reflow para reiniciar animacao se card ja tinha a classe
- Catch no polling nao chama clearInterval — falha silenciosa, proximo ciclo tenta de novo
- Intervalo fixo 30s via `setInterval`; contador de segundos via `setInterval` separado de 1s

## Decisoes tecnicas — Tarefa 4
- Consome rota `/comparativo` existente (caixinha + externo em um unico fetch)
- Funcao `calcularDelta()` reutilizada para as 3 metricas; threshold de 0.1 para "igual"
- Nomes de campos mapeados: backend externo usa portugues (temperatura, umidade, pressao), caixinha usa ingles
- Catch silencioso no polling — se `/comparativo` falhar, mantem estado anterior

## Decisoes tecnicas — Tarefa 5
- Media queries no mesmo style.css, sem arquivo separado
- Breakpoints: 900px (tablet) e 600px (mobile), mobile-first overrides
- Fade-in com animation-delay escalonado (0.05s incrementos) para efeito cascata
- tabular-nums em card-valor, comparativo-valor e tbody td para alinhamento numerico
- Favicon como data URI SVG inline — zero arquivos extras

### Frontend — Tarefa 6 (completa)
- Redesign visual completo: estetica tech + ambiental
- Nova paleta: fundo escuro com gradiente azul-escuro/verde-escuro, acentos verde neon (#00e676) e ciano (#00bcd4)
- Glassmorphism em todos os cards (backdrop-filter: blur, borda translucida verde)
- Header com titulo em gradiente de texto (verde → ciano)
- Icones emoji em cada card de indicador (termometro, gota, barometro, nuvem, microscopio, tubo, montanha)
- Card de alerta redesenhado com gradiente e glow sutil
- Glow neon nos valores dos cards (text-shadow verde)
- Separadores visuais entre secoes (borda gradiente fina)
- Cores dos graficos atualizadas: vermelho vibrante, verde neon, ciano, laranja, magenta, azul claro
- Gridlines dos graficos em verde neon ultra-sutil
- Tabela com header gradiente e hover verde sutil
- Comparativo: caixinha em verde neon, externo em ciano
- Footer com icone de folha (🌿)
- Favicon atualizado para 🌿
- Botao de polling mais arredondado com hover glow
- Responsividade e animacoes preservadas com cores ajustadas

## Decisoes tecnicas — Tarefa 6
- CSS reescrito mantendo estrutura e media queries identicas, apenas paleta e efeitos visuais
- Glassmorphism com fallback: backdrop-filter + -webkit-backdrop-filter para compatibilidade
- Gradiente do body com background-attachment: fixed para efeito imersivo
- Cores dos graficos no JS atualizadas apenas nas propriedades visuais, sem tocar em logica
- Flash animation ajustada para verde neon em vez de azul anterior
- Separadores entre secoes via main > section seletor

## Pendencias e proximas tarefas
- Nenhuma — todas as 6 tarefas do frontend concluidas
- Projeto pronto para apresentacao no SENAI

## Dividas tecnicas
- Nenhuma gerada nas tarefas 1, 2, 3, 4, 5 e 6

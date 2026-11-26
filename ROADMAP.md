# Roadmap do FuzzyLogic V2

Estados disponíveis: `PENDING`, `IN_PROGRESS`, `IMPLEMENTED`, `VALIDATED`, `BLOCKED`. `IMPLEMENTED` indica código presente com verificações ainda incompletas. `VALIDATED` exige evidência no escopo indicado pela linha. `BLOCKED` identifica uma pendência que impede a verificação ou a execução.

| Parte | Estado | Evidência e pendências |
| --- | --- | --- |
| 01 | BLOCKED | Escopo numerado original indisponível. A base do portfólio, o conteúdo e a navegação estão no projeto atual. Falta associar os requisitos originais à implementação. |
| 02 | BLOCKED | Escopo numerado original indisponível. A direção artística e o Core vetorial estão documentados no README, sem associação verificável a esta parte. |
| 03 | BLOCKED | Escopo numerado original indisponível. Refinamento visual e interações do Portal constam no projeto e no README. Falta confirmar o recorte desta parte. |
| 04 | BLOCKED | Escopo numerado original indisponível. A hero de fábrica está documentada e implementada. Falta confirmar quais requisitos pertenciam a esta parte. |
| 05 — Mecânica da fábrica | IMPLEMENTED | Esteira sincronizada, docas, scanner e mecanismos das caixas. Testes de inspeção e pausa em Chromium. |
| 06 — Infraestrutura | IMPLEMENTED | Rotas auxiliares, tubulações e fluidos. Medição por software. Falta comparar em GPU física e a imagem de referência citada no prompt não estava disponível. |
| 07 — Manutenção e piso | IMPLEMENTED | Palete, barris, sucata, luminária e rupturas do piso. Capturas e medições por software. Falta medir em GPU física. |
| 08 — Supervisor 3D | IMPLEMENTED | Modelo procedural, braço, acompanhamento do cursor e estados BLUE/AMBER. Testes de comportamento em Chromium. Falta conferir a experiência em hardware real. |
| 09 — Inspeção de produtos | VALIDATED | Clique na geometria, controles HTML, foco, pausa, seleção rápida e alternativa sem WebGL em Chromium. |
| 10 — Narrativa ambiental | IMPLEMENTED | Eventos no galpão, prioridades do supervisor e suspensão por movimento reduzido. Controlador testado e eventos inspecionados em Chromium. |
| 11 — Desempenho e qualidade gráfica | IMPLEMENTED | Perfis adaptativos, limites de renderização e modo 2D. Medições com Chromium e SwiftShader. Falta medir GPU e dispositivos reais. |
| 12 — Conteúdo e publicação | IMPLEMENTED | Build estático, conteúdo, metadados, licenças, 404 e sitemap. Validação local de distribuição. Capturas reais dos projetos e validação do ambiente publicado seguem pendentes. |
| 13 — Inicialização da fábrica | VALIDATED | Boot progressivo e caminhos de falha, timeout, fontes e 2D testados em Chromium. |
| 14 — Experiência móvel | IMPLEMENTED | Composição compacta, interação por toque e rotação validadas em emulação Chromium. Safari/iOS e celulares físicos pendentes. |
| 15 — Camera Studio | VALIDATED | Órbita, ajustes, presets, importação/exportação, viewport simulada e exclusão do build público validados em Chromium. Desktop e Ultrawide calibrados e persistidos em `src/lib/factoryCamera.ts`. Acesso via ngrok conferido localmente pelo cabeçalho Host. |
| 15.1 — Git e checkpoints | VALIDATED | Backup verificado por SHA-256, material público auditado e checkpoint inicial preparado com build, lint e 66 testes aprovados. A referência `main` no GitHub fornece o SHA publicado. |
| 16 — Render Quality & Visual Fidelity | VALIDATED | ULTRA nativo, MSAA/FXAA, ajustes independentes e diagnóstico. Buffer 3440 × 1159 e MSAA 4× confirmados na viewport ultrawide emulada. Medições e capturas em [Parte 16](docs/parte-16-renderizacao.md). Pendentes monitor e GPU físicos, Safari/iOS e altas taxas de atualização. |
| 17 — Lossless Optimization | VALIDATED | Geometria compartilhada, instancing regional e menos trabalho de transform. No ultrawide emulado, 537 → 475 chamadas e 526 → 307 geometrias com o mesmo buffer e MSAA. Diferenças de borda, FPS e limites documentados no [relatório da Parte 17](docs/parte-17-eficiencia.md). GPU física e Safari/iOS seguem pendentes. |
| 18 — Asset Refinement | PENDING | Planejada. |
| 19 — Final QA & Release | PENDING | Planejada. Revisão final inclui Safari/iOS, aparelhos físicos e desempenho em GPU. |

## Limitações conhecidas

- Vite avisa sobre o tamanho do chunk lazy da fábrica 3D.
- As artes atuais são conceituais. Capturas reais aprovadas poderão ser incluídas posteriormente.
- O comportamento e o desempenho em Chromium emulado ainda precisam ser comparados com Safari/iOS e hardware real.
- A revisão manual de contraste e os testes com leitores de tela continuam pendentes.
- Os presets locais do Camera Studio pertencem à origem do navegador. Os enquadramentos oficiais Desktop e Ultrawide são reproduzidos pelo código.

Consulte [README.md](README.md) e [docs](docs/) para escopo técnico, resultados históricos e comandos de reprodução.

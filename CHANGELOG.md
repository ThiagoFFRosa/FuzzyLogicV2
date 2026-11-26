# Changelog do FuzzyLogic V2

## 2026-11-26 — Patch de presets gráficos

- Após validação em monitor ultrawide, fixou a escala física dos presets manuais em LOW 50%, MEDIUM 75%, HIGH 100% e ULTRA 125%. AUTO mantém a adaptação por desempenho, com orçamento de pixels, e o modo 2D permanece disponível.
- Todos os presets 3D solicitam MSAA nativo, com fallback automático para FXAA. As sombras usam HIGH, com mapas principais de 1024², e as texturas usam filtragem padrão de até 4× de anisotropia.
- O painel mantém escala, Bloom, limite de FPS e diagnóstico. As preferências guardam o preset e os ajustes válidos por preset. Campos descontinuados e escalas fora da nova lista são descartados ao carregar as preferências.
- Passaram build, lint, 32 testes unitários, 14 cenários Chromium de gráficos, qualidade, mobile e inicialização, e 5 testes de distribuição. Em ultrawide emulado com DPR 1, o ULTRA produziu 4300 × 1448 com MSAA 4×. No mobile emulado com DPR 2, LOW e HIGH preservaram MSAA 4× e os dois mapas principais de 1024².

## 2026-11-26 — Parte 18 · Props e containers retroindustriais

- Reestruturou os cinco containers como gavetas de arquivo e expedição, estojo de instrumentos, caixote de madeira e módulo de amostras. Nome e número são os únicos textos das etiquetas. O painel HTML concentra as informações detalhadas e abre a partir da gaveta ou da tampa.
- Refinou os acabamentos do supervisor, do braço, das turrets e dos itens de manutenção. Reutilizou a biblioteca de materiais e agrupou as ferragens dos containers. A área de textura das cinco etiquetas caiu 87,5%, de 1024 × 768 para 512 × 192 por objeto, com um mapa procedural de madeira compartilhado.
- Conferiu os cinco nomes e cliques físicos em LOW a 864 × 552, as duas gavetas e as três tampas, além da circulação com o scanner energizado. Capturou desktop, ultrawide e mobile com os enquadramentos oficiais.
- No Chromium com SwiftShader, o ultrawide em ULTRA passou de 475 para 436 chamadas, de 307 para 278 geometrias, de 54.781 para 55.381 triângulos e de 33 para 34 texturas carregadas. Em desktop as chamadas caíram de 341 para 315 e em mobile de 293 para 268. As amostras ultrawide e mobile variaram de 0,41 para 0,42 FPS e de 3,36 para 3,30 FPS. São medições de oito quadros em software. A GPU física segue pendente.
- Passaram build, lint, 31 testes unitários, 16 cenários Chromium de fábrica, mobile, qualidade e infraestrutura, e 5 testes de distribuição.

## 2026-11-26 — Parte 17 · Eficiência de renderização

- Compartilhou caixas com mesmas dimensões e UVs e agrupou suportes, listras e partes repetidas da parede em lotes regionais. Os lotes preservam materiais, cores e sombras.
- Reutilizou as amostras das tangentes industriais e eliminou composições redundantes nas ripas da esteira. Adicionou teste de identidade e descarte de geometrias ao desligar e reativar o renderer.
- Confirmou no ultrawide emulado 537 → 475 chamadas e 526 → 307 geometrias, mantendo 3440 × 1159, MSAA 4×, câmera e mapas de sombra. O FPS por software se manteve próximo da referência. A captura ultrawide final teve quatro pixels distintos, com delta máximo de 1 por canal. [Benchmark e capturas](docs/parte-17-eficiencia.md)
- Passaram build, lint, 31 testes unitários, 37 testes Chromium e 5 testes de distribuição. A distribuição passou na repetição com espera ampliada para o primeiro frame após recriar o contexto MSAA no SwiftShader.
- Permanece pendente a medição em GPU física. O renderer de laboratório disponibilizou contagens de recursos, sem timer GPU ou VRAM.

## 2026-11-26 — Parte 16 · Qualidade de renderização

- Adicionou ULTRA com escala física de 100%, MSAA nativo, sombras aprimoradas, filtragem de até 16× e resolução dinâmica desligada por padrão. Presets anteriores permanecem disponíveis.
- Adicionou ajustes persistentes por preset para escala, antialiasing, sombras, texturas, Bloom, limite de FPS e resolução dinâmica. O diagnóstico mede o buffer, o método efetivo de AA e as estatísticas do renderer.
- Registrou o comparativo HIGH anterior × ULTRA em ultrawide, desktop e mobile, além dos recortes OFF/FXAA/MSAA em resolução nativa. Os presets oficiais de câmera foram preservados. [Auditoria e referências](docs/parte-16-renderizacao.md)
- Executou lint, build, 29 testes unitários, 36 cenários Chromium e 5 testes de distribuição. O cenário gráfico atingiu um timeout inicial na recriação do contexto em software e passou na repetição com espera explícita. FPS e frame time foram medidos com SwiftShader. Hardware físico e Safari/iOS seguem pendentes.

## 2026-11-25 — Subparte 15.1 · Git e checkpoints

- Organizou o primeiro checkpoint com `main` e `origin` no repositório oficial. Preservou código, lockfile, documentação, testes, fontes declaradas e assets da aplicação.
- Criou uma cópia local separada do projeto e dos artefatos de referência. A verificação por SHA-256 conferiu 310 arquivos. Dependências instaladas e saídas regeneráveis ficaram fora da cópia.
- Revisou `.gitignore` e instituiu o fluxo de commits, push, verificação de SHA e retomada em [AGENTS.md](AGENTS.md). O [ROADMAP.md](ROADMAP.md) distingue implementação de validação.
- Adicionou `.gitattributes` para manter arquivos de texto em LF nos checkouts. A auditoria do índice conferiu credenciais, e-mails, procedência dos assets e tamanho dos arquivos. O maior arquivo preparado é a imagem social, com cerca de 483 kB.
- Registrou a decisão de manter os presets oficiais de Desktop e Ultrawide exatamente como aprovados na Parte 15. O código da aplicação permaneceu intacto nesta subparte.
- Validação local concluída em `npm run build`, `npm run lint`, 27 testes unitários, 34 testes Chromium de desenvolvimento e 5 testes da distribuição estática. Permanece o aviso do Vite sobre o tamanho do chunk 3D.
- Repetiu `npm ci`, lint e build em uma cópia limpa do índice Git, com as dependências resolvidas pelo lockfile.
- O README preserva a documentação anterior e as evidências disponíveis das Partes 05 a 14. A associação das Partes 01 a 04 com os briefings originais segue pendente.

## 2026-11-25 — Parte 15 · Camera Studio

- Adicionou um estúdio de câmera para desenvolvimento com navegação por órbita, pan e dolly, controles de posição, alvo e lente, guias de composição e inspeção 3D.
- Incluiu presets locais, exportação JSON/TypeScript, importação validada e simulação de viewport. [Guia do Camera Studio](docs/parte-15-camera-studio.md)
- Persistiu os ajustes manuais de Desktop e Ultrawide em `src/lib/factoryCamera.ts`. Os enquadramentos mobile e tablet continuam resolvidos pelas regras anteriores.
- Validou controles, presets, simulação, seleção física de containers, fallback de acesso pela lista e exclusão do Studio do build público em Chromium. A checagem de ngrok usou um cabeçalho Host local, sem túnel externo.

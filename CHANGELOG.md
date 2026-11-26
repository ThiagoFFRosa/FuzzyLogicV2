# Changelog do FuzzyLogic V2

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

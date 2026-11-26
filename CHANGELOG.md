# Changelog do FuzzyLogic V2

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

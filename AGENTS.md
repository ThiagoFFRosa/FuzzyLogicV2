# Instruções de desenvolvimento do FuzzyLogic V2

O repositório oficial é [ThiagoFFRosa/FuzzyLogicV2](https://github.com/ThiagoFFRosa/FuzzyLogicV2) e a branch principal é `main`. O Git é a fonte de verdade do desenvolvimento.

## Antes de cada etapa

1. Leia este arquivo, [ROADMAP.md](ROADMAP.md) e as entradas relevantes de [CHANGELOG.md](CHANGELOG.md).
2. Consulte `git status --short --branch`, os remotes e o estado da branch no GitHub. Confirme o checkpoint da etapa anterior antes de começar a próxima.
3. Execute cada parte numerada separadamente. Limite a implementação ao escopo solicitado. Preserve o trabalho local do usuário e os ajustes aprovados, inclusive os presets oficiais de câmera.

## Checkpoint obrigatório

1. Rode o build e os testes relevantes. Registre resultados, limitações e pendências no roadmap e no changelog. Só use `VALIDATED` quando a evidência sustentar o estado.
2. Revise o diff e os arquivos preparados para publicação. Crie pelo menos um commit de conclusão por etapa. Use mensagens como `feat(part-16): implement ultra render quality` ou `perf(part-17): optimize rendering without visual regression`. Commits intermediários são permitidos. Pule commits vazios.
3. Faça push ao encerrar cada etapa. Compare o SHA do commit com a referência publicada no GitHub antes de declarar o checkpoint concluído ou iniciar a etapa seguinte. Registre bloqueios de publicação e preserve os commits locais até resolvê-los.

## Interrupções

- Em etapas extensas, registre checkpoints de subetapas funcionais. Quando prever uma interrupção, use um commit `wip(part-NN): ...` que preserve o trabalho em andamento.
- Para mudanças incompletas que comprometam a estabilidade de `main`, use uma branch de trabalho e publique o checkpoint nela. Registre o último estado verificado e os próximos passos, mantendo a etapa como `IN_PROGRESS` ou `BLOCKED`.
- Preserve o histórico e o trabalho não publicado. São proibidos force push e operações que descartem alterações locais. Integre o remoto com segurança e peça autorização antes de reescrever histórico existente.

## Segurança e continuidade

- Publique somente código, documentação, artefatos autorizados e configurações públicas. Credenciais, chaves privadas, tokens, ambientes pessoais e backups ficam fora do Git. Nunca exponha segredos em logs.
- Um push de código é um checkpoint de desenvolvimento. Deploy em produção, alteração de DNS, registros do Proton Mail e outras mudanças de infraestrutura externa exigem autorização explícita.
- Versione dependências declaradas e lockfile, fontes, assets essenciais e configurações oficiais de câmera em `src/lib/factoryCamera.ts`. Documente pré-requisitos, comandos, ferramentas e ajustes necessários para trabalhar em outra máquina. Use armazenamento do navegador apenas para preferências e rascunhos, com exportação e persistência em código para ajustes oficiais.

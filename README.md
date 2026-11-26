# FUZZS Portfolio V2

Portfólio estático de Thiago Felipe Ferreira Rosa. React, TypeScript strict, Vite, Tailwind CSS, Motion e Lucide React. A hero atual usa Three.js e React Three Fiber em um módulo carregado sob demanda. Fontes Space Grotesk e Inter servidas localmente; não há backend, analytics ou serviços de hospedagem obrigatórios.

## Executar

Node.js 22.12 ou superior e npm.

```sh
npm ci
npm run dev
```

O Vite informa o endereço disponível. Para usar a porta da prévia desta sessão:

```sh
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5180 --strictPort
```

## Validar e gerar produção

```sh
npm test
npm run lint
npx playwright install chromium
npm run test:e2e
npm run build
npm run test:release
npm run preview
```

O build gera `dist/`, publicável como conteúdo estático na Vercel, Cloudflare Pages ou Nginx. Configure o comando `npm run build` e diretório de saída `dist`. Não há rotas de servidor nem secrets. Nenhuma publicação ou configuração de DNS/e-mail foi realizada.

## Continuar em outro computador

Instale Git e Node.js 22.12 ou superior. Clone o repositório oficial, instale as dependências do lockfile e execute a prévia de desenvolvimento.

```sh
git clone https://github.com/ThiagoFFRosa/FuzzyLogicV2.git
cd FuzzyLogicV2
npm ci
npm run dev
```

Para rodar a suíte de navegador, instale o Chromium com `npx playwright install chromium`. Consulte [AGENTS.md](AGENTS.md), [ROADMAP.md](ROADMAP.md) e [CHANGELOG.md](CHANGELOG.md) antes de iniciar uma nova parte. Os presets oficiais estão em `src/lib/factoryCamera.ts`. O [guia do Camera Studio](docs/parte-15-camera-studio.md) descreve como exportar rascunhos locais e aplicar ajustes.

As capturas e medições de QA em `artifacts/` são locais. O README e os documentos de cada parte registram os comandos de reprodução.

## Organização e manutenção

- `src/components/core`: provedor de preferências, olho SVG e Sticky Core.
- `src/hooks/usePointerTracking.ts`: motion values, springs, limites radiais, repouso e reações aos controles. Pausa eventos fora da viewport e limpa listeners/timeouts.
- `src/components/sections`: seções e interação Portal.
- `src/components/layout`: navegação responsiva e identidade.
- `src/data/projects.ts`: conteúdo comercial e técnico, status, descrições PT/EN, links e capturas opcionais. `src/data/site.ts` concentra domínio, título e metadados.
- `scripts/release-html.ts`: gera o resumo HTML, metadados e dados estruturados no build. `public/` contém sitemap, robots, favicon, imagem social, cabeçalhos de Pages e a página 404.
- `src/i18n/translations.ts`: textos em português e inglês. Idioma inicial segue o navegador; escolhas de idioma e Core são persistidas localmente, com fallback quando o storage está indisponível.
- `src/styles/index.css`: materiais, cores e responsividade. Tokens de tema ficam no elemento raiz.
- `public/`: favicon autoral, robots, sitemap e imagem de compartilhamento PNG. `scripts/generate-social.mjs` regenera o PNG a partir do SVG fonte.

## Rework artístico

A hero foi reconstruída como uma câmara de testes: tipografia monumental, personagem central suspenso, iluminação reativa, órbitas e piso em perspectiva. Projetos aparecem como experimentos em composições assimétricas, com interações de áudio, trajetória, teclas, pixels e fluxo de dados. `src/styles/rework.css` concentra a nova direção; a base anterior continua fornecendo tokens de tipografia, navegação e componentes.

O Portal separa a área gráfica recortada dos dois textos. Em celulares, os textos ficam empilhados acima do campo energético e nunca são cortados pelo divisor. A atmosfera está em `LaboratoryAtmosphere.tsx`; as animações de cada cena pausam fora da viewport. Nenhuma dependência nova de produção foi adicionada.

## Decisões

O Robotic Core usa SVG procedural em vez de Three.js/R3F. O personagem tem uma carcaça branca simplificada, alças geométricas e uma pupila luminosa. Flutuação, inclinação 3D, inércia, piscar, dilatação e busca autônoma transmitem personalidade sem WebGL ou modelos externos. BLUE é mais curioso; AMBER tem gestos mais contidos. A troca coordena pálpebra, pose, abertura da pupila e ambiente. Motion atualiza o olhar sem `setState` por movimento de cursor. O mesmo componente e tema alimentam o olho principal e o sticky. No mobile o olho usa movimento de repouso. `prefers-reduced-motion` desativa tracking e animações ambientais.

O sticky surge quando a hero sai da área útil abaixo da navegação. O Portal usa um `input[type=range]` nativo, que oferece mouse, toque, setas, Home e End. Os detalhes dos projetos usam botões com `aria-expanded`; links reais só existem para destinos fornecidos no briefing.

A V1 foi consultada somente para leitura, incluindo `index.html`, `main.js`, `sticky-eye.js` e `styles.css`. As ideias de tracking, sticky e comparação foram reconstruídas, sem copiar assets ou logotipos proprietários.

## Verificação realizada

- 4 testes unitários: detecção e validação do idioma, storage bloqueado e limite radial do olhar.
- 8 testes de navegador Chromium: tema/idioma persistidos, tracking, sticky, detalhes de projeto, teclado, navegação mobile, reduced motion, storage indisponível, ausência de overflow em 320/390/768/1024/2560 px e Portal por toque; reação do Core, mudança de personalidade, pálpebra em movimento, resposta sem animações e legibilidade permanente dos textos do Portal no mobile.
- Capturas completas em `artifacts/rework-desktop.png` e `artifacts/rework-mobile.png`; frames da hero, reação e troca em `artifacts/rework-*.png`, gravação em `artifacts/motion/*.webm`.
- Build TypeScript strict e Vite; erros de execução monitorados no teste desktop.
- Revisão independente de código e npm audit sem vulnerabilidades na entrega.

## Limitações e próximos passos

As artes dos projetos são estudos visuais identificados como tais, não screenshots reais. Adicionar capturas e estudos de caso é a próxima melhoria de conteúdo. Não foram inventados clientes, links de repositórios privados, depoimentos ou métricas.

O Core é um personagem vetorial com inclinação espacial e profundidade simulada, sem iluminação 3D física. A bateria automatizada usa Chromium e não substitui conferência em Safari/iOS e aparelhos reais. A troca de idioma acontece no cliente; metadados de compartilhamento usam a descrição padrão em português. O desenvolvimento deve seguir com avaliação Lighthouse e checagem de leitores de tela antes da publicação final.

Após a graduação, atualize os textos `aboutBody` e `education` nos dois idiomas. As traduções estão centralizadas para manter essa alteração simples.

## Refinamento visual

Core ~23% menor e mais abaixo, marca com maior legibilidade e contato escuro com iluminação âmbar. A atmosfera usa um único loop de inércia que termina em repouso, com parallax limitado e partículas nas órbitas existentes. Capturas comparativas: `artifacts/polish-before` e `artifacts/polish-after` (1440×1000, 2560×1080, 390×844). `scripts/capture-polish.mjs` regenera capturas e medidas. `scripts/validate-polish-motion.mjs` verifica movimento da iluminação e partículas, limites de parallax, reduced motion e console, gravando a sequência em `artifacts/polish-motion`.

Validação desta etapa: 4 testes unitários, 8 testes Chromium, build TypeScript/Vite e verificação de movimento passaram. Projetos, Portal, traduções e conteúdo preservados.

## Hero de fábrica — versão atual

`src/components/sections/factory` contém ambiente, esteira, caixas, materiais procedurais, três turrets e inspeção. A câmera fica fixa; toda a linha usa o mesmo deslocamento em coordenadas 3D, com sombra e contato com a superfície. O Core SVG existente continua como supervisor em uma plataforma ao fundo. Sem input por alguns segundos, observa a produção.

Os cinco nomes estão disponíveis em controles HTML: Tab para escolher, Enter para inspecionar, Escape para fechar. Clicar diretamente na caixa também abre. A linha pausa durante inspeção; uma tampa articulada e uma conexão gráfica ligam o objeto ao painel desdobrado. O botão Pausar esteira permite interromper o transporte independente da seleção. Reduced motion mantém o transporte parado; a inspeção continua disponível. Sem WebGL, os controles e os dados funcionam com cenário simplificado.

A cena usa geometria e texturas de identificação geradas por código; nenhum modelo externo ou asset proprietário foi incorporado. As imagens de referência só orientaram arte e composição. Sem backend, deploy ou alteração de DNS.

Validação desta etapa: **6 testes unitários e 13 testes Chromium** passaram. Incluem clique na geometria real, inspeção sem modal, foco/teclado, troca rápida de projeto, fallback sem WebGL, mobile, temas e interações anteriores. `scripts/validate-factory-motion.mjs` grava e verifica movimento real, pausa coerente e observação da produção em idle, sem erros de execução. Capturas desktop/mobile e inspeção em `artifacts/factory`; vídeo em `artifacts/factory/motion`.

Build estático continua em `dist/`. O motor 3D adiciona aproximadamente 254 kB gzip em um chunk lazy separado; o Vite informa o tamanho elevado desse chunk. O DPR é limitado a 1.5, não há pós-processamento, e o Canvas suspende o loop fora da viewport/aba ativa. Conferência em Safari/iOS e hardware modesto continua recomendada antes de publicar.

## Partes 05 e 06 — Mecânica e infraestrutura

A linha dos projetos compartilha um relógio de deslocamento entre carga, rolos, polias e corrente. As docas cobrem a recirculação com chapas e anteparos. O campo do scanner mantém a detecção por cruzamento e usa módulos sensores fixados ao trilho. Nas caixas, tampa, travas e placa frontal têm pivôs ou deslocamentos próprios. O supervisor mantém o olho vetorial sobre a junta mecânica da cena.

As duas rotas auxiliares movem as unidades pela distância percorrida e usam a tangente para seguir as inclinações. As extremidades atravessam a parede do galpão antes de reiniciar. `infrastructureLayout.ts` concentra trajetórias, velocidades, posições, cargas e parâmetros dos três fluidos. Os líquidos circulam em uma malha interna aos tubos, visível nos trechos de inspeção, com cor independente de BLUE e AMBER.

A pausa da linha dos projetos mantém a infraestrutura auxiliar ativa. `prefers-reduced-motion` suspende o movimento automático da cena. No mobile, só a rota de manutenção permanece, com menos unidades e malhas mais simples. Quando a taxa de quadros cai, a qualidade adaptativa concentra as sombras dinâmicas nas luminárias centrais e reduz a resolução dos mapas.

Para gerar as capturas e as medições locais de novo, execute `npm run build` e `node scripts/compare-infrastructure.mjs after`. O script salva os resultados em `artifacts/infrastructure/after/` e registra o renderizador, a taxa de quadros e as chamadas de desenho observadas no Chromium.

Na comparação em 1440×1000 com Chromium headless e renderização por software via SwiftShader, a cena passou de 515 para 595 chamadas de desenho por quadro e de 3,69 para 2,24 FPS na amostra de cerca de 4,5 segundos. A última otimização reduziu as chamadas da versão expandida de 670 para 595. O resultado em GPU física ficou sem medição. As capturas abrangem desktop, ultrawide, notebook, mobile e zoom emulado de 80% e 125%. A parte 06 seguiu a descrição textual do prompt, pois a imagem de referência citada não veio nos anexos.

## Parte 07 — Manutenção e piso

À esquerda da alimentação, um palete reúne três caixas FUZZS. Os barris usam as cores dos três circuitos de fluido. A sucata inclui uma unidade avariada com atividade residual e uma carcaça vazia. Uma luminária localizada ajuda a ler o conjunto. O recorte mobile exibe o piso e deixa essa área de manutenção fora da cena.

Quatro rupturas expõem terra e brotos. A sinalização, as marcas de arrasto e as manchas de desgaste são combinadas no material do piso. `groundLayout.ts` concentra posições, dimensões e densidade da vegetação. `prefers-reduced-motion` mantém a luz da sucata estável. A qualidade adaptativa simplifica a iluminação de serviço e suprime as faíscas.

As capturas e medições dessa etapa estão em `artifacts/infrastructure/part-07-before/` e `artifacts/infrastructure/part-07-after/`.

Na amostra de aproximadamente 4,4 segundos em 1440×1000, o Chromium headless com SwiftShader registrou 606 → 635 chamadas de desenho por quadro e 1,82 → 1,37 FPS. O desempenho em GPU física ficou sem medição.

## Parte 08 — Supervisor 3D

O supervisor da hero agora é um modelo procedural na cena Three.js. A carcaça e o conjunto óptico fazem parte do mesmo personagem. O braço se conecta ao teto por um trilho e tem dois elos de comprimento fixo, juntas, pistão e cabos. As peças rígidas compartilham geometrias agrupadas por material.

O olhar acompanha o cursor e, após a inatividade, volta à produção, com atenção ao scanner durante a leitura. Projetos selecionados têm prioridade sobre o movimento do cursor. BLUE abre mais a íris e responde mais rápido. AMBER usa uma abertura menor e ajustes mais contidos. O botão de interação continua acessível por teclado. Com movimento reduzido, o conjunto repousa e ainda responde ao botão com a mensagem de interação. Em falta de WebGL, a hero usa o Core vetorial.

As capturas e medições ficam em `artifacts/infrastructure/part-08-before/` e `artifacts/infrastructure/part-08-after/`.

No Chromium headless com SwiftShader, a comparação em 1440×1000 registrou 635 → 641 chamadas de desenho por quadro e 1,39 → 1,15 FPS numa amostra de cerca de 4,3 segundos. O desempenho em GPU física ficou sem medição.

## Parte 09 — Inspeção de produtos

A inspeção usa um estado por projeto. Com a caixa visível, a projeção de seus limites na câmera define a origem do painel HTML. A abertura foi programada para 520 ms e coordena travas, tampa, plaqueta e iluminação. O recolhimento dura 270 ms e mantém a linha parada até o fim. A pausa manual é preservada como preferência independente. A barra abre o painel imediatamente a partir do botão quando a caixa está fora do enquadramento ou a visualização 3D está indisponível.

O painel recebe foco na abertura e devolve o foco ao botão correspondente no fechamento por botão ou Escape. No mobile, o conteúdo expande a página conforme sua altura. A configuração de movimento reduzido abre e fecha imediatamente. Propósito e status vêm de `src/data/projects.ts`. São exibidos os status documentados, os links existentes e as imagens de projeto quando disponíveis.

As capturas de antes e depois ficam em `artifacts/infrastructure/part-09-before/` e `artifacts/infrastructure/part-09-after/`.

Na amostra em 1440×1000 com Chromium headless e SwiftShader, a cena em operação registrou 641 → 646 chamadas de desenho por quadro e 1,13 → 1,15 FPS. A medição de cerca de 4,3 segundos caracteriza a execução por software.

## Parte 10 — Narrativa ambiental

`src/lib/ambientEvents.ts` concentra as chances, os intervalos, os locais e as intensidades dos acontecimentos. Há um efeito por vez e pelo menos 3,5 s de recuperação antes de outro sorteio. Os efeitos usam os indicadores das docas, os circuitos de gel, a luminária instável, a sucata, a turret avariada e as janelas. O modo compacto reduz a intensidade e a área de manutenção continua fora do recorte mobile.

BLUE observa unidades e reage a mais sinais da instalação. AMBER mantém o olhar por mais tempo e concentra as rondas no scanner e nas docas. A inspeção de projetos tem prioridade. A pausa da esteira principal preserva as rondas e os eventos. Movimento reduzido, aba oculta e hero fora da área visível suspendem o controlador.

No servidor de desenvolvimento, `window.__fuzzsAmbient.snapshot()` mostra o relógio e o evento ativo. Use `window.__fuzzsAmbient.trigger('window')` para testar o reflexo atrás das janelas ou troque o identificador por `dock`, `gel`, `lamp`, `salvage`, `turret` ou `log`. Os disparos manuais são identificados como `debug` e ignoram o intervalo de recuperação. O registro dos sorteios usa `natural`.

Na observação de 65 s no Chromium, surgiram naturalmente um pulso de gel e um indicador de doca. A frequência dos três níveis foi exercitada em uma simulação de cinco minutos. Os testes de navegador dispararam a atividade da sucata, o reflexo atrás das janelas e a mensagem de diagnóstico pelo console de desenvolvimento. Passaram 19 testes unitários, 18 testes de navegador e o build de produção.

As capturas e medições ficam em `artifacts/infrastructure/part-10-before/` e `artifacts/infrastructure/part-10-after/`. Em 1440×1000, a amostra em Chromium headless com SwiftShader registrou 1,14 FPS nas duas versões e 646 → 645 chamadas de desenho por quadro. A amostra durou cerca de 4,4 s e usou renderização por software.

## Parte 11 — Desempenho e qualidade gráfica

O seletor ao lado da pausa da esteira oferece AUTO, LOW, MEDIUM, HIGH e 2D. A preferência é local. As trocas preservam a posição da linha e a inspeção. O portfólio disponibiliza conteúdo e controles antes do carregamento 3D. A hero suspende a renderização contínua quando fica fora da tela ou quando a aba é ocultada.

O [relatório da Parte 11](docs/parte-11-performance.md) reúne o inventário, as diferenças entre perfis, os números de laboratório e os comandos para reproduzir as medições.

## Parte 12 — Conteúdo e publicação

- Para atualizar ou incluir um projeto, mantenha o `id` estável e preencha os textos e a lista de recursos nos dois idiomas em `src/data/projects.ts`. O HTML e os dados estruturados são regenerados no build. Para incluir uma sexta caixa na fábrica, atualize também `PROJECT_SLOTS` em `src/lib/conveyor.ts`, o visual em `sceneTextures.ts` e os ícones em `ProjectMark.ts`. Revise o layout da barra de projetos em desktop e mobile.
- Para substituir a arte conceitual, salve cada arquivo aprovado em `public/assets/` em WebP ou AVIF, com recorte consistente e dados de demonstração. Preencha a lista `screenshots` com entradas `{ src, srcSet, width, height, alt: { pt, en } }`. A primeira é a imagem principal. As demais aparecem nos detalhes do projeto. `srcSet` é opcional e recebe variantes com descritores de largura como `/assets/projeto-640.webp 640w, /assets/projeto-1280.webp 1280w`. Informe as dimensões intrínsecas no arquivo principal e descreva a interface no alt.
- Para ajustar a cena, use `src/components/sections/factory/FactoryScene.tsx` para montagem e câmera, `infrastructureLayout.ts` para posicionar tubos e esteiras secundárias, `src/lib/factoryQuality.ts` para os limites por perfil e `src/lib/ambientEvents.ts` para frequências, intensidades e locais dos eventos.
- Para incorporar GLB no futuro, verifique licença, eixos, escala, pivôs e orçamento de triângulos. Coloque o modelo em `public/assets/models/` e carregue-o sob demanda com `GLTFLoader` de Three, dentro do módulo lazy da fábrica. Preserve as juntas animadas, descarte recursos no desmontar e confira o modelo em LOW, MEDIUM e HIGH. O build atual usa geometria procedural.

O [guia de publicação da Parte 12](docs/parte-12-publicacao.md) inclui comandos, opções de hospedagem, licenças, pendências e checklist de TLS e DNS. As [medições da Parte 11](docs/parte-11-performance.md) usam Chromium e SwiftShader. Hardware e Safari/iOS reais continuam fora da amostra de desempenho.

## Parte 13 — Inicialização da fábrica

A tela de inicialização ocupa a área da cena. Navegação, conteúdo e os cinco seletores HTML continuam disponíveis. O modo 2D ignora o carregamento da fábrica. A tela usa a personalidade persistida e oferece atalhos para os projetos e para o modo 2D.

O progresso é ponderado por cinco marcos concluídos em `src/lib/factoryBoot.ts`. O módulo principal representa 22%, as fontes 14%, o renderer 18%, a câmera com a infraestrutura visível e o supervisor 27% e o primeiro frame completo 19%. Os percentuais medem etapas concluídas. As fontes locais são solicitadas em paralelo com o código 3D e precisam estar prontas antes da criação das texturas dos rótulos. A infraestrutura continua em chunks separados e entra enquanto a cena está encoberta. Capturas opcionais de projetos, SEO e conteúdo mais abaixo ficam fora dessa espera.

O Canvas usa renderização sob demanda durante o boot. O primeiro frame válido precisa ter chamadas de desenho com o contexto ativo. Esse frame prepara os shaders da cena inicial. A revelação dura 520 ms, e movimento reduzido a dispensa. Esteira, eventos ambientais e interações da cena são liberados no fim da transição. A escolha de pausar previamente e a inspeção HTML continuam funcionando durante o carregamento.

O limite de inicialização é de 35 segundos a partir da solicitação da cena. Falha de módulo ou fonte oferece nova navegação ao tentar de novo, pois o navegador pode manter em cache uma falha de módulo para o documento atual. Timeout, falha de renderer e perda do contexto permitem tentar de novo na página. A alternativa 2D pode ser escolhida a qualquer momento e persiste localmente.

As capturas de validação ficam em `artifacts/boot/`. Os testes Chromium cobrem infraestrutura atrasada, falha de módulo, timeout, fonte atrasada, WebGL indisponível, recarga no mesmo contexto e inspeções antes e depois da revelação.

## Parte 14 — Experiência móvel

A composição compacta usa câmeras próprias, inspeção no fluxo da página, menu com preferência de movimento e controles adaptados ao toque. AUTO começa em LOW em celulares e tablets touch, com níveis acima disponíveis manualmente. Consulte a [auditoria móvel](docs/parte-14-mobile.md) para resultados, capturas e comandos de reprodução.

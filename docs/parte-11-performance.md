# Parte 11 — Desempenho e qualidade gráfica

## Auditoria da Parte 10

A aplicação usa React, TypeScript e Vite, com Tailwind, Motion e Lucide na interface. A hero tem uma raiz React Three Fiber e um renderizador Three.js WebGL2. Three e seus modelos procedurais já eram carregados por um import dinâmico. O conteúdo HTML, inclusive os cinco seletores de projeto, era responsabilidade da aplicação principal.

No inventário em 1440×1000 com movimento reduzido, a cena tinha 868 objetos Three.js, incluindo 640 meshes, 35 deles instanciados, 8 sprites e um emissor de partículas reutilizado. Havia 640 geometrias, 652 materiais e 23 texturas referenciadas na cena. O renderer registrou 593 geometrias, 35 texturas e 29 programas. Eram 12 luzes. Cinco projetavam sombras, com mapas de 256², 512² e 1024². O inventário contou 37 assinaturas de frame no R3F.

As quatro luminárias principais desenhavam sombras dinâmicas com `autoUpdate`. As duas centrais ainda atualizavam a cada quadro quando o modo adaptativo da Parte 10 reduzia a resolução. O custo incluía renderizar novamente os casters no passe de sombra. Folhas, caules e montantes do corrimão ainda tinham meshes individuais. A esteira, os suportes repetidos e as flanges já usavam instanciamento. O supervisor tinha geometrias agrupadas por material.

A névoa é aplicada no próprio material. Os halos, cones de luz e transparências do scanner e dos tubos são desenhados na cena. Tone mapping e conversão de cor fazem parte do renderer. A vinheta usa CSS. Não havia composer para bloom, AO ou distorção em tela cheia. A cena não usa GLB, texturas externas de modelos ou arquivos de áudio.

Os relógios e transforms contínuos já usavam refs e callbacks do R3F. Hover, preferências, tema, foco e inspeção usam estado React em transições de interação. O supervisor escuta ponteiro, foco e saída do ponteiro enquanto a cena está ativa. A hero usa IntersectionObserver, visibilidade da página e resize. A camada atmosférica da página mantém um loop próprio que encerra ao estabilizar e cancela na aba oculta. A auditoria observou a árvore, as assinaturas R3F e os draws. Ela não inclui uma captura do React Profiler.

## Resultados de laboratório

Windows 11 (build 26200), Ryzen 5 5600X, 12 threads, 64 GiB, Chromium 159 headless, WebGL2 com ANGLE e SwiftShader. Viewports de 1440×1000 e 390×844 em DPR 1. O perfil mobile usa uma viewport emulada no mesmo computador. Os draws e triângulos incluem sombras e instâncias. Cada linha é uma amostra de aproximadamente cinco segundos, com contexto de navegação novo.

| Cena | Resolução interna | FPS | Frame p50 / p95 | Draws/quadro | Triângulos/quadro | Heap JS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Antes, desktop adaptado | 1007×644 | 1,72 | 400 / 2017 ms | 627 | 49.811 | 38,8 MB |
| Depois, desktop AUTO em MEDIUM | 1296×828 | 2,44 | 417 / 433 ms | 548 | 57.209 | 31,9 MB |
| Depois, desktop LOW | 864×552 | 10,23 | 100 / 100 ms | 505 | 43.318 | 27,4 MB |
| Depois, desktop MEDIUM | 1296×828 | 2,45 | 400 / 433 ms | 548 | 57.209 | 29,9 MB |
| Depois, desktop HIGH | 1440×920 | 1,14 | 617 / 2117 ms | 601 | 65.254 | 32,8 MB |
| Antes, mobile adaptado | 273×280 | 12,87 | 83 / 83 ms | 285 | 31.672 | 20,1 MB |
| Depois, mobile AUTO em LOW | 234×240 | 53,82 | 17 / 33 ms | 227 | 26.336 | 25,2 MB |
| Depois, desktop 2D | Sem Canvas | — | — | 0 | 0 | 5,5 MB |

O desktop AUTO começa em MEDIUM. A coleta acima terminou antes da redução desse perfil, observada em uma execução separada. Selecionar LOW mostra o custo do perfil depois da redução. O HIGH preserva a composição aprovada e teve o maior custo em SwiftShader. Os resultados deste ambiente não confirmam 30 ou 60 FPS em GPU física. A memória da tabela é o heap JavaScript observado pelo CDP.

No inventário estático desktop, os meshes diminuíram de 640 para 563 em HIGH, 562 em MEDIUM e 542 em LOW. HIGH manteve cinco mapas de sombra, MEDIUM usa dois e LOW usa zero. Nenhuma dependência ou arquivo GLB foi incluído.

| Carregamento local | Antes | Depois |
| --- | ---: | ---: |
| JS principal, gzip | 134,94 kB | 135,93 kB |
| Bloco 3D principal, gzip | 280,23 kB | 276,21 kB |
| Infraestrutura adiada, gzip | Embutida no bloco 3D | 7,68 kB |
| Transferência observada, desktop 3D | 502,7 kB | 508,3 kB |
| Transferência observada, desktop 2D | — | 223,3 kB |
| LCP/FCP local, desktop AUTO | 184 ms | 168 ms |
| LCP/FCP local, mobile AUTO | 220 ms | 144 ms |
| Soma de shifts sem input, desktop AUTO | 0,00260 | 0,00261 |
| Soma de shifts sem input, mobile AUTO | 0,00484 | 0,00508 |
| Tempo bloqueado por long tasks durante a amostra, desktop AUTO | 12.608 ms | 11.359 ms |
| Tempo bloqueado por long tasks durante a amostra, mobile AUTO | 7.070 ms | 1.039 ms |

Os assets públicos permanecem iguais. As fontes somam cerca de 70,5 kB e o cartão social usa cerca de 53,6 kB entre PNG e SVG. A primeira interação capturada no desktop AUTO passou de 864 para 248 ms. No mobile depois da mudança, a interação capturada durou 56 ms. Esses valores são amostras de Event Timing e o tempo bloqueado foi somado durante a coleta. Ainda faltam INP de campo, TBT do Lighthouse e medições de memória de GPU. A primeira emissão de um draw no desktop desta amostra ocorreu em 632 → 731 ms. A divisão de código apoia a disponibilidade do HTML e o perfil 2D, com um pequeno aumento da transferência total em 3D.

Para a próxima rodada, priorizar medições em GPU integrada, Android e Safari/iOS reais. O chunk de Three.js continua sendo o maior e excede o aviso padrão do Vite. Vale medir o custo dos materiais e dos shaders com uma gravação de GPU física antes de escolher novos cortes. Também vale medir INP de campo após a publicação.

## Regressão e ciclo de vida

O build de produção, 22 testes unitários e 22 testes Chromium passaram. A suíte cobre carregamento com a requisição 3D bloqueada, troca de qualidade durante a inspeção, preferência persistida, movimento reduzido, ausência de WebGL, perda de contexto com tentativa de recuperação, suspensão fora da viewport e aba oculta. As inspeções, os circuitos, os temas, o supervisor, os controles de toque e os eventos da instalação também passaram pela suíte.

As capturas de desktop, notebook, ultrawide, mobile e zoom emulado de 80% e 125% ficaram sem overflow horizontal ou erros de console. Elas estão em `artifacts/infrastructure/part-11-responsive/`.

Em oito ciclos alternando perfis e viewports de 390×844 e 1080×820, o retorno ao HIGH registrou 516 geometrias em todos os ciclos. As texturas ficaram entre 34 e 36. Os programas de shader saíram de 41 na primeira renderização e ficaram em 71 nos três últimos ciclos. O ensaio verifica os contadores do renderer sob essa sequência. Ele não mede VRAM nem substitui uma sessão prolongada em dispositivo físico.

## Perfis

| Modo | Resolução interna | Luzes, sombras e detalhes |
| --- | --- | --- |
| AUTO | Começa em MEDIUM no desktop ou LOW em tela estreita e com limites menores de textura | Observa janelas de frame time após o aquecimento. Promoção exige três janelas rápidas consecutivas. Uma queda bloqueia nova promoção por pelo menos 24 s de avaliação ativa. |
| LOW | DPR até 0,60 e 550 mil pixels | Dois focos principais, luz de serviço, cones e sombras de contato nas caixas. Mapas de sombra e eventos decorativos mais caros ficam suspensos. Vegetação, cargas distantes e o shader de gel usam versões econômicas. |
| MEDIUM | DPR até 0,90 e 1,2 milhão de pixels | Sombras de 512² nas duas luzes centrais, com atualização de até 12 vezes por segundo. Preserva os fluidos, os efeitos de luz e a infraestrutura secundária. |
| HIGH | DPR até 1,50 e 2,5 milhões de pixels | Preserva os cinco mapas de sombra no enquadramento desktop, até 24 atualizações por segundo, materiais com mapas de relevo e a densidade completa da cena. |
| 2D | Sem framebuffer WebGL | Mantém a representação da linha, o supervisor vetorial, a navegação e a inspeção HTML. |

O seletor fica junto do controle da esteira e salva a preferência localmente. LOW, MEDIUM, HIGH e AUTO reaproveitam o Canvas e o relógio já existente. Quando a hero sai da área visível ou a aba fica oculta, o loop entra em modo sob demanda. A mudança de estado gera um quadro de sincronização e encerra atualizações contínuas. A cena espera a estrutura HTML e a entrada na área visível para carregar a hero 3D. Os módulos de infraestrutura entram depois da cena principal. Após perda do contexto, é possível tentar outro renderer com o painel do projeto aberto.

## Reproduzir

Execute `npm run build` e `node scripts/profile-factory.mjs part-11-after`. Para o inventário da árvore e o ciclo de redimensionamentos, mantenha a prévia de desenvolvimento acessível em `http://127.0.0.1:5173/` e acrescente `--inventory --stress`. Os arquivos JSON registram dimensões, ambiente, amostras e contadores. O script executa cada perfil em um contexto de navegador novo.

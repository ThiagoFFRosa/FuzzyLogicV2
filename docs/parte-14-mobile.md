# Parte 14 — Experiência compacta e touch

## Auditoria inicial

Foram registradas as dimensões 320×568, 360×800, 390×844, 430×932, 768×1024 e 844×390 no Chromium headless, com entrada touch e DPR 2 emulados. As capturas comparáveis usam movimento reduzido para manter a linha em repouso. A amostra de desempenho usa a cena em movimento.

Em 320×568, o topo do primeiro seletor de projeto estava em 711 px, abaixo da primeira dobra. A câmera alinhava o centro do supervisor à borda direita e cortava parte da silhueta. Em 768×1024 e 844×390, a hero usava a composição de desktop e iniciava em MEDIUM. O seletor de projetos em paisagem começava em 768 px. O menu do retrato tinha alvo de 36×36 px.

As capturas iniciais e finais estão em `artifacts/infrastructure/part-14-before/` e `artifacts/infrastructure/part-14-after/`. A pasta final também contém versões da inspeção e capturas de Projetos, Portal, Sobre e Contato.

## Adaptação

- A introdução, a cena, os controles e a inspeção passaram a ocupar áreas do fluxo da página em telas compactas. Em paisagem curta, texto e cena ficam lado a lado, com os cinco projetos alinhados abaixo.
- A composição compacta usa câmeras distintas para palcos verticais e largos. O projetor posiciona o controle do supervisor com base na origem real da cena, inclusive ao trocar a orientação.
- A lista HTML permite abrir qualquer projeto diretamente. O toque numa caixa visível usa a abertura física já existente. A inspeção compacta fica abaixo dos seletores, usa a rolagem da página, conserva o botão de fechar e devolve foco ao projeto. A pausa manual sobrevive à inspeção e à rotação.
- O supervisor reage brevemente ao toque na cena. A seleção do projeto continua com prioridade sobre os demais alvos. A rolagem vertical e o zoom por pinça usam o comportamento nativo.
- Idioma e personalidade têm atalhos de 44 px. O menu oferece navegação, atalho para a qualidade gráfica e a preferência de movimento. A opção manual de reduzir é salva localmente e funciona em conjunto com a preferência do dispositivo.
- O cabeçalho, o menu e as áreas de ação consideram os insets seguros. As alturas usam unidades de viewport pequena para o palco e dinâmica para o menu. O conteúdo cresce com o texto e com a inspeção.
- Em telas compactas, AUTO começa em LOW. MEDIUM e HIGH continuam disponíveis manualmente. O HIGH compacto usa até dois mapas de sombra de 512² e limita o framebuffer a cerca de 720 mil pixels. O LOW dispensa detalhes distantes, parte dos objetos decorativos e a turret adormecida. O carregamento evita o módulo da área de manutenção lateral.
- A sequência de inicialização e o modo 2D usam o mesmo conteúdo dos outros perfis. Ambas as opções conservam a navegação, o contato e os controles de projeto.
- Os links de ação das seções comerciais e do rodapé têm alvos de pelo menos 44 px. Em tela compacta, o Core flutuante sai de cena enquanto o rodapé está visível, liberando o acesso ao GitHub.

O critério compartilhado em `src/hooks/useMediaQuery.ts` aplica a composição compacta até 700 px e em dispositivos de toque primário até 1366 px. A câmera de desktop permanece com a configuração anterior para telas largas com ponteiro fino.

## Medições

Em 320×568, a primeira fileira passou a começar a 521 px, com botões de 46 px. Em 844×390, os cinco projetos passaram a começar a 350 px. Nas seis dimensões, o menu mede 44×44 px. A auditoria das seis capturas ficou sem overflow horizontal ou erros de console.

A tabela compara amostras de aproximadamente 3,8 s com AUTO, movimento ativo e SwiftShader no Chromium do Windows. A estimativa de heap mede JavaScript e os contadores de desenho incluem passes e instâncias.

| Dimensão | FPS antes → depois | Frame p50 antes → depois | Frame p95 antes → depois | Draws/quadro antes → depois | Heap JS antes → depois |
| --- | ---: | ---: | ---: | ---: | ---: |
| 390×844 | 48,7 → 53,7 | 16,7 → 16,7 ms | 33,4 → 33,3 ms | 221 → 302 | 28,3 → 26,1 MB |
| 844×390 | 8,1 → 40,7 | 66,7 → 16,8 ms | 266,6 → 33,4 ms | 445 → 434 | 57,3 → 31,6 MB |

Em retrato, a câmera mostra mais estruturas, o que elevou as chamadas de desenho. O framebuffer inicial caiu de 234×240 para 234×192. Em paisagem, o perfil anterior começava em MEDIUM e podia descer para LOW durante a amostra. A adaptação começa em LOW com framebuffer inicial de 359×131, ante 759×737 na composição anterior. A comparação mede a experiência AUTO de cada composição. Ela não estima FPS em celulares físicos.

## Validação

O build, o lint e os 24 testes unitários passaram. A suíte completa do Chromium passou com 30 testes. Após o ajuste do rodapé, os cinco testes móveis e os quatro testes do build de produção passaram em nova execução. A rodada móvel verifica toque em caixas e seletores, rolagem sobre o Canvas, restauração de foco, rotação com pausa e inspeção preservadas, preferência de movimento e o alvo do GitHub no rodapé.

As capturas de desktop, notebook, ultrawide e zoom emulado ficaram sem overflow horizontal ou erros de console. Estão em `artifacts/infrastructure/part-14-desktop/`.

## Reprodução

```sh
npm run build
node scripts/audit-mobile.mjs part-14-after
node scripts/audit-mobile.mjs part-14-after-performance --performance-only
npm run test:e2e
npm run test:release
```

As capturas e os gestos foram validados com viewport e protocolo touch do Chromium. Dispositivos físicos Android/iOS, navegador Safari e consumo de bateria estão fora desta amostra.

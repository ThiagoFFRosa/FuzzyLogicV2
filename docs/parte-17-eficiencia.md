# Parte 17 — Eficiência de renderização

A referência é o checkpoint `7aa3f42` com ULTRA, escala de 100%, MSAA efetivo 4×, sombras ULTRA e câmera oficial. O benchmark fixa a pose com movimento reduzido, usa uma semente de aleatoriedade e conserva a iluminação e os objetos. Desktop e ultrawide usam BLUE. Mobile usa AMBER. Capturas de fases diferentes são comparadas em RGB na mesma máquina.

## Sequência de verificação

1. Medir a cena anterior e ablações temporárias, restaurando os sistemas entre as amostras.
2. Compartilhar as geometrias de caixa idênticas, manter os UVs do concreto e eliminar alocações no cálculo de tangentes. Conferir novamente a geometria alocada e os pixels.
3. Agrupar peças estruturais idênticas em pequenos setores e verificar draw calls, triângulos e recortes.
4. Medir a reutilização de sombras quando os casters de uma luz mantêm o mesmo estado. Preservar a atualização em movimentos, trocas de qualidade e Camera Studio.
5. Revisar capturas e testes de operação, compilação e distribuição. Publicar o checkpoint verificado.

O script `scripts/benchmark-factory.mjs` usa Chromium headless e registra a identificação do renderer. `FUZZS_PREVIEW` aponta para a prévia local. `FUZZS_BENCH_CASE` limita a execução a `desktop`, `ultrawide` ou `mobile`. Use fases `before`, `reuse`, `batch` e `after`. Os registros em `artifacts/part-17` conservam capturas intermediárias e as medidas de cada execução.

## Gargalos medidos

No desktop, cada ablação temporária partiu da mesma pose e foi revertida antes da próxima. Os números indicam o custo marginal na configuração ensaiada. Sistemas podem se sobrepor. Os grupos detectados por nome podem cobrir apenas parte de um sistema.

| Sonda em desktop | Draw calls | Triângulos | Mediana até o próximo frame apresentado |
| --- | ---: | ---: | ---: |
| Cena completa com recálculo de sombras | 465 | 61.457 | 869,1 ms |
| Reutilização dos mapas na pose congelada | 365 | 48.745 | 843,6 ms |
| Sem rolos e acionamento da esteira principal | 451 | 58.905 | 815,9 ms |
| Sem esteiras secundárias | 435 | 44.577 | 827,2 ms |
| Sem containers | 383 | 59.829 | 818,2 ms |
| Sem turrets da linha principal | 426 | 55.949 | 868,0 ms |
| Sem supervisor e braço | 457 | 56.307 | 814,2 ms |
| Sem tubulações e fluidos | 422 | 51.469 | 842,7 ms |
| Sem rupturas e vegetação identificada | 463 | 61.076 | 857,1 ms |
| Sem luminárias identificadas | 365 | 48.745 | 637,5 ms |
| Sem a malha de lavagem do scanner | 465 | 61.457 | 894,5 ms |
| Sem objetos transparentes | 444 | 61.295 | 859,3 ms |
| Sem névoa | 465 | 61.457 | 858,8 ms |
| Prova de fill rate a 50% de escala | 465 | 61.457 | 331,1 ms |

O contraste da última linha com a cena completa indica predominância do trabalho por pixel no SwiftShader. O recálculo de sombras aumenta as chamadas, mas reutilizar mapas na pose congelada mudou pouco o tempo total. Em operação, as caixas, o braço e os turrets podem alterar sombras em suas respectivas áreas. O mapa de serviço já usa atualização sob demanda. Mantive o recálculo dinâmico atual e reduzi a submissão de suportes através dos lotes que também projetam sombra. Com recálculo forçado, o desktop caiu de 465 para 432 chamadas. Os tamanhos e volumes dos mapas foram preservados.

As faíscas usam um objeto `Points` reaproveitado, invisível fora da janela do evento. Elas estavam inativas nessa pose, assim como a lavagem identificada do scanner. Os testes de eventos, troca de Core e produção ativa complementam a cena congelada. Bloom fica desligado por padrão no ULTRA. Uma amostra separada com Bloom mostrou 344 chamadas, 31 texturas e mediana de 852,0 ms entre frames diante de 341 chamadas, 29 texturas e 841,6 ms sem Bloom. Essas amostras curtas caracterizam o custo no mesmo compositor por software.

## Alterações mantidas

- Caixas com dimensões e UVs equivalentes compartilham `BoxGeometry` por cena. As UVs de concreto continuam em uma variante própria. As chapas instanciadas reaproveitam a caixa unitária. O proprietário do cache libera os recursos ao desmontar o renderer. A repetição de efeitos do Strict Mode conserva o cache.
- Pernas, bases, travessas, listras e elementos repetidos da parede foram agrupados por dimensões, material, cor e setor. Os lotes têm volumes próprios e mantêm oclusão por profundidade e sombras. Os containers interativos, as transparências, as malhas do supervisor, os rótulos dos produtos e as fontes de luz continuam independentes.
- O deslocamento das ripas usa apenas a matriz de translação. As esteiras secundárias calculam o mesmo parâmetro de comprimento de arco e usam vetores reutilizáveis para as tangentes. Cargas estacionadas descartam atualizações de pose idênticas. Os testes exercitam extremidades e inclinações usando as posições e tangentes da versão Three instalada.
- Os mapas procedurais já compartilham a biblioteca de superfícies. A auditoria encontrou oito arquivos públicos com 486.694 bytes e nenhum grupo duplicado por SHA-256. Os arquivos, texturas originais, lockfile e presets oficiais permanecem com os mesmos bytes. Os assets finais de `dist/assets` passaram de 2.118.212 para 2.119.926 bytes, incluindo a lógica das otimizações. O chunk da fábrica variou de 1.025,37 para 1.026,81 kB na saída do Vite.
- A suspensão existente fora da viewport ou na aba oculta permanece aplicada. A fábrica conserva o estado de tempo e eventos na retomada. O diagnóstico gráfico atualiza estado React em intervalos enquanto aberto, e os sistemas 3D atualizam suas próprias referências.

Uma sonda do hook de desenvolvimento React em 900 × 720 observou oito frames ativos após o boot, com diagnóstico fechado. O intervalo teve zero commits de React DOM e zero commits de React Three Fiber. A medida identifica a ausência de commits por frame nessa condição, sem estimar o custo de cliques ou da abertura do diagnóstico.

## Resultado antes → depois

Amostra de oito frames controlados com o mesmo viewport, DPR, câmera, tema, geometria da pose, ULTRA a 100%, MSAA 4× e Bloom desligado. O buffer ultrawide permaneceu em **3440 × 1159**. FPS é calculado pelos sete intervalos entre frames completos. Os p90 e p95 coincidem nessas amostras pequenas. Tempo de submissão é tempo de CPU observado em `gl.render`. A extensão de timer GPU estava indisponível.

| Viewport | FPS | Frame p50 | Frame p90 / p95 | CPU p50 | Draw calls | Triângulos | Geometrias | Texturas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Desktop 1280 × 900 | 1,179 → 1,178 | 850,5 → 841,6 ms | 866,3 → 889,4 ms | 3,6 → 3,7 ms | 365 → 341 | 48.745 → 49.225 | 377 → 251 | 29 → 29 |
| Ultrawide 3440 × 1440 | 0,322 → 0,321 | 3106,8 → 3096,5 ms | 3175,5 → 3156,3 ms | 5,5 → 4,7 ms | 537 → 475 | 54.733 → 54.781 | 526 → 307 | 33 → 33 |
| Mobile 390 × 844 (DPR 2) | 2,702 → 2,697 | 369,6 → 370,4 ms | 381,9 → 374,6 ms | 2,9 → 2,9 ms | 318 → 293 | 32.119 → 32.515 | 309 → 207 | 19 → 19 |

Os limites por lote podem enviar instâncias adjacentes que antes seriam descartadas individualmente, o que explica o pequeno aumento de triângulos. No ultrawide, o volume de geometrias residentes caiu 41,6% e as chamadas caíram 11,5%. O FPS se manteve essencialmente estável nessa amostra por software. A amostra não sustenta uma estimativa de ganho de FPS para GPU física.

Na carga local de desenvolvimento, `DOMContentLoaded` registrou 118,1 → 169,6 ms no desktop, 119,0 → 121,6 ms no ultrawide e 141,9 → 120,5 ms no mobile. São leituras individuais de desenvolvimento. O tempo do marco visível da cena passou a ser registrado na última rodada, sem leitura equivalente no baseline. As estimativas de heap JavaScript estão nos dados brutos. A decodificação das capturas entra no heap da rodada comparativa, de modo que a comparação de memória depende das contagens de recursos do renderer. VRAM e tempos isolados de GPU ficaram indisponíveis.

### Comparação visual

O primeiro grupo atingiu **zero diferenças** nos 1.152.000 pixels medidos no desktop. Após o instancing, a captura final tem 5 pixels distintos no desktop (delta máximo de 3 por canal), 4 no ultrawide (máximo de 1) e 4 no mobile (máximo de 6). São diferenças de borda compatíveis com o arredondamento da transformação de instâncias. A revisão visual conservou a composição, as cores e as sombras. A versão com lotes é visualmente equivalente nesses casos. Pixel a pixel, a igualdade ficou demonstrada para o compartilhamento de geometria na primeira comparação.

- Desktop [antes](render-reference/part-17/before/desktop.png) · [depois](render-reference/part-17/after/desktop.png)
- Ultrawide [antes](render-reference/part-17/before/ultrawide.png) · [depois](render-reference/part-17/after/ultrawide.png)
- Mobile [antes](render-reference/part-17/before/mobile.png) · [depois](render-reference/part-17/after/mobile.png)
- Dados brutos [baseline e ablações](render-reference/part-17/before/measurements.json) · [grupos intermediários e Bloom](render-reference/part-17/intermediate.json) · [versão final](render-reference/part-17/after/measurements.json)

Para repetir a linha de base, aponte `FUZZS_PREVIEW` para um servidor de desenvolvimento rodando o commit `7aa3f42`. Execute o script atual com a fase `before` em contextos separados para cada viewport. Use a versão final com `after`. Para medir o Bloom em separado, rode `FUZZS_BENCH_BLOOM=1` com a fase `bloom`. Os resultados são de Chromium headless com ANGLE/SwiftShader. Permanecem pendentes GPU e monitor físicos e Safari/iOS.

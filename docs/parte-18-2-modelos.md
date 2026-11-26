# Parte 18.2 — Modelos robóticos

Os modelos são autorais e construídos em Three.js. O briefing visual orientou a cerâmica clara, os vãos escuros e as articulações utilitárias. As dimensões de montagem seguem a fábrica aprovada.

| Modelo | Construção |
| --- | --- |
| Turret operacional | Dois painéis curvos e espessos, com dobradiças separadas, deixam visíveis a espinha traseira e os encaixes do chassi. O conjunto óptico tem barril, aro e lente convexa em um pivô próprio. Cada um dos três apoios tem coxa, joelho, canela e sapata com chanfro. |
| Turret desligada | A mesma família usa quadris mais baixos, pernas dobradas, painéis fechados e conjunto óptico em repouso. |
| Turret danificada | A perda do painel de boreste expõe o chassi e os cabos. O lado direito tem joelho fora de alinhamento e canela estreita. O aro óptico é interrompido e a lente é menor. |
| Sucata | Um chassi danificado deitado, duas peças de cerâmica soltas e um barril óptico removido reaproveitam as formas das unidades da linha. O sensor residual mantém o evento de manutenção. |
| Supervisor | Quatro segmentos de cerâmica delimitam uma carcaça oval em volta da estrutura de serviço. A traseira liga a tampa ventilada e os cabos ao encaixe do braço. Na frente, a cavidade chanfrada acomoda a lente convexa e as lâminas do obturador. |
| Braço | O carro do teto sustenta um garfo. Os elos vazados contêm travessas, eixos e mangueira. Cotovelo, punho e pistão acompanham a cinemática existente. |

O movimento usa os estados publicados da Parte 18.5. As dobradiças e o pivô da lente da turret acompanham a pane e o tracking existentes. As lâminas do supervisor acompanham a piscada e a irritação. As reações mantêm o comportamento de movimento reduzido. Os modelos distantes conservam as silhuetas com menos subdivisões e pernas agrupadas em uma malha. O cache da cena compartilha as geometrias de chassi, painel, óptica e pés entre linha, retorno e manutenção. O braço agrupa ferragens por elo, preservando a mobilidade de cada junta.

## Capturas

Com o Vite local na porta 5180, execute `node scripts/audit-robot-models.mjs before` sobre a revisão base `66fefe54cf03609c3d28fc2665139d6b1b7d652c` e `node scripts/audit-robot-models.mjs after` sobre a revisão desta etapa. O script usa Playwright Chromium e grava as duas séries em `artifacts/part-18-2/`. É possível apontar para outra porta local com `FUZZS_PREVIEW`.

- `modelos.png` mostra as seis categorias de frente, de lado, por trás e em perspectiva. O atlas reutiliza as malhas da cena carregada no Camera Studio e aplica luz de estudo igual nas duas séries.
- `studio.png` registra a câmera livre com zoom 2× dentro da fábrica.
- `studio-supervisor.png` aproxima a câmera livre do supervisor e mostra a ligação com o braço no ambiente.
- `hero-desktop.png`, `hero-ultrawide.png` e `hero-mobile.png` registram as câmeras oficiais nos três tamanhos.
- `metrics.json` registra as chamadas de desenho, triângulos, geometrias e intervalo mediano entre quadros.

## Verificação técnica

O teste de passagem da turret danificada executa o movimento da cena em passos de 50 ms, verifica o apoio na altura da esteira e mede a folga em relação aos pilares e à travessa do scanner. A passagem aciona o pulso de luz e a cena mantém a neblina ativa. Os testes de cinemática, interação e gráficos verificam tracking, dimensões do braço, BLUE e AMBER, reações locais, capacidade de inspeção, Bloom e escalas de 50%, 75%, 100% e 125%.

Build, lint, 35 testes unitários e 5 testes de distribuição passaram. A suíte de navegação passou em 39 de 40 cenários enquanto as capturas rodavam. O cenário que excedeu o prazo ao aplicar a densidade emulada de pixels passou na repetição isolada. O novo teste do scanner também passou isolado.

## Custo da cena

O Chromium usou SwiftShader, preset HIGH e movimento reduzido, com os mesmos buffers em cada par. As contagens são da cena inteira depois do último quadro. A amostra de tempo usa a mediana de cinco intervalos, incluindo a espera até a GPU virtual concluir cada quadro.

| Câmera | Buffer físico | Chamadas antes → depois | Triângulos antes → depois | Geometrias antes → depois | Intervalo mediano antes → depois |
| --- | ---: | ---: | ---: | ---: | ---: |
| Desktop | 1280 × 820 | 315 → 326 | 49.787 → 60.111 | 228 → 209 | 346,8 → 495,2 ms |
| Ultrawide | 3440 × 1159 | 436 → 447 | 55.381 → 66.489 | 278 → 258 | 1.719,3 → 1.782,1 ms |
| Mobile | 780 × 641 | 268 → 277 | 33.043 → 39.825 | 186 → 185 | 200,4 → 215,0 ms |

O cache reduziu as alocações de geometria. As carcaças espessas e as peças articuladas elevaram as contagens de chamadas e triângulos. Os intervalos variam com a carga do Chromium e foram coletados sem outra suíte de testes em execução. O desempenho em GPU física segue pendente.

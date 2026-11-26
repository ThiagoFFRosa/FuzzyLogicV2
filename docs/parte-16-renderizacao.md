# Parte 16 — Render Quality & Visual Fidelity

## Como testar

Escolha **ULTRA** no seletor de qualidade da fábrica. Abra **Ajustes gráficos** pelo ícone ao lado do seletor para ler o buffer efetivo. A opção **Exibir diagnóstico** acrescenta medidas da cena e do renderer. O painel fica fechado por padrão.

Após a validação em ultrawide, os quatro presets manuais usam a mesma configuração de AA, sombras e texturas. O buffer multiplica a dimensão CSS do canvas pelo DPR e pela escala escolhida. ULTRA combina nível alto de cena e supersampling de 125%. A câmera de produção fica em `src/lib/factoryCamera.ts`.

| Controle | Comportamento |
| --- | --- |
| Qualidade | LOW 50%, MEDIUM 75%, HIGH 100%, ULTRA 125%. AUTO usa níveis adaptativos com orçamento de pixels. 2D está disponível no seletor. |
| Escala | O painel aceita somente os quatro valores dos presets. Em AUTO, uma escala manual fixa o buffer e a seleção da qualidade dos elementos da cena continua adaptativa. |
| Antialiasing | MSAA nativo sempre que concedido pelo contexto. FXAA é o fallback automático. O painel informa o método efetivo e a contagem de amostras. |
| Sombras | HIGH em todos os presets 3D. Os spots principais usam mapas de 1024², inclusive em mobile. As sombras laterais e de manutenção pertencem à composição ampla. |
| Texturas | Padrão, com anisotropia de até 4× conforme o dispositivo. |
| Pós-processamento | Bloom discreto opcional. As luzes, os brilhos dos shaders, a névoa e a vinheta do projeto continuam disponíveis com o ajuste desligado. |
| Limite de FPS | Sem limite ou 30, 60, 120, 144 e 165. Um agendador por `requestAnimationFrame` limita os frames realmente enviados e usa deltas de tempo nas animações. O navegador e o dispositivo determinam o que pode ser atingido. |
| Resolução dinâmica | Ativa somente em AUTO com a escala automática. O diagnóstico indica se está em uso. |

O seletor usa `fuzzs-quality`. A escala manual, o Bloom e o limite de FPS são salvos por preset em `fuzzs-render-settings-v1`. A leitura de preferências anteriores descarta as opções removidas e as escalas fora dos quatro valores atuais. **Restaurar padrões** restaura o preset ativo. Os ajustes são aplicados ao canvas vigente e preservam a inspeção.

Em Chromium com SwiftShader, uma viewport emulada de 3440 × 1440 e DPR 1 produziu 1720 × 579 em LOW, 2580 × 869 em MEDIUM, 3440 × 1159 em HIGH e 4300 × 1448 em ULTRA. Os quatro presets usaram MSAA 4×. Em mobile emulado a 390 × 844 com DPR 2, LOW produziu 390 × 320 e HIGH 780 × 641. Ambos usaram MSAA 4× e mapas principais de 1024².

## Referência histórica da Parte 16

Os valores e as capturas abaixo registram a implementação original da Parte 16.

- O renderer WebGL2 anterior usava `antialias: false`. Nenhum FXAA, SMAA, MSAA ou compositor de tela estava ativo. Em 1920 × 1080 com DPR 1, a cena já ocupava o buffer nativo e ainda apresentava serrilhamento.
- HIGH limitava o DPR a 1,5 e o canvas a aproximadamente 2,5 milhões de pixels. A composição compacta tinha teto de 720 mil pixels. O teto de DPR foi a restrição efetiva na amostra mobile com DPR 2. O teto de pixels foi a restrição efetiva no ultrawide.
- AUTO podia baixar a qualidade por tempo de quadro, incluindo resolução e nível da cena. HIGH já era fixo dentro de seu orçamento. As capturas registraram a transformação CSS do Canvas como `none`. O limite de altura da hero e a área da navbar explicam a diferença entre a altura da janela e a altura do Canvas.
- A cena original usa ACES Filmic, saída sRGB, névoa, brilho em shaders/sprites e vinheta CSS. A auditoria não encontrou AO de tela, bloom pós-processado ou um render target de tela que descartasse MSAA.
- Os mapas procedurais já usavam mipmaps, minificação trilinear, magnificação linear e espaço sRGB. A anisotropia era 4×. Os rótulos dos produtos medem 1024 × 768. Os materiais repetíveis de 256 × 256 e rótulos auxiliares até 256 × 80 ainda limitam o detalhe em closes. A Parte 18 pode revisar as fontes desses mapas.

## Pipeline e limites

O modo MSAA suaviza a cobertura geométrica no framebuffer padrão. Nas amostras, a taxa efetiva foi 4×. No recorte comparativo em resolução nativa, MSAA entrega o melhor equilíbrio entre contornos suaves e letras finas. FXAA funciona sobre a cor final e equivale a um filtro de tela. Os métodos são exclusivos. A lista oferece o MSAA concedido pelo navegador, sem prometer uma contagem de amostras selecionada manualmente.

Se FXAA ou Bloom estiver ativo, o pós-processamento lê a cor já resolvida no buffer real do Canvas. O buffer principal conserva as dimensões escolhidas. O Bloom usa dois buffers de um quarto da largura e altura, e o FXAA usa o passo de texel efetivo. O HTML continua composto pelo navegador. ACES, sRGB e os materiais que dispensam tone mapping, como etiquetas, são processados como antes.

As sombras desktop de referência usam 2048² nas luminárias principais, 1024² nas laterais e 512² na manutenção. Os spots principais e laterais passam a projetar de 1,25 a 14 unidades no ULTRA, preservando cone, cor e intensidade. O bias e o normal bias foram ajustados com o volume. Os mapas são atualizados nos frames renderizados pelo ULTRA. A composição compacta mantém seus spots principais e o layout existente.

As dimensões aplicadas respeitam o limite do renderbuffer, da viewport GL e, quando há cópia de tela, do tamanho máximo de textura. O painel apresenta buffer efetivo e avisa quando uma limitação reduz a configuração. Perda de contexto continua oferecendo o fluxo de recuperação e 2D. O seletor permite voltar para um preset leve. O diagnóstico mede chamadas, triângulos, memória em contagem de geometrias/texturas, luzes e tempos. O tempo de CPU é a submissão da renderização. O tempo de GPU só é exibido quando a extensão de consulta está disponível. O painel atualiza em intervalos de cerca de 500 ms.

## Capturas e medidas

Chromium headless com **ANGLE/SwiftShader**. Os tamanhos abaixo são viewports emuladas. Capturas em BLUE com movimento reduzido para fixar a composição. FPS e tempo entre frames foram medidos em seguida, com animação ativa, por cerca de 3,6 s. As amostras ultrawide ULTRA captaram apenas dois frames e servem como referência de laboratório, com confiança baixa para desempenho.

| Viewport | DPR | CSS do Canvas | Buffer HIGH anterior | Buffer ULTRA | FPS anterior → ULTRA | ms por frame anterior → ULTRA | Draw calls / triângulos na captura |
| --- | ---: | --- | --- | --- | ---: | ---: | --- |
| 3440 × 1440 | 1 | 3440 × 1159 | 2724 × 917 | 3440 × 1159 | 0,71 → 0,31 | 1418 → 3207 | 537 / 54.733 |
| 1920 × 1080 | 1 | 1920 × 1000 | 1920 × 1000 | 1920 × 1000 | 1,00 → 0,64 | 998 → 1561 | 434 / 50.937 |
| 390 × 844 | 2 | 390 × 320,72 | 585 × 481 | 780 × 641 | 7,66 → 2,54 | 131 → 393 | 318 / 32.119 |

- Ultrawide [HIGH anterior](render-reference/part-16/before/ultrawide.png) · [ULTRA](render-reference/part-16/after/ultrawide.png)
- Desktop [HIGH anterior](render-reference/part-16/before/desktop.png) · [ULTRA](render-reference/part-16/after/desktop.png)
- Mobile [HIGH anterior](render-reference/part-16/before/mobile.png) · [ULTRA](render-reference/part-16/after/mobile.png)
- Recorte ultrawide em 100% [OFF](render-reference/part-16/antialias/off.png) · [FXAA](render-reference/part-16/antialias/fxaa.png) · [MSAA](render-reference/part-16/antialias/msaa.png)
- Dados brutos [antes](render-reference/part-16/before/measurements.json) · [depois](render-reference/part-16/after/measurements.json) · [AA](render-reference/part-16/antialias/measurements.json)

Para reproduzir as capturas acima, use o script e a aplicação do checkpoint `7aa3f42`. A linha de base usou `45e5e4b`.

Para validar os presets atuais, rode `npm run dev` e `npx playwright test tests/graphics.spec.ts`. A suíte cobre DPR 1,25 e 1,5 emulados, resize, fallback de MSAA e limite de dimensões WebGL simulado. Safari/iOS e cadências acima de 60 Hz seguem pendentes.

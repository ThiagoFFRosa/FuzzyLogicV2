# FUZZS Creative Rework Implementation Plan

**Goal:** experiência de laboratório com personagem expressivo.
**Spec:** briefing Creative Direction Rework anexado e DESIGN.md.
**Architecture:** React/TS/Vite, contexto de tema/i18n e dados preservados. Hook de comportamento com motion values, timers canceláveis e estados discretos. SVG reutilizável. Atmosfera em componente/CSS. Portal separa texto do recorte.

- [x] Testes RED: Core clicável, personalidade, mobile Portal legível.
- [x] SVG e hook: inércia, inclinação, blink, idle, reação e pausa.
- [x] Hero monumental, atmosfera e transição de modo.
- [x] Vitrine de projetos e seções distintas preservando informações.
- [x] Portal energético com textos independentes.
- [x] Testes de movimento, teclado/toque, persistência, reduced motion, capturas e build.

Revisar cleanup, nested buttons no sticky, interrupção de tema, 320px, textos nos extremos do slider. Sem backend, publicação ou mudanças na V1.

## Evidência de conclusão

4 testes unitários e 8 testes Chromium passaram; build TypeScript strict/Vite concluído. Capturas desktop/mobile e vídeo de cursor, clique, transição e idle em artifacts/. Revisão independente encontrou resposta ausente com reduced motion: reproduzida em teste RED e corrigida mantendo feedback textual sem movimento. Reação presa após tema também reproduzida e corrigida. Textos do Portal verificados nos extremos do slider, toque e teclado. Sem dependências novas de produção, backend ou publicação. Prévia local em localhost:5180.

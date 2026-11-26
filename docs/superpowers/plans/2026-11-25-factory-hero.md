# FUZZS Factory Hero

**Spec:** briefing anexado e duas referências fornecidas. A primeira orienta atmosfera, escala e arquitetura; a segunda orienta apenas composição, câmera fixa lateral e fluxo diagonal esquerda → direita, com objetos crescendo em perspectiva.

**Direção:** instalação antiga, funcional, concreto grafite, metal gasto, luz fria de janelas altas, sinalização FUZZS, pequenos pontos de vegetação. Esteira real em 3D, crates distintos com nomes/categorias legíveis, Core existente em segundo plano, três turrets procedurais autorais. Não usar a imagem como fundo ou copiar assets/logos de Portal.

**Arquitetura:** React Three Fiber/Three para geometria, materiais, luz e movimento em coordenadas compartilhadas. Hero em HTML acessível com seleção dos cinco projetos, pausa, detalhes e links reais. Import dinâmico do Canvas, limite de DPR, suspensão fora da viewport e fallback sem WebGL. Dados/traduções centralizados e restante do site preservado.

- [x] Testes RED: transporte periódico no mesmo sentido e inspeção/pausa/fechamento acessíveis.
- [x] Ambiente industrial, câmera fixa e esteira com contatos físicos coerentes.
- [x] Caixas procedurais distintas com painéis de identificação e tampas articuladas.
- [x] Seleção desacelera/para a linha; inspeção desdobra a partir do objeto e fecha sem modal.
- [x] Core observa cursor ativo e produção em idle; turrets ativa, inativa e danificada.
- [x] Layout mobile próprio, reduced motion, fallback, testes, capturas e revisão.

Restrições: sem backend/deploy, sem inventar dados ou URLs. Preservar seções abaixo da hero. Verificar foco por teclado, pausa contínua, cliques rápidos, hover/toque, carga/falha de WebGL e limpeza dos recursos.

## Evidência final

6 testes unitários, 13 testes Chromium, captura desktop/mobile e vídeo da sequência. Teste de pausa compara pixels da linha antes/depois: estável quando parada e diferente em movimento. Core muda foco para produção sem input. Revisão independente: busca de seleção anterior cancelada em novas seleções (regressão RED→GREEN), turret adormecida apoiada por bounding box transformada. WebGL indisponível também testado. Nada foi publicado.

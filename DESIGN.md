# FUZZS — Personality laboratory

O rework artístico substitui a direção de instrumento óptico realista. Mundo escolhido pelo usuário: creative development inspirado em Portal 2, com um personagem vetorial branco, expressivo e autoral. Preservar fatos, projetos, contatos, idiomas e build estático.

Hero: câmara de testes na primeira viewport. Tipografia FUZZS monumental atrás do personagem, Core flutuando sobre campo de energia, piso técnico em perspectiva e legendas laterais. Conteúdo e CTAs legíveis na base da cena. Corpo simples, alças geométricas, abertura escura grande e pupila elétrica; sem textura metálica ou dezenas de anéis.

BLUE curioso e expansivo; AMBER atento e contido. Springs distintos, movimento autônomo em repouso, piscar, reação ao clique e atenção aos controles. Troca de modo fecha pálpebra, muda iluminação, reorganiza alças e reabre lente. Reduced motion, pausa fora da viewport e aba oculta, cleanup de timers/listeners.

Projetos como sequência de experimentos em composições distintas: áudio FuzControl, trajetória SeuValet, teclas Fuzz Deck, pixels MineWardrobe e fluxo Neonatal. Artes conceituais identificadas.

Portal: campo energético azul/âmbar e divisor iluminado; texto fora do recorte, em colunas no desktop e blocos empilhados no celular. Controle range por teclado/toque. Atmosfera em CSS/Motion sem dependências novas. Azul #26bfff, âmbar #ff9c35, branco cerâmico, #09090B. Fontes locais preservadas.

## Refinamento aprovado — equilíbrio visual

A composição permanece a mesma. Core reduzido em aproximadamente 23% em desktop, ultrawide e mobile, com posição visual mais baixa e a marca mais legível. No ultrawide, a tipografia tem limite de escala. A legenda mobile fica fora da silhueta do personagem. Mantidos projetos, Portal e alternância entre seções claras/escuras. Contato grafite com iluminação âmbar discreta, sem superfície laranja saturada.

A luz e as camadas existentes recebem inércia e parallax limitado; duas partículas percorrem as órbitas. O loop encerra quando chega ao repouso e pausa com a aba oculta. Reduced motion mantém a cena estática. Nenhum conteúdo, funcionalidade, dependência ou fronteira arquitetural foi alterado.

## Hero atual — fábrica de produtos

A nova hero segue o briefing Factory Hero e as duas imagens fornecidas: fotografia como referência artística industrial, desenho apenas para composição diagonal. Ambiente 3D procedural em React Three Fiber/Three.js, câmera fixa lateral, esteira da esquerda distante para a direita próxima, caixas/turrets apoiadas na mesma superfície. Arquitetura antiga funcional, concreto/grafite/metal, janelas altas, tubulações, mezanino e vegetação discreta. Nenhuma imagem ou asset proprietário foi copiado.

O foco são os cinco produtos reais. Cada caixa tem materiais, proporções e placa gráfica próprios, com nome/categoria/descrição/ação. Hover desacelera a linha; inspeção a para, abre a tampa e desdobra um painel HTML conectado ao objeto. Fechamento devolve foco e respeita pausa anterior. Seletores estáticos fornecem acesso equivalente por teclado e no mobile. O Core existente aparece como supervisor menor ao fundo, observando cursor ativo e produção quando o visitante para.

Três turrets autorais procedurais: ativa, adormecida e danificada. Bounding boxes transformadas garantem apoio após inclinações. Crates e trilhos usam o mesmo deslocamento; os objetos crescem por projeção perspectiva, sem escala artificial.

No mobile, câmera e enquadramento são próprios, e todos os nomes ficam acessíveis na primeira dobra a 390×844. Inspeção fica em sequência vertical. Sem WebGL, a hero preserva seleção e conteúdo. Reduced motion interrompe o transporte automático. Canvas lazy, DPR limitado, animação suspensa fora da viewport/aba oculta. Seções abaixo da hero preservadas.

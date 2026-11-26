# Parte 12 — Preparação para publicação

## Conteúdo e experiência

A fábrica continua como entrada interativa. A navegação principal leva aos projetos, à apresentação pessoal e ao contato. A seção convencional tem um índice com cinco âncoras, descrições comerciais, status e detalhes expandidos. A inspeção 3D, o modo 2D, as preferências gráficas, os temas e o movimento reduzido usam o fluxo das etapas anteriores.

`src/data/projects.ts` é a fonte de conteúdo das placas 3D, da barra, da inspeção, da seção convencional e dos dados estruturados. O build injeta uma versão estática em português com os cinco projetos e os contatos. O React substitui essa versão quando carrega e aplica a preferência PT-BR ou EN-US. Há uma única URL canônica, com o conteúdo em português no HTML recebido inicialmente e a opção de inglês na interface. A aplicação continua estática e serve as páginas a partir de `dist/`.

A imagem social de 1200 × 630 usa a fábrica e a identidade do projeto em uma composição fixa. O HTML inclui descrição, Open Graph, Twitter Card, JSON-LD com Person, WebSite e CreativeWork, favicon, robots e sitemap. A rota principal é `/`. A navegação usa fragmentos. `404.html` cobre caminhos inexistentes nos hosts que servem essa página.

## Conteúdos a confirmar

- Todas as imagens reais continuam pendentes. O site exibe ilustrações conceituais identificadas. O código aceita uma imagem principal e imagens complementares por projeto, com variantes responsivas e alt em PT-BR e EN-US.
- Para FuzControl, o texto registra mais de mil músicas gerenciadas **em um único evento**, conforme o briefing. Ao adicionar imagens, usar dados de demonstração ou material autorizado e anonimizado.
- Para SeuValet, preparar uma captura do painel e outra da experiência via QR Code, sem placas, nomes ou dados de clientes reais. A primeira entra na arte do projeto e no painel de inspeção. As demais aparecem nos detalhes da seção convencional.
- Para Fuzz Deck, confirmar individualmente o que já funciona antes de marcar funções como disponíveis. A apresentação atual identifica a lista como escopo do projeto pessoal.
- Para MineWardrobe, atualizar o status quando houver confirmação de disponibilização ou versão pública. Conferir a licença dos assets inseridos em futuras capturas.
- Para TG Neonatal, usar material de demonstração ou dados agregados. A apresentação identifica o caráter acadêmico e a ausência de validação clínica. Métricas de avaliação podem ser acrescentadas quando fornecidas.
- A formação continua indicada como fase final de Engenharia de Computação. Atualizar o campo `profile.education` quando houver confirmação de conclusão.

## Inventário de assets e licenças

| Asset | Origem e licença |
| --- | --- |
| Fábrica, esteiras, turrets, supervisor, vegetação, iluminação e texturas industriais | Geometria, shaders e texturas procedurais do próprio projeto em `src/components/sections/factory`. |
| Ilustrações dos cinco projetos | Arte do próprio portfólio em CSS, SVG e elementos React. Os ícones pertencem ao conjunto Lucide. |
| Identidade FUZZS, favicon e imagem social | Arte do projeto. `public/favicon.svg`, `public/assets/social.png` e o estudo anterior `public/assets/social.svg`. O PNG pode ser regenerado com `node scripts/render-social-card.mjs` com a prévia local disponível. |
| Inter e Space Grotesk | Fontes locais via Fontsource, ambas SIL OFL 1.1. O build copia os avisos originais para `dist/licenses/`. |
| Ícones Lucide | ISC, com avisos de componentes derivados no arquivo de licença do pacote. O build agrega os avisos em `dist/third-party-notices.md`. |
| React, React DOM, Three.js, React Three Fiber e Motion | MIT. Os avisos das bibliotecas empacotadas e de suas dependências seguem no build. O npm de React Three Fiber indica MIT e omite o texto integral, incluído separadamente a partir da versão upstream. Vite e Tailwind também usam MIT. [Licença do React Three Fiber 9.8.2](https://github.com/pmndrs/react-three-fiber/blob/v9.8.2/LICENSE) |

Não foram identificados GLB externos, screenshots de produtos, arquivos extraídos de Portal 2 ou imagens raster de IA no conjunto publicado. A origem dos elementos anteriores foi avaliada pelos arquivos da cópia de trabalho e pela documentação disponível. As futuras capturas e quaisquer modelos externos exigem revisão própria de direitos e privacidade antes de entrar em `public/`.

## Segurança e privacidade

Foram revisados os arquivos públicos, a configuração do Vite e o lockfile. A busca por padrões comuns de credenciais nos arquivos de fonte e configuração retornou sem correspondências, e não havia arquivos `.env` na raiz. A entrega não exige variáveis secretas. A cópia não contém metadados Git para auditoria do histórico. As dependências de produção e de desenvolvimento tiveram zero alertas no `npm audit` na data da validação. O serviço de contato usa o endereço profissional informado e o perfil de GitHub fornecido. O site usa armazenamento local para preferências e não instala analytics.

Cloudflare Pages e Vercel têm configuração de `nosniff`, referrer policy, proteção contra iframe e permissões de câmera, microfone e localização desativadas. Em Nginx, aplicar os mesmos cabeçalhos. As políticas de qualquer provedor, incluindo coleta de logs de rede, devem ser verificadas no plano escolhido.

## Build e desempenho

O HTML da Parte 12 tem 8,54 kB e 2,49 kB em gzip. O JS inicial tem cerca de 137,2 kB em gzip. O bloco 3D de cerca de 276,2 kB em gzip continua carregado sob demanda, com a infraestrutura em módulos separados. O Vite ainda avisa sobre o tamanho bruto do bloco 3D. O cartão social pesa aproximadamente 483 kB e é requisitado por consumidores dos metadados, sem entrar no fluxo da página inicial.

A última comparação de FPS e frame time é a da [Parte 11](parte-11-performance.md), em Chromium e SwiftShader. Ela registrou 12,9 → 53,8 FPS para mobile emulado e 10,2 FPS em LOW no desktop. Esses valores não incluem a Parte 12. Em uma navegação local do build final em 2D e com movimento reduzido, o Chromium registrou LCP de 184 ms no desktop em PT e 124 ms em viewport móvel em EN, com somas de shifts de 0,0003 e 0,038. GPU física, Safari/iOS e Core Web Vitals de campo permanecem fora da validação.

## Validação

- Confirmação de três respostas HTTP 200 via HTTPS nos endereços públicos de FuzControl, SeuValet e GitHub. O link de e-mail foi validado como `mailto:contato@fuzzs.dev`.
- Build de produção, type checking, checagem de formatação e 22 testes unitários. A suíte de desenvolvimento passou com 22 testes Chromium, e os três testes do build final verificaram conteúdo sem JavaScript, navegação e idiomas em 2D e inspeção com troca de qualidade em 3D.
- O novo teste de mídia passou com capa, captura complementar, dimensões e texto alternativo nos dois idiomas. A checagem de desktop, ultrawide, notebook, mobile e zoom emulado de 80% e 125% terminou sem overflow horizontal ou erros de console. Os arquivos ficam em `artifacts/infrastructure/part-12-release/`.
- A auditoria axe-core 4.14.1 em desktop PT, mobile EN e HTML estático ficou sem violações automáticas após a correção dos nomes dos controles. O axe deixou 32 ocorrências de contraste para revisão manual em cada versão interativa, principalmente sobre fundos compostos. Foram conferidas capturas da apresentação comercial e o fluxo por teclado. A auditoria não equivale a certificação WCAG ou a testes com leitores de tela reais.

## Hospedagem recomendada

**Cloudflare Pages com saída estática** se a conta e os limites de uso atenderem ao portfólio. A zona já usa Cloudflare, o que simplifica a ligação do domínio raiz e a emissão de TLS. Os termos Self-Serve e os limites publicados consultados em 25/11/2026 listam restrições gerais e dos planos gratuitos, sem uma limitação a uso pessoal equivalente à do Vercel Hobby. Conferir os termos da conta e os limites no momento da publicação. [Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/) · [Limites do Pages](https://developers.cloudflare.com/pages/platform/limits/) · [Termos Self-Serve](https://www.cloudflare.com/terms/)

**Vercel Pro** é a alternativa para uso comercial. A documentação oficial restringe Hobby a uso pessoal e não comercial. `vercel.json` define o build, a saída e os cabeçalhos. [Planos da Vercel](https://vercel.com/docs/plans) · [Restrições do Hobby](https://vercel.com/docs/plans/hobby) · [Domínio personalizado](https://vercel.com/docs/domains/working-with-domains/add-a-domain)

Para ambos, usar Node.js 22.12 ou superior, `npm ci`, comando de build `npm run build` e diretório `dist`. Pode-se enviar apenas `dist/` pelo fluxo de upload estático suportado pelo host. A prévia hospedada é o lugar para conferir cabeçalhos, HTTPS e links externos antes de conectar o domínio. O HTML, o cartão social, o sitemap e o robots devem revalidar. Os arquivos com hash do Vite podem receber cache longo e `immutable`; mantenha o cartão social, o favicon e as imagens de nome estável fora dessa regra. [Entrega de assets Cloudflare Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/)

### VPS com Nginx

Copiar `dist/` para o diretório publicado da VPS. Usar o certificado e a chave do ambiente, provisionados no servidor. O caminho abaixo é um exemplo de diretório de aplicação, e os caminhos TLS devem vir da configuração real.

```nginx
server {
    listen 80;
    server_name fuzzs.dev;
    return 301 https://fuzzs.dev$request_uri;
}

server {
    listen 443 ssl;
    server_name fuzzs.dev;
    root /var/www/fuzzs;
    index index.html;
    ssl_certificate /caminho/do/certificado.pem;
    ssl_certificate_key /caminho/da/chave.pem;

    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header X-Frame-Options DENY always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    error_page 404 /404.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~ "^/assets/[^/]+-[A-Za-z0-9_-]{8}\.(js|css|woff2)$" {
        expires 1y;
        try_files $uri =404;
    }
}
```

Validar a configuração com `nginx -t`. Quando houver proxy Cloudflare na frente da VPS, usar TLS válido na origem e modo completo estrito. Se `www` fizer parte da entrega, provisionar seu certificado e responder com redirecionamento permanente para o domínio raiz. [Cloudflare Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)

## Conectar fuzzs.dev depois da autorização

1. Validar a prévia do host, guardar a versão do build e definir como voltar ao deploy anterior.
2. Na zona Cloudflare, registrar os valores web atuais para rollback. Preservar nameservers, MX, SPF, DKIM, DMARC e TXT de verificação do Proton. A alteração deve ficar restrita aos registros web do domínio raiz e do `www` opcional.
3. No Pages, adicionar o domínio na configuração do projeto e deixar a integração criar ou indicar o registro web, a partir do hostname real do projeto. Na Vercel, copiar os tipos, hosts e destinos indicados para o projeto. Na VPS, criar o registro A com o IPv4 real e um AAAA apenas se houver IPv6 configurado.
4. Aguardar o certificado e verificar o acesso em `https://fuzzs.dev/`. O registro .dev exige HTTPS funcional nos navegadores. Se `www` estiver em uso, validar TLS e redirecionamento 301/308 para o domínio raiz. [Google Registry .dev](https://www.registry.google/domains/dev/)
5. Conferir canonical, robots, sitemap, imagem social, política de cache, 404 e ausência de conteúdo misto. Conferir os projetos e a interface tanto no modo 3D quanto no 2D.
6. Comparar os registros de e-mail com o inventário anterior. Pausar a conexão web e restaurar os registros web anteriores se houver problema. O contato por e-mail pode ser verificado pela conta do proprietário após a publicação.

Nenhum deploy, registro DNS, certificado ou configuração do Proton foi alterado nesta etapa.

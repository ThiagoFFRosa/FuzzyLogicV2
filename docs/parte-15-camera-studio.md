# Camera Studio

Em desenvolvimento, abra `http://127.0.0.1:5173/?camera=1` ou pressione **Ctrl + Shift + K** com o portfólio aberto. No macOS, use **⌘ + Shift + K**. A ferramenta é carregada sob demanda. As distribuições geradas por `npm run build` excluem o Studio, mesmo quando a URL contém `?camera=1`.

## Calibrar

1. Espere a fábrica inicializar. **Production Camera** mostra o enquadramento oficial da viewport atual.
2. Entre em **Free Camera** para começar a partir desse enquadramento. Arraste a cena para orbitar, arraste com o botão direito para mover o alvo e use a roda para aproximar ou afastar a câmera. Com **Orbit controls** desligado, o enquadramento fica fixo e os containers voltam a responder ao mouse.
3. Use os campos numéricos e sliders para ajustar a posição, o alvo e a lente. O zoom óptico é separado da distância que a roda ajusta. A rotação é em graus ao redor do eixo óptico. **Reset optics** restaura só a lente. **Restore default** restaura o perfil selecionado.
4. Use **Device profile** para trocar o conjunto de valores. Cada perfil mantém seu rascunho durante a sessão. Use **Viewport** para testar a cena e o HTML numa janela com as dimensões selecionadas. Em modo livre, mudar a viewport mantém o perfil selecionado. Em modo de produção, o perfil acompanha a viewport. **Mobile landscape** usa 688 × 387 para exercitar o layout compacto em duas colunas em computadores.
5. Na aba **Scene**, pause a esteira e suspenda os eventos ambientais de forma independente. Use os guias de composição, marcadores e helpers 3D para avaliar o enquadramento. **Hide HTML** libera a visualização da cena e mantém a geometria da viewport.

O painel pode ser arrastado pela alça ou movido com as setas quando ela estiver em foco. **Alt + M** minimiza ou expande, **Alt + O** alterna os controles de órbita, **Alt + P** pausa ou retoma a esteira e **Alt + H** oculta ou restaura o HTML.

## Salvar, compartilhar e oficializar

- Em **Presets & I/O**, use **Save as new** para armazenar o enquadramento com um nome. O armazenamento é local ao navegador e à origem. Presets locais, do localhost e de um túnel ngrok ficam em origens diferentes.
- **Copy Camera Configuration** exporta o perfil ativo. **Copy all profiles** exporta o mapa de perfis. A caixa de texto também recebe o resultado para cópia manual. **Import JSON** aceita um perfil ou um mapa completo e valida o conteúdo antes de aplicar.
- Para oficializar uma configuração, cole o objeto do perfil em `OFFICIAL_CAMERA_PROFILES` no arquivo `src/lib/factoryCamera.ts` sob a chave igual a `profile`. Em uma exportação de todos os perfis, use o mapa como valor dessa constante. O FOV exportado é efetivo e já incorpora o enquadramento aplicado na hora da exportação. Use a mesma viewport para comparar o resultado. Os perfis sem substituição continuam usando as regras responsivas originais.

## Acesso pelo ngrok

Aponte o túnel para a porta local do Vite. Se o Vite bloquear o cabeçalho Host do túnel, inicie o servidor de desenvolvimento com o hostname exato fornecido pelo ngrok. No PowerShell:

```powershell
$env:__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS = 'seu-host-do-tunel.ngrok-free.app'
npm.cmd run dev
```

Abra a URL HTTPS do túnel com `?camera=1`. A simulação e o clipboard usam a origem do próprio túnel.

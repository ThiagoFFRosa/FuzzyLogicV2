export const facilityBoot = {
  pt: {
    title: 'Inicializando a fábrica',
    ready: 'Instalação pronta',
    unavailable: 'Visualização 3D indisponível',
    progress: 'Progresso da inicialização',
    mode2d: 'Usar versão 2D',
    projects: 'Ir para os projetos',
    steps: {
      module: 'Módulo de produção',
      fonts: 'Fontes da interface',
      renderer: 'Renderizador WebGL',
      scene: 'Infraestrutura e supervisor',
      frame: 'Primeiro quadro',
    },
    failures: {
      assets: 'Alguns recursos da fábrica não carregaram. Tente novamente ou use a versão 2D.',
      renderer:
        'O navegador não conseguiu manter a visualização 3D. Os projetos continuam disponíveis.',
      timeout:
        'A inicialização demorou mais que o esperado. Você pode tentar novamente ou seguir para os projetos.',
    },
  },
  en: {
    title: 'Starting the factory',
    ready: 'Facility ready',
    unavailable: '3D view unavailable',
    progress: 'Startup progress',
    mode2d: 'Use 2D view',
    projects: 'Go to projects',
    steps: {
      module: 'Production module',
      fonts: 'Interface fonts',
      renderer: 'WebGL renderer',
      scene: 'Infrastructure and supervisor',
      frame: 'First frame',
    },
    failures: {
      assets: 'Some factory resources failed to load. Try again or use the 2D view.',
      renderer:
        'Your browser could not keep the 3D view running. The projects are still available.',
      timeout: 'Startup took longer than expected. Try again or go straight to the projects.',
    },
  },
} as const;

import type { Locale } from '../lib/behavior';

type Localized = Record<Locale, string>;
export interface ProjectScreenshot {
  src: string;
  srcSet?: string;
  width: number;
  height: number;
  alt: Localized;
}

export interface Project {
  id: string;
  name: string;
  category: Localized;
  description: Localized;
  purpose: Localized;
  solution: Localized;
  status: Localized;
  note?: Localized;
  features: Record<Locale, string[]>;
  tags: Record<Locale, string[]>;
  url?: string;
  screenshots?: ProjectScreenshot[];
}

export const projects: Project[] = [
  {
    id: 'fuzcontrol',
    name: 'FuzControl',
    category: { pt: 'GESTÃO ESPORTIVA', en: 'SPORTS MANAGEMENT' },
    description: {
      pt: 'Gestão de competições de ginástica, da organização à trilha de cada apresentação.',
      en: 'Manage gymnastics competitions, from event operations to performance music.',
    },
    purpose: {
      pt: 'Coordenar a operação e as músicas de competições de ginástica.',
      en: 'Coordinate gymnastics events and the music used in performances.',
    },
    solution: {
      pt: 'O FuzControl reúne painéis administrativos, gestão de músicas e automação de processos em um sistema criado para organizações esportivas.',
      en: 'FuzControl brings admin dashboards, music management and workflow automation together in one system for sports organizations.',
    },
    status: { pt: 'Produto comercial em uso', en: 'Commercial product in use' },
    features: {
      pt: [
        'Organização e gestão operacional de competições.',
        'Painéis administrativos e automação de tarefas do evento.',
        'Mais de mil músicas gerenciadas em um único evento.',
      ],
      en: [
        'Competition planning and event operations.',
        'Admin dashboards and event workflow automation.',
        'More than 1,000 tracks managed at a single event.',
      ],
    },
    tags: { pt: ['Automação', 'Gestão de eventos'], en: ['Automation', 'Event operations'] },
    url: 'https://fuzcontrol.com',
  },
  {
    id: 'seuvalet',
    name: 'SeuValet',
    category: { pt: 'OPERAÇÃO DIGITAL', en: 'DIGITAL OPERATIONS' },
    description: {
      pt: 'Gestão de estacionamento valet com solicitações de retirada por QR Code.',
      en: 'Valet parking management with QR code vehicle retrieval requests.',
    },
    purpose: {
      pt: 'Organizar a entrada, o atendimento e a retirada de veículos em operações de valet.',
      en: 'Organize vehicle drop-off, service and pickup in valet parking operations.',
    },
    solution: {
      pt: 'A equipe acompanha a operação no painel de atendimento. O cliente usa um QR Code para solicitar a retirada.',
      en: 'Staff manage the operation from a service dashboard. Customers request their vehicle by scanning a QR code.',
    },
    status: { pt: 'Sistema para operações de valet', en: 'Valet operations system' },
    features: {
      pt: [
        'Registro e gestão de veículos.',
        'Solicitação de retirada por QR Code.',
        'Painéis de atendimento, automação e integrações operacionais.',
      ],
      en: [
        'Vehicle check-in and management.',
        'QR code retrieval requests.',
        'Service dashboards, workflow automation and operational integrations.',
      ],
    },
    tags: { pt: ['Integrações', 'QR Code'], en: ['Integrations', 'QR code'] },
    url: 'https://seuvalet.com',
  },
  {
    id: 'fuzzdeck',
    name: 'Fuzz Deck',
    category: { pt: 'AUTOMAÇÃO PESSOAL', en: 'PERSONAL AUTOMATION' },
    description: {
      pt: 'Projeto pessoal para controlar aplicativos, áudio e atalhos do computador.',
      en: 'A personal project for controlling apps, audio and computer shortcuts.',
    },
    purpose: {
      pt: 'Reunir ações do computador que hoje ficam espalhadas por diferentes interfaces.',
      en: 'Bring computer controls that are spread across different interfaces into one place.',
    },
    solution: {
      pt: 'O projeto explora uma interface de toque para reunir ações rápidas e conectar dispositivos.',
      en: 'The project explores a touchscreen interface for quick actions and communication between devices.',
    },
    status: { pt: 'Projeto pessoal', en: 'Personal project' },
    note: {
      pt: 'Os itens a seguir fazem parte do escopo do projeto. A disponibilidade de cada função está em confirmação.',
      en: 'The items below describe the project scope. Availability is still being confirmed feature by feature.',
    },
    features: {
      pt: [
        'Controle de aplicativos e macros.',
        'Controle de áudio e integração com Voicemeeter.',
        'Assistente de IA, interface de toque e comunicação entre dispositivos.',
      ],
      en: [
        'App controls and macros.',
        'Audio controls and Voicemeeter integration.',
        'AI assistant, touchscreen interface and communication between devices.',
      ],
    },
    tags: { pt: ['Automação', 'Interfaces de controle'], en: ['Automation', 'Control interfaces'] },
  },
  {
    id: 'minewardrobe',
    name: 'MineWardrobe',
    category: { pt: 'FERRAMENTA CRIATIVA', en: 'CREATIVE TOOL' },
    description: {
      pt: 'Editor de skins de Minecraft com visualização 3D e roupas modulares.',
      en: 'A Minecraft skin editor with 3D previews and modular clothing.',
    },
    purpose: {
      pt: 'Facilitar a edição e a combinação de peças em skins de Minecraft.',
      en: 'Make it easier to edit Minecraft skins and combine different pieces.',
    },
    solution: {
      pt: 'Quem cria uma skin pode trabalhar pixel a pixel, combinar roupas e conferir o resultado em 3D.',
      en: 'Creators can work pixel by pixel, layer clothing and check how the result looks in 3D.',
    },
    status: { pt: 'Sem lançamento público anunciado', en: 'No public release announced' },
    features: {
      pt: [
        'Editor de pixels e visualizador 3D.',
        'Roupas modulares e máscaras de oclusão.',
        'Exportação de skins e componentes.',
      ],
      en: [
        'Pixel editor and 3D viewer.',
        'Modular clothing and occlusion masks.',
        'Skin and component exports.',
      ],
    },
    tags: { pt: ['3D', 'Edição de pixels'], en: ['3D', 'Pixel editing'] },
  },
  {
    id: 'neonatal',
    name: 'TG Neonatal',
    category: { pt: 'PESQUISA APLICADA', en: 'APPLIED RESEARCH' },
    description: {
      pt: 'Pesquisa acadêmica sobre baixo peso ao nascer e macrossomia com dados do SINASC.',
      en: 'Academic research on low birth weight and macrosomia using Brazilian SINASC data.',
    },
    purpose: {
      pt: 'Investigar a predição de baixo peso ao nascer e macrossomia com aprendizado de máquina.',
      en: 'Investigate machine learning approaches to predicting low birth weight and macrosomia.',
    },
    solution: {
      pt: 'O trabalho reúne processamento de dados do SINASC, modelagem com Random Forest e uma aplicação web de apoio à pesquisa.',
      en: 'The work combines SINASC data processing, Random Forest modeling and a web app that supports the research.',
    },
    status: { pt: 'Pesquisa acadêmica', en: 'Academic research' },
    note: {
      pt: 'Uso restrito à pesquisa acadêmica. Sem validação para uso clínico ou para orientar decisões de saúde.',
      en: 'For academic research only. It has not been validated for clinical use or healthcare decisions.',
    },
    features: {
      pt: [
        'Processamento de dados do Sistema de Informações sobre Nascidos Vivos (SINASC).',
        'Modelo Random Forest e aplicação web de apoio à pesquisa.',
      ],
      en: [
        'Data processing from Brazil’s Live Birth Information System (SINASC).',
        'A Random Forest model and a web app to support the research.',
      ],
    },
    tags: {
      pt: ['Aprendizado de máquina', 'Random Forest'],
      en: ['Machine learning', 'Random Forest'],
    },
  },
];

export const profile = {
  name: 'Thiago Felipe Ferreira Rosa',
  email: 'contato@fuzzs.dev',
  github: 'https://github.com/ThiagoFFRosa',
  education: {
    pt: 'Engenharia de Computação · fase final',
    en: 'Computer Engineering · final stage',
  },
};

export function projectAnchor(id: string) {
  return `projeto-${id}`;
}

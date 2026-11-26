import type { HtmlTagDescriptor, Plugin } from 'vite';
import { profile, projectAnchor, projects } from '../src/data/projects';
import { site } from '../src/data/site';
import { translations } from '../src/i18n/translations';

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const t = translations.pt;
const description = site.description.pt;
const image = new URL(site.shareImage, site.url).href;
const projectEntries = projects.map((project) => ({
  '@type': 'CreativeWork',
  '@id': `${site.url}#${projectAnchor(project.id)}`,
  name: project.name,
  description: project.description.pt,
  inLanguage: 'pt-BR',
  ...(project.url ? { url: project.url } : {}),
  ...(project.screenshots?.[0]
    ? { image: new URL(project.screenshots[0].src, site.url).href }
    : {}),
  creator: { '@id': `${site.url}#thiago-rosa` },
}));

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person',
      '@id': `${site.url}#thiago-rosa`,
      name: profile.name,
      url: site.url,
      sameAs: [profile.github],
    },
    {
      '@type': 'WebSite',
      '@id': `${site.url}#website`,
      name: 'FUZZS',
      url: site.url,
      inLanguage: ['pt-BR', 'en-US'],
      creator: { '@id': `${site.url}#thiago-rosa` },
    },
    ...projectEntries,
  ],
};

function summary() {
  const items = projects
    .map(
      (project) => `
    <article id="${projectAnchor(project.id)}">
      <h3>${escapeHtml(project.name)}</h3>
      <p>${escapeHtml(project.description.pt)}</p>
      <p class="project-status">${escapeHtml(project.status.pt)}</p>
      <details><summary>Sobre ${escapeHtml(project.name)}</summary>
        <p>${escapeHtml(project.solution.pt)}</p>
        ${project.note ? `<p>${escapeHtml(project.note.pt)}</p>` : ''}
        <ul>${project.features.pt.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>
        ${
          project.screenshots
            ?.map(
              (photo) => `<img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt.pt)}"
          width="${photo.width}" height="${photo.height}" loading="lazy"
          ${photo.srcSet ? `srcset="${escapeHtml(photo.srcSet)}" sizes="(max-width: 800px) 88vw, 720px"` : ''}>`,
            )
            .join('') ?? ''
        }
      </details>
      ${project.url ? `<p><a href="${escapeHtml(project.url)}">Visitar ${escapeHtml(project.name)}</a></p>` : ''}
    </article>`,
    )
    .join('');
  return `<div class="release-summary">
    <header><nav aria-label="Navegação principal"><a href="#home">FUZZS</a>
      <a href="#projects">Projetos</a> <a href="#about">Sobre</a> <a href="#contact">Contato</a>
    </nav></header>
    <main id="main">
      <section id="home"><h1>${escapeHtml(t.factoryTitle)}</h1><p>${escapeHtml(t.factorySubtitle)}</p></section>
      <section id="projects"><h2>${escapeHtml(t.projects)}</h2>${items}</section>
      <section id="about"><h2>${escapeHtml(profile.name)}</h2><p>${escapeHtml(t.aboutBody)}</p>
        <p>${escapeHtml(profile.education.pt)}</p></section>
      <section id="contact"><h2>Contato</h2><p><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a>
        · <a href="${escapeHtml(profile.github)}">GitHub</a></p></section>
    </main>
  </div>`;
}

const meta = (key: 'name' | 'property', value: string, content: string): HtmlTagDescriptor => ({
  tag: 'meta',
  attrs: { [key]: value, content },
  injectTo: 'head',
});

export function releaseHtml(): Plugin {
  return {
    name: 'fuzzs-release-html',
    transformIndexHtml(html) {
      return {
        html: html.replace('<div id="root"></div>', () => `<div id="root">${summary()}</div>`),
        tags: [
          { tag: 'title', children: escapeHtml(site.title), injectTo: 'head' },
          meta('name', 'description', description),
          { tag: 'link', attrs: { rel: 'canonical', href: site.url }, injectTo: 'head' },
          ...Object.entries({
            'og:site_name': 'FUZZS',
            'og:type': 'website',
            'og:url': site.url,
            'og:locale': 'pt_BR',
            'og:locale:alternate': 'en_US',
            'og:title': site.title,
            'og:description': description,
            'og:image': image,
            'og:image:type': 'image/png',
            'og:image:width': '1200',
            'og:image:height': '630',
            'og:image:alt': site.shareAlt,
          }).map(([key, value]) => meta('property', key, value)),
          ...Object.entries({
            'twitter:card': 'summary_large_image',
            'twitter:title': site.title,
            'twitter:description': description,
            'twitter:image': image,
            'twitter:image:alt': site.shareAlt,
          }).map(([key, value]) => meta('name', key, value)),
          {
            tag: 'script',
            attrs: { type: 'application/ld+json' },
            children: JSON.stringify(schema).replaceAll('<', '\\u003c'),
            injectTo: 'head',
          },
        ],
      };
    },
  };
}

import { readFile } from 'node:fs/promises';

// The publishing domain and verified company details come from the existing site.
const origin = `https://${(await readFile('CNAME', 'utf8')).trim()}`;
const home = await readFile('index.html', 'utf8');
const contact = await readFile('contact.html', 'utf8');
const previous = JSON.parse(home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] || '{}');
const organization = previous['@graph']?.find(item => item['@type'] === 'Organization') || previous;
const email = contact.match(/href="mailto:([^"]+)"/)?.[1];
const telephone = contact.match(/href="tel:([^"]+)"/)?.[1];
const companyId = `${origin}/#organization`;
const websiteId = `${origin}/#website`;
const image = `${origin}/images/social-card.png`;
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const plain = value => value.replace(/<[^>]*>/g, '').replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").trim();

export function enrichMetadata(html, file) {
  const url = `${origin}/${file === 'index.html' ? '' : file}`;
  const title = plain(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] || organization.name);
  const description = plain(html.match(/<meta name="description" content="([^"]*)"/)?.[1] || 'SBM ConTech Industries: digital systems, AI automation and connected infrastructure in South Africa.');
  const excluded = ['404.html', 'thank-you.html', 'atelier.html', 'construction.html'].includes(file);
  const meta = (name, value, property = false) => {
    const tag = `<meta ${property ? 'property' : 'name'}="${name}" content="${escape(value)}">`;
    const pattern = new RegExp(`<meta\\b(?=[^>]*(?:name|property)="${name.replaceAll(':', '\\:')}")[^>]*>`, 'g');
    html = pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `${tag}</head>`);
  };
  html = html.replace('<html lang="en">', '<html lang="en-ZA">');
  if (html.includes('rel="canonical"')) html = html.replace(/<link rel="canonical" href="[^"]+">/, `<link rel="canonical" href="${url}">`);
  if (excluded) meta('robots', 'noindex,follow');
  meta('description', description);
  for (const [name, value] of Object.entries({title, description, type:'website', url, image, 'site_name':organization.name, locale:'en_ZA', 'image:width':'1200', 'image:height':'630', 'image:alt':'SBM ConTech Industries — Digital systems, AI automation and connected infrastructure'})) meta(`og:${name}`, value, true);
  for (const [name, value] of Object.entries({card:'summary_large_image', title, description, image, 'image:alt':'SBM ConTech Industries'})) meta(`twitter:${name}`, value);
  if (!html.includes('rel="icon"')) html = html.replace('</head>', '<link rel="icon" type="image/png" sizes="32x32" href="images/favicon-32.png"></head>');
  if (file === '404.html') html = html.replace(/\b(href|src)="(?![a-z]+:|\/|#)([^"]+)"/g, '$1="/$2"');
  if (excluded) return html;

  const graph = [
    {'@type':'Organization', '@id':companyId, name:organization.name, url:`${origin}/`, logo:`${origin}/images/logo-256.webp`, description:'South African technology company focused on digital systems, AI automation and connected infrastructure.', email, telephone, areaServed:{'@type':'Country', name:'South Africa'}, sameAs:organization.sameAs, contactPoint:{'@type':'ContactPoint', contactType:'Project enquiries', email, telephone, availableLanguage:'English'}},
    {'@type':'WebSite', '@id':websiteId, url:`${origin}/`, name:organization.name, publisher:{'@id':companyId}, inLanguage:'en-ZA'},
    {'@type':'WebPage', '@id':`${url}#webpage`, url, name:title, description, isPartOf:{'@id':websiteId}, about:{'@id':companyId}, inLanguage:'en-ZA'}
  ];
  if (file !== 'index.html') {
    const breadcrumbId = `${url}#breadcrumb`;
    graph[2].breadcrumb = {'@id':breadcrumbId};
    graph.push({'@type':'BreadcrumbList', '@id':breadcrumbId, itemListElement:[
      {'@type':'ListItem', position:1, name:'Home', item:`${origin}/`},
      {'@type':'ListItem', position:2, name:title.split('|')[0].trim(), item:url}
    ]});
  }
  if (file === 'services.html') {
    const services = [
      ['digital', 'Digital systems', 'Custom web applications, mobile-ready portals, dashboards, API integrations, cloud architecture and database design.'],
      ['automation', 'AI and automation', 'AI assistants, knowledge experiences, workflow orchestration, lead qualification, CRM connectivity and messaging integrations.'],
      ['infrastructure', 'Connected infrastructure', 'Smart property control, access workflows, connected security concepts, sensor integration and energy visibility.']
    ];
    graph[2].hasPart = services.map(([id]) => ({'@id':`${url}#${id}`}));
    services.forEach(([id, name, description]) => graph.push({'@type':'Service', '@id':`${url}#${id}`, name, description, url:`${url}#${id}`, provider:{'@id':companyId}, areaServed:{'@type':'Country', name:'South Africa'}}));
    const questions = [...html.matchAll(/<details class="faq-item">\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/g)].map(([, question, answer]) => ({'@type':'Question', name:plain(question), acceptedAnswer:{'@type':'Answer', text:plain(answer)}}));
    if (questions.length) graph.push({'@type':'FAQPage', '@id':`${url}#questions`, mainEntity:questions, isPartOf:{'@id':`${url}#webpage`}});
  }
  const schema = `<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org', '@graph':graph}).replaceAll('<', '\\u003c')}</script>`;
  const existing = /<script type="application\/ld\+json">[\s\S]*?<\/script>/;
  return existing.test(html) ? html.replace(existing, schema) : html.replace('</head>', `${schema}</head>`);
}

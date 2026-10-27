import MarkdownIt from 'markdown-it';

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
const encPath = value => value.split('/').map(encodeURIComponent).join('/');
const slug = value => value.toLowerCase().replace(/[^\p{L}\p{N}_ -]/gu,'').trim().replace(/ /g,'-');
const date = value => new Intl.DateTimeFormat('ru', { dateStyle:'long', timeZone:'Europe/Lisbon' }).format(new Date(value));

export function installPrompt(skill) {
  const source = skill.dir === '.' ? skill.repoUrl : `${skill.repoUrl}/tree/${encodeURIComponent(skill.branch)}/${encPath(skill.dir)}`;
  return `Используй $skill-installer и установи скилл ${skill.name} из ${source}. Установи его под именем ${skill.name} для использования в моих чатах Codex.`;
}

export function markdownHtml(text, skill, sourceFile = 'README.md', prefix = 'readme') {
  const md = new MarkdownIt({ html:false, linkify:false, typographer:false });
  const safe = md.validateLink.bind(md);
  md.validateLink = value => safe(value) && !/^(?:data|file|vbscript|javascript):/i.test(value.trim());
  const githubBase = `${skill.repoUrl}/blob/${skill.commit}/${skill.dir === '.' ? '' : `${encPath(skill.dir)}/`}${sourceFile}`;
  const resolve = value => {
    if (value.startsWith('#')) return `#${prefix}-${value.slice(1)}`;
    try {
      const url = new URL(value, githubBase);
      return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? url.href : '#';
    } catch { return '#'; }
  };
  md.renderer.rules.link_open = (tokens,index,options,env,self) => {
    tokens[index].attrSet('href',resolve(tokens[index].attrGet('href') || '#'));
    tokens[index].attrSet('rel','noopener noreferrer');
    return self.renderToken(tokens,index,options);
  };
  // Source images remain explicit links, so source Markdown cannot trigger tracking requests.
  md.renderer.rules.image = (tokens,index) => `<a href="${escapeHtml(resolve(tokens[index].attrGet('src') || '#'))}" rel="noopener noreferrer">${escapeHtml(tokens[index].content || 'Изображение в исходнике')}</a>`;
  const used = new Map();
  md.renderer.rules.heading_open = (tokens,index,options,env,self) => {
    const base = slug(tokens[index+1]?.content || 'section');
    const count = used.get(base) || 0; used.set(base,count+1);
    tokens[index].attrSet('id', `${prefix}-${base}${count ? `-${count}` : ''}`);
    tokens[index].tag = `h${Math.min(Number(tokens[index].tag.slice(1))+1,6)}`;
    return self.renderToken(tokens,index,options);
  };
  md.renderer.rules.heading_close = (tokens,index,options,env,self) => {
    tokens[index].tag = `h${Math.min(Number(tokens[index].tag.slice(1))+1,6)}`;
    return self.renderToken(tokens,index,options);
  };
  return md.render(text);
}

const arrow = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
const external = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>';

function shell({title,description,pathname,body,snapshot,config}) {
  const checked = date(snapshot.checkedAt);
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)} · skills.itops.dev</title><meta name="description" content="${escapeHtml(description)}"><meta name="color-scheme" content="dark"><link rel="canonical" href="${config.siteUrl}${pathname}"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/style.css"><script src="/assets/app.js" defer></script></head><body>
  <a class="skip-link" href="#main">К содержимому</a>
  <header class="site-header"><a class="wordmark" href="/" aria-label="Skills itops.dev — главная"><span class="prompt-mark" aria-hidden="true">&gt;</span> skills<span class="domain">.itops.dev</span><span class="cursor" aria-hidden="true"></span></a><nav aria-label="Главная навигация"><a href="/#catalog">Каталог</a><a href="/#start">Как использовать</a><a href="https://github.com/${config.owner}" rel="noopener noreferrer">GitHub ${external}</a></nav></header>
  <main id="main">${body}</main>
  <footer class="site-footer"><div><a href="https://itops.dev">itops.dev</a><span> / </span><span>публичные навыки для ИИ</span></div><div class="sync-status" data-checked="${escapeHtml(snapshot.checkedAt)}">${snapshot.warnings.length ? 'Часть источников ожидает обновления' : 'Сверено с GitHub'} · <time datetime="${escapeHtml(snapshot.checkedAt)}">${checked}</time></div></footer>
  <div id="copy-status" class="copy-status" role="status" aria-live="polite" aria-atomic="true"></div>
  </body></html>`;
}

export function renderIndex(snapshot,config) {
  const rows = snapshot.skills.map(skill => `<article class="skill-row" data-skill data-search="${escapeHtml(`${skill.title} ${skill.name} ${skill.description}`.toLocaleLowerCase('ru'))}"><div class="skill-info"><h3><a href="/skill/${skill.id}/">${escapeHtml(skill.title)}</a></h3><p>${escapeHtml(skill.summary || skill.description)}</p><div class="skill-meta"><span class="skill-name">${escapeHtml(skill.name)}</span><span class="skill-type">${skill.fork ? 'Публичный форк · ' : ''}SKILL.md</span></div></div><a class="row-open" href="/skill/${skill.id}/" aria-label="Открыть: ${escapeHtml(skill.title)}">Открыть ${arrow}</a></article>`).join('');
  return shell({title:'Навыки для ИИ',description:'Публичные навыки: найдите полезную инструкцию для ИИ, скопируйте её в чат или установите в Codex.',pathname:'/',snapshot,config,body:`
  <section class="hero"><h1>Навыки для ИИ.<br><span>Готовы к делу.</span></h1><div class="hero-copy"><p>Хороший разговор <br>начинается с хорошей инструкции.</p><p class="intro-note">Здесь собраны мои публичные скиллы — готовые сценарии, которые помогают ИИ провести вас через конкретную задачу.</p><a class="text-link" href="#catalog">Выбрать навык ${arrow}</a></div></section>
  <section id="catalog" class="catalog" aria-labelledby="catalog-title"><div class="section-heading"><h2 id="catalog-title">Каталог<span class="count" aria-label="Количество навыков">${snapshot.skills.length}</span></h2><div class="search-wrap"><label for="skill-search">Найти навык</label><input id="skill-search" type="search" placeholder="Название или задача" autocomplete="off"></div></div><p class="search-count" id="search-count" aria-live="polite"></p><div class="skill-list">${rows || '<p class="empty-initial">Пока нет опубликованных скиллов. Они появятся здесь после публикации на GitHub.</p>'}</div><div id="search-empty" class="empty-state" hidden><h3>Ничего не нашлось</h3><p>Попробуйте другое слово или посмотрите весь каталог.</p><button type="button" id="reset-search" class="button secondary">Показать всё</button></div></section>
  <section id="start" class="start-section" aria-labelledby="start-title"><h2 id="start-title">От навыка <br>к первому ответу.</h2><div class="start-content"><p>Скилл — это текст с инструкциями для помощника. Вы выбираете подходящий сценарий, а он задаёт вопросы и помогает получить результат.</p><ol class="steps"><li><strong>Выберите навык</strong><span>Откройте описание и посмотрите, для какой задачи он подходит.</span></li><li><strong>Возьмите инструкцию</strong><span>Скопируйте запрос для установки в Codex или полный текст для обычного чата.</span></li><li><strong>Начните разговор</strong><span>Опишите свою задачу. Помощник применит инструкцию и уточнит, что ему нужно.</span></li></ol><p class="source-note">Оригиналы хранятся <a href="https://github.com/${config.owner}">на GitHub</a>. Этот сайт автоматически подхватывает новые публичные навыки и их обновления.</p></div></section>`});
}

export function renderSkill(skill,snapshot,config) {
  const readmeName = Object.keys(skill.files).find(name => /^readme\.md$/i.test(name));
  const readme = readmeName ? Buffer.from(skill.files[readmeName],'base64').toString('utf8') : '';
  const plain = Buffer.from(skill.files['SKILL.md'],'base64').toString('utf8');
  const copyPrompt = plain;
  return shell({title:skill.title,description:skill.summary || skill.description,pathname:`/skill/${skill.id}/`,snapshot,config,body:`
  <nav class="breadcrumb" aria-label="Путь"><a href="/#catalog">Каталог</a><span aria-hidden="true">/</span><span>${escapeHtml(skill.name)}</span></nav>
  <section class="skill-hero"><h1>${escapeHtml(skill.title)}</h1><p>${escapeHtml(skill.summary || skill.description)}</p><div class="action-row"><a class="button primary" href="#use">Начать пользоваться ${arrow}</a><a class="button secondary" href="/downloads/${skill.id}.zip" download>Скачать скилл <span class="file-ext">.zip</span></a><a class="source-link" href="${skill.repoUrl}">Оригинал на GitHub ${external}</a></div></section>
  <div class="detail-layout"><div class="detail-content"><section id="use" class="use-section"><h2>Как начать</h2>${skill.dir !== '.' ? '<p class="source-note">Этот навык — часть репозитория. Для его работы могут понадобиться другие файлы или инструменты, описанные в оригинале.</p>' : ''}<div class="install-option"><h3>В Codex</h3><p>Скопируйте запрос, отправьте его в чат Codex и дождитесь сообщения об установке.</p><textarea id="install-prompt" class="copy-source" readonly aria-label="Запрос для установки в Codex" rows="4">${escapeHtml(installPrompt(skill))}</textarea><button class="button primary" type="button" data-copy="install-prompt">Скопировать запрос для Codex</button><p class="small-note">Затем напишите: «Используй $${escapeHtml(skill.name)}».</p></div><div class="install-option"><h3>В ChatGPT, Claude или другом чате</h3><p>Скопируйте полную инструкцию в новый чат, добавьте в конце свою задачу и отправьте сообщение. Если навыку нужны файлы, команды или внешние сервисы, помощнику потребуется доступ к ним — подробности есть в оригинале.</p><button class="button secondary" type="button" data-copy="chat-prompt">Скопировать инструкцию для чата</button><details class="plain-disclosure"><summary>Показать текст для ручного копирования</summary><textarea id="chat-prompt" class="copy-source full-source" readonly aria-label="Полная инструкция для чата" rows="14">${escapeHtml(copyPrompt)}</textarea></details></div></section>
  ${readme ? `<section class="readme-section"><h2 class="section-title">Руководство автора</h2><div class="prose">${markdownHtml(readme,skill,readmeName)}</div></section>` : ''}
  <details class="skill-source"><summary>Полная инструкция для ИИ <span>SKILL.md</span></summary><div class="prose">${markdownHtml(skill.body,skill,'SKILL.md','skill')}</div><a class="text-link" href="/files/${skill.id}/SKILL.md" download>Скачать исходный SKILL.md</a></details></div>
  <aside class="source-meta" aria-label="Об источнике"><h2>Из открытого <br>репозитория</h2><dl><dt>${skill.fork ? 'Публичный форк' : 'Репозиторий'}</dt><dd><a href="${skill.repoUrl}">${escapeHtml(skill.owner)}/${escapeHtml(skill.repo)}</a></dd><dt>Обновление источника</dt><dd>${date(skill.updatedAt)}</dd><dt>Версия</dt><dd><a href="${skill.repoUrl}/commit/${skill.commit}">${skill.commit.slice(0,7)}</a></dd><dt>Файлов в архиве</dt><dd>${Object.keys(skill.files).length}</dd></dl><a class="text-link" href="${skill.sourceUrl}">Посмотреть исходник ${external}</a><p>Здесь — копия публичного скилла. Содержимое обновляется из GitHub автоматически.</p></aside></div>`});
}

export function render404(snapshot,config) {
  return shell({title:'Страница не найдена',description:'Такой страницы в каталоге нет.',pathname:'/404.html',snapshot,config,body:'<section class="not-found"><h1>Здесь пока пусто.</h1><p>Возможно, навык переехал или больше не опубликован.</p><a class="button primary" href="/">Вернуться в каталог</a></section>'});
}

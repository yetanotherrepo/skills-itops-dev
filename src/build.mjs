import { mkdir,readFile,writeFile,copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';
import { renderIndex,renderSkill,render404,escapeHtml } from './render.mjs';
import { safePath } from './catalog.mjs';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

export async function build(snapshot,config,destination) {
  const write = async (name,content) => {
    if (!safePath(name)) throw new Error('Unsafe output path');
    const file=path.join(destination,name);
    await mkdir(path.dirname(file),{recursive:true});
    await writeFile(file,content);
  };
  await mkdir(path.join(destination,'assets'),{recursive:true});
  for (const name of ['style.css','app.js']) await copyFile(path.join(projectRoot,'web',name),path.join(destination,'assets',name));
  await copyFile(path.join(projectRoot,'web/favicon.svg'),path.join(destination,'favicon.svg'));
  await write('index.html',renderIndex(snapshot,config));
  await write('404.html',render404(snapshot,config));
  const publicSkills=[];
  for (const skill of snapshot.skills) {
    if (!safePath(skill.id) || skill.id.includes('/') || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill.name)) throw new Error('Unsafe skill identity');
    await write(`skill/${skill.id}/index.html`,renderSkill(skill,snapshot,config));
    const archive=Object.create(null);
    for (const [name,content] of Object.entries(skill.files)) {
      if (!safePath(name)) throw new Error('Unsafe bundle path');
      const bytes=Buffer.from(content,'base64');
      await write(`files/${skill.id}/${name}`,bytes);
      archive[`${skill.name}/${name}`]=bytes;
    }
    await write(`downloads/${skill.id}.zip`,zipSync(archive,{level:6,mtime:new Date('2020-01-01T00:00:00Z')}));
    publicSkills.push({id:skill.id,name:skill.name,title:skill.title,description:skill.description,
      repo:skill.repoUrl,source:skill.sourceUrl,commit:skill.commit,updatedAt:skill.updatedAt,
      page:`${config.siteUrl}/skill/${skill.id}/`,download:`${config.siteUrl}/downloads/${skill.id}.zip`});
  }
  await write('catalog.json',JSON.stringify({checkedAt:snapshot.checkedAt,partial:snapshot.warnings.length>0,skills:publicSkills},null,2));
  await write('robots.txt',`User-agent: *\nAllow: /\nSitemap: ${config.siteUrl}/sitemap.xml\n`);
  const urls=[config.siteUrl+'/',...publicSkills.map(s=>s.page)];
  await write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url=>`<url><loc>${escapeHtml(url)}</loc></url>`).join('')}</urlset>`);
}

if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const snapshot=JSON.parse(await readFile(path.join(projectRoot,'.cache/catalog.json'),'utf8'));
  const config=JSON.parse(await readFile(path.join(projectRoot,'catalog.config.json'),'utf8'));
  const output=path.resolve(process.env.OUTPUT_DIR || path.join(projectRoot,'dist'));
  await build(snapshot,config,output);
  console.log(`Built ${snapshot.skills.length} skills into ${output}`);
}

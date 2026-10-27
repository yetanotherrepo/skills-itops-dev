import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,readFile,writeFile,mkdir,readlink,readdir,rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { unzipSync } from 'fflate';
import { GitHubClient,parseSkill,parseYaml,safePath,skillNodes,bundleNodes,gitBlobSha,eligibleRepositories,readRepository,collect } from '../src/catalog.mjs';
import { markdownHtml,renderSkill } from '../src/render.mjs';
import { build } from '../src/build.mjs';
import { synchronize } from '../src/sync.mjs';

const config=JSON.parse(await readFile(new URL('../catalog.config.json',import.meta.url)));
const raw='---\nname: example\ndescription: A useful example\n---\n# Example\n\nOriginal content.\n';
const commit='a'.repeat(40), treeSha='b'.repeat(40);
const repo=name=>({name,private:false,visibility:'public',fork:false,owner:{login:config.owner},default_branch:'main',pushed_at:'2026-10-27T00:00:00Z'});
const node=(file,text=raw,mode='100644')=>({path:file,type:'blob',mode,size:Buffer.byteLength(text),sha:gitBlobSha(Buffer.from(text))});
const skill={...parseSkill(raw),id:'example',repo:'example',owner:config.owner,dir:'.',path:'SKILL.md',branch:'main',commit,updatedAt:'2026-10-27T00:00:00Z',repoUrl:`https://github.com/${config.owner}/example`,sourceUrl:`https://github.com/${config.owner}/example/blob/${commit}/SKILL.md`,files:{'SKILL.md':Buffer.from(raw).toString('base64')}};
const snapshot={schema:1,checkedAt:'2026-10-27T00:00:00Z',warnings:[],repositories:{},skills:[skill]};
const fake=nodes=>({tree:async()=>({sha:treeSha,tree:nodes}),json:async()=>({sha:commit,commit:{tree:{sha:treeSha},committer:{date:repo('').pushed_at}}}),bytes:async()=>Buffer.from(raw)});
const temp=async t=>{const root=await mkdtemp(path.join(os.tmpdir(),'skills-mirror-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;};

test('metadata and bundle boundaries reject executable YAML, traversal and symlinks',()=>{
  assert.equal(parseSkill(raw).name,'example');
  assert.equal(skillNodes([node('.github/skills/example/SKILL.md')],config).length,1);
  for(const value of ['x: !unsafe value','x: &x [1]\ny: *x','x: 1\nx: 2']) assert.throws(()=>parseYaml(value));
  for(const value of ['../outside','a/../b','/absolute','a\\b','a\0b']) assert.equal(safePath(value),false);
  const nodes=[node('SKILL.md'),node('refs/notes.md'),node('.env'),node('AGENTS.md'),node('link','target','120000'),node('nested/SKILL.md'),node('nested/extra.md')];
  assert.deepEqual(bundleNodes(nodes,'SKILL.md',config).map(n=>n.path),['SKILL.md','refs/notes.md']);
  assert.equal(eligibleRepositories([{...repo('fork'),fork:true}],config).length,1);
  assert.equal(eligibleRepositories([{...repo('private'),private:true}],config).length,0);
});

test('Markdown stays inert and malformed URLs never abort the site',()=>{
  const html=markdownHtml('<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n![track](https://example.org/a.png)\n\n[relative](refs/a.md)',skill);
  assert.ok(!html.includes('<script>') && !html.includes('<img'));
  assert.ok(html.includes(`/blob/${commit}/refs/a.md`));
  for(const url of ['http://[','https://%','//[','http://[::']) assert.doesNotThrow(()=>markdownHtml(`[bad](${url})`,skill));
});

test('public repository pagination and truncated Git trees are completed',async()=>{
  const c=new GitHubClient(); const calls=[];
  c.json=async url=>{calls.push(url);return new URL(url,'https://api.github.com').searchParams.get('page')==='1' ? Array.from({length:100},(_,i)=>repo('r'+i)) : [repo('last')];};
  assert.equal((await c.repositories(config.owner)).length,101);
  assert.equal(calls.length,2);
  c.json=async url=>url.includes('recursive=1') ? {sha:treeSha,truncated:true,tree:[]} : url.endsWith(treeSha) ? {tree:[{path:'skills',type:'tree',sha:'c'.repeat(40)}]} : {tree:[node('SKILL.md')]};
  const result=await c.tree(config.owner,'example','main');
  assert.equal(result.truncated,false);
  assert.equal(result.tree.at(-1).path,'skills/SKILL.md');
});

test('immutable downloads verify Git hash and reject oversize catalogs before download',async()=>{
  const client=fake([node('SKILL.md')]);
  assert.equal((await readRepository(repo('example'),config,client))[0].files['SKILL.md'],skill.files['SKILL.md']);
  client.bytes=async()=>Buffer.from('wrong content');
  await assert.rejects(readRepository(repo('example'),config,client),/Git hash/);
  let downloads=0; const many=fake([node('a/SKILL.md'),node('b/SKILL.md'),node('c/SKILL.md')]);
  many.bytes=async()=>{downloads++;return Buffer.from(raw);};
  await assert.rejects(readRepository(repo('example'),{...config,maxSkills:1},many),/skill limit/);
  await assert.rejects(readRepository(repo('example'),{...config,maxCatalogBytes:1},many),/byte limit/);
  assert.equal(downloads,0);
});

test('reconciliation removes absent/private repos and stops all requests after backoff',async()=>{
  const old={pushedAt:'old',branch:'main',scannedAt:'2026-01-01T00:00:00Z',skills:[skill]};
  const previous={repositories:{example:old,removed:old,private:old,other:{...old,skills:[]}}};
  let calls=0;
  const client={repositories:async()=>[repo('example'),repo('other'),{...repo('private'),private:true}],tree:async()=>{calls++;throw Object.assign(new Error('rate limited'),{status:429,retryAt:Date.now()+60000});}};
  const result=await collect(config,previous,client);
  assert.equal(calls,1);
  assert.deepEqual(Object.keys(result.repositories),['example','other']);
  assert.ok(result.retryAt>Date.now());
  const recovered=await collect(config,previous,{...fake([node('SKILL.md')]),repositories:async()=>[repo('new')]});
  assert.deepEqual(Object.keys(recovered.repositories),['new']);
});

test('generated downloads retain exact source bytes and safe archive paths',async t=>{
  const root=await temp(t);await build(snapshot,config,root);
  const zip=unzipSync(await readFile(path.join(root,'downloads/example.zip')));
  assert.deepEqual(Buffer.from(zip['example/SKILL.md']),Buffer.from(raw));
  assert.deepEqual(await readFile(path.join(root,'files/example/SKILL.md')),Buffer.from(raw));
  const catalog=JSON.parse(await readFile(path.join(root,'catalog.json')));
  assert.equal(catalog.skills[0].commit,commit);
  assert.equal(catalog.skills[0].page,'https://skills.itops.dev/skill/example/');
});

test('failed build preserves current site and removes interrupted staging on next startup',async t=>{
  const root=await temp(t),stateRoot=path.join(root,'state'),outputRoot=path.join(root,'site');
  const client={...fake([node('SKILL.md')]),repositories:async()=>[repo('example')]};
  await synchronize({config,stateRoot,outputRoot,client});
  const previous=await readlink(path.join(outputRoot,'current'));
  await mkdir(path.join(outputRoot,'.staging','crashed'),{recursive:true});
  await writeFile(path.join(outputRoot,'.staging','crashed','partial'),'unfinished');
  let cleaned=false;
  await assert.rejects(synchronize({config,stateRoot,outputRoot,client,buildSite:async(s,c,d)=>{
    assert.deepEqual(await readdir(path.join(outputRoot,'.staging')),[]);cleaned=true;
    await mkdir(d,{recursive:true});await writeFile(path.join(d,'partial'),'bad');throw new Error('simulated failure');
  }}),/simulated failure/);
  assert.equal(cleaned,true);
  assert.equal(await readlink(path.join(outputRoot,'current')),previous);
  assert.deepEqual(await readdir(path.join(outputRoot,'.staging')),[]);
  assert.equal((await readdir(path.join(outputRoot,'releases'))).length,1);
});

test('listing failures persist retry window without replacing the public snapshot',async t=>{
  const root=await temp(t),stateRoot=path.join(root,'state'),outputRoot=path.join(root,'site');let calls=0;
  const client={repositories:async()=>{calls++;throw Object.assign(new Error('rate limited'),{status:403,retryAt:Date.now()+60000});}};
  await assert.rejects(synchronize({config,stateRoot,outputRoot,client}),/rate limited/);
  assert.equal((await synchronize({config,stateRoot,outputRoot,client})).waiting,true);
  assert.equal(calls,1);
});

// Generic handoff must preserve the source instead of adding a letter workflow.
test('chat handoff retains the exact skill text for any skill type',()=>{
  const html=renderSkill(skill,snapshot,config);
  const value=html.match(/id="chat-prompt"[^>]*>([\s\S]*?)<\/textarea>/)[1];
  assert.equal(value,raw);
});

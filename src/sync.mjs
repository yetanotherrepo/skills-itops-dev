import { mkdir,readFile,writeFile,rename,symlink,readdir,rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { collect } from './catalog.mjs';
import { build,projectRoot } from './build.mjs';

async function readJson(file) {
  try { return JSON.parse(await readFile(file,'utf8')); }
  catch(error) { if(error.code==='ENOENT') return {}; throw error; }
}

async function saveJson(file, value) {
  await writeFile(file+'.tmp',JSON.stringify(value));
  await rename(file+'.tmp',file);
}

// Production uses flock: the kernel releases its lock on exit, timeout,
// SIGKILL and reboot. Local invocations must also run sequentially.
export async function synchronize({config,stateRoot,outputRoot,client,buildSite=build}) {
  await mkdir(stateRoot,{recursive:true});
  await mkdir(path.join(outputRoot,'releases'),{recursive:true});
  // A process can die before finally runs. This dedicated staging area is
  // never served; flock makes removing the previous attempt safe on startup.
  const stagingRoot=path.join(outputRoot,'.staging');
  await rm(stagingRoot,{recursive:true,force:true});
  await mkdir(stagingRoot,{recursive:true});
  for (const name of await readdir(outputRoot)) {
    if (/^\.current-\d+$/.test(name)) await rm(path.join(outputRoot,name),{force:true});
  }
  const stateFile=path.join(stateRoot,'catalog.json');
  const backoffFile=path.join(stateRoot,'backoff.json');
  let destination, pending, activated=false;
  try {
    const previous=await readJson(stateFile);
    const backoff=await readJson(backoffFile);
    if (Date.now()<Math.max(previous.retryAt || 0,backoff.retryAt || 0)) return { waiting:true };
    const next=await collect(config,previous,client);
    await saveJson(backoffFile,{retryAt:next.retryAt || 0});
    const release=new Date().toISOString().replace(/[:.]/g,'-')+`-${process.pid}`;
    destination=path.join(stagingRoot,release);
    await buildSite(next,config,destination);
    const completed=path.join(outputRoot,'releases',release);
    await rename(destination,completed);
    destination=completed;
    pending=path.join(outputRoot,`.current-${process.pid}`);
    await symlink(path.join('releases',release),pending);
    await rename(pending,path.join(outputRoot,'current'));
    activated=true;
    await saveJson(stateFile,next);
    const releases=(await readdir(path.join(outputRoot,'releases'))).filter(name=>/^\d{4}-\d{2}-\d{2}T[\dZ-]+$/.test(name)).sort().reverse();
    for (const old of releases.slice(3)) await rm(path.join(outputRoot,'releases',old),{recursive:true});
    return {skills:next.skills.length,repositories:Object.keys(next.repositories).length,checkedAt:next.checkedAt,warnings:next.warnings};
  } catch(error) {
    if(error.retryAt) await saveJson(backoffFile,{retryAt:error.retryAt});
    error.activated=activated;
    throw error;
  } finally {
    if(pending) await rm(pending,{force:true});
    if(destination && !activated) await rm(destination,{recursive:true,force:true});
  }
}

if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const config=JSON.parse(await readFile(path.join(projectRoot,'catalog.config.json'),'utf8'));
  const stateRoot=path.resolve(process.env.STATE_DIR || path.join(projectRoot,'.cache'));
  const outputRoot=path.resolve(process.env.PUBLISH_DIR || path.join(projectRoot,'dist-published'));
  try {
    const result=await synchronize({config,stateRoot,outputRoot});
    console.log(JSON.stringify(result));
    if(result.warnings?.length) process.exitCode=2;
  } catch(error) {
    console.error(`Synchronization failed: ${error.message}. ${error.activated ? 'New site is active; state or cleanup needs checking.' : 'Last published site retained.'}`);
    process.exitCode=1;
  }
}

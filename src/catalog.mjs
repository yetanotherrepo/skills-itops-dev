import { createHash } from 'node:crypto';
import path from 'node:path';
import { parseDocument } from 'yaml';

export const API_VERSION = '2026-03-10';
const SEGMENT = /^[A-Za-z0-9_.-]+$/;

export function safePath(value) {
  return typeof value === 'string' && value.length > 0 && value.length < 1024
    && !/[\\\x00-\x1f\x7f]/.test(value) && !value.startsWith('/')
    && value.split('/').every(part => part && part !== '.' && part !== '..');
}

export function parseYaml(text) {
  if (Buffer.byteLength(text) > 65536) throw new Error('Metadata is too large');
  const doc = parseDocument(text, { schema: 'core', uniqueKeys: true, customTags: [], resolveKnownTags: false });
  if (doc.errors.length || doc.warnings.length) throw new Error('Invalid YAML metadata');
  return doc.toJS({ maxAliasCount: 0 });
}

export function parseSkill(text) {
  const match = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!match) throw new Error('SKILL.md needs YAML frontmatter');
  const metadata = parseYaml(match[1]);
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)
      || typeof metadata.name !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.name)
      || metadata.name.length > 64 || typeof metadata.description !== 'string'
      || !metadata.description.trim() || metadata.description.length > 4096) {
    throw new Error('Skill name or description is invalid');
  }
  const body = text.slice(match[0].length);
  const heading = /^#\s+(.+)$/m.exec(body)?.[1]?.trim();
  return { name: metadata.name, description: metadata.description.trim(), title: (heading || metadata.name).slice(0,160), body };
}

export function isPublishedSkill(config, repository, skillPath) {
  const selection = config.publishedSkills;
  const paths = selection && Object.hasOwn(selection, repository) ? selection[repository] : [];
  return Array.isArray(paths) && (skillPath === undefined ? paths.length > 0 : paths.includes(skillPath));
}

export function eligibleRepositories(repos, config) {
  return repos.filter(repo => repo.private === false && repo.visibility !== 'private'
    && repo.owner?.login?.toLowerCase() === config.owner.toLowerCase()
    && (config.includeForks || repo.fork === false)
    && isPublishedSkill(config, repo.name)
    && SEGMENT.test(repo.name) && typeof repo.default_branch === 'string');
}

export function ignored(file, config) {
  return file.split('/').some(part => config.ignoredDirectories.includes(part)
    || part === '.env' || part.startsWith('.env.'));
}

export function skillNodes(tree, config) {
  return tree.filter(node => node.type === 'blob' && ['100644', '100755'].includes(node.mode)
    && safePath(node.path) && !ignored(node.path, config)
    && path.posix.basename(node.path) === 'SKILL.md');
}

export function bundleNodes(tree, skillPath, config) {
  const dir = path.posix.dirname(skillPath);
  const prefix = dir === '.' ? '' : `${dir}/`;
  const nested = skillNodes(tree, config).map(n => path.posix.dirname(n.path))
    .filter(n => n !== dir && n.startsWith(prefix) && n !== '.');
  const auxiliary = /^(?:AGENTS\.md|CLAUDE\.md|PROGRESS\.MD|architecture\.md|DESIGN\.md|PRODUCT\.md)$/i;
  const nodes = tree.filter(node => node.type === 'blob' && ['100644', '100755'].includes(node.mode)
    && safePath(node.path) && node.path.startsWith(prefix) && !ignored(node.path, config)
    && !node.path.slice(prefix.length).split('/').some(part => part.startsWith('.'))
    && !auxiliary.test(node.path.slice(prefix.length))
    && !nested.some(n => node.path.startsWith(`${n}/`)));
  if (nodes.length > config.maxBundleFiles || nodes.some(n => !Number.isSafeInteger(n.size) || n.size > config.maxFileBytes)
    || nodes.reduce((total, n) => total + n.size, 0) > config.maxBundleBytes) {
    throw new Error(`Skill bundle exceeds the configured limits: ${skillPath}`);
  }
  return nodes.map(n => ({ ...n, relativePath: n.path.slice(prefix.length) }));
}

export function gitBlobSha(bytes) {
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

export class GitHubClient {
  constructor(fetchImpl = fetch) { this.fetch = fetchImpl; this.requests = 0; }

  async bytes(url, maxBytes, api = false) {
    const parsed = new URL(url);
    if (!['api.github.com', 'raw.githubusercontent.com'].includes(parsed.hostname) || parsed.protocol !== 'https:') {
      throw new Error('Source origin is not allowed');
    }
    if (api && ++this.requests > 45) {
      const error = new Error('Per-run API budget reached; retry on next synchronization');
      error.retryAt = Date.now() + 300000;
      throw error;
    }
    const headers = { 'User-Agent': 'skills.itops.dev-public-mirror' };
    if (api) Object.assign(headers, { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': API_VERSION });
    // Deliberately no Authorization header: private repositories cannot enter this pipeline.
    const response = await this.fetch(url, { headers, redirect: 'error', signal: AbortSignal.timeout(25000) });
    if (!response.ok) {
      const error = new Error(`GitHub returned HTTP ${response.status}`);
      error.status = response.status;
      if ([403, 429].includes(response.status)) {
        const reset = Number(response.headers.get('x-ratelimit-reset')) * 1000;
        const retry = Number(response.headers.get('retry-after')) * 1000 + Date.now();
        error.retryAt = Math.max(reset || 0, retry || 0, Date.now() + 60000);
      }
      throw error;
    }
    if (Number(response.headers.get('content-length')) > maxBytes) throw new Error('Source response is too large');
    const chunks = []; let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > maxBytes) throw new Error('Source response is too large');
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async json(endpoint) {
    return JSON.parse((await this.bytes(`https://api.github.com${endpoint}`, 8 * 1024 * 1024, true)).toString('utf8'));
  }

  async repositories(owner) {
    if (!/^[A-Za-z0-9-]+$/.test(owner)) throw new Error('Invalid GitHub owner');
    const repos = [];
    for (let page = 1; page <= 100; page++) {
      const rows = await this.json(`/users/${owner}/repos?type=owner&per_page=100&page=${page}`);
      if (!Array.isArray(rows)) throw new Error('Invalid repository listing');
      repos.push(...rows);
      if (rows.length < 100) return repos;
    }
    throw new Error('Repository pagination limit reached; no partial listing published');
  }

  async tree(owner, repo, ref) {
    const base = `/repos/${owner}/${repo}/git/trees/`;
    const result = await this.json(`${base}${encodeURIComponent(ref)}?recursive=1`);
    if (!Array.isArray(result.tree)) throw new Error('Invalid Git tree');
    if (!result.truncated) return result;
    const full = []; const queue = [{ sha: result.sha, prefix: '' }];
    while (queue.length) {
      const item = queue.shift();
      const part = await this.json(`${base}${item.sha}`);
      if (part.truncated || !Array.isArray(part.tree)) throw new Error('Incomplete Git subtree');
      for (const node of part.tree) {
        if (!safePath(node.path)) throw new Error('Unsafe Git tree path');
        const pathname = item.prefix + node.path;
        full.push({ ...node, path: pathname });
        if (node.type === 'tree') queue.push({ sha: node.sha, prefix: `${pathname}/` });
      }
      if (full.length > 100000) throw new Error('Git tree is too large');
    }
    return { ...result, truncated: false, tree: full };
  }
}

export async function readRepository(repo, config, client, budget = { skills: 0, bytes: 0 }) {
  const owner = config.owner;
  const selectedNodes = tree => skillNodes(tree, config).filter(node => isPublishedSkill(config, repo.name, node.path));
  let tree = await client.tree(owner, repo.name, repo.default_branch);
  if (!selectedNodes(tree.tree).length) return [];
  const commit = await client.json(`/repos/${owner}/${repo.name}/commits/${encodeURIComponent(repo.default_branch)}`);
  if (!/^[a-f0-9]{40}$/.test(commit.sha) || !/^[a-f0-9]{40}$/.test(commit.commit?.tree?.sha)) throw new Error('Invalid commit response');
  if (commit.commit.tree.sha !== tree.sha) tree = await client.tree(owner, repo.name, commit.commit.tree.sha);
  const nodes = selectedNodes(tree.tree);
  if (budget.skills + nodes.length > config.maxSkills) throw new Error('Catalog exceeds the configured skill limit');
  const bundles = nodes.map(node => ({ node, entries: bundleNodes(tree.tree, node.path, config) }));
  const bytesRequired = bundles.reduce((total, bundle) => total + bundle.entries.reduce((sum, entry) => sum + entry.size, 0), 0);
  if (budget.bytes + bytesRequired > config.maxCatalogBytes) throw new Error('Catalog exceeds the configured byte limit');
  budget.skills += nodes.length;
  budget.bytes += bytesRequired;
  const downloaded = new Map();
  const result = [];
  for (const { node, entries } of bundles) {
    const files = Object.create(null);
    for (const entry of entries) {
      if (!downloaded.has(entry.sha)) {
        const raw = `https://raw.githubusercontent.com/${owner}/${repo.name}/${commit.sha}/${entry.path.split('/').map(encodeURIComponent).join('/')}`;
        const bytes = await client.bytes(raw, config.maxFileBytes);
        if (gitBlobSha(bytes) !== entry.sha) throw new Error('Downloaded blob does not match its Git hash');
        downloaded.set(entry.sha, bytes.toString('base64'));
      }
      files[entry.relativePath] = downloaded.get(entry.sha);
    }
    if (!files['SKILL.md']) throw new Error('Skill source missing from bundle');
    const text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(files['SKILL.md'], 'base64'));
    const parsed = parseSkill(text);
    if (files['agents/openai.yaml']) {
      const ui = parseYaml(Buffer.from(files['agents/openai.yaml'], 'base64').toString('utf8'));
      if (typeof ui?.interface?.display_name === 'string') parsed.title = ui.interface.display_name.slice(0,160);
      if (typeof ui?.interface?.short_description === 'string') parsed.summary = ui.interface.short_description.slice(0,300);
    }
    const dir = path.posix.dirname(node.path);
    const id = dir === '.' ? repo.name.toLowerCase()
      : `${repo.name.toLowerCase()}--${parsed.name}--${createHash('sha256').update(node.path).digest('hex').slice(0,6)}`;
    result.push({ ...parsed, id, repo: repo.name, owner, dir, path: node.path,
      branch: repo.default_branch, commit: commit.sha,
      updatedAt: commit.commit.committer?.date || repo.pushed_at,
      sourceUrl: `https://github.com/${owner}/${repo.name}/blob/${commit.sha}/${node.path.split('/').map(encodeURIComponent).join('/')}`,
      repoUrl: `https://github.com/${owner}/${repo.name}`, files });
  }
  return result;
}

export async function collect(config, previous = {}, client = new GitHubClient(), now = Date.now()) {
  const repos = eligibleRepositories(await client.repositories(config.owner), config);
  const scanConfig = createHash('sha256').update(JSON.stringify(config)).digest('hex');
  const next = { schema: 2, scanConfig, checkedAt: new Date(now).toISOString(), repositories: {}, warnings: [] };
  const budget = { skills: 0, bytes: 0 };
  const reuse = (repo, old) => {
    if (!old) return;
    old = { ...old, skills: old.skills.filter(skill => isPublishedSkill(config, repo.name, skill.path)) };
    const bytes = old.skills.reduce((sum, skill) => sum + Object.values(skill.files).reduce((n, value) => n + Buffer.byteLength(value, 'base64'), 0), 0);
    if (budget.skills + old.skills.length > config.maxSkills || budget.bytes + bytes > config.maxCatalogBytes) {
      next.warnings.push({ repo: repo.name, message: 'Cached source exceeds catalog limits' });
      return;
    }
    budget.skills += old.skills.length;
    budget.bytes += bytes;
    next.repositories[repo.name] = old;
  };
  for (const repo of repos) {
    const old = previous.repositories?.[repo.name];
    if (next.retryAt) {
      reuse(repo, old);
      next.warnings.push({ repo: repo.name, message: 'Waiting for the GitHub retry window' });
      continue;
    }
    if (previous.scanConfig === scanConfig && old && old.pushedAt === repo.pushed_at && old.branch === repo.default_branch
      && now - Date.parse(old.scannedAt) < 24 * 3600 * 1000) {
      reuse(repo, old);
      continue;
    }
    const before = { ...budget };
    try {
      next.repositories[repo.name] = { pushedAt: repo.pushed_at, branch: repo.default_branch,
        scannedAt: new Date(now).toISOString(), skills: await readRepository(repo, config, client, budget) };
    } catch (error) {
      Object.assign(budget, before);
      if (error.status === 409 && repo.size === 0) {
        next.repositories[repo.name] = { pushedAt: repo.pushed_at, branch: repo.default_branch, scannedAt: new Date(now).toISOString(), skills: [] };
        continue;
      }
      // A repository must still be in the current anonymous public listing to reuse its content.
      if (old && ![404, 451].includes(error.status)) reuse(repo, old);
      next.warnings.push({ repo: repo.name, message: error.message });
      if (error.retryAt) next.retryAt = Math.max(next.retryAt || 0, error.retryAt);
    }
  }
  next.skills = repos.flatMap(repo => (next.repositories[repo.name]?.skills || []).map(skill => ({ ...skill, fork: repo.fork })))
    .sort((a,b) => Number(a.fork) - Number(b.fork) || a.id.localeCompare(b.id));
  if (next.skills.length > config.maxSkills) throw new Error('Catalog exceeds the configured skill limit');
  return next;
}

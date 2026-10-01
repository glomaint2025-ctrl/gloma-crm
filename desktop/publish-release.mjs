// Publishes the installer already built by `npm run dist` as a GitHub Release so that
// installed desktop apps can update themselves. Usage (from the desktop folder):
//   npm run publish-release
// It uses the GitHub login that git already has saved (the one used for `git push`),
// so no token needs to be typed or stored anywhere.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OWNER = 'glomaint2025-ctrl';
const REPO = 'gloma-crm';
const here = path.dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(fs.readFileSync(path.join(here, 'package.json'), 'utf8'));
const tag = `v${version}`;
const outDir = path.join(here, 'dist-installer');

// electron-updater looks for the exact hyphenated names that latest.yml lists, while
// the build writes the installer with spaces. GitHub would turn spaces into dots.
const assets = [
  { file: `Gloma CRM Setup ${version}.exe`, name: `Gloma-CRM-Setup-${version}.exe` },
  { file: `Gloma CRM Setup ${version}.exe.blockmap`, name: `Gloma-CRM-Setup-${version}.exe.blockmap` },
  { file: 'latest.yml', name: 'latest.yml' }
];

for (const { file } of assets) {
  if (!fs.existsSync(path.join(outDir, file))) {
    console.error(`Missing ${file}. Run "npm run dist" first (and check the version in package.json).`);
    process.exit(1);
  }
}

const credential = execFileSync('git', ['credential', 'fill'], {
  input: 'protocol=https\nhost=github.com\n\n',
  encoding: 'utf8'
});
const token = (credential.match(/^password=(.*)$/m) || [])[1];
if (!token) {
  console.error('No saved GitHub login found. Run a "git push" once so git stores it, then try again.');
  process.exit(1);
}

const api = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      ...(options.headers || {})
    }
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`${options.method || 'GET'} ${url} failed: ${res.status} ${await res.text()}`);
  }
  return res;
};

const base = `https://api.github.com/repos/${OWNER}/${REPO}`;

let release;
const existing = await api(`${base}/releases/tags/${tag}`);
if (existing.status === 404) {
  const created = await api(`${base}/releases`, {
    method: 'POST',
    body: JSON.stringify({
      tag_name: tag,
      target_commitish: 'main',
      name: `Gloma CRM Desktop ${version}`,
      body: 'Windows desktop app for Gloma CRM. Installed apps update themselves from newer releases.'
    })
  });
  release = await created.json();
  console.log(`Created release ${tag}`);
} else {
  release = await existing.json();
  console.log(`Release ${tag} already exists; refreshing its files`);
}

const currentAssets = await (await api(`${base}/releases/${release.id}/assets`)).json();
for (const { name } of assets) {
  const old = currentAssets.find(a => a.name === name);
  if (old) await api(`${base}/releases/assets/${old.id}`, { method: 'DELETE' });
}

for (const { file, name } of assets) {
  const body = fs.readFileSync(path.join(outDir, file));
  const res = await api(
    `https://uploads.github.com/repos/${OWNER}/${REPO}/releases/${release.id}/assets?name=${encodeURIComponent(name)}`,
    { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body }
  );
  const uploaded = await res.json();
  console.log(`Uploaded ${uploaded.name} (${uploaded.size} bytes)`);
}

console.log(`Done: https://github.com/${OWNER}/${REPO}/releases/tag/${tag}`);

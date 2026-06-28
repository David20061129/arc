// 从 PRTS Wiki 批量下载干员头像到 public/image/，并改写 data/operators.json 的 image 字段。
// 用法: node scripts/fetch-avatars.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data', 'operators.json');
const IMG_DIR = path.join(ROOT, 'public', 'image');
const MEDIA_HOST = 'media.prts.wiki';
const UA = 'Mozilla/5.0 (arknights-chain-helper avatar fetcher)';
const CONCURRENCY = 6;

fs.mkdirSync(IMG_DIR, { recursive: true });
const operators = JSON.parse(fs.readFileSync(DATA, 'utf8'));

// MediaWiki 文件路径: /{md5[0]}/{md5[0..1]}/文件名
function mediaUrl(filename) {
  const md5 = crypto.createHash('md5').update(filename, 'utf8').digest('hex');
  return `https://${MEDIA_HOST}/${md5[0]}/${md5[0]}${md5[1]}/${encodeURIComponent(filename)}`;
}

function get(url, { json = false } = {}) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': UA } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve({ status: res.statusCode, type: res.headers['content-type'] || '', buf });
      });
    });
    req.on('error', () => resolve({ status: 0, type: '', buf: Buffer.alloc(0) }));
    req.setTimeout(20000, () => { req.destroy(); resolve({ status: 0, type: '', buf: Buffer.alloc(0) }); });
  });
}

// 用 MediaWiki API 兜底查真实 url
async function apiResolve(filename) {
  const u = 'https://prts.wiki/api.php?action=query&format=json&prop=imageinfo&iiprop=url&titles='
    + encodeURIComponent('File:' + filename);
  const r = await get(u);
  if (r.status !== 200) return null;
  try {
    const pages = JSON.parse(r.buf.toString('utf8')).query.pages;
    for (const k in pages) {
      if (!('missing' in pages[k]) && pages[k].imageinfo) return pages[k].imageinfo[0].url;
    }
  } catch (_) {}
  return null;
}

function isImage(r) { return r.status === 200 && r.type.startsWith('image/') && r.buf.length > 0; }

async function fetchOne(op) {
  const filename = `头像_${op.name}.png`;
  // 1) 直接按 MD5 规则取
  let r = await get(mediaUrl(filename));
  // 2) 兜底: API 解析真实地址
  if (!isImage(r)) {
    const real = await apiResolve(filename);
    if (real) r = await get(real);
  }
  if (!isImage(r)) return { name: op.name, ok: false };
  fs.writeFileSync(path.join(IMG_DIR, `${op.name}.png`), r.buf);
  return { name: op.name, ok: true, size: r.buf.length };
}

async function run() {
  const results = [];
  let i = 0, done = 0;
  async function worker() {
    while (i < operators.length) {
      const op = operators[i++];
      const res = await fetchOne(op);
      results.push(res);
      done++;
      if (done % 30 === 0 || done === operators.length) {
        process.stdout.write(`  进度 ${done}/${operators.length}\n`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const ok = results.filter((r) => r.ok);
  const fail = results.filter((r) => !r.ok);
  const bytes = ok.reduce((s, r) => s + r.size, 0);

  // 改写 operators.json: 成功用本地路径, 失败删除 image 触发服务器 SVG 兜底
  const failSet = new Set(fail.map((r) => r.name));
  for (const op of operators) {
    if (failSet.has(op.name)) delete op.image;
    else op.image = `/image/${encodeURIComponent(op.name)}.png`;
  }
  fs.writeFileSync(DATA, JSON.stringify(operators, null, 2) + '\n', 'utf8');

  console.log(`\n完成: 成功 ${ok.length}, 失败 ${fail.length}, 共 ${(bytes / 1048576).toFixed(1)} MB`);
  if (fail.length) console.log('失败(将用SVG占位):', fail.map((r) => r.name).join(', '));
}

run();

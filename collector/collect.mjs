#!/usr/bin/env node
// Kolektor innowacji – uruchamiany raz dziennie (cron / GitHub Actions / systemd timer).
// Czyta publiczne źródła z sources.json, wybiera wpisy wyglądające na innowacje, usuwa duplikaty
// i dopisuje je do feed/feed.json, który aplikacja pobiera automatycznie.
// Wymaga Node 20+, bez zależności. Opcjonalnie ANTHROPIC_API_KEY włącza klasyfikację przez Claude.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FEED = resolve(HERE, 'feed/feed.json');
const SRC = resolve(HERE, 'sources.json');
const UA = 'RadarInnowacjiBot/1.0 (+kontakt: ustaw-adres-organizacji)';
const MAX_NEW_PER_RUN = Number(process.env.MAX_NEW || 40);
const DELAY_MS = 1500; // grzeczność wobec serwisów
const today = new Date().toISOString().slice(0, 10);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const strip = h => String(h || '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8211;|&ndash;/g, '–').replace(/&quot;|&#8222;|&#8221;/g, '"').replace(/&#\d+;/g, ' ').replace(/\s+/g, ' ').trim();
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
const idOf = url => 'w-' + createHash('sha1').update(url).digest('hex').slice(0, 10);

const robotsCache = new Map();
async function allowed(url) {
  const u = new URL(url);
  if (!robotsCache.has(u.origin)) {
    let rules = [];
    try {
      const r = await fetch(u.origin + '/robots.txt', { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(10000) });
      if (r.ok) {
        let on = false;
        for (const ln of (await r.text()).split('\n')) {
          const m = ln.match(/^\s*(user-agent|disallow)\s*:\s*(.*?)\s*$/i);
          if (!m) continue;
          if (m[1].toLowerCase() === 'user-agent') on = m[2] === '*' || /radarinnowacji/i.test(m[2]);
          else if (on && m[2]) rules.push(m[2]);
        }
      }
    } catch { /* brak robots.txt = brak ograniczeń */ }
    robotsCache.set(u.origin, rules);
  }
  return !robotsCache.get(u.origin).some(p => u.pathname.startsWith(p));
}
async function get(url) {
  if (!(await allowed(url))) throw new Error('zabronione przez robots.txt');
  const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,application/json,application/xml' }, signal: AbortSignal.timeout(20000), redirect: 'follow' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r;
}

// ---- parsery źródeł: zwracają [{title,url,text,published}] ----
export async function parseWp(json) {
  return json.map(p => ({ title: strip(p.title?.rendered), url: p.link, text: strip(p.excerpt?.rendered || p.content?.rendered).slice(0, 600), published: (p.date || '').slice(0, 10) }));
}
export function parseRss(xml) {
  return [...xml.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/g)].map(m => {
    const b = m[0], g = t => (b.match(new RegExp('<' + t + '[^>]*>([\\s\\S]*?)</' + t + '>')) || [])[1] || '';
    const link = (b.match(/<link[^>]*href="([^"]+)"/) || [])[1] || strip(g('link'));
    return { title: strip(g('title')), url: link, text: strip(g('description') || g('summary')).slice(0, 600), published: (strip(g('pubDate') || g('updated') || g('published'))).slice(0, 25) };
  });
}
export function parseHtmlLinks(html, base, pattern) {
  const out = new Map();
  for (const m of html.matchAll(/<a\s[^>]*href="([^"#]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    let href; try { href = new URL(m[1], base).href; } catch { continue; }
    const title = strip(m[2]);
    if (title.length < 25 || (pattern && !href.includes(pattern))) continue;
    if (!out.has(href)) out.set(href, { title, url: href, text: '', published: '' });
  }
  return [...out.values()];
}

// ---- filtr "czy to wygląda na innowację" ----
export function looksLikeInnovation(it, cfg) {
  const t = norm(it.title + ' ' + it.text);
  if (cfg.exclude.some(k => t.includes(norm(k)))) return false;
  return cfg.keywords.filter(k => t.includes(norm(k))).length >= 1 && it.title.length >= 20;
}
const AREAS = [
  [/(dron|obron|radar|cyber|bezpiecz)/, 'Bezpieczeństwo i obronność'], [/(energi|wodor|bateri|ogniw|fotowolt|ekolog|odpad|srodowisk)/, 'Energia i środowisko'],
  [/(medyc|zdrow|lek|szpital|biomed|rehabilit)/, 'Zdrowie'], [/(zywnosc|rolni|owoc|ogrod)/, 'Żywność i rolnictwo'], [/(material|powlok|polimer|chemi|nano)/, 'Materiały i chemia'],
  [/(ai |sztuczn|oprogramow|aplikacj|robot|elektronik|5g|czujnik)/, 'Technologie cyfrowe i elektronika'], [/(szkol|uczn|edukac)/, 'Edukacja']
];
const area = t => (AREAS.find(([re]) => re.test(norm(t))) || [0, 'Technologia'])[1];
const kind = t => /patent|wynalaz/.test(norm(t)) ? 'patent' : /prototyp/.test(norm(t)) ? 'prototyp' : /licencj/.test(norm(t)) ? 'oferta-licencji' : /konkurs|medal|nagrod|laureat/.test(norm(t)) ? 'konkurs' : 'wdrożenie';
const stageOf = k => ({ patent: 2, prototyp: 2, 'oferta-licencji': 2, konkurs: 1, wdrożenie: 3 }[k] ?? 1);

// ---- opcjonalna klasyfikacja przez Claude (opis własnymi słowami, ocena etapu) ----
async function refine(rec, text) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return rec;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.CLAUDE_MODEL || 'claude-haiku-5-5', max_tokens: 400, messages: [{ role: 'user', content: 'Na podstawie tytułu i fragmentu oceń, czy to INNOWACJA (wynalazek, patent, prototyp, wdrożenie, projekt uczniów). Odpowiedz wyłącznie JSON: {"innovation":bool,"problem":"1 zdanie własnymi słowami","summary":"1-2 zdania własnymi słowami","stage":0-4,"area":"krótka dziedzina"}.\nTytuł: ' + rec.title + '\nFragment: ' + text.slice(0, 800) }] }),
      signal: AbortSignal.timeout(30000)
    });
    const j = JSON.parse((await r.json()).content[0].text.match(/\{[\s\S]*\}/)[0]);
    if (j.innovation === false) return null;
    return { ...rec, problem: j.problem || rec.problem, summary: j.summary || rec.summary, stage: Number.isInteger(j.stage) ? j.stage : rec.stage, area: j.area || rec.area };
  } catch { return rec; }
}

async function main() {
  const cfg = JSON.parse(await readFile(SRC, 'utf8'));
  let feed = { generatedAt: today, schema: 1, items: [] };
  try { feed = JSON.parse(await readFile(FEED, 'utf8')); } catch { await mkdir(dirname(FEED), { recursive: true }); }
  const seen = new Set(feed.items.flatMap(i => [i.url, norm(i.title)]));
  const report = { date: today, sources: [], added: 0 };
  for (const s of cfg.sources) {
    if (report.added >= MAX_NEW_PER_RUN) break;
    const row = { id: s.id, ok: false, found: 0, added: 0 };
    try {
      const res = await get(s.url);
      const body = await res.text();
      const items = s.type === 'wp-json' ? await parseWp(JSON.parse(body)) : s.type === 'rss' ? parseRss(body) : parseHtmlLinks(body, s.url, s.linkPattern);
      row.ok = true; row.found = items.length;
      for (const it of items) {
        if (report.added >= MAX_NEW_PER_RUN) break;
        if (!it.url || seen.has(it.url) || seen.has(norm(it.title)) || !looksLikeInnovation(it, cfg)) continue;
        const k = kind(it.title + ' ' + it.text);
        let rec = { id: idOf(it.url), title: it.title.slice(0, 160), institution: s.institution, city: s.city, woj: s.woj, instType: s.instType, origin: s.origin, stage: stageOf(k), ip: k === 'patent' ? 2 : 0, area: area(it.title + ' ' + it.text), kind: k, problem: '', summary: (it.text || it.title).slice(0, 240), url: it.url, source: new URL(it.url).hostname, published: it.published, discoveredAt: today };
        rec = await refine(rec, it.text || it.title);
        if (!rec) continue;
        feed.items.unshift(rec); seen.add(it.url); seen.add(norm(it.title)); row.added++; report.added++;
      }
    } catch (e) { row.error = String(e.message || e); }
    report.sources.push(row);
    await sleep(DELAY_MS);
  }
  feed.generatedAt = today;
  feed.items = feed.items.slice(0, 2000);
  await writeFile(FEED, JSON.stringify(feed, null, 1));
  await writeFile(resolve(HERE, 'feed/last-run.json'), JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report, null, 1));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e); process.exit(1); });

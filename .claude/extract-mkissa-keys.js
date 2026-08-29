#!/usr/bin/env node
/**
 * .claude/extract-mkissa-keys.js
 *
 * Re-deriva TODAS las constantes del esquema de cripto de mkissa a partir del
 * bundle JS vivo del sitio. Correr esto cuando /diagnose reporte que la query
 * de episodio está rota (AA_CRYPTO_*, invalid_boot_token, PersistedQueryNotFound).
 *
 *   node .claude/extract-mkissa-keys.js            # imprime las constantes
 *   node .claude/extract-mkissa-keys.js --json     # solo JSON (para pipes)
 *
 * POR QUÉ EXISTE (importante para entender el cambio de 2026-08-29):
 * Hasta esa fecha la clave se derivaba scrapeando `epoch`/`partB` del HTML y un
 * `mask` de 64 hex de los chunks. Eso YA NO EXISTE: mkissa pasó a un endpoint
 * `/client-crypto/v1/bootstrap` que devuelve `partB` sólo si le mandás un token
 * `x-aa-boot` HMAC-eado con un `mask` que ya no está en texto plano — se calcula
 * a partir de 4 fragmentos base64 (`Rf`), el buildId y unas sales, todo dentro
 * de un bundle ofuscado. No hay forma sana de reproducir eso con un regex en
 * runtime desde React Native, así que la app HARDCODEA mask/buildId/lane y este
 * script es el que los recupera cuando el sitio hace un deploy nuevo.
 *
 * Salida: pegar los valores en las constantes AA_* de src/services/AnimeService.js
 * (y en .claude/diagnose-api.js, que las duplica).
 */
'use strict';

const vm = require('vm');
const crypto = require('crypto');

const SITE = 'https://mkissa.to';
const CDN = 'https://cdn.mkissa.net/all/mk/_app/immutable';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0';

const JSON_ONLY = process.argv.includes('--json');
const log = (...a) => { if (!JSON_ONLY) console.log(...a); };

async function get(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`);
  return r.text();
}

// ─── helpers de parseo ──────────────────────────────────────────────────────

function balanced(str, start, open, close) {
  let depth = 0;
  for (let j = start; j < str.length; j++) {
    const c = str[j];
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return j + 1; }
  }
  return -1;
}

// Escanea una expresión desde `i` hasta la primera `,` o `;` de nivel 0.
// Respeta strings, template literals y `${}` anidados.
function scanExpr(str, i) {
  let d = 0, j = i;
  while (j < str.length) {
    const c = str[j];
    if ('([{'.includes(c)) { d++; j++; }
    else if (')]}'.includes(c)) { if (d === 0) break; d--; j++; }
    else if ((c === ',' || c === ';') && d === 0) break;
    else if (c === '"' || c === "'") {
      const q = c; j++;
      while (j < str.length && str[j] !== q) { if (str[j] === '\\') j++; j++; }
      j++;
    } else if (c === '`') {
      j++;
      while (j < str.length && str[j] !== '`') {
        if (str[j] === '\\') { j += 2; continue; }
        if (str[j] === '$' && str[j + 1] === '{') {
          let dd = 0; j++;
          while (j < str.length) {
            if (str[j] === '{') dd++;
            else if (str[j] === '}') { dd--; if (dd === 0) { j++; break; } }
            j++;
          }
          continue;
        }
        j++;
      }
      j++;
    } else j++;
  }
  return str.slice(i, j);
}

function makeGrabbers(src) {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const grabAssign = (name) => {
    const re = new RegExp('(?:^|[,;{(\\s])' + esc(name) + '=(?!=)', 'g');
    let m;
    while ((m = re.exec(src))) {
      const i = m.index + m[0].length;
      const e = scanExpr(src, i);
      if (e && e.length < 8000) return `var ${name}=${e};`;
    }
    return null;
  };

  const grabFn = (name) => {
    const re = new RegExp('(?:async )?function ' + esc(name) + '\\s*\\(', 'g');
    const out = [];
    let m;
    while ((m = re.exec(src))) {
      const po = src.indexOf('(', m.index + m[0].length - 1);
      const pe = balanced(src, po, '(', ')');
      const bs = src.indexOf('{', pe);
      out.push(src.slice(m.index, balanced(src, bs, '{', '}')));
    }
    return out;
  };

  return { grabAssign, grabFn };
}

// Junta el andamiaje del ofuscador: arrays de strings, decoders y rotadores.
function obfuscatorScaffold(src) {
  const pieces = [];

  for (const m of src.matchAll(/function ([A-Za-z_$][\w$]*)\(\)\{const e=\[/g)) {
    const bs = src.indexOf('{', m.index);
    pieces.push(src.slice(m.index, balanced(src, bs, '{', '}')));
  }
  for (const m of src.matchAll(
    /function ([A-Za-z_$][\w$]*)\(e,t\)\{return e=e-\(?[-\d*+ ]+\)?,[A-Za-z_$][\w$]*\(\)\[e\]\}/g,
  )) pieces.push(m[0]);
  for (const m of src.matchAll(
    /function ([A-Za-z_$][\w$]*)\(e,t\)\{return [A-Za-z_$][\w$]*\((?:e|t)-\s*-?\d+\)\}/g,
  )) pieces.push(m[0]);
  for (const m of src.matchAll(/\(function\(e,t\)\{const r=/g)) {
    const end = balanced(src, m.index, '(', ')');
    if (end < 0) continue;
    const callEnd = balanced(src, end, '(', ')');
    if (callEnd < 0) continue;
    const whole = src.slice(m.index, callEnd);
    if (/^\([A-Za-z_$][\w$]*,\d+\)$/.test(whole.slice(end - m.index))) {
      pieces.push(whole + ';');
    }
  }
  // alias de decoders (const Tt=Un, …)
  const decNames = new Set();
  for (const m of src.matchAll(
    /function ([A-Za-z_$][\w$]*)\(e,t\)\{return (?:e=e-\(?[-\d*+ ]+\)?,[A-Za-z_$][\w$]*\(\)\[e\]|[A-Za-z_$][\w$]*\((?:e|t)-\s*-?\d+\))\}/g,
  )) decNames.add(m[1]);
  for (const m of src.matchAll(
    /(?:const|let|var) ([A-Za-z_$][\w$]+)=([A-Za-z_$][\w$]*)(?=[,;\s\n])/g,
  )) {
    if (decNames.has(m[2]) && !decNames.has(m[1])) pieces.push(`var ${m[1]}=${m[2]};`);
  }
  return pieces;
}

// Corre `code` en un VM resolviendo dependencias faltantes desde `src`.
function runResolving(src, pieces, tail) {
  const { grabAssign, grabFn } = makeGrabbers(src);
  const ctx = { out: {}, console, TextEncoder, TextDecoder, crypto: globalThis.crypto,
    atob: (b) => Buffer.from(b, 'base64').toString('binary'),
    btoa: (s) => Buffer.from(s, 'binary').toString('base64') };
  ctx.globalThis = ctx;
  vm.createContext(ctx);

  const stubbed = [];
  const body = [...pieces];
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      vm.runInContext(
        `var ${stubbed.length ? stubbed.join(',') + ';' : '__nop__;'}\n${body.join('\n')}\n${tail}`,
        ctx,
        { timeout: 20000 },
      );
      return { ctx, stubbed };
    } catch (e) {
      const m = /^([\w$]+) is not defined$/.exec(e.message);
      if (!m) throw e;
      const dep = grabAssign(m[1]) || grabFn(m[1])[0];
      if (dep) body.unshift(dep);
      else stubbed.push(m[1]);
    }
  }
  throw new Error('no se pudo resolver el bundle (demasiadas dependencias)');
}

// ─── extracción ─────────────────────────────────────────────────────────────

async function main() {
  log('→ bajando', SITE);
  const page = await get(SITE);
  const appMatch = page.match(
    new RegExp(`${CDN.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}/entry/app\\.[A-Za-z0-9_.-]+\\.js`),
  );
  if (!appMatch) throw new Error('no se encontró entry/app.*.js — ¿cambió KEY_CDN/dominio?');
  log('→ app.js:', appMatch[0]);

  const appJs = await get(appMatch[0]);
  const chunks = [...new Set(
    [...appJs.matchAll(/"\.\.\/chunks\/([A-Za-z0-9_.-]+\.js)"/g)].map((m) => m[1]),
  )];
  log(`→ ${chunks.length} chunks referenciados; buscando el de cripto…`);

  let src = null;
  for (const c of chunks) {
    const js = await get(`${CDN}/chunks/${c}`);
    if (js.includes('aaReq') && js.includes('partB')) { src = js; log('→ chunk de cripto:', c); break; }
  }
  if (!src) throw new Error('ningún chunk contiene aaReq/partB — cambió el bundle');

  const { grabAssign, grabFn } = makeGrabbers(src);
  const scaffold = obfuscatorScaffold(src);

  // 1. constantes + mask
  const FNS = ['Py', 'JI', 'ZI', 'Nu', 'sa', 'fk', 'Uy', 'dk', 'ak', 'ik', 'Oy'];
  const CONSTS = ['sg', 'Rf', 'Vd', 'XI', 'QI', 'is', 'og', 'Dy', 'kn', 'Fy', 'ck', '_r'];
  const pieces = [...scaffold];
  for (const f of FNS) pieces.push(...grabFn(f));
  for (const c of CONSTS) { const g = grabAssign(c); if (g) pieces.push(g); }

  const { ctx, stubbed } = runResolving(src, pieces, `
    out.buildId = sg;
    out.lane = og; out.laneField = is; out.mangaLane = Dy;
    out.api = kn;
    out.epochMs = Fy; out.graceMs = ck;
    out.keyGroup = fk("mkissa.to");
    out.cfg = Nu();
    out.mask = Array.from(Py(sg)).map(b => b.toString(16).padStart(2,"0")).join("");
  `);
  if (stubbed.length) log('⚠️  símbolos stubbeados (revisar si importan):', stubbed.join(', '));
  const o = ctx.out;

  // 2. query de episodio + su sha256 (el hash de persistedQuery)
  let queryHash = null;
  try {
    const qi = src.indexOf('QB=function');
    if (qi < 0) throw new Error('no se encontró QB (builder de la query de episodio)');
    const qb = src.slice(qi, balanced(src, src.indexOf('{', qi), '{', '}'));
    const qPieces = [];
    for (const n of ['bi', 'zt', 'd1', 'cd', 'Xr']) { const g = grabAssign(n); if (g) qPieces.push(g); }
    qPieces.push(`var ${qb};`);
    const r = runResolving(src, qPieces, 'out.q = QB();');
    // OJO: sin .trim() — el hash es del template tal cual, con el \n inicial.
    queryHash = crypto.createHash('sha256').update(r.ctx.out.q).digest('hex');
  } catch (e) {
    log('⚠️  no se pudo reconstruir la query de episodio:', e.message);
  }

  const result = {
    buildId: o.buildId,
    mask: o.mask,
    lane: o.lane,
    laneField: o.laneField,
    keyGroup: o.keyGroup,
    bootPrefix: o.cfg.bootPrefix,
    bootJoin: o.cfg.join,
    bootParts: o.cfg.parts,
    apiBase: String(o.api || '').replace(/\/api$/, ''),
    epochMs: o.epochMs,
    graceMs: o.graceMs,
    episodeQueryHash: queryHash,
  };

  if (JSON_ONLY) { console.log(JSON.stringify(result, null, 2)); return; }

  console.log('\n══════════ CONSTANTES DERIVADAS ══════════');
  for (const [k, v] of Object.entries(result)) {
    console.log(`  ${k.padEnd(18)} ${JSON.stringify(v)}`);
  }
  console.log('\nPegar en las constantes AA_* de src/services/AnimeService.js');
  console.log('y en la copia de .claude/diagnose-api.js.\n');
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });

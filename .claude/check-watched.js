#!/usr/bin/env node
/**
 * .claude/check-watched.js
 *
 * Prueba WatchedEpisodesService sin device: mockea AsyncStorage, Firebase y
 * auth. Verifica lo que de verdad importa:
 *   - la escritura LOCAL es inmediata (no depende del debounce);
 *   - el "pendiente" queda EN DISCO, así que sobrevive a que maten el proceso;
 *   - sin sesión no se pierde nada: el pendiente queda para después;
 *   - "marcar hasta acá" marca el episodio y todos los anteriores.
 *
 *   node .claude/check-watched.js
 */
'use strict';

const path = require('path');
const Module = require('module');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const babel = require(path.join(ROOT, 'node_modules/@babel/core'));
const esmToCjs = require.resolve(
  path.join(ROOT, 'node_modules/@babel/plugin-transform-modules-commonjs'),
);

// ─── mocks ──────────────────────────────────────────────────────────────────
const disk = new Map(); // simula AsyncStorage (persistente entre "reinicios")
const asyncStorageMock = {
  getItem: async (k) => (disk.has(k) ? disk.get(k) : null),
  setItem: async (k, v) => { disk.set(k, v); },
  removeItem: async (k) => { disk.delete(k); },
};

let authenticated = true;
const uploads = [];
const authMock = {
  __esModule: true,
  default: {
    isAuthenticated: () => authenticated,
    getCurrentUser: () => (authenticated ? { uid: 'u1' } : null),
  },
};
const firestoreMock = {
  doc: (_db, col, id) => ({ col, id }),
  setDoc: async (ref, data) => { uploads.push({ id: ref.id, n: data.episodes.length }); },
};
const firebaseConfigMock = { getFirebaseDb: () => ({}) };
const loggerMock = { __esModule: true, createLogger: () => ({ debug() {}, info() {}, warn() {}, error() {} }) };

function loadService() {
  const abs = path.join(ROOT, 'src/services/WatchedEpisodesService.js');
  const { code } = babel.transformSync(fs.readFileSync(abs, 'utf8'), {
    filename: abs, plugins: [esmToCjs], babelrc: false, configFile: false,
  });
  const m = new Module(abs, null);
  m.filename = abs;
  m.paths = Module._nodeModulePaths(path.dirname(abs));
  m.require = (id) => {
    if (id.includes('async-storage')) return { __esModule: true, default: asyncStorageMock };
    if (id.includes('AuthService')) return authMock;
    if (id.includes('firebase/firestore')) return firestoreMock;
    if (id.includes('firebaseConfig')) return firebaseConfigMock;
    if (id.includes('logger')) return loggerMock;
    return require(id);
  };
  m._compile(code, abs);
  return m.exports.default;
}

let failures = 0;
const check = (name, cond, detail) => {
  if (cond) console.log(`  ✅ ${name}`);
  else { failures++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let S = loadService();

  console.log('\nEscritura local inmediata (sobrevive a un apagón):');
  await S.markWatched('slime-5231', '25');
  check('quedó en disco al instante, sin esperar debounce',
    JSON.parse(disk.get('watched_episodes_v1:slime-5231')).includes('25'));
  check('el pendiente también quedó en disco',
    JSON.parse(disk.get('watched_episodes_pending_v1')).includes('slime-5231'));

  console.log('\nSimulando que Android mata el proceso antes del debounce:');
  S = loadService(); // proceso nuevo: se pierde toda la memoria, el disco no
  const recovered = await S.getWatched('slime-5231');
  check('los vistos se recuperan del disco', recovered.has('25'));
  await S.flushToCloud();
  check('el pendiente se sube al arrancar', uploads.length === 1,
    JSON.stringify(uploads));

  console.log('\nMarcar hasta acá:');
  const eps = ['25', '26', '27', '28', '29', '30'];
  await S.markUpTo('slime-5231', '28', eps);
  const upTo = await S.getWatched('slime-5231');
  check('marca el episodio y los anteriores',
    ['25', '26', '27', '28'].every((e) => upTo.has(e)));
  check('no marca los posteriores', !upTo.has('29') && !upTo.has('30'));

  console.log('\nToggle:');
  await S.toggleWatched('slime-5231', '28');
  check('desmarca', !(await S.getWatched('slime-5231')).has('28'));
  await S.toggleWatched('slime-5231', '28');
  check('vuelve a marcar', (await S.getWatched('slime-5231')).has('28'));

  console.log('\nSin sesión (no se debe perder nada):');
  authenticated = false;
  uploads.length = 0;
  await S.markWatched('one-piece-3880', '1000');
  await S.flushToCloud();
  check('no sube nada', uploads.length === 0);
  check('el pendiente NO se limpia',
    JSON.parse(disk.get('watched_episodes_pending_v1')).includes('one-piece-3880'));
  authenticated = true;
  await S.flushToCloud();
  check('al volver la sesión, sube', uploads.length > 0);
  check('y ahí sí limpia el pendiente',
    JSON.parse(disk.get('watched_episodes_pending_v1')).length === 0);

  console.log('\nAgrupado por anime (una escritura, no una por episodio):');
  uploads.length = 0;
  for (const e of ['1', '2', '3', '4', '5']) await S.markWatched('test-1', e);
  await S.flushToCloud();
  check('5 marcas → 1 sola subida', uploads.length === 1,
    `subidas=${uploads.length}`);
  check('la subida lleva los 5 episodios', uploads[0]?.n === 5);

  console.log(failures === 0 ? '\n✅ Todo OK\n' : `\n❌ ${failures} fallo(s)\n`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error('💥', e.message); process.exit(1); });

#!/usr/bin/env node
/**
 * .claude/check-next-episode.js
 *
 * Prueba la lógica de "siguiente episodio" y de "continuar", que son las dos
 * que se rompieron al migrar a anidb.
 *
 *   node .claude/check-next-episode.js
 *
 * EL BUG ORIGINAL: se comparaba el NÚMERO de episodio con la CANTIDAD
 *   hasNext = parseInt(episodio) < totalEpisodes
 * Con AllAnime casi siempre se empezaba en 1, así que funcionaba de casualidad.
 * anidb continúa la numeración entre temporadas: Slime S2 va del 25 al 36 y son
 * 12 episodios, o sea "25 < 12" = false y el botón de siguiente desaparecía.
 */
'use strict';

// Réplica de la lógica de useEpisodeManager.
const nextEpisodeAfter = (episodeList, episode) => {
  const list = episodeList.map(String);
  const index = list.indexOf(String(episode));
  if (index === -1 || index >= list.length - 1) return null;
  return list[index + 1];
};

// Réplica de la lógica de "continuar" de useAnimeDetailsEpisodes.
const computeResume = (episodes, watched, lastEpisode) => {
  const set = new Set(watched.map(String));
  if (!lastEpisode) return null;
  if (!set.has(String(lastEpisode))) return String(lastEpisode);
  const index = episodes.indexOf(String(lastEpisode));
  const upcoming = index >= 0
    ? episodes.slice(index + 1).find((ep) => !set.has(String(ep)))
    : episodes.find((ep) => !set.has(String(ep)));
  return upcoming || null;
};

let failures = 0;
const check = (name, got, expected) => {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`  ${ok ? '✅' : '❌'} ${name}${ok ? '' : ` — dio ${JSON.stringify(got)}, se esperaba ${JSON.stringify(expected)}`}`);
};

// Datos reales: anidb devuelve 25..36 para Slime Season 2.
const slimeS2 = ['25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36'];
const desde1 = ['1', '2', '3', '4', '5'];
const conEspecial = ['1', '2', '2.5', '3'];

console.log('\nSiguiente episodio (el bug de "25 < 12"):');
check('Slime S2: después del 25 va el 26', nextEpisodeAfter(slimeS2, '25'), '26');
check('Slime S2: el 36 es el último', nextEpisodeAfter(slimeS2, '36'), null);
check('Slime S2: después del 35 va el 36', nextEpisodeAfter(slimeS2, '35'), '36');
check('serie desde 1: después del 1 va el 2', nextEpisodeAfter(desde1, '1'), '2');
check('serie desde 1: el 5 es el último', nextEpisodeAfter(desde1, '5'), null);
check('numeración con especial: 2 → 2.5', nextEpisodeAfter(conEspecial, '2'), '2.5');
check('numeración con especial: 2.5 → 3', nextEpisodeAfter(conEspecial, '2.5'), '3');
check('episodio inexistente → null', nextEpisodeAfter(slimeS2, '99'), null);
check('lista vacía → null', nextEpisodeAfter([], '1'), null);

console.log('\nTarjeta "Continuar" (no debe quedarse en un episodio ya visto):');
check('sin ver nada: sigue en el que iba', computeResume(slimeS2, [], '27'), '27');
check('el 27 ya visto → ofrece el 28', computeResume(slimeS2, ['25', '26', '27'], '27'), '28');
check('salta los que ya vio', computeResume(slimeS2, ['27', '28', '29'], '27'), '30');
check('todo visto → no muestra tarjeta',
  computeResume(slimeS2, slimeS2, '36'), null);
check('sin historial → null', computeResume(slimeS2, [], null), null);

console.log(failures === 0 ? '\n✅ Todo OK\n' : `\n❌ ${failures} fallo(s)\n`);
process.exit(failures === 0 ? 0 : 1);

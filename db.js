// ============================================================
// Banco de dados do Kennedy Defenders — IndexedDB
// ============================================================
// Sem dependências, sem servidor e sem internet.
//
// Stores:
//   progress      -> fases liberadas/concluídas, estrelas e save atual
//   stats         -> estatísticas gerais do jogador
//   achievements  -> conquistas desbloqueadas
//
// A interface do jogo é síncrona: os dados ficam em memória e são
// gravados no IndexedDB em segundo plano. Se o navegador bloquear o
// IndexedDB, o jogo volta a usar o localStorage (ver game.js).
(function () {
  'use strict';

  const DB_NAME = 'kennedy-defenders';
  const DB_VERSION = 1;
  const STORE_PROGRESS = 'progress';
  const STORE_STATS = 'stats';
  const STORE_ACHIEVEMENTS = 'achievements';

  let db = null;
  let ready = false;

  const cache = {
    stars: {},
    stats: null,
    achievements: [],
    achievementTimes: {},
    progress: { unlocked: 1, cleared: [] },
    save: null
  };

  function hasIndexedDB() {
    try {
      return typeof indexedDB !== 'undefined' && indexedDB !== null;
    } catch (e) {
      return false;
    }
  }

  function openDatabase() {
    return new Promise(function (resolve) {
      if (!hasIndexedDB()) return resolve(null);
      let request;
      try {
        request = indexedDB.open(DB_NAME, DB_VERSION);
      } catch (e) {
        return resolve(null);
      }
      request.onupgradeneeded = function () {
        const d = request.result;
        if (!d.objectStoreNames.contains(STORE_PROGRESS)) {
          d.createObjectStore(STORE_PROGRESS, { keyPath: 'id' });
        }
        if (!d.objectStoreNames.contains(STORE_STATS)) {
          d.createObjectStore(STORE_STATS, { keyPath: 'id' });
        }
        if (!d.objectStoreNames.contains(STORE_ACHIEVEMENTS)) {
          d.createObjectStore(STORE_ACHIEVEMENTS, { keyPath: 'key' });
        }
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { resolve(null); };
      request.onblocked = function () { resolve(null); };
    });
  }

  function readAll(storeName) {
    return new Promise(function (resolve) {
      if (!db) return resolve([]);
      let tx;
      try {
        tx = db.transaction(storeName, 'readonly');
      } catch (e) {
        return resolve([]);
      }
      let request;
      try {
        request = tx.objectStore(storeName).getAll();
      } catch (e) {
        return resolve([]);
      }
      request.onsuccess = function () {
        resolve(Array.isArray(request.result) ? request.result : []);
      };
      request.onerror = function () { resolve([]); };
    });
  }

  function put(storeName, value) {
    return new Promise(function (resolve) {
      if (!db) return resolve(false);
      let tx;
      try {
        tx = db.transaction(storeName, 'readwrite');
      } catch (e) {
        return resolve(false);
      }
      try {
        tx.objectStore(storeName).put(value);
      } catch (e) {
        return resolve(false);
      }
      tx.oncomplete = function () { resolve(true); };
      tx.onerror = function () { resolve(false); };
      tx.onabort = function () { resolve(false); };
    });
  }

  function remove(storeName, key) {
    return new Promise(function (resolve) {
      if (!db) return resolve(false);
      let tx;
      try {
        tx = db.transaction(storeName, 'readwrite');
      } catch (e) {
        return resolve(false);
      }
      try {
        tx.objectStore(storeName).delete(key);
      } catch (e) {
        return resolve(false);
      }
      tx.oncomplete = function () { resolve(true); };
      tx.onerror = function () { resolve(false); };
      tx.onabort = function () { resolve(false); };
    });
  }

  function wipe(storeName) {
    return new Promise(function (resolve) {
      if (!db) return resolve(false);
      let tx;
      try {
        tx = db.transaction(storeName, 'readwrite');
      } catch (e) {
        return resolve(false);
      }
      try {
        tx.objectStore(storeName).clear();
      } catch (e) {
        return resolve(false);
      }
      tx.oncomplete = function () { resolve(true); };
      tx.onerror = function () { resolve(false); };
      tx.onabort = function () { resolve(false); };
    });
  }

  function persistLevels() {
    return put(STORE_PROGRESS, {
      id: 'levels',
      unlocked: cache.progress.unlocked,
      cleared: cache.progress.cleared.slice(),
      stars: Object.assign({}, cache.stars),
      updatedAt: Date.now()
    });
  }

  function persistStats() {
    if (!cache.stats) return Promise.resolve(true);
    return put(STORE_STATS, Object.assign({}, cache.stats, {
      id: 'global',
      updatedAt: Date.now()
    }));
  }

  function persistSave() {
    if (!cache.save) return remove(STORE_PROGRESS, 'current');
    return put(STORE_PROGRESS, {
      id: 'current',
      snapshot: cache.save,
      updatedAt: Date.now()
    });
  }

  function syncAchievements(keys) {
    if (!Array.isArray(keys)) keys = [];
    cache.achievements = keys.slice();
    const now = Date.now();
    const writes = [];
    for (const key of cache.achievements) {
      if (typeof key !== 'string') continue;
      if (cache.achievementTimes[key]) continue;
      cache.achievementTimes[key] = now;
      writes.push(put(STORE_ACHIEVEMENTS, { key: key, unlockedAt: now }));
    }
    return Promise.all(writes);
  }

  function init() {
    if (ready) return Promise.resolve({ ok: true, fresh: false });
    return openDatabase().then(function (opened) {
      db = opened;
      if (!db) return { ok: false, fresh: false };

      return Promise.all([
        readAll(STORE_PROGRESS),
        readAll(STORE_STATS),
        readAll(STORE_ACHIEVEMENTS)
      ]).then(function (rows) {
        const progressRows = rows[0];
        const statRows = rows[1];
        const achievementRows = rows[2];

        let levels = null;
        let current = null;
        for (const row of progressRows) {
          if (!row) continue;
          if (row.id === 'levels') levels = row;
          else if (row.id === 'current') current = row;
        }

        cache.stars = (levels && levels.stars && typeof levels.stars === 'object')
          ? Object.assign({}, levels.stars)
          : {};
        cache.progress = {
          unlocked: (levels && isFinite(levels.unlocked)) ? Number(levels.unlocked) : 1,
          cleared: (levels && Array.isArray(levels.cleared))
            ? levels.cleared.map(Number)
            : []
        };
        cache.save = current && current.snapshot ? current.snapshot : null;

        let stat = null;
        for (const row of statRows) {
          if (row && row.id === 'global') { stat = row; break; }
        }
        if (stat) {
          const copy = {};
          for (const key in stat) {
            if (key === 'id' || key === 'updatedAt') continue;
            copy[key] = stat[key];
          }
          cache.stats = copy;
        } else {
          cache.stats = null;
        }

        cache.achievements = [];
        cache.achievementTimes = {};
        for (const row of achievementRows) {
          if (!row || typeof row.key !== 'string') continue;
          cache.achievements.push(row.key);
          cache.achievementTimes[row.key] = Number(row.unlockedAt) || 0;
        }

        ready = true;
        const fresh = progressRows.length === 0 &&
          statRows.length === 0 &&
          achievementRows.length === 0;
        return { ok: true, fresh: fresh };
      });
    }).catch(function () {
      db = null;
      ready = false;
      return { ok: false, fresh: false };
    });
  }

  function getStars() {
    return Object.assign({}, cache.stars);
  }

  function setStars(stars) {
    cache.stars = (stars && typeof stars === 'object') ? Object.assign({}, stars) : {};
    return persistLevels();
  }

  function getStats() {
    return cache.stats ? Object.assign({}, cache.stats) : null;
  }

  function setStats(stats) {
    cache.stats = (stats && typeof stats === 'object') ? Object.assign({}, stats) : null;
    return persistStats();
  }

  function getAchievements() {
    return cache.achievements.slice();
  }

  function setAchievements(keys) {
    return syncAchievements(keys);
  }

  function getProgress() {
    return {
      unlocked: cache.progress.unlocked,
      cleared: cache.progress.cleared.slice()
    };
  }

  function setProgress(unlocked, cleared) {
    cache.progress = {
      unlocked: isFinite(unlocked) ? Number(unlocked) : 1,
      cleared: Array.isArray(cleared) ? cleared.map(Number) : []
    };
    return persistLevels();
  }

  function getSave() {
    return cache.save;
  }

  function setSave(snapshot) {
    cache.save = snapshot || null;
    return persistSave();
  }

  function clearSave() {
    cache.save = null;
    return remove(STORE_PROGRESS, 'current');
  }

  function resetAll() {
    cache.stars = {};
    cache.stats = null;
    cache.achievements = [];
    cache.achievementTimes = {};
    cache.progress = { unlocked: 1, cleared: [] };
    cache.save = null;
    return Promise.all([
      wipe(STORE_PROGRESS),
      wipe(STORE_STATS),
      wipe(STORE_ACHIEVEMENTS)
    ]);
  }

  function isReady() {
    return ready;
  }

  if (typeof window !== 'undefined') {
    window.KDStore = {
      init: init,
      isReady: isReady,
      getStars: getStars,
      setStars: setStars,
      getStats: getStats,
      setStats: setStats,
      getAchievements: getAchievements,
      setAchievements: setAchievements,
      getProgress: getProgress,
      setProgress: setProgress,
      getSave: getSave,
      setSave: setSave,
      clearSave: clearSave,
      resetAll: resetAll
    };
  }
})();

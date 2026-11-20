'use strict';

const progressDraftLimit = 6;
const progressReviewLimit = 12;
const usableProgressKey = key => !['__proto__', 'constructor', 'prototype'].includes(key);
const copyProgress = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const sameProgress = (left, right) => left === right || JSON.stringify(left) === JSON.stringify(right);
const hasProgressValue = value => Array.isArray(value) ? value.length > 0 :
  typeof value === 'string' ? Boolean(value.trim()) : Boolean(value);

function combineDraftVersions(...lists) {
  const versions = lists.flatMap(list => Array.isArray(list) ? list : [])
    .filter(item => Number.isFinite(item?.time) && item.time > 0 && item.time <= 8640000000000000 &&
      (plainRecord(item.draft) || Array.isArray(item.draft)))
    .sort((a, b) => b.time - a.time);
  const used = new Set();
  return versions.filter(version => {
    const key = JSON.stringify(version.draft);
    if (used.has(key)) return false;
    used.add(key);
    return true;
  }).slice(0, progressDraftLimit);
}

function combineReviewHistory(...lists) {
  const attempts = new Map();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const attempt of list) {
      if (typeof attempt?.id !== 'string' || !Number.isFinite(attempt.at) ||
          !['base', 'alternate'].includes(attempt.variant) || !Number.isInteger(attempt.choice)) continue;
      if (!attempts.has(attempt.id) || attempts.get(attempt.id).at <= attempt.at) attempts.set(attempt.id, attempt);
    }
  }
  return [...attempts.values()].sort((a, b) => a.at - b.at).slice(-progressReviewLimit);
}

function progressProjectPath(path) {
  return path.length === 2 && (path[0] === 'activities' || path[0] === 'projects');
}

function progressDraftCollision(before, local, stored) {
  if (!(Array.isArray(local) || plainRecord(local)) || !(Array.isArray(stored) || plainRecord(stored))) return false;
  return Object.keys(local).some(key => usableProgressKey(key) && hasProgressValue(stored[key]) &&
    !sameProgress(local[key], stored[key]) && !sameProgress(local[key], before?.[key]) && !sameProgress(stored[key], before?.[key]));
}

function applyProgressChanges(before, local, stored, path = []) {
  if (sameProgress(before, local)) return stored;
  const key = path.at(-1);
  if (key === 'versions' || key === 'draftHistory') return combineDraftVersions(stored, local);
  if (key === 'reviewHistory') return combineReviewHistory(stored, local);
  if (local === undefined) return undefined;
  const arrayDraft = path.length === 3 && path[0] === 'activities' && key === 'draft' && Array.isArray(local);
  if (!plainRecord(local) && !arrayDraft) {
    if (path[0] === 'reviewed') return Boolean(stored || local);
    return local;
  }
  const merged = arrayDraft ? Array.isArray(stored) ? [...stored] : [] : plainRecord(stored) ? { ...stored } : {};
  for (const name of new Set([...Object.keys(before ?? {}), ...Object.keys(local)])) {
    if (!usableProgressKey(name)) continue;
    const resolved = applyProgressChanges(before?.[name], local[name], stored?.[name], [...path, name]);
    if (resolved !== undefined) merged[name] = resolved;
    else delete merged[name];
  }
  if (progressProjectPath(path) && progressDraftCollision(before?.draft, local.draft, stored?.draft)) {
    const historyKey = path[0] === 'projects' ? 'versions' : 'draftHistory';
    merged[historyKey] = combineDraftVersions(merged[historyKey], [{ time: Date.now(), draft: stored.draft }]);
  }
  return merged;
}

function mergeBackupFields(local, backup) {
  if (!plainRecord(local) || !plainRecord(backup)) return local ?? backup;
  const merged = Object.fromEntries(Object.entries(backup).filter(([key]) => usableProgressKey(key)));
  for (const [key, value] of Object.entries(local)) {
    if (usableProgressKey(key)) merged[key] = mergeBackupFields(value, merged[key]);
  }
  return merged;
}

function mergeBackupDraft(local, backup) {
  const arrayDraft = Array.isArray(local) || Array.isArray(backup);
  const merged = arrayDraft ? [] : {};
  const keys = new Set([...Object.keys(local ?? {}), ...Object.keys(backup ?? {})]);
  for (const key of keys) {
    if (!usableProgressKey(key)) continue;
    merged[key] = hasProgressValue(local?.[key]) ? local[key] : backup?.[key] ?? local?.[key];
  }
  return merged;
}

function mergeImportedProgress(local, backup) {
  const merged = mergeBackupFields(local, backup);
  let conflicts = 0;
  for (const scope of ['projects', 'activities']) {
    if (!plainRecord(backup[scope])) continue;
    const historyKey = scope === 'projects' ? 'versions' : 'draftHistory';
    for (const [id, imported] of Object.entries(backup[scope])) {
      if (!plainRecord(imported)) continue;
      const current = local[scope]?.[id];
      if (!plainRecord(current)) continue;
      const record = merged[scope][id];
      const localDraft = current.draft;
      const importedDraft = imported.draft;
      const overwrite = Object.keys(importedDraft ?? {}).some(key => usableProgressKey(key) &&
        hasProgressValue(localDraft?.[key]) && hasProgressValue(importedDraft[key]) &&
        !sameProgress(localDraft[key], importedDraft[key]));
      if (overwrite) conflicts++;
      if (localDraft || importedDraft) record.draft = mergeBackupDraft(localDraft, importedDraft);
      const versions = combineDraftVersions(current[historyKey], imported[historyKey],
        overwrite ? [{ time: Date.now(), draft: importedDraft }] : []);
      if (versions.length) record[historyKey] = versions;
      const reviews = combineReviewHistory(imported.reviewHistory, current.reviewHistory);
      if (reviews.length) record.reviewHistory = reviews;
    }
  }
  for (const [id, outcome] of Object.entries(backup.reviewed ?? {})) {
    if (outcome === true) {
      merged.reviewed ??= {};
      merged.reviewed[id] = true;
    }
  }
  return { merged, conflicts };
}

function progressDelta(before, after) {
  const oldFields = {};
  const changedFields = {};
  for (const field of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (!usableProgressKey(field) || sameProgress(before[field], after[field])) continue;
    if (plainRecord(before[field]) && plainRecord(after[field])) {
      oldFields[field] = {};
      changedFields[field] = {};
      for (const name of new Set([...Object.keys(before[field]), ...Object.keys(after[field])])) {
        if (!usableProgressKey(name) || sameProgress(before[field][name], after[field][name])) continue;
        if (Object.hasOwn(before[field], name)) oldFields[field][name] = before[field][name];
        if (Object.hasOwn(after[field], name)) changedFields[field][name] = after[field][name];
      }
    } else {
      if (Object.hasOwn(before, field)) oldFields[field] = before[field];
      if (Object.hasOwn(after, field)) changedFields[field] = after[field];
    }
  }
  return { before: oldFields, after: changedFields };
}

function createProgressStore(key, sanitize, resetKey) {
  const queuePrefix = `${key}:pending:`;
  const writer = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
  const locks = globalThis.navigator?.locks;
  let sequence = 0;
  let flushing = false;
  let flushAgain = false;
  let resetAtOpen = null;
  try { resetAtOpen = resetKey && localStorage.getItem(resetKey); } catch {}

  function canWrite() {
    if (!resetKey) return true;
    const reset = localStorage.getItem(resetKey);
    return reset === resetAtOpen && !reset?.startsWith('pending:');
  }

  function loadBase() {
    const value = localStorage.getItem(key);
    let parsed;
    try { parsed = JSON.parse(value); }
    catch { parsed = null; }
    return {
      value: sanitize(parsed),
      applied: Array.isArray(parsed?.__progressWrites) ? parsed.__progressWrites.slice(-128) : [],
    };
  }

  function readQueue() {
    const queued = [];
    for (let position = 0; position < localStorage.length; position++) {
      const name = localStorage.key(position);
      if (!name?.startsWith(queuePrefix)) continue;
      try {
        const operation = JSON.parse(localStorage.getItem(name));
        if (plainRecord(operation?.before) && plainRecord(operation?.after)) {
          queued.push({ name, before: operation.before, after: operation.after });
        }
      } catch {
        // A damaged journal entry cannot hide the rest of the saved work.
      }
    }
    return queued.sort((a, b) => a.name.localeCompare(b.name));
  }

  function mergeQueue(base, queued) {
    const applied = new Set(base.applied);
    return queued.reduce((value, operation) => applied.has(operation.name) ? value :
      applyProgressChanges(operation.before, operation.after, value), base.value);
  }

  function load() {
    const queued = readQueue();
    return mergeQueue(loadBase(), queued);
  }

  function tryLoad() {
    try { return load(); }
    catch { return null; }
  }

  function flush() {
    if (!locks) return;
    if (flushing) {
      flushAgain = true;
      return;
    }
    flushing = true;
    // Every tab persists its own operation before asking to update the legacy snapshot.
    // The lock serializes snapshot writes while the operation remains recoverable if a tab closes.
    locks.request(key, () => {
      if (!canWrite()) return;
      const queued = readQueue();
      if (!queued.length) return;
      const base = loadBase();
      const value = mergeQueue(base, queued);
      const applied = [...new Set([...base.applied, ...queued.map(operation => operation.name)])].slice(-128);
      if (!canWrite()) return;
      localStorage.setItem(key, JSON.stringify({ ...value, __progressWrites: applied }));
      for (const operation of queued) localStorage.removeItem(operation.name);
    }).catch(() => {
      // The durable journal will be retried on the next save or opening.
    }).finally(() => {
      flushing = false;
      if (flushAgain) {
        flushAgain = false;
        flush();
      }
    });
  }

  function queueWrite(before, after) {
    if (!canWrite()) return;
    if (!locks) {
      const merged = applyProgressChanges(before, after, load());
      localStorage.setItem(key, JSON.stringify(merged));
      return;
    }
    const delta = progressDelta(before, after);
    if (Object.keys(delta.before).length || Object.keys(delta.after).length) {
      const time = Date.now().toString().padStart(16, '0');
      const ordinal = (++sequence).toString().padStart(10, '0');
      localStorage.setItem(`${queuePrefix}${time}:${writer}:${ordinal}`, JSON.stringify(delta));
    }
    flush();
  }

  const state = tryLoad() || {};
  let baseline = copyProgress(state);
  flush();

  function replaceState(value) {
    for (const field of Object.keys(state)) delete state[field];
    Object.assign(state, value);
  }

  function current() {
    const latest = tryLoad();
    return latest ? applyProgressChanges(baseline, state, latest) : copyProgress(state);
  }

  return {
    state,
    current,
    refresh() {
      const latest = tryLoad();
      if (!latest) return;
      replaceState(copyProgress(applyProgressChanges(baseline, state, latest)));
      baseline = copyProgress(latest);
    },
    save() {
      queueWrite(baseline, state);
      baseline = copyProgress(state);
    },
    importBackup(raw) {
      const before = current();
      const { merged, conflicts } = mergeImportedProgress(before, sanitize(raw));
      replaceState(copyProgress(merged));
      let persisted = true;
      try {
        queueWrite(before, merged);
        baseline = copyProgress(merged);
      } catch {
        persisted = false;
      }
      return { persisted, conflicts };
    },
  };
}

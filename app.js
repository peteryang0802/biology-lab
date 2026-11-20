'use strict';

const outlet = document.querySelector('#lesson');
const firstBook = document.querySelector('#first-book').content;
const route = id => '#/lesson/' + id;
const termRoute = id => '#/term/' + id;
const terms = [
  { id: '7a', title: '七年级上册', theme: '认识生命 · 营养和运输', count: 14 },
  { id: '7b', title: '七年级下册', theme: '呼吸、排泄与生命活动调节', count: 14 },
  { id: '8a', title: '八年级上册', theme: '生殖发育 · 遗传变异 · 进化', count: 14 },
  { id: '8b', title: '八年级下册', theme: '生物与环境 · 生物学与社会', count: 16 },
];
const termsById = new Map(terms.map(term => [term.id, term]));
const legacy = [...firstBook.querySelectorAll('a[data-page]')].map(link => ({
  id: link.hash.slice(9),
  title: link.querySelector('span').textContent,
  chapter: link.closest('.directory-chapter').querySelector('h3').textContent,
  unit: link.closest('.unit').querySelector('h2').textContent,
  page: Number(link.dataset.page),
  project: link.hasAttribute('data-project'),
  term: '7a',
}));
const courseEntries = new Map([['7a', legacy]]);
const entriesById = new Map(legacy.map(entry => [entry.id, entry]));
const pendingTerms = new Map();
const storageKey = 'bio-learning-lab:v1';
const backupSizeLimit = 2 * 1024 * 1024;
const progress = typeof createProgressStore === 'function'
  ? createProgressStore(storageKey, cleanState, 'school-parent:reset:biology') : temporaryProgressStore();
const state = progress.state;
const lessonData = { ...globalThis.bioUnitOne, ...globalThis.bioUnitTwo };
const edition = document.querySelector('#edition');
const directoryExit = document.querySelector('.lesson-directory-exit');
const directoryExitLabel = directoryExit.querySelector('[data-directory-label]');
let routeVersion = 0;
let renderedLesson = null;
let resumeReviewId;
const directoryPositions = new Map();
const lessonPositions = new Map();
let historyEntry;
let nextHistoryId = Date.now();
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

function termForLesson(id) {
  if (typeof id !== 'string') return null;
  if (entriesById.has(id)) return entriesById.get(id).term;
  return /^(7b|8a|8b)-[a-z0-9]+(?:-[a-z0-9]+)*$/.exec(id)?.[1] || null;
}

function loadTerm(id) {
  if (courseEntries.has(id)) return Promise.resolve(courseEntries.get(id));
  if (pendingTerms.has(id)) return pendingTerms.get(id);
  const pending = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => finish(new Error('term timeout')), 8500);
    function finish(error) {
      clearTimeout(timer);
      script.remove();
      if (error) {
        reject(error);
        return;
      }
      try {
        const data = globalThis.bioTerms?.[id];
        if (!Array.isArray(data)) throw new Error('term missing');
        const entries = data.flatMap(unit => unit.chapters.flatMap(chapter => chapter.lessons.map(lesson => ({
          ...lesson, term: id, unit: unit.title, chapter: chapter.title,
        }))));
        if (entries.length !== termsById.get(id).count || new Set(entries.map(entry => entry.id)).size !== entries.length ||
            !entries.every(entry => termForLesson(entry.id) === id)) throw new Error('term directory');
        courseEntries.set(id, entries);
        for (const entry of entries) entriesById.set(entry.id, entry);
        resolve(entries);
      } catch (problem) { reject(problem); }
    }
    script.src = `./term-${id}.js?v=${id === '8a' ? 9 : id === '8b' ? 11 : 10}`;
    script.onload = () => finish();
    script.onerror = () => finish(new Error('term download'));
    document.head.append(script);
  }).finally(() => pendingTerms.delete(id));
  pendingTerms.set(id, pending);
  return pending;
}

let playingPrompt;

function plainRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cleanState(raw) {
  if (!plainRecord(raw)) return {};
  const clean = {};
  const recentTerm = termForLesson(raw.last);
  if (recentTerm) clean.last = raw.last;
  clean.lastByTerm = {};
  if (recentTerm) clean.lastByTerm[recentTerm] = raw.last;
  if (plainRecord(raw.lastByTerm)) {
    for (const [term, id] of Object.entries(raw.lastByTerm)) {
      if (termForLesson(id) === term) clean.lastByTerm[term] = id;
    }
  }
  for (const entry of legacy) {
    if (plainRecord(raw[entry.id])) clean[entry.id] = raw[entry.id];
  }
  for (const key of ['viewed', 'practiced', 'checked', 'reviewed', 'reviewOpen', 'titles', 'notes', 'reviews', 'projects', 'guesses', 'activities']) {
    if (!plainRecord(raw[key])) continue;
    clean[key] = Object.fromEntries(Object.entries(raw[key]).filter(([id, value]) => {
      if (!termForLesson(id)) return false;
      if (key === 'titles') return typeof value === 'string' && value.trim() && value.length <= 100;
      if (key === 'reviewOpen') return typeof value === 'boolean';
      return true;
    }));
  }
  return clean;
}

function temporaryProgressStore() {
  const state = {};
  return {
    state,
    current: () => state,
    refresh() {},
    save() { throw new Error('progress store unavailable'); },
    importBackup(raw) {
      Object.assign(state, cleanState(raw));
      return { persisted: false, conflicts: 0 };
    },
  };
}

function saveState() {
  try {
    progress.save();
    showStorageStatus(true);
    return true;
  } catch {
    showStorageStatus(false);
    return false;
  }
}

function showStorageStatus(saved) {
  const status = document.querySelector('#storage-status');
  status.hidden = saved;
  if (!saved) status.textContent = '浏览器暂时无法保存。可以继续做，想留住记录时可从学习入口下载一份。';
}

function saveActivityField(id, field, value, index) {
  const previous = plainRecord(state.activities?.[id]) ? state.activities[id] : {};
  const record = { ...previous };
  if (field === 'draft' && Number.isInteger(index) && index >= 0) {
    const draft = Array.isArray(previous.draft) ? [...previous.draft] : [];
    draft[index] = value;
    record.draft = draft;
  } else {
    record[field] = value;
  }
  state.activities = { ...state.activities, [id]: record };
  return saveState();
}

function activityDraftHistory(id) {
  const history = progress.current().activities?.[id]?.draftHistory;
  return (Array.isArray(history) ? history : []).filter(item =>
    Array.isArray(item?.draft) && Number.isFinite(item.time) && item.time > 0 && item.time <= 8640000000000000);
}

function escape(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function latestTransferStatus(id) {
  const saved = state.activities?.[id];
  const task = typeof bioObservationChecks !== 'undefined' && bioObservationChecks[id]?.review;
  if (!task) return saved?.transferStatus;
  const attempt = saved?.transferEvidence;
  if (attempt?.task !== task.id) {
    return state.viewed?.[id] || Object.hasOwn(state.reviewed ?? {}, id) ? 'pending' : null;
  }
  if (attempt.phase === 'done' && attempt.outcome === 'correct') {
    return attempt.usedHelp ? 'supported' : 'independent';
  }
  return attempt.hadError ? 'retry' : 'pending';
}

function updateDirectory() {
  const transferLabels = {
    independent: '新材料独立答对',
    supported: '提示或重试后答对',
    retry: '新材料待重试',
    pending: '新材料待核对',
  };
  for (const link of document.querySelectorAll('a[data-entry-id]')) {
    const id = link.dataset.entryId;
    const draft = state.projects?.[id]?.draft ?? state.activities?.[id]?.draft;
    const hasDraft = draft && Object.values(draft).some(value => Array.isArray(value) ? value.length > 0 :
      typeof value === 'string' ? Boolean(value.trim()) : Boolean(value));
    const transfer = latestTransferStatus(id);
    const learning = Object.hasOwn(transferLabels, transfer) ? transferLabels[transfer]
      : state.reviewed?.[id] === true ? '旧复习已答对 · 首答未记录'
      : state.reviewed?.[id] === false ? '新材料待重试'
      : state.checked?.[id] || state.practiced?.[id] ? '做过课内练习 · 新材料待核对'
      : state.viewed?.[id] || state[id] ? '看过 · 新材料待核对' : '';
    link.querySelector('.directory-status').textContent = [learning, hasDraft ? '有草稿' : ''].filter(Boolean).join(' · ');
  }
}

function renderCatalogue(entries, firstToStudy) {
  function group(items, key) {
    const groups = new Map();
    for (const item of items) {
      if (!groups.has(item[key])) groups.set(item[key], []);
      groups.get(item[key]).push(item);
    }
    return groups;
  }
  const units = group(entries, 'unit');
  return [...units].map(([unit, lessons]) => `<section class="unit">
    <h2>${escape(unit)}</h2>
    ${[...group(lessons, 'chapter')].map(([chapter, list]) => `<div class="directory-chapter">
      <h3>${escape(chapter)}</h3>
      ${list.map(entry => `<a href="${route(entry.id)}" data-entry-id="${entry.id}" ${entry.project ? 'data-project' : ''} ${entry === firstToStudy ? 'data-directory-start' : ''}>
        <span>${escape(entry.title)}${entry.project ? ' <small>项目实践</small>' : ''}</span><small class="directory-status"></small><span class="chapter-page">第 ${entry.page} 页</span>
      </a>`).join('')}
    </div>`).join('')}
  </section>`).join('');
}

function markPracticed(entry) {
  if (!state.practiced?.[entry.id]) {
    state.practiced = { ...state.practiced, [entry.id]: true };
    saveState();
  }
}

function markReviewAttempt(entry, correct, independent) {
  const note = outlet.querySelector('[data-review-note]');
  if (note && correct) note.hidden = false;
  const reviewed = state.reviewed ?? {};
  const outcome = reviewed[entry.id] === true || correct === true;
  state.reviewed = { ...reviewed, [entry.id]: outcome };
  saveActivityField(entry.id, 'transferStatus', !correct ? 'retry' : independent ? 'independent' : 'supported');
}

function showQuizOutcome(quiz, outcome) {
  quiz.dataset.taskOutcome = outcome;
  quiz.dispatchEvent(new CustomEvent('bio-task-state', { bubbles: true, detail: { outcome } }));
}

const diagramBestChoices = {
  'life-traits': [0, 1],
  levels: [0],
  photosynthesis: [0],
  'human-nutrients': [null, 0],
  'plant-transport': [1],
  'aed-map': [null, 1],
};

function intro(entry, question, description = '') {
  const anchor = entry.anchor || globalThis.bioRevisions?.[entry.id]?.anchor;
  const bookNotes = Array.isArray(anchor) ? anchor : [anchor || entry.title];
  return `<header class="intro">
    <p class="eyebrow">${escape(entry.unit)} · ${escape(entry.chapter)}</p>
    <p class="lesson-name">${entry.project ? '项目实践 · ' : ''}${escape(entry.title)}</p>
    <h1 id="lesson-title" tabindex="-1">${escape(question)}</h1>
    ${description ? `<p class="intro-copy">${escape(description)}</p>` : ''}
    <div class="lesson-tools">
      <details class="book-note"><summary>课本第 ${entry.page} 页起</summary>
        ${bookNotes.map(note => `<p>${escape(note)}</p>`).join('')}
      </details>
      <button type="button" class="text-control review-jump" aria-controls="lesson-review" data-review-jump hidden>换份材料复习 ↓</button>
    </div>
  </header>`;
}

function following(entry) {
  const sequence = courseEntries.get(entry.term);
  const index = sequence.indexOf(entry);
  const next = sequence[index + 1];
  const previous = sequence[index - 1];
  return `<nav class="lesson-next" aria-label="按课本顺序移动">
    ${next ? `<a class="next-lesson" href="${route(next.id)}"><span><small>按课本顺序继续</small><strong>${escape(next.title)}</strong></span><span aria-hidden="true">→</span></a>`
      : `<a class="next-lesson" href="${termRoute(entry.term)}"><span><strong>回到本册目录</strong><small>按课本顺序回看</small></span></a>`}
    ${previous ? `<a class="previous-lesson" href="${route(previous.id)}">← 上一项 · ${escape(previous.title)}</a>` : ''}
  </nav>`;
}

const photographs = {
  onion: { src: './assets/onion.webp', alt: '洋葱表皮实拍，浅色细胞排成一行行，细胞之间有边界。', caption: '洋葱表皮 · 显微实拍' },
  leaf: { src: './assets/leaf.webp', alt: '伊乐藻叶片实拍，许多格子里能看到细小的绿色颗粒。', caption: '伊乐藻叶片 · 显微实拍' },
};
const onionDetail = './assets/onion-detail.webp';

function setCanvasSize(canvas, width, height) {
  const ratio = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext('2d');
  ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
  return ctx;
}

function renderDiagramSection(stage, index) {
  return `<section class="${index ? 'transfer' : 'experiment'}" aria-labelledby="scene-${index}">
    <header class="section-heading"><h2 id="scene-${index}">${escape(stage.heading)}</h2></header>
    <div class="station" data-scene="${index}">
      <figure class="specimen diagram-panel">
        <ul class="diagram-items"></ul>
        <p class="scene-description" hidden></p>
        <figcaption>教学示意 · ${escape(stage.caption)}</figcaption>
      </figure>
      <div class="controls">
        <h3 id="prompt-${index}">${escape(stage.prompt)}</h3>
        <p class="feedback" role="status"></p>
        <div class="choice-row" role="group" aria-labelledby="prompt-${index}">
          ${stage.choices.map((choice, option) => `<button type="button" class="choice" data-choice="${option}" aria-pressed="false">${escape(choice.label)}</button>`).join('')}
          <button type="button" class="choice unsure-choice" data-unsure aria-pressed="false">还不确定</button>
        </div>
        <button type="button" class="action" data-reveal>看看记录</button>
        <button type="button" class="text-control" data-rethink hidden>换个想法再看</button>
      </div>
    </div>
  </section>`;
}

function alignEvidence(host, control) {
  if (!matchMedia('(max-width: 560px), (max-height: 465px)').matches) return;
  requestAnimationFrame(() => {
    if (!host.isConnected) return;
    const chart = host.querySelector('.scene-illustration, .diagram-items').getBoundingClientRect();
    const feedback = host.querySelector('.feedback').getBoundingClientRect();
    const available = Math.min(window.innerHeight, window.visualViewport?.height || Infinity);
    const bottom = Math.max(feedback.bottom, control?.getBoundingClientRect().bottom || 0);
    const maximum = chart.top - 6;
    const minimum = bottom - available + 6;
    const shift = maximum >= minimum ? Math.max(minimum, Math.min(0, maximum)) : maximum;
    if (Math.abs(shift) > 2) scrollBy({top: shift, behavior: 'instant'});
  });
}

function observePhoto(item, photo, onAvailability) {
  const image = new Image();
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'photo-retry';
  retry.textContent = '照片暂不可见 · 重试';
  retry.hidden = true;
  image.alt = photo.alt;
  image.loading = 'lazy';
  image.decoding = 'async';
  let retries = 0;
  image.addEventListener('error', () => {
    image.hidden = true;
    retry.hidden = false;
    retry.setAttribute('aria-label', '重试照片：' + photo.caption);
    onAvailability(false);
  });
  image.addEventListener('load', () => {
    const returnFocus = document.activeElement === retry;
    image.hidden = false;
    retry.hidden = true;
    onAvailability(true);
    if (returnFocus) {
      const figure = item.closest('figure');
      if (figure) {
        figure.tabIndex = -1;
        figure.focus({ preventScroll: true });
      }
    }
  });
  retry.addEventListener('click', () => {
    image.src = photo.src + '?retry=' + ++retries;
  });
  image.src = photo.src;
  item.append(image, retry);
}

function mountDiagram(entry, stage, index) {
  const host = outlet.querySelector(`[data-scene="${index}"]`);
  const board = host.querySelector('.diagram-items');
  const feedback = host.querySelector('[role=status]');
  const buttons = [...host.querySelectorAll('[data-choice]')];
  const unsure = host.querySelector('[data-unsure]');
  const reveal = host.querySelector('[data-reveal]');
  const rethink = host.querySelector('[data-rethink]');
  const records = plainRecord(state.guesses?.[entry.id]) ? state.guesses[entry.id] : {};
  const record = plainRecord(records[index]) ? {...records[index]} : { guess: null, first: null, revealed: false };
  // Imported selections may predate the current set of choices.
  const isGuess = value => value === 'unsure' || (Number.isInteger(value) && Boolean(stage.choices[value]));
  if (!isGuess(record.guess)) record.guess = null;
  if (!isGuess(record.first)) record.first = null;
  const needScene = stage.scene || ['plant-transport', 'photosynthesis', 'human-transport', 'aed-map'].includes(entry.id);
  const scene = needScene && typeof globalThis.paintBioScene === 'function'
    ? document.createElement('canvas') : null;
  let revision = 0;
  if (scene) {
    scene.className = 'scene-illustration';
    scene.setAttribute('aria-hidden', 'true');
    board.before(scene);
    board.classList.add('diagram-labels');
  }

  function save() {
    records[index] = record;
    state.guesses = { ...state.guesses, [entry.id]: records };
    saveState();
  }

  function redraw() {
    const displayRevision = ++revision;
    const choice = record.revealed ? stage.choices[record.guess] : null;
    const alternate = record.revealed && stage.choices[stage.revealChoice];
    const items = choice?.items || (record.revealed && stage.revealItems) || alternate?.items || stage.items;
    const description = choice?.description || (record.revealed && stage.revealDescription) || alternate?.description || stage.description;
    const unavailable = new Set();
    const message = choice?.feedback || (record.revealed ? stage.revealFeedback || alternate?.feedback || '在图里找一条能支持判断的记录。'
      : record.guess === null ? '' : '记下了。打开记录核对。');
    const first = stage.choices[record.first]?.label || (record.first === 'unsure' ? '还不确定' : '');
    const revised = record.revealed && first && record.first !== record.guess && choice;
    const best = diagramBestChoices[entry.id]?.[index] ?? stage.revealChoice;
    const leading = !choice || !Number.isInteger(best) ? '' : record.guess === best
      ? '你选的线索能回答这次的问题。' : '你选的线索还不够。';
    const explanation = leading ? message.replace(/^(这条记录还不够。|观察和你的猜想一致。)/, '') : message;
    const checkedMessage = `${revised ? `起先选了「${first}」。` : ''}${leading}${explanation}`;
    feedback.textContent = checkedMessage;
    function available(position, ok) {
      if (displayRevision !== revision) return;
      if (ok) unavailable.delete(position);
      else unavailable.add(position);
      feedback.textContent = unavailable.size
        ? '有照片暂不可见。请重试，图下的文字是材料记录，不能当作你已经亲眼观察到的结果。'
        : checkedMessage;
    }
    board.replaceChildren(...items.map(([kind, label], position) => {
      const item = document.createElement('li');
      item.dataset.focus = String(choice?.focus?.includes(position) === true);
      if (!scene && kind.endsWith('-photo') && photographs[kind.slice(0, -6)]) {
        observePhoto(item, photographs[kind.slice(0, -6)], ok => available(position, ok));
      } else if (!scene && typeof globalThis.paintBioDiagram === 'function') {
        const drawing = document.createElement('canvas');
        drawing.setAttribute('aria-hidden', 'true');
        drawing.style.aspectRatio = '192 / 138';
        globalThis.paintBioDiagram(setCanvasSize(drawing, 192, 138), kind);
        item.append(drawing);
      }
      const text = document.createElement('span');
      text.textContent = label;
      item.append(text);
      return item;
    }));
    if (scene) {
      scene.style.aspectRatio = '560 / 204';
      const sceneChoice = choice ? choice.scene ?? record.guess : record.revealed ? stage.revealScene ?? stage.revealChoice ?? null : null;
      globalThis.paintBioScene(setCanvasSize(scene, 560, 204), entry.id, index, sceneChoice);
    }
    const text = host.querySelector('.scene-description');
    text.textContent = description || '';
    text.hidden = !description;
    text.classList.toggle('sr-only', needScene ? Boolean(scene) : typeof globalThis.paintBioDiagram === 'function');
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === record.guess)));
    unsure.setAttribute('aria-pressed', String(record.guess === 'unsure'));
    reveal.hidden = record.revealed === true;
    rethink.hidden = record.revealed !== true;
  }

  function choose(value) {
    record.guess = value;
    if (record.first === null || record.first === undefined) record.first = value;
    save();
    redraw();
    if (record.revealed) alignEvidence(host, value === 'unsure' ? unsure : buttons[value]);
  }
  buttons.forEach((button, option) => button.addEventListener('click', () => choose(option)));
  unsure.addEventListener('click', () => choose('unsure'));
  reveal.addEventListener('click', () => {
    record.revealed = true;
    state.checked = { ...state.checked, [entry.id]: true };
    save();
    redraw();
    rethink.focus({ preventScroll: true });
    alignEvidence(host, rethink);
  });
  rethink.addEventListener('click', () => {
    record.guess = null;
    record.revealed = false;
    save();
    redraw();
    buttons[0].focus({ preventScroll: true });
  });
  redraw();
}

function renderDiagramLesson(entry, data) {
  const demo = renderDiagramSection(data.stages[0], 0);
  const transfer = `<details class="more-activity"><summary>再看一份材料</summary>${renderDiagramSection(data.stages[1], 1)}</details>`;
  const workshop = entry.project && typeof renderProjectLab === 'function' ? renderProjectLab(entry) : '';
  outlet.innerHTML = intro(entry, data.question) + (workshop
    ? workshop + `<details class="more-activity project-examples"><summary>需要时看一个例子</summary>${demo}${transfer}</details>`
    : demo + transfer) + renderLearningAdditions(entry, data.summary, data.outside) + following(entry);
  data.stages.forEach((stage, index) => mountDiagram(entry, stage, index));
  if (entry.project && typeof mountProjectLab === 'function') mountProjectLab(entry);
  mountLearningAdditions(entry);
}

function renderWorkedExample(text) {
  return `<details class="flow-worked-example" data-flow-example hidden><summary>看一次示范</summary>
    <p>${escape(text)}</p><p>可以照这个顺序想，再选一次。</p></details>`;
}

function lessonQuiz(entry, name) {
  const focused = name === 'transfer' && globalThis.bioLessonPractice?.[entry.id]?.transfer;
  if (!focused) return globalThis.bioRevisions?.[entry.id]?.[name];
  return {
    question: focused.prompt,
    options: focused.options.map(([label]) => label),
    correct: [focused.answer],
    feedbackByOption: focused.options.map(([, feedback]) => feedback),
    explain: focused.options[focused.answer][1],
  };
}

function renderQuiz(name, activity, photoStation = false) {
  const title = name === 'evidence' ? '从材料里找线索' : '换个例子再试';
  const multiple = activity.correct.length > 1;
  return `<section class="quick-check" data-quiz="${name}" aria-labelledby="${name}-title">
    <header class="quiz-head"><h3 id="${name}-title">${title}</h3></header>
    <fieldset><legend>${escape(activity.question)}</legend>
      ${multiple ? '<p class="quiz-instruction">选出 ' + activity.correct.length + ' 条线索，再一起核对。</p>' : ''}
      <div class="check-options">${activity.options.map((label, i) =>
        `<button type="button" data-answer="${i}" aria-pressed="false">${multiple
          ? `<span class="flow-option-mark" aria-hidden="true"></span><span class="flow-option-letter" aria-hidden="true">${String.fromCharCode(65 + i)}</span>` : ''}${escape(label)}</button>`).join('')}
      </div>
    </fieldset>
    ${multiple ? '<button type="button" class="action" data-check disabled>核对线索</button>' : ''}
    <p class="feedback" role="status" tabindex="-1"></p>
    ${photoStation ? '<button type="button" class="text-control" data-cell-find-evidence hidden></button>' : ''}
    <button type="button" class="text-control" data-review-evidence hidden>先看线索</button>
    <button type="button" class="text-control" data-quiz-hint hidden>给一点提示</button>
    ${renderWorkedExample(activity.explain)}
  </section>`;
}

function renderEvidenceChallenge(entry) {
  if (entry.id === 'plant-transport') return `<details class="more-activity" data-xylem-detail><summary>看看实拍里的导管</summary>
    <figure class="xylem-photo"><div data-xylem-photo></div><figcaption>另一份芹菜材料的显微实拍。蓝色的螺旋纹是导管壁上的结构，可帮助辨认导管。</figcaption></figure>
    <p class="credit">Tmatheus · <a href="https://commons.wikimedia.org/wiki/File:Helical_Protoxylem_of_Celery.png" target="_blank" rel="noopener">显微照片原作</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>，缩小并转为 WebP。</p></details>`;
  if (entry.id === 'research-methods') return `<section class="quick-check">
    <h3>只算新长的部分</h3><p>甲豆苗周一高 4 厘米，周四高 6 厘米。它长高了多少？</p>
    <figure class="flow-readings" aria-label="从同一基线比较甲豆苗两次高度">
      <div><span>周一</span><span class="flow-reading-track" aria-hidden="true"><i style="--height-share: 66.6667%"></i></span><strong>4 厘米</strong></div>
      <div><span>周四</span><span class="flow-reading-track" aria-hidden="true"><i style="--height-share: 100%"></i></span><strong>6 厘米</strong></div>
    </figure>
    <form data-difference class="numeric-reading"><label for="height-difference">新增</label><input id="height-difference" type="number" min="0" inputmode="numeric" step="1" required><span>厘米</span><button type="submit">核对</button></form>
    <p class="feedback" role="status"></p></section>`;
  if (entry.id !== 'human-transport') return '';
  return `<section class="quick-check" data-route-practice>
    <h3>接上回心脏的路</h3><p>血液刚经过脚趾的毛细血管。按它接下来经过的顺序，点出两段路。</p>
    <div class="choice-row"><button type="button" data-step="atrium">右心房</button><button type="button" data-step="vein">静脉</button><button type="button" data-step="artery">动脉</button></div>
    <p class="route-order" aria-live="polite">脚趾的毛细血管 → …</p>
    <button type="button" data-reset-route hidden>重新接这段路</button><p class="feedback" role="status"></p></section>`;
}

function mountEvidenceChallenge(entry) {
  const xylem = outlet.querySelector('[data-xylem-detail]');
  if (xylem) xylem.addEventListener('toggle', () => {
    const photo = xylem.querySelector('[data-xylem-photo]');
    if (xylem.open && !photo.firstChild) observePhoto(photo, {
      src: './assets/celery-xylem.webp', alt: '淡色背景上一段蓝染的螺旋导管壁。', caption: '芹菜导管的显微照片',
    }, () => {});
  });
  const form = outlet.querySelector('[data-difference]');
  if (form) form.addEventListener('submit', event => {
    event.preventDefault();
    const measured = form.querySelector('input').valueAsNumber;
    form.nextElementSibling.textContent = measured === 2 ? '对。6 减 4，甲豆苗新增了 2 厘米。' : '再看两个读数。新增的长度是后一次减去前一次。';
    if (measured === 2) markPracticed(entry);
  });
  const task = outlet.querySelector('[data-route-practice]');
  if (!task) return;
  const choices = [...task.querySelectorAll('[data-step]')];
  const reset = task.querySelector('[data-reset-route]');
  const order = [];
  function update() {
    task.querySelector('.route-order').textContent = '脚趾的毛细血管 → ' + (order.map(step => step.textContent).join(' → ') || '…');
    const finished = order.length === 2;
    const correct = finished && order[0].dataset.step === 'vein' && order[1].dataset.step === 'atrium';
    task.querySelector('.feedback').textContent = !finished ? '' : correct
      ? '接上了。经过脚趾组织后，血液沿静脉回到右心房。'
      : '留意箭头的方向。题目问的是经过脚趾以后，怎么回到心脏。';
    reset.hidden = order.length === 0;
    choices.forEach(button => { button.disabled = order.includes(button) || finished; });
    if (correct) markPracticed(entry);
  }
  choices.forEach(button => button.addEventListener('click', () => {
    order.push(button);
    update();
    (choices.find(choice => !choice.disabled) || reset).focus({ preventScroll: true });
  }));
  reset.addEventListener('click', () => { order.length = 0; update(); choices[0].focus({ preventScroll: true }); });
}

function renderReviewNote(entry) {
  const hasNote = typeof state.notes?.[entry.id] === 'string' && state.notes[entry.id].trim();
  return `<details class="review-note" data-review-note ${hasNote ? 'open' : state.reviewed?.[entry.id] === true ? '' : 'hidden'}>
    <summary>写一句我的理由（可选）</summary>
    <label class="sr-only" for="evidence-note">用自己的话说说线索</label>
    <textarea id="evidence-note" rows="2" maxlength="400" placeholder="我看到……，所以我暂时认为……"></textarea>
    <p class="note-status" role="status"></p>
  </details>`;
}

function setupLessonReview(entry, restorePosition) {
  const review = outlet.querySelector('#lesson-review');
  const jump = outlet.querySelector('[data-review-jump]');
  if (!review || !jump) return false;
  const summary = review.querySelector('summary');
  const note = review.querySelector('#evidence-note');
  const status = review.querySelector('.note-status');
  note.value = typeof state.notes?.[entry.id] === 'string' ? state.notes[entry.id] : '';
  note.addEventListener('input', () => {
    state.notes = { ...state.notes, [entry.id]: note.value };
    status.textContent = saveState() ? '已保存在这台设备。' : '这句话目前留在本页，可以复制带走。';
  });

  function remember(open) {
    const historyRoute = history.state?.biologyRoute;
    if (historyRoute?.hash === location.hash && historyRoute.reviewOpen !== open) {
      try {
        history.replaceState({ ...history.state, biologyRoute: { ...historyRoute, reviewOpen: open } }, '');
      } catch {
        // The local progress still stores the last deliberate action.
      }
    }
    if (Boolean(state.reviewOpen?.[entry.id]) !== open) {
      state.reviewOpen = { ...state.reviewOpen, [entry.id]: open };
      saveState();
    }
  }

  function scrollToReview() {
    const target = review.closest('.flow-pane')?.querySelector('[data-observation-check="review"] h2, [data-review-content]:not([hidden]) h2, [data-quiz="transfer"]:not([hidden]) legend') || summary;
    target.tabIndex = -1;
    target.scrollIntoView({ block: 'start', behavior: 'instant' });
    target.focus({ preventScroll: true });
  }

  jump.hidden = false;
  jump.addEventListener('click', () => {
    if (typeof showLessonFlowFor === 'function') showLessonFlowFor(review);
    review.open = true;
    remember(true);
    scrollToReview();
  });
  if (restorePosition) review.open = true;
  review.addEventListener('toggle', () => {
    if (review.isConnected) remember(review.open);
  });
  return restorePosition;
}

function renderLearningAdditions(entry, summary = '', outside = '') {
  const data = globalThis.bioRevisions?.[entry.id];
  if (!data) return summary ? `<section class="reflection"><h2>学到了什么</h2><p>${escape(summary)}</p></section>` : '';
  const transfer = lessonQuiz(entry, 'transfer');
  return `<section class="learning-zone">
    <section class="concept-summary"><h2>用一句话连回课本</h2>
      <p>${escape(data.concept || summary)}</p>
    </section>
    ${data.evidence ? renderQuiz('evidence', data.evidence, entry.id === 'cell') : ''}
    ${renderEvidenceChallenge(entry)}
    ${transfer ? `<details class="more-activity transfer-practice" id="lesson-review"><summary>换份材料复习</summary>${renderQuiz('transfer', transfer)}${renderReviewNote(entry)}</details>` : ''}
    ${outside ? `<p class="outside">${escape(outside)}</p>` : ''}
  </section>`;
}

function mountLearningAdditions(entry) {
  const data = globalThis.bioRevisions?.[entry.id];
  if (!data) return;
  mountEvidenceChallenge(entry);
  for (const name of ['evidence', 'transfer']) {
    const section = outlet.querySelector(`[data-quiz="${name}"]`);
    if (!section) continue;
    const activity = lessonQuiz(entry, name);
    const options = [...section.querySelectorAll('[data-answer]')];
    const feedback = section.querySelector('.feedback');
    const checkButton = section.querySelector('[data-check]');
    const evidenceButton = section.querySelector('[data-cell-find-evidence]');
    const sourceButton = section.querySelector('[data-review-evidence]');
    const hintButton = section.querySelector('[data-quiz-hint]');
    const example = section.querySelector('[data-flow-example]');
    const answerKey = name === 'transfer' && globalThis.bioLessonPractice?.[entry.id]?.transfer ? 'focusedTransfer' : name;
    const checkedKey = answerKey + 'Checked';
    const consultationKey = answerKey + 'Consulted';
    const checkedConsultationKey = answerKey + 'ConsultedWhenChecked';
    const firstCheckKey = answerKey + 'FirstCorrect';
    function rememberReview(fields) {
      const record = { ...state.reviews?.[entry.id], ...fields };
      state.reviews = { ...state.reviews, [entry.id]: record };
      saveState();
    }
    const hasSource = typeof bindReviewEvidence === 'function' &&
      bindReviewEvidence(entry, sourceButton, () => rememberReview({ [consultationKey]: true }));
    const previous = state.reviews?.[entry.id]?.[answerKey];
    const chosen = new Set(Array.isArray(previous) ? previous.filter(value => options.some(option => option.dataset.answer === value)) : []);

    function updateChoices() {
      for (const option of options) option.setAttribute('aria-pressed', String(chosen.has(option.dataset.answer)));
      if (checkButton) checkButton.disabled = !chosen.size;
    }

    function updateActions(outcome, specificEvidence = false, needsPhoto = false) {
      sourceButton.hidden = !hasSource || specificEvidence || outcome === 'correct';
      hintButton.hidden = hasSource || specificEvidence || outcome === 'correct';
      if (evidenceButton) {
        evidenceButton.hidden = !specificEvidence;
        evidenceButton.classList.toggle('action', needsPhoto);
        evidenceButton.classList.toggle('text-control', !needsPhoto);
      }
      if (checkButton) checkButton.hidden = outcome === 'correct';
      checkButton?.classList.toggle('action', outcome === 'ready');
      example.hidden = outcome !== 'retry' || needsPhoto;
      showQuizOutcome(section, outcome);
    }

    function showReady() {
      delete section.dataset.result;
      feedback.textContent = '';
      updateActions('ready');
    }

    updateChoices();
    showReady();
    options.forEach(button => button.addEventListener('click', () => {
      const value = button.dataset.answer;
      if (!checkButton) {
        chosen.clear();
        chosen.add(value);
      } else {
        if (chosen.has(value)) chosen.delete(value);
        else chosen.add(value);
      }
      updateChoices();
      rememberReview({
        [answerKey]: [...chosen], [checkedKey]: false,
        ...(evidenceButton ? { cellEvidenceChecked: false } : {}),
      });
      if (!checkButton) {
        check();
        if (typeof keepActivityFeedbackVisible === 'function') keepActivityFeedbackVisible(button, feedback);
      } else {
        showReady();
      }
    }));
    function check(remember = true) {
      if (!chosen.size) return;
      const correct = activity.correct.length === chosen.size && activity.correct.every(i => chosen.has(String(i)));
      if (remember && correct && entry.id === 'research-methods' && name === 'evidence') {
        const reading = section.closest('.flow-pane')?.querySelector('[data-difference]')?.closest('details');
        if (reading) reading.open = true;
      }
      const selected = [...chosen].map(Number);
      const option = selected[0];
      const wrong = selected.filter(index => !activity.correct.includes(index));
      const remaining = activity.correct.filter(index => !selected.includes(index)).length;
      const explanation = correct
        ? activity.feedbackByOption?.[option] ?? activity.explain
        : wrong.map(index => activity.feedbackByOption?.[index] ?? activity.explain).join(' ')
          + (activity.correct.length > 1 && remaining ? '还少 ' + remaining + ' 条可配对的记录。' : '');
      const photoUnavailable = evidenceButton && Boolean(outlet.querySelector('.cell-samples [data-image-status="failed"]'));
      const hasPhotoEvidence = evidenceButton && state.cell?.observations?.leaf === 1;
      const needsPhoto = Boolean(correct && evidenceButton && !hasPhotoEvidence && !photoUnavailable);
      const qualifier = photoUnavailable ? '照片暂不可见，这次可根据文字记录判断。'
        : needsPhoto ? '选择和记录相符。试着回图指出绿点。' : '';
      section.dataset.result = correct ? 'correct' : 'retry';
      const result = correct ? (qualifier || '答对了。') : '还需对照。' + qualifier;
      const review = state.reviews?.[entry.id];
      const firstCheck = review?.[firstCheckKey] ?? (remember ? correct : undefined);
      const consulted = Boolean(review?.[remember ? consultationKey : checkedConsultationKey]);
      const independent = !consulted && firstCheck === true && (
        state.activities?.[entry.id]?.transferStatus === 'independent' ||
        remember && !Object.hasOwn(state.reviewed ?? {}, entry.id)
      );
      feedback.textContent = result + explanation + (correct && typeof firstCheck === 'boolean'
        ? consulted ? ' 回看材料后核对正确。'
          : name === 'transfer' ? independent ? ' 新材料首次独立答对。' : ' 已核对正确。'
          : firstCheck ? ' 首次核对正确。' : ' 反馈后改对。'
        : '');
      if (evidenceButton) {
        evidenceButton.textContent = ['回看照片比例 ↑', '在照片中找绿点 ↑', '对照细胞结构示意 ↑'][option];
      }
      updateActions(correct && !needsPhoto ? 'correct' : 'retry', Boolean(evidenceButton && (!correct || needsPhoto)), needsPhoto);
      if (!remember) return;
      rememberReview({ [checkedKey]: true, [firstCheckKey]: firstCheck, [checkedConsultationKey]: consulted });
      if (name === 'transfer') {
        markReviewAttempt(entry, correct, independent);
      } else {
        state.checked = { ...state.checked, [entry.id]: true };
        if (correct && hasPhotoEvidence) markPracticed(entry);
        saveState();
      }
    }
    hintButton.addEventListener('click', () => {
      rememberReview({ [consultationKey]: true });
      feedback.textContent = activity.hint || '先找一条能回答问题的观察记录。';
    });
    if (evidenceButton) {
      const back = outlet.querySelector('[data-cell-back-to-quiz]');
      const model = outlet.querySelector('[data-cell-model]');
      let returnScroll = 0;
      function focusCellEvidence(target) {
        if (typeof showLessonFlowFor === 'function') showLessonFlowFor(target, { temporary: true });
        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
      evidenceButton.addEventListener('click', () => {
        rememberReview({ [consultationKey]: true });
        returnScroll = scrollY;
        back.hidden = false;
        if (chosen.has('2')) {
          model.open = true;
          focusCellEvidence(model.querySelector('summary'));
        } else if (chosen.has('0')) {
          focusCellEvidence(outlet.querySelector('[data-cell-scale]'));
        } else {
          const leaf = outlet.querySelector('[data-sample="leaf"]');
          leaf.click();
          focusCellEvidence(leaf);
        }
      });
      back.addEventListener('click', () => {
        back.hidden = true;
        if (typeof showLessonFlowFor === 'function') showLessonFlowFor(section);
        check(false);
        const target = evidenceButton.hidden ? section.querySelector('[aria-pressed="true"]') || feedback : evidenceButton;
        target.focus({ preventScroll: true });
        scrollTo({ top: returnScroll, behavior: 'instant' });
      });
    }
    if (state.reviews?.[entry.id]?.[checkedKey] ||
        evidenceButton && state.reviews?.[entry.id]?.cellEvidenceChecked) check(false);
    checkButton?.addEventListener('click', event => {
      check();
      if (checkButton.hidden) {
        feedback.focus({ preventScroll: true });
        feedback.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      } else if (typeof keepActivityFeedbackVisible === 'function') keepActivityFeedbackVisible(event.currentTarget, feedback);
    });
  }
}

function downloadProgress() {
  const blob = new Blob([JSON.stringify({ version: 1, progress: progress.current() }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: '生物实验台学习记录.json' });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderHome() {
  document.title = '生物实验台 · 北京版初中生物';
  const lastTerm = termsById.get(termForLesson(state.last));
  const last = entriesById.get(state.last);
  const savedTitle = last?.title || state.titles?.[state.last];
  outlet.innerHTML = `<section class="course-hub">
    <header class="hub-intro">
      <h1 id="lesson-title" tabindex="-1">${lastTerm ? '继续上次的学习' : '选一本生物课本'}</h1>
    </header>
    ${lastTerm ? `<nav class="lesson-next hub-resume" aria-label="继续学习"><a class="next-lesson" href="${route(state.last)}" data-resume-lesson="${state.last}">
      <span><small>${lastTerm.title}${state.reviewOpen?.[state.last] === true ? ' · 继续复习' : ''}</small><strong data-resume-title>${escape(savedTitle || '回到上次那一课')}</strong></span><span aria-hidden="true">→</span>
    </a></nav>` : ''}
    ${lastTerm ? '<h2 class="term-picker-title">按学期找课</h2>' : ''}
    <div class="term-grid" aria-label="四册课本">
      ${terms.map(term => `<a href="${termRoute(term.id)}" class="term-card">
        <span class="term-card-copy"><strong>${term.title}</strong><span>${term.theme} · ${term.count} 项</span></span><span aria-hidden="true">→</span>
      </a>`).join('')}
    </div>
  </section>
  <details class="more-activity progress-tools"><summary>学习记录备份</summary>
    <p>记录保存在当前浏览器。下载后，可以在另一台设备打开同一网站导入。</p>
    <button type="button" data-export>下载记录</button>
    <label for="progress-import">导入以前的记录</label>
    <input type="file" id="progress-import" accept=".json,application/json">
    <p role="status" data-import-result></p>
  </details>`;
  // Backups from before titles were saved can recover the name without loading other books.
  if (lastTerm && !savedTitle) {
    const id = state.last;
    const titleLabel = outlet.querySelector('[data-resume-title]');
    loadTerm(lastTerm.id).then(() => {
      const title = entriesById.get(id)?.title;
      if (!title || !titleLabel?.isConnected || state.last !== id) return;
      titleLabel.textContent = title;
      state.titles = { ...state.titles, [id]: title };
      saveState();
    }).catch(() => {});
  }
  outlet.querySelector('[data-export]').addEventListener('click', downloadProgress);
  outlet.querySelector('#progress-import').addEventListener('change', async event => {
    const picker = event.currentTarget;
    const feedback = outlet.querySelector('[data-import-result]');
    const file = picker.files[0];
    if (!file) return;
    try {
      if (file.size > backupSizeLimit) throw new Error('size');
      const saved = JSON.parse(await file.text());
      if (saved.version !== 1 || !plainRecord(saved.progress)) throw new Error('format');
      const { persisted, conflicts } = progress.importBackup(saved.progress);
      showStorageStatus(persisted);
      if (!picker.isConnected) return;
      renderHome();
      updateDirectory();
      outlet.querySelector('.progress-tools').open = true;
      const message = persisted ? '记录已导入。' : '记录已在本页打开，浏览器暂时无法保存。';
      outlet.querySelector('[data-import-result]').textContent = message +
        (conflicts ? `有 ${conflicts} 项草稿同时有两份内容。可以在课内的草稿历史查看另一份。` : '');
    } catch {
      feedback.textContent = '这份文件读不了。请选择从生物实验台下载的 JSON 记录。';
    }
  });
}

function renderTerm(term, entries) {
  document.title = term.title + ' · 生物实验台';
  const recent = entriesById.get(state.lastByTerm?.[term.id]);
  const last = recent?.term === term.id ? recent : null;
  const reviewing = last && state.reviewOpen?.[last.id] === true;
  const practiceCount = entries.filter(entry => Object.hasOwn(state.reviewed ?? {}, entry.id)).length;
  const resumeQuestion = last && (globalThis.bioLessonPractice?.[last.id]?.prompt
    || globalThis.bioOpeningSeven?.[last.id]?.[0] || globalThis.bioOpeningEight?.[last.id]?.[0]);
  outlet.innerHTML = `<section class="term-page">
    <header class="intro">
      <h1 id="lesson-title" tabindex="-1">${term.title}</h1>
      <p class="intro-copy">${term.theme}</p>
    </header>
    <div class="directory-layout">
      <aside class="directory-overview" aria-label="本册学习概况">
        <h2>本册目录</h2><p>${entries.length} 项学习内容</p>
        ${practiceCount ? `<p>${practiceCount} 项已试过复习</p>` : ''}
      </aside>
      <div class="directory-lessons">
        ${last ? `<nav class="lesson-next term-start" aria-label="继续读本册"><a class="next-lesson" href="${route(last.id)}" data-resume-lesson="${last.id}">
          <span><small>${reviewing ? '继续上次的复习' : '继续上次'}</small><strong>${escape(last.title)}</strong></span><span aria-hidden="true">→</span>
        </a></nav>${resumeQuestion ? `<p class="directory-question">${escape(resumeQuestion)}</p>` : ''}` : ''}
        <section class="term-contents" aria-label="按课本顺序选课">${renderCatalogue(entries, last ? null : entries[0])}</section>
      </div>
    </div>
  </section>`;
  updateDirectory();
}

function showRecovery({ term, entry, unknown = false } = {}) {
  const missingBook = unknown && location.hash.startsWith('#/term/');
  const title = unknown ? missingBook ? '没找到这一册' : '没找到这一课'
    : entry ? '这节课的材料暂时没载入' : '这册的目录暂时没载入';
  document.title = title + ' · 生物实验台';
  outlet.innerHTML = `<section class="load-panel"><h1 id="lesson-title" tabindex="-1">${title}</h1>
    <p${unknown ? '' : ' role="status"'}>${entry ? `可以先翻纸书第 ${entry.page} 页 · ${escape(entry.title)}。`
      : missingBook ? '回到课本入口可以选学期。' : unknown ? '可以从目录找到要学的课。' : '可以重新载入，或从课本入口选一册。'}</p>
    ${unknown ? '' : '<button type="button" class="action" data-reload>重新载入</button>'}
    ${term ? '' : '<a href="#/">回到全部课本</a>'}
  </section>`;
  outlet.querySelector('[data-reload]')?.addEventListener('click', () => {
    if (entry || term?.id === '7a') location.reload();
    else render(true);
  });
}

function showLocation(term, inLesson) {
  edition.hidden = Boolean(term);
  directoryExit.hidden = !term;
  if (term) {
    directoryExit.href = inLesson ? termRoute(term.id) : '#/';
    directoryExitLabel.textContent = inLesson ? '本册目录' : '全部课本';
  } else {
    directoryExit.removeAttribute('href');
  }
}

function lessonScrollForRoute(lessonId) {
  let entry = history.state?.biologyRoute;
  if (entry?.hash !== location.hash) {
    entry = { hash: location.hash, id: ++nextHistoryId };
    try {
      history.replaceState({ ...history.state, biologyRoute: entry }, '');
    } catch {
      return 0;
    }
  }
  if (historyEntry?.id !== entry.id) {
    if (historyEntry?.lesson) lessonPositions.set(historyEntry.id, scrollY);
    historyEntry = { ...entry, lesson: Boolean(lessonId) };
  }
  return lessonId ? lessonPositions.get(entry.id) || 0 : 0;
}

function finishNavigation(focus, position = 0) {
  if (!focus) return;
  outlet.querySelector('h1')?.focus({ preventScroll: true });
  scrollTo(0, position);
}

function restoreDirectoryPosition(term, lesson) {
  const link = outlet.querySelector(`.term-contents [data-entry-id="${lesson.id}"]`);
  if (!link) return false;
  const remembered = directoryPositions.get(term.id);
  link.focus({ preventScroll: true });
  if (remembered?.id === lesson.id) {
    const targetY = Math.min(remembered.top, Math.max(12, innerHeight - 76));
    scrollBy({ top: link.getBoundingClientRect().top - targetY, behavior: 'instant' });
  } else {
    link.scrollIntoView({ block: 'center', behavior: 'instant' });
  }
  return true;
}

async function render(focus = false) {
  const version = ++routeVersion;
  const previousLesson = renderedLesson;
  renderedLesson = null;
  progress.refresh();
  const hash = location.hash;
  const lessonId = /^#\/lesson\/([^/]+)$/.exec(hash)?.[1];
  const lessonScroll = lessonScrollForRoute(lessonId);
  const historyRoute = history.state?.biologyRoute;
  const reviewing = Boolean(lessonId && (historyRoute?.hash === hash && historyRoute.reviewOpen === true ||
    resumeReviewId === lessonId && state.reviewOpen?.[lessonId] === true));
  resumeReviewId = undefined;
  playingPrompt?.stop();
  const termId = /^#\/term\/(7a|7b|8a|8b)$/.exec(hash)?.[1] || termForLesson(lessonId);
  const term = termsById.get(termId);
  showLocation(term, Boolean(lessonId));
  if (!hash || hash === '#/' || hash === '#lesson' || hash === '#directory') {
    renderHome();
  } else if (!term) {
    showRecovery({ unknown: true });
  } else {
    if (!courseEntries.has(term.id)) {
      outlet.innerHTML = `<section class="load-panel"><h1 id="lesson-title" tabindex="-1">${term.title}</h1><p role="status">正在准备本册的观察材料……</p></section>`;
      finishNavigation(focus);
    }
    let entry;
    try {
      const entries = await loadTerm(term.id);
      if (routeVersion !== version) return;
      if (!lessonId) {
        renderTerm(term, entries);
        if (focus && previousLesson?.term === term.id && restoreDirectoryPosition(term, previousLesson)) return;
      } else {
        entry = entriesById.get(lessonId);
        if (!entry) {
          showRecovery({ term, unknown: true });
        } else {
          renderedLesson = entry;
          state.last = entry.id;
          state.lastByTerm = { ...state.lastByTerm, [term.id]: entry.id };
          state.titles = { ...state.titles, [entry.id]: entry.title };
          state.viewed = { ...state.viewed, [entry.id]: true };
          saveState();
          document.title = entry.title + ' · 生物实验台';
          if (term.id !== '7a') {
            renderTermLesson(entry);
          } else if (entry.id === 'cell') {
            if (typeof renderCell !== 'function') throw new Error('cell');
            renderCell(entry);
          } else {
            const data = lessonData[entry.id];
            if (!data) throw new Error('lesson data');
            renderDiagramLesson(entry, data);
          }
          const hasFlow = typeof mountLessonFlow === 'function' && mountLessonFlow(entry, reviewing);
          const restoreReview = setupLessonReview(entry, !hasFlow && reviewing);
          if (restoreReview && !lessonScroll) {
            requestAnimationFrame(() => {
              if (routeVersion !== version) return;
              const resume = outlet.querySelector('#lesson-review summary');
              resume.scrollIntoView({ block: 'start', behavior: 'instant' });
              if (focus) resume.focus({ preventScroll: true });
            });
          }
        }
      }
    } catch (error) {
      if (routeVersion !== version) return;
      console.warn('Could not render this biology course', term.id, error);
      showRecovery({ term, entry });
    }
  }
  if (routeVersion === version) finishNavigation(focus, renderedLesson ? lessonScroll : 0);
}

outlet.addEventListener('click', event => {
  const resume = event.target.closest('[data-resume-lesson]');
  if (resume && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
    resumeReviewId = resume.dataset.resumeLesson;
  }
  const link = event.target.closest('.term-contents [data-entry-id]');
  if (!link) return;
  const id = link.dataset.entryId;
  const term = termForLesson(id);
  if (term) directoryPositions.set(term, { id, top: Math.max(8, link.getBoundingClientRect().top) });
});
document.querySelector('.skip').addEventListener('click', event => {
  event.preventDefault();
  outlet.scrollIntoView({ block: 'start' });
  outlet.focus({ preventScroll: true });
});
addEventListener('hashchange', () => render(true));
render();

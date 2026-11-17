'use strict';

const outlet = document.querySelector('#lesson');
const directory = document.querySelector('#directory');
const directorySummary = directory.querySelector('summary');
const route = id => '#/lesson/' + id;
const sequence = [...directory.querySelectorAll('a[data-page]')].map(link => ({
  id: link.hash.slice(9),
  title: link.querySelector('span').textContent,
  chapter: link.closest('.directory-chapter').querySelector('h3').textContent,
  unit: link.closest('.unit').querySelector('h2').textContent,
  page: Number(link.dataset.page),
  project: link.hasAttribute('data-project'),
  link,
}));
const byId = new Map(sequence.map(entry => [entry.id, entry]));
const storageKey = 'bio-learning-lab:v1';
const state = readState();
const lessonData = { ...globalThis.bioUnitOne, ...globalThis.bioUnitTwo };
let playingPrompt;

function plainRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cleanState(raw) {
  if (!plainRecord(raw)) return {};
  const clean = {};
  if (byId.has(raw.last)) clean.last = raw.last;
  for (const {id} of sequence) {
    if (plainRecord(raw[id])) clean[id] = raw[id];
  }
  for (const key of ['viewed', 'practiced', 'notes', 'reviews', 'projects', 'guesses']) {
    if (!plainRecord(raw[key])) continue;
    clean[key] = {};
    for (const {id} of sequence) {
      if (Object.hasOwn(raw[key], id)) clean[key][id] = raw[key][id];
    }
  }
  return clean;
}

function readState() {
  try { return cleanState(JSON.parse(localStorage.getItem(storageKey))); }
  catch { return {}; }
}

function saveState() {
  const status = document.querySelector('#storage-status');
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    status.hidden = true;
    return true;
  } catch {
    status.hidden = false;
    status.textContent = '浏览器暂时无法保存。可以继续做，想留住记录时可从学习入口下载一份。';
    return false;
  }
}

function escape(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function updateDirectory(current) {
  for (const entry of sequence) {
    if (entry.id === current) entry.link.setAttribute('aria-current', 'page');
    else entry.link.removeAttribute('aria-current');
    let badge = entry.link.querySelector('.directory-status');
    if (!badge) {
      badge = document.createElement('small');
      badge.className = 'directory-status';
      entry.link.append(badge);
    }
    badge.textContent = state.practiced?.[entry.id] ? '做过练习' : state.viewed?.[entry.id] || state[entry.id] ? '看过' : entry.project ? '项目实践' : '';
  }
}

function markPracticed(entry) {
  if (!state.practiced?.[entry.id]) {
    state.practiced = { ...state.practiced, [entry.id]: true };
    saveState();
    updateDirectory(entry.id);
  }
}

function intro(entry, question, description = '') {
  const anchor = globalThis.bioRevisions?.[entry.id]?.anchor;
  return `<header class="intro">
    <p class="eyebrow">${escape(entry.unit)} · ${escape(entry.chapter)}</p>
    <p class="lesson-name">${entry.project ? '项目实践 · ' : ''}${escape(entry.title)}</p>
    <h1 id="lesson-title" tabindex="-1">${escape(question)}</h1>
    ${description ? `<p class="intro-copy">${escape(description)}</p>` : ''}
    <details class="book-note"><summary>课本第 ${entry.page} 页起</summary><p>${escape(anchor || entry.title)}</p></details>
  </header>`;
}

function following(entry) {
  const index = sequence.indexOf(entry);
  const next = sequence[index + 1];
  const previous = sequence[index - 1];
  return `<nav class="lesson-next" aria-label="按课本顺序移动">
    ${next ? `<a class="next-lesson" href="${route(next.id)}"><span><small>按课本顺序继续</small><strong>${escape(next.title)}</strong></span><span aria-hidden="true">→</span></a>`
      : '<a class="next-lesson" href="#/"><span><strong>回到学习入口</strong><small>从目录回看任一课</small></span></a>'}
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
    feedback.textContent = revised ? `起先选了「${first}」。${message}` : message;
    function available(position, ok) {
      if (displayRevision !== revision) return;
      if (ok) unavailable.delete(position);
      else unavailable.add(position);
      feedback.textContent = unavailable.size
        ? '有照片暂不可见。请重试，图下的文字是材料记录，不能当作你已经亲眼观察到的结果。'
        : revised ? `起先选了「${first}」。${message}` : message;
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

function renderQuiz(entry, name, activity) {
  const title = name === 'evidence' ? '从材料里找线索' : '换个例子再试';
  return `<section class="quick-check" data-quiz="${name}" aria-labelledby="${name}-title">
    <h3 id="${name}-title">${title}</h3>
    <fieldset><legend>${escape(activity.question)}</legend>
      ${activity.correct.length > 1 ? '<p class="quiz-instruction">可以选多条线索。</p>' : ''}
      <div class="check-options">${activity.options.map((label, i) =>
        `<button type="button" data-answer="${i}" aria-pressed="false">${escape(label)}</button>`).join('')}
      <button type="button" data-answer="unsure" aria-pressed="false">我还不确定</button></div>
    </fieldset>
    <button type="button" class="action" data-check>核对线索</button>
    <p class="feedback" role="status"></p>
  </section>`;
}

function renderEvidenceChallenge(entry) {
  if (entry.id === 'plant-transport') return `<details class="more-activity" data-xylem-detail><summary>看看实拍里的导管</summary>
    <figure class="xylem-photo"><div data-xylem-photo></div><figcaption>另一份芹菜材料的显微实拍。蓝色的螺旋纹是导管壁上的结构，可帮助辨认导管。</figcaption></figure>
    <p class="credit">Tmatheus · <a href="https://commons.wikimedia.org/wiki/File:Helical_Protoxylem_of_Celery.png" target="_blank" rel="noopener">显微照片原作</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>，缩小并转为 WebP。</p></details>`;
  if (entry.id === 'research-methods') return `<section class="quick-check">
    <h3>自己量一次</h3><p>甲豆苗从 4 厘米长到 6 厘米。记录时只写新增的长度。</p>
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

function renderLearningAdditions(entry, summary = '', outside = '') {
  const data = globalThis.bioRevisions?.[entry.id];
  if (!data) return summary ? `<section class="reflection"><h2>学到了什么</h2><p>${escape(summary)}</p></section>` : '';
  return `<section class="learning-zone">
    <details class="concept-note"><summary>把看到的现象和课本连起来</summary>
      <p>${escape(data.concept || summary)}</p>
      <button type="button" class="text-control listen-tip" data-listen>听找线索的题目</button>
      <span class="audio-feedback" role="status"></span>
    </details>
    ${data.evidence ? renderQuiz(entry, 'evidence', data.evidence) : ''}
    ${renderEvidenceChallenge(entry)}
    <details class="more-activity"><summary>写一句我找到的证据</summary>
      <label for="evidence-note">我看到……，所以我暂时认为……</label>
      <textarea id="evidence-note" rows="2" maxlength="400"></textarea>
      <p class="note-status" role="status">可以只写一句，也可以口头说给家人听。</p>
    </details>
    ${data.transfer ? `<details class="more-activity transfer-practice"><summary>换个例子复习</summary>${renderQuiz(entry, 'transfer', data.transfer)}</details>` : ''}
    ${outside ? `<p class="outside">${escape(outside)}</p>` : ''}
  </section>`;
}

function mountLearningAdditions(entry) {
  const data = globalThis.bioRevisions?.[entry.id];
  if (!data) return;
  mountEvidenceChallenge(entry);
  const note = outlet.querySelector('#evidence-note');
  if (note) {
    note.value = typeof state.notes?.[entry.id] === 'string' ? state.notes[entry.id] : '';
    note.addEventListener('input', () => {
      state.notes = { ...state.notes, [entry.id]: note.value };
      outlet.querySelector('.note-status').textContent = saveState() ? '这句话已保存在这台设备。' : '这句话目前留在本页，可以复制带走。';
    });
  }
  for (const name of ['evidence', 'transfer']) {
    const section = outlet.querySelector(`[data-quiz="${name}"]`);
    if (!section) continue;
    const activity = data[name];
    const options = [...section.querySelectorAll('[data-answer]')];
    const feedback = section.querySelector('.feedback');
    const previous = name === 'evidence' ? state.reviews?.[entry.id]?.evidence : null;
    const chosen = new Set(Array.isArray(previous) ? previous.filter(value => options.some(option => option.dataset.answer === value)) : []);
    for (const option of options) option.setAttribute('aria-pressed', String(chosen.has(option.dataset.answer)));
    options.forEach(button => button.addEventListener('click', () => {
      const value = button.dataset.answer;
      if (value === 'unsure' || activity.correct.length === 1) {
        const wasChosen = chosen.has(value);
        chosen.clear();
        if (!wasChosen) chosen.add(value);
      } else {
        chosen.delete('unsure');
        if (chosen.has(value)) chosen.delete(value);
        else chosen.add(value);
      }
      for (const option of options) option.setAttribute('aria-pressed', String(chosen.has(option.dataset.answer)));
      feedback.textContent = '';
      if (name === 'evidence') {
        state.reviews = { ...state.reviews, [entry.id]: { evidence: [...chosen] } };
        saveState();
      }
    }));
    section.querySelector('[data-check]').addEventListener('click', () => {
      if (!chosen.size || chosen.has('unsure')) {
        feedback.textContent = `可以先看看这个提示，再试一次。${activity.hint || '先找一条能回答问题的观察记录。'}`;
        return;
      }
      const correct = activity.correct.length === chosen.size && activity.correct.every(i => chosen.has(String(i)));
      const photoStation = entry.id === 'cell' && name === 'evidence';
      const photoUnavailable = photoStation && Boolean(outlet.querySelector('[data-photo][data-image-status="failed"]'));
      const openPlantSample = photoStation && outlet.querySelector('[data-sample=leaf][aria-pressed="true"]');
      const qualifier = photoUnavailable ? '照片暂不可见，这次先根据题目里的文字记录判断。'
        : photoStation && !openPlantSample ? '想用照片再核对，可在上方切回伊乐藻。' : '';
      feedback.textContent = (correct ? photoUnavailable ? '选择和文字记录吻合。' : '这次判断和材料吻合。' : '这次的证据还不够。') + qualifier + activity.explain;
      if (name === 'evidence' || correct) markPracticed(entry);
    });
  }
  const listen = outlet.querySelector('[data-listen]');
  if (listen) listen.addEventListener('click', async () => {
    const feedback = outlet.querySelector('.audio-feedback');
    playingPrompt?.pause();
    listen.disabled = true;
    const audio = playingPrompt = new Audio(`./assets/audio/${entry.id}.m4a`);
    audio.addEventListener('ended', () => { listen.disabled = false; feedback.textContent = ''; });
    audio.addEventListener('error', () => { listen.disabled = false; feedback.textContent = '朗读暂时无法播放，可以继续看文字。'; });
    try {
      await audio.play();
      feedback.textContent = '正在播放观察提示。';
    } catch {
      listen.disabled = false;
      feedback.textContent = '朗读暂时无法播放，可以继续看文字。';
    }
  });
}

function downloadProgress() {
  const blob = new Blob([JSON.stringify({ version: 1, progress: state }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: '生物实验台学习记录.json' });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function mergeProjects(local, incoming) {
  const merged = { ...local };
  const limit = typeof PROJECT_HISTORY_LIMIT === 'number' ? PROJECT_HISTORY_LIMIT : 6;
  for (const [id, record] of Object.entries(incoming)) {
    if (!plainRecord(record)) continue;
    const current = plainRecord(merged[id]) ? merged[id] : {};
    const values = draft => plainRecord(draft) ? Object.values(draft) : [];
    const hasDraft = draft => values(draft).some(value => Array.isArray(value) ? value.length > 0 : Boolean(value));
    const versions = item => Array.isArray(item.versions) ? item.versions : [];
    const usable = entry => Number.isFinite(entry?.time) && entry.time > 0 && entry.time <= 8640000000000000 && plainRecord(entry.draft);
    const draft = hasDraft(current.draft) ? current.draft : record.draft;
    const pool = [...versions(current).filter(usable), ...versions(record).filter(usable)];
    if (draft === current.draft && hasDraft(record.draft)) pool.push({time: Date.now(), draft: record.draft});
    const duplicates = new Set();
    const saved = pool.filter(item => {
      const signature = JSON.stringify(item.draft);
      if (duplicates.has(signature)) return false;
      duplicates.add(signature);
      return true;
    }).slice(0, limit);
    saved.sort((a,b) => b.time - a.time);
    merged[id] = {draft, versions:saved};
  }
  return merged;
}

function renderHome() {
  const last = byId.get(state.last);
  const next = last || sequence[0];
  const count = sequence.filter(entry => state.practiced?.[entry.id] === true).length;
  document.title = '生物实验台 · 北京版七年级上册';
  outlet.innerHTML = `<section class="home-entry">
    <p class="eyebrow">北京版 · 七年级上册</p>
    <h1 id="lesson-title" tabindex="-1">今天想弄明白什么？</h1>
    <p class="intro-copy">看一张图或一组记录，自己挑出能说明问题的线索。</p>
    <nav class="lesson-next"><a class="next-lesson" href="${route(next.id)}">
      <span><small>${last ? '继续上次读到的课' : '从课本第一课开始'}</small><strong>${escape(next.title)}</strong></span><span aria-hidden="true">→</span>
    </a></nav>
    ${count ? `<p class="progress-count">做过 ${count} 项练习，可以从课本目录回看。</p>` : ''}
    ${!last ? `<a class="sample-link" href="${route('cell')}">先试一下显微镜</a>` : ''}
  </section>
  <details class="more-activity progress-tools"><summary>学习记录备份</summary>
    <p>记录保存在当前浏览器。下载后，可以在另一台设备打开同一网站导入。</p>
    <button type="button" data-export>下载记录</button>
    <label for="progress-import">导入以前的记录</label>
    <input type="file" id="progress-import" accept=".json,application/json">
    <p role="status" data-import-result></p>
  </details>`;
  outlet.querySelector('[data-export]').addEventListener('click', downloadProgress);
  outlet.querySelector('#progress-import').addEventListener('change', async event => {
    const picker = event.currentTarget;
    const feedback = outlet.querySelector('[data-import-result]');
    const file = picker.files[0];
    if (!file) return;
    try {
      if (file.size > 250000) throw new Error('size');
      const saved = JSON.parse(await file.text());
      if (saved.version !== 1 || !plainRecord(saved.progress)) throw new Error('format');
      const imported = cleanState(saved.progress);
      for (const [key, value] of Object.entries(imported)) {
        if (key === 'last' && !picker.isConnected) continue;
        if (key === 'projects') state.projects = mergeProjects(state.projects, value);
        else state[key] = plainRecord(value) ? { ...value, ...state[key] } : value;
      }
      const persisted = saveState();
      if (!picker.isConnected) return;
      renderHome();
      updateDirectory();
      outlet.querySelector('.progress-tools').open = true;
      outlet.querySelector('[data-import-result]').textContent = persisted ? '记录已导入。' : '记录已在本页打开，浏览器暂时无法保存。';
    } catch {
      feedback.textContent = '这份文件读不了。请选择从生物实验台下载的 JSON 记录。';
    }
  });
}

function showRecovery(entry, unknown = false) {
  const title = unknown ? '没找到这一课' : '这节课的材料暂时没载入';
  document.title = title + ' · 生物实验台';
  outlet.innerHTML = `<section class="load-panel"><h1 id="lesson-title" tabindex="-1">${title}</h1>
    <p>${entry ? `还可以先翻纸书。课本第 ${entry.page} 页 · ${escape(entry.title)}。` : '可以从课本目录重新选一课。'}</p>
    ${unknown ? '' : '<button type="button" class="action" data-reload>重新载入</button>'}
    <button type="button" data-open-directory>打开课本目录</button>
  </section>`;
  outlet.querySelector('[data-reload]')?.addEventListener('click', () => location.reload());
  outlet.querySelector('[data-open-directory]').addEventListener('click', () => {
    directory.open = true;
    directorySummary.focus();
  });
}

function render(focus = false) {
  playingPrompt?.pause();
  playingPrompt = undefined;
  const hash = location.hash;
  const isHome = !hash || hash === '#/' || hash === '#lesson' || hash === '#directory';
  const entry = hash.startsWith('#/lesson/') ? byId.get(hash.slice(9)) : null;
  if (isHome) {
    renderHome();
    updateDirectory();
  } else if (!entry) {
    showRecovery(null, true);
    updateDirectory();
  } else {
    directory.open = false;
    state.last = entry.id;
    state.viewed = { ...state.viewed, [entry.id]: true };
    saveState();
    updateDirectory(entry.id);
    document.title = entry.title + ' · 生物实验台';
    try {
      const data = lessonData[entry.id];
      if (entry.id === 'cell') {
        if (typeof renderCell !== 'function') throw new Error('cell');
        renderCell(entry);
      } else {
        if (!data) throw new Error('lesson data');
        renderDiagramLesson(entry, data);
      }
    } catch (error) {
      console.warn('Could not render this biology lesson', entry.id, error);
      showRecovery(entry);
    }
  }
  if (focus) {
    scrollTo(0, 0);
    outlet.querySelector('h1')?.focus({ preventScroll: true });
  }
}

directory.addEventListener('click', event => {
  if (event.target.closest('a')) directory.open = false;
});
directory.addEventListener('keydown', event => {
  if (event.key === 'Escape' && directory.open) {
    event.preventDefault();
    directory.open = false;
    directorySummary.focus();
  }
});
document.querySelector('.skip').addEventListener('click', event => {
  event.preventDefault();
  outlet.scrollIntoView({ block: 'start' });
  outlet.focus({ preventScroll: true });
});
addEventListener('hashchange', () => render(true));
render();

'use strict';

const contents = [
  { title: '第一单元 认识生命', chapters: [
    { title: '第一章 走近生命世界', entries: [
      ['life-traits', '生物的特征'], ['research-methods', '生物学的研究方法'], ['campus-green', '争当校园绿化“规划师”', true],
    ] },
    { title: '第二章 生物体的结构', entries: [
      ['cell', '细胞'], ['levels', '生物体的结构层次'], ['cell-expo', '筹备细胞博览会', true],
    ] },
  ] },
  { title: '第二单元 生物的营养和运输', chapters: [
    { title: '第一章 生物所需的营养', entries: [
      ['plant-nutrients', '植物所需的水和无机盐'], ['photosynthesis', '植物的光合作用'], ['plant-factory', '建造家庭“小小植物工厂”', true],
      ['human-nutrients', '人所需的营养'], ['food-planner', '成为健康“美食家”', true],
    ] },
    { title: '第二章 生物体内的物质运输', entries: [
      ['plant-transport', '植物体内的物质运输'], ['human-transport', '人体内的物质运输'], ['aed-map', '自动体外除颤仪的社区推广', true],
    ] },
  ] },
];
const chapters = contents.flatMap(unit => unit.chapters.map(chapter => ({ ...chapter, unit: unit.title })));
const sequence = chapters.flatMap(chapter => chapter.entries.map(([id, title, project]) => ({
  id, title, project, chapter: chapter.title, unit: chapter.unit,
})));
const textbookPages = [3, 11, 22, 27, 42, 52, 59, 68, 78, 81, 94, 99, 106, 120];
const textbookActivities = {
  'life-traits': '第 7–8 页：对照生物的共同特征',
  'research-methods': '第 12 页「观察生物标本」、第 16–18 页的对照探究',
  'campus-green': '第 22–23 页：调查植物分布，再设计校园绿化方案',
  cell: '第 30–32 页实验探究「制作并观察洋葱鳞片叶内表皮细胞临时装片」',
  levels: '第 44 页图 1-2-24：观察同一个番茄果实里的不同细胞',
  'cell-expo': '第 52–53 页：显微摄影与制作细胞模型',
};
const lessonData = { ...globalThis.bioUnitOne, ...globalThis.bioUnitTwo };
const outlet = document.querySelector('#lesson');
const directory = document.querySelector('#directory');
const route = id => '#/lesson/' + id;

const state = readState();
function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem('bio-learning-lab:v1'));
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch {
    return {};
  }
}
function saveState() {
  try { localStorage.setItem('bio-learning-lab:v1', JSON.stringify(state)); } catch { /* The activity still works when storage is unavailable. */ }
}
function escape(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function renderDirectory(current) {
  document.querySelector('#contents').innerHTML = contents.map(unit => `<div class="unit">
    <h2>${escape(unit.title)}</h2>
    ${unit.chapters.map(chapter => `<div class="directory-chapter"><h3>${escape(chapter.title)}</h3>
      ${chapter.entries.map(([id, title, project]) => `<a href="${route(id)}"${current === id ? ' aria-current="page"' : ''}>${project ? '<small>项目实践</small>' : ''}<span>${escape(title)}</span></a>`).join('')}
    </div>`).join('')}
  </div>`).join('');
}
directory.addEventListener('click', event => {
  if (event.target.closest('a')) directory.open = false;
});

function intro(entry, question, description = '') {
  const textbookPage = textbookPages[sequence.indexOf(entry)];
  return `<header class="intro">
    <p class="eyebrow">${escape(entry.unit)} · ${escape(entry.chapter)}</p>
    <p class="lesson-name">${entry.project ? '项目实践 · ' : ''}${escape(entry.title)}</p>
    <h1 id="lesson-title" tabindex="-1">${escape(question)}</h1>
    ${description ? `<p class="intro-copy">${escape(description)}</p>` : ''}
    <p class="book-note">课本第 ${textbookPage} 页起${textbookActivities[entry.id] ? ' · ' + textbookActivities[entry.id] : ''}</p>
  </header>`;
}
function following(entry) {
  const next = sequence[sequence.indexOf(entry) + 1];
  return next
    ? `<nav class="lesson-next" data-next="${next.id}" aria-label="按课本继续">
        <a href="${route(next.id)}"><span><small>${next.project ? '接着做课本项目' : '按课本顺序继续'}</small><strong>${escape(next.title)}</strong></span><span aria-hidden="true">→</span></a>
      </nav>`
    : '<p class="lesson-end">七年级上册的项目练完了。课本目录在页面上方。</p>';
}

function diagramSection(stage, index) {
  return `<section class="${index ? 'transfer' : 'experiment'}" aria-labelledby="scene-${index}">
    <header class="section-heading"><h2 id="scene-${index}">${escape(stage.heading)}</h2></header>
    <div class="station" data-scene="${index}">
      <figure class="specimen diagram-panel">
        <ul class="diagram-items"></ul>
        <figcaption>教学示意 · ${escape(stage.caption)}</figcaption>
      </figure>
      <div class="controls">
        <h3>${escape(stage.prompt)}</h3>
        <div class="choice-row" role="group" aria-labelledby="scene-${index}">
          ${stage.choices.map((choice, option) => `<button type="button" class="choice" data-choice="${option}" aria-pressed="false">${escape(choice.label)}</button>`).join('')}
        </div>
        <p class="feedback" role="status">看图，先选一种试试。</p>
      </div>
    </div>
  </section>`;
}

function mountDiagram(entry, stage, index) {
  const host = outlet.querySelector(`[data-scene="${index}"]`);
  const board = host.querySelector('.diagram-items');
  const feedback = host.querySelector('[role=status]');
  const buttons = [...host.querySelectorAll('[data-choice]')];
  let selected = state[entry.id]?.[index];
  if (!Number.isInteger(selected) || !stage.choices[selected]) selected = null;

  function redraw() {
    const selectedChoice = stage.choices[selected];
    const items = selectedChoice?.items ?? stage.items;
    const scene = host.querySelector('.scene-illustration');
    board.replaceChildren(...items.map(([kind, label], position) => {
      const item = document.createElement('li');
      item.dataset.focus = String(selectedChoice?.focus?.includes(position) === true);
      if (!scene && kind.endsWith('-photo')) {
        const photo = photographs[kind.slice(0, -6)];
        const image = document.createElement('img');
        image.src = photo.src;
        image.alt = photo.alt;
        image.loading = 'lazy';
        image.decoding = 'async';
        item.append(image);
      } else if (!scene) {
        const drawing = document.createElement('canvas');
        drawing.width = 192;
        drawing.height = 138;
        drawing.setAttribute('aria-hidden', 'true');
        globalThis.paintBioDiagram(drawing.getContext('2d'), kind);
        item.append(drawing);
      }
      const text = document.createElement('span');
      text.textContent = label;
      item.append(text);
      return item;
    }));
    if (scene) globalThis.paintBioScene(scene.getContext('2d'), entry.id, index, selected);
    feedback.textContent = selectedChoice?.feedback ?? '看图，先选一种试试。';
    for (const [option, button] of buttons.entries()) button.setAttribute('aria-pressed', String(option === selected));
  }
  for (const [indexChoice, button] of buttons.entries()) {
    button.addEventListener('click', () => {
      selected = indexChoice;
      state[entry.id] = { ...state[entry.id], [index]: selected };
      state.last = entry.id;
      saveState();
      redraw();
    });
  }
  if (['photosynthesis', 'human-transport', 'aed-map'].includes(entry.id)) {
    const scene = document.createElement('canvas');
    scene.className = 'scene-illustration';
    scene.width = 560;
    scene.height = 204;
    scene.setAttribute('aria-hidden', 'true');
    board.before(scene);
    board.classList.add('diagram-labels');
  }
  redraw();
}

function renderDiagramLesson(entry, data) {
  outlet.innerHTML = intro(entry, data.question) + data.stages.map(diagramSection).join('') +
    `<section class="reflection"><h2>今天用到的办法</h2><p>${escape(data.summary)}</p>
      ${data.outside ? `<p class="outside">${escape(data.outside)}</p>` : ''}</section>` + following(entry);
  data.stages.forEach((stage, index) => mountDiagram(entry, stage, index));
}

const photographs = {
  onion: { src: './assets/onion.webp', alt: '洋葱表皮实拍，浅色细胞排成一行行，细胞之间有边界。', caption: '洋葱表皮 · 显微实拍' },
  leaf: { src: './assets/leaf.webp', alt: '伊乐藻叶片实拍，许多格子里能看到细小的绿色颗粒。', caption: '伊乐藻叶片 · 显微实拍' },
};
const onionDetail = './assets/onion-detail.webp';

function photoFigure(id, item, extra = '') {
  return `<figure class="specimen"><div class="viewfinder" id="${id}">
    <img class="specimen-image" src="${item.src}" alt="${item.alt}" decoding="async"${id === 'microscope' ? ' fetchpriority="high"' : ' loading="lazy"'}>
    <span class="image-fallback" hidden>${item.alt}</span>${extra}
    </div><figcaption>${item.caption}</figcaption></figure>`;
}

function bindPhotoFallback(frame) {
  const img = frame.querySelector('img');
  const placeholder = frame.querySelector('.image-fallback');
  const marker = frame.querySelector('.zoom-marker');
  function update(missing) {
    img.hidden = missing;
    placeholder.hidden = !missing;
    if (marker) marker.hidden = missing;
  }
  img.addEventListener('error', () => update(true));
  img.addEventListener('load', () => update(false));
  if (img.complete && img.getAttribute('src') && !img.naturalWidth) update(true);
}

function renderCell(entry) {
  outlet.innerHTML = intro(entry, '洋葱皮下面，有多少小格子？', '把同一张显微照片放大，再换一张叶片照片，用你看到的东西做判断。') + `
    <section class="experiment" aria-labelledby="zoom-title">
      <header class="section-heading"><h2 id="zoom-title">放大以后，视野里还剩什么？</h2></header>
      <div class="station">
        ${photoFigure('microscope', photographs.onion, '<span class="reticle" aria-hidden="true"></span>')}
        <div class="controls">
          <fieldset class="prediction">
            <legend>你猜放大后，能数到的格子会怎样？</legend>
            <div class="choice-row">
              <button type="button" class="choice" data-predict="more" aria-pressed="false">变多</button>
              <button type="button" class="choice" data-predict="less" aria-pressed="false">变少</button>
              <button type="button" class="choice" data-predict="unsure" aria-pressed="false">还不确定</button>
            </div>
          </fieldset>
          <button type="button" class="action" data-zoom aria-controls="microscope">放大框里的区域</button>
          <p class="feedback" role="status" data-zoom-feedback></p>
        </div>
      </div>
    </section>
    <section class="transfer" aria-labelledby="compare-title">
      <header class="section-heading"><h2 id="compare-title">换一种材料再看看</h2></header>
      <div class="station">
        <div class="compare-visual">
          <figure class="specimen comparison-reference" hidden><div class="viewfinder"><img class="specimen-image" src="${photographs.onion.src}" alt="${photographs.onion.alt}" loading="lazy" decoding="async"></div><figcaption>洋葱表皮</figcaption></figure>
          ${photoFigure('compare-scope', photographs.onion)}
        </div>
        <div class="controls">
          <div class="choice-row lens-switch" role="group" aria-label="选择显微照片">
            <button type="button" class="choice" data-sample="onion" aria-pressed="true">看洋葱表皮</button>
            <button type="button" class="choice" data-sample="leaf" aria-pressed="false">看伊乐藻叶片</button>
          </div>
          <p class="feedback" role="status" data-sample-feedback></p>
        </div>
      </div>
    </section>
    <section class="reflection">
      <h2>这两张图能告诉我们什么？</h2>
      <p>两张图里都能找出一格格细胞。这两种材料的细胞外观有差别，只看其中一张图，没法判断所有植物细胞的样子。</p>
      <p class="outside">图里的一条边线能帮我们分辨相邻细胞。只凭这张照片，还不能说已经看清细胞膜。</p>
      <p class="credit">显微图分别拍摄。网页会裁切和放大照片，两张图不能直接用来比较尺寸。</p>
      <details class="credit photo-credit"><summary>照片来源</summary>
        <p>洋葱表皮 · <a href="https://www.flickr.com/photos/146824358@N03/33605021164/" target="_blank" rel="noopener noreferrer">Berkshire Community College Bioscience Image Library</a> · CC0 1.0。</p>
        <p>伊乐藻叶片 · <a href="https://commons.wikimedia.org/wiki/File:Chloroplasts_-_Microscopic_view_of_Elodea_canadensis.jpg" target="_blank" rel="noopener noreferrer">Juan Carlos Fonseca Mata</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>。照片已缩小、裁切、转成 WebP。</p>
      </details>
    </section>` + following(entry);
  const record = { ...state.cell };
  if (!Object.hasOwn(photographs, record.sample)) record.sample = 'onion';
  const viewfinder = outlet.querySelector('#microscope');
  const zoomButton = outlet.querySelector('[data-zoom]');
  const predictButtons = [...outlet.querySelectorAll('[data-predict]')];
  const zoomFeedback = outlet.querySelector('[data-zoom-feedback]');
  const locationFigure = document.createElement('figure');
  locationFigure.className = 'zoom-location';
  locationFigure.innerHTML = `<div>
    <img src="${photographs.onion.src}" alt="原照片缩略图，方框是放大的位置。">
    <span class="image-fallback" hidden>原图暂缺</span>
    <span class="zoom-marker" aria-hidden="true"></span>
  </div><figcaption>放大位置</figcaption>`;
  viewfinder.after(locationFigure);
  viewfinder.parentElement.classList.add('zoom-specimen');
  const comparison = outlet.querySelector('#compare-scope');
  const image = comparison.querySelector('img');
  const sampleCaption = comparison.parentElement.querySelector('figcaption');
  const sampleFeedback = outlet.querySelector('[data-sample-feedback]');
  const sampleButtons = [...outlet.querySelectorAll('[data-sample]')];
  let detail;

  function updateZoom() {
    const zoomed = record.zoomed === true;
    viewfinder.style.setProperty('--zoom', zoomed ? '2.25' : '1');
    viewfinder.querySelector('.reticle').hidden = zoomed;
    locationFigure.hidden = !zoomed;
    if (detail) detail.hidden = !zoomed;
    zoomButton.textContent = zoomed ? '返回整片视野' : '放大框里的区域';
    const text = zoomed ? '同一张照片里，框内的格子变大了，屏幕能容下的格子更少。'
      : record.guess ? '留意框里和框外各有多少格。放大后再比一比。' : '也可以直接放大，用图来核对。';
    zoomFeedback.textContent = text;
    predictButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.predict === record.guess)));
  }
  async function requestDetail() {
    if (detail) return;
    detail = new Image();
    detail.className = 'specimen-image zoom-detail';
    detail.alt = '';
    detail.setAttribute('aria-hidden', 'true');
    detail.src = onionDetail;
    try {
      await detail.decode();
      if (!viewfinder.isConnected) return;
      detail.hidden = !record.zoomed;
      viewfinder.append(detail);
      viewfinder.querySelector('.image-fallback').hidden = true;
    } catch {
      detail = undefined;
    }
  }
  function updateSample() {
    const sample = photographs[record.sample];
    if (image.getAttribute('src') !== sample.src) {
      image.alt = sample.alt;
      comparison.querySelector('.image-fallback').textContent = sample.alt;
      image.src = sample.src;
    }
    sampleCaption.textContent = sample.caption;
    outlet.querySelector('.comparison-reference').hidden = record.sample !== 'leaf';
    outlet.querySelector('.compare-visual').classList.toggle('has-reference', record.sample === 'leaf');
    sampleFeedback.textContent = record.sample === 'leaf'
      ? '叶片里也有一格格细胞，有些格子里还能看到绿色小颗粒。'
      : '先沿着一条边线找一格，再换叶片，看看边界还好不好找。';
    sampleButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.sample === record.sample)));
  }
  function save() { state.cell = record; state.last = entry.id; saveState(); }
  predictButtons.forEach(button => button.addEventListener('click', () => {
    record.guess = button.dataset.predict;
    updateZoom();
    save();
  }));
  zoomButton.addEventListener('click', () => {
    record.zoomed = !record.zoomed;
    if (record.zoomed) requestDetail();
    updateZoom();
    save();
  });
  sampleButtons.forEach(button => button.addEventListener('click', () => {
    record.sample = button.dataset.sample;
    updateSample();
    save();
  }));
  outlet.querySelectorAll('.viewfinder:has(> .image-fallback)').forEach(bindPhotoFallback);
  bindPhotoFallback(locationFigure);
  if (record.zoomed) requestDetail();
  updateZoom();
  updateSample();
}

function render(focus = false) {
  const id = location.hash.startsWith('#/lesson/') ? location.hash.slice(9) : state.last;
  const entry = sequence.find(item => item.id === id) ?? sequence[0];
  renderDirectory(entry.id);
  if (entry.id === 'cell') renderCell(entry);
  else renderDiagramLesson(entry, lessonData[entry.id]);
  document.title = entry.title + ' · 生物实验台';
  if (focus) {
    scrollTo(0, 0);
    outlet.querySelector('h1').focus({ preventScroll: true });
  }
}

outlet.addEventListener('click', event => {
  const next = event.target.closest('[data-next] a')?.parentElement.dataset.next;
  if (next) { state.last = next; saveState(); }
});
document.querySelector('.skip').addEventListener('click', event => {
  event.preventDefault();
  outlet.scrollIntoView({ block: 'start' });
  outlet.focus({ preventScroll: true });
});
addEventListener('hashchange', () => render(true));
render();

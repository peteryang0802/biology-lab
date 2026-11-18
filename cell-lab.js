'use strict';

const CELL_ZOOM = 2.25;
const CELL_GUESSES = { more: '变多', less: '变少', unsure: '还不确定' };
const CELL_SAMPLES = {
  onion: { name: '洋葱表皮', src: './assets/onion.webp', alt: '洋葱内表皮显微照片，长条状小格大多紧密排列，深色线条隔开相邻的小格。' },
  leaf: {
    name: '伊乐藻叶片', src: './assets/leaf.webp',
    alt: '伊乐藻叶片显微照片，浅色和绿色的小格紧密排列。',
    task: '叶片照片里，哪处有成群的绿色小颗粒？',
    spots: [[23, 72], [74, 31]], answer: 1,
    descriptions: ['A 处是较浅的一片，少见绿色颗粒', 'B 处有成群的绿色颗粒'],
    found: 'B 附近的绿色小颗粒是叶绿体。展开下方的示意图，在图里找一找。',
    hint: 'A 附近更浅。沿着格子的边看进去，到 B 附近找成群的绿色小颗粒。',
  },
  cheek: {
    name: '口腔上皮', src: './assets/cheek.webp',
    alt: '人口腔鳞状上皮细胞显微照片，细胞轮廓不规则，内部可见圆形结构。',
    task: '换成人体细胞，哪处有一个较明显的圆形结构？',
    spots: [[72, 50], [24, 68]], answer: 0,
    descriptions: ['A 处是细胞内部一个较明显的圆形结构', 'B 处是细胞内靠近边缘的位置'],
    found: 'A 附近可以辨认细胞核。沿着外缘看，这个细胞的轮廓和洋葱表皮的小格不同。',
    hint: 'B 靠近细胞边缘。到 A 附近找一个较明显的圆形结构。',
  },
};

function cellPhoto(name, { main = false, mini = false, compare = false, lazy = false } = {}) {
  return `<figure class="cell-photo${mini ? ' cell-photo-mini' : ''}" data-photo="${name}">
    <div class="cell-image-box">
      <img class="cell-image" alt="" tabindex="-1" decoding="async" ${main ? 'fetchpriority="high"' : ''} ${lazy ? 'loading="lazy"' : ''}>
      ${main ? '<button class="cell-reticle" type="button" aria-label="取景框，点按放大，可拖动或用方向键移动"><span aria-hidden="true">↔</span></button>' : ''}
      ${mini ? '<span class="cell-reticle" aria-hidden="true"></span>' : ''}
      ${compare ? `<button class="cell-spot" type="button" data-cell-spot="0" aria-pressed="false"><span aria-hidden="true">A</span></button>
      <button class="cell-spot" type="button" data-cell-spot="1" aria-pressed="false"><span aria-hidden="true">B</span></button>` : ''}
      <div class="cell-image-fallback" hidden><span>照片暂不可见</span><button type="button" data-cell-retry>重试</button></div>
    </div>
    <figcaption>${mini ? '放大位置' : CELL_SAMPLES[name]?.name ?? ''}</figcaption>
  </figure>`;
}

function renderCell(entry) {
  outlet.innerHTML = intro(entry, '放大会看到更多吗？') + `
    <section class="experiment cell-lab" aria-labelledby="zoom-title">
      <header class="section-heading"><h2 id="zoom-title">猜一猜，再看显微照片</h2>
        <p class="cell-small-note">拖动照片中带箭头的圆框，选一处放大。</p>
      </header>
      <div class="station cell-station cell-zoom-station">
        <div class="cell-microscope">
          ${cellPhoto('onion', { main: true })}
          ${cellPhoto('position', { mini: true })}
        </div>
        <div class="controls cell-controls">
          <p class="feedback cell-feedback" role="status" data-zoom-feedback>放大后，视野里能数到的细胞会怎样？</p>
          <fieldset class="prediction">
            <legend class="cell-sr-only" data-cell-prediction-label>放大前的猜想</legend>
            <div class="cell-guesses">${Object.entries(CELL_GUESSES).map(([id, label]) => `
              <button type="button" class="choice" data-predict="${id}" aria-pressed="false">${label}</button>`).join('')}</div>
          </fieldset>
          <div class="cell-actions">
            <button type="button" class="action" data-zoom>放大框里的区域</button>
            <button type="button" class="choice" data-cell-restart hidden>再猜一次</button>
          </div>
        </div>
      </div>
    </section>
    <section class="transfer cell-lab" aria-labelledby="compare-title">
      <header class="section-heading"><h2 id="compare-title">换一种材料，在图上找证据</h2></header>
      <div class="station cell-station">
        <div class="cell-samples">
          <div class="cell-sample-tabs" role="group" aria-label="换对照样本">
            <span>换样本</span>
            <button type="button" class="choice" data-sample="leaf" aria-pressed="false">伊乐藻叶片</button>
            <button type="button" class="choice" data-sample="cheek" aria-pressed="false">口腔上皮</button>
          </div>
          <p class="cell-photo-task" data-sample-task></p>
          ${cellPhoto('reference', { lazy: true })}
          ${cellPhoto('compare', { compare: true, lazy: true })}
        </div>
        <div class="controls cell-controls">
          <p class="feedback cell-feedback" data-sample-feedback role="status"></p>
          <p class="cell-small-note">图片的比例不同，用来比较外形和可见结构。</p>
        </div>
      </div>
      <details class="cell-extension">
        <summary>把实拍和细胞结构模型对一对</summary>
        <div class="cell-extension-content">
          <p>伊乐藻叶片照片里可以找到叶绿体。细胞膜、细胞核和液泡在这张照片里难以分辨，可以看下面的示意图。植物细胞有的含叶绿体，洋葱鳞片叶的内表皮细胞通常缺少叶绿体。</p>
          <div class="cell-models">
            <figure>
              <canvas class="cell-plant-model" width="176" height="96" aria-hidden="true"></canvas>
              <figcaption><strong>伊乐藻叶片细胞示意</strong><br>外框是细胞壁，紧贴内侧的细线是细胞膜。绿色小粒是叶绿体，浅蓝色区域是液泡，紫色圆形是细胞核。</figcaption>
            </figure>
            <figure><div class="cell-model-animal" aria-hidden="true"><i></i></div><figcaption>动物细胞示意 · 外缘代表细胞膜，里面有细胞质。细胞核里含有遗传信息。</figcaption></figure>
          </div>
        </div>
      </details>
    </section>
    <details class="cell-extension cell-lab" data-cell-optics>
      <summary>显微镜练习 · 试试调焦和盖盖玻片</summary>
      <div class="cell-extension-content">
        <div class="cell-optic-grid">
          <div class="cell-focus-picture">
            <div class="cell-focus-model" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
            <span>调焦示意</span>
          </div>
          <div>
            <label for="cell-focus">转动模拟调焦旋钮，找最清楚的位置</label>
            <input id="cell-focus" type="range" min="0" max="100" step="2" value="20">
            <p class="feedback cell-feedback" data-cell-focus-feedback>现在边界较模糊。试着向右移动。</p>
          </div>
        </div>
        <p class="cell-small-note">调焦改变画面的清晰程度。上面的数字放大让同一张照片只显示局部。</p>
        <div class="cell-optic-grid">
          <figure class="cell-cover-model" data-cell-cover-model>
            <div aria-hidden="true"><span class="cell-drop"></span><span class="cell-cover-glass"></span><span class="cell-bubble"></span></div>
            <figcaption>盖盖玻片示意</figcaption>
          </figure>
          <div>
            <p>试两种放法，看看气泡有什么变化。</p>
            <div class="cell-guesses">
              <button type="button" class="choice" data-cell-cover="flat" aria-pressed="false">平着放下</button>
              <button type="button" class="choice" data-cell-cover="edge" aria-pressed="false">一边碰到水再放</button>
            </div>
            <p class="feedback cell-feedback" data-cell-cover-feedback role="status">先选一种放法。</p>
          </div>
        </div>
      </div>
    </details>
    <details class="credit photo-credit"><summary>显微照片来源</summary>
      <p>洋葱表皮 · <a href="https://www.flickr.com/photos/146824358@N03/33605021164/" target="_blank" rel="noopener noreferrer">Berkshire Community College Bioscience Image Library</a> · CC0 1.0。</p>
      <p>伊乐藻叶片 · <a href="https://commons.wikimedia.org/wiki/File:Chloroplasts_-_Microscopic_view_of_Elodea_canadensis.jpg" target="_blank" rel="noopener noreferrer">Juan Carlos Fonseca Mata</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>。缩小、裁切并转为 WebP。</p>
      <p>人口腔鳞状上皮细胞 · <a href="https://cellimagelibrary.org/images/12594" target="_blank" rel="noopener noreferrer">Graham Wright，Cell Image Library CIL:12594</a> · 公有领域。截取原图中间一幅、缩小并转为 WebP。</p>
    </details>` + renderLearningAdditions(entry) + following(entry);

  const previous = state.cell ?? {};
  const record = {
    ...previous,
    guess: Object.hasOwn(CELL_GUESSES, previous.guess) ? previous.guess : null,
    firstGuess: previous.firstGuess === 'skipped' || Object.hasOwn(CELL_GUESSES, previous.firstGuess) ? previous.firstGuess : null,
    revised: Object.hasOwn(CELL_GUESSES, previous.revised) ? previous.revised : null,
    sample: previous.sample === 'cheek' ? 'cheek' : 'leaf',
    observations: { ...previous.observations },
    zoomed: previous.zoomed === true,
  };
  if (record.zoomed && !record.firstGuess) record.firstGuess = record.guess ?? 'skipped';
  const save = () => {
    state.cell = record;
    state.last = entry.id;
    saveState();
  };
  const creditObservation = () => markPracticed(entry);
  mountCellZoom(record, save, creditObservation);
  mountCellSamples(record, save, creditObservation);
  paintCellPlantModel(outlet.querySelector('.cell-plant-model'));
  mountCellOptics();
  mountLearningAdditions(entry);
}

function paintCellPlantModel(canvas) {
  const ctx = setCanvasSize(canvas, 176, 96);
  if (!ctx) return;

  ctx.fillStyle = '#e7edc3';
  ctx.fillRect(7, 7, 162, 82);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#476b52';
  ctx.strokeRect(7, 7, 162, 82);
  ctx.lineWidth = 1;
  ctx.strokeRect(12, 12, 152, 72);

  ctx.beginPath();
  ctx.ellipse(84, 48, 54, 23, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#c3e2ea';
  ctx.fill();
  ctx.strokeStyle = '#58818d';
  ctx.stroke();

  const chloroplasts = [[27, 20], [47, 19], [68, 19], [93, 19], [120, 19], [146, 21], [153, 37],
    [20, 37], [21, 57], [33, 76], [57, 77], [85, 77], [112, 77]];
  ctx.fillStyle = '#427c3e';
  for (const [x, y] of chloroplasts) {
    ctx.beginPath();
    ctx.ellipse(x, y, 4.5, 3, -.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(149, 68, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#b98caa';
  ctx.fill();
  ctx.strokeStyle = '#734d6b';
  ctx.stroke();
}

function keepCellExerciseVisible(exercise) {
  const height = window.visualViewport?.height ?? window.innerHeight;
  const { top, bottom } = exercise.getBoundingClientRect();
  if (bottom - top > height - 16) return;
  const offset = bottom > height - 8 ? bottom - height + 8 : Math.min(0, top - 8);
  if (offset) window.scrollBy({ top: offset, behavior: 'instant' });
}

function mountCellPhoto(figure, onStatus, focusAfterRetry = () => null) {
  const image = figure.querySelector('img');
  const placeholder = figure.querySelector('.cell-image-fallback');
  const retryButton = placeholder.querySelector('[data-cell-retry]');
  let sample;
  let ready = false;
  let failed = false;
  let attempts = 0;

  function setStatus(status, retrying = false) {
    ready = status === 'ready';
    failed = status === 'failed';
    figure.dataset.imageStatus = status;
    image.hidden = failed;
    image.style.visibility = ready ? '' : 'hidden';
    placeholder.hidden = !failed && !retrying;
    retryButton.setAttribute('aria-disabled', String(retrying));
    retryButton.textContent = retrying ? '加载中' : '重试';
    onStatus();
  }
  function load(retry) {
    const count = ++attempts;
    const ownedFocus = retry && document.activeElement === retryButton;
    setStatus('loading', retry);
    image.onload = () => {
      if (count !== attempts) return;
      const restoreFocus = ownedFocus && document.activeElement === retryButton;
      setStatus('ready');
      if (restoreFocus) (focusAfterRetry() || image).focus({ preventScroll: true });
    };
    image.onerror = () => {
      if (count === attempts) setStatus('failed');
    };
    image.alt = sample.alt;
    image.src = sample.src + (retry && location.protocol !== 'file:' ? `?retry=${count}` : '');
  }
  retryButton.addEventListener('click', () => {
    if (failed) load(true);
  });
  return {
    get ready() { return ready; },
    get failed() { return failed; },
    show(next) {
      if (next === sample) return;
      sample = next;
      load(false);
    },
  };
}

function mountCellZoom(record, save, creditObservation) {
  const scope = outlet.querySelector('.cell-microscope');
  const exercise = scope.closest('.cell-zoom-station');
  const primaryFigure = scope.querySelector('[data-photo="onion"]');
  const positionFigure = scope.querySelector('[data-photo="position"]');
  const frame = primaryFigure.querySelector('.cell-image-box');
  const reticle = frame.querySelector('.cell-reticle');
  const info = outlet.querySelector('[data-zoom-feedback]');
  const zoom = outlet.querySelector('[data-zoom]');
  const restart = outlet.querySelector('[data-cell-restart]');
  const guesses = [...outlet.querySelectorAll('[data-predict]')];
  const legend = outlet.querySelector('[data-cell-prediction-label]');
  const maxDistance = 50 - 50 / CELL_ZOOM;
  function setTarget(x, y) {
    const dx = (Number.isFinite(x) ? x : 50) - 50;
    const dy = (Number.isFinite(y) ? y : 50) - 50;
    const distance = Math.hypot(dx, dy);
    const ratio = distance > maxDistance ? maxDistance / distance : 1;
    record.x = 50 + dx * ratio;
    record.y = 50 + dy * ratio;
  }
  setTarget(record.x, record.y);
  let detail, drag;
  let detailRequested = false;
  let detailAttempts = 0;
  let moved = false;
  const primary = mountCellPhoto(primaryFigure, show, () => reticle.hidden ? null : reticle);
  const position = mountCellPhoto(positionFigure, show);

  function redrawTarget() {
    scope.style.setProperty('--target-x', `${record.x}%`);
    scope.style.setProperty('--target-y', `${record.y}%`);
    scope.style.setProperty('--target-size', `${100 / CELL_ZOOM}%`);
    scope.style.setProperty('--zoom-factor', CELL_ZOOM);
    scope.style.setProperty('--pan-x', `${50 - record.x * CELL_ZOOM}%`);
    scope.style.setProperty('--pan-y', `${50 - record.y * CELL_ZOOM}%`);
  }
  function show() {
    const ready = primary.ready;
    scope.classList.toggle('cell-is-zoomed', ready && record.zoomed);
    reticle.hidden = !ready || record.zoomed;
    positionFigure.hidden = !ready || !record.zoomed;
    positionFigure.querySelector('.cell-reticle').hidden = !position.ready;
    if (detail) detail.hidden = !ready || !record.zoomed;
    if (!record.zoomed) detailRequested = false;
    if (ready && record.zoomed) loadDetail();
    redrawTarget();

    const checked = record.firstGuess !== null;
    const selected = checked ? record.revised : record.guess;
    legend.textContent = checked ? '看过照片后的判断' : '放大前的猜想';
    guesses.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.predict === selected)));
    restart.hidden = !checked;
    zoom.disabled = !ready;
    zoom.textContent = record.zoomed ? '返回整片视野' : '放大框里的区域';
    zoom.classList.toggle('action', !record.zoomed);
    zoom.classList.toggle('choice', record.zoomed);
    if (!ready) {
      info.textContent = primary.failed ? '照片暂不可见，等图回来再作观察。' : '正在加载显微照片。';
    } else if (!checked) {
      info.textContent = record.guess
        ? '已记下你的猜想。拖动虚线框选位置，点按虚线框放大。'
        : '放大后，视野里能数到的细胞会怎样？拖动虚线框选位置，点按虚线框放大。';
    } else {
      const original = record.firstGuess === 'skipped' ? '' : `原先选「${CELL_GUESSES[record.firstGuess]}」。`;
      const reaction = {
        less: '变少，和观察一致。放大后只看局部。',
        more: '再数一数。放大后只看局部。',
        unsure: '试着数一数局部和整片的细胞。',
      };
      info.textContent = original + (reaction[record.revised] || '数一数整片和局部的细胞，再选一次。');
    }
  }
  function loadDetail() {
    if (detail || detailRequested) return;
    detailRequested = true;
    detailAttempts++;
    detail = new Image();
    detail.alt = '';
    detail.setAttribute('aria-hidden', 'true');
    detail.className = 'cell-image cell-detail';
    detail.decoding = 'async';
    detail.onload = () => {
      if (!frame.isConnected) return;
      frame.prepend(detail);
      show();
    };
    detail.onerror = () => { detail = undefined; };
    const retry = detailAttempts > 1 && location.protocol !== 'file:' ? `?retry=${detailAttempts}` : '';
    detail.src = './assets/onion-detail.webp' + retry;
  }
  zoom.addEventListener('click', () => {
    if (!primary.ready) return;
    const returnFocus = document.activeElement === reticle;
    record.zoomed = !record.zoomed;
    if (record.zoomed) record.firstGuess ??= record.guess ?? 'skipped';
    save();
    show();
    if (returnFocus) zoom.focus({ preventScroll: true });
    keepCellExerciseVisible(exercise);
  });
  restart.addEventListener('click', () => {
    record.firstGuess = record.guess = record.revised = null;
    record.zoomed = false;
    save();
    show();
    guesses[0].focus({ preventScroll: true });
    keepCellExerciseVisible(exercise);
  });
  guesses.forEach(button => button.addEventListener('click', () => {
    if (record.firstGuess) record.revised = button.dataset.predict;
    else record.guess = button.dataset.predict;
    save();
    show();
    if (primary.ready && record.revised === 'less') creditObservation();
    keepCellExerciseVisible(exercise);
  }));
  reticle.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    const bounds = frame.getBoundingClientRect();
    moved = false;
    drag = { id: event.pointerId, x: record.x, y: record.y, pointerX: event.clientX, pointerY: event.clientY, width: bounds.width, height: bounds.height };
    reticle.setPointerCapture(event.pointerId);
  });
  reticle.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    if (!moved && Math.hypot(event.clientX - drag.pointerX, event.clientY - drag.pointerY) < 3) return;
    moved = true;
    setTarget(drag.x + (event.clientX - drag.pointerX) * 100 / drag.width,
      drag.y + (event.clientY - drag.pointerY) * 100 / drag.height);
    redrawTarget();
  });
  reticle.addEventListener('lostpointercapture', () => {
    if (!drag) return;
    drag = undefined;
    save();
  });
  reticle.addEventListener('click', event => {
    if (event.detail === 0 || !moved) zoom.click();
  });
  reticle.addEventListener('keydown', event => {
    const offset = { ArrowLeft: [-6, 0], ArrowRight: [6, 0], ArrowUp: [0, -6], ArrowDown: [0, 6] }[event.key];
    if (!offset) return;
    event.preventDefault();
    setTarget(record.x + offset[0], record.y + offset[1]);
    redrawTarget();
    save();
  });
  position.show(CELL_SAMPLES.onion);
  primary.show(CELL_SAMPLES.onion);
}

function mountCellSamples(record, save, creditObservation) {
  const referenceFigure = outlet.querySelector('[data-photo="reference"]');
  const comparisonFigure = outlet.querySelector('[data-photo="compare"]');
  const task = outlet.querySelector('[data-sample-task]');
  const status = outlet.querySelector('[data-sample-feedback]');
  const spots = [...comparisonFigure.querySelectorAll('[data-cell-spot]')];
  const samples = [...outlet.querySelectorAll('[data-sample]')];
  const comparison = mountCellPhoto(comparisonFigure, show, () => spots.find(button => button.getAttribute('aria-pressed') === 'true') || spots[0]);
  const reference = mountCellPhoto(referenceFigure, show);

  function show() {
    const sample = CELL_SAMPLES[record.sample];
    const selected = record.observations[record.sample];
    task.textContent = sample.task + ' 点右图的 A 或 B。';
    referenceFigure.querySelector('figcaption').textContent = CELL_SAMPLES.onion.name;
    comparisonFigure.querySelector('figcaption').textContent = sample.name;
    samples.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.sample === record.sample)));
    spots.forEach((button, index) => {
      const [x, y] = sample.spots[index];
      button.style.setProperty('--spot-x', `${x}%`);
      button.style.setProperty('--spot-y', `${y}%`);
      button.hidden = !comparison.ready;
      button.setAttribute('aria-label', sample.descriptions[index]);
      button.setAttribute('aria-pressed', String(selected === index));
    });
    status.textContent = comparison.ready
      ? selected === undefined ? '' : selected === sample.answer ? sample.found : sample.hint
      : comparison.failed ? '对照照片暂不可见。可以重试，也可以看看下面的细胞结构模型。' : '正在加载对照照片。';
  }
  samples.forEach(button => button.addEventListener('click', () => {
    record.sample = button.dataset.sample;
    comparison.show(CELL_SAMPLES[record.sample]);
    save();
    show();
  }));
  spots.forEach((button, index) => button.addEventListener('click', () => {
    if (!comparison.ready) return;
    record.observations[record.sample] = index;
    save();
    show();
    const photo = button.parentElement.getBoundingClientRect();
    const feedback = status.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const contentTop = Math.min(photo.top, feedback.top);
    const contentBottom = Math.max(photo.bottom, feedback.bottom);
    if (contentBottom - contentTop <= viewportHeight - 16) {
      const offset = contentBottom > viewportHeight - 8 ? contentBottom - viewportHeight + 8 : Math.min(0, contentTop - 8);
      if (offset) window.scrollBy({ top: offset, behavior: 'instant' });
    }
    if (index === CELL_SAMPLES[record.sample].answer) creditObservation();
  }));
  reference.show(CELL_SAMPLES.onion);
  comparison.show(CELL_SAMPLES[record.sample]);
}

function mountCellOptics() {
  const module = outlet.querySelector('[data-cell-optics]');
  const slider = module.querySelector('#cell-focus');
  const focus = module.querySelector('[data-cell-focus-feedback]');
  const view = module.querySelector('.cell-focus-model');
  const cover = module.querySelector('[data-cell-cover-model]');
  const coverExercise = cover.closest('.cell-optic-grid');
  const coverFeedback = module.querySelector('[data-cell-cover-feedback]');
  const coverButtons = [...module.querySelectorAll('[data-cell-cover]')];
  function focusView() {
    const offset = Number(slider.value) - 62;
    const sharp = Math.abs(offset) <= 8;
    view.style.setProperty('--cell-blur', `${Math.min(5, Math.abs(offset) / 9)}px`);
    const text = sharp ? '边界清楚了。再转过头，会变模糊。'
      : offset < 0 ? '边界较模糊。再往右试一点。' : '转过头了。往左一点找清楚的位置。';
    slider.setAttribute('aria-valuetext', sharp ? '较清楚' : '较模糊');
    focus.textContent = text;
  }
  slider.addEventListener('input', focusView);
  focusView();
  coverButtons.forEach(button => button.addEventListener('click', () => {
    const method = button.dataset.cellCover;
    cover.dataset.method = method;
    coverButtons.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    coverFeedback.textContent = method === 'edge'
      ? '一边先接触水，水会沿着盖玻片铺开，空气更容易从另一边出去。'
      : '平着落下容易把空气困在下面。在显微镜里，气泡会挡住一部分要观察的材料。';
    keepCellExerciseVisible(coverExercise);
  }));
}

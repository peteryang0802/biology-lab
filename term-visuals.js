'use strict';

function strokeDiagram(ctx, points, color, width = 2) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function fillOval(ctx, x, y, rx, ry, color, edge) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  if (edge) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = edge;
    ctx.stroke();
  }
}

function paintBreath(canvas, frame) {
  const ctx = setCanvasSize(canvas, 300, 104);
  if (!ctx) return;
  const neutral = frame === -1;
  const inhale = frame === 0;
  const diaphragmControlY = neutral ? 62 : inhale ? 90 : 54;
  const lungScale = neutral ? .86 : inhale ? 1 : .76;
  ctx.clearRect(0, 0, 300, 104);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(95, 87);
  ctx.bezierCurveTo(73, 4, 124, 18, 138, 15);
  ctx.lineTo(162, 15);
  ctx.bezierCurveTo(176, 18, 227, 4, 205, 87);
  ctx.strokeStyle = '#8b9d90';
  ctx.lineWidth = 2;
  ctx.stroke();
  for (const side of [-1, 1]) {
    fillOval(ctx, 150 + 26 * side, inhale ? 52 : 47, 24 * lungScale, 31 * lungScale, '#eebcba', '#995155');
    strokeDiagram(ctx, [[150, 35], [150 + side * 19, 47]], '#377d89', 3);
  }
  ctx.beginPath();
  ctx.moveTo(97, 88);
  ctx.quadraticCurveTo(150, diaphragmControlY, 203, 88);
  ctx.strokeStyle = '#436853';
  ctx.lineWidth = 5;
  ctx.stroke();
  strokeDiagram(ctx, [[150, 8], [150, 35]], '#377d89', 4);
  if (neutral) return;
  const point = inhale ? 33 : 8;
  const tail = inhale ? 26 : 15;
  strokeDiagram(ctx, [[143, tail], [150, point], [157, tail]], '#377d89', 2.5);
  const move = inhale ? 89 : 71;
  const start = inhale ? 71 : 89;
  strokeDiagram(ctx, [[213, start], [213, move], [209, (move + start) / 2]], '#436853', 2);
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#233d35';
  ctx.fillText(inhale ? '空气进肺' : '空气出肺', 20, 29);
  ctx.fillText(inhale ? '膈肌下降' : '膈肌回升', 223, 85);
}

function paintLens(canvas, near, round) {
  const ctx = setCanvasSize(canvas, 320, 104);
  if (!ctx) return;
  ctx.clearRect(0, 0, 320, 104);
  const origin = near ? 81 : 28;
  const lens = 157;
  const screen = 262;
  const distance = lens - origin;
  const screenDistance = screen - lens;
  const idealDistance = round ? lens - 81 : lens - 28;
  const focalLength = idealDistance * screenDistance / (idealDistance + screenDistance);
  const imageX = lens + focalLength * distance / (distance - focalLength);
  const axis = 53;
  const objectTip = axis - 18;
  const slope = (axis - objectTip) / (lens - origin);
  const imageTip = axis + (imageX - lens) * slope;
  strokeDiagram(ctx, [[16, axis], [292, axis]], '#a9b9ac');
  fillOval(ctx, lens, axis, round ? 14 : 7, 34, '#bce2de', '#2f7775');
  strokeDiagram(ctx, [[screen, 18], [screen, 88]], '#536d5c', 4);
  strokeDiagram(ctx, [[origin, axis], [origin, objectTip], [origin - 5, objectTip + 6]], '#664b3e', 3);
  strokeDiagram(ctx, [[origin + 5, objectTip + 6], [origin, objectTip]], '#664b3e', 3);
  for (const outgoingY of [objectTip, axis]) {
    const projected = outgoingY + (imageTip - outgoingY) / (imageX - lens) * (screen - lens);
    strokeDiagram(ctx, [[origin, objectTip], [lens, outgoingY], [screen, Math.min(98, projected)]], '#a15b27', 2);
  }
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#233d35';
  ctx.fillText('物体', origin - 13, 21);
  ctx.fillText('晶状体', lens - 18, 99);
  ctx.fillText('视网膜', screen - 18, 13);
}

function renderTermVisual(entry, frameIndex) {
  if (entry.id === '7b-human-breathing') {
    return '<canvas class="term-scene" width="300" height="104" role="img" aria-label="胸腔、肺和膈肌的运动示意。文字记录在图下方。" data-breath></canvas>';
  }
  if (entry.id === '8a-alleles') {
    const [left, right] = entry.activity.states[frameIndex].label.split(' × ');
    return `<table class="genetics-grid" aria-label="横竖各代表一方可给出的基因，四格是后代的可能组合和表现">
      <thead><tr><td></td>${[...right].map(letter => `<th scope="col">${letter}</th>`).join('')}</tr></thead>
      <tbody>${[...left].map(letter => `<tr><th scope="row">${letter}</th>${[...right].map(other => {
        const combination = letter + other;
        const wrinkled = combination === 'rr';
        return `<td data-wrinkled="${wrinkled}">${combination}<span class="genetics-phenotype">${wrinkled ? '皱粒' : '圆粒'}</span></td>`;
      }).join('')}</tr>`).join('')}</tbody>
    </table>`;
  }
  return '';
}

function renderEyeBench(entry) {
  if (entry.id !== '7b-eye-model') return '';
  return `<section class="eye-bench" aria-label="纸上对焦实验">
    <div class="activity-switch" role="group" aria-label="物体距离">
      <button type="button" class="choice" data-eye="far" aria-pressed="true">看远处</button>
      <button type="button" class="choice" data-eye="near" aria-pressed="false">看近处</button>
    </div>
    <div class="activity-switch" role="group" aria-label="晶状体凸度">
      <button type="button" class="choice" data-eye="flat" aria-pressed="true">晶状体较扁</button>
      <button type="button" class="choice" data-eye="round" aria-pressed="false">晶状体较凸</button>
    </div>
    <canvas class="term-scene" width="320" height="104" role="img" aria-label="固定视网膜，比较射到视网膜上的两条光线。"></canvas>
    <p class="activity-feedback" role="status"></p>
  </section>`;
}

function mountEyeBench(host, eye = {}, persist = () => {}) {
  const bench = host.querySelector('.eye-bench');
  if (!bench) return;
  const canvas = bench.querySelector('canvas');
  const feedback = bench.querySelector('[role="status"]');
  const buttons = [...bench.querySelectorAll('button')];
  let near = eye?.near === true;
  let round = eye?.round === true;
  function paint() {
    paintLens(canvas, near, round);
    buttons[0].setAttribute('aria-pressed', String(!near));
    buttons[1].setAttribute('aria-pressed', String(near));
    buttons[2].setAttribute('aria-pressed', String(!round));
    buttons[3].setAttribute('aria-pressed', String(round));
    feedback.textContent = near === round ? '两条光线在屏幕上会合，模型显示成像清楚。' :
      '两条光线在屏幕上分开，成像变模糊。试试改变晶状体凸度。';
  }
  buttons.forEach(button => button.addEventListener('click', () => {
    if (button.dataset.eye === 'far' || button.dataset.eye === 'near') near = button.dataset.eye === 'near';
    else round = button.dataset.eye === 'round';
    paint();
    persist({ near, round });
    keepActivityFeedbackVisible(button, feedback);
  }));
  paint();
}

const animalPanels = [
  {
    id: 'fish',
    title: '鲫鱼 · 骨骼示意',
    alt: '一条侧身的鲫鱼。图中线有排列相连的小骨块，身体下方有一片扇形鳍。',
    spots: ['身体中线一串小骨块', '身体下方的扇形鳍'],
    good: '鲫鱼图 A 的小骨块在体内连成一列，它们是脊柱上的椎骨。',
    tryAgain: '鲫鱼图 B 是鳍。要找脊柱，请沿着身体中线找那列相连的小骨块。',
  },
  {
    id: 'shrimp',
    title: '小虾 · 外壳示意',
    alt: '一只侧身的小虾。腹部的壳由多段相接，头前伸出细长的触角。',
    spots: ['腹部表面的分段外壳', '头前的细长触角'],
    good: '小虾图 A 的分节在体表，是外骨骼的一部分。小虾体内没有脊柱。',
    tryAgain: '小虾图 B 是触角。沿腹部外沿找分段的壳，就能看出纹路是在体表。',
  },
];

const chainOrganisms = {
  frog: { name: '青蛙', clue: '吃蝗虫', color: '#4c7552' },
  grass: { name: '草', clue: '进行光合作用', color: '#44784b' },
  locust: { name: '蝗虫', clue: '吃草的叶片', color: '#6f663d' },
};

const treeLeaves = {
  fish: { name: '鲫鱼', trait: '有脊柱、鳍' },
  gecko: { name: '壁虎', trait: '有脊柱、四肢' },
  pigeon: { name: '家鸽', trait: '有脊柱、四肢、羽毛' },
  chicken: { name: '鸡', trait: '有脊柱、四肢、羽毛' },
};

const treeSteps = [
  { children: ['pigeon', 'chicken'], id: 'birds', name: '鸟类这一枝', trait: '羽毛', note: '有脊柱，翅是前肢' },
  { children: ['gecko', 'birds'], id: 'tetrapods', name: '有四肢的这一枝', trait: '四肢', note: '也都有脊柱' },
  { children: ['fish', 'tetrapods'], id: 'vertebrates', name: '完成的小树', trait: '脊柱' },
];

function fillPath(ctx, path, fill, stroke = '#304c40', lineWidth = 1.6) {
  const shape = new Path2D(path);
  ctx.fillStyle = fill;
  ctx.fill(shape);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke(shape);
}

function paintAnimalLab(canvas, id) {
  const ctx = setCanvasSize(canvas, 180, 100);
  if (!ctx) return;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (id === 'fish') {
    fillPath(ctx, 'M75 28 88 12 119 25 116 36Z', '#94b887');
    fillPath(ctx, 'M142 43 Q163 23 174 25 L170 47 174 71 Q158 66 143 56Z', '#94b887');
    fillPath(ctx, 'M14 48 Q33 22 73 23 Q116 23 150 45 L150 57 Q121 76 77 76 Q32 78 14 53Z', '#d9e3b7');
    fillPath(ctx, 'M43 58 Q66 58 63 70 L39 85 Q35 79 43 58Z', '#9ebd8b');
    strokeDiagram(ctx, [[46, 61], [40, 78]], '#52745e', 1);
    strokeDiagram(ctx, [[50, 62], [43, 77]], '#52745e', 1);
    fillOval(ctx, 27, 43, 4, 4, '#304c40');
    strokeDiagram(ctx, [[15, 52], [22, 53]], '#304c40', 1);
    ctx.strokeStyle = '#678177';
    ctx.beginPath();
    ctx.arc(25, 47, 19, -.82, .91);
    ctx.stroke();

    strokeDiagram(ctx, [[47, 46], [143, 51]], '#334d43', 1.7);
    for (let x = 51; x <= 141; x += 7.5) {
      const y = 46 + (x - 47) * .046;
      fillOval(ctx, x, y, 3.5, 3.2, '#fbf3da', '#466257');
      if (x < 112) {
        ctx.strokeStyle = '#668375';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + 3);
        ctx.quadraticCurveTo(x - 1, y + 13, x + 5, y + 20 - (x - 50) * .1);
        ctx.stroke();
      }
    }
  } else {
    fillPath(ctx, 'M55 37 Q69 26 96 30 Q130 33 145 53 Q149 63 146 72 L155 78 172 74 169 87 148 89 Q134 89 126 75 Q123 60 105 58 Q86 56 58 55 L45 52 49 42 35 38Z', '#f2c49b', '#744e3d');
    fillPath(ctx, 'M146 72 Q135 78 127 90 Q136 98 148 89 Q169 96 175 82 L154 76Z', '#e9a47d', '#744e3d');
    fillOval(ctx, 55, 39, 3, 3, '#4f4036');
    for (const [sx, sy, ex, ey] of [[78, 31, 75, 56], [93, 30, 91, 57], [108, 33, 104, 58], [121, 38, 115, 62], [133, 43, 122, 68], [141, 49, 127, 76]]) {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx - 7, ey - 12, ex, ey);
      ctx.strokeStyle = '#8d563b';
      ctx.lineWidth = 1.7;
      ctx.stroke();
    }
    for (let x = 64; x <= 106; x += 10) {
      strokeDiagram(ctx, [[x, 55], [x - 4, 65], [x - 11, 73]], '#744e3d', 1.3);
    }
    ctx.beginPath();
    ctx.moveTo(47, 40);
    ctx.bezierCurveTo(30, 23, 24, 18, 8, 16);
    ctx.moveTo(47, 43);
    ctx.bezierCurveTo(31, 29, 18, 28, 7, 33);
    ctx.strokeStyle = '#744e3d';
    ctx.lineWidth = 1.7;
    ctx.stroke();
  }
}

function paintChainOrganism(canvas, id) {
  const ctx = setCanvasSize(canvas, 70, 40);
  if (!ctx) return;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const color = chainOrganisms[id].color;
  if (id === 'grass') {
    for (const path of ['M34 36 Q28 18 12 9 Q12 23 29 36Z', 'M31 36 Q35 13 40 4 Q49 18 38 36Z', 'M39 36 Q48 22 61 15 Q56 29 44 36Z']) {
      fillPath(ctx, path, '#a6c98e', color);
    }
  } else if (id === 'frog') {
    fillOval(ctx, 39, 25, 19, 10, '#a4c68f', color);
    fillOval(ctx, 46, 31, 12, 5, '#a4c68f', color);
    fillOval(ctx, 24, 19, 12, 8, '#a4c68f', color);
    fillOval(ctx, 23, 12, 4, 4, '#e2e5a2', color);
    fillOval(ctx, 23, 12, 1.4, 1.4, color);
    strokeDiagram(ctx, [[24, 26], [18, 33], [13, 33]], color, 1.5);
    strokeDiagram(ctx, [[14, 22], [20, 23]], color, 1);
  } else {
    fillOval(ctx, 39, 19, 21, 6, '#d3b882', color);
    fillOval(ctx, 21, 15, 7, 6, '#d3b882', color);
    fillOval(ctx, 19, 13, 1.6, 1.6, color);
    strokeDiagram(ctx, [[17, 11], [11, 4], [5, 3]], color, 1.2);
    strokeDiagram(ctx, [[25, 22], [20, 29], [14, 32]], color, 1.2);
    strokeDiagram(ctx, [[34, 22], [42, 30], [36, 36]], color, 1.2);
    strokeDiagram(ctx, [[51, 20], [58, 23], [44, 32], [59, 35]], color, 1.8);
  }
}

function renderAnimalLab() {
  return `<section class="extra-lab" data-visual-lab="animals" aria-label="在图上找动物结构">
    <p class="lab-instruction">每张图各点一个位置。找出鲫鱼脊柱和小虾背上纹路的来处。</p>
    <div class="lab-specimens">
      ${animalPanels.map(panel => `<figure>
        <figcaption>${panel.title}</figcaption>
        <div class="lab-specimen" data-animal-image="${panel.id}">
          <canvas width="180" height="100" role="img" aria-label="${panel.alt}"></canvas>
          ${panel.spots.map((spot, index) => `<button type="button" class="lab-hotspot" data-animal="${panel.id}" data-spot="${index}"
            aria-label="${panel.title}的${index === 0 ? 'A' : 'B'}点，${spot}" aria-pressed="false"><span aria-hidden="true">${index === 0 ? 'A' : 'B'}</span></button>`).join('')}
        </div>
      </figure>`).join('')}
    </div>
    <p class="activity-feedback" data-visual-feedback role="status"></p>
    <button type="button" class="text-control lab-hint" data-animal-hint>还不确定</button>
  </section>`;
}

function renderChainLab() {
  return `<section class="extra-lab" data-visual-lab="chain" aria-label="在图上连接食物链">
    <p class="lab-instruction">点卡片连出能量流向。可以先连一段取食关系，再补全食物链。</p>
    <div class="chain-pool" aria-label="可以加入食物链的生物">
      ${Object.entries(chainOrganisms).map(([id, item]) => `<button type="button" class="lab-organism" data-chain-pick="${id}" aria-pressed="false">
        <canvas width="70" height="40" aria-hidden="true"></canvas><strong>${item.name}</strong><small>${item.clue}</small>
        ${id === 'grass' ? '<small class="chain-placement" hidden></small>' : ''}
      </button>`).join('')}
    </div>
    <div class="chain-preview" aria-label="我连的食物链">
      <span class="chain-slot" data-chain-slot="0">第 1 位</span>
      <span class="chain-arrow" aria-label="能量流向" data-chain-arrow="0">→</span>
      <span class="chain-slot" data-chain-slot="1">第 2 位</span>
      <span class="chain-arrow" aria-label="能量流向" data-chain-arrow="1">→</span>
      <span class="chain-slot" data-chain-slot="2">第 3 位</span>
    </div>
    <p class="activity-feedback" data-visual-feedback role="status"></p>
    <div class="lab-actions">
      <button type="button" class="text-control" data-chain-undo disabled>撤销一步</button>
      <button type="button" class="text-control" data-chain-hint>还不确定</button>
    </div>
  </section>`;
}

function renderTreeLab() {
  return `<section class="extra-lab" data-visual-lab="tree" aria-label="摆一棵简化进化树">
    <p class="lab-instruction">点两张卡，再选它们都有的特征。先找能把最小一组单独分出来的线索。</p>
    <div class="tree-controls">
      <div class="tree-pool" aria-label="可连接的动物或分枝" data-tree-pool></div>
      <div class="tree-traits" aria-label="可比较的特征">
        ${['羽毛', '四肢', '脊柱', '鳍'].map(trait => `<button type="button" class="choice" data-tree-trait="${trait}">${trait}</button>`).join('')}
      </div>
    </div>
    <div class="tree-result">
      <p class="activity-feedback" data-visual-feedback role="status"></p>
      <div data-tree-preview hidden></div>
    </div>
    <button type="button" class="text-control lab-hint" data-tree-restart hidden>重新摆</button>
  </section>`;
}

function paintPlantBottle(canvas, leaves) {
  const ctx = setCanvasSize(canvas, 140, 83);
  if (!ctx) return;
  fillPath(ctx, 'M44 10H96L94 21 101 29V70Q101 77 94 77H46Q39 77 39 70V29L46 21Z', '#d5e7de', '#638477');
  fillPath(ctx, 'M40 65H100V70Q100 76 93 76H47Q40 76 40 70Z', '#9b7652', '#76593f');
  strokeDiagram(ctx, [[70, 66], [70, leaves === 4 ? 36 : 28]], '#427349');
  for (let i = 0; i < leaves; i++) {
    const side = i % 2 ? 1 : -1;
    fillOval(ctx, 70 + side * 9, 56 - Math.floor(i / 2) * 10, 9, 4, '#8fbf79', '#427349');
  }
}

function renderBottleLab() {
  return `<section class="extra-lab" data-visual-lab="bottle" aria-label="比较两瓶模拟观察记录">
    <p class="lab-instruction">两瓶植物都从 4 片叶开始。想知道光照有没有影响，你打算怎么比？</p>
    <div class="bottle-choices" role="group" aria-label="选两瓶之间的区别">
      <button type="button" class="choice" data-bottle="light" aria-pressed="false">只改光照</button>
      <button type="button" class="choice" data-bottle="mixed" aria-pressed="false">光照和水量一起改</button>
    </div>
    <div class="lab-specimens" aria-label="两份模拟记录">
      ${['甲', '乙'].map(name => `<figure data-bottle-record="${name}"><canvas width="140" height="83" aria-hidden="true"></canvas><figcaption>${name}瓶 · 4 片叶</figcaption></figure>`).join('')}
    </div>
    <p class="activity-feedback" data-visual-feedback role="status"></p>
    <button type="button" class="text-control lab-hint" data-bottle-hint>还不确定</button>
  </section>`;
}

function renderExtraLab(entry) {
  if (entry.id === '8b-animal-groups') return renderAnimalLab();
  if (entry.id === '8b-ecosystem') return renderChainLab();
  if (entry.id === '8a-build-tree') return renderTreeLab();
  if (entry.id === '8b-eco-bottle') return renderBottleLab();
  return '';
}

function keepLabVisible(lab, control, feedback) {
  const viewport = Math.min(innerHeight, visualViewport?.height ?? innerHeight);
  if (lab.getBoundingClientRect().height <= viewport - 16) {
    lab.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  } else {
    keepActivityFeedbackVisible(control, feedback);
  }
}

function mountAnimalLab(lab, values, save, complete) {
  const feedback = lab.querySelector('[data-visual-feedback]');
  const buttons = [...lab.querySelectorAll('[data-animal]')];
  for (const panel of animalPanels) paintAnimalLab(lab.querySelector(`[data-animal-image="${panel.id}"] canvas`), panel.id);
  function redraw() {
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(values[button.dataset.animal] === Number(button.dataset.spot)));
    }
  }
  if (values.fish === 0 && values.shrimp === 0) feedback.textContent = '鲫鱼的椎骨连在体内，小虾的分节在体表。可以用内部结构判断有没有脊柱。';
  redraw();
  buttons.forEach(button => button.addEventListener('click', () => {
    const panel = animalPanels.find(item => item.id === button.dataset.animal);
    values[panel.id] = Number(button.dataset.spot);
    redraw();
    feedback.textContent = values[panel.id] === 0 ? panel.good : panel.tryAgain;
    save();
    if (values.fish === 0 && values.shrimp === 0) {
      feedback.textContent = '找对了。鲫鱼的椎骨连在体内，小虾的分节在体表。可以用内部结构判断有没有脊柱。';
      complete();
    }
    keepLabVisible(lab, button, feedback);
  }));
  lab.querySelector('[data-animal-hint]').addEventListener('click', event => {
    feedback.textContent = '先看看 A、B 标在哪里。鱼图要找体内的结构，虾图要找体表的结构。';
    keepLabVisible(lab, event.currentTarget, feedback);
  });
}

function mountChainLab(lab, values, save, complete, legacyItems) {
  const feedback = lab.querySelector('[data-visual-feedback]');
  const slots = [...lab.querySelectorAll('[data-chain-slot]')];
  const arrows = [...lab.querySelectorAll('[data-chain-arrow]')];
  const undo = lab.querySelector('[data-chain-undo]');
  const buttons = [...lab.querySelectorAll('[data-chain-pick]')];
  const placement = lab.querySelector('.chain-placement');
  const correct = ['grass', 'locust', 'frog'];
  const historyLimit = 12;
  // The previous version saved the indices of the three cards in this order.
  const legacyOrder = ['frog', 'grass', 'locust'];
  function readChain(list) {
    return [...new Set(list.filter(id => typeof id === 'string' && Object.hasOwn(chainOrganisms, id)))];
  }
  const previous = Array.isArray(legacyItems) ? legacyItems.filter(Number.isInteger).map(index => legacyOrder[index]) : [];
  let chain = readChain(Array.isArray(values.chain) ? values.chain : previous);
  let history = Array.isArray(values.chainHistory) ? values.chainHistory.slice(-historyLimit).filter(Array.isArray).map(readChain) : [];
  if (history.at(-1)?.join() !== chain.join()) {
    history = Array.from({ length: chain.length + 1 }, (_, index) => chain.slice(0, index));
  }
  function canPlaceGrassFirst() {
    return chain[0] === 'locust' && chain[1] === 'frog';
  }
  buttons.forEach(button => paintChainOrganism(button.querySelector('canvas'), button.dataset.chainPick));
  function redraw() {
    const needsStart = canPlaceGrassFirst() && chain.length === 2;
    const shown = needsStart ? [null, ...chain] : chain;
    slots.forEach((slot, index) => {
      const start = needsStart && index === 0;
      slot.toggleAttribute('data-needs-start', start);
      slot.textContent = start ? '待补起点' : chainOrganisms[shown[index]]?.name || `第 ${index + 1} 位`;
    });
    arrows.forEach((arrow, index) => {
      arrow.dataset.valid = !shown[index] || !shown[index + 1] ? 'unset' :
        String(correct.indexOf(shown[index + 1]) - correct.indexOf(shown[index]) === 1);
      arrow.setAttribute('aria-label', arrow.dataset.valid === 'false' ? '需调整的箭头' : '能量流向');
    });
    for (const button of buttons) button.setAttribute('aria-pressed', String(chain.includes(button.dataset.chainPick)));
    placement.hidden = !canPlaceGrassFirst();
    placement.textContent = needsStart ? '补到前面' : '移到前面';
    undo.disabled = history.length <= 1;
  }
  function explain() {
    if (canPlaceGrassFirst()) {
      const action = chain.length === 2 ? '补到' : '移到';
      return `蝗虫 → 青蛙这一段连对了。蝗虫吃草，点「草」${action}最前面。`;
    }
    const badPair = arrows.findIndex(arrow => arrow.dataset.valid === 'false');
    if (badPair !== -1) {
      const left = chain[badPair];
      const right = chain[badPair + 1];
      if (left === 'frog' && right === 'locust') return '青蛙吃蝗虫。交换这两者，能量就从蝗虫指向青蛙。';
      if (left === 'locust' && right === 'grass') return '蝗虫吃草的叶片。交换这两者，能量就从草指向蝗虫。';
      return '这三张卡里没有记录青蛙和草直接取食。找找吃草、又被青蛙吃的生物。';
    }
    if (chain.length === 1 && chain[0] !== 'grass') return '可以先连一段。把食物放在前面，吃它的生物放在后面。';
    if (chain.length === 3) return '连对了。草 → 蝗虫 → 青蛙，箭头沿着取食传递物质和能量。';
    return chain.length === 2 ? '这一步连对了，再找谁从下一份食物得到能量。' : '';
  }
  function update(control) {
    values.chain = chain;
    values.chainHistory = history.slice();
    redraw();
    feedback.textContent = explain();
    save();
    if (chain.length === 3 && chain.every((id, index) => id === correct[index])) complete();
    if (control === undo && undo.disabled) buttons[0].focus({ preventScroll: true });
    else keepActivityFeedbackVisible(control, feedback, lab);
  }
  buttons.forEach(button => button.addEventListener('click', () => {
    const picked = button.dataset.chainPick;
    if (picked === 'grass' && canPlaceGrassFirst()) chain = correct.slice();
    else if (chain.includes(picked)) chain = chain.filter(id => id !== picked);
    else chain = [...chain, picked];
    history.push(chain);
    if (history.length > historyLimit) history.shift();
    update(button);
  }));
  undo.addEventListener('click', () => {
    history.pop();
    chain = history.at(-1);
    update(undo);
  });
  lab.querySelector('[data-chain-hint]').addEventListener('click', event => {
    feedback.textContent = canPlaceGrassFirst() ? explain() : '每次问一遍：谁被谁吃？把被吃的生物放在箭头尾端。';
    keepActivityFeedbackVisible(event.currentTarget, feedback);
  });
  redraw();
  feedback.textContent = explain();
}

function treeGroups(step) {
  const groups = Object.keys(treeLeaves);
  for (const { children, id } of treeSteps.slice(0, step)) {
    for (const child of children) groups.splice(groups.indexOf(child), 1);
    groups.push(id);
  }
  return groups;
}

function treeBranch(id) {
  if (Object.hasOwn(treeLeaves, id)) return `<li class="tree-leaf">${treeLeaves[id].name}</li>`;
  const group = treeSteps.find(step => step.id === id);
  return `<li class="tree-branch"><span>共有特征 · ${group.trait}</span><ul>${group.children.map(treeBranch).join('')}</ul></li>`;
}

function describeExtraLab(entry, record) {
  if (entry.id !== '8a-build-tree') return [];
  const step = record.visualLab?.treeStep;
  if (!Number.isInteger(step) || step < 1 || step > treeSteps.length) return [];
  return treeSteps.slice(0, step).map(({ children, trait }) => {
    const names = children.map(id => treeLeaves[id]?.name || treeSteps.find(group => group.id === id).name);
    return `${names.join('与')}合枝，共有特征是${trait}。`;
  });
}

function mountTreeLab(lab, values, save, complete) {
  const pool = lab.querySelector('[data-tree-pool]');
  const preview = lab.querySelector('[data-tree-preview]');
  const feedback = lab.querySelector('[data-visual-feedback]');
  const controls = lab.querySelector('.tree-controls');
  const result = lab.querySelector('.tree-result');
  const traits = lab.querySelector('.tree-traits');
  const restart = lab.querySelector('[data-tree-restart]');
  let step = Number.isInteger(values.treeStep) && values.treeStep >= 0 && values.treeStep <= treeSteps.length ? values.treeStep : 0;
  let selection = Array.isArray(values.treeSelection) ?
    [...new Set(values.treeSelection.filter(id => treeGroups(step).includes(id)))].slice(0, 2) : [];
  function drawSelection() {
    for (const button of pool.querySelectorAll('[data-tree-pick]')) {
      button.setAttribute('aria-pressed', String(selection.includes(button.dataset.treePick)));
    }
  }
  function render() {
    pool.innerHTML = step === treeSteps.length ? '' : treeGroups(step).map(id => {
      const leaf = treeLeaves[id];
      const group = treeSteps.find(group => group.id === id);
      return `<button type="button" class="choice" data-tree-pick="${id}" aria-pressed="false"><strong>${leaf?.name || group.name}</strong><small>${leaf?.trait || group.note}</small></button>`;
    }).join('');
    drawSelection();
    controls.hidden = step === treeSteps.length;
    preview.hidden = step === 0;
    preview.innerHTML = step ? `<ul class="tree-map" aria-label="我画出的分枝">${treeBranch(treeSteps[step - 1].id)}</ul>` : '';
    restart.hidden = step === 0 && selection.length === 0;
  }
  function storeTree() {
    values.treeStep = step;
    values.treeSelection = selection.slice();
    save();
  }
  pool.addEventListener('click', event => {
    const button = event.target.closest('[data-tree-pick]');
    if (!button) return;
    const id = button.dataset.treePick;
    selection = selection.includes(id) ? selection.filter(value => value !== id) : [...selection, id].slice(-2);
    drawSelection();
    restart.hidden = step === 0 && selection.length === 0;
    feedback.textContent = selection.length === 2 ? '现在选一个这两张卡都具备的特征。' : '再点一张卡，与它对照。';
    storeTree();
    keepLabVisible(lab, button, result);
  });
  traits.addEventListener('click', event => {
    const button = event.target.closest('[data-tree-trait]');
    if (!button || step === treeSteps.length) return;
    const current = treeSteps[step];
    if (selection.length !== 2) feedback.textContent = '先选要比较的两张卡。';
    else if (!current.children.every(id => selection.includes(id)) || button.dataset.treeTrait !== current.trait) {
      feedback.textContent = [
        '先找一个能从四张卡里单独分出两张的特征。几张卡有羽毛？',
        '鸟的翅是前肢。再找与鸟共有四肢的一张卡。',
        '鲫鱼没有四肢，但和其他三个例子都有脊柱。',
      ][step];
    } else {
      step++;
      selection = [];
      render();
      storeTree();
      feedback.textContent = step === treeSteps.length ?
        '小树摆好了。这棵树只使用了几条结构线索，还能用更多资料检验。' :
        `你用「${current.trait}」合成了一枝。再比较剩下的卡。`;
      if (step === treeSteps.length) complete();
      const next = pool.querySelector('button') || restart;
      next.focus({ preventScroll: true });
      keepLabVisible(lab, next, result);
      return;
    }
    keepLabVisible(lab, button, result);
  });
  restart.addEventListener('click', () => {
    step = 0;
    selection = [];
    render();
    storeTree();
    feedback.textContent = '从四张卡重新开始。';
    const first = pool.querySelector('button');
    first.focus({ preventScroll: true });
    keepLabVisible(lab, first, result);
  });
  render();
  if (step === treeSteps.length) feedback.textContent = '这是你上次摆好的小树。';
}

function mountBottleLab(lab, values, save) {
  const feedback = lab.querySelector('[data-visual-feedback]');
  const buttons = [...lab.querySelectorAll('[data-bottle]')];
  function redraw() {
    const mode = values.bottle === 'light' || values.bottle === 'mixed' ? values.bottle : '';
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.bottle === mode));
    for (const figure of lab.querySelectorAll('[data-bottle-record]')) {
      const name = figure.dataset.bottleRecord;
      const leaves = name === '甲' || !mode ? 4 : 6;
      paintPlantBottle(figure.querySelector('canvas'), leaves);
      const condition = name === '甲' ? '光照较弱' : mode === 'light' ? '光照较强，水量相同' : '光照较强，水量也较多';
      figure.querySelector('figcaption').textContent = mode ? `${name}瓶 · ${leaves} 片叶（模拟） · ${condition}` : `${name}瓶 · 4 片叶`;
    }
    feedback.textContent = mode === 'light' ? '这次只改变光照，模拟记录里乙多了两片叶。比较变得更清楚，也可以再找一对瓶重复观察。' :
      mode === 'mixed' ? '乙比甲多了两片叶。光照和水量一起变了，这份记录分不清各自的影响。' : '';
  }
  buttons.forEach(button => button.addEventListener('click', () => {
    values.bottle = button.dataset.bottle;
    redraw();
    save();
    keepActivityFeedbackVisible(button, feedback, lab);
  }));
  lab.querySelector('[data-bottle-hint]').addEventListener('click', event => {
    feedback.textContent = '只想查光照时，先想想怎样让水量保持一样。';
    keepActivityFeedbackVisible(event.currentTarget, feedback);
  });
  redraw();
}

function mountExtraLab(host, entry, record, persist) {
  const lab = host.querySelector('[data-visual-lab]');
  if (!lab) return;
  const saved = record.visualLab;
  const values = saved && typeof saved === 'object' && !Array.isArray(saved) ? { ...saved } : {};
  function save() {
    record.visualLab = { ...values };
    persist();
  }
  const complete = () => markPracticed(entry);
  if (lab.dataset.visualLab === 'animals') mountAnimalLab(lab, values, save, complete);
  else if (lab.dataset.visualLab === 'chain') mountChainLab(lab, values, save, complete, record.items);
  else if (lab.dataset.visualLab === 'tree') mountTreeLab(lab, values, save, complete);
  else if (lab.dataset.visualLab === 'bottle') mountBottleLab(lab, values, save);
}

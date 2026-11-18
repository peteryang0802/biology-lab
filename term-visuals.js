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
  const inhale = frame === 0;
  const diaphragm = inhale ? 91 : 74;
  const lungScale = inhale ? 1 : .76;
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
    fillOval(ctx, 150 + 26 * side, inhale ? 53 : 48, 24 * lungScale, 31 * lungScale, '#eebcba', '#995155');
    strokeDiagram(ctx, [[150, 35], [150 + side * 19, 47]], '#377d89', 3);
  }
  ctx.beginPath();
  ctx.moveTo(97, 88);
  ctx.quadraticCurveTo(150, diaphragm - 20, 203, 88);
  ctx.strokeStyle = '#436853';
  ctx.lineWidth = 5;
  ctx.stroke();
  strokeDiagram(ctx, [[150, 8], [150, 35]], '#377d89', 4);
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
    return `<table class="genetics-grid" aria-label="横竖各代表一方可给出的基因，四格是后代的可能组合">
      <thead><tr><td></td>${[...right].map(letter => `<th scope="col">${letter}</th>`).join('')}</tr></thead>
      <tbody>${[...left].map(letter => `<tr><th scope="row">${letter}</th>${[...right].map(other => `<td data-wrinkled="${letter + other === 'rr'}">${letter + other}</td>`).join('')}</tr>`).join('')}</tbody>
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

function mountEyeBench(host) {
  const bench = host.querySelector('.eye-bench');
  if (!bench) return;
  const canvas = bench.querySelector('canvas');
  const feedback = bench.querySelector('[role="status"]');
  const buttons = [...bench.querySelectorAll('button')];
  let near = false;
  let round = false;
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
    keepActivityFeedbackVisible(button, feedback);
  }));
  paint();
}

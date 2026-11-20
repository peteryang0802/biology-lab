'use strict';

function observationDiagram(kind) {
  if (kind !== 'breathing-hood') return '';
  return `<figure class="observation-diagram">
    <svg viewBox="0 0 330 158" role="img" aria-label="外界连向穿过密封塞的Y形导管，两支管各通往一个气球，导管与气球外的罩腔隔绝。底部软膜向下拉。" xmlns="http://www.w3.org/2000/svg">
      <path d="M94 140 V67 Q94 54 105 48 L125 40 V32 H203 V40 L223 48 Q234 54 234 67 V140 Z" fill="#f5f9fd" stroke="#507ba9" stroke-width="2"/>
      <rect x="124" y="26" width="80" height="13" rx="3" fill="#967351"/>
      <path d="M94 140 Q164 157 234 140" fill="none" stroke="#567741" stroke-width="4"/>
      <ellipse cx="133" cy="101" rx="22" ry="29" fill="#aad8ef" stroke="#426e98" stroke-width="2"/>
      <ellipse cx="196" cy="101" rx="22" ry="29" fill="#aad8ef" stroke="#426e98" stroke-width="2"/>
      <path d="M164 10 V62 L133 87 M164 62 L196 87" fill="none" stroke="#244a70" stroke-width="6" stroke-linecap="round"/>
      <g fill="#244a70" font-size="13" font-family="sans-serif"><text x="183" y="17">外界</text><text x="34" y="32">密封塞</text><text x="253" y="60">罩腔</text><text x="252" y="104">气球</text><text x="248" y="149">软膜</text></g>
      <path d="M81 28 H124 M250 55 L225 67 M249 99 L217 101 M244 143 L232 142" stroke="#507ba9" fill="none" stroke-width="1.5"/>
    </svg>
    <figcaption>呼吸演示模型 · 管子和罩腔是分开的</figcaption>
  </figure>`;
}

function biologyObservationCheck(entry, stage, task) {
  const key = stage === 'review' ? 'transferEvidence' : task.storageKey || 'lessonEvidence';
  const old = state.activities?.[entry.id]?.[key];
  const saved = old?.task === task.id ? old : {};
  let picks = Array.isArray(saved.picks) ? [...new Set(saved.picks.filter(i => Number.isInteger(i) && task.choices[i]))] : [];
  const savedEvidence = Array.isArray(saved.evidence) ? saved.evidence : [saved.record];
  let evidence = [...new Set(savedEvidence.filter(index => Number.isInteger(index) && task.records[index]))];
  let phase = ['choose', 'cite', 'done'].includes(saved.phase) ? saved.phase : 'choose';
  let outcome = ['ready', 'retry', 'correct'].includes(saved.outcome) ? saved.outcome : 'ready';
  let usedHelp = saved.usedHelp === true;
  let hadError = saved.hadError === true;
  const ordering = Array.isArray(task.order);
  const count = task.order?.length ?? (Array.isArray(task.answer) ? task.answer.length : 1);
  const html = document.createElement('section');
  html.className = 'observation-check';
  html.dataset.observationCheck = stage;
  html.innerHTML = `
    <h2>${escape(task.prompt)}</h2>
    <div class="observation-grid">
      <fieldset class="observation-records"><legend>${escape(task.source || '观察记录')}</legend>
        ${observationDiagram(task.diagram)}
        ${task.records.map((text, index) => `<div class="observation-record" data-record-line="${index}"><span>${escape(text)}</span>
          <button type="button" data-pick-record="${index}" aria-pressed="false" hidden>${escape(text)}</button></div>`).join('')}
      </fieldset>
      <fieldset class="observation-picks"><legend>${escape(task.instruction || '作出你的判断')}</legend>
        <div class="observation-options">
          ${task.choices.map((text, index) => `<button type="button" data-observation-pick="${index}" aria-pressed="false">${escape(text)}</button>`).join('')}
        </div>
        <p data-observation-order></p>
      </fieldset>
    </div>
    <div class="observation-controls">
      <button type="button" data-verify-observation>核对</button>
      <button type="button" class="text-control" data-observation-hint>给一点线索</button>
    </div>
    <p class="feedback" role="status" tabindex="-1"></p>
  `;
  const by = selector => html.querySelector(selector);
  const pickButtons = [...html.querySelectorAll('[data-observation-pick]')];
  const recordButtons = [...html.querySelectorAll('[data-pick-record]')];
  const check = by('[data-verify-observation]');
  const help = by('[data-observation-hint]');
  const result = by('.feedback');
  const answer = task.order || (Array.isArray(task.answer) ? task.answer : [task.answer]);
  const expected = Array.isArray(task.evidence) ? task.evidence : Number.isInteger(task.evidence) ? [task.evidence] : [];
  const correctPicks = () => picks.length === count && (ordering
    ? answer.every((index, position) => picks[position] === index)
    : answer.every(index => picks.includes(index)));
  const evidenceRequired = expected.length > 0;
  const correctEvidence = () => evidence.length === expected.length && expected.every(index => evidence.includes(index));
  if ((phase === 'cite' || phase === 'done') && !correctPicks() ||
      phase === 'done' && evidenceRequired && !correctEvidence()) {
    phase = 'choose';
    outcome = 'ready';
  }
  function save() {
    saveActivityField(entry.id, key, {task: task.id, picks, evidence, phase, outcome, usedHelp, hadError, feedback: result.textContent});
  }
  function draw() {
    const cite = phase === 'cite' && evidenceRequired;
    html.dataset.observationPhase = phase;
    html.dataset.result = outcome;
    by('.observation-options').hidden = phase !== 'choose';
    by('[data-observation-order]').textContent = ordering
      ? picks.length ? '我的顺序　' + picks.map(index => task.choices[index]).join(' → ') +
        (phase === 'choose' ? '（再点已选卡片可撤下）' : '')
        : task.orderInstruction || '按能量流向点卡片。'
      : picks.length ? '我的判断　' + picks.map(index => task.choices[index]).join('、') : '';
    for (const [index, button] of pickButtons.entries()) {
      button.setAttribute('aria-pressed', String(picks.includes(index)));
      button.disabled = phase !== 'choose';
    }
    for (const [index, button] of recordButtons.entries()) {
      button.hidden = !cite;
      button.previousElementSibling.hidden = cite;
      button.setAttribute('aria-pressed', String(evidence.includes(index)));
      button.parentElement.toggleAttribute('data-evidence-found', phase === 'done' && evidence.includes(index));
    }
    by('.observation-records legend').textContent = cite
      ? task.why || `选出 ${expected.length} 条支持判断的记录`
      : task.source || '观察记录';
    check.hidden = phase === 'done' || outcome === 'retry';
    check.disabled = cite ? evidence.length !== expected.length : picks.length !== count;
    check.className = outcome === 'retry' ? '' : 'action';
    check.textContent = cite ? '核对证据' : ordering ? task.orderInstruction ? '核对顺序' : '核对连接' : '核对判断';
    help.hidden = phase === 'done';
    showQuizOutcome(html, outcome);
  }
  function edit() {
    if (outcome === 'retry') result.textContent = '';
    outcome = 'ready';
    draw();
    save();
  }
  pickButtons.forEach((button, index) => button.addEventListener('click', () => {
    if (picks.includes(index)) picks = picks.filter(item => item !== index);
    else if (count === 1) picks = [index];
    else if (picks.length < count) picks = [...picks, index];
    edit();
  }));
  recordButtons.forEach((button, index) => button.addEventListener('click', () => {
    if (evidence.includes(index)) evidence = evidence.filter(item => item !== index);
    else if (expected.length === 1) evidence = [index];
    else if (evidence.length < expected.length) evidence = [...evidence, index];
    edit();
  }));
  function complete() {
    phase = 'done';
    outcome = 'correct';
    result.textContent = task.result + (stage !== 'review' ? ''
      : usedHelp ? ' 已按线索或重试后答对。' : ' 新材料首次独立答对。');
    if (stage === 'review') markReviewAttempt(entry, true, !usedHelp);
    else markPracticed(entry);
  }
  check.addEventListener('click', () => {
    if (phase === 'choose' && correctPicks() && evidenceRequired) {
      phase = 'cite';
      result.textContent = `判断已经选好。再找出 ${expected.length} 条支持它的记录。`;
      draw();
      save();
      recordButtons[0].focus({ preventScroll: true });
      return;
    }
    if (phase === 'choose' ? correctPicks() : correctEvidence()) {
      complete();
    } else {
      usedHelp = true;
      hadError = true;
      outcome = 'retry';
      const byChoice = task.wrong?.[picks[0]];
      result.textContent = phase === 'cite' ? task.evidenceHint || '看哪一条记录同时说明了你选的对象和这次判断的条件。'
        : byChoice ?? task.hint;
      if (stage === 'review') markReviewAttempt(entry, false, false);
    }
    draw();
    save();
    result.focus({ preventScroll: true });
    result.scrollIntoView({ block: 'nearest' });
  });
  help.addEventListener('click', () => {
    usedHelp = true;
    result.textContent = phase === 'cite' ? task.evidenceHint || '先看哪一条记录直接支持你的判断。' : task.hint;
    if (stage === 'review' && outcome !== 'retry') saveActivityField(entry.id, 'transferStatus', 'pending');
    save();
  });
  result.textContent = typeof saved.feedback === 'string' ? saved.feedback : '';
  draw();
  return html;
}

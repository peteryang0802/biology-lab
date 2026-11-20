'use strict';

function biologyObservationCheck(entry, stage, task) {
  const key = stage === 'review' ? 'transferEvidence' : 'lessonEvidence';
  const old = state.activities?.[entry.id]?.[key];
  const saved = old?.task === task.id ? old : {};
  let picks = Array.isArray(saved.picks) ? [...new Set(saved.picks.filter(i => Number.isInteger(i) && task.choices[i]))] : [];
  let record = Number.isInteger(saved.record) && task.records[saved.record] ? saved.record : null;
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
        ${task.records.map((text, index) => `<div class="observation-record" data-record-line="${index}"><span>${escape(text)}</span>
          <button type="button" data-pick-record="${index}" aria-pressed="false" hidden>${escape(text)}</button></div>`).join('')}
      </fieldset>
      <fieldset class="observation-picks"><legend>${escape(task.instruction || '作出你的判断')}</legend>
        <div class="observation-options">
          ${task.choices.map((text, index) => `<button type="button" data-observation-pick="${index}" aria-pressed="false">${escape(text)}</button>`).join('')}
        </div>
        <p data-observation-order>${ordering ? '按能量流向点卡片。再点已选卡片，可撤下它。' : ''}</p>
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
  const expected = task.evidence;
  const correctPicks = () => picks.length === count && (ordering
    ? answer.every((index, position) => picks[position] === index)
    : answer.every(index => picks.includes(index)));
  const evidenceRequired = Number.isInteger(expected);
  if ((phase === 'cite' || phase === 'done') && !correctPicks() ||
      phase === 'done' && evidenceRequired && record !== expected) {
    phase = 'choose';
    outcome = 'ready';
  }
  function save() {
    saveActivityField(entry.id, key, {task: task.id, picks, record, phase, outcome, usedHelp, hadError, feedback: result.textContent});
  }
  function draw() {
    const cite = phase === 'cite' && evidenceRequired;
    html.dataset.observationPhase = phase;
    html.dataset.result = outcome;
    by('.observation-options').hidden = phase !== 'choose';
    by('[data-observation-order]').textContent = ordering
      ? picks.length ? '我连的方向　' + picks.map(index => task.choices[index]).join(' → ') +
        (phase === 'choose' ? '（再点已选卡片可撤下）' : '') : '按能量流向点卡片。'
      : picks.length ? '我的判断　' + picks.map(index => task.choices[index]).join('、') : '';
    for (const [index, button] of pickButtons.entries()) {
      button.setAttribute('aria-pressed', String(picks.includes(index)));
      button.disabled = phase !== 'choose';
    }
    for (const [index, button] of recordButtons.entries()) {
      button.hidden = !cite;
      button.previousElementSibling.hidden = cite;
      button.setAttribute('aria-pressed', String(index === record));
      button.parentElement.toggleAttribute('data-evidence-found', phase === 'done' && index === record);
    }
    by('.observation-records legend').textContent = cite
      ? task.why || '哪一条记录能支持你的判断？'
      : task.source || '观察记录';
    check.hidden = phase === 'done' || outcome === 'retry';
    check.disabled = cite ? record === null : picks.length !== count;
    check.className = outcome === 'retry' ? '' : 'action';
    check.textContent = cite ? '核对证据' : ordering ? '核对连接' : '核对判断';
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
    record = index;
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
      result.textContent = '判断已经选好。再指出一条能支持它的记录。';
      draw();
      save();
      recordButtons[0].focus({ preventScroll: true });
      return;
    }
    if (phase === 'choose' ? correctPicks() : record === expected) {
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

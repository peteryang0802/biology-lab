'use strict';

function activityRows(rows) {
  return rows.map((row, index) => `<span class="activity-row-copy">
    ${row.icon ? `<canvas width="62" height="46" aria-hidden="true" data-art="${escape(row.icon)}"></canvas>` : ''}
    <span class="activity-row-text"><strong>${escape(row.label)}</strong>${row.text ? `<span>${escape(row.text)}</span>` : ''}
      ${Number.isFinite(row.value) ? `<span class="activity-track" aria-hidden="true"><i style="width:${Math.min(100, Math.max(0, row.value))}%"></i></span>` : ''}
    </span>
    <span class="activity-mark" aria-hidden="true" data-mark="${index}" hidden></span>
  </span>`);
}

function paintActivityArt(host) {
  for (const canvas of host.querySelectorAll('canvas[data-art]')) {
    const ctx = setCanvasSize(canvas, 62, 46);
    if (!ctx) continue;
    ctx.scale(62 / 192, 46 / 144);
    globalThis.paintBioDiagram?.(ctx, canvas.dataset.art);
  }
}

function optionalEvidence(rows = []) {
  return rows.length ? `<ul class="activity-display">${activityRows(rows).map(row => `<li>${row}</li>`).join('')}</ul>` : '';
}

function activityMarkup(activity) {
  switch (activity.kind) {
    case 'switch':
      return `<div class="activity-switch" role="group" aria-label="切换观察条件">
        ${activity.states.map((frame, index) => `<button type="button" class="choice" data-frame="${index}" aria-pressed="false">${escape(frame.label)}</button>`).join('')}
      </div><div data-current-frame></div>`;
    case 'order':
    case 'evidence': {
      const order = activity.kind === 'order';
      const options = activityRows(order ? activity.tiles : activity.rows);
      return `<div class="activity-choice-board" role="group" aria-label="${order ? '按顺序点材料' : '选出支持判断的线索'}">
        ${options.map((row, index) => `<button type="button" class="choice activity-choice" data-item="${index}" aria-pressed="false">${row}</button>`).join('')}
      </div><div class="activity-actions">
        <button type="button" class="action" data-activity-check>核对${order ? '顺序' : '线索'}</button>
        <button type="button" class="text-control" data-activity-hint>还不确定</button>
        ${order ? '<button type="button" class="text-control" data-activity-clear>重新排</button>' : ''}
      </div>`;
    }
    case 'project':
      return `${optionalEvidence(activity.rows)}
        <div class="activity-fields">
          ${activity.fields.map((field, index) => `<label for="project-field-${index}">${escape(field.label)}
            <textarea id="project-field-${index}" rows="2" maxlength="400" placeholder="${escape(field.placeholder)}" data-draft="${index}"></textarea>
          </label>`).join('')}
        </div>
        <details class="project-check"><summary>交给别人前，用这几条自查</summary><ul>${(activity.criteria || []).map(check => `<li>${escape(check)}</li>`).join('')}</ul></details>
        <button type="button" class="text-control" data-export-work>下载我的作品</button>`;
    default: throw new Error('activity kind');
  }
}

function keepActivityFeedbackVisible(control, feedback, context = control) {
  requestAnimationFrame(() => {
    if (!feedback.isConnected || !feedback.textContent) return;
    const viewport = Math.min(innerHeight, visualViewport?.height ?? innerHeight);
    const bottom = feedback.getBoundingClientRect().bottom + 8;
    if (bottom <= viewport) return;
    const top = context.getBoundingClientRect().top - 8;
    const button = control.getBoundingClientRect();
    const needed = bottom - viewport;
    const shift = Math.min(needed, Math.max(top, button.top - 8));
    if (shift > 1) scrollBy({top: shift, behavior: 'instant'});
  });
}

function mountTermActivity(entry) {
  const activity = entry.activity;
  const host = outlet.querySelector('[data-term-activity]');
  const feedback = host.querySelector('[data-feedback]');
  const saved = state.activities?.[entry.id];
  const record = plainRecord(saved) ? { ...saved } : {};
  const persist = () => {
    state.activities = { ...state.activities, [entry.id]: record };
    return saveState();
  };

  if (activity.kind === 'switch') {
    const frame = host.querySelector('[data-current-frame]');
    const controls = [...host.querySelectorAll('[data-frame]')];
    function show(index, chosen) {
      const scenario = activity.states[index];
      for (const button of controls) button.setAttribute('aria-pressed', String(Number(button.dataset.frame) === index));
      frame.innerHTML = renderTermVisual(entry, index) + optionalEvidence(scenario.rows);
      const breath = frame.querySelector('[data-breath]');
      if (breath) paintBreath(breath, index);
      paintActivityArt(frame);
      feedback.textContent = chosen ? scenario.result : '';
    }
    controls.forEach(button => button.addEventListener('click', () => {
      record.frame = Number(button.dataset.frame);
      show(record.frame, true);
      keepActivityFeedbackVisible(button, feedback, button.parentElement);
      persist();
    }));
    const previous = Number.isInteger(record.frame) && Boolean(activity.states[record.frame]);
    show(previous ? record.frame : 0, previous);
  } else if (activity.kind === 'project') {
    mountEyeBench(host);
    const draft = Array.isArray(record.draft) ? record.draft.map(value => typeof value === 'string' ? value.slice(0, 400) : '') : [];
    host.querySelectorAll('[data-draft]').forEach((input, index) => {
      input.value = draft[index] || '';
      input.addEventListener('input', () => {
        draft[index] = input.value;
        record.draft = draft;
        feedback.textContent = persist() ? '草稿已保存在这台设备。' : '当前浏览器无法保存，可下载你的作品。';
      });
    });
    host.querySelector('[data-export-work]').addEventListener('click', () => {
      if (!draft.some(text => text?.trim())) {
        feedback.textContent = '先写一点想法，就能带走自己的作品。';
        host.querySelector('textarea')?.focus();
        return;
      }
      const lines = activity.fields.map((field, index) => `${field.label}\n${draft[index] || '（待补充）'}`);
      const url = URL.createObjectURL(new Blob([[entry.title, ...lines].join('\n\n')], {type: 'text/plain;charset=utf-8'}));
      Object.assign(document.createElement('a'), {href: url, download: `${entry.title}.txt`}).click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      feedback.textContent = '已请求下载你的作品。';
    });
    paintActivityArt(host);
  } else {
    const order = activity.kind === 'order';
    const items = [...host.querySelectorAll('[data-item]')];
    let selection = Array.isArray(record.items)
      ? [...new Set(record.items.filter(index => Number.isInteger(index) && items[index]))] : [];
    function display() {
      items.forEach((button, index) => {
        const position = selection.indexOf(index);
        const mark = button.querySelector('[data-mark]');
        button.setAttribute('aria-pressed', String(position >= 0));
        mark.hidden = position < 0;
        mark.textContent = order && position >= 0 ? position + 1 : '✓';
        if (order) {
          const tile = activity.tiles[index];
          const label = [tile.label, tile.text, position >= 0 ? `排在第 ${position + 1} 位` : ''].filter(Boolean);
          button.setAttribute('aria-label', label.join('，'));
        }
      });
    }
    function editSelection(newSelection) {
      selection = newSelection;
      record.items = selection;
      display();
      feedback.textContent = '';
      persist();
    }
    items.forEach((button, index) => button.addEventListener('click', () => {
      const next = selection.includes(index) ? selection.filter(value => value !== index) : [...selection, index];
      editSelection(next);
    }));
    host.querySelector('[data-activity-clear]')?.addEventListener('click', () => editSelection([]));
    host.querySelector('[data-activity-hint]').addEventListener('click', event => {
      feedback.textContent = activity.hint;
      keepActivityFeedbackVisible(event.currentTarget, feedback);
    });
    host.querySelector('[data-activity-check]').addEventListener('click', event => {
      const right = activity.answer.length === selection.length && activity.answer.every((value, index) =>
        order ? value === selection[index] : selection.includes(value));
      feedback.textContent = right ? activity.result : activity.hint;
      keepActivityFeedbackVisible(event.currentTarget, feedback);
      if (right) markPracticed(entry);
    });
    display();
    paintActivityArt(host);
  }

  const review = outlet.querySelector('[data-term-review]');
  const reviewFeedback = review.querySelector('[role="status"]');
  const options = [...review.querySelectorAll('[data-review-option]')];
  function answer(index, write) {
    if (!options[index]) return;
    options.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    reviewFeedback.textContent = entry.review.options[index][1];
    if (!write) return;
    record.review = index;
    persist();
    if (index === entry.review.answer) markPracticed(entry);
  }
  options.forEach((button, index) => button.addEventListener('click', () => {
    answer(index, true);
    keepActivityFeedbackVisible(button, reviewFeedback);
  }));
  review.querySelector('[data-review-hint]').addEventListener('click', event => {
    reviewFeedback.textContent = '可以先找题目里能比较的条件或记录，再试着选。';
    keepActivityFeedbackVisible(event.currentTarget, reviewFeedback);
  });
  if (Number.isInteger(record.review)) answer(record.review, false);
}

function renderTermLesson(entry) {
  const activity = entry.activity;
  if (!activity || !entry.review) throw new Error('activity missing');
  outlet.innerHTML = intro(entry, entry.question, entry.intro) + `<section class="term-activity" data-term-activity data-kind="${activity.kind}" aria-labelledby="activity-prompt">
    <h2 id="activity-prompt">${escape(activity.prompt)}</h2>
    ${activity.kind === 'project' ? '' : '<p class="activity-caption">教学示意</p>'}
    ${renderEyeBench(entry)}
    ${activityMarkup(activity)}
    <p class="activity-feedback" role="status" data-feedback></p>
  </section>
  <details class="more-activity term-takeaway"><summary>用一句话连回课本</summary>
    <p>${escape(entry.takeaway)}</p>
  </details>
  <details class="more-activity term-review" data-term-review><summary>换个例子复习</summary>
    <h2>${escape(entry.review.prompt)}</h2>
    <div class="choice-row">
      ${entry.review.options.map(([label], index) => `<button type="button" class="choice" data-review-option="${index}" aria-pressed="false">${escape(label)}</button>`).join('')}
    </div>
    <button type="button" class="text-control" data-review-hint>还不确定</button>
    <p class="activity-feedback" role="status"></p>
  </details>` + following(entry);
  mountTermActivity(entry);
}

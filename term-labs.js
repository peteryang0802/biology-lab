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
      return `<div class="activity-switch" role="group" aria-label="切换观察条件" data-frame-controls>
        ${activity.states.map((frame, index) => `<button type="button" class="choice" data-frame="${index}" aria-pressed="false">${escape(frame.label)}</button>`).join('')}
      </div><div data-current-frame></div>`;
    case 'order':
    case 'evidence': {
      const order = activity.kind === 'order';
      const options = activityRows(order ? activity.tiles : activity.rows);
      return `<div class="activity-choice-board" role="group" aria-label="${order ? '按顺序点材料' : '选出支持判断的线索'}">
        ${options.map((row, index) => `<button type="button" class="choice activity-choice" data-item="${index}" aria-pressed="false">${row}</button>`).join('')}
      </div>${order ? '<p class="order-summary" data-order-summary hidden></p>' : ''}<div class="activity-actions">
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
        <details class="draft-history" data-draft-history hidden><summary>查看草稿的其他版本</summary><div></div></details>
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

function renderBreathingPrediction(entry) {
  if (entry.id !== '7b-human-breathing') return '';
  return `<div class="breath-prediction" data-breath-prediction>
    <p>先猜一猜。膈往下移时，空气往哪儿走？</p>
    <canvas class="term-scene" width="300" height="104" role="img" aria-label="胸腔、肺和膈肌示意，尚未显示气流方向。" data-breath-neutral></canvas>
    <div class="activity-switch" role="group" aria-label="先猜空气流向">
      <button type="button" class="choice" data-predict="in">进入肺</button>
      <button type="button" class="choice" data-predict="out">离开肺</button>
      <button type="button" class="choice" data-predict="unsure">还不确定，先观察</button>
    </div>
  </div>
  <button type="button" class="text-control" data-guess-again hidden>从猜想重新开始</button>`;
}

function mountSwitch(entry, host, record, feedback) {
  const activity = entry.activity;
  const frame = host.querySelector('[data-current-frame]');
  const controlRow = host.querySelector('[data-frame-controls]');
  const controls = [...controlRow.querySelectorAll('[data-frame]')];
  const guessPanel = host.querySelector('[data-breath-prediction]');
  const again = host.querySelector('[data-guess-again]');
  const predictions = {in: '空气进入肺', out: '空气离开肺', unsure: '还不确定'};
  let prediction = Object.hasOwn(predictions, record.prediction) ? record.prediction : null;

  function show(index, chosen) {
    const scenario = activity.states[index];
    for (const button of controls) button.setAttribute('aria-pressed', String(Number(button.dataset.frame) === index));
    frame.innerHTML = renderTermVisual(entry, index) + optionalEvidence(scenario.rows);
    const breath = frame.querySelector('[data-breath]');
    if (breath) paintBreath(breath, index);
    paintActivityArt(frame);
    const guess = index === 0 && guessPanel && prediction ? `开始时你选了「${predictions[prediction]}」。` : '';
    feedback.textContent = chosen ? guess + scenario.result : '';
  }

  function activate(index, chosen) {
    if (guessPanel) {
      guessPanel.hidden = true;
      again.hidden = false;
    }
    controlRow.hidden = false;
    frame.hidden = false;
    show(index, chosen);
  }

  function resetPrediction() {
    guessPanel.hidden = false;
    paintBreath(guessPanel.querySelector('[data-breath-neutral]'), -1);
    controlRow.hidden = true;
    frame.hidden = true;
    again.hidden = true;
    feedback.textContent = '';
  }

  controls.forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.frame);
    show(index, true);
    saveActivityField(entry.id, 'frame', index);
    keepActivityFeedbackVisible(button, feedback, controlRow);
  }));
  if (guessPanel) {
    for (const button of guessPanel.querySelectorAll('[data-predict]')) {
      button.addEventListener('click', () => {
        prediction = button.dataset.predict;
        saveActivityField(entry.id, 'prediction', prediction);
        saveActivityField(entry.id, 'frame', 0);
        activate(0, true);
        controls[0].focus({preventScroll:true});
        keepActivityFeedbackVisible(controls[0], feedback, controlRow);
      });
    }
    again.addEventListener('click', () => {
      prediction = null;
      saveActivityField(entry.id, 'prediction', null);
      resetPrediction();
      guessPanel.querySelector('button').focus();
    });
  }
  const previous = Number.isInteger(record.frame) && Boolean(activity.states[record.frame]);
  if (guessPanel && !prediction) resetPrediction();
  else activate(previous ? record.frame : activity.initialFrame ?? 0, previous);
}

function mountDraft(entry, host, record, feedback) {
  const activity = entry.activity;
  mountEyeBench(host, record.eye, eye => saveActivityField(entry.id, 'eye', eye));
  const inputs = [...host.querySelectorAll('[data-draft]')];
  const draft = Array.isArray(record.draft) ? record.draft.map(value => typeof value === 'string' ? value.slice(0, 400) : '') : [];
  const history = host.querySelector('[data-draft-history]');

  function showHistory() {
    const alternatives = activityDraftHistory(entry.id);
    history.hidden = alternatives.length === 0;
    history.querySelector('div').innerHTML = alternatives.map((version, index) => `<details>
      <summary>${new Date(version.time).toLocaleString('zh-CN')}</summary>
      <dl>${activity.fields.map((field, i) => version.draft[i] ? `<dt>${escape(field.label)}</dt><dd>${escape(version.draft[i])}</dd>` : '').join('')}</dl>
      <button type="button" class="text-control" data-restore="${index}">恢复这个版本</button>
    </details>`).join('');
    for (const button of history.querySelectorAll('[data-restore]')) {
      button.addEventListener('click', () => {
        const version = alternatives[Number(button.dataset.restore)];
        const currentDraft = inputs.map(input => input.value);
        let stored = !currentDraft.some(value => value.trim()) ||
          saveActivityField(entry.id, 'draftHistory', [{time: Date.now(), draft: currentDraft}]);
        inputs.forEach((input, index) => {
          const next = String(version.draft[index] || '').slice(0, 400);
          if (next === input.value) return;
          input.value = next;
          draft[index] = next;
          stored = saveActivityField(entry.id, 'draft', next, index) && stored;
        });
        feedback.textContent = stored ? '已恢复这一版草稿。' : '这一版已在本页恢复，可以下载保存。';
        showHistory();
        history.querySelector('summary')?.focus({preventScroll: true});
      });
    }
  }

  inputs.forEach((input, index) => {
    input.value = draft[index] || '';
    input.addEventListener('input', () => {
      draft[index] = input.value;
      const saved = saveActivityField(entry.id, 'draft', input.value, index);
      feedback.textContent = saved ? '草稿已保存在这台设备。' : '当前浏览器无法保存，可下载你的作品。';
      showHistory();
    });
  });
  host.querySelector('[data-export-work]').addEventListener('click', () => {
    const visual = typeof describeExtraLab === 'function' ? describeExtraLab(entry, record) : [];
    if (!draft.some(text => text?.trim()) && !visual.length) {
      feedback.textContent = '先写一点想法，就能带走自己的作品。';
      inputs[0].focus();
      return;
    }
    const lines = activity.fields.map((field, index) => `${field.label}\n${draft[index] || '（待补充）'}`);
    const url = URL.createObjectURL(new Blob([[entry.title, ...visual, ...lines].join('\n\n')], {type: 'text/plain;charset=utf-8'}));
    Object.assign(document.createElement('a'), {href: url, download: `${entry.title}.txt`}).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    feedback.textContent = '已请求下载你的作品。';
    keepActivityFeedbackVisible(host.querySelector('[data-export-work]'), feedback);
  });
  showHistory();
  paintActivityArt(host);
}

function mountTermActivity(entry, replaceActivity) {
  const activity = entry.activity;
  const host = outlet.querySelector('[data-term-activity]');
  const feedback = host.querySelector('[data-feedback]');
  const saved = state.activities?.[entry.id];
  const record = plainRecord(saved) ? {...saved} : {};
  if (typeof mountExtraLab === 'function') {
    mountExtraLab(host, entry, record, () => saveActivityField(entry.id, 'visualLab', record.visualLab));
  }
  mountTermAudio(host, entry);
  if (replaceActivity) {
    paintActivityArt(host);
  } else if (activity.kind === 'switch') {
    mountSwitch(entry, host, record, feedback);
  } else if (activity.kind === 'project') {
    mountDraft(entry, host, record, feedback);
  } else {
    const order = activity.kind === 'order';
    const items = [...host.querySelectorAll('[data-item]')];
    const orderSummary = host.querySelector('[data-order-summary]');
    let selection = Array.isArray(record.items)
      ? [...new Set(record.items.filter(index => Number.isInteger(index) && items[index]))] : [];
    function display() {
      if (orderSummary) {
        orderSummary.hidden = selection.length === 0;
        orderSummary.textContent = '我排的顺序　' + selection.map(index => activity.tiles[index].label).join(' → ');
      }
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
      display();
      feedback.textContent = '';
      saveActivityField(entry.id, 'items', selection);
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
      const position = order && selection.length === activity.answer.length
        ? activity.answer.findIndex((value, index) => value !== selection[index]) : -1;
      feedback.textContent = right ? activity.result : position >= 0
        ? `再看看第 ${position + 1} 步。你放了「${activity.tiles[selection[position]].label}」。${activity.hint}`
        : activity.hint;
      keepActivityFeedbackVisible(event.currentTarget, feedback);
      if (right) markPracticed(entry);
    });
    display();
    paintActivityArt(host);
  }

  mountTermReview(entry, record);
}

function renderTermLesson(entry) {
  const activity = entry.activity;
  if (!activity || !entry.review) throw new Error('activity missing');
  const extra = typeof renderExtraLab === 'function' ? renderExtraLab(entry) : '';
  const extraPrompts = {
    '8b-animal-groups': '在鲫鱼和小虾身上找结构',
    '8b-ecosystem': '把草地里的能量流向连起来',
    '8a-build-tree': '用共同特征摆一棵进化树',
  };
  const replaceActivity = Boolean(extra && ['8b-animal-groups', '8b-ecosystem'].includes(entry.id));
  const safety = entry.safety ? `<aside class="term-safety" aria-label="现实中遇到时"><strong>现实中遇到时</strong>
    <p>${escape(entry.safety)}</p>
    ${entry.source ? `<a href="${escape(entry.source.url)}" target="_blank" rel="noopener noreferrer">${escape(entry.source.label)} ↗</a>` : ''}</aside>` : '';
  outlet.innerHTML = intro(entry, entry.question, entry.intro) + safety + `<section class="term-activity" data-term-activity data-kind="${activity.kind}" aria-labelledby="activity-prompt">
    <header class="term-activity-head"><h2 id="activity-prompt">${escape(extra && extraPrompts[entry.id] || activity.prompt)}</h2>
    ${renderTermAudio()}</header>
    ${activity.kind === 'project' ? '' : '<p class="activity-caption">教学示意</p>'}
    ${renderBreathingPrediction(entry)}
    ${renderEyeBench(entry)}
    ${extra}
    ${replaceActivity ? '' : activityMarkup(activity)}
    <p class="activity-feedback" role="status" data-feedback></p>
  </section>
  <details class="more-activity term-takeaway"><summary>用一句话连回课本</summary>
    <p>${escape(entry.takeaway)}</p>
  </details>` + renderTermReview() + following(entry);
  mountTermActivity(entry, replaceActivity);
}

import { fairComparisonBank } from './fair-comparison-bank.js?v=1';

const duration = 30_000;
const finalQuestion = fairComparisonBank.at(-1);
const escape = value => String(value).replace(/[&<>"']/g, token => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[token]);

function validOption(value, question) {
  return Number.isInteger(value) && value >= 0 && value < question.options.length;
}

function cleanAnswer(raw, question) {
  if (!raw || !(raw.first === null || validOption(raw.first, question))) return null;
  return {
    first: raw.first,
    lastWrong: validOption(raw.lastWrong, question) && raw.lastWrong !== question.answer ? raw.lastWrong : null,
    tries: Number.isInteger(raw.tries) ? Math.max(0, Math.min(99, raw.tries)) : 0,
    done: raw.first === question.answer || raw.done === true,
    assisted: raw.first !== question.answer && raw.assisted === true,
  };
}

function cleanRun(raw) {
  const answers = {};
  for (const item of fairComparisonBank) {
    const main = cleanAnswer(raw?.answers?.[item.id]?.main, item);
    const variant = cleanAnswer(raw?.answers?.[item.id]?.variant, item.variant);
    if (main) answers[item.id] = {main, ...(variant && {variant})};
  }
  const requested = Number.isInteger(raw?.cursor) ? Math.max(0, raw.cursor) : 0;
  const nextUnfinished = fairComparisonBank.findIndex(item => !answers[item.id]?.main.done);
  const cursor = Math.min(requested, nextUnfinished < 0 ? fairComparisonBank.length : nextUnfinished);
  const activeVariant = cursor === fairComparisonBank.length && fairComparisonBank.some(item => item.id === raw?.activeVariant)
    ? raw.activeVariant : null;
  return {
    mode: ['timed', 'untimed'].includes(raw?.mode) ? raw.mode : null,
    cursor, answers, activeVariant,
    draft: raw?.draft ?? null,
    remainingMs: typeof raw?.remainingMs === 'number' && Number.isFinite(raw.remainingMs)
      ? Math.max(0, Math.min(duration, raw.remainingMs)) : null,
  };
}

function materialCard(material) {
  if (!material) return '';
  const table = material.columns ? `<div class="fair-table-wrap"><table aria-label="${escape(material.title)}">
    <thead><tr>${material.columns.map(column => `<th scope="col">${escape(column)}</th>`).join('')}</tr></thead>
    <tbody>${material.rows.map(row => `<tr><th scope="row">${escape(row[0])}</th>${row.slice(1).map(cell => `<td>${escape(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>` : '';
  return `<section class="fair-material" aria-label="同屏材料"><h2>${escape(material.title)}</h2><p>${escape(material.note)}</p>${table}</section>`;
}

export function mountFairComparison(root, {read, write, returnHref, returnLabel}) {
  const controller = new AbortController();
  const {signal} = controller;
  let state = cleanRun(read());
  let interval = 0;
  let deadline = 0;
  let lastSecond = null;
  let resetting = false;

  function save(update) {
    const latest = cleanRun(read());
    if (resetting || update(latest) === false) {
      state = latest;
      return false;
    }
    state = latest;
    write(state);
    return true;
  }

  function pointFor(item) {
    const attempts = state.answers[item.id];
    return Number(attempts?.main?.first === item.answer || attempts?.variant?.first === item.variant.answer);
  }

  function total() {
    return fairComparisonBank.reduce((count, item) => count + pointFor(item), 0);
  }

  function nextVariant() {
    return fairComparisonBank.find(item => !state.answers[item.id]?.variant?.done &&
      (state.answers[item.id]?.main?.first !== item.answer || item === finalQuestion));
  }

  function activeItem() {
    return fairComparisonBank[state.cursor] ?? fairComparisonBank.find(item => item.id === state.activeVariant);
  }

  function progressPanel(item, kind) {
    const rows = fairComparisonBank.map((candidate, index) => {
      const record = state.answers[candidate.id];
      const current = item === candidate;
      const status = pointFor(candidate) ? '已得分' : !record ? '还没作答'
        : !record.main.done ? '订正中' : record.variant?.done ? '还要复习' : '可换题验证';
      return `<li${current ? ' aria-current="step"' : ''} data-fair-marker="${candidate.id}" data-status="${status}"><span aria-hidden="true">${index + 1}</span><span class="fair-sr">第 ${index + 1} 题，${status}</span></li>`;
    }).join('');
    const status = kind === 'main' ? `第 ${state.cursor + 1} / ${fairComparisonBank.length} 题`
      : kind === 'variant' ? `新材料 · 第 ${fairComparisonBank.indexOf(item) + 1} 题` : `已做 ${state.cursor} / ${fairComparisonBank.length} 题`;
    return `<aside class="fair-progress" aria-label="本关进度">
      <p class="fair-eyebrow">生物学的研究方法</p><h2>本关进度</h2><p>${status}</p>
      <ol aria-label="逐题进度">${rows}</ol><p>累计 <strong data-fair-points>${total()}</strong> 分</p>
      <p class="fair-timer" data-fair-timer hidden aria-live="off"></p>
    </aside>`;
  }

  function display(body, {item, kind, feedback = false} = {}) {
    root.innerHTML = `<div class="fair-challenge"><div class="fair-layout">${progressPanel(item, kind)}
      <section class="fair-task">${body}</section></div></div>`;
    if (feedback) root.querySelector('[data-fair-feedback]')?.focus({preventScroll: true});
    else {
      root.querySelector('h1')?.focus({preventScroll: true});
      window.scrollTo(0, 0);
    }
  }

  function intro() {
    display(`<h1 id="lesson-title" tabindex="-1">哪两组能公平比较？</h1>
      <p class="fair-lede">两盆苗长得不一样。你能找出是哪一个条件起了作用吗？</p>
      <p>做 10 道题，答错就在原题旁找线索。首答正确得 1 分，也可以用新材料补分。攒到 10 分收藏一张实验卡。</p>
      <label class="fair-pace"><input type="checkbox" data-fair-timed> 前 3 道短题各限时 30 秒<span>后面的材料题和换题都不限时。</span></label>
      <button type="button" class="action" data-fair-start>开始第 1 题</button>`);
  }

  function questionView(item, kind, {feedbackFocus = false} = {}) {
    const question = kind === 'variant' ? item.variant : item;
    const result = state.answers[item.id]?.[kind];
    const done = result?.done === true;
    const selected = state.draft?.id === item.id && state.draft?.kind === kind && validOption(state.draft?.choice, question)
      ? state.draft.choice : null;
    let feedback = '';
    if (done) {
      const success = result.first === question.answer;
      const title = result.assisted ? '把思路看完了。' : success ? '答对了。' : '这次改对了。';
      const alreadyScored = kind === 'variant' && state.answers[item.id].main.first === item.answer;
      const recovery = kind === 'main' ? '关末可以用新材料验证补分。' : '这道新材料的首答没有得分。';
      const score = alreadyScored ? '这项能力已得过分。' : success ? '获得 1 分。' : recovery;
      feedback = `<div class="fair-feedback is-right" data-fair-feedback tabindex="-1"><h2>${title} ${score}</h2>
        <p>${escape(question.feedback[question.answer])} ${escape(question.explanation)}</p></div>`;
    } else if (result) {
      feedback = `<div class="fair-feedback" data-fair-feedback tabindex="-1"><h2>${result.lastWrong === null ? '时间到了，接着不限时想。' : '再看一眼这项条件。'}</h2>
        ${result.lastWrong === null ? '' : `<p>你选了「${escape(question.options[result.lastWrong])}」。${escape(question.feedback[result.lastWrong])}</p>`}
        <p><strong>线索</strong> ${escape(question.hint)}</p></div>`;
    }
    const choices = question.options.map((option, index) => `<label class="fair-choice">
      <input type="radio" name="fair-answer" value="${index}"${(done ? index === question.answer : index === selected) ? ' checked' : ''}${done ? ' disabled' : ''}>
      <span>${escape(option)}</span></label>`).join('');
    const nextLabel = kind === 'variant' || state.cursor === fairComparisonBank.length - 1 ? '看本关结果' : '下一题';
    const actions = done ? `<button type="button" class="action" data-fair-next>${nextLabel}</button>` :
      `<button type="button" class="action" data-fair-submit>${result ? '核对订正' : '提交答案'}</button>
        ${result?.tries >= 2 ? '<button type="button" class="fair-minor" data-fair-model>看一遍思路</button>' : ''}`;
    display(`<p class="fair-eyebrow">${kind === 'variant' ? '换份材料自己试' : result && !done ? '在原题订正' : '单项选择'}</p>
      <h1 id="lesson-title" tabindex="-1">${escape(question.prompt)}</h1>
      ${materialCard(question.material)}
      ${done ? '' : feedback}
      <form data-fair-form><fieldset class="fair-choices" aria-labelledby="lesson-title"><legend class="fair-sr">选一个答案</legend>${choices}</fieldset>
        ${done ? feedback : ''}<p class="fair-input-message" data-fair-message role="status" hidden></p>
        <div class="fair-actions">${actions}</div>
      </form>`, {item, kind, feedback: feedbackFocus});
    if (kind === 'main' && state.mode === 'timed' && question.timed && !result) startTimer(item);
  }

  function summary() {
    const points = total();
    const target = nextVariant();
    const totalFirst = fairComparisonBank.filter(item => state.answers[item.id]?.main?.first === item.answer).length;
    const results = fairComparisonBank.map(item => `<li><span>${escape(item.topic)}</span><strong>${pointFor(item) ? '已得分'
      : state.answers[item.id]?.variant?.done ? '新材料还要练' : '可用新材料补分'}</strong></li>`).join('');
    const card = points === fairComparisonBank.length ? `<div class="fair-reward"><h2>收藏卡 · 公平比较</h2>
      <p>先圈要检验的条件，再把其他条件、观察时间和测量标准对齐。看到差异，先判断这次证据能说明多少。</p></div>` : '';
    display(`<h1 id="lesson-title" tabindex="-1">10 道题做完了</h1>
      <p class="fair-lede">首答正确 ${totalFirst} 道 · 累计 ${points} 分</p>
      ${card}
      ${target ? `<p class="fair-summary-next">${pointFor(target) ? '再换一道新材料，看看这个方法能不能用到另一件事。' : `用新材料再试「${escape(target.topic)}」。首答正确可补 1 分。`}</p>
        <button type="button" class="action" data-fair-verify>试一道新材料</button>`
        : `<p class="fair-summary-next">${points < fairComparisonBank.length ? '看一看哪些知识还需要练习。' : '新材料验证也完成了。'}</p>
           <a class="action" href="${escape(returnHref)}">${escape(returnLabel)}</a>`}
      <details class="fair-summary"><summary>查看这 10 题的记录</summary><ol>${results}</ol></details>`);
  }

  function render(options = {}) {
    if (!state.mode) return intro();
    const item = activeItem();
    if (item) return questionView(item, state.cursor < fairComparisonBank.length ? 'main' : 'variant', options);
    summary();
  }

  function stopTimer(checkpoint = false) {
    if (!interval) return;
    window.clearInterval(interval);
    interval = 0;
    if (checkpoint) checkpointTimer(activeItem(), Math.max(0, Math.ceil(deadline - performance.now())));
    deadline = 0;
    lastSecond = null;
  }

  function checkpointTimer(item, remaining) {
    if (!item) return;
    save(draft => {
      if (fairComparisonBank[draft.cursor] !== item || draft.answers[item.id]?.main) return false;
      draft.remainingMs = draft.remainingMs === null ? remaining : Math.min(remaining, draft.remainingMs);
    });
  }

  function startTimer(item) {
    const counter = root.querySelector('[data-fair-timer]');
    counter.hidden = false;
    if (document.hidden || resetting) {
      counter.textContent = '计时已暂停';
      return;
    }
    const left = state.remainingMs ?? duration;
    deadline = performance.now() + left;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil(deadline - performance.now()));
      const seconds = Math.ceil(remaining / 1000);
      counter.textContent = `剩余 ${seconds} 秒`;
      if (seconds !== lastSecond) {
        lastSecond = seconds;
        checkpointTimer(item, remaining);
      }
      if (remaining === 0) recordAnswer(item, 'main', null);
    };
    interval = window.setInterval(tick, 250);
    tick();
  }

  function recordAnswer(item, kind, choice, assisted = false) {
    const question = kind === 'variant' ? item.variant : item;
    const expired = kind === 'main' && deadline > 0 && performance.now() >= deadline;
    stopTimer();
    const actual = expired ? null : choice;
    save(draft => {
      if (kind === 'main' ? fairComparisonBank[draft.cursor] !== item : draft.activeVariant !== item.id) return false;
      const attempts = draft.answers[item.id] ??= {};
      const previous = attempts[kind];
      if (previous?.done || (actual === null && previous)) return false;
      const done = assisted || actual === question.answer;
      attempts[kind] = {
        first: previous ? previous.first : actual,
        lastWrong: done ? previous?.lastWrong ?? null : actual,
        tries: (previous?.tries ?? 0) + 1,
        done, assisted,
      };
      draft.draft = null;
      draft.remainingMs = null;
    });
    render({feedbackFocus: true});
  }

  function begin() {
    const timed = root.querySelector('[data-fair-timed]').checked;
    save(draft => {
      if (draft.mode) return false;
      draft.mode = timed ? 'timed' : 'untimed';
    });
    render();
  }

  function verify() {
    const target = nextVariant();
    if (!target) return;
    save(draft => {
      if (draft.cursor < fairComparisonBank.length || draft.activeVariant || draft.answers[target.id]?.variant?.done) return false;
      draft.activeVariant = target.id;
      draft.draft = null;
    });
    render();
  }

  function advance(item, kind) {
    save(draft => {
      if (!draft.answers[item.id]?.[kind]?.done) return false;
      if (kind === 'main' && fairComparisonBank[draft.cursor] === item) draft.cursor += 1;
      else if (kind === 'variant' && draft.activeVariant === item.id) draft.activeVariant = null;
      else return false;
      draft.draft = null;
      draft.remainingMs = null;
    });
    render();
  }

  function context() {
    const item = activeItem();
    const kind = state.cursor < fairComparisonBank.length ? 'main' : 'variant';
    return {item, kind, question: kind === 'variant' ? item?.variant : item};
  }

  root.addEventListener('change', event => {
    if (!event.target.matches('input[name="fair-answer"]')) return;
    const {item, kind, question} = context();
    const choice = Number(event.target.value);
    if (!question || !validOption(choice, question)) return;
    save(draft => {
      if (kind === 'main' ? fairComparisonBank[draft.cursor] !== item : draft.activeVariant !== item.id) return false;
      if (draft.answers[item.id]?.[kind]?.done) return false;
      draft.draft = {id: item.id, kind, choice};
    });
    root.querySelector('[data-fair-message]').hidden = true;
  }, {signal});

  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-fair-start')) return begin();
    if (button.hasAttribute('data-fair-verify')) return verify();
    const {item, kind, question} = context();
    if (!item) return;
    if (button.hasAttribute('data-fair-next')) return advance(item, kind);
    if (button.hasAttribute('data-fair-model')) return recordAnswer(item, kind, question.answer, true);
    if (!button.hasAttribute('data-fair-submit')) return;
    const selected = root.querySelector('input[name="fair-answer"]:checked');
    if (selected) return recordAnswer(item, kind, Number(selected.value));
    const message = root.querySelector('[data-fair-message]');
    message.textContent = '先选一个答案，再提交。';
    message.hidden = false;
    root.querySelector('input[name="fair-answer"]')?.focus();
  }, {signal});

  root.addEventListener('submit', event => {
    if (event.target.matches('[data-fair-form]')) event.preventDefault();
  }, {signal});
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopTimer(true);
    else if (!resetting && !interval && root.querySelector('[data-fair-timer]:not([hidden])')) render();
  }, {signal});
  window.addEventListener('pagehide', () => stopTimer(true), {signal});
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      state = cleanRun(read());
      render();
    }
  }, {signal});
  window.addEventListener('parent-learning-reset', event => {
    if (event.detail?.subject !== 'biology') return;
    resetting = event.detail.phase === 'start';
    if (resetting) stopTimer();
    else {
      state = cleanRun(read());
      render();
    }
  }, {signal});
  render();
  return () => {
    stopTimer(true);
    controller.abort();
  };
}

import { fairComparisonBank, fairComparisonRepractice } from './fair-comparison-bank.js?v=2';
import { createChallengeFeedback } from './challenge-feedback.js?v=2';

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
    const practice = cleanAnswer(raw?.answers?.[item.id]?.practice, fairComparisonRepractice[item.id]);
    if (main) answers[item.id] = {main, ...(variant && {variant}), ...(variant && practice && {practice})};
  }
  const requested = Number.isInteger(raw?.cursor) ? Math.max(0, raw.cursor) : 0;
  const nextUnfinished = fairComparisonBank.findIndex(item => !answers[item.id]?.main.done);
  const cursor = Math.min(requested, nextUnfinished < 0 ? fairComparisonBank.length : nextUnfinished);
  const activeVariant = cursor === fairComparisonBank.length && fairComparisonBank.some(item => item.id === raw?.activeVariant)
    ? raw.activeVariant : null;
  return {
    mode: ['timed', 'untimed'].includes(raw?.mode) ? raw.mode : null,
    cursor, answers, activeVariant,
    activeAttempt: activeVariant && raw?.activeAttempt === 'practice' && answers[activeVariant]?.variant?.done
      ? 'practice' : 'variant',
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

function questionFor(item, kind) {
  return kind === 'practice' ? fairComparisonRepractice[item.id] : kind === 'variant' ? item.variant : item;
}

export function mountFairComparison(root, {read, write, returnHref, returnLabel}) {
  const controller = new AbortController();
  const {signal} = controller;
  const feedback = createChallengeFeedback(root);
  let state = cleanRun(read());
  let interval = 0;
  let deadline = 0;
  let lastSecond = null;
  let resetting = false;
  let celebrateOnAdvance = false;

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

  function pointFor(item, run = state) {
    const attempts = run.answers[item.id];
    return Number(attempts?.main?.first === item.answer || attempts?.variant?.first === item.variant.answer);
  }

  function total(run = state) {
    return fairComparisonBank.reduce((count, item) => count + pointFor(item, run), 0);
  }

  function earnsFlower(run = state) {
    if (run.cursor !== fairComparisonBank.length || total(run) !== fairComparisonBank.length) return false;
    const answers = run.answers[finalQuestion.id];
    return [answers?.variant, answers?.practice].some(answer => answer?.done && !answer.assisted);
  }

  function verified(item, run = state) {
    const answers = run.answers[item.id];
    return answers?.variant?.first === item.variant.answer ||
      answers?.practice?.first === fairComparisonRepractice[item.id].answer;
  }

  function nextVerification(run = state) {
    const newItem = fairComparisonBank.find(item => !run.answers[item.id]?.variant?.done &&
      (run.answers[item.id]?.main?.first !== item.answer || item === finalQuestion));
    if (newItem) return {item: newItem, kind: 'variant'};
    const practice = fairComparisonBank.find(item => run.answers[item.id]?.variant?.done &&
      !verified(item, run) && !run.answers[item.id].practice?.done);
    return practice ? {item: practice, kind: 'practice'} : null;
  }

  function activeItem() {
    return fairComparisonBank[state.cursor] ?? fairComparisonBank.find(item => item.id === state.activeVariant);
  }

  function progressPanel(item, kind) {
    const rows = fairComparisonBank.map((candidate, index) => {
      const record = state.answers[candidate.id];
      const current = item === candidate;
      const status = !record ? '还没作答' : !record.main.done ? '订正中'
        : verified(candidate) ? '独立通过' : record.variant?.done ? '还要复习'
          : pointFor(candidate) ? '已得分' : '可换题验证';
      return `<li${current ? ' aria-current="step"' : ''} data-fair-marker="${candidate.id}" data-status="${status}"><span aria-hidden="true">${index + 1}</span><span class="fair-sr">第 ${index + 1} 题，${status}</span></li>`;
    }).join('');
    const status = kind === 'main' ? `第 ${state.cursor + 1} / ${fairComparisonBank.length} 题`
      : item ? `${kind === 'practice' ? '复练' : '新材料'} · 第 ${fairComparisonBank.indexOf(item) + 1} 题` : `已做 ${state.cursor} / ${fairComparisonBank.length} 题`;
    return `<aside class="fair-progress" aria-label="本关进度">
      <p class="fair-eyebrow">生物学的研究方法</p><h2>本关进度</h2><p>${status}</p>
      <ol aria-label="逐题进度">${rows}</ol><p>累计 <strong data-fair-points>${total()}</strong> 分</p>
      <p class="fair-timer" data-fair-timer hidden aria-live="off"></p>
    </aside>`;
  }

  function display(body, {item, kind, feedbackFocus = false} = {}) {
    root.innerHTML = `<div class="fair-challenge"><div class="fair-feedback-tools">${feedback.soundButton()}</div>
      <div class="fair-layout">${progressPanel(item, kind)}
      <section class="fair-task">${body}</section></div></div>`;
    if (feedbackFocus) root.querySelector('[data-fair-feedback]')?.focus({preventScroll: true});
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
    const question = questionFor(item, kind);
    const result = state.answers[item.id]?.[kind];
    const done = result?.done === true;
    const selected = state.draft?.id === item.id && state.draft?.kind === kind && validOption(state.draft?.choice, question)
      ? state.draft.choice : null;
    let feedbackMarkup = '';
    if (done) {
      const success = result.first === question.answer;
      const title = result.assisted ? '把思路看完了。' : success ? '答对了。' : '这次改对了。';
      let score;
      if (kind === 'practice') score = success ? '独立验证通过。本题不计分。' : '已按提示完成，仍需练习。本题不计分。';
      else if (kind === 'variant' && !success) score = '已按提示完成。再换一道新材料练一练。';
      else if (kind === 'variant' && state.answers[item.id].main.first === item.answer) score = '独立验证通过。分数照旧。';
      else score = success ? '获得 1 分。' : '关末可以用新材料验证补分。';
      feedbackMarkup = `<div class="fair-feedback is-right" data-fair-feedback tabindex="-1"><h2>${title} ${score}</h2>
        <p>${escape(question.feedback[question.answer])} ${escape(question.explanation)}</p></div>`;
    } else if (result) {
      feedbackMarkup = `<div class="fair-feedback" data-fair-feedback tabindex="-1"><h2>${result.lastWrong === null ? '时间到了，接着不限时想。' : '再看一眼这项条件。'}</h2>
        ${result.lastWrong === null ? '' : `<p>你选了「${escape(question.options[result.lastWrong])}」。${escape(question.feedback[result.lastWrong])}</p>`}
        <p><strong>线索</strong> ${escape(question.hint)}</p></div>`;
    }
    const choices = question.options.map((option, index) => `<label class="fair-choice">
      <input type="radio" name="fair-answer" value="${index}"${(done ? index === question.answer : index === selected) ? ' checked' : ''}${done ? ' disabled' : ''}>
      <span>${escape(option)}</span></label>`).join('');
    const nextLabel = kind !== 'main' || state.cursor === fairComparisonBank.length - 1 ? '看本关结果' : '下一题';
    const actions = done ? `<button type="button" class="action" data-fair-next>${nextLabel}</button>` :
      `<button type="button" class="action" data-fair-submit>${result ? '核对订正' : '提交答案'}</button>
        ${result?.tries >= 2 ? '<button type="button" class="fair-minor" data-fair-model>看一遍思路</button>' : ''}`;
    display(`<p class="fair-eyebrow">${kind === 'practice' ? '新材料复练 · 不计分' : kind === 'variant' ? '换份材料自己试' : result && !done ? '在原题订正' : '单项选择'}</p>
      <h1 id="lesson-title" tabindex="-1">${escape(question.prompt)}</h1>
      ${materialCard(question.material)}
      ${done ? '' : feedbackMarkup}
      <form data-fair-form><fieldset class="fair-choices" aria-labelledby="lesson-title"><legend class="fair-sr">选一个答案</legend>${choices}</fieldset>
        ${done ? feedbackMarkup : ''}<p class="fair-input-message" data-fair-message role="status" hidden></p>
        <div class="fair-actions">${actions}</div>
      </form>`, {item, kind, feedbackFocus});
    if (kind === 'main' && state.mode === 'timed' && question.timed && !result) startTimer(item);
  }

  function summary() {
    const points = total();
    const target = nextVerification();
    const totalFirst = fairComparisonBank.filter(item => state.answers[item.id]?.main?.first === item.answer).length;
    const ready = fairComparisonBank.filter(item => verified(item)).length;
    const guided = fairComparisonBank.filter(item => state.answers[item.id]?.variant?.done && !verified(item)).length;
    const results = fairComparisonBank.map(item => {
      const answer = state.answers[item.id];
      const check = verified(item) ? '新材料独立通过' : answer?.variant?.done ? '按提示完成，仍需练'
        : item === finalQuestion || !pointFor(item) ? '等新材料验证' : '主线已完成';
      return `<li><span>${escape(item.topic)}</span><strong>${pointFor(item)} 分 · ${check}</strong></li>`;
    }).join('');
    const card = points === fairComparisonBank.length ? `<div class="fair-reward"><h2>收藏卡 · 公平比较</h2>
      <p>先圈要检验的条件，再把其他条件、观察时间和测量标准对齐。看到差异，先判断这次证据能说明多少。</p></div>` : '';
    const nextMessage = target?.kind === 'practice' ? `「${escape(target.item.topic)}」刚才按提示做完了，试一份全新的材料。复练不计分。`
      : target && pointFor(target.item) ? '再换一道新材料，看看这个方法能不能用到另一件事。'
        : target ? `用新材料再试「${escape(target.item.topic)}」。首答正确可补 1 分。`
          : guided ? '这轮还留有需要练习的内容，可展开记录看看是哪一项。' : '本关的新材料验证已完成。';
    display(`<h1 id="lesson-title" tabindex="-1">10 道题做完了</h1>
      <p class="fair-lede">首答正确 ${totalFirst} 道 · 累计 ${points} 分</p>
      ${earnsFlower() ? feedback.flower() : ''}
      ${card}
      <p class="fair-verification" data-fair-verification>新材料 · ${ready} 项独立通过${guided ? ` · ${guided} 项按提示完成，仍需练` : ''}</p>
      <p class="fair-summary-next">${nextMessage}</p>
      ${target ? `<button type="button" class="action" data-fair-verify>${target.kind === 'practice' ? '做一道新题复练' : '试一道新材料'}</button>`
        : `<a class="action" href="${escape(returnHref)}">${escape(returnLabel)}</a>`}
      <details class="fair-summary"><summary>查看这 10 题的记录</summary><ol>${results}</ol></details>`);
  }

  function render(options = {}) {
    if (!state.mode) return intro();
    const item = activeItem();
    if (item) return questionView(item, state.cursor < fairComparisonBank.length ? 'main' : state.activeAttempt, options);
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
    const question = questionFor(item, kind);
    const expired = kind === 'main' && deadline > 0 && performance.now() >= deadline;
    stopTimer();
    const actual = expired ? null : choice;
    const right = !assisted && actual === question.answer;
    let justEarned = false;
    const accepted = save(draft => {
      if (!currentAttempt(draft, item, kind)) return false;
      const attempts = draft.answers[item.id] ??= {};
      const previous = attempts[kind];
      if (previous?.done || (actual === null && previous)) return false;
      const hadFlower = right && earnsFlower(draft);
      const done = assisted || right;
      attempts[kind] = {
        first: previous ? previous.first : actual,
        lastWrong: done ? previous?.lastWrong ?? null : actual,
        tries: (previous?.tries ?? 0) + 1,
        done, assisted,
      };
      draft.draft = null;
      draft.remainingMs = null;
      justEarned = right && !hadFlower && earnsFlower(draft);
    });
    if (accepted && right) {
      celebrateOnAdvance = justEarned;
      feedback.correct();
    }
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
    save(draft => {
      const target = nextVerification(draft);
      if (draft.cursor < fairComparisonBank.length || draft.activeVariant || !target) return false;
      draft.activeVariant = target.item.id;
      draft.activeAttempt = target.kind;
      draft.draft = null;
    });
    render();
  }

  function advance(item, kind) {
    const advanced = save(draft => {
      if (!currentAttempt(draft, item, kind) || !draft.answers[item.id]?.[kind]?.done) return false;
      if (kind === 'main') draft.cursor += 1;
      else {
        draft.activeVariant = null;
        draft.activeAttempt = 'variant';
      }
      draft.draft = null;
      draft.remainingMs = null;
    });
    const celebrate = advanced && celebrateOnAdvance && !activeItem() && earnsFlower();
    celebrateOnAdvance = false;
    render();
    if (celebrate) feedback.celebrate();
  }

  function context() {
    const item = activeItem();
    const kind = state.cursor < fairComparisonBank.length ? 'main' : state.activeAttempt;
    return {item, kind, question: item && questionFor(item, kind)};
  }

  function currentAttempt(run, item, kind) {
    return kind === 'main' ? fairComparisonBank[run.cursor] === item
      : run.activeVariant === item.id && run.activeAttempt === kind;
  }

  root.addEventListener('change', event => {
    if (!event.target.matches('input[name="fair-answer"]')) return;
    const {item, kind, question} = context();
    const choice = Number(event.target.value);
    if (!question || !validOption(choice, question)) return;
    save(draft => {
      if (!currentAttempt(draft, item, kind)) return false;
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
  window.addEventListener('pagehide', () => {
    celebrateOnAdvance = false;
    stopTimer(true);
  }, {signal});
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      state = cleanRun(read());
      render();
    }
  }, {signal});
  window.addEventListener('parent-learning-reset', event => {
    if (event.detail?.subject !== 'biology') return;
    resetting = event.detail.phase === 'start';
    if (resetting) {
      celebrateOnAdvance = false;
      stopTimer();
    }
    else {
      state = cleanRun(read());
      render();
    }
  }, {signal});
  render();
  return () => {
    stopTimer(true);
    controller.abort();
    feedback.destroy();
  };
}

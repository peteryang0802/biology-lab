'use strict';

function renderTermReview(entry) {
  return `<details class="more-activity term-review" id="lesson-review" data-term-review>
    <summary>换份材料复习</summary>
    <div data-review-content></div>
    ${renderReviewNote(entry)}
  </details>`;
}

function mountTermReview(entry, record) {
  const root = outlet.querySelector('[data-term-review]');
  const content = root.querySelector('[data-review-content]');
  const variants = {base: entry.review};
  if (entry.review.alternate) variants.alternate = entry.review.alternate;
  const history = Array.isArray(record.reviewHistory) ? record.reviewHistory.filter(item =>
    plainRecord(item) && Object.hasOwn(variants, item.variant) &&
    Number.isInteger(item.choice) && Boolean(variants[item.variant].options[item.choice])) : [];
  const makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  const saved = record.reviewRun;
  const validRun = plainRecord(saved) && Object.hasOwn(variants, saved.variant) && typeof saved.id === 'string';
  const legacy = Number.isInteger(record.review) && variants.base.options[record.review] ? { variant: 'base', choice: record.review } : null;
  const current = validRun ? history.find(attempt => attempt.id === saved.id && attempt.variant === saved.variant) : history.at(-1) || legacy;
  let variant = validRun ? saved.variant : current?.variant || 'base';
  let attemptId = current?.id || (validRun ? saved.id : makeId());
  let assisted = Boolean(current?.assisted || (validRun && saved.assisted));
  let firstChoice = Number.isInteger(current?.firstChoice) ? current.firstChoice : current?.choice;

  function rememberRun() {
    saveActivityField(entry.id, 'reviewRun', { id: attemptId, variant, assisted });
  }

  function showAttempt(answered) {
    const activity = variants[variant];
    const previous = history.filter(attempt => attempt.id !== attemptId).at(-1);
    delete content.dataset.result;
    content.innerHTML = `<h2 tabindex="-1">${escape(activity.prompt)}</h2>
      <div class="choice-row" role="group" aria-label="选择自己的判断">
        ${activity.options.map(([label], index) => `<button type="button" class="choice" data-review-option="${index}" aria-pressed="false">${escape(label)}</button>`).join('')}
      </div>
      <p class="activity-feedback" role="status"></p>
      <button type="button" class="text-control" data-review-evidence hidden>先看线索</button>
      <button type="button" class="text-control" data-review-hint hidden>给一点提示</button>
      <details class="flow-extras" data-review-options hidden>
        <summary>想再练一次</summary>
        <button type="button" class="text-control review-again" data-review-again>${variants.alternate ? '换份材料再试' : '重做这道题'}</button>
      ${previous ? `<details class="review-history"><summary>看上次的答法</summary>
        <p>${escape(variants[previous.variant].prompt)}</p>
        <p>上次选了「${escape(variants[previous.variant].options[previous.choice][0])}」。${escape(variants[previous.variant].options[previous.choice][1])}</p>
      </details>` : ''}</details>`;
    const feedback = content.querySelector('[role="status"]');
    const options = [...content.querySelectorAll('[data-review-option]')];
    const again = content.querySelector('[data-review-again]');
    const more = content.querySelector('[data-review-options]');
    const sourceButton = content.querySelector('[data-review-evidence]');
    const hintButton = content.querySelector('[data-review-hint]');
    const hasSource = typeof bindReviewEvidence === 'function' && bindReviewEvidence(entry, sourceButton, () => {
      assisted = true;
      rememberRun();
    });

    function updateActions(outcome) {
      sourceButton.hidden = !hasSource || outcome === 'correct';
      hintButton.hidden = hasSource || outcome === 'correct';
      more.hidden = outcome !== 'correct';
      showQuizOutcome(content, outcome);
    }

    function showAnswer(index, attempt) {
      const correct = index === activity.answer;
      content.dataset.result = correct ? 'correct' : 'retry';
      const outcome = !correct || !Number.isInteger(attempt?.firstChoice) ? ''
        : attempt.assisted ? ' 参考材料或提示后答对。'
          : attempt.firstChoice === index ? ' 首次答对。' : ' 反馈后改对。';
      feedback.textContent = (correct ? '答对了。' : '还需对照。') + activity.options[index][1].replace(/^对。/, '') + outcome;
      options.forEach((option, i) => option.setAttribute('aria-pressed', String(i === index)));
      updateActions(correct ? 'correct' : 'retry');
    }
    if (answered?.variant === variant) showAnswer(answered.choice, answered);
    else updateActions('ready');
    options.forEach((button, index) => button.addEventListener('click', () => {
      firstChoice ??= index;
      const attempt = {id: attemptId, at: Date.now(), variant, choice: index, firstChoice, assisted};
      showAnswer(index, attempt);
      const known = history.findIndex(item => item.id === attemptId);
      if (known >= 0) history.splice(known, 1);
      history.push(attempt);
      saveActivityField(entry.id, 'reviewHistory', history.slice(-12));
      markReviewAttempt(entry, index === activity.answer);
      keepActivityFeedbackVisible(button, feedback);
    }));
    hintButton.addEventListener('click', event => {
      assisted = true;
      rememberRun();
      delete content.dataset.result;
      feedback.textContent = activity.hint || '先找一条和题目直接有关的记录。还没有把握，可以先回看上面的材料。';
      keepActivityFeedbackVisible(event.currentTarget, feedback);
    });
    again.addEventListener('click', () => {
      if (variants.alternate) variant = variant === 'base' ? 'alternate' : 'base';
      attemptId = makeId();
      assisted = false;
      firstChoice = undefined;
      rememberRun();
      showAttempt();
      const prompt = content.querySelector('h2');
      prompt.focus({preventScroll: true});
      prompt.scrollIntoView({block: 'nearest'});
    });
  }
  showAttempt(current);
}

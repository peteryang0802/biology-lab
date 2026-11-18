'use strict';

function renderTermReview() {
  return `<details class="more-activity term-review" data-term-review>
    <summary>换个例子复习</summary>
    <div data-review-content></div>
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
  const previousVariant = history.at(-1)?.variant || (Number.isInteger(record.review) ? 'base' : null);
  let variant = variants.alternate && previousVariant === 'base' ? 'alternate' : 'base';
  let attemptId;
  let answered = false;
  let resetOnOpen = false;

  function newAttempt() {
    attemptId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    answered = false;
    const activity = variants[variant];
    const previous = history.at(-1);
    content.innerHTML = `<h2 tabindex="-1">${escape(activity.prompt)}</h2>
      <p class="review-instruction">先想一句理由，再选一个核对。</p>
      <div class="choice-row" role="group" aria-label="选择自己的判断">
        ${activity.options.map(([label], index) => `<button type="button" class="choice" data-review-option="${index}" aria-pressed="false">${escape(label)}</button>`).join('')}
      </div>
      <button type="button" class="text-control" data-review-hint>还不确定</button>
      <p class="activity-feedback" role="status"></p>
      <button type="button" class="text-control review-again" data-review-again hidden>${variants.alternate ? '换份材料再试' : '再试一次'}</button>
      ${previous ? `<details class="review-history"><summary>看上次的答法</summary>
        <p>${escape(variants[previous.variant].prompt)}</p>
        <p>上次选了「${escape(variants[previous.variant].options[previous.choice][0])}」。${escape(variants[previous.variant].options[previous.choice][1])}</p>
      </details>` : ''}`;
    const feedback = content.querySelector('[role="status"]');
    const options = [...content.querySelectorAll('[data-review-option]')];
    const again = content.querySelector('[data-review-again]');
    options.forEach((button, index) => button.addEventListener('click', () => {
      feedback.textContent = activity.options[index][1];
      for (const option of options) option.setAttribute('aria-pressed', String(option === button));
      again.hidden = false;
      answered = true;
      const attempt = {id: attemptId, at: Date.now(), variant, choice: index};
      const known = history.findIndex(item => item.id === attemptId);
      if (known >= 0) history.splice(known, 1);
      history.push(attempt);
      saveActivityField(entry.id, 'reviewHistory', history.slice(-12));
      markReviewAttempt(entry, index === activity.answer);
      keepActivityFeedbackVisible(button, feedback);
    }));
    content.querySelector('[data-review-hint]').addEventListener('click', event => {
      feedback.textContent = activity.hint || '先找一条和题目直接有关的记录。还没有把握，可以先回看上面的材料。';
      keepActivityFeedbackVisible(event.currentTarget, feedback);
    });
    again.addEventListener('click', () => {
      advance();
      const prompt = content.querySelector('h2');
      prompt.focus({preventScroll: true});
      prompt.scrollIntoView({block: 'nearest'});
    });
  }

  function advance() {
    if (variants.alternate) variant = variant === 'base' ? 'alternate' : 'base';
    newAttempt();
  }

  root.addEventListener('toggle', () => {
    if (!root.open && answered) resetOnOpen = true;
    if (root.open && resetOnOpen) {
      resetOnOpen = false;
      advance();
    }
  });
  newAttempt();
}

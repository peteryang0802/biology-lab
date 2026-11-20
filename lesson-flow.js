'use strict';

function showLessonFlowFor(target, { temporary = false } = {}) {
  const pane = target?.closest('.flow-pane');
  if (pane?.hidden) {
    pane.dispatchEvent(new CustomEvent('bio-show-pane', { bubbles: true, detail: { temporary } }));
  }
}

function flowDisclosure(label, elements) {
  const details = document.createElement('details');
  details.className = 'flow-extras';
  const summary = document.createElement('summary');
  summary.textContent = label;
  details.append(summary, ...elements);
  return details;
}

function buildLessonPanes(root, entry) {
  const direct = selector => root.querySelector(':scope > ' + selector);
  const intro = direct('.intro');
  const zone = direct('.learning-zone');
  const project = direct('.project-lab');
  const activity = direct('.term-activity') || project || direct('.experiment');
  if (!intro || !activity) return null;

  const sample = direct('.transfer') || direct('.more-activity:not(#lesson-review)')?.querySelector(':scope > .transfer');
  const examples = direct('.project-examples');
  const evidence = zone?.querySelector(':scope > [data-quiz="evidence"]');
  const calculation = zone?.querySelector('[data-difference]')?.closest('.quick-check');
  const summary = direct('.concept-summary') || zone?.querySelector(':scope > .concept-summary');
  const review = root.querySelector('#lesson-review');
  const extras = [direct('[data-cell-optics]'), direct('.photo-credit'), zone?.querySelector(':scope > .outside')];
  const safety = direct('.term-safety');
  const context = intro.querySelector('.intro-copy');
  const extraEvidence = zone?.querySelector(':scope > section:not(.concept-summary):not([data-quiz])') ??
    zone?.querySelector(':scope > details:not(#lesson-review)');
  const phases = [];
  function add(id, label, action, nodes) {
    const content = nodes.filter(Boolean);
    if (content.length) phases.push({ id, label, action, content });
  }

  if (project) {
    const work = project.querySelector('.project-result');
    if (work) {
      const disclosure = flowDisclosure('预览我的作品', []);
      work.before(disclosure);
      disclosure.append(work);
    }
    if (examples) examples.classList.add('flow-extras');
  }
  if (activity.dataset.kind === 'project') {
    const draft = activity.querySelector('.activity-fields');
    if (draft) {
      const related = [
        draft, activity.querySelector('.project-check'), activity.querySelector('.draft-history'),
        activity.querySelector('[data-export-work]'),
      ].filter(Boolean);
      const disclosure = flowDisclosure('打开我的草稿', []);
      draft.before(disclosure);
      disclosure.append(...related);
    }
  }
  if (entry.id === '8a-build-tree') {
    const cards = activity.querySelector('.activity-display');
    if (cards) {
      const disclosure = flowDisclosure('查阅四种动物的特征', []);
      cards.before(disclosure);
      disclosure.append(cards);
    }
  }

  if (entry.id === 'research-methods') {
    add('observe', '看笔记', '先看两份笔记', [activity]);
    const practice = calculation ? flowDisclosure('算一算长高了多少', [calculation]) : null;
    add('compare', '比读数', '选两条记录来比较', [evidence, practice]);
    add('reason', '公平比较', '选一对公平的对照', [biologyObservationCheck(entry, 'reason', bioObservationChecks[entry.id].causes)]);
  } else if (typeof bioObservationChecks !== 'undefined' && bioObservationChecks[entry.id]?.study) {
    for (const {stage, label, action, task} of bioObservationChecks[entry.id].study) {
      add(stage, label, action, [biologyObservationCheck(entry, stage, task)]);
    }
  } else {
    const action = project || entry.project ? '开始做项目' : '开始观察';
    add('observe', project || entry.project ? '做项目' : '看材料', action, [context, safety, activity, examples]);
    if (!project) add('compare', '再观察', '换份材料看一看', [sample]);
    add('reason', '用证据判断', '用证据答一答', [evidence, extraEvidence]);
  }
  add('review', '回顾和再试', review ? '换个例子再试' : '回顾本课', [summary, review,
    extras.some(Boolean) ? flowDisclosure('课后还能试一试', extras.filter(Boolean)) : null]);
  if (!phases.length) return null;
  return { intro, phases, review };
}

function mountLessonFlow(entry, resumeReview) {
  const questions = globalThis.bioOpeningSeven?.[entry.id] ?? globalThis.bioOpeningEight?.[entry.id];
  if (!Array.isArray(questions) || questions.length !== 2) return null;
  const stages = buildLessonPanes(outlet, entry);
  if (!stages) return null;
  const { intro, phases, review } = stages;
  const practice = globalThis.bioLessonPractice?.[entry.id];
  const questionList = document.createElement('ol');
  questionList.className = 'flow-questions';
  for (const question of questions) {
    const item = document.createElement('li');
    item.textContent = question;
    questionList.append(item);
  }
  const opening = document.createElement('div');
  opening.className = 'flow-opening';
  const reviewPhase = phases.find(phase => phase.id === 'review');
  const observePhase = phases.find(phase => phase.id === 'observe');
  const firstThought = document.createElement('p');
  firstThought.className = 'flow-first-thought';
  firstThought.hidden = true;
  const tailored = typeof bioObservationChecks !== 'undefined' && bioObservationChecks[entry.id]?.study;
  const transfer = typeof biologyTransferCase === 'function' ? biologyTransferCase(entry.id) : null;
  if (practice && observePhase) {
    opening.innerHTML = `<h2 id="flow-opening-question">${escape(practice.prompt || questions[0])}</h2>
      <p class="flow-opening-instruction">先选一个想法，接着用材料核对。</p>
      <div class="flow-predictions" role="group" aria-labelledby="flow-opening-question">
        ${practice.choices.map((choice, index) => `<button type="button" data-flow-predict="${index}" aria-pressed="false">${escape(choice)}</button>`).join('')}
      </div>`;
    observePhase.label = practice.observe;
    observePhase.action = '先看材料';
    observePhase.content.unshift(firstThought);
    if (reviewPhase) {
      reviewPhase.label = '用新材料试一次';
      const summary = reviewPhase.content.find(node => node.matches('.concept-summary'));
      const method = document.createElement('p');
      method.className = 'flow-method';
      method.innerHTML = `<strong>下次可以这样做</strong> ${escape(practice.method)}`;
      if (summary) summary.append(method);
      else reviewPhase.content.unshift(method);
    }
  } else {
    opening.innerHTML = '<h2>带着这两个问题学</h2>';
    opening.append(questionList);
  }
  if (!tailored && observePhase && typeof biologyClassroomCase === 'function') {
    const classroom = biologyClassroomCase(entry);
    if (classroom) phases.splice(phases.indexOf(observePhase) + 1, 0, {
      id: 'reason', label: '用材料判断', action: '用材料核对',
      content: [biologyObservationCheck(entry, 'reason', classroom)],
    });
  }
  if (transfer && reviewPhase) {
    const legacyReview = review?.querySelector('[data-quiz="transfer"], [data-review-content]');
    if (legacyReview) legacyReview.hidden = true;
    const summary = reviewPhase.content.findIndex(node => node.matches('.concept-summary'));
    if (summary !== -1) {
      const wrap = flowDisclosure('核对后回看本课方法', [reviewPhase.content[summary]]);
      wrap.classList.add('flow-after-review');
      reviewPhase.content[summary] = wrap;
    }
    reviewPhase.content.unshift(biologyObservationCheck(entry, 'review', transfer));
    reviewPhase.action = '换份材料自己试';
  }
  reviewPhase?.content.push(flowDisclosure('回看开场两问', [questionList.cloneNode(true)]));
  phases.unshift({ id: 'start', label: practice ? '先试一个想法' : '先看问题', content: [opening] });

  const frame = document.createElement('div');
  frame.className = 'lesson-flow';
  intro.querySelector('h1').textContent = entry.title;
  intro.querySelector('.lesson-name')?.remove();
  const term = termsById.get(entry.term);
  intro.querySelector('.eyebrow').textContent = [term?.title, entry.chapter || entry.unit].filter(Boolean).join(' · ');

  const tools = intro.querySelector('.lesson-tools');
  if (tools) {
    const book = tools.querySelector('.book-note');
    if (book) {
      const bookSummary = book.querySelector('summary');
      const page = document.createElement('p');
      page.className = 'flow-page';
      page.textContent = bookSummary.textContent;
      intro.append(page);
      book.classList.add('flow-book');
      bookSummary.textContent = '翻纸书时看哪里';
      phases.find(phase => phase.id === 'observe')?.content.push(book);
    }
    // The shade experiment still opens review through the original in-lesson hook.
    tools.hidden = true;
  }

  const layout = document.createElement('div');
  layout.className = 'flow-layout';
  const rail = document.createElement('aside');
  rail.className = 'flow-rail';
  rail.setAttribute('aria-label', '本课进度');
  rail.innerHTML = '<h2>本课进度</h2><p class="flow-position"><span></span><span class="flow-current-label"></span></p><ol role="list"></ol>';
  const position = rail.querySelector('.flow-position > span');
  const currentLabel = rail.querySelector('.flow-current-label');
  const progressList = rail.querySelector('ol');
  const content = document.createElement('div');
  content.className = 'flow-content';
  layout.append(rail, content);
  frame.append(intro, layout);

  const courseLinks = outlet.querySelector('.lesson-next');
  const nextLesson = courseLinks?.querySelector('.next-lesson');
  const nextTitle = nextLesson?.querySelector('strong')?.textContent.trim();
  const nextLabel = !nextLesson ? '' : nextLesson.hash.startsWith('#/term/')
    ? '回到本册目录' : `下一课 · ${nextTitle}`;
  courseLinks?.remove();
  outlet.prepend(frame);

  let current;
  let mainStep;
  const taskSelector = '[data-quiz]:not([hidden]), [data-review-content]:not([hidden]), [data-observation-check], [data-order-gate]';
  function syncForward(phase) {
    if (!phase.forward) return;
    const tasks = Array.from(phase.pane.querySelectorAll(taskSelector));
    const retry = tasks.find(task => task.dataset.taskOutcome === 'retry');
    const ready = tasks.every(task => task.dataset.taskOutcome === 'correct');
    phase.forward.hidden = !ready;
    phase.forward.classList.toggle('action', ready && !(phase.id === 'start' && practice && observePhase));
    if (phase.retry) phase.retry.hidden = !retry ||
      retry.hasAttribute('data-order-gate') || Boolean(retry.querySelector('[data-cell-find-evidence].action:not([hidden])'));
    const method = phase.pane.querySelector('.flow-after-review');
    if (method) method.hidden = !ready;
    if (tasks.length) {
      phase.pane.dataset.flowOutcome = ready ? 'correct'
        : tasks.some(task => task.dataset.taskOutcome === 'retry') ? 'retry' : 'ready';
    }
  }

  const predictions = [...opening.querySelectorAll('[data-flow-predict]')];
  function showFirstThought(index) {
    const choice = practice?.choices[index];
    for (const button of predictions) button.setAttribute('aria-pressed', String(Number(button.dataset.flowPredict) === index));
    firstThought.hidden = !choice;
    firstThought.textContent = choice ? `刚才你选了「${choice}」。看看材料能不能支持这个想法。` : '';
  }
  showFirstThought(state.activities?.[entry.id]?.openingChoice);
  for (const button of predictions) {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.flowPredict);
      saveActivityField(entry.id, 'openingChoice', index);
      showFirstThought(index);
      stepTo(observePhase);
    });
  }
  function stepTo(phase, { focus = true, remember = true, temporary = false } = {}) {
    if (!phase) return;
    if (current && current !== phase) playingPrompt?.stop();
    current = phase;
    if (!temporary || !mainStep) mainStep = phase;
    for (const item of phases) {
      item.pane.hidden = item !== phase;
      if (item === mainStep) item.marker.setAttribute('aria-current', 'step');
      else item.marker.removeAttribute('aria-current');
    }
    rail.toggleAttribute('data-flow-detour', temporary);
    position.textContent = `第 ${phases.indexOf(mainStep) + 1} / ${phases.length} 步`;
    currentLabel.textContent = temporary ? '回看材料' : mainStep.label;
    if (review) review.open = phase.id === 'review';
    syncForward(phase);
    if (remember) saveActivityField(entry.id, 'flowStage', phase.id);
    if (focus) {
      const heading = phase.pane.querySelector('h2,h3') || phase.pane;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      if (innerHeight <= 500) layout.scrollIntoView({ block: 'start', behavior: 'instant' });
      else window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  phases.forEach((phase, index) => {
    const pane = document.createElement('section');
    pane.className = 'flow-pane';
    pane.dataset.flowStage = phase.id;
    pane.setAttribute('aria-label', phase.label);
    pane.hidden = true;
    phase.pane = pane;
    pane.append(...phase.content);
    const actions = document.createElement('div');
    actions.className = 'flow-actions';
    const next = phases[index + 1];
    if (next) {
      const forward = document.createElement('button');
      forward.type = 'button';
      forward.className = 'flow-forward';
      forward.dataset.flowNext = next.id;
      forward.textContent = next.action + ' →';
      forward.addEventListener('click', () => stepTo(next));
      actions.append(forward);
      phase.forward = forward;
    } else if (nextLesson) {
      const forward = nextLesson.cloneNode(false);
      forward.className = 'action flow-forward';
      forward.dataset.flowFinish = '';
      forward.textContent = nextLabel + ' →';
      actions.append(forward);
      phase.forward = forward;
    }
    const previous = phases[index - 1];
    if (pane.querySelector(taskSelector) && phase.forward) {
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'action';
      retry.textContent = '按线索再试';
      retry.hidden = true;
      retry.addEventListener('click', () => {
        const question = pane.querySelector('[data-task-outcome="retry"]');
        const target = question?.querySelector('[data-answer], [data-review-option], [data-observation-pick]:enabled, [data-pick-record]:not([hidden])');
        target?.focus();
      });
      phase.retry = retry;
      actions.prepend(retry);
    }
    if (previous) {
      const back = document.createElement('button');
      back.type = 'button';
      back.dataset.flowBack = previous.id;
      back.textContent = '← 上一步';
      back.addEventListener('click', () => stepTo(previous));
      actions.append(back);
    }
    const optional = pane.querySelector('[data-observation-check] ~ details');
    if (optional) {
      actions.classList.add('observation-actions');
      optional.before(actions);
    } else {
      pane.append(actions);
    }
    content.append(pane);

    const marker = document.createElement('li');
    const number = document.createElement('span');
    number.className = 'flow-step-number';
    number.setAttribute('aria-hidden', 'true');
    number.textContent = index + 1;
    const label = document.createElement('span');
    label.textContent = phase.label;
    marker.append(number, label);
    phase.marker = marker;
    progressList.append(marker);
  });

  // Keep original mounted exercises and draft fields in place within their new pane.
  // Empty structural containers are left outside the flow and hidden.
  for (const child of outlet.children) if (child !== frame) child.hidden = true;

  frame.addEventListener('bio-show-pane', event => {
    const phase = phases.find(item => item.pane === event.target);
    if (phase && phase !== current) {
      const temporary = Boolean(event.detail?.temporary);
      stepTo(phase, { focus: false, remember: !temporary, temporary });
    }
  });
  frame.addEventListener('bio-task-state', event => {
    const outcome = event.detail?.outcome;
    if (!['ready', 'retry', 'correct'].includes(outcome) || !event.target.matches(taskSelector)) return;
    const phase = phases.find(item => item.pane.contains(event.target));
    if (!phase) return;
    event.target.dataset.taskOutcome = outcome;
    syncForward(phase);
  });
  const saved = state.activities?.[entry.id]?.flowStage;
  const restored = phases.find(phase => phase.id === saved) ?? (saved === 'reason' && entry.activity?.kind === 'order' ? observePhase : null);
  const previousReview = resumeReview ? reviewPhase : null;
  stepTo(restored ?? previousReview ?? phases[0], { focus: false, remember: !restored && Boolean(previousReview) });
  return true;
}

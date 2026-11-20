'use strict';

function showLessonFlowFor(target) {
  const pane = target?.closest('.flow-pane');
  if (pane?.hidden) pane.dispatchEvent(new Event('bio-show-pane', { bubbles: true }));
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
    add('reason', '找原因', '试试怎样找原因', [sample]);
  } else {
    const action = project || entry.project ? '开始做项目' : '开始观察';
    add('observe', project || entry.project ? '做项目' : '看材料', action, [context, safety, activity, examples]);
    if (!project) add('compare', '再观察', '换份材料看一看', [sample]);
    add('reason', '用证据判断', '用证据答一答', [evidence, extraEvidence]);
  }
  add('review', '回顾和再试', '回看刚才的问题', [summary, review,
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
  const questionList = document.createElement('ol');
  questionList.className = 'flow-questions';
  for (const question of questions) {
    const item = document.createElement('li');
    item.textContent = question;
    questionList.append(item);
  }
  const opening = document.createElement('div');
  opening.className = 'flow-opening';
  opening.innerHTML = '<h2>带着这两个问题学</h2>';
  opening.append(questionList);
  const reviewPhase = phases.find(phase => phase.id === 'review');
  reviewPhase?.content.unshift(flowDisclosure('回看开场两问', [questionList.cloneNode(true)]));
  phases.unshift({ id: 'start', label: '先看问题', content: [opening] });

  const frame = document.createElement('div');
  frame.className = 'lesson-flow';
  const title = intro.querySelector('h1');
  title.textContent = entry.title;
  intro.querySelector('.lesson-name')?.remove();

  const nav = document.createElement('nav');
  nav.className = 'flow-nav';
  nav.setAttribute('aria-label', '本课步骤');
  nav.innerHTML = '<p class="flow-position"></p><details class="flow-menu"><summary>本课步骤</summary><div></div></details>';
  const position = nav.querySelector('.flow-position');
  const menu = nav.querySelector('details');
  const menuItems = menu.querySelector('div');
  const tools = intro.querySelector('.lesson-tools');
  if (tools) {
    tools.querySelector('details')?.classList.add('flow-book');
    menu.append(tools);
  }

  const nextLesson = outlet.querySelector('.lesson-next');
  outlet.prepend(frame);
  frame.append(intro, nav);

  let current;
  const tabs = [];
  function stepTo(phase, moveFocus = true, remember = true) {
    if (!phase) return;
    if (current && current !== phase) playingPrompt?.stop();
    current = phase;
    for (const item of phases) item.pane.hidden = item !== phase;
    tabs.forEach((button, index) => {
      if (phases[index] === phase) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    const step = phases.indexOf(phase);
    position.textContent = step === 0 ? '' : `第 ${step} / ${phases.length - 1} 步 · ${phase.label}`;
    position.hidden = step === 0;
    if (review) review.open = phase.id === 'review';
    menu.open = false;
    if (remember) saveActivityField(entry.id, 'flowStage', phase.id);
    if (moveFocus) {
      const heading = phase.pane.querySelector('h2,h3') || phase.pane;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ block: 'start', behavior: 'instant' });
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
      forward.className = index === 0 ? 'action' : 'flow-link';
      forward.dataset.flowNext = next.id;
      forward.textContent = next.action + ' →';
      forward.addEventListener('click', () => stepTo(next));
      actions.append(forward);
    }
    if (index) {
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'flow-link';
      back.dataset.flowBack = phases[index - 1].id;
      back.textContent = index === 1 ? '← 回看开场问题' : '← 上一步';
      back.addEventListener('click', () => stepTo(phases[index - 1]));
      actions.append(back);
    }
    pane.append(actions);
    frame.append(pane);
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'flow-link';
    tab.dataset.flowGo = phase.id;
    tab.textContent = phase.label;
    tab.addEventListener('click', () => stepTo(phase));
    tabs.push(tab);
    menuItems.append(tab);
  });
  if (nextLesson) frame.append(nextLesson);

  // Keep original mounted exercises and draft fields in place within their new pane.
  // Empty structural containers are left outside the flow and hidden.
  for (const child of outlet.children) if (child !== frame) child.hidden = true;

  frame.addEventListener('bio-show-pane', event => {
    const phase = phases.find(item => item.pane === event.target);
    if (phase && phase !== current) stepTo(phase, false);
  });

  const saved = state.activities?.[entry.id]?.flowStage;
  const restored = phases.find(phase => phase.id === saved);
  stepTo(restored ?? (resumeReview ? reviewPhase : null) ?? phases[0], false, false);
  return true;
}

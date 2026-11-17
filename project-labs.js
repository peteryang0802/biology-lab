'use strict';

const PROJECT_HISTORY_LIMIT = 6;

const campusSpots = [
  { key: 'building', label: '教学楼门口', location: '校园北侧，教学楼南门外', plants: '2 株小叶黄杨', note: '通道窄，午间人多' },
  { key: 'shade', label: '树荫下', location: '校园西侧的小路旁', plants: '2 棵国槐、4 丛麦冬', note: '午间阴凉，地面干燥' },
  { key: 'field', label: '操场旁空地', location: '校园东侧，操场边', plants: '3 丛萱草', note: '午间有日照，雨后情况待查' },
];
const exhibitMaterials = [
  ['onion', '洋葱内表皮'],
  ['leaf', '伊乐藻叶片'],
  ['compare', '洋葱内表皮与伊乐藻叶片'],
];
const exhibitPhotos = [
  ['onion', '洋葱内表皮显微实拍', '相邻的细胞形状像长格，可以看到格之间的边界。'],
  ['leaf', '伊乐藻叶片显微实拍', '一些格状细胞内可以看到细小的绿色颗粒。'],
];
const foodCards = [
  ['rice', '米饭', '谷薯类'],
  ['tofu', '豆腐', '大豆类'],
  ['greens', '青菜', '蔬菜类'],
  ['egg', '鸡蛋', '鱼禽肉蛋类'],
  ['orange', '橙子', '水果类'],
  ['milk', '牛奶', '奶类'],
];
const aedGates = [
  ['west', '西入口', '08:00–20:00', '20:00'],
  ['east', '东入口', '08:00–18:00', '18:00'],
];
const factoryRecords = [
  ['甲架', 4, 6],
  ['乙架', 4, 7],
];
const factoryClaims = [
  ['light', '可以先考虑光照时间的影响'],
  ['water', '可以先考虑水量的影响'],
  ['mixed', '两项都变，分不清原因'],
  ['same', '这次没有比较光照或水量'],
  ['unsure', '我还不确定'],
];

const projectLabs = {
  'campus-green': {
    heading: '给校园做一张观察卡',
    prompt: '选一处，按模拟记录写观察和计划。',
    body: () => `
      <div class="project-map project-campus-map" aria-labelledby="campus-map-title">
        <div class="project-map-top"><p id="campus-map-title">模拟校园平面图</p><span aria-label="北方朝上">↑ 北</span></div>
        <div class="project-map-spots">${campusSpots.map(spot =>
          `<button type="button" data-campus-spot="${spot.key}" aria-pressed="false"><strong>${spot.label}</strong><small>${spot.plants}</small></button>`).join('')}</div>
        <span class="project-map-path">南侧步行通道</span>
        <p class="project-map-note" data-campus-note role="status"></p>
        <span class="project-map-pin" draggable="true" title="可拖到图上">候选点标记</span>
      </div>
      ${projectText('observed', '我观察到', '例如：午间树下阴凉')}
      ${projectText('plan', '我的初步方案和理由', '例如：先保留这一块空地，因为……')}
      ${projectText('check', '决定种什么之前，还要查', '例如：雨后的积水情况')}`,
    result: data => {
      const spot = campusSpots.find(spot => spot.key === data.spot);
      return {
        lines: [
          ['观察点', spot?.label], ['位置线索', spot?.location], ['模拟植物记录', spot?.plants],
          ['模拟环境记录', spot?.note], ['我的观察', data.observed],
          ['初步方案', data.plan], ['我还要查', data.check],
        ],
        complete: Boolean(spot && [data.observed, data.plan, data.check].every(text => text.trim())),
        feedback: !spot ? '从地图上选一处，再把看到的线索写下来。'
          : spot.key === 'building' ? '模拟记录显示这里通道窄。检查你的计划有没有给通行留出空间。'
            : '初步方案可以继续调查。请把看见的情况和还要查的情况写在不同栏。',
      };
    },
  },
  'cell-expo': {
    heading: '给显微照片写展签',
    prompt: '给展览选一份材料。写一句照片里能指出的观察，再写一句模型帮你解释的事。',
    body: () => `
      ${projectSelect('material', '照片材料', exhibitMaterials)}
      <div class="project-micrographs">${exhibitPhotos.map(([key, caption, description]) => `
        <figure class="project-photo" data-exhibit-photo="${key}">
          <div class="project-photo-image">
            <img src="./assets/${key}.webp" alt="${description}" loading="lazy" decoding="async">
            <p class="project-photo-fallback" role="status" hidden>${caption}暂不可见。</p>
          </div>
          <figcaption>${caption}</figcaption>
          <button type="button" data-project-retry-photo hidden>重试${caption.slice(0, -4)}照片</button>
        </figure>`).join('')}</div>
      <p class="project-photo-note">两张图的拍摄比例不同，可以比较观察到的形态和结构。</p>
      ${projectText('observed', '显微实拍 · 我看到了什么', '例如：照片中能找到相邻小格之间的边界')}
      ${projectText('model', '教学示意 · 模型能解释什么', '例如：用模型标出这里想讲的结构')}
      ${projectText('limit', '只靠这张照片还不能判断什么', '例如：两个样本的细胞哪一个更大')}
      <details class="project-photo-credit"><summary>照片来源</summary>
        <p>洋葱内表皮 · <a href="https://www.flickr.com/photos/146824358@N03/33605021164/" target="_blank" rel="noopener">Berkshire Community College Bioscience Image Library</a> · CC0 1.0。</p>
        <p>伊乐藻叶片 · <a href="https://commons.wikimedia.org/wiki/File:Chloroplasts_-_Microscopic_view_of_Elodea_canadensis.jpg" target="_blank" rel="noopener">Juan Carlos Fonseca Mata</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>。照片经裁切、缩小并转为 WebP。</p>
      </details>`,
    result: data => ({
      lines: [
        ['展品材料', exhibitMaterials.find(([key]) => key === data.material)?.[1]],
        ['显微实拍', data.observed], ['教学示意', data.model], ['证据范围', data.limit],
      ],
      complete: Boolean(data.material && [data.observed, data.model, data.limit].every(text => text.trim())),
      feedback: /所有|每一个|都没有|一定/.test(data.observed)
        ? '再看观察那一行。试着用样本名称代替范围很大的词，让观众能指着照片核对。'
        : '读给同学听，请对方先在照片上找线索，再看看模型解释了什么。',
    }),
  },
  'plant-factory': {
    heading: '设计对照，再解释一份记录',
    prompt: '先定甲、乙的比较条件。再打开固定的模拟读数，看看你的方案能解释多少。',
    body: () => `
      <div class="project-columns">
        ${projectSelect('light', '两架的光照时间', [['same', '相同'], ['different', '不同']])}
        ${projectSelect('water', '两架的水量', [['same', '相同'], ['different', '不同']])}
      </div>
      ${projectSelect('guess', '先猜结果可以说明什么', factoryClaims)}
      <button class="action" type="button" data-project-action="reveal" aria-expanded="false" aria-controls="factory-data">打开模拟记录</button>
      <p class="project-check" data-project-near="reveal" role="status"></p>
      <div id="factory-data" class="project-evidence" hidden>
        <table><caption>固定示例 · 每组幼苗数量相同</caption>
          <thead><tr><th scope="col">组别</th><th scope="col">起始叶数</th><th scope="col">第 4 天叶数</th></tr></thead>
          <tbody>${factoryRecords.map(([label, start, end]) => `<tr><th scope="row">${label}</th><td>${start} 片</td><td>${end} 片</td></tr>`).join('')}</tbody>
        </table>
        <p>这两行是同一份练习记录。换方案后，再想它能说明什么。</p>
        <div class="project-columns">${projectNumber('increaseA', '甲增加几片', 0, 30)}${projectNumber('increaseB', '乙增加几片', 0, 30)}</div>
        ${projectSelect('claim', '看完记录，你觉得能说明什么', factoryClaims)}
        <button type="button" data-project-action="check">核对读数和解释</button>
        <p class="project-check" data-factory-check role="status"></p>
      </div>`,
    result: data => {
      const choiceNames = { same: '相同', different: '不同' };
      const checks = assessFactory(data);
      const status = checks.complete ? '核对通过' : checks.reviewed ? '待订正' : '待核对';
      const attempts = [[factoryRecords[0][0], data.increaseA], [factoryRecords[1][0], data.increaseB]]
        .filter(([, value]) => value !== '').map(([label, value]) => `${label}增加 ${value} 片`).join('、');
      return {
        lines: [
          ['光照时间', choiceNames[data.light]], ['水量', choiceNames[data.water]],
          ['我的猜想', factoryClaims.find(([key]) => key === data.guess)?.[1]],
          ['固定模拟记录', data.revealed || checks.reviewed ? factoryRecords.map(([label, start, end]) => `${label} ${start} → ${end} 片`).join('、') : ''],
          [`我的计算（${checks.reviewed && checks.countsMatch ? '核对通过' : status}）`, attempts],
          [`我的判断（${checks.reviewed && checks.claimMatches ? '核对通过' : status}）`, factoryClaims.find(([key]) => key === data.claim)?.[1]],
          ['核对后的差值', checks.reviewed ? factoryRecords.map(([label, start, end]) => `${label}增加 ${end - start} 片`).join('、') : ''],
          ['核对后的证据范围', checks.reviewed ? factoryCause(data) : ''],
        ],
        complete: checks.complete,
        versionable: checks.reviewed,
        progress: checks.complete ? '读数和判断已核对' : checks.reviewed ? '草稿 · 待订正' : '草稿 · 待核对',
        feedback: data.revealed ? '分别用第 4 天的读数减去该组起始读数，再决定能不能解释差别。' : '先设定两架的条件，再打开记录。',
      };
    },
  },
  'food-planner': {
    heading: '搭一份午餐并说明理由',
    prompt: '从食物卡选一项，填一份的重量，再放进自拟菜单。看一眼食物类别，再写一句搭配理由。',
    body: () => `
      <fieldset class="project-food"><legend>选一种食物</legend>
        <div class="project-food-cards">${foodCards.map(([key, label, category]) =>
          `<button type="button" data-food-card="${key}" aria-pressed="false"><strong>${label}</strong><small>${category}</small></button>`).join('')}</div>
      </fieldset>
      <div class="project-columns project-food-add">${projectNumber('portion', '这一份约多少克', 1, 1000)}
        <button class="action" type="button" data-project-action="add-food">放进菜单</button></div>
      <p class="project-check" data-project-near="menu" role="status"></p>
      <ul class="project-plated" aria-label="我的午餐菜单"></ul>
      ${projectText('reason', '我这样安排的理由', '例如：这份菜单里有几类食物，还想补充什么？')}`,
    result: data => {
      const items = data.items.map(item => ({
        label: foodCards.find(([key]) => key === item.food)[1],
        category: foodCards.find(([key]) => key === item.food)[2],
        grams: item.grams,
      }));
      const amount = new Set(items.map(item => item.category)).size;
      return {
        lines: [
          ...items.map(item => [item.label, `${item.category}，约 ${item.grams} 克`]),
          ['食物类别', items.length ? `${amount} 类` : ''],
          ['我的搭配理由', data.reason],
        ],
        complete: Boolean(items.length && data.reason.trim()),
        feedback: amount > 1
          ? `这份菜单包含 ${amount} 类食物。类别和份量可以互相补充，做法也会影响对菜单的描述。`
          : '看看菜单里的食物类别。你还想到什么可以搭配的类别？',
      };
    },
  },
  'aed-map': {
    heading: '给模拟图书馆做一张指引卡',
    prompt: '从虚构社区广场出发。选一个到访时间和入口，再用记录查路线有没有开放。',
    body: () => `
      <figure class="project-map project-route" aria-labelledby="aed-project-map-title">
        <figcaption id="aed-project-map-title">虚构图书馆 · 教学模型</figcaption>
        <p>一层服务台旁 · 模拟设备点</p>
        <div class="project-route-track" aria-hidden="true"><span data-track="west"></span><span data-track="east"></span></div>
        <div class="project-map-spots">${aedGates.map(([key, label, hours]) =>
          `<button type="button" data-aed-gate="${key}" aria-pressed="false"><strong>${label}</strong><small>${hours}</small><small data-gate-status></small></button>`).join('')}</div>
        <span class="project-map-path">广场 · 模拟起点</span>
        <p class="project-map-note" data-route-preview></p>
      </figure>
      <div class="project-columns">${projectSelect('time', '到访时间', [['17:30', '17:30'], ['19:00', '19:00'], ['20:30', '20:30']])}
        ${projectSelect('gate', '用哪条路线', [['east', '走东入口'], ['west', '走西入口'], ['closed', '两个入口都关了']])}</div>
      ${projectSelect('source', '依据来自哪里', [['board', '模拟门牌的开放记录'], ['guess', '从地图距离猜测']])}
      ${projectText('reminder', '给第一次访问者的一条提醒', '例如：开门时段以模拟记录为准。')}`,
    result: data => {
      const open = openGates(data.time);
      const gate = aedGates.find(([key]) => key === data.gate);
      const routeFits = (data.gate === 'closed' && open.length === 0) || open.includes(data.gate);
      const complete = Boolean(data.time && data.gate && routeFits && data.source === 'board' && data.reminder.trim());
      const hasRoute = Boolean(data.time && data.gate);
      return {
        lines: [
          ['练习地点', '虚构社区的图书馆'],
          ['演练时段', data.time],
          [hasRoute && routeFits && data.source === 'board' ? '已对照开放记录的路线' : '我的路线草稿',
            gate ? `广场 → ${gate[1]} → 一层服务台旁` : data.gate === 'closed' ? '两个入口均不可通行' : ''],
          ['地图依据', data.source === 'board' ? '模拟门牌的开放记录' : data.source === 'guess' ? '待核对开放记录' : ''],
          ['给访问者的提醒', data.reminder],
        ],
        complete,
        versionable: hasRoute,
        progress: complete ? '路线和开放记录已核对' : '草稿 · 待核对路线或补充依据',
        feedback: !data.time || !data.gate ? '选时间和路线，再看图上两个入口的状态。'
          : !routeFits ? `${data.time} 时，这条路线与给定记录不符。请对照开放状态修改指引。`
            : data.source !== 'board' ? '路线和模拟记录吻合。补上开放记录作为依据，别人才能复核。'
              : '路线、时段和来源都能对上。让同学用指引找出模拟设备点，再请对方指出可能含糊的地方。',
      };
    },
  },
};

function projectSelect(key, label, choices) {
  return `<label class="project-field">${label}<select name="${key}"><option value="">请选择</option>${choices.map(
    ([value, text]) => `<option value="${value}">${text}</option>`).join('')}</select></label>`;
}

function projectText(key, label, hint) {
  return `<label class="project-field">${label}<textarea name="${key}" maxlength="180" rows="2" placeholder="${escape(hint)}"></textarea></label>`;
}

function projectNumber(key, label, min, max) {
  return `<label class="project-field">${label}<input name="${key}" type="number" inputmode="numeric" min="${min}" max="${max}" step="1"></label>`;
}

function numberInRange(value, min, max) {
  return /^\d+$/.test(String(value)) && Number(value) >= min && Number(value) <= max;
}

function factoryCause(data) {
  if (data.light === data.water) return data.light === 'different'
    ? '光照和水量一起变，这份记录不能分清哪一项有影响。'
    : '光照和水量都相同，这个设计没有比较它们的影响。';
  const variable = data.light === 'different' ? '光照时间' : '水量';
  return `方案只改变${variable}。如果真实记录有差别，可以先把差别与${variable}联系起来，再用重复观察检验。`;
}

function assessFactory(data) {
  const numericInputs = [data.increaseA, data.increaseB];
  const hasCounts = numericInputs.every(input => numberInRange(input, 0, 30));
  const reviewed = Boolean(data.checked && data.light && data.water && hasCounts && data.claim);
  const countsMatch = factoryRecords.every(([, start, end], index) => Number(numericInputs[index]) === end - start);
  const expected = data.light === data.water ? (data.light === 'different' ? 'mixed' : 'same')
    : data.light === 'different' ? 'light' : 'water';
  const claimMatches = data.claim === expected;
  return { reviewed, countsMatch, claimMatches, complete: reviewed && countsMatch && claimMatches };
}

function factoryCheck(data) {
  if (!data.checked) return '';
  const checks = assessFactory(data);
  if (!checks.reviewed) return '补齐比较条件和两组差值，再选一个目前的判断。';
  const count = checks.countsMatch ? '两组差值都对。'
    : '用每组第 4 天的读数减起始读数，可算出甲增加 2 片，乙增加 3 片。';
  const claim = checks.claimMatches ? '你的判断符合这份比较方案。' : '再看一眼两架哪些条件变了。';
  return count + claim + factoryCause(data);
}

function openGates(time) {
  return aedGates.filter(([, , , closes]) => time >= '08:00' && time < closes).map(([key]) => key);
}

function normalizeProjectDraft(source = {}) {
  const draft = {};
  const textKeys = ['observed', 'plan', 'check', 'model', 'limit', 'reason', 'reminder'];
  textKeys.forEach(key => { draft[key] = String(source?.[key] ?? '').slice(0, 180); });
  const options = {
    spot: campusSpots.map(spot => spot.key), material: exhibitMaterials.map(([key]) => key),
    light: ['same', 'different'], water: ['same', 'different'],
    guess: factoryClaims.map(([key]) => key), claim: factoryClaims.map(([key]) => key),
    activeFood: foodCards.map(([key]) => key), time: ['17:30', '19:00', '20:30'],
    gate: ['east', 'west', 'closed'], source: ['board', 'guess'],
  };
  Object.entries(options).forEach(([key, allowed]) => { draft[key] = allowed.includes(source?.[key]) ? source[key] : ''; });
  ['increaseA', 'increaseB', 'portion'].forEach(key => {
    draft[key] = /^\d{1,4}$/.test(String(source?.[key] ?? '')) ? String(source[key]) : '';
  });
  draft.items = (Array.isArray(source?.items) ? source.items : []).filter(item =>
    foodCards.some(([key]) => key === item?.food) && numberInRange(item?.grams, 1, 1000),
  ).slice(0, 6).map(item => ({ food: item.food, grams: Number(item.grams) }));
  draft.revealed = source?.revealed === true;
  draft.checked = source?.checked === true;
  return draft;
}

function renderProjectLab(entry) {
  const lab = projectLabs[entry.id];
  if (!lab) return '';
  return `<section class="project-lab" data-project-id="${entry.id}" aria-labelledby="project-title">
    <header class="section-heading"><h2 id="project-title">${lab.heading}</h2><p>${lab.prompt}</p></header>
    <div class="project-bench">
      <div class="project-fields">${lab.body()}<p class="project-status" data-project-field-status role="status"></p></div>
      <div class="project-result">
        <h3>我的作品</h3>
        <p class="project-progress" data-project-progress></p>
        <dl data-project-output></dl>
        <p class="project-feedback" data-project-tip></p>
        <div class="project-actions">
          <button type="button" data-project-action="copy">复制</button>
          <button type="button" data-project-action="download">下载文本</button>
          <button type="button" data-project-action="save" aria-describedby="project-version-state" hidden>保存这个版本</button>
        </div>
        <p class="project-status" id="project-version-state" data-project-status role="status"></p>
        <label class="project-field" data-project-copy hidden>手动复制这段作品<textarea readonly rows="5"></textarea></label>
        <details data-project-history hidden><summary>以前的版本</summary><ol></ol></details>
      </div>
    </div>
  </section>`;
}

function bindProjectPhoto(figure, refresh) {
  const image = figure.querySelector('img');
  const fallback = figure.querySelector('.project-photo-fallback');
  const retry = figure.querySelector('[data-project-retry-photo]');
  const src = image.getAttribute('src');
  const caption = figure.querySelector('figcaption').textContent;
  image.addEventListener('load', () => {
    const refocus = document.activeElement === retry;
    figure.dataset.unavailable = 'false';
    image.hidden = false;
    fallback.hidden = true;
    retry.hidden = true;
    refresh();
    if (refocus) figure.focus();
  });
  const showFallback = () => {
    figure.dataset.unavailable = 'true';
    image.hidden = true;
    fallback.hidden = false;
    retry.hidden = false;
    fallback.textContent = `${caption}暂不可见。可以先选另一份材料。`;
    refresh();
  };
  image.addEventListener('error', showFallback);
  retry.addEventListener('click', () => {
    const url = new URL(src, document.baseURI);
    url.searchParams.set('retry', String(Date.now()));
    fallback.textContent = '正在重新打开照片。';
    image.loading = 'eager';
    image.src = url.href;
  });
  if (image.complete && !image.naturalWidth) showFallback();
}

function mountProjectLab(entry) {
  const lab = projectLabs[entry.id];
  const root = outlet.querySelector('.project-lab');
  if (!lab || !root) return;
  if (!state.projects || typeof state.projects !== 'object' || Array.isArray(state.projects)) state.projects = {};
  const source = state.projects[entry.id];
  let draft = normalizeProjectDraft(source?.draft);
  const versions = (Array.isArray(source?.versions) ? source.versions : [])
    .filter(version => Number.isFinite(version?.time) && version.time > 0 && version.time <= 8640000000000000)
    .slice(0, PROJECT_HISTORY_LIMIT)
    .map(version => ({ time: version.time, draft: normalizeProjectDraft(version.draft) }));
  const fields = [...root.querySelectorAll('.project-fields [name]')];
  const output = root.querySelector('[data-project-output]');
  const tip = root.querySelector('[data-project-tip]');
  const status = root.querySelector('[data-project-status]');
  const inputStatus = root.querySelector('[data-project-field-status]');
  const revealStatus = root.querySelector('[data-project-near="reveal"]');
  const menuStatus = root.querySelector('[data-project-near="menu"]');
  const progress = root.querySelector('[data-project-progress]');
  const saveVersion = root.querySelector('[data-project-action="save"]');
  const copyBox = root.querySelector('[data-project-copy]');
  const history = root.querySelector('[data-project-history]');
  const dateLabel = date => new Date(date).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' });
  let result;
  const exhibitFigures = [...root.querySelectorAll('[data-exhibit-photo]')];
  exhibitFigures.forEach(figure => {
    figure.tabIndex = -1;
    bindProjectPhoto(figure, refresh);
  });

  function announce(element, message) {
    if (element.textContent !== message) element.textContent = message;
  }

  function bringFeedbackIntoView(element) {
    element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function fieldStatus(anchor) {
    if (inputStatus.previousElementSibling !== anchor) anchor.after(inputStatus);
    return inputStatus;
  }

  function statusForField(field) {
    return fieldStatus(field.closest('.project-columns') ?? field.closest('.project-field'));
  }

  function persist(message = '', element = status) {
    state.projects[entry.id] = { draft, versions };
    const saved = saveState();
    if (message || !saved) announce(element, saved ? message : '浏览器暂时无法保存，请复制或下载作品。');
    return saved;
  }

  function fillFields() {
    fields.forEach(field => { field.value = draft[field.name]; });
  }

  function setPressed(selector, dataKey, value) {
    root.querySelectorAll(selector).forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset[dataKey] === value));
    });
  }

  function refresh() {
    result = lab.result(draft);
    if (draft.material && exhibitFigures.some(figure =>
      figure.dataset.unavailable === 'true' &&
      (draft.material === 'compare' || figure.dataset.exhibitPhoto === draft.material),
    )) {
      result.lines.push(['照片状态', '待核图']);
      result.feedback = '你选的照片暂不可见。展签已标为待核图，确认能看到线索后再修改。';
      result.progress = '草稿 · 待核图';
      result.versionable = result.complete;
      result.complete = false;
    }
    const lines = result.lines.filter(([, value]) => value?.trim());
    output.innerHTML = lines.length
      ? lines.map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('')
      : '<div><dt>还没开始</dt><dd>填写一项，马上看到作品草稿。</dd></div>';
    tip.textContent = result.feedback;
    progress.textContent = result.progress ?? (result.complete ? '已填写，可以保存版本' : '草稿 · 可继续填写');
    saveVersion.hidden = !(result.versionable ?? result.complete);
    saveVersion.textContent = result.complete ? '保存这个版本' : '保存草稿版本';
    root.querySelectorAll('[data-project-action="copy"], [data-project-action="download"]').forEach(btn => {
      btn.disabled = !lines.length;
    });
    copyBox.hidden = true;
    if (entry.id === 'campus-green') {
      setPressed('[data-campus-spot]', 'campusSpot', draft.spot);
      const spot = campusSpots.find(spot => spot.key === draft.spot);
      root.querySelector('[data-campus-note]').textContent = spot ? `${spot.location} · ${spot.plants}。${spot.note}。`
        : matchMedia('(pointer: coarse)').matches ? '点一下要标记的地点。' : '点一下地点，也可以把标记拖过去。';
    } else if (entry.id === 'cell-expo') {
      exhibitFigures.forEach(figure => {
        const selected = draft.material === 'compare' || figure.dataset.exhibitPhoto === draft.material;
        figure.dataset.highlight = String(selected);
      });
    } else if (entry.id === 'plant-factory') {
      root.querySelector('#factory-data').hidden = !draft.revealed;
      const reveal = root.querySelector('[data-project-action="reveal"]');
      reveal.setAttribute('aria-expanded', String(draft.revealed));
      reveal.textContent = draft.revealed ? '收起模拟记录' : '打开模拟记录';
      root.querySelector('[data-factory-check]').textContent = factoryCheck(draft);
    } else if (entry.id === 'food-planner') {
      setPressed('[data-food-card]', 'foodCard', draft.activeFood);
      root.querySelector('.project-plated').innerHTML = draft.items.map((item, index) => {
        const [, label, category] = foodCards.find(([key]) => key === item.food);
        return `<li><span><strong>${label}</strong> · ${category} · ${item.grams} 克</span><button type="button" data-remove-food="${index}" aria-label="移除${label}">移除</button></li>`;
      }).join('');
    } else if (entry.id === 'aed-map') {
      setPressed('[data-aed-gate]', 'aedGate', draft.gate);
      const open = openGates(draft.time);
      root.querySelectorAll('[data-track]').forEach(track => {
        track.dataset.selected = String(track.dataset.track === draft.gate);
        track.dataset.closed = String(Boolean(draft.time && !open.includes(track.dataset.track)));
      });
      root.querySelectorAll('[data-aed-gate]').forEach(button => {
        button.querySelector('[data-gate-status]').textContent = draft.time ? open.includes(button.dataset.aedGate) ? '此时开放' : '此时关闭' : '';
      });
      const gate = aedGates.find(([key]) => key === draft.gate);
      root.querySelector('[data-route-preview]').textContent = gate
        ? `广场 → ${gate[1]} → 一层服务台旁` : draft.gate === 'closed' ? '已记下：两个入口都关了。' : '点一下入口来画路线。';
    }
  }

  function showHistory() {
    history.hidden = !versions.length;
    history.querySelector('ol').innerHTML = versions.map((item, index) =>
      `<li><span>${escape(dateLabel(item.time))}</span><button type="button" data-open-version="${index}">恢复为当前草稿</button></li>`,
    ).join('');
  }

  function setCampusSpot(key) {
    if (!campusSpots.some(spot => spot.key === key)) return;
    draft.spot = key;
    refresh();
    persist('已记住观察点。', fieldStatus(root.querySelector('.project-campus-map')));
    bringFeedbackIntoView(root.querySelector('[data-campus-note]'));
  }

  function projectTextExport() {
    return [
      entry.title, `作品状态：${progress.textContent}`,
      ...result.lines.filter(([, value]) => value?.trim()).map(([label, value]) => `${label}：${value}`),
      entry.id === 'aed-map' ? '主题练习 · 地点和时段均为虚构资料。' : '',
    ].filter(Boolean).join('\n');
  }

  function edit(event) {
    const field = event.target;
    if (!fields.includes(field)) return;
    draft[field.name] = field.value.slice(0, 180);
    if (entry.id === 'plant-factory') {
      if (field.name !== 'guess') draft.checked = false;
      if (draft.light && draft.water) announce(revealStatus, '');
    }
    if (field.name === 'portion') announce(menuStatus, '');
    refresh();
    persist('草稿已保存在此浏览器。', statusForField(field));
  }

  root.addEventListener('input', edit);
  root.addEventListener('dragstart', event => {
    if (!event.target.closest('.project-map-pin')) return;
    event.dataTransfer.setData('application/x-bio-campus-marker', 'pin');
    event.dataTransfer.effectAllowed = 'move';
  });
  root.addEventListener('dragover', event => {
    if (event.target.closest('[data-campus-spot]') && event.dataTransfer.types.includes('application/x-bio-campus-marker')) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    }
  });
  root.addEventListener('drop', event => {
    const target = event.target.closest('[data-campus-spot]');
    if (!target || event.dataTransfer.getData('application/x-bio-campus-marker') !== 'pin') return;
    event.preventDefault();
    setCampusSpot(target.dataset.campusSpot);
  });

  root.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.campusSpot) {
      setCampusSpot(button.dataset.campusSpot);
      return;
    }
    if (button.dataset.foodCard) {
      draft.activeFood = button.dataset.foodCard;
      refresh();
      persist('选好了，再填写这一份的重量。', menuStatus);
      return;
    }
    if (button.dataset.aedGate) {
      draft.gate = button.dataset.aedGate;
      fillFields();
      refresh();
      persist('已画出模拟路线。', fieldStatus(root.querySelector('.project-route')));
      return;
    }
    if (button.hasAttribute('data-remove-food')) {
      draft.items.splice(Number(button.dataset.removeFood), 1);
      refresh();
      persist('已从菜单移除。', menuStatus);
      root.querySelector('[data-project-action="add-food"]').focus();
      return;
    }
    if (button.hasAttribute('data-open-version')) {
      const saved = versions[Number(button.dataset.openVersion)];
      if (!saved) return;
      // Preserve the current working copy before replacing it.
      if (result.lines.some(([, value]) => value?.trim()) && JSON.stringify(draft) !== JSON.stringify(saved.draft)) {
        versions.unshift({ time: Date.now(), draft: normalizeProjectDraft(draft) });
        versions.length = Math.min(versions.length, PROJECT_HISTORY_LIMIT);
      }
      draft = normalizeProjectDraft(saved.draft);
      fillFields();
      refresh();
      showHistory();
      persist('已恢复旧版本。原来的草稿也留在历史中。');
      history.querySelector('summary').focus();
      return;
    }
    switch (button.dataset.projectAction) {
      case 'reveal':
        if (!draft.revealed && (!draft.light || !draft.water)) {
          announce(revealStatus, '请先选好光照和水量的比较条件。');
          bringFeedbackIntoView(revealStatus);
          return;
        }
        draft.revealed = !draft.revealed;
        refresh();
        announce(revealStatus, '');
        persist('', revealStatus);
        break;
      case 'check':
        draft.checked = true;
        refresh();
        announce(inputStatus, '');
        persist('', fieldStatus(button));
        bringFeedbackIntoView(root.querySelector('[data-factory-check]'));
        break;
      case 'add-food':
        if (!draft.activeFood || !numberInRange(draft.portion, 1, 1000)) {
          announce(menuStatus, '请先选一种食物，再填这一份的重量（1 至 1000 克的整数）。');
          bringFeedbackIntoView(menuStatus);
          return;
        }
        if (draft.items.length >= 6) {
          announce(menuStatus, '菜单里已有 6 项。移除一项后可以再加。');
          bringFeedbackIntoView(menuStatus);
          return;
        }
        draft.items.push({ food: draft.activeFood, grams: Number(draft.portion) });
        draft.portion = '';
        fillFields();
        refresh();
        persist('已将这一项放进菜单。', menuStatus);
        bringFeedbackIntoView(menuStatus);
        break;
      case 'save':
        if (!(result.versionable ?? result.complete)) return;
        versions.unshift({ time: Date.now(), draft: normalizeProjectDraft(draft) });
        versions.length = Math.min(versions.length, PROJECT_HISTORY_LIMIT);
        showHistory();
        persist(result.complete ? '已保存一个版本。你可以继续改草稿。' : '已保存草稿版本。你可以继续订正。');
        if (result.complete && typeof markPracticed === 'function') markPracticed(entry);
        break;
      case 'copy': {
        const text = projectTextExport();
        try {
          await navigator.clipboard.writeText(text);
          status.textContent = '已复制，可以粘贴到笔记。';
        } catch {
          const area = copyBox.querySelector('textarea');
          copyBox.hidden = false;
          area.value = text;
          area.focus();
          area.select();
          status.textContent = '请复制已选中的作品。';
        }
        break;
      }
      case 'download': {
        const url = URL.createObjectURL(new Blob([projectTextExport()], { type: 'text/plain;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `生物实验台-${entry.title}.txt`;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        status.textContent = '已请求下载作品文本。';
        break;
      }
    }
  });

  fillFields();
  refresh();
  showHistory();
  if (source && fields.length) announce(statusForField(fields[0]), '已恢复在此浏览器的草稿。');
}

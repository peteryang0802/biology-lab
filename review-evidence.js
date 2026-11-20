'use strict';

// Each cue directs students to an operation or record already present in its lesson.
const reviewEvidenceCues = {
  'life-traits': '在豆种观察里点「看看记录」，比较同一粒种子早晚的两张图。',
  'research-methods': '展开记录，对照对象、时间和刻度。再辨认哪一项条件需要保持一样。',
  'campus-green': '在校园图上点一个调查点，对照地点、植物和现场条件能否一起记下来。',
  cell: '切到伊乐藻叶片，比较显微照片上的边界与绿色小点。注意图下的比例提示。',
  levels: '把一片叶和组成它的细胞图放在一起看，找出同一器官里不同结构的线索。',
  'cell-expo': '换一张标本，为展签分别核对照片能看见的细节、模型用来解释的结构。',
  'plant-nutrients': '核对三只杯子里的水和无机盐。选择一对时，先说清哪项相同。',
  photosynthesis: '点「看看记录」，在同一片叶子上对照遮光、受光与淀粉检验的结果。',
  'plant-factory': '查看两架幼苗的开始与结束记录。分别做一次结束值减开始值。',
  'human-nutrients': '回到绒毛示意，沿箭头找到葡萄糖从肠腔到血液经过的地方。',
  'food-planner': '在菜单工作台选择一种食材，核对它的种类和份量是否都写在记录里。',
  'plant-transport': '切换有叶组和无叶组，观察透明罩有没有水滴。再想用什么材料查水的路线。',
  'human-transport': '沿着循环图的箭头，分别找一段离开心脏、一段回到心脏的血流。',
  'aed-map': '在模拟地图选一个到达时间，核对入口是否开放，再找设备旁的室内地标。',
  '7b-human-breathing': '切换膈的位置，比较进入、流出以及实际测到的气体成分是哪些不同问题。',
  '7b-plant-breathing': '点出两张条件能对齐的种子卡，核对暗处、温度与氧变化记录。',
  '7b-other-breathing': '切换鱼和蝗虫，分别从供氧环境追到气体进入身体的部位。',
  '7b-cellular-respiration': '移动顺序卡，从物质的来源追到肌肉细胞使用这些物质的那一步。',
  '7b-smoke-model': '展开下面两张虚拟卡，把可见斑点和这个模型没有测到的信息分开写。',
  '7b-waste-paths': '把呼出的气体、尿液和汗液的记录分开，核对每张记录说明的是哪条途径。',
  '7b-urine-formation': '在模型上切换滤过和重吸收两站，跟同一批物质看水从哪儿返回。',
  '7b-sweat': '切换有风和无风，找出两条记录里同一时刻还能看到多少水。',
  '7b-urine-device': '展开两条虚拟屏幕记录，再把成功读取与没有获得读数分开写。',
  '7b-nervous-system': '点选脑和脊髓的卡片，沿手部那条线路看看哪部分在它们之外。',
  '7b-reflexes': '把缩手的卡片重新排一次，分别找接收刺激、传递信号和做出动作的部位。',
  '7b-sensing-motion': '切换看笔和摸笔两种条件，比较各自获得的信息，再想信息怎样引出动作。',
  '7b-hormones': '切换饭后两个时间点，查看血糖变化以及响应它的部位。',
  '7b-eye-model': '查看眼球模型中固定的屏幕，再试改变镜片凸度，观察清晰位置。',
  '8a-flower-fruit': '找出排序中果实长大的一张，同时看子房和里面的小结构分别发育成什么。',
  '8a-human-development': '在示意上追踪胎儿与胎盘的连接，再看哪些信息要靠胎盘两侧的记录说明。',
  '8a-animal-development': '对照切换蝴蝶与蝗虫，逐阶段核对两条路线有没有蛹这一站。',
  '8a-silkworm-observation': '把 1 号蚕第 1 天和第 4 天记录并排，检查编号、日期和测量是否都能对上。',
  '8a-reproduction-modes': '在两条草莓繁殖路线中，找一条能沿长茎追到小苗扎根的路线。',
  '8a-traits': '比较观察卡里的物种和观察部位。先让这两项一致，再比较性状。',
  '8a-alleles': '切换到 Rr × Rr，数棋盘格，想想一格代表一次可能结果还是固定的种子顺序。',
  '8a-human-inheritance': '在三张记录里找从亲代到受精卵的传递过程，区分观察到的相似和解释。',
  '8a-variation': '并看窗边组和遮阴组，找出共同条件、变化的条件以及实际测量的量。',
  '8a-gm-claims': '并排查看甲、乙货架卡，先用资料核对它们回答的是储藏还是营养。',
  '8a-origin-of-life': '点开模拟的取样记录，看记录实际检出了什么，以及有没有直接的生命证据。',
  '8a-natural-selection': '在两次群体记录之间切换，比较同样数量的后代中同一种喙各占多少。',
  '8a-human-evolution': '回到脚印证据卡，区分同一地点看到的记录和从另一处得到的材料。',
  '8a-build-tree': '在树上试合一组枝，看看外形相似和共有结构能否提供同样的分类依据。',
  '8b-classification': '用「会不会飞」和「是否用乳汁喂幼崽」分别分一次，观察结果为什么不同。',
  '8b-algae-and-plants': '在几张观察卡里追种子的来源和后来萌发的记录，区分种子与其他繁殖线索。',
  '8b-animal-groups': '回到鲫鱼和小虾的图，分别点能看到内部骨骼与外部身体分节的位置。',
  '8b-microbial-groups': '切换结构卡，对照有没有细胞、有没有成形的细胞核。',
  '8b-curiosity-cabinet': '比较样例的标签信息，再到草稿里补一条可以复核的形态或来源记录。',
  '8b-organisms-and-environment': '在校园图重新点两个测点，核对时间、地面和光照哪些条件一起变了。',
  '8b-ecosystem': '试把草、蝗虫、青蛙重新连成一条链，沿箭头核对能量从谁到谁。',
  '8b-biosphere': '切到下雨后的图，沿排水箭头从校园追到校外，核对边界之外是否还有来水。',
  '8b-eco-bottle': '切换模型的两种比较，查看光照、水量是否同时变化，再回草稿改一个条件。',
  '8b-communicable-disease': '对照情境卡，区分做过的观察、预防措施和仍需要有资质人员确认的判断。',
  '8b-immunity': '切换三类保护模型，比较一般防御与有针对性反应的区别。',
  '8b-first-aid': '对照记录卡，区分自己知道的地点、眼前所见与旁人的猜测。',
  '8b-public-health-guide': '并看两张版面样例，哪里能核查出处，哪里仍需要注明未确认？',
  '8b-agricultural-biology': '点选需要比较的两块试验田，检查品种、条件与记录的统计范围。',
  '8b-industrial-biology': '切换查看产品类别和每 100 克蛋白质，找出哪一栏能直接回答分类。',
  '8b-fermentation-food-guide': '并看两张产品标签，区分原料表提供的事实与有关生产方式的信息。',
};

const legacyEvidenceTargets = {
  cell: '.cell-samples',
  'human-nutrients': '[data-scene="1"]',
  'plant-transport': '[data-scene="1"]',
};

function bindReviewEvidence(entry, trigger, visit = () => {}) {
  const researchTransfer = entry.id === 'research-methods' && Boolean(trigger.closest('[data-quiz="transfer"]'));
  const target = outlet.querySelector((researchTransfer ? '[data-scene="1"]' : legacyEvidenceTargets[entry.id]) ||
    '[data-term-activity], [data-project-id], [data-scene="0"]');
  if (!target || !reviewEvidenceCues[entry.id]) return;
  let guide = target.querySelector(':scope > [data-review-evidence-guide]');
  if (!guide) {
    guide = document.createElement('div');
    guide.className = 'review-evidence-guide';
    guide.dataset.reviewEvidenceGuide = '';
    guide.innerHTML = '<p tabindex="-1"></p><button type="button" class="text-control">回到刚才的小题 ↓</button>';
    guide.hidden = true;
    target.prepend(guide);
  }
  const cue = guide.querySelector('p');
  cue.textContent = researchTransfer ? '对比两种安排，找出哪一种同时改变了水量和光照。' : reviewEvidenceCues[entry.id];
  trigger.hidden = false;
  trigger.addEventListener('click', () => {
    visit();
    if (typeof showLessonFlowFor === 'function') showLessonFlowFor(target);
    for (let ancestor = target; ancestor && ancestor !== outlet; ancestor = ancestor.parentElement) {
      if (ancestor.tagName === 'DETAILS') ancestor.open = true;
    }
    guide.hidden = false;
    guide.querySelector('button').onclick = () => {
      guide.hidden = true;
      const source = trigger.isConnected ? trigger : outlet.querySelector('[data-review-evidence]');
      if (typeof showLessonFlowFor === 'function') showLessonFlowFor(source);
      source?.focus({ preventScroll: true });
      source?.scrollIntoView({ block: 'center', behavior: 'instant' });
    };
    cue.focus({ preventScroll: true });
    cue.scrollIntoView({ block: 'start', behavior: 'instant' });
  });
}

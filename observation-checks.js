'use strict';

const bioObservationChecks = {
  '7b-human-breathing': {
    review: {
      id: 'breathing-sealed-hood',
      prompt: '把罩底软膜向下拉，外界空气最后到了哪里？',
      diagram: 'breathing-hood',
      source: '密封模型的观察记录',
      records: [
        '密封塞包住导管。管口对着外界，两条支管各与一个气球内部相通。',
        '软膜拉下后，气球外的罩腔变大，两个气球也鼓了起来。',
        '玻璃罩与软膜之间密封，气球外没有进气孔。',
      ],
      choices: ['进入气球内部', '进入玻璃罩与气球之间的罩腔', '先进入软膜，再从软膜吹进气球'],
      answer: 0,
      evidence: [0, 2],
      why: '哪两条记录说明了气路和隔开的空间？',
      hint: '从外界沿管口走到支管末端。管子在哪里结束？',
      wrong: [
        '',
        '罩腔变大不等于它接上了外界空气。先沿穿过密封塞的导管追到末端。',
        '软膜是密封边界，可以改变空间大小。外界空气走的是哪条管？',
      ],
      evidenceHint: '需要一条说明管子通到哪里、一条说明罩腔是否与外界相通的记录。',
      result: '软膜下拉使罩腔扩大、气压降低；气球扩张，气体从外界沿导管流进球内。气球代表肺，罩腔的变化提供驱动。呼吸时外界空气经呼吸道进入肺，不进入肺外的胸腔。',
    },
  },
  'research-methods': {
    causes: {
      id: 'research-light-comparison',
      storageKey: 'researchControlEvidence',
      prompt: '想查照光时长会不会影响同种幼苗长高。哪两组可以比？',
      source: '豆苗实验安排 · 自编',
      records: [
        '甲：每天照光 4 小时，浇水 20 毫升。',
        '乙：每天照光 7 小时，浇水 20 毫升。',
        '丙：每天照光 7 小时，浇水 30 毫升。',
        '三组各 5 株，品种相同，初始高度相近；在同一天用同一方法测量。',
      ],
      choices: ['甲和丙', '乙和丙', '甲和乙'],
      answer: 2,
      evidence: [0, 1],
      why: '选出能直接对照照光和浇水安排的两条记录。',
      hint: '先找照光不同的两组，再核对它们的浇水量。',
      wrong: ['甲丙的照光和水量都不同，只凭差异分不清两种影响。', '乙丙照光一样，可以比较水量的影响，题目问的是照光。'],
      result: '甲乙只改照光时长，这是本次的自变量。需要用相同方法记每株在同一时段长高多少，这是测量的结果。多株重复有助于减小单株差异的影响。',
    },
    review: {
      id: 'research-cover-transfer',
      prompt: '想查落叶覆盖能不能让花盆的土更久保持湿润。哪种说法和证据都站得住？',
      source: '三个花盆的试验记录 · 新材料',
      records: [
        '甲：同一批土，起初含水 24%，铺落叶。两天后用同法测得 19%。',
        '乙：同一批土，起初含水 24%，不铺落叶。两天后用同法测得 13%。',
        '丙：改用沙土，起初含水 18%，不铺落叶。两天后测得 8%。',
        '三盆放在相近位置，大小相同。观察两天，没有再浇水。',
      ],
      choices: [
        '比甲和丙，因为差得越大越能说明落叶的作用',
        '比甲和乙。改变的是有无覆盖，测的是土壤含水量。这次结果支持覆盖能减慢失水。',
        '比乙和丙，因为两盆最后的含水量不同，所以覆盖效果已经得到证明',
      ],
      answer: 1,
      evidence: [0, 1],
      why: '选出能比覆盖前提和两天后结果的两条记录。',
      hint: '需要两盆的土和起始含水率都能对齐，只有是否覆盖不同。',
      wrong: [
        '甲丙的土和起点也不同。差值明显不代表对照更公平。',
        '',
        '乙丙都没覆盖，不能用它们判断有无覆盖的影响。',
      ],
      evidenceHint: '找土、起点、测量时长与测法都能对齐，同时一个覆盖、另一个没有覆盖的两盆。',
      result: '甲少了 5 个百分点，乙少了 11 个百分点。本次比较支持落叶覆盖减慢土壤失水。换地点或换土还应再做几组，避免从一次记录推出所有花盆都一样。',
    },
  },
  '8b-ecosystem': {
    study: [
      {
        stage: 'observe', label: '辨组成', action: '辨认草地组成',
        task: {
          id: 'ecosystem-components',
          storageKey: 'ecosystemComponents',
          prompt: '落叶在草地上渐渐变少。哪一项记录能帮你认出分解者？',
          source: '草地观察 · 模拟记录',
          records: [
            '草利用阳光制造有机物；蝗虫取食草。',
            '落叶上长出真菌，它利用落叶中的有机物。',
            '草生长需要水，光照和土壤条件也会变化。',
          ],
          choices: ['取食活草的蝗虫', '利用落叶的真菌', '草地里的水和阳光'],
          answer: 1,
          evidence: 1,
          hint: '找谁利用的是已经脱落的叶子，谁吃的是活着的生物。',
          wrong: ['蝗虫取食活草，是消费者。再找分解遗体或残落物的生物。', '', '水和阳光是非生物环境的一部分，不能分解落叶。'],
          result: '草是生产者，蝗虫是消费者，分解落叶的真菌是分解者。阳光、水和土壤属于非生物环境。一个生态系统包括区域里的生物和它们的生活环境。',
        },
      },
      {
        stage: 'compare', label: '读食物网', action: '连接两条食物链',
        task: {
          id: 'ecosystem-web',
          storageKey: 'ecosystemWeb',
          prompt: '蝗虫既被青蛙吃，也被鸟吃。要怎样把两条关系连成网？',
          source: '草地取食记录 · 模拟记录',
          records: ['蝗虫啃食草叶。', '青蛙捕食蝗虫。', '一只鸟也捕食蝗虫。', '这只鸟常停在有草的地面。'],
          choices: ['草 → 蝗虫', '青蛙 → 蝗虫', '蝗虫 → 青蛙', '蝗虫 → 鸟'],
          answer: [0, 2, 3],
          instruction: '选出三根有取食记录支持的箭头。',
          evidence: [1, 2],
          why: '哪两条记录说明蝗虫连着两条取食路线？',
          hint: '从被吃的一方指向取食的一方。一个类群可以指向多个取食者。',
          evidenceHint: '找出两条都提到蝗虫，但取食者不同的记录。',
          result: '草 → 蝗虫 → 青蛙，草 → 蝗虫 → 鸟。两条食物链共享草和蝗虫，组成食物网的一部分。箭头表示物质和能量随取食传递的方向。',
        },
      },
      {
        stage: 'reason', label: '分清碳和能量', action: '追踪碳和能量',
        task: {
          id: 'ecosystem-carbon-energy',
          storageKey: 'ecosystemCarbon',
          prompt: '一片落叶消失了。叶中的碳和可利用的能量，去向一样吗？',
          source: '落叶的两条去向 · 模拟记录',
          records: [
            '植物从空气吸收二氧化碳，把碳纳入有机物。',
            '落叶分解时，其中一部分碳以二氧化碳回到空气。',
            '呼吸和分解过程中，有一部分能量以热的形式散到环境。',
          ],
          choices: ['碳和能量都原样回到植物', '碳可再次进入植物，一部分能量散为热', '散失的能量能沿食物链倒流，碳则留在落叶里'],
          answer: 1,
          evidence: [1, 2],
          why: '选出分别说明碳和能量去向的两条证据。',
          hint: '把「以二氧化碳回去」与「以热散出去」分开。',
          wrong: ['碳的确可以循环。材料把能量写成以热散出，它会原样回来吗？', '', '记录里有碳返回空气，热散到环境后也不会倒着变回食物能量。'],
          result: '碳可以随物质在生物和环境之间循环。食物链中的可利用能量单向流动，沿营养级逐步减少，生态系统需要持续获得新的能量。',
        },
      },
      {
        stage: 'regulation', label: '看调节上限', action: '比较两次扰动',
        task: {
          id: 'ecosystem-regulation',
          storageKey: 'ecosystemRegulation',
          prompt: '两次扰动后的草地恢复得一样快吗？结论最多能说到哪一步？',
          source: '同一草地两块观察区 · 模拟记录',
          records: [
            '甲区轻微踩踏。一月后，植被覆盖率从 60% 回到 77%。',
            '乙区在相近时段被持续重踩。覆盖率从 58% 降到 43%。',
            '扰动前，两块区域的植被覆盖率都约为 80%。',
          ],
          choices: ['甲乙都能自己很快恢复', '生态系统没有任何恢复能力', '甲有恢复迹象，乙同一时期未恢复，恢复能力有上限'],
          answer: 2,
          evidence: [0, 1],
          why: '选能比较两处恢复方向的两条记录。',
          hint: '先看覆盖率在扰动后是往回升，还是继续降。',
          wrong: ['甲区回升，乙区降了。再分别看两组方向。', '甲区从 60% 回升到了 77%，与「完全不能恢复」不符。'],
          result: '轻度扰动后可能恢复；扰动变强或持续，恢复不一定跟得上。以上只说明这一段时间的记录，不能断定乙以后永远恢复不了。',
        },
      },
    ],
    review: {
      id: 'ecosystem-pond-transfer',
      prompt: '换到池塘。哪些说法可以写进观察报告？',
      source: '池塘报告 · 新材料',
      records: [
        '池水里藻类制造有机物，水蚤取食藻类，小鱼吞食水蚤。',
        '真菌分解沉底落叶时，一部分碳以二氧化碳释放，也有一部分能量以热散出。',
        '轻度扰动后，溶氧从 5 回到 7；持续扰动时，溶氧降到 4，同样时长后仍是 4。单位均为毫克/升。',
        '记录到小鱼一度游到水面附近，但没有记录到取食。',
      ],
      choices: [
        '池水属于非生物环境，取食箭头可写为藻类 → 水蚤 → 小鱼。',
        '小鱼吃水蚤，所以能量箭头应从小鱼回到水蚤。',
        '真菌是分解者，分解可使碳返回环境，散出的热不能沿食物链原路返回。',
        '轻度扰动后溶氧有回升，持续扰动时同样时长未恢复。',
        '两次读数说明池塘以后一定不能恢复。',
      ],
      answer: [0, 2, 3],
      instruction: '选出三句有记录支持的话。',
      evidence: [0, 1, 2],
      why: '给这三句话分别找一条直接相关的记录。',
      hint: '逐条照着记录核对，别把被吃与吃谁、碳与能量、此次与永远混在一起。',
      evidenceHint: '找写有取食、分解和溶氧读数的三条。鱼游到水面这一条还不能说明这三种关系。',
      result: '新池塘里仍可区分环境和生物、顺取食方向读食物网、用记录看物质循环、热散失和扰动后恢复的范围。',
    },
  },
};

function biologyTransferCase(id) {
  const sample = bioObservationChecks[id]?.review;
  if (sample) return sample;
  const lesson = typeof bioNewEvidenceCases !== 'undefined' && bioNewEvidenceCases[id];
  if (!lesson) return null;
  const [prompt, records, choices, answer, evidence, hint, result, evidenceHint] = lesson;
  const n = [...id].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 253, 0);
  const offset = n % choices.length;
  return {
    id: 'new-material-1',
    prompt, records,
    source: '新情境 · 模拟记录',
    choices: choices.slice(offset).concat(choices.slice(0, offset)),
    answer: (answer - offset + choices.length) % choices.length,
    evidence, hint, result, evidenceHint,
  };
}

function biologyClassroomCase(entry) {
  if (typeof bioModelEvidenceCases === 'undefined') return null;
  const model = bioModelEvidenceCases[entry.id];
  if (model) {
    const [prompt, evidence, answer, hint] = model;
    return {
      id: 'model-evidence-1',
      prompt,
      source: '核对本课材料',
      records: evidence.map((text, index) => `记录 ${index + 1}　${text}`),
      choices: evidence.map((_, index) => '记录 ' + (index + 1)),
      answer, hint,
      result: '对照正确。' + evidence[answer],
    };
  }
  const activity = entry.activity;
  if (activity?.kind !== 'evidence') return null;
  const rows = activity.rows;
  return {
    id: 'classroom-evidence-1',
    prompt: activity.prompt,
    source: '本课的观察记录',
    instruction: `选出 ${activity.answer.length} 条支持结论的记录`,
    records: rows.map(row => row.label + '　' + row.text),
    choices: rows.map(row => row.label),
    answer: activity.answer,
    hint: activity.hint,
    result: activity.result,
  };
}

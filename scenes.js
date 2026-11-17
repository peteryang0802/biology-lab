'use strict';

(() => {
  const ink = '#2d5848', blue = '#266783', red = '#a04444', green = '#aed481', pale = '#eef4df';
  const stain = '#95304c', starch = '#364375', amber = '#bb8142';
  const withShape = (ctx, draw, fill, stroke, width = 4) => {
    ctx.beginPath(); draw(ctx);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  };
  const ellipse = (ctx, x,y,w,h,fill,stroke) => withShape(ctx, c => c.ellipse(x,y,w,h,0,0,Math.PI*2),fill,stroke);
  function line(ctx, x,y,x2,y2,color = ink,width = 4) {
    withShape(ctx, c=>{c.moveTo(x,y);c.lineTo(x2,y2);}, null, color, width);
  }
  function arrow(ctx, x,y,x2,y2,color = ink) {
    const angle = Math.atan2(y2-y,x2-x);
    line(ctx,x,y,x2,y2,color,6);
    withShape(ctx,c=>{
      c.moveTo(x2-15*Math.cos(angle-.46),y2-15*Math.sin(angle-.46));
      c.lineTo(x2,y2);
      c.lineTo(x2-15*Math.cos(angle+.46),y2-15*Math.sin(angle+.46));
    },null,color,6);
  }
  function text(ctx, value, x, y, size = 23) {
    ctx.font = `700 ${size}px system-ui, sans-serif`;
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(value,x,y);
  }
  function box(ctx, x, y, width, height, fill, border = ink) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
    }
  }
  function flow(ctx, points, color, head = 10) {
    const [x, y] = points.at(-1);
    const [prevX, prevY] = points.at(-2);
    const angle = Math.atan2(y - prevY, x - prevX);
    withShape(ctx, c => {
      c.moveTo(...points[0]);
      points.slice(1).forEach(point => c.lineTo(...point));
    }, null, color, 4);
    withShape(ctx, c => {
      c.moveTo(x - head * Math.cos(angle - .55), y - head * Math.sin(angle - .55));
      c.lineTo(x, y);
      c.lineTo(x - head * Math.cos(angle + .55), y - head * Math.sin(angle + .55));
    }, null, color, 4);
  }
  function leaf(ctx, x, y, size, { coverRight = false, changedVeins = false } = {}) {
    ctx.save();
    ctx.translate(x,y);
    ctx.scale(size,size);
    ellipse(ctx,0,0,106,49,green,ink);
    if (coverRight) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0,-51,110,102); ctx.clip();
      ellipse(ctx,0,0,106,49,'#566e56',ink);
      ctx.restore();
    }
    line(ctx,-104,0,95,0,changedVeins ? stain : ink,changedVeins ? 7 : 3);
    for(const offset of [-53,-15,21,57]) {
      const trace = changedVeins && offset <= 21;
      line(ctx,offset,0,offset+29,-32,trace ? stain : ink,trace ? 4 : 2);
      line(ctx,offset,0,offset+29,32,trace ? stain : ink,trace ? 4 : 2);
    }
    ctx.restore();
  }
  function photoExperiment(ctx, selected) {
    const revealed = selected !== null;
    leaf(ctx,280,55,.59,{ coverRight: true });
    text(ctx,'A',169,55,27);
    text(ctx,'B',395,55,27);
    line(ctx,248,77,154,101,ink,2);
    line(ctx,312,77,406,101,ink,2);
    const labels = revealed ? ['蓝黑', '未变蓝黑'] : ['记录待看', '记录待看'];
    const swatches = revealed ? [starch, amber] : [pale, pale];
    [31, 288].forEach((x, i) => {
      box(ctx, x, 102, 240, 52, '#f9faf1', '#94a18d');
      ellipse(ctx, x + 23, 128, 11, 11, swatches[i], ink);
      text(ctx, labels[i], x + 138, 128, 25);
    });
    if (revealed) text(ctx,'蓝黑表示检出淀粉',280,181,23);
  }
  function photoExchange(ctx, selected) {
    leaf(ctx,280,106,.65);
    if (selected === 0 || selected === 2) {
      text(ctx,'二氧化碳',88,57); text(ctx,'水',88,156); text(ctx,'光能',280,17);
      arrow(ctx,108,82,205,106,blue); arrow(ctx,108,137,205,113,blue);
      arrow(ctx,280,33,280,66,'#976a27');
    }
    if (selected === 1 || selected === 2) {
      text(ctx,'制造有机物',280,164,22);
      line(ctx,280,153,280,137,ink,3);
      text(ctx,'氧气',470,103);
      arrow(ctx,354,106,430,106,blue);
    }
    if (selected === null) {
      text(ctx,'进入叶片的物质',94,109,20);
      text(ctx,'产物',465,109,20);
    }
  }
  function dyedTransport(ctx, selected) {
    ellipse(ctx,136,89,67,62,'#e2ebbb',ink);
    ellipse(ctx,136,89,40,36,'#eef1d5','#9da885');
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * 2 * Math.PI;
      const x = 136 + 52 * Math.cos(angle);
      const y = 89 + 48 * Math.sin(angle);
      ellipse(ctx,x,y,6,5,selected === null ? '#b5c099' : stain,null);
    }
    leaf(ctx,427,91,.7,{changedVeins: selected === 1});
    text(ctx, selected === null ? '切面记录待看' : '茎横切面',136,176,24);
    text(ctx, selected === 1 ? '部分叶脉着色' : '叶片记录待看',427,176,24);
    if (selected === 1) arrow(ctx,225,91,341,91,stain);
  }
  function transpiration(ctx, selected) {
    if (selected === 1) {
      leaf(ctx,280,70,.45);
      text(ctx,'叶制造的有机物',280,25,23);
      box(ctx,58,129,94,46,'#f4ecce');
      box(ctx,409,129,94,46,'#f4ecce');
      text(ctx,'根',105,153);
      text(ctx,'果实',456,153);
      arrow(ctx,232,97,154,142,ink);
      arrow(ctx,327,97,406,142,ink);
      text(ctx,'筛管',193,102,23);
      text(ctx,'筛管',366,102,23);
      return;
    }
    [47, 317].forEach((x, i) => {
      box(ctx,x,25,196,128,'#f1f7eb','#7c968b');
      box(ctx,x+67,111,62,40,'#b4d7dd',blue);
      line(ctx,x+98,121,x+98,55,ink,5);
      if (i === 0) leaf(ctx,x+99,62,.32);
      if (i === 0 && selected === 0) {
        for (const [dx, dy] of [[19,17],[32,33],[173,16],[162,40],[174,63],[17,72]]) {
          ellipse(ctx,x+dx,25+dy,5,8,'#a6d5e3',blue);
        }
      }
      text(ctx, i ? '无叶组' : '有叶组',x+98,180,25);
    });
  }
  function intestinalAbsorption(ctx, selected) {
    const wall = '#edb98e';
    const outline = '#8d533c';
    function foldedSurface(c) {
      c.moveTo(25, 110);
      c.quadraticCurveTo(43, 112, 53, 86);
      c.quadraticCurveTo(64, 58, 78, 85);
      c.quadraticCurveTo(90, 112, 103, 109);
      c.quadraticCurveTo(116, 109, 128, 77);
      c.quadraticCurveTo(139, 43, 155, 76);
      c.quadraticCurveTo(167, 109, 181, 106);
      c.quadraticCurveTo(195, 109, 207, 83);
      c.quadraticCurveTo(218, 60, 232, 84);
      c.quadraticCurveTo(245, 109, 261, 109);
      c.lineTo(261, 139);
      c.lineTo(25, 139);
      c.closePath();
    }
    withShape(ctx, foldedSurface, wall, outline, 3);
    [
      [51,92,-5,9],[56,81,-4,9],[64,74,0,10],[74,75,4,9],[83,93,5,9],
      [122,91,-5,9],[127,79,-4,9],[133,67,-3,9],[143,64,0,10],
      [150,67,4,9],[156,80,5,9],[161,94,5,9],
      [204,93,-5,9],[210,80,-4,9],[218,74,0,9],[228,77,4,9],[235,89,5,9],
    ].forEach(([x,y,dx,dy]) => line(ctx,x,y,x+dx,y-dy,outline,4));
    box(ctx,127,52,29,24,'#efb88b22',outline);
    line(ctx,157,53,328,40,'#987b67',2);
    text(ctx,'小肠内壁的皱襞',140,174,24);

    withShape(ctx, c => {
      c.moveTo(357,142);
      c.bezierCurveTo(378,130,377,120,377,95);
      c.bezierCurveTo(377,59,392,30,411,30);
      c.bezierCurveTo(432,30,445,59,445,95);
      c.bezierCurveTo(445,120,445,130,467,142);
      c.closePath();
    }, wall, outline, 4);
    withShape(ctx, c => {
      c.moveTo(393,141);
      c.lineTo(393,100);
      c.bezierCurveTo(393,78,398,62,410,62);
      c.bezierCurveTo(423,62,429,76,429,100);
      c.lineTo(429,141);
      c.moveTo(393,104);
      c.quadraticCurveTo(412,94,429,106);
    }, null, red, 6);
    text(ctx,'放大的绒毛',411,172,24);
    if (selected !== null) {
      text(ctx,'葡萄糖',506,66,24);
      flow(ctx,[[505,82],[472,82],[429,98]],blue);
      text(ctx,'毛细血管',502,125,21);
    }
  }
  function circulation(ctx, selected) {
    ellipse(ctx,58,91,38,24,'#dfe9d7',ink);
    ellipse(ctx,502,91,38,24,'#dfe9d7',ink);
    text(ctx,'肺',58,91,25);
    text(ctx,'全身',502,91,25);
    box(ctx,158,45,244,117,'#f9fbf2');
    const chambers = [
      [168, 54, '右心房', '#d7e8ed'], [288, 54, '左心房', '#f6d9d1'],
      [168, 110, '右心室', '#d7e8ed'], [288, 110, '左心室', '#f6d9d1'],
    ];
    chambers.forEach(([x, y, label, fill]) => {
      box(ctx,x,y,104,40,fill,null);
      text(ctx,label,x+52,y+20,24);
    });
    text(ctx,'同一颗心脏',280,185,24);
    if (selected === 0 || selected === 2) {
      flow(ctx, [[168,130],[58,130],[58,117]], blue);
      flow(ctx, [[58,66],[58,16],[340,16],[340,53]], red);
    }
    if (selected === 1 || selected === 2) {
      flow(ctx, [[392,130],[502,130],[502,117]], red);
      flow(ctx, [[502,66],[502,31],[220,31],[220,53]], blue);
    }
    if (selected === 2) {
      // A gap around the red return path keeps crossed lines from looking connected.
      line(ctx,340,24,340,39,'#e7ede0',9);
      line(ctx,340,24,340,39,red,4);
    }
    flow(ctx, [[221,96],[221,108]], selected === 0 ? '#78958f' : blue, 6);
    flow(ctx, [[340,96],[340,108]], selected === 1 ? '#a58b82' : red, 6);
  }
  function tissues(ctx, selected) {
    ctx.fillStyle = '#f2c6b8'; ctx.fillRect(25,49,157,106);
    ctx.strokeStyle = red; ctx.lineWidth = 4; ctx.strokeRect(25,49,157,106);
    for(const [x,y] of [[63,81],[99,120],[139,89]]) ellipse(ctx,x,y,13,7,red,null);
    for(const [x,y] of [[426,76],[475,118],[423,150]]) ellipse(ctx,x,y,25,20,green,ink);
    text(ctx,'毛细血管内',102,181,21); text(ctx,'组织细胞',459,181,21);
    if (selected === 0 || selected === 2) { text(ctx,'氧',273,67); arrow(ctx,192,87,389,87,blue); }
    if (selected === 1 || selected === 2) { text(ctx,'二氧化碳',281,150); arrow(ctx,388,128,193,128,ink); }
  }
  function campusAED(ctx, index, selected) {
    const west = [131,112], east = [438,112], desk = [277,62], plaza = [447,168];
    ctx.fillStyle = '#f9f8ec'; ctx.fillRect(79,20,408,92);
    ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.strokeRect(79,20,408,92);
    line(ctx,107,112,156,112,'#f9f8ec',8); line(ctx,415,112,461,112,'#f9f8ec',8);
    ellipse(ctx,...desk,11,11,'#568f5c',ink);
    text(ctx,'一层服务台',277,43,20);
    text(ctx,'西入口',131,135,21); text(ctx,'东入口',437,135,21);
    ellipse(ctx,...plaza,7,7,ink,null);
    text(ctx,'广场',489,168,22);
    if (!index && selected === 0) {
      line(ctx,...plaza,438,144,blue,6);
      line(ctx,...east,438,62,blue,6);
      arrow(ctx,438,62,298,62,blue);
    }
    if (index && selected !== null) {
      line(ctx,428,103,448,121,red,5); line(ctx,448,103,428,121,red,5);
      if (selected === 1) {
        line(ctx,434,173,132,173,blue,6);
        arrow(ctx,132,173,131,145,blue);
        line(ctx,...west,131,62,blue,6);
        arrow(ctx,131,62,254,62,blue);
      }
    }
  }
  globalThis.paintBioScene = (ctx, id, index, selected) => {
    if (!ctx) return;
    ctx.clearRect(0,0,560,204);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (id === 'photosynthesis') (index ? photoExchange : photoExperiment)(ctx,selected);
    if (id === 'human-nutrients' && index === 1) intestinalAbsorption(ctx,selected);
    if (id === 'plant-transport') (index ? transpiration : dyedTransport)(ctx,selected);
    if (id === 'human-transport') (index ? tissues : circulation)(ctx,selected);
    if (id === 'aed-map') campusAED(ctx,index,selected);
  };
})();

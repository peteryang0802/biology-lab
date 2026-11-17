'use strict';

(() => {
  const ink = '#2d5848', blue = '#266783', red = '#a04444', green = '#aed481', pale = '#eef4df';
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
  function leaf(ctx, x, y, size, coverRight = false) {
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
    line(ctx,-104,0,95,0,ink,3);
    for(const offset of [-53,-15,21,57]) {
      line(ctx,offset,0,offset+29,-32,ink,2);
      line(ctx,offset,0,offset+29,32,ink,2);
    }
    ctx.restore();
  }
  function photoExperiment(ctx, selected) {
    leaf(ctx,280,73,.92,true);
    text(ctx,'同一片叶',280,13,20);
    line(ctx,215,111,165,147,ink,3);
    line(ctx,344,111,394,147,ink,3);
    ellipse(ctx,165,161,24,24,selected === null ? pale : '#4c547d',ink);
    ellipse(ctx,394,161,24,24,selected === 1 ? '#c89955' : pale,ink);
    text(ctx,'受光处',103,164,22);
    text(ctx,'遮光处',463,164,22);
  }
  function photoExchange(ctx, selected) {
    leaf(ctx,280,106,.65);
    if (selected === 0) {
      text(ctx,'二氧化碳',88,57); text(ctx,'水',88,156); text(ctx,'光能',280,17);
      arrow(ctx,108,82,205,106,blue); arrow(ctx,108,137,205,113,blue);
      arrow(ctx,280,33,280,66,'#976a27');
    } else if (selected === 1) {
      text(ctx,'叶片制造有机物',280,34,21);
      line(ctx,280,48,280,77,ink,3);
      text(ctx,'氧气',470,103);
      arrow(ctx,354,106,430,106,blue);
    } else {
      text(ctx,'进入叶片的物质',94,109,20);
      text(ctx,'产物',465,109,20);
    }
  }
  function circulation(ctx, selected) {
    ellipse(ctx,91,110,47,48,'#f2c6b8',red);
    ellipse(ctx,465,110,47,48,'#f2c6b8',red);
    if (selected === null) {
      text(ctx,'心脏',91,110);
      text(ctx,'心脏',465,110);
      text(ctx,'肺／全身',278,110);
    } else {
      ellipse(ctx,278,110,56,44,'#f3ddcf',ink);
      text(ctx,selected ? '左心室' : '右心室',91,110);
      text(ctx,selected ? '全身' : '肺',278,110);
      text(ctx,selected ? '右心房' : '左心房',465,110);
      arrow(ctx,147,110,205,110,selected ? red : blue);
      arrow(ctx,350,110,411,110,selected ? blue : red);
      text(ctx,selected ? '回到心脏，再接肺循环' : '回到心脏，再接体循环',278,185,21);
    }
  }
  function tissues(ctx, selected) {
    ctx.fillStyle = '#f2c6b8'; ctx.fillRect(25,49,157,106);
    ctx.strokeStyle = red; ctx.lineWidth = 4; ctx.strokeRect(25,49,157,106);
    for(const [x,y] of [[63,81],[99,120],[139,89]]) ellipse(ctx,x,y,13,7,red,null);
    for(const [x,y] of [[426,76],[475,118],[423,150]]) ellipse(ctx,x,y,25,20,green,ink);
    text(ctx,'毛细血管内',102,181,21); text(ctx,'组织细胞',459,181,21);
    if (selected === 0) { text(ctx,'氧',273,64); arrow(ctx,192,109,389,109,blue); }
    if (selected === 1) { text(ctx,'二氧化碳',281,64); arrow(ctx,388,109,193,109,ink); }
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
    if (id === 'human-transport') (index ? tissues : circulation)(ctx,selected);
    if (id === 'aed-map') campusAED(ctx,index,selected);
  };
})();

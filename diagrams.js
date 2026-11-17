'use strict';

(() => {
  const ink = '#2d5848', green = '#569463', leaf = '#9bc57e', paper = '#fcf8e6';
  const brown = '#93694b', sand = '#dcb183', orange = '#a95332';
  const blue = '#2c7390', sky = '#a9d4df', red = '#a8514f', pink = '#eab7a5';

  function paintBioDiagram(ctx, kind) {
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const path = (points, stroke = ink, fill = null, width = 4) => {
      ctx.beginPath();
      for (const [i, [x, y]] of points.entries()) i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      if (fill) { ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
    };
    const oval = (x, y, rx, ry, fill, stroke = ink, angle = 0) => {
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, angle, 0, 2 * Math.PI);
      ctx.fillStyle = fill; ctx.fill();
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
    };
    const rect = (x,y,w,h,fill,stroke=ink) => path([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],stroke,fill,3);
    const arrow = (x, y, x2, y2, color = blue) => {
      const angle = Math.atan2(y2-y, x2-x);
      path([[x,y],[x2,y2]], color);
      path([[x2-11*Math.cos(angle-.5), y2-11*Math.sin(angle-.5)],[x2,y2],[x2-11*Math.cos(angle+.5), y2-11*Math.sin(angle+.5)]], color);
    };
    function drawLeaf(x, y, scale = 1) {
      oval(x,y,42*scale,20*scale,leaf,ink,-.42);
      path([[x-38*scale,y+14*scale],[x+36*scale,y-10*scale]],ink,null,2);
      path([[x-3*scale,y+2*scale],[x+8*scale,y+12*scale]],ink,null,2);
      path([[x-13*scale,y+5*scale],[x-12*scale,y-9*scale]],ink,null,2);
    }
    function plant(height) {
      rect(36,99,120,20,sand,brown);
      for (const [x,y] of [[66,110],[89,106],[135,114]]) oval(x,y,3,2,brown,null);
      path([[95,107],[95,99-height]],ink,null,5);
      drawLeaf(109,105-height,.48);
      if (height > 40) {
        drawLeaf(77,83,.53);
        drawLeaf(120,68,.67);
      }
    }
    function drawCells(single = false) {
      const widths = single ? [51] : [37,83,129];
      const rows = single ? [45] : [44,79];
      for (const y of rows) for (const x of widths) {
        const size = single ? [90,53] : [46,35];
        rect(x,y,...size,'#d9e7b2',ink);
        oval(x+size[0]/2, y+size[1]/2, single ? 10 : 5, single ? 8 : 4, green,ink);
      }
    }
    function drawCard() {
      rect(51,26,91,87,paper);
      for (const y of [49,65,81,96]) path([[64,y],[127,y]],ink,null,2);
      rect(74,19,42,11,sand);
    }
    function drawWater(x=93,y=73) {
      path([[x,y-43],[x-26,y-6],[x-27,y+12],[x-20,y+24],[x,y+32],[x+19,y+24],[x+27,y+11],[x+23,y-8]],blue,sky);
      path([[x-15,y+10],[x-8,y+17]],'#f7fcfd',null,4);
    }
    function drawBlood() {
      rect(28,34,136,70,pink,red);
      for(const [x,y] of [[54,52],[90,79],[131,58],[55,87],[142,84]]) oval(x,y,12,6,red,null,-.3);
      arrow(42,116,150,116,red);
    }

    switch (kind) {
      case 'seed': oval(95,88,31,18,sand,brown,-.4); path([[75,95],[96,89],[114,76]],brown); break;
      case 'sprout': plant(30); break;
      case 'plant': plant(68); break;
      case 'leaf': drawLeaf(96,71); break;
      case 'cell': drawCells(true); break;
      case 'cells': case 'wall': drawCells(); break;
      case 'sun': oval(96,68,25,25,'#f3cf6d',orange); for(let i=0;i<8;i++) { const t=i*Math.PI/4; path([[96+36*Math.cos(t),68+36*Math.sin(t)],[96+48*Math.cos(t),68+48*Math.sin(t)]],orange); } break;
      case 'water': drawWater(); break;
      case 'soil': rect(37,44,118,69,sand,brown); for(const [x,y] of [[51,58],[102,57],[130,66],[82,85],[126,96],[59,100]]) oval(x,y,4,3,brown,null); break;
      case 'tree': rect(88,70,16,44,sand,brown); oval(94,53,39,35,leaf); oval(117,47,23,23,leaf); path([[45,115],[150,115]],ink); break;
      case 'building': rect(38,55,117,59,paper); path([[32,55],[97,24],[161,55]],brown,sand); rect(81,78,30,36,sky); for(const x of [53,122]) rect(x,66,17,19,sky); break;
      case 'door': rect(55,25,82,92,sand,brown); rect(71,34,50,83,paper); oval(110,79,3,3,brown); break;
      case 'path': path([[30,95],[61,49],[120,73],[157,31]],'#b08b61',null,15); oval(30,95,7,7,ink); arrow(115,73,155,32,ink); break;
      case 'ball': oval(95,75,32,32,sky,blue); path([[71,56],[105,67],[111,101]],blue); arrow(22,115,68,115,brown); break;
      case 'person': oval(94,33,15,15,sand,brown); path([[94,51],[94,92],[75,117]],ink); path([[94,92],[115,117]],ink); path([[64,73],[94,56],[125,71]],ink); break;
      case 'heart': path([[96,105],[59,69],[53,47],[65,34],[83,35],[96,49],[112,34],[131,36],[141,50],[137,70]],red,pink); path([[62,70],[79,70],[91,53],[103,84],[116,70],[133,70]],red); break;
      case 'lungs': path([[96,22],[96,66],[70,79]],blue); path([[96,66],[123,80]],blue); oval(70,77,21,33,pink,red,.18); oval(122,77,21,33,pink,red,-.18); break;
      case 'blood': drawBlood(); break;
      case 'blood-drop': path([[96,26],[69,65],[69,87],[79,104],[96,110],[114,103],[123,84],[121,67]],red,pink); break;
      case 'vial': rect(67,37,56,77,paper); rect(67,71,56,43,sky,blue); rect(61,25,68,14,leaf); break;
      case 'sugar': rect(51,59,39,40,paper,brown); rect(91,45,45,54,paper,brown); path([[51,59],[63,47],[95,48]],brown); break;
      case 'snack': path([[64,29],[128,29],[139,114],[53,114]],orange,sand); rect(69,50,53,44,paper,brown); path([[79,64],[112,64]],brown); path([[79,77],[100,77]],brown); break;
      case 'sign': rect(52,30,89,49,'#e0eedc',ink); path([[96,79],[96,115]],ink,null,6); rect(89,40,15,29,green); rect(81,48,31,13,green); break;
      case 'map': rect(30,26,132,87,paper); path([[36,99],[69,72],[109,73],[151,35]],brown,null,7); oval(68,72,7,7,green); oval(145,43,7,7,orange); break;
      default: drawCard();
    }
  }

  globalThis.paintBioDiagram = paintBioDiagram;
})();

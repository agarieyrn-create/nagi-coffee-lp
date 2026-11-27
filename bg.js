/* 背景の動き「一杯の物語」：豆が舞う → 挽く → 滴る → カップに満ちて湯気（外部ライブラリなし）
   元に戻すときは、index.html の <script src="bg.js"> の1行を削除するだけです。 */
(function () {
  'use strict';
  var w = window, d = document;
  if (w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!d.createElement('canvas').getContext) return;

  var css = d.createElement('style');
  css.textContent =
    '.bg-page{position:fixed;left:0;top:0;width:100%;height:100vh;height:100lvh;z-index:-1;pointer-events:none}' +
    '.bg-hero{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none}' +
    '.mo .x-nagi{background-color:transparent!important}' +
    'main section:not(.info) :is(h2,h3,p,.row){text-shadow:0 0 6px rgba(248,242,232,.95),0 0 16px rgba(248,242,232,.9)}';
  d.head.appendChild(css);

  var TAU = Math.PI * 2;
  var seed = 11;
  function rnd() { return (seed = (seed * 16807) % 2147483647) / 2147483647; }
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ramp(a, b, v) { var t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function canv(wd, ht) { var c = d.createElement('canvas'); c.width = wd; c.height = ht; return c; }

  /* 焙煎豆（立体感つき）と、手前・奥に使うぼかし版 */
  function beanImg() {
    var c = canv(160, 200), g = c.getContext('2d');
    var r = g.createRadialGradient(55, 62, 6, 80, 100, 96);
    r.addColorStop(0, '#b27a4c'); r.addColorStop(.45, '#704022'); r.addColorStop(1, '#2c170b');
    g.fillStyle = r; g.beginPath(); g.ellipse(80, 100, 64, 90, 0, 0, TAU); g.fill();
    g.lineCap = 'round';
    function seam(dx, color, width) {
      g.strokeStyle = color; g.lineWidth = width; g.beginPath();
      g.moveTo(84 + dx, 20); g.bezierCurveTo(40 + dx, 70, 126 + dx, 130, 74 + dx, 180); g.stroke();
    }
    seam(0, '#1d0e06', 13); seam(5, 'rgba(224,170,120,.6)', 3);
    return c;
  }
  function soften(src) {
    var s = canv(14, 18); s.getContext('2d').drawImage(src, 0, 0, 14, 18);
    var m = canv(40, 50); m.getContext('2d').drawImage(s, 0, 0, 40, 50);
    var b = canv(100, 125); b.getContext('2d').drawImage(m, 0, 0, 100, 125);
    return b;
  }
  function puffImg() {
    var c = canv(128, 128), g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,.95)'); r.addColorStop(.5, 'rgba(214,196,172,.45)'); r.addColorStop(1, 'rgba(214,196,172,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    return c;
  }
  var bean = beanImg(), beanSoft = soften(bean), puff = puffImg();

  function setup(canvas) {
    var g = canvas.getContext('2d'), o = { g: g, W: 0, H: 0 };
    o.size = function () {
      var dpr = Math.min(w.devicePixelRatio || 1, 1.5), nw = canvas.clientWidth, nh = canvas.clientHeight;
      if (nw === o.W && nh === o.H) return false;
      var big = Math.abs(nw - o.W) > 40;
      o.W = nw; o.H = nh; canvas.width = nw * dpr; canvas.height = nh * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
      return big;
    };
    return o;
  }
  function makeBeans(n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push({ x: rnd(), y: rnd(), z: i / n, r: rnd() * TAU, v: (rnd() - .5) * 1.1, k: rnd() * TAU });
    return a;
  }
  function drawBean(g, x, y, s, rot, flip, alpha, soft) {
    if (alpha < .02 || s < 1) return;
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(flip, 1); g.globalAlpha = alpha;
    g.drawImage(soft ? beanSoft : bean, -s * .4, -s * .5, s * .8, s);
    g.restore();
  }
  function steam(g, t, x, base, height, spread, alpha) {
    if (alpha < .02) return;
    for (var i = 0; i < 22; i++) {
      var p = (i / 22 + t * .09) % 1, r = spread * (.35 + p * 1.2);
      var px = x + Math.sin(p * 8 - t * 1.1) * spread * (.1 + p * .7);
      g.globalAlpha = Math.sin(p * Math.PI) * alpha;
      g.drawImage(puff, px - r / 2, base - p * height - r * .7, r, r * 1.4);
    }
    g.globalAlpha = 1;
  }

  /* ---- 本文の背景 ---- */
  var page = canv(1, 1); page.className = 'bg-page'; page.setAttribute('aria-hidden', 'true'); d.body.appendChild(page);
  var P = setup(page), beans = [], grains = [];

  function build() {
    var m = P.W <= 820;
    beans = makeBeans(m ? 26 : 44);
    grains = [];
    for (var i = 0; i < (m ? 220 : 460); i++) grains.push({ a: rnd() * TAU, q: Math.sqrt(rnd()), f: rnd(), s: 1.5 + rnd() * 4, c: i % 3 });
  }

  /* 章の位置から、物語の進み具合 0〜4 を決める */
  var anchors = [];
  function measure() {
    var sy = w.scrollY || 0, vh = w.innerHeight;
    anchors = [0];
    ['.x-nagi', '.menu .price', '.take', '.owner'].forEach(function (s) {
      var el = d.querySelector(s); if (!el) return;
      var r = el.getBoundingClientRect();
      anchors.push(Math.max(anchors[anchors.length - 1] + 1, r.top + sy + r.height / 2 - vh / 2));
    });
  }
  function story(y) {
    for (var i = 1; i < anchors.length; i++) if (y < anchors[i]) return i - 1 + (y - anchors[i - 1]) / (anchors[i] - anchors[i - 1]);
    return anchors.length - 1;
  }

  function cupPath(g, cx, top, cw, ch) {
    g.beginPath(); g.moveTo(cx - cw / 2, top); g.lineTo(cx + cw / 2, top);
    g.bezierCurveTo(cx + cw * .49, top + ch * .75, cx + cw * .32, top + ch, cx, top + ch);
    g.bezierCurveTo(cx - cw * .32, top + ch, cx - cw * .49, top + ch * .75, cx - cw / 2, top);
    g.closePath();
  }

  function drawPage(t, S, y) {
    if (P.size()) build();
    var g = P.g, W = P.W, H = P.H, m = W <= 820;
    g.clearRect(0, 0, W, H);
    var cx = W * (m ? .5 : .52), unit = Math.min(W * (m ? 1 : .62), H);
    var strength = m ? .62 : .72;
    var quiet = m ? .38 : .46;   /* ドリッパーとカップの濃さ（文字を読みやすくするため控えめ） */

    /* 1. 豆が舞い、中央の渦に吸い込まれて挽かれる */
    var gather = ramp(.35, 1.1, S), beanA = 1 - ramp(.95, 1.35, S);
    var millY = H * .48;
    if (beanA > 0) beans.forEach(function (b, i) {
      var span = H + 240;
      var fx = b.x * W + Math.sin(t * .5 + b.k) * 34;
      var fy = ((b.y * span - t * (14 + b.z * 30) - y * (.15 + b.z * .6)) % span + span) % span - 120;
      var s = unit * (.04 + b.z * b.z * .17);
      var q = ramp(i / beans.length * .5, i / beans.length * .5 + .5, gather);
      var ang = b.k + t * 1.8 + q * 6, rad = (1 - q) * unit * .4 + unit * .03;
      var x = mix(fx, cx + Math.cos(ang) * rad, q), by = mix(fy, millY + Math.sin(ang) * rad * .45, q);
      drawBean(g, x, by, s * (1 - q * .65), b.r + t * b.v + q * 5, .4 + .6 * Math.abs(Math.cos(t * .7 + b.k)),
        beanA * (b.z > .82 ? .42 : strength), b.z > .82 || b.z < .2);
    });

    /* 2. 粉：渦から生まれ、ドリッパーに積もる */
    var born = ramp(.55, 1.15, S), pile = ramp(1.1, 1.75, S), dripA = 1 - ramp(3.35, 3.8, S);
    var dripTop = H * .2, dripW = unit * .62, dripH = unit * .3;
    if (born > 0 && pile < 1 || born > 0 && dripA > 0) {
      var colors = ['#5a321a', '#82502d', '#3a1f10'];
      grains.forEach(function (p) {
        var ang = p.a + t * (1.2 + p.f * 1.6), rad = p.q * unit * .42 * (.35 + born * .65);
        var sx = cx + Math.cos(ang) * rad, sy = millY + Math.sin(ang) * rad * .4 + (p.f - .5) * unit * .12;
        var hy = p.f * .55, tx = cx + Math.cos(p.a) * p.q * dripW * .5 * (1 - hy);
        var ty = dripTop + hy * dripH + Math.sin(p.a) * p.q * 10;
        var q = ramp(p.f * .45, p.f * .45 + .55, pile);
        g.globalAlpha = born * strength * mix(1, dripA * .55, q);
        g.fillStyle = colors[p.c];
        g.beginPath(); g.arc(mix(sx, tx, q), mix(sy, ty, q), p.s * (m ? .8 : 1), 0, TAU); g.fill();
      });
    }

    /* ドリッパー */
    var dripper = ramp(1.0, 1.6, S) * dripA;
    if (dripper > .01) {
      g.globalAlpha = dripper * quiet; g.strokeStyle = '#2c6e6f'; g.lineWidth = m ? 5 : 7; g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx - dripW * .56, dripTop - 8); g.lineTo(cx - dripW * .13, dripTop + dripH); g.lineTo(cx + dripW * .13, dripTop + dripH); g.lineTo(cx + dripW * .56, dripTop - 8); g.stroke();
      g.beginPath(); g.moveTo(cx - dripW * .34, dripTop + dripH + 14); g.lineTo(cx + dripW * .34, dripTop + dripH + 14); g.stroke();
      /* 上から細く注ぐお湯 */
      g.strokeStyle = 'rgba(126,178,184,.9)'; g.lineWidth = m ? 4 : 6; g.beginPath();
      for (var py = -10; py <= dripTop + dripH * .2; py += 12) {
        var px = cx + Math.sin(py * .03 - t * 7) * 4 + Math.sin(t * 1.4) * dripW * .12 * (py / dripTop);
        py < 0 ? g.moveTo(px, py) : g.lineTo(px, py);
      }
      g.stroke();
    }

    /* 3. カップ：滴が落ち、スクロールに合わせて満ちる */
    var cup = ramp(1.35, 1.95, S);
    var cw = unit * .66, ch = unit * .42, top = H * (m ? .55 : .57);
    var level = ramp(1.8, 3.65, S);
    if (cup > .01) {
      var rise = (1 - cup) * H * .25, ct = top + rise, surf = ct + ch * (.96 - level * .82);
      /* 滴 */
      var flow = ramp(1.65, 2.05, S) * dripA, from = dripTop + dripH + 16;
      for (var k = 0; k < 6; k++) {
        var p = (t * 1.1 + k / 6) % 1, dy = from + p * p * Math.max(0, surf - from);
        g.globalAlpha = flow * .55; g.fillStyle = '#5a2f14';
        g.beginPath(); g.ellipse(cx, dy, m ? 4 : 6, (m ? 6 : 9) + p * 8, 0, 0, TAU); g.fill();
      }
      /* 受け皿と取っ手 */
      g.globalAlpha = cup * quiet; g.fillStyle = 'rgba(255,255,255,.75)'; g.strokeStyle = '#8c7a64'; g.lineWidth = 2;
      g.beginPath(); g.ellipse(cx, ct + ch + 8, cw * .72, ch * .11, 0, 0, TAU); g.fill(); g.stroke();
      g.lineWidth = m ? 9 : 14; g.strokeStyle = '#c9bba6';
      g.beginPath(); g.ellipse(cx + cw * .5, ct + ch * .38, cw * .16, ch * .24, 0, -1.7, 1.9); g.stroke();
      /* 中身（ガラスのカップで水位が見える） */
      g.save(); cupPath(g, cx, ct, cw, ch); g.fillStyle = 'rgba(255,255,255,.45)'; g.fill(); g.clip();
      if (level > 0) {
        var lg = g.createLinearGradient(0, surf, 0, ct + ch);
        lg.addColorStop(0, '#8a4f26'); lg.addColorStop(.25, '#5a2f14'); lg.addColorStop(1, '#26120a');
        g.globalAlpha = cup * quiet; g.fillStyle = lg; g.beginPath(); g.moveTo(cx - cw, ct + ch + 20);
        for (var x = -cw / 2 - 10; x <= cw / 2 + 10; x += 10) g.lineTo(cx + x, surf + Math.sin(x * .045 + t * 4) * 4 * flow + Math.sin(x * .02 - t * 2) * 3);
        g.lineTo(cx + cw, ct + ch + 20); g.closePath(); g.fill();
        g.strokeStyle = '#d9a66f'; g.lineWidth = 5; g.beginPath();
        for (x = -cw / 2 - 10; x <= cw / 2 + 10; x += 10) { var ly = surf + Math.sin(x * .045 + t * 4) * 4 * flow + Math.sin(x * .02 - t * 2) * 3; x === -cw / 2 - 10 ? g.moveTo(cx + x, ly) : g.lineTo(cx + x, ly); }
        g.stroke();
      }
      g.restore();
      g.globalAlpha = cup * .55; cupPath(g, cx, ct, cw, ch); g.strokeStyle = '#8c7a64'; g.lineWidth = 3; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = m ? 6 : 10; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx - cw * .39, ct + ch * .15); g.quadraticCurveTo(cx - cw * .36, ct + ch * .62, cx - cw * .2, ct + ch * .8); g.stroke();
      /* 4. 満ちたら湯気 */
      var hot = ramp(2.7, 4, S);
      steam(g, t, cx - cw * .16, ct + 10, H * .6, unit * .2, hot * .8);
      steam(g, t + 4.3, cx + cw * .16, ct + 10, H * .52, unit * .17, hot * .7);
    }
    g.globalAlpha = 1;
  }

  /* ---- 冒頭の写真の上：豆が舞う ---- */
  var hero = d.querySelector('.hero'), HC = null, heroBeans = [], heroOn = !!hero;
  if (hero) {
    var hc = canv(1, 1); hc.className = 'bg-hero'; hc.setAttribute('aria-hidden', 'true'); hero.appendChild(hc); HC = setup(hc);
    if ('IntersectionObserver' in w) new IntersectionObserver(function (e) { heroOn = e[e.length - 1].isIntersecting; }).observe(hero);
  }
  function drawHero(t, y) {
    if (HC.size()) heroBeans = makeBeans(HC.W <= 820 ? 16 : 24);
    var g = HC.g, W = HC.W, H = HC.H, m = W <= 820, burst = ramp(0, H * .8, y);
    g.clearRect(0, 0, W, H);
    heroBeans.forEach(function (b) {
      var span = H + 200, big = b.z > .86;
      var py = ((b.y * span + t * (18 + b.z * 40) - y * b.z * .5) % span + span) % span - 100;
      var px = b.x * W + Math.sin(t * .6 + b.k) * 28 + (b.x - .5) * burst * W * .5;
      /* 文字の上は薄くして読みやすく */
      var overText = m ? py < H * .55 : px < W * .46;
      var s = (m ? 20 : 26) + b.z * b.z * (m ? 60 : 110);
      drawBean(g, px, py, s, b.r + t * b.v, .4 + .6 * Math.abs(Math.cos(t * .8 + b.k)), overText ? .16 : big ? .65 : .9, big || b.z < .2);
    });
  }

  measure();
  w.addEventListener('load', measure);
  w.addEventListener('resize', measure);
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(measure);

  var start = null, shown = 0, n = 0;
  function frame(now) {
    if (start === null) start = now;
    var t = (now - start) / 1000, y = w.scrollY || 0;
    if (++n % 60 === 0) measure();
    shown += (story(y) - shown) * .12;   /* 急なスクロールでも滑らかに */
    drawPage(t, shown, y);
    if (HC && heroOn) drawHero(t, y);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

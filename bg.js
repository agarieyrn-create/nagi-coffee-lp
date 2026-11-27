/* 背景の動き「一杯の物語」：豆が舞う → 挽く → 注ぐ → カップに満ちて湯気（外部ライブラリなし）
   元に戻すときは、index.html の <script src="bg.js"> の1行を削除するだけです。
   画像: images/bg-*.webp（Canvaの画像生成で作成） */
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

  /* 写真素材（画像生成で作成し、背景を切り抜いたもの） */
  function photo(name, done) {
    var i = new Image(); if (done) i.onload = function () { done(i); }; i.src = 'images/' + name + '.webp'; return i;
  }
  function ready(i) { return i.complete && i.naturalWidth > 0; }
  function soften(src) {
    var s = canv(36, 36); s.getContext('2d').drawImage(src, 0, 0, 36, 36);
    var b = canv(100, 100); b.getContext('2d').drawImage(s, 0, 0, 100, 100);
    return b;
  }
  function puffImg() {
    var c = canv(128, 128), g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,.95)'); r.addColorStop(.5, 'rgba(214,196,172,.45)'); r.addColorStop(1, 'rgba(214,196,172,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    return c;
  }
  var beanSoft = null, puff = puffImg();
  var bean = photo('bg-bean', function (i) { beanSoft = soften(i); });
  var cupFull = photo('bg-cup-full'), cupEmpty = photo('bg-cup-empty');

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
    if (alpha < .02 || s < 1 || !beanSoft) return;
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(flip, 1); g.globalAlpha = alpha;
    g.drawImage(soft ? beanSoft : bean, -s * .5, -s * .5, s, s);
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

  function drawPage(t, S, y) {
    if (P.size()) build();
    var g = P.g, W = P.W, H = P.H, m = W <= 820;
    g.clearRect(0, 0, W, H);
    var cx = W * (m ? .5 : .52), unit = Math.min(W * (m ? 1 : .62), H);
    var strength = m ? .32 : .38;   /* 豆と粉の濃さ（数字を小さくすると薄くなる） */
    var quiet = m ? .24 : .32;    /* カップの濃さ */

    /* 1. 豆が舞い、中央の渦に吸い込まれて挽かれる */
    var gather = ramp(.35, 1.1, S), beanA = 1 - ramp(.95, 1.35, S);
    var millY = H * .48;
    if (beanA > 0) beans.forEach(function (b, i) {
      var span = H + 240;
      var fx = b.x * W + Math.sin(t * .5 + b.k) * 34;
      var fy = ((b.y * span - t * (14 + b.z * 30) - y * (.15 + b.z * .6)) % span + span) % span - 120;
      var s = Math.min(150, unit * (.04 + b.z * b.z * .15));
      var q = ramp(i / beans.length * .5, i / beans.length * .5 + .5, gather);
      var ang = b.k + t * 1.8 + q * 6, rad = (1 - q) * unit * .4 + unit * .03;
      var x = mix(fx, cx + Math.cos(ang) * rad, q), by = mix(fy, millY + Math.sin(ang) * rad * .45, q);
      drawBean(g, x, by, s * (1 - q * .65), b.r + t * b.v + q * 5, .4 + .6 * Math.abs(Math.cos(t * .7 + b.k)),
        beanA * (b.z > .82 ? strength * .65 : strength), b.z > .82 || b.z < .2);
    });

    /* 2. 粉：渦から生まれ、下へ沈みながら消える */
    var born = ramp(.55, 1.15, S), sink = ramp(1.15, 1.8, S), dripA = 1 - ramp(3.35, 3.8, S);
    if (born > 0 && sink < 1) {
      var colors = ['#5a321a', '#82502d', '#3a1f10'];
      grains.forEach(function (p) {
        var ang = p.a + t * (1.2 + p.f * 1.6), rad = p.q * unit * .42 * (.35 + born * .65) * (1 - sink * .8);
        g.globalAlpha = born * strength * (1 - sink);
        g.fillStyle = colors[p.c];
        g.beginPath(); g.arc(cx + Math.cos(ang) * rad, millY + sink * H * .2 + Math.sin(ang) * rad * .4 + (p.f - .5) * unit * .12, p.s * (m ? .8 : 1), 0, TAU); g.fill();
      });
    }

    /* 3. カップ：滴が落ち、スクロールに合わせて満ちる */
    var cup = ramp(1.35, 1.95, S);
    var cz = Math.min(500, unit * .76), top = H * (m ? .5 : .46);
    var level = ramp(1.8, 3.65, S);
    if (cup > .01 && ready(cupEmpty) && ready(cupFull)) {
      var ct = top + (1 - cup) * H * .25, cl = cx - cz * .49;
      var surf = ct + cz * mix(.76, .22, level);
      /* 上から細く注がれるコーヒー */
      var flow = ramp(1.65, 2.05, S) * dripA, to = ct + cz * mix(.74, .26, level);
      if (flow > .01) {
        g.globalAlpha = flow * quiet * 1.3; g.strokeStyle = '#6b3a1c'; g.lineWidth = m ? 4 : 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx, -10);
        for (var py = 2; py < to; py += 12) g.lineTo(cx + Math.sin(py * .03 - t * 9) * 2.5, py);
        g.lineTo(cx, to); g.stroke();
      }
      /* 空のカップに、コーヒー入りの写真を下から重ねて「満ちる」ように見せる */
      g.globalAlpha = cup * quiet * 1.3; g.drawImage(cupEmpty, cl, ct, cz, cz);
      if (level > 0) {
        g.save(); g.beginPath(); g.moveTo(cl, ct + cz);
        for (var x = 0; x <= cz; x += 10) g.lineTo(cl + x, surf + (1 - ramp(.85, 1, level)) * Math.sin(x * .05 + t * 4) * 3);
        g.lineTo(cl + cz, ct + cz); g.closePath(); g.clip();
        g.globalAlpha = cup * quiet * 1.5; g.drawImage(cupFull, cl, ct, cz, cz);
        g.restore();
      }
      /* 4. 満ちたら湯気 */
      var hot = ramp(2.7, 4, S);
      steam(g, t, cx - cz * .1, ct + cz * .24, H * .45, cz * .22, hot * .6);
      steam(g, t + 4.3, cx + cz * .1, ct + cz * .24, H * .38, cz * .18, hot * .5);
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
      var s = (m ? 20 : 26) + b.z * b.z * (m ? 50 : 90);
      drawBean(g, px, py, s, b.r + t * b.v, .4 + .6 * Math.abs(Math.cos(t * .8 + b.k)), overText ? .1 : big ? .35 : .55, big || b.z < .2);
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

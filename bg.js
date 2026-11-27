/* 背景の動き：コーヒー豆・湯気・凪の海（外部ライブラリなし）
   元に戻すときは、index.html の <script src="bg.js"> の1行を削除するだけです。 */
(function () {
  'use strict';
  var w = window, d = document;
  if (w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var probe = d.createElement('canvas');
  if (!probe.getContext) return;

  var css = d.createElement('style');
  css.textContent =
    '.bg-page{position:fixed;left:0;top:0;width:100%;height:100vh;height:100lvh;z-index:-1;pointer-events:none}' +
    '.bg-hero{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none}' +
    '.mo .x-nagi{background-color:transparent!important}';
  d.head.appendChild(css);

  var seed = 11;
  function rnd() { return (seed = (seed * 16807) % 2147483647) / 2147483647; }

  /* 豆と湯気は先に画像にしておく（軽くするため） */
  function beanImg() {
    var c = d.createElement('canvas'); c.width = 64; c.height = 80;
    var g = c.getContext('2d');
    g.fillStyle = '#6b4226'; g.beginPath(); g.ellipse(32, 40, 25, 35, 0, 0, 6.283); g.fill();
    g.strokeStyle = '#e7d3bd'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(34, 9); g.bezierCurveTo(16, 28, 50, 50, 30, 71); g.stroke();
    return c;
  }
  function puffImg() {
    var c = d.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(.5, 'rgba(236,224,206,.4)'); r.addColorStop(1, 'rgba(236,224,206,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    return c;
  }
  var bean = beanImg(), puff = puffImg();

  function layer(canvas, isHero) {
    var g = canvas.getContext('2d'), W = 0, H = 0, beans = [], on = true;
    function size() {
      var dpr = Math.min(w.devicePixelRatio || 1, 1.5);
      var nw = canvas.clientWidth, nh = canvas.clientHeight;
      if (nw === W && nh === H) return;
      var rebuild = Math.abs(nw - W) > 40;
      W = nw; H = nh;
      canvas.width = W * dpr; canvas.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!rebuild) return;
      var m = W <= 820, n = isHero ? (m ? 9 : 16) : (m ? 12 : 24);
      beans = [];
      for (var i = 0; i < n; i++) {
        var z = rnd();
        beans.push({ x: (i + rnd()) / n, y: rnd(), z: z, s: (m ? 12 : 15) + z * (m ? 22 : 32), r: rnd() * 6.28, v: (rnd() - .5) * .7, k: rnd() * 6.28 });
      }
    }
    /* 湯気：下から揺れながら昇る */
    function steam(t, x, base, height, alpha) {
      for (var i = 0; i < 18; i++) {
        var p = (i / 18 + t * .055) % 1, r = 30 + p * 110;
        var px = x + Math.sin(p * 7 + t * .7 + x) * (12 + p * 55);
        g.globalAlpha = Math.sin(p * Math.PI) * alpha;
        g.drawImage(puff, px - r / 2, base - p * height - r / 2, r, r * 1.35);
      }
    }
    function drawBeans(t, scroll, alpha) {
      for (var i = 0; i < beans.length; i++) {
        var b = beans[i], span = H + 120;
        var y = ((b.y * span - t * (5 + b.z * 12) - scroll * (.08 + b.z * .28)) % span + span) % span - 60;
        var x = b.x * W + Math.sin(t * .35 + b.k) * 22;
        g.save(); g.translate(x, y); g.rotate(b.r + t * b.v);
        g.scale(.4 + .6 * Math.abs(Math.cos(t * .5 * Math.abs(b.v) + b.k)), 1);
        g.globalAlpha = alpha * (.5 + b.z * .5);
        g.drawImage(bean, -b.s * .4, -b.s * .5, b.s * .8, b.s);
        g.restore();
      }
    }
    /* 凪の海：画面の下でゆっくり重なる波 */
    function sea(t, scroll) {
      var max = Math.max(1, d.documentElement.scrollHeight - H), p = Math.min(1, scroll / max);
      var bottom = H, level = (W <= 820 ? 150 : 110) + p * 90;
      var cols = ['rgba(44,110,111,.09)', 'rgba(44,110,111,.11)', 'rgba(44,110,111,.14)'];
      g.globalAlpha = 1;
      for (var k = 0; k < 3; k++) {
        g.beginPath(); g.moveTo(0, bottom);
        for (var x = 0; x <= W + 16; x += 16) {
          var y = bottom - level + k * 30 + Math.sin(x * .008 * (1 + k * .25) + t * (.5 + k * .2) * (k % 2 ? -1 : 1) + k * 2 + scroll * .003) * (14 - k * 2);
          g.lineTo(x, y);
        }
        g.lineTo(W, bottom); g.closePath(); g.fillStyle = cols[k]; g.fill();
      }
    }
    function draw(t, scroll) {
      size();
      g.clearRect(0, 0, W, H);
      if (isHero) {
        steam(t, W * (W <= 820 ? .82 : .8), H * .98, H * .6, .2);
        drawBeans(t, scroll, .38);
      } else {
        sea(t, scroll);
        steam(t, W * .08, H, H * .85, .34);
        steam(t + 6, W * .92, H, H * .75, .34);
        drawBeans(t, scroll, .24);
      }
      g.globalAlpha = 1;
    }
    var o = { draw: draw, visible: function () { return on; } };
    if (isHero && 'IntersectionObserver' in w) new IntersectionObserver(function (e) { on = e[e.length - 1].isIntersecting; }).observe(canvas.parentNode);
    return o;
  }

  var layers = [];
  function add(parent, cls, isHero) {
    var c = d.createElement('canvas'); c.className = cls; c.setAttribute('aria-hidden', 'true');
    parent.appendChild(c); layers.push(layer(c, isHero));
  }
  add(d.body, 'bg-page', false);
  var hero = d.querySelector('.hero');
  if (hero) add(hero, 'bg-hero', true);

  var start = null;
  function frame(now) {
    if (start === null) start = now;
    var t = (now - start) / 1000, y = w.scrollY || 0;
    for (var i = 0; i < layers.length; i++) if (layers[i].visible()) layers[i].draw(t, y);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

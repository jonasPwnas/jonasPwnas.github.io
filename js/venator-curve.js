// Venator: hover readout for the play-speed curve chart.
// The curve itself is drawn in the HTML (sampled from the clip's keyframes); this only adds the crosshair and tooltip.
(function () {
  var fig = document.querySelector('.curve-chart');
  if (!fig) return;
  var svg = fig.querySelector('.cv-svg');
  var pts = JSON.parse(svg.getAttribute('data-points'));
  var g = JSON.parse(svg.getAttribute('data-geom')); // W, H, L, R, T, B, YMAX
  var W = g[0], H = g[1], L = g[2], R = g[3], T = g[4], B = g[5], YMAX = g[6];
  var hover = svg.querySelector('.cv-hover');
  var cross = hover.querySelector('.cv-cross');
  var dot = hover.querySelector('.cv-hdot');
  var tip = fig.querySelector('.cv-tip');

  function X(t) { return L + t * (W - L - R); }
  function Y(v) { return T + (1 - v / YMAX) * (H - T - B); }

  function show(ev) {
    var r = svg.getBoundingClientRect();
    var sx = (ev.clientX - r.left) / r.width * W;
    var t = Math.max(0, Math.min(1, (sx - L) / (W - L - R)));
    var p = pts[Math.round(t * (pts.length - 1))];
    var x = X(p[0]), y = Y(p[1]);
    cross.setAttribute('x1', x); cross.setAttribute('x2', x);
    dot.setAttribute('cx', x); dot.setAttribute('cy', y);
    hover.removeAttribute('hidden');
    tip.textContent = Math.round(p[0] * 100) + '% through the swing: ' + p[1].toFixed(2) + '× speed';
    tip.hidden = false;
    var px = x / W * r.width, py = y / H * r.height;
    tip.style.left = Math.max(0, Math.min(r.width - tip.offsetWidth, px - tip.offsetWidth / 2)) + 'px';
    tip.style.top = Math.max(0, py - tip.offsetHeight - 14) + 'px';
  }
  function hide() { hover.setAttribute('hidden', ''); tip.hidden = true; }

  svg.addEventListener('pointermove', show);
  svg.addEventListener('pointerdown', show);
  svg.addEventListener('pointerleave', hide);
})();

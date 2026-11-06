// Venator: interactive attack-range viewer.
// Mirrors EnemyFsm.GetBestCombatState() and FsmCombatState.CanEnter():
//  - a state with "use distance" can be entered when min < distance < max
//  - MoveAway ignores its settings and is available when distance < 2.5 m (hard-coded in MoveAwayCombatState)
//  - Idle is always available
//  - attacks are considered first (unless the general attack cooldown is running), then movement, then idle;
//    the available state with the highest weight wins.
// Values come from the game's enemy prefabs.
(function () {
  var root = document.getElementById('range-viewer');
  if (!root) return;

  var COLORS = {
    light: '#5fb985', heavy: '#e0a458', special1: '#7aa2f7', special2: '#c678dd',
    moveTo: '#9aa09c', moveAway: '#e06c75', idle: '#6b706d'
  };

  // kind: 'attack' | 'move' | 'idle'; rule: 'distance' | 'always' | 'moveAway'
  var ENEMIES = {
    boss: {
      label: 'Boss', enter: 18,
      states: [
        { id: 'special1', name: 'Special attack 1', kind: 'attack', rule: 'distance', min: 8, max: 20, weight: 9 },
        { id: 'special2', name: 'Special attack 2', kind: 'attack', rule: 'distance', min: 1.7, max: 3, weight: 7.77 },
        { id: 'heavy', name: 'Heavy attack', kind: 'attack', rule: 'distance', min: 1.7, max: 2.6, weight: 5.29 },
        { id: 'light', name: 'Light attack', kind: 'attack', rule: 'distance', min: 1.7, max: 2.6, weight: 4 },
        { id: 'moveAway', name: 'Move away', kind: 'move', rule: 'moveAway', weight: 7.36 },
        { id: 'moveTo', name: 'Move to player', kind: 'move', rule: 'always', weight: 0.66 },
        { id: 'idle', name: 'Idle', kind: 'idle', rule: 'always', weight: 0.001 }
      ]
    },
    sword: {
      label: 'Sword enemy', enter: 20,
      states: [
        { id: 'heavy', name: 'Heavy attack', kind: 'attack', rule: 'distance', min: 1.5, max: 4, weight: 6.66 },
        { id: 'light', name: 'Light attack', kind: 'attack', rule: 'distance', min: 1, max: 3, weight: 4 },
        { id: 'moveAway', name: 'Move away', kind: 'move', rule: 'moveAway', weight: 5.4 },
        { id: 'moveTo', name: 'Move to player', kind: 'move', rule: 'always', weight: 0.67 },
        { id: 'idle', name: 'Idle', kind: 'idle', rule: 'always', weight: 0.001 }
      ]
    },
    crawler: {
      label: 'Crawler', enter: 9,
      states: [
        { id: 'light', name: 'Light attack', kind: 'attack', rule: 'distance', min: 0.5, max: 1, weight: 6.49 },
        { id: 'moveAway', name: 'Move away', kind: 'move', rule: 'moveAway', weight: 5.72 },
        { id: 'moveTo', name: 'Move to player', kind: 'move', rule: 'distance', min: 2, max: 40, weight: 0.67 },
        { id: 'idle', name: 'Idle', kind: 'idle', rule: 'always', weight: 0.001 }
      ]
    }
  };
  var MOVE_AWAY_RANGE = 2.5;

  var state = {
    enemy: 'boss', zoom: 'close', angle: -Math.PI / 4, distance: 2.2,
    generalCooldown: false, cooldown: {}, data: JSON.parse(JSON.stringify(ENEMIES))
  };

  var NS = 'http://www.w3.org/2000/svg';
  var svg = root.querySelector('svg');
  var SIZE = 480, C = SIZE / 2, R = SIZE / 2 - 18;

  function enemy() { return state.data[state.enemy]; }
  function viewRadius() {
    if (state.zoom === 'close') return 6;
    var m = enemy().enter;
    enemy().states.forEach(function (s) { if (s.rule === 'distance' && s.kind === 'attack') m = Math.max(m, s.max); });
    return Math.ceil((m + 1) / 5) * 5;
  }
  function px(m) { return m / viewRadius() * R; }

  function canEnter(s, d) {
    if (state.cooldown[s.id]) return false;
    if (s.rule === 'always') return true;
    if (s.rule === 'moveAway') return d < MOVE_AWAY_RANGE;
    return d > s.min && d < s.max;
  }

  function choose(d) {
    var st = enemy().states;
    var pools = [['attack', !state.generalCooldown], ['move', true], ['idle', true]];
    for (var i = 0; i < pools.length; i++) {
      if (!pools[i][1]) continue;
      var avail = st.filter(function (s) { return s.kind === pools[i][0] && canEnter(s, d); });
      if (avail.length) {
        var best = null;
        avail.forEach(function (s) { if (!best || s.weight > best.weight) best = s; });
        return { state: best, pool: pools[i][0] };
      }
    }
    return { state: st.filter(function (s) { return s.kind === 'idle'; })[0], pool: 'idle' };
  }

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function ring(g, s, rMin, rMax, color, dashed) {
    // an annulus between rMin and rMax, filled lightly, outlined
    var a = px(rMax), b = px(Math.max(rMin, 0));
    var d = 'M' + (C - a) + ' ' + C + 'a' + a + ' ' + a + ' 0 1 0 ' + (2 * a) + ' 0a' + a + ' ' + a + ' 0 1 0 ' + (-2 * a) + ' 0Z';
    if (b > 0) d += 'M' + (C - b) + ' ' + C + 'a' + b + ' ' + b + ' 0 1 1 ' + (2 * b) + ' 0a' + b + ' ' + b + ' 0 1 1 ' + (-2 * b) + ' 0Z';
    el('path', { d: d, fill: color, 'fill-opacity': 0.16, 'fill-rule': 'evenodd', stroke: color, 'stroke-width': 1.5,
      'stroke-dasharray': dashed ? '5 4' : 'none', 'data-id': s.id }, g);
  }

  function fs(n) { var w = svg.clientWidth || SIZE; return n * Math.max(1, 440 / w); }

  function draw() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var vr = viewRadius();
    var step = vr <= 6 ? 1 : (vr <= 25 ? 5 : 10);
    var grid = el('g', { 'aria-hidden': 'true' }, svg);
    for (var m = step; m <= vr; m += step) {
      el('circle', { cx: C, cy: C, r: px(m), fill: 'none', stroke: 'var(--line)', 'stroke-width': 1 }, grid);
      var t = el('text', { x: C + px(m) - 3, y: C - 4, 'text-anchor': 'end', 'font-size': fs(11), fill: 'var(--muted)' }, grid);
      t.textContent = m + ' m';
    }
    // enter-combat distance
    var e = enemy();
    if (e.enter <= vr) {
      el('circle', { cx: C, cy: C, r: px(e.enter), fill: 'none', stroke: 'var(--ink)', 'stroke-opacity': 0.5,
        'stroke-width': 1.25, 'stroke-dasharray': '2 5' }, svg);
      var lt = el('text', { x: C, y: C + px(e.enter) + 15, 'text-anchor': 'middle', 'font-size': fs(11), fill: 'var(--muted)' }, svg);
      lt.textContent = 'enters combat at ' + e.enter + ' m';
    }
    var clip = el('clipPath', { id: 'rv-clip' }, el('defs', {}, svg));
    el('circle', { cx: C, cy: C, r: R + 1 }, clip);
    var rings = el('g', { 'clip-path': 'url(#rv-clip)' }, svg);
    // largest first so small rings sit on top
    e.states.filter(function (s) { return s.rule === 'distance' || s.rule === 'moveAway'; })
      .map(function (s) { return { s: s, max: s.rule === 'moveAway' ? MOVE_AWAY_RANGE : s.max }; })
      .sort(function (a, b) { return b.max - a.max; })
      .forEach(function (o) {
        var s = o.s;
        if (s.rule === 'moveAway') ring(rings, s, 0, MOVE_AWAY_RANGE, COLORS.moveAway, true);
        else ring(rings, s, s.min, s.max, COLORS[s.id], s.kind !== 'attack');
      });
    // enemy
    el('circle', { cx: C, cy: C, r: 7, fill: 'var(--ink)' }, svg);
    var en = el('text', { x: C, y: C + 22, 'text-anchor': 'middle', 'font-size': fs(12), 'font-weight': 700, fill: 'var(--ink)' }, svg);
    en.textContent = e.label;
    // player
    var d = Math.min(state.distance, vr);
    var x = C + Math.cos(state.angle) * px(d), y = C + Math.sin(state.angle) * px(d);
    el('line', { x1: C, y1: C, x2: x, y2: y, stroke: 'var(--ink)', 'stroke-opacity': 0.6, 'stroke-width': 1.25, 'stroke-dasharray': '3 3' }, svg);
    var p = el('g', { class: 'rv-player' }, svg);
    el('circle', { cx: x, cy: y, r: 16, fill: 'transparent' }, p); // bigger grab area
    el('circle', { cx: x, cy: y, r: 9, fill: 'var(--paper)', stroke: 'var(--green-deep)', 'stroke-width': 3 }, p);
    var pl = el('text', { x: x, y: y - 16, 'text-anchor': 'middle', 'font-size': fs(12), 'font-weight': 700, fill: 'var(--ink)' }, svg);
    pl.textContent = 'Player · ' + state.distance.toFixed(1) + ' m';
  }

  // ---------- panel ----------
  var list = root.querySelector('.rv-states');
  var result = root.querySelector('.rv-result');
  var slider = root.querySelector('.rv-distance');
  var distOut = root.querySelector('.rv-distance-out');

  function fmt(n) { return (Math.round(n * 1000) / 1000).toString(); }

  function buildList() {
    list.innerHTML = '';
    enemy().states.forEach(function (s) {
      var li = document.createElement('li');
      li.className = 'rv-row';
      li.dataset.id = s.id;
      var range;
      if (s.rule === 'distance') {
        range = '<label class="rv-num"><span class="visually-hidden">' + s.name + ' minimum distance</span>' +
          '<input type="number" step="0.1" min="0" data-field="min" value="' + fmt(s.min) + '"></label>' +
          '<span class="rv-dash">to</span>' +
          '<label class="rv-num"><span class="visually-hidden">' + s.name + ' maximum distance</span>' +
          '<input type="number" step="0.1" min="0" data-field="max" value="' + fmt(s.max) + '"></label><span class="rv-unit">m</span>';
      } else if (s.rule === 'moveAway') {
        range = '<span class="rv-fixed">under 2.5 m <small>(hard-coded)</small></span>';
      } else {
        range = '<span class="rv-fixed">any distance</span>';
      }
      li.innerHTML =
        '<span class="rv-swatch" style="--c:' + COLORS[s.id] + '"></span>' +
        '<span class="rv-name">' + s.name + '<small>' + (s.kind === 'attack' ? 'Attack' : s.kind === 'move' ? 'Movement' : 'Idle') + '</small></span>' +
        '<span class="rv-range">' + range + '</span>' +
        '<label class="rv-num rv-weight"><span class="rv-label">Weight</span>' +
        '<input type="number" step="0.01" min="0" data-field="weight" value="' + fmt(s.weight) + '"></label>' +
        (s.kind === 'idle' ? '<span class="rv-cd-none"></span>' :
          '<button type="button" class="rv-cd" aria-pressed="' + (!!state.cooldown[s.id]) + '">Cooldown<span class="visually-hidden"> running for ' + s.name + '</span></button>') +
        '<span class="rv-status"></span>';
      list.appendChild(li);
    });
  }

  function update() {
    var d = state.distance;
    var pick = choose(d);
    draw();
    slider.max = viewRadius();
    slider.value = Math.min(d, viewRadius());
    distOut.textContent = d.toFixed(1) + ' m';
    enemy().states.forEach(function (s) {
      var row = list.querySelector('[data-id="' + s.id + '"]');
      var ok = canEnter(s, d);
      var status = row.querySelector('.rv-status');
      var chosen = pick.state === s;
      row.classList.toggle('is-chosen', chosen);
      row.classList.toggle('is-available', ok);
      status.textContent = chosen ? 'Picked' : state.cooldown[s.id] ? 'Cooling down' : ok ? 'In range' : 'Out of range';
    });
    var why = pick.pool === 'attack' ? 'the highest-weighted attack in range'
      : (state.generalCooldown ? 'attacks are paused by the general attack cooldown, so it picks the highest-weighted movement'
        : pick.pool === 'move' ? 'no attack is in range, so it picks the highest-weighted movement'
          : 'nothing else is available, so it idles');
    result.innerHTML = '<strong>' + pick.state.name + '</strong> (weight ' + fmt(pick.state.weight) + '): ' + why + '.';
    // dim rings that are not available
    svg.querySelectorAll('path[data-id]').forEach(function (p) {
      var s = enemy().states.filter(function (x) { return x.id === p.getAttribute('data-id'); })[0];
      var on = canEnter(s, d);
      p.setAttribute('fill-opacity', pick.state === s ? 0.28 : on ? 0.18 : 0.07);
      p.setAttribute('stroke-opacity', on ? 1 : 0.45);
      p.setAttribute('stroke-width', pick.state === s ? 2.5 : 1.5);
    });
  }

  // ---------- controls ----------
  root.querySelectorAll('[data-enemy]').forEach(function (b) {
    b.addEventListener('click', function () {
      state.enemy = b.dataset.enemy; state.cooldown = {};
      root.querySelectorAll('[data-enemy]').forEach(function (o) { o.setAttribute('aria-pressed', o === b); });
      buildList(); update();
    });
  });
  root.querySelectorAll('[data-zoom]').forEach(function (b) {
    b.addEventListener('click', function () {
      state.zoom = b.dataset.zoom;
      root.querySelectorAll('[data-zoom]').forEach(function (o) { o.setAttribute('aria-pressed', o === b); });
      state.distance = Math.min(state.distance, viewRadius());
      update();
    });
  });
  root.querySelector('.rv-general').addEventListener('change', function (e) {
    state.generalCooldown = e.target.checked; update();
  });
  root.querySelector('.rv-reset').addEventListener('click', function () {
    state.data = JSON.parse(JSON.stringify(ENEMIES)); state.cooldown = {}; buildList(); update();
  });
  slider.addEventListener('input', function () { state.distance = parseFloat(slider.value); update(); });

  list.addEventListener('click', function (e) {
    var b = e.target.closest('.rv-cd'); if (!b) return;
    var id = b.closest('.rv-row').dataset.id;
    state.cooldown[id] = !state.cooldown[id];
    b.setAttribute('aria-pressed', state.cooldown[id]);
    update();
  });
  list.addEventListener('input', function (e) {
    var f = e.target.dataset.field; if (!f) return;
    var id = e.target.closest('.rv-row').dataset.id;
    var v = parseFloat(e.target.value); if (isNaN(v) || v < 0) return;
    enemy().states.filter(function (s) { return s.id === id; })[0][f] = v;
    update();
  });

  // drag the player marker
  function toLocal(ev) {
    var r = svg.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / r.width * SIZE - C, y: (ev.clientY - r.top) / r.height * SIZE - C };
  }
  var dragging = false;
  function move(ev) {
    var p = toLocal(ev);
    state.angle = Math.atan2(p.y, p.x);
    state.distance = Math.max(0, Math.min(viewRadius(), Math.hypot(p.x, p.y) / R * viewRadius()));
    update();
  }
  svg.addEventListener('pointerdown', function (ev) { dragging = true; svg.setPointerCapture(ev.pointerId); move(ev); ev.preventDefault(); });
  svg.addEventListener('pointermove', function (ev) { if (dragging) move(ev); });
  svg.addEventListener('pointerup', function () { dragging = false; });
  svg.addEventListener('pointercancel', function () { dragging = false; });

  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(update, 100); });

  buildList(); update();
})();

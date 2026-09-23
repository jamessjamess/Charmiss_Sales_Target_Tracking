/*
 * core/charts.js — กราฟที่ใช้หลายหน้า (SVG/CSS ที่เขียนเอง ห้ามใช้ Library กราฟ)
 *
 * สีส่งเป็นชื่อ Token (เช่น '--ch-1') แล้วตั้งเป็น CSS Variable --c ของชิ้นนั้น ไม่มีค่าสีใน JS
 * ตัวเลขที่แสดงมาจาก calc (Module ส่งเข้ามา) กราฟคำนวณแค่ขนาดของชิ้น/แท่ง
 *
 *   donut({ items, inner, center, onHover }) วงแหวนสัดส่วน วงนอก = ปีนี้ วงใน (บางกว่า) = ปีก่อน (หน้า Top-down)
 *   miniBar({ value, prior, max, colorToken, title }) แท่งเล็กในแถวตาราง (ความยาว = เป้าหมาย ขีดตั้ง = ยอดปีก่อน)
 *   barLine({ bars, line, dashed, labels, format, unit }) แท่ง 12 เดือน + เส้นทึบ + เส้นประ (รายงานสรุปแผน)
 *   hbars({ items })                          แท่งแนวนอนรายการเดียว (รายงาน: สัดส่วนตามกลุ่มสินค้า)
 *   barList({ groups, allLabel, tickLabel, onHover })  แท่งแนวนอนจัดกลุ่ม + เส้นขีดยอดปีก่อน + Filter กลุ่ม
 *   splitBar(split, parts, opts)           แถบแบ่งเงิน Net Sales / GP / VAT (calc.moneySplit)
 * สไตล์อยู่ที่ styles/components.css (ส่วน "กราฟ")
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var F = SP.core.format;
  var h = C.h;
  var SVG = 'http://www.w3.org/2000/svg';

  function svg(tag, attrs) {
    var el = document.createElementNS(SVG, tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] != null) el.setAttribute(k, attrs[k]); });
    return el;
  }

  // ---------------------------------------------------------------------
  // Donut
  // items = [{ id, label, title, value, colorToken, legend: [ข้อความหรือ node ต่อคอลัมน์], muted }]
  //   ชิ้นกว้างตาม value / muted = ชิ้นสีเทา (เช่น ยังไม่จัดสรร)
  // inner = [{ id, value, colorToken, title }] วงในบางกว่า (เช่น สัดส่วนปีก่อน) ไม่ส่ง = วงเดียว
  // center = { label, value } ข้อความกลางวง / onHover(id | null)
  // คืน element ที่มี .update(items, center, inner) และ .highlight(id)
  // ---------------------------------------------------------------------
  function arcs(group, items, r, w, className, hover, nodes) {
    var circ = 2 * Math.PI * r;
    var total = items.reduce(function (t, it) { return t + Math.max(0, it.value || 0); }, 0);
    var offset = 0;
    items.forEach(function (it) {
      var len = total > 0 ? Math.max(0, it.value || 0) / total * circ : 0;
      if (len <= 0) return;
      var arc = svg('circle', {
        cx: 60, cy: 60, r: r, fill: 'none', 'stroke-width': w,
        class: className + (it.muted ? ' is-muted' : ''),
        'stroke-dasharray': len + ' ' + (circ - len), 'stroke-dashoffset': -offset
      });
      if (it.colorToken) arc.style.setProperty('--c', C.tokenVar(it.colorToken));
      var t = svg('title', {});
      t.textContent = it.title || it.label || '';
      arc.appendChild(t);
      arc.addEventListener('mouseenter', function () { hover(it.id); });
      arc.addEventListener('mouseleave', function () { hover(null); });
      group.appendChild(arc);
      (nodes[it.id] = nodes[it.id] || []).push(arc);
      offset += len;
    });
  }

  function donut(opts) {
    var R = 46, W = 16, CIRC = 2 * Math.PI * R;
    var wrap = h('div', { class: 'donut' });
    var box = h('div', { class: 'donut-figure' });
    var chart = svg('svg', { viewBox: '0 0 120 120', class: 'donut-svg', role: 'img' });
    var ring = svg('g', { transform: 'rotate(-90 60 60)' });
    var innerRing = svg('g', { transform: 'rotate(-90 60 60)' });
    chart.appendChild(svg('circle', { cx: 60, cy: 60, r: R, class: 'donut-track', 'stroke-width': W, fill: 'none' }));
    chart.appendChild(ring);
    chart.appendChild(innerRing);
    var centerEl = h('div', { class: 'donut-center' });
    box.appendChild(chart);
    box.appendChild(centerEl);
    var legendEl = h('ul', { class: 'donut-legend' });
    wrap.appendChild(box);
    wrap.appendChild(legendEl);
    var nodes = {};
    var hl = null;

    function highlight(id) {
      hl = id;
      wrap.classList.toggle('has-hl', !!id);
      Object.keys(nodes).forEach(function (k) {
        nodes[k].forEach(function (n) { n.classList.toggle('is-hl', k === id); });
      });
    }
    function hover(id) { highlight(id); if (opts.onHover) opts.onHover(id); }

    function update(items, center, inner) {
      while (ring.firstChild) ring.removeChild(ring.firstChild);
      while (innerRing.firstChild) innerRing.removeChild(innerRing.firstChild);
      C.clear(legendEl);
      C.clear(centerEl);
      nodes = {};
      if (inner && inner.length) arcs(innerRing, inner, 32, 7, 'donut-slice donut-inner', hover, nodes);
      var total = items.reduce(function (t, it) { return t + Math.max(0, it.value || 0); }, 0);
      var offset = 0;
      items.forEach(function (it) {
        var len = total > 0 ? Math.max(0, it.value || 0) / total * CIRC : 0;
        var list = nodes[it.id] = nodes[it.id] || [];
        if (len > 0) {
          var arc = svg('circle', {
            cx: 60, cy: 60, r: R, fill: 'none', 'stroke-width': W,
            class: 'donut-slice' + (it.muted ? ' is-muted' : ''),
            'stroke-dasharray': len + ' ' + (CIRC - len), 'stroke-dashoffset': -offset
          });
          if (it.colorToken) arc.style.setProperty('--c', C.tokenVar(it.colorToken));
          var t = svg('title', {});
          t.textContent = it.title || it.label;
          arc.appendChild(t);
          arc.addEventListener('mouseenter', function () { hover(it.id); });
          arc.addEventListener('mouseleave', function () { hover(null); });
          ring.appendChild(arc);
          list.push(arc);
          offset += len;
        }
        var li = h('li', {
          class: 'donut-row' + (it.muted ? ' is-muted' : ''), title: it.title || it.label,
          style: it.colorToken ? { '--c': C.tokenVar(it.colorToken) } : null,
          onMouseenter: function () { hover(it.id); }, onMouseleave: function () { hover(null); }
        }, h('span', { class: 'donut-swatch' }), (it.legend || [it.label]).map(function (x, i) { return h('span', { class: 'donut-col donut-col-' + i }, x); }));
        legendEl.appendChild(li);
        list.push(li);
      });
      if (center) {
        centerEl.appendChild(h('span', { class: 'donut-center-value' }, center.value));
        centerEl.appendChild(h('span', { class: 'donut-center-label' }, center.label));
      }
      if (hl) highlight(hl);
    }

    wrap.update = update;
    wrap.highlight = highlight;
    update(opts.items || [], opts.center, opts.inner);
    return wrap;
  }

  // ---------------------------------------------------------------------
  // แท่งเล็กในแถวตาราง: ความยาว = value, ขีดตั้ง = prior (สเกลเดียวกัน max) สีตาม colorToken
  // ---------------------------------------------------------------------
  function miniBar(o) {
    var max = o.max > 0 ? o.max : 1;
    var w = Math.max(0, Math.min(1, (o.value || 0) / max)) * 100;
    var tick = o.prior != null && o.prior > 0 ? Math.max(0, Math.min(1, o.prior / max)) * 100 : null;
    return h('span', { class: 'mini-bar', title: o.title, style: o.colorToken ? { '--c': C.tokenVar(o.colorToken) } : null },
      h('span', { class: 'mini-bar-fill', style: { width: w + '%' } }),
      tick != null ? h('span', { class: 'mini-bar-tick', style: { left: tick + '%' } }) : null);
  }

  // ---------------------------------------------------------------------
  // แท่ง 12 เดือน + เส้นทึบ + เส้นประ (SVG) — ตัวเลขทุกชุดใช้สเกลเดียวกัน
  // opts: { bars: [12], line: [12], dashed: [12], months: [ป้าย 12 เดือน], labels: { bar, line, dashed },
  //         format(v) → ป้ายแกนและ Tooltip, height }
  // ---------------------------------------------------------------------
  function barLine(o) {
    var W = 960, H = o.height || 260, padL = 56, padR = 12, padT = 12, padB = 28;
    var all = [].concat(o.bars || [], o.line || [], o.dashed || []).filter(function (v) { return v != null; });
    var max = Math.max.apply(null, all.concat([1]));
    var step = Math.pow(10, Math.floor(Math.log(max) / Math.LN10));
    var top = Math.ceil(max / step) * step;
    var fmt = o.format || function (v) { return F.number(v); };
    var cw = (W - padL - padR) / 12;
    function x(m) { return padL + cw * m + cw / 2; }
    function y(v) { return padT + (H - padT - padB) * (1 - (v || 0) / top); }
    var chart = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'barline-svg', role: 'img', 'aria-label': [o.labels.bar, o.labels.line, o.labels.dashed].join(' · ') });
    for (var i = 0; i <= 4; i++) {
      var v = top * i / 4;
      chart.appendChild(svg('line', { x1: padL, x2: W - padR, y1: y(v), y2: y(v), class: 'barline-grid' }));
      var lab = svg('text', { x: padL - 6, y: y(v) + 4, class: 'barline-axis', 'text-anchor': 'end' });
      lab.textContent = fmt(v);
      chart.appendChild(lab);
    }
    (o.bars || []).forEach(function (v, m) {
      var r = svg('rect', { x: padL + cw * m + cw * 0.18, y: y(v), width: cw * 0.64, height: Math.max(0, y(0) - y(v)), class: 'barline-bar' });
      var t = svg('title', {});
      t.textContent = (o.months ? o.months[m] + ' · ' : '') + o.labels.bar + ' ' + fmt(v) + (o.line ? ' · ' + o.labels.line + ' ' + fmt(o.line[m]) : '') + (o.dashed ? ' · ' + o.labels.dashed + ' ' + fmt(o.dashed[m]) : '');
      r.appendChild(t);
      chart.appendChild(r);
    });
    function path(values, cls) {
      if (!values) return;
      var d = values.map(function (v, m) { return (m ? 'L' : 'M') + x(m).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' ');
      chart.appendChild(svg('path', { d: d, class: cls, fill: 'none' }));
      values.forEach(function (v, m) { chart.appendChild(svg('circle', { cx: x(m), cy: y(v), r: 3, class: cls + '-dot' })); });
    }
    path(o.dashed, 'barline-dashed');
    path(o.line, 'barline-line');
    (o.months || []).forEach(function (mn, m) {
      var t = svg('text', { x: x(m), y: H - 8, class: 'barline-axis', 'text-anchor': 'middle' });
      t.textContent = mn;
      chart.appendChild(t);
    });
    return h('div', { class: 'barline' }, chart,
      h('div', { class: 'legend barline-legend' },
        h('span', { class: 'legend-item' }, h('span', { class: 'swatch barline-swatch-bar' }), o.labels.bar),
        o.line ? h('span', { class: 'legend-item' }, h('span', { class: 'barline-swatch-line' }), o.labels.line) : null,
        o.dashed ? h('span', { class: 'legend-item' }, h('span', { class: 'barline-swatch-dashed' }), o.labels.dashed) : null));
  }

  // ---------------------------------------------------------------------
  // แท่งแนวนอนรายการเดียว items = [{ label, value, text, colorToken, title }] (สเกลเทียบค่าสูงสุด)
  // ---------------------------------------------------------------------
  function hbars(o) {
    var max = Math.max.apply(null, o.items.map(function (it) { return it.value || 0; }).concat([1]));
    return h('div', { class: 'hbars' }, o.items.map(function (it) {
      return h('div', { class: 'hbar-row', title: it.title || it.label, style: it.colorToken ? { '--c': C.tokenVar(it.colorToken) } : null },
        h('span', { class: 'hbar-label' }, it.label),
        h('span', { class: 'hbar-track' }, h('span', { class: 'hbar-fill', style: { width: Math.max(0, (it.value || 0) / max * 100) + '%' } })),
        h('span', { class: 'hbar-text' }, it.text));
    }));
  }

  // ---------------------------------------------------------------------
  // Bar แนวนอนจัดกลุ่ม
  // groups = [{ id, label, title, colorToken, items: [{ id, label, title, value, prior, text }] }]
  //   เรียงจากมากไปน้อยในกลุ่ม / เส้นขีด = prior / text = ข้อความท้ายแท่ง (เช่น "12.60 · +5.20%")
  // opts: { allLabel ('ทั้งหมด'), tickLabel (คำอธิบายเส้นขีด), onHover(groupId | null) }
  // Filter เล็กเหนือกราฟสร้างจาก groups (ทั้งหมด | MT | TT | …) / หน่วยมากจนล้นให้เลื่อนภายในกล่อง
  // คืน element ที่มี .update(groups) และ .highlight(groupId)
  // ---------------------------------------------------------------------
  function barList(opts) {
    var filter = 'all';
    var groups = opts.groups || [];
    var wrap = h('div', { class: 'bar-list' });
    var chips = h('div', { class: 'bl-filter', role: 'group', 'aria-label': opts.allLabel });
    var body = h('div', { class: 'bl-body' });
    wrap.appendChild(h('div', { class: 'bl-head' }, chips, opts.tickLabel ? h('span', { class: 'bl-tick-legend' }, h('span', { class: 'bl-tick-swatch' }), opts.tickLabel) : null));
    wrap.appendChild(body);
    var groupEls = {};

    function renderChips() {
      C.clear(chips);
      [{ id: 'all', label: opts.allLabel }].concat(groups).forEach(function (g) {
        chips.appendChild(h('button', {
          type: 'button', class: 'bl-chip' + (filter === g.id ? ' is-active' : ''), title: g.title,
          'aria-pressed': filter === g.id ? 'true' : 'false',
          style: g.colorToken ? { '--c': C.tokenVar(g.colorToken) } : null,
          onClick: function () { filter = g.id; render(); }
        }, g.label));
      });
    }

    function render() {
      if (filter !== 'all' && !groups.some(function (g) { return g.id === filter; })) filter = 'all';
      renderChips();
      C.clear(body);
      groupEls = {};
      var shown = groups.filter(function (g) { return filter === 'all' || g.id === filter; });
      var max = 1;
      shown.forEach(function (g) { g.items.forEach(function (it) { max = Math.max(max, it.value || 0, it.prior || 0); }); });
      shown.forEach(function (g) {
        var items = g.items.slice().sort(function (a, b) { return (b.value || 0) - (a.value || 0); });
        var el = h('div', {
          class: 'bl-group', style: g.colorToken ? { '--c': C.tokenVar(g.colorToken) } : null,
          onMouseenter: function () { if (opts.onHover) opts.onHover(g.id); }, onMouseleave: function () { if (opts.onHover) opts.onHover(null); }
        }, h('div', { class: 'bl-group-head', title: g.title }, g.label),
        items.map(function (it) {
          var w = Math.max(0, it.value || 0) / max * 100;
          var tick = it.prior != null ? Math.max(0, it.prior) / max * 100 : null;
          return h('div', { class: 'bl-row', title: it.title || it.label },
            h('span', { class: 'bl-label' }, it.label),
            h('span', { class: 'bl-track' },
              h('span', { class: 'bl-bar', style: { width: w + '%' } }),
              tick != null ? h('span', { class: 'bl-tick', style: { left: tick + '%' } }) : null),
            h('span', { class: 'bl-text' }, it.text));
        }));
        groupEls[g.id] = el;
        body.appendChild(el);
      });
    }

    wrap.update = function (next) { groups = next || []; render(); };
    wrap.highlight = function (id) {
      Object.keys(groupEls).forEach(function (k) { groupEls[k].classList.toggle('is-hl', k === id); });
      wrap.classList.toggle('has-hl', !!id && !!groupEls[id]);
    };
    render();
    return wrap;
  }

  // ---------------------------------------------------------------------
  // แถบแบ่งเงิน: split = calc.moneySplit(sellOutExVat, gp, hasGP) / parts = ป้าย { net, gp, vat }
  // opts: { vatLabel (ป้าย VAT พร้อม %), format }
  // ---------------------------------------------------------------------
  function splitBar(split, parts, opts) {
    opts = opts || {};
    var fmt = opts.format || function (n) { return F.baht(n, 2); };
    function label(p) { return p.key === 'vat' && opts.vatLabel ? opts.vatLabel : parts[p.key]; }
    return h('div', { class: 'split' },
      h('div', { class: 'split-bar', role: 'img', 'aria-label': split.parts.map(function (p) { return label(p) + ' ' + F.pct(p.share); }).join(' · ') },
        split.parts.map(function (p) {
          return h('div', { class: 'split-part part-' + p.key, style: { width: Math.max(0, p.share * 100) + '%' }, title: label(p) + ' ' + fmt(p.value) });
        })),
      h('ul', { class: 'split-list' }, split.parts.map(function (p) {
        return h('li', null, h('span', { class: 'swatch part-' + p.key }), h('span', null, label(p)), h('strong', null, fmt(p.value)), h('span', { class: 'muted' }, F.pct(p.share)));
      })));
  }

  SP.core.charts = { donut: donut, miniBar: miniBar, barLine: barLine, hbars: hbars, barList: barList, splitBar: splitBar };
})(window.SP);

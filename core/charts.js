/*
 * core/charts.js — กราฟที่ใช้หลายหน้า (SVG/CSS ที่เขียนเอง ห้ามใช้ Library กราฟ)
 *
 * สีส่งเป็นชื่อ Token (เช่น '--ch-1') แล้วตั้งเป็น CSS Variable --c ของชิ้นนั้น ไม่มีค่าสีใน JS
 * ตัวเลขที่แสดงมาจาก calc (Module ส่งเข้ามา) กราฟคำนวณแค่ขนาดของชิ้น/แท่ง
 *
 *   niceScaleMax(values, opts) ค่าสูงสุดของสเกลร่วมทั้งตาราง (calc.niceScaleMax / opts.headroom = แกนกราฟ CR-12) / axisStart(values) จุดเริ่มแกน Waterfall
 *   vsLastYearAxis(scaleMax) แกน 0 · … · สูงสุด ล้าน ใต้หัวคอลัมน์
 *   vsLastYearBar(target, lastYear, scaleMax, { colorToken, year }) แท่งเป้าหมายเทียบปีก่อน สเกลจริงเดียวกันทั้งตาราง → .info
 *   barLine({ bars, line, dashed, months, labels, tick, endText, tip }) แท่งเป้าหมาย 12 เดือน + เส้นแผน + เส้นประยอดปีก่อน (รายงานสรุปแผน)
 *   stackedBars({ stacks, line, mode, labels, tick, tip, onLegend }) แท่งซ้อน 12 เดือน + เส้นประ (มุมมองรวมของหน้าจัดสรรเป้าหมายรายเดือน — CR-13)
 *   hbars({ items })                          แท่งแนวนอนรายการเดียว (รายงาน: สัดส่วนตามกลุ่มสินค้า)
 *   splitBar(split, parts, opts)           แถบแบ่งเงิน Net Sales / GP / VAT (calc.moneySplit)
 *   waterfall({ start, steps, end, format, signed, tick, axisNote, onHover }) ที่มาของการเติบโต แนวนอน (รายงาน) → .info, .update(o), .highlight(id)
 *   stackedShare({ rows, legend, minLabel, onHover })    แท่ง 100% แนวนอน (สัดส่วน Channel ปีก่อนเทียบปีนี้) → .update(rows, legend), .highlight(id)
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
  // แท่งเป้าหมายเทียบปีก่อน (CR-10 ข้อ 3.4 ฉบับแก้ไข): สเกลจริงเดียวกันทั้งตาราง เริ่มที่ 0 — ความยาวแท่งเป็นสัดส่วนกับเป้าหมายจริง
  //   scaleMax = niceScaleMax(เป้าหมายและยอดปีก่อนของทุกแถว รวมแถวที่พับอยู่) / แท่ง = เป้าหมาย ÷ scaleMax / ขีดตั้ง = ยอดปีก่อน ÷ scaleMax
  //   เส้นแกนจางที่ 1/3 และ 2/3 ทุกแถว (ตรงกับแกนใต้หัวคอลัมน์) / ไม่มียอดปีก่อน = แท่งไม่มีขีด + ป้าย "ใหม่" / เป้าหมาย 0 = มีเฉพาะขีด
  // opts: { colorToken (สี Channel), year (ปีของยอดขายปีก่อน ใช้ใน Tooltip) } → element ที่มี .info (ผลจาก calc.vsLastYear)
  // ---------------------------------------------------------------------
  function niceScaleMax(values, opts) { return SP.core.calc.niceScaleMax(values, opts); }
  // จุดเริ่มแกน Waterfall เป็นเลขกลม (CR-12 · calc.axisStart ค่าขั้นอยู่ใน settings.AXIS_START_RULES)
  function axisStart(values) { return SP.core.calc.axisStart(values); }

  function pctStyle(v) { return Math.round(v * 100000) / 1000 + '%'; }

  // ป้ายแกนเป็นล้านบาท (ใช้กับ tick ของ barLine / waterfall / stackedBars): ขั้นเต็มล้าน = ไม่มีทศนิยม / ขั้น 2.5 ล้าน = 1 ตำแหน่ง / 0 = "0"
  function millionTick(v, step) {
    if (!v) return '0';
    var s = step / 1e6;
    var d = Math.abs(s - Math.round(s)) < 1e-9 ? 0 : Math.abs(s * 10 - Math.round(s * 10)) < 1e-9 ? 1 : 2;
    return F.number(v / 1e6, d);
  }

  function vsLastYearBar(target, lastYear, scaleMax, opts) {
    opts = opts || {};
    var L = SP.data.content.labels;
    var V = L.vsLastYear;
    var r = SP.core.calc.vsLastYear(target, lastYear, scaleMax);
    var title = r.isNew
      ? C.fill(V.newTip, { year: opts.year || '', target: F.baht(target) })
      : C.fill(V.tip, { target: F.baht(target), year: opts.year || '', prior: F.baht(lastYear), pct: r.growth == null || isNaN(r.growth) ? '–' : F.signedPct(r.growth, 1) });
    var el = h('span', { class: 'vly' + (r.isNew ? ' is-new' : ''), title: title, style: opts.colorToken ? { '--c': C.tokenVar(opts.colorToken) } : null },
      h('span', { class: 'vly-track' },
        r.bar > 0 ? h('span', { class: 'vly-bar', style: { width: pctStyle(r.bar) } }) : null,
        r.tick != null ? h('span', { class: 'vly-tick', style: { left: pctStyle(r.tick) } }) : null,
        r.isNew ? h('span', { class: 'vly-new', style: { left: 'min(calc(' + pctStyle(r.bar) + ' + 4px), calc(100% - 3.2em))' } }, V.newTag) : null));
    el.info = r;
    return el;
  }

  // แกนเล็กใต้ชื่อคอลัมน์: 0 · 20 · 40 · 60 ล้าน (calc.scaleTicks แบ่ง 3 ช่วง) ตำแหน่งตรงกับเส้นแกนจางในทุกแถว
  function vsLastYearAxis(scaleMax) {
    var V = SP.data.content.labels.vsLastYear;
    var ticks = SP.core.calc.scaleTicks(scaleMax, 3);
    return h('span', { class: 'vly-axis', 'aria-hidden': 'true' }, ticks.map(function (v, i) {
      var m = v / 1e6;
      var text = F.number(m, Math.abs(m - Math.round(m)) < 0.005 ? 0 : 1) + (i === ticks.length - 1 ? ' ' + V.axisUnit : '');
      return h('span', { class: 'vly-axis-tick' + (i === 0 ? ' is-first' : i === ticks.length - 1 ? ' is-last' : ''), style: { left: pctStyle(i / (ticks.length - 1)) } }, text);
    }));
  }

  // ---------------------------------------------------------------------
  // แท่ง 12 เดือน + เส้นแผน + เส้นประยอดปีก่อน (CR-12) — ทุกชุดใช้สเกลเดียวกัน แกน Y เริ่มที่ 0
  //   ค่าสูงสุดของแกน = ค่ามากที่สุดของ 3 ชุด × (1 + CHART_HEADROOM) ปัดขึ้นเป็นเลขกลม (calc.niceScaleMax + calc.niceAxis 4–6 เส้น)
  //   เป้าหมาย = แท่งสีอ่อน (--chart-target) · แผน = เส้นทึบ 3px มีจุดทุกเดือน (--chart-plan) · ยอดปีก่อน = เส้นประ 1.5px ไม่มีจุด (--chart-lastyear)
  //   ป้ายท้ายเส้นที่เดือนสุดท้าย (ชนกันเลื่อนขึ้น/ลง) · Legend ใช้สัญลักษณ์เดียวกับที่วาด · Hover เดือน = Tooltip ของเดือน
  //   วาดด้วย HTML (แกน แท่ง จุด ป้าย) + SVG เฉพาะเส้น (non-scaling-stroke) จึงยืดตามกล่องได้โดยตัวอักษรไม่เปลี่ยนขนาด
  // o = { bars: [12], line: [12], dashed: [12], months: [ป้าย 12 เดือน], labels: { bar, line, dashed, lineEnd, dashedEnd },
  //       tick(v, step) → ป้ายแกน Y, endText(v) → ตัวเลขท้ายเส้น, tip(m) → [[ป้าย, ค่า]] (Tooltip ของเดือน) }
  // → element ที่มี .info = { top, step, ticks }
  // ---------------------------------------------------------------------
  function barLine(o) {
    var S = SP.data.settings;
    var calc = SP.core.calc;
    var all = [].concat(o.bars || [], o.line || [], o.dashed || []).filter(function (v) { return typeof v === 'number' && isFinite(v); });
    var axis = calc.niceAxis(0, calc.niceScaleMax(all, { headroom: S.CHART_HEADROOM }) || 1);
    var top = axis.end;
    function x(m) { return (m + 0.5) / 12 * 100; }
    function y(v) { return (1 - Math.max(0, v || 0) / top) * 100; }
    function pct(v) { return Math.round(v * 1000) / 1000 + '%'; }
    var tick = o.tick || function (v) { return F.number(v); };
    var plot = h('div', { class: 'barline-plot' });
    var yAxis = h('div', { class: 'barline-yaxis', 'aria-hidden': 'true' });
    axis.ticks.forEach(function (v) {
      plot.appendChild(h('span', { class: 'barline-grid' + (v === 0 ? ' is-base' : ''), style: { top: pct(y(v)) } }));
      yAxis.appendChild(h('span', { class: 'barline-tick', style: { top: pct(y(v)) } }, tick(v, axis.step)));
    });
    var bands = [];
    (o.bars || []).forEach(function (v, m) {
      var band = h('span', { class: 'barline-band', style: { left: pct(m / 12 * 100), width: pct(100 / 12) } });
      bands.push(band);
      plot.appendChild(band);
      plot.appendChild(h('span', { class: 'barline-bar', style: { left: pct((m + 0.2) / 12 * 100), width: pct(0.6 / 12 * 100), top: pct(y(v)) } }));
    });
    var lines = svg('svg', { class: 'barline-lines', viewBox: '0 0 1200 1000', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
    function path(values, cls) {
      if (!values) return;
      var d = values.map(function (v, m) { return (m ? 'L' : 'M') + (x(m) * 12).toFixed(1) + ' ' + (y(v) * 10).toFixed(1); }).join(' ');
      lines.appendChild(svg('path', { d: d, class: cls, fill: 'none', 'vector-effect': 'non-scaling-stroke' }));
    }
    path(o.dashed, 'barline-dashed');
    path(o.line, 'barline-line');
    plot.appendChild(lines);
    (o.line || []).forEach(function (v, m) { plot.appendChild(h('span', { class: 'barline-dot', style: { left: pct(x(m)), top: pct(y(v)) } })); });
    // ป้ายท้ายเส้น (เดือนสุดท้าย): ห่างกันไม่ถึง END_GAP% ของความสูง → แยกขึ้น/ลงจากจุดกึ่งกลาง (ค่ามากอยู่บน)
    var END_GAP = 9;
    var ends = [];
    if (o.line) ends.push({ cls: 'is-line', text: o.labels.lineEnd + ' ' + (o.endText || tick)(o.line[11]), y: y(o.line[11]) });
    if (o.dashed) ends.push({ cls: 'is-dashed', text: o.labels.dashedEnd + ' ' + (o.endText || tick)(o.dashed[11]), y: y(o.dashed[11]) });
    if (ends.length === 2 && Math.abs(ends[0].y - ends[1].y) < END_GAP) {
      var mid = (ends[0].y + ends[1].y) / 2;
      var upper = ends[0].y <= ends[1].y ? 0 : 1;
      ends[upper].y = mid - END_GAP / 2;
      ends[1 - upper].y = mid + END_GAP / 2;
    }
    var endCol = h('div', { class: 'barline-ends' }, ends.map(function (e) {
      return h('span', { class: 'barline-end ' + e.cls, style: { top: pct(Math.max(3, Math.min(97, e.y))) } }, e.text);
    }));
    // ช่อง Hover ต่อเดือน (บนสุด) → Tooltip + ไฮไลต์คอลัมน์
    var hits = h('div', { class: 'barline-hits' }, (o.months || []).map(function (mn, m) {
      return h('span', { class: 'barline-hit', dataset: { m: String(m) }, tabindex: '0', 'aria-label': mn, style: { left: pct(m / 12 * 100), width: pct(100 / 12) } });
    }));
    plot.appendChild(hits);
    var months = h('div', { class: 'barline-months', 'aria-hidden': 'true' }, (o.months || []).map(function (mn) { return h('span', null, mn); }));
    function swatch(kind) {
      var s = svg('svg', { class: 'barline-sym', viewBox: '0 0 28 14', 'aria-hidden': 'true' });
      if (kind === 'bar') s.appendChild(svg('rect', { x: 8, y: 1, width: 12, height: 12, class: 'barline-sym-bar' }));
      if (kind === 'line') { s.appendChild(svg('path', { d: 'M1 7 L27 7', class: 'barline-line' })); s.appendChild(svg('circle', { cx: 14, cy: 7, r: 3.5, class: 'barline-sym-dot' })); }
      if (kind === 'dashed') s.appendChild(svg('path', { d: 'M1 7 L27 7', class: 'barline-dashed' }));
      return s;
    }
    var wrap = h('div', { class: 'barline', role: 'img', 'aria-label': [o.labels.bar, o.labels.line, o.labels.dashed].filter(Boolean).join(' · ') },
      h('div', { class: 'barline-body' }, yAxis, h('div', { class: 'barline-main' }, plot, months), endCol),
      h('div', { class: 'legend barline-legend' },
        h('span', { class: 'legend-item' }, swatch('bar'), o.labels.bar),
        o.line ? h('span', { class: 'legend-item' }, swatch('line'), o.labels.line) : null,
        o.dashed ? h('span', { class: 'legend-item' }, swatch('dashed'), o.labels.dashed) : null));
    if (o.tip) {
      C.hoverTip(hits, '.barline-hit', function (el) {
        var m = Number(el.dataset.m);
        return h('div', { class: 'barline-tip' }, h('strong', null, o.months[m]),
          h('table', { class: 'tip-table' }, h('tbody', null, o.tip(m).map(function (r) { return h('tr', null, h('td', null, r[0]), h('td', { class: 'num' }, r[1])); }))));
      });
      hits.addEventListener('mouseover', function (e) {
        var t = e.target.closest ? e.target.closest('.barline-hit') : null;
        bands.forEach(function (b, i) { b.classList.toggle('is-hl', !!t && Number(t.dataset.m) === i); });
      });
      hits.addEventListener('mouseleave', function () { bands.forEach(function (b) { b.classList.remove('is-hl'); }); });
    }
    wrap.info = { top: top, step: axis.step, ticks: axis.ticks };
    return wrap;
  }

  // ---------------------------------------------------------------------
  // แท่งซ้อน 12 เดือน + เส้นประยอดปีก่อน (CR-13 มุมมองรวมของหน้าจัดสรรเป้าหมายรายเดือน)
  //   Grid คอลัมน์เดียวกับตารางใต้กราฟ (ป้าย | 12 เดือน | รวม — ความกว้างจาก CSS ของหน้า) ช่องป้าย = แกน Y
  // o = { stacks: [{ id, label, colorToken, shade (0–1 ความเข้มของสี), values: [12] }], line: [12] | null,
  //       mode: 'stack' (ซ้อนตามชุด) | 'total' (แท่งเดียว = ผลรวม), totalToken (สีแท่งรวม), labels: { total, line },
  //       tick(v, step) → ป้ายแกน, tip(m) → [[ป้าย, ค่า]] (Tooltip ของเดือน), onLegend(id) (กดชื่อใน Legend), legendTip(label) }
  //   แกน Y เริ่ม 0 ค่าสูงสุด = niceScaleMax(ผลรวมรายเดือน + เส้น, { headroom: CHART_HEADROOM }) → .info = { top, step, ticks }
  // ---------------------------------------------------------------------
  function stackedBars(o) {
    var S = SP.data.settings;
    var calc = SP.core.calc;
    var totals = [];
    for (var m = 0; m < 12; m++) totals.push(calc.sum(o.stacks.map(function (s) { return Math.max(0, s.values[m] || 0); })));
    var axis = calc.niceAxis(0, calc.niceScaleMax(totals.concat(o.line || []), { headroom: S.CHART_HEADROOM }) || 1);
    var top = axis.end;
    function hgt(v) { return Math.round(Math.max(0, v || 0) / top * 100000) / 1000 + '%'; }
    function shade(s) { return { '--c': C.tokenVar(s.colorToken), '--shade': Math.round((s.shade == null ? 1 : s.shade) * 100) + '%' }; }
    var tick = o.tick || function (v) { return F.number(v); };
    var grid = h('div', { class: 'sbc-grid' });
    grid.appendChild(h('div', { class: 'sbc-axis', 'aria-hidden': 'true', style: { gridColumn: '1', gridRow: '1' } }, axis.ticks.map(function (v) {
      return h('span', { class: 'sbc-tick', style: { bottom: hgt(v) } }, tick(v, axis.step));
    })));
    grid.appendChild(h('div', { class: 'sbc-lines', 'aria-hidden': 'true', style: { gridColumn: '2 / 14', gridRow: '1' } }, axis.ticks.map(function (v) {
      return h('span', { class: 'sbc-gridline' + (v === 0 ? ' is-base' : ''), style: { bottom: hgt(v) } });
    })));
    totals.forEach(function (t, i) {
      var stack = h('div', { class: 'sbc-stack', style: { height: hgt(t) } });
      if (o.mode === 'total') stack.appendChild(h('span', { class: 'sbc-seg is-total', style: { flexGrow: '1', '--c': C.tokenVar(o.totalToken || '--c-bar'), '--shade': '100%' } }));
      else o.stacks.forEach(function (s) {
        var v = Math.max(0, s.values[i] || 0);
        if (v > 0) stack.appendChild(h('span', { class: 'sbc-seg', dataset: { id: s.id }, style: Object.assign({ flexGrow: String(v) }, shade(s)) }));
      });
      grid.appendChild(h('div', { class: 'sbc-col', dataset: { m: String(i) }, tabindex: '0', 'aria-label': F.monthFull(i), style: { gridColumn: String(i + 2), gridRow: '1' } }, stack));
    });
    if (o.line) {
      var svgEl = svg('svg', { class: 'sbc-line', viewBox: '0 0 1200 1000', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
      svgEl.appendChild(svg('path', {
        d: o.line.map(function (v, i) { return (i ? 'L' : 'M') + ((i + 0.5) / 12 * 1200).toFixed(1) + ' ' + ((1 - Math.max(0, v || 0) / top) * 1000).toFixed(1); }).join(' '),
        class: 'barline-dashed', fill: 'none', 'vector-effect': 'non-scaling-stroke'
      }));
      grid.appendChild(h('div', { class: 'sbc-line-layer', style: { gridColumn: '2 / 14', gridRow: '1' } }, svgEl));
    }
    function sym(kind, s) {
      var el = svg('svg', { class: 'barline-sym', viewBox: '0 0 28 14', 'aria-hidden': 'true' });
      if (kind === 'line') el.appendChild(svg('path', { d: 'M1 7 L27 7', class: 'barline-dashed' }));
      return kind === 'line' ? el : h('span', { class: 'sbc-swatch', style: s ? shade(s) : { '--c': C.tokenVar(o.totalToken || '--c-bar'), '--shade': '100%' } });
    }
    var items = o.mode === 'total'
      ? [h('span', { class: 'legend-item' }, sym('bar'), o.labels.total)]
      : o.stacks.map(function (s) {
        var body = [sym('bar', s), s.label];
        return o.onLegend
          ? h('button', { type: 'button', class: 'legend-item sbc-legend-btn', title: o.legendTip ? o.legendTip(s.label) : s.label, onClick: function () { o.onLegend(s.id); } }, body)
          : h('span', { class: 'legend-item' }, body);
      });
    if (o.line) items.push(h('span', { class: 'legend-item' }, sym('line'), o.labels.line));
    var wrap = h('div', { class: 'sbc' }, grid, h('div', { class: 'legend sbc-legend' }, items));
    if (o.tip) {
      C.hoverTip(grid, '.sbc-col', function (el) {
        var i = Number(el.dataset.m);
        return h('div', { class: 'barline-tip' }, h('strong', null, F.monthFull(i)),
          h('table', { class: 'tip-table' }, h('tbody', null, o.tip(i).map(function (r) { return h('tr', null, h('td', null, r[0]), h('td', { class: 'num' }, r[1])); }))));
      });
    }
    wrap.info = { top: top, step: axis.step, ticks: axis.ticks, totals: totals };
    return wrap;
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

  // ---------------------------------------------------------------------
  // Waterfall แนวนอน: แท่งแรก = ยอดเริ่มต้น → แท่งส่วนต่างต่อรายการ (เพิ่ม = เขียว ลด = แดง ลอยต่อจากยอดสะสม) → แท่งสุดท้าย = ยอดปลายทาง
  // o = { start: { label, value }, steps: [{ id, label, value (ส่วนต่าง), tag (เช่น "ใหม่"), title }], end: { label, value },
  //       format(n) → ข้อความตัวเลข, signed(n) → ข้อความมีเครื่องหมาย, tick(v, step) → ป้ายแกน,
  //       axisNote(lo) → ข้อความใต้กราฟเมื่อแกนไม่เริ่มที่ 0, onHover(id | null) }
  // แกน (CR-12): เริ่มที่เลขกลม calc.axisStart(ยอดปีก่อน, ยอดสะสมทุกขั้น, Total) — แท่งยอดรวมทั้งสองเริ่มที่จุดเดียวกัน (ขอบซ้ายของแกน)
  //   ปลายแกน = ยอดสะสมสูงสุดปัดขึ้น (calc.niceAxis 4–6 เส้น) + ตัวเลขใต้แกน / แกนไม่เริ่มที่ 0 = สัญลักษณ์ตัดแกน + ข้อความใต้กราฟ
  // → element ที่มี .info = { start, end, step, ticks }, .update(o), .highlight(id)
  // ---------------------------------------------------------------------
  function waterfall(o) {
    var wrap = h('div', { class: 'wfc' });
    var nodes = {};
    var current = null;
    function hover(id) { if (o.onHover) o.onHover(id); }
    function render(opts) {
      o = opts;
      clearNode(wrap);
      nodes = {};
      var calc = SP.core.calc;
      var run = o.start.value || 0;
      var points = [run];
      var steps = o.steps.map(function (s) {
        var from = run, to = run + (s.value || 0);
        run = to;
        points.push(to);
        return { s: s, from: from, to: to };
      });
      points.push(o.end.value || 0);
      var lo = calc.axisStart(points);
      var axis = calc.niceAxis(lo, Math.max.apply(null, points));
      var hi = axis.end;
      function pos(v) { return Math.max(0, Math.min(100, (v - lo) / (hi - lo) * 100)); }
      function pct(v) { return Math.round(v * 1000) / 1000 + '%'; }
      function grid() { return axis.ticks.map(function (v) { return h('span', { class: 'wfc-grid', style: { left: pct(pos(v)) } }); }); }
      function row(cls, id, label, from, to, text, tag, title) {
        var left = pos(Math.min(from, to)), width = Math.max(0.6, Math.abs(pos(to) - pos(from)));
        var r = h('div', { class: 'wfc-row ' + cls, dataset: id ? { id: id } : null, title: title || null },
          h('span', { class: 'wfc-label' }, label, tag ? h('span', { class: 'badge tag-muted wfc-tag' }, tag) : null),
          h('span', { class: 'wfc-track' }, grid(), h('span', { class: 'wfc-bar', style: { left: pct(left), width: pct(width) } })),
          h('span', { class: 'wfc-value' }, text));
        if (id) {
          r.addEventListener('mouseenter', function () { hover(id); });
          r.addEventListener('mouseleave', function () { hover(null); });
          nodes[id] = r;
        }
        wrap.appendChild(r);
      }
      row('is-total is-start', null, o.start.label, lo, o.start.value || 0, o.format(o.start.value || 0), null, o.start.title);
      steps.forEach(function (x) {
        row(x.to >= x.from ? 'is-up' : 'is-down', x.s.id, x.s.label, x.from, x.to, o.signed(x.s.value || 0), x.s.tag, x.s.title);
      });
      row('is-total is-end', null, o.end.label, lo, o.end.value || 0, o.format(o.end.value || 0), null, o.end.title);
      // แกนใต้กราฟ: ตัวเลขทุกเส้นแบ่ง + สัญลักษณ์ตัดแกนที่ต้นแกน (เมื่อไม่เริ่มที่ 0)
      var tick = o.tick || function (v) { return F.number(v); };
      var brk = null;
      if (lo > 0) {
        brk = svg('svg', { class: 'wfc-break', viewBox: '0 0 12 12', 'aria-hidden': 'true' });
        brk.appendChild(svg('path', { d: 'M0 6 L2 2 L5 10 L8 2 L10 6 L12 6', fill: 'none' }));
      }
      wrap.appendChild(h('div', { class: 'wfc-row wfc-axis-row', 'aria-hidden': 'true' }, h('span'),
        h('span', { class: 'wfc-axis-track' }, brk, axis.ticks.map(function (v, i) {
          return h('span', { class: 'wfc-axis-tick' + (i === 0 ? ' is-first' : i === axis.ticks.length - 1 ? ' is-last' : ''), style: { left: pct(pos(v)) } }, tick(v, axis.step));
        })), h('span')));
      if (o.axisNote && lo > 0) wrap.appendChild(h('p', { class: 'wfc-axis' }, o.axisNote(lo)));
      wrap.info = { start: lo, end: hi, step: axis.step, ticks: axis.ticks };
      if (current) highlight(current);
    }
    function highlight(id) {
      current = id;
      Object.keys(nodes).forEach(function (k) { nodes[k].classList.toggle('is-hl', k === id); });
      wrap.classList.toggle('has-hl', !!id && !!nodes[id]);
    }
    render(o);
    wrap.update = render;
    wrap.highlight = highlight;
    return wrap;
  }

  // ---------------------------------------------------------------------
  // แท่ง 100% แนวนอน
  // rows = [{ label, parts: [{ id, value (สัดส่วน 0–1), colorToken, title }] }] / legend = [{ id, label, colorToken }]
  // ป้าย % ในช่วงที่กว้างอย่างน้อย minLabel (ค่าตั้งต้น 6%) / onHover(id | null)
  // ---------------------------------------------------------------------
  function stackedShare(o) {
    var wrap = h('div', { class: 'ssc' });
    var nodes = {};
    var current = null;
    function render(rows, legend) {
      clearNode(wrap);
      nodes = {};
      rows.forEach(function (r) {
        var bar = h('span', { class: 'ssc-bar', role: 'img', 'aria-label': r.label + ' · ' + r.parts.map(function (p) { return (p.title || p.id) + ' ' + F.pct(p.value, 0); }).join(', ') });
        r.parts.forEach(function (p) {
          if (!(p.value > 0)) return;
          var seg = h('span', { class: 'ssc-seg', dataset: { id: p.id }, title: p.title || null, style: { width: p.value * 100 + '%', '--c': C.tokenVar(p.colorToken) } },
            p.value >= (o.minLabel == null ? 0.06 : o.minLabel) ? h('span', { class: 'ssc-text' }, F.pct(p.value, 0)) : null);
          seg.addEventListener('mouseenter', function () { if (o.onHover) o.onHover(p.id); });
          seg.addEventListener('mouseleave', function () { if (o.onHover) o.onHover(null); });
          (nodes[p.id] = nodes[p.id] || []).push(seg);
          bar.appendChild(seg);
        });
        wrap.appendChild(h('div', { class: 'ssc-row' }, h('span', { class: 'ssc-label' }, r.label), bar));
      });
      wrap.appendChild(h('div', { class: 'legend ssc-legend' }, (legend || []).map(function (l) {
        var it = h('span', { class: 'legend-item', dataset: { id: l.id } }, h('span', { class: 'swatch', style: { '--c': C.tokenVar(l.colorToken) } }), l.label);
        it.addEventListener('mouseenter', function () { if (o.onHover) o.onHover(l.id); });
        it.addEventListener('mouseleave', function () { if (o.onHover) o.onHover(null); });
        return it;
      })));
      if (current) highlight(current);
    }
    function highlight(id) {
      current = id;
      Object.keys(nodes).forEach(function (k) { nodes[k].forEach(function (n) { n.classList.toggle('is-hl', k === id); }); });
      wrap.classList.toggle('has-hl', !!id && !!nodes[id]);
    }
    render(o.rows, o.legend);
    wrap.update = render;
    wrap.highlight = highlight;
    return wrap;
  }

  function clearNode(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  SP.core.charts = { niceScaleMax: niceScaleMax, axisStart: axisStart, millionTick: millionTick, stackedBars: stackedBars, vsLastYearBar: vsLastYearBar, vsLastYearAxis: vsLastYearAxis, barLine: barLine, hbars: hbars, splitBar: splitBar, waterfall: waterfall, stackedShare: stackedShare };
})(window.SP);

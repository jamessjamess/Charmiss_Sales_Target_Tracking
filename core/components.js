/*
 * core/components.js — UI ที่ใช้หลายหน้า (สไตล์อยู่ที่ styles/components.css)
 *
 * ทุกฟังก์ชันคืน DOM element ไม่มีสีใน JS ใช้ class ที่ผูกกับ CSS Variables ใน tokens.css
 * (สี Channel/คน ส่งเป็นชื่อ Token เช่น style="--c: var(--ch-1)" ไม่มีค่าสีใน JS)
 * ตัวเลขทั้งหมดมาจาก SP.core.calc ห้ามคำนวณใน Component
 *
 *   h(tag, props, ...children) / clear / fill(ข้อความ, { ค่า })
 *   Badge และ Legend: alertBadge, statusBadge, sourceChip, legend, wfIcon, wfBadge
 *   remainingBar, table, numberInput, percentAmountInput, accountPicker, growthText,
 *   select, segmented, card, callout, approveBox, barChart, searchSelect
 *   subChannelPicker (Channel | หน่วยแบ่งเป้า ‹ › | ผู้รับผิดชอบปัจจุบัน) ใช้ร่วมกันหน้า Phasing และวางแผน SKU
 *   ownerInfo, ownerStrip (แถบผู้รับผิดชอบรายเดือน), personColor
 *   workflowBar (สถานะ + ปุ่มแก้ไข/บันทึก/ส่ง/อนุมัติ ที่หัวหน้า), editBanner, guardUnsaved, confirmDiscard,
 *   planYearPicker (ปีแผนต่อท้ายชื่อหน้า — layout ใส่ให้หน้าที่ registry ตั้ง year: true)
 *   dialog (กล่องยืนยัน), popover, menuButton, seriesFilter, rulesContent, rulesPanel, rulesButton
 *   calcExplainer (ⓘ วิธีคำนวณ), cellBreakdown (Tooltip รายช่อง), bindArrowNav
 *   Product Master: productThumb (รูปย่อ / ตัวอักษรย่อของ Series), resizeImage (ย่อรูปด้วย Canvas), completenessBadge,
 *   statusStrip (เส้นเวลา Status 12 เดือน), cascadeSelect (Dropdown หมวดสินค้า/Series แบบลำดับชั้น), drawer (แผงด้านขวา),
 *   hoverTip (Tooltip ทั่วไป), choiceDialog, exportButton (ส่งออก ▾ Excel / CSV ผ่าน SP.core.export), priorLabel (ยอดขายปี {ปี} ⓘ)
 *   CR-11: gridKeys (คีย์บอร์ด เลือกช่วง คัดลอก/วางกับ Excel เติมลง/ขวา ล้างค่า ย้อนกลับ ไฮไลต์แถวและคอลัมน์ ของตารางกรอกตัวเลข),
 *   undoStack (ประวัติสำหรับ Ctrl+Z ภายในรอบแก้ไข), promptNumber (กล่องกรอกตัวเลข), dialog opts.body (เนื้อหาเพิ่มเติม)
 */
(function (SP) {
  'use strict';

  var F = SP.core.format;

  function labels() { return SP.data.content.labels; }

  // ---------------------------------------------------------------------
  // DOM helper
  // ---------------------------------------------------------------------
  var PROPS = { value: 1, checked: 1, disabled: 1, selected: 1, hidden: 1 };

  function append(el, child) {
    if (child == null || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (c) { append(el, c); }); return; }
    el.appendChild(child.nodeType ? child : document.createTextNode(String(child)));
  }

  function h(tag, props) {
    var el = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v == null || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'style') Object.keys(v).forEach(function (s) { if (s.indexOf('--') === 0) el.style.setProperty(s, v[s]); else el.style[s] = v[s]; });
        else if (k === 'dataset') Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; });
        else if (k.indexOf('on') === 0 && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (PROPS[k]) el[k] = v;
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }

  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  // เติม {ชื่อ} ในข้อความ
  function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? vars[k] : ''; });
  }

  // สีจาก Token: 'var(--ch-1)' (ใช้กับ style: { '--c': tokenVar(...) })
  function tokenVar(token) { return 'var(' + token + ')'; }

  // ---------------------------------------------------------------------
  // Badge และ Legend
  // ---------------------------------------------------------------------

  // ข้อความสถานะคงเหลือ: 'จัดสรรครบ' / 'ขาด 9,570,000' / 'เกิน 5,090,000' / 'ยังไม่กำหนด' (ไม่ใช้ตัวย่อ "ล.")
  // format = รูปแบบตัวเลข (ค่าตั้งต้นบาทเต็มจำนวน) ตัวเลขเป็นค่าบวกเสมอ ทิศทางบอกด้วยคำว่า ขาด / เกิน
  function remainingText(rem, format) {
    var fmt = format || F.baht;
    return fill(labels().remainingText[rem.status], { amount: fmt(Math.abs(rem.amount)) });
  }

  // Chip สถานะคงเหลือ (ใช้เฉพาะที่พื้นที่จำกัด เช่น รายการใน Dropdown) มีข้อความในตัวเสมอ
  // rem = ผลจาก calc.remaining() / opts: { format }
  function alertBadge(rem, opts) {
    opts = opts || {};
    return h('span', { class: 'badge alert-' + rem.status, title: labels().remaining + ' · ' + remainingText(rem) }, remainingText(rem, opts.format));
  }

  // ---------------------------------------------------------------------
  // แถวคงเหลือ (แทน Chip ในตาราง) ท้ายกลุ่มที่ต้องรวมให้ครบ
  // opts: { rem (calc.remaining), label (ค่าตั้งต้น "คงเหลือ"), tag: 'tr' | 'div' (div = display: contents ใน CSS Grid),
  //         cells: [{ text | node, className, colspan, title }] ตัวเลขอยู่ในคอลัมน์เดียวกับตัวเลขที่ต้องปรับ,
  //         labelColspan, className }
  // ป้ายซ้าย = label + สถานะเป็นข้อความ (ขาด / เกิน / จัดสรรครบ / ยังไม่กำหนด) · พื้นแถวสีอ่อนตามสถานะ
  // ---------------------------------------------------------------------
  function remainingRow(opts) {
    var L = labels();
    var rem = opts.rem;
    var tag = opts.tag || 'tr';
    var cellTag = tag === 'tr' ? 'td' : 'div';
    var labelCell = h(tag === 'tr' ? 'th' : 'div', {
      class: 'rem-label', scope: tag === 'tr' ? 'row' : null, colspan: opts.labelColspan ? String(opts.labelColspan) : null
    }, h('span', { class: 'rem-title' }, opts.label || L.remaining), h('span', { class: 'rem-status text-' + rem.status }, L.alert[rem.status]));
    var row = h(tag, { class: 'remaining-row rem-' + rem.status + (opts.className ? ' ' + opts.className : '') }, labelCell,
      (opts.cells || []).map(function (c) {
        return h(cellTag, { class: 'rem-cell ' + (c.className || ''), colspan: c.colspan ? String(c.colspan) : null, title: c.title }, c.node || c.text);
      }));
    return row;
  }

  // ตัวเลขในแถวคงเหลือ (ค่าบวก) — ยังไม่กำหนด = '–'
  function remainingAmount(rem, format) { return rem.status === 'empty' ? '–' : (format || F.baht)(Math.abs(rem.amount)); }
  function remainingPct(rem) { return rem.status === 'empty' ? '–' : F.pct(Math.abs(rem.pct), 2); }

  // Status สินค้า (calc.productStatus): planned | new | active | clearance | discontinued — สีจาก class st-<status>
  function statusBadge(status, suffix) {
    return h('span', { class: 'badge st-' + status }, labels().status[status] + (suffix ? ' ' + suffix : ''));
  }

  function sourceChip(source) {
    return h('span', { class: 'chip src-' + source }, labels().source[source]);
  }

  // items = [{ className, label }]
  function legend(items) {
    return h('div', { class: 'legend' }, items.map(function (it) {
      return h('span', { class: 'legend-item' }, h('span', { class: 'swatch ' + it.className }), it.label);
    }));
  }

  // ไอคอนเล็กของสถานะ Workflow (มี title + aria-label บอกชื่อสถานะ)
  function wfIcon(status) {
    var W = labels().workflow;
    return h('span', { class: 'wf-icon wf-' + status, title: W.status[status], 'aria-label': W.status[status] }, W.icon[status]);
  }

  function wfBadge(status) {
    var W = labels().workflow;
    return h('span', { class: 'badge wf-badge wf-' + status }, W.icon[status] + ' ' + W.status[status]);
  }

  // ---------------------------------------------------------------------
  // แถบ Remaining
  // ---------------------------------------------------------------------

  // rem = calc.remaining(target, allocated) / opts: { format, allocatedLabel, compact }
  // compact = แถบบาง + Badge บรรทัดเดียว (ไม่มีข้อความ "แบ่งแล้ว ... จาก ...")
  function remainingBar(rem, opts) {
    opts = opts || {};
    var fmt = opts.format || F.baht;
    var L = labels();
    var ratio = rem.target ? rem.allocated / rem.target : 0;
    var fillPct = Math.max(0, Math.min(1, ratio)) * 100;
    if (opts.compact) {
      return h('div', { class: 'remaining is-compact', title: (opts.allocatedLabel || L.allocated) + ' ' + fmt(rem.allocated) + ' ' + L.of + ' ' + fmt(rem.target) + ' (' + F.pct(ratio) + ')' },
        h('div', { class: 'remaining-track' }, h('div', { class: 'remaining-fill alert-' + rem.status, style: { width: fillPct + '%' } })),
        alertBadge(rem, { format: fmt }));
    }
    return h('div', { class: 'remaining' },
      h('div', { class: 'remaining-track', role: 'img', 'aria-label': F.pct(ratio) },
        h('div', { class: 'remaining-fill alert-' + rem.status, style: { width: fillPct + '%' } })),
      h('div', { class: 'remaining-text' },
        h('span', null, (opts.allocatedLabel || L.allocated) + ' ', h('strong', null, fmt(rem.allocated)),
          ' ' + L.of + ' ' + fmt(rem.target) + ' (' + F.pct(ratio) + ')'),
        h('span', { class: 'remaining-value' }, L.remaining + ' ', alertBadge(rem, { format: fmt })))
    );
  }

  // ---------------------------------------------------------------------
  // ตาราง
  // ---------------------------------------------------------------------

  // columns = [{ label, key, render(row, i), className }] / opts: { className, caption }
  function table(columns, rows, opts) {
    opts = opts || {};
    return h('div', { class: 'table-scroll' },
      h('table', { class: 'data-table ' + (opts.className || '') },
        opts.caption ? h('caption', null, opts.caption) : null,
        h('thead', null, h('tr', null, columns.map(function (c) {
          return h('th', { class: c.className, scope: 'col' }, c.label);
        }))),
        h('tbody', null, rows.map(function (r, i) {
          return h('tr', null, columns.map(function (c) {
            var v = c.render ? c.render(r, i) : r[c.key];
            return h('td', { class: c.className }, v);
          }));
        }))
      )
    );
  }

  // ---------------------------------------------------------------------
  // ช่องกรอกและตัวเลือก
  // ---------------------------------------------------------------------

  // รับได้ทั้งมีและไม่มีจุลภาค เช่น '18,900,000' / '18900000' / '40%'
  function parseNumber(str) {
    var s = String(str).replace(/[,\s%฿]/g, '').replace(/−/g, '-');
    var v = Number(s);
    return s === '' || isNaN(v) ? null : v;
  }

  // commit = ส่งค่าเมื่อกด Enter หรือออกจากช่อง (blur) แทนการส่งทุกครั้งที่พิมพ์
  function onCommit(input, fn) {
    var last = null;
    // จำค่าหลัง fn() เพราะ fn อาจจัดรูปแบบตัวเลขในช่องใหม่ (เช่น 40 → 40.00) ไม่ให้ blur ส่งซ้ำ
    function fire() { if (input.value !== last) { fn(); last = input.value; } }
    input.addEventListener('focus', function () { last = input.value; });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); fire(); input.select(); } });
    input.addEventListener('blur', fire);
  }

  // opts: { value, onChange(value), min, max, step, grouping (ใส่คอมมา), commit (Enter/blur), suffix, label, className, size }
  function numberInput(opts) {
    var grouping = !!opts.grouping;
    var input = h('input', {
      class: 'num ' + (opts.className || ''),
      type: grouping ? 'text' : 'number',
      inputmode: 'decimal',
      min: grouping ? null : opts.min,
      max: grouping ? null : opts.max,
      step: grouping ? null : (opts.step || 'any'),
      'aria-label': opts.label,
      title: opts.title,
      size: opts.size
    });
    function show(v) { input.value = grouping ? F.number(v) : String(v); }
    show(opts.value);
    function send() {
      var v = parseNumber(input.value);
      if (v == null) return;
      if (opts.min != null && v < opts.min) return;
      if (opts.max != null && v > opts.max) return;
      opts.onChange(v);
    }
    if (opts.commit) onCommit(input, send);
    else input.addEventListener('input', send);
    if (grouping) {
      input.addEventListener('blur', function () { var v = parseNumber(input.value); if (v != null) show(v); });
    }
    input.addEventListener('focus', function () { input.select(); });
    var wrap = h('span', { class: 'num-input' }, input, opts.suffix ? h('span', { class: 'num-suffix' }, opts.suffix) : null);
    wrap.input = input;
    // force = แสดงค่าใหม่แม้ช่องกำลังโฟกัส (ค่าที่มาจากเครื่องมือ เช่น วางจาก Excel หรือย้อนกลับ)
    wrap.setValue = function (v, force) { if (force || document.activeElement !== input) show(v); };
    return wrap;
  }

  // ---------------------------------------------------------------------
  // ช่องกรอก % และบาท คู่กัน (หน้า Top-down และ Phasing)
  // opts: { pct (สัดส่วน), base (เป้าชั้นบน บาท), label, onCommit(newPct) }
  //   - ค่าที่ส่งออกเป็น % เสมอ บาทคำนวณจาก % ด้วย calc.amountFromPct
  //   - แก้บาท → % = calc.pctFromAmount(base, บาท)
  //   - ส่งค่าเมื่อกด Enter หรือออกจากช่อง / แสดง % 2 ตำแหน่ง บาทเป็นจำนวนเต็มคั่นหลักพัน
  // คืน element (display: contents) ที่มี .update(pct, base) และ .inputs { pct, amount } / .parts [ช่อง %, ช่องบาท]
  // ---------------------------------------------------------------------
  function percentAmountInput(opts) {
    var calc = SP.core.calc;
    var L = labels();
    var state = { pct: opts.pct || 0, base: opts.base || 0 };
    var pctEl = h('input', { class: 'num pa-pct', type: 'text', inputmode: 'decimal', 'aria-label': opts.label + ' (%)' });
    var amtEl = h('input', { class: 'num pa-amount', type: 'text', inputmode: 'numeric', 'aria-label': opts.label + ' (' + L.baht + ')' });

    function show(el) {
      if (el === pctEl || !el) pctEl.value = F.number(state.pct * 100, 2);
      if (el === amtEl || !el) amtEl.value = F.baht(calc.amountFromPct(state.base, state.pct));
    }

    function commit(el) {
      var v = parseNumber(el.value);
      if (v == null || v < 0) { show(); return; }
      state.pct = el === pctEl ? v / 100 : calc.pctFromAmount(state.base, v);
      show();
      opts.onCommit(state.pct);
    }

    [pctEl, amtEl].forEach(function (el) {
      onCommit(el, function () { commit(el); });
      el.addEventListener('focus', function () { el.select(); });
      el.addEventListener('keydown', function (e) { if (e.key === 'Escape') { show(); el.blur(); } });
    });

    show();
    var pctPart = h('span', { class: 'num-input' }, pctEl, h('span', { class: 'num-suffix' }, '%'));
    var amtPart = h('span', { class: 'num-input' }, amtEl);
    var wrap = h('span', { class: 'pa-input' }, pctPart, amtPart);
    wrap.inputs = { pct: pctEl, amount: amtEl };
    wrap.parts = [pctPart, amtPart];
    wrap.update = function (pct, base) {
      state.pct = pct || 0;
      state.base = base || 0;
      if (document.activeElement !== pctEl) show(pctEl);
      if (document.activeElement !== amtEl) show(amtEl);
    };
    return wrap;
  }

  // ---------------------------------------------------------------------
  // เลือกจาก Master (ห้ามพิมพ์ชื่อเอง) — ปุ่ม → Dropdown
  // opts: { options: [{ id, name }], label, placeholder, emptyLabel, onPick(id), className }
  // ---------------------------------------------------------------------
  function accountPicker(opts) {
    var wrap = h('span', { class: 'account-picker' + (opts.className ? ' ' + opts.className : '') });
    function showButton() {
      clear(wrap).appendChild(h('button', {
        type: 'button', class: 'btn btn-ghost btn-sm', disabled: !opts.options.length,
        title: opts.options.length ? null : opts.emptyLabel,
        onClick: showSelect
      }, opts.label));
    }
    function showSelect() {
      var sel = h('select', { class: 'select select-sm', 'aria-label': opts.label },
        h('option', { value: '' }, opts.placeholder),
        opts.options.map(function (o) { return h('option', { value: o.id }, o.name); }));
      sel.addEventListener('change', function () { if (sel.value) opts.onPick(sel.value); });
      sel.addEventListener('blur', function () { if (!sel.value) showButton(); });
      sel.addEventListener('keydown', function (e) { if (e.key === 'Escape') showButton(); });
      clear(wrap).appendChild(sel);
      sel.focus();
    }
    showButton();
    return wrap;
  }

  // การเติบโต (1 ตำแหน่ง): null → "ใหม่" (ไม่มียอดปีก่อน) / NaN → "–" (เป้าหมายเป็น 0) / บวก = เขียว / ลบ = แดง
  function growthText(g) {
    var cls = g == null ? 'is-new' : typeof g === 'number' && isNaN(g) ? 'is-none' : g > 0 ? 'is-pos' : g < 0 ? 'is-neg' : '';
    return h('span', { class: 'growth ' + cls }, F.growth(g, labels().growthNew));
  }

  // options = [{ value, label, group }]
  function select(opts) {
    var el = h('select', { class: 'select' + (opts.className ? ' ' + opts.className : ''), 'aria-label': opts.label, disabled: opts.disabled, onChange: function () { opts.onChange(el.value); } });
    var groups = {};
    opts.options.forEach(function (o) {
      var parent = el;
      if (o.group) {
        if (!groups[o.group]) { groups[o.group] = h('optgroup', { label: o.group }); el.appendChild(groups[o.group]); }
        parent = groups[o.group];
      }
      parent.appendChild(h('option', { value: o.value, selected: String(o.value) === String(opts.value), disabled: o.disabled }, o.label));
    });
    return el;
  }

  // options = [{ value, label, title, disabled }]
  function segmented(opts) {
    var wrap = h('div', { class: 'segmented', role: 'group', 'aria-label': opts.label });
    opts.options.forEach(function (o) {
      wrap.appendChild(h('button', {
        type: 'button',
        class: 'seg' + (o.value === opts.value ? ' is-active' : ''),
        'aria-pressed': o.value === opts.value ? 'true' : 'false',
        title: o.title, disabled: o.disabled,
        onClick: function () { if (o.value !== opts.value) opts.onChange(o.value); }
      }, o.label));
    });
    return wrap;
  }

  // ---------------------------------------------------------------------
  // กล่องเนื้อหา
  // ---------------------------------------------------------------------

  function card(title, children, className) {
    return h('section', { class: 'card ' + (className || '') }, title ? h('h2', null, title) : null, children);
  }

  // kind: 'info' | 'conclusion' | 'question'
  function callout(kind, title, body) {
    return h('div', { class: 'callout callout-' + kind }, title ? h('strong', { class: 'callout-title' }, title) : null, body ? h('p', null, body) : null);
  }

  function approveBox(items, title) {
    return h('aside', { class: 'approve-box' },
      h('h2', null, title || SP.data.content.site.approveTitle),
      h('ol', null, items.map(function (t) { return h('li', null, t); })));
  }

  // ---------------------------------------------------------------------
  // กราฟแท่ง 12 เดือน (CSS) แท่งทึบ = values, กรอบเส้นประ = ghost (สเกลเดียวกัน)
  // opts: { values, ghost, format, below(i) → node, ghostLabel, valueLabel,
  //         showValues (ค่าตั้งต้น true), showMonths (true), legend ('bottom' | false),
  //         tooltip(i, value, ghost) → ข้อความเมื่อ Hover,
  //         lead / trail: node ช่องหน้าและท้ายของ Grid (ใช้ให้คอลัมน์ตรงกับตารางใต้กราฟ), className }
  // คืน element ที่มี .update(values, ghost) สำหรับเปลี่ยนความสูงโดยไม่สร้างช่องกรอกใน below ใหม่
  // ---------------------------------------------------------------------
  function barChart(opts) {
    var fmt = opts.format || F.compact;
    var showValues = opts.showValues !== false;
    var chart = h('div', { class: 'bar-chart' + (opts.lead || opts.trail ? ' has-edges' : '') });
    if (opts.lead) chart.appendChild(h('div', { class: 'bar-edge' }, opts.lead));
    var cols = opts.values.map(function (v, i) {
      var col = {
        el: null,
        value: showValues ? h('div', { class: 'bar-value' }) : null,
        ghost: opts.ghost ? h('div', { class: 'bar-ghost', title: opts.ghostLabel }) : null,
        bar: h('div', { class: 'bar' })
      };
      col.el = h('div', { class: 'bar-col' },
        col.value,
        h('div', { class: 'bar-area' }, col.ghost, col.bar),
        opts.showMonths === false ? null : h('div', { class: 'bar-month' }, F.month(i)),
        opts.below ? h('div', { class: 'bar-below' }, opts.below(i)) : null);
      chart.appendChild(col.el);
      return col;
    });
    if (opts.trail) chart.appendChild(h('div', { class: 'bar-edge' }, opts.trail));

    function update(values, ghost) {
      var max = Math.max.apply(null, values.concat(ghost || [], [1]));
      cols.forEach(function (col, i) {
        if (col.value) col.value.textContent = fmt(values[i]);
        col.bar.style.height = (Math.max(0, values[i]) / max * 100) + '%';
        if (col.ghost && ghost) col.ghost.style.height = (Math.max(0, ghost[i] || 0) / max * 100) + '%';
        if (opts.tooltip) col.el.title = opts.tooltip(i, values[i], ghost ? ghost[i] : null);
      });
    }

    var legendItems = [{ className: 'bar-swatch', label: opts.valueLabel || '' }];
    if (opts.ghost) legendItems.push({ className: 'bar-ghost-swatch', label: opts.ghostLabel || '' });
    var wrap = h('div', { class: 'bar-chart-wrap' + (opts.className ? ' ' + opts.className : '') },
      opts.lead || opts.trail ? chart : h('div', { class: 'table-scroll' }, chart),
      opts.legend === false ? null : legend(legendItems));
    wrap.update = update;
    update(opts.values, opts.ghost);
    return wrap;
  }

  // ---------------------------------------------------------------------
  // Dropdown ที่ค้นหาได้ (รายการยาว) ตัวเลือกมีชื่อ ข้อความรอง จุดสีสถานะ และ Badge
  // opts: { options: [{ value, label, sub, status ('ok'|'short'|'over'), badge (node), meta: [node] }], value, onChange(value),
  //         label, placeholder (ช่องค้นหา), emptyText (ไม่พบ),
  //         buttonLabel (ถ้ากำหนด = ปุ่มคำสั่ง เช่น "+ เพิ่ม SKU" ไม่แสดงค่าที่เลือก),
  //         plainButton (ปุ่มตอนปิดแสดงเฉพาะชื่อ — sub, badge และ meta แสดงเฉพาะในรายการ),
  //         fixed (รายการลอยตามตำแหน่งปุ่มบนจอ ใช้เมื่อปุ่มอยู่ในตารางที่ตัดส่วนเกิน ปิดเองเมื่อเลื่อนหน้า) }
  //   option.disabled + option.reason = แสดงในรายการแต่เลือกไม่ได้ พร้อมเหตุผล (เช่น สินค้าขาดข้อมูลจำเป็น)
  // คืน element ที่มี .update(options, value) และ .open(filter) (เปิดรายการโดยกรองเฉพาะที่ filter(option) = true)
  // ---------------------------------------------------------------------
  function statusDot(status) {
    return status ? h('span', { class: 'dot dot-' + status, title: labels().alert[status] }) : null;
  }

  function searchSelect(opts) {
    var state = { options: opts.options, value: opts.value, active: 0, shown: [], filter: null };
    var wrap = h('div', { class: 'ss' + (opts.buttonLabel ? ' ss-action' : '') });
    var button = h('button', { type: 'button', class: opts.buttonLabel ? 'btn btn-sm ss-action-button' : 'ss-button', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-label': opts.label, title: opts.buttonLabel ? null : opts.label });
    var search = h('input', { type: 'search', class: 'ss-search', placeholder: opts.placeholder, 'aria-label': opts.placeholder });
    var list = h('ul', { class: 'ss-list', role: 'listbox', 'aria-label': opts.label });
    var panel = h('div', { class: 'ss-panel' + (opts.buttonLabel ? ' ss-panel-action' : ''), hidden: true }, search, list);

    function find(v) { return state.options.filter(function (o) { return o.value === v; })[0] || null; }
    function optionBody(o) {
      return [statusDot(o.status), h('span', { class: 'ss-label' }, o.label), o.badge ? o.badge.cloneNode(true) : null, o.sub ? h('span', { class: 'ss-sub' }, o.sub) : null,
        o.meta ? h('span', { class: 'ss-meta' }, o.meta.map(function (m) { return m.cloneNode(true); })) : null,
        o.disabled && o.reason ? h('span', { class: 'ss-reason' }, o.reason) : null];
    }
    function renderButton() {
      clear(button);
      if (opts.buttonLabel) { button.appendChild(document.createTextNode(opts.buttonLabel)); button.disabled = !state.options.length; return; }
      var o = find(state.value);
      button.appendChild(h('span', { class: 'ss-current' }, o ? (opts.plainButton ? h('span', { class: 'ss-label' }, o.label) : optionBody(o)) : opts.emptyText));
      button.appendChild(h('span', { class: 'ss-caret', 'aria-hidden': 'true' }, '▾'));
    }
    function renderList() {
      var q = search.value.trim().toLowerCase();
      state.shown = state.options.filter(function (o) {
        return (!state.filter || state.filter(o)) && (!q || (o.label + ' ' + (o.sub || '')).toLowerCase().indexOf(q) >= 0);
      });
      state.active = Math.max(0, Math.min(state.active, state.shown.length - 1));
      clear(list);
      if (!state.shown.length) { list.appendChild(h('li', { class: 'ss-empty' }, opts.emptyText)); return; }
      state.shown.forEach(function (o, i) {
        list.appendChild(h('li', {
          role: 'option', class: 'ss-option' + (i === state.active ? ' is-active' : '') + (o.value === state.value ? ' is-selected' : '') + (o.disabled ? ' is-disabled' : ''),
          'aria-selected': o.value === state.value ? 'true' : 'false', 'aria-disabled': o.disabled ? 'true' : null, title: o.disabled ? o.reason : null,
          onMousedown: function (e) { e.preventDefault(); if (!o.disabled) choose(o.value); }
        }, optionBody(o)));
      });
    }
    // opts.fixed: รายการย้ายไปอยู่ท้าย body ตอนเปิด (ไม่ถูกตัดหรือถูกทับโดยช่องในตาราง) และออกจาก body ตอนปิด
    function inside(node) { return wrap.contains(node) || panel.contains(node); }
    function open(filter) {
      state.filter = filter || null;
      if (opts.fixed) document.body.appendChild(panel);
      panel.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      search.value = '';
      state.active = Math.max(0, state.options.map(function (o) { return o.value; }).indexOf(state.value));
      renderList();
      place();
      search.focus();
    }
    // opts.fixed: วางรายการใต้ปุ่ม (หรือเหนือปุ่มถ้าที่ด้านล่างไม่พอ) ไม่ถูกตัดโดยกล่องเลื่อนของตาราง
    function place() {
      if (!opts.fixed) return;
      var r = button.getBoundingClientRect();
      panel.style.position = 'fixed';
      panel.style.left = Math.max(8, Math.min(r.left, window.innerWidth - panel.offsetWidth - 8)) + 'px';
      var ph = panel.offsetHeight;
      var below = r.bottom + 4;
      panel.style.top = (below + ph > window.innerHeight - 8 && r.top - 4 - ph > 8 ? r.top - 4 - ph : below) + 'px';
    }
    function close() {
      panel.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      if (opts.fixed && panel.parentNode === document.body) document.body.removeChild(panel);
    }
    function choose(v) {
      close();
      if (opts.buttonLabel) { opts.onChange(v); return; }
      if (v !== state.value) { state.value = v; renderButton(); opts.onChange(v); } else button.focus();
    }

    button.addEventListener('click', function (e) { e.stopPropagation(); if (panel.hidden) open(); else close(); });
    search.addEventListener('input', function () { state.active = 0; renderList(); });
    search.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); state.active = Math.min(state.active + 1, state.shown.length - 1); renderList(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); state.active = Math.max(state.active - 1, 0); renderList(); }
      else if (e.key === 'Enter') { e.preventDefault(); var o = state.shown[state.active]; if (o && !o.disabled) choose(o.value); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); button.focus(); }
    });
    search.addEventListener('blur', function () { setTimeout(function () { if (!inside(document.activeElement)) close(); }, 0); });
    document.addEventListener('click', function (e) { if (!panel.hidden && !inside(e.target)) close(); });
    if (opts.fixed) {
      window.addEventListener('scroll', function (e) { if (!panel.hidden && !panel.contains(e.target)) close(); }, true);
      window.addEventListener('resize', function () { if (!panel.hidden) close(); });
    }

    wrap.appendChild(button);
    if (!opts.fixed) wrap.appendChild(panel);
    wrap.update = function (options, value) {
      state.options = options;
      if (value !== undefined) state.value = value;
      renderButton();
      if (!panel.hidden) renderList();
    };
    wrap.open = function (filter) { if (state.options.length) open(filter); };
    renderButton();
    return wrap;
  }

  // ---------------------------------------------------------------------
  // ผู้รับผิดชอบ (อ่านอย่างเดียว) — ข้อมูลจาก store.data() (master.assignments / master.salespeople)
  // ---------------------------------------------------------------------

  // สีของคน = --person-1 ถึง --person-8 ตามลำดับใน Sales Person Master
  function personColor(people, personId) {
    var i = (people || []).map(function (p) { return p.id; }).indexOf(personId);
    return '--person-' + ((i < 0 ? 0 : i) % 8 + 1);
  }

  function personName(people, id) {
    var p = SP.core.calc.findById(people, id);
    return p ? p.name : '';
  }

  // ผู้รับผิดชอบปัจจุบันของหน่วย + ประวัติ (tooltip) → { id, name, vacant, title }
  function ownerInfo(data, unitId, key) {
    var calc = SP.core.calc;
    var O = labels().owner;
    var id = calc.ownerOf(data.assignments, data.salespeople, unitId, key);
    var a = calc.assignmentAt(data.assignments, unitId, key);
    var name = id ? personName(data.salespeople, id)
      : a && a.salesPersonId ? fill(O.resigned, { name: personName(data.salespeople, a.salesPersonId) || a.salesPersonId }) : O.none;
    var hist = calc.unitAssignments(data.assignments, unitId).map(function (x) {
      return F.keyRange(x.fromMonth, x.toMonth, O.now) + ' · ' + (x.salesPersonId ? personName(data.salespeople, x.salesPersonId) : O.none);
    });
    return { id: id, name: name, vacant: !id, title: O.historyTitle + '\n' + (hist.length ? hist.join('\n') : O.historyEmpty) };
  }

  // แถบผู้รับผิดชอบรายเดือนของปีแผน (เดือนติดกันที่เป็นคนเดียวกันรวมเป็นแถบเดียว ช่วงว่างเป็นลายเส้นทแยง)
  // opts: { tag: 'td' | 'div' (div ใช้ใน CSS Grid → grid-column: span n) }
  // คืน Array ของ element ตามช่วง (td มี colspan)
  function ownerStrip(data, unitId, year, opts) {
    opts = opts || {};
    var calc = SP.core.calc;
    var O = labels().owner;
    var tag = opts.tag || 'div';
    return calc.ownerSegments(data.assignments, data.salespeople, unitId, year).map(function (s) {
      var span = s.to - s.from + 1;
      var name = s.state === 'owner' ? personName(data.salespeople, s.personId)
        : s.state === 'resigned' ? fill(O.resigned, { name: personName(data.salespeople, s.assignedId) }) : O.none;
      var style = s.state === 'owner' ? { '--seg': tokenVar(personColor(data.salespeople, s.personId)) } : {};
      if (tag === 'div') style.gridColumn = 'span ' + span;
      var props = { class: 'owner-seg is-' + s.state, title: name + ' · ' + F.monthRange(s.from, s.to) + ' ' + year, style: style };
      if (tag === 'td') props.colspan = String(span);
      return h(tag, props, h('span', { class: 'owner-name' }, name));
    });
  }

  // ---------------------------------------------------------------------
  // ตัวเลือก Channel | หน่วยแบ่งเป้า (ค้นหาได้, ‹ ›) | ผู้รับผิดชอบปัจจุบัน — ใช้ร่วมกันหน้า Phasing และวางแผน SKU
  // opts: { tree (calc.topDown), selection ({ channel, unit } จาก store ui.selection),
  //         onSelect(channelId, unitId),
  //         remainingOf(unitId) → calc.remaining() (ข้อความ + สีคงเหลือในรายการ),
  //         workflowOf(unitId) → สถานะ Workflow (ข้อความในรายการ),
  //         ownerOf(unitId) → ownerInfo(...) (แสดงครั้งเดียวในแถบ tooltip = ประวัติ),
  //         guard() → false = ไม่เปลี่ยน (เช่น มีค่าที่ยังไม่บันทึกแล้วผู้ใช้กดยกเลิก) }
  // ปุ่ม Dropdown ตอนปิดแสดงเฉพาะชื่อ / ตอนเปิดแต่ละรายการ: ชื่อ · ผู้รับผิดชอบ · สถานะคงเหลือ · สถานะ Workflow
  // คืน element (display: contents) ที่มี .channel, .unit (null = Channel ยังไม่มีหน่วย) และ .update()
  // ป้ายหน่วยตาม allocationUnit ของ Channel: Account | เขต / เลือก Channel ใหม่ = หน่วยแรกของ Channel นั้น
  // opts.allowAggregate (CR-13 หน้าจัดสรรเป้าหมายรายเดือนเท่านั้น): ปุ่ม Channel มี "ทั้งหมด" เป็นตัวแรก / Dropdown มี "รวมทั้ง {Channel} ({n} หน่วย)"
  //   บนสุด (เลือก "ทั้งหมด" = มีเฉพาะ "รวมทุก Channel") / ‹ › ไล่ถึงตัวเลือกรวม / มุมมองรวมอ่านจาก opts.selection.aggregate = 'channel' | 'all'
  //   onSelect(channelId, unitId, aggregate) — aggregate = 'channel' | 'all' | null (unitId = หน่วยขายล่าสุด ใช้ต่อในหน้าวางแผน SKU)
  //   → .aggregate ('channel' | 'all' | null) / มุมมองรวม .unit = null (มุมมองทุก Channel .channel = null ด้วย)
  // ---------------------------------------------------------------------
  function subChannelPicker(opts) {
    var calc = SP.core.calc;
    var L = labels();
    var P = L.picker;
    var AGG = '_all';
    var sel = calc.resolveSelection(opts.tree, opts.selection);
    var aggregate = opts.allowAggregate && opts.selection && sel.channel ? opts.selection.aggregate || null : null;
    if (aggregate !== 'channel' && aggregate !== 'all') aggregate = null;
    var ch = aggregate === 'all' ? null : sel.channel;
    var unit = aggregate ? null : sel.unit;
    var wrap = h('div', { class: 'sc-picker' + (opts.allowAggregate ? ' has-aggregate' : '') });
    wrap.channel = ch;
    wrap.unit = unit;
    wrap.aggregate = aggregate;
    wrap.update = function () {};
    if (!sel.channel) return wrap;

    function go(channelId, unitId, agg) {
      if (opts.guard && !opts.guard()) return false;
      opts.onSelect(channelId, unitId, agg || null);
      return true;
    }
    function firstUnit(c) { return c && c.children[0] ? c.children[0].id : null; }

    var chOptions = opts.tree.children.map(function (c) { return { value: c.id, label: c.name, title: c.fullName }; });
    if (opts.allowAggregate) chOptions.unshift({ value: AGG, label: P.all, title: P.allTitle });
    wrap.appendChild(segmented({
      label: P.channel, value: aggregate === 'all' ? AGG : ch.id,
      options: chOptions,
      onChange: function (v) {
        if (v === AGG) { go(sel.channel.id, sel.unit ? sel.unit.id : null, 'all'); return; }
        var next = calc.findById(opts.tree.children, v);
        // มุมมองรวมอยู่แล้ว → รวมของ Channel ที่เลือก / มุมมองหน่วยขาย → หน่วยแรกของ Channel นั้น
        go(v, firstUnit(next), aggregate ? 'channel' : null);
      }
    }));
    if (!unit && !aggregate) return wrap;

    var units = ch ? ch.children : [];
    var typeLabel = (ch && ch.unitLabel) || P.unit;
    function options() {
      if (aggregate === 'all') return [{ value: AGG, label: P.allTotal }];
      var list = units.map(function (u) {
        var o = opts.ownerOf ? opts.ownerOf(u.id) : null;
        var meta = [];
        if (opts.remainingOf) meta.push(alertBadge(opts.remainingOf(u.id)));
        // CR-17: ปิด approvalWorkflow = ไม่แสดงสถานะ Workflow (คงผู้รับผิดชอบและคงเหลือ)
        if (opts.workflowOf && SP.core.features.isOn('approvalWorkflow')) meta.push(wfBadge(opts.workflowOf(u.id)));
        return { value: u.id, label: u.name, sub: o ? o.name : null, meta: meta };
      });
      if (opts.allowAggregate) list.unshift({ value: AGG, label: fill(P.channelTotal, { channel: ch.name, n: units.length }) });
      return list;
    }

    var current = aggregate ? AGG : unit.id;
    var picker = searchSelect({
      label: typeLabel, placeholder: P.search, emptyText: P.noMatch, plainButton: true,
      options: options(), value: current,
      onChange: function (v) {
        var ok = v === AGG ? (aggregate === 'all' || go(ch.id, sel.unit && sel.unit.id && calc.findById(units, sel.unit.id) ? sel.unit.id : firstUnit(ch), 'channel')) : go(ch.id, v, null);
        if (!ok) picker.update(options(), current);
      }
    });
    // ลำดับของ ‹ ›: (ตัวเลือกรวม) → หน่วยขายใน Channel
    var seq = aggregate === 'all' ? [AGG] : (opts.allowAggregate ? [AGG] : []).concat(units.map(function (u) { return u.id; }));
    var idx = seq.indexOf(current);
    function step(delta, text, title) {
      var target = aggregate === 'all' ? null : seq[idx + delta];
      return h('button', {
        type: 'button', class: 'btn btn-ghost btn-sm sc-step', title: title, 'aria-label': title, disabled: !target,
        onClick: function () { if (target === AGG) go(ch.id, firstUnit(ch), 'channel'); else go(ch.id, target, null); }
      }, text);
    }

    wrap.appendChild(h('div', { class: 'sc-pick' },
      h('span', { class: 'field-label sc-type' }, typeLabel), step(-1, '‹', P.prev), picker, step(1, '›', P.next)));
    var owner = unit && opts.ownerOf ? opts.ownerOf(unit.id) : null;
    if (owner) {
      wrap.appendChild(h('span', { class: 'sc-owner ctx-item' + (owner.vacant ? ' is-vacant' : ''), title: owner.title, tabindex: '0' },
        h('span', { class: 'field-label' }, L.owner.label + ':'), h('strong', null, owner.name)));
    }
    wrap.update = function () { picker.update(options()); };
    return wrap;
  }

  // ข้อมูลบริบทต่อท้าย subChannelPicker ในแถวเดียวกัน items = [{ label, value (ข้อความหรือ node), title }] คั่นด้วย ·
  function contextStats(items) {
    return items.filter(Boolean).map(function (it) {
      return h('span', { class: 'ctx-item', title: it.title }, h('span', { class: 'field-label' }, it.label), h('strong', null, it.value));
    });
  }

  // ไอคอน SVG เส้น (ไม่มีสีใน JS ใช้ currentColor)
  var ICONS = {
    trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v7M14 10v7',
    'person-off': 'M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5 20a7 7 0 0 1 14 0M4 4l16 16'
  };
  function icon(name) {
    var ns = 'http://www.w3.org/2000/svg';
    var svgEl = document.createElementNS(ns, 'svg');
    svgEl.setAttribute('viewBox', '0 0 24 24');
    svgEl.setAttribute('class', 'icon icon-' + name);
    svgEl.setAttribute('aria-hidden', 'true');
    var path = document.createElementNS(ns, 'path');
    path.setAttribute('d', ICONS[name]);
    svgEl.appendChild(path);
    return svgEl;
  }

  // ปุ่มไอคอนถังขยะ + Tooltip + กล่องยืนยัน opts: { label, confirmTitle, lines, onConfirm, disabled, disabledTitle }
  function trashButton(opts) {
    var title = opts.disabled ? opts.disabledTitle || opts.label : opts.label;
    return h('button', {
      type: 'button', class: 'icon-btn trash-btn', title: title, 'aria-label': title, disabled: !!opts.disabled,
      onClick: function () {
        if (!opts.confirmTitle) { opts.onConfirm(); return; }
        dialog({ title: opts.confirmTitle, lines: opts.lines || [], confirmLabel: opts.label, danger: true })
          .then(function (r) { if (r.ok) opts.onConfirm(); });
      }
    }, icon('trash'));
  }

  // ---------------------------------------------------------------------
  // กล่องยืนยัน (<dialog>) opts: { title, lines: [ข้อความ], text, body (node เนื้อหาเพิ่มเติม), note: { label, required, requiredText },
  //   confirmLabel, cancelLabel, danger, wide } → Promise<{ ok, note }>
  // ---------------------------------------------------------------------
  function dialog(opts) {
    var D = labels().dialog;
    return new Promise(function (resolve) {
      var note = opts.note ? h('textarea', { class: 'dlg-note', rows: '3', 'aria-label': opts.note.label }) : null;
      var err = h('p', { class: 'dlg-error', role: 'alert', hidden: true });
      var dlg = h('dialog', { class: 'sp-dialog' + (opts.wide ? ' is-wide' : ''), 'aria-label': opts.title });
      var finished = false;
      function done(ok) {
        if (finished) return;
        if (ok && opts.note && opts.note.required && !note.value.trim()) {
          err.textContent = opts.note.requiredText || '';
          err.hidden = false;
          note.focus();
          return;
        }
        finished = true;
        if (dlg.open) dlg.close();
        if (dlg.parentNode) dlg.parentNode.removeChild(dlg);
        resolve({ ok: ok, note: note ? note.value.trim() : '' });
      }
      var confirmBtn = h('button', { type: 'button', class: 'btn dlg-confirm ' + (opts.danger ? 'btn-danger' : 'btn-primary'), onClick: function () { done(true); } }, opts.confirmLabel || D.confirm);
      dlg.appendChild(h('div', { class: 'dlg-body' },
        h('h2', { class: 'dlg-title' }, opts.title),
        opts.lines && opts.lines.length ? h('ul', { class: 'dlg-lines' }, opts.lines.map(function (l) { return h('li', null, l); })) : null,
        opts.text ? h('p', { class: 'dlg-text' }, opts.text) : null,
        opts.body || null,
        note ? h('label', { class: 'dlg-note-label' }, h('span', { class: 'field-label' }, opts.note.label), note) : null,
        err,
        h('div', { class: 'dlg-actions' },
          h('button', { type: 'button', class: 'btn btn-ghost dlg-cancel', onClick: function () { done(false); } }, opts.cancelLabel || D.cancel),
          confirmBtn)));
      dlg.addEventListener('cancel', function (e) { e.preventDefault(); done(false); });
      document.body.appendChild(dlg);
      if (typeof dlg.showModal === 'function') {
        dlg.showModal();
        (note || confirmBtn).focus();
      } else {
        dlg.parentNode.removeChild(dlg);
        finished = true;
        if (opts.note) {
          var v = window.prompt(opts.title, '');
          resolve({ ok: v != null && (!opts.note.required || !!v.trim()), note: (v || '').trim() });
        } else {
          resolve({ ok: window.confirm([opts.title].concat(opts.lines || []).join('\n')), note: '' });
        }
      }
    });
  }

  // ---------------------------------------------------------------------
  // Popover เล็กใต้ปุ่ม (ปิดด้วยคลิกข้างนอกหรือ Esc) — ไม่ใช่ Modal
  // popover(anchor, build(close) → node(s), { className, label, align: 'left' | 'right' }) → { open, close, isOpen }
  // ---------------------------------------------------------------------
  function popover(anchor, build, opts) {
    opts = opts || {};
    var panel = null;
    function outside(e) { if (panel && !panel.contains(e.target) && !anchor.contains(e.target)) close(); }
    function esc(e) { if (e.key === 'Escape' && panel) { e.stopPropagation(); close(); anchor.focus(); } }
    function close() {
      if (!panel) return;
      var p = panel;
      panel = null;
      if (p.parentNode) p.parentNode.removeChild(p);
      anchor.setAttribute('aria-expanded', 'false');
      document.removeEventListener('mousedown', outside, true);
      document.removeEventListener('keydown', esc, true);
      if (opts.onClose) opts.onClose();
    }
    function position() {
      var r = anchor.getBoundingClientRect();
      var w = panel.offsetWidth, ht = panel.offsetHeight;
      var vw = document.documentElement.clientWidth;
      var left = opts.align === 'right' ? r.right - w : r.left;
      left = Math.max(8, Math.min(left, vw - w - 8));
      var top = r.bottom + 6;
      if (top + ht > window.innerHeight - 8 && r.top - ht - 6 > 8) top = r.top - ht - 6;
      panel.style.left = left + 'px';
      panel.style.top = Math.max(8, top) + 'px';
    }
    function open() {
      if (panel) return;
      panel = h('div', { class: 'popover ' + (opts.className || ''), role: 'dialog', 'aria-label': opts.label || '' });
      append(panel, build(close));
      document.body.appendChild(panel);
      position();
      anchor.setAttribute('aria-expanded', 'true');
      document.addEventListener('mousedown', outside, true);
      document.addEventListener('keydown', esc, true);
    }
    anchor.setAttribute('aria-haspopup', 'dialog');
    anchor.setAttribute('aria-expanded', 'false');
    anchor.addEventListener('click', function (e) { e.stopPropagation(); if (panel) close(); else open(); });
    return { open: open, close: close, isOpen: function () { return !!panel; } };
  }

  // ปุ่ม ⋯ ที่เปิดรายการคำสั่ง items = [{ label, title, onClick, disabled, danger }] (items เป็นฟังก์ชันได้ = สร้างรายการตอนเปิด)
  function menuButton(items, label, opts) {
    var btn = h('button', { type: 'button', class: 'icon-btn more-btn' + (opts && opts.className ? ' ' + opts.className : ''), title: label || labels().more, 'aria-label': label || labels().more }, opts && opts.text ? opts.text : '⋯');
    popover(btn, function (close) {
      var list = typeof items === 'function' ? items() : items;
      return h('ul', { class: 'menu-list' }, list.filter(Boolean).map(function (it) {
        return h('li', null, h('button', {
          type: 'button', class: 'menu-item' + (it.danger ? ' is-danger' : '') + (it.current ? ' is-current' : ''), title: it.title, disabled: !!it.disabled,
          'aria-current': it.current ? 'true' : null,
          onClick: function () { close(); it.onClick(); }
        }, it.label));
      }));
    }, { className: 'menu-popover', label: label || labels().more, align: opts && opts.align ? opts.align : 'right' });
    return btn;
  }

  // ---------------------------------------------------------------------
  // Filter แบบเลือกหลายค่า มีช่องค้นหา (Series ในหน้าวางแผน SKU และ Product Master, Channel ในรายงาน)
  // opts: { label, allLabel, search, clear, empty, options: [{ value, label, count }], value: [values], onChange(values), guard() → bool }
  // ติ๊กได้หลายรายการ แล้วส่งค่าครั้งเดียวเมื่อปิดรายการ (คลิกข้างนอก, Esc หรือปุ่ม ยืนยัน)
  // ---------------------------------------------------------------------
  function multiSelect(opts) {
    var D = labels().dialog;
    var applied = (opts.value || []).slice();
    var pending = null;
    var btn = h('button', { type: 'button', class: 'ss-button series-button' });
    function nameOf(v) { var o = opts.options.filter(function (x) { return x.value === v; })[0]; return o ? o.label : v; }
    function text(v) {
      if (!v.length) return opts.allLabel;
      if (v.length === 1) return nameOf(v[0]);
      return fill(opts.selected || '{n}', { n: v.length });
    }
    function renderBtn() {
      clear(btn);
      btn.appendChild(h('span', { class: 'field-label' }, opts.label));
      btn.appendChild(h('span', { class: 'ss-label' }, text(applied)));
      btn.appendChild(h('span', { class: 'ss-caret', 'aria-hidden': 'true' }, '▾'));
      btn.classList.toggle('is-active', applied.length > 0);
      btn.title = applied.length ? applied.map(nameOf).join(', ') : opts.allLabel;
    }
    function commit() {
      var next = pending;
      pending = null;
      if (!next || JSON.stringify(next) === JSON.stringify(applied)) return;
      if (opts.guard && !opts.guard()) return;
      applied = next;
      renderBtn();
      opts.onChange(applied.slice());
    }
    var pop = popover(btn, function (close) {
      pending = applied.slice();
      var search = opts.search ? h('input', { type: 'search', class: 'ss-search', placeholder: opts.search, 'aria-label': opts.search }) : null;
      var list = h('ul', { class: 'series-list' });
      function renderList() {
        var q = search ? search.value.trim().toLowerCase() : '';
        clear(list);
        var shown = opts.options.filter(function (o) { return !q || String(o.label).toLowerCase().indexOf(q) >= 0; });
        if (!shown.length) list.appendChild(h('li', { class: 'ss-empty' }, opts.empty));
        shown.forEach(function (o) {
          var box = h('input', { type: 'checkbox', checked: pending.indexOf(o.value) >= 0, 'aria-label': o.label });
          box.addEventListener('change', function () {
            pending = pending.filter(function (v) { return v !== o.value; });
            if (box.checked) pending.push(o.value);
          });
          list.appendChild(h('li', { class: o.depth ? 'series-depth-' + o.depth : null }, h('label', { class: 'series-option' }, box,
            h('span', { class: 'series-name' }, o.label), o.count != null ? h('span', { class: 'series-count' }, o.count) : null)));
        });
      }
      if (search) search.addEventListener('input', renderList);
      renderList();
      if (search) setTimeout(function () { search.focus(); }, 0);
      return [search, list, h('div', { class: 'series-foot' },
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: function () { pending = []; renderList(); } }, opts.clear),
        h('button', { type: 'button', class: 'btn btn-primary btn-sm series-apply', onClick: function () { close(); } }, D.confirm))];
    }, { className: 'series-popover', label: opts.label, onClose: function () { commit(); } });
    renderBtn();
    var wrap = h('span', { class: 'series-filter' }, btn);
    wrap.close = pop.close;
    return wrap;
  }

  // ---------------------------------------------------------------------
  // ตัวกรองหมวดสินค้าแบบเลือกต่อเนื่อง (CR-15): Category → Sub Category → Type / kind: 'series' = Series → Sub Series
  // opts = { tax, kind ('category' | 'series'), levels (ระดับที่แสดง ค่าตั้งต้นทุกระดับของ kind), value: { <LEVEL>: [id] }, onChange(value), guard }
  //   แต่ละระดับ = multiSelect (เลือกหลายค่า มีช่องค้นหา) / ระดับล่างแสดงเฉพาะรายการใต้รายการที่เลือกในระดับบน
  //   (ระดับบนไม่ได้เลือก = ทุกรายการ ชื่อมีเส้นทางกำกับ เช่น Face › Base) / เปลี่ยนระดับบน → ตัดค่าระดับล่างที่ไม่อยู่ใต้รายการที่เลือกออก
  //   ข้อความจาก labels.taxonomy (ชื่อระดับ + ป้ายของ multiSelect) / หน้ารายการสินค้าและหน้าวางแผนราย SKU นำไปใช้ต่อได้
  // → element (display: contents) ที่มีปุ่มหนึ่งปุ่มต่อระดับ
  // ---------------------------------------------------------------------
  function categoryFilter(opts) {
    var T = SP.core.taxonomy;
    var X = labels().taxonomy;
    var kind = opts.kind || 'category';
    var levels = opts.levels || T.LEVELS[kind];
    var value = JSON.parse(JSON.stringify(opts.value || {}));
    var wrap = h('span', { class: 'cat-filter' });
    var flat = [];
    T.buildTree(opts.tax, kind).forEach(function walk(t) { flat.push(t); t.children.forEach(walk); });
    function ancestorAt(node, level) {
      var p = T.pathOf(opts.tax, kind, node.id).filter(function (a) { return a.level === level; })[0];
      return p ? p.id : null;
    }
    // ค่าระดับล่างต้องอยู่ใต้รายการที่เลือกในระดับบน (ระดับบนไม่ได้เลือก = ไม่จำกัด)
    function prune() {
      levels.forEach(function (level, i) {
        if (!i) return;
        var up = value[levels[i - 1]] || [];
        if (!up.length || !value[level]) return;
        value[level] = value[level].filter(function (id) {
          var n = T.find(opts.tax, kind, id);
          return n && up.indexOf(ancestorAt(n, levels[i - 1])) >= 0;
        });
      });
    }
    levels.forEach(function (level, i) {
      var upLevel = i ? levels[i - 1] : null;
      var up = upLevel ? value[upLevel] || [] : [];
      var options = flat.filter(function (t) {
        return t.node.level === level && (!up.length || up.indexOf(ancestorAt(t.node, upLevel)) >= 0);
      }).map(function (t) {
        return { value: t.node.id, label: upLevel && !up.length ? t.path.join(' › ') : t.node.name };
      });
      var name = X.levels[level];
      wrap.appendChild(multiSelect({
        label: name, allLabel: fill(X.filter.all, { level: name }), selected: X.filter.selected, clear: X.filter.clear,
        empty: X.filter.empty, search: X.filter.search, options: options, value: value[level] || [], guard: opts.guard,
        onChange: function (v) { value[level] = v; prune(); opts.onChange(JSON.parse(JSON.stringify(value))); }
      }));
    });
    return wrap;
  }

  // Chip ตัวกรองที่ใช้อยู่ items = [{ label, onRemove }] + ลิงก์ล้างทั้งหมด (onClear) → null เมื่อไม่มีตัวกรอง
  function filterChips(items, onClear) {
    var X = labels().taxonomy.filter;
    if (!items || !items.length) return null;
    return h('div', { class: 'filter-chips', role: 'list' },
      items.map(function (it) {
        return h('span', { class: 'filter-chip', role: 'listitem' }, h('span', { class: 'filter-chip-label' }, it.label),
          h('button', { type: 'button', class: 'filter-chip-x', title: fill(X.remove, { name: it.label }), 'aria-label': fill(X.remove, { name: it.label }), onClick: it.onRemove }, '×'));
      }),
      onClear ? h('button', { type: 'button', class: 'link-btn filter-chips-clear', onClick: onClear }, X.clearAll) : null);
  }

  // Filter Series: options = calc.seriesList(taxonomy, products) [{ value, label, depth, count }]
  //   Series และ Sub Series (เยื้อง) เลือก Series = รวม Sub Series ทั้งหมด (calc.inSeries)
  function seriesFilter(opts) {
    var S = labels().series;
    return multiSelect({
      label: S.label, allLabel: S.all, search: S.search, clear: S.clear, empty: S.empty, selected: S.selected,
      options: opts.options.map(function (o) { return { value: o.value, label: o.label || S.none, depth: o.depth, count: fill(S.count, { n: o.count }) }; }),
      value: opts.value, onChange: opts.onChange, guard: opts.guard
    });
  }

  // ---------------------------------------------------------------------
  // แผง "กฎ Status และวิธีเติมยอด" (ข้อความจาก content.labels.rules)
  // ---------------------------------------------------------------------
  function rulesContent() {
    var R = labels().rules;
    return h('div', { class: 'rules-content' },
      h('div', null, h('h3', null, R.statusTitle),
        h('ul', { class: 'rules-list' }, R.statusRules.map(function (r) { return h('li', null, statusBadge(r.status), h('span', null, r.text)); }))),
      h('div', null, h('h3', null, R.sourceTitle),
        h('ul', { class: 'rules-list' }, R.sourceRules.map(function (r) { return h('li', null, sourceChip(r.source), h('span', null, r.text)); }))));
  }

  // แบบพับได้ (ค่าเริ่มต้นพับ) ใช้ในหน้า Product Master
  function rulesPanel(opts) {
    var d = h('details', { class: 'rules-panel card' }, h('summary', null, labels().rules.title), rulesContent());
    if (opts && opts.open) d.open = true;
    return d;
  }

  // ปุ่ม ? ที่เปิดแผงเดียวกันเป็น Popover (หน้าวางแผน SKU) legend = node รายการสัญลักษณ์ทั้งหมด (ไม่บังคับ)
  function rulesButton(legendNode) {
    var R = labels().rules;
    var btn = h('button', { type: 'button', class: 'icon-btn help-btn', title: R.button, 'aria-label': R.button }, '?');
    popover(btn, function () {
      return [legendNode ? [h('h3', { class: 'popover-title' }, R.legendTitle), legendNode.cloneNode(true)] : null,
        h('h3', { class: 'popover-title' }, R.title), rulesContent()];
    }, { className: 'rules-popover', label: R.title });
    return btn;
  }

  // ---------------------------------------------------------------------
  // ⓘ วิธีคำนวณ (Popover): สูตร / แถบแบ่งเงินของหน่วยทั้งปี / ค่า GP และ VAT ที่ใช้
  // info() → { unitName, split (calc.moneySplit), gp (null = ยังไม่มี), gpLabel, hasGP, priceBasis ('RSP' | 'SELL_IN'), sellOutMethod }
  //   CR-18: สูตรตาม Channel (มี GP: ÷ VAT × (1 − {gpLabel}) · ไม่มี GP: ÷ VAT) · ลำดับราคา · ไม่มีวันที่มีผลของ GP / Promotion ตาม Flag
  // ---------------------------------------------------------------------
  function calcExplainer(info) {
    var X = labels().explain;
    var S = SP.data.settings;
    var btn = h('button', { type: 'button', class: 'icon-btn explain-btn', title: X.button, 'aria-label': X.button }, 'ⓘ');
    popover(btn, function () {
      var o = typeof info === 'function' ? info() : info;
      var vatFactor = F.number(1 + S.VAT, 2);
      var gpLabel = o.gpLabel || X.gp;
      var FX = X.formulas;
      var rows = [FX.sale, o.hasGP ? FX.net : FX.netNoGp];
      var split = o.split && o.split.parts && o.split.parts.length ? SP.core.charts.splitBar(o.split, { net: X.splitParts.net, gp: fill(X.splitParts.gp, { gpLabel: gpLabel }), vat: X.splitParts.vat },
        { vatLabel: X.splitParts.vat + ' ' + F.pct(S.VAT, 0) }) : null;
      return [
        h('h3', { class: 'popover-title' }, X.title),
        h('dl', { class: 'explain-formulas' }, rows.map(function (f) { return [h('dt', null, f[0]), h('dd', null, fill(f[1], { vatFactor: vatFactor, gpLabel: gpLabel }))]; })),
        h('p', { class: 'explain-note' }, o.priceBasis === 'SELL_IN' ? X.priceOrderDealer : X.priceOrder),
        SP.core.features.isOn('promotionCalendar') ? h('p', { class: 'explain-note' }, X.promoNote) : null,
        h('h3', null, fill(X.splitTitle, { unit: o.unitName })),
        split || h('p', { class: 'explain-note text-short' }, fill(X.gpMissing, { gpLabel: gpLabel, unit: o.unitName })),
        h('h3', null, X.valuesTitle),
        h('ul', { class: 'explain-values' },
          h('li', null, !o.hasGP ? X.noGP
            : o.gp == null ? h('span', { class: 'text-short' }, fill(X.gpMissing, { gpLabel: gpLabel, unit: o.unitName }))
            : [gpLabel + ' ', h('strong', null, F.pct(o.gp, 0))]),
          h('li', null, X.vat + ' ', h('strong', null, F.pct(S.VAT, 0))),
          h('li', null, S.PRICE_INCLUDES_VAT ? X.priceVat.incl : X.priceVat.excl),
          // CR-17: ปิด sellIn = ไม่แสดงวิธีนับ Sell-out ที่อ้าง Sell-in (TT)
          o.sellOutMethod && X.sellOutMethod[o.sellOutMethod] && (o.sellOutMethod !== 'SELL_IN_MINUS_CN' || SP.core.features.isOn('sellIn')) ? h('li', null, X.sellOutMethod[o.sellOutMethod]) : null)
      ];
    }, { className: 'explain-popover', label: X.title });
    return btn;
  }

  // ---------------------------------------------------------------------
  // Tooltip รายช่อง (Hover หรือโฟกัสด้วยคีย์บอร์ด) — root = ตาราง / ช่องที่มี data-cell
  // resolve(el) → { heading, breakdown (calc.cellBreakdown), hasGP, priceText (ที่มาของราคา), lockText, sourceText, notes: [บรรทัดเพิ่มเติม] } | null
  //   CR-18: 3,000 ชิ้น × 149.00 บาท (ราคาต่อ Account) = 447,000.00 (Sale Amount รวม VAT) / ÷ 1.07 × (1 − 40%) = 250,654.21 (Net Sales)
  // ---------------------------------------------------------------------
  var TIP = null;

  function cellBreakdown(root, resolve) {
    var B = labels().breakdown;
    var L = labels();
    if (!TIP) { TIP = h('div', { class: 'cell-tip', role: 'tooltip', hidden: true }); document.body.appendChild(TIP); }
    var current = null;
    function hide() { TIP.hidden = true; current = null; }
    function place(target) {
      var r = target.getBoundingClientRect();
      var w = TIP.offsetWidth, ht = TIP.offsetHeight;
      var vw = document.documentElement.clientWidth;
      var left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, vw - w - 8));
      var top = r.bottom + 6;
      if (top + ht > window.innerHeight - 8) top = r.top - ht - 6;
      TIP.style.left = left + 'px';
      TIP.style.top = Math.max(8, top) + 'px';
    }
    function show(target) {
      var info = resolve(target);
      if (!info) { hide(); return; }
      current = target;
      clear(TIP);
      TIP.appendChild(h('div', { class: 'tip-head' }, info.heading));
      if (info.lockText) {
        TIP.appendChild(h('div', { class: 'tip-lock' }, L.source.locked + ' · ' + info.lockText));
      } else {
        var b = info.breakdown;
        var vat = b.includesVat ? '÷ ' + F.number(b.vatFactor, 2) : '';
        var rows = [
          [F.units(b.units) + ' ' + L.units + ' × ' + F.baht(b.price, 2) + ' ' + L.baht + (info.priceText ? ' (' + info.priceText + ')' : ''), F.baht(b.saleAmount, 2), B.saleAmount],
          [info.hasGP === false ? vat : b.gp == null ? B.gpMissing : (vat ? vat + ' ' : '') + '× (1 − ' + F.pct(b.gp, 0) + ')', b.netSales == null ? '–' : F.baht(b.netSales, 2), B.net]
        ];
        TIP.appendChild(h('table', { class: 'tip-table' }, h('tbody', null, rows.map(function (r) {
          return h('tr', null, h('td', null, r[0]), h('td', { class: 'num' }, '= ' + r[1]), h('td', { class: 'tip-note' }, r[2] ? '(' + r[2] + ')' : ''));
        }))));
      }
      if (info.sourceText) TIP.appendChild(h('div', { class: 'tip-source' }, B.source + ': ' + info.sourceText));
      (info.notes || []).forEach(function (n) { if (n) TIP.appendChild(h('div', { class: 'tip-source' }, n)); });
      TIP.hidden = false;
      place(target);
    }
    root.addEventListener('mouseover', function (e) {
      var t = e.target.closest ? e.target.closest('[data-cell]') : null;
      if (t && root.contains(t)) { if (t !== current) show(t); } else hide();
    });
    root.addEventListener('mouseleave', hide);
    root.addEventListener('focusin', function (e) { var t = e.target.closest ? e.target.closest('[data-cell]') : null; if (t) show(t); });
    root.addEventListener('focusout', hide);
    root.addEventListener('scroll', hide, true);
    return { hide: hide, refresh: function () { if (current && document.body.contains(current)) show(current); } };
  }

  // ---------------------------------------------------------------------
  // โหมดแก้ไข: แถบ "กำลังแก้ไข · ยังไม่บันทึก n ช่อง" / เตือนก่อนออกจากหน้าหรือทิ้งค่าที่ยังไม่บันทึก
  // ---------------------------------------------------------------------
  function editBanner() {
    var W = labels().workflow;
    var el = h('div', { class: 'edit-banner no-print', role: 'status' });
    el.update = function (n) { el.textContent = n ? fill(W.editing, { n: n }) : W.editingClean; el.classList.toggle('is-dirty', n > 0); };
    el.update(0);
    return el;
  }

  var dirtyFn = null;
  var unloadBound = false;
  // isDirty() → จำนวนค่าที่ยังไม่บันทึก (0 / false = ไม่มี) ใช้ตอนออกจากหน้า (beforeunload)
  function guardUnsaved(isDirty) {
    dirtyFn = isDirty;
    if (unloadBound) return;
    unloadBound = true;
    window.addEventListener('beforeunload', function (e) {
      if (dirtyFn && dirtyFn()) { e.preventDefault(); e.returnValue = SP.data.content.site.leaveConfirm; return e.returnValue; }
    });
  }

  // ตัวเลือกปีแผนในแถวหัวข้อ (CR-10) ขนาดตัวอักษรเท่าหัวข้อหน้า มี ▾ และ Tooltip "เปลี่ยนปีแผน"
  // ค่าเก็บที่ app.planYear (ทุกหน้าใช้ร่วมกัน) เปลี่ยนแล้วโหลดหน้าใหม่ / มีรายการที่ยังไม่บันทึก (guardUnsaved) → ถามยืนยันก่อน
  function planYearPicker() {
    var store = SP.core.store;
    var site = SP.data.content.site;
    var year = store.year();
    var btn = h('button', { type: 'button', class: 'year-title', title: site.yearChange, 'aria-label': site.yearChange + ' ' + year },
      h('span', { class: 'year-title-value' }, String(year)),
      h('span', { class: 'year-title-caret no-print', 'aria-hidden': 'true' }, '▾'));
    popover(btn, function (close) {
      return h('ul', { class: 'menu-list year-list' }, SP.data.settings.PLAN_YEARS.map(function (y) {
        return h('li', null, h('button', {
          type: 'button', class: 'menu-item year-option' + (y === year ? ' is-current' : ''), 'aria-current': y === year ? 'true' : null,
          onClick: function () {
            close();
            if (y === year) return;
            if (!confirmDiscard(dirtyFn ? dirtyFn() || 0 : 0)) return;
            guardUnsaved(null);
            store.set('app.planYear', y);
            location.reload();
          }
        }, String(y)));
      }));
    }, { className: 'menu-popover year-popover', label: site.yearChange });
    return btn;
  }

  // มีค่าที่ยังไม่บันทึก n ค่า → ถามก่อนทิ้ง (true = ไปต่อได้)
  function confirmDiscard(n) {
    if (!n) return true;
    return window.confirm(fill(SP.data.content.site.discardConfirm, { n: n }));
  }

  // ---------------------------------------------------------------------
  // workflowBar — ป้ายสถานะ + ผู้ส่ง/ผู้อนุมัติ + เวลา + ประวัติ (ข้างชื่อหน้า) และปุ่มตามสถานะ/บทบาท (มุมขวา)
  // กฎทั้งหมดมาจาก SP.core.workflow (allowedActions, canSubmit, applyAction) อ่าน/เขียนสถานะผ่าน store
  // opts: { step ('topDown' | 'phasing' | 'sku' | 'forecast'), unitId (null = ทั้งหน้า), year, ownerId (ผู้รับผิดชอบหน่วย),
  //         simple (true = มีแค่ แก้ไข/บันทึก/ยกเลิก ไม่มีขั้นอนุมัติ — หน้า Master),
  //         title() → ชื่อที่ใช้ในกล่องยืนยัน, editing() → bool,
  //         facts() → { remaining: 'ok' | 'short' | 'over' } (ใช้ตัดสินว่าส่งอนุมัติได้หรือไม่),
  //         summary() → [ข้อความตัวเลขหลัก] (กล่องยืนยันส่ง/อนุมัติ), snapshot() → ตัวเลขตอนอนุมัติ (ตรวจว่าเป้าเปลี่ยนไหม),
  //         onEdit(), onSave(), onCancel(), onChange(result) (หลังเปลี่ยนสถานะ) }
  // คืน element (display: contents → ส่วนสถานะและปุ่มเป็น item ของแถวหัวข้อ) ที่มี .update()
  // ---------------------------------------------------------------------
  // opts เพิ่มเติม: extra = node ที่วางหน้าปุ่มเสมอ (เช่น ส่งออก ▾) / editRoles = บทบาทที่แก้หน้า Master ได้ (simple)
  //   CR-23: editBlocked() → ข้อความเหตุผล | null = ปุ่มแก้ไขกดไม่ได้พร้อมข้อความ (เช่น Channel ที่ยังไม่มีเป้าหมาย)
  //   getState() + onAction(action, payload) → { ok, error } = สถานะที่ไม่ได้เก็บใน plan.<ปี>.workflow (แผน NPD)
  // CR-19 สิทธิ์ (SP.core.permissions): แก้ไข / บันทึก / ยกเลิก ตามตารางสิทธิ์ — Module ของแถบ = opts.modules > หน้า Master (id ของหน้าจาก
  //   layout.currentPage()) > ขั้น (topDown · phasing · sku) / Channel ของหน่วยขาย = opts.channelId หรือหาจาก unitId
  //   ไม่มีสิทธิ์ = "อ่านอย่างเดียว · หน้านี้แก้ไขโดย {บทบาท}" (Sales ที่ดูหน่วยขายนอกทีม = "หน่วยขายนี้อยู่ในทีม {Channel}") + ปุ่ม "สลับเป็น {บทบาท}"
  //   (คนแรกที่มีสิทธิ์) / ขั้นที่เปิด Workflow (Phase 2) ยังใช้กฎผู้จัดทำ / ผู้อนุมัติใน core/workflow.js
  // CR-17 Feature Flags (SP.core.features): ขั้นที่ปิด Workflow (features.stepOn) = ไม่มีป้ายสถานะ ไม่มีประวัติ ▾ ไม่มีส่งอนุมัติ
  //   สถานะที่เก็บไว้ถือเป็นฉบับร่าง ปุ่มเหลือ แก้ไข · บันทึก · ยกเลิก (features.visibleActions) + ข้อความอ่านอย่างเดียวของผู้ที่แก้ไม่ได้ /
  //   แผน NPD ที่ปิด npdApproval = ไม่แสดงอะไร / ปิด baseline = ไม่ถือว่าล็อก / .actions = ปุ่มที่แสดงล่าสุด (ใช้ใน Test)
  function workflowBar(opts) {
    var W = SP.core.workflow;
    var P = SP.core.permissions;
    var store = SP.core.store;
    var L = labels();
    var WL = L.workflow;
    var LOCKABLE = ['topDown', 'phasing', 'sku'];
    var wrap = h('span', { class: 'wf-bar' });
    var statusEl = h('span', { class: 'wf-status' });
    var actionsEl = h('span', { class: 'wf-actions no-print' });
    wrap.appendChild(statusEl);
    wrap.appendChild(actionsEl);

    function title() { return typeof opts.title === 'function' ? opts.title() : (opts.title || ''); }
    function approverName() { return opts.step === 'topDown' ? L.roles.management : L.roles.director; }
    function submitterName() {
      if (opts.step === 'npd') return L.roles.product;
      if (opts.step === 'topDown' || !opts.ownerId) return L.roles.director;
      return personName(store.get('master.salespeople'), opts.ownerId);
    }

    function apply(action, extra) {
      extra = extra || {};
      if (opts.onAction) {
        var r = opts.onAction(action, { by: roleName(store.role()), at: new Date().toISOString(), note: extra.note });
        if (!r.ok) { window.alert(r.error === 'noteRequired' ? WL.noteRequired : r.error); return; }
        if (opts.onChange) opts.onChange(r);
        return;
      }
      var res = W.applyAction(store.workflowStates(), {
        step: opts.step, unitId: opts.unitId, action: action,
        by: roleName(store.role()), at: new Date().toISOString(), note: extra.note,
        snapshot: extra.snapshot, invalidateNote: WL.invalidateNote[opts.step]
      });
      if (!res.ok) { window.alert(res.error === 'noteRequired' ? WL.noteRequired : res.error); return; }
      store.saveWorkflowStates(res.states);
      if (opts.onChange) opts.onChange(res);
    }

    function ask(action) {
      var t = title();
      var summary = opts.summary ? opts.summary() : [];
      if (action === 'submit') {
        dialog({ title: fill(WL.confirm.submit, { title: t, approver: approverName() }), lines: summary, confirmLabel: WL.actions.submit })
          .then(function (r) { if (r.ok) apply('submit'); });
      } else if (action === 'approve') {
        dialog({
          title: fill(WL.confirm.approve, { title: t }), lines: summary, confirmLabel: WL.actions.approve,
          text: opts.step === 'topDown' || opts.step === 'phasing' ? WL.approveNote : null
        }).then(function (r) { if (r.ok) apply('approve', { snapshot: opts.snapshot ? opts.snapshot() : undefined }); });
      } else if (action === 'return') {
        dialog({ title: fill(WL.confirm['return'], { title: t }), confirmLabel: WL.actions['return'], note: { label: WL.returnNote, required: true, requiredText: WL.noteRequired } })
          .then(function (r) { if (r.ok) apply('return', { note: r.note }); });
      } else if (action === 'reopen' || action === 'recall') {
        dialog({ title: fill(WL.confirm[action], { title: t }), confirmLabel: WL.actions[action] })
          .then(function (r) { if (r.ok) apply(action); });
      }
    }

    function historyButton(state, preparerName) {
      var btn = h('button', { type: 'button', class: 'btn btn-ghost btn-sm wf-history-btn' }, WL.history + ' ▾');
      popover(btn, function () {
        var hist = (state.history || []).slice().reverse();
        return [
          opts.step ? h('p', { class: 'wf-history-people' },
            h('span', null, fill(WL.preparer, { name: preparerName })),
            h('span', null, fill(WL.approver, { name: approverName() }))) : null,
          hist.length ? h('ol', { class: 'wf-history' }, hist.map(function (ev) {
            return h('li', null,
              h('span', { class: 'wf-history-when' }, F.dateTime(ev.at)),
              h('span', { class: 'wf-history-what' }, (WL.events[ev.action] || ev.action) + ' ' + ev.by),
              ev.note ? h('span', { class: 'wf-history-note' }, '“' + ev.note + '”') : null);
          })) : h('p', { class: 'muted small' }, WL.historyEmpty)
        ];
      }, { className: 'wf-history-popover', label: WL.history });
      return btn;
    }

    function button(action, primary, extra) {
      return h('button', {
        type: 'button', class: 'btn btn-sm wf-' + action + (primary ? ' btn-primary' : ' btn-secondary'),
        disabled: extra && extra.disabled, title: extra && extra.title,
        onClick: function () {
          if (action === 'edit') opts.onEdit();
          else if (action === 'save') opts.onSave();
          else if (action === 'cancel') opts.onCancel();
          else ask(action);
        }
      }, WL.actions[action]);
    }

    // CR-19: Module ในตารางสิทธิ์ของแถบนี้ / null = ไม่รู้จักหน้า (หน้า Test) ใช้กฎเดิม
    function permModules() {
      if (opts.modules) return [].concat(opts.modules);
      if (opts.simple) {
        var page = SP.core.layout && SP.core.layout.currentPage ? SP.core.layout.currentPage() : null;
        var mods = page ? P.pageModules(page) : null;
        return mods && mods.length ? mods : null;
      }
      return P.stepModules(opts.step);
    }
    function permContext() {
      var ch = opts.channelId || null;
      if (!ch && opts.unitId) {
        var info = SP.core.calc.unitInfo(store.data(), opts.unitId);
        ch = info && info.channel ? info.channel.id : null;
      }
      return { channelId: ch };
    }
    // CR-21: ชื่อบทบาทจาก master.roles / บทบาทที่แก้ได้เฉพาะทีม = "{บทบาท / บทบาท} ทีม {Channel}"
    function editorsText(mods, pctx) {
      var eds = P.editors(mods, pctx);
      var named = eds.filter(function (e) { return !e.everywhere; });
      if (named.length) eds = named;   // ผู้ดูแลระบบ (แก้ได้ทุกหน้า) แสดงเฉพาะหน้าที่ไม่มีบทบาทอื่นแก้ได้
      var team = eds.filter(function (e) { return e.team; }), all = eds.filter(function (e) { return !e.team; });
      var ch = pctx.channelId ? SP.core.calc.findById(SP.data.channels, pctx.channelId) : null;
      var parts = [];
      if (team.length) parts.push(fill(WL.teamEditors, { roles: team.map(function (e) { return e.name; }).join(' / '), channel: ch ? ch.name : '' }));
      return parts.concat(all.map(function (e) { return e.name; })).join(WL.rolesJoin);
    }
    // อ่านอย่างเดียว + ปุ่มสลับเป็นคนแรกที่มีสิทธิ์ (ไม่มีใครในทีม = บอกว่ายังไม่มีทีมขาย)
    function readOnlyNote(mods, pctx) {
      var u = P.user();
      var eds = P.editors(mods, pctx);
      var team = eds.some(function (e) { return e.team; });
      var ch = pctx.channelId ? SP.core.calc.findById(SP.data.channels, pctx.channelId) : null;
      var text = ch && P.teamBlocked(u, mods, pctx) ? fill(WL.readOnlyTeam, { channel: ch.name })
        : eds.length ? fill(WL.readOnlyBy, { roles: editorsText(mods, pctx) }) : WL.readOnlyNone;
      actionsEl.appendChild(h('span', { class: 'wf-hint' }, text));
      var to = P.firstEditor(mods, pctx);
      if (to) actionsEl.appendChild(switchButton(to, fill(WL.switchToRole, { role: roleTitle(to) })));
      else if (team && ch) actionsEl.appendChild(h('span', { class: 'wf-hint' }, fill(WL.noTeam, { channel: ch.name })));
    }
    function editButtons(editing) {
      wrap.actions = editing ? ['save', 'cancel'] : ['edit'];
      wrap.actions.forEach(function (a) { actionsEl.appendChild(a === 'edit' ? editButton(true) : button(a, a !== 'cancel')); });
    }
    // CR-23: ปุ่มแก้ไข + เหตุผลที่กดไม่ได้ (opts.editBlocked)
    function editButton(primary) {
      var reason = opts.editBlocked ? opts.editBlocked() : null;
      if (reason) actionsEl.appendChild(h('span', { class: 'wf-reason', role: 'note' }, reason));
      return button('edit', primary, reason ? { disabled: true, title: reason } : null);
    }

    // สลับมุมมองผู้ใช้ (เพื่อการนำเสนอ) แล้วโหลดหน้าใหม่ให้ Header และปุ่มตรงกับบทบาท
    function switchButton(role, labelText) {
      var name = roleName(role);
      return h('button', {
        type: 'button', class: 'btn btn-secondary btn-sm wf-switch', title: fill(WL.switchTitle, { name: name }),
        onClick: function () { store.set('ui.role', role); location.reload(); }
      }, labelText);
    }

    function render() {
      var FT = SP.core.features;
      clear(statusEl);
      clear(actionsEl);
      wrap.actions = [];
      if (opts.extra) actionsEl.appendChild(opts.extra);
      var editing = !!(opts.editing && opts.editing());
      var wfOn = opts.simple ? false : FT.stepOn(opts.step);
      if (opts.step === 'npd' && !wfOn) return;
      if (opts.simple) {
        var pageMods = permModules();
        if (pageMods) {
          var pageCtx = permContext();
          if (!P.canAny(P.user(), pageMods, pageCtx)) { readOnlyNote(pageMods, pageCtx); return; }
          editButtons(editing);
          return;
        }
        var mv = W.masterViewState(store.role(), opts.editRoles);
        if (mv.kind === 'readOnly') {
          var editor = roleName(mv.switchTo);
          actionsEl.appendChild(h('span', { class: 'wf-hint' }, fill(WL.readOnlyMaster, { name: editor })));
          actionsEl.appendChild(switchButton(mv.switchTo, fill(WL.switchToEditor, { name: editor })));
          return;
        }
        wrap.actions = editing ? ['save', 'cancel'] : ['edit'];
        wrap.actions.forEach(function (a) { actionsEl.appendChild(button(a, a !== 'cancel')); });
        return;
      }
      var states = store.workflowStates();
      var locked = opts.step === 'npd' || !FT.isOn('baseline') ? false : W.isLocked(states);
      var state = !wfOn ? { status: 'draft', history: [] } : opts.getState ? opts.getState() : W.stateOf(states, opts.step, opts.unitId);
      var preparerName = submitterName();
      if (wfOn) {
        statusEl.appendChild(wfBadge(state.status));
        if (locked && LOCKABLE.indexOf(opts.step) >= 0) statusEl.appendChild(h('span', { class: 'history-tag wf-locked' }, '🔒 ' + WL.lockedTag));
        statusEl.appendChild(historyButton(state, preparerName));
      }

      // Phase 1 (ปิด Workflow ของขั้นนี้): แก้ไข / บันทึก / ยกเลิก ตามตารางสิทธิ์ (CR-19)
      var stepMods = !wfOn ? permModules() : null;
      if (stepMods) {
        var stepCtx = permContext();
        if (!P.canAny(P.user(), stepMods, stepCtx)) { readOnlyNote(stepMods, stepCtx); return; }
        if (locked && LOCKABLE.indexOf(opts.step) >= 0) return;
        editButtons(editing);
        return;
      }
      var view = W.viewState(state, store.role(), { step: opts.step, ownerId: opts.ownerId, ownerName: preparerName, editing: editing, locked: locked });
      // ปิด Workflow: ผู้อนุมัติที่ยังไม่ถึงขั้น = อ่านอย่างเดียว (ผู้จัดทำคือ …) ไม่มีข้อความรอส่งอนุมัติ
      if (!wfOn && view.kind === 'waiting') view = { kind: 'readOnly', preparerName: view.preparerName, switchTo: view.switchTo, actions: [] };
      if (view.kind === 'readOnly') {
        var toApprover = wfOn && state.status === 'submitted';
        actionsEl.appendChild(h('span', { class: 'wf-hint' }, toApprover ? fill(WL.readOnlyApprover, { name: approverName() }) : fill(WL.readOnly, { name: view.preparerName })));
        actionsEl.appendChild(switchButton(view.switchTo, toApprover ? WL.switchToApprover : WL.switchToPreparer));
        return;
      }
      if (view.kind === 'waiting') {
        actionsEl.appendChild(h('span', { class: 'wf-hint' }, fill(WL.waiting, { name: view.preparerName })));
        actionsEl.appendChild(switchButton(view.switchTo, WL.switchToPreparer));
        return;
      }
      wrap.actions = FT.visibleActions(view.actions);
      wrap.actions.forEach(function (a) {
        if (a === 'submit') {
          var facts = opts.facts ? opts.facts() : {};
          var cs = W.canSubmit(opts.step, opts.unitId, opts.year, { states: states, remaining: facts.remaining, ready: facts.ready, baselineLocked: locked });
          var reason = cs.ok ? null : cs.reason === 'baseline' ? WL.reasons.baseline : (WL.reasons[cs.reason] || {})[opts.step];
          if (reason) actionsEl.appendChild(h('span', { class: 'wf-reason', role: 'note' }, reason));
          actionsEl.appendChild(button('submit', true, { disabled: !cs.ok, title: reason }));
        } else if (a === 'edit') {
          actionsEl.appendChild(editButton(wrap.actions.indexOf('submit') < 0));
        } else {
          actionsEl.appendChild(button(a, a === 'save' || a === 'approve'));
        }
      });
    }

    wrap.update = render;
    render();
    return wrap;
  }

  // ลูกศรซ้าย/ขวาเลื่อนไปช่องก่อนหน้า/ถัดไป (เมื่อ Cursor อยู่ต้น/ท้ายช่อง หรือเลือกทั้งช่องอยู่)
  function bindArrowNav(inputs) {
    inputs.forEach(function (input, i) {
      input.addEventListener('keydown', function (e) {
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        var all = input.selectionStart === 0 && input.selectionEnd === input.value.length;
        var target = null;
        if (e.key === 'ArrowRight' && (all || input.selectionStart === input.value.length)) target = inputs[i + 1];
        if (e.key === 'ArrowLeft' && (all || input.selectionEnd === 0)) target = inputs[i - 1];
        if (target) { e.preventDefault(); target.focus(); }
      });
    });
  }

  // =====================================================================
  // Product Master และส่วนกลางที่เพิ่มใน v6 / v7
  // =====================================================================

  function placeTip(tip, target) {
    var r = target.getBoundingClientRect();
    var w = tip.offsetWidth, ht = tip.offsetHeight;
    var vw = document.documentElement.clientWidth;
    var left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, vw - w - 8));
    var top = r.bottom + 6;
    if (top + ht > window.innerHeight - 8) top = r.top - ht - 6;
    tip.style.left = left + 'px';
    tip.style.top = Math.max(8, top) + 'px';
  }

  // Tooltip ทั่วไป (Hover หรือโฟกัสด้วยคีย์บอร์ด) root = กล่องที่ครอบ / selector = องค์ประกอบที่มี Tooltip
  // build(el) → node | null → { hide, refresh }
  var HOVER_TIP = null;
  function hoverTip(root, selector, build) {
    if (!HOVER_TIP) { HOVER_TIP = h('div', { class: 'cell-tip hover-tip', role: 'tooltip', hidden: true }); document.body.appendChild(HOVER_TIP); }
    var current = null;
    function hide() { if (current) { HOVER_TIP.hidden = true; current = null; } }
    function show(t) {
      var node = build(t);
      if (!node) { hide(); return; }
      current = t;
      clear(HOVER_TIP);
      append(HOVER_TIP, node);
      HOVER_TIP.hidden = false;
      placeTip(HOVER_TIP, t);
    }
    function find(e) { var t = e.target.closest ? e.target.closest(selector) : null; return t && root.contains(t) ? t : null; }
    root.addEventListener('mouseover', function (e) { var t = find(e); if (t) { if (t !== current) show(t); } else hide(); });
    root.addEventListener('mouseleave', hide);
    root.addEventListener('focusin', function (e) { var t = find(e); if (t) show(t); });
    root.addEventListener('focusout', hide);
    root.addEventListener('scroll', hide, true);
    return { hide: hide, refresh: function () { if (current && document.body.contains(current)) show(current); } };
  }

  // สีของ Series (ภาพแทนรูปสินค้า) = --ser-1 ถึง --ser-8 ตามลำดับ Series ใน Master
  function seriesToken(tax, seriesId) {
    var ids = SP.core.calc.taxonomyChildren(tax, 'series', null).map(function (n) { return n.id; });
    var i = ids.indexOf(seriesId);
    return '--ser-' + ((i < 0 ? 5 : i) % 8 + 1);
  }

  function initials(name) {
    var words = String(name || '').split(/\s+/).filter(Boolean);
    if (!words.length) return '–';
    return (words[0].charAt(0) + (words[1] ? words[1].charAt(0) : '')).toUpperCase();
  }

  // รูปสินค้าย่อ: image (data URL) หรือภาพแทน = ตัวอักษรย่อของ Series บนพื้นสีของ Series
  // opts = { size: 'sm' | 'md' | 'lg' }
  function productThumb(product, tax, opts) {
    var size = (opts && opts.size) || 'sm';
    if (product && product.image) return h('img', { class: 'thumb thumb-' + size, src: product.image, alt: product.name || '', loading: 'lazy' });
    var sname = product ? SP.core.calc.taxonomyName(tax, 'series', product.seriesId) : '';
    return h('span', {
      class: 'thumb thumb-' + size + ' thumb-empty', role: 'img', 'aria-label': labels().product.noImage,
      title: labels().product.noImage, style: { '--c': tokenVar(seriesToken(tax, product && product.seriesId)) }
    }, initials(sname));
  }

  // ย่อรูปที่เลือกจากเครื่องด้วย Canvas ให้ด้านยาวไม่เกิน maxPx แล้วคืน data URL (ไม่เก็บไฟล์ต้นฉบับ) → Promise<string>
  function resizeImage(file, maxPx) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) { reject(new Error('type')); return; }
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('read')); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('decode')); };
        img.onload = function () {
          var scale = Math.min(1, maxPx / Math.max(img.width || 1, img.height || 1));
          var w = Math.max(1, Math.round(img.width * scale)), ht = Math.max(1, Math.round(img.height * scale));
          var canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = ht;
          canvas.getContext('2d').drawImage(img, 0, 0, w, ht);
          resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ป้ายความครบถ้วน (calc.productCompleteness): ครบ / ขาดจำเป็น n / ขาดที่ควรมี n — Tooltip บอกชื่อฟิลด์
  function completenessBadge(c) {
    var P = labels().product;
    var names = labels().productFields;
    var list = c.missingRequired.concat(c.missingRecommended).map(function (f) { return names[f] || f; });
    var text = c.level === 'ok' ? P.complete : c.level === 'required' ? fill(P.missingRequired, { n: c.missingRequired.length }) : fill(P.missingRecommended, { n: c.missingRecommended.length });
    var title = c.level === 'ok' ? P.completeTitle : [
      c.missingRequired.length ? fill(P.missingRequiredTitle, { fields: c.missingRequired.map(function (f) { return names[f] || f; }).join(', ') }) : null,
      c.missingRecommended.length ? fill(P.missingRecommendedTitle, { fields: c.missingRecommended.map(function (f) { return names[f] || f; }).join(', ') }) : null
    ].filter(Boolean).join(' · ');
    return h('span', { class: 'badge ' + (c.level === 'ok' ? 'tag-ok' : c.level === 'required' ? 'tag-danger' : 'tag-warn'), title: title, 'aria-label': text + (list.length ? ' · ' + title : '') }, text);
  }

  // เส้นเวลา Status 12 เดือน (calc.statusSegments) ช่องละเดือน สีตาม Status มีชื่อเดือนและ Status ใน Tooltip
  function statusStrip(segments, year) {
    var S = labels().status;
    var cells = [];
    segments.forEach(function (seg) {
      for (var m = seg.from; m <= seg.to; m++) cells.push({ className: 'st-' + seg.status, text: F.month(m), title: F.monthYear(m, year) + ' · ' + S[seg.status] });
    });
    return h('div', { class: 'status-strip', role: 'list' }, cells.map(function (c) { return h('span', { class: 'status-cell ' + c.className, role: 'listitem', title: c.title }, c.text); }));
  }

  // Dropdown แบบลำดับชั้นของหมวดสินค้า (Category → Sub Category → Type) หรือ Series (Series → Sub Series)
  // เลือกระดับบนแล้วระดับล่างแสดงเฉพาะรายการใต้ระดับนั้น / รายการที่ปิดใช้งานเลือกใหม่ไม่ได้ (ค่าปัจจุบันยังแสดงชื่อได้)
  // opts: { tax, kind: 'category' | 'series', value: { <field>: id }, labels: [ป้ายต่อระดับ], placeholder, onChange(value), dirty(field) }
  function cascadeSelect(opts) {
    var calc = SP.core.calc;
    var fields = opts.kind === 'category' ? ['categoryId', 'subCategoryId', 'typeId'] : ['seriesId', 'subSeriesId'];
    var value = {};
    fields.forEach(function (f) { value[f] = opts.value[f] || null; });
    var wrap = h('span', { class: 'cascade' });
    function render() {
      clear(wrap);
      fields.forEach(function (f, i) {
        var parentId = i === 0 ? null : value[fields[i - 1]];
        var disabled = i > 0 && !parentId;
        var sel = h('select', { class: 'select select-sm' + (opts.dirty && opts.dirty(f) ? ' is-dirty-cell' : ''), 'aria-label': opts.labels[i], disabled: disabled });
        sel.appendChild(h('option', { value: '' }, opts.placeholder));
        (disabled ? [] : calc.taxonomyChildren(opts.tax, opts.kind, parentId)).forEach(function (n) {
          var off = n.active === false && n.id !== value[f];
          sel.appendChild(h('option', { value: n.id, disabled: off }, n.name + (n.active === false ? ' (' + labels().inactive + ')' : '')));
        });
        sel.value = value[f] || '';
        sel.addEventListener('change', function () {
          value[f] = sel.value || null;
          for (var j = i + 1; j < fields.length; j++) value[fields[j]] = null;
          opts.onChange(JSON.parse(JSON.stringify(value)));
          render();
        });
        wrap.appendChild(h('label', { class: 'cascade-field' }, h('span', { class: 'field-label' }, opts.labels[i]), sel));
      });
    }
    render();
    return wrap;
  }

  // แผงรายละเอียดด้านขวา (Drawer) opts: { label, className, beforeClose() → bool, onClose }
  // → { el, head, body, open(), close(), isOpen() } Module เติมเนื้อหาใน head / body เอง / ปิดด้วย × หรือ Esc หรือคลิกพื้นหลัง
  function drawer(opts) {
    opts = opts || {};
    var D = labels().dialog;
    var head = h('div', { class: 'drawer-head' });
    var body = h('div', { class: 'drawer-body' });
    var backdrop = h('div', { class: 'drawer-backdrop no-print', hidden: true, onClick: function () { close(); } });
    var el = h('aside', { class: 'drawer ' + (opts.className || ''), role: 'dialog', 'aria-label': opts.label || '', hidden: true },
      h('div', { class: 'drawer-top' }, head, h('button', { type: 'button', class: 'icon-btn drawer-close no-print', title: D.close, 'aria-label': D.close, onClick: function () { close(); } }, '×')),
      body);
    document.body.appendChild(backdrop);
    document.body.appendChild(el);
    function esc(e) {
      if (e.key !== 'Escape' || el.hidden) return;
      if (document.querySelector('dialog[open]') || document.querySelector('.popover')) return;
      close();
    }
    function open() {
      el.hidden = false;
      backdrop.hidden = false;
      document.addEventListener('keydown', esc);
    }
    function close() {
      if (el.hidden) return;
      if (opts.beforeClose && !opts.beforeClose()) return;
      el.hidden = true;
      backdrop.hidden = true;
      document.removeEventListener('keydown', esc);
      if (opts.onClose) opts.onClose();
    }
    return { el: el, head: head, body: body, open: open, close: close, isOpen: function () { return !el.hidden; } };
  }

  // กล่องให้เลือก 1 ทางเลือก opts: { title, lines, choices: [{ value, label, primary }] } → Promise<value | null (ยกเลิก)>
  function choiceDialog(opts) {
    var D = labels().dialog;
    return new Promise(function (resolve) {
      var dlg = h('dialog', { class: 'sp-dialog', 'aria-label': opts.title });
      var finished = false;
      function done(v) {
        if (finished) return;
        finished = true;
        if (dlg.open) dlg.close();
        if (dlg.parentNode) dlg.parentNode.removeChild(dlg);
        resolve(v);
      }
      dlg.appendChild(h('div', { class: 'dlg-body' },
        h('h2', { class: 'dlg-title' }, opts.title),
        opts.lines && opts.lines.length ? h('ul', { class: 'dlg-lines' }, opts.lines.map(function (l) { return h('li', null, l); })) : null,
        h('div', { class: 'dlg-actions' },
          h('button', { type: 'button', class: 'btn btn-ghost dlg-cancel', onClick: function () { done(null); } }, D.cancel),
          opts.choices.map(function (c) {
            return h('button', { type: 'button', class: 'btn dlg-choice dlg-choice-' + c.value + (c.primary ? ' btn-primary dlg-confirm' : ' btn-secondary'), onClick: function () { done(c.value); } }, c.label);
          }))));
      dlg.addEventListener('cancel', function (e) { e.preventDefault(); done(null); });
      document.body.appendChild(dlg);
      if (typeof dlg.showModal === 'function') dlg.showModal();
      else { finished = true; dlg.parentNode.removeChild(dlg); resolve(opts.choices[0].value); }
    });
  }

  // ปุ่ม "ส่งออก ▾" (Excel / CSV) ในแถวหัวหน้า
  // opts: { build(source) → { filename (ไม่มีนามสกุล), sheets: [{ name, header, columns, rows }] }, unsaved() → จำนวนรายการที่ยังไม่บันทึก }
  //   มีรายการที่ยังไม่บันทึก → ถามก่อนว่า ส่งออกค่าที่ยังไม่บันทึก (source 'draft') หรือค่าที่บันทึกล่าสุด ('saved')
  //   CSV ใช้ Sheet แรก (ไม่มีแถวหัวไฟล์) / Excel โหลด SheetJS ครั้งแรกที่กด โหลดไม่ได้ → เสนอ CSV แทน
  function exportButton(opts) {
    var X = labels().exporting;
    var E = SP.core['export'];
    var btn = h('button', { type: 'button', class: 'btn btn-secondary btn-sm export-btn no-print' }, X.button);
    function pickSource() {
      var n = opts.unsaved ? opts.unsaved() : 0;
      if (!n) return Promise.resolve('saved');
      return choiceDialog({ title: fill(X.unsavedTitle, { n: n }), choices: [{ value: 'draft', label: X.useDraft, primary: true }, { value: 'saved', label: X.useSaved }] });
    }
    function csv(spec) { var sh = spec.sheets[0]; E.downloadCsv(spec.filename + '.csv', sh.rows, sh.columns); }
    function run(kind) {
      pickSource().then(function (source) {
        if (!source) return;
        var spec = opts.build(source);
        if (kind === 'csv') { csv(spec); return; }
        btn.disabled = true;
        btn.textContent = X.loading;
        function reset() { btn.disabled = false; btn.textContent = X.button; }
        E.toXlsx(spec.sheets, { filename: spec.filename + '.xlsx' }).then(reset, function () {
          reset();
          dialog({ title: X.xlsxFailed, confirmLabel: X.csv }).then(function (r) { if (r.ok) csv(spec); });
        });
      });
    }
    popover(btn, function (close) {
      return h('ul', { class: 'menu-list' }, [['xlsx', X.xlsx], ['csv', X.csv]].map(function (it) {
        return h('li', null, h('button', { type: 'button', class: 'menu-item export-' + it[0], onClick: function () { close(); run(it[0]); } }, it[1]));
      }));
    }, { className: 'menu-popover', label: X.button, align: 'right' });
    return btn;
  }

  // ข้อความ ⓘ ของยอดขายฐาน — CR-24: ยอดขาย L12M = ยอดขายจริง 12 เดือนล่าสุดที่ปิดแล้ว (ช่วงเดือนจาก core/clock.js) ใช้เทียบการเติบโต
  //   (ไม่มี clock = แบบเดิม: ยอดขายปี {ปี} = ยอดขายจริง ม.ค.–{เดือนตัดยอด} + ประมาณการ {เดือนถัดไป}–ธ.ค.)
  function priorNote(year) {
    var P = labels().priorInfo;
    if (SP.core.clock && P.l12mNote) return fill(P.l12mNote, { range: SP.core.clock.rangeLabel(false) });
    var y = SP.data.history.years[year];
    if (!y) return fill(P.none, { year: year });
    var n = y.actualMonths;
    if (n >= 12) return fill(P.actual, { year: year });
    if (!n) return fill(P.estimate, { year: year });
    return fill(P.mixed, { year: year, actual: F.monthRange(0, n - 1), estimate: F.monthRange(n, 11) });
  }

  // ชื่อบทบาทจำลอง (CR-19): {บทบาท} · {Channel} · {ชื่อ} (Sales Manager / Officer) / {บทบาท} · {ชื่อ} (บทบาทอื่น)
  //   ใช้ในตัวเลือกมุมมองผู้ใช้ ประวัติ ปุ่มสลับ และหัวไฟล์ส่งออก / roleTitle = ไม่มีชื่อคน (ป้ายปุ่มสลับ)
  //   CR-21: ผู้ใช้จาก master.users (บทบาทแรก · Channel ของทีม · ชื่อ) ชื่อบทบาทจาก master.roles
  function roleName(r) {
    if (!r) return '';
    var P = SP.core.permissions;
    if (!P) return r.type === 'sales' ? personName(SP.core.store.get('master.salespeople'), r.personId) || labels().roles.sales : labels().roles[r.type] || r.type;
    var u = P.normalize(r);
    return [P.roleTitle(u), u.name].filter(Boolean).join(' · ');
  }
  function roleTitle(r) {
    if (!r) return '';
    var P = SP.core.permissions;
    return P ? P.roleTitle(r) : (labels().roles[r.type] || r.type);
  }

  // CR-21: Chip ระดับสิทธิ์ ไม่เห็น (เทา) · ดู (ฟ้าอ่อน) · แก้ไข (เขียว) + "· ทีม" / ปุ่มเฉพาะ (action) ✓ อนุญาต · – ไม่อนุญาต
  //   opts = { level: 'NONE' | 'VIEW' | 'EDIT', scope: 'ALL' | 'TEAM', action, changed (ต่างจากค่าตั้งต้น = จุดมุม), title }
  function permChip(opts) {
    var X = labels().perm;
    var lv = opts.level || 'VIEW';
    var text = opts.action ? (lv === 'EDIT' ? X.allowed : X.denied) : X.levels[lv];
    if (lv === 'EDIT' && opts.scope === 'TEAM') text += ' · ' + X.team;
    var cls = 'perm-chip is-' + lv.toLowerCase() + (opts.action ? ' is-action' : '') + (opts.changed ? ' is-changed' : '');
    var aria = (opts.action ? (lv === 'EDIT' ? X.allowedText : X.deniedText) : X.levels[lv]) + (lv === 'EDIT' && opts.scope === 'TEAM' ? ' · ' + X.teamText : '') + (opts.changed ? ' · ' + X.changed : '');
    return h('span', { class: cls, title: opts.title || aria, 'aria-label': aria }, text);
  }

  // แถวหัวไฟล์ส่งออก (Excel เท่านั้น): ปีแผน · สถานะ · วันเวลาที่ส่งออก · มุมมองผู้ใช้ (+ extra = [[ป้าย, ค่า]])
  //   CR-17: ปิด approvalWorkflow = ไม่มีแถวสถานะ Workflow (ข้อความสถานะอื่น เช่น มุมมองรวม ยังแสดง)
  function exportHeader(year, status, extra) {
    var X = labels().exporting;
    var wfStatus = !!labels().workflow.status[status];
    var rows = [[X.headerYear, year]];
    if (status && (!wfStatus || SP.core.features.isOn('approvalWorkflow'))) rows.push([X.headerStatus, labels().workflow.status[status] || status]);
    return rows.concat([[X.headerAt, F.dateTime(new Date().toISOString())], [X.headerRole, roleName(SP.core.store.role())]]).concat(extra || []);
  }

  // ส่วนท้ายชื่อไฟล์: สถานะภาษาอังกฤษสั้น + วันที่ YYYYMMDD / ชื่อหน่วยขายตัดอักขระที่ใช้ในชื่อไฟล์ไม่ได้
  //   CR-17: ปิด approvalWorkflow = status ว่าง (Module ตัด _ ที่ซ้ำในชื่อไฟล์)
  function exportStamp(status) {
    var d = new Date();
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var code = SP.core.features.isOn('approvalWorkflow') ? labels().exporting.statusCode[status] || status : '';
    return { status: code, date: d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) };
  }
  function fileSafe(text) { return String(text || '').replace(/[\\/:*?"<>|\s]+/g, '-'); }

  // ป้าย "ยอดขายปี {ปี}" + ⓘ (Tooltip ที่มาของตัวเลข) ใช้ในแถบ Total, หัวคอลัมน์, แถบบริบท และรายงาน
  //   CR-24: ป้ายตั้งต้น = ยอดขาย L12M · note = ข้อความ ⓘ อื่น (เช่น referenceNote ของยอดขายอ้างอิงรายเดือน)
  function priorLabel(year, text, note) {
    var n = note || priorNote(year);
    return h('span', { class: 'prior-label' }, text || fill(labels().priorInfo.label, { year: year }),
      h('span', { class: 'info-dot', title: n, 'aria-label': n, tabindex: '0', role: 'note' }, 'ⓘ'));
  }
  // CR-24: ⓘ ของยอดขายอ้างอิงรายเดือน — ม.ค.–ส.ค. ใช้ยอดจริงปี 2026 · ก.ย.–ธ.ค. ใช้ยอดจริงปี 2025 (ช่วงเดือนจาก core/clock.js)
  function referenceNote() {
    var R = labels().referenceInfo;
    var K = SP.core.clock;
    var lc = K.parse(K.lastClosedMonth());
    if (lc.month >= 12) return fill(R.allLatest, { year: lc.year });
    return fill(R.note, { latestMonths: F.monthRange(0, lc.month - 1), year: lc.year, olderMonths: F.monthRange(lc.month, 11), prev: lc.year - 1 });
  }

  // =====================================================================
  // CR-11: ตารางกรอกตัวเลข — คีย์บอร์ด, เลือกช่วง, คัดลอก/วางกับ Excel, เติมลง/ขวา, ล้างค่า, ย้อนกลับ, ไฮไลต์แถวและคอลัมน์
  // =====================================================================

  // ประวัติสำหรับย้อนกลับ (Ctrl+Z) ภายในรอบแก้ไข: push(ค่าก่อนเปลี่ยน) / pop() → ค่าล่าสุด | null / clear() / size()
  function undoStack(limit) {
    var list = [];
    var max = limit || 50;
    return {
      push: function (state) { list.push(JSON.parse(JSON.stringify(state))); if (list.length > max) list.shift(); },
      pop: function () { return list.length ? list.pop() : null; },
      clear: function () { list = []; },
      size: function () { return list.length; }
    };
  }

  // กล่องกรอกตัวเลข opts: { title, label, suffix, value, hint, invalidText } → Promise<{ ok, value }>
  function promptNumber(opts) {
    var D = labels().dialog;
    return new Promise(function (resolve) {
      var input = h('input', { type: 'text', inputmode: 'decimal', class: 'num dlg-number', 'aria-label': opts.label, value: opts.value != null ? String(opts.value) : '' });
      var err = h('p', { class: 'dlg-error', role: 'alert', hidden: true });
      var dlg = h('dialog', { class: 'sp-dialog', 'aria-label': opts.title });
      var finished = false;
      function done(ok) {
        if (finished) return;
        var v = parseNumber(input.value);
        if (ok && v == null) { err.textContent = opts.invalidText || ''; err.hidden = false; input.focus(); return; }
        finished = true;
        if (dlg.open) dlg.close();
        if (dlg.parentNode) dlg.parentNode.removeChild(dlg);
        resolve({ ok: ok, value: v });
      }
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); done(true); } });
      dlg.appendChild(h('div', { class: 'dlg-body' },
        h('h2', { class: 'dlg-title' }, opts.title),
        h('label', { class: 'dlg-number-label' }, h('span', { class: 'field-label' }, opts.label), h('span', { class: 'dlg-number-wrap' }, input, opts.suffix ? h('span', { class: 'num-suffix' }, opts.suffix) : null)),
        opts.hint ? h('p', { class: 'dlg-text' }, opts.hint) : null,
        err,
        h('div', { class: 'dlg-actions' },
          h('button', { type: 'button', class: 'btn btn-ghost dlg-cancel', onClick: function () { done(false); } }, D.cancel),
          h('button', { type: 'button', class: 'btn btn-primary dlg-confirm', onClick: function () { done(true); } }, D.confirm))));
      dlg.addEventListener('cancel', function (e) { e.preventDefault(); done(false); });
      document.body.appendChild(dlg);
      if (typeof dlg.showModal === 'function') { dlg.showModal(); input.focus(); input.select(); }
      else {
        dlg.parentNode.removeChild(dlg);
        finished = true;
        var raw = window.prompt(opts.title, input.value);
        var v = raw == null ? null : parseNumber(raw);
        resolve({ ok: raw != null && v != null, value: v });
      }
    });
  }

  // ---------------------------------------------------------------------
  // CR-16: ตัวเลือกเดือนในแถวหัวข้อ "ข้อมูล ณ เดือน [ก.ย. 2026 ▾]" (ขนาดตัวอักษรเท่าหัวข้อ เหมือนตัวเลือกปีแผน)
  // opts: { label, tip, value ('YYYY-MM'), months: [key ที่เลือกได้], current (เดือนปัจจุบัน), currentLabel, onChange(key), guard() → bool }
  //   Popover = ตารางเดือน 1 แถวต่อปี (เดือนที่ไม่อยู่ใน months กดไม่ได้) / เดือนปัจจุบันมีเส้นใต้ + Tooltip currentLabel
  // → element (display: contents) ที่มี .set(key)
  // ---------------------------------------------------------------------
  function monthPicker(opts) {
    var value = opts.value;
    var btn = h('button', { type: 'button', class: 'year-title month-title', title: opts.tip || opts.label });
    function renderBtn() {
      clear(btn);
      btn.appendChild(h('span', { class: 'month-title-label' }, opts.label));
      btn.appendChild(h('span', { class: 'year-title-value' }, F.date(value)));
      btn.appendChild(h('span', { class: 'year-title-caret no-print', 'aria-hidden': 'true' }, '▾'));
      btn.setAttribute('aria-label', opts.label + ' ' + F.date(value));
    }
    var years = [];
    (opts.months || []).forEach(function (k) { var y = Number(k.slice(0, 4)); if (years.indexOf(y) < 0) years.push(y); });
    popover(btn, function (close) {
      return h('div', { class: 'month-grid' }, years.map(function (y) {
        return h('div', { class: 'month-grid-row' }, h('span', { class: 'month-grid-year' }, String(y)), F.MONTHS.map(function (name, m) {
          var key = SP.core.calc.monthKey(y, m);
          var ok = opts.months.indexOf(key) >= 0;
          return h('button', {
            type: 'button', class: 'month-grid-cell' + (key === value ? ' is-selected' : '') + (key === opts.current ? ' is-current' : ''),
            disabled: !ok, 'aria-pressed': key === value ? 'true' : 'false', title: key === opts.current ? opts.currentLabel : F.date(key),
            onClick: function () {
              close();
              if (key === value) return;
              if (opts.guard && !opts.guard()) return;
              value = key;
              renderBtn();
              opts.onChange(key);
            }
          }, name);
        }));
      }));
    }, { className: 'month-popover', label: opts.label });
    renderBtn();
    var wrap = h('span', { class: 'month-picker' }, btn);
    wrap.set = function (k) { value = k; renderBtn(); };
    return wrap;
  }

  // CR-16: ไอคอนเล็กบอกว่าชื่อถูกซ่อน (ร้านค้าที่ชื่อเป็นบุคคลธรรมดา) + Tooltip
  function privacyMark(title) {
    return h('span', { class: 'privacy-mark', title: title, 'aria-label': title, role: 'img' }, icon('person-off'));
  }

  // CR-16: กล่องกรอกข้อความ 1 ช่อง opts: { title, label, value, hint, confirmLabel, validate(value) → ข้อความ error | null }
  //   → Promise<{ ok, value (ตัดช่องว่างหัวท้าย) }> / validate ไม่ผ่าน = แสดงข้อความในกล่อง ไม่ปิด
  function promptText(opts) {
    var D = labels().dialog;
    return new Promise(function (resolve) {
      var input = h('input', { type: 'text', class: 'pm-input dlg-text-input', 'aria-label': opts.label, value: opts.value || '' });
      var err = h('p', { class: 'dlg-error', role: 'alert', hidden: true });
      var dlg = h('dialog', { class: 'sp-dialog', 'aria-label': opts.title });
      var finished = false;
      function done(ok) {
        if (finished) return;
        var v = input.value.trim();
        var e = ok && opts.validate ? opts.validate(v) : null;
        if (e) { err.textContent = e; err.hidden = false; input.focus(); return; }
        finished = true;
        if (dlg.open) dlg.close();
        if (dlg.parentNode) dlg.parentNode.removeChild(dlg);
        resolve({ ok: ok, value: v });
      }
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); done(true); } });
      dlg.appendChild(h('div', { class: 'dlg-body' },
        h('h2', { class: 'dlg-title' }, opts.title),
        h('label', { class: 'dlg-number-label' }, h('span', { class: 'field-label' }, opts.label), input),
        opts.hint ? h('p', { class: 'dlg-text' }, opts.hint) : null,
        err,
        h('div', { class: 'dlg-actions' },
          h('button', { type: 'button', class: 'btn btn-ghost dlg-cancel', onClick: function () { done(false); } }, D.cancel),
          h('button', { type: 'button', class: 'btn btn-primary dlg-confirm', onClick: function () { done(true); } }, opts.confirmLabel || D.confirm))));
      dlg.addEventListener('cancel', function (e) { e.preventDefault(); done(false); });
      document.body.appendChild(dlg);
      if (typeof dlg.showModal === 'function') { dlg.showModal(); input.focus(); input.select(); }
      else {
        dlg.parentNode.removeChild(dlg);
        finished = true;
        var raw = window.prompt(opts.title, input.value);
        var v = raw == null ? '' : raw.trim();
        resolve({ ok: raw != null && !(opts.validate && opts.validate(v)), value: v });
      }
    });
  }

  // ผูกคีย์บอร์ดและเมาส์กับตาราง: แถวข้อมูลมี data-row (key) ช่องมี data-col (0 ถึง cols − 1) ช่องที่แก้ได้มี <input>
  //   หัวคอลัมน์ที่มี data-col เดียวกันไฮไลต์ตามช่องที่ชี้ / แถวที่ hidden ไม่นับ (ค้นหา, พับกลุ่ม)
  // opts: { editing, cols, pasteCols (คอลัมน์ที่วาง/เติม/ล้างได้ ค่าตั้งต้น = cols), valueAt(key, col) → ตัวเลข (ค่าที่คัดลอก),
  //         apply(writes) (writes = [{ key, m, qty }]), undo() }
  // คีย์: ลูกศร / Enter (ลงล่าง) / Tab (ไปขวา) / Shift+ลูกศร (เลือกช่วง) / Ctrl+C / Ctrl+V / Delete / Ctrl+D / Ctrl+R / Ctrl+Z
  // แปลงช่วงเป็น writes ด้วย calc.pasteCells / fillCells / parseTsv / toTsv — ช่องที่แก้ไม่ได้ข้ามเสมอ
  function gridKeys(table, opts) {
    var calc = SP.core.calc;
    var sel = null;          // { r0, c0 } จุดเริ่ม / { r1, c1 } ช่องปัจจุบัน
    var quiet = false;       // โฟกัสจากโค้ด (ไม่รีเซ็ตช่วงที่เลือก)
    var dragging = false;
    var pasteCols = opts.pasteCols == null ? opts.cols : opts.pasteCols;

    function rows() {
      return Array.prototype.filter.call(table.querySelectorAll('tbody tr[data-row]'), function (tr) { return !tr.hidden; });
    }
    function cellEl(r, c) { var tr = rows()[r]; return tr ? tr.querySelector('[data-col="' + c + '"]') : null; }
    function posOf(node) {
      var td = node && node.closest ? node.closest('[data-col]') : null;
      var tr = td && td.closest('tr[data-row]');
      if (!tr || !table.contains(tr)) return null;
      var r = rows().indexOf(tr);
      return r < 0 ? null : { r: r, c: Number(td.dataset.col), td: td, tr: tr };
    }
    function cellAt(r, c) {
      var td = cellEl(r, c);
      if (!td || c >= pasteCols) return td ? { key: td.closest('tr').dataset.row, m: c, editable: false } : null;
      return { key: td.closest('tr').dataset.row, m: c, editable: !!opts.editing && !!td.querySelector('input') };
    }
    function range() {
      if (!sel) return null;
      return { r0: Math.min(sel.r0, sel.r1), r1: Math.max(sel.r0, sel.r1), c0: Math.min(sel.c0, sel.c1), c1: Math.max(sel.c0, sel.c1) };
    }
    function multi() { var g = range(); return !!g && (g.r0 !== g.r1 || g.c0 !== g.c1); }
    function paint() {
      Array.prototype.forEach.call(table.querySelectorAll('.is-sel'), function (el) { el.classList.remove('is-sel'); });
      if (!multi()) return;
      var g = range();
      for (var r = g.r0; r <= g.r1; r++) for (var c = g.c0; c <= g.c1; c++) { var td = cellEl(r, c); if (td) td.classList.add('is-sel'); }
    }
    function focusCell(r, c) {
      var td = cellEl(r, c);
      if (!td) return false;
      var inp = td.querySelector('input');
      quiet = true;
      (inp || td).focus();
      quiet = false;
      if (inp) inp.select();
      return true;
    }
    function moveTo(r, c, extend) {
      var n = rows().length;
      if (!n) return;
      r = Math.max(0, Math.min(n - 1, r));
      c = Math.max(0, Math.min(opts.cols - 1, c));
      if (!sel || !extend) sel = { r0: r, c0: c, r1: r, c1: c };
      else { sel.r1 = r; sel.c1 = c; }
      focusCell(r, c);
      paint();
    }
    function writesClear() {
      var g = range(), out = [];
      if (!g) return out;
      for (var r = g.r0; r <= g.r1; r++) for (var c = g.c0; c <= g.c1; c++) {
        var cell = cellAt(r, c);
        if (cell && cell.editable) out.push({ key: cell.key, m: cell.m, qty: 0 });
      }
      return out;
    }
    function valueAtPos(r, c) { var tr = rows()[r]; return tr ? opts.valueAt(tr.dataset.row, c) : null; }
    function matrix() {
      var g = range(), out = [];
      for (var r = g.r0; r <= g.r1; r++) {
        var line = [];
        for (var c = g.c0; c <= g.c1; c++) { var v = valueAtPos(r, c); line.push(v == null ? '' : Math.round(v)); }
        out.push(line);
      }
      return out;
    }
    function typing(input) { return !!input && input.dataset.committed != null && input.value !== input.dataset.committed; }

    table.addEventListener('focusin', function (e) {
      var p = posOf(e.target);
      if (!p || quiet) return;
      sel = { r0: p.r, c0: p.c, r1: p.r, c1: p.c };
      var inp = p.td.querySelector('input');
      if (inp) inp.dataset.committed = inp.value;
      paint();
    });
    table.addEventListener('keydown', function (e) {
      var p = posOf(e.target);
      if (!p) return;
      var input = e.target.tagName === 'INPUT' ? e.target : null;
      var ctrl = e.ctrlKey || e.metaKey;
      var k = e.key;
      if (ctrl && (k === 'd' || k === 'D' || k === 'r' || k === 'R')) {
        e.preventDefault();
        if (!opts.editing || !sel) return;
        var ws = calc.fillCells(range(), k.toLowerCase() === 'd' ? 'down' : 'right', valueAtPos, cellAt);
        if (ws.length) opts.apply(ws);
        return;
      }
      if (ctrl && (k === 'z' || k === 'Z') && !e.shiftKey) {
        if (!opts.editing || typing(input)) return;
        e.preventDefault();
        opts.undo();
        return;
      }
      if (ctrl) return;
      if (k === 'Delete' || (k === 'Backspace' && (multi() || !input))) {
        if (!opts.editing || (input && !multi() && !(input.selectionStart === 0 && input.selectionEnd === input.value.length))) return;
        e.preventDefault();
        var cw = writesClear();
        if (cw.length) opts.apply(cw);
        return;
      }
      var at = sel ? { r: sel.r1, c: sel.c1 } : { r: p.r, c: p.c };
      if (k === 'Enter') {
        // ช่องกรอกส่งค่าเอง (components.onCommit) แล้วเลื่อนลง (Shift+Enter ขึ้น)
        e.preventDefault();
        moveTo(at.r + (e.shiftKey ? -1 : 1), at.c, false);
        return;
      }
      if (k === 'Tab') {
        e.preventDefault();
        var nc = at.c + (e.shiftKey ? -1 : 1), nr = at.r;
        if (nc >= opts.cols) { nc = 0; nr += 1; } else if (nc < 0) { nc = opts.cols - 1; nr -= 1; }
        moveTo(nr, nc, false);
        return;
      }
      var dir = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
      if (!dir) return;
      if (input && !e.shiftKey && dir[1] !== 0) {
        var all = input.selectionStart === 0 && input.selectionEnd === input.value.length;
        if (!all && !((dir[1] > 0 && input.selectionStart === input.value.length) || (dir[1] < 0 && input.selectionEnd === 0))) return;
      }
      e.preventDefault();
      if (input && !e.shiftKey) input.blur();
      moveTo(at.r + dir[0], at.c + dir[1], e.shiftKey);
    });
    table.addEventListener('copy', function (e) {
      if (!sel || !posOf(document.activeElement)) return;
      var input = document.activeElement.tagName === 'INPUT' ? document.activeElement : null;
      if (input && !multi() && !(input.selectionStart === 0 && input.selectionEnd === input.value.length)) return;
      if (!e.clipboardData) return;
      e.preventDefault();
      e.clipboardData.setData('text/plain', calc.toTsv(matrix()));
    });
    table.addEventListener('paste', function (e) {
      if (!opts.editing || !sel || !posOf(e.target) || !e.clipboardData) return;
      var text = e.clipboardData.getData('text/plain');
      var m = calc.parseTsv(text);
      if (!m.length) return;
      e.preventDefault();
      var g = range();
      var ws = calc.pasteCells(m, g.r0, g.c0, cellAt, multi() ? { rows: g.r1 - g.r0 + 1, cols: g.c1 - g.c0 + 1 } : null);
      if (ws.length) opts.apply(ws);
    });
    table.addEventListener('mousedown', function (e) {
      var p = posOf(e.target);
      if (!p || e.button !== 0) return;
      if (e.shiftKey && sel) { e.preventDefault(); sel.r1 = p.r; sel.c1 = p.c; focusCell(p.r, p.c); paint(); return; }
      dragging = true;
    });
    table.addEventListener('mouseover', function (e) {
      var p = posOf(e.target);
      Array.prototype.forEach.call(table.querySelectorAll('.is-hover-row, .is-hover-col'), function (el) { el.classList.remove('is-hover-row', 'is-hover-col'); });
      if (!p) return;
      p.tr.classList.add('is-hover-row');
      var head = table.querySelector('thead [data-col="' + p.c + '"]');
      if (head) head.classList.add('is-hover-col');
      if (dragging && sel && (p.r !== sel.r1 || p.c !== sel.c1)) { sel.r1 = p.r; sel.c1 = p.c; paint(); }
    });
    table.addEventListener('mouseleave', function () {
      Array.prototype.forEach.call(table.querySelectorAll('.is-hover-row, .is-hover-col'), function (el) { el.classList.remove('is-hover-row', 'is-hover-col'); });
    });
    document.addEventListener('mouseup', function () { dragging = false; });
    return {
      // หลังค่าเปลี่ยนจากเครื่องมือ: จำค่าในช่องที่โฟกัสใหม่ (ใช้ตัดสินว่ากำลังพิมพ์อยู่หรือไม่) และทาสีช่วงเดิม
      refresh: function () {
        var a = document.activeElement;
        if (a && a.tagName === 'INPUT' && table.contains(a)) a.dataset.committed = a.value;
        paint();
      },
      clear: function () { sel = null; paint(); }
    };
  }

  SP.core.components = {
    undoStack: undoStack,
    promptNumber: promptNumber,
    monthPicker: monthPicker,
    privacyMark: privacyMark,
    promptText: promptText,
    gridKeys: gridKeys,
    h: h,
    clear: clear,
    fill: fill,
    tokenVar: tokenVar,
    alertBadge: alertBadge,
    remainingText: remainingText,
    remainingRow: remainingRow,
    remainingAmount: remainingAmount,
    remainingPct: remainingPct,
    contextStats: contextStats,
    icon: icon,
    trashButton: trashButton,
    multiSelect: multiSelect,
    statusBadge: statusBadge,
    sourceChip: sourceChip,
    legend: legend,
    wfIcon: wfIcon,
    wfBadge: wfBadge,
    remainingBar: remainingBar,
    table: table,
    numberInput: numberInput,
    percentAmountInput: percentAmountInput,
    accountPicker: accountPicker,
    growthText: growthText,
    select: select,
    segmented: segmented,
    card: card,
    callout: callout,
    approveBox: approveBox,
    barChart: barChart,
    statusDot: statusDot,
    searchSelect: searchSelect,
    personColor: personColor,
    personName: personName,
    ownerInfo: ownerInfo,
    ownerStrip: ownerStrip,
    subChannelPicker: subChannelPicker,
    dialog: dialog,
    popover: popover,
    menuButton: menuButton,
    seriesFilter: seriesFilter,
    categoryFilter: categoryFilter,
    filterChips: filterChips,
    rulesContent: rulesContent,
    rulesPanel: rulesPanel,
    rulesButton: rulesButton,
    calcExplainer: calcExplainer,
    cellBreakdown: cellBreakdown,
    editBanner: editBanner,
    guardUnsaved: guardUnsaved,
    confirmDiscard: confirmDiscard,
    planYearPicker: planYearPicker,
    workflowBar: workflowBar,
    bindArrowNav: bindArrowNav,
    hoverTip: hoverTip,
    seriesToken: seriesToken,
    productThumb: productThumb,
    resizeImage: resizeImage,
    completenessBadge: completenessBadge,
    statusStrip: statusStrip,
    cascadeSelect: cascadeSelect,
    drawer: drawer,
    choiceDialog: choiceDialog,
    exportButton: exportButton,
    priorNote: priorNote,
    roleName: roleName,
    roleTitle: roleTitle,
    permChip: permChip,
    exportHeader: exportHeader,
    exportStamp: exportStamp,
    fileSafe: fileSafe,
    priorLabel: priorLabel,
    referenceNote: referenceNote
  };
})(window.SP);

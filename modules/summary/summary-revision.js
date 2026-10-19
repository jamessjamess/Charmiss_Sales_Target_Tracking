/*
 * modules/summary/summary-revision.js — ไฟล์ที่ 2 ของ Plan Summary (CR-39 · Flag revision): แท็บ Revision และแท็บเปรียบเทียบ
 *   (โค้ดเดิมของหน้า Revision List / Revision Compare ของ CR-38 · หน้าเดิมเหลือเป็นทางผ่านมาที่แท็บนี้)
 *
 * แท็บ Revision:     รอบของปีที่เลือกที่หัวหน้า (ตัวเลือก Revision · app.planYear) · การ์ดสถานะรอบปัจจุบัน (components.revisionCard) ·
 *                    ปุ่มตามสิทธิ์และสถานะ (เปิด Revision ใหม่ = revision.open · Dialog เลือกปีแผนที่ยังไม่มีรอบเปิดอยู่ได้) ·
 *                    Flag approval: ร่าง = ส่งขออนุมัติ (Management · core/approval.js create · Dialog ชุดสรุปย่อ + ข้อความบังคับ + ขั้นที่จะผ่าน) ·
 *                    รออนุมัติ = ลิงก์ ดูคำขออนุมัติ (หน้า Approval) · ไม่มีปุ่ม Lock / ส่งกลับ (อยู่ที่หน้า Approval) · ปิด Flag = ปุ่มของ CR-38
 *                    ตาราง Revision · สถานะ · มีผลตั้งแต่ · Total Target · เปลี่ยนจากรอบก่อน · เหตุผล · Lock โดย / เมื่อ · จัดการ (ดู · เปรียบเทียบกับรอบก่อน · ส่งออก) ·
 *                    คลิกแถว = กางประวัติ (R1 เริ่มด้วย สร้างจากข้อมูลตั้งต้น)
 * แท็บเปรียบเทียบ:   Revision A กับ B · ระดับ · ตัวชี้วัด · ทั้งปี / รายเดือน · Channel · หน่วยขาย (calc.compareRevisions ผ่าน core/revision.js) ·
 *                    กราฟ charts.compareLines · ตาราง · มี Revision เดียว = ข้อความ + ลิงก์ไปแท็บ Revision
 * กฎทั้งหมดจาก core/revision.js · ข้อความจาก content.js (pages.revisionList · pages.revisionCompare · labels.revision)
 * ใช้: SP.modules.summary.revisionTab(root, env) · compareTab(root, env) — env = { refresh(), goTab(tab), reload(toast) } (summary.js เรียก)
 * store อ่าน:     app.planYear, revision.list, revision.snap.<id> (ผ่าน core/revision.js), ui.role, ui.revisionCompare (อ่านครั้งเดียว), ui.revisionCompareOpts
 * store เขียน:    ui.revision (ดู) · ui.revisionCompare = { a, b } (เปรียบเทียบกับรอบก่อน) · ui.revisionCompareOpts · ui.toast · revision.* ผ่าน core/revision.js
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var G = SP.core.charts;
  var F = SP.core.format;
  var K = SP.core.clock;
  var calc = SP.core.calc;
  var store = SP.core.store;
  var REV = SP.core.revision;
  var P = SP.core.permissions;
  var AP = SP.core.approval;   // CR-39
  var h = C.h;
  var fill = C.fill;
  var expanded = {};   // แท็บ Revision: <id>: true = กางประวัติ
  var LEVELS = ['total', 'channel', 'unit', 'series', 'sku'];
  var METRICS = ['net', 'sale', 'units'];

  function signedBaht(v) { return (v < 0 ? '−' : '+') + F.baht(Math.abs(v || 0)); }

  // =====================================================================
  // แท็บ Revision
  // =====================================================================
  function revisionTab(root, env) {
    var page = SP.data.content.pages.revisionList;
    var RV = SP.data.content.labels.revision;
    var reg = SP.core.registry;
    var year = store.year();

    function can(res) { return P.can(P.user(), res); }
    function currentOf(l) { return REV.openOf(l, year) || REV.lastLocked(l, year) || REV.latest(l, year); }
    function errorText(res, rev) {
      var E = RV.errors;
      var items = (res.info || []).map(function (k) { return RV.checks[k] || k; }).join(' · ');
      return fill(E[res.error] || res.error, { name: rev ? rev.name : '', items: items });
    }
    // สำเร็จ = แจ้งแล้วโหลดหน้าใหม่ (ตัวเลือก Revision และแถบสถานะที่หัวหน้าเปลี่ยนตามรอบ)
    function after(res, rev, kind) {
      if (!res.ok) { window.alert(errorText(res, rev)); return; }
      env.reload(fill(page.done[kind], { name: res.rev ? res.rev.name : rev ? rev.name : '' }));
    }
    function btn(label, onClick, primary, cls) {
      return h('button', { type: 'button', class: 'btn btn-sm ' + (primary ? 'btn-primary' : 'btn-secondary') + ' ' + (cls || ''), onClick: onClick }, label);
    }
    // ปีแผนที่ยังไม่มีรอบร่าง / รออนุมัติ (เปิดรอบใหม่ได้)
    function openYears(l) { return (SP.data.settings.PLAN_YEARS || [year]).filter(function (y) { return !REV.openOf(l, y); }); }

    // ---------- ปุ่มตามสิทธิ์และสถานะ ----------
    function actionButtons(cur, l) {
      var A = page.actions;
      var out = [];
      var openRev = REV.openOf(l, year);
      if (!openRev && can('revision.open') && openYears(l).length) out.push(btn(A.open, openDialog, true, 'rl-open'));
      // CR-39 Flag approval: ส่งขออนุมัติ · ดูคำขออนุมัติ (Lock / ส่งกลับ อยู่ที่หน้า Approval)
      if (AP && AP.enabled()) {
        if (cur && cur.status === 'draft' && AP.canStep('mgmtSubmit')) out.push(btn(A.request, function () { requestDialog(cur); }, true, 'rl-request'));
        var q = cur ? AP.pendingFor(cur.id) || (cur.status === 'locked' ? AP.forRevision(cur.id) : null) : null;
        if (q) out.push(h('a', { class: 'btn btn-secondary btn-sm rl-view-request', href: requestHref(q.id), onClick: function (e) { e.preventDefault(); openRequest(q.id); } }, A.viewRequest));
        if (!out.length) out.push(h('span', { class: 'wf-hint rl-hint' }, cur && cur.status === 'draft' && openRev ? page.approvalHint : openRev || !cur ? page.viewOnly : page.openHint));
        return out;
      }
      if (cur && cur.status === 'draft' && can('revision.submit')) out.push(btn(A.submit, function () { submitDialog(cur); }, true, 'rl-submit'));
      if (cur && cur.status === 'submitted') {
        if (can('revision.submit')) out.push(btn(A.withdraw, function () { withdrawDialog(cur); }, false, 'rl-withdraw'));
        if (can('revision.lock')) {
          out.push(btn(A['return'], function () { returnDialog(cur); }, false, 'rl-return'));
          out.push(btn(A.lock, function () { lockDialog(cur); }, true, 'rl-lock'));
        }
      }
      if (!out.length) out.push(h('span', { class: 'wf-hint rl-hint' }, openRev && openRev.status === 'draft' && can('revision.lock') ? fill(page.waitSubmit, { name: openRev.name }) : openRev || !cur ? page.viewOnly : page.openHint));
      return out;
    }

    // เปิด Revision ใหม่: ปีแผน (ปีที่ยังไม่มีรอบเปิดอยู่ · ค่าเริ่มต้น = ปีที่เลือก) · ชื่อรอบ (ระบบตั้ง) · เดือนที่มีผล · เหตุผล (บังคับ)
    //   CR-41: เดือนที่มีผล = กติการะบบจริง (revision.defaultEffective: เดือนถัดจากเดือนปัจจุบันของนาฬิกากลาง · ไม่ก่อนเดือนแรกของปีแผน) แสดงอ่านอย่างเดียว
    function openDialog() {
      var X = page.openDlg;
      var l = REV.list();
      var years = openYears(l);
      if (!years.length) return;
      var y = years.indexOf(year) >= 0 ? year : years[0];
      var eff = null, first = true;
      var part = h('div', { class: 'rl-dlg rl-dlg-part' });
      function fillPart() {
        C.clear(part);
        var last = REV.latest(l, y), base = REV.lastLocked(l, y);
        first = !last;
        var d = REV.defaultEffective(y);
        eff = first || REV.effectiveIssue(y, d) ? null : d;
        part.appendChild(h('p', { class: 'rl-dlg-field' }, h('span', { class: 'field-label' }, X.name), h('strong', { class: 'rl-open-name' }, REV.nameOf(y, (last ? last.seq : 0) + 1)), h('span', { class: 'muted small' }, ' ' + X.nameNote)));
        if (first) part.appendChild(h('p', { class: 'muted small' }, X.effectiveFirst));
        else if (!eff) part.appendChild(h('p', { class: 'dlg-error' }, RV.errors.effective));
        else {
          var next = K.addMonths(K.currentMonth(), 1) === eff;
          part.appendChild(h('p', { class: 'rl-dlg-field' }, h('span', { class: 'field-label' }, X.effective),
            h('strong', { class: 'rl-effective' }, fill(next ? X.effectiveNext : X.effectiveYearStart, { month: K.label(eff) }))));
          part.appendChild(h('p', { class: 'muted small' }, fill(X.effectiveNote, { base: base ? base.name : '' })));
        }
        if (base) part.appendChild(h('p', { class: 'muted small' }, fill(X.copyNote, { base: base.name })));
      }
      fillPart();
      var yearSel = years.length > 1 ? C.select({ label: X.year, value: String(y), className: 'rl-open-year', options: years.map(function (yy) { return { value: String(yy), label: String(yy) }; }),
        onChange: function (v) { y = Number(v); fillPart(); } }) : null;
      var body = h('div', { class: 'rl-dlg' }, yearSel ? h('label', { class: 'rl-dlg-field' }, h('span', { class: 'field-label' }, X.year), yearSel) : null, part);
      C.dialog({ title: yearSel ? X.titlePick : fill(X.title, { year: y }), body: body, note: { label: X.reason, required: true, requiredText: RV.errors.reason }, confirmLabel: X.confirm,
        validate: function () { return !first && !eff ? RV.errors.effective : null; } })
        .then(function (r) {
          if (!r.ok) return;
          after(REV.open({ year: y, effectiveMonth: first ? null : eff, reason: r.note }), null, 'open');
        });
    }

    // CR-39 ส่งขออนุมัติ: ชุดสรุปแบบย่อ (Total และ Channel เทียบรอบก่อน) · ข้อความถึงผู้อนุมัติ (บังคับ) · ขั้นอนุมัติที่จะผ่าน → คำขอใน Module Approval
    function requestHref(id) { return SP.core.paths.to(reg.byId('approval').path) + '#request=' + encodeURIComponent(id); }
    function openRequest(id) { store.set('ui.approvalOpen', id); location.href = requestHref(id); }
    function requestDialog(cur) {
      var X = page.requestDlg, AL = SP.data.content.labels.approval;
      var ov = REV.overview(cur.id);
      var lines = [];
      if (ov.base && ov.baseTotal != null) {
        lines.push(fill(X.totalLine, { a: F.baht(ov.baseTotal), b: F.baht(ov.total), diff: signedBaht(ov.diff) }));
        channelChanges(cur, ov.base).forEach(function (c) { lines.push(fill(X.channelLine, { channel: c.name, a: F.baht(c.a), b: F.baht(c.b), diff: signedBaht(c.b - c.a) })); });
      } else lines.push(fill(X.noBase, { amount: F.baht(ov.total) }));
      var bad = ov.checks.items.filter(function (x) { return !x.ok && !x.warn; });
      var warn = ov.checks.items.filter(function (x) { return !x.ok && x.warn; });
      var steps = AP.stepsFor(AP.config(), {}).filter(function (s) { return s.status !== 'skipped'; });
      var badText = bad.length ? fill(RV.errors.checks, { items: bad.map(function (x) { return RV.checks[x.key]; }).join(' · ') }) : null;
      var body = h('div', { class: 'rl-dlg' },
        h('p', { class: 'rl-dlg-sub' }, fill(X.changes, { base: ov.base ? ov.base.name : '' })),
        h('ul', { class: 'dlg-lines rl-dlg-lines' }, lines.map(function (t) { return h('li', null, t); })),
        badText ? h('p', { class: 'dlg-error' }, badText) : null,
        warn.length ? h('p', { class: 'rl-dlg-warn' }, fill(X.warn, { n: warn[0].n })) : null,
        h('p', { class: 'rl-dlg-sub' }, X.steps),
        h('ol', { class: 'rl-dlg-steps' }, steps.map(function (s) { return h('li', null, AL.steps[s.key].label); })),
        h('p', { class: 'muted small' }, X.after));
      C.dialog({ title: fill(X.title, { name: cur.name }), body: body, note: { label: X.note, required: true, requiredText: AL.errors.note }, confirmLabel: X.confirm, wide: true,
        validate: function () { return badText; } })
        .then(function (r) {
          if (!r.ok) return;
          var res = AP.create(cur.id, { note: r.note });
          if (!res.ok) { window.alert(AP.errorText(res, { name: cur.name })); return; }
          env.reload(fill(page.done.request, { name: cur.name }));
        });
    }

    // เสนอ Lock (CR-38 · ปิด Flag approval): สรุปการเปลี่ยนแปลงเทียบรอบก่อน + ข้อความ → รออนุมัติ (3 ข้อบังคับต้องครบ)
    function submitDialog(cur) {
      var X = page.submitDlg;
      var ov = REV.overview(cur.id);
      var lines = [];
      if (ov.base && ov.baseTotal != null) {
        lines.push(fill(X.totalLine, { a: F.baht(ov.baseTotal), b: F.baht(ov.total), diff: signedBaht(ov.diff) }));
        channelChanges(cur, ov.base).forEach(function (c) { lines.push(fill(X.channelLine, { channel: c.name, a: F.baht(c.a), b: F.baht(c.b), diff: signedBaht(c.b - c.a) })); });
      } else lines.push(X.noBase);
      var bad = ov.checks.items.filter(function (x) { return !x.ok && !x.warn; });
      var warn = ov.checks.items.filter(function (x) { return !x.ok && x.warn; });
      var body = h('div', { class: 'rl-dlg' },
        h('p', { class: 'rl-dlg-sub' }, fill(X.changes, { base: ov.base ? ov.base.name : '' })),
        h('ul', { class: 'dlg-lines rl-dlg-lines' }, lines.map(function (t) { return h('li', null, t); })),
        bad.length ? h('p', { class: 'dlg-error' }, fill(RV.errors.checks, { items: bad.map(function (x) { return RV.checks[x.key]; }).join(' · ') })) : null,
        warn.length ? h('p', { class: 'rl-dlg-warn' }, fill(X.warn, { n: warn[0].n })) : null,
        h('p', { class: 'muted small' }, X.after));
      C.dialog({ title: fill(X.title, { name: cur.name }), body: body, note: { label: X.note, required: false }, confirmLabel: X.confirm, wide: true,
        validate: function () { return bad.length ? fill(RV.errors.checks, { items: bad.map(function (x) { return RV.checks[x.key]; }).join(' · ') }) : null; } })
        .then(function (r) { if (r.ok) after(REV.submit(cur.id, { note: r.note }), cur, 'submit'); });
    }
    // เป้าหมาย Channel ของรอบก่อน (Snapshot) เทียบรอบนี้ → [{ name, a, b }] เฉพาะที่เปลี่ยน
    function channelChanges(cur, base) {
      var s = REV.snapshotOf(base.id);
      var a = {};
      ((s && s.report && s.report.channels) || []).forEach(function (c) { a[c.id] = { name: c.name, amount: c.amount }; });
      var tree = calc.topDown(REV.data(cur.id), REV.read('topDown', cur.id), cur.planYear);
      return tree.children.map(function (c) { return { name: c.name, a: a[c.id] ? a[c.id].amount : 0, b: c.amount }; })
        .filter(function (c) { return Math.abs(c.b - c.a) >= 1; });
    }
    function withdrawDialog(cur) {
      var X = page.withdrawDlg;
      C.dialog({ title: fill(X.title, { name: cur.name }), lines: [X.line], confirmLabel: X.confirm })
        .then(function (r) { if (r.ok) after(REV.withdraw(cur.id), cur, 'withdraw'); });
    }
    function lockDialog(cur) {
      var X = page.lockDlg;
      C.dialog({ title: fill(X.title, { name: cur.name }), lines: [X.warn, X.what], confirmLabel: X.next, danger: true }).then(function (r) {
        if (!r.ok) return;
        var input = h('input', { type: 'text', class: 'pm-input rl-lock-name', 'aria-label': fill(X.type, { name: cur.name }), placeholder: cur.name, autocomplete: 'off' });
        C.dialog({ title: fill(X.title2, { name: cur.name }), body: h('label', { class: 'rl-dlg-field' }, h('span', { class: 'field-label' }, fill(X.type, { name: cur.name })), input),
          confirmLabel: X.confirm, danger: true,
          validate: function () { return input.value.trim() === cur.name ? null : fill(RV.errors.confirmName, { name: cur.name }); } })
          .then(function (r2) { if (r2.ok) after(REV.lock(cur.id, { confirmName: input.value.trim() }), cur, 'lock'); });
        setTimeout(function () { input.focus(); }, 0);
      });
    }
    function returnDialog(cur) {
      var X = page.returnDlg;
      C.dialog({ title: fill(X.title, { name: cur.name }), note: { label: X.note, required: true, requiredText: RV.errors.note }, confirmLabel: X.confirm })
        .then(function (r) { if (r.ok) after(REV.returnToDraft(cur.id, { note: r.note }), cur, 'return'); });
    }

    // ---------- ตารางรายการ Revision (ใหม่สุดก่อน) + ประวัติ ----------
    function prevOf(r, l) { return (r.basedOn ? REV.find(l, r.basedOn) : null) || REV.byYear(l, r.planYear).filter(function (x) { return x.seq === r.seq - 1; })[0] || null; }
    function rowData(r, l) {
      var total = REV.totalOf(r);
      var b = r.basedOn ? REV.find(l, r.basedOn) : null;
      var bt = b ? REV.totalOf(b) : null;
      return { rev: r, total: total, base: b, diff: bt != null ? total - bt : null, pct: bt ? (total - bt) / bt : null };
    }
    function viewRevision(r) {
      REV.select(r.id);
      location.href = SP.core.paths.to(reg.byId('topDown').path);
    }
    function compareWith(r, prev) {
      store.set('ui.revisionCompare', { a: prev.id, b: r.id });
      env.goTab('compare');
    }
    function table(l) {
      var X = page.columns;
      var all = REV.list();
      var rows = l.slice().reverse().map(function (r) { return rowData(r, all); });
      var body = h('tbody');
      if (!rows.length) body.appendChild(h('tr', null, h('td', { class: 'grid-empty', colspan: '8' }, fill(page.noRevision, { year: year }))));
      rows.forEach(function (d) {
        var r = d.rev;
        var isOpen = !!expanded[r.id];
        var prev = prevOf(r, all);
        // ปุ่ม 3 ปุ่มรูปแบบเดียวกัน ชิดขวา · รอบแรกของปี = เปรียบเทียบใช้ไม่ได้ (สีเทา + Tooltip)
        var cmp = h('button', { type: 'button', class: 'btn btn-secondary btn-sm rl-compare' + (prev ? '' : ' is-disabled'), 'aria-disabled': prev ? null : 'true',
          title: prev ? fill(page.compareTip, { a: prev.name, b: r.name }) : page.compareNone, onClick: function () { if (prev) compareWith(r, prev); } }, page.compare);
        var tr = h('tr', { class: 'is-clickable rl-row' + (isOpen ? ' is-open' : ''), dataset: { id: r.id }, 'aria-expanded': isOpen ? 'true' : 'false', title: isOpen ? page.collapse : page.expand,
          onClick: function (e) { if (e.target.closest && e.target.closest('button,a,.popover')) return; expanded[r.id] = !isOpen; env.refresh(); } },
          h('th', { scope: 'row', class: 'rl-name' }, h('span', { class: 'rl-caret', 'aria-hidden': 'true' }, isOpen ? '▾' : '▸'), h('strong', null, r.name)),
          h('td', null, C.revisionBadge(r.status)),
          h('td', null, K.label(r.effectiveMonth)),
          h('td', { class: 'num' }, F.baht(d.total)),
          h('td', { class: 'num rl-change' + (d.diff > 0 ? ' text-ok' : d.diff < 0 ? ' text-short' : '') }, d.diff == null ? '–' : signedBaht(d.diff) + ' · ' + (d.pct < 0 ? '−' : '+') + F.pct(Math.abs(d.pct || 0), 1)),
          h('td', { class: 'ellipsis rl-reason', title: r.reason || '' }, r.reason || '–'),
          h('td', null, r.status === 'locked' ? fill(page.lockedBy, { by: r.lockedBy || '', at: F.date(String(r.lockedAt || '').slice(0, 10)) }) : '–'),
          h('td', { class: 'manage rl-manage' }, h('span', { class: 'manage-group rl-manage-group' },
            h('button', { type: 'button', class: 'btn btn-secondary btn-sm rl-view', title: fill(page.viewTip, { name: r.name }), onClick: function () { viewRevision(r); } }, page.view),
            cmp,
            C.exportButton({ build: function () { return revisionExport(r); } }))));
        body.appendChild(tr);
        if (isOpen) body.appendChild(h('tr', { class: 'rl-history-row' }, h('td', { colspan: '8' }, historyList(r))));
      });
      return h('section', { class: 'card fit-card rl-card-table' }, h('div', { class: 'fit-scroll' },
        h('table', { class: 'data-grid rl-table' },
          h('thead', null, h('tr', null, ['name', 'status', 'effective', 'total', 'change', 'reason', 'locked', 'manage'].map(function (k) {
            return h('th', { scope: 'col', class: k === 'total' || k === 'change' ? 'num' : k === 'manage' ? 'manage rl-manage' : null }, X[k]);
          }))), body)));
    }
    // ประวัติ: ทุกการเปลี่ยนสถานะ · R1 = สร้างจากข้อมูลตั้งต้น (วันที่) เป็นรายการแรก
    function historyList(r) {
      var E = RV.events;
      return h('div', { class: 'rl-history' }, h('strong', { class: 'rl-history-title' }, page.history),
        h('ol', { class: 'rl-timeline' }, (r.history || []).map(function (ev) {
          return h('li', { class: 'rl-ev rl-ev-' + ev.action },
            h('span', { class: 'rl-ev-what' }, E[ev.action] || ev.action),
            h('span', { class: 'rl-ev-who' }, ev.by ? fill(page.historyLine, { by: ev.by, at: F.dateTime(ev.at) }) : F.date(String(ev.at || '').slice(0, 10))),
            ev.note ? h('span', { class: 'rl-ev-note' }, fill(page.historyNote, { note: ev.note })) : null);
        })));
    }

    // ---------- ส่งออก ----------
    function exportSpec() {
      var X = page.columns;
      var all = REV.list();
      var rows = REV.list(year).slice().reverse().map(function (r) { return rowData(r, all); });
      var st = C.exportStamp(null);
      return {
        filename: fill(page.exportFile, { year: year, date: st.date }),
        sheets: [{ name: page.exportSheet, header: C.exportHeader(year, null), rows: rows, columns: [
          { key: 'name', label: X.name, value: function (d) { return d.rev.name; } },
          { key: 'status', label: X.status, value: function (d) { return RV.status[d.rev.status]; } },
          { key: 'effective', label: X.effective, value: function (d) { return K.label(d.rev.effectiveMonth); } },
          { key: 'total', label: X.total, type: 'money', value: function (d) { return d.total; } },
          { key: 'diff', label: X.change, type: 'money', value: function (d) { return d.diff; } },
          { key: 'pct', label: page.exportPct, type: 'pct', value: function (d) { return d.pct; } },
          { key: 'reason', label: X.reason, width: 40, value: function (d) { return d.rev.reason; } },
          { key: 'locked', label: X.locked, width: 30, value: function (d) { return d.rev.status === 'locked' ? fill(page.lockedBy, { by: d.rev.lockedBy || '', at: F.date(String(d.rev.lockedAt || '').slice(0, 10)) }) : ''; } }
        ] }]
      };
    }
    // ส่งออกรอบเดียว: เป้าหมายและแผนของทุกหน่วยขาย (รอบ Lock = Snapshot · อื่น = คำนวณสด)
    function revisionExport(r) {
      var X = page.exportRev;
      var s = r.status === 'locked' ? REV.snapshotOf(r.id) : null;
      var rep = s ? s.report : SP.core.report.build({ revisionId: r.id, live: true });
      var chName = {};
      rep.channels.forEach(function (c) { chName[c.id] = c.name; });
      var st = C.exportStamp(null);
      var cols = [{ key: 'channel', label: X.channel, value: function (u) { return chName[u.channelId] || u.channelId; } }, { key: 'unit', label: X.unit, width: 24, value: function (u) { return u.name; } },
        { key: 'target', label: X.target, type: 'money', value: function (u) { return u.target; } }, { key: 'plan', label: X.plan, type: 'money', value: function (u) { return u.plan; } }]
        .concat(F.MONTHS.map(function (m, i) { return { key: 'm' + i, label: fill(X.month, { month: F.monthYear(i, r.planYear) }), type: 'money', value: function (u) { return u.targetM[i]; } }; }));
      return {
        filename: fill(page.exportRevFile, { name: C.fileSafe(r.name), date: st.date }),
        sheets: [{ name: page.exportRevSheet, header: C.exportHeader(r.planYear, null, [[page.columns.name, r.name], [page.columns.status, RV.status[r.status]], [page.columns.effective, K.label(r.effectiveMonth)]]), columns: cols, rows: rep.units }]
      };
    }

    var l = REV.list(year);
    var cur = currentOf(l);
    root.appendChild(h('div', { class: 'tool-row rv-toolbar no-print' },
      h('span', { class: 'wf-actions rl-actions' }, actionButtons(cur, REV.list())),
      h('span', { class: 'tool-spacer' }),
      C.exportButton({ build: exportSpec })));
    root.appendChild(cur ? C.revisionCard(REV.overview(cur.id), { className: 'rl-status' }) : h('section', { class: 'card rl-empty' }, fill(page.noRevision, { year: year })));
    root.appendChild(table(l));
  }

  // =====================================================================
  // แท็บเปรียบเทียบ
  // =====================================================================
  function compareTab(root, env) {
    var page = SP.data.content.pages.revisionCompare;
    var RV = SP.data.content.labels.revision;
    var all = REV.list();
    var o = store.get('ui.revisionCompareOpts') || {};
    o = { a: o.a, b: o.b, level: LEVELS.indexOf(o.level) >= 0 ? o.level : 'channel', metric: METRICS.indexOf(o.metric) >= 0 ? o.metric : 'net', view: o.view === 'month' ? 'month' : 'year', channel: o.channel || '', unit: o.unit || '' };
    var hand = store.get('ui.revisionCompare');
    if (hand) { store.set('ui.revisionCompare', null); o.a = hand.a; o.b = hand.b; }
    // CR-41: B = ยอดจริง (REV.ACTUAL) ใช้ได้เฉพาะมุมมองรายเดือน · ระดับ Total / Channel / หน่วยขาย
    var ACT = REV.ACTUAL;
    function exists(id) { return !!REV.find(all, id); }
    if (o.b === ACT && o.view !== 'month') o.b = null;
    if (!exists(o.b) && o.b !== ACT) o.b = REV.selectedId();
    if (!exists(o.a) || o.a === o.b) {
      var y = (REV.find(all, o.b) || {}).planYear || store.year();
      var lk = REV.lastLocked(all, y);
      var other = lk && lk.id !== o.b ? lk : all.filter(function (r) { return r.id !== o.b; }).pop();
      o.a = other ? other.id : null;
    }
    // CR-41: มี Revision เดียวแต่มีเดือนที่ปิดแล้วในปีแผน (สถานการณ์ S2 ก่อนเปิด R2) → เทียบรอบนั้นกับยอดจริงรายเดือน
    if (all.length < 2) {
      var only = REV.find(all, REV.selectedId());
      if (only && SP.core.clock.isClosed(only.planYear, 0)) { o.a = only.id; o.b = ACT; o.view = 'month'; }
    }
    store.set('ui.revisionCompareOpts', o);
    function save() { store.set('ui.revisionCompareOpts', o); }
    function redraw() { save(); env.refresh(); }

    function rev(id) {
      if (id === ACT) { var a = REV.find(all, o.a); return a ? { id: ACT, name: page.actual.name, planYear: a.planYear, seq: 0, status: ACT } : null; }
      return REV.find(all, id);
    }
    function actualB() { return o.b === ACT; }
    function closedM(m) { var a = rev(o.a); return !!a && SP.core.clock.isClosed(a.planYear, m); }
    function optLabel(r) { return fill(page.optionLabel, { name: r.name, status: RV.status[r.status] }); }
    function revSelect(key, label) {
      var opts = [];
      REV.years(all).forEach(function (yy) { REV.byYear(all, yy).slice().reverse().forEach(function (r) { opts.push({ value: r.id, label: optLabel(r), group: String(yy) }); }); });
      if (key === 'b' && o.view === 'month') opts.push({ value: ACT, label: page.actual.option, group: page.actual.group });
      return C.select({ label: label, value: o[key] || '', className: 'rc-rev rc-rev-' + key, options: opts, onChange: function (v) { o[key] = v; redraw(); } });
    }
    function filterOk() { return !!(o.channel || o.unit); }
    function levelOf() {
      if (actualB() && (o.level === 'series' || o.level === 'sku')) return 'unit';   // CR-41 ยอดจริงมีระดับ Total / Channel / หน่วยขาย
      return o.level === 'sku' && !filterOk() ? 'series' : o.level;
    }
    function metricOf() { var lv = levelOf(); return o.metric === 'units' && lv !== 'series' && lv !== 'sku' ? 'net' : o.metric; }
    function fmt(v) { return metricOf() === 'units' ? F.units(v) : F.baht(v); }
    function signed(v) { return (v < 0 ? '−' : v > 0 ? '+' : '') + fmt(Math.abs(v)); }
    function pctText(p) { return p == null ? '–' : (p < 0 ? '−' : p > 0 ? '+' : '') + F.pct(Math.abs(p), 1); }
    function diffCls(v) { return Math.abs(v) < 0.5 ? '' : v > 0 ? ' text-ok' : ' text-short'; }

    function toolbar() {
      var units = [];
      if (o.channel && rev(o.b)) {
        var d = REV.data(o.b);
        units = calc.unitsOfChannel(d, o.channel, true).map(function (u) { return { value: u.id, label: u.name }; });
      }
      var levelSel = C.select({ label: page.level, value: o.level, className: 'rc-level', options: LEVELS.map(function (k) { return { value: k, label: page.levels[k] }; }),
        onChange: function (v) { o.level = v; redraw(); } });
      Array.prototype.forEach.call(levelSel.querySelectorAll ? levelSel.querySelectorAll('option') : [], function (op) {
        if (op.value === 'sku' && !filterOk()) { op.disabled = true; op.title = page.skuNeedsFilter; }
        if (actualB() && (op.value === 'series' || op.value === 'sku')) { op.disabled = true; op.title = page.actual.levelsTip; }
      });
      var metricSel = C.select({ label: page.metric, value: metricOf(), className: 'rc-metric', options: METRICS.map(function (k) { return { value: k, label: page.metrics[k] }; }),
        onChange: function (v) { o.metric = v; redraw(); } });
      Array.prototype.forEach.call(metricSel.querySelectorAll ? metricSel.querySelectorAll('option') : [], function (op) { if (op.value === 'units' && levelOf() !== 'series' && levelOf() !== 'sku') { op.disabled = true; op.title = page.unitsOnly; } });
      var one = all.length < 2 && !actualB();
      return h('div', { class: 'tool-row rc-toolbar no-print' },
        h('span', { class: 'rc-pair' }, h('span', { class: 'field-label' }, page.compare), revSelect('a', page.compare + ' A'),
          one ? null : h('span', { class: 'field-label' }, page['with']), one ? null : revSelect('b', page['with'] + ' B'),
          one ? null : h('button', { type: 'button', class: 'btn btn-secondary btn-sm rc-swap', title: actualB() ? page.actual.swapTip : page.swapTip, disabled: actualB(), onClick: function () { var t = o.a; o.a = o.b; o.b = t; redraw(); } }, page.swap)),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, page.level), levelSel),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, page.metric), metricSel),
        C.segmented({ label: page.view, value: o.view, className: 'rc-view', options: ['year', 'month'].map(function (k) { return { value: k, label: page.views[k] }; }), onChange: function (v) { o.view = v; redraw(); } }),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, page.channel), C.select({ label: page.channel, value: o.channel, className: 'rc-channel' + (o.channel ? ' is-active' : ''),
          options: [{ value: '', label: page.channelAll }].concat(SP.data.channels.filter(function (c) { return c.active !== false; }).map(function (c) { return { value: c.id, label: c.name }; })),
          onChange: function (v) { o.channel = v; o.unit = ''; redraw(); } })),
        o.channel ? h('label', { class: 'field' }, h('span', { class: 'field-label' }, page.unit), C.select({ label: page.unit, value: o.unit, className: 'rc-unit' + (o.unit ? ' is-active' : ''),
          options: [{ value: '', label: page.unitAll }].concat(units), onChange: function (v) { o.unit = v; redraw(); } })) : null,
        h('span', { class: 'tool-spacer' }),
        C.exportButton({ build: exportSpec }));
    }

    function result() {
      if (!rev(o.a) || !rev(o.b)) return null;
      return REV.compare(o.a, o.b, { level: levelOf(), metric: metricOf(), view: o.view, filter: { channelId: o.channel || null, unitId: o.unit || null } });
    }
    function nameOf(row, lv) {
      if (lv === 'total') return page.totalLabel;
      if (lv === 'series' && !row.id) return page.noSeries;
      return row.name || row.id;
    }
    // Channel → หน่วยขายของ Channel · หน่วยขาย → SKU ของหน่วยขาย
    function drill(row, lv) {
      if (lv === 'channel') return function () { o.level = 'unit'; o.channel = row.id; o.unit = ''; redraw(); };
      if (lv === 'unit') return function () { var info = calc.unitInfo(REV.data(o.b), row.id); o.level = 'sku'; o.channel = info && info.channel ? info.channel.id : o.channel; o.unit = row.id; redraw(); };
      return null;
    }
    function nameCell(row, lv) {
      var go = drill(row, lv);
      var name = nameOf(row, lv);
      return h('th', { scope: 'row', class: 'rc-name' }, go ? h('button', { type: 'button', class: 'link-btn rc-drill', title: fill(page.drillTip, { level: page.levels[lv === 'channel' ? 'unit' : 'sku'], name: name }), onClick: go }, name) : name);
    }
    function bars(row, max) {
      function w(v) { return max > 0 ? Math.max(0, v) / max * 100 + '%' : '0%'; }
      return h('td', { class: 'rc-bars-cell' }, h('div', { class: 'rc-bars', title: fill(page.barsTip, { a: fmt(row.a), b: fmt(row.b) }) },
        h('span', { class: 'rc-bar-a', style: { width: w(row.a) } }), h('span', { class: 'rc-bar-b', style: { width: w(row.b) } })));
    }
    function yearTable(res, A, B, lv) {
      var X = page.columns;
      var head = h('tr', null, h('th', { scope: 'col', class: 'rc-name' }, page.levels[lv]), h('th', { scope: 'col', class: 'num' }, fill(X.a, { name: A.name })), h('th', { scope: 'col', class: 'num' }, fill(X.b, { name: B.name })),
        h('th', { scope: 'col', class: 'num' }, X.diff), h('th', { scope: 'col', class: 'num' }, X.pct), h('th', { scope: 'col', class: 'rc-bars-head' }, X.bars));
      var body = h('tbody', null, res.rows.length ? res.rows.map(function (r) {
        return h('tr', { dataset: { id: r.id } }, nameCell(r, lv), h('td', { class: 'num' }, fmt(r.a)), h('td', { class: 'num' }, fmt(r.b)),
          h('td', { class: 'num rc-diff' + diffCls(r.diff) }, signed(r.diff)), h('td', { class: 'num' + diffCls(r.diff) }, pctText(r.pct)), bars(r, res.max));
      }) : h('tr', null, h('td', { class: 'grid-empty', colspan: '6' }, page.empty)));
      var t = res.total;
      var foot = lv === 'total' ? null : h('tfoot', null, h('tr', { class: 'rc-total' }, h('th', { scope: 'row' }, page.totalRow), h('td', { class: 'num' }, fmt(t.a)), h('td', { class: 'num' }, fmt(t.b)),
        h('td', { class: 'num rc-diff' + diffCls(t.diff) }, signed(t.diff)), h('td', { class: 'num' + diffCls(t.diff) }, pctText(t.pct)), h('td')));
      return h('table', { class: 'data-grid rc-table rc-year' }, h('thead', null, head), body, foot);
    }
    function monthTable(res, A, B, lv) {
      var X = page.columns, LN = page.lines;
      var L = res.lockBefore;
      var nr = REV.find(all, res.newer);
      function cells(vals, cls, onlyClosed) {
        return vals.map(function (v, m) {
          if (onlyClosed && !closedM(m)) return h('td', { class: 'num rc-na', title: page.actual.naTip }, '–');   // CR-41 ยอดจริงของเดือนที่ยังไม่ปิด
          return h('td', { class: 'num' + (m < L ? ' is-rev-locked' : '') + (cls ? cls(v) : ''), title: m < L ? fill(page.lockedTip, { name: nr ? nr.name : '' }) : null }, cls ? signed(v) : fmt(v));
        });
      }
      var head = h('tr', null, h('th', { scope: 'col', class: 'rc-name' }, page.levels[lv]), h('th', { scope: 'col', class: 'rc-line' }, X.line),
        F.MONTHS.map(function (mn, m) { return h('th', { scope: 'col', class: 'num' + (m < L ? ' is-rev-locked' : '') }, mn, m < L ? h('span', { class: 'rev-locked-tag' }, RV.lockedHead) : null); }),
        h('th', { scope: 'col', class: 'num' }, X.total));
      var body = h('tbody');
      function block(r, isTotal) {
        var first = isTotal ? h('th', { scope: 'rowgroup', class: 'rc-name', rowspan: '3' }, page.totalRow) : (function () { var c = nameCell(r, lv); c.setAttribute('rowspan', '3'); c.setAttribute('scope', 'rowgroup'); return c; })();
        // CR-41 B = ยอดจริง: รวมเฉพาะเดือนที่ปิดแล้วทั้ง A และ B (ยอดจริงสะสมเทียบเป้าหมายช่วงเดียวกัน)
        var act = actualB();
        function total(vals) { return calc.sum(vals.filter(function (v, m) { return !act || closedM(m); })); }
        var sa = total(r.aM), sb = total(r.bM);
        return [
          h('tr', { class: 'rc-m-a' + (isTotal ? ' rc-total' : '') }, first, h('td', { class: 'rc-line' }, fill(LN.a, { name: A.name })), cells(r.aM), h('td', { class: 'num' }, fmt(sa))),
          h('tr', { class: 'rc-m-b' + (isTotal ? ' rc-total' : '') }, h('td', { class: 'rc-line' }, fill(LN.b, { name: B.name })), cells(r.bM, null, act), h('td', { class: 'num' }, fmt(sb))),
          h('tr', { class: 'rc-m-d' + (isTotal ? ' rc-total' : '') }, h('td', { class: 'rc-line' }, LN.diff), cells(r.dM, diffCls, act), h('td', { class: 'num' + diffCls(sb - sa) }, signed(sb - sa)))
        ];
      }
      if (!res.rows.length) body.appendChild(h('tr', null, h('td', { class: 'grid-empty', colspan: '15' }, page.empty)));
      res.rows.forEach(function (r) { block(r, false).forEach(function (tr) { body.appendChild(tr); }); });
      var foot = lv === 'total' || !res.rows.length ? null : h('tfoot', null, block(res.total, true));
      return h('table', { class: 'data-grid rc-table rc-month' }, h('thead', null, head), body, foot);
    }

    function exportSpec() {
      var A = rev(o.a), B = rev(o.b);
      var res = result();
      var lv = levelOf();
      var st = C.exportStamp(null);
      var X = page.columns;
      var rows = res ? res.rows.concat(lv === 'total' ? [] : [Object.assign({}, res.total, { id: 'total', name: page.totalRow, isTotal: true })]) : [];
      var cols = [{ key: 'name', label: page.levels[lv], width: 30, value: function (r) { return r.isTotal ? page.totalRow : nameOf(r, lv); } },
        { key: 'a', label: fill(X.a, { name: A ? A.name : '' }), type: metricOf() === 'units' ? 'number' : 'money', value: function (r) { return r.a; } },
        { key: 'b', label: fill(X.b, { name: B ? B.name : '' }), type: metricOf() === 'units' ? 'number' : 'money', value: function (r) { return r.b; } },
        { key: 'diff', label: X.diff, type: metricOf() === 'units' ? 'number' : 'money', value: function (r) { return r.diff; } },
        { key: 'pct', label: X.pct, type: 'pct', value: function (r) { return r.pct; } }];
      if (o.view === 'month') {
        F.MONTHS.forEach(function (mn, m) {
          cols.push({ key: 'a' + m, label: 'A · ' + mn, type: 'money', value: function (r) { return r.aM[m]; } });
          cols.push({ key: 'b' + m, label: 'B · ' + mn, type: 'money', value: function (r) { return r.bM[m]; } });
        });
      }
      return {
        filename: fill(page.exportFile, { a: C.fileSafe(A ? A.name : ''), b: C.fileSafe(B ? B.name : ''), date: st.date }),
        sheets: [{ name: page.exportSheet, header: C.exportHeader(B ? B.planYear : store.year(), null, [[page.level, page.levels[lv]], [page.metric, page.metrics[metricOf()]], [page.view, page.views[o.view]]]), columns: cols, rows: rows }]
      };
    }

    root.appendChild(toolbar());
    var A = rev(o.a), B = rev(o.b);
    if ((all.length < 2 && !actualB()) || !A || !B) {
      // มี Revision เดียว: ข้อความเดิม + ลิงก์ไปแท็บ Revision
      root.appendChild(h('section', { class: 'card rc-empty' }, page.needTwo, ' (',
        h('button', { type: 'button', class: 'link-btn rc-go-revision', onClick: function () { env.goTab('revision'); } }, page.needTwoLink), ')'));
      return;
    }
    var res = result();
    var lv = levelOf();
    var nr = REV.find(all, res.newer);
    var M = page.metrics[metricOf()];
    var closedN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].filter(closedM).length;
    var sampleB = actualB() && [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].some(function (m) { return closedM(m) && SP.core.scenario.isSample(A.planYear, m); });
    root.appendChild(h('p', { class: 'muted small rc-basis' }, lv === 'series' || lv === 'sku' ? page.basis.plan : page.basis.target,
      o.level === 'sku' && lv !== 'sku' ? ' · ' + page.skuNeedsFilter : '',
      actualB() ? ' · ' + (closedN ? fill(page.actual.note, { month: SP.core.clock.label(SP.core.clock.key(A.planYear, closedN)) }) : page.actual.none) + (sampleB ? ' · ' + page.actual.sample : '') : ''));
    var bLine = actualB() ? res.total.bM.map(function (v, m) { return closedM(m) ? v : null; }) : res.total.bM;   // CR-41 ยอดจริงเฉพาะเดือนที่ปิดแล้ว
    var chart = G.compareLines({
      a: res.total.aM, b: bLine, months: F.MONTHS, lockBefore: res.lockBefore,
      labels: { a: fill(page.lines.a, { name: A.name }), b: fill(page.lines.b, { name: B.name }), diff: page.chartDiff, effective: res.lockBefore ? fill(page.effective, { month: F.MONTHS[res.lockBefore] }) : '' },
      tick: metricOf() === 'units' ? null : G.millionTick,
      tip: function (m) { return actualB() && !closedM(m) ? [[A.name, fmt(res.total.aM[m])], [B.name, '–']] : [[A.name, fmt(res.total.aM[m])], [B.name, fmt(res.total.bM[m])], [page.chartDiff, signed(res.total.dM[m])]]; }
    });
    root.appendChild(h('section', { class: 'card rc-chart-card' }, h('h2', { class: 'rc-chart-title' }, fill(page.chartTitle, { metric: M, unit: page.chartUnits[metricOf() === 'units' ? 'units' : 'money'], level: page.levels[lv] }),
      nr && res.lockBefore ? h('span', { class: 'muted small' }, ' · ' + fill(page.lockedNote, { name: nr.name, month: K.label(nr.effectiveMonth) })) : null), chart));
    root.appendChild(h('section', { class: 'card fit-card rc-table-card' }, h('div', { class: 'fit-scroll' }, o.view === 'month' ? monthTable(res, A, B, lv) : yearTable(res, A, B, lv))));
  }

  SP.modules.summary.revisionTab = revisionTab;
  SP.modules.summary.compareTab = compareTab;
})(window.SP);

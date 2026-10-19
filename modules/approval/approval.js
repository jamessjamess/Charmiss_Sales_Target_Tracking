/*
 * modules/approval/approval.js — CR-39 Module Approval (กลุ่มเมนู APPROVAL · ไอคอน ✓ · Flag approval)
 *
 * หน้าที่:        คำขออนุมัติทั้งหมด · คำขอ 1 รายการ = การสรุปและขออนุมัติ Sales Planning ของ 1 Revision
 *                 แท็บ รอฉันดำเนินการ (n) = การ์ดคำขอที่ขั้นปัจจุบันเป็นขั้นของผู้ใช้ (core/approval.js waitingFor) · ทั้งหมด = ตาราง + ตัวกรองปีแผน / สถานะ ·
 *                 ตั้งค่า (approval.config) = สวิตช์ Sales Director ยืนยันก่อนส่งถึง MD (มีผลกับคำขอใหม่เท่านั้น)
 *                 รายละเอียดคำขอ (#request=<id>): หัว (รอบ · ป้าย · มีผลตั้งแต่ · เหตุผล) · ไทม์ไลน์ขั้นอนุมัติแนวนอน (ขั้นปัจจุบันเส้นขอบสีหลัก) ·
 *                 ชุดสรุปตอนส่ง (calc.revisionSummary: ตัวเลขหลัก · ราย Channel · 5 หน่วยขายที่เปลี่ยนมาก · ความครบของแผน SKU · ประเภทสินค้า · Clearance ·
 *                 กราฟรายเดือน charts.compareLines) · แถบเตือนสีแดงเมื่อคำนวณใหม่แล้วต่างจากตอนส่ง · ลิงก์ ดูรายงานเต็ม / เปรียบเทียบละเอียด ·
 *                 ความคิดเห็น · แถบคำสั่งท้ายหน้า (เฉพาะผู้ที่ต้องดำเนินการขั้นปัจจุบัน: ยืนยัน · อนุมัติและ Lock 2 ชั้น · ส่งกลับแก้ไข · ผู้ส่ง = ถอนคำขอ)
 * กฎทั้งหมดจาก core/approval.js (ขั้น · สิทธิ์ · ข้อบังคับที่ Store) และ core/revision.js (Snapshot · Lock) · ข้อความจาก content.js (pages.approval · labels.approval)
 * store อ่าน:     approval.requests, approvalConfig.revisionLock, revision.list, ui.role, ui.approvalTab, ui.approvalOpen (อ่านครั้งเดียว)
 * store เขียน:    ui.approvalTab · ui.revision + ui.summaryTab (ดูรายงานเต็ม) · ui.revisionCompare (เปรียบเทียบละเอียด) · approval.* ผ่าน core/approval.js
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var G = SP.core.charts;
  var F = SP.core.format;
  var K = SP.core.clock;
  var store = SP.core.store;
  var REV = SP.core.revision;
  var AP = SP.core.approval;
  var h = C.h;
  var fill = C.fill;
  var filters = { year: '', status: '' };   // แท็บทั้งหมด (ไม่เก็บ)

  function signed(v) { return (v < 0 ? '−' : v > 0 ? '+' : '') + F.baht(Math.abs(v || 0)); }
  function pctText(p) { return p == null ? '–' : (p < 0 ? '−' : p > 0 ? '+' : '') + F.pct(Math.abs(p), 1); }
  function diffCls(v) { return v == null || Math.abs(v) < 0.5 ? '' : v > 0 ? ' text-ok' : ' text-short'; }

  function render(root, ctx) {
    var page = ctx.page;
    var X = page.detail;
    var AL = SP.data.content.labels.approval;
    var RV = SP.data.content.labels.revision;
    var reg = SP.core.registry;

    var exportBtn = C.exportButton({ build: exportSpec });
    if (ctx.intro) ctx.intro.appendChild(h('span', { class: 'wf-bar' }, h('span', { class: 'wf-actions no-print' }, exportBtn)));

    var view = parseHash();
    var hand = store.get('ui.approvalOpen');
    if (hand) { store.set('ui.approvalOpen', null); view.request = hand; }

    function parseHash() {
      var s = String(location.hash || '').replace('#', '');
      var m = /^request=(.+)$/.exec(s);
      var tab = ['mine', 'all', 'settings'].indexOf(s) >= 0 ? s : store.get('ui.approvalTab');
      return { tab: tab || 'mine', request: m ? decodeURIComponent(m[1]) : null };
    }
    function setHash(v) { try { history.replaceState(null, '', '#' + v); } catch (e) { /* file:// บางเบราว์เซอร์ */ } }
    function tabsAllowed() { var t = ['mine', 'all']; if (AP.canConfig()) t.push('settings'); return t; }
    function revOf(req) { return REV.find(REV.list(), req.refId); }
    function revName(req) { var r = revOf(req); return r ? r.name : req.refId; }
    function goTab(t) { view = { tab: t, request: null }; store.set('ui.approvalTab', t); setHash(t); draw(); }
    function openDetail(id) { view = { tab: view.tab, request: id }; setHash('request=' + encodeURIComponent(id)); draw(); }
    function after(res, kind, req) {
      if (!res.ok) { window.alert(AP.errorText(res, { name: revName(req) })); return; }
      C.toast(fill(X.done[kind], { name: revName(req) }));
      draw();
      if (ctx.refreshMenu) ctx.refreshMenu();
    }
    function checkChips(ck) {
      return h('span', { class: 'ap-checks' }, (ck && ck.items || []).map(function (c) {
        var chip = h('span', { class: 'rev-check-chip ' + (c.ok ? 'is-ok' : c.warn ? 'is-warn' : 'is-bad') }, c.ok ? RV.card.ok : c.warn ? fill(RV.card.warnN, { n: c.n }) : c.n ? fill(RV.card.missingN, { n: c.n }) : RV.card.missing);
        return h('span', { class: 'ap-check' }, chip, ' ', RV.checks[c.key] || c.key);
      }));
    }
    function totalLine(s) {
      if (!s) return null;
      return h('p', { class: 'ap-card-total' }, fill(page.totalLine, { amount: F.baht(s.total) }),
        s.diff != null ? h('span', { class: 'ap-diff' + diffCls(s.diff) }, ' ' + fill(page.vsPrev, { name: s.compareName, diff: signed(s.diff), pct: pctText(s.pct) })) : h('span', { class: 'muted' }, ' ' + page.firstRound));
    }
    function stepName(key) { return (AL.steps[key] || {}).label || key; }
    function statusBadge(req) { return h('span', { class: 'ap-badge ap-' + req.status }, AL.status[req.status] || req.status); }

    // ---------- แท็บ ----------
    function tabsBar(n) {
      var T = page.tabs;
      // CR-40 แท็บขีดเส้นใต้ · ตัวนับเล็กสีเทา (รอฉันดำเนินการ n · ทั้งหมด = จำนวนคำขอทั้งหมด)
      var counts = { mine: n || null, all: AP.list().length || null };
      return h('div', { class: 'ap-tabs no-print' }, C.tabs({
        label: page.tabLabel, value: view.tab,
        options: tabsAllowed().map(function (t) { return { value: t, label: T[t], count: counts[t] }; }),
        onChange: function (v) { goTab(v); }
      }));
    }

    // ---------- แท็บ รอฉันดำเนินการ ----------
    function mineTab() {
      var list = AP.waitingFor();
      if (!list.length) return [h('section', { class: 'card ap-empty' }, page.empty)];
      return [h('div', { class: 'ap-cards' }, list.map(function (req) {
        var r = revOf(req);
        var cur = AP.currentStep(req);
        return h('article', { class: 'card ap-card', dataset: { id: req.id } },
          h('div', { class: 'ap-card-head' }, h('strong', { class: 'ap-card-name' }, revName(req)), r ? C.revisionBadge(r.status) : null,
            h('span', { class: 'ap-step-chip' }, fill(page.currentStep, { step: cur ? stepName(cur.key) : '–' }))),
          h('p', { class: 'ap-card-line muted' }, fill(page.sentBy, { by: req.createdBy || '–', at: F.dateTime(req.createdAt) })),
          h('p', { class: 'ap-card-line ap-card-note' }, fill(page.noteLine, { note: req.note || '–' })),
          totalLine(req.summary),
          h('p', { class: 'ap-card-line' }, checkChips(REV.overview(req.refId).checks)),
          h('div', { class: 'ap-card-actions' }, h('button', { type: 'button', class: 'btn btn-primary btn-sm ap-open', onClick: function () { openDetail(req.id); } }, page.open)));
      }))];
    }

    // ---------- แท็บ ทั้งหมด ----------
    function lastOf(req) {
      var acted = (req.steps || []).filter(function (s) { return s.actedAt; });
      var s = acted[acted.length - 1];
      if (req.status === 'withdrawn') return fill(page.lastLine, { what: AL.status.withdrawn, by: req.closedBy || '–', at: F.dateTime(req.closedAt) });
      if (!s) return '–';
      var what = s.status === 'returned' ? AL.stepStatus.returned : (AL.steps[s.key] || {}).short || s.key;
      return fill(page.lastLine, { what: what, by: s.actedBy || '–', at: F.dateTime(s.actedAt) });
    }
    function filtered() {
      return AP.list().filter(function (q) {
        var r = revOf(q);
        if (filters.year && (!r || String(r.planYear) !== String(filters.year))) return false;
        if (filters.status && q.status !== filters.status) return false;
        return true;
      }).reverse();
    }
    function allTab() {
      var X2 = page.columns;
      var years = REV.years(REV.list());
      var bar = h('div', { class: 'tool-row ap-filters no-print' },
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, page.filterYear), C.select({ label: page.filterYear, value: filters.year, className: 'ap-f-year',
          options: [{ value: '', label: page.yearAll }].concat(years.map(function (y) { return { value: String(y), label: String(y) }; })), onChange: function (v) { filters.year = v; draw(); } })),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, page.filterStatus), C.select({ label: page.filterStatus, value: filters.status, className: 'ap-f-status',
          options: [{ value: '', label: page.statusAll }].concat(AP.STATUSES.map(function (s) { return { value: s, label: AL.status[s] }; })), onChange: function (v) { filters.status = v; draw(); } })));
      var rows = filtered();
      var body = h('tbody', null, rows.length ? rows.map(function (q) {
        var cur = AP.currentStep(q);
        return h('tr', { dataset: { id: q.id } },
          h('th', { scope: 'row', class: 'ap-name' }, h('strong', null, revName(q))),
          h('td', null, AL.type[q.type] || q.type),
          h('td', null, statusBadge(q)),
          h('td', null, cur ? stepName(cur.key) : '–'),
          h('td', null, fill(page.lastLine, { what: (AL.steps.mgmtSubmit || {}).short, by: q.createdBy || '–', at: F.dateTime(q.createdAt) })),
          h('td', null, lastOf(q)),
          h('td', { class: 'manage' }, h('button', { type: 'button', class: 'btn btn-secondary btn-sm ap-open', onClick: function () { openDetail(q.id); } }, page.open)));
      }) : h('tr', null, h('td', { class: 'grid-empty', colspan: '7' }, page.emptyAll)));
      return [bar, h('section', { class: 'card fit-card ap-table-card' }, h('div', { class: 'fit-scroll' },
        h('table', { class: 'data-grid ap-table' }, h('thead', null, h('tr', null, ['rev', 'type', 'status', 'step', 'sent', 'last', 'manage'].map(function (k) {
          return h('th', { scope: 'col', class: k === 'manage' ? 'manage' : null }, X2[k]);
        }))), body)))];
    }

    // ---------- แท็บ ตั้งค่า ----------
    function settingsTab() {
      var X3 = page.settings;
      var cfg = AP.config();
      var can = AP.canConfig();
      var box = h('input', { type: 'checkbox', class: 'ap-sd-switch', checked: cfg.sdConfirm, disabled: !can, onChange: function () {
        var res = AP.setConfig({ sdConfirm: box.checked });
        if (!res.ok) { window.alert(AP.errorText(res)); return; }
        C.toast(X3.saved);
        draw();
      } });
      var steps = AP.stepsFor(cfg, {}).filter(function (s) { return s.status !== 'skipped'; }).map(function (s) { return stepName(s.key); });
      return [h('section', { class: 'card ap-settings' },
        h('h2', { class: 'ap-settings-title' }, X3.title),
        h('label', { class: 'ap-switch' }, box, h('span', { class: 'ap-switch-track', 'aria-hidden': 'true' }), h('span', null, X3.sdConfirm)),
        h('p', { class: 'muted small' }, X3.note),
        h('p', { class: 'ap-settings-flow' }, fill(X3.flow, { steps: steps.join(' → ') })),
        can ? null : h('p', { class: 'muted small' }, X3.viewOnly))];
    }

    // ---------- รายละเอียดคำขอ ----------
    function timeline(req) {
      var cur = AP.currentStep(req);
      return h('ol', { class: 'ap-timeline' }, (req.steps || []).map(function (s) {
        var isCur = cur && cur.key === s.key;
        var st = req.status === 'withdrawn' && s.status === 'waiting' && s.key !== 'mgmtSubmit' ? 'waiting' : s.status;
        return h('li', { class: 'ap-step ap-step-' + st + (isCur ? ' is-current' : ''), dataset: { step: s.key } },
          h('span', { class: 'ap-step-role' }, (AL.steps[s.key] || {}).role || s.role),
          h('span', { class: 'ap-step-label' }, stepName(s.key)),
          h('span', { class: 'ap-step-status' }, AL.stepStatus[st] || st),
          s.actedAt ? h('span', { class: 'ap-step-who muted small' }, fill(X.actor, { by: s.actedBy || '–', at: F.dateTime(s.actedAt) })) : null,
          s.note && s.key !== 'mgmtSubmit' ? h('span', { class: 'ap-step-note small' }, fill(page.noteLine, { note: s.note })) : null);
      }));
    }
    function kpis(s) {
      var Q = X.kpi;
      function k(label, value, sub, cls) { return h('div', { class: 'card ap-kpi' + (cls || '') }, h('span', { class: 'ap-kpi-label' }, label), h('strong', { class: 'ap-kpi-value' }, value), sub ? h('span', { class: 'ap-kpi-sub muted small' }, sub) : null); }
      return h('div', { class: 'ap-kpis' },
        k(Q.total, F.baht(s.total), null),
        k(Q.prior, F.baht(s.prior), null),
        k(Q.growth, s.growth == null ? Q.none : pctText(s.growth), null, diffCls(s.growth)),
        k(s.compareName ? fill(Q.diff, { name: s.compareName }) : Q.diffNone, s.diff == null ? Q.none : signed(s.diff), s.diff == null ? page.firstRound.replace(/[()]/g, '') : pctText(s.pct), diffCls(s.diff)));
    }
    function channelTable(s) {
      var Q = X.channels;
      function w(v) { return s.max > 0 ? Math.max(0, v || 0) / s.max * 100 + '%' : '0%'; }
      return h('section', { class: 'card ap-sec ap-channels' }, h('h3', { class: 'ap-sec-title' }, Q.title),
        h('table', { class: 'data-grid ap-ch-table' },
          h('thead', null, h('tr', null, h('th', { scope: 'col' }, Q.name), h('th', { scope: 'col', class: 'num' }, s.compareName || Q.prevNone), h('th', { scope: 'col', class: 'num' }, s.name),
            h('th', { scope: 'col', class: 'num' }, Q.diff), h('th', { scope: 'col', class: 'num' }, Q.share), h('th', { scope: 'col', class: 'ap-bars-head' }, Q.bars))),
          h('tbody', null, s.channels.map(function (c) {
            return h('tr', { dataset: { id: c.id } }, h('th', { scope: 'row' }, c.name), h('td', { class: 'num' }, c.a == null ? '–' : F.baht(c.a)), h('td', { class: 'num' }, F.baht(c.b)),
              h('td', { class: 'num' + diffCls(c.diff) }, c.diff == null ? '–' : signed(c.diff)), h('td', { class: 'num' }, F.pct(c.share, 1)),
              h('td', null, h('div', { class: 'ap-bars' }, c.a == null ? null : h('span', { class: 'ap-bar-a', style: { width: w(c.a) } }), h('span', { class: 'ap-bar-b', style: { width: w(c.b) } }))));
          })),
          h('tfoot', null, h('tr', { class: 'ap-total' }, h('th', { scope: 'row' }, X.kpi.total), h('td', { class: 'num' }, s.prevTotal == null ? '–' : F.baht(s.prevTotal)), h('td', { class: 'num' }, F.baht(s.total)),
            h('td', { class: 'num' + diffCls(s.diff) }, s.diff == null ? '–' : signed(s.diff)), h('td', { class: 'num' }, F.pct(1, 0)), h('td')))));
    }
    function unitList(s) {
      var Q = X.units;
      var chName = {};
      s.channels.forEach(function (c) { chName[c.id] = c.name; });
      return h('section', { class: 'card ap-sec ap-units' }, h('h3', { class: 'ap-sec-title' }, Q.title),
        s.compareTo == null ? h('p', { class: 'muted' }, Q.firstRound) : !s.topUnits.length ? h('p', { class: 'muted' }, Q.none) :
          h('ol', { class: 'ap-unit-list' }, s.topUnits.map(function (u) {
            return h('li', { dataset: { id: u.id } }, h('span', { class: 'ap-unit-name' }, fill(Q.line, { name: u.name, channel: chName[u.channelId] || u.channelId })),
              h('span', { class: 'num ap-unit-diff' + diffCls(u.diff) }, signed(u.diff) + ' · ' + pctText(u.pct)));
          })));
    }
    function skuBox(s) {
      var Q = X.sku, k = s.sku || {};
      var chips = [
        h('span', { class: 'rev-check-chip is-ok' }, fill(Q.ok, { n: k.ok || 0 })),
        h('span', { class: 'rev-check-chip ' + (k.short ? 'is-bad' : 'is-ok') }, fill(Q.short, { n: k.short || 0 })),
        h('span', { class: 'rev-check-chip ' + (k.over ? 'is-warn' : 'is-ok') }, fill(Q.over, { n: k.over || 0 }))];
      if (k.empty) chips.push(h('span', { class: 'rev-check-chip is-warn' }, fill(Q.empty, { n: k.empty })));
      return h('section', { class: 'card ap-sec ap-sku' }, h('h3', { class: 'ap-sec-title' }, Q.title), h('p', { class: 'ap-chips' }, chips),
        h('p', null, fill(Q.shortTotal, { amount: F.baht(k.shortTotal || 0) })),
        h('a', { class: 'ap-link ap-status-link', href: SP.core.paths.to(reg.byId('summary').path) + '#status', onClick: function (e) { e.preventDefault(); goSummary('status'); } }, Q.link));
    }
    function mixBox(s) {
      var Q = X.mix, PT = SP.data.content.labels.planTypes;
      return h('section', { class: 'card ap-sec ap-mix' }, h('h3', { class: 'ap-sec-title' }, Q.title),
        h('ul', { class: 'ap-mix-list' }, ((s.mix || {}).rows || []).map(function (r) {
          return h('li', { dataset: { type: r.type } }, h('span', { class: 'ap-mix-dot', style: { '--c': 'var(' + ((PT[r.type] || {}).token || '--c-border-strong') + ')' } }),
            h('span', { class: 'ap-mix-name' }, (PT[r.type] || {}).label || r.type), h('span', { class: 'num' }, fill(Q.line, { amount: F.baht(r.value), pct: F.pct(r.pct, 1) })));
        })),
        h('p', { class: 'ap-clearance muted small' }, s.clearance > 0.5 ? fill(X.clearance.line, { amount: F.baht(s.clearance) }) : X.clearance.none));
    }
    function chartBox(s) {
      var Q = X.chart;
      var m = s.monthly || {};
      var a = m.a || m.b.map(function () { return 0; });
      var chart = G.compareLines({
        a: a, b: m.b, months: F.MONTHS, lockBefore: m.lockBefore || 0,
        labels: { a: m.a ? fill(Q.a, { name: s.compareName }) : Q.noPrev, b: fill(Q.b, { name: s.name }), diff: Q.diff, effective: m.lockBefore ? fill(Q.effective, { month: F.MONTHS[m.lockBefore] }) : '' },
        tick: G.millionTick,
        tip: function (i) { return [[s.compareName || Q.noPrev, m.a ? F.baht(a[i]) : '–'], [s.name, F.baht(m.b[i])], [Q.diff, m.a ? signed(m.b[i] - a[i]) : '–']]; }
      });
      return h('section', { class: 'card ap-sec ap-chart' }, h('h3', { class: 'ap-sec-title' }, Q.title), chart);
    }
    function goSummary(tab, rev) {
      if (rev) REV.select(rev);
      store.set('ui.summaryTab', tab);
      location.href = SP.core.paths.to(reg.byId('summary').path) + '#' + tab;
    }
    function commentsBox(req) {
      var Q = X.comments;
      var list = req.comments || [];
      var input = AP.canComment() ? h('textarea', { class: 'dlg-note ap-comment-input', rows: '2', placeholder: Q.placeholder, 'aria-label': Q.placeholder }) : null;
      return h('section', { class: 'card ap-sec ap-comments' }, h('h3', { class: 'ap-sec-title' }, Q.title),
        list.length ? h('ol', { class: 'ap-comment-list' }, list.map(function (c) {
          return h('li', { class: 'ap-comment' }, h('span', { class: 'ap-comment-who muted small' }, fill(Q.line, { by: c.by || '–', at: F.dateTime(c.at) })), h('span', { class: 'ap-comment-text' }, c.text));
        })) : h('p', { class: 'muted' }, Q.none),
        input ? h('div', { class: 'ap-comment-add' }, input, h('button', { type: 'button', class: 'btn btn-secondary btn-sm ap-comment-btn', onClick: function () {
          after(AP.comment(req.id, { text: input.value }), 'comment', req);
        } }, Q.add)) : null);
    }
    function actionBar(req) {
      var Q = X.actions;
      var cur = AP.currentStep(req);
      var name = revName(req);
      var btns = [];
      if (AP.canAct('withdraw', req)) btns.push(h('button', { type: 'button', class: 'btn btn-secondary btn-sm ap-withdraw', onClick: function () {
        C.dialog({ title: fill(X.withdrawDlg.title, { name: name }), lines: [X.withdrawDlg.line], confirmLabel: X.withdrawDlg.confirm })
          .then(function (r) { if (r.ok) after(AP.withdraw(req.id), 'withdraw', req); });
      } }, Q.withdraw));
      if (AP.canAct('return', req)) btns.push(h('button', { type: 'button', class: 'btn btn-secondary btn-sm ap-return', onClick: function () {
        C.dialog({ title: fill(X.returnDlg.title, { name: name }), lines: [X.returnDlg.line], note: { label: X.returnDlg.note, required: true, requiredText: AL.errors.note }, confirmLabel: X.returnDlg.confirm })
          .then(function (r) { if (r.ok) after(AP.returnToDraft(req.id, { note: r.note }), 'return', req); });
      } }, Q['return']));
      if (AP.canAct('confirm', req)) btns.push(h('button', { type: 'button', class: 'btn btn-primary btn-sm ap-confirm', onClick: function () {
        C.dialog({ title: fill(X.confirmDlg.title, { name: name }), lines: [fill(X.confirmDlg.line, { name: name })], note: { label: X.confirmDlg.note, required: false }, confirmLabel: X.confirmDlg.confirm })
          .then(function (r) { if (r.ok) after(AP.confirm(req.id, { note: r.note }), 'confirm', req); });
      } }, Q.confirm));
      if (AP.canAct('approve', req)) btns.push(h('button', { type: 'button', class: 'btn btn-primary btn-sm ap-approve', onClick: function () { approveDialog(req, name); } }, Q.approve));
      var hint = req.status !== 'pending' ? fill(Q.closed, { status: AL.status[req.status] }) :
        !btns.length && cur ? fill(Q.hint, { step: stepName(cur.key), role: (AL.steps[cur.key] || {}).role || cur.role }) : null;
      return h('div', { class: 'ap-actionbar no-print' }, hint ? h('span', { class: 'wf-hint ap-hint' }, hint) : null, h('span', { class: 'tool-spacer' }), btns);
    }
    // อนุมัติและ Lock: ชั้นที่ 1 ข้อความ เมื่อ Lock แล้วจะแก้ไขไม่ได้ → ชั้นที่ 2 พิมพ์ชื่อรอบ (ตาม CR-38) → Snapshot → Lock แล้ว
    function approveDialog(req, name) {
      var Q = X.approveDlg;
      C.dialog({ title: fill(Q.title, { name: name }), lines: [Q.warn, Q.what], confirmLabel: Q.next, danger: true }).then(function (r) {
        if (!r.ok) return;
        var input = h('input', { type: 'text', class: 'pm-input ap-lock-name', 'aria-label': fill(Q.type, { name: name }), placeholder: name, autocomplete: 'off' });
        C.dialog({ title: fill(Q.title2, { name: name }), body: h('label', { class: 'ap-dlg-field' }, h('span', { class: 'field-label' }, fill(Q.type, { name: name })), input),
          confirmLabel: Q.confirm, danger: true,
          validate: function () { return input.value.trim() === name ? null : fill(AL.errors.confirmName, { name: name }); } })
          .then(function (r2) { if (r2.ok) after(AP.approve(req.id, { confirmName: input.value.trim() }), 'approve', req); });
        setTimeout(function () { input.focus(); }, 0);
      });
    }
    function detail(id) {
      var req = AP.get(id);
      var head = h('div', { class: 'ap-detail-top' }, h('button', { type: 'button', class: 'link-btn ap-back', onClick: function () { goTab(view.tab || 'mine'); } }, X.back));
      if (!req) return [head, h('section', { class: 'card ap-empty' }, X.notFound)];
      var r = revOf(req);
      var s = req.summary;
      var changes = AP.summaryChanges(req.id);
      var hdr = h('section', { class: 'card ap-head' },
        h('div', { class: 'ap-head-title' }, h('strong', { class: 'ap-head-name' }, revName(req)), r ? C.revisionBadge(r.status) : null, statusBadge(req),
          r ? h('span', { class: 'muted' }, fill(X.effective, { month: K.label(r.effectiveMonth) })) : null,
          h('span', { class: 'muted small ap-head-no' }, fill(X.requestNo, { id: req.id, type: AL.type[req.type] || req.type }))),
        r ? h('p', { class: 'ap-head-line' }, fill(X.reason, { reason: r.reason || (r.seq === 1 ? X.firstReason : '–') })) : null,
        h('p', { class: 'ap-head-line muted' }, fill(page.sentBy, { by: req.createdBy || '–', at: F.dateTime(req.createdAt) }), ' · ', fill(page.noteLine, { note: req.note || '–' })),
        h('div', { class: 'ap-tl-wrap' }, h('span', { class: 'ap-tl-title muted small' }, X.timeline), timeline(req)));
      var body = h('div', { class: 'ap-detail-body' },
        changes.length ? h('p', { class: 'ap-changed', role: 'alert' }, fill(X.changed, { parts: changes.map(function (c) { return X.changedParts[c] || c; }).join(' · ') })) : null,
        s ? h('div', { class: 'ap-sum-head' }, h('h2', { class: 'ap-sum-title' }, fill(X.summaryTitle, { name: s.name })), h('span', { class: 'muted small' }, fill(X.summaryNote, { at: F.dateTime(req.createdAt) })),
          h('span', { class: 'tool-spacer' }),
          h('a', { class: 'ap-link ap-report-link', href: SP.core.paths.to(reg.byId('summary').path) + '#report', onClick: function (e) { e.preventDefault(); goSummary('report', req.refId); } }, X.links.report),
          s.compareTo ? h('a', { class: 'ap-link ap-compare-link', href: SP.core.paths.to(reg.byId('summary').path) + '#compare', onClick: function (e) {
            e.preventDefault(); store.set('ui.revisionCompare', { a: s.compareTo, b: req.refId }); goSummary('compare', req.refId);
          } }, X.links.compare) : null) : null,
        s ? kpis(s) : null,
        s ? h('div', { class: 'ap-grid' }, channelTable(s), h('div', { class: 'ap-col' }, unitList(s), skuBox(s), mixBox(s))) : null,
        s ? chartBox(s) : null,
        commentsBox(req));
      return [head, hdr, body, actionBar(req)];
    }

    // ---------- ส่งออก: ตารางคำขอ (ตามตัวกรองของแท็บทั้งหมด) ----------
    function exportSpec() {
      var X2 = page.columns;
      var st = C.exportStamp(null);
      return {
        filename: fill(page.exportFile, { date: st.date }),
        sheets: [{ name: page.exportSheet, header: C.exportHeader(store.year(), null), rows: filtered(), columns: [
          { key: 'id', label: page.exportId, value: function (q) { return q.id; } },
          { key: 'rev', label: X2.rev, value: function (q) { return revName(q); } },
          { key: 'type', label: X2.type, value: function (q) { return AL.type[q.type] || q.type; } },
          { key: 'status', label: X2.status, value: function (q) { return AL.status[q.status]; } },
          { key: 'step', label: X2.step, value: function (q) { var c = AP.currentStep(q); return c ? stepName(c.key) : ''; } },
          { key: 'sent', label: X2.sent, width: 30, value: function (q) { return fill(page.lastLine, { what: (AL.steps.mgmtSubmit || {}).short, by: q.createdBy || '', at: F.dateTime(q.createdAt) }); } },
          { key: 'last', label: X2.last, width: 30, value: function (q) { return lastOf(q); } },
          { key: 'total', label: page.exportTotal, type: 'money', value: function (q) { return q.summary ? q.summary.total : null; } },
          { key: 'diff', label: page.exportDiff, type: 'money', value: function (q) { return q.summary ? q.summary.diff : null; } }
        ] }]
      };
    }

    function draw() {
      C.clear(root);
      document.body.classList.toggle('ap-on-detail', !!view.request);
      if (view.request) { detail(view.request).forEach(function (n) { root.appendChild(n); }); return; }
      if (tabsAllowed().indexOf(view.tab) < 0) view.tab = 'mine';
      root.appendChild(tabsBar(AP.waitingFor().length));
      (view.tab === 'all' ? allTab() : view.tab === 'settings' ? settingsTab() : mineTab()).forEach(function (n) { root.appendChild(n); });
    }
    draw();
  }

  SP.modules.approval = { render: render };
})(window.SP);

/*
 * modules/about-prototype/about-prototype.js — คู่มือการใช้งาน (CR-28 แทนเกี่ยวกับ Prototype · id aboutPrototype เดิม · เมนูกลุ่ม ช่วยเหลือ)
 *
 * หน้าที่:        แท็บ ภาพรวมและลำดับงาน | คำศัพท์และสูตร | สถานการณ์ทดสอบ (UAT) — จำแท็บที่ ui.guideTab
 *                 เปิดด้วย #uat หรือ #uat-S4 (ปุ่ม กลับไปบันทึกผล ของแถบลอย) = แท็บ UAT และกางการ์ดของสถานการณ์นั้น
 *   ภาพรวม:       ภาพรวม · ลำดับการทำงาน (components.flowDiagram · ผู้แก้ไขจากสิทธิ์จริง core/guide.js pageEditors / groupEditors ·
 *                 ไฮไลต์การ์ดที่บทบาทปัจจุบันแก้ได้ · หน้าที่บทบาทไม่เห็น = ปุ่มกดไม่ได้) · บทบาทและหน้าที่ (core/guide.js roleRows) · สำหรับการทดสอบ
 *   คำศัพท์และสูตร: คำศัพท์ (ชื่อเรียก GP / หน่วยขายจาก Channel Master) · สูตรจาก Channel Master (core/guide.js formulaLines) · ความหมายสีคงเหลือ
 *   สถานการณ์ทดสอบ: ผู้ทดสอบ · วันที่ (ค่าเริ่มต้นวันนี้) · ความคืบหน้า · ส่งออก ▾ (ส่งออกได้ทุกบทบาท) · ล้างผล · การ์ดพับได้ต่อสถานการณ์
 *                 (เริ่มสถานการณ์นี้ = สลับมุมมองผู้ใช้ + หน่วยขายที่เลือก + เปิดหน้าแรก · ขั้นตอน ☐ ทำแล้ว · ผลที่คาดหวัง · ผ่าน / ไม่ผ่าน / ข้าม + หมายเหตุ)
 *                 ผลเก็บที่ uat.results (รีเซ็ตข้อมูลไม่ล้าง · core/layout.js resetData)
 *                 จอกว้างตั้งแต่ 1024px หน้าสูงเท่าจอ เนื้อหาแท็บเลื่อนภายในการ์ด
 * อ่านจาก data/:  guide (เนื้อหาทั้งหมด), content (pages.aboutPrototype ป้าย · labels.remainingText), channels, settings
 * store อ่าน:     ui.role, ui.guideTab, uat.results / store เขียน: ui.guideTab, uat.results, ui.role · ui.selection · ui.toast (เริ่มสถานการณ์)
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var F = SP.core.format;
  var h = C.h;
  var fill = C.fill;
  var store = SP.core.store;
  var G = SP.core.guide;
  var P = SP.core.permissions;
  var reg = SP.core.registry;

  var TABS = ['overview', 'glossary', 'uat'];

  function todayIso() {
    var d = new Date();
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function uniq(list) { return list.filter(function (v, i) { return v && list.indexOf(v) === i; }); }

  function render(root, ctx) {
    var page = ctx.page;
    var D = SP.data.guide;
    var site = SP.data.content.site;
    var labels = SP.data.content.labels;
    var K = SP.core.clock;
    var me = P.user();
    var roles = P.rolesNow().slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    var channels = SP.data.channels.filter(function (c) { return c.active !== false; });

    var hash = /^#uat(?:-(\w+))?$/.exec(location.hash);
    var tab = hash ? 'uat' : store.get('ui.guideTab');
    if (TABS.indexOf(tab) < 0) tab = 'overview';
    var open = {};                // UAT: การ์ดที่กางอยู่
    if (hash && hash[1]) open[hash[1]] = true;
    var noteError = {};           // UAT: <id> → true = เลือกไม่ผ่านโดยไม่มีหมายเหตุ
    var noteDraft = {};           // UAT: ข้อความหมายเหตุที่ยังบันทึกไม่ได้

    function pageName(id, short) { return SP.core.layout.pageLabel(id, short); }
    function roleName(id) { var r = roles.filter(function (x) { return x.id === id; })[0]; return r ? r.name : id; }
    function roleToken(id) { var i = roles.map(function (r) { return r.id; }).indexOf(id); return '--person-' + ((i < 0 ? 0 : i) % 8 + 1); }
    function chip(id, text) { return h('span', { class: 'role-chip', style: { '--c': C.tokenVar(roleToken(id)) } }, text || roleName(id)); }
    function hrefOf(id) { var e = reg.byId(id); return e && P.pageVisible(me, id) ? SP.core.paths.to(e.path) : null; }
    function isMine(list) { return list.some(function (r) { return (me.roleIds || []).indexOf(r.id) >= 0; }); }
    function scenarioRole(s) {
      var ch = s.channelId ? SP.data.channels.filter(function (c) { return c.id === s.channelId; })[0] : null;
      return roleName(s.roleId) + (ch ? ' · ' + ch.name : '');
    }

    var tabsBox = h('div', { class: 'ab-tabs' });
    var panel = h('div', { class: 'card ab-panel gd-panel' });
    root.appendChild(tabsBox);
    root.appendChild(panel);

    function draw() {
      C.clear(tabsBox).appendChild(C.segmented({
        label: page.tabLabel, value: tab,
        options: TABS.map(function (id) { return { value: id, label: page.tabs[id] }; }),
        onChange: function (v) { tab = v; store.set('ui.guideTab', v); panel.scrollTop = 0; draw(); }
      }));
      var keep = panel.scrollTop;
      C.clear(panel);
      panel.dataset.tab = tab;
      panel.appendChild(tab === 'glossary' ? glossaryTab() : tab === 'uat' ? uatTab() : overviewTab());
      panel.scrollTop = keep;
    }

    // =====================================================================
    // ภาพรวมและลำดับงาน
    // =====================================================================
    function overviewTab() {
      var FL = page.flow;
      var steps = D.flow.steps.map(function (s) {
        var e = reg.byId(s.pageId);
        var eds = G.pageEditors(s.pageId);
        return {
          pageId: s.pageId, n: e ? e.tour : '', title: pageName(s.pageId), does: s.does, result: s.result,
          roles: eds.map(function (r) { return { id: r.id, name: r.name, token: roleToken(r.id) }; }), allRoles: FL.allRoles,
          mine: isMine(eds), href: hrefOf(s.pageId), goTip: fill(FL.goTip, { page: pageName(s.pageId) }), disabledTip: FL.noAccess
        };
      });
      var masters = D.flow.masters.map(function (m) {
        var eds = G.groupEditors(m.group);
        return { title: m.title, roles: eds.map(function (r) { return r.name; }).join(' · '), href: hrefOf(m.pageId),
          goTip: fill(FL.goTip, { page: pageName(m.pageId) }), disabledTip: FL.noAccess };
      });
      var loopIndex = D.flow.steps.map(function (s) { return s.pageId; }).indexOf(D.flow.loopAt);
      var flow = C.flowDiagram({
        steps: steps, loopIndex: loopIndex, loopText: D.flow.loopText, loopTip: FL.loopTip, note: D.flow.backNote,
        mastersLabel: D.flow.mastersLabel, masters: masters,
        labels: { step: FL.step, result: FL.result, yourRole: FL.yourRole, go: FL.go }
      });

      var RC = page.rolesColumns;
      var rows = G.roleRows();
      var table = h('table', { class: 'data-table gd-roles' },
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, RC.role), h('th', { scope: 'col' }, RC.description), h('th', { scope: 'col' }, RC.edit), h('th', { scope: 'col' }, RC.home),
          h('th', { scope: 'col', class: 'num' }, RC.users))),
        h('tbody', null, rows.map(function (r) {
          var edit = r.everywhere
            ? (r.except.length ? fill(page.allExcept, { pages: r.except.map(function (id) { return pageName(id, true); }).join(', ') }) : page.allPages)
            : r.edit.length ? r.edit.map(function (id) { return pageName(id, true); }).join(' · ') : page.viewOnly;
          return h('tr', { class: (me.roleIds || []).indexOf(r.id) >= 0 ? 'is-mine' : null, dataset: { role: r.id } },
            h('th', { scope: 'row' }, chip(r.id, r.name), r.system ? null : h('span', { class: 'gd-custom' }, page.customRole)),
            h('td', { class: 'gd-desc' }, r.description || '–'),
            h('td', { class: 'gd-edit' + (!r.everywhere && !r.edit.length ? ' is-muted' : '') }, edit),
            h('td', { class: 'gd-home' }, r.home ? pageName(r.home, true) : '–'),
            h('td', { class: 'num gd-users' }, fill(page.usersCount, { n: r.users })));
        })));

      var month = K.label(K.currentMonth());
      return h('div', { class: 'gd-overview' },
        h('section', { class: 'gd-block gd-intro' }, h('p', { class: 'gd-overview-text' }, h('strong', { class: 'gd-overview-label' }, page.overviewTitle), D.overview)),
        h('section', { class: 'gd-block' }, h('h2', null, page.flowTitle), flow),
        h('div', { class: 'gd-bottom' },
          h('section', { class: 'gd-block gd-roles-box' }, h('h2', null, page.rolesTitle, h('span', { class: 'gd-sub' }, page.rolesNote)), h('div', { class: 'table-scroll' }, table)),
          h('section', { class: 'gd-block callout callout-info gd-test-notes' }, h('h2', null, page.testTitle),
            h('ul', { class: 'ab-list' }, D.testNotes.map(function (t) { return h('li', null, fill(t, { month: month })); })))));
    }

    // =====================================================================
    // คำศัพท์และสูตร
    // =====================================================================
    function glossaryTab() {
      var GC = page.glossaryColumns;
      var vars = {
        gpLabels: uniq(channels.filter(function (c) { return c.hasGP !== false; }).map(function (c) { return c.gpLabel; })).join(' / '),
        unitLabels: uniq(channels.map(function (c) { return c.unitLabel; })).join(' · '),
        range: K.rangeLabel(false),
        horizon: K.label(K.horizonEnd())   // CR-32: สิ้นสุดแผน
      };
      var vat = F.number(1 + SP.data.settings.VAT, 2);
      var lines = G.formulaLines(channels).map(function (l) {
        return l.kind === 'sale' ? page.formulaSale
          : l.gpLabel ? fill(page.formulaNetGp, { channel: l.channel, vat: vat, gp: l.gpLabel }) : fill(page.formulaNet, { channel: l.channel, vat: vat });
      });
      return h('div', { class: 'gd-glossary' },
        h('section', { class: 'gd-block' }, h('h2', null, page.glossaryTitle),
          h('table', { class: 'data-table gd-terms' },
            h('thead', null, h('tr', null, h('th', { scope: 'col' }, GC.term), h('th', { scope: 'col' }, GC.meaning))),
            h('tbody', null, D.glossary.map(function (g) {
              return h('tr', null, h('th', { scope: 'row' }, fill(g.term, vars)), h('td', null, fill(g.meaning, vars)));
            })))),
        h('div', { class: 'gd-side' },
          h('section', { class: 'gd-block' }, h('h2', null, D.formulasTitle), h('div', { class: 'gd-formulas' }, lines.map(function (t) { return h('div', { class: 'gd-formula' }, t); }))),
          h('section', { class: 'gd-block' }, h('h2', null, D.remainingTitle),
            h('ul', { class: 'gd-remaining' }, D.remaining.map(function (r) {
              return h('li', null, h('span', { class: 'badge alert-' + r.status }, r.label), h('span', null, r.meaning));
            })))));
    }

    // =====================================================================
    // สถานการณ์ทดสอบ (UAT)
    // =====================================================================
    function load() { return G.uatNormalize(store.get('uat.results')); }
    function save(r) { store.set('uat.results', r); draw(); }

    function start(s) {
      var st = G.uatStart(load(), s);
      var e = st.ok ? reg.byId(st.pageId) : null;
      if (!e) return;
      store.set('ui.role', st.role);
      if (st.selection) store.set('ui.selection', st.selection);
      store.set('uat.results', st.results);
      store.set('ui.toast', fill(site.switchToast, { role: scenarioRole(s), page: pageName(st.pageId) }));
      C.guardUnsaved(null);
      location.href = SP.core.paths.to(e.path);
    }

    function exportSpec() {
      var E = page.exportSpec;
      var U = page.uat;
      var r = load();
      if (!r.date) r = G.uatSetMeta(r, { date: todayIso() });
      var prog = G.uatProgress(r, D.scenarios);
      var rows = G.uatExportRows(r, D.scenarios, { roleOf: scenarioRole, result: U.results });
      var cols = E.cols;
      var stamp = C.exportStamp(null);
      return {
        filename: fill(E.file, { date: stamp.date }),
        sheets: [{
          name: E.sheet,
          header: C.exportHeader(store.year(), null, [[E.headerTester, r.tester || '–'], [E.headerDate, r.date], [E.headerProgress, fill(U.progress, prog)]]),
          columns: ['tester', 'date', 'id', 'title', 'role', 'steps', 'result', 'note'].map(function (k) { return { key: k, label: cols[k], width: k === 'note' ? 40 : k === 'title' ? 26 : null }; }),
          rows: rows
        }]
      };
    }

    function uatTab() {
      var U = page.uat;
      var r = load();
      var prog = G.uatProgress(r, D.scenarios);
      var tester = h('input', { type: 'text', class: 'gd-input gd-tester', value: r.tester, placeholder: U.testerPlaceholder, 'aria-label': U.tester,
        onChange: function (e) { save(G.uatSetMeta(load(), { tester: e.target.value })); } });
      var date = h('input', { type: 'date', class: 'gd-input gd-date', value: r.date || todayIso(), 'aria-label': U.date,
        onChange: function (e) { save(G.uatSetMeta(load(), { date: e.target.value })); } });
      var exp = C.exportButton({ build: exportSpec });
      exp.classList.add('uat-export');
      var clear = h('button', { type: 'button', class: 'btn btn-ghost btn-sm gd-clear', onClick: function () {
        C.dialog({ title: U.clearConfirm, lines: U.clearLines, confirmLabel: U.clear, danger: true }).then(function (res) {
          if (!res.ok) return;
          open = {}; noteError = {}; noteDraft = {};
          save(G.uatBlank());
        });
      } }, U.clear);
      var toolbar = h('div', { class: 'gd-uat-bar' },
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, U.tester), tester),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, U.date), date),
        h('span', { class: 'gd-progress', role: 'status' }, fill(U.progress, prog)),
        h('span', { class: 'gd-uat-actions' }, exp, clear));
      var allOpen = D.scenarios.every(function (s) { return open[s.id]; });
      var toggle = h('button', { type: 'button', class: 'link-btn gd-toggle-all', onClick: function () {
        D.scenarios.forEach(function (s) { open[s.id] = !allOpen; });
        draw();
      } }, allOpen ? U.collapseAll : U.expandAll);
      return h('div', { class: 'gd-uat' }, toolbar,
        h('p', { class: 'callout callout-question gd-uat-warning' }, U.warning),
        h('div', { class: 'gd-sc-tools' }, toggle),
        h('div', { class: 'gd-scenarios' }, D.scenarios.map(function (s) { return scenarioCard(s, r); })));
    }

    function scenarioCard(s, r) {
      var U = page.uat;
      var it = G.uatItem(r, s.id);
      var info = G.uatStepInfo(r, s);
      var isOpen = !!open[s.id];
      var active = r.active === s.id;
      var res = it.result || 'none';
      var head = h('button', { type: 'button', class: 'gd-sc-head', 'aria-expanded': isOpen ? 'true' : 'false',
        onClick: function () { open[s.id] = !isOpen; draw(); } },
        h('span', { class: 'gd-sc-caret', 'aria-hidden': 'true' }, isOpen ? '▾' : '▸'),
        h('span', { class: 'gd-sc-id' }, s.id),
        h('strong', { class: 'gd-sc-title' }, s.title),
        chip(s.roleId, scenarioRole(s)),
        active ? h('span', { class: 'badge tag-warn gd-sc-active' }, U.active) : null,
        h('span', { class: 'gd-sc-count' }, info.done + '/' + info.total),
        h('span', { class: 'badge gd-result is-' + res }, U.results[res]));
      var card = h('section', { class: 'gd-sc' + (isOpen ? ' is-open' : '') + (active ? ' is-active' : ''), id: 'uat-' + s.id, dataset: { id: s.id } }, head);
      if (!isOpen) return card;
      var target = reg.byId(s.pageId);
      var startBtn = h('button', { type: 'button', class: 'btn btn-primary btn-sm gd-start', title: fill(U.startTip, { role: scenarioRole(s), page: target ? pageName(s.pageId) : s.pageId }),
        onClick: function () { start(s); } }, U.start);
      var steps = h('ol', { class: 'gd-steps' }, s.steps.map(function (t, i) {
        return h('li', { class: it.steps[i] ? 'is-done' : null },
          h('span', { class: 'gd-step-text' }, t),
          h('label', { class: 'gd-step-check' }, h('input', { type: 'checkbox', checked: !!it.steps[i], onChange: function (e) { save(G.uatSetStep(load(), s.id, i, e.target.checked)); } }), U.stepDone));
      }));
      var note = h('textarea', { class: 'gd-input gd-note', rows: '2', placeholder: U.notePlaceholder, 'aria-label': U.note,
        onChange: function (e) {
          var cur = G.uatItem(load(), s.id);
          var out = G.uatSetResult(load(), s.id, cur.result, e.target.value);
          if (!out.ok) { noteError[s.id] = true; noteDraft[s.id] = e.target.value; draw(); return; }
          noteError[s.id] = false; delete noteDraft[s.id];
          save(out.results);
        } });
      note.value = noteDraft[s.id] != null ? noteDraft[s.id] : it.note;
      var result = C.segmented({
        label: U.result, value: it.result,
        options: G.UAT_RESULTS.map(function (v) { return { value: v, label: U.results[v], className: 'gd-res-' + v }; }),
        onChange: function (v) {
          var out = G.uatSetResult(load(), s.id, v, note.value);
          if (!out.ok) { noteError[s.id] = true; noteDraft[s.id] = note.value; draw(); return; }
          noteError[s.id] = false; delete noteDraft[s.id];
          save(out.results);
        }
      });
      card.appendChild(h('div', { class: 'gd-sc-body' },
        h('div', { class: 'gd-sc-col' }, h('div', { class: 'gd-sc-start' }, startBtn), h('h3', null, U.steps), steps),
        h('div', { class: 'gd-sc-col' },
          h('h3', null, U.expected), h('p', { class: 'gd-expected' }, s.expected),
          h('h3', null, U.result), result,
          h('label', { class: 'field gd-note-field' }, h('span', { class: 'field-label' }, U.note), note),
          noteError[s.id] ? h('p', { class: 'gd-note-error text-short', role: 'alert' }, U.noteRequired) : null)));
      return card;
    }

    draw();
    if (hash && hash[1]) {
      var el = document.getElementById('uat-' + hash[1]);
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' });
    }
    window.addEventListener('hashchange', function () {
      var m = /^#uat(?:-(\w+))?$/.exec(location.hash);
      if (!m) return;
      tab = 'uat';
      if (m[1]) open[m[1]] = true;
      draw();
    });
  }

  SP.modules.aboutPrototype = { render: render };
})(window.SP);

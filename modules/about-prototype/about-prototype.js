/*
 * modules/about-prototype/about-prototype.js — คู่มือการใช้งาน (CR-28 แทนเกี่ยวกับ Prototype · id aboutPrototype เดิม · เมนูกลุ่ม ช่วยเหลือ)
 *
 * หน้าที่:        แท็บ ภาพรวมและลำดับงาน | คำศัพท์และสูตร — จำแท็บที่ ui.guideTab (CR-36 ตัดแท็บสถานการณ์ทดสอบ UAT · ทำ UAT นอกระบบ)
 *   ภาพรวม:       ภาพรวม · ลำดับการทำงาน (components.flowDiagram · ผู้แก้ไขจากสิทธิ์จริง core/guide.js pageEditors ·
 *                 ไฮไลต์การ์ดที่บทบาทปัจจุบันแก้ได้ · หน้าที่บทบาทไม่เห็น = ปุ่มกดไม่ได้) · ข้อมูลที่ต้องมีก่อน (CR-36 หน้าในกลุ่ม + ผู้แก้ไขของแต่ละหน้า) ·
 *                 บทบาทและหน้าที่ (core/guide.js roleRows) · สำหรับการทดสอบ
 *   คำศัพท์และสูตร: คำศัพท์ตามกลุ่ม (ชื่อเรียก GP / หน่วยขายจาก Channel Master) · สูตรจาก Channel Master (core/guide.js formulaLines) + Clearance Net Sales ·
 *                 ความหมายสีคงเหลือ + คงเหลือสต็อก Clearance
 *                 ชื่อหน้าทุกจุด = ชื่อจากเมนู ({page_<id>} · core/guide.js textVars)
 *                 จอกว้างตั้งแต่ 1024px หน้าสูงเท่าจอ เนื้อหาแท็บเลื่อนภายในการ์ด
 * อ่านจาก data/:  guide (เนื้อหาทั้งหมด), content (pages.aboutPrototype ป้าย · site.groups), channels, settings
 * store อ่าน:     ui.role, ui.guideTab / store เขียน: ui.guideTab
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

  var TABS = ['overview', 'glossary'];
  // CR-36: สีคงเหลือสต็อก Clearance (ครบ = เขียว · ยังระบายไม่หมด = เหลือง · เกินสต็อก = แดง) ใช้ class สีเดียวกับแถวคงเหลือ
  var STOCK_CLASS = { ok: 'alert-ok', left: 'alert-over', over: 'alert-short' };

  function uniq(list) { return list.filter(function (v, i) { return v && list.indexOf(v) === i; }); }

  function render(root, ctx) {
    var page = ctx.page;
    var D = SP.data.guide;
    var site = SP.data.content.site;
    var K = SP.core.clock;
    var me = P.user();
    var roles = P.rolesNow().slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    var channels = SP.data.channels.filter(function (c) { return c.active !== false; });
    var tv = G.textVars();   // CR-36: {page_<id>} = ชื่อหน้าจากเมนู

    var tab = store.get('ui.guideTab');
    if (TABS.indexOf(tab) < 0) tab = 'overview';

    function pageName(id, short) { return SP.core.layout.pageLabel(id, short); }
    function roleName(id) { var r = roles.filter(function (x) { return x.id === id; })[0]; return r ? r.name : id; }
    function roleToken(id) { var i = roles.map(function (r) { return r.id; }).indexOf(id); return '--person-' + ((i < 0 ? 0 : i) % 8 + 1); }
    function chip(id, text) { return h('span', { class: 'role-chip', style: { '--c': C.tokenVar(roleToken(id)) } }, text || roleName(id)); }
    function hrefOf(id) { var e = reg.byId(id); return e && P.pageVisible(me, id) ? SP.core.paths.to(e.path) : null; }
    function isMine(list) { return list.some(function (r) { return (me.roleIds || []).indexOf(r.id) >= 0; }); }
    function text(t, extra) {
      var vars = {};
      Object.keys(tv).forEach(function (k) { vars[k] = tv[k]; });
      Object.keys(extra || {}).forEach(function (k) { vars[k] = extra[k]; });
      return fill(t, vars);
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
      panel.appendChild(tab === 'glossary' ? glossaryTab() : overviewTab());
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
          pageId: s.pageId, n: e ? e.tour : '', title: pageName(s.pageId), does: s.does.map(function (d) { return text(d); }), result: text(s.result),
          roles: eds.map(function (r) { return { id: r.id, name: r.name, token: roleToken(r.id) }; }), allRoles: FL.allRoles,
          mine: isMine(eds), href: hrefOf(s.pageId), goTip: fill(FL.goTip, { page: pageName(s.pageId) }), disabledTip: FL.noAccess
        };
      });
      // CR-36: ข้อมูลที่ต้องมีก่อน = ชื่อกลุ่มเมนู + หน้าในกลุ่มพร้อมผู้แก้ไขของแต่ละหน้า (จากสิทธิ์จริง)
      var masters = D.flow.masters.map(function (m) {
        return {
          title: (site.groups && site.groups[m.group]) || m.group,
          lines: m.pages.filter(function (id) { return !!reg.byId(id); }).map(function (id) {
            return { title: pageName(id), roles: G.pageEditors(id).map(function (r) { return r.name; }).join(' · '), href: hrefOf(id),
              goTip: fill(FL.goTip, { page: pageName(id) }), disabledTip: FL.noAccess };
          })
        };
      });
      var loopIndex = D.flow.steps.map(function (s) { return s.pageId; }).indexOf(D.flow.loopAt);
      var flow = C.flowDiagram({
        steps: steps, loopIndex: loopIndex, loopText: text(D.flow.loopText), loopTip: FL.loopTip, note: text(D.flow.backNote),
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
        h('section', { class: 'gd-block gd-intro' }, h('p', { class: 'gd-overview-text' }, h('strong', { class: 'gd-overview-label' }, page.overviewTitle), text(D.overview))),
        h('section', { class: 'gd-block' }, h('h2', null, page.flowTitle), flow),
        h('div', { class: 'gd-bottom' },
          h('section', { class: 'gd-block gd-roles-box' }, h('h2', null, page.rolesTitle, h('span', { class: 'gd-sub' }, fill(page.rolesNote, tv))), h('div', { class: 'table-scroll' }, table)),
          h('section', { class: 'gd-block callout callout-info gd-test-notes' }, h('h2', null, page.testTitle),
            h('ul', { class: 'ab-list' }, D.testNotes.map(function (t) { return h('li', null, text(t, { month: month })); })))));
    }

    // =====================================================================
    // คำศัพท์และสูตร
    // =====================================================================
    function glossaryTab() {
      var GC = page.glossaryColumns;
      var gpLabels = uniq(channels.filter(function (c) { return c.hasGP !== false; }).map(function (c) { return c.gpLabel; })).join(' / ');
      var vars = {
        gpLabels: gpLabels,
        unitLabels: uniq(channels.map(function (c) { return c.unitLabel; })).join(' · '),
        range: K.rangeLabel(false),
        horizon: K.label(K.horizonEnd())   // CR-32: สิ้นสุดแผน
      };
      var vat = F.number(1 + SP.data.settings.VAT, 2);
      var lines = G.formulaLines(channels).map(function (l) {
        return l.kind === 'sale' ? page.formulaSale
          : l.gpLabel ? fill(page.formulaNetGp, { channel: l.channel, vat: vat, gp: l.gpLabel }) : fill(page.formulaNet, { channel: l.channel, vat: vat });
      }).concat([fill(page.formulaClearance, { vat: vat, gp: gpLabels })]);   // CR-36
      // CR-36: คำศัพท์ตามกลุ่ม (แถวหัวกลุ่ม + คำในกลุ่ม)
      var body = h('tbody');
      D.glossaryGroups.forEach(function (g) {
        body.appendChild(h('tr', { class: 'gd-term-group' }, h('th', { scope: 'colgroup', colspan: '2' }, g.title)));
        g.terms.forEach(function (t) { body.appendChild(h('tr', null, h('th', { scope: 'row' }, text(t.term, vars)), h('td', null, text(t.meaning, vars)))); });
      });
      return h('div', { class: 'gd-glossary' },
        h('section', { class: 'gd-block' }, h('h2', null, page.glossaryTitle),
          h('table', { class: 'data-table gd-terms' },
            h('thead', null, h('tr', null, h('th', { scope: 'col' }, GC.term), h('th', { scope: 'col' }, GC.meaning))), body)),
        h('div', { class: 'gd-side' },
          h('section', { class: 'gd-block' }, h('h2', null, D.formulasTitle), h('div', { class: 'gd-formulas' }, lines.map(function (t) { return h('div', { class: 'gd-formula' }, t); }))),
          h('section', { class: 'gd-block' }, h('h2', null, D.remainingTitle),
            h('ul', { class: 'gd-remaining' }, D.remaining.map(function (r) {
              return h('li', null, h('span', { class: 'badge alert-' + r.status }, r.label), h('span', null, r.meaning));
            }))),
          h('section', { class: 'gd-block' }, h('h2', null, D.stockRemainingTitle),
            h('ul', { class: 'gd-remaining gd-stock-remaining' }, D.stockRemaining.map(function (r) {
              return h('li', null, h('span', { class: 'badge ' + STOCK_CLASS[r.status] }, r.label), h('span', null, r.meaning));
            })))));
    }

    draw();
  }

  SP.modules.aboutPrototype = { render: render };
})(window.SP);

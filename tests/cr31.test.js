/*
 * tests/cr31.test.js — Test ของ CR-31 (Role Management 2 หน้า: Permissions รวมการจัดการบทบาท · Users สิทธิ์ที่มีผลจริงตาม Module)
 *
 * รันด้วย Node: node tests/run.js cr31 / ในเบราว์เซอร์: tests/calc.test.html รวม Test ชุดนี้ด้วย (cr31-1 ใช้ DOM)
 *   cr31-1..9 = Test ตาม CR-31 · ข้อมูลตั้งต้นจาก data/ · store: ไม่อ่าน ไม่เขียน (ส่วนหน้าจอตรวจใน e2e)
 */
(function () {
  'use strict';
  var SP = window.SP = window.SP || {};
  SP.tests = SP.tests || {};

  function P() { return SP.core.permissions; }
  function D() { return SP.data; }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function ctx(state) {
    state = state || {};
    return { roles: state.roles || D().roles, perms: state.perms || P().defaultPerms(), users: state.users || D().users, teams: D().teams, month: '2027-03', list: SP.core.registry.list };
  }

  SP.tests.cr31 = [
    {
      name: 'cr31-1. permissionCell: EDIT + TEAM → แก้ไข + เฉพาะทีม · VIEW → ดู · NONE → ว่าง · action อนุญาต → อนุญาต · ไม่มีสัญลักษณ์ ✓ ✕ – · Legend = แก้ไข · ดู · ว่าง = ไม่เห็น',
      expected: [['แก้ไข', 'เฉพาะทีม'], 'ดู', '', 'อนุญาต', '', false, 'แก้ไข·ดู·ว่าง = ไม่เห็น'],
      actual: function () {
        var C = SP.core.components;
        function texts(el) { return [].map.call(el.querySelectorAll('span, small'), function (x) { return x.textContent; }); }
        var all = [C.permissionCell('EDIT', 'TEAM', 'page'), C.permissionCell('VIEW', 'ALL', 'page'), C.permissionCell('NONE', 'ALL', 'page'), C.permissionCell('EDIT', 'ALL', 'action'), C.permissionCell('NONE', 'ALL', 'action')];
        var html = all.map(function (el) { return el.outerHTML; }).join('');
        var box = document.createElement('div');
        box.appendChild(C.permissionLegend());
        return [texts(all[0]), all[1].textContent, all[2].textContent, all[3].textContent, all[4].textContent, /[✓✕–]/.test(html), box.textContent];
      }
    },
    {
      name: 'cr31-2. หน้า Permissions ไม่มีข้อความ เห็น x หน้า · ไม่มี Checkbox เฉพาะที่ต่างจากค่าตั้งต้น · ตัวเลือกระดับไม่มีสัญลักษณ์ ✓ ✕ – · กลุ่มสุดท้ายชื่อ ทั้งระบบ',
      expected: [false, false, false, 'ทั้งระบบ'],
      actual: function () {
        var M = D().content.pages.roleManagement.matrix;
        return ['summary' in M, 'diffOnly' in M, /[✓✕–]/.test(JSON.stringify([M.levels, M.actionLevels, M.scopes, D().content.labels.perm.cell])), M.globalGroup];
      }
    },
    {
      name: 'cr31-3. เมนู ⋯ ของบทบาท ตั้งหน้าเริ่มต้นของ Sales Officer เป็น Plan Summary → หน้าเริ่มต้นของบทบาทและของผู้ใช้ Sales Officer (พิมพ์ลดา) = summary',
      expected: ['skuPlanning', 'summary', 'summary'],
      actual: function () {
        var before = P().roleHome('officer', ctx());
        var roles = P().setRoleHome(clone(D().roles), 'officer', 'summary');
        var c = ctx({ roles: roles });
        var pim = D().users.filter(function (u) { return u.id === 'u-sp-pim'; })[0];
        return [before, P().roleHome('officer', c), P().homePage(pim, c)];
      }
    },
    {
      name: 'cr31-4. + เพิ่มบทบาท คัดลอกสิทธิ์จาก Sales Officer → ทุกช่องเท่ากับ Sales Officer · เป็นบทบาทที่สร้างเอง (system false · Chip สร้างเอง)',
      expected: [true, 0, false],
      actual: function () {
        var list = SP.core.registry.list;
        var res = P().addRole({ roles: clone(D().roles), perms: P().defaultPerms(), users: D().users }, 'Sales Officer ภาคเหนือ', '', 'officer', list);
        var off = res.roles.filter(function (r) { return r.id === 'officer'; })[0], nw = res.roles.filter(function (r) { return r.id === res.id; })[0];
        var diff = P().resources(list).filter(function (r) { return JSON.stringify(P().cell(res.perms, off, r)) !== JSON.stringify(P().cell(res.perms, nw, r)); }).length;
        return [res.ok, diff, nw.system];
      }
    },
    {
      name: 'cr31-5. ลบบทบาทที่มีผู้ใช้ → ไม่ยอมรับ (hasUsers) · ลบบทบาทตั้งต้น → ไม่ยอมรับ (system · เมนูไม่มีตัวเลือกลบ) · บทบาทที่สร้างเองไม่มีผู้ใช้ → ลบได้',
      expected: ['hasUsers', 'system', true],
      actual: function () {
        var list = SP.core.registry.list;
        var st = { roles: clone(D().roles), perms: P().defaultPerms(), users: clone(D().users) };
        var add = P().addRole(st, 'บทบาททดสอบ', '', null, list);
        st.roles = add.roles; st.perms = add.perms;
        var withUser = clone(st); withUser.users.push({ id: 'u-x', name: 'x', salesPersonId: null, roleIds: [add.id], active: true });
        return [P().removeRole(withUser, add.id).error, P().removeRole(st, 'officer').error, P().removeRole(st, add.id).ok];
      }
    },
    {
      name: 'cr31-6. หน้า Users Module = Product Master → คอลัมน์เป็น 5 หน้าของ Product Master · ผู้ใช้ 2 บทบาท (ดูรายงาน + ทีม Product) ได้สิทธิ์สูงสุด และบอกบทบาทต้นทาง',
      expected: [['productList', 'npdPlan', 'promotionPrice', 'productMaster', 'taxonomy'], ['EDIT', ['product']], ['VIEW', ['product', 'viewer']], ['EDIT', ['product']]],
      actual: function () {
        var list = SP.core.registry.list;
        var pages = [];
        P().resources(list).filter(function (r) { return r.group === 'product-master'; }).forEach(function (r) { if (pages.indexOf(r.pageId) < 0) pages.push(r.pageId); });
        var u = { id: 'u-two', name: 'สองบทบาท', salesPersonId: null, roleIds: ['viewer', 'product'], active: true };
        var eff = {};
        P().effectiveRows(u, ctx()).forEach(function (r) { eff[r.res.id] = [r.level, r.from]; });
        return [pages, eff.productList, eff.summary, eff['prices.base']];
      }
    },
    {
      name: 'cr31-7. เปลี่ยนบทบาทของผู้ใช้ (พิมพ์ลดา Sales Officer → + ทีม Product) → สิทธิ์ที่มีผลจริงของหน้ารายการสินค้าเปลี่ยนจาก ดู เป็น แก้ไข ทันที',
      expected: ['VIEW', 'EDIT'],
      actual: function () {
        var pim = clone(D().users.filter(function (u) { return u.id === 'u-sp-pim'; })[0]);
        function lv(u) { return P().effectiveRows(u, ctx()).filter(function (r) { return r.res.id === 'productList'; })[0].level; }
        var before = lv(pim);
        pim.roleIds = ['officer', 'product'];
        return [before, lv(pim)];
      }
    },
    {
      name: 'cr31-8. หน้า Roles ไม่อยู่ในเมนู (visible false · สิทธิ์ร่วม roleManagement) · เมนู ROLE MANAGEMENT ของผู้ดูแลระบบ = Permissions · Users',
      expected: [false, 'roleManagement', ['roleManagement', 'roleUsers']],
      actual: function () {
        var e = SP.core.registry.byId('roleRoles');
        var g = P().menuFor({ id: 'u-admin', roleIds: ['admin'], active: true }, ctx()).filter(function (x) { return x.id === 'role-management'; })[0];
        return [e.visible, e.perm, g ? g.entries.map(function (x) { return x.id; }) : null];
      }
    },
    {
      name: 'cr31-9. คู่มือ ตารางบทบาทและหน้าที่จากข้อมูลจริง: คำอธิบาย · แก้ไขได้ที่ · หน้าเริ่มต้น · จำนวนผู้ใช้ (Sales Officer 9 คน) · รวมบทบาทที่สร้างเอง · ข้อความสิทธิ์ฝั่งหน้าจออยู่ในคู่มือที่เดียว',
      expected: [true, 'skuPlanning', 9, true, true, 1],
      actual: function () {
        var rows = SP.core.guide.roleRows(ctx());
        var off = rows.filter(function (r) { return r.id === 'officer'; })[0];
        var list = SP.core.registry.list;
        var add = P().addRole({ roles: clone(D().roles), perms: P().defaultPerms(), users: D().users }, 'บทบาทใหม่', 'ทดสอบ', null, list);
        var rows2 = SP.core.guide.roleRows(ctx({ roles: add.roles, perms: add.perms }));
        var txt = JSON.stringify(D().content) + JSON.stringify(D().guide);
        return [!!off.description, off.home, off.users, off.edit.indexOf('skuPlanning') >= 0, rows2.some(function (r) { return r.id === add.id && !r.system && r.description === 'ทดสอบ'; }),
          txt.split('ระบบจริงต้องตรวจสิทธิ์ที่ Backend').length - 1];
      }
    }
  ];
})();

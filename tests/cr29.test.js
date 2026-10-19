/*
 * tests/cr29.test.js — Test ของ CR-29 (Account Master 3 หน้า: Account & Platform · เขตและร้านค้า (TT) · บุคลากรและทีม · สิ้นสุดการรับผิดชอบ)
 *
 * รันด้วย Node: node tests/run.js cr29 / ในเบราว์เซอร์: tests/calc.test.html รวม Test ชุดนี้ด้วย
 *   cr29-1..14 = Test ตาม CR-29 · เดือนปัจจุบัน = SP.core.clock (ก.ย. 2026) · ข้อมูลตั้งต้นจาก data/ · store: ไม่อ่าน ไม่เขียน
 */
(function () {
  'use strict';
  var SP = window.SP = window.SP || {};
  SP.tests = SP.tests || {};

  var NOW = '2026-09';
  function M() { return SP.core.master; }
  function calc() { return SP.core.calc; }
  function S() { return SP.core.stores; }
  function P() { return SP.core.permissions; }
  function D() { return SP.data; }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function data(extra) {
    var d = {};
    Object.keys(D()).forEach(function (k) { d[k] = D()[k]; });
    Object.keys(extra || {}).forEach(function (k) { d[k] = extra[k]; });
    return d;
  }
  function state() { return { people: clone(D().salespeople), teams: clone(D().teams), assignments: clone(D().assignments) }; }
  // สถานะก่อนวิทยาสิ้นสุด: ไม่มีเดือนสุดท้าย · EVEANDBOY เป็นของวิทยาต่อไป · สมาชิก MT ไม่มีเดือนสิ้นสุด
  function beforeWit() {
    var st = state();
    st.people.forEach(function (p) { if (p.id === 'sp-wit') p.endMonth = null; });
    st.assignments = st.assignments.filter(function (a) { return !(a.unitId === 'eveandboy' && a.salesPersonId === 'sp-pim'); });
    st.assignments.forEach(function (a) { if (a.unitId === 'eveandboy') a.toMonth = null; });
    st.teams.forEach(function (t) { t.members.forEach(function (m) { if (m.salesPersonId === 'sp-wit') m.toMonth = null; }); });
    return st;
  }
  function rows(list, unit) { return calc().unitAssignments(list, unit).map(function (a) { return [a.salesPersonId, a.fromMonth, a.toMonth]; }); }
  function roleUser(id) { return { id: null, name: '', salesPersonId: null, roleIds: [id], active: true }; }

  SP.tests.cr29 = [
    {
      name: 'cr29-1. แท็บ Account & Platform สร้างจาก Channel Master: ใช้งาน + แบ่งเป้าตาม Account (MT · ECOM) · เปิดใช้งาน Export = มีแท็บ Export · ปิดแล้วหาย · TT ไม่เป็นแท็บ',
      expected: [['mt', 'ecom'], ['mt', 'ecom', 'export'], ['mt', 'ecom'], false],
      actual: function () {
        var on = clone(D().channels).map(function (c) { if (c.id === 'export') c.active = true; return c; });
        var off = clone(on).map(function (c) { if (c.id === 'export') c.active = false; return c; });
        return [M().accountTabs(D().channels), M().accountTabs(on), M().accountTabs(off), M().accountTabs(on).indexOf('tt') >= 0];
      }
    },
    {
      name: 'cr29-2. รหัสอัตโนมัติ U-{Channel}-{ลำดับ 3 หลัก} ไม่ซ้ำ · รหัสถัดไปของ MT ไม่ชนของเดิม · แก้เป็นรหัสที่ซ้ำ / ว่าง → ไม่ยอมรับ (ไม่สนตัวพิมพ์)',
      expected: [true, 'U-MT-001', true, 'duplicate', 'empty', null],
      actual: function () {
        var codes = M().unitCodes(D().accounts, D().channels);
        var list = Object.keys(codes).map(function (k) { return codes[k]; });
        var next = M().nextUnitCode(D().accounts, D().channels, 'mt');
        return [list.length === D().accounts.length && list.every(function (c, i) { return list.indexOf(c) === i && /^U-[A-Z0-9]+-\d{3}$/.test(c); }), codes.seven,
          list.indexOf(next) < 0 && /^U-MT-\d{3}$/.test(next),
          M().codeError(D().accounts, D().channels, 'seven', codes.watsons.toLowerCase()), M().codeError(D().accounts, D().channels, 'seven', '  '),
          M().codeError(D().accounts, D().channels, 'seven', 'ERP-7ELEVEN')];
      }
    },
    {
      name: 'cr29-3. ร้านที่ยังไม่จัดสรร: บรรทัดสรุป = แผงเขต = ข้อมูลที่ต้องตรวจ (เฉพาะร้านที่ใช้งาน · ร้านที่ยกเลิกการขายไม่นับ)',
      expected: [true, true, true],
      actual: function () {
        var d = data();
        var mem = S().membership(d, NOW);
        var direct = d.stores.filter(function (s) { return s.active !== false && !mem[s.id]; }).length;
        var sum = M().storeSummary(d, NOW);
        var all = d.stores.filter(function (s) { return !mem[s.id]; }).length;
        return [sum.unassigned === direct, M().territoryChecks(d, NOW).unassigned.length === direct, all >= direct];
      }
    },
    {
      name: 'cr29-4. นำเข้า Excel (รูปแบบไฟล์ส่งออกร้านค้า · ข้ามแถวหัวไฟล์): ร้านใหม่ 1 · ข้อมูลเปลี่ยน 1 (ประเภทร้าน + เขต) · ไม่พบในไฟล์ = ร้านที่ใช้งานที่เหลือ · ไม่ปิดใช้งานอัตโนมัติ · ชื่อบุคคลธรรมดาถูกซ่อน',
      expected: [['9999'], ['storeType', 'territory'], true, true, true, 'ร้านค้า 9999 (บุคคลธรรมดา)', 'TT-02'],
      actual: function () {
        var d = data();
        var mem = S().membership(d, NOW);
        var a = d.stores.filter(function (s) { return s.active !== false && mem[s.id] === 'TT-01' && !s.masked; })[0];
        var b = d.stores.filter(function (s) { return s.active !== false && s.id !== a.id && mem[s.id] && !s.masked; })[0];
        var table = [['ข้อมูล ณ เดือน', 'ก.ย. 2026'], [], ['System ID', 'ชื่อร้าน', 'ประเภทร้าน', 'ประเภทราคา', 'จังหวัด', 'Export', 'Online', 'สถานะ', 'ยอดอ้างอิง (บาท)', 'เขตการขาย'],
          [a.systemId, a.name, 'Wholesale', a.priceType || '', a.province || '', a.hasExport ? 'ใช่' : '', a.hasOnline ? 'ใช่' : '', 'ใช้งาน', '', 'TT เขต 2'],
          [b.systemId, b.name, b.storeType || '', b.priceType || '', b.province || '', b.hasExport ? 'ใช่' : '', b.hasOnline ? 'ใช่' : '', 'ใช้งาน', '', S().storeTerritories(d).filter(function (t) { return t.id === mem[b.id]; })[0].name],
          ['9999', 'คุณสมชาย ทดสอบ', 'Wholesale', 'Dealer', 'ตาก', '', '', 'ใช้งาน', '', '']];
        var parsed = M().importRows(table, D().storeImport.importColumns);
        var diff = M().importDiff(d, parsed.rows, '2026-10', D().storeImport.importRules);
        var active = d.stores.filter(function (s) { return s.active !== false; }).length;
        var ch = diff.changed.filter(function (c) { return c.storeId === a.id; })[0];
        var res = M().applyImport(d, diff, { added: ['9999'], changed: [a.id], missing: [] }, '2026-10', { at: 'x', by: 'test' });
        var d2 = data({ stores: res.stores, storeAssignments: res.storeAssignments });
        return [diff.added.map(function (x) { return x.store.id; }), ch ? ch.fields.map(function (f) { return f.field; }) : null,
          diff.changed.length === 1 && diff.missing.length === active - 2, res.stores.filter(function (s) { return s.active !== false; }).length === active + 1,
          diff.missing.every(function (id) { return res.stores.filter(function (s) { return s.id === id; })[0].active !== false; }),
          diff.added[0].store.name, S().territoryOf(d2, a.id, '2026-10')];
      }
    },
    {
      name: 'cr29-5. สิ้นสุดการรับผิดชอบของวิทยา ที่ ก.พ. 2027 → EVEANDBOY ตั้งแต่ มี.ค. 2027 เป็นพิมพ์ลดา · สมาชิก MT ของวิทยาสิ้นสุด ก.พ. 2027 · เป้าหมายไม่เปลี่ยน',
      expected: [true, [['sp-wit', '2026-01', '2027-02'], ['sp-pim', '2027-03', null]], '2027-02', '2027-02', true, [{ channelId: 'mt', role: 'OFFICER' }]],
      actual: function () {
        var targets = JSON.stringify(D().targets);
        var res = M().endResponsibility(beforeWit(), 'sp-wit', '2027-02', { eveandboy: 'sp-pim' }, NOW);
        var m = M().memberships(res.state.teams, 'sp-wit');
        var p = res.state.people.filter(function (x) { return x.id === 'sp-wit'; })[0];
        return [res.ok, rows(res.state.assignments, 'eveandboy'), m[0].toMonth, p.endMonth, JSON.stringify(D().targets) === targets, res.summary.members];
      }
    },
    {
      name: 'cr29-6. ยกเลิกการสิ้นสุด → ช่วงผู้รับผิดชอบและสมาชิกทีมกลับเป็นแบบเดิม · เดือนสิ้นสุดที่ผ่านไปแล้วยกเลิกไม่ได้ · ข้อมูลตั้งต้น (ไม่มีค่าเดิมที่เก็บไว้) = เปิดช่วงต่อ',
      expected: [true, true, true, null, 'past', [['sp-wit', '2026-01', null]]],
      actual: function () {
        var before = beforeWit();
        var ended = M().endResponsibility(before, 'sp-wit', '2027-02', { eveandboy: 'sp-pim' }, NOW).state;
        var back = M().cancelEnd(ended, 'sp-wit', NOW);
        var p = back.state.people.filter(function (x) { return x.id === 'sp-wit'; })[0];
        var sort = function (l) { return l.slice().sort(function (a, b) { return (a.unitId + a.fromMonth) < (b.unitId + b.fromMonth) ? -1 : 1; }); };
        var past = M().cancelEnd(ended, 'sp-wit', '2027-05');
        var seed = M().cancelEnd(state(), 'sp-wit', NOW);
        return [back.ok, JSON.stringify(sort(back.state.assignments)) === JSON.stringify(sort(before.assignments)),
          JSON.stringify(M().memberships(back.state.teams, 'sp-wit')) === JSON.stringify(M().memberships(before.teams, 'sp-wit')), p.endMonth || null, past.error,
          rows(seed.state.assignments, 'eveandboy')];
      }
    },
    {
      name: 'cr29-7. ทีม KAM กลาง เป็นประเภททีม · หน่วยที่ทีมดูแลไม่อยู่ในข้อมูลที่ต้องตรวจ (ทีมนับเป็นผู้รับผิดชอบ)',
      expected: ['team', 'person', [], true],
      actual: function () {
        var kam = calc().findById(D().salespeople, 'sp-kam');
        var kamUnits = D().assignments.filter(function (a) { return a.salesPersonId === 'sp-kam'; }).map(function (a) { return a.unitId; });
        var checks = M().accountChecks(data(), NOW);
        return [M().personType(kam), M().personType(calc().findById(D().salespeople, 'sp-anan')),
          checks.filter(function (x) { return kamUnits.indexOf(x.unitId) >= 0 && x.type !== 'noGP'; }).map(function (x) { return x.unitId; }),
          M().ownerRun(D().assignments, D().salespeople, 'beautrium', NOW, 12).every(function (r) { return r.state === 'owner' && r.personId === 'sp-kam'; })];
      }
    },
    {
      name: 'cr29-8. หน่วยที่ปิดใช้งานไม่อยู่ในข้อมูลที่ต้องตรวจเรื่องผู้รับผิดชอบ · ปิดใช้งานตั้งแต่เดือนนี้แล้วหายจากรายการ · ปิดในอนาคตยังใช้งานจนถึงเดือนนั้น',
      expected: [true, false, true, [true, false]],
      actual: function () {
        var inactive = D().accounts.filter(function (a) { return a.active === false; }).map(function (a) { return a.id; });
        var checks = M().accountChecks(data(), NOW);
        var target = checks.filter(function (x) { return x.type === 'noOwner'; })[0];
        var accounts = D().accounts.map(function (a) { return a.id === target.unitId ? M().setUnitActive(a, false, NOW, NOW) : a; });
        var after = M().accountChecks(data({ accounts: accounts }), NOW);
        var later = M().setUnitActive(D().accounts[0], false, '2026-12', NOW);
        return [checks.every(function (x) { return inactive.indexOf(x.unitId) < 0; }), after.some(function (x) { return x.unitId === target.unitId; }),
          !!target, [M().unitActiveAt(later, '2026-11'), M().unitActiveAt(later, '2026-12')]];
      }
    },
    {
      name: 'cr29-9. สิทธิ์: ค่าที่บันทึกไว้ของหน้าผู้รับผิดชอบ + ทีมขายเดิม → people (ระดับสูงสุด) แล้วลบ Key เดิม · เมนู Account Master ของแต่ละบทบาทตามตารางส่วน 5',
      expected: [{ level: 'EDIT', scope: 'ALL' }, false, false,
        // CR-32: Account & Platform + เขตและร้านค้า (TT) รวมเป็น salesUnits
        { management: [], director: ['salesUnits', 'people'], manager: ['salesUnits', 'people'], officer: ['salesUnits'], product: [], supply: [], viewer: [], admin: ['salesUnits', 'people'], md: [] },   // CR-38 + MD
        ['EDIT', 'VIEW', 'NONE'], ['EDIT', 'NONE', 'NONE']],
      actual: function () {
        var old = { manager: { salespeople: { level: 'VIEW', scope: 'ALL' }, salesTeam: { level: 'EDIT', scope: 'ALL' } } };
        var m = P().migratePerms(old).perms.manager;
        var menus = {};
        D().roles.forEach(function (r) {
          var menu = P().menuFor(roleUser(r.id), {});
          var g = menu.filter(function (x) { return x.id === 'account-master'; })[0];
          menus[r.id] = g ? g.entries.map(function (e) { return e.id; }) : [];
        });
        var gp = ['director', 'manager', 'officer'].map(function (r) { return P().level(roleUser(r), 'accounts.gp'); });
        var chs = ['director', 'manager', 'officer'].map(function (r) { return P().level(roleUser(r), 'accounts.channelSettings'); });
        return [m.people, 'salespeople' in m, 'salesTeam' in m, menus, gp, chs];
      }
    },
    {
      name: 'cr29-10. ไม่มีคำว่า ลาออก เหลือในข้อความหน้าจอ (content.js · guide.js) · ป้ายใช้ สิ้นสุดการรับผิดชอบ',
      expected: [false, false, true],
      actual: function () {
        var c = JSON.stringify(D().content), g = JSON.stringify(D().guide);
        return [c.indexOf('ลาออก') >= 0, g.indexOf('ลาออก') >= 0, D().content.pages.summary.resignedTag.indexOf('สิ้นสุดการรับผิดชอบ') === 0];
      }
    },
    {
      name: 'cr29-11. ผลงาน YTD (calc.personYtd) = ตารางผลงานรายบุคคลเดิม (personPerformance) เมื่อใช้ข้อมูลและเดือนเดียวกัน · รวมคนที่สิ้นสุดแล้ว · ปียังไม่เริ่ม = null',
      expected: [true, true, null],
      actual: function () {
        var targets = {}, actuals = {};
        ['seven', 'watsons', 'eveandboy', 'shopee', 'lazada', 'tiktok'].forEach(function (u, i) {
          targets[u] = []; actuals[u] = [];
          for (var m = 0; m < 12; m++) { targets[u].push(1000 * (i + 1) + m * 10); actuals[u].push(900 * (i + 1) + m * 7); }
        });
        var ok = D().salespeople.every(function (p) {
          var old = calc().personPerformance(D().assignments, D().salespeople, p.id, 2027, targets, actuals, 2);
          return calc().personYtd(D().assignments, D().salespeople, p.id, 2027, targets, 2) === old.targetToDate
            && calc().personYtd(D().assignments, D().salespeople, p.id, 2027, actuals, 2) === old.actualToDate;
        });
        var wit = calc().personYtd(D().assignments, D().salespeople, 'sp-wit', 2027, targets, 2) > 0;
        return [ok, wit, calc().personYtd(D().assignments, D().salespeople, 'sp-anan', 2027, targets, -1)];
      }
    },
    {
      name: 'cr29-12. เพิ่มเขตใหม่ → อยู่ในหน่วยขายของ TT (Sub-channel Allocation เพิ่มได้) แต่ยังไม่อยู่ในแผน · แก้จังหวัดแนะนำแล้วเขตแนะนำเปลี่ยนตาม · ปิดใช้งานเขตที่ยังมีร้าน → ไม่ยอมรับ',
      expected: ['TT-05', true, false, 'TT-04', 'TT-05', false, true],
      actual: function () {
        var d = data();
        var id = S().nextTerritoryId(d, 'tt');
        var territories = clone(d.territories).concat([{ id: id, channelId: 'tt', name: 'TT เขต 5 · ทดสอบ', active: true }]);
        // ร้านสมมติที่ยังไม่จัดสรร (ข้อมูลตั้งต้นร้านที่ยังไม่จัดสรรทั้งหมดไม่ระบุจังหวัด) จังหวัดอยู่ในรายชื่อของ TT เขต 4 เท่านั้น
        var prov = (d.provinceSuggestions['TT-04'] || []).filter(function (p) { return Object.keys(d.provinceSuggestions).every(function (k) { return k === 'TT-04' || (d.provinceSuggestions[k] || []).indexOf(p) < 0; }); })[0];
        var s = { id: 'X1', systemId: 'X1', name: 'ร้านทดสอบ', province: prov, active: true };
        var was = S().suggestTerritory(s, d.provinceSuggestions);
        var sug = clone(d.provinceSuggestions);
        Object.keys(sug).forEach(function (k) { sug[k] = (sug[k] || []).filter(function (p) { return p !== prov; }); });
        sug[id] = [prov];
        var d2 = data({ territories: territories, provinceSuggestions: sug });
        var plan = D().targets.years[2027].units.tt;
        return [id, calc().unitsOfChannel(d2, 'tt', true).some(function (u) { return u.id === id; }), plan.indexOf(id) >= 0,
          was, S().suggestTerritory(s, sug), M().canDeactivateTerritory(d2, 'TT-01', NOW), M().canDeactivateTerritory(d2, id, NOW)];
      }
    },
    {
      name: 'cr29-13. โอนทั้งเขต 4 ตั้งแต่ ต.ค. 2026 → ผู้รับผิดชอบเปลี่ยนตามเดือน (ก.ย. คนเดิม · ต.ค. คนใหม่) · ร้านค้าในเขตไม่ย้าย',
      expected: [true, 'SP-TT-04', 'SP-TT-01', true],
      actual: function () {
        var d = data();
        var before = S().membership(d, '2026-10');
        var res = calc().setOwner(d.assignments, 'TT-04', 'SP-TT-01', '2026-10', null, NOW);
        var d2 = data({ assignments: res.list });
        return [res.ok, calc().ownerOf(res.list, d.salespeople, 'TT-04', NOW), calc().ownerOf(res.list, d.salespeople, 'TT-04', '2026-10'),
          JSON.stringify(S().membership(d2, '2026-10')) === JSON.stringify(before)];
      }
    },
    {
      name: 'cr29-14. จัดกลุ่มตาม Channel: จำนวน Sales Manager / Sales Officer / หน่วยขายของหัวกลุ่มถูกต้อง · ทีม KAM อยู่กลุ่มทุก Channel · Channel ที่ไม่มี Manager มีคำเตือน',
      expected: [[1, 2, true, false], [1, 4, 4], ['sp-kam'], [true, true]],
      actual: function () {
        var st = state(), d = data();
        var g = M().teamGroups(st, D().channels, d, NOW);
        var mt = g.filter(function (x) { return x.channelId === 'mt'; })[0];
        var tt = g.filter(function (x) { return x.channelId === 'tt'; })[0];
        var rest = g.filter(function (x) { return x.channelId === null; })[0];
        var noMgr = state();
        noMgr.teams.forEach(function (t) { if (t.channelId === 'mt') t.members = t.members.filter(function (m) { return m.role !== 'MANAGER'; }); });
        var g2 = M().teamGroups(noMgr, D().channels, d, NOW).filter(function (x) { return x.channelId === 'mt'; })[0];
        return [[mt.managers, mt.officers, mt.units === calc().unitsOfChannel(d, 'mt', true).length, mt.noManager], [tt.managers, tt.officers, tt.units], rest.people,
          [g2.noManager, M().peopleChecks(noMgr, D().channels, NOW).some(function (x) { return x.type === 'noManager' && x.channelId === 'mt'; })]];
      }
    }
  ];
})();

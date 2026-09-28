/*
 * core/master.js — ฟังก์ชันล้วนของ Account Master (CR-29: Account & Platform · เขตและร้านค้า (TT) · บุคลากรและทีม)
 *
 * ไม่อ่าน DOM · ไม่เขียน store (คืนค่าใหม่ให้ Module บันทึกเอง) · เดือน = 'YYYY-MM' · เดือนปัจจุบัน = SP.core.clock.currentMonth()
 * Channel Master:  accountTabs(channels) → id ของ Channel ที่เป็นแท็บ (ใช้งาน + แบ่งเป้าตาม Account) · channelAllocationLocked(data, channelId)
 * หน่วยขาย:        unitCodes · nextUnitCode · codeError (รหัส U-{Channel}-{ลำดับ 3 หลัก} ห้ามซ้ำ) · unitActiveAt · unitStatus · setUnitActive ·
 *                  accountChecks (ข้อมูลที่ต้องตรวจ) · gpImpact (ผลต่อ Net Sales ของแผนเมื่อเปลี่ยน GP) · ownerRun (ผู้รับผิดชอบ n เดือนต่อกันจากเดือนที่กำหนด)
 * บุคลากร:         personType ('person' | 'team') · memberships · unitsAt · personState · peopleChecks · teamGroups ·
 *                  endPreview · endResponsibility · cancelEnd (สิ้นสุดการรับผิดชอบ / ยกเลิก) · addPerson · addMembership · endMembership
 * ร้านค้า TT:      storeSummary (ยังไม่จัดสรร = เฉพาะร้านที่ใช้งาน) · territoryChecks · canDeactivateTerritory · shortStoreType ·
 *                  importRows (ตาราง Excel → แถว) · importDiff (ร้านใหม่ · ข้อมูลเปลี่ยน · ไม่พบในไฟล์) · applyImport
 * ประวัติ:         auditDiff · auditAssignments · auditTeams · historyOf (จาก master.audit)
 * ช่วงเวลา: ทุกค่าที่เปลี่ยนตามเวลาเก็บเป็นช่วง { fromMonth, toMonth } ไม่เขียนทับ (ผู้รับผิดชอบใช้ calc.setOwner ฟังก์ชันเดียวกับทุกหน้า)
 */
(function (SP) {
  'use strict';

  function calc() { return SP.core.calc; }
  function S() { return SP.core.stores; }
  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function byOrder(a, b) { return (a.order || 0) - (b.order || 0); }
  function findById(list, id) { return (list || []).filter(function (x) { return x.id === id; })[0] || null; }
  function pad3(n) { return (n < 10 ? '00' : n < 100 ? '0' : '') + n; }
  function covers(r, month) { return r.fromMonth <= month && (r.toMonth == null || month <= r.toMonth); }
  function reaches(r, month) { return r.toMonth == null || r.toMonth >= month; }   // ช่วงนี้ยังมีเดือนตั้งแต่ month เป็นต้นไป
  function next(month) { return calc().addMonths(month, 1); }

  // =====================================================================
  // Channel Master
  // =====================================================================
  function accountTabs(channels) {
    return (channels || []).filter(function (c) { return c.active !== false && (c.allocationUnit || 'ACCOUNT') === 'ACCOUNT'; })
      .slice().sort(byOrder).map(function (c) { return c.id; });
  }
  // เปลี่ยนหน่วยแบ่งเป้าได้เฉพาะ Channel ที่ยังไม่มีหน่วยขาย (Account หรือเขต)
  function channelAllocationLocked(data, channelId) {
    return (data.accounts || []).some(function (a) { return a.channelId === channelId; })
      || (data.territories || []).some(function (t) { return t.channelId === channelId; });
  }

  // =====================================================================
  // หน่วยขาย (Account / Platform)
  // =====================================================================
  function channelCode(ch, id) { return String((ch && ch.name) || id || '').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'X'; }
  // รหัสของทุก Account → { <id>: code } · มีรหัสแล้วใช้ค่าเดิม · ยังไม่มี = U-{Channel}-{ลำดับถัดไปที่ไม่ซ้ำ} ตามลำดับในรายการ
  function unitCodes(accounts, channels) {
    var out = {}, used = {};
    (accounts || []).forEach(function (a) { if (a.code) { out[a.id] = a.code; used[String(a.code).toUpperCase()] = true; } });
    (accounts || []).forEach(function (a) {
      if (out[a.id]) return;
      var prefix = 'U-' + channelCode(findById(channels, a.channelId), a.channelId) + '-';
      var n = 1;
      while (used[(prefix + pad3(n)).toUpperCase()]) n++;
      out[a.id] = prefix + pad3(n);
      used[out[a.id].toUpperCase()] = true;
    });
    return out;
  }
  function nextUnitCode(accounts, channels, channelId) {
    var codes = unitCodes(accounts, channels);
    var used = {};
    Object.keys(codes).forEach(function (k) { used[codes[k].toUpperCase()] = true; });
    var prefix = 'U-' + channelCode(findById(channels, channelId), channelId) + '-';
    var n = 1;
    while (used[(prefix + pad3(n)).toUpperCase()]) n++;
    return prefix + pad3(n);
  }
  // → null | 'empty' | 'duplicate' (ไม่สนตัวพิมพ์เล็กใหญ่)
  function codeError(accounts, channels, id, code) {
    var v = String(code == null ? '' : code).trim();
    if (!v) return 'empty';
    var codes = unitCodes(accounts, channels);
    return Object.keys(codes).some(function (k) { return k !== id && codes[k].toUpperCase() === v.toUpperCase(); }) ? 'duplicate' : null;
  }
  // สถานะของหน่วย: active (ค่าเดิม) + inactiveFrom = เดือนที่ปิดใช้งานมีผล
  function unitActiveAt(u, month) {
    if (!u) return false;
    if (u.inactiveFrom) return month < u.inactiveFrom;
    return u.active !== false;
  }
  // → { active, from (เดือนที่ปิดใช้งาน | null), scheduled (ปิดใช้งานในอนาคต) }
  function unitStatus(u, month) {
    var on = unitActiveAt(u, month);
    return { active: on, from: u && u.inactiveFrom ? u.inactiveFrom : null, scheduled: on && !!(u && u.inactiveFrom) };
  }
  // ปิด / เปิดใช้งาน · ปิดตั้งแต่เดือน m: ถึงแล้ว (m ≤ เดือนปัจจุบัน) = active false · ในอนาคต = ยังใช้งานจนถึงเดือนนั้น
  function setUnitActive(u, on, fromMonth, current) {
    var c = clone(u);
    if (on) { c.active = true; delete c.inactiveFrom; return c; }
    c.inactiveFrom = fromMonth || current;
    c.active = !(c.inactiveFrom <= current) ? true : false;
    return c;
  }
  // ผลต่อ Net Sales ของแผนเมื่อเปลี่ยน GP (จำนวนชิ้นและราคาเท่าเดิม): Net ∝ (1 − GP) → planNet × ((1 − ใหม่) ÷ (1 − เดิม) − 1) · เดิมไม่มี GP / ไม่มีแผน = null
  function gpImpact(planNet, oldGp, newGp) {
    if (planNet == null || oldGp == null || newGp == null || oldGp >= 1) return null;
    return planNet * ((1 - newGp) / (1 - oldGp) - 1);
  }
  // ข้อมูลที่ต้องตรวจของ Account (เฉพาะหน่วยที่ใช้งาน ณ เดือนนั้น · Channel ที่ใช้งาน)
  //   → [{ unitId, type: 'noGP' | 'noOwner' | 'endedOwner' }]
  //   noOwner = ไม่มีผู้รับผิดชอบในเดือนนั้นหรือเดือนถัดไป · endedOwner = ผูกกับผู้ที่สิ้นสุดการรับผิดชอบแล้ว · ทีมนับเป็นผู้รับผิดชอบ
  function accountChecks(data, month) {
    var out = [];
    var channels = data.channels || SP.data.channels;
    var tabs = accountTabs(channels);
    (data.accounts || []).forEach(function (a) {
      if (tabs.indexOf(a.channelId) < 0 || !unitActiveAt(a, month)) return;
      var ch = findById(channels, a.channelId);
      if (ch && ch.hasGP !== false && a.gp == null) out.push({ unitId: a.id, type: 'noGP' });
      ownerIssue(data, a.id, month).forEach(function (t) { out.push({ unitId: a.id, type: t }); });
    });
    return out;
  }
  function ownerIssue(data, unitId, month) {
    var c = calc();
    var raw = c.assignmentAt(data.assignments, unitId, month);
    var own = c.ownerOf(data.assignments, data.salespeople, unitId, month);
    var own2 = c.ownerOf(data.assignments, data.salespeople, unitId, next(month));
    if (!own && raw && raw.salesPersonId) return ['endedOwner'];
    if (!own || !own2) return ['noOwner'];
    return [];
  }
  // ผู้รับผิดชอบ n เดือนต่อกันตั้งแต่ fromMonth → [{ personId, assignedId, state, from, to (index), fromMonth, toMonth }]
  function ownerRun(assignments, salespeople, unitId, fromMonth, n) {
    var c = calc();
    var out = [];
    for (var i = 0; i < (n || 12); i++) {
      var key = c.addMonths(fromMonth, i);
      var a = c.assignmentAt(assignments, unitId, key);
      var owner = c.ownerOf(assignments, salespeople, unitId, key);
      var o = { personId: owner, assignedId: a ? a.salesPersonId : null, state: owner ? 'owner' : a && a.salesPersonId ? 'ended' : 'vacant' };
      var last = out[out.length - 1];
      if (last && last.state === o.state && last.personId === o.personId && last.assignedId === o.assignedId) { last.to = i; last.toMonth = key; }
      else out.push({ personId: o.personId, assignedId: o.assignedId, state: o.state, from: i, to: i, fromMonth: key, toMonth: key });
    }
    return out;
  }

  // =====================================================================
  // บุคลากร (บุคคล / ทีม) — state = { people, teams, assignments }
  // =====================================================================
  function personType(p) {
    if (p && p.type) return p.type;
    var d = findById(SP.data.salespeople, p && p.id);
    return d && d.type ? d.type : 'person';
  }
  // ช่วงสมาชิกทีมของคน → [{ channelId, role, fromMonth, toMonth }] เรียงตามเดือนเริ่ม
  function memberships(teams, personId) {
    var out = [];
    (teams || []).forEach(function (t) {
      (t.members || []).forEach(function (m) { if (m.salesPersonId === personId) out.push({ channelId: t.channelId, role: m.role, fromMonth: m.fromMonth, toMonth: m.toMonth || null }); });
    });
    return out.sort(function (a, b) { return a.fromMonth < b.fromMonth ? -1 : a.fromMonth > b.fromMonth ? 1 : 0; });
  }
  function rangesOf(assignments, personId) { return (assignments || []).filter(function (a) { return a.salesPersonId === personId; }); }
  // หน่วยที่ผูกกับคนนี้ในเดือนนั้น (ตามช่วงที่บันทึก)
  function unitsAt(assignments, personId, month) {
    var out = [];
    rangesOf(assignments, personId).forEach(function (a) { if (covers(a, month) && out.indexOf(a.unitId) < 0) out.push(a.unitId); });
    return out;
  }
  // สถานะ ณ เดือน → { status: 'active' | 'ending' | 'ended' | 'none', end, memberships, units }
  //   ending = ตั้งเดือนสิ้นสุดไว้ในอนาคต · ended = สิ้นสุดแล้ว (endMonth หรือทุกช่วงจบแล้ว) · none = ยังไม่มีทีมหรือหน่วยขาย
  function personState(p, st, month) {
    var mem = memberships(st.teams, p.id);
    var asg = rangesOf(st.assignments, p.id);
    var end = p.endMonth || null;
    var status;
    if (end) status = end < month ? 'ended' : 'ending';
    else if (mem.concat(asg).some(function (r) { return reaches(r, month); })) status = 'active';
    else {
      var last = mem.concat(asg).reduce(function (m, r) { return r.toMonth && (!m || r.toMonth > m) ? r.toMonth : m; }, null);
      status = last ? 'ended' : 'none';
      end = last;
    }
    return { status: status, end: end, memberships: mem, units: unitsAt(st.assignments, p.id, month) };
  }
  // ข้อมูลที่ต้องตรวจของบุคลากร → [{ type: 'endedWithUnits' | 'idle' | 'noManager', personId | channelId, units }]
  function peopleChecks(st, channels, month) {
    var out = [];
    (st.people || []).forEach(function (p) {
      var s = personState(p, st, month);
      if (p.endMonth) {
        var after = rangesOf(st.assignments, p.id).filter(function (a) { return reaches(a, next(p.endMonth)); }).map(function (a) { return a.unitId; });
        if (after.length) out.push({ type: 'endedWithUnits', personId: p.id, units: after });
      } else if (s.status === 'none' || (s.status === 'ended' && !s.memberships.length && !rangesOf(st.assignments, p.id).length)) {
        out.push({ type: 'idle', personId: p.id });
      } else if (s.status === 'active' && !s.memberships.some(function (m) { return reaches(m, month); }) && !rangesOf(st.assignments, p.id).some(function (a) { return reaches(a, month); })) {
        out.push({ type: 'idle', personId: p.id });
      }
    });
    teamChannels(st, channels).forEach(function (ch) {
      if (ch.active === false) return;
      if (!managersAt(st, ch.id, month).length) out.push({ type: 'noManager', channelId: ch.id });
    });
    return out;
  }
  function membersOf(teams, channelId) { var t = (teams || []).filter(function (x) { return x.channelId === channelId; })[0]; return t ? t.members || [] : []; }
  function roleAt(st, channelId, role, month) {
    var ids = [];
    membersOf(st.teams, channelId).forEach(function (m) { if (m.role === role && covers(m, month) && ids.indexOf(m.salesPersonId) < 0) ids.push(m.salesPersonId); });
    return ids;
  }
  function managersAt(st, channelId, month) { return roleAt(st, channelId, 'MANAGER', month); }
  // Channel ที่มีทีม: ใช้งาน หรือมีสมาชิกอยู่แล้ว (ตามลำดับ Channel Master)
  function teamChannels(st, channels) {
    return (channels || []).filter(function (c) { return c.active !== false || membersOf(st.teams, c.id).length; }).slice().sort(byOrder);
  }
  // จัดกลุ่มตาม Channel → [{ channelId, managers, officers, units, noManager, people: [personId] }] + กลุ่ม channelId null (ทุก Channel) ท้ายสุด
  //   คนที่อยู่หลาย Channel อยู่ทุกกลุ่ม · คนที่ไม่มีทีม: channelId ของคน หรือกลุ่มทุก Channel
  function teamGroups(st, channels, data, month) {
    var groups = teamChannels(st, channels).map(function (ch) {
      var people = [];
      membersOf(st.teams, ch.id).forEach(function (m) { if (people.indexOf(m.salesPersonId) < 0) people.push(m.salesPersonId); });
      var managers = managersAt(st, ch.id, month).length;
      return { channelId: ch.id, managers: managers, officers: roleAt(st, ch.id, 'OFFICER', month).length,
        units: calc().unitsOfChannel(data, ch.id, true).length, noManager: ch.active !== false && managers === 0, people: people };
    });
    var rest = [];
    (st.people || []).forEach(function (p) {
      if (memberships(st.teams, p.id).length) return;
      var g = p.channelId ? groups.filter(function (x) { return x.channelId === p.channelId; })[0] : null;
      if (g) { if (g.people.indexOf(p.id) < 0) g.people.push(p.id); } else rest.push(p.id);
    });
    groups.push({ channelId: null, managers: 0, officers: 0, units: 0, noManager: false, people: rest });
    return groups;
  }
  // หน่วยที่คนนี้ดูแลหลังเดือนสุดท้าย → [{ unitId, fromMonth, toMonth }]
  function endPreview(st, personId, lastMonth) {
    var out = [];
    rangesOf(st.assignments, personId).forEach(function (a) {
      if (!reaches(a, next(lastMonth))) return;
      out.push({ unitId: a.unitId, fromMonth: a.fromMonth > lastMonth ? a.fromMonth : next(lastMonth), toMonth: a.toMonth || null });
    });
    return out;
  }
  // สิ้นสุดการรับผิดชอบ: เดือนสุดท้าย ≥ เดือนปัจจุบัน · handover = { <unitId>: personId | null (ยังไม่กำหนด) }
  //   ปิดช่วงสมาชิกทุกทีมที่เดือนสุดท้าย (ช่วงที่เริ่มหลังจากนั้นถูกนำออก) · ช่วงผู้รับผิดชอบหลังเดือนสุดท้ายเป็นของผู้รับช่วง (calc.setOwner)
  //   เก็บค่าเดิมที่ person.endUndo เพื่อยกเลิก → { ok, state, summary: { units: [{ unitId, to }], members: [{ channelId, role }] }, error }
  function endResponsibility(st, personId, lastMonth, handover, current) {
    var p = findById(st.people, personId);
    if (!p) return { ok: false, error: 'missing' };
    if (!lastMonth || (current && lastMonth < current)) return { ok: false, error: 'past' };
    handover = handover || {};
    var plan = endPreview(st, personId, lastMonth);
    var units = [];
    plan.forEach(function (r) { if (units.indexOf(r.unitId) < 0) units.push(r.unitId); });
    var undo = {
      endMonth: p.endMonth || null,
      units: units,
      assignments: clone((st.assignments || []).filter(function (a) { return units.indexOf(a.unitId) >= 0; })),
      members: memberships(st.teams, personId)
    };
    var list = clone(st.assignments || []);
    var err = null;
    plan.forEach(function (r) {
      if (err) return;
      var res = calc().setOwner(list, r.unitId, handover[r.unitId] || null, r.fromMonth, r.toMonth, current);
      if (!res.ok) { err = res.error; return; }
      list = res.list;
    });
    if (err) return { ok: false, error: err };
    var ended = [];
    var teams = clone(st.teams || []).map(function (t) {
      t.members = (t.members || []).filter(function (m) {
        if (m.salesPersonId !== personId || !reaches(m, next(lastMonth))) return true;
        ended.push({ channelId: t.channelId, role: m.role });
        if (m.fromMonth > lastMonth) return false;
        m.toMonth = lastMonth;
        return true;
      });
      return t;
    });
    var people = clone(st.people).map(function (x) {
      if (x.id === personId) { x.endMonth = lastMonth; x.endUndo = undo; }
      return x;
    });
    return {
      ok: true, error: null,
      state: { people: people, teams: teams, assignments: list },
      summary: { units: units.map(function (u) { return { unitId: u, to: handover[u] || null }; }), members: ended }
    };
  }
  // ยกเลิกการสิ้นสุด (เดือนสิ้นสุดยังไม่มาถึง) → คืนช่วงเดิม (endUndo) · ข้อมูลตั้งต้นที่ไม่มี endUndo = เปิดช่วงที่จบที่เดือนสุดท้ายต่อ
  //   และรวมช่วงของผู้รับช่วงที่เริ่มเดือนถัดไปกลับเป็นของคนเดิม → { ok, state, error: 'none' | 'past' }
  function cancelEnd(st, personId, current) {
    var p = findById(st.people, personId);
    if (!p || !p.endMonth) return { ok: false, error: 'none' };
    if (current && p.endMonth < current) return { ok: false, error: 'past' };
    var end = p.endMonth;
    var assignments, teams;
    if (p.endUndo) {
      var u = p.endUndo;
      assignments = clone((st.assignments || []).filter(function (a) { return u.units.indexOf(a.unitId) < 0; })).concat(clone(u.assignments));
      teams = clone(st.teams || []).map(function (t) {
        t.members = (t.members || []).filter(function (m) { return m.salesPersonId !== personId; })
          .concat(u.members.filter(function (m) { return m.channelId === t.channelId; }).map(function (m) { return { salesPersonId: personId, role: m.role, fromMonth: m.fromMonth, toMonth: m.toMonth }; }));
        return t;
      });
      u.members.forEach(function (m) {
        if (!teams.some(function (t) { return t.channelId === m.channelId; })) teams.push({ channelId: m.channelId, members: [{ salesPersonId: personId, role: m.role, fromMonth: m.fromMonth, toMonth: m.toMonth }] });
      });
    } else {
      assignments = clone(st.assignments || []);
      rangesOf(assignments, personId).forEach(function (a) {
        if (a.toMonth !== end) return;
        var succ = assignments.filter(function (b) { return b.unitId === a.unitId && b.fromMonth === next(end); })[0];
        a.toMonth = succ ? succ.toMonth : null;
        if (succ) assignments.splice(assignments.indexOf(succ), 1);
      });
      teams = clone(st.teams || []).map(function (t) {
        (t.members || []).forEach(function (m) { if (m.salesPersonId === personId && m.toMonth === end) m.toMonth = null; });
        return t;
      });
    }
    var people = clone(st.people).map(function (x) {
      if (x.id === personId) { x.endMonth = p.endUndo ? p.endUndo.endMonth : null; delete x.endUndo; if (!x.endMonth) delete x.endMonth; }
      return x;
    });
    return { ok: true, error: null, state: { people: people, teams: teams, assignments: assignments } };
  }
  // เพิ่มบุคลากร (ชื่อ · ประเภท · ทีมและเดือนเริ่ม) → { ok, state, id, error: 'name' | 'duplicate' }
  function addPerson(st, input) {
    var name = String(input && input.name || '').trim();
    if (!name) return { ok: false, error: 'name' };
    if ((st.people || []).some(function (p) { return String(p.name).trim().toLowerCase() === name.toLowerCase(); })) return { ok: false, error: 'duplicate' };
    var id = input.id || ('sp-' + Date.now().toString(36));
    var people = clone(st.people || []).concat([{ id: id, name: name, type: input.type === 'team' ? 'team' : 'person', channelId: input.channelId || null,
      startMonth: input.fromMonth || null, endMonth: null }]);
    var res = { people: people, teams: clone(st.teams || []), assignments: clone(st.assignments || []) };
    if (input.channelId && input.role && input.fromMonth) res.teams = addMembership(res.teams, input.channelId, { salesPersonId: id, role: input.role, fromMonth: input.fromMonth, toMonth: null });
    return { ok: true, state: res, id: id };
  }
  // เพิ่มช่วงสมาชิกทีม (ห้ามซ้อนช่วงของคนเดียวกันใน Channel เดียวกัน) → teams ใหม่ | null (ซ้อน)
  function addMembership(teams, channelId, m) {
    var out = clone(teams || []);
    var t = out.filter(function (x) { return x.channelId === channelId; })[0];
    if (!t) { t = { channelId: channelId, members: [] }; out.push(t); }
    var clash = t.members.some(function (x) {
      return x.salesPersonId === m.salesPersonId && x.fromMonth <= (m.toMonth || '9999-12') && m.fromMonth <= (x.toMonth || '9999-12');
    });
    if (clash) return null;
    t.members.push({ salesPersonId: m.salesPersonId, role: m.role, fromMonth: m.fromMonth, toMonth: m.toMonth || null });
    return out;
  }
  // สิ้นสุดช่วงสมาชิกทีม (เดือนสุดท้าย ≥ เดือนก่อนเดือนปัจจุบัน · ช่วงที่ยังไม่เริ่ม = นำออก) → teams ใหม่ | null
  function endMembership(teams, channelId, m, toMonth, current) {
    if (current && toMonth < calc().addMonths(current, -1)) return null;
    var out = clone(teams || []);
    var t = out.filter(function (x) { return x.channelId === channelId; })[0];
    if (!t) return null;
    var hit = false;
    t.members = t.members.filter(function (x) {
      if (x.salesPersonId !== m.salesPersonId || x.fromMonth !== m.fromMonth) return true;
      hit = true;
      if (toMonth < x.fromMonth) return false;
      x.toMonth = toMonth;
      return true;
    });
    return hit ? out : null;
  }

  // =====================================================================
  // ร้านค้า TT (ใช้ฟังก์ชันของ core/stores.js)
  // =====================================================================
  function activeStore(s) { return s.active !== false; }
  // บรรทัดสรุป + แผงเขต ใช้ตัวเลขชุดเดียวกัน: ยังไม่จัดสรร = ร้านที่ใช้งานที่ยังไม่อยู่ในเขตใด
  function storeSummary(d, month) {
    var m = S().membership(d, month);
    var out = { total: 0, active: 0, unassigned: 0, outOfProvince: 0, noProvince: 0 };
    (d.stores || []).forEach(function (s) {
      out.total++;
      if (activeStore(s)) out.active++;
      if (!m[s.id]) { if (activeStore(s)) out.unassigned++; }
      else if (S().outOfProvince(s, m[s.id], d.provinceSuggestions)) out.outOfProvince++;
      if (!S().provincesOf(s).length) out.noProvince++;
    });
    return out;
  }
  // ข้อมูลที่ต้องตรวจ → { unassigned: [storeId], noProvince: [storeId], duplicate: [systemId], noOwner: [territoryId], total }
  function territoryChecks(d, month) {
    var m = S().membership(d, month);
    var out = { unassigned: [], noProvince: [], duplicate: [], noOwner: [] };
    (d.stores || []).forEach(function (s) {
      if (!activeStore(s)) return;
      if (!m[s.id]) out.unassigned.push(s.id);
      if (!S().provincesOf(s).length) out.noProvince.push(s.id);
      if (s.duplicates > 1 && out.duplicate.indexOf(s.systemId) < 0) out.duplicate.push(s.systemId);
    });
    S().storeTerritories(d).forEach(function (t) {
      if (t.active === false) return;
      if (!calc().ownerOf(d.assignments, d.salespeople, t.id, month)) out.noOwner.push(t.id);
    });
    out.total = out.unassigned.length + out.noProvince.length + out.duplicate.length + out.noOwner.length;
    return out;
  }
  // ปิดใช้งานเขตได้เมื่อไม่มีร้านที่ใช้งานอยู่ในเขตตั้งแต่เดือนนั้น
  function canDeactivateTerritory(d, tid, month) {
    return !(d.storeAssignments || []).some(function (a) {
      if (a.territoryId !== tid || !reaches(a, month)) return false;
      var s = findById(d.stores, a.storeId);
      return !s || activeStore(s);
    });
  }
  // 'Wholesale - Beauty Store' → 'Wholesale·Beauty Store'
  function shortStoreType(t) { return t ? String(t).replace(/\s*-\s*/g, '·') : ''; }

  // ---------- นำเข้าร้านค้าจาก Excel (รูปแบบเดียวกับไฟล์ส่งออกร้านค้า) ----------
  var IMPORT_FIELDS = ['systemId', 'name', 'storeType', 'priceType', 'province', 'hasExport', 'hasOnline', 'active', 'territory'];
  function norm(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
  function normKey(v) { return norm(v).toLowerCase().replace(/[\s_\-()]/g, ''); }
  // table = [[ค่า]] (แถวของชีต) · columns = { <field>: [ชื่อหัวคอลัมน์ที่รับได้] } → { rows: [{ field: ค่า }], header: index | -1, fields: [field ที่พบ] }
  //   แถวหัวคอลัมน์ = แถวแรกที่มีหัวคอลัมน์ของ System ID (ข้ามแถวหัวไฟล์ของไฟล์ส่งออก) · แถวที่ไม่มี System ID ถูกข้าม
  function importRows(table, columns) {
    var alias = {};
    Object.keys(columns || {}).forEach(function (f) { (columns[f] || []).forEach(function (n) { alias[normKey(n)] = f; }); });
    var header = -1;
    for (var i = 0; i < (table || []).length && header < 0; i++) {
      if ((table[i] || []).some(function (c) { return alias[normKey(c)] === 'systemId'; })) header = i;
    }
    if (header < 0) return { rows: [], header: -1, fields: [] };
    var map = {};
    table[header].forEach(function (c, j) { var f = alias[normKey(c)]; if (f && map[f] == null) map[f] = j; });
    var rows = [];
    table.slice(header + 1).forEach(function (r) {
      var id = norm((r || [])[map.systemId]);
      if (!id) return;
      var o = {};
      Object.keys(map).forEach(function (f) { o[f] = norm(r[map[f]]); });
      rows.push(o);
    });
    return { rows: rows, header: header, fields: Object.keys(map) };
  }
  function truthy(v, no) { var k = norm(v).toLowerCase(); return !!k && (no || []).map(function (x) { return String(x).toLowerCase(); }).indexOf(k) < 0; }
  function territoryIdOf(d, text) {
    var v = norm(text);
    if (!v) return null;
    var list = S().storeTerritories(d);
    var t = list.filter(function (x) { return x.id.toLowerCase() === v.toLowerCase() || norm(x.name) === v || norm(String(x.name).split(' · ')[0]) === v; })[0];
    return t ? t.id : undefined;
  }
  // rules = data/stores.js storeImport.importRules { no: [ค่าที่แปลว่าไม่มี], inactive: [สถานะที่แปลว่ายกเลิก], personalPrefixes, maskedName }
  // → { added: [{ row, store, territoryId }], changed: [{ storeId, fields: [{ field, before, after }], territoryId }], missing: [storeId],
  //     unknownTerritories: [ชื่อ], total }
  function importDiff(d, rows, month, rules) {
    rules = rules || {};
    var mem = S().membership(d, month);
    var used = {};
    var out = { added: [], changed: [], missing: [], unknownTerritories: [], total: (rows || []).length };
    var ids = {};
    (d.stores || []).forEach(function (s) { ids[s.id] = true; });
    (rows || []).forEach(function (r) {
      var cands = (d.stores || []).filter(function (s) { return String(s.systemId) === r.systemId && !used[s.id]; });
      var s = cands.filter(function (x) { return r.name && norm(x.name) === r.name; })[0] || cands[0];
      var tid = r.territory != null ? territoryIdOf(d, r.territory) : null;
      if (tid === undefined) { if (out.unknownTerritories.indexOf(r.territory) < 0) out.unknownTerritories.push(r.territory); tid = null; }
      var val = {
        name: r.name, storeType: r.storeType, priceType: r.priceType, province: r.province != null ? r.province.split(/\s*,\s*/).join(',') : undefined,
        hasExport: r.hasExport != null ? truthy(r.hasExport, rules.no) : undefined, hasOnline: r.hasOnline != null ? truthy(r.hasOnline, rules.no) : undefined,
        active: r.active != null && r.active !== '' ? (rules.inactive || []).map(function (x) { return String(x).toLowerCase(); }).indexOf(r.active.toLowerCase()) < 0 : undefined
      };
      if (!s) {
        var id = r.systemId, n = 1;
        while (ids[id]) { n++; id = r.systemId + '-' + n; }
        ids[id] = true;
        var personal = (rules.personalPrefixes || []).some(function (x) { return r.name && r.name.indexOf(x) === 0; });
        out.added.push({ row: r, territoryId: r.territory != null ? tid : null, store: {
          id: id, systemId: r.systemId, name: personal ? String(rules.maskedName || '{id}').replace('{id}', r.systemId) : (r.name || r.systemId),
          masked: personal, storeType: val.storeType || null, tags: [], priceType: val.priceType || null, active: val.active !== false,
          province: val.province || '', hasExport: !!val.hasExport, hasOnline: !!val.hasOnline, salesRef: 0, duplicates: 1
        } });
        return;
      }
      used[s.id] = true;
      var fields = [];
      ['name', 'storeType', 'priceType', 'province', 'hasExport', 'hasOnline', 'active'].forEach(function (f) {
        if (val[f] === undefined || (f === 'name' && (s.masked || !val.name))) return;
        var before = f === 'active' ? s.active !== false : f === 'hasExport' || f === 'hasOnline' ? !!s[f] : (s[f] || '');
        var after = f === 'active' || f === 'hasExport' || f === 'hasOnline' ? val[f] : (val[f] || '');
        if (before !== after) fields.push({ field: f, before: before, after: after });
      });
      var cur = mem[s.id] || null;
      var moveTo;
      if (r.territory != null && tid !== cur) { fields.push({ field: 'territory', before: cur, after: tid }); moveTo = tid; }
      if (fields.length) out.changed.push({ storeId: s.id, fields: fields, territoryId: moveTo });
    });
    (d.stores || []).forEach(function (s) { if (!used[s.id] && activeStore(s)) out.missing.push(s.id); });
    return out;
  }
  // นำรายการที่เลือกเข้า draft · pick = { added: [id], changed: [storeId], missing: [storeId] } · fromMonth = เดือนที่การเปลี่ยนเขตมีผล
  //   → { stores, storeAssignments, moves } (ร้านที่ไม่พบในไฟล์ = ปิดใช้งานเฉพาะที่เลือก ไม่ปิดอัตโนมัติ)
  function applyImport(d, diff, pick, fromMonth, stamp) {
    pick = pick || {};
    var st = S();
    var dd = {};
    Object.keys(d).forEach(function (k) { dd[k] = d[k]; });
    dd.stores = clone(d.stores || []);
    dd.storeAssignments = clone(d.storeAssignments || []);
    var moves = [];
    function move(ids, tid) {
      var res = tid ? st.moveStores(dd, ids, tid, fromMonth, stamp || {}) : st.unassignStores(dd, ids, fromMonth, stamp || {});
      if (res && res.ok && res.move) { dd.storeAssignments = res.storeAssignments; moves.push(res.move); }
    }
    (diff.added || []).forEach(function (a) {
      if ((pick.added || []).indexOf(a.store.id) < 0) return;
      dd.stores.push(clone(a.store));
      if (a.territoryId) move([a.store.id], a.territoryId);
    });
    (diff.changed || []).forEach(function (c) {
      if ((pick.changed || []).indexOf(c.storeId) < 0) return;
      var s = findById(dd.stores, c.storeId);
      c.fields.forEach(function (f) { if (f.field !== 'territory') s[f.field] = f.after; });
      if (c.territoryId !== undefined) move([c.storeId], c.territoryId);
    });
    (diff.missing || []).forEach(function (id) { if ((pick.missing || []).indexOf(id) >= 0) { var s = findById(dd.stores, id); if (s) s.active = false; } });
    var count = {};
    dd.stores.forEach(function (s) { count[s.systemId] = (count[s.systemId] || 0) + 1; });
    dd.stores.forEach(function (s) { s.duplicates = count[s.systemId]; });
    return { stores: dd.stores, storeAssignments: dd.storeAssignments, moves: moves };
  }

  // =====================================================================
  // ประวัติการเปลี่ยนแปลง (master.audit)
  // =====================================================================
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  // รายการ (มี id) ก่อน → หลัง → [{ entity, key, field, oldValue, newValue, by, at }] · field '_new' / '_removed' = เพิ่ม / นำออก
  function auditDiff(entity, before, after, fields, meta) {
    var out = [];
    meta = meta || {};
    function push(key, field, o, n) { out.push({ entity: entity, key: key, field: field, oldValue: o === undefined ? null : o, newValue: n === undefined ? null : n, by: meta.by || null, at: meta.at || null }); }
    (after || []).forEach(function (x) {
      var o = findById(before, x.id);
      if (!o) { push(x.id, '_new', null, x.name || x.id); return; }
      fields.forEach(function (f) { if (!same(o[f], x[f])) push(x.id, f, o[f], x[f]); });
    });
    (before || []).forEach(function (o) { if (!findById(after, o.id)) push(o.id, '_removed', o.name || o.id, null); });
    return out;
  }
  // ผู้รับผิดชอบรายหน่วย: หน่วยที่ช่วงเปลี่ยน → 1 รายการต่อหน่วย (oldValue / newValue = ช่วงทั้งหมดของหน่วย)
  function auditAssignments(before, after, meta) {
    var c = calc();
    var units = {};
    (before || []).concat(after || []).forEach(function (a) { units[a.unitId] = true; });
    var out = [];
    Object.keys(units).forEach(function (u) {
      var o = c.unitAssignments(before, u).map(strip), n = c.unitAssignments(after, u).map(strip);
      if (!same(o, n)) out.push({ entity: 'assignment', key: u, field: 'owner', oldValue: o, newValue: n, by: (meta || {}).by || null, at: (meta || {}).at || null });
    });
    return out;
    function strip(a) { return { salesPersonId: a.salesPersonId || null, fromMonth: a.fromMonth, toMonth: a.toMonth || null }; }
  }
  // สมาชิกทีม: คนที่ช่วงเปลี่ยน → 1 รายการต่อคน
  function auditTeams(before, after, meta) {
    var ids = {};
    [before, after].forEach(function (teams) { (teams || []).forEach(function (t) { (t.members || []).forEach(function (m) { ids[m.salesPersonId] = true; }); }); });
    var out = [];
    Object.keys(ids).forEach(function (pid) {
      var o = memberships(before, pid), n = memberships(after, pid);
      if (!same(o, n)) out.push({ entity: 'team', key: pid, field: 'members', oldValue: o, newValue: n, by: (meta || {}).by || null, at: (meta || {}).at || null });
    });
    return out;
  }
  // ประวัติของรายการ (ใหม่สุดก่อน) · refs = [{ entity, key }]
  function historyOf(audit, refs) {
    return (audit || []).filter(function (e) { return (refs || []).some(function (r) { return r.entity === e.entity && r.key === e.key; }); })
      .slice().sort(function (a, b) { return String(b.at || '') < String(a.at || '') ? -1 : String(b.at || '') > String(a.at || '') ? 1 : 0; });
  }

  SP.core.master = {
    accountTabs: accountTabs,
    channelAllocationLocked: channelAllocationLocked,
    unitCodes: unitCodes,
    nextUnitCode: nextUnitCode,
    codeError: codeError,
    unitActiveAt: unitActiveAt,
    unitStatus: unitStatus,
    setUnitActive: setUnitActive,
    accountChecks: accountChecks,
    gpImpact: gpImpact,
    ownerRun: ownerRun,
    personType: personType,
    memberships: memberships,
    unitsAt: unitsAt,
    personState: personState,
    peopleChecks: peopleChecks,
    teamGroups: teamGroups,
    managersAt: managersAt,
    endPreview: endPreview,
    endResponsibility: endResponsibility,
    cancelEnd: cancelEnd,
    addPerson: addPerson,
    addMembership: addMembership,
    endMembership: endMembership,
    storeSummary: storeSummary,
    territoryChecks: territoryChecks,
    canDeactivateTerritory: canDeactivateTerritory,
    shortStoreType: shortStoreType,
    IMPORT_FIELDS: IMPORT_FIELDS,
    importRows: importRows,
    importDiff: importDiff,
    applyImport: applyImport,
    auditDiff: auditDiff,
    auditAssignments: auditAssignments,
    auditTeams: auditTeams,
    historyOf: historyOf
  };
})(window.SP);

/*
 * core/store.js — ส่งข้อมูลข้าม Module (ทางเดียวที่ Module ใช้เก็บค่า)
 *
 * Key ทั้งหมด (ชื่อเต็ม) — ข้อมูลแผนแยกตามปี:
 *   app.planYear                      ปีแผนที่เลือกใน Header                         default: DEFAULT_PLAN_YEAR
 *   plan.<ปี>.topDown                 { total, channels: [channelId], pct, units: { <channelId>: [unitId] } }
 *                                     default: data/targets.js years.<ปี> / ไม่มี = 0 + defaultChannels/defaultUnits
 *   plan.<ปี>.phasing.<unitId>        { monthPct: [12 สัดส่วน], edited: bool }       default: Seasonality ปีก่อนของหน่วย
 *                                     → ไม่มี ใช้ของ Channel → ไม่มี เท่ากันทุกเดือน (calc.defaultPhasing)
 *   plan.<ปี>.sku.<unitId>            { method, items: { <productKey>: { startMonth, qty: [12], overrides: [12 bool], stopped } } }
 *                                     method = วิธีเติมยอดของช่องระบบเติม 'lastYear' | 'runRate' (ไม่มี = DEFAULT_FILL_METHOD)
 *                                     แผนครั้งแรก (Baseline)  default: calc.defaultSkuPlan (สินค้าที่ Listing และขายอยู่
 *                                     + NPD ที่แผน NPD อนุมัติแล้ว + ค่าตั้งต้นรายช่องจาก data/plan-seeds.js)
 *   plan.<ปี>.forecast.<unitId>       โครงเดียวกัน ใช้ในโหมดปรับแผน   default: สำเนาของ plan.<ปี>.sku.<unitId>
 *                                     (โหมดปรับแผนเขียนที่นี่เท่านั้น ไม่เขียนทับ Baseline)
 *   plan.<ปี>.workflow.<step>.<unitId|all>  { status, history: [{ action, by, at, note }], snapshot }
 *                                     step = topDown (all) | phasing | sku | forecast | baseline (all)  default: ฉบับร่าง
 *                                     baseline.snapshot = { gp, basePrices, promoPrices } ราคาตอนล็อก (ใช้คำนวณแผนครั้งแรกหลังล็อก)
 *                                     + report (CR-12) = ตัวเลขทั้งหมดของรายงานสรุปแผนตอนล็อก (core/report.js build) — รายงานที่ล็อกแล้วอ่านจากที่นี่
 *   plan.<ปี>.baselineVersions        [{ no, code, at, by }] ประวัติเลขฉบับของรายงาน ({ปี}-BL-{nn}) ต่อท้ายทุกครั้งที่ล็อก Baseline   default: []
 *   master.products                   Product Master (ไม่แยกปี)   default: data/products.js
 *   master.listings                   [{ productKey, accountId (= unitId) }] (ไม่แยกปี)   default: data/listings.js
 *   master.taxonomy                   หมวดสินค้าและ Series   default: data/taxonomy.js
 *   master.basePrices                 CR-30 ราคาหลักรายเดือน [{ productKey, priceType, effectiveMonth, price, by, at }]   default: data/pricing.js (core/seed.js)
 *   master.promoPrices                CR-30 Promotion Price รายเดือน [{ productKey, channelId, unitId | null, month, price, by, at }] (แทน accountPrices)   default: data/pricing.js (จาก seed)
 *   master.npdPlans                   แผน NPD (มี workflow ของตัวเอง)   default: data/npd.js
 *   master.codeCounters               CR-30 เลข Product Code ล่าสุดของแต่ละกลุ่ม { <เลขนำหน้า>: number }   default: core/seed.js
 *   ui.columnPresets                  CR-30 Preset คอลัมน์ส่วนตัว { <userId>: { <tableId>: { presets, defaultId, columns } } } · ui.productMoreFilters
 *   master.audit                      Audit log [{ entity, key, field, oldValue, newValue, by, at }]   default: []
 *   master.accounts / master.territories / master.salespeople / master.assignments
 *                                     Account, เขตการขาย, Sales Person, ผู้รับผิดชอบตามช่วงเดือน (ไม่แยกปี)
 *                                     default: data/accounts.js, territories.js, salespeople.js, assignments.js
 *   master.stores                     ร้านค้า TT (CR-16 นำเข้าจาก data/seed/ อ่านอย่างเดียว)   default: core/stores.js
 *   master.storeAssignments           [{ storeId, territoryId, fromMonth, toMonth | null }] ร้านอยู่ในเขตใดในเดือนใด
 *   master.storeMoves                 [{ at, by, to, fromMonth, storeIds, before }] การย้ายร้านที่บันทึกแล้ว (ใช้หาการย้ายหลังอนุมัติเป้าหมาย)   default: []
 *   master.provinceSuggestions        { <territoryId>: [จังหวัด] } จังหวัดแนะนำของเขต
 *   ui.selection                      { channel, unit } ที่เลือกใน subChannelPicker (หน้า Phasing และวางแผน SKU ใช้ร่วมกัน)
 *   ui.planMode                       'initial' สร้างแผนครั้งแรก | 'reforecast' ปรับแผน (ใช้ได้หลังล็อก Baseline)
 *   ui.currentMonth                   เดือนปัจจุบันจำลองของปีแผน (0–11)   default: DEMO_FORECAST_MONTH
 *   ui.productMaster.channel          Channel ที่เลือกในหน้า Product Master
 *   ui.masterChannel                  Channel ที่เลือกในหน้า Account (หรือ 'all')
 *   ui.role                           บทบาทจำลอง { type: 'management' | 'director' | 'sales', personId }  default: DEFAULT_ROLE
 *   ui.sidebarCollapsed               Side Menu พับอยู่หรือไม่
 *   ui.seriesFilter                   [Series / Sub Series ที่เลือก] (หน้าวางแผน SKU และ Product Master ใช้ร่วมกัน ว่าง = ทุก Series)
 *   ui.productColumns                 คอลัมน์เพิ่มเติมที่เลือกในหน้ารายการสินค้า
 *   ui.skuShowLastYear                หน้าวางแผน SKU แสดงยอดปีก่อน (บรรทัดเล็กใต้ตัวเลข + คอลัมน์ปีก่อน / การเติบโต)
 *   ui.summaryTab                     แท็บล่าสุดของขั้นที่ 4: 'status' ติดตามสถานะ | 'report' รายงานสรุปแผน   default: null
 *                                     (null = ตามสถานะ: ยังไม่ล็อก Baseline → ติดตามสถานะ / ล็อกแล้ว → รายงานสรุปแผน)
 *   app.dataVersion                   รุ่นโครงข้อมูลของค่าที่เก็บไว้ (เปลี่ยนรุ่น = ล้างค่าที่ลองแก้ไว้ครั้งเดียว)
 *   revision.list · revision.snap.<id> · ui.revision   CR-38 Revision (core/revision.js) · plan.<ปี>.* = ข้อมูลของรอบล่าสุดของปี · set / remove ผ่าน guardWrite
 *
 * API: get(key) / set(key, value) / remove(key) กลับไปใช้ค่าตั้งต้น / reset() ล้างทุก Key
 *      isSet(key) / keys() / onChange(fn) / status { persistent, crossPage }
 *      year() = ปีแผนที่เลือก / planKey('topDown') = 'plan.<ปีที่เลือก>.topDown'
 *      master() = { products, listings, taxonomy, basePrices, promoPrices, npdPlans, codeCounters, audit, accounts, territories, salespeople,
 *                   assignments, stores, storeAssignments, storeMoves, provinceSuggestions } จาก master.*
 *      data()   = SP.data ที่แทน Master ทุกชุดด้วยค่าใน master.*
 *                 (ส่งให้ calc แทน SP.data เพื่อให้ค่าที่แก้ในหน้า Master มีผลทุกหน้า)
 *                 CR-16: ยอดขายปีก่อนของเขต TT ของปีแผนที่เลือก = ร้านที่อยู่ในเขต ณ เดือนแรกของปีแผน (core/stores.js applyHistory)
 *                 ก่อนอนุมัติจัดสรรเป้าหมายประจำปีใช้ร้านปัจจุบัน / หลังอนุมัติใช้ร้าน ณ เวลาที่อนุมัติ
 *      role() = บทบาทจำลอง / currentKey() = เดือนปัจจุบันจำลองแบบ 'YYYY-MM' / today() = วันแรกของเดือนนั้น 'YYYY-MM-01'
 *      appendAudit(entries) = ต่อท้าย master.audit
 *      workflowStates() = { '<step>.<unitId|all>': state } ของปีที่เลือก / saveWorkflowStates(map)
 * get() คืนสำเนาเสมอ แก้ค่าที่ได้โดยไม่ set() จะไม่มีผล
 *
 * เก็บค่าในหน่วยความจำ และบันทึกผ่าน adapter (ตอนนี้คือ sessionStorage)
 * ถ้าจะเปลี่ยนไปใช้ Backend ให้เขียน adapter ใหม่ที่มี load/save/remove/clear เหมือนกัน
 * โดยไม่ต้องแก้ Module
 */
(function (SP) {
  'use strict';

  var PREFIX = 'SP:';
  // รุ่นโครงข้อมูล: v6 เปลี่ยนสินค้าเป็น productKey (TR Code / รหัสชั่วคราว) / 7 = CR-11 สินค้าจริงจาก data/seed/
  // 8 = CR-16 เขต TT และ Sales Person TT จากข้อมูลร้านค้าจริง (id เขตเปลี่ยน)
  // 9 = CR-18 ราคารวม VAT + ราคาต่อ Account แยกจาก Price List (master.accountPrices)
  // 10 = CR-30 Product Code ระบบสร้าง (รหัสชั่วคราวเดิมเปลี่ยนเป็นรหัสระบบ) · ตัด Internal Code / Item Type
  // 11 = CR-30 ราคาหลักรายเดือน (master.basePrices) + Promotion Price (master.promoPrices) แทน priceList / accountPrices / promotions · แผน NPD ต่อเนื่อง
  // 12 = CR-32 หน่วยขายและคู่ค้าทุก Channel (master.customers · master.customerAssignments · accounts[].suggest)
  // 13 = CR-32 ผูกผู้ใช้กับบุคลากรที่ person.userId ที่เดียว (master.users ไม่มี salesPersonId แล้ว)
  // 14 = CR-30 รอบ 3 Listing ตามช่วงเวลาและสถานะ (master.listings: status · fromMonth · toMonth)
  // ค่าที่เก็บจากรุ่นก่อนใช้ต่อไม่ได้ (ล้างครั้งเดียวตอนโหลด · CR-32 แจ้งผู้ใช้ 1 ครั้งด้วย ui.toast = content.site.dataVersionToast)
  // 15 = CR-35 รหัสคู่ค้าไม่ซ้ำ (ร้าน TT ที่รหัสซ้ำรวมเป็นรายการเดียว) · วงจรสถานะสินค้า · รหัสชั่วคราวคำขอ NPD
  // 16 = CR-37 สินค้าแบบ Bundle (kind · components) + ตัวอย่าง 90100 / 90200
  var DATA_VERSION = 19;   // CR-38: 17 = Revision (revision.list · revision.snap.<id> · ui.revision) + บทบาท / ผู้ใช้ MD · CR-39: 18 = Approval (approval.requests · approvalConfig.*) + ประวัติ R1
                          // CR-41: 19 = สถานการณ์ Demo (app.scenario · นาฬิกากลาง) · ล้างแล้วกลับ S1 (สถานการณ์ไม่คงไว้เพราะข้อมูลของสถานการณ์ถูกล้างด้วย)

  function sessionAdapter() {
    var ss;
    try {
      ss = window.sessionStorage;
      ss.setItem(PREFIX + '__test', '1');
      ss.removeItem(PREFIX + '__test');
    } catch (e) {
      return memoryAdapter();
    }
    function ownKeys() {
      var out = [];
      for (var i = 0; i < ss.length; i++) {
        var k = ss.key(i);
        if (k && k.indexOf(PREFIX) === 0) out.push(k);
      }
      return out;
    }
    return {
      persistent: true,
      load: function () {
        var out = {};
        ownKeys().forEach(function (k) {
          try { out[k.slice(PREFIX.length)] = JSON.parse(ss.getItem(k)); } catch (e) { /* ข้ามค่าที่อ่านไม่ได้ */ }
        });
        return out;
      },
      save: function (key, value) { try { ss.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { /* เต็มหรือถูกปิด */ } },
      remove: function (key) { try { ss.removeItem(PREFIX + key); } catch (e) { /* ignore */ } },
      clear: function () { ownKeys().forEach(function (k) { try { ss.removeItem(k); } catch (e) { /* ignore */ } }); }
    };
  }

  function memoryAdapter() {
    return {
      persistent: false,
      load: function () { return {}; },
      save: function () {},
      remove: function () {},
      clear: function () {}
    };
  }

  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

  // CR-29: Channel Master แก้ได้ที่หน้า Account & Platform (ตั้งค่า Channel) → master.channels · ค่าที่บันทึกไว้แทน SP.data.channels ทั้งเว็บ
  //   (ทุก Module อ่าน SP.data.channels) · ค่าตั้งต้นจาก data/channels.js ตอนโหลด · รีเซ็ตข้อมูล = กลับค่าตั้งต้น
  var BASE_CHANNELS = JSON.parse(JSON.stringify(SP.data.channels || []));
  var DEFAULTS = [
    { match: /^master\.channels$/, make: function () { return clone(BASE_CHANNELS); } },
    {
      match: /^app\.planYear$/,
      make: function () { return SP.core.clock.planYear(); }   // CR-41 ปีแผนของสถานการณ์ (ไม่มี = DEFAULT_PLAN_YEAR)
    },
    {
      match: /^plan\.(\d{4})\.topDown$/,
      make: function (year) {
        var d = SP.data.targets.years[year];
        return d
          ? { total: d.total, channels: clone(d.channels), pct: clone(d.pct), units: clone(d.units) }
          : { total: 0, channels: clone(SP.data.targets.defaultChannels), pct: {}, units: clone(SP.data.targets.defaultUnits) };
      }
    },
    {
      match: /^plan\.(\d{4})\.phasing\.(.+)$/,
      make: function (year, id) { return { monthPct: SP.core.calc.defaultPhasing(data(), Number(year), id), edited: false }; }
    },
    {
      match: /^plan\.(\d{4})\.sku\.(.+)$/,
      make: function (year, id) {
        var withDefaults = !!SP.data.targets.years[year];
        var seeds = withDefaults && SP.data.planSeeds && SP.data.planSeeds.years[year] ? SP.data.planSeeds.years[year][id] : null;
        return SP.core.calc.defaultSkuPlan(master(), id, Number(year), withDefaults, seeds);
      }
    },
    {
      match: /^plan\.(\d{4})\.forecast\.(.+)$/,
      make: function (year, id) { return get('plan.' + year + '.sku.' + id); }
    },
    {
      match: /^plan\.(\d{4})\.workflow\.(.+)$/,
      make: function () { return { status: 'draft', history: [] }; }
    },
    { match: /^plan\.(\d{4})\.baselineVersions$/, make: function () { return []; } },
    { match: /^master\.products$/, make: function () { return clone(SP.data.products); } },
    { match: /^master\.listings$/, make: function () { return clone(SP.data.listings); } },
    { match: /^master\.taxonomy$/, make: function () { return clone(SP.data.taxonomy); } },
    { match: /^master\.basePrices$/, make: function () { return clone(SP.data.basePrices || []); } },
    { match: /^master\.promoPrices$/, make: function () { return clone(SP.data.promoPrices || []); } },
    { match: /^master\.npdPlans$/, make: function () { return clone(SP.data.npdPlans); } },
    { match: /^master\.codeCounters$/, make: function () { return clone(SP.data.codeCounters || {}); } },
    { match: /^master\.audit$/, make: function () { return []; } },
    { match: /^master\.accounts$/, make: function () { return clone(SP.data.accounts); } },
    { match: /^master\.territories$/, make: function () { return clone(SP.data.territories); } },
    { match: /^master\.salespeople$/, make: function () { return clone(SP.data.salespeople); } },
    { match: /^master\.assignments$/, make: function () { return clone(SP.data.assignments); } },
    { match: /^master\.stores$/, make: function () { return clone(SP.data.stores || []); } },
    { match: /^master\.storeAssignments$/, make: function () { return clone(SP.data.storeAssignments || []); } },
    { match: /^master\.storeMoves$/, make: function () { return []; } },
    { match: /^master\.provinceSuggestions$/, make: function () { return clone(SP.data.provinceSuggestions || {}); } },
    // CR-32: คู่ค้าของ Account / Platform (ร้านค้า TT อยู่ที่ master.stores) · ช่วงของคู่ค้าในหน่วยขาย (TT อยู่ที่ master.storeAssignments)
    { match: /^master\.customers$/, make: function () { return clone(SP.data.customers || []); } },
    { match: /^master\.customerAssignments$/, make: function () { return clone(SP.data.customerAssignments || []); } },
    {
      match: /^ui\.selection$/,
      make: function () {
        var id = SP.data.settings.DEFAULT_UNIT;
        var info = SP.core.calc.unitInfo(SP.data, id);
        return { channel: info ? info.channel.id : SP.data.channels[0].id, unit: id };
      }
    },
    { match: /^ui\.planMode$/, make: function () { return 'initial'; } },
    { match: /^ui\.currentMonth$/, make: function () { return SP.data.settings.DEMO_FORECAST_MONTH; } },
    {
      match: /^ui\.productMaster\.channel$/,
      make: function () { var p = get(planKey('topDown')); return (p.channels && p.channels[0]) || SP.data.channels[0].id; }
    },
    { match: /^ui\.masterChannel$/, make: function () { return 'all'; } },
    { match: /^ui\.role$/, make: function () { return { type: SP.data.settings.DEFAULT_ROLE, personId: null }; } },
    { match: /^ui\.sidebarCollapsed$/, make: function () { return false; } },
    { match: /^ui\.seriesFilter$/, make: function () { return []; } },
    { match: /^ui\.productColumns$/, make: function () { return []; } },
    { match: /^ui\.columnPresets$/, make: function () { return {}; } },
    { match: /^ui\.productMoreFilters$/, make: function () { return false; } },
    { match: /^ui\.skuShowLastYear$/, make: function () { return false; } },
    { match: /^ui\.summaryTab$/, make: function () { return null; } },
    { match: /^app\.dataVersion$/, make: function () { return DATA_VERSION; } },
    // CR-38 Revision: รายการรอบ (ค่าตั้งต้น = data/revisions.js defaults · core/revision.js) · รอบที่เลือก (null = ตามสถานะ)
    { match: /^revision\.list$/, make: function () { return SP.core.revision ? SP.core.revision.defaultList() : []; } },
    { match: /^ui\.revision$/, make: function () { return null; } },
    // CR-39 Approval: คำขออนุมัติ (ไม่มี = []) · ตั้งค่าขั้นอนุมัติ (data/approvals.js config) · แท็บ / คำขอที่เปิดของหน้า Approval
    { match: /^approval\.requests$/, make: function () { return []; } },
    { match: /^approvalConfig\.revisionLock$/, make: function () { return SP.core.approval ? SP.core.approval.defaultConfig() : { sdConfirm: false }; } },
    { match: /^ui\.approvalTab$/, make: function () { return null; } },
    { match: /^ui\.approvalOpen$/, make: function () { return null; } }
  ];

  function defaultFor(key) {
    for (var i = 0; i < DEFAULTS.length; i++) {
      var m = DEFAULTS[i].match.exec(key);
      if (m) return DEFAULTS[i].make.apply(null, m.slice(1));
    }
    return undefined;
  }

  var adapter = sessionAdapter();
  var values = adapter.load();
  var listeners = [];

  // ---------------------------------------------------------------------
  // ค่าจากรุ่นก่อนที่ยังค้างใน sessionStorage (แปลงครั้งเดียวตอนโหลด แล้วบันทึกกลับ)
  //   phasing เคยเก็บเป็น Array → { monthPct, edited } / ui.phasing.selection → ui.selection
  //   ui.selection { account } → { unit } / topDown { accounts } → { units, channels }
  //   master.products campaign → series
  //   plan.<ปี>.salesPerson.<unitId> → master.assignments ทั้งปี แล้วลบ Key เดิม (เลิกใช้)
  // ---------------------------------------------------------------------
  function migrate() {
    var changed = [];
    // รุ่นโครงข้อมูลเปลี่ยน → ล้างค่าที่ลองแก้ไว้ทั้งหมด (คงปีแผนและการพับเมนู) ครั้งเดียว
    if (Object.keys(values).length && values['app.dataVersion'] !== DATA_VERSION) {
      Object.keys(values).forEach(function (k) {
        if (k === 'app.planYear' || k === 'ui.sidebarCollapsed') return;
        delete values[k];
        adapter.remove(k);
      });
      // CR-32: แจ้ง 1 ครั้งว่าโหลดข้อมูลตั้งต้นใหม่ (layout แสดง ui.toast แล้วล้าง)
      var note = SP.data.content && SP.data.content.site && SP.data.content.site.dataVersionToast;
      if (note) put('ui.toast', note);
      if (SP.core.clock) SP.core.clock.refresh();   // CR-41 สถานการณ์ถูกล้างด้วย → นาฬิกากลับสถานการณ์ตั้งต้น
    }
    if (values['app.dataVersion'] !== DATA_VERSION) put('app.dataVersion', DATA_VERSION);
    function put(k, v) { values[k] = v; changed.push(k); }
    Object.keys(values).forEach(function (k) {
      if (/^plan\.\d{4}\.phasing\./.test(k) && Array.isArray(values[k])) put(k, { monthPct: values[k], edited: true });
      if (/^plan\.\d{4}\.topDown$/.test(k) && values[k] && values[k].accounts && !values[k].units) {
        var td = values[k];
        td.units = td.accounts;
        delete td.accounts;
        if (!td.channels) td.channels = SP.data.channels.map(function (c) { return c.id; }).filter(function (id) { return td.units[id]; });
        put(k, td);
      }
    });
    if (values['ui.phasing.selection'] && !values['ui.selection']) put('ui.selection', values['ui.phasing.selection']);
    var sel = values['ui.selection'];
    if (sel && sel.account && !sel.unit) put('ui.selection', { channel: sel.channel, unit: sel.account });
    var old = Object.keys(values).filter(function (k) { return /^plan\.\d{4}\.salesPerson\./.test(k); });
    if (old.length) {
      var list = values['master.assignments'] ? values['master.assignments'] : clone(SP.data.assignments);
      old.forEach(function (k) {
        var m = /^plan\.(\d{4})\.salesPerson\.(.+)$/.exec(k);
        var res = SP.core.calc.setOwner(list, m[2], values[k] || null, m[1] + '-01', m[1] + '-12', null);
        if (res.ok) list = res.list;
        delete values[k];
        adapter.remove(k);
      });
      put('master.assignments', list);
    }
    changed.forEach(function (k) { adapter.save(k, values[k]); });
  }
  migrate();
  if (Object.prototype.hasOwnProperty.call(values, 'master.channels') && Array.isArray(values['master.channels'])) SP.data.channels = clone(values['master.channels']);

  // เปิดจากไฟล์ในเครื่อง: Chrome/Edge ให้ location.origin = 'file://' และแชร์ sessionStorage ข้ามหน้าได้
  // Firefox ให้ 'null' เพราะมองแต่ละไฟล์เป็นคนละ Origin ค่าจึงไม่ส่งต่อข้ามหน้า
  var opaqueFileOrigin = location.protocol === 'file:' &&
    (String(location.origin) === 'null' || /firefox\//i.test(navigator.userAgent));

  function emit(key) { listeners.forEach(function (fn) { fn(key); }); }

  function get(key) { return clone(Object.prototype.hasOwnProperty.call(values, key) ? values[key] : defaultFor(key)); }

  // CR-35: รหัสคู่ค้าห้ามซ้ำทั้งระบบ (ร้านค้า TT + คู่ค้าของ Account / Platform) — ปฏิเสธที่ Store ไม่ใช่แค่หน้าจอ (core/units.js firstCodeConflict)
  function checkCustomerCodes(key, value) {
    if (key !== 'master.stores' && key !== 'master.customers') return;
    var U = SP.core.units;
    if (!U || !U.firstCodeConflict) return;
    var prev = { stores: get('master.stores'), customers: get('master.customers') };
    var dup = U.firstCodeConflict(key === 'master.stores' ? value : prev.stores, key === 'master.customers' ? value : prev.customers, prev);
    if (dup) throw new Error(String(SP.data.content.pages.salesUnits.errors.duplicateCode).replace('{code}', dup.code).replace('{name}', dup.name));
  }

  // CR-37: กติกาของ Bundle — ปฏิเสธที่ Store ไม่ใช่แค่หน้าจอ (calc.normalizeBundles: ชิ้นส่วนรวม ≥ 2 · ห้าม Bundle ซ้อน · ห้ามชิ้นส่วน Request / Delete)
  //   ผ่านแล้วคืนค่าที่ปรับแล้ว (รวม skuId ซ้ำ · หมวดสินค้า · Series จากชิ้นส่วน) / ไม่ผ่าน = Error (error.bundle = { code, key, skuId, status })
  function checkBundles(key, value) {
    if (key !== 'master.products' || !Array.isArray(value) || !SP.core.calc.normalizeBundles) return value;
    var calc = SP.core.calc;
    var res = calc.normalizeBundles(value, get('master.products'), SP.core.clock.currentMonth());
    if (res.ok) return res.products;
    var E = (SP.data.content.pages.bundle || {}).errors || {};
    var L = (SP.data.content.labels || {}).status || {};
    var err = new Error(String(E[res.error.code] || E.invalid || res.error.code)
      .replace('{bundle}', calc.codeOf(value, res.error.key)).replace('{code}', res.error.skuId ? calc.codeOf(value, res.error.skuId) : '')
      .replace('{status}', L[res.error.status] || res.error.status || ''));
    err.bundle = res.error;
    throw err;
  }

  // CR-38: ข้อบังคับห้ามแก้ย้อนหลังของ Revision (core/revision.js guardWrite · ไม่มีบทบาทใดข้ามได้ · ค่าไม่เปลี่ยน = ผ่าน)
  function checkRevision(key, value) {
    var R = SP.core.revision;
    if (R && R.guardWrite) R.guardWrite(key, value, get(key), Object.prototype.hasOwnProperty.call(values, key));
    // CR-39: กติกาของคำขออนุมัติ (core/approval.js guardWrite · คำขอที่ปิดแล้วแก้ไม่ได้ · 1 รอบมีคำขอรอดำเนินการได้ 1 รายการ · ขั้นเดินหน้าอย่างเดียว)
    var A = SP.core.approval;
    if (A && A.guardWrite) A.guardWrite(key, value, get(key), Object.prototype.hasOwnProperty.call(values, key));
  }

  function set(key, value) {
    checkCustomerCodes(key, value);
    value = checkBundles(key, value);
    checkRevision(key, value);
    values[key] = clone(value);
    adapter.save(key, values[key]);
    if (key === 'master.channels' && Array.isArray(value)) SP.data.channels = clone(value);   // CR-29
    emit(key);
  }

  // ปีแผนที่เลือก (ถ้าค่าที่เก็บไว้ไม่อยู่ใน PLAN_YEARS ใช้ปีตั้งต้น)
  function year() {
    var y = Number(get('app.planYear'));
    return SP.data.settings.PLAN_YEARS.indexOf(y) >= 0 ? y : SP.data.settings.DEFAULT_PLAN_YEAR;
  }

  function planKey(suffix) { return 'plan.' + year() + '.' + suffix; }

  function master() {
    return {
      products: get('master.products'),
      listings: get('master.listings'),
      taxonomy: get('master.taxonomy'),
      basePrices: get('master.basePrices'),
      promoPrices: get('master.promoPrices'),
      npdPlans: get('master.npdPlans'),
      codeCounters: get('master.codeCounters'),
      audit: get('master.audit'),
      accounts: get('master.accounts'),
      territories: get('master.territories'),
      salespeople: get('master.salespeople'),
      assignments: get('master.assignments'),
      stores: get('master.stores'),
      storeAssignments: get('master.storeAssignments'),
      storeMoves: get('master.storeMoves'),
      provinceSuggestions: get('master.provinceSuggestions'),
      customers: get('master.customers'),
      customerAssignments: get('master.customerAssignments')
    };
  }

  function data() {
    var d = {};
    Object.keys(SP.data).forEach(function (k) { d[k] = SP.data[k]; });
    var m = master();
    Object.keys(m).forEach(function (k) { d[k] = m[k]; });
    // CR-16: ยอดขายปีก่อนของเขต TT ตามร้านที่อยู่ในเขต (หลังอนุมัติจัดสรรเป้าหมายประจำปี = ร้าน ณ เวลาที่อนุมัติ)
    var S = SP.core.stores;
    if (S) d = S.applyHistory(d, year(), S.approvedAt(get('plan.' + year() + '.workflow.topDown.all')));
    return d;
  }

  // บทบาทจำลอง: Sales Person ที่ไม่อยู่ใน Master แล้ว → กลับไปใช้บทบาทตั้งต้น
  function role() {
    var r = get('ui.role') || {};
    if (r.type === 'sales' && !SP.core.calc.findById(get('master.salespeople'), r.personId)) return { type: SP.data.settings.DEFAULT_ROLE, personId: null };
    return r;
  }

  // CR-41: เดือนปัจจุบัน = นาฬิกากลาง (core/clock.js) — ผู้รับผิดชอบ · ทีมขาย · สิทธิ์ขอบเขตทีม · Role Management · รายงาน (ผู้ใช้เลือก)
  //   ui.currentMonth (DEMO_FORECAST_MONTH) เหลือใช้เฉพาะโหมดปรับแผน [Phase 2] ของ SKU Planning
  function currentKey() { return SP.core.clock.currentMonth(); }

  // วันที่ "วันนี้" = วันแรกของเดือนปัจจุบันของนาฬิกากลาง (ใช้ตัดสินราคาปัจจุบัน Status ของรายการสินค้า และวันที่มีผลตั้งต้น)
  function today() { return currentKey() + '-01'; }

  // ต่อท้าย Audit log (master.audit) entries จาก calc.auditDiff
  function appendAudit(entries) {
    if (!entries || !entries.length) return;
    set('master.audit', get('master.audit').concat(entries));
  }

  // สถานะ Workflow ทั้งปี (y = ปีแผน ไม่ส่ง = ปีที่เลือก)
  function workflowStates(y) {
    var prefix = 'plan.' + (y || year()) + '.workflow.';
    var out = {};
    Object.keys(values).forEach(function (k) { if (k.indexOf(prefix) === 0) out[k.slice(prefix.length)] = clone(values[k]); });
    return out;
  }

  function saveWorkflowStates(map, y) {
    var before = workflowStates(y);
    Object.keys(map).forEach(function (k) {
      if (JSON.stringify(before[k]) !== JSON.stringify(map[k])) set('plan.' + (y || year()) + '.workflow.' + k, map[k]);
    });
  }

  SP.core.store = {
    get: get,
    year: year,
    master: master,
    data: data,
    role: role,
    currentKey: currentKey,
    today: today,
    appendAudit: appendAudit,
    workflowStates: workflowStates,
    saveWorkflowStates: saveWorkflowStates,
    planKey: planKey,
    getDefault: function (key) { return clone(defaultFor(key)); },
    set: set,
    remove: function (key) {
      checkRevision(key, undefined);   // CR-38
      delete values[key];
      adapter.remove(key);
      emit(key);
    },
    reset: function () {
      values = {};
      adapter.clear();
      SP.data.channels = clone(BASE_CHANNELS);   // CR-29
      // เก็บรุ่นข้อมูลไว้ ไม่อย่างนั้นค่าที่ตั้งหลังรีเซ็ต (เช่น มุมมองผู้ใช้) ถูกล้างอีกครั้งตอนเปิดหน้าถัดไป
      values['app.dataVersion'] = DATA_VERSION;
      adapter.save('app.dataVersion', DATA_VERSION);
      if (SP.core.clock) SP.core.clock.refresh();   // CR-41 app.scenario ถูกล้าง → สถานการณ์ตั้งต้น (core/scenario.js load ตั้งค่าใหม่ทันที)
      emit(null);
    },
    isSet: function (key) { return Object.prototype.hasOwnProperty.call(values, key); },
    keys: function () { return Object.keys(values); },
    onChange: function (fn) { listeners.push(fn); },
    status: { persistent: adapter.persistent, crossPage: adapter.persistent && !opaqueFileOrigin }
  };
})(window.SP);

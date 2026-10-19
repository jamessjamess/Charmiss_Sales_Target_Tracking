/*
 * tests/cr40.test.js — Test ของ CR-40 (แถบสถานะ Revision เฉพาะโหมดแก้ไข · ตัวกรองของ SKU Planning · ธีม Token สี · ไอคอนเมนู · ตัดคำอธิบายใต้หัวข้อ)
 *
 * รันด้วย Node: node tests/run.js cr40 / ในเบราว์เซอร์: tests/calc.test.html รวม Test ชุดนี้ด้วย
 *   node: true = อ่านไฟล์ในโฟลเดอร์ด้วย SP.testFiles (มีเฉพาะ tests/run.js) — หน้า Test บนเบราว์เซอร์ข้ามข้อเหล่านี้
 *   cr40-20.. (เบราว์เซอร์) ใช้ Component และ store จริงแล้วรีเซ็ตกลับเป็นข้อมูลตั้งต้น
 */
(function () {
  'use strict';
  var SP = window.SP = window.SP || {};
  SP.tests = SP.tests || {};

  function F() { return SP.testFiles; }
  function S() { return SP.core.store; }
  function calc() { return SP.core.calc; }
  function C() { return SP.core.components; }
  function r0(v) { return Math.round(v); }
  // ค่าของ Token ใน styles/tokens.css (บรรทัดแรกที่ประกาศ)
  function tokenOf(css, name) { var m = new RegExp('\\n\\s*' + name.replace(/-/g, '\\-') + ':\\s*([^;]+);').exec(css); return m ? m[1].trim() : null; }
  // คำอธิบายใต้หัวข้อเดิม (ก่อน CR-40) ของ 12 หน้า → ต้องอยู่ใน helpLead (บรรทัดแรกของปุ่ม ?)
  var OLD_LEADS = {
    template: 'โครงตั้งต้นสำหรับสร้าง Module ใหม่ ดูขั้นตอนใน README.md',
    topDown: 'กำหนด Total Target (Net Sales) ประจำปี และเป้าหมายของแต่ละ Channel',
    phasing: 'จัดสรรเป้าหมายของ Channel ให้แต่ละหน่วยขาย และกระจายเป็นรายเดือน',
    npdPlan: 'ติดตามสินค้าใหม่ตั้งแต่วางแผนจนเปิดตัว ทีมขายใช้ดูว่าสินค้าใหม่ใดพร้อมขายเมื่อใด ทีม Product ใช้ติดตามขั้นงานและคำขอจากทีมขาย',
    productMaster: 'กำหนดสถานะและช่วงเวลาวางขายของสินค้าในแต่ละหน่วยขาย และช่วง Clearance',
    skuPlanning: 'วางแผนจำนวนขายราย SKU รายเดือน และเปรียบเทียบกับเป้าหมายรายเดือน',
    salesUnits: 'หน่วยขายของทุก Channel และคู่ค้าตามรหัสคู่ค้าที่อยู่ในแต่ละหน่วยขายตามช่วงเดือน',
    roleManagement: 'สิทธิ์ของแต่ละบทบาทในแต่ละหน้า',
    roleRoles: 'จัดการบทบาทได้ที่หน้า Permissions',
    roleUsers: 'บทบาทของผู้ใช้และสิทธิ์ที่มีผลจริง',
    summary: 'ติดตามรายการที่ต้องดำเนินการ และสรุปแผนสำหรับประกาศและเป็นหลักฐานข้อตกลง',
    aboutPrototype: 'ภาพรวมระบบ ลำดับการทำงาน และคำศัพท์ที่ใช้'
  };
  // ค่าสีที่เขียนตรง: #xxx · #xxxxxx · #xxxxxxxx · rgb( · rgba( (ไม่นับ HTML entity &#123;)
  var COLOR_RE = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?\b|\brgba?\(/;
  var LEAD_RE = /\bpage\.lead\b|class: 'lead'/;

  SP.tests.cr40 = [
    {
      name: 'cr40-1. (Node) ไม่มีค่าสีฐานสิบหก (#xxx / #xxxxxx) หรือ rgb( / rgba( ในไฟล์หน้า (modules/) และ Component (core/ · styles/) ยกเว้นไฟล์ Token กลาง styles/tokens.css',
      node: true,
      expected: [],
      actual: function () {
        var files = F().list('modules', ['.css', '.js']).concat(F().list('core', ['.js']), F().list('styles', ['.css'])).filter(function (f) { return f !== 'styles/tokens.css'; });
        var out = [];
        files.forEach(function (f) {
          F().read(f).split(/\r?\n/).forEach(function (line, i) {
            if (COLOR_RE.test(line.replace(/&#\d+;/g, ''))) out.push(f + ':' + (i + 1));
          });
        });
        return out;
      }
    },
    {
      name: 'cr40-2. (Node) Token ของธีม (ข้อ 3.1) ครบใน :root · สีหลัก = ค่าจาก Repo KOL Management (#c2185b) · สี Channel และสีกราฟคงค่าเดิม (--ch-1..3 · --c-bar · --c-td · --c-split-net · --c-type-existing · Waterfall)',
      node: true,
      expected: [[], '#c2185b', 'var(--primary)', ['#8c2f5d', '#2c6e8a', '#c2702a'], ['var(--ch-1)', 'var(--ch-2)', 'var(--ch-3)'], ['#8c2f5d', '#8c2f5d', '#8c2f5d', '#8c2f5d', '#37995a', '#d8443a', '#d1acbe', '#1f3f66']],
      actual: function () {
        var css = F().read('styles/tokens.css');
        var need = ['--bg', '--surface', '--border', '--text', '--text-muted', '--primary', '--primary-hover', '--primary-soft', '--header-gradient', '--success', '--success-soft',
          '--warning', '--warning-soft', '--danger', '--danger-soft', '--neutral-soft', '--radius-card', '--radius-control', '--radius-pill', '--shadow-card', '--ch-mt', '--ch-tt', '--ch-ecom'];
        return [need.filter(function (t) { return tokenOf(css, t) === null; }), tokenOf(css, '--primary'), tokenOf(css, '--c-primary'),
          ['--ch-1', '--ch-2', '--ch-3'].map(function (t) { return tokenOf(css, t); }), ['--ch-mt', '--ch-tt', '--ch-ecom'].map(function (t) { return tokenOf(css, t); }),
          ['--c-bar', '--c-td', '--c-split-net', '--c-type-existing', '--wfc-up', '--wfc-down', '--chart-target', '--chart-plan'].map(function (t) { return tokenOf(css, t); })];
      }
    },
    {
      name: 'cr40-3. ไอคอนเมนู: ทุกรายการในเมนูข้าง (registry) มีชื่อไอคอนที่อยู่ใน assets/icons.js · ขั้น 1–4 ของ Sales Planning = วงกลมเลขขั้น (ไม่มี icon) · ไม่มีตัวอักษรเดี่ยวเหลืออยู่',
      expected: [[], [1, 2, 3, 4], [], true],
      actual: function () {
        var list = SP.core.registry.list.filter(function (e) { return e.group; });
        var steps = list.filter(function (e) { return e.group === 'sales-planning' && e.tour; });
        var others = list.filter(function (e) { return steps.indexOf(e) < 0; });
        return [others.filter(function (e) { return !e.icon || !SP.data.icons[e.icon]; }).map(function (e) { return e.id; }),
          steps.map(function (e) { return e.tour; }),
          list.filter(function (e) { return e.icon && e.icon.length < 3; }).map(function (e) { return e.id + ':' + e.icon; }),
          steps.every(function (e) { return !e.icon; })];
      }
    },
    {
      name: 'cr40-4. (Node) assets/icons.js: ไอคอน Lucide ที่ใช้ในเมนู แถบบน และปุ่มครบ · มีข้อความใบอนุญาต ISC ของ Lucide ที่หัวไฟล์ · เป็นข้อมูลล้วน (ไม่มี on…= / javascript: / href) · loader โหลดไฟล์นี้',
      node: true,
      expected: [[], true, true, true],
      actual: function () {
        var src = F().read('assets/icons.js');
        var need = ['badge-check', 'package', 'boxes', 'rocket', 'tag', 'store', 'users', 'shield-check', 'user-cog', 'book-open', 'search', 'panel-left-close', 'panel-left-open', 'target', 'chevron-down'];
        var body = Object.keys(SP.data.icons).map(function (k) { return SP.data.icons[k]; }).join('');
        return [need.filter(function (n) { return !SP.data.icons[n]; }), /Lucide License \(ISC\)/.test(src) && /Permission to use, copy, modify/.test(src),
          !/on\w+\s*=|javascript:|href/i.test(body), F().read('core/loader.js').indexOf("'assets/icons.js'") > 0];
      }
    },
    {
      name: 'cr40-5. ตัดคำอธิบายใต้หัวข้อทุกหน้า: ไม่มีหน้าใดมี lead ใน content.js · ข้อความเดิม 12 หน้าอยู่ใน helpLead (บรรทัดแรกของปุ่ม ?)',
      expected: [[], []],
      actual: function () {
        var P = SP.data.content.pages;
        return [Object.keys(P).filter(function (id) { return P[id] && P[id].lead !== undefined; }),
          Object.keys(OLD_LEADS).filter(function (id) { return !P[id] || P[id].helpLead !== OLD_LEADS[id]; })];
      }
    },
    {
      name: 'cr40-6. (Node) ไม่มีหน้าใดเรียกคำอธิบายใต้หัวข้อ (page.lead · class lead) และไม่มีแถบสถานะ Revision ในโหมดดู (layout ไม่เรียก revisionBar) · Sales Planning ใช้แถบโหมดแก้ไขแบบรวมข้อความของรอบ',
      node: true,
      expected: [[], false, ['modules/phasing/phasing.js', 'modules/sku-planning/sku-planning.js', 'modules/top-down/top-down.js']],
      actual: function () {
        var files = F().list('modules', ['.js']).concat(F().list('core', ['.js']));
        var lead = files.filter(function (f) { return LEAD_RE.test(F().read(f)); });
        var layout = F().read('core/layout.js');
        return [lead, /revisionBar\(/.test(layout),
          F().list('modules', ['.js']).filter(function (f) { return F().read(f).indexOf('editBanner({ revision: true })') >= 0; }).sort()];
      }
    },
    {
      name: 'cr40-7. ตัวกรองของ SKU Planning (calc.skuFilterKeys): ตัวเลขในปุ่ม ตัวกรอง (n) = จำนวน Chip ตามลำดับ · Bundle นับเมื่อเปิด Flag เท่านั้น · ล้างตัวกรอง → n = 0',
      expected: [0, ['age', 'planType'], ['series', 'category', 'age', 'planType', 'kind', 'noSale'], ['series', 'category', 'age', 'planType', 'noSale'], 0, []],
      actual: function () {
        var K = calc().skuFilterKeys;
        var all = { series: ['s1', 's2'], node: 'c1', nodeLevel: 'category', age: 'gt2y', planType: 'existing', kind: 'bundle', noSale: true };
        return [K({}, true).length, K({ age: 'gt2y', planType: 'existing' }, true), K(all, true), K(all, false),
          K(calc().clearedSkuFilters(), true).length, K(null, true)];
      }
    },
    // ======================= เบราว์เซอร์ (Component และ store จริง) =======================
    {
      name: 'cr40-20. (เบราว์เซอร์) แถบโหมดแก้ไขของ Sales Planning แถบเดียว 1 บรรทัด: ข้อมูลตั้งต้น R1 = แก้ไขได้ทุกเดือน · ข้อมูลตัวอย่าง R2 = แก้ไขได้ตั้งแต่ เม.ย. 2027 · มีรายการที่ยังไม่บันทึก n รายการ',
      expected: [['edit-banner', 'โหมดแก้ไข · 2027 R1 ร่าง · แก้ไขได้ทุกเดือน · ยังไม่มีรายการที่เปลี่ยนแปลง'], 'โหมดแก้ไข · 2027 R2 ร่าง · แก้ไขได้ตั้งแต่ เม.ย. 2027 · มีรายการที่ยังไม่บันทึก 2 รายการ'],
      actual: function () {
        // เบราว์เซอร์เท่านั้น: SP.core.components และ store จริง (Node ข้ามข้อนี้)
        S().reset();
        var a = C().editBanner({ revision: true });
        SP.core.revision.loadSample();
        var b = C().editBanner({ revision: true });
        b.update(2);
        S().reset();
        return [[a.className.split(' ')[0], a.textContent], b.textContent];
      }
    },
    {
      name: 'cr40-21. (เบราว์เซอร์) ไอคอน: icon(Lucide) = SVG เส้นมีรูปร่างจาก assets/icons.js (class icon-lucide) · stepIcon(3) = วงกลมเลข 3 · แท็บขีดเส้นใต้ (components.tabs) ตัวนับเป็นตัวเลขเล็กต่อท้าย',
      expected: [['svg', true, true], ['step-icon', '3'], [['รอฉันดำเนินการ', '2', 'true'], ['ทั้งหมด', '5', 'false']]],
      actual: function () {
        // เบราว์เซอร์เท่านั้น: SP.core.components สร้าง Element (Node ข้ามข้อนี้)
        var i = C().icon('package');
        var s = C().stepIcon(3);
        var t = C().tabs({ label: 'x', value: 'mine', onChange: function () {}, options: [{ value: 'mine', label: 'รอฉันดำเนินการ', count: 2 }, { value: 'all', label: 'ทั้งหมด', count: 5 }] });
        return [[i.tagName.toLowerCase(), i.getAttribute('class').indexOf('icon-lucide') >= 0, i.childNodes.length > 0], [s.className, s.textContent],
          Array.prototype.map.call(t.querySelectorAll('.page-tab'), function (b) { return [b.querySelector('.page-tab-label').textContent, b.querySelector('.page-tab-count').textContent, b.getAttribute('aria-selected')]; })];
      }
    },
    {
      name: 'cr40-22. (เบราว์เซอร์) ปุ่ม ? ของหน้า: บรรทัดแรก = คำอธิบายใต้หัวข้อเดิม (Annual Target · SKU Planning · Plan Summary)',
      expected: [OLD_LEADS.topDown, OLD_LEADS.skuPlanning, OLD_LEADS.summary],
      actual: function () {
        // เบราว์เซอร์เท่านั้น: เปิด Popover ใน document. ของหน้า Test แล้วปิด
        return ['topDown', 'skuPlanning', 'summary'].map(function (id) {
          var btn = C().pageHelp(id);
          document.body.appendChild(btn);
          btn.click();
          var pop = document.querySelector('.page-help-popover');
          var first = pop ? pop.querySelector('.page-help-text') : null;
          var text = first && first.classList.contains('page-help-lead') ? first.textContent : null;
          btn.click();
          Array.prototype.forEach.call(document.querySelectorAll('.page-help-popover'), function (p) { if (p.parentNode) p.parentNode.removeChild(p); });
          btn.parentNode.removeChild(btn);
          return text;
        });
      }
    },
    {
      name: 'cr40-23. (เบราว์เซอร์) ตัวเลขเท่าก่อน CR (CR นี้แก้เฉพาะการแสดงผล): Net Sales รวมแผน 111,310,349 · เป้าหมายรวม 120 ล้าน (ข้อมูลตั้งต้น)',
      expected: [111310349, 120000000],
      actual: function () {
        // เบราว์เซอร์เท่านั้น: ใช้ SP.core.store และ document. ของหน้า Test (Node ข้ามข้อนี้)
        S().reset();
        var rep = SP.core.report.build();
        var out = [r0(calc().sum(rep.units.map(function (u) { return u.plan; }))), rep.total.amount];
        S().reset();
        return out;
      }
    }
  ];
})();

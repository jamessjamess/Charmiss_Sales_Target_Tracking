/*
 * data/scenarios.js — CR-41 สถานการณ์ Demo (ข้อมูลเท่านั้น ไม่มี Logic)
 *   ไม่อยู่ใน data/seed/ (seed = ข้อมูลจาก Excel เท่านั้น · ผู้ใช้เลือก)
 *   core/clock.js อ่านเดือนปัจจุบัน / วันที่ของข้อมูล / ปีแผน ของสถานการณ์ที่เลือก (sessionStorage SP:app.scenario · ไม่มี = defaultId)
 *   core/scenario.js สร้างข้อมูลของสถานการณ์ตาม build (ยอดจริงตัวอย่าง · R1 Lock แล้ว · คำขออนุมัติของ R1)
 *
 *   list[].id           รหัสสถานการณ์ · currentMonth = เดือนปัจจุบัน ('YYYY-MM') · asOf = วันที่ของข้อมูล ('YYYY-MM-DD')
 *   list[].planYear     ปีแผน · home = หน้าแรกของสถานการณ์ (id ใน registry) · homeTab = แท็บของหน้าแรก (hash)
 *   list[].build        (ไม่มี = ข้อมูลตั้งต้น) สิ่งที่สร้างเพิ่มตอนเลือกสถานการณ์:
 *     sampleFrom        เดือนแรกของยอดจริงตัวอย่าง (ถึงเดือนปิดล่าสุดของสถานการณ์) · isSample
 *     growth            'targetVsL12m' = เดือนก่อนปีแผน: ยอดเดือนเดียวกันปีก่อน × (1 + การเติบโตของ Channel = เป้าหมายปีแผนเทียบ L12M ณ สถานการณ์แรก)
 *     planFactor        เดือนในปีแผน: จำนวนในแผน R1 ของเดือนนั้น × ตัวคูณของ Channel (ทำให้ ECOM โตกว่าเป้า MT ต่ำกว่าเป้า)
 *     r1                คำขออนุมัติของ R1 (ส่ง · ความคิดเห็น · อนุมัติและ Lock) สร้างด้วยฟังก์ชันจริงของ CR-38 / CR-39 ภายใต้นาฬิกาของ base
 *     base              สถานการณ์ที่ใช้คำนวณแผน R1 และ Snapshot (ตัวเลขของ R1 = สถานการณ์นั้นก่อน Lock)
 */
(function (SP) {
  'use strict';

  SP.data.scenarios = {
    defaultId: 'S1',
    list: [
      { id: 'S1', currentMonth: '2026-09', asOf: '2026-09-30', planYear: 2027, home: 'topDown' },
      {
        id: 'S2', currentMonth: '2027-02', asOf: '2027-02-26', planYear: 2027, home: 'summary', homeTab: 'revision',
        build: {
          base: 'S1',
          sampleFrom: '2026-09',
          growth: 'targetVsL12m',
          planFactor: { mt: 0.95, tt: 1.00, ecom: 1.12 },
          r1: {
            submit: { userId: 'u-mgmt', at: '2026-12-10T10:00:00', note: 'เป้าหมายปี 2027 ฉบับแรก' },
            comments: [{ userId: 'u-md', at: '2026-12-14T16:30:00', text: 'อนุมัติ ติดตาม ECOM รายไตรมาส' }],
            approve: { userId: 'u-md', at: '2026-12-15T10:00:00' }
          }
        }
      }
    ]
  };
})(window.SP);

# 📋 PROGRESS.md — Werewolf Online v2.2

> สรุปงานที่ทำสำเร็จ / ยังไม่ทำ อัปเดตล่าสุดตามวันที่ใช้งาน
> (บันทึกการทำงานจริง — คู่กับ AGENTS.md และ แผนโปรเจค-v2.2.md)

---

## ✅ เสร็จแล้ว

### โครงสร้าง & ระบบพื้นฐาน
- [x] Firebase v9 modular init + anonymous auth + room CRUD (`public/src/firebase.js`)
- [x] สร้าง/เข้าห้อง 5–16 คน + ห้องไม่ซ้ำ (`index.html`, `index-ui.js`)
- [x] Lobby: ดูรายชื่อ, host เริ่มเกม, การ์ด role หลังเริ่มเกม (`lobby.html`, `lobby-ui.js`)
- [x] Host screen: ตารางผู้เล่น+role, เรียกบทบาทกลางคืนตามลำดับ, จับคู่รัก, อ่าน action, resolve กลางคืน → กลางวัน, โอน host (`host.html`, `host-ui.js`, `host-control.js`)
- [x] Player screen: การ์ด role ตัวเอง + form action กลางคืนตามบทบาท (wolf/seer/doctor/bodyguard/witch/cupid) (`player.html`, `player-ui.js`)

### Logic (pure, ทดสอบด้วย node)
- [x] `roles.js` — 18 บทบาท + `getTeam`/`isWolfTeam` (cursed ดูสถานะ)
- [x] `win-check.js` — `checkWin` ลำดับตายตัว: Fool → Lovers → หมาป่าหมด → หมาป่า≥ชาวบ้าน (AGENTS §2.2)
- [x] `game.js` — `buildDeck`/`assignRoles` ตามจำนวนผู้เล่น (บังคับ seer/doctor/hunter/cupid)
- [x] `night.js` — `NIGHT_ORDER`, `countWolfVotes`, `resolveNight` (protect+poison, doubleKill wolf_cub, เอา action เฉพาะคืนนี้)
- [x] `cursed.js` — `updateCursedStatus`, `canWolfSeeCursed` (turnedNight+1), `isCursedTurned`

### Security Rules (Firebase, deploy แล้ว)
- [x] role ซ่อนใน `/secret/roles/{uid}` — อ่านได้เฉพาะเจ้าของ+host
- [x] `/wolf` อ่านได้เฉพาะ wolf+host, `/night` อ่านได้เฉพาะ host, `night/actions/{uid}` เขียนเอง
- [x] **แก้บั๊ก:** `night` ไม่มี rule ให้ host เขียน `night/result` → เพิ่ม `night/result .write host` (host/ hostUid2)
- [x] ป้องกัน host เขียน action แทนผู้เล่น (action ต้องเขียนโดยเจ้าของ uid เท่านั้น — ตรง AGENTS §3.5)
- [x] action ทุกตัวมี field `night` เพื่อกรองของคืน (แก้ปัญหาค้าง action เก่าโดยไม่ต้องล้าง DB)

### ไอคอน / UI
- [x] ไอคอน role 18 แบบ (.svg placeholder, สีตามฝ่าย) + `favicon.svg` — อยู่ใต้ `public/assets/` (ย้ายตาม Netlify เสิร์ฟ `public/` เป็น root)
- [x] `[hidden]` attribute ทำงานถูกต้อง (เดิม `.container{display:flex}` ทับ) — style.css:1
- [x] favicon link ทุกหน้า html (8 หน้า)

### การทดสอบ
- [x] Unit test 54/54 (`node --test "public/src/__tests__/*.test.js"`)
- [x] E2E rules/night (node SDK ต่อ Firebase จริง) 11/11 ผ่าน — รวม host เขียน night/result, player เขียน action ตัวเอง, บุกรุกถูก deny
- [x] Browser probe (Chrome headless + CDP): หน้าผู้เล่น render role card / night section แบบผู้เล่นจริง ไม่มี JS error

### Git
- [x] commits (เรียง): `46aa146` createRoom dup-fix, `546df1d` Add lobby, `6e38282` Add roles + win-check, `7bae8d8` Add assignRoles + game start, `e52cfa3` remove temp rules dump, `06d3645` Add night system + cursed + host control, `dfffdf1` Fix player screen blank + hidden override, `3c0dc8b` Add ref/onValue re-export

---

## ⏳ ยังไม่ได้ทำ

### Day 8-9 เป็นต้นไป (ตามแผนโปรเจค-v2.2.md)
- [ ] `vote.js` + phase **vote** (โหวตกลางวัน/ลับ, Mayor 2 เสียง, `players/{uid}/voteTarget`)
- [ ] `hunter.js` + phase **hunter** (ตายกลางคืน→เช้ายิง, ตายกลางวัน→ยิงทันที — AGENTS §2.5)
- [ ] **Day phase UI**: โหมดคุยกันกลางวัน (ตอนนี้เป็น placeholder)
- [ ] `end.html` + `end-ui.js`: หน้าจบเกม + เผย role
- [ ] `settings.html`, `help.html`, `profile.html`: ตั้งค่า/กติกา/สถิติ (มีไฟล์ placeholder)
- [ ] เติม `night/result` เข้า flow UI กลางวัน (ประกาศผู้ตาย/ผล seer)
- [ ] Witch "ใช้ได้รวม 1 heal + 1 poison" และ Doctor/Bodyguard กติกาซ้ำคนเดิม (ตอนนี้ host ดูเอง)
- [ ] `phase=end` + `checkWin` เรียกจาก flow จริง (ตอนนี้ validate ผ่าน unit test เท่านั้น)

### Rules ที่ค้างปรับตามแผน (รายงานแล้ว ยังไม่แก้)
- [ ] `/secret/cursed/{uid}` อ่านได้เฉพาะ "wolf หลังจากคืนที่ถูกกัด" (ตอนนี้ host ตรวจเอง)
- [ ] `/hunter` readable ตาม reveal (ตอนนี้ทุกคนอ่านได้ก่อน reveal)
- [ ] client ยังลบห้องไม่ได้ (มีแค่ CLI) — อยากลบต้องเพิ่ม rule

### Phase 2 (ตาม AGENTS §2.7 — ยังไม่เริ่ม)
- [ ] Center cards (`useCenterCards`)
- [ ] Custom roles (`useCustomRoles`)
- [ ] Spectator view (`/spectator`)

---

## ⚠️ หมายเหตุการตัดสินใจ (MVP)
- Witch ใช้ยาสำรองรวม heal+poison ทั้งเกม: **ยังไม่ enforce** (ใช้ได้คืนละอย่างแบบนี้)
- Seer เห็นผลผ่านคนทรงประกาศ (ยังไม่มี card แจ้งผลตรงผู้เล่น)
- wolf_cub ตาย → doubleKill คืนถัดไป: ใช้ flag `doubleKill` ประมาณ (นับจาก "ตายก่อนหน้า")
- Host เป็นผู้เล่นในเกมด้วย (ยังไม่แยกระบบ moderator เต็มรูปแบบ ตามแผนเดิมที่คิดจะแยก)
- Lovers: Cupid เขียน `/night/actions` แล้ว host รับไปเขียน `/lovers` (rules อนุญาต host เท่านั้น)

---

> อัปเดตครั้งล่าสุด: 2026-09-23
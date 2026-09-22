# 🐺 AGENTS.md — Werewolf Online v2.2

> ไฟล์นี้เป็น **Context หลัก** สำหรับ AI Agent (OpenCode + Big Pickle)
> อ่านก่อนเขียนโค้ดทุกครั้ง ห้ามข้าม

---

## 0) ข้อมูลโปรเจค

| หัวข้อ | ค่า |
|---|---|
| ชื่อโปรเจค | Werewolf Online v2.2 |
| ประเภท | Social Deduction Web Game |
| ผู้เล่น | 5–16 คน + Moderator 1–2 คน |
| แพลตฟอร์ม | Web (Mobile-first) |
| Tech Stack | Firebase Realtime DB + Netlify + Vanilla JS (ES modules) |
| ภาษาในโค้ด | Comments ภาษาไทย, ตัวแปร/ฟังก์ชันภาษาอังกฤษ |
| Node version | ≥ 18 |
| Firebase SDK | v9 modular (ไม่ใช้ compat) |
| Package manager | npm |
| Git | ใช้ Git + GitHub |
| AI Tools | OpenCode (Big Pickle) + DeepSeek + ChatGPT |

---

## 1) โครงสร้างไฟล์ (ห้ามเปลี่ยนชื่อ)

```
werewolf-online/
├── public/
│   ├── index.html          # หน้าแรก: ใส่ชื่อ + สร้าง/เข้าห้อง
│   ├── lobby.html          # รอผู้เล่น + host เริ่มเกม
│   ├── host.html           # หน้าคนทรง (ควบคุมเกม)
│   ├── player.html         # หน้าผู้เล่น (night/day/vote/hunter)
│   ├── end.html            # จบเกม + เผย role
│   ├── settings.html       # ตั้งค่า
│   ├── help.html           # กติกา + role
│   ├── profile.html        # ชื่อ + สถิติ
│   └── src/
│       ├── firebase.js     # Firebase init + auth + room CRUD
│       ├── game.js         # State machine + assignRoles
│       ├── roles.js        # ROLE object + getTeam + isWolfTeam
│       ├── win-check.js    # checkWin (ลำดับสำคัญมาก)
│       ├── night.js        # Night actions + resolve
│       ├── cursed.js       # Cursed status logic
│       ├── vote.js         # Vote system
│       ├── hunter.js       # Hunter shoot logic
│       ├── host-control.js # Host actions
│       ├── host-ui.js      # UI logic ของ host.html
│       ├── player-ui.js    # UI logic ของ player.html
│       ├── end-ui.js       # UI logic ของ end.html
│       ├── style.css       # CSS mobile-first
│       └── __tests__/
│           ├── win-check.test.js
│           ├── game.test.js
│           ├── night.test.js
│           └── cursed.test.js
│   └── assets/             # ย้ายเข้ามาใต้ public/ (Netlify เสิร์ฟ public/ เป็น root)
│       ├── roles/          # ไอคอน role (.svg placeholder) — path อ้างถึง "assets/roles/..."
│       ├── ui/             # ไอคอน UI (favicon.svg ฯลฯ)
│       └── bg/             # พื้นหลัง
├── .gitignore
├── firebase.json
├── firebase-rules.json
├── package.json
├── README.md
├── AGENTS.md               # ← ไฟล์นี้
└── แผนโปรเจค-v2.2.md
```

**กฎเหล็ก:** ห้ามสร้างไฟล์ใหม่เองโดยไม่ถาม host (user) ก่อน

---

## 2) กฎเหล็ก 10 ข้อ (CRITICAL RULES)

> ทุกข้อห้ามละเมิด ถ้าไม่แน่ใจให้ **ถามก่อน**

### 2.1 Role ต้องเก็บใน `/secret/roles/{uid}` เท่านั้น
```javascript
// ✅ ถูก
/rooms/{code}/secret/roles/{uid}/role = "werewolf"

// ❌ ผิด (ผู้เล่นอื่นเห็นได้)
/rooms/{code}/players/{uid}/role = "werewolf"
```

### 2.2 ลำดับ checkWin ต้องเป็นตามนี้เป๊ะ
```javascript
1. Fool ถูกโหวตออก?                        → winner = "fool"
2. Lovers ต่างฝ่ายเหลือ 2 คนสุดท้าย?        → winner = "lovers"
3. หมาป่า (รวม Minion + Cursed turned) = 0? → winner = "villagers"
4. หมาป่า >= ชาวบ้าน?                      → winner = "wolves"
5. ไม่มี → null (เล่นต่อ)
```

### 2.3 Fool มาก่อน Lovers เสมอ
- Fool ถูกโหวตออกพร้อมคู่รัก → **Fool ชนะเดี่ยว**
- Lovers ไม่ชนะในกรณีนี้

### 2.4 Cursed turned คืนนั้นเลย (ไม่ใช่คืนถัดไป)
- คืนที่ถูกหมาป่ากัด → `/secret/cursed/{uid}/status = "turned"` ทันที
- คืนนั้นคนทรงเรียก Cursed → แจ้งปากเปล่า + ชี้หมาป่าคนอื่นให้รู้จัก
- หมาป่าฝั่งระบบรู้ว่า Cursed เป็นพวก → คืนถัดไป (`turnedNight + 1`)
- `canWolfSeeCursed(turnedNight, currentNight)` = `currentNight >= turnedNight + 1`

### 2.5 Hunter ตายกลางคืน → เช้ายิง, ตายกลางวัน → ยิงทันที
```javascript
hunterDie(uid, phase)
- phase === "night"        → shootPhase = "morning"
- phase === "lovers_night" → shootPhase = "morning"
- phase === "day"          → shootPhase = "immediate"
- phase === "lovers_day"   → shootPhase = "immediate"
```

### 2.6 ห้ามใช้ Firebase compat SDK
```javascript
// ✅ ถูก (v9 modular)
import { getDatabase, ref, set } from "firebase/database";

// ❌ ผิด
import firebase from "firebase/compat/app";
```

### 2.7 ห้ามใช้ Framework หนัก
- ❌ React, Vue, Angular, Svelte
- ✅ Vanilla JS (ES modules)
- ✅ Firebase SDK (จำเป็น)

### 2.8 Comments ภาษาไทย, Code ภาษาอังกฤษ
```javascript
// ✅ ถูก
function checkWin(players) {
  // เช็ก Fool ถูกโหวตออกหรือยัง
  if (players.foolVotedOut) return "fool";
}

// ❌ ผิด
function ตรวจชนะ(ผู้เล่น) { ... }
```

### 2.9 Mobile-first CSS เสมอ
```css
/* ✅ เริ่มจากมือถือ */
.player-card { font-size: 14px; }

/* แล้วค่อยขยาย */
@media (min-width: 768px) {
  .player-card { font-size: 16px; }
}
```

### 2.10 หลังเขียนทุกไฟล์ → รัน `git status` + เสนอ commit message
```
ไม่ต้อง commit เอง แค่เสนอ:
Suggested commit: "Add night system"
```

---

## 3) Data Schema (ห้ามเปลี่ยนโดยไม่ถาม)

```
/rooms/{code}/
  /meta/
    phase: "lobby" | "night" | "day" | "vote" | "hunter" | "end"
    hostUid: string
    hostUid2: string | null
    day: number
    settings: {
      revealRoleOnDeath: boolean,
      timers: { night, day, vote },
      useCenterCards: false,   // Phase 2
      useCustomRoles: false    // Phase 2
    }
    winner: null | "villagers" | "wolves" | "lovers" | "fool"

  /players/{uid}/
    name: string
    alive: boolean
    joinedAt: number
    voteTarget: string | null
    revealed: boolean          # Mayor เปิดตัวแล้ว?
    avatar: string

  /secret/roles/{uid}/
    role: string               # "werewolf", "seer", ...
    team: "wolf" | "village" | "neutral"

  /secret/cursed/{uid}/
    status: "village" | "turned"
    turnedNight: number | null

  /wolf/
    members: { [uid]: true }
    votes: { [wolfUid]: targetUid }
    victims: string[]
    knowsCursed: boolean

  /night/
    actions/{uid}/
      type: string
      target: string
      used: boolean

  /hunter/
    revealed: boolean
    uid: string | null
    target: string | null
    phase: "night_death" | "day_death" | null

  /lovers/
    pair: [uid1, uid2]

  /spectator/
    view: "full"
```

---

## 4) Roles ทั้งหมด (source of truth)

### 4.1 ฝ่ายชาวบ้าน
| id | ชื่อไทย | team | ความสามารถ |
|---|---|---|---|
| `villager` | ชาวบ้าน | village | – |
| `seer` | ผู้หยั่งรู้ | village | ตรวจ wolf/ไม่ใช่ 1 คน/คืน |
| `doctor` | หมอ | village | protect จาก wolf kill, ห้าม protect ตัวเอง |
| `hunter` | นายพราน | village | ตาย → ยิง 1 คน |
| `bodyguard` | บอดี้การ์ด | village | protect จาก wolf kill, protect ตัวเองได้, ห้ามซ้ำคนเดิม |
| `witch` | แม่มด | village | poison 1 + heal 1 (ไม่พร้อมกัน) |
| `cupid` | คิวปิด | village | คืนแรกเลือก Lovers 2 คน |
| `mayor` | นายกเทศมนตรี | village | เปิดตัว → 2 votes |
| `aura_seer` | ผู้หยั่งรู้ออร่า | village | ตรวจ role จริง |
| `mason` | ช่างก่ออิฐ | village | 2 คน รู้จักกัน |
| `diseased` | ผู้ติดโรค | village | ถูก wolf kill → wolf ฆ่าคนไม่ได้คืนถัดไป |
| `insomniac` | คนนอนไม่หลับ | village | ชนะกับชาวบ้าน |
| `cursed` | ผู้ต้องสาป | village→wolf | ถูกกัด → turned |

### 4.2 ฝ่ายหมาป่า
| id | ชื่อไทย | team | ความสามารถ |
|---|---|---|---|
| `werewolf` | หมาป่า | wolf | ร่วม kill |
| `wolf_cub` | ลูกหมาป่า | wolf | ตาย → wolf kill 2 คนคืนถัดไป |
| `sorceress` | แม่มดหมาป่า | wolf | หา Seer 1 คน/คืน (yes/no) |
| `minion` | สมุน | wolf | รู้ wolf แต่ wolf ไม่รู้, ไม่ร่วม kill |

### 4.3 ฝ่ายกลาง
| id | ชื่อไทย | team | ความสามารถ |
|---|---|---|---|
| `fool` | คนโง่ | neutral | ถูกโหวตออก → ชนะทันที |

---

## 5) Win Conditions (source of truth)

```javascript
/**
 * เช็กผู้ชนะ — ลำดับสำคัญมาก ห้ามสลับ
 * @param {Object} players - { uid: { alive, role, ... } }
 * @param {Object} lovers - { pair: [uid1, uid2] }
 * @param {Object} cursedStatuses - { uid: "village" | "turned" }
 * @param {Object} lastVoteResult - { foolVotedOut: boolean }
 * @returns {{ winner: string|null, reason: string }}
 */
export function checkWin(players, lovers, cursedStatuses, lastVoteResult) {
  // 1. Fool ถูกโหวตออก → ชนะเดี่ยว (สำคัญสุด)
  if (lastVoteResult?.foolVotedOut) {
    return { winner: "fool", reason: "Fool ถูกโหวตออก" };
  }

  // 2. Lovers ต่างฝ่ายเหลือ 2 คนสุดท้าย → ชนะ
  const alive = Object.entries(players).filter(([_, p]) => p.alive);
  if (lovers?.pair?.length === 2) {
    const [a, b] = lovers.pair;
    const aAlive = players[a]?.alive;
    const bAlive = players[b]?.alive;
    if (aAlive && bAlive && alive.length === 2) {
      const aTeam = getTeam(players[a].role, cursedStatuses?.[a]);
      const bTeam = getTeam(players[b].role, cursedStatuses?.[b]);
      if (aTeam !== bTeam) {
        return { winner: "lovers", reason: "Lovers ต่างฝ่ายเหลือ 2 คน" };
      }
    }
  }

  // 3. หมาป่า = 0 → ชาวบ้านชนะ
  const wolves = alive.filter(([uid, p]) =>
    isWolfTeam(p.role, cursedStatuses?.[uid])
  ).length;

  if (wolves === 0) {
    return { winner: "villagers", reason: "หมาป่าหมด" };
  }

  // 4. หมาป่า >= ชาวบ้าน → หมาป่าชนะ
  const villagers = alive.length - wolves;
  if (wolves >= villagers) {
    return { winner: "wolves", reason: "หมาป่า >= ชาวบ้าน" };
  }

  // 5. ยังไม่จบ
  return { winner: null, reason: "เล่นต่อ" };
}
```

---

## 6) Coding Conventions

### 6.1 โครงสร้างไฟล์ JS
```javascript
// 1. imports
import { getDatabase, ref, onValue } from "firebase/database";

// 2. constants
const MAX_PLAYERS = 16;

// 3. exports (เรียงตามตัวอักษร)
export function doSomething() {}

// 4. private helpers (ขึ้นต้นด้วย _)
function _helper() {}
```

### 6.2 Naming
| ประเภท | รูปแบบ | ตัวอย่าง |
|---|---|---|
| ตัวแปร | camelCase | `playerCount` |
| ค่าคงที่ | UPPER_SNAKE | `MAX_PLAYERS` |
| ฟังก์ชัน | camelCase | `checkWin()` |
| คลาส | PascalCase | `GameRoom` (ถ้ามี) |
| ไฟล์ | kebab-case | `win-check.js` |
| Firebase path | camelCase | `/rooms/{code}/secretRoles` |

### 6.3 Error Handling
```javascript
// ✅ ใช้ try/catch สำหรับ async
async function joinRoom(code, name) {
  try {
    const snap = await get(ref(db, `rooms/${code}`));
    if (!snap.exists()) throw new Error("ห้องไม่มี");
    return snap.val();
  } catch (err) {
    console.error("[joinRoom]", err);
    throw err;
  }
}
```

### 6.4 Comments ภาษาไทย
```javascript
// คำนวณจำนวนหมาป่าที่ยังมีชีวิต
function countAliveWolves(players) {
  // กรองเฉพาะหมาป่าที่ยัง alive
  return Object.values(players)
    .filter(p => p.alive && isWolfTeam(p.role))
    .length;
}
```

---

## 7) Firebase Patterns

### 7.1 Init (public/src/firebase.js)
```javascript
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "PLACEHOLDER",
  authDomain: "PLACEHOLDER",
  databaseURL: "PLACEHOLDER",
  projectId: "PLACEHOLDER",
  // ...
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// Anonymous auth ครั้งแรก
export async function ensureAuth() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  return auth.currentUser.uid;
}
```

### 7.2 Listen Realtime
```javascript
import { ref, onValue } from "firebase/database";

export function listenRoom(code, callback) {
  const roomRef = ref(db, `rooms/${code}`);
  return onValue(roomRef, (snap) => {
    if (snap.exists()) callback(snap.val());
  });
}
```

### 7.3 Atomic Update
```javascript
import { ref, update } from "firebase/database";

export async function updatePlayer(code, uid, data) {
  await update(ref(db, `rooms/${code}/players/${uid}`), data);
}
```

---

## 8) Security Rules Summary

> Rules ฉบับเต็มอยู่ใน `firebase-rules.json`

| Path | Read | Write |
|---|---|---|
| `/meta` | all | host |
| `/players` | all | self + host |
| `/players/{uid}/voteTarget` | all | self only |
| `/secret/roles/{uid}` | self + host | host |
| `/secret/cursed/{uid}` | cursed + host + wolf(after) | host |
| `/wolf` | wolf + host | wolf + host |
| `/night` | host | self |
| `/hunter` | all (after reveal) | hunter + host |
| `/lovers` | all | host |
| `/spectator` | host | – |

---

## 9) Git Workflow

### 9.1 หลังเขียนโค้ดทุกครั้ง
```bash
git status
# → ดูว่าไฟล์ไหนเปลี่ยน
```

### 9.2 เสนอ commit message (ห้าม commit เอง)
```
Suggested commit: "Add night system + cursed logic"
```

### 9.3 รูปแบบ commit message
```
<verb> <what>
- Add: เพิ่มฟีเจอร์ใหม่
- Fix: แก้บั๊ก
- Update: ปรับปรุง
- Remove: ลบ
- Refactor: ปรับโครงสร้าง
```

---

## 10) สิ่งที่ห้ามทำ (Anti-patterns)

| ❌ ห้าม | ✅ ทำแทน |
|---|---|
| เก็บ role ใน `/players` | เก็บใน `/secret/roles/{uid}` |
| ใช้ Firebase compat | ใช้ v9 modular |
| เขียน logic ใน HTML | แยกเป็นไฟล์ .js |
| ใช้ React/Vue | Vanilla JS |
| เปลี่ยนชื่อไฟล์ตามใจ | ใช้ชื่อตามข้อ 1 |
| commit เอง | เสนอ commit message |
| เพิ่มฟีเจอร์ Phase 2 | ทำ MVP ก่อน |
| ใช้ `var` | ใช้ `const`/`let` |
| เขียน comment อังกฤษ | comment ภาษาไทย |
| ลบไฟล์โดยไม่ถาม | ถามก่อนเสมอ |

---

## 11) ลำดับการทำงาน (แนะนำ)

```
1. อ่าน AGENTS.md (ไฟล์นี้)
2. อ่าน แผนโปรเจค-v2.2.md
3. ตรวจ ls -la ว่าไฟล์ครบไหม
4. ยืนยันเข้าใจใน 3 บรรทัด
5. ถามคำถาม 1 ข้อ (ถ้ามี)
6. เริ่มเขียนโค้ด
7. หลังเขียนเสร็จ → git status + เสนอ commit
```

---

## 12) คำถามที่พบบ่อย (FAQ)

**Q: ถ้าไม่แน่ใจใน logic ทำไง?**
A: ถามก่อน อย่าเดา

**Q: ถ้าเจอ bug ในแผนทำไง?**
A: รายงาน ไม่แก้เอง

**Q: ถ้าต้องใช้ library เพิ่ม?**
A: ถามก่อนติดตั้ง

**Q: ถ้า test ไม่ผ่าน?**
A: รายงาน + เสนอวิธีแก้ 2 แบบ

**Q: ถ้าหมด context?**
A: รายงาน + ให้ host เปิด session ใหม่

---

## 13) Quick Reference

```
Entry point: public/index.html
Game logic: public/src/game.js
Win check: public/src/win-check.js
Firebase: public/src/firebase.js
CSS: public/src/style.css
Rules: firebase-rules.json
Plan: แผนโปรเจค-v2.2.md

Firebase DB: /rooms/{code}/
Anonymous auth: signInAnonymously()
Node: ≥ 18
Firebase SDK: v9 modular
```

---

> 📌 **AGENTS.md v1.0** — ปรับปรุงล่าสุดตามแผน v2.2
> ไฟล์นี้เป็น source of truth สำหรับ AI Agent
> ห้ามแก้โดยไม่แจ้ง host
// State machine + assignRoles (pure — ทดสอบด้วย node ได้ ไม่แตะ Firebase)
// ตามแผนข้อ 14.2 (จำนวนหมาป่า) + แพ็ก MVP: Werewolf + Seer + Doctor + Hunter + Cupid

import { ROLE } from "./roles.js";

// จำนวนหมาป่าตาม Balance Target (แผนข้อ 14.2)
// 5-6→2, 7-8→2, 9→3, 10-12→3, 13-14→3, 15-16→4
export const WOLF_COUNT = {
  5: 2, 6: 2, 7: 2, 8: 2, 9: 3,
  10: 3, 11: 3, 12: 3, 13: 3, 14: 3, 15: 4, 16: 4,
};

// ลำดับบทบาทพิเศษที่จะแทรกเข้า deck (ตัดทีหลังเมื่อเหลือคนน้อย)
const SPECIAL_ORDER = ["seer", "doctor", "hunter", "cupid"];

// จำนวนหมาป่าที่แนะนำสำหรับจำนวนผู้เล่น
export function wolfCountFor(playerCount) {
  return WOLF_COUNT[playerCount] ?? 2;
}

// สร้างสำรับบทบาท (length = playerCount, จำนวนหมาป่าตาม wolfCount)
export function buildDeck(playerCount, wolfCount) {
  const deck = new Array(wolfCount).fill("werewolf");

  // แทรกบทบาทพิเศษตามลำดับ priority ตราบใดที่ยังมีที่ว่าง
  let specialIndex = 0;
  while (deck.length < playerCount && specialIndex < SPECIAL_ORDER.length) {
    deck.push(SPECIAL_ORDER[specialIndex]);
    specialIndex += 1;
  }

  // ส่วนที่เหลือเป็นชาวบ้านธรรมดา
  while (deck.length < playerCount) {
    deck.push("villager");
  }

  return deck;
}

// Fisher-Yates shuffle (ไม่ mut ต้นฉบับ)
function _shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// แจกบทบาทให้ผู้เล่นสุ่ม — คืน { assignments: uid→role, wolfMembers: uid→true }
export function assignRoles(playerUids, options = {}) {
  const n = playerUids.length;
  const wolfCount = options.wolfCount ?? wolfCountFor(n);
  const deck = _shuffle(buildDeck(n, wolfCount));
  const uids = _shuffle(playerUids);

  const assignments = {};
  const wolfMembers = {};

  uids.forEach((uid, i) => {
    const role = deck[i];
    assignments[uid] = role;
    if (ROLE[role].team === "wolf") wolfMembers[uid] = true;
  });

  return { assignments, wolfMembers, wolfCount };
}
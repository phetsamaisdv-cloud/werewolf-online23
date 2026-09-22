// Night system (pure) — ลำดับกลางคืน + นับโหวตหมาป่า + คำนวณผลกลางคืน
// ไม่แตะ Firebase — ทดสอบด้วย node ได้ (ส่วนที่เขียน DB อยู่ host-control.js)

// ลำดับเรียกบทบาท (แผนข้อ 3.1) — sorceress ร่วมฆ่ากับหมาป่า
export const NIGHT_ORDER = [
  { key: "cupid", roles: ["cupid"] },
  { key: "seer", roles: ["seer", "aura_seer"] },
  { key: "guard", roles: ["doctor", "bodyguard"] },
  { key: "witch", roles: ["witch"] },
  { key: "sorceress", roles: ["sorceress"] },
  { key: "wolf", roles: ["werewolf", "wolf_cub", "sorceress"] },
  { key: "cursed", roles: ["cursed"] },
];

// บทบาทที่ตรงกับ key ในลำดับกลางคืน
export function nightRolesFor(key) {
  const step = NIGHT_ORDER.find((s) => s.key === key);
  return step ? step.roles : [];
}

// ลำดับกลางคืนทั้งหมด (คัดลอกใหม่ทุกครั้ง ป้องกันแก้ข้อมูลต้นทาง)
export function getNightOrder() {
  return NIGHT_ORDER.map((s) => ({ key: s.key, roles: [...s.roles] }));
}

// บทบาท active ทั้งหมด (ผู้เล่น alive) จาก room state
export function getActiveRoles(players) {
  const roles = new Set();
  Object.values(players || {}).forEach((p) => {
    if (p?.alive && p?.role) roles.add(p.role);
  });
  return [...roles];
}

// นับคะแนนโหวตหมาป่า ให้อันดับบนสุด ใครได้มากสุดชนะ (เสมอ → tie)
// @param votes { [wolfUid]: targetUid }
// @returns { counts, winners, tie, maxCount }
export function countWolfVotes(votes = {}) {
  const counts = {};
  Object.entries(votes).forEach(([_, target]) => {
    if (!target) return;
    counts[target] = (counts[target] || 0) + 1;
  });

  let maxCount = 0;
  let winners = [];
  for (const [target, c] of Object.entries(counts)) {
    if (c > maxCount) {
      maxCount = c;
      winners = [target];
    } else if (c === maxCount) {
      winners.push(target);
    }
  }
  return { counts, winners, tie: winners.length > 1, maxCount };
}

// เป้าหมายบนสุด n อันดับ (ตามคะแนน) — ใช้ตอน Wolf Cub ตาย → ฆ่า 2 คน
function _topDistinctTargets(counts, n) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([target]) => target);
}

/**
 * คำนวณผลลัพธ์กลางคืน (pure)
 * @param {Object} room
 *   - players: { uid: { role, alive, ... } }
 *   - actions: { uid: { type, target, ... } }   (จาก /night/actions)
 *   - wolfVotes: { wolfUid: targetUid }           (จาก /wolf/votes)
 * @param {Object} options
 *   - doubleKill: boolean  (Wolf Cub ตายคืนก่อน → ฆ่า 2 คน)
 *   - night: number        (คืนที่เท่าไหร่ ใช้ set turnedNight)
 * @returns { killedByWolf, finalWolfVictims, protectedUids, poisoned, nightDeaths, cursedTurned }
 */
export function resolveNight(room, options = {}) {
  const players = room.players || {};
  const actionsRaw = room.actions || {};
  const votes = room.wolfVotes || {};
  const doubleKill = Boolean(options.doubleKill);
  const night = options.night ?? 1;

  // กรองเฉพาะ action ของคืนนี้ (action ที่เขียน field night ต่างคืน → ข้าม)
  const actions = {};
  Object.entries(actionsRaw).forEach(([uid, a]) => {
    if (a && (a.night === undefined || a.night === night)) actions[uid] = a;
  });

  // 1. หมาป่าโหวต → เหยื่อที่ชนะ
  const { counts, winners, tie } = countWolfVotes(votes);
  let killedByWolf = [];
  if (counts && winners.length) {
    killedByWolf = doubleKill ? _topDistinctTargets(counts, 2) : (tie ? [] : winners);
  }

  // 2. หมอ / บอดี้การ์ด / Witch ยาป้องกัน → ช่วยรอดจาก wolf kill
  const protectedUids = new Set();
  Object.entries(actions).forEach(([uid, a]) => {
    if (!a?.target) return;
    if (a.type === "doctor" || a.type === "bodyguard" || a.type === "witch_heal") {
      protectedUids.add(a.target);
    }
  });

  const finalWolfVictims = killedByWolf.filter((uid) => !protectedUids.has(uid));

  // 3. Witch ยาพิษ → ตายทันที (ห้ามใช้ยาพร้อมกัน — ถ้าใช้ทั้งคู่ให้ poison ไม่มีผล)
  let poisoned = null;
  const witchActions = Object.entries(actions).filter(([, a]) => a?.type === "witch_poison" || a?.type === "witch_heal");
  const witchPoisoned = witchActions.filter(([, a]) => a.type === "witch_poison");
  if (witchPoisoned.length === 1 && !witchActions.some(([, a]) => a.type === "witch_heal")) {
    poisoned = witchPoisoned[0][1].target;
  }

  // 4. เหยื่อ Cursed → กลายเป็นหมาป่าคืนนั้นเลย (แผนข้อ 2.4)
  const cursedTurned = finalWolfVictims
    .filter((uid) => players[uid]?.role === "cursed")
    .map((uid) => ({ uid, status: "turned", turnedNight: night }));

  // 5. รวมผู้ตายกลางคืน (ไม่นับซ้ำ)
  const nightDeaths = [...new Set([...finalWolfVictims, ...(poisoned ? [poisoned] : [])])];

  return {
    killedByWolf,
    finalWolfVictims,
    protectedUids: [...protectedUids],
    poisoned,
    nightDeaths,
    cursedTurned,
  };
}
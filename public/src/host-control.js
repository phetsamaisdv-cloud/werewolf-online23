// Host actions — เขียน Firebase (เฉพาะ host ใช้)
// ตามแผนข้อ 19.4: เรียก role, เปลี่ยน phase, จัดการ Cursed reveal, host transfer

import { ensureAuth, getRoom, updateRoom, setRoomPath } from "./firebase.js";

// เปลี่ยน phase ของห้อง
export async function setPhase(code, phase) {
  try {
    await updateRoom(code, { "meta/phase": phase });
  } catch (err) {
    console.error("[setPhase]", err);
    throw err;
  }
}

// ตั้งเลขคืน (กลางคืนคืนที่เท่าไหร่)
export async function setNight(code, night) {
  try {
    await updateRoom(code, { "meta/night": night });
  } catch (err) {
    console.error("[setNight]", err);
    throw err;
  }
}

// คนทรงเรียกบทบาท → ทุกอุปกรณ์เห็น activeRole นี้
export async function callRole(code, roleKey) {
  try {
    await updateRoom(code, { "meta/activeRole": roleKey });
  } catch (err) {
    console.error("[callRole]", err);
    throw err;
  }
}

// จบการเรียกบทบาท
export async function endCall(code) {
  try {
    await updateRoom(code, { "meta/activeRole": null });
  } catch (err) {
    console.error("[endCall]", err);
    throw err;
  }
}

// host ตั้งคู่รักด้วยมือ (หรือยืนยันจาก cupid)
export async function setLovers(code, pair) {
  try {
    await setRoomPath(code, "lovers", { pair });
  } catch (err) {
    console.error("[setLovers]", err);
    throw err;
  }
}

// host แจ้งสถานะ Cursed เป็น village/turned (สำหรับคืนที่ถูกกัด OOC)
export async function setCursedStatus(code, uid, status, turnedNight) {
  try {
    await setRoomPath(code, `secret/cursed/${uid}`, {
      status,
      turnedNight: status === "turned" ? turnedNight ?? null : null,
    });
  } catch (err) {
    console.error("[setCursedStatus]", err);
    throw err;
  }
}

/**
 * ใช้ผลกลางคืน: ผู้ตาย + Cursed turned + ล้าง actions/votes + เปลี่ยน phase
 * @param {Object} result - จาก resolveNight() ใน night.js
 * @param {Object} opts - { night, nextPhase }
 */
export async function applyNightResult(code, result, opts = {}) {
  try {
    const { nightDeaths, cursedTurned, finalWolfVictims, poisoned, killedByWolf } = result;
    const nextPhase = opts.nextPhase ?? "day";
    const night = opts.night ?? 1;

    const updates = {
      "meta/phase": nextPhase,
      "meta/activeRole": null,
      "night/result": {
        night,
        wolfVictims: finalWolfVictims,
        killedByWolf,
        poisoned: poisoned ?? null,
        deaths: nightDeaths,
      },
      // ล้างโหวตหมาป่าคืนแล้วเพื่อเริ่มคืนใหม่ (actions เก็บไว้ — resolveNight กรองตาม night)
      "wolf/votes": null,
    };

    nightDeaths.forEach((uid) => {
      updates[`players/${uid}/alive`] = false;
    });

    cursedTurned.forEach((c) => {
      updates[`secret/cursed/${c.uid}`] = { status: c.status, turnedNight: c.turnedNight };
    });

    await updateRoom(code, updates);
  } catch (err) {
    console.error("[applyNightResult]", err);
    throw err;
  }
}

// โอนสิทธิ์คนทรง (แผนข้อ 3.6) — hostUid → newUid, hostUid2 = คนเดิม
export async function transferHost(code, newUid) {
  try {
    const room = await getRoom(code);
    if (!room?.meta) throw new Error("ห้องไม่มี");
    const oldHost = room.meta.hostUid;
    if (oldHost === newUid) throw new Error("คนนั้นเป็นคนทรงอยู่แล้ว");

    await updateRoom(code, {
      "meta/hostUid": newUid,
      "meta/hostUid2": oldHost,
    });
    return true;
  } catch (err) {
    console.error("[transferHost]", err);
    throw err;
  }
}
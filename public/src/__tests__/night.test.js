// Unit test: night.js — ลำดับ + โหวตหมาป่า + resolveNight
import test from "node:test";
import assert from "node:assert/strict";

import {
  NIGHT_ORDER,
  getNightOrder,
  getActiveRoles,
  nightRolesFor,
  countWolfVotes,
  resolveNight,
} from "../night.js";

const _p = (role, alive = true) => ({ role, alive });

test("night: NIGHT_ORDER ตามแผนข้อ 3.1 (Cupid→Seer→Guard→Witch→Sorceress→Wolf→Cursed)", () => {
  assert.deepEqual(
    NIGHT_ORDER.map((s) => s.key),
    ["cupid", "seer", "guard", "witch", "sorceress", "wolf", "cursed"]
  );
});

test("night: nightRolesFor ตรงตาม NIGHT_ORDER", () => {
  assert.deepEqual(nightRolesFor("wolf"), ["werewolf", "wolf_cub", "sorceress"]);
  assert.deepEqual(nightRolesFor("cupid"), ["cupid"]);
  assert.deepEqual(nightRolesFor("nope"), []);
});

test("night: getNightOrder คืนสำเนาใหม่ (แก้ไม่กระทบต้นทาง)", () => {
  const order = getNightOrder();
  order[0].roles.push("hacker");
  assert.deepEqual(NIGHT_ORDER[0].roles, ["cupid"]);
});

test("night: getActiveRoles เฉพาะผู้เล่น alive + มี role", () => {
  const players = { a: _p("werewolf"), b: _p("cursed", false), c: _p("seer") };
  assert.deepEqual(getActiveRoles(players).sort(), ["seer", "werewolf"]);
});

test("night: countWolfVotes เสียงข้างมากชนะ", () => {
  const res = countWolfVotes({ w1: "a", w2: "a", w3: "b" });
  assert.equal(res.winners.length, 1);
  assert.equal(res.winners[0], "a");
  assert.equal(res.maxCount, 2);
  assert.equal(res.tie, false);
  assert.deepEqual(res.counts, { a: 2, b: 1 });
});

test("night: countWolfVotes เสมอ → tie, ไม่มีผู้ชนะ", () => {
  const res = countWolfVotes({ w1: "a", w2: "b" });
  assert.equal(res.tie, true);
  assert.deepEqual(res.winners, ["a", "b"]);
});

test("night: countWolfVotes ไม่มีโหวต", () => {
  const res = countWolfVotes({});
  assert.equal(res.maxCount, 0);
  assert.deepEqual(res.winners, []);
  assert.equal(res.tie, false);
});

test("night: resolveNight หมาป่าเสียงข้างมาก → เหยื่อตาย", () => {
  const res = resolveNight({
    players: { a: _p("villager"), b: _p("villager") },
    actions: {},
    wolfVotes: { w1: "a", w2: "a" },
  }, { night: 1 });
  assert.deepEqual(res.finalWolfVictims, ["a"]);
  assert.deepEqual(res.nightDeaths, ["a"]);
});

test("night: resolveNight เสมอ → ไม่มีใครตายจากหมาป่า", () => {
  const res = resolveNight({
    players: { a: _p("villager"), b: _p("villager") },
    actions: {},
    wolfVotes: { w1: "a", w2: "b" },
  });
  assert.deepEqual(res.finalWolfVictims, []);
});

test("night: resolveNight หมอ protect → รอดจาก wolf kill", () => {
  const res = resolveNight({
    players: { a: _p("villager"), d: _p("doctor") },
    actions: { d: { type: "doctor", target: "a" } },
    wolfVotes: { w1: "a" },
  });
  assert.deepEqual(res.finalWolfVictims, []);
  assert.deepEqual(res.protectedUids, ["a"]);
  assert.deepEqual(res.nightDeaths, []);
});

test("night: resolveNight บอดี้การ์ด + Witch heal ป้องกันได้", () => {
  const res = resolveNight({
    players: { a: _p("villager"), bg: _p("bodyguard"), w: _p("witch") },
    actions: {
      bg: { type: "bodyguard", target: "a" },
      w: { type: "witch_heal", target: "a" }, // witch ไม่ได้มีคนเดียว
    },
    wolfVotes: { w1: "a" },
  });
  assert.deepEqual(res.finalWolfVictims, []);
});

test("night: resolveNight Witch poison → ตาย", () => {
  const res = resolveNight({
    players: { a: _p("villager"), w: _p("witch") },
    actions: { w: { type: "witch_poison", target: "a" } },
    wolfVotes: {},
  });
  assert.equal(res.poisoned, "a");
  assert.deepEqual(res.nightDeaths, ["a"]);
});

test("night: resolveNight Witch ใช้ poison + heal พร้อมกัน → poison ไม่มีผล", () => {
  const res = resolveNight({
    players: { a: _p("villager"), b: _p("villager"), w: _p("witch") },
    actions: {
      w: { type: "witch_poison", target: "b" },
      w2: { type: "witch_heal", target: "a" },
    },
    wolfVotes: { w1: "a" },
  });
  // ใช้ทั้งคู่ (ผิดกฎ) → poison ยกเว้น, a ถูกรอดจาก heal → ไม่มีใครตาย
  assert.equal(res.poisoned, null);
  assert.deepEqual(res.nightDeaths, []);
});

test("night: resolveNight เหยื่อ Cursed → turned ทันที (แผนข้อ 2.4)", () => {
  const res = resolveNight({
    players: { a: _p("cursed"), b: _p("villager") },
    actions: {},
    wolfVotes: { w1: "a" },
  }, { night: 2 });
  assert.deepEqual(res.cursedTurned, [{ uid: "a", status: "turned", turnedNight: 2 }]);
  assert.deepEqual(res.finalWolfVictims, ["a"]);
});

test("night: resolveNight doubleKill (Wolf Cub ตายคืนก่อน) → ฆ่า 2 คน", () => {
  const res = resolveNight({
    players: { a: _p("villager"), b: _p("villager"), c: _p("villager") },
    actions: {},
    wolfVotes: { w1: "b", w2: "c", w3: "b" },
  }, { doubleKill: true });
  // คะแนน: b=2, c=1 → 2 อันดับแรก = b, c
  assert.deepEqual([...res.finalWolfVictims].sort(), ["b", "c"]);
});

test("night: resolveNight doubleKill แต่โหวตแค่เป้าเดียว → ฆ่า 1 คน", () => {
  const res = resolveNight({
    players: { a: _p("villager"), b: _p("villager") },
    actions: {},
    wolfVotes: { w1: "a", w2: "a" },
  }, { doubleKill: true });
  assert.deepEqual(res.finalWolfVictims, ["a"]);
});

test("night: resolveNight nightDeaths ไม่นับซ้ำ (ถูกหมาป่า + poison คนเดียวกัน)", () => {
  const res = resolveNight({
    players: { a: _p("villager"), w: _p("witch") },
    actions: { w: { type: "witch_poison", target: "a" } },
    wolfVotes: { w1: "a" },
  });
  assert.deepEqual(res.nightDeaths, ["a"]);
});

test("night: resolveNight ข้าม action ที่เป็นคืนก่อน (field night ต่าง)", () => {
  const res = resolveNight({
    players: { a: _p("villager"), w: _p("witch") },
    actions: {
      w: { type: "witch_poison", target: "a", night: 1 },   // คืนก่อน
      d: { type: "doctor", target: "b", night: 2 },          // คืนนี้: protect b
    },
    wolfVotes: { w1: "b" },
  }, { night: 2 });
  // poison คืน 1 ถูกละเว้น (ไม่มี poison), doctor ปกป้อง b → b รอด
  assert.equal(res.poisoned, null);
  assert.deepEqual(res.finalWolfVictims, []);
});

test("night: resolveNight action ที่มี night เท่ากันถูกนับ", () => {
  const res = resolveNight({
    players: { a: _p("villager"), w: _p("witch") },
    actions: { w: { type: "witch_poison", target: "a", night: 3 } },
    wolfVotes: {},
  }, { night: 3 });
  assert.equal(res.poisoned, "a");
});
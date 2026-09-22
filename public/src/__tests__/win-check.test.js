// Unit test: roles + win-check (ใช้ node:test มีใน Node ≥18)
import test from "node:test";
import assert from "node:assert/strict";

import { ROLE, TEAM, getTeam, isWolfTeam } from "../roles.js";
import { checkWin } from "../win-check.js";

// helper สร้างผู้เล่น
const _p = (role, alive = true) => ({ role, alive });

// ─────────────────────────────────────────────
// roles.js
// ─────────────────────────────────────────────
test("roles: มีบทบาทครบทุก role", () => {
  const ids = Object.keys(ROLE).sort();
  assert.deepEqual(ids, [
    "aura_seer", "bodyguard", "cupid", "cursed", "diseased", "doctor",
    "fool", "hunter", "insomniac", "mason", "mayor", "minion",
    "seer", "sorceress", "villager", "werewolf", "witch", "wolf_cub",
  ]);
});

test("roles: ทุก role มี field ครบ (id, nameTH, nameEN, team, description, iconPath)", () => {
  for (const [id, r] of Object.entries(ROLE)) {
    assert.equal(r.id, id);
    assert.ok(r.nameTH, `${id}: nameTH หาย`);
    assert.ok(r.nameEN, `${id}: nameEN หาย`);
    assert.ok([TEAM.WOLF, TEAM.VILLAGE, TEAM.NEUTRAL].includes(r.team), `${id}: team ผิด`);
    assert.ok(r.description, `${id}: description หาย`);
    assert.ok(r.iconPath, `${id}: iconPath หาย`);
  }
});

test("roles: getTeam คืนฝ่ายที่ถูกต้อง", () => {
  assert.equal(getTeam("werewolf"), TEAM.WOLF);
  assert.equal(getTeam("minion"), TEAM.WOLF);
  assert.equal(getTeam("villager"), TEAM.VILLAGE);
  assert.equal(getTeam("fool"), TEAM.NEUTRAL);
  assert.equal(getTeam("no_such_role"), null);
});

test("roles: isWolfTeam ครบทุก role", () => {
  for (const id of Object.keys(ROLE)) {
    const wolf = [TEAM.WOLF].includes(ROLE[id].team);
    assert.equal(isWolfTeam(id), wolf, `${id}`);
  }
});

test("roles: cursed ยัง village → หลัง turned → wolf", () => {
  assert.equal(getTeam("cursed"), TEAM.VILLAGE);
  assert.equal(isWolfTeam("cursed"), false);
  assert.equal(isWolfTeam("cursed", "village"), false);
  assert.equal(isWolfTeam("cursed", "turned"), true);
  assert.equal(isWolfTeam("cursed", { status: "turned", turnedNight: 2 }), true);
});

// ─────────────────────────────────────────────
// win-check.js — ทุกกรณีตาม AGENTS.md ข้อ 5 + แผนข้อ 5.3
// ─────────────────────────────────────────────

test("win: หมาป่า 1 ชาวบ้าน 3 → เล่นต่อ (null)", () => {
  const res = checkWin(
    { a: _p("werewolf"), b: _p("villager"), c: _p("villager"), d: _p("villager") },
    null, {}, null
  );
  assert.deepEqual(res, { winner: null, reason: "เล่นต่อ" });
});

test("win: หมาป่า 2 ชาวบ้าน 2 → หมาป่าชนะ", () => {
  const res = checkWin(
    { a: _p("werewolf"), b: _p("werewolf"), c: _p("villager"), d: _p("villager") },
    null, {}, null
  );
  assert.equal(res.winner, "wolves");
});

test("win: Cursed turned = หมาป่า (2 หมาป่า >= 1 ชาวบ้าน)", () => {
  const res = checkWin(
    { a: _p("werewolf"), b: _p("cursed"), c: _p("villager") },
    null, { b: "turned" }, null
  );
  assert.equal(res.winner, "wolves");
});

test("win: Cursed ยังไม่ turned = ชาวบ้าน (ต่อ)", () => {
  const res = checkWin(
    { a: _p("werewolf"), b: _p("cursed"), c: _p("villager") },
    null, { b: "village" }, null
  );
  assert.equal(res.winner, null);
});

test("win: Minion นับเป็นหมาป่า (Minion 1 + ชาวบ้าน 1)", () => {
  const res = checkWin(
    { a: _p("minion"), b: _p("villager") },
    null, {}, null
  );
  assert.equal(res.winner, "wolves");
});

test("win: หมาป่าหมด → ชาวบ้านชนะ", () => {
  const res = checkWin(
    { a: _p("villager"), b: _p("seer"), c: _p("hunter"), d: _p("cursed") },
    null, { d: "village" }, null
  );
  assert.deepEqual(res, { winner: "villagers", reason: "หมาป่าหมด" });
});

test("win: ผู้เล่นตายไม่นับ (หมาป่าตายแล้ว)", () => {
  const res = checkWin(
    { a: _p("werewolf", false), b: _p("villager"), c: _p("villager") },
    null, {}, null
  );
  assert.equal(res.winner, "villagers");
});

test("win: Fool ถูกโหวตออก → Fool ชนะ (สำคัญสุด)", () => {
  const res = checkWin(
    { a: _p("fool"), b: _p("werewolf"), c: _p("villager") },
    null, {}, { foolVotedOut: true }
  );
  assert.deepEqual(res, { winner: "fool", reason: "Fool ถูกโหวตออก" });
});

test("win: Fool ถูกโหวตพร้อม Lovers ต่างฝ่าย → Fool ชนะเดี่ยว", () => {
  // โจทย์ AGENTS ข้อ 5.4: Fool มาก่อน Lovers เสมอ
  const res = checkWin(
    { a: _p("werewolf"), b: _p("villager") },
    { pair: ["a", "b"] },
    {},
    { foolVotedOut: true }
  );
  assert.equal(res.winner, "fool");
});

test("win: Lovers ต่างฝ่ายเหลือ 2 คนสุดท้าย → Lovers ชนะ", () => {
  const res = checkWin(
    { a: _p("werewolf"), b: _p("villager") },
    { pair: ["a", "b"] },
    {},
    {}
  );
  assert.deepEqual(res, { winner: "lovers", reason: "Lovers ต่างฝ่ายเหลือ 2 คน" });
});

test("win: Lovers ต่างฝ่าย แต่มีคนที่ 3 → ต่อ", () => {
  const res = checkWin(
    { a: _p("werewolf"), b: _p("villager"), c: _p("villager") },
    { pair: ["a", "b"] },
    {},
    {}
  );
  assert.equal(res.winner, null);
});

test("win: Lovers ฝ่ายเดียวกันเหลือ 2 คน → ต่อไม่ได้ (หมาป่า 0 → ชาวบ้านชนะ)", () => {
  const res = checkWin(
    { a: _p("villager"), b: _p("villager") },
    { pair: ["a", "b"] },
    {},
    {}
  );
  assert.equal(res.winner, "villagers");
});

test("win: ไม่มี lastVoteResult → ไม่ crash", () => {
  const res = checkWin(
    { a: _p("werewolf"), b: _p("villager"), c: _p("villager") },
    null, {}, { foolVotedOut: undefined }
  );
  assert.equal(res.winner, null);
});

test("win: เรียกโดยไม่มี lovers/cursedStatus → ทำงานได้", () => {
  const res = checkWin({ a: _p("werewolf"), b: _p("villager") });
  assert.equal(res.winner, "wolves");
});
// Unit test: game.js — assignRoles + deck + wolf count
import test from "node:test";
import assert from "node:assert/strict";

import { ROLE } from "../roles.js";
import {
  WOLF_COUNT,
  wolfCountFor,
  buildDeck,
  assignRoles,
} from "../game.js";

const _uids = (n) => Array.from({ length: n }, (_, i) => `uid${i}`);

test("game: wolfCountFor ตรงกับตาราง 14.2 (5-16)", () => {
  const expected = {
    5: 2, 6: 2, 7: 2, 8: 2, 9: 3, 10: 3, 11: 3, 12: 3, 13: 3, 14: 3, 15: 4, 16: 4,
  };
  for (const [n, wolves] of Object.entries(expected)) {
    assert.equal(wolfCountFor(Number(n)), wolves, `n=${n}`);
  }
  assert.equal(wolfCountFor(99), 2, "นอกตาราง → default 2");
  assert.equal(WOLF_COUNT[5], 2);
});

test("game: buildDeck มีขนาดเท่าจำนวนผู้เล่นเสมอ", () => {
  for (let n = 5; n <= 16; n += 1) {
    const deck = buildDeck(n, wolfCountFor(n));
    assert.equal(deck.length, n, `n=${n}`);
  }
});

test("game: buildDeck มีหมาป่าตาม wolfCount", () => {
  for (let n = 5; n <= 16; n += 1) {
    const wolves = wolfCountFor(n);
    const deck = buildDeck(n, wolves);
    const count = deck.filter((r) => r === "werewolf").length;
    assert.equal(count, wolves, `n=${n}`);
  }
});

test("game: buildDeck บทบาทล้วนถูกต้องตาม ROLE", () => {
  const deck = buildDeck(16, wolfCountFor(16));
  for (const role of deck) {
    assert.ok(ROLE[role], `role ไม่รู้จัก: ${role}`);
  }
});

test("game: buildDeck สำรับ 5 คน = 2 หมาป่า + Seer + Doctor + Hunter (ลำดับ priority)", () => {
  const deck = buildDeck(5, 2);
  const counts = {};
  deck.forEach((r) => (counts[r] = (counts[r] || 0) + 1));
  assert.equal(counts.werewolf, 2);
  assert.equal(counts.seer, 1);
  assert.equal(counts.doctor, 1);
  assert.equal(counts.hunter, 1);
  assert.equal(counts.cupid, undefined, "5 คนไม่มีที่ว่างให้ cupid");
});

test("game: buildDeck 16 คน = 4 หมาป่า + พิเศษครบ + เหลือเป็นชาวบ้าน", () => {
  const deck = buildDeck(16, 4);
  const counts = {};
  deck.forEach((r) => (counts[r] = (counts[r] || 0) + 1));
  assert.equal(counts.werewolf, 4);
  assert.equal(counts.seer, 1);
  assert.equal(counts.doctor, 1);
  assert.equal(counts.hunter, 1);
  assert.equal(counts.cupid, 1);
  assert.equal(counts.villager, 8);
});

test("game: assignRoles ครอบคลุมผู้เล่นครบ ไม่ซ้ำ", () => {
  const uids = _uids(8);
  const { assignments } = assignRoles(uids);
  const assigned = Object.keys(assignments);
  assert.equal(assigned.length, uids.length);
  assert.deepEqual([...assigned].sort(), [...uids].sort());
});

test("game: assignRoles ตอนนี้ wolfMembers ตรงกับหมาป่าใน assignments", () => {
  const uids = _uids(9);
  const { assignments, wolfMembers, wolfCount } = assignRoles(uids);
  assert.equal(wolfCount, 3);

  const expectedWolf = Object.entries(assignments)
    .filter(([, role]) => ROLE[role].team === "wolf")
    .map(([uid]) => uid);

  assert.equal(Object.keys(wolfMembers).length, expectedWolf.length);
  for (const uid of expectedWolf) {
    assert.equal(wolfMembers[uid], true, `${uid} ควรเป็น wolf member`);
  }
});

test("game: assignRoles wolfCount ที่กำหนดเองถูกใช้", () => {
  const uids = _uids(6);
  const { assignments, wolfMembers } = assignRoles(uids, { wolfCount: 1 });
  const wolves = Object.values(assignments).filter((r) => r === "werewolf").length;
  assert.equal(wolves, 1);
  assert.equal(Object.keys(wolfMembers).length, 1);
});

test("game: assignRoles ไม่แชร์อาร์เรย์ต้นฉบับ", () => {
  const uids = _uids(5);
  const before = [...uids];
  assignRoles(uids);
  assert.deepEqual(uids, before);
});
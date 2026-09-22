// Unit test: cursed.js — updateCursedStatus + canWolfSeeCursed
import test from "node:test";
import assert from "node:assert/strict";

import {
  updateCursedStatus,
  canWolfSeeCursed,
  isCursedTurned,
} from "../cursed.js";

test("cursed: ยังเป็นชาวบ้าน ถูกกัดคืน 2 → turned ทันที (แผนข้อ 2.4)", () => {
  const res = updateCursedStatus(null, true, 2);
  assert.deepEqual(res, { status: "turned", turnedNight: 2 });
});

test("cursed: ไม่ถูกกัด → ยังเป็นชาวบ้าน", () => {
  const res = updateCursedStatus(null, false, 1);
  assert.deepEqual(res, { status: "village", turnedNight: null });
});

test("cursed: ถูกกัดคืน 2, คืน 3 ถูกเรียกว่าแต่ไม่ถูกกัด → ยัง turned อยู่", () => {
  const fromNight2 = updateCursedStatus(null, true, 2);
  const res = updateCursedStatus(fromNight2, false, 3);
  assert.deepEqual(res, { status: "turned", turnedNight: 2 });
});

test("cursed: เปลี่ยนจาก village → turned เก็บ record เก่า", () => {
  const before = { status: "village", turnedNight: null };
  const res = updateCursedStatus(before, true, 5);
  assert.deepEqual(res, { status: "turned", turnedNight: 5 });
});

test("cursed: หมาป่าเห็น Cursed คืนถัดไปเท่านั้น (turnedNight + 1)", () => {
  assert.equal(canWolfSeeCursed(2, 2), false, "คืน 2 ยังไม่เห็น");
  assert.equal(canWolfSeeCursed(2, 3), true, "คืน 3 เห็น");
  assert.equal(canWolfSeeCursed(2, 5), true);
  assert.equal(canWolfSeeCursed(null, 3), false);
  assert.equal(canWolfSeeCursed(undefined, 3), false);
});

test("cursed: isCursedTurned เช็กสถานะ", () => {
  assert.equal(isCursedTurned({ status: "turned" }), true);
  assert.equal(isCursedTurned({ status: "village" }), false);
  assert.equal(isCursedTurned(null), false);
});
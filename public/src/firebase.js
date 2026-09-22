// Firebase init + auth + room CRUD
// ใช้ Firebase v9 modular SDK — ห้ามใช้ compat

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getDatabase, ref, get, set, update, onValue } from "firebase/database";

// ใส่ค่าจาก Firebase Console (Project settings → General)
const firebaseConfig = {
  apiKey: "PLACEHOLDER",
  authDomain: "PLACEHOLDER",
  databaseURL: "PLACEHOLDER",
  projectId: "PLACEHOLDER",
  storageBucket: "PLACEHOLDER",
  messagingSenderId: "PLACEHOLDER",
  appId: "PLACEHOLDER",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// Anonymous auth ครั้งแรก — คืน uid ของผู้ใช้
export async function ensureAuth() {
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    return auth.currentUser.uid;
  } catch (err) {
    console.error("[ensureAuth]", err);
    throw err;
  }
}

// อ่านข้อมูลห้องครั้งเดียว
export async function getRoom(code) {
  try {
    const snap = await get(ref(db, `rooms/${code}`));
    return snap.exists() ? snap.val() : null;
  } catch (err) {
    console.error("[getRoom]", err);
    throw err;
  }
}

// สร้าง/เขียนข้อมูลห้อง (atomic update)
export async function updateRoom(code, data) {
  try {
    await update(ref(db, `rooms/${code}`), data);
  } catch (err) {
    console.error("[updateRoom]", err);
    throw err;
  }
}

// ฟังห้องแบบ realtime — คืน callback สำหรับ unsubscribe
export function listenRoom(code, callback) {
  try {
    const roomRef = ref(db, `rooms/${code}`);
    return onValue(roomRef, (snap) => {
      if (snap.exists()) callback(snap.val());
    });
  } catch (err) {
    console.error("[listenRoom]", err);
    throw err;
  }
}

// เขียนข้อมูล ณ path ใด ๆ ในห้อง
export async function setRoomPath(code, path, data) {
  try {
    await set(ref(db, `rooms/${code}/${path}`), data);
  } catch (err) {
    console.error("[setRoomPath]", err);
    throw err;
  }
}
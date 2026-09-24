import {
  auth, db,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile,
  sendPasswordResetEmail,
  doc, setDoc, getDoc, serverTimestamp
} from "./firebase-init.js";

// Create an account, save a matching profile doc (name + phone are needed for WhatsApp orders)
export async function signUp(name, phone, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await setDoc(doc(db, "users", cred.user.uid), {
    name, phone, email,
    createdAt: serverTimestamp()
  });
  return cred.user;
}

export async function logIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logOut() {
  await signOut(auth);
}

// Resolves true/false once we know if this uid is in the admins collection
export async function isAdmin(uid) {
  if (!uid) return false;
  const snap = await getDoc(doc(db, "admins", uid));
  return snap.exists();
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// Friendlier text for common Firebase Auth error codes
export function authErrorMessage(err) {
  const code = err && err.code ? err.code : "";
  const map = {
    "auth/email-already-in-use": "That email already has an account — try logging in instead.",
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/too-many-requests": "Too many attempts — please wait a moment and try again."
  };
  return map[code] || "Something went wrong. Please try again.";
}

export { auth, onAuthStateChanged };

import { createContext, useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  reload,
} from "firebase/auth";
import { doc, setDoc, getDoc, Timestamp } from "firebase/firestore";
import {
  registerForPushNotificationsAsync,
  savePushTokenToUser,
} from "../notificationService";

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.emailVerified) {
        await loadUserProfile(firebaseUser);
      } else {
        setUser(null);
      }
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  async function loadUserProfile(firebaseUser) {
    try {
      const docRef = doc(db, "users", firebaseUser.uid);
      const docSnap = await getDoc(docRef);
      const profile = docSnap.exists() ? docSnap.data() : {};
      setUser({ uid: firebaseUser.uid, email: firebaseUser.email, ...profile });
    } catch (err) {
      console.error("Error loading user profile:", err);
      setUser({ uid: firebaseUser.uid, email: firebaseUser.email });
    }
  }

  async function login(email, password) {
    const credential = await signInWithEmailAndPassword(auth, email, password);

    // Force a fresh token fetch from Firebase servers (bypasses local cache)
    await credential.user.getIdToken(true);
    await reload(credential.user);

    if (!credential.user.emailVerified) {
      await signOut(auth);
      const err = new Error("Please verify your email before logging in.");
      err.code = "auth/email-not-verified";
      err.email = email;
      err.password = password;
      throw err;
    }

    await loadUserProfile(credential.user);
  }

  async function register(email, password, name, label, school) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;

    // 1. Save to Firestore
    await setDoc(doc(db, "users", uid), {
      uid,
      name,
      email,
      label,
      school: school || null,
      pushToken: null,
      notificationsEnabled: true,
      createdAt: Timestamp.now(),
    });

    // 2. Send verification email BEFORE signing out (must be signed in)
    try {
      await sendEmailVerification(credential.user);
      console.log("Verification email sent to:", email);
    } catch (err) {
      console.error("Failed to send verification email:", err.code, err.message);
      throw new Error("Account created but we couldn't send the verification email. Try logging in to resend.");
    }

    // 3. Sign out AFTER email is sent
    await signOut(auth);
  }

  // Called from the verify-email screen's Resend button
  async function resendVerificationEmail(email, password) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await reload(credential.user);

    if (credential.user.emailVerified) {
      // Already verified — load them in properly
      await loadUserProfile(credential.user);
      return { alreadyVerified: true };
    }

    await sendEmailVerification(credential.user);
    console.log("Resent verification email to:", email);
    await signOut(auth);
    return { alreadyVerified: false };
  }

  async function logout() {
    await signOut(auth);
    setUser(null);
  }

  useEffect(() => {
    if (user?.uid) {
      setupPushNotifications();
    }
  }, [user?.uid]);

  async function setupPushNotifications() {
    try {
      const token = await registerForPushNotificationsAsync();
      if (token && user) {
        await savePushTokenToUser(user.uid, token);
      }
    } catch (err) {
      console.error("Error setting up push notifications:", err);
    }
  }

  return (
    <UserContext.Provider value={{ user, authChecked, login, logout, register, resendVerificationEmail }}>
      {children}
    </UserContext.Provider>
  );
}
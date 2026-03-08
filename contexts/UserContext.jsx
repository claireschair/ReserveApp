import { createContext, useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
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

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
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
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function register(email, password, name, label, school) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;

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
  }

  async function logout() {
    await signOut(auth);
    setUser(null);
  }

  // Push notifications
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
    <UserContext.Provider value={{ user, authChecked, login, logout, register }}>
      {children}
    </UserContext.Provider>
  );
}
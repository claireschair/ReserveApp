import { createContext, useEffect, useState } from "react";
import { account, database } from "../lib/appwrite";
import { ID, Query } from "react-native-appwrite";
import { 
  registerForPushNotificationsAsync, 
  savePushTokenToUser 
} from "../notificationService";

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  async function login(email, password) {
    try {
      await account.deleteSession("current");
    } catch {}
    await account.createEmailPasswordSession(email, password);
    await getInitialUserValue();
  }

  async function register(email, password, name, label) {
    const newUser = await account.create(ID.unique(), email, password, name);

    await database.createDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
      process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
      ID.unique(),
      {
        userID: newUser.$id,
        name,
        email,
        label,
      }
    );

    await login(email, password);
  }

  async function logout() {
    await account.deleteSession("current");
    setUser(null);
  }

  async function getInitialUserValue() {
    try {
      const authUser = await account.get();

      const profile = await database.listDocuments(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
        [Query.equal("userID", authUser.$id)]
      );

      setUser({ ...authUser, ...(profile.documents[0] || {}) });
    } catch {
      setUser(null);
    } finally {
      setAuthChecked(true);
    }
  }

  useEffect(() => {
    getInitialUserValue();
  }, []);

  useEffect(() => {
    if (user && user.$id) {
      setupPushNotifications();
    }
  }, [user]);

  async function setupPushNotifications() {
    try {
      console.log('Setting up push notifications...');
      console.log('Current user object:', user ? {
        id: user.$id,
        userID: user.userID,
        email: user.email
      } : 'No user');
      
      const token = await registerForPushNotificationsAsync();
      console.log('Got push token:', token ? `${token.substring(0, 30)}...` : 'No token');
      
      if (token && user) {
        const authUserId = user.userID || user.$id;
        console.log('Using authUserId:', authUserId);
        await savePushTokenToUser(authUserId, token);
        console.log('Push notifications registered successfully');
      } else {
        console.log('Cannot setup push notifications:', { hasToken: !!token, hasUser: !!user });
      }
    } catch (err) {
      console.error('Error setting up push notifications:', err);
    }
  }

  return (
    <UserContext.Provider
      value={{ user, authChecked, login, logout, register }}
    >
      {children}
    </UserContext.Provider>
  );
}
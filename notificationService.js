import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./lib/firebase";
import Constants from 'expo-constants';

// Configure how notifications are presented
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and get Expo push token
 */
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Failed to get push token for push notification!");
      return null;
    }

    try {
      // Get project ID from app.json/app.config.js via Constants
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      
      if (!projectId) {
        console.warn("No Expo project ID found. Push notifications may not work.");
        console.log("Add projectId to app.json under 'extra.eas.projectId'");
        return null;
      }

      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
        })
      ).data;
      
      console.log("Push token obtained:", token);
    } catch (error) {
      console.error("Error getting push token:", error);
      return null;
    }
  } else {
    console.log("Must use physical device for Push Notifications");
  }

  return token;
}

/**
 * Save push token to Firebase user document
 */
export async function savePushTokenToUser(userId, token) {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      pushToken: token,
      notificationsEnabled: true,
    });
    console.log("Push token saved to Firebase for user:", userId);
  } catch (err) {
    console.error("Error saving push token to Firebase:", err);
  }
}

/**
 * Get push token for a specific user from Firebase
 */
export async function getUserPushToken(userId) {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData.notificationsEnabled && userData.pushToken) {
        return userData.pushToken;
      }
    }
    return null;
  } catch (err) {
    console.error("Error getting user push token from Firebase:", err);
    return null;
  }
}

/**
 * Get notification preference for current user
 */
export async function getNotificationPreference(userId) {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      return userDoc.data().notificationsEnabled ?? true;
    }
    return true; // Default to enabled
  } catch (err) {
    console.error("Error getting notification preference:", err);
    return true;
  }
}

/**
 * Update notification preference for current user
 */
export async function updateNotificationPreference(userId, enabled) {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      notificationsEnabled: enabled,
    });
    console.log("Notification preference updated:", enabled);
  } catch (err) {
    console.error("Error updating notification preference:", err);
    throw err;
  }
}

/**
 * Send push notification via Expo Push API
 */
export async function sendPushNotification(expoPushToken, title, body, data = {}) {
  const message = {
    to: expoPushToken,
    sound: "default",
    title: title,
    body: body,
    data: data,
  };

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log("Push notification sent:", result);
    return result;
  } catch (error) {
    console.error("Error sending push notification:", error);
    throw error;
  }
}

/**
 * Add notification listener
 */
export function addNotificationReceivedListener(callback) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add notification response listener (when user taps notification)
 */
export function addNotificationResponseReceivedListener(callback) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
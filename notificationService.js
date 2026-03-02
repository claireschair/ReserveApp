import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { database } from './lib/appwrite';
import { Query } from 'react-native-appwrite';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    
    try {
      token = (await Notifications.getExpoPushTokenAsync()).data;
    } catch (err) {
      console.log('Error getting push token:', err);
      return null;
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export async function savePushTokenToUser(authUserId, token) {
  if (!token || !authUserId) {
    console.log('savePushTokenToUser called with:', { authUserId, hasToken: !!token });
    return;
  }

  try {
    console.log('Looking for user with userID:', authUserId);
    console.log('Database ID:', process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID);
    console.log('Collection ID:', process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID);
    
    const userDocs = await database.listDocuments(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
      process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
      [Query.equal("userID", authUserId)]
    );

    console.log('Found documents:', userDocs.documents.length);
    
    if (userDocs.documents.length > 0) {
      const userDoc = userDocs.documents[0];
      console.log('User document found:', userDoc.$id);
      
      await database.updateDocument(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
        userDoc.$id,
        { pushToken: token }
      );
      console.log('Push token saved successfully to document:', userDoc.$id);
    } else {
      console.log('No user document found for userID:', authUserId);
      console.log('Attempting to list all users to debug...');
      
      const allUsers = await database.listDocuments(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
        [Query.limit(5)]
      );
      
      console.log('Sample user documents:', allUsers.documents.map(d => ({
        id: d.$id,
        userID: d.userID,
        email: d.email
      })));
    }
  } catch (err) {
    console.error('Error saving push token:', err);
    console.error('Error details:', JSON.stringify(err, null, 2));
  }
}

export async function sendPushNotification(expoPushToken, title, body, data = {}) {
  if (!expoPushToken) {
    console.log('No push token provided');
    return;
  }

  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
    priority: 'high',
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Push notification sent:', result);
    return result;
  } catch (err) {
    console.error('Error sending push notification:', err);
    throw err;
  }
}

export async function getUserPushToken(authUserId) {
  try {
    console.log('getUserPushToken called for userID:', authUserId);
    
    let userDocs = await database.listDocuments(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
      process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
      [Query.equal("userID", authUserId)]
    );

    console.log('getUserPushToken found documents by userID:', userDocs.documents.length);

    if (userDocs.documents.length === 0) {
      console.log('Trying to find by document $id instead...');
      try {
        const userDoc = await database.getDocument(
          process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
          process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
          authUserId
        );
        userDocs = { documents: [userDoc] };
        console.log('Found by document $id');
      } catch (err) {
        console.log('Not found by document $id either');
      }
    }

    if (userDocs.documents.length > 0) {
      const userDoc = userDocs.documents[0];
      console.log('User doc:', {
        id: userDoc.$id,
        userID: userDoc.userID,
        hasPushToken: !!userDoc.pushToken,
        notifEnabled: userDoc.notificationsEnabled
      });
      
      if (userDoc.notificationsEnabled === false) {
        console.log(`Notifications disabled for user ${authUserId}`);
        return null;
      }
      
      const token = userDoc.pushToken || null;
      console.log(`Push token for user ${authUserId}:`, token ? `Found (${token.substring(0, 20)}...)` : 'Not found');
      return token;
    }
    
    console.log(`No user document found for userID: ${authUserId}`);
    return null;
  } catch (err) {
    console.error('Error getting user push token:', err);
    console.error('Error details:', JSON.stringify(err, null, 2));
    return null;
  }
}

export async function updateNotificationPreference(authUserId, enabled) {
  try {
    const userDocs = await database.listDocuments(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
      process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
      [Query.equal("userID", authUserId)]
    );

    if (userDocs.documents.length > 0) {
      const userDoc = userDocs.documents[0];
      
      await database.updateDocument(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
        userDoc.$id,
        { notificationsEnabled: enabled }
      );
      
      console.log('Notification preference updated:', enabled);
      return true;
    }
    
    return false;
  } catch (err) {
    console.error('Error updating notification preference:', err);
    return false;
  }
}

export async function getNotificationPreference(authUserId) {
  try {
    const userDocs = await database.listDocuments(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
      process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
      [Query.equal("userID", authUserId)]
    );

    if (userDocs.documents.length > 0) {
      return userDocs.documents[0].notificationsEnabled !== false;
    }
    
    return true;
  } catch (err) {
    console.error('Error getting notification preference:', err);
    return true;
  }
}

export async function getCurrentUserPushToken() {
  try {
    const userDocs = await database.listDocuments(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
      process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
      [Query.limit(1)]
    );

    if (userDocs.documents.length > 0) {
      return userDocs.documents[0].pushToken || null;
    }
    
    return null;
  } catch (err) {
    console.error('Error getting current user push token:', err);
    return null;
  }
}
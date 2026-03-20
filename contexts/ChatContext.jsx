import { createContext, useContext } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { UserContext } from "./UserContext";

export const ChatContext = createContext();

export function ChatProvider({ children }) {
  const { user } = useContext(UserContext);
  const userId = user?.uid ?? null;

  async function getOrCreateChat(matchId, partnerId, contactInfo) {
    if (!userId) return null;

    try {
      const chatsQuery = query(
        collection(db, "chats"),
        where("matchId", "==", matchId)
      );
      
      const snapshot = await getDocs(chatsQuery);
      
      if (!snapshot.empty) {
        const chatDoc = snapshot.docs[0];
        return { id: chatDoc.id, ...chatDoc.data() };
      }

      const chatData = {
        matchId,
        participants: [userId, partnerId].sort(),
        participantEmails: {
          [userId]: contactInfo.myEmail,
          [partnerId]: contactInfo.partnerEmail,
        },
        status: "active",
        lastMessage: null,
        lastMessageTimestamp: null,
        createdAt: serverTimestamp(),
        closedBy: null,
        closedReason: null,
      };

      const chatRef = await addDoc(collection(db, "chats"), chatData);
      
      return { id: chatRef.id, ...chatData };
    } catch (error) {
      console.error("Error creating chat:", error);
      throw error;
    }
  }

  async function sendMessage(chatId, text) {
    if (!userId || !text.trim()) return null;

    try {
      const messageData = {
        senderId: userId,
        text: text.trim(),
        timestamp: serverTimestamp(),
        read: false,
      };

      await addDoc(collection(db, "chats", chatId, "messages"), messageData);

      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: text.trim(),
        lastMessageTimestamp: serverTimestamp(),
      });

      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }

  async function markMessagesAsRead(chatId) {
    if (!userId) return;

    try {
      const messagesQuery = query(
        collection(db, "chats", chatId, "messages"),
        where("senderId", "!=", userId),
        where("read", "==", false)
      );

      const snapshot = await getDocs(messagesQuery);
      
      const updatePromises = snapshot.docs.map((messageDoc) =>
        updateDoc(doc(db, "chats", chatId, "messages", messageDoc.id), {
          read: true,
        })
      );

      await Promise.all(updatePromises);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  }

  async function closeChat(chatId, reason = 'completed') {
    if (!userId) return;

    try {
      await updateDoc(doc(db, "chats", chatId), {
        status: "closed",
        closedBy: userId,
        closedReason: reason,
        closedAt: serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error("Error closing chat:", error);
      throw error;
    }
  }

  function subscribeToMessages(chatId, callback) {
    if (!chatId) return () => {};

    const messagesQuery = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        callback(messages);
      },
      (error) => {
        console.error("Error subscribing to messages:", error);
      }
    );

    return unsubscribe;
  }

  async function getChatByMatchId(matchId) {
    if (!userId) return null;

    try {
      const chatsQuery = query(
        collection(db, "chats"),
        where("matchId", "==", matchId)
      );
      
      const snapshot = await getDocs(chatsQuery);
      
      if (snapshot.empty) return null;
      
      const chatDoc = snapshot.docs[0];
      return { id: chatDoc.id, ...chatDoc.data() };
    } catch (error) {
      console.error("Error getting chat:", error);
      return null;
    }
  }

  async function getUnreadCount(chatId) {
    if (!userId) return 0;

    try {
      const messagesQuery = query(
        collection(db, "chats", chatId, "messages"),
        where("senderId", "!=", userId),
        where("read", "==", false)
      );

      const snapshot = await getDocs(messagesQuery);
      return snapshot.size;
    } catch (error) {
      console.error("Error getting unread count:", error);
      return 0;
    }
  }

  return (
    <ChatContext.Provider
      value={{
        getOrCreateChat,
        sendMessage,
        markMessagesAsRead,
        closeChat,
        subscribeToMessages,
        getChatByMatchId,
        getUnreadCount,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
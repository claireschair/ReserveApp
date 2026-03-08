import { useState, useEffect, useRef, useContext } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useChat } from "../../hooks/useChat";
import { useMatch } from "../../hooks/useMatch";
import { UserContext } from "../../contexts/UserContext";
import ThemedText from "../../components/ThemedText";
import ThemedView from "../../components/ThemedView";
import Spacer from "../../components/Spacer";

const ChatScreen = () => {
  const { chatId, matchId } = useLocalSearchParams();
  const { user } = useContext(UserContext);
  const { subscribeToMessages, sendMessage, markMessagesAsRead, closeChat } = useChat();
  const { completeMatch } = useMatch();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (!chatId) {
      console.log("No chatId provided");
      return;
    }

    console.log("Setting up message listener for chat:", chatId);

    const unsubscribe = subscribeToMessages(chatId, (newMessages) => {
      console.log("Received messages update:", newMessages.length);
      setMessages(newMessages);
      
      if (newMessages.length > 0) {
        markMessagesAsRead(chatId).catch(err => {
          console.log("Error marking as read (non-critical):", err);
        });
      }
    });

    return () => {
      console.log("Cleaning up message listener");
      unsubscribe();
    };
  }, [chatId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;

    const messageText = inputText.trim();
    console.log("Sending message:", messageText);
    
    setSending(true);
    setInputText(""); 
    
    try {
      await sendMessage(chatId, messageText);
      console.log("Message sent successfully");
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");
      setInputText(messageText); 
    } finally {
      setSending(false);
    }
  };

  const handleCompleteMatch = () => {
    Alert.alert(
      "Complete Match",
      "This will close the chat and mark the match as completed. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          style: "destructive",
          onPress: async () => {
            try {
              await closeChat(chatId);
              await completeMatch(matchId);
              Alert.alert("Success", "Match completed!");
              router.back();
            } catch (error) {
              console.error("Error completing match:", error);
              Alert.alert("Error", "Failed to complete match");
            }
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.senderId === user?.uid;
    
    let timeString = "";
    try {
      if (item.timestamp?.toDate) {
        timeString = item.timestamp.toDate().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      } else if (item.timestamp?.seconds) {
        timeString = new Date(item.timestamp.seconds * 1000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    } catch (err) {
      console.log("Error formatting timestamp:", err);
    }
    
    return (
      <View
        style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessage : styles.theirMessage,
        ]}
      >
        <ThemedText
          style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.theirMessageText,
          ]}
        >
          {item.text}
        </ThemedText>
        {timeString && (
          <ThemedText
            style={[
              styles.timestamp,
              isMyMessage ? styles.myTimestamp : styles.theirTimestamp,
            ]}
          >
            {timeString}
          </ThemedText>
        )}
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Spacer height={60} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText style={styles.backButton}>← Back</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Match Chat</ThemedText>
        <TouchableOpacity onPress={handleCompleteMatch}>
          <ThemedText style={styles.completeButton}>Complete</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>No messages yet</ThemedText>
          <ThemedText style={styles.emptySubtext}>Start the conversation!</ThemedText>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />
      )}

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            <ThemedText style={styles.sendButtonText}>
              {sending ? "..." : "Send"}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    color: "#4A90E2",
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  completeButton: {
    color: "#4CAF50",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#666",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    maxWidth: "75%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#4A90E2",
  },
  theirMessage: {
    alignSelf: "flex-start",
    backgroundColor: "white",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: "white",
  },
  theirMessageText: {
    color: "#333",
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  myTimestamp: {
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "right",
  },
  theirTimestamp: {
    color: "#999",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    backgroundColor: "#4A90E2",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#ccc",
  },
  sendButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 15,
  },
});
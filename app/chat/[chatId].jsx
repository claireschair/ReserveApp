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
  Modal,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useChat } from "../../hooks/useChat";
import { useReport } from "../../hooks/useReport";
import { useMatch } from "../../hooks/useMatch";
import { UserContext } from "../../contexts/UserContext";
import ThemedText from "../../components/ThemedText";
import ThemedView from "../../components/ThemedView";
import Spacer from "../../components/Spacer";
import { Ionicons } from "@expo/vector-icons";
import AppBackButton from "../../components/AppBackButton";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const PERSPECTIVE_API_KEY = process.env.EXPO_PUBLIC_PERSPECTIVE_API_KEY;
const bannedWords = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "dick",
  "pussy",
  "cunt",
  "bastard",
  "slut",
  "whore",
];
const scamKeywords = [
  "send money",
  "cashapp",
  "venmo",
  "paypal",
  "gift card",
  "wire transfer",
  "bitcoin",
  "crypto",
  "urgent payment",
  "click this link",
];

async function moderateMessage(text) {
  try {
    const lowerText = text.toLowerCase();

    for (const word of bannedWords) {
      if (lowerText.includes(word)) {
        return {
          allowed: false,
          reason: "Please avoid profanity or offensive language.",
        };
      }
    }

    for (const phrase of scamKeywords) {
      if (lowerText.includes(phrase)) {
        return {
          allowed: false,
          reason: "Payment requests are not allowed in chat.",
        };
      }
    }

    const linkRegex = /(https?:\/\/|www\.)/i;
    if (linkRegex.test(text)) {
      return {
        allowed: false,
        reason: "Links are not allowed in chat for safety reasons.",
      };
    }

    const response = await fetch(
      `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${PERSPECTIVE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          comment: { text },
          languages: ["en"],
          requestedAttributes: {
            TOXICITY: {},
            SEVERE_TOXICITY: {},
            INSULT: {},
            THREAT: {},
            PROFANITY: {},
            IDENTITY_ATTACK: {},
          },
        }),
      }
    );

    if (!response.ok) {
      console.log("Perspective API error:", response.status);
      return { allowed: true, reason: "" };
    }

    const data = await response.json();
    const scores = data.attributeScores;

    const toxicity = scores?.TOXICITY?.summaryScore?.value ?? 0;
    const severeToxicity = scores?.SEVERE_TOXICITY?.summaryScore?.value ?? 0;
    const insult = scores?.INSULT?.summaryScore?.value ?? 0;
    const threat = scores?.THREAT?.summaryScore?.value ?? 0;
    const profanity = scores?.PROFANITY?.summaryScore?.value ?? 0;
    const sexual = scores?.SEXUAL_CONTENT?.summaryScore?.value ?? 0;
    const identityAttack = scores?.IDENTITY_ATTACK?.summaryScore?.value ?? 0;

    if (
      toxicity > 0.80 ||
      severeToxicity > 0.60 ||
      insult > 0.80 ||
      threat > 0.5 ||
      sexual > 0.7 ||
      identityAttack > 0.6
    ) {
      return {
        allowed: false,
        reason: "Your message appears harmful or abusive.",
      };
    }

    if (profanity > 0.8) {
      return {
        allowed: false,
        reason: "Please avoid profanity in messages.",
      };
    }

    return { allowed: true, reason: "" };

  } catch (error) {
    console.warn("Perspective moderation error:", error);
    return { allowed: true, reason: "" };
  }
}

const REPORT_REASONS = [
  { value: "inappropriate_language", label: "Inappropriate Language" },
  { value: "harassment", label: "Harassment or Bullying" },
  { value: "spam", label: "Spam or Scam" },
  { value: "no_show", label: "Didn't Show Up for Exchange" },
  { value: "unsafe_behavior", label: "Unsafe Behavior" },
  { value: "fake_items", label: "Fake or Misrepresented Items" },
  { value: "other", label: "Other" },
];

const ChatScreen = () => {
  const { chatId, matchId } = useLocalSearchParams();
  const { user } = useContext(UserContext);
  const { subscribeToMessages, sendMessage, markMessagesAsRead, closeChat } = useChat();
  const { submitReport, hasReported } = useReport();
  const { completeMatch, resubmitAfterReport } = useMatch();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [partnerUserId, setPartnerUserId] = useState(null);
  const [chatData, setChatData] = useState(null);
  const [iClosedChat, setIClosedChat] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (!chatId || !user?.uid) return;

    const loadChatData = async () => {
      try {
        const chatDoc = await getDoc(doc(db, "chats", chatId));
        if (chatDoc.exists()) {
          const data = chatDoc.data();
          setChatData(data);

          const partner = data.participants?.find((id) => id !== user.uid);
          if (partner) {
            setPartnerUserId(partner);
          }
        }
      } catch (error) {
        console.error("Error loading chat data:", error);
      }
    };

    loadChatData();
  }, [chatId, user?.uid]);

  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = onSnapshot(
      doc(db, "chats", chatId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setChatData(data);

          // Only show alert if chat was closed by reporting (not by match completion)
          if (data.status === "closed" && !data.matchCompleted && !iClosedChat) {
            Alert.alert(
              "Chat Closed",
              "This chat has been closed for violating community guidelines.",
              [{ text: "OK", onPress: () => router.back() }]
            );
          }
        }
      },
      (error) => {
        console.error("Error listening to chat status:", error);
      }
    );

    return () => unsubscribe();
  }, [chatId, iClosedChat]);

  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = subscribeToMessages(chatId, (newMessages) => {
      setMessages(newMessages);
      if (newMessages.length > 0) {
        markMessagesAsRead(chatId).catch(() => {});
      }
    });

    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || sending || moderating) return;

    const messageText = inputText.trim();
    setInputText("");
    setModerating(true);

    try {
      const { allowed, reason } = await moderateMessage(messageText);

      if (!allowed) {
        setInputText(messageText);
        Alert.alert(
          "Message Blocked",
          reason || "Your message wasn't sent because it may violate our community guidelines."
        );
        return;
      }

      setSending(true);
      await sendMessage(chatId, messageText);
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");
      setInputText(messageText);
    } finally {
      setModerating(false);
      setSending(false);
    }
  };

  const handleOpenReportModal = async () => {
    if (!partnerUserId) {
      Alert.alert("Error", "Unable to identify the other user");
      return;
    }

    const alreadyReported = await hasReported(partnerUserId, chatId);
    if (alreadyReported) {
      Alert.alert(
        "Already Reported",
        "You have already submitted a report for this user."
      );
      return;
    }

    setReportModalVisible(true);
  };

  const handleSubmitReport = async () => {
    if (!selectedReason) {
      Alert.alert("Error", "Please select a reason");
      return;
    }

    if (!reportDescription.trim()) {
      Alert.alert("Error", "Please provide a description");
      return;
    }

    setSubmittingReport(true);

    try {
      await submitReport(partnerUserId, selectedReason, reportDescription, {
        chatId,
        matchId,
      });

      setIClosedChat(true);

      if (chatId) await closeChat(chatId, 'reported');
      
      // Only resubmit ALL items (this handles marking as completed internally)
      // Do NOT call completeMatch - that's for successful exchanges
      if (matchId) {
        await resubmitAfterReport(matchId);
      }

      setReportModalVisible(false);
      setSelectedReason("");
      setReportDescription("");

      Alert.alert(
        "Report Submitted",
        "Thank you. The chat has been closed and we've created a new request/donation with all your items so you can find a new match.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error("Error submitting report:", error);
      Alert.alert("Error", "Failed to submit report.");
    } finally {
      setSubmittingReport(false);
    }
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

  const isBusy = moderating || sending;
  const sendLabel = moderating ? "Checking..." : sending ? "..." : "Send";

  // Check if chat is completed (match finished successfully)
  const isCompleted = chatData?.matchCompleted === true;
  
  // Check if chat is closed (reported/violating guidelines)
  const isClosed = chatData?.status === "closed" && !isCompleted;

  // Determine if user can send messages
  const canSendMessages = !isCompleted && !isClosed && chatData?.status === "active";

  return (
    <ThemedView style={styles.container}>

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AppBackButton />
        </View>

        <ThemedText style={styles.headerTitle}>Match Chat</ThemedText>

        <View style={styles.headerRight}>
          {!isCompleted && !isClosed ? (
            <TouchableOpacity 
              onPress={handleOpenReportModal}
              style={styles.reportButtonContainer}
            >
              <MaterialIcons name="report-problem" size={18} color="red" />
              <ThemedText style={styles.reportButtonText}>Report</ThemedText>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>
      </View>

      {/* Completed Match Banner */}
      {isCompleted && (
        <View style={styles.completedBanner}>
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          <View style={styles.completedTextContainer}>
            <ThemedText style={styles.completedTitle}>Match Completed! 🎉</ThemedText>
            <ThemedText style={styles.completedMessage}>
              This exchange was successfully completed. Chat is now read-only.
            </ThemedText>
          </View>
        </View>
      )}

      {/* Closed Chat Warning */}
      {isClosed && (
        <View style={styles.closedBanner}>
          <Ionicons name="ban" size={24} color="#FF6B6B" />
          <View style={styles.closedTextContainer}>
            <ThemedText style={styles.closedTitle}>Chat Closed</ThemedText>
            <ThemedText style={styles.closedMessage}>
              This chat has been closed for violating community guidelines.
            </ThemedText>
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        style={{ flex: 1 }}
      >
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
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyText}>No messages yet</ThemedText>
              <ThemedText style={styles.emptySubtext}>
                Start the conversation!
              </ThemedText>
            </View>
          }
        />

        {canSendMessages && (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              multiline
              maxLength={1000}
              returnKeyType="default"
              blurOnSubmit={false}
              editable={!isBusy}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isBusy) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isBusy}
            >
              <View style ={styles.sendButtonContainer}>
                <ThemedText style={styles.sendButtonText}>{sendLabel}</ThemedText>
                <Ionicons name="send" size={14} color="white" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Show read-only message if completed or closed */}
        {(isCompleted || isClosed) && (
          <View style={styles.readOnlyContainer}>
            <ThemedText style={styles.readOnlyText}>
              {isCompleted ? "✓ Chat is read-only" : "⚠ Chat has been closed"}
            </ThemedText>
          </View>
        )}
      </KeyboardAvoidingView>

      <Modal
        visible={reportModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1}>
            <View style={styles.modalContent}>
              <ThemedText style={styles.modalTitle}>Report User</ThemedText>
              <ThemedText style={styles.modalSubtitle}>
                Help us keep the community safe.
              </ThemedText>

              <ScrollView style={styles.reasonsScroll}>
                {REPORT_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason.value}
                    style={[
                      styles.reasonOption,
                      selectedReason === reason.value &&
                        styles.reasonOptionSelected,
                    ]}
                    onPress={() => setSelectedReason(reason.value)}
                  >
                    <View style={styles.radioButton}>
                      {selectedReason === reason.value && (
                        <View style={styles.radioButtonInner} />
                      )}
                    </View>
                    <ThemedText style={styles.reasonText}>
                      {reason.label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput
                style={styles.descriptionInput}
                placeholder="Please describe what happened..."
                placeholderTextColor="#999"
                value={reportDescription}
                onChangeText={setReportDescription}
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setReportModalVisible(false);
                    setSelectedReason("");
                    setReportDescription("");
                  }}
                  disabled={submittingReport}
                >
                  <ThemedText style={styles.cancelButtonText}>
                    Cancel
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.submitButton,
                    submittingReport && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmitReport}
                  disabled={submittingReport}
                >
                  <ThemedText style={styles.submitButtonText}>
                    {submittingReport ? "Submitting..." : "Submit"}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </ThemedView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F6FB", 
  },
  header: {
    paddingTop: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#ffffff",

    shadowColor: "#4A90E2",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  headerLeft:{
    width:50,
    alignItems: "flex-start",
  },
  headerRight:{
    width:60,
    alignItems: "flex-end",
  },
  backButton: {
    color: "#4A90E2",
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
 reportButtonContainer: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,

  backgroundColor: "#FFEAEA", 
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 14,

  borderWidth: 1,
  borderColor: "#FFD6D6",

  shadowColor: "#FF6B6B",
  shadowOpacity: 0.08,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
  paddingHorizontal: 5,
  },

  reportButtonText: {
    color: "#FF6B6B",
    fontSize: 13,
    fontWeight: "600",
  },
  completedBanner: {
    flexDirection: "row",
    backgroundColor: "#E8F5E9",
    padding: 16,
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#A5D6A7",
  },
  completedTextContainer: {
    flex: 1,
  },
  completedTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 4,
  },
  completedMessage: {
    fontSize: 13,
    color: "#555",
    lineHeight: 18,
  },
  closedBanner: {
    flexDirection: "row",
    backgroundColor: "#FFEBEE",
    padding: 16,
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EF9A9A",
  },
  closedTextContainer: {
    flex: 1,
  },
  closedTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#C62828",
    marginBottom: 4,
  },
  closedMessage: {
    fontSize: 13,
    color: "#555",
    lineHeight: 18,
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
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginBottom: 10,
  },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#4A90E2",
    borderBottomRightRadius: 6,
  },
  theirMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    borderBottomLeftRadius: 6,
    shadowColor: "#4A90E2",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
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
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
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
    padding: 10,
    margin: 10,
    marginBottom: 22,
    borderRadius: 30,
    backgroundColor: "#ffffff",
    alignItems: "center",

    shadowColor: "#4A90E2",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 15,
    color: "#000",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  sendButton: {
    backgroundColor: "#4A90E2",
    borderRadius: 20,
    paddingHorizontal: 15,
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
  readOnlyContainer: {
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    alignItems: "center",
  },
  readOnlyText: {
    fontSize: 13,
    color: "#666",
    fontStyle: "italic",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  reasonsScroll: {
    maxHeight: 250,
    marginBottom: 16,
  },
  reasonOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#f5f5f5",
  },
  reasonOptionSelected: {
    backgroundColor: "#E3F2FD",
    borderWidth: 2,
    borderColor: "#4A90E2",
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#4A90E2",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4A90E2",
  },
  reasonText: {
    fontSize: 15,
    flex: 1,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 16,
    backgroundColor: "#fff",
    color: "#000",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#FF6B6B",
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    color: "white",
    fontWeight: "600",
  },
  sendButtonContainer:{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
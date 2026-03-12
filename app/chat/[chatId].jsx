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
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useChat } from "../../hooks/useChat";
import { useReport } from "../../hooks/useReport";
import { UserContext } from "../../contexts/UserContext";
import ThemedText from "../../components/ThemedText";
import ThemedView from "../../components/ThemedView";
import Spacer from "../../components/Spacer";

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
  const { subscribeToMessages, sendMessage, markMessagesAsRead } = useChat();
  const { submitReport, hasReported } = useReport();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [partnerUserId, setPartnerUserId] = useState(null);
  const [chatData, setChatData] = useState(null);
  const flatListRef = useRef(null);

  // Get chat data and partner ID on mount
  useEffect(() => {
    if (!chatId || !user?.uid) return;

    const loadChatData = async () => {
      try {
        const chatDoc = await getDoc(doc(db, "chats", chatId));
        if (chatDoc.exists()) {
          const data = chatDoc.data();
          setChatData(data);
          
          // Find partner ID from participants array
          const partner = data.participants?.find(id => id !== user.uid);
          if (partner) {
            console.log("Partner user ID:", partner);
            setPartnerUserId(partner);
          } else {
            console.error("Could not find partner in participants");
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
    if (!inputText.trim() || sending) return;

    const messageText = inputText.trim();
    
    setSending(true);
    setInputText("");
    
    try {
      await sendMessage(chatId, messageText);
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");
      setInputText(messageText);
    } finally {
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
        "You have already submitted a report for this user. Our moderators will review it soon."
      );
      return;
    }

    setReportModalVisible(true);
  };

  const handleSubmitReport = async () => {
    if (!selectedReason) {
      Alert.alert("Error", "Please select a reason for the report");
      return;
    }

    if (!reportDescription.trim()) {
      Alert.alert("Error", "Please provide a description of the issue");
      return;
    }

    setSubmittingReport(true);

    try {
      await submitReport(
        partnerUserId,
        selectedReason,
        reportDescription,
        {
          chatId,
          matchId,
        }
      );

      Alert.alert(
        "Report Submitted",
        "Thank you for reporting this issue. Our moderators will review it and take appropriate action.",
        [
          {
            text: "OK",
            onPress: () => {
              setReportModalVisible(false);
              setSelectedReason("");
              setReportDescription("");
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error submitting report:", error);
      Alert.alert("Error", "Failed to submit report. Please try again.");
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

  return (
    <ThemedView style={styles.container}>
      <Spacer height={60} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText style={styles.backButton}>← Back</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Match Chat</ThemedText>
        <TouchableOpacity onPress={handleOpenReportModal}>
          <ThemedText style={styles.reportButton}>Report</ThemedText>
        </TouchableOpacity>
      </View>

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

      <Modal
        visible={reportModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Report User</ThemedText>
            <ThemedText style={styles.modalSubtitle}>
              Help us keep the community safe. What's the issue?
            </ThemedText>

            <ScrollView style={styles.reasonsScroll}>
              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.value}
                  style={[
                    styles.reasonOption,
                    selectedReason === reason.value && styles.reasonOptionSelected,
                  ]}
                  onPress={() => setSelectedReason(reason.value)}
                >
                  <View style={styles.radioButton}>
                    {selectedReason === reason.value && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                  <ThemedText style={styles.reasonText}>{reason.label}</ThemedText>
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
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
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
                  {submittingReport ? "Submitting..." : "Submit Report"}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  reportButton: {
    color: "#FF6B6B",
    fontSize: 14,
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
});
import { useState } from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import ThemedText from "./ThemedText";
import StarRating from "./StarRating";

export default function ReviewModal({ visible, onClose, onSubmit, loading, partnerName }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  function handleClose() {
    setRating(0);
    setComment("");
    onClose();
  }

  function handleSubmit() {
    if (rating === 0) return;
    onSubmit(rating, comment);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>Rate your experience</ThemedText>
            <TouchableOpacity onPress={handleClose} disabled={loading}>
              <ThemedText style={styles.cancelText}>Cancel</ThemedText>
            </TouchableOpacity>
          </View>

          {partnerName ? (
            <ThemedText style={styles.subtitle}>
              How was your exchange with {partnerName}?
            </ThemedText>
          ) : (
            <ThemedText style={styles.subtitle}>
              How was your exchange?
            </ThemedText>
          )}

          <View style={styles.starsContainer}>
            <StarRating
              rating={rating}
              maxStars={5}
              size={36}
              interactive
              onRate={setRating}
            />
            {rating > 0 && (
              <ThemedText style={styles.ratingLabel}>
                {["", "Poor", "Fair", "Good", "Very good", "Excellent"][rating]}
              </ThemedText>
            )}
          </View>

          <TextInput
            style={styles.commentInput}
            placeholder="Leave a comment (optional)"
            placeholderTextColor="#aaa"
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={300}
            textAlignVertical="top"
          />
          <ThemedText style={styles.charCount}>{comment.length}/300</ThemedText>

          <TouchableOpacity
            style={[styles.submitButton, (rating === 0 || loading) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={rating === 0 || loading}
          >
            <ThemedText style={styles.submitText}>
              {loading ? "Submitting..." : "Submit Review"}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
  },
  cancelText: {
    fontSize: 15,
    color: "#4A90E2",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  starsContainer: {
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  ratingLabel: {
    fontSize: 15,
    color: "#F5A623",
    fontWeight: "600",
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#333",
    height: 90,
    marginBottom: 4,
  },
  charCount: {
    fontSize: 12,
    color: "#aaa",
    textAlign: "right",
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#b0c8f0",
  },
  submitText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
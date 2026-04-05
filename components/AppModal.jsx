import { useState } from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import ThemedText from "./ThemedText";
import StarRating from "./StarRating";

const COMPLETION_OPTIONS = [
  {
    key: "complete",
    label: "Exchange complete",
    description:
      "We met and all agreed items were transferred. You will confirm quantities on the next screen.",
  },
  {
    key: "partial",
    label: "Partial exchange",
    description:
      "We met but only some items were transferred. You will confirm exactly what was exchanged on the next screen.",
  },
  {
    key: "nocoordination",
    label: "Could not coordinate",
    description:
      "We were unable to arrange a meeting. All items will be resubmitted for both sides so you can find new matches.",
  },
];

const REPORT_REASONS = [
  { value: "inappropriate_language", label: "Inappropriate Language" },
  { value: "harassment", label: "Harassment or Bullying" },
  { value: "spam", label: "Spam or Scam" },
  { value: "no_show", label: "Didn't Show Up for Exchange" },
  { value: "unsafe_behavior", label: "Unsafe Behavior" },
  { value: "fake_items", label: "Fake or Misrepresented Items" },
  { value: "other", label: "Other" },
];

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

function RadioList({ options, selected, onSelect }) {
  return (
    <>
      {options.map((option) => {
        const isSelected = selected === option.key || selected === option.value;
        const key = option.key || option.value;
        return (
          <TouchableOpacity
            key={key}
            style={[styles.option, isSelected && styles.optionSelected]}
            onPress={() => onSelect(key)}
            activeOpacity={0.7}
          >
            <View style={styles.optionRow}>
              <View style={[styles.radio, isSelected && styles.radioSelected]}>
                {isSelected && <View style={styles.radioDot} />}
              </View>
              <View style={styles.optionText}>
                <ThemedText style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                  {option.label}
                </ThemedText>
                {!!option.description && (
                  <ThemedText style={styles.optionDescription}>{option.description}</ThemedText>
                )}
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </>
  );
}

// Step 2: Quantity confirmation per matched item.
// matchedItems: [{ name, spec, donorQty, requestorQty }]
// completionType drives defaults — "complete" pre-fills max exchangeable qty,
// "partial" starts at 0 so the user actively selects what happened.
function QuantityConfirmContent({ completionType, matchedItems, onBack, onConfirm, loading }) {
  const initQty = (item) => {
    if (completionType === "complete") {
      return Math.min(item.donorQty, item.requestorQty);
    }
    return 0;
  };

  const [quantities, setQuantities] = useState(() =>
    Object.fromEntries(matchedItems.map((item) => [item.name.toLowerCase(), initQty(item)]))
  );

  function setQty(itemName, raw) {
    const key = itemName.toLowerCase();
    const item = matchedItems.find((i) => i.name.toLowerCase() === key);
    const max = Math.min(item.donorQty, item.requestorQty);
    const val = Math.max(0, Math.min(max, parseInt(raw, 10) || 0));
    setQuantities((prev) => ({ ...prev, [key]: val }));
  }

  function increment(itemName) {
    const key = itemName.toLowerCase();
    const item = matchedItems.find((i) => i.name.toLowerCase() === key);
    const max = Math.min(item.donorQty, item.requestorQty);
    setQuantities((prev) => ({ ...prev, [key]: Math.min(max, (prev[key] || 0) + 1) }));
  }

  function decrement(itemName) {
    const key = itemName.toLowerCase();
    setQuantities((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) - 1) }));
  }

  function handleConfirm() {
    onConfirm(quantities);
  }

  const isPartial = completionType === "partial";
  const subtitle = isPartial
    ? "Enter how many of each item were actually exchanged. Items left at 0 will be fully resubmitted."
    : "Confirm the quantities exchanged. Any surplus the donor had will be resubmitted automatically.";

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} disabled={loading}>
          <ThemedText style={styles.cancelText}>Back</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.title}>Confirm quantities</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>

      <ScrollView style={styles.scrollArea}>
        {matchedItems.map((item) => {
          const key = item.name.toLowerCase();
          const max = Math.min(item.donorQty, item.requestorQty);
          const qty = quantities[key] ?? 0;
          return (
            <View key={key} style={styles.qtyRow}>
              <View style={styles.qtyItemInfo}>
                <ThemedText style={styles.qtyItemName}>
                  {item.name}
                  {item.spec ? <ThemedText style={styles.qtyItemSpec}> — {item.spec}</ThemedText> : null}
                </ThemedText>
                <ThemedText style={styles.qtyItemMax}>max {max}</ThemedText>
              </View>
              <View style={styles.qtyStepper}>
                <TouchableOpacity
                  style={[styles.stepBtn, qty <= 0 && styles.stepBtnDisabled]}
                  onPress={() => decrement(item.name)}
                  disabled={qty <= 0}
                >
                  <ThemedText style={styles.stepBtnText}>−</ThemedText>
                </TouchableOpacity>
                <TextInput
                  style={styles.qtyInput}
                  value={String(qty)}
                  onChangeText={(v) => setQty(item.name, v)}
                  keyboardType="number-pad"
                  maxLength={4}
                />
                <TouchableOpacity
                  style={[styles.stepBtn, qty >= max && styles.stepBtnDisabled]}
                  onPress={() => increment(item.name)}
                  disabled={qty >= max}
                >
                  <ThemedText style={styles.stepBtnText}>+</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
        onPress={handleConfirm}
        disabled={loading}
      >
        <ThemedText style={styles.primaryButtonText}>
          {loading ? "Closing match..." : "Confirm"}
        </ThemedText>
      </TouchableOpacity>
    </>
  );
}

function CompletionContent({ matchedItems, onConfirm, loading, onClose }) {
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState(1);

  function handleTypeConfirm() {
    if (!selected) return;
    if (selected === "nocoordination") {
      onConfirm(selected, {});
    } else {
      setStep(2);
    }
  }

  function handleBack() {
    setStep(1);
  }

  function handleQtyConfirm(quantities) {
    onConfirm(selected, quantities);
  }

  if (step === 2) {
    return (
      <QuantityConfirmContent
        completionType={selected}
        matchedItems={matchedItems}
        onBack={handleBack}
        onConfirm={handleQtyConfirm}
        loading={loading}
      />
    );
  }

  return (
    <>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Close this match</ThemedText>
        <TouchableOpacity onPress={onClose} disabled={loading}>
          <ThemedText style={styles.cancelText}>Cancel</ThemedText>
        </TouchableOpacity>
      </View>

      <ThemedText style={styles.subtitle}>
        Select what happened so we can handle your items correctly.
      </ThemedText>

      <ScrollView style={styles.scrollArea}>
        <RadioList options={COMPLETION_OPTIONS} selected={selected} onSelect={setSelected} />
      </ScrollView>

      <TouchableOpacity
        style={[styles.primaryButton, (!selected || loading) && styles.primaryButtonDisabled]}
        onPress={handleTypeConfirm}
        disabled={!selected || loading}
      >
        <ThemedText style={styles.primaryButtonText}>
          {selected === "nocoordination" ? "Confirm" : "Next"}
        </ThemedText>
      </TouchableOpacity>
    </>
  );
}

function ReviewContent({ onSubmit, loading, onClose, partnerName }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  function handleClose() {
    setRating(0);
    setComment("");
    onClose();
  }

  return (
    <>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Rate your experience</ThemedText>
        <TouchableOpacity onPress={handleClose} disabled={loading}>
          <ThemedText style={styles.cancelText}>Cancel</ThemedText>
        </TouchableOpacity>
      </View>

      <ThemedText style={styles.subtitle}>
        {partnerName ? `How was your exchange with ${partnerName}?` : "How was your exchange?"}
      </ThemedText>

      <View style={styles.starsContainer}>
        <StarRating rating={rating} maxStars={5} size={36} interactive onRate={setRating} />
        {rating > 0 && (
          <ThemedText style={styles.ratingLabel}>{RATING_LABELS[rating]}</ThemedText>
        )}
      </View>

      <TextInput
        style={styles.textInput}
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
        style={[styles.primaryButton, (rating === 0 || loading) && styles.primaryButtonDisabled]}
        onPress={() => rating > 0 && onSubmit(rating, comment)}
        disabled={rating === 0 || loading}
      >
        <ThemedText style={styles.primaryButtonText}>
          {loading ? "Submitting..." : "Submit Review"}
        </ThemedText>
      </TouchableOpacity>
    </>
  );
}

function ReportContent({ onSubmit, loading, onClose }) {
  const [selected, setSelected] = useState("");
  const [description, setDescription] = useState("");

  function handleClose() {
    setSelected("");
    setDescription("");
    onClose();
  }

  const canSubmit = !!selected && description.trim().length > 0 && !loading;

  return (
    <>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Report User</ThemedText>
        <TouchableOpacity onPress={handleClose} disabled={loading}>
          <ThemedText style={styles.cancelText}>Cancel</ThemedText>
        </TouchableOpacity>
      </View>

      <ThemedText style={styles.subtitle}>Help us keep the community safe.</ThemedText>

      <ScrollView style={styles.scrollArea}>
        <RadioList options={REPORT_REASONS} selected={selected} onSelect={setSelected} />
      </ScrollView>

      <TextInput
        style={[styles.textInput, styles.textInputTall]}
        placeholder="Please describe what happened..."
        placeholderTextColor="#aaa"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={500}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.reportButton, !canSubmit && styles.primaryButtonDisabled]}
        onPress={() => canSubmit && onSubmit(selected, description)}
        disabled={!canSubmit}
      >
        <ThemedText style={styles.primaryButtonText}>
          {loading ? "Submitting..." : "Submit Report"}
        </ThemedText>
      </TouchableOpacity>
    </>
  );
}

// matchedItems shape expected by AppModal for completion mode:
// [{ name: string, spec: string, donorQty: number, requestorQty: number }]
// Build this in the list screens from the active matched match object.
export default function AppModal({
  visible,
  onClose,
  mode,
  loading,
  onConfirmCompletion,
  onSubmitReview,
  onSubmitReport,
  partnerName,
  matchedItems,
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.sheetTall}>
          {mode === "completion" && (
            <CompletionContent
              matchedItems={matchedItems || []}
              onConfirm={onConfirmCompletion}
              loading={loading}
              onClose={onClose}
            />
          )}
          {mode === "review" && (
            <ReviewContent
              onSubmit={onSubmitReview}
              loading={loading}
              onClose={onClose}
              partnerName={partnerName}
            />
          )}
          {mode === "report" && (
            <ReportContent onSubmit={onSubmitReport} loading={loading} onClose={onClose} />
          )}
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
  sheetTall: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "90%",
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
    lineHeight: 20,
  },
  scrollArea: {
    marginBottom: 16,
  },
  option: {
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    backgroundColor: "#fafafa",
  },
  optionSelected: {
    borderColor: "#4A90E2",
    backgroundColor: "#f0f6ff",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  radioSelected: {
    borderColor: "#4A90E2",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4A90E2",
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: "#1a6fd4",
  },
  optionDescription: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
    marginTop: 2,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    gap: 12,
  },
  qtyItemInfo: {
    flex: 1,
  },
  qtyItemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  qtyItemSpec: {
    fontSize: 13,
    color: "#4A90E2",
    fontStyle: "italic",
    fontWeight: "400",
  },
  qtyItemMax: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  qtyStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4A90E2",
    justifyContent: "center",
    alignItems: "center",
  },
  stepBtnDisabled: {
    backgroundColor: "#ddd",
  },
  stepBtnText: {
    color: "white",
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 22,
  },
  qtyInput: {
    width: 48,
    height: 36,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    backgroundColor: "#fafafa",
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
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#333",
    height: 90,
    marginBottom: 4,
  },
  textInputTall: {
    height: 110,
  },
  charCount: {
    fontSize: 12,
    color: "#aaa",
    textAlign: "right",
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    backgroundColor: "#b0c8f0",
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  reportButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
});
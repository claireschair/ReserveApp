import { useState } from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import ThemedText from "./ThemedText";

const OPTIONS = [
  {
    key: "complete",
    label: "Exchange complete",
    description:
      "We met and all agreed items were transferred successfully. Any items not matched will be resubmitted automatically.",
  },
  {
    key: "partial",
    label: "Partial exchange",
    description:
      "We met but only some items were transferred. All unexchanged items will be resubmitted automatically for both sides.",
  },
  {
    key: "nocoordination",
    label: "Could not coordinate",
    description:
      "We were unable to arrange a meeting. All items will be resubmitted for both sides so you can find new matches.",
  },
];

export default function MatchCompletionModal({ visible, onClose, onConfirm, loading }) {
  const [selected, setSelected] = useState(null);

  function handleConfirm() {
    if (!selected) return;
    onConfirm(selected);
  }

  function handleClose() {
    setSelected(null);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>Close this match</ThemedText>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton} disabled={loading}>
              <ThemedText style={styles.closeText}>Cancel</ThemedText>
            </TouchableOpacity>
          </View>

          <ThemedText style={styles.subtitle}>
            Select what happened so we can handle your items correctly.
          </ThemedText>

          <ScrollView style={styles.options}>
            {OPTIONS.map((option) => {
              const isSelected = selected === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => setSelected(option.key)}
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
                      <ThemedText style={styles.optionDescription}>
                        {option.description}
                      </ThemedText>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={[styles.confirmButton, (!selected || loading) && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={!selected || loading}
          >
            <ThemedText style={styles.confirmText}>
              {loading ? "Closing match..." : "Confirm"}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
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
    maxHeight: "85%",
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
  closeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  closeText: {
    fontSize: 15,
    color: "#4A90E2",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    lineHeight: 20,
  },
  options: {
    marginBottom: 20,
  },
  option: {
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
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
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: "#1a6fd4",
  },
  optionDescription: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  confirmButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: "#b0c8f0",
  },
  confirmText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
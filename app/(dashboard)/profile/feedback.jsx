import { StyleSheet, TextInput, TouchableOpacity, Keyboard, View } from "react-native";
import React, { useState } from "react";

import Spacer from "../../../components/Spacer";
import ThemedText from "../../../components/ThemedText";
import ThemedView from "../../../components/ThemedView";
import { useFeedback } from "../../../hooks/useFeedback";

const Feedback = () => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState(null);
  const [isFocused, setIsFocused] = useState(false);

  const { saveFeedback } = useFeedback();

  const handleSubmit = async () => {
    setError(null);

    if (!rating) {
      setError("Please select a rating.");
      return;
    }

    try {
      await saveFeedback(rating, feedback);
      setRating(0);
      setFeedback("");
      alert("Thank you for your feedback!");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText title style={styles.heading}>
        Feedback Form
      </ThemedText>

      <Spacer />

      <ThemedText>Rate your experience:</ThemedText>
      <Spacer height={10} />

      <ThemedView style={styles.stars}>
        {[1, 2, 3, 4, 5].map((num) => (
          <TouchableOpacity key={num} onPress={() => setRating(num)}>
            <ThemedText style={[styles.star, rating >= num && styles.starSelected]}>
              ★
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ThemedView>

      <Spacer height={20} />

      <TextInput
        style={styles.input}
        placeholder="Write your feedback..."
        value={feedback}
        onChangeText={setFeedback}
        multiline
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />

      {isFocused && (
        <View style={styles.keyboardButtonWrapper}>
          <TouchableOpacity style={styles.keyboardButton} onPress={Keyboard.dismiss}>
            <ThemedText style={styles.keyboardButtonText}>Hide Keyboard ⬇︎</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      <Spacer height={15} />

      {error && <ThemedText style={styles.error}>{error}</ThemedText>}

      <Spacer height={10} />

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <ThemedText style={styles.buttonText}>Submit</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
};

export default Feedback;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  heading: {
    fontWeight: "bold",
    fontSize: 22,
    textAlign: "center",
  },
  stars: {
    flexDirection: "row",
  },
  star: {
    fontSize: 40,
    marginHorizontal: 5,
    color: "#888",
  },
  starSelected: {
    color: "gold",
  },
  input: {
    width: "90%",
    height: 120,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    textAlignVertical: "top",
    backgroundColor: "white",
  },
  keyboardButtonWrapper: {
    width: "90%",
    alignItems: "flex-end",
    marginTop: 8,
  },
  keyboardButton: {
    backgroundColor: "#ddd",
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  keyboardButtonText: {
    fontSize: 14,
    color: "#333",
  },
  error: {
    color: "red",
    fontSize: 14,
    marginBottom: 5,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 12,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});

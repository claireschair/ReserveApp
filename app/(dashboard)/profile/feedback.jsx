import { StyleSheet, TextInput, TouchableOpacity, Keyboard, View, KeyboardAvoidingView, Platform } from "react-native";
import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

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
    <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
    <ThemedView style={styles.container}>

      <View style={styles.header}>
        <Ionicons name="chatbubble-ellipses-outline" size={34} color="#4A90E2" />
        <ThemedText title style={styles.heading}>
          Share Your Feedback
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Your feedback helps us improve the app experience.
        </ThemedText>
      </View>

      {/* Card */}
      <View style={styles.card}>

        <ThemedText style={styles.label}>
          How was your experience?
        </ThemedText>

        <Spacer height={10} />

        <View style={styles.stars}>
          {[1,2,3,4,5].map((num) => (
            <TouchableOpacity
              key={num}
              onPress={() => setRating(num)}
              style={styles.starButton}
            >
              <Ionicons
                name={rating >= num ? "star" : "star-outline"}
                size={36}
                color={rating >= num ? "#FFD166" : "#D1D5DB"}
              />
            </TouchableOpacity>
          ))}
        </View>

        <Spacer height={20} />

        <ThemedText style={styles.label}>
          Tell us more
        </ThemedText>

        <Spacer height={6} />

        <TextInput
          style={styles.input}
          placeholder="What did you like? What could be better?"
          placeholderTextColor="#9CA3AF"
          value={feedback}
          onChangeText={setFeedback}
          multiline
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {isFocused && (
          <TouchableOpacity
            style={styles.keyboardButton}
            onPress={Keyboard.dismiss}
          >
            <Ionicons name="chevron-down-outline" size={16} color="#4A90E2"/>
            <ThemedText style={styles.keyboardButtonText}>
              Hide Keyboard
            </ThemedText>
          </TouchableOpacity>
        )}

        {error && (
          <>
            <Spacer height={8} />
            <ThemedText style={styles.error}>{error}</ThemedText>
          </>
        )}

        <Spacer height={18} />

        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <ThemedText style={styles.buttonText}>
            Submit Feedback
          </ThemedText>
        </TouchableOpacity>

      </View>
    </ThemedView>
    </KeyboardAvoidingView>
  );
};

export default Feedback;

const styles = StyleSheet.create({

  container:{
    flex:1,
    padding:20,
    justifyContent:"center"
  },

  header:{
    alignItems:"center",
    marginBottom:20
  },

  heading:{
    fontSize:24,
    fontWeight:"700",
    marginTop:8
  },

  subtitle:{
    fontSize:14,
    opacity:0.7,
    marginTop:4,
    textAlign:"center"
  },

  card:{
    backgroundColor:"#ffffff",
    padding:22,
    borderRadius:26,

    shadowColor:"#4A90E2",
    shadowOpacity:0.15,
    shadowRadius:20,
    shadowOffset:{width:0,height:10},
    elevation:8
  },

  label:{
    fontSize:16,
    fontWeight:"600",
    color:"#374151",
    textAlign: "center",
  },

  stars:{
    flexDirection:"row",
    justifyContent:"center"
  },

  starButton:{
    marginHorizontal:4
  },

  input:{
    minHeight:120,
    paddingVertical:14,
    paddingHorizontal:16,
    borderRadius:18,
    backgroundColor:"#F3F6FB",
    borderWidth:1,
    borderColor:"#E0E7FF",
    fontSize:15,
    textAlignVertical:"top"
  },

  keyboardButton:{
    flexDirection:"row",
    alignItems:"center",
    alignSelf:"flex-end",
    marginTop:8,
    gap:4
  },

  keyboardButtonText:{
    color:"#4A90E2",
    fontWeight:"500"
  },

  button:{
    backgroundColor:"#4A90E2",
    paddingVertical:14,
    borderRadius:22
  },

  buttonText:{
    color:"white",
    textAlign:"center",
    fontSize:16,
    fontWeight:"600"
  },

  error:{
    color:"red",
    textAlign:"center"
  }

});
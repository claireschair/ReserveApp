import { StyleSheet, View, TouchableOpacity, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Spacer from "../../../components/Spacer";
import ThemedText from "../../../components/ThemedText";
import ThemedView from "../../../components/ThemedView";

const EMAIL = "reservesupplyapp@gmail.com";

const Contact = () => {
  const handleEmailPress = () => {
    Linking.openURL(`mailto:${EMAIL}`);
  };

  return (
    <ThemedView style={styles.container}>
       <Spacer height={120} />
      <ThemedText title={true} style={styles.heading}>
        Contact Us
      </ThemedText>

      <ThemedText style={styles.subtitle}>
        Have questions, feedback, or need help?
      </ThemedText>
      <ThemedText style={styles.subtitle}>
        We’d love to hear from you.
      </ThemedText>

      <Spacer height={20} />

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-outline" size={20} color="#4A90E2" />
          </View>

          <View style={{ flex: 1 }}>
            <ThemedText style={styles.label}>Email</ThemedText>
            <ThemedText style={styles.email}>{EMAIL}</ThemedText>
          </View>
        </View>

        <Spacer height={16} />

        <TouchableOpacity style={styles.button} onPress={handleEmailPress}>
          <Ionicons name="send" size={16} color="white" />
          <ThemedText style={styles.buttonText}>Email Us</ThemedText>
        </TouchableOpacity>
      </View>

      <Spacer height={20} />

      <ThemedText style={styles.footer}>
        We typically respond within 24–48 hours.
      </ThemedText>
    </ThemedView>
  );
};

export default Contact;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F3F6FB",
  },

  heading: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    color: "#111",
  },

  subtitle: {
    textAlign: "center",
    fontSize: 14,
    color: "#6B7280",
    marginTop: 6,
    wdith: "70%",
  },

  card: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 20,

    shadowColor: "#4A90E2",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F1FF",
    justifyContent: "center",
    alignItems: "center",
  },

  label: {
    fontSize: 13,
    color: "#6B7280",
  },

  email: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },

  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,

    backgroundColor: "#4A90E2",
    paddingVertical: 12,
    borderRadius: 20,
  },

  buttonText: {
    color: "white",
    fontWeight: "600",
  },

  footer: {
    textAlign: "center",
    fontSize: 13,
    color: "#94A3B8",
  },
});
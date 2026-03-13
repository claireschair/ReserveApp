import { TouchableOpacity, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function AppBackButton() {
  const router = useRouter();

  return (
    <TouchableOpacity onPress={() => router.back()} style={styles.button}>
      <View style={styles.icon}>
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    marginLeft: 10,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#6cc8df",
    alignItems: "center",
    justifyContent: "center",
  },
});
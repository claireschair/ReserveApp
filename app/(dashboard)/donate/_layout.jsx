import { Stack } from "expo-router";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function DonateLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: "",
        headerTransparent: true,        
        headerShadowVisible: false,
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.button}
          >
            <View style={styles.icon}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen 
        name="index"
        options={{ headerShown: false }}
      />
      <Stack.Screen name="wishlist" />
      <Stack.Screen name="form" />
      <Stack.Screen name="donationlist" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  button: { marginLeft: 16 },  
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,     
    backgroundColor: "#4A90E2",  
    alignItems: "center",
    justifyContent: "center",
  },
});
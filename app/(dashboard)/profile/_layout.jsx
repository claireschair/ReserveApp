import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="donations" />
      <Stack.Screen name="requests" />
      <Stack.Screen name="wishlist" />

      <Stack.Screen name="privacy" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="feedback" />
      <Stack.Screen name="contact" />
    </Stack>
  );
}

import { Stack } from "expo-router";

export default function ReceiveLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="wishlist" />
      <Stack.Screen name="form" />
      <Stack.Screen name="requestlist" />
    </Stack>
  );
}

import { Stack } from "expo-router";

export default function DonateLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="wishlist" />
      <Stack.Screen name="form" />
      <Stack.Screen name="donationlist" />
    </Stack>
  );
}

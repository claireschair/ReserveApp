import { Stack } from "expo-router";

export default function DonateLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="donationCenter" />
      <Stack.Screen name="PlaceSearchInput" />
    </Stack>
  );
}

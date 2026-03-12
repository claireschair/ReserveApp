import { Stack } from "expo-router";
import { Colors } from "../constants/Colors";
import { useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";

import { UserProvider } from "../contexts/UserContext";
import { MapProvider } from "../contexts/MapContext";
import { MatchProvider } from "../contexts/MatchContext";
import { FeedbackProvider } from "../contexts/FeedbackContext";
import { WishlistProvider } from "../contexts/WishlistContext";
import { ChatProvider } from "../contexts/ChatContext";
import { ReportProvider } from "../contexts/ReportContext";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  return (
    <UserProvider>
      <WishlistProvider>
        <MapProvider>
          <MatchProvider>
            <FeedbackProvider>
              <ChatProvider>
                <ReportProvider>
                  <StatusBar style="auto" />
                  <Stack
                    screenOptions={{
                      headerStyle: { backgroundColor: theme.navBackground },
                      headerTintColor: theme.title,
                    }}
                  >
                    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                    <Stack.Screen name="(dashboard)" options={{ headerShown: false }} />
                    <Stack.Screen name="chat/[chatId]" options={{ headerShown: false }} />
                    <Stack.Screen name="index" options={{ headerShown: false }} />
                  </Stack>
                </ReportProvider>
              </ChatProvider>
            </FeedbackProvider>
          </MatchProvider>
        </MapProvider>
      </WishlistProvider>
    </UserProvider>
  );
}

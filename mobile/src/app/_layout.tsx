import { useEffect } from "react";
import { Platform, View } from "react-native";
import { Stack, router, useRootNavigationState } from "expo-router";
import type { Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { DMSans_400Regular } from "@expo-google-fonts/dm-sans/400Regular";
import { DMSans_500Medium } from "@expo-google-fonts/dm-sans/500Medium";
import { DMSans_600SemiBold } from "@expo-google-fonts/dm-sans/600SemiBold";
import { DMSans_700Bold } from "@expo-google-fonts/dm-sans/700Bold";
import { DMSans_800ExtraBold } from "@expo-google-fonts/dm-sans/800ExtraBold";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { FeedsProvider } from "../state/feeds";
import { NotificationProvider, useNotifications } from "../state/notifications";
import { colors } from "../lib/theme";
void SplashScreen.preventAutoHideAsync().catch(() => {});
export const unstable_settings = { initialRouteName: "(tabs)" };
function NotificationNavigator() {
  const state = useRootNavigationState(),
    push = useNotifications();
  useEffect(() => {
    if (state?.key && push.pendingRoute) {
      router.push(push.pendingRoute as Href);
      push.consumeRoute();
    }
  }, [state?.key, push]);
  return null;
}
export default function RootLayout() {
  const [loaded, error] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
  });
  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);
  if (!loaded && !error) return null;
  return (
    <SafeAreaProvider>
      <View
        style={{
          flex: 1,
          backgroundColor: Platform.OS === "web" ? "#f1f4eb" : colors.paper,
        }}
      >
        <View
          style={{
            flex: 1,
            width: "100%",
            maxWidth: Platform.OS === "web" ? 620 : undefined,
            alignSelf: "center",
            backgroundColor: colors.paper,
          }}
        >
          <FeedsProvider>
            <NotificationProvider>
              <StatusBar style="dark" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.paper },
                  animation: "slide_from_right",
                }}
              />
              <NotificationNavigator />
            </NotificationProvider>
          </FeedsProvider>
        </View>
      </View>
    </SafeAreaProvider>
  );
}

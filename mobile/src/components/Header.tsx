import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, Bell, Settings2, Sparkles } from "lucide-react-native";
import { IconButton } from "./ui";
import { colors, fonts } from "../lib/theme";
export function Header({ back, title }: { back?: () => void; title?: string }) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        {back ? (
          <IconButton icon={ArrowLeft} label="Go back" onPress={back} />
        ) : (
          <View style={styles.logo}>
            <Sparkles size={22} color="#e3f6be" strokeWidth={2.2} />
          </View>
        )}
        {title ? (
          <Text style={styles.pageTitle}>{title}</Text>
        ) : (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Daily Drop home"
            onPress={() => router.navigate("/")}
          >
            <Text style={styles.brand}>
              daily<Text style={styles.brandLight}>drop</Text>
              <Text style={{ color: colors.green }}>.</Text>
            </Text>
          </Pressable>
        )}
        <View style={{ flex: 1 }} />
        {!title && (
          <IconButton
            icon={Bell}
            label="Notification settings"
            onPress={() => router.push("/settings")}
          />
        )}
        {!title && (
          <IconButton
            icon={Settings2}
            label="Settings"
            onPress={() => router.push("/settings")}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  header: {
    height: 75,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
  },
  logo: {
    width: 38,
    height: 39,
    borderRadius: 13,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-7deg" }],
    marginRight: 1,
  },
  brand: {
    fontFamily: fonts.extra,
    color: colors.ink,
    fontSize: 28,
    letterSpacing: -1.5,
  },
  brandLight: { fontFamily: fonts.medium },
  pageTitle: {
    fontFamily: fonts.bold,
    color: colors.ink,
    fontSize: 18,
    letterSpacing: -0.4,
  },
});

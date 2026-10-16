import { Tabs } from "expo-router";
import { Gift, Sparkles, Wallet } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../../components/Header";
import { colors, fonts } from "../../lib/theme";
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        header: () => <Header />,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: "#9aa88c",
        tabBarActiveBackgroundColor: "#edf5e5",
        tabBarLabelStyle: {
          fontFamily: fonts.semi,
          fontSize: 10,
          marginTop: 0,
          marginBottom: 4,
          lineHeight: 15,
        },
        tabBarItemStyle: {
          borderRadius: 13,
          marginHorizontal: 5,
          paddingVertical: 0,
          height: 60,
          minHeight: 60,
        },
        tabBarStyle: {
          height: 84 + insets.bottom,
          paddingTop: 8,
          paddingBottom: 8 + insets.bottom,
          paddingHorizontal: 9,
          borderTopLeftRadius: 23,
          borderTopRightRadius: 23,
          borderTopColor: "#e3eada",
          backgroundColor: "white",
          boxShadow: "0px -3px 20px rgba(32, 50, 18, 0.03)",
        },
        tabBarLabelPosition: "below-icon",
        tabBarIconStyle: { height: 26, marginTop: 5, marginBottom: 1 },
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Deals",
          tabBarIcon: ({ color }) => (
            <Gift size={22} color={color} strokeWidth={1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="picks"
        options={{
          title: "Machine’s Picks",
          tabBarIcon: ({ color }) => (
            <Sparkles size={22} color={color} strokeWidth={1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="money"
        options={{
          title: "Money",
          tabBarIcon: ({ color }) => (
            <Wallet size={22} color={color} strokeWidth={1.8} />
          ),
        }}
      />
    </Tabs>
  );
}

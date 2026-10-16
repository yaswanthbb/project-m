import { useLocalSearchParams, router } from "expo-router";
import { FeedScreen } from "../../components/FeedScreen";
export default function MoneyScreen() {
  const params = useLocalSearchParams<{ topic?: string }>();
  const topic = params.topic === "tips" ? "tips" : "airdrops";
  return (
    <FeedScreen
      key={topic}
      topic={topic}
      onMoneyTab={(value) => router.setParams({ topic: value })}
    />
  );
}

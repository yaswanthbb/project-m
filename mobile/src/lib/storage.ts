import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { validItems } from "./model";
import type { Item, Topic } from "./model";
const TOKEN = "daily-drop.publish-token";
export const preferences = {
  async get(key: string) {
    try {
      return await AsyncStorage.getItem(`daily-drop:${key}`);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string) {
    await AsyncStorage.setItem(`daily-drop:${key}`, value);
  },
};
export async function getPublishToken() {
  return Platform.OS === "web"
    ? AsyncStorage.getItem(TOKEN)
    : SecureStore.getItemAsync(TOKEN);
}
export async function setPublishToken(value: string) {
  if (Platform.OS === "web") await AsyncStorage.setItem(TOKEN, value);
  else
    await SecureStore.setItemAsync(TOKEN, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
}
export async function clearPublishToken() {
  if (Platform.OS === "web") await AsyncStorage.removeItem(TOKEN);
  else await SecureStore.deleteItemAsync(TOKEN);
}
export async function readFeed(topic: Topic) {
  try {
    const value = JSON.parse(
      (await AsyncStorage.getItem(`daily-drop:feed:${topic}`)) || "null",
    );
    return value && Number.isFinite(value.updated)
      ? { items: validItems(value.items), updated: value.updated as number }
      : null;
  } catch {
    return null;
  }
}
const writes: Partial<Record<Topic, Promise<void>>> = {};
export function saveFeed(topic: Topic, items: Item[], updated: number) {
  const value = JSON.stringify({ items, updated });
  const write = (writes[topic] || Promise.resolve())
    .catch(() => {})
    .then(() => AsyncStorage.setItem(`daily-drop:feed:${topic}`, value));
  writes[topic] = write;
  return write;
}

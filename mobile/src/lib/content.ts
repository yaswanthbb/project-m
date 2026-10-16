import {
  BookOpen,
  Cloud,
  Code2,
  Gift,
  Globe2,
  Leaf,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { colors } from "./theme";
import type { Item, Topic } from "./model";
export const categories = [
  "All finds",
  "AI",
  "Dev tools",
  "SaaS",
  "Software",
  "Cloud",
  "Data",
  "Security",
  "Design",
  "Learning",
];
export const content: Record<
  Topic,
  {
    label: string;
    pageTitle: string;
    eyebrow: string;
    title: string;
    description: string;
    feedTitle: string;
    icon: LucideIcon;
    bg: string;
    ink: string;
    artText: string;
  }
> = {
  deals: {
    label: "Deals",
    pageTitle: "The good stuff.",
    eyebrow: "A LITTLE DISCOVERY. A LOT OF VALUE.",
    title: "Good tools.\nEven better deals.",
    description:
      "Free software, AI perks, and dev tools worth making room for.",
    feedTitle: "Fresh off the feed",
    icon: Gift,
    bg: "#eaf1df",
    ink: "#284f37",
    artText: "a little win.",
  },
  picks: {
    label: "Machine’s Picks",
    pageTitle: "Machine’s Picks",
    eyebrow: "YOUR NEXT “GLAD I FOUND THIS.”",
    title: "A fresh thought.\nA new rabbit hole.",
    description:
      "Quick reads, useful ideas, and things worth a little attention.",
    feedTitle: "A moment of curiosity",
    icon: Sparkles,
    bg: "#efedf7",
    ink: "#5d4c72",
    artText: "stay curious.",
  },
  airdrops: {
    label: "Crypto Airdrops",
    pageTitle: "Money, a little wiser.",
    eyebrow: "EXPLORE WITH YOUR EYES OPEN.",
    title: "New projects.\nInformed moves.",
    description:
      "Explore airdrops, check the details, and do your own research.",
    feedTitle: "On the radar",
    icon: Wallet,
    bg: "#eaf1df",
    ink: "#284f37",
    artText: "look closer.",
  },
  tips: {
    label: "Financial Tips",
    pageTitle: "Money, a little wiser.",
    eyebrow: "A LITTLE KNOW-HOW GOES A LONG WAY.",
    title: "Small lessons.\nBetter money habits.",
    description: "Bite-sized financial education for your everyday curiosity.",
    feedTitle: "Good sense, in small doses",
    icon: Lightbulb,
    bg: "#f6f0df",
    ink: "#6d5d34",
    artText: "keep growing.",
  },
};
const categoryLook: Record<
  string,
  { icon: LucideIcon; bg: string; ink: string }
> = {
  AI: { icon: Sparkles, bg: colors.purple, ink: colors.purpleInk },
  "Dev tools": { icon: Code2, bg: colors.blue, ink: colors.blueInk },
  SaaS: { icon: Zap, bg: colors.peach, ink: colors.peachInk },
  Software: { icon: Globe2, bg: colors.mint, ink: colors.mintInk },
  Cloud: { icon: Cloud, bg: colors.blue, ink: colors.blueInk },
  Data: { icon: Code2, bg: colors.purple, ink: colors.purpleInk },
  Security: { icon: ShieldCheck, bg: colors.mint, ink: colors.mintInk },
  Design: { icon: Leaf, bg: colors.peach, ink: colors.peachInk },
  Learning: { icon: BookOpen, bg: colors.yellow, ink: colors.yellowInk },
};
export function lookFor(topic: Topic, item?: Item) {
  return (
    categoryLook[item?.tag || ""] || {
      icon: content[topic].icon,
      bg:
        topic === "picks"
          ? colors.purple
          : topic === "tips"
            ? colors.yellow
            : colors.mint,
      ink:
        topic === "picks"
          ? colors.purpleInk
          : topic === "tips"
            ? colors.yellowInk
            : colors.mintInk,
    }
  );
}

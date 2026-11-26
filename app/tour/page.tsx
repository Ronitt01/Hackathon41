import type { Metadata } from "next";
import { Tour } from "@/components/tour/tour";

export const metadata: Metadata = {
  title: { absolute: "How Kafila works" },
  description:
    "A nine-step tour of Kafila on a real phone: start a trip, invite friends, add private budgets, vote, and get the plan that fits everyone.",
};

export default function TourPage() {
  return <Tour />;
}

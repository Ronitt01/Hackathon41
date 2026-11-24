import { BoardBone, CardBone, ScreenBone } from "@/components/trip-aside/skeleton";

/** On-trip: verdict board, then mood, re-plan, safety and chat sections. */
export default function Loading() {
  return (
    <ScreenBone>
      <BoardBone />
      <CardBone fields={1} />
      <CardBone fields={1} />
      <CardBone fields={1} />
      <CardBone fields={2} />
    </ScreenBone>
  );
}

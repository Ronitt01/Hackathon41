import { BoardBone, Bone, CardBone, HeadingBone, RowsBone, ScreenBone } from "@/components/trip-aside/skeleton";

/** Plan tab: fair-plan board and meter, itinerary days, trip details. */
export default function Loading() {
  return (
    <ScreenBone>
      <BoardBone />
      <div className="grid gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <Bone key={i} className="h-3.5" />
        ))}
      </div>
      <HeadingBone />
      <RowsBone rows={4} />
      <CardBone fields={2} />
    </ScreenBone>
  );
}

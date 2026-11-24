import { BoardBone, Bone, CardBone, HeadingBone, ScreenBone } from "@/components/trip-aside/skeleton";

/** Trip Jar: to-go board, my savings, group savings, booking day. */
export default function Loading() {
  return (
    <ScreenBone>
      <BoardBone />
      <Bone className="h-3.5" />
      <CardBone fields={2} />
      <div className="grid gap-3 border-t pt-3">
        <HeadingBone />
      </div>
      <div className="grid gap-3 border-t pt-3">
        <HeadingBone />
        <Bone className="h-11 rounded-lg" />
      </div>
    </ScreenBone>
  );
}

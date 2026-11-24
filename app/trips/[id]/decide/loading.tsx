import { BoardBone, Bone, ScreenBone } from "@/components/trip-aside/skeleton";

/** Decide tab: favourite board, private-budget link, action buttons, option cards. */
export default function Loading() {
  return (
    <ScreenBone>
      <BoardBone />
      <Bone className="h-[62px] rounded-xl" />
      <div className="grid grid-cols-2 gap-2">
        <Bone className="h-11 rounded-lg" />
        <Bone className="h-11 rounded-lg" />
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="grid gap-3 rounded-xl border bg-card p-4">
          <Bone className="aspect-[16/9] rounded-lg" />
          <Bone className="h-[18px] w-2/3" />
          <Bone className="h-3 w-1/2" />
          <div className="flex gap-2">
            <Bone className="h-11 w-24 rounded-full" />
            <Bone className="h-11 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </ScreenBone>
  );
}

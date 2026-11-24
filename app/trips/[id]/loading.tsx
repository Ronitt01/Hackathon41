import { BoardBone, Bone, HeadingBone, RowsBone, ScreenBone } from "@/components/trip-aside/skeleton";

/** Trip tab: squad board, who's in with stickers, invite button, open tasks. */
export default function Loading() {
  return (
    <ScreenBone>
      <BoardBone />
      <HeadingBone />
      <RowsBone rows={4} avatars />
      <Bone className="h-11 w-44 rounded-lg" />
      <HeadingBone hint={false} />
      <RowsBone rows={3} />
    </ScreenBone>
  );
}

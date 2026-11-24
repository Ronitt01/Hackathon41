import { BoardBone, HeadingBone, RowsBone, ScreenBone } from "@/components/trip-aside/skeleton";

/** Crew: roles board, roles, tasks, who brings what. */
export default function Loading() {
  return (
    <ScreenBone>
      <BoardBone />
      <HeadingBone />
      <RowsBone rows={4} avatars />
      <HeadingBone hint={false} />
      <RowsBone rows={3} />
      <HeadingBone />
      <RowsBone rows={3} />
    </ScreenBone>
  );
}

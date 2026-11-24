import { BoardBone, CardBone, HeadingBone, RowsBone, ScreenBone } from "@/components/trip-aside/skeleton";

/** Money tab: balance board, balances, add-expense form, expenses. */
export default function Loading() {
  return (
    <ScreenBone>
      <BoardBone />
      <HeadingBone />
      <RowsBone rows={4} avatars />
      <CardBone fields={3} />
      <HeadingBone hint={false} />
      <RowsBone rows={3} />
    </ScreenBone>
  );
}

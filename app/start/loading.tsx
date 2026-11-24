import { BoardBone, Bone, CardBone, HeadingBone, RowsBone, ScreenBone } from "@/components/trip-aside/skeleton";

/** /start: truck, wordmark board, start-a-trip form, your trips. */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-12">
      <ScreenBone className="gap-6">
        <Bone className="mx-auto aspect-[3/2] w-full max-w-[280px] rounded-lg" />
        <BoardBone />
        <HeadingBone />
        <CardBone fields={2} />
        <HeadingBone hint={false} />
        <RowsBone rows={3} />
      </ScreenBone>
    </main>
  );
}

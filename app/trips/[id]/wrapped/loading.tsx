import { Bone, ScreenBone } from "@/components/trip-aside/skeleton";

/** Trip Wrapped: one tall story card. */
export default function Loading() {
  return (
    <ScreenBone>
      <Bone className="mx-auto aspect-[9/16] w-full max-w-sm rounded-md" />
    </ScreenBone>
  );
}

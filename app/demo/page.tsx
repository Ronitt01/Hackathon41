import { redirect } from "next/navigation";

// Stages 2 + 3 are real now; old /demo links land on the trips list.
export default function DemoTrip() {
  redirect("/start");
}

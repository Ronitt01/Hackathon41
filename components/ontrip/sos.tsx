"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessageCircle, MessageSquare, Phone, Siren, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";

export type Contact = { id: string; name: string; phone: string };

const digits = (phone: string) => phone.replace(/[^\d+]/g, "");

function locate(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 });
  });
}

/** T-5: SOS → confirm → location → prefilled SMS to my emergency contacts + WhatsApp share + a line in the group chat. */
export function Sos({ tripId, meId, contacts }: { tripId: string; meId: string; contacts: Contact[] }) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirm" | "locating" | "ready">("idle");
  const [links, setLinks] = useState<{ sms: string; wa: string; located: boolean; posted: boolean } | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  async function sendSos() {
    setStep("locating");
    const pos = await locate();
    const where = pos ? `My location: https://maps.google.com/?q=${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}` : "I couldn't share my location.";
    const text = `SOS: I need help. ${where}`;
    const recipients = contacts.map((c) => digits(c.phone)).filter(Boolean).join(",");
    // The group sees it in chat even if no SMS goes out.
    const { error } = await createClient().from("messages").insert({ trip_id: tripId, member_id: meId, body: text });
    const next = { sms: `sms:${recipients}?&body=${encodeURIComponent(text)}`, wa: `https://wa.me/?text=${encodeURIComponent(text)}`, located: !!pos, posted: !error };
    // No auto-redirect to sms: — after the await the tap no longer counts as a user gesture and Android Chrome blocks it; the focused Send SMS link is the next tap.
    setLinks(next);
    setStep("ready");
  }

  async function addContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return setError("Enter the contact's name.");
    if (digits(phone).replace("+", "").length < 7) return setError("Enter a phone number, like +91 98765 43210.");
    setPending(true);
    const { error } = await createClient().from("emergency_contacts").insert({ name: name.trim().slice(0, 60), phone: phone.trim() });
    setPending(false);
    if (error) return setError(errorMessage(error));
    setError(null);
    setName("");
    setPhone("");
    router.refresh();
  }

  async function removeContact(id: string) {
    setPending(true);
    const { error } = await createClient().from("emergency_contacts").delete().eq("id", id);
    setPending(false);
    setRemoving(null);
    if (error) return setError(errorMessage(error));
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      {step === "idle" && (
        <Button className="h-14 bg-destructive text-[17px] font-bold text-white hover:bg-destructive/90" onClick={() => setStep("confirm")}>
          <Siren aria-hidden strokeWidth={2} className="size-5" />
          SOS
        </Button>
      )}
      {step === "confirm" && (
        <div role="alertdialog" aria-labelledby="sos-confirm" className="grid gap-3 rounded-xl border border-destructive bg-card p-4">
          <p id="sos-confirm" className="font-semibold">
            Send an SOS with your location to {contacts.length ? `${contacts.length === 1 ? "your emergency contact" : `your ${contacts.length} emergency contacts`} and ` : ""}the group chat?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button className="h-11 bg-destructive text-white hover:bg-destructive/90" autoFocus onClick={sendSos}>Send SOS</Button>
            <Button variant="outline" className="h-11 bg-card" onClick={() => setStep("idle")}>Cancel</Button>
          </div>
        </div>
      )}
      {step === "locating" && <p aria-live="assertive" className="font-semibold">Getting your location…</p>}
      {step === "ready" && links && (
        <div className="grid gap-2" aria-live="assertive">
          <p className="font-semibold">
            {links.posted ? "SOS posted in the group chat." : "Couldn't post in the group chat. Send the SMS or WhatsApp below."}{links.located ? "" : " Your location wasn't available; allow location access and try again if you can."}
            {contacts.length ? " Now tap Send SMS to text your contacts." : " Tap Send SMS or WhatsApp to send it to someone."}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <a href={links.sms} autoFocus className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-ink px-4 font-semibold text-wash hover:bg-ink/80">
              <MessageSquare aria-hidden strokeWidth={1.8} className="size-4" />
              Send SMS
            </a>
            <a href={links.wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border bg-card px-4 font-semibold hover:bg-muted">
              <MessageCircle aria-hidden strokeWidth={1.8} className="size-4" />
              WhatsApp
            </a>
          </div>
          <Button variant="ghost" className="h-11" onClick={() => setStep("idle")}>Done</Button>
        </div>
      )}

      <div className="grid gap-2">
        <h3 className="text-[15px] font-bold">Emergency contacts</h3>
        {contacts.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No contacts yet. Add someone at home so SOS can text them too.</p>
        ) : (
          <ul className="divide-y border-y" aria-label="Emergency contacts">
            {contacts.map((c) => (
              <li key={c.id} className="flex min-h-12 items-center gap-3 py-1">
                <Phone aria-hidden strokeWidth={1.8} className="size-4 shrink-0 text-muted-foreground" />
                <span className="grid min-w-0 flex-1">
                  <span className="truncate font-semibold">{c.name}</span>
                  <span className="text-[13px] tabular text-muted-foreground">{c.phone}</span>
                </span>
                {removing === c.id ? (
                  <span className="flex gap-1">
                    <Button className="h-11 bg-destructive px-3 text-[13px] text-white hover:bg-destructive/90" disabled={pending} onClick={() => removeContact(c.id)}>
                      Remove<span className="sr-only"> {c.name}</span>
                    </Button>
                    <Button variant="ghost" className="h-11 px-3 text-[13px]" onClick={() => setRemoving(null)}>Cancel</Button>
                  </span>
                ) : (
                  <Button variant="ghost" className="size-11 p-0" aria-label={`Remove ${c.name}`} onClick={() => setRemoving(c.id)}>
                    <Trash2 aria-hidden strokeWidth={1.8} className="size-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addContact} className="grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ec-name">Name</Label>
              <Input id="ec-name" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} className="h-11 bg-card" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ec-phone">Phone</Label>
              <Input id="ec-phone" type="tel" autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91" className="h-11 bg-card tabular" />
            </div>
          </div>
          <Button type="submit" variant="outline" className="h-11 bg-card" disabled={pending}>Add contact</Button>
          {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
          <p className="text-[13px] text-muted-foreground">Saved to your account for every trip. Only you see them.</p>
        </form>
      </div>
    </div>
  );
}

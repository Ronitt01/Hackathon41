import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { extractKeywords, MAX_CHAT_CHARS, OPTION_KINDS, parseChat, parseProposals, type Proposal } from "@/lib/chat-import";
import { createClient } from "@/lib/supabase/server";
import { TAGS } from "@/lib/tags";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * D-6: WhatsApp export → proposed options for the organizer to review. Nothing is stored and the chat
 * is never logged; only message text (no names, timestamps, mentions or phone numbers) reaches Claude.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/trips/[id]/import-chat">) {
  const { id: tripId } = await ctx.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "Please sign in first.");
  const { data: me } = await supabase.from("members").select("role").eq("trip_id", tripId).eq("user_id", auth.user.id).neq("status", "dropped").maybeSingle();
  if (!me) return fail(404, "Trip not found.");
  if (me.role !== "organizer") return fail(403, "Only the organizer can import a chat.");

  const raw = await request.text();
  if (raw.length > MAX_CHAT_CHARS + 10_000) return fail(413, "That chat is too long. Export a shorter stretch (under 200 KB).");
  let body: { text?: unknown; consent?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, "Couldn't read that chat. Please try again.");
  }
  if (body.consent !== true) return fail(400, "Tick that everyone in the chat is OK with this.");
  const lines = typeof body.text === "string" ? parseChat(body.text) : [];
  if (!lines.length) return fail(400, "No messages found. Paste the chat or pick the .txt from WhatsApp's Export chat.");

  const ai = await fromClaude(lines);
  return NextResponse.json({ proposals: ai ?? extractKeywords(lines), source: ai ? "ai" : "keywords" });
}

const SYSTEM = `You read a friend group's chat about a trip in India and pull out ideas to vote on, as JSON.
- destination: places they mention as where to go. activity / food / stay / transport: concrete ideas.
- Date ranges: kind "other", title like "Dates: 12–15 Dec". Budgets: ONE kind "other" proposal giving the range the group mentioned, like "Budget: ₹8,000–₹12,000"; never who said what or any one person's budget.
- Never include anyone's name, phone number or anything personal. Short titles (under 60 characters), no duplicates, at most 15.
- tags: only from the given tag ids, only when they clearly fit.`;

async function fromClaude(lines: string[]): Promise<Proposal[] | null> {
  if (!process.env.ANTHROPIC_API_KEY || process.env.DEMO_MODE === "1") return null;
  try {
    const response = await new Anthropic().beta.messages.create(
      {
        model: process.env.CLAUDE_MODEL || "claude-opus-5-5",
        max_tokens: 4000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: {
          effort: "low",
          format: {
            type: "json_schema",
            schema: {
              type: "object",
              properties: {
                proposals: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      kind: { type: "string", enum: [...OPTION_KINDS] },
                      title: { type: "string" },
                      tags: { type: "array", items: { type: "string", enum: TAGS.map((t) => t.id) } },
                    },
                    required: ["kind", "title", "tags"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["proposals"],
              additionalProperties: false,
            },
          },
        },
        system: SYSTEM,
        messages: [{ role: "user", content: `Chat messages, one per line:\n${lines.join("\n")}` }],
      },
      { timeout: 15_000, maxRetries: 0 },
    );
    if (response.stop_reason !== "end_turn") throw new Error(`Claude stopped: ${response.stop_reason}`);
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const proposals = parseProposals(JSON.parse(text));
    return proposals.length ? proposals : null;
  } catch (err) {
    console.error("import-chat: Claude failed, using keywords:", err instanceof Error ? err.message : "unknown"); // never log the chat
    return null;
  }
}

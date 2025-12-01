import { openai } from "@ai-sdk/openai";
import { streamText, UIMessage, convertToModelMessages } from "ai";
import { randomUUID } from "crypto";
import { saveChat } from "@/lib/save-chat";

// Vercel hobby plan allows up to 300 seconds
export const maxDuration = 300;

export async function POST(req: Request) {
  const { messages, id }: { messages: UIMessage[]; id?: string } =
    await req.json();
  const sessionId = id ?? randomUUID();

  const result = streamText({
    model: openai("gpt-4o"),
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onFinish: async ({ messages }) => {
      try {
        await saveChat(messages, sessionId);
      } catch (err) {
        console.error("Failed to save chat", err);
      }
    },
  });
}

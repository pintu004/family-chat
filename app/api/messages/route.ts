import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

const familyEmails =
  process.env.FAMILY_ALLOWED_EMAILS?.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean) ?? [];

const isFamilyMember = (email: string | null | undefined) =>
  !!email && familyEmails.includes(email.toLowerCase());

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isFamilyMember(session.user.email)) {
      return NextResponse.json(
        { error: "This room is restricted to family members." },
        { status: 403 },
      );
    }

    const messages = await prisma.message.findMany({
      orderBy: { createdAt: "asc" },
    });

    const uiMessages = messages.map((msg) => ({
      id: msg.id,
      role: msg.role.toLowerCase(),
      parts: JSON.parse(msg.content),
    }));

    return NextResponse.json({ messages: uiMessages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isFamilyMember(session.user.email)) {
      return NextResponse.json(
        { error: "This room is restricted to family members." },
        { status: 403 },
      );
    }

    const { name, text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Message text required" }, { status: 400 });
    }

    const displayName =
      typeof name === "string" && name.trim().length > 0
        ? name.trim().slice(0, 50)
        : session.user.name || "Guest";

    const content = JSON.stringify([
      { type: "text", text: `${displayName}: ${text}` },
    ]);

    const message = await prisma.message.create({
      data: {
        role: "USER",
        content,
        session: {
          connectOrCreate: {
            where: { id: "family-room" },
            create: { id: "family-room" },
          },
        },
      },
    });

    return NextResponse.json({
      id: message.id,
      role: "user",
      parts: JSON.parse(message.content),
      createdAt: message.createdAt,
    });
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json({ error: "Failed to post message" }, { status: 500 });
  }
}

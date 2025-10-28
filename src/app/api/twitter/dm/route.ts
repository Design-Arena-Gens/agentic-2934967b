import { NextResponse } from "next/server";
import { z } from "zod";

import { sendDirectMessage } from "@/lib/twitter";

const recipientSchema = z
  .object({
    handle: z.string().optional(),
    id: z.string().optional(),
  })
  .refine((value) => value.handle || value.id, {
    message: "Provide a handle or an id for each recipient.",
  });

const schema = z.object({
  message: z.string().min(6, "Message must be at least 6 characters."),
  recipients: z.array(recipientSchema).min(1, "Provide at least one recipient."),
});

export async function POST(request: Request) {
  try {
    const payload = schema.safeParse(await request.json());

    if (!payload.success) {
      return NextResponse.json(
        { message: "Invalid request payload.", issues: payload.error.flatten() },
        { status: 400 },
      );
    }

    const outcomes = [];
    for (const recipient of payload.data.recipients) {
      const response = await sendDirectMessage({
        recipientHandle: recipient.handle,
        recipientId: recipient.id,
        message: payload.data.message,
      });
      outcomes.push(response);
    }

    return NextResponse.json({
      status: "sent",
      outcomes,
    });
  } catch (error) {
    console.error("[api/twitter/dm]", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to send direct message(s). Check server logs.",
      },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { publishTweet } from "@/lib/twitter";

const schema = z.object({
  tweet: z.string().min(8, "Tweet must contain at least 8 characters."),
  altText: z.string().optional(),
  imageBase64: z.string().optional(),
  thread: z.array(z.string().min(1)).optional(),
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

    const result = await publishTweet({
      status: payload.data.tweet,
      altText: payload.data.altText,
      imageBase64: payload.data.imageBase64,
      thread: payload.data.thread,
    });

    return NextResponse.json({
      status: "posted",
      tweet: result.data,
    });
  } catch (error) {
    console.error("[api/twitter/publish]", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to publish tweet. Check server logs.",
      },
      { status: 500 },
    );
  }
}

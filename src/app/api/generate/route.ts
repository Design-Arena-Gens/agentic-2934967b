import { NextResponse } from "next/server";
import { z } from "zod";

import {
  generateTweetPayload,
  type TweetTone,
} from "@/lib/openai";

const requestSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters long."),
  niche: z.string().min(3, "Niche must be at least 3 characters long."),
  tone: z.enum(
    [
      "professional",
      "playful",
      "informative",
      "thoughtful",
      "inspirational",
      "promotional",
      "witty",
    ] satisfies TweetTone[],
  ),
  callToAction: z.string().optional(),
  includeImage: z.boolean().optional().default(false),
  brandVoice: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid request payload.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const tweet = await generateTweetPayload({
      ...parsed.data,
      hashtags: parsed.data.hashtags,
    });

    return NextResponse.json(tweet);
  } catch (error) {
    console.error("[api/generate]", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate content. Check server logs.",
      },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { performEngagement } from "@/lib/twitter";

const schema = z.object({
  engagements: z
    .array(
      z.object({
        tweetId: z.string().min(6).optional(),
        searchQuery: z.string().min(3).optional(),
        limit: z.number().int().positive().max(10).optional(),
        action: z.enum(["like", "retweet", "reply"]),
        message: z.string().optional(),
      }).refine((value) => value.tweetId || value.searchQuery, {
        message: "Provide a tweetId or searchQuery for each engagement action.",
      }),
    )
    .min(1, "Provide at least one engagement action."),
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

    const results = await performEngagement(payload.data.engagements);

    return NextResponse.json({
      status: "ok",
      results,
    });
  } catch (error) {
    console.error("[api/twitter/engage]", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to process engagement actions. Check server logs.",
      },
      { status: 500 },
    );
  }
}

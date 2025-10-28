import { NextResponse } from "next/server";
import { z } from "zod";

import { buildWorkflow } from "@/lib/workflow";

const schema = z.object({
  workflowName: z.string().min(3),
  formPath: z.string().regex(/^[a-z0-9-]+$/i),
  openAiCredentialName: z.string().min(2),
  twitterCredentialName: z.string().min(2),
  tone: z.string().default("professional"),
  includeImage: z.boolean().default(true),
  includeEngagement: z.boolean().default(true),
  includeDm: z.boolean().default(true),
  engagementHashtags: z.array(z.string()).default([]),
  dmHandles: z.array(z.string()).default([]),
});

export async function POST(request: Request) {
  try {
    const data = schema.safeParse(await request.json());

    if (!data.success) {
      return NextResponse.json(
        { message: "Invalid workflow configuration.", issues: data.error.flatten() },
        { status: 400 },
      );
    }

    const workflow = buildWorkflow(data.data);

    return NextResponse.json(workflow);
  } catch (error) {
    console.error("[api/workflow]", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to build workflow definition.",
      },
      { status: 500 },
    );
  }
}

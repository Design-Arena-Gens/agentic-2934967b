import OpenAI from "openai";

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";

let openaiClient: OpenAI | null = null;

function getOpenAiClient(): OpenAI {
  if (openaiClient) return openaiClient;

  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Set it to enable AI tweet generation.",
    );
  }

  openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

export type TweetTone =
  | "professional"
  | "playful"
  | "informative"
  | "thoughtful"
  | "inspirational"
  | "promotional"
  | "witty";

export interface TweetGenerationRequest {
  topic: string;
  niche: string;
  tone: TweetTone;
  callToAction?: string;
  includeImage?: boolean;
  brandVoice?: string;
  hashtags?: string[];
}

export interface TweetGenerationResult {
  tweet: string;
  altText?: string;
  thread: string[];
  imageBase64?: string;
  imagePrompt?: string;
  dmMessage: string;
  engagementTargets: string[];
}

const defaultHashtags = ["#AI", "#Automation", "#Marketing"];

export async function generateTweetPayload(
  input: TweetGenerationRequest,
): Promise<TweetGenerationResult> {
  const hashtags =
    input.hashtags?.length && input.hashtags.some((tag) => tag.trim() !== "")
      ? input.hashtags
      : defaultHashtags;

  const systemPrompt = `You are a social media strategist specialising in Twitter growth through authentic engagement.
Respond in JSON with keys: tweet, thread (array of follow-up tweets), altText, imagePrompt, dmMessage, engagementTargets (array of search phrases).
Tweets must be 250 characters or fewer and stay consistent with user tone requests.`;

  const userPrompt = `
Topic: ${input.topic}
Niche: ${input.niche}
Tone: ${input.tone}
Brand notes: ${input.brandVoice ?? "Use concise, confident voice."}
Call to action: ${input.callToAction ?? "Encourage replies and link clicks."}
Include hashtags: ${hashtags.join(", ")}
`;

  const client = getOpenAiClient();

  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0.7,
    max_tokens: 800,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "twitter_workflow_payload",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["tweet", "thread", "altText", "dmMessage", "engagementTargets"],
          properties: {
            tweet: { type: "string" },
            thread: {
              type: "array",
              items: { type: "string" },
            },
            altText: { type: "string" },
            imagePrompt: { type: "string" },
            dmMessage: { type: "string" },
            engagementTargets: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
    },
  });

  const rawContent = completion.choices[0]?.message?.content;

  if (!rawContent) {
    throw new Error("OpenAI did not return any content for the tweet prompt.");
  }

  const parsed = JSON.parse(rawContent) as TweetGenerationResult;

  let imageBase64: string | undefined;
  if (input.includeImage && parsed.imagePrompt) {
    const imageResponse = await client.images.generate({
      model: OPENAI_IMAGE_MODEL,
      size: "1024x1024",
      response_format: "b64_json",
      prompt: parsed.imagePrompt,
    });

    imageBase64 = imageResponse.data?.[0]?.b64_json ?? undefined;
  }

  return {
    tweet: parsed.tweet,
    thread: parsed.thread ?? [],
    altText: parsed.altText,
    imagePrompt: parsed.imagePrompt,
    imageBase64,
    dmMessage: parsed.dmMessage,
    engagementTargets:
      parsed.engagementTargets?.length ?? 0
        ? parsed.engagementTargets
        : hashtags.map((tag) => `${tag} conversations`),
  };
}

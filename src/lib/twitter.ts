import { TwitterApi, TwitterApiReadWrite } from "twitter-api-v2";

type TwitterAction =
  | "tweet"
  | "like"
  | "retweet"
  | "reply"
  | "dm";

let twitterClient: TwitterApiReadWrite | null = null;
let currentUserId: string | null = null;

export interface PublishTweetPayload {
  status: string;
  altText?: string;
  thread?: string[];
  imageBase64?: string;
}

export interface EngagementRequest {
  tweetId?: string;
  searchQuery?: string;
  limit?: number;
  action: Exclude<TwitterAction, "tweet" | "dm">;
  message?: string;
}

export interface DirectMessageRequest {
  recipientHandle?: string;
  recipientId?: string;
  message: string;
}

function ensureTwitterClient(): TwitterApiReadWrite {
  if (twitterClient) {
    return twitterClient;
  }

  const key = process.env.TWITTER_API_KEY;
  const secret = process.env.TWITTER_API_SECRET;
  const token = process.env.TWITTER_ACCESS_TOKEN;
  const tokenSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!key || !secret || !token || !tokenSecret) {
    throw new Error(
      "Twitter credentials are missing. Set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, and TWITTER_ACCESS_SECRET.",
    );
  }

  twitterClient = new TwitterApi({
    appKey: key,
    appSecret: secret,
    accessToken: token,
    accessSecret: tokenSecret,
  });

  return twitterClient;
}

async function getCurrentUserId(): Promise<string> {
  if (currentUserId) return currentUserId;
  const client = ensureTwitterClient();
  const me = await client.currentUserV2();
  currentUserId = me.data.id;
  return currentUserId;
}

export async function publishTweet(payload: PublishTweetPayload) {
  const client = ensureTwitterClient();

  let mediaId: string | undefined;
  if (payload.imageBase64) {
    const buffer = Buffer.from(payload.imageBase64, "base64");
    mediaId = await client.v1.uploadMedia(buffer, { mimeType: "image/png" });
    if (payload.altText) {
      await client.v1.createMediaMetadata(mediaId, {
        alt_text: { text: payload.altText },
      });
    }
  }

  const tweetResponse = await client.v2.tweet(payload.status, {
    media: mediaId ? { media_ids: [mediaId] } : undefined,
  });

  if (payload.thread?.length) {
    let replyTo = tweetResponse.data.id;
    for (const threadTweet of payload.thread) {
      const reply = await client.v2.tweet(threadTweet, {
        reply: { in_reply_to_tweet_id: replyTo },
      });
      replyTo = reply.data.id;
    }
  }

  return tweetResponse;
}

export async function performEngagement(requests: EngagementRequest[]) {
  if (!requests.length) return [];
  const client = ensureTwitterClient();
  const userId = await getCurrentUserId();

  const results = [];
  for (const request of requests) {
    const targets: string[] = [];

    if (request.tweetId) {
      targets.push(request.tweetId);
    }

    if (request.searchQuery) {
      const search = await client.v2.search(request.searchQuery, {
        max_results: Math.min(request.limit ?? 5, 10),
        "tweet.fields": ["author_id"],
      });

      for await (const tweet of search) {
        if (tweet.id) targets.push(tweet.id);
        if (targets.length >= (request.limit ?? 5)) break;
      }
    }

    for (const tweetId of targets) {
      if (request.action === "like") {
        results.push(await client.v2.like(userId, tweetId));
      } else if (request.action === "retweet") {
        results.push(await client.v2.retweet(userId, tweetId));
      } else if (request.action === "reply") {
        if (!request.message) {
          throw new Error("Reply action requires a message.");
        }
        results.push(await client.v2.reply(request.message, tweetId, {}));
      }
    }
  }
  return results;
}

export async function sendDirectMessage(request: DirectMessageRequest) {
  const client = ensureTwitterClient();

  let recipientId = request.recipientId;
  if (!recipientId && request.recipientHandle) {
    const user = await client.v2.userByUsername(request.recipientHandle);
    recipientId = user.data.id;
  }

  if (!recipientId) {
    throw new Error(
      "Recipient information is missing. Provide recipientId or recipientHandle.",
    );
  }

  const v1Client = client.v1 as unknown as {
    sendDm: (params: { recipient_id: string; text: string }) => Promise<unknown>;
  };

  return v1Client.sendDm({
    recipient_id: recipientId,
    text: request.message,
  });
}

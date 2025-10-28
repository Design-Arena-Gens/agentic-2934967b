# Twitter AI Workflow Builder

A Next.js application that produces an importable n8n workflow for AI-assisted Twitter automation. The generated workflow:

- Collects strategic inputs via the **Form Trigger** node (topic, niche, tone, hashtags, DM targets)
- Calls this deployment to generate tweet copy, a thread, optional imagery, engagement hooks, and DM scripts
- Publishes tweets (with optional media + thread) using the Twitter API
- Engages with relevant conversations (likes, retweets, replies) based on AI-curated searches
- Sends tailored outreach DMs to a list of brands or partners

The project also exposes API endpoints used both by the UI previewer and the n8n workflow.

## Environment Variables

Set the following secrets before running locally or deploying to Vercel:

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Required for tweet + image generation |
| `OPENAI_MODEL` (optional) | Defaults to `gpt-4o-mini` |
| `OPENAI_IMAGE_MODEL` (optional) | Defaults to `gpt-image-1` |
| `TWITTER_API_KEY` | Twitter app key (OAuth 1.0a) |
| `TWITTER_API_SECRET` | Twitter app secret |
| `TWITTER_ACCESS_TOKEN` | User access token with write + DM scopes |
| `TWITTER_ACCESS_SECRET` | User access token secret |
| `NEXT_PUBLIC_WORKER_BASE_URL` (optional) | Override the base URL used inside the generated n8n workflow |

## Development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to configure and download the workflow JSON. Use the **Preview AI Output** button to test your OpenAI integration.

## API Overview

| Endpoint | Description |
| --- | --- |
| `POST /api/generate` | Returns AI-generated tweet content, image (base64), DM message, and engagement targets |
| `POST /api/twitter/publish` | Publishes a tweet/thread with optional media |
| `POST /api/twitter/engage` | Performs like/retweet/reply actions; accepts tweet IDs or search queries |
| `POST /api/twitter/dm` | Sends direct messages to listed handles or user IDs |
| `POST /api/workflow` | Generates the n8n workflow definition from UI inputs |

## Importing the Workflow in n8n

1. Generate the workflow JSON from this app.
2. In n8n, go to **Workflows → Import from File** and select the downloaded JSON.
3. Set the referenced credentials (`OpenAI` + `Twitter`) to match your instance.
4. Publish the workflow or schedule execution as needed. The Form Trigger URL will be:
   `https://<your-n8n-host>/form/<formPath>`

Ensure your Vercel deployment is reachable by your n8n instance so the HTTP Request nodes can communicate successfully.

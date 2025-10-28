'use client';

import { useMemo, useState, useTransition } from "react";

type ToneOption =
  | "professional"
  | "playful"
  | "informative"
  | "thoughtful"
  | "inspirational"
  | "promotional"
  | "witty";

interface WorkflowResponse {
  workflow: Record<string, unknown>;
  metadata: {
    downloadName: string;
    createdAt: string;
  };
}

const toneOptions: { label: string; value: ToneOption }[] = [
  { label: "Professional", value: "professional" },
  { label: "Playful", value: "playful" },
  { label: "Informative", value: "informative" },
  { label: "Thoughtful", value: "thoughtful" },
  { label: "Inspirational", value: "inspirational" },
  { label: "Promotional", value: "promotional" },
  { label: "Witty", value: "witty" },
];

const defaultState = {
  workflowName: "Twitter AI Flywheel",
  formPath: "twitter-ai-brief",
  openAiCredentialName: "OpenAI Account",
  twitterCredentialName: "Twitter RW App",
  includeImage: true,
  includeEngagement: true,
  includeDm: true,
  tone: "professional" as ToneOption,
  engagementHashtags: "#AI,#nocode,#automation",
  dmHandles: "OpenAI,vercel",
};

export function WorkflowBuilder() {
  const [form, setForm] = useState(defaultState);
  const [workflow, setWorkflow] = useState<WorkflowResponse | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const workflowJson = useMemo(() => {
    if (!workflow) return "";
    return JSON.stringify(workflow.workflow, null, 2);
  }, [workflow]);

  function updateField<K extends keyof typeof defaultState>(key: K, value: (typeof defaultState)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleGenerateWorkflow(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          engagementHashtags: form.engagementHashtags
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          dmHandles: form.dmHandles
            .split(",")
            .map((value) => value.trim().replace("@", ""))
            .filter(Boolean),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(
          payload?.message ??
            payload?.error ??
            `Unable to generate workflow (status ${response.status}).`,
        );
        return;
      }

      const payload = (await response.json()) as WorkflowResponse;
      setWorkflow(payload);
    });
  }

  async function handlePreview() {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: "AI driven marketing ideas",
          niche: "SaaS founders",
          tone: form.tone,
          includeImage: form.includeImage,
          hashtags: form.engagementHashtags
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          callToAction: "Invite users to join waitlist.",
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(
          payload?.message ??
            payload?.error ??
            `Unable to generate preview (status ${response.status}).`,
        );
        return;
      }

      const payload = await response.json();
      setPreview(JSON.stringify(payload, null, 2));
    });
  }

  function handleDownload() {
    if (!workflow) return;
    const blob = new Blob([workflowJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = workflow.metadata.downloadName;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopy() {
    if (!workflowJson) return;
    await navigator.clipboard.writeText(workflowJson);
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="rounded-3xl border border-zinc-200 bg-white/80 bg-gradient-to-br from-white via-white to-blue-50 p-8 shadow-sm backdrop-blur dark:border-zinc-700 dark:from-zinc-900 dark:via-zinc-900 dark:to-slate-900">
        <header className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-500">
            n8n Workflow Generator
          </p>
          <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            Twitter AI Automation Blueprint
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Build an importable n8n workflow that captures a creative brief, generates AI-powered tweets
            (with optional imagery), posts to Twitter, engages with relevant conversations, and sends targeted DMs.
          </p>
        </header>

        <form className="mt-8 grid gap-6 md:grid-cols-2" onSubmit={handleGenerateWorkflow}>
          <fieldset className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Workflow Name
            </label>
            <input
              required
              value={form.workflowName}
              onChange={(event) => updateField("workflowName", event.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              placeholder="Twitter AI Automation"
            />
          </fieldset>

          <fieldset className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Public Form Path
            </label>
            <input
              required
              value={form.formPath}
              onChange={(event) => updateField("formPath", event.target.value.replace(/[^a-z0-9-]/gi, "-"))}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              placeholder="twitter-ai-brief"
            />
            <p className="text-xs text-zinc-500">
              This becomes the public URL: <code className="font-mono">https://YOUR-N8N-URL/form/{form.formPath || "your-path"}</code>
            </p>
          </fieldset>

          <fieldset className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              OpenAI Credential Name
            </label>
            <input
              required
              value={form.openAiCredentialName}
              onChange={(event) => updateField("openAiCredentialName", event.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              placeholder="OpenAI Account"
            />
            <p className="text-xs text-zinc-500">
              Name of the OpenAI credential already configured in your n8n instance.
            </p>
          </fieldset>

          <fieldset className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Twitter Credential Name
            </label>
            <input
              required
              value={form.twitterCredentialName}
              onChange={(event) => updateField("twitterCredentialName", event.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              placeholder="Twitter RW Credential"
            />
            <p className="text-xs text-zinc-500">
              OAuth 1.0a credential with tweet, like, retweet, reply, and DM permissions.
            </p>
          </fieldset>

          <fieldset className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Default Tone
            </label>
            <select
              value={form.tone}
              onChange={(event) => updateField("tone", event.target.value as ToneOption)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {toneOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-500">
              Users can override this on the form before launching the workflow.
            </p>
          </fieldset>

          <fieldset className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Engagement Hashtags
            </label>
            <input
              value={form.engagementHashtags}
              onChange={(event) => updateField("engagementHashtags", event.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              placeholder="#AI,#startups,#automation"
            />
            <p className="text-xs text-zinc-500">
              Comma separated list used for the engagement search node.
            </p>
          </fieldset>

          <fieldset className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Target DM Accounts
            </label>
            <input
              value={form.dmHandles}
              onChange={(event) => updateField("dmHandles", event.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              placeholder="OpenAI,vercel"
            />
            <p className="text-xs text-zinc-500">
              Comma separated Twitter handles. Remove the `@` sign; you can customise inside n8n later.
            </p>
          </fieldset>

          <fieldset className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Features
            </label>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm shadow-inner dark:border-zinc-700 dark:bg-zinc-900">
                <input
                  type="checkbox"
                  checked={form.includeImage}
                  onChange={(event) => updateField("includeImage", event.target.checked)}
                  className="h-4 w-4 rounded accent-blue-500"
                />
                AI Image Variations
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm shadow-inner dark:border-zinc-700 dark:bg-zinc-900">
                <input
                  type="checkbox"
                  checked={form.includeEngagement}
                  onChange={(event) => updateField("includeEngagement", event.target.checked)}
                  className="h-4 w-4 rounded accent-blue-500"
                />
                Engagement Actions
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm shadow-inner dark:border-zinc-700 dark:bg-zinc-900">
                <input
                  type="checkbox"
                  checked={form.includeDm}
                  onChange={(event) => updateField("includeDm", event.target.checked)}
                  className="h-4 w-4 rounded accent-blue-500"
                />
                Outreach DMs
              </label>
            </div>
          </fieldset>

          <div className="col-span-full flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isPending ? "Building Workflow…" : "Generate Workflow JSON"}
            </button>
            <button
              type="button"
              onClick={handlePreview}
              disabled={isPending}
              className="flex items-center gap-2 rounded-full border border-blue-600 px-6 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:border-blue-300 disabled:text-blue-300"
            >
              Preview AI Output
            </button>
          </div>
        </form>

        {error && (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
      </section>

      {workflow && (
        <section className="space-y-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Workflow JSON
              </h2>
              <p className="text-xs text-zinc-500">
                Import this file in n8n (Settings → Workflow → Import from File).
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCopy}
                className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Copy
              </button>
              <button
                onClick={handleDownload}
                className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
              >
                Download
              </button>
            </div>
          </header>
          <div className="max-h-[480px] overflow-auto rounded-2xl border border-zinc-200 bg-zinc-950 p-4 text-xs text-zinc-100 dark:border-zinc-700">
            <pre className="whitespace-pre text-left">{workflowJson}</pre>
          </div>
        </section>
      )}

      {preview && (
        <section className="space-y-4 rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm dark:border-blue-900/50 dark:bg-blue-950/40">
          <header>
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              AI Preview Payload
            </h2>
            <p className="text-xs text-blue-800/80 dark:text-blue-200/70">
              Generated Tweet, thread, DM draft, and engagement target suggestions for the sample input.
            </p>
          </header>
          <pre className="max-h-80 overflow-auto rounded-2xl bg-blue-950/90 p-4 text-xs text-blue-50">
            {preview}
          </pre>
        </section>
      )}

      <section className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <header>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Vercel Worker Endpoints
          </h2>
          <p className="text-xs text-zinc-500">
            The n8n workflow hits these HTTP endpoints to leverage AI generation and Twitter automation directly from this deployment.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-zinc-200 p-4 shadow-inner dark:border-zinc-600">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">POST /api/generate</h3>
            <p className="mt-2 text-xs text-zinc-500">
              Accepts form inputs and returns tweet copy, optional image, DM message, and engagement targets.
            </p>
            <code className="mt-3 block rounded-xl bg-zinc-900 p-3 text-xs text-zinc-100">
{`curl https://agentic-2934967b.vercel.app/api/generate \\
  -X POST \\
  -H "Content-Type: application/json" \\
  -d '{"topic":"AI assistants","niche":"Startups","tone":"${form.tone}"}'`}
            </code>
          </article>

          <article className="rounded-2xl border border-zinc-200 p-4 shadow-inner dark:border-zinc-600">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">POST /api/twitter/publish</h3>
            <p className="mt-2 text-xs text-zinc-500">
              Publishes the generated tweet and optional thread with media. Requires configured Twitter credentials.
            </p>
          </article>

          <article className="rounded-2xl border border-zinc-200 p-4 shadow-inner dark:border-zinc-600">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">POST /api/twitter/engage</h3>
            <p className="mt-2 text-xs text-zinc-500">
              Likes, retweets, or replies to curated tweets based on the AI engagement plan.
            </p>
          </article>

          <article className="rounded-2xl border border-zinc-200 p-4 shadow-inner dark:border-zinc-600">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">POST /api/twitter/dm</h3>
            <p className="mt-2 text-xs text-zinc-500">
              Sends outreach messages to selected brands or partners with the AI-crafted DM template.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}

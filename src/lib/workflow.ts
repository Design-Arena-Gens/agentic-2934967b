import { randomUUID } from "crypto";

export interface WorkflowOptions {
  workflowName: string;
  formPath: string;
  openAiCredentialName: string;
  twitterCredentialName: string;
  tone: string;
  includeImage: boolean;
  includeEngagement: boolean;
  includeDm: boolean;
  engagementHashtags: string[];
  dmHandles: string[];
}

interface WorkflowNode {
  parameters: Record<string, unknown>;
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  credentials?: Record<string, { name: string }>;
  notes?: string;
  disabled?: boolean;
  webhookId?: string;
}

interface WorkflowConnection {
  main: Array<Array<{ node: string; type: string; index: number }>>;
}

export interface WorkflowBuildResult {
  workflow: {
    id: string | null;
    name: string;
    active: boolean;
    nodes: WorkflowNode[];
    connections: Record<string, WorkflowConnection>;
    versionId: string;
    settings: Record<string, unknown>;
    staticData: Record<string, unknown> | undefined;
    tags: Array<{ name: string }>;
  };
  metadata: {
    createdAt: string;
    downloadName: string;
  };
}

const BASE_URL =
  process.env.NEXT_PUBLIC_WORKER_BASE_URL ??
  process.env.WORKER_BASE_URL ??
  "https://agentic-2934967b.vercel.app";

function createFormNode(options: WorkflowOptions): WorkflowNode {
  return {
    parameters: {
      formTitle: `${options.workflowName} Brief`.replace(/\s+/g, " "),
      formDescription:
        "Collects the creative brief details (topic, niche, tone, hashtags) before invoking AI automation.",
      responseMode: "onSubmit",
      fields: [
        {
          fieldLabel: "Topic",
          fieldName: "topic",
          fieldType: "text",
          required: true,
          placeholder: "What should the tweet cover?",
        },
        {
          fieldLabel: "Niche",
          fieldName: "niche",
          fieldType: "text",
          required: true,
          placeholder: "Audience or vertical focus",
        },
        {
          fieldLabel: "Tone",
          fieldName: "tone",
          fieldType: "select",
          required: false,
          optionsCollection: {
            options: [
              "professional",
              "playful",
              "informative",
              "thoughtful",
              "inspirational",
              "promotional",
              "witty",
            ].map((value) => ({ name: value, value })),
          },
          default: options.tone,
        },
        {
          fieldLabel: "Call To Action",
          fieldName: "callToAction",
          fieldType: "textarea",
          required: false,
        },
        {
          fieldLabel: "Generate Image",
          fieldName: "generateImage",
          fieldType: "boolean",
          default: options.includeImage,
        },
        {
          fieldLabel: "Hashtags",
          fieldName: "hashtags",
          fieldType: "text",
          required: false,
          placeholder: "Comma separated optional hashtags",
        },
        {
          fieldLabel: "Engagement Searches",
          fieldName: "engagementFilters",
          fieldType: "textarea",
          required: false,
          placeholder: options.engagementHashtags.join(", "),
        },
        {
          fieldLabel: "DM Targets",
          fieldName: "dmTargets",
          fieldType: "textarea",
          required: false,
          placeholder: options.dmHandles.join(", "),
        },
      ],
      options: {
        webhookPath: options.formPath,
        buttonLabel: "Generate & Launch",
      },
    },
    id: randomUUID(),
    name: "Creative Brief Form",
    type: "n8n-nodes-base.formTrigger",
    typeVersion: 2.4,
    position: [240, 320],
    webhookId: randomUUID(),
  };
}

function createNormalizeNode(position: [number, number], options: WorkflowOptions): WorkflowNode {
  const toneFallback = options.tone;
  const defaultHashtags = JSON.stringify(options.engagementHashtags);
  const defaultHandles = JSON.stringify(options.dmHandles);

  const code = `const input = $json;
const normaliseList = (value, fallback) => {
  if (!value) {
    return fallback;
  }
  const items = value
    .split(',')
    .map((entry) => entry.trim().replace('@', ''))
    .filter(Boolean);
  return items.length ? items : fallback;
};

return [
  {
    json: {
      generateBody: {
        topic: input.topic,
        niche: input.niche,
        tone: input.tone || "${toneFallback}",
        callToAction: input.callToAction,
        includeImage: input.generateImage ?? ${options.includeImage ? "true" : "false"},
        hashtags: normaliseList(input.hashtags, ${defaultHashtags}),
      },
      engagementFilters: normaliseList(input.engagementFilters, ${defaultHashtags}),
      dmTargets: normaliseList(input.dmTargets, ${defaultHandles}),
    },
  },
];`;

  return {
    parameters: {
      functionCode: code,
    },
    id: randomUUID(),
    name: "Normalise Brief",
    type: "n8n-nodes-base.function",
    typeVersion: 2,
    position,
  };
}

function createGenerateNode(position: [number, number]): WorkflowNode {
  return {
    parameters: {
      method: "POST",
      url: `${BASE_URL}/api/generate`,
      sendBody: true,
      jsonParameters: true,
      bodyParametersJson: "={{ JSON.stringify($json.generateBody) }}",
      options: {
        timeout: 60000,
      },
    },
    id: randomUUID(),
    name: "AI Generate",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position,
  };
}

function createPrepareNode(position: [number, number]): WorkflowNode {
  const code = `const payload = $json;
return [
  {
    json: {
      publishBody: {
        tweet: payload.tweet,
        thread: payload.thread,
        altText: payload.altText,
        imageBase64: payload.imageBase64,
      },
      dmBody: {
        message: payload.dmMessage,
      },
      engagementTargets: payload.engagementTargets,
    },
  },
];`;

  return {
    parameters: {
      functionCode: code,
    },
    id: randomUUID(),
    name: "Prepare Payloads",
    type: "n8n-nodes-base.function",
    typeVersion: 2,
    position,
  };
}

function createPublishNode(position: [number, number]): WorkflowNode {
  return {
    parameters: {
      method: "POST",
      url: `${BASE_URL}/api/twitter/publish`,
      sendBody: true,
      jsonParameters: true,
      bodyParametersJson: "={{ JSON.stringify($json.publishBody) }}",
      options: {
        timeout: 60000,
      },
    },
    id: randomUUID(),
    name: "Publish Tweet",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position,
  };
}

function createEngagementNode(position: [number, number], disabled: boolean): WorkflowNode {
  const code = `const targets = $json.engagementTargets || [];
const actions = [];

for (const query of targets) {
  actions.push({
    searchQuery: query,
    action: 'like',
    limit: 2,
  });
  actions.push({
    searchQuery: query,
    action: 'retweet',
    limit: 1,
  });
}

return [{ json: { engagements: actions } }];`;

  const prepNode: WorkflowNode = {
    parameters: {
      functionCode: code,
    },
    id: randomUUID(),
    name: "Hydrate Engagement Requests",
    type: "n8n-nodes-base.function",
    typeVersion: 2,
    position,
    disabled,
  };

  return prepNode;
}

function createEngagementHttpNode(position: [number, number], disabled: boolean): WorkflowNode {
  return {
    parameters: {
      method: "POST",
      url: `${BASE_URL}/api/twitter/engage`,
      sendBody: true,
      jsonParameters: true,
      bodyParametersJson:
        "={{ JSON.stringify({ engagements: $json.engagements }) }}",
      options: {
        timeout: 60000,
      },
    },
    id: randomUUID(),
    name: "Engagement Actions",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position,
    disabled,
  };
}

function createDmNode(position: [number, number], disabled: boolean): WorkflowNode {
  const code = `const handles = $json.dmTargets || [];
const recipients = handles.map((handle) => ({ handle }));

return [{ json: { message: $json.dmBody.message, recipients } }];`;

  return {
    parameters: {
      functionCode: code,
    },
    id: randomUUID(),
    name: "Prepare DM",
    type: "n8n-nodes-base.function",
    typeVersion: 2,
    position,
    disabled,
  };
}

function createDmHttpNode(position: [number, number], disabled: boolean): WorkflowNode {
  return {
    parameters: {
      method: "POST",
      url: `${BASE_URL}/api/twitter/dm`,
      sendBody: true,
      jsonParameters: true,
      bodyParametersJson: "={{ JSON.stringify($json) }}",
      options: {
        timeout: 60000,
      },
    },
    id: randomUUID(),
    name: "DM Outreach",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position,
    disabled,
  };
}

export function buildWorkflow(options: WorkflowOptions): WorkflowBuildResult {
  const formNode = createFormNode(options);
  const normaliseNode = createNormalizeNode([520, 320], options);
  const generateNode = createGenerateNode([800, 320]);
  const prepareNode = createPrepareNode([1080, 320]);
  const publishNode = createPublishNode([1360, 220]);

  const engagementPrepNode = createEngagementNode([1360, 420], !options.includeEngagement);
  const engagementNode = createEngagementHttpNode([1640, 420], !options.includeEngagement);

  const dmPrepNode = createDmNode([1360, 600], !options.includeDm);
  const dmNode = createDmHttpNode([1640, 600], !options.includeDm);

  const nodes: WorkflowNode[] = [
    formNode,
    normaliseNode,
    generateNode,
    prepareNode,
    publishNode,
    engagementPrepNode,
    engagementNode,
    dmPrepNode,
    dmNode,
  ];

  const connections: Record<string, WorkflowConnection> = {
    [formNode.name]: {
      main: [
        [
          {
            node: normaliseNode.name,
            type: "main",
            index: 0,
          },
        ],
      ],
    },
    [normaliseNode.name]: {
      main: [
        [
          {
            node: generateNode.name,
            type: "main",
            index: 0,
          },
        ],
      ],
    },
    [generateNode.name]: {
      main: [
        [
          {
            node: prepareNode.name,
            type: "main",
            index: 0,
          },
        ],
      ],
    },
    [prepareNode.name]: {
      main: [
        [
          {
            node: publishNode.name,
            type: "main",
            index: 0,
          },
          {
            node: engagementPrepNode.name,
            type: "main",
            index: 0,
          },
          {
            node: dmPrepNode.name,
            type: "main",
            index: 0,
          },
        ],
      ],
    },
    [engagementPrepNode.name]: {
      main: [
        [
          {
            node: engagementNode.name,
            type: "main",
            index: 0,
          },
        ],
      ],
    },
    [dmPrepNode.name]: {
      main: [
        [
          {
            node: dmNode.name,
            type: "main",
            index: 0,
          },
        ],
      ],
    },
  };

  const versionId = randomUUID();

  return {
    workflow: {
      id: null,
      name: options.workflowName,
      active: false,
      nodes,
      connections,
      versionId,
      settings: {
        timezone: "UTC",
      },
      staticData: undefined,
      tags: [{ name: "twitter" }, { name: "ai" }],
    },
    metadata: {
      createdAt: new Date().toISOString(),
      downloadName: `${options.workflowName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-workflow.json`,
    },
  };
}

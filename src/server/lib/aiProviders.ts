/**
 * Low-level AI provider callers: Gemini REST, DeepSeek, and OpenRouter.
 * Extracted from server.ts to keep the route handlers clean and focused.
 */

import { OpenRouter } from '@openrouter/sdk';
import { saveGenerationLog } from './database';

// ---------------------------------------------------------------------------
// Shared type literals used in JSON schema construction
// ---------------------------------------------------------------------------

export const Type = {
  OBJECT: 'OBJECT',
  STRING: 'STRING',
  ARRAY: 'ARRAY',
  INTEGER: 'INTEGER',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
} as const;

// ---------------------------------------------------------------------------
// Thinking / reasoning config builder
// ---------------------------------------------------------------------------

export function buildThinkingConfig(
  model: string,
  thinkingLevel?: string,
  thinkingBudget?: number,
): Record<string, unknown> | undefined {
  if (!model) return undefined;

  const isGemini3 = model.includes('gemini-3');
  const supportsBudget =
    model.includes('gemini-2.5') || model.includes('thinking');

  if (isGemini3) {
    if (thinkingLevel && thinkingLevel !== 'disabled') {
      return { thinkingLevel: thinkingLevel.toUpperCase() };
    }
  } else if (supportsBudget) {
    if (typeof thinkingBudget === 'number') {
      return { thinkingBudget };
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// OpenRouter helper
// ---------------------------------------------------------------------------

export async function callOpenRouter(options: {
  model: string;
  systemInstruction?: string;
  prompt?: string;
  messages?: Array<{ role: string; content: string }>;
  responseSchema?: unknown;
  temperature?: number;
  thinkingLevel?: string;
  customApiKey?: string;
  maxTokens?: number;
  userId?: string;
  userEmail?: string;
  action?: string;
  onHeartbeat?: () => void;
}): Promise<string> {
  const apiKey =
    options.customApiKey &&
    typeof options.customApiKey === 'string' &&
    options.customApiKey.trim().length > 0
      ? options.customApiKey.trim()
      : process.env.OPENROUTER_API_KEY;

  if (!apiKey || !apiKey.startsWith('sk-or-')) {
    if (options.customApiKey) {
      throw new Error(
        'The custom OpenRouter API Key provided in Settings is invalid. OpenRouter keys must start with "sk-or-".',
      );
    }
    throw new Error(
      `Invalid or placeholder OPENROUTER_API_KEY ("${apiKey || ''}"). Please paste a valid OpenRouter API Key (sk-or-...) under Settings (Gear Icon) or update your .env file.`,
    );
  }

  const openrouter = new OpenRouter({ apiKey });

  const messages: Array<{ role: string; content: string }> = options.messages
    ? [...options.messages]
    : [];
  if (messages.length === 0) {
    if (options.systemInstruction) {
      messages.push({ role: 'system', content: options.systemInstruction });
    }
    let promptText = options.prompt ?? '';
    if (options.responseSchema) {
      promptText += `\n\nIMPORTANT: You MUST respond with a JSON object that strictly conforms to the following JSON schema:\n${JSON.stringify(options.responseSchema, null, 2)}\nOnly return the raw JSON object containing the property keys directly. Do NOT wrap your response in top-level "type" or "properties" schema keys, and do NOT wrap it in markdown code blocks.`;
    }
    messages.push({ role: 'user', content: promptText });
  } else if (options.responseSchema) {
    const lastUserMsgIdx = messages.reduce(
      (last, m, idx) => (m.role === 'user' ? idx : last),
      -1,
    );
    const schemaNotice = `\n\nIMPORTANT: You MUST respond with a JSON object that strictly conforms to the following JSON schema:\n${JSON.stringify(options.responseSchema, null, 2)}\nOnly return the raw JSON object containing the property keys directly. Do NOT wrap your response in top-level "type" or "properties" schema keys, and do NOT wrap it in markdown code blocks.`;
    if (lastUserMsgIdx !== -1) {
      messages[lastUserMsgIdx].content += schemaNotice;
    } else {
      messages.push({ role: 'user', content: schemaNotice.trim() });
    }
  }

  const promptLength = messages.reduce((acc, m) => acc + m.content.length, 0);
  const startTime = Date.now();

  console.log(`\n--- [OpenRouter Request Start] ---`);
  console.log(`[OpenRouter Request] Model: ${options.model}`);
  console.log(`[OpenRouter Request] Messages count: ${messages.length}`);
  console.log(
    `[OpenRouter Request] Temperature: ${options.temperature ?? 0.8}`,
  );
  if (options.thinkingLevel) {
    console.log(
      `[OpenRouter Request] Thinking level: ${options.thinkingLevel}`,
    );
  }
  const requestMaxTokens = options.maxTokens
    ? Math.min(options.maxTokens, 16384)
    : undefined;
  if (requestMaxTokens) {
    console.log(
      `[OpenRouter Request] Max tokens requested: ${requestMaxTokens}`,
    );
  }
  console.log(`------------------------------------\n`);

  const chatRequest: Record<string, unknown> = {
    model: options.model,
    messages,
    temperature: options.temperature ?? 0.8,
    provider: {
      sort: 'price',
    },
  };

  // Configure provider routing preferences for open-weights models to ensure cost-efficiency,
  // reliability, and native feature support (such as context caching).
  const lowerModel = options.model.toLowerCase();
  if (lowerModel.includes('qwen')) {
    chatRequest.provider = {
      order: ['Alibaba', 'Together', 'Fireworks'],
      allow_fallbacks: true, // Allow fallback to Together/Fireworks if Alibaba is down
    };
  } else if (lowerModel.includes('llama') || lowerModel.includes('hermes')) {
    chatRequest.provider = {
      order: ['Together', 'Fireworks', 'DeepInfra'],
      allow_fallbacks: true,
    };
  } else if (lowerModel.includes('mistral')) {
    chatRequest.provider = {
      order: ['Mistral', 'Mistral AI', 'Together', 'DeepInfra'],
      allow_fallbacks: true,
    };
  }

  if (options.responseSchema) {
    chatRequest.response_format = { type: 'json_object' };
    const hasJsonWord = messages.some((m) => /json/i.test(m.content));
    if (!hasJsonWord && messages.length > 0) {
      messages[messages.length - 1].content +=
        '\n\nRespond with a valid JSON object.';
    }
  }

  if (options.thinkingLevel && options.thinkingLevel !== 'disabled') {
    chatRequest.reasoning = { enabled: true };
  }

  if (requestMaxTokens) {
    chatRequest.max_tokens = requestMaxTokens;
  }

  let totalTokens: number | undefined;
  let reasoningTokens: number | undefined;

  try {
    const stream = (await openrouter.chat.send({
      chatRequest: { ...chatRequest, stream: true } as any,
    })) as unknown as AsyncIterable<{
      choices: Array<{ delta?: { content?: string } }>;
      usage?: {
        totalTokens?: number;
        reasoningTokens?: number;
        completionTokensDetails?: { reasoningTokens?: number };
      };
    }>;

    let fullContent = '';
    let lastHeartbeat = Date.now();
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) fullContent += content;

      if (options.onHeartbeat && Date.now() - lastHeartbeat > 5000) {
        options.onHeartbeat();
        lastHeartbeat = Date.now();
      }

      if (chunk.usage) {
        totalTokens =
          chunk.usage.totalTokens ??
          (chunk.usage as any).total_tokens ??
          undefined;
        reasoningTokens =
          chunk.usage.reasoningTokens ??
          (chunk.usage as any).reasoning_tokens ??
          chunk.usage.completionTokensDetails?.reasoningTokens ??
          (chunk.usage as any).completion_tokens_details?.reasoning_tokens ??
          undefined;
        const total = totalTokens ?? 0;
        const reasoning = reasoningTokens ?? 0;
        console.log(
          `[OpenRouter Usage] Total Tokens: ${total}, Reasoning Tokens: ${reasoning}`,
        );
      }
    }
    const _duration = Date.now() - startTime;
    console.log(`\n--- [OpenRouter Request Completed] ---`);
    console.log(`[OpenRouter Response] Model: ${options.model}`);
    console.log(
      `[OpenRouter Response] Characters generated: ${fullContent.length}`,
    );
    console.log(`---------------------------------------\n`);

    return fullContent;
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    console.error(`\n--- [OpenRouter Request Failed] ---`);
    console.error(`[OpenRouter Error] Model: ${options.model}`);
    console.error('Error details:', error);
    console.error(`------------------------------------\n`);
    const e = error as { cause?: { message?: string } };

    // Log error metric asynchronously
    saveGenerationLog({
      userId: options.userId,
      userEmail: options.userEmail,
      model: options.model,
      action: options.action || 'ai-call',
      promptLength,
      duration,
      status: 'error',
      errorMessage:
        e.cause?.message || (error as Error).message || 'Unknown Error',
    });

    if (e.cause?.message) throw new Error(e.cause.message);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Unified model call router
// ---------------------------------------------------------------------------

export interface ModelCallOptions {
  model: string;
  systemInstruction: string;
  prompt: string;
  responseSchema: unknown;
  temperature: number;
  thinkingLevel?: string;
  thinkingBudget?: number;
  customOpenRouterKey?: string;
  maxTokens?: number;
  userId?: string;
  userEmail?: string;
  action?: string;
  onHeartbeat?: () => void;
}

/**
 * Routes an AI generation request to OpenRouter.
 */
export async function handleModelCall(
  options: ModelCallOptions,
): Promise<string> {
  const {
    model,
    systemInstruction,
    prompt,
    responseSchema,
    temperature,
    thinkingLevel,
    customOpenRouterKey,
    maxTokens,
    userId,
    userEmail,
    action,
    onHeartbeat,
  } = options;

  const customApiKeyStr = customOpenRouterKey?.trim() || undefined;

  let targetModel = model;
  if (model === 'gemini-3.5-flash') {
    targetModel = '~google/gemini-flash-latest';
  }

  return callOpenRouter({
    model: targetModel,
    systemInstruction,
    prompt,
    responseSchema,
    temperature,
    thinkingLevel,
    customApiKey: customApiKeyStr,
    maxTokens,
    userId,
    userEmail,
    action,
    onHeartbeat,
  });
}

// ---------------------------------------------------------------------------
// JSON sanitiser
// ---------------------------------------------------------------------------

/** Escapes unescaped control characters (ASCII 0-31 like raw newlines and tabs) inside JSON double-quoted string literals. */
function sanitizeJSONControlChars(str: string): string {
  let result = '';
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const code = char.charCodeAt(0);

    if (inString) {
      if (isEscaped) {
        result += char;
        isEscaped = false;
      } else if (char === '\\') {
        result += char;
        isEscaped = true;
      } else if (char === '"') {
        result += char;
        inString = false;
      } else if (code < 0x20) {
        if (char === '\n') result += '\\n';
        else if (char === '\r') result += '\\r';
        else if (char === '\t') result += '\\t';
        else {
          const hex = code.toString(16).padStart(4, '0');
          result += `\\u${hex}`;
        }
      } else {
        result += char;
      }
    } else {
      if (char === '"') {
        inString = true;
      }
      result += char;
    }
  }
  return result;
}

/** Strips markdown code fences, preambles, postscripts, escapes control chars inside strings, repairs truncated JSON, and extracts valid JSON. */
export function cleanJSONString(str: string): string {
  if (!str) return '{}';
  return unwrapSchemaWrapper(extractAndSanitizeJSON(str));
}

function extractAndSanitizeJSON(str: string): string {
  let cleaned = str.trim();

  // 1. Direct JSON parse check
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {
    // Continue
  }

  // Check with control characters sanitized
  const sanitizedDirect = sanitizeJSONControlChars(cleaned);
  try {
    JSON.parse(sanitizedDirect);
    return sanitizedDirect;
  } catch {
    // Continue
  }

  // 2. Extract content from markdown code fences ```json ... ``` or ``` ... ```
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    const fencedContent = fenceMatch[1].trim();
    try {
      JSON.parse(fencedContent);
      return fencedContent;
    } catch {
      const sanitizedFenced = sanitizeJSONControlChars(fencedContent);
      try {
        JSON.parse(sanitizedFenced);
        return sanitizedFenced;
      } catch {
        cleaned = fencedContent;
      }
    }
  }

  // 3. Extract JSON object or array by finding balanced or starting braces/brackets
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');

  let candidate: string | null = null;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    const lastBrace = cleaned.lastIndexOf('}');
    candidate =
      lastBrace > firstBrace
        ? cleaned.substring(firstBrace, lastBrace + 1)
        : cleaned.substring(firstBrace);
  } else if (firstBracket !== -1) {
    const lastBracket = cleaned.lastIndexOf(']');
    candidate =
      lastBracket > firstBracket
        ? cleaned.substring(firstBracket, lastBracket + 1)
        : cleaned.substring(firstBracket);
  }

  if (candidate) {
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      const sanitizedCand = sanitizeJSONControlChars(candidate);
      try {
        JSON.parse(sanitizedCand);
        return sanitizedCand;
      } catch {
        // Attempt truncated JSON repair on candidate
        const repairedCand = repairTruncatedJSON(sanitizedCand);
        try {
          JSON.parse(repairedCand);
          return repairedCand;
        } catch {
          // search for inner JSON block
          const innerMatch = candidate.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
          if (innerMatch) {
            const subCandidate = innerMatch[1];
            try {
              JSON.parse(subCandidate);
              return subCandidate;
            } catch {
              const sanitizedSub = sanitizeJSONControlChars(subCandidate);
              try {
                JSON.parse(sanitizedSub);
                return sanitizedSub;
              } catch {
                // ignore
              }
            }
          }
        }
      }
    }
  }

  // Fallback: strip any remaining backticks, sanitize control chars, and attempt repair
  cleaned = cleaned
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  const finalJson = sanitizeJSONControlChars(cleaned);

  try {
    JSON.parse(finalJson);
    return finalJson;
  } catch {
    const repairedFallback = repairTruncatedJSON(finalJson);
    try {
      JSON.parse(repairedFallback);
      return repairedFallback;
    } catch {
      return finalJson;
    }
  }
}

/** If an LLM returns a meta-schema wrapper or container wrapper, unwrap it. */
function unwrapSchemaWrapper(jsonStr: string): string {
  try {
    let parsed = JSON.parse(jsonStr);

    // 1. Unwrap 1-element array wrappers: [{ ... }] -> { ... }
    if (
      Array.isArray(parsed) &&
      parsed.length === 1 &&
      typeof parsed[0] === 'object' &&
      parsed[0] !== null &&
      !Array.isArray(parsed[0])
    ) {
      parsed = parsed[0];
    }

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      // 2. Unwrap schema meta-wrapper: { type: "OBJECT", properties: { ... } }
      if (
        (parsed.type === 'OBJECT' || parsed.type === 'object') &&
        parsed.properties &&
        typeof parsed.properties === 'object' &&
        parsed.properties !== null &&
        !Array.isArray(parsed.properties)
      ) {
        return JSON.stringify(parsed.properties);
      }

      // 3. Unwrap single container keys: { data: { ... } } or { result: { ... } }
      const keys = Object.keys(parsed);
      if (
        keys.length === 1 &&
        ['data', 'result', 'response', 'output', 'json'].includes(
          keys[0].toLowerCase(),
        )
      ) {
        const inner = parsed[keys[0]];
        if (inner && typeof inner === 'object' && inner !== null) {
          return JSON.stringify(normalizeObjectKeys(inner));
        }
      }

      return JSON.stringify(normalizeObjectKeys(parsed));
    }
    if (Array.isArray(parsed)) {
      return JSON.stringify(normalizeObjectKeys(parsed));
    }
  } catch {
    // ignore
  }
  return jsonStr;
}

function toCamelCase(str: string): string {
  return str.replace(/([-_][a-z])/gi, (group) =>
    group.toUpperCase().replace('-', '').replace('_', ''),
  );
}

/** Recursively normalizes keys (snake_case, PascalCase) to also provide camelCase fallbacks. */
function normalizeObjectKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(normalizeObjectKeys);
  } else if (obj !== null && typeof obj === 'object') {
    const newObj: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const val = normalizeObjectKeys(obj[key]);
      newObj[key] = val;

      // Convert snake_case or PascalCase key to camelCase fallback
      const camel = toCamelCase(key);
      const lowerCamel = camel.charAt(0).toLowerCase() + camel.slice(1);
      if (!(lowerCamel in newObj)) {
        newObj[lowerCamel] = val;
      }
    }
    return newObj;
  }
  return obj;
}

/** Auto-closes open string literals, arrays, and objects when JSON is truncated. */
function repairTruncatedJSON(jsonStr: string): string {
  let str = jsonStr.trim();
  if (!str) return '{}';

  let inString = false;
  let isEscaped = false;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === '\\') {
        isEscaped = true;
      } else if (char === '"') {
        inString = false;
      }
    } else if (char === '"') {
      inString = true;
    }
  }

  if (inString) {
    str += '"';
  }

  const stack: string[] = [];
  inString = false;
  isEscaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (inString) {
      if (isEscaped) isEscaped = false;
      else if (char === '\\') isEscaped = true;
      else if (char === '"') inString = false;
    } else {
      if (char === '"') inString = true;
      else if (char === '{' || char === '[') stack.push(char);
      else if (char === '}' || char === ']') {
        const top = stack[stack.length - 1];
        if ((char === '}' && top === '{') || (char === ']' && top === '[')) {
          stack.pop();
        }
      }
    }
  }

  while (stack.length > 0) {
    const opening = stack.pop();
    if (opening === '{') str += '}';
    else if (opening === '[') str += ']';
  }

  return str;
}

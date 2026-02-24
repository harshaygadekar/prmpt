# prmpt MVP — Compiled Resources

> **Purpose**: Comprehensive technical reference and resource compilation for building the prmpt MVP. Contains detailed API syntax, code examples, configuration patterns, and integration guides for every technology in the stack.
>
> **Last Updated**: Session research compilation (expanded)
>
> **Status**: ✅ COMPILED — EXPANDED EDITION
>
> **Target Audience**: Developer(s) building prmpt — use this as your primary reference to avoid getting stuck.

---

## Table of Contents

1. [Prompting Techniques & Engineering Guides](#1-prompting-techniques--engineering-guides)
2. [Model Family API References (BYOK)](#2-model-family-api-references-byok)
3. [VS Code Extension Development](#3-vs-code-extension-development)
4. [Authentication & User Management (Clerk)](#4-authentication--user-management-clerk)
5. [Data Storage & Backend (Supabase)](#5-data-storage--backend-supabase)
6. [Payments & Monetization (code-checkout)](#6-payments--monetization-code-checkout)
7. [Local LLM Support (Ollama)](#7-local-llm-support-ollama)
8. [Prompt Template Libraries & Datasets](#8-prompt-template-libraries--datasets)
9. [Prompt Optimization Frameworks](#9-prompt-optimization-frameworks)
10. [Competitor Analysis & Market Tools](#10-competitor-analysis--market-tools)
11. [Academic Papers & Research](#11-academic-papers--research)
12. [Books](#12-books)
13. [Courses & Tutorials](#13-courses--tutorials)
14. [Community & Ecosystem](#14-community--ecosystem)
15. [VS Code Extension Packaging & Publishing](#15-vs-code-extension-packaging--publishing)

---

## 1. Prompting Techniques & Engineering Guides

These resources are critical for building the **Core AI Optimizer Engine (F1)**, **Technique Selector (F7)**, and the **Engineering Prompt Library (F6)**.

### Official Provider Guides

| Resource | URL | Description | Relevance |
|----------|-----|-------------|-----------|
| **Prompt Engineering Guide (DAIR.AI)** | https://www.promptingguide.ai/ | Most comprehensive open-source guide. 18+ techniques, model-specific guides, research papers. 3M+ learners. Covers CoT, Few-Shot, Role Prompting, and more. | F1 Optimizer, F7 Technique Selector — primary reference for all prompting techniques |
| **Anthropic Claude Prompt Engineering** | https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview | Iterative prompt design, XML tags, chain-of-thought, role assignment. Includes prompt generator tool. | F1 — Claude-specific optimization patterns, XML output format |
| **OpenAI Prompt Engineering Guide** | https://developers.openai.com/api/docs/guides/prompt-engineering | Comprehensive guide: message roles (developer/user/assistant), Markdown+XML formatting, few-shot learning, reusable prompts, model-specific strategies. | F1 — GPT family optimization, structured prompt design |
| **OpenAI GPT-4.1 Prompting Guide** | https://cookbook.openai.com/articles/gpt-4-1-prompting-guide | Structured agent-like prompt design: goal persistence, tool integration, long-context processing. | F1 — Advanced GPT-specific patterns |
| **Google Gemini Prompting Strategies** | https://ai.google.dev/gemini-api/docs/prompting-strategies | Multimodal prompting for Gemini via Vertex AI and AI Studio. Temperature, topP, topK strategies. | F1 — Gemini family optimization strategies |
| **Anthropic: Context Engineering for AI Agents** | https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents | Evolution from prompt engineering to context engineering: agent state, memory, tools, MCP. | F9 Context Injector — foundational concepts |
| **Claude 4 Best Practices** | https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices | Parallel tool execution, thinking capabilities, image processing for Claude 4 family. | F4 — Model family-specific best practices |

### Community Guides

| Resource | URL | Description | Relevance |
|----------|-----|-------------|-----------|
| **Prompt Engineering Guide GitHub** | https://github.com/dair-ai/Prompt-Engineering-Guide | Open-source companion repo (55K+ ⭐). Papers, notebooks, technique implementations. | F1, F7 — Implementation reference |
| **Lilian Weng's PE Guide** | https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/ | Highly respected technical blog from OpenAI researcher. Deep technical analysis. | F1 — Technical depth |
| **Google 68-page PE Guide (PDF)** | https://www.reddit.com/r/PromptEngineering/comments/1kggmh0/ | Internal-style best-practice guide for Gemini with concrete patterns. | F1, F4 — Gemini optimization |
| **Learn Prompting** | https://learnprompting.org/ | Structured free platform. Beginner to advanced PE, AI security, HackAPrompt competition. | F6 — Template inspiration |
| **Anthropic Interactive Tutorial** | https://github.com/anthropics/prompt-eng-interactive-tutorial | 9-chapter Jupyter notebook course with hands-on exercises. | F1 — Claude-specific implementation patterns |
| **OpenAI Cookbook** | https://github.com/openai/openai-cookbook | Official recipes for function calling, RAG, evaluation, and complex workflows. | F1 — GPT implementation patterns |
| **IBM 2026 Guide to Prompt Engineering** | https://www.ibm.com/think/prompt-engineering | Curated tools, tutorials, real-world examples with Python code. | F1 — Industry best practices |
| **MIT Sloan: Prompt Templates** | https://mitsloan.mit.edu/ideas-made-to-matter/prompt-engineering-so-2024-try-these-prompt-templates-instead | "Prompt templates as cognitive scaffolding" — structure without limiting options. | F3, F6 — Template design philosophy |
| **Pulsegeek: Patterns, Templates, Evaluation** | https://pulsegeek.com/articles/prompt-engineering-complete-patterns-templates-and-evaluation-playbook/ | Complete playbook covering core patterns, reusable templates, multimodal tactics, and evaluation. | F3, F6, F8 — Template design + quality scoring |
| **DextraLabs: 7 PE Templates** | https://dextralabs.com/blog/prompt-engineering-templates/ | 7 proven prompt engineering templates for structured AI responses. | F6 — Specific template patterns |
| **RefonteLeaning: Templates to Toolchains** | https://www.refontelearning.com/blog/from-templates-to-toolchains-prompt-engineering-trends-2025-explained | Top prompt engineering trends 2025 — prompt libraries, reusable templates, automated toolchains. | F3, F6 — Industry trends |

### Core Prompting Techniques Reference (for F7 Technique Selector)

These are the techniques prmpt's F7 module should detect and apply:

#### Zero-Shot Prompting

No examples provided — relies entirely on model training data.

```
Classify the text into neutral, negative or positive.
Text: I think the vacation is okay.
Sentiment:
```

#### Few-Shot Prompting

Provide input/output examples to steer the model. Key findings from research:
- Label space and input distribution matter more than label correctness
- Format consistency helps performance significantly
- Diverse examples improve generalization

```
This is awesome! // Positive
This is bad! // Negative
Wow that movie was rad! // Positive
What a horrible show! //
```

Output: `Negative`

#### Chain-of-Thought (CoT) Prompting

Enable complex reasoning through intermediate steps (Wei et al., 2022).

```
The odd numbers in this group add up to an even number: 4, 8, 9, 15, 12, 2, 1.
A: Adding all the odd numbers (9, 15, 1) gives 25. The answer is False.

The odd numbers in this group add up to an even number: 15, 32, 5, 13, 82, 7, 1.
A:
```

Output: `Adding all the odd numbers (15, 5, 13, 7, 1) gives 41. The answer is False.`

#### Zero-Shot CoT

Simply append "Let's think step by step." to the prompt (Kojima et al., 2022).

```
I went to the market and bought 10 apples. I gave 2 apples to the neighbor and
2 to the repairman. I then went and bought 5 more apples and ate 1. How many
apples did I remain with?

Let's think step by step.
```

#### Auto-CoT (Automatic Chain-of-Thought)

Eliminates manual effort by using LLMs with "Let's think step by step" to generate reasoning chains automatically. Two stages:
1. **Question clustering**: Partition questions into clusters
2. **Demonstration sampling**: Select representative question from each cluster, generate reasoning chain

Key heuristics: question length (~60 tokens) and number of reasoning steps (~5) to encourage simple, accurate demonstrations.

#### Additional Techniques for F7 Implementation

| Technique | Trigger Pattern | When to Apply |
|-----------|----------------|---------------|
| **Zero-Shot** | Simple direct tasks | Classification, translation, simple Q&A |
| **Few-Shot** | Tasks needing examples | Pattern matching, format consistency |
| **Chain-of-Thought** | Complex reasoning | Math, logic, multi-step problems |
| **Zero-Shot CoT** | Reasoning without examples | Add "Let's think step by step" |
| **Self-Consistency** | Need reliable answers | Sample multiple CoT paths, majority vote |
| **Tree of Thoughts** | Complex planning | Search over reasoning trees |
| **ReAct** | Tool-use tasks | Interleave reasoning and action |
| **Meta Prompting** | Structural optimization | Category-theoretic templates |
| **Prompt Chaining** | Multi-step workflows | Break complex tasks into pipeline |
| **Generate Knowledge** | Knowledge-intensive tasks | Generate relevant knowledge first |
| **Directional Stimulus** | Guided generation | Use hints/cues to steer output |
| **Automatic Prompt Engineer** | Optimization | Let LLM generate better prompts |
| **Active-Prompt** | Dynamic examples | Select most uncertain examples for annotation |
| **Reflexion** | Self-improvement | Model reflects on past outputs to improve |
| **Program-Aided Language Models** | Computation tasks | Generate code to solve problems |
| **Graph Prompting** | Structured knowledge | Prompt with graph-structured data |

### OpenAI Prompt Structure Best Practices

From the official OpenAI guide, a `developer` message should contain these sections in order:

```markdown
# Identity
You are coding assistant that helps enforce the use of snake case
variables in JavaScript code.

# Instructions
* When defining variables, use snake case names (e.g. my_variable)
  instead of camel case names (e.g. myVariable).
* Do not give responses with Markdown formatting, just return
  the code as requested.

# Examples
<user_query>
How do I declare a string variable for a first name?
</user_query>

<assistant_response>
var first_name = "Anna";
</assistant_response>
```

Key sections in order:
- **Identity**: Purpose, communication style, high-level goals
- **Instructions**: Rules, constraints, what to do / never do. Can contain subsections for tool usage, function calling, etc.
- **Examples**: Input/output demonstrations (few-shot). Use XML tags with matching IDs for clarity.
- **Context**: Additional data (RAG, documents, etc.) — best positioned at the end of the prompt for cache-friendliness.

#### Prompt Caching Tip

Keep content that repeats across requests at the **beginning** of your prompt and among the **first API parameters** in the JSON request body. This maximizes cost and latency savings from prompt caching.

### OpenAI Message Roles

| Role | Description | Priority |
|------|-------------|----------|
| `developer` | Application developer instructions — like a function definition | Highest — prioritized over user |
| `user` | End user instructions — like function arguments | Medium — behind developer |
| `assistant` | Model-generated messages | Response role |

> The `instructions` parameter gives the model high-level instructions and takes priority over prompts in the `input` parameter. Note: `instructions` only applies to the current request — not persisted across turns.

### Reasoning vs GPT Model Prompting

| Model Type | Prompting Style | Analogy |
|------------|----------------|---------|
| **Reasoning** (o3, o4-mini, GPT-5) | High-level guidance, trust model to work out details | Senior co-worker |
| **GPT** (gpt-4.1, gpt-4o) | Explicit, precise instructions for specific output | Junior co-worker |

**GPT-5 prompting best practices:**
- Highly steerable and responsive to well-specified prompts
- Benefits from precise instructions with explicit logic and data
- Pin production apps to specific model snapshots (e.g., `gpt-4.1-2025-04-14`)
- Build evals to monitor prompt performance across model changes

**Reasoning model best practices:**
- Provide high-level goals, trust model for details
- Perform better with the Responses API (over Chat Completions)
- Use `reasoning: { effort: "low" | "medium" | "high" }` to control thinking depth

### Reusable Prompts (OpenAI Dashboard)

```typescript
// Create prompt templates in OpenAI Dashboard with {{variables}}
// Then use in API:
const response = await client.responses.create({
    model: "gpt-4.1",
    prompt: {
        id: "pmpt_abc123",     // Prompt ID from dashboard
        version: "2",           // Specific version (default: "current")
        variables: {
            customer_name: "Jane Doe",
            product: "40oz juice box"
        }
    }
});
```

---

## 2. Model Family API References (BYOK)

These resources are essential for **BYOK API Integration**, **Model Family Selector (F4)**, and **Output Format Switcher (F5)**.

### 2.1 OpenAI API

#### Responses API (Recommended — New Projects)

OpenAI now recommends the **Responses API** over Chat Completions for all new projects. Reasoning models show higher intelligence with the Responses API.

```typescript
import OpenAI from "openai";
const client = new OpenAI();

// Simple text generation
const response = await client.responses.create({
    model: "gpt-4.1",
    input: "Write a one-sentence bedtime story about a unicorn."
});
console.log(response.output_text);

// With message roles
const response2 = await client.responses.create({
    model: "gpt-4.1",
    reasoning: { effort: "low" },
    input: [
        { role: "developer", content: "Talk like a pirate." },
        { role: "user", content: "Are semicolons optional in JavaScript?" },
    ],
});
console.log(response2.output_text);

// With instructions parameter (takes priority over input)
const response3 = await client.responses.create({
    model: "gpt-4.1",
    instructions: "You are a helpful coding assistant.",
    input: "Explain closures in JavaScript",
});
```

#### Response Structure

```json
{
  "output": [
    {
      "id": "msg_67b73f697ba4819183a15cc17d011509",
      "type": "message",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "Under the soft glow of the moon...",
          "annotations": []
        }
      ]
    }
  ]
}
```

> **Important**: The `output` array can contain multiple items — tool calls, reasoning tokens, etc. **Never assume** text is at `output[0].content[0].text`. Use the SDK's `response.output_text` convenience property which aggregates all text outputs.

#### Chat Completions API (Legacy but widely used)

```typescript
import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const completion = await client.chat.completions.create({
    model: "gpt-4.1",
    messages: [
        { role: "system", content: "You are a prompt optimization expert." },
        { role: "user", content: "Optimize this prompt: ..." }
    ],
    temperature: 0.7,
    max_tokens: 1024,
    top_p: 0.9,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
    stop: ["\n\n"],
    stream: false,
});

console.log(completion.choices[0].message.content);
```

#### OpenAI Structured Outputs

Force model to produce JSON conforming to a schema:

```typescript
import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

// Define schema with Zod
const OptimizedPrompt = z.object({
    original: z.string(),
    optimized: z.string(),
    techniques_applied: z.array(z.string()),
    quality_score: z.number().min(0).max(100),
    explanation: z.string(),
});

const completion = await client.chat.completions.create({
    model: "gpt-4.1",
    messages: [
        { role: "system", content: "You are a prompt optimizer. Return structured analysis." },
        { role: "user", content: "Optimize: 'write me some code'" }
    ],
    response_format: zodResponseFormat(OptimizedPrompt, "optimized_prompt"),
});

const result = JSON.parse(completion.choices[0].message.content);
// result is typed as { original, optimized, techniques_applied, quality_score, explanation }
```

**Structured Outputs Schema Constraints:**
- Supported types: `string`, `number`, `boolean`, `integer`, `object`, `array`, `enum`, `anyOf`
- All fields must be `required` (use `anyOf` with `null` for optional)
- No `default` values allowed
- `additionalProperties: false` required on all objects
- Max nesting depth: 5 levels
- Max 100 total object properties
- Strings can't have `minLength`/`maxLength` (use `enum` instead)
- `anyOf` max 1 level of nesting

**Streaming with Structured Outputs:**
```typescript
const stream = await client.chat.completions.create({
    model: "gpt-4.1",
    messages: [...],
    response_format: zodResponseFormat(Schema, "name"),
    stream: true,
});

for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
}
```

**Handling Refusals:**
```typescript
if (completion.choices[0].message.refusal) {
    console.log("Model refused:", completion.choices[0].message.refusal);
} else {
    const result = JSON.parse(completion.choices[0].message.content);
}
```

**JSON Mode (simpler alternative):**
```typescript
const completion = await client.chat.completions.create({
    model: "gpt-4.1",
    messages: [
        { role: "system", content: "Return valid JSON." },
        { role: "user", content: "List 3 fruits" }
    ],
    response_format: { type: "json_object" },
});
// Guarantees valid JSON but doesn't validate against a schema
```

#### OpenAI Model Parameters Reference

| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| `model` | string | — | Model ID (e.g., "gpt-4.1", "gpt-4o", "o3") |
| `messages` | array | — | Array of message objects with role and content |
| `temperature` | number | 0-2 | Sampling temperature. Higher = more random. Default: 1 |
| `top_p` | number | 0-1 | Nucleus sampling. Alternative to temperature |
| `max_tokens` | integer | — | Maximum tokens to generate |
| `stop` | string/array | — | Stop sequences for early termination |
| `frequency_penalty` | number | -2 to 2 | Penalize frequent tokens. Default: 0 |
| `presence_penalty` | number | -2 to 2 | Penalize tokens already present. Default: 0 |
| `stream` | boolean | — | Enable streaming responses |
| `response_format` | object | — | `{ type: "json_object" }` or Structured Outputs |
| `seed` | integer | — | Deterministic sampling (best effort) |
| `logprobs` | boolean | — | Return log probabilities |
| `top_logprobs` | integer | 0-20 | Number of top log probabilities per token |
| `reasoning` | object | — | `{ effort: "low" \| "medium" \| "high" }` for reasoning models |

#### Available Models (as of research date)

| Model | Type | Context Window | Best For |
|-------|------|----------------|----------|
| `gpt-4.1` | GPT | 1M tokens | General purpose, cost effective |
| `gpt-4.1-mini` | GPT | 1M tokens | Fast, cheap |
| `gpt-4.1-nano` | GPT | 1M tokens | Fastest, cheapest |
| `gpt-4o` | GPT | 128K tokens | Multimodal |
| `gpt-4o-mini` | GPT | 128K tokens | Fast multimodal |
| `o3` | Reasoning | 200K tokens | Complex reasoning |
| `o4-mini` | Reasoning | 200K tokens | Fast reasoning |

---

### 2.2 Anthropic API

#### Messages API

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: "You are a prompt optimization expert.",
    messages: [
        {
            role: "user",
            content: "Optimize this prompt: 'write code for a web scraper'"
        }
    ],
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    stop_sequences: ["\n\nHuman:"],
});

console.log(message.content[0].text);
```

#### Content Block Types

Anthropic responses use typed content blocks:

```typescript
// Text content block
{ type: "text", text: "The optimized prompt is..." }

// Thinking content block (Extended Thinking)
{ type: "thinking", thinking: "Let me analyze this prompt..." }

// Tool use content block
{
    type: "tool_use",
    id: "toolu_01A09q90qw90lq917835lq9",
    name: "get_weather",
    input: { location: "Paris" }
}

// Tool result (user message)
{
    type: "tool_result",
    tool_use_id: "toolu_01A09q90qw90lq917835lq9",
    content: "15°C, partly cloudy"
}

// Image content block
{
    type: "image",
    source: { type: "base64", media_type: "image/jpeg", data: "..." }
}
```

#### Extended Thinking (Reasoning)

```typescript
const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    thinking: {
        type: "enabled",
        budget_tokens: 10000  // Minimum 1024, max = max_tokens - 1
    },
    messages: [
        { role: "user", content: "Analyze and optimize this complex prompt..." }
    ],
});

// Response contains interleaved thinking and text blocks
for (const block of response.content) {
    if (block.type === "thinking") {
        console.log("Thinking:", block.thinking);
    } else if (block.type === "text") {
        console.log("Response:", block.text);
    }
}
```

**Extended Thinking Key Rules:**
- `temperature` MUST be set to `1` when thinking is enabled
- Cannot modify `temperature`, `top_p`, or `top_k` with thinking
- Minimum `budget_tokens`: 1024
- Maximum `budget_tokens`: `max_tokens - 1`
- Thinking blocks can be interleaved with text blocks in a single response
- Supports streaming via `thinking_delta` events
- With tool use: thinking precedes each tool call and the final response
- Pricing: Thinking tokens are charged as output tokens
- Context window: Thinking tokens count toward the context window
- Summarized thinking: Claude may summarize earlier thinking when approaching context limits

**Streaming with Extended Thinking:**
```typescript
const stream = client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    thinking: { type: "enabled", budget_tokens: 10000 },
    messages: [{ role: "user", content: "..." }],
});

for await (const event of stream) {
    if (event.type === "content_block_start") {
        if (event.content_block.type === "thinking") {
            process.stdout.write("[Thinking] ");
        }
    }
    if (event.type === "content_block_delta") {
        if (event.delta.type === "thinking_delta") {
            process.stdout.write(event.delta.thinking);
        } else if (event.delta.type === "text_delta") {
            process.stdout.write(event.delta.text);
        }
    }
}
```

#### Anthropic Model Parameters Reference

| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| `model` | string | — | Model ID |
| `messages` | array | — | Array of message objects |
| `system` | string | — | System prompt (separate param, not in messages array) |
| `max_tokens` | integer | **required** | Maximum tokens to generate |
| `temperature` | number | 0-1 | Sampling temperature. Default: 1 |
| `top_p` | number | 0-1 | Nucleus sampling |
| `top_k` | integer | ≥1 | Top-K sampling (unique to Anthropic in this stack) |
| `stop_sequences` | array | — | Stop sequences |
| `stream` | boolean | — | Enable streaming |
| `thinking` | object | — | `{ type: "enabled", budget_tokens: N }` |
| `tool_choice` | object | — | `auto`, `any`, `{ type: "tool", name: "..." }`, `none` |
| `tools` | array | — | Tool definitions for function calling |
| `metadata` | object | — | `{ user_id: "..." }` for abuse tracking |

#### Available Models

| Model | Context Window | Best For |
|-------|----------------|----------|
| `claude-opus-4-20250514` | 200K tokens | Most capable, complex tasks |
| `claude-sonnet-4-20250514` | 200K tokens | Best balance of speed and intelligence |
| `claude-haiku-3-5-20241022` | 200K tokens | Fastest, cheapest |

---

### 2.3 Google Gemini API

#### GenerateContent API

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Simple generation
const result = await model.generateContent("Optimize this prompt: ...");
console.log(result.response.text());

// With full configuration
const model2 = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        stopSequences: ["END"],
    },
    systemInstruction: "You are a prompt optimization expert.",
});

const result2 = await model2.generateContent("Optimize: 'write some code'");
```

#### Streaming

```typescript
const result = await model.generateContentStream("Optimize this prompt: ...");
for await (const chunk of result.stream) {
    process.stdout.write(chunk.text());
}
```

#### Structured Outputs (JSON Schema)

```typescript
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: {
            type: "object",
            properties: {
                original: { type: "string", description: "Original prompt" },
                optimized: { type: "string", description: "Optimized prompt" },
                techniques: {
                    type: "array",
                    items: { type: "string" },
                    description: "Applied techniques"
                },
                score: {
                    type: "number",
                    minimum: 0,
                    maximum: 100,
                    description: "Quality score"
                }
            },
            required: ["original", "optimized", "techniques", "score"],
            propertyOrdering: ["original", "optimized", "techniques", "score"]
        }
    }
});

const result = await model.generateContent("Optimize: 'write code for me'");
const parsed = JSON.parse(result.response.text());
```

**JSON Schema Support:**
- Types: `string`, `number`, `integer`, `boolean`, `object`, `array`, `null` (via `{"type": ["string", "null"]}`)
- Object properties: `properties`, `required`, `additionalProperties`
- String: `enum`, `format` (date-time, date, time)
- Number/Integer: `enum`, `minimum`, `maximum`
- Array: `items`, `prefixItems`, `minItems`, `maxItems`
- Composition: `anyOf`, `oneOf`
- Schema references: `$id`, `$defs`, `$ref`, `$anchor`
- **Gemini 2.0 requires** explicit `propertyOrdering` list
- Supported `responseMimeType` values: `"text/plain"` (default), `"application/json"`, `"text/x.enum"`
- Can combine structured outputs with tools (Google Search, Code Execution, Function Calling) in Gemini 3 series

#### ThinkingConfig (Reasoning)

```typescript
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
        thinkingConfig: {
            includeThoughts: true,     // Include thinking in response
            thinkingBudget: 8192,      // Token budget for thinking
            // OR use thinkingLevel enum:
            // thinkingLevel: "MEDIUM"  // MINIMAL | LOW | MEDIUM | HIGH
        }
    }
});
```

#### GenerationConfig Full Reference

| Parameter | Type | Description |
|-----------|------|-------------|
| `temperature` | number (0-2) | Sampling temperature |
| `topP` | number | Nucleus sampling |
| `topK` | integer | Token selection pool |
| `maxOutputTokens` | integer | Max response tokens |
| `stopSequences` | string[] | Stop sequences |
| `responseMimeType` | string | `"text/plain"`, `"application/json"`, `"text/x.enum"` |
| `responseSchema` | object | OpenAPI subset schema |
| `responseJsonSchema` | object | JSON Schema (alternative to responseSchema) |
| `responseModalities` | string[] | `["TEXT"]`, `["IMAGE"]`, `["AUDIO"]` |
| `candidateCount` | integer | Number of response candidates |
| `seed` | integer | Deterministic sampling |
| `presencePenalty` | number | Penalize tokens already present |
| `frequencyPenalty` | number | Penalize frequent tokens |
| `responseLogprobs` | boolean | Return log probabilities |
| `logprobs` | integer (0-20) | Number of top log probs |
| `thinkingConfig` | object | `{ includeThoughts, thinkingBudget, thinkingLevel }` |
| `imageConfig` | object | `{ aspectRatio, imageSize }` for image generation |

#### GenerateContent Response Structure

```typescript
interface GenerateContentResponse {
    candidates: Array<{
        content: { parts: Array<{ text: string }>, role: string };
        finishReason: "STOP" | "MAX_TOKENS" | "SAFETY" | "RECITATION" | "OTHER";
        safetyRatings: Array<{ category: string, probability: string }>;
        tokenCount: number;
        avgLogprobs: number;
        index: number;
    }>;
    usageMetadata: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount: number;
        thoughtsTokenCount?: number;  // When thinking enabled
        cachedContentTokenCount?: number;
    };
    modelVersion: string;
}
```

#### Safety Settings

```typescript
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    safetySettings: [
        {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_ONLY_HIGH"
        }
    ]
});
```

Threshold options: `BLOCK_LOW_AND_ABOVE`, `BLOCK_MEDIUM_AND_ABOVE`, `BLOCK_ONLY_HIGH`, `BLOCK_NONE`, `OFF`

Categories: `HARM_CATEGORY_HARASSMENT`, `HARM_CATEGORY_HATE_SPEECH`, `HARM_CATEGORY_SEXUALLY_EXPLICIT`, `HARM_CATEGORY_DANGEROUS_CONTENT`

#### Available Models

| Model | Type | Context Window | Best For |
|-------|------|----------------|----------|
| `gemini-2.5-pro` | Reasoning | 1M tokens | Complex tasks, thinking |
| `gemini-2.5-flash` | Fast | 1M tokens | General purpose, cost effective |
| `gemini-2.5-flash-lite` | Fastest | 1M tokens | Simple tasks, cheapest |
| `gemini-2.0-flash` | Legacy | 1M tokens | Stable, well-tested |

---

### 2.4 Cross-Provider Model Parameters Comparison

| Parameter | OpenAI | Anthropic | Gemini | prmpt F4 Mapping |
|-----------|--------|-----------|--------|------------------|
| Temperature | ✅ 0-2 | ✅ 0-1 | ✅ 0-2 | Normalize to 0-1 scale |
| Top P | ✅ | ✅ | ✅ | Direct pass-through |
| Top K | ❌ | ✅ | ✅ | Anthropic/Gemini only |
| Max Tokens | ✅ `max_tokens` | ✅ `max_tokens` (required) | ✅ `maxOutputTokens` | Map parameter names |
| Stop Sequences | ✅ `stop` | ✅ `stop_sequences` | ✅ `stopSequences` | Map parameter names |
| System Message | ✅ role: `system`/`developer` | ✅ `system` param | ✅ `systemInstruction` | Extract and route |
| Structured Output | ✅ `response_format` + Zod | ❌ (via prompting only) | ✅ `responseMimeType` + schema | Provider-specific handling |
| Streaming | ✅ `stream: true` | ✅ `stream: true` | ✅ `generateContentStream` | Unified stream interface |
| Thinking/Reasoning | ✅ `reasoning.effort` | ✅ `thinking.budget_tokens` | ✅ `thinkingConfig` | Provider-specific |
| Frequency Penalty | ✅ | ❌ | ✅ | OpenAI/Gemini only |
| Presence Penalty | ✅ | ❌ | ✅ | OpenAI/Gemini only |
| Seed | ✅ | ❌ | ✅ | OpenAI/Gemini only |
| Log Probabilities | ✅ | ❌ | ✅ | OpenAI/Gemini only |

### 2.5 Unified Provider Interface (prmpt Implementation Pattern)

```typescript
// Suggested abstraction for F4 Model Family Selector
interface LLMProvider {
    name: "openai" | "anthropic" | "gemini" | "ollama";
    chat(params: UnifiedChatParams): Promise<UnifiedResponse>;
    stream(params: UnifiedChatParams): AsyncIterable<UnifiedChunk>;
    listModels(): Promise<ModelInfo[]>;
}

interface UnifiedChatParams {
    model: string;
    messages: Array<{
        role: "system" | "user" | "assistant";
        content: string;
    }>;
    temperature?: number;    // 0-1 normalized
    maxTokens?: number;
    topP?: number;
    stopSequences?: string[];
    responseFormat?: "text" | "json";
    responseSchema?: object; // JSON Schema for structured output
    stream?: boolean;
}

interface UnifiedResponse {
    content: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    finishReason: "stop" | "length" | "content_filter";
    model: string;
    provider: string;
}

interface UnifiedChunk {
    content: string;
    done: boolean;
}

interface ModelInfo {
    id: string;
    name: string;
    provider: string;
    contextWindow: number;
    supportsStreaming: boolean;
    supportsStructuredOutput: boolean;
    supportsThinking: boolean;
}
```

---

## 3. VS Code Extension Development

These resources cover the **platform foundation** — building the VS Code extension itself.

### 3.1 Core Documentation

| Resource | URL | Description | Relevance |
|----------|-----|-------------|-----------|
| **Your First Extension** | https://code.visualstudio.com/api/get-started/your-first-extension | Extension scaffolding with Yeoman generator, project structure, package.json configuration. | Core — Extension bootstrap |
| **Extension API Reference** | https://code.visualstudio.com/api | Complete VS Code Extension API documentation hub. | Core — All API reference |
| **WebView API** | https://code.visualstudio.com/api/extension-guides/webview | Creating rich UI panels with HTML/CSS/JS inside VS Code. Message passing between extension and webview. | F1, F10 — Optimizer UI, Diff Viewer |
| **SecretStorage API** | VS Code API (vscode.SecretStorage) | Secure credential storage for API keys and auth tokens. Methods: get(), store(), delete(), onDidChange. | BYOK — Secure key storage |
| **UriHandler API** | VS Code API (vscode.window.registerUriHandler) | Handle custom URI callbacks for OAuth flows. URI format: `vscode://my.extension/auth-complete`. | Auth — Clerk OAuth callback |
| **asExternalUri API** | VS Code API (vscode.env.asExternalUri) | Create callback URIs for browser-based auth flows. Used with registerUriHandler for complete OAuth. | Auth — Browser redirect flow |

### 3.2 Extension package.json (contributes)

The `contributes` field in `package.json` defines what the extension adds to VS Code:

```jsonc
{
  "name": "prmpt",
  "displayName": "prmpt",
  "description": "Privacy-conscious AI prompt optimization",
  "version": "0.1.0",
  "publisher": "prmpt",
  "engines": { "vscode": "^1.85.0" },
  "categories": ["Machine Learning", "Other"],
  "pricing": "Trial",
  "activationEvents": [
    "onCommand:prmpt.optimize",
    "onView:prmpt.sidebar"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "prmpt.optimize",
        "title": "Optimize Prompt",
        "category": "prmpt",
        "icon": "$(sparkle)"
      },
      {
        "command": "prmpt.selectModel",
        "title": "Select Model Family",
        "category": "prmpt"
      },
      {
        "command": "prmpt.openLibrary",
        "title": "Open Prompt Library",
        "category": "prmpt"
      },
      {
        "command": "prmpt.setApiKey",
        "title": "Set API Key",
        "category": "prmpt"
      }
    ],
    "viewsContainers": {
      "activitybar": [
        {
          "id": "prmpt-sidebar",
          "title": "prmpt",
          "icon": "resources/prmpt-icon.svg"
        }
      ]
    },
    "views": {
      "prmpt-sidebar": [
        {
          "type": "webview",
          "id": "prmpt.sidebar",
          "name": "Prompt Optimizer"
        }
      ]
    },
    "configuration": {
      "title": "prmpt",
      "properties": {
        "prmpt.defaultModel": {
          "type": "string",
          "default": "openai/gpt-4.1",
          "enum": [
            "openai/gpt-4.1",
            "anthropic/claude-sonnet-4",
            "gemini/gemini-2.5-flash",
            "ollama/llama3"
          ],
          "description": "Default model family for optimization"
        },
        "prmpt.ollamaEndpoint": {
          "type": "string",
          "default": "http://localhost:11434",
          "description": "Ollama API endpoint URL"
        },
        "prmpt.temperature": {
          "type": "number",
          "default": 0.7,
          "minimum": 0,
          "maximum": 1,
          "description": "Default temperature for optimization"
        }
      }
    },
    "keybindings": [
      {
        "command": "prmpt.optimize",
        "key": "ctrl+shift+p ctrl+o",
        "mac": "cmd+shift+p cmd+o"
      }
    ],
    "menus": {
      "editor/context": [
        {
          "command": "prmpt.optimize",
          "when": "editorHasSelection",
          "group": "prmpt"
        }
      ]
    }
  }
}
```

### 3.3 Activation Events

Controls when the extension activates (loads into memory):

| Event | Syntax | Use Case |
|-------|--------|----------|
| `onCommand` | `onCommand:prmpt.optimize` | When user triggers a command |
| `onView` | `onView:prmpt.sidebar` | When a view becomes visible |
| `onUri` | `onUri` | When a custom URI is opened (auth callback) |
| `onLanguage` | `onLanguage:markdown` | When opening a file of that language |
| `onStartupFinished` | `onStartupFinished` | After VS Code startup completes |
| `*` | `*` | Always active (**avoid** — impacts performance) |
| `workspaceContains` | `workspaceContains:**/.prmpt` | When workspace has specific files |

### 3.4 WebView API (for Optimizer UI)

```typescript
import * as vscode from 'vscode';

export class PrmptSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'prmpt.sidebar';
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Receive messages FROM webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'optimize':
                    const result = await this.optimizePrompt(message.prompt);
                    // Send message TO webview
                    webviewView.webview.postMessage({
                        type: 'optimized',
                        data: result
                    });
                    break;
                case 'selectModel':
                    // Handle model selection
                    break;
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        // Get URIs for local resources
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'style.css')
        );

        // Use nonce for Content Security Policy
        const nonce = getNonce();

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy"
                  content="default-src 'none';
                           style-src ${webview.cspSource};
                           script-src 'nonce-${nonce}';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${styleUri}" rel="stylesheet">
            <title>prmpt</title>
        </head>
        <body>
            <div id="app"></div>
            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }
}

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
```

**Webview ↔ Extension Message Passing:**

```typescript
// ═══════════════════════════════════════════
// In webview JavaScript (media/main.js):
// ═══════════════════════════════════════════

const vscode = acquireVsCodeApi();

// Send message to extension
vscode.postMessage({ type: 'optimize', prompt: 'my prompt text' });

// Receive message from extension
window.addEventListener('message', event => {
    const message = event.data;
    if (message.type === 'optimized') {
        displayResult(message.data);
    }
});

// Persist state across webview visibility changes
vscode.setState({ lastPrompt: 'my prompt' });
const state = vscode.getState(); // Restored automatically when webview becomes visible again
```

### 3.5 SecretStorage API (for BYOK API Keys)

```typescript
export async function activate(context: vscode.ExtensionContext) {
    const secretStorage = context.secrets;

    // Store API key
    context.subscriptions.push(
        vscode.commands.registerCommand('prmpt.setApiKey', async () => {
            const provider = await vscode.window.showQuickPick(
                ['openai', 'anthropic', 'gemini'],
                { placeHolder: 'Select provider' }
            );
            if (!provider) return;

            const key = await vscode.window.showInputBox({
                prompt: `Enter your ${provider} API key`,
                password: true,       // Masked input
                placeHolder: 'sk-...',
                validateInput: (value) => {
                    if (!value || value.length < 10) {
                        return 'API key appears too short';
                    }
                    return null;
                }
            });

            if (key) {
                await secretStorage.store(`prmpt.${provider}.apiKey`, key);
                vscode.window.showInformationMessage(
                    `${provider} API key stored securely`
                );
            }
        })
    );

    // Retrieve API key
    const openaiKey = await secretStorage.get('prmpt.openai.apiKey');

    // Listen for changes
    secretStorage.onDidChange(e => {
        if (e.key.startsWith('prmpt.')) {
            // Refresh provider connections
        }
    });

    // Delete API key
    await secretStorage.delete('prmpt.openai.apiKey');
}
```

### 3.6 Auth Flow Pattern (UriHandler + asExternalUri)

```typescript
// Complete OAuth callback flow for VS Code extension
class AuthHandler implements vscode.UriHandler {
    private _pendingResolve?: (token: string) => void;

    handleUri(uri: vscode.Uri): vscode.ProviderResult<void> {
        // Step 5: Receive callback from browser
        const query = new URLSearchParams(uri.query);
        const token = query.get('token');
        if (token && this._pendingResolve) {
            this._pendingResolve(token);
            this._pendingResolve = undefined;
        }
    }

    async login(): Promise<string> {
        // Step 1: Get callback URI
        const callbackUri = await vscode.env.asExternalUri(
            vscode.Uri.parse(
                `${vscode.env.uriScheme}://prmpt.prmpt/auth-callback`
            )
        );

        // Step 2: Open browser to auth provider
        const authUrl = `https://your-clerk-domain/sign-in?redirect_url=${
            encodeURIComponent(callbackUri.toString())
        }`;
        await vscode.env.openExternal(vscode.Uri.parse(authUrl));

        // Step 3-4: Wait for callback
        return new Promise<string>((resolve, reject) => {
            this._pendingResolve = resolve;
            setTimeout(() => {
                this._pendingResolve = undefined;
                reject(new Error('Auth timeout'));
            }, 120000); // 2 minute timeout
        });
    }
}

// Register in activate()
export function activate(context: vscode.ExtensionContext) {
    const authHandler = new AuthHandler();
    context.subscriptions.push(
        vscode.window.registerUriHandler(authHandler)
    );
}
```

**Auth Flow Diagram:**
```
1. Extension calls vscode.env.asExternalUri() to get callback URI
2. Opens browser to auth provider with callback URI
3. User authenticates in browser
4. Browser redirects to vscode://prmpt.prmpt/auth-callback?token=...
5. registerUriHandler receives the callback
6. Extension stores token in SecretStorage
```

### 3.7 Progress Indication

```typescript
// Show progress during optimization
await vscode.window.withProgress(
    {
        location: vscode.ProgressLocation.Notification,
        title: "Optimizing prompt...",
        cancellable: true,
    },
    async (progress, token) => {
        token.onCancellationRequested(() => {
            // Handle cancellation
        });

        progress.report({ increment: 0, message: "Analyzing prompt..." });
        // ... do work ...

        progress.report({ increment: 50, message: "Applying techniques..." });
        // ... do work ...

        progress.report({ increment: 100, message: "Complete!" });
    }
);
```

### 3.8 Extension API Quick Reference

| API | Use in prmpt | Example |
|-----|-------------|---------|
| `vscode.commands.registerCommand` | Register all prmpt commands | `prmpt.optimize`, `prmpt.selectModel` |
| `vscode.window.registerWebviewViewProvider` | Sidebar UI | Optimizer panel |
| `vscode.window.createWebviewPanel` | Full editor panels | Diff viewer (F10) |
| `vscode.window.showQuickPick` | Selection lists | Model selection, template selection |
| `vscode.window.showInputBox` | Text input | API key entry |
| `vscode.window.showInformationMessage` | Notifications | Success messages |
| `vscode.window.showWarningMessage` | Warnings | Trial expiring |
| `vscode.window.showErrorMessage` | Errors | API failures |
| `vscode.window.withProgress` | Progress indicator | During optimization |
| `vscode.workspace.getConfiguration` | Read settings | `prmpt.defaultModel` |
| `context.globalState` | Persist data across sessions | Session count, preferences |
| `context.workspaceState` | Per-workspace data | Workspace-specific settings |
| `context.secrets` | Secure storage | API keys |
| `vscode.window.registerUriHandler` | OAuth callbacks | Clerk auth flow |
| `vscode.env.openExternal` | Open URLs | Payment checkout, auth pages |
| `vscode.env.asExternalUri` | Create callback URIs | Auth redirect |
| `vscode.env.clipboard.writeText` | Copy to clipboard | Copy optimized prompt |
| `vscode.window.activeTextEditor` | Get active editor | Read selected text |

---

## 4. Authentication & User Management (Clerk)

Resources for **Clerk-based authentication** and **user session management**.

### 4.1 Documentation Links

| Resource | URL | Description | Relevance |
|----------|-----|-------------|-----------|
| **Clerk Documentation Hub** | https://clerk.com/docs | Complete auth platform docs. JS SDK available for non-browser contexts. | Auth — Primary auth provider |
| **Clerk JavaScript SDK** | https://clerk.com/docs/references/javascript/overview | Client-side SDK for custom auth flows. | Auth — Extension integration |
| **Clerk Custom Flows** | https://clerk.com/docs/custom-flows/overview | Build custom sign-in/sign-up flows outside hosted UI. Essential for VS Code extension. | Auth — Custom browser redirect flow |
| **Clerk Webhooks** | https://clerk.com/docs/integrations/webhooks | Webhook events for user creation, session management. Can sync with Supabase. | Auth — User sync to Supabase |
| **Clerk + Supabase Integration** | https://clerk.com/docs/integrations/databases/supabase | Official guide for Clerk auth with Supabase database. JWT template configuration. | Auth + Data — Integration pattern |
| **Clerk Backend API** | https://clerk.com/docs/reference/backend-api | Server-side API for user management, session verification. | Auth — Backend verification |

### 4.2 Clerk JavaScript SDK Objects

| Object | Purpose | Key Methods/Properties |
|--------|---------|----------------------|
| **Clerk** | Main entry point | `load()`, `signIn`, `signUp`, `user`, `session`, `client` |
| **Client** | Current device/browser state | `sessions[]`, `signIn`, `signUp`, `activeSessions` |
| **Session** | Auth state representation | `id`, `status`, `user`, `getToken()`, `touch()`, `end()` |
| **User** | Current authenticated user | `id`, `firstName`, `lastName`, `emailAddresses[]`, `publicMetadata`, `unsafeMetadata` |
| **SignIn** | Sign-in lifecycle | `create()`, `prepareFirstFactor()`, `attemptFirstFactor()`, `status` |
| **SignUp** | Sign-up lifecycle | `create()`, `prepareVerification()`, `attemptVerification()`, `status` |
| **Organization** | Team management | `id`, `name`, `members`, `roles` |
| **APIKeys** | Manage API keys | For third-party access management |

### 4.3 Custom Auth Flow for VS Code Extension

Since Clerk's hosted UI components (React/Next.js) can't render inside VS Code, use the **Custom Flow** approach:

```typescript
// Conceptual flow for prmpt:
// 1. Extension opens browser to Clerk-hosted sign-in page
// 2. User authenticates in browser
// 3. Browser redirects back to VS Code via URI handler
// 4. Extension receives session token
// 5. Extension stores token in SecretStorage
// 6. Extension uses token for API calls to Supabase

// Key Clerk endpoints for custom flow:
// POST /v1/client/sign_ins                    — Create sign-in attempt
// POST /v1/client/sign_ins/{id}/attempt       — Attempt verification
// GET  /v1/client/sessions/{id}/tokens        — Get session token
// POST /v1/client/sign_ups                    — Create sign-up
// GET  /v1/me                                 — Get current user
```

### 4.4 User Metadata Storage

Clerk supports three types of metadata on the User object:

| Type | Writable From | Readable From | Use in prmpt |
|------|--------------|---------------|-------------|
| `publicMetadata` | Backend API only | Frontend + Backend | User plan status, premium flag |
| `privateMetadata` | Backend API only | Backend only | Internal tracking |
| `unsafeMetadata` | Frontend + Backend | Frontend + Backend | User preferences (caution: user-editable) |

### 4.5 Session Token → Supabase JWT

```typescript
// Clerk can generate Supabase-compatible JWTs:
// 1. Configure JWT Template in Clerk Dashboard:
//    - Template name: "supabase"
//    - Claims: { "role": "authenticated", "sub": "{{user.id}}" }
//    - Signing algorithm: RS256

// 2. In extension, get Supabase token from Clerk session:
const token = await session.getToken({ template: 'supabase' });

// 3. Use token with Supabase client:
const { data, error } = await supabase.auth.setSession({
    access_token: token,
    refresh_token: '' // Not needed for JWT strategy
});
```

---

## 5. Data Storage & Backend (Supabase)

Resources for **Supabase** database integration (users table, session tracking).

### 5.1 Documentation Links

| Resource | URL | Description | Relevance |
|----------|-----|-------------|-----------|
| **Supabase JS Client Reference** | https://supabase.com/docs/reference/javascript/introduction | Comprehensive CRUD API with TypeScript support. | Data — Primary data layer |
| **Supabase Auth** | https://supabase.com/docs/guides/auth | Auth API for direct auth (if not using Clerk). | Data — Auth reference |
| **Supabase Edge Functions** | https://supabase.com/docs/guides/functions | Serverless functions (Deno-based). | Backend — Server-side logic |
| **Supabase Realtime** | https://supabase.com/docs/guides/realtime | Real-time subscriptions. | Data — Future features |
| **Supabase Row Level Security** | https://supabase.com/docs/guides/database/postgres/row-level-security | RLS policies for per-user data access. | Security — Data isolation |

### 5.2 Installation & Initialization

```bash
npm install @supabase/supabase-js
```

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Basic initialization
const supabase: SupabaseClient = createClient(
    'https://xyzcompany.supabase.co',  // SUPABASE_URL
    'public-anon-key'                   // SUPABASE_ANON_KEY
);

// With TypeScript types (recommended)
import { Database } from './database.types';

const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);
```

### 5.3 TypeScript Type Generation

```bash
# Generate types from your Supabase project
npx supabase gen types typescript --project-id your-project-id > database.types.ts
```

Generated types structure:
```typescript
interface Database {
    public: {
        Tables: {
            users: {
                Row: {          // SELECT return type
                    id: string;
                    clerk_user_id: string;
                    email: string | null;
                    total_sessions: number;
                    is_premium: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {       // INSERT parameter type
                    id?: string;
                    clerk_user_id: string;
                    email?: string | null;
                    total_sessions?: number;
                    is_premium?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {       // UPDATE parameter type
                    id?: string;
                    clerk_user_id?: string;
                    email?: string | null;
                    total_sessions?: number;
                    is_premium?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };
        };
        Enums: {};
    };
}

// Helper types for convenience
type Tables<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Row'];
type InsertTables<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Insert'];
type UpdateTables<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Update'];
```

### 5.4 CRUD Operations

#### SELECT (Read)

```typescript
// Select all columns
const { data, error } = await supabase
    .from('users')
    .select('*');

// Select specific columns
const { data, error } = await supabase
    .from('users')
    .select('id, email, total_sessions, is_premium');

// Select with filter
const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_user_id', 'user_abc123');

// Select single row (errors if 0 or >1 rows)
const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_user_id', 'user_abc123')
    .single();

// Maybe single (returns null if 0 rows, no error)
const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_user_id', 'user_abc123')
    .maybeSingle();

// Select with ordering and pagination
const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)
    .range(0, 9);  // 0-indexed, inclusive
// NOTE: Default max 1000 rows returned. Use .range() for pagination.
```

#### INSERT (Create)

```typescript
// Insert single row
const { data, error } = await supabase
    .from('users')
    .insert({
        clerk_user_id: 'user_abc123',
        email: 'user@example.com',
        total_sessions: 0,
        is_premium: false,
    })
    .select();  // Chain .select() to return the inserted row

// Insert multiple rows
const { data, error } = await supabase
    .from('users')
    .insert([
        { clerk_user_id: 'user_1', email: 'user1@example.com' },
        { clerk_user_id: 'user_2', email: 'user2@example.com' },
    ])
    .select();
```

#### UPDATE

```typescript
// Update with filter (MUST combine with filter!)
const { data, error } = await supabase
    .from('users')
    .update({
        total_sessions: 5,
        updated_at: new Date().toISOString(),
    })
    .eq('clerk_user_id', 'user_abc123')
    .select();  // Chain .select() to return updated row
```

#### UPSERT (Insert or Update)

```typescript
// Upsert — inserts if new, updates if exists (based on primary key)
const { data, error } = await supabase
    .from('users')
    .upsert({
        clerk_user_id: 'user_abc123',
        email: 'user@example.com',
        total_sessions: 1,
    })
    .select();
```

#### DELETE

```typescript
// Delete with filter (MUST combine with filter!)
const { data, error } = await supabase
    .from('users')
    .delete()
    .eq('clerk_user_id', 'user_abc123')
    .select();  // Chain .select() to return deleted row
```

### 5.5 Filters Reference

```typescript
// Equality
.eq('column', 'value')       // column = value
.neq('column', 'value')      // column != value

// Comparison
.gt('column', 5)             // column > 5
.gte('column', 5)            // column >= 5
.lt('column', 10)            // column < 10
.lte('column', 10)           // column <= 10

// Pattern matching
.like('column', '%pattern%')      // LIKE (case-sensitive)
.ilike('column', '%pattern%')     // ILIKE (case-insensitive)

// Null checking
.is('column', null)               // column IS NULL
.not('column', 'is', null)        // column IS NOT NULL

// Array/Set
.in('column', ['a', 'b', 'c'])   // column IN ('a', 'b', 'c')
.contains('tags', ['urgent'])     // array contains
.containedBy('tags', ['a', 'b']) // array contained by

// Text search
.textSearch('column', 'search query', { type: 'websearch' })

// Negation
.not('is_premium', 'eq', true)    // NOT is_premium = true

// Compound filter (raw PostgREST)
.filter('total_sessions', 'gte', 9)

// Multiple filters (AND — just chain them)
.eq('is_premium', false).gte('total_sessions', 9)

// OR conditions
.or('is_premium.eq.true,total_sessions.gte.9')
```

### 5.6 Modifiers Reference

```typescript
.select('*')                      // Return data after operation
.order('created_at', { ascending: false })  // Sort
.limit(10)                        // Limit rows
.range(0, 9)                      // Pagination (inclusive)
.single()                         // Expect exactly 1 row (error otherwise)
.maybeSingle()                    // Expect 0 or 1 row
.csv()                            // Return as CSV string
.explain()                        // Return query execution plan
.abortSignal(controller.signal)   // Cancellable request
```

### 5.7 RPC (Postgres Functions)

```sql
-- Create a Postgres function for atomic session increment
CREATE OR REPLACE FUNCTION increment_sessions(user_clerk_id TEXT)
RETURNS void AS $$
BEGIN
    UPDATE users
    SET total_sessions = total_sessions + 1,
        updated_at = now()
    WHERE clerk_user_id = user_clerk_id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to check trial status
CREATE OR REPLACE FUNCTION check_trial_status(user_clerk_id TEXT)
RETURNS TABLE(
    sessions_used INTEGER,
    sessions_remaining INTEGER,
    is_trial_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.total_sessions,
        GREATEST(0, 9 - u.total_sessions),
        u.total_sessions < 9 OR u.is_premium
    FROM users u
    WHERE u.clerk_user_id = user_clerk_id;
END;
$$ LANGUAGE plpgsql;
```

```typescript
// Call from JavaScript
const { data, error } = await supabase.rpc('increment_sessions', {
    user_clerk_id: 'user_abc123'
});

const { data: status } = await supabase.rpc('check_trial_status', {
    user_clerk_id: 'user_abc123'
});
// status: { sessions_used: 5, sessions_remaining: 4, is_trial_active: true }
```

### 5.8 Auth Events (if using Supabase Auth directly)

```typescript
// Auth state change events
supabase.auth.onAuthStateChange((event, session) => {
    // event values:
    // INITIAL_SESSION — First session loaded
    // SIGNED_IN       — User signed in
    // SIGNED_OUT      — User signed out
    // TOKEN_REFRESHED — Access token refreshed
    // USER_UPDATED    — User profile updated
    // PASSWORD_RECOVERY — Password recovery initiated
    console.log(event, session);
});
```

### 5.9 Edge Functions

```typescript
// Invoke an Edge Function
const { data, error } = await supabase.functions.invoke('optimize-prompt', {
    body: {
        prompt: 'Write some code',
        model: 'gpt-4.1',
        options: { temperature: 0.7 }
    }
});
// Content-Type is automatically set based on body type
```

### 5.10 Realtime Subscriptions

```typescript
// Subscribe to database changes
const channel = supabase.channel('user-changes')
    .on('postgres_changes', {
        event: 'UPDATE',      // INSERT, UPDATE, DELETE, or *
        schema: 'public',
        table: 'users',
        filter: 'clerk_user_id=eq.user_abc123'
    }, (payload) => {
        console.log('User updated:', payload.new);
    })
    .subscribe();

// Cleanup
supabase.removeChannel(channel);
// or supabase.removeAllChannels();
```

### 5.11 Row Level Security (RLS)

```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own data
CREATE POLICY "Users can read own data" ON users
    FOR SELECT
    USING (clerk_user_id = auth.jwt() ->> 'sub');

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE
    USING (clerk_user_id = auth.jwt() ->> 'sub');

-- Policy: Service role can do anything (for backend/webhooks)
CREATE POLICY "Service role full access" ON users
    FOR ALL
    USING (auth.role() = 'service_role');
```

### 5.12 Schema (from scope.md)

```sql
-- Single table for MVP
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT UNIQUE NOT NULL,
    email TEXT,
    total_sessions INTEGER DEFAULT 0,
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by Clerk ID
CREATE INDEX idx_users_clerk_id ON users(clerk_user_id);
```

---

## 6. Payments & Monetization (code-checkout)

Resources for **code-checkout** integration (one-time $9.99 payment).

### 6.1 Documentation Links

| Resource | URL | Description |
|----------|-----|-------------|
| **code-checkout GitHub** | https://github.com/Riff-Technologies/code-checkout-vscode | Complete integration guide, both workflows |
| **code-checkout npm** | https://www.npmjs.com/package/@riff-tech/code-checkout-vscode | npm package v1.5.1, TypeScript types included |
| **code-checkout CLI** | `@riff-tech/code-checkout-vscode-cli` | CLI for project initialization |
| **code-checkout Platform** | https://codecheckout.dev/ | Dashboard for managing extensions, pricing, analytics |
| **code-checkout DEV Article** | https://dev.to/shawnroller/vscode-extensions-adding-paid-features-1noa | Background and rationale by Shawn Roller |
| **code-checkout Demo Video** | https://www.youtube.com/watch?v=9868SqGbZuU | Video walkthrough |
| **Riff Tech** | https://www.riff-tech.com/codecheckout | Parent company page |

### 6.2 Installation & Setup

```bash
# 1. Install the CLI globally
npm install -g @riff-tech/code-checkout-vscode-cli

# 2. Initialize your project (interactive wizard)
code-checkout init
# Walks through:
# - Creating a Publisher & Software on codecheckout.dev
# - Setting up a Pricing Model
# - Linking your Stripe account
# - Bootstrapping your project to support licensing

# 3. Install the package
npm install @riff-tech/code-checkout-vscode
```

### 6.3 Features

- 🔒 Secure license validation with offline support
- 🎯 Simple command tagging for paid vs. free features
- 🛡️ Code obfuscation to protect intellectual property
- 🌐 Seamless integration with VS Code extension ecosystem
- ⚡ Zero-config initialization
- 🔄 Automatic license validation with offline grace period

### 6.4 Managed Workflow (Recommended for prmpt)

```typescript
import * as vscode from 'vscode';
import {
    tagCommand,
    injectCheckoutCommands,
    TagOptions,
} from "@riff-tech/code-checkout-vscode";

// 1. Wrap activate() with injectCheckoutCommands
export const activate = injectCheckoutCommands(
    (context: vscode.ExtensionContext) => {

        // Your original command handler
        const optimizeCommand = () => {
            vscode.window.showInformationMessage("Optimizing prompt...");
        };

        // 2. Define tag options for premium features
        const tagOptions: TagOptions = {
            type: "paid",
            activationMessage: "Upgrade to prmpt Premium for unlimited optimizations!",
            activationCtaTitle: "Purchase License ($9.99)",
            reactivationMessage: "Your trial has ended. Upgrade for unlimited access.",
            reactivationCtaTitle: "Purchase License",
        };

        // 3. Tag the command as paid
        const paidOptimize = tagCommand(context, tagOptions, optimizeCommand);

        // 4. Register normally
        const disposable = vscode.commands.registerCommand(
            "prmpt.optimize",
            paidOptimize,
        );
        context.subscriptions.push(disposable);

        // Free commands don't need tagging
        const freeCommand = vscode.commands.registerCommand(
            "prmpt.openLibrary",
            () => { /* F6 Prompt Library - always free */ }
        );
        context.subscriptions.push(freeCommand);
    },
);
```

### 6.5 Manual Workflow (More Control)

```typescript
import {
    getLicense,
    getCheckoutUrl,
    CheckoutUrlOptions,
} from "@riff-tech/code-checkout-vscode";

// Check license status
async function checkLicense(
    context: vscode.ExtensionContext
): Promise<boolean> {
    const licenseData = await getLicense(context);

    if (licenseData?.isValid) {
        vscode.window.showInformationMessage(
            `License valid until ${licenseData.expiresOn}`
        );
        return true;
    }
    return false;
}

// Force online validation
async function validateOnline(context: vscode.ExtensionContext) {
    const validatedLicense = await getLicense(context, true); // true = force online
    if (validatedLicense?.isExpired) {
        vscode.window.showErrorMessage("Your license has expired");
    }
}

// Open checkout page
async function purchaseLicense(context: vscode.ExtensionContext) {
    const options: CheckoutUrlOptions = {
        customSuccessUrl: "https://codecheckout.dev/activate", // default
        customCancelUrl: undefined,  // defaults to redirect back to IDE
    };

    const url = await getCheckoutUrl(context, options);
    await vscode.env.openExternal(vscode.Uri.parse(url));
}
```

### 6.6 LicenseData Object

```typescript
interface LicenseData {
    isValid: boolean;                    // Whether license is currently valid
    licenseKey: string | null;           // Active license key if exists
    isExpired: boolean;                  // Whether license has expired
    isOnlineValidationRequired: boolean; // If online validation needed
    lastValidated: Date | null;          // When last validated
    expiresOn: Date | null;             // Expiration date
    machineId: string;                  // Unique machine identifier
}
```

### 6.7 Checkout URL Query Parameters

When using custom success/cancel URLs, code-checkout appends:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `key` | License key (success URL only) | `key=1234567890` |
| `ideName` | IDE app scheme | `ideName=vscode` or `ideName=cursor` |
| `id` | Extension ID | `id=publisher.my-extension` |

Full example: `https://example.com/success?key=1234567890&ideName=vscode&id=prmpt.prmpt`

### 6.8 prmpt Trial + Payment Integration Pattern

```typescript
const TRIAL_LIMIT = 9;

async function handleOptimize(context: vscode.ExtensionContext) {
    // 1. Check if user has valid license (code-checkout)
    const license = await getLicense(context);
    if (license?.isValid) {
        return await runOptimization(); // Premium user — no limits
    }

    // 2. Check trial sessions from Supabase
    const { data: user } = await supabase
        .from('users')
        .select('total_sessions, is_premium')
        .eq('clerk_user_id', currentUserId)
        .single();

    if (user?.is_premium) {
        return await runOptimization(); // Premium via Supabase flag
    }

    if ((user?.total_sessions ?? 0) < TRIAL_LIMIT) {
        // 3. Increment session count
        await supabase.rpc('increment_sessions', {
            user_clerk_id: currentUserId
        });

        const remaining = TRIAL_LIMIT - (user?.total_sessions ?? 0) - 1;
        vscode.window.showInformationMessage(
            `Free trial: ${remaining} optimizations remaining`
        );
        return await runOptimization();
    }

    // 4. Trial expired — show purchase option
    const choice = await vscode.window.showWarningMessage(
        'Free trial ended! Upgrade to prmpt Premium for unlimited optimizations.',
        'Purchase ($9.99)',
        'Later'
    );

    if (choice === 'Purchase ($9.99)') {
        const url = await getCheckoutUrl(context);
        await vscode.env.openExternal(vscode.Uri.parse(url));
    }
}
```

### 6.9 Security & Pricing

**Security:**
- Code obfuscation is provided but **not encryption**
- Obfuscation can be disabled by removing the `code-checkout-build` postcompile script
- License validation includes offline grace period

**Pricing (for prmpt $9.99 one-time):**
- Platform fee: Free to integrate
- Transaction fee: 10% → ~$1.00
- Stripe fee: ~2.9% + $0.30 → ~$0.59
- **Net per sale: ~$8.40**

---

## 7. Local LLM Support (Ollama)

Resources for **Ollama** integration (privacy-first local LLM, F4 Local model family).

### 7.1 Documentation Links

| Resource | URL | Description |
|----------|-----|-------------|
| **Ollama REST API Docs** | https://github.com/ollama/ollama/blob/main/docs/api.md | Complete API reference |
| **Ollama Homepage** | https://ollama.com/ | Download and getting started |
| **Ollama Model Library** | https://ollama.com/library | Available models |
| **Ollama GitHub** | https://github.com/ollama/ollama | Main repository (130K+ ⭐) |

### 7.2 API Endpoints Reference

All endpoints default to `http://localhost:11434`.

#### POST /api/chat (Chat Completion — Primary for prmpt)

```typescript
const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        model: 'llama3',
        messages: [
            {
                role: 'system',
                content: 'You are a prompt optimization expert.'
            },
            {
                role: 'user',
                content: 'Optimize this prompt: "write code for a web scraper"'
            }
        ],
        stream: false,
        format: 'json',    // Force JSON output
        options: {
            temperature: 0.7,
            top_p: 0.9,
            top_k: 40,
            num_predict: 1024,     // max tokens
            repeat_penalty: 1.1,
            seed: 42,              // deterministic
            stop: ['\n\n---'],
            num_ctx: 4096,         // context window
        }
    })
});

const data = await response.json();
// Response shape:
// {
//   "model": "llama3",
//   "created_at": "2024-01-01T00:00:00Z",
//   "message": { "role": "assistant", "content": "..." },
//   "done": true,
//   "total_duration": 1234567890,
//   "load_duration": 123456789,
//   "prompt_eval_count": 50,
//   "prompt_eval_duration": 123456789,
//   "eval_count": 100,
//   "eval_duration": 987654321
// }
```

#### POST /api/chat (Streaming)

```typescript
const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    body: JSON.stringify({
        model: 'llama3',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true,
    })
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value).split('\n').filter(Boolean);
    for (const line of lines) {
        const chunk = JSON.parse(line);
        if (!chunk.done) {
            process.stdout.write(chunk.message.content);
        }
    }
}
```

#### POST /api/generate (Text Generation)

```typescript
const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({
        model: 'llama3',
        prompt: 'Optimize this prompt: ...',
        system: 'You are a prompt optimization expert.',
        stream: false,
        format: 'json',
        options: { temperature: 0.7, num_predict: 1024 }
    })
});
const data = await response.json();
// data.response contains the generated text
```

#### GET /api/tags (List Models)

```typescript
const response = await fetch('http://localhost:11434/api/tags');
const data = await response.json();
// data.models: Array<{
//   name: string,            // "llama3:latest"
//   model: string,
//   modified_at: string,
//   size: number,             // bytes
//   digest: string,
//   details: {
//     parent_model: string,
//     format: string,         // "gguf"
//     family: string,         // "llama"
//     families: string[],
//     parameter_size: string, // "8B"
//     quantization_level: string  // "Q4_0"
//   }
// }>
```

#### POST /api/show (Model Info)

```typescript
const response = await fetch('http://localhost:11434/api/show', {
    method: 'POST',
    body: JSON.stringify({ name: 'llama3' })
});
const data = await response.json();
// data.modelfile, data.parameters, data.template, data.details, data.model_info
```

#### GET /api/ps (Running Models)

```typescript
const response = await fetch('http://localhost:11434/api/ps');
const data = await response.json();
// data.models: Array<{ name, model, size, digest, details, expires_at, size_vram }>
```

#### POST /api/embed (Embeddings)

```typescript
const response = await fetch('http://localhost:11434/api/embed', {
    method: 'POST',
    body: JSON.stringify({
        model: 'llama3',
        input: 'Text to embed'  // or string[] for batch
    })
});
const data = await response.json();
// data.embeddings: number[][] (embedding vectors)
```

#### GET /api/version

```typescript
const response = await fetch('http://localhost:11434/api/version');
const data = await response.json();
// data.version: string (e.g., "0.5.4")
```

### 7.3 Ollama Options (Model Parameters)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `temperature` | float | 0.8 | Sampling temperature (0 = deterministic) |
| `top_p` | float | 0.9 | Nucleus sampling |
| `top_k` | int | 40 | Top-K sampling |
| `num_predict` | int | -1 | Max tokens (-1 = infinite, -2 = fill context) |
| `repeat_penalty` | float | 1.1 | Repetition penalty |
| `repeat_last_n` | int | 64 | Look-back window for repeat penalty |
| `seed` | int | 0 | Random seed (0 = random) |
| `stop` | string[] | — | Stop sequences |
| `num_ctx` | int | 2048 | Context window size |
| `num_batch` | int | 512 | Batch size for prompt processing |
| `num_gpu` | int | — | Number of GPU layers to offload |
| `main_gpu` | int | 0 | Main GPU index |
| `num_thread` | int | — | Number of CPU threads |
| `mirostat` | int | 0 | Mirostat sampling (0=off, 1=v1, 2=v2) |
| `mirostat_tau` | float | 5.0 | Mirostat target entropy |
| `mirostat_eta` | float | 0.1 | Mirostat learning rate |
| `tfs_z` | float | 1.0 | Tail free sampling |
| `typical_p` | float | 1.0 | Typical sampling threshold |
| `penalize_newline` | bool | true | Penalize newline tokens |

### 7.4 Recommended Models for prmpt

| Model | Size | Best For | Command |
|-------|------|----------|---------|
| `llama3.3` | 70B | Best quality (48GB+ VRAM) | `ollama pull llama3.3` |
| `llama3.2` | 3B | Fast, lightweight | `ollama pull llama3.2` |
| `qwen3` | 8B | Quality/speed balance | `ollama pull qwen3` |
| `gemma3` | 12B | Google quality model | `ollama pull gemma3` |
| `phi4` | 14B | Good at reasoning | `ollama pull phi4` |
| `deepseek-r1` | 7B-671B | Strong reasoning | `ollama pull deepseek-r1` |
| `mistral` | 7B | Fast, good quality | `ollama pull mistral` |
| `codellama` | 7B-34B | Code-specific | `ollama pull codellama` |

### 7.5 Ollama Connection Check (for prmpt)

```typescript
async function checkOllamaConnection(
    endpoint: string = 'http://localhost:11434'
): Promise<{
    connected: boolean;
    version?: string;
    models?: string[];
    error?: string;
}> {
    try {
        const versionRes = await fetch(`${endpoint}/api/version`);
        const versionData = await versionRes.json();

        const tagsRes = await fetch(`${endpoint}/api/tags`);
        const tagsData = await tagsRes.json();

        return {
            connected: true,
            version: versionData.version,
            models: tagsData.models?.map((m: any) => m.name) || [],
        };
    } catch (error) {
        return {
            connected: false,
            error: `Cannot connect to Ollama at ${endpoint}. Is Ollama running?`,
        };
    }
}
```

---

## 8. Prompt Template Libraries & Datasets

Resources for building the **Engineering Prompt Library (F6)** with 50+ templates, and the **Template System (F3)**.

### Template Libraries

| Resource | URL | Description | License |
|----------|-----|-------------|---------|
| **prompts.chat** | https://github.com/f/awesome-chatgpt-prompts | 147K+ ⭐, 345 contributors. Works with all major models. | CC0 |
| **PROMPTS.md** | https://raw.githubusercontent.com/f/prompts.chat/main/PROMPTS.md | Raw prompts in markdown. | CC0 |
| **HuggingFace Dataset** | https://huggingface.co/datasets/fka/prompts.chat | Structured dataset. | CC0 |
| **Prompty** | https://prompty.ai/ | Microsoft's prompt asset format. YAML frontmatter. | MIT |
| **LangGPT** | https://github.com/langgptai/LangGPT | Structured prompt design (10K+ ⭐). | MIT |

### Prompt Datasets

| Resource | URL | Description |
|----------|-----|-------------|
| **P3 (Public Pool of Prompts)** | https://huggingface.co/datasets/bigscience/P3 | Templates for 270+ NLP tasks |
| **System Prompts Dataset** | https://huggingface.co/datasets/danielrosehill/system_prompts | 944 system prompt templates |
| **OpenAssistant (OASST)** | https://huggingface.co/datasets/OpenAssistant/oasst1 | 161K messages, 35 languages |
| **CodeAlpaca-20k** | https://huggingface.co/datasets/sahil2801/CodeAlpaca-20k | 20K programming instruction pairs |

### F6 Template Categories

1. **Code Generation** — Function creation, class design, API scaffolding
2. **Code Review** — Security audit, performance review, refactoring
3. **Documentation** — README, API docs, JSDoc/TSDoc
4. **Testing** — Unit tests, test design, edge cases
5. **Debugging** — Error analysis, stack traces, root cause
6. **Architecture** — System design, database schema, API design
7. **DevOps** — CI/CD, Docker, deployment configs
8. **Data** — SQL queries, data transformation
9. **Security** — Vulnerability assessment, auth flows
10. **Communication** — PR descriptions, commit messages, proposals

---

## 9. Prompt Optimization Frameworks

### 9.1 DSPy (Stanford NLP)

**Philosophy**: "Programming — not prompting — LMs"

| Resource | URL |
|----------|-----|
| **DSPy Website** | https://dspy.ai/ |
| **DSPy GitHub** | https://github.com/stanfordnlp/dspy (32.4K+ ⭐, MIT) |
| **DSPy Paper** | https://arxiv.org/abs/2310.03714 |

**Core Concepts:**

```python
import dspy

# Configure
dspy.configure(lm=dspy.LM("openai/gpt-4.1", api_key="..."))

# Signatures — Define I/O
"question -> answer"
"question -> answer: float"
"context, question -> reasoning, answer"

# Modules
math = dspy.ChainOfThought("question -> answer: float")
result = math(question="What is the probability of rolling a sum of 9 with two dice?")

# Optimizers — Auto-tune prompts
tp = dspy.MIPROv2(metric=dspy.evaluate.answer_exact_match, auto="light", num_threads=24)
optimized = tp.compile(my_module, trainset=trainset)
```

**Modules**: Predict, ChainOfThought, ReAct, ProgramOfThought, MultiChainComparison, Parallel, Refine, CodeAct

**Optimizers**: BootstrapRS (few-shot), GEPA (instruction), MIPROv2 (~$2, ~20min), BootstrapFinetune, BetterTogether, COPRO, SIMBA

### 9.2 Other Frameworks

| Framework | URL | Description |
|-----------|-----|-------------|
| **TextGrad** | https://github.com/zou-group/textgrad | Automatic differentiation via text (Nature) |
| **OPRO** | https://github.com/google-deepmind/opro | LLMs as optimizers, up to 50% improvement |
| **Promptfoo** | https://github.com/promptfoo/promptfoo | CLI for prompt testing (9K+ ⭐) |
| **Agenta** | https://github.com/Agenta-AI/agenta | Prompt management + evaluation |

---

## 10. Competitor Analysis & Market Tools

| Competitor | Focus | prmpt Advantage |
|------------|-------|-----------------|
| **Langfuse** (22K+ ⭐) | Team/enterprise observability | Individual dev, privacy-first, local-first |
| **Prompty** (Microsoft) | Prompt file format + runtime | Active optimization, integrated optimizer |
| **VS Code AI Toolkit** | Model playground + agents | Focused on prompt quality |
| **DSPy** | Programmatic optimization | GUI-first, no Python required |
| **Cursor/Copilot** | AI code generation | Prompt optimization for ANY LLM use |
| **PromptLayer** | Version, test, monitor | VS Code native, privacy-first |
| **Helicone** | Production monitoring | Developer-focused |

---

## 11. Academic Papers & Research

### Must-Read Papers

| Paper | URL | Year | Relevance |
|-------|-----|------|-----------|
| **The Prompt Report** | https://arxiv.org/abs/2406.06608 | 2024 | 58 text + 40 multimodal techniques. **F7 essential.** |
| **Chain of Thought** | https://arxiv.org/abs/2201.11903 | 2022 | Foundational CoT. Core F7. |
| **Zero-Shot Reasoners** | https://arxiv.org/abs/2205.11916 | 2022 | "Let's think step by step". Core F7. |
| **Self-Consistency** | https://arxiv.org/abs/2203.11171 | 2022 | Multiple CoT outputs. F8. |
| **OPRO** | https://arxiv.org/abs/2309.03409 | 2023 | Meta-prompts. **Core F1.** |
| **DSPy** | https://arxiv.org/abs/2310.03714 | 2023 | Auto prompt optimization. **Core F1.** |
| **PE²** | https://arxiv.org/abs/2311.05661 | 2024 | LLMs meta-prompting. **Core F1.** |
| **Prompt Pattern Catalog** | https://arxiv.org/abs/2302.11382 | 2023 | Pattern catalog. **F6.** |
| **Tree of Thoughts** | https://arxiv.org/abs/2305.10601 | 2023 | Tree reasoning. F7. |
| **ReAct** | https://arxiv.org/abs/2210.03629 | 2022 | Reasoning + action. F7. |
| **Let Me Speak Freely?** | https://arxiv.org/abs/2408.02442 | 2024 | Format vs reasoning. **F5.** |
| **APE** | https://arxiv.org/abs/2211.01910 | 2022 | Auto prompt generation. F1. |
| **EvoPrompt** | https://arxiv.org/abs/2309.08532 | 2023 | Evolutionary optimization. F1. |
| **SPO** | https://arxiv.org/abs/2502.06855 | 2025 | Self-supervised, 1-6% cost. F1. |
| **MIPRO** | https://arxiv.org/abs/2406.11695 | 2024 | Bayesian optimization, +13%. F1. |
| **LLMLingua-2** | https://arxiv.org/abs/2403.12968 | 2024 | Prompt compression, 3-6x faster. F1. |
| **Meta Prompting** | https://arxiv.org/abs/2311.11482 | 2023 | Structural templates. F3. |
| **Many-Shot ICL** | https://arxiv.org/abs/2404.11018 | 2024 | Scaling in-context learning. F7. |
| **Prompt Injection** | https://arxiv.org/abs/2310.12815 | 2023 | 5 attacks, 10 defenses. Security. |
| **Instruction Hierarchy** | https://arxiv.org/abs/2404.13208 | 2024 | Priority-level injection defense. Security. |
| **Constitutional AI** | https://arxiv.org/abs/2212.08073 | 2022 | AI safety. Security. |

---

## 12. Books

| Book | Author | Year |
|------|--------|------|
| **Prompt Engineering for LLMs** | Berryman & Ziegler (O'Reilly) | 2024 |
| **Prompt Engineering for Generative AI** | Phoenix & Taylor (O'Reilly) | 2024 |
| **AI Engineering** | Chip Huyen (O'Reilly) | 2025 |
| **Developer's Playbook for LLM Security** | Steve Wilson (O'Reilly) | 2024 |
| **LLM Engineer's Handbook** | Iusztin & Labonne (Packt) | 2024 |

---

## 13. Courses & Tutorials

| Course | URL | Duration |
|--------|-----|----------|
| **ChatGPT PE for Developers** | https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/ | ~90 min |
| **Building Systems with ChatGPT** | https://www.deeplearning.ai/short-courses/building-systems-with-chatgpt/ | ~2 hrs |
| **Google Prompting Essentials** | https://grow.google/prompting-essentials/ | <6 hrs |
| **PE Specialization** | https://www.coursera.org/specializations/prompt-engineering | Vanderbilt |
| **Stanford CS336** | https://cs336.stanford.edu/ | Stanford |

---

## 14. Community & Ecosystem

| Resource | URL |
|----------|-----|
| **Awesome Prompt Engineering** | https://github.com/promptslab/Awesome-Prompt-Engineering (5.4K+ ⭐) |
| **prompts.chat** | https://github.com/f/awesome-chatgpt-prompts (147K+ ⭐) |
| **12-Factor Agents** | https://github.com/humanlayer/12-factor-agents (17K+ ⭐) |
| **r/PromptEngineering** | https://reddit.com/r/PromptEngineering |
| **r/LocalLLaMA** | https://reddit.com/r/LocalLLaMA |
| **OpenAI Community** | https://community.openai.com/ |
| **LM Arena** | https://lmarena.ai/ (6M+ votes, Elo-rated) |
| **HF Open LLM Leaderboard** | https://huggingface.co/spaces/HuggingFaceH4/open_llm_leaderboard |
| **SWE-bench** | https://www.swebench.com/ |

---

## 15. VS Code Extension Packaging & Publishing

### 15.1 vsce CLI

```bash
# Install
npm install -g @vscode/vsce

# Package into .vsix
vsce package
# Creates: prmpt-0.1.0.vsix

# Publish to marketplace
vsce publish

# Login to publisher
vsce login prmpt

# Publish with version bump
vsce publish minor     # 0.1.0 → 0.2.0
vsce publish patch     # 0.1.0 → 0.1.1
vsce publish 1.0.0     # Set explicit version

# Pre-release (convention: EVEN minor = release, ODD = pre-release)
vsce publish --pre-release

# Platform-specific builds
vsce package --target win32-x64 linux-x64 darwin-x64 darwin-arm64

# Install locally from .vsix
code --install-extension prmpt-0.1.0.vsix
```

### 15.2 PAT Setup (Azure DevOps)

1. Go to https://dev.azure.com/
2. User Settings → Personal Access Tokens → New Token
3. **Organization**: All accessible organizations
4. **Scopes**: Marketplace → Manage
5. Copy token (shown only once)

### 15.3 Publisher Setup

1. Go to https://marketplace.visualstudio.com/manage
2. Create publisher with unique ID (unchangeable) + display name
3. Login: `vsce login <publisher-id>`

### 15.4 package.json for Publishing

```json
{
    "name": "prmpt",
    "displayName": "prmpt",
    "description": "Privacy-conscious AI prompt optimization",
    "version": "0.1.0",
    "publisher": "prmpt",
    "pricing": "Trial",
    "icon": "resources/icon.png",
    "galleryBanner": { "color": "#1a1a2e", "theme": "dark" },
    "engines": { "vscode": "^1.85.0" },
    "categories": ["Machine Learning", "Other"],
    "keywords": ["prompt", "optimization", "ai", "llm"],
    "license": "SEE LICENSE IN LICENSE.md",
    "scripts": {
        "vscode:prepublish": "npm run compile"
    }
}
```

### 15.5 .vscodeignore

```
.vscode/**
.vscode-test/**
src/**
**/*.ts
**/tsconfig.json
**/.eslintrc*
node_modules/**
.gitignore
**/*.map
wiki/**
```

### 15.6 Publishing Rules

- **Icon**: 128x128 PNG (no SVG)
- **Images**: HTTPS URLs only
- **Keywords**: Max 30
- **README.md**: Used as marketplace description
- **CHANGELOG.md**: Marketplace "Changelog" tab
- **Verified publisher**: 6 months + DNS TXT verification
- **Pricing**: `"Free"` or `"Trial"` (vsce ≥ 2.10.0)
- **Sponsor**: `"sponsor": { "url": "..." }` (vsce ≥ 2.9.1)

### 15.7 Pre-publish Checklist

- [ ] README.md with screenshots and features
- [ ] CHANGELOG.md (Keep a Changelog format)
- [ ] LICENSE file
- [ ] Icon (128x128 PNG)
- [ ] package.json: publisher, categories, keywords, engines, repository
- [ ] .vscodeignore excludes source files
- [ ] vscode:prepublish script compiles TypeScript
- [ ] `vsce package` creates valid .vsix
- [ ] Install .vsix locally: `code --install-extension`
- [ ] All commands have titles and categories
- [ ] Extension size < 10MB

---

## Quick Reference: Resource → Feature Mapping

| MVP Feature | Primary Resources |
|-------------|-------------------|
| **F1 Core AI Optimizer** | DAIR.AI Guide, DSPy, OPRO paper, PE² paper, OpenAI PE guide |
| **F2 Variable Engine** | Prompty spec, LangGPT, template systems |
| **F3 Template System** | Prompty format, prompts.chat, P3, LangGPT |
| **F4 Model Family Selector** | OpenAI/Anthropic/Gemini API (§2), Ollama API (§7) |
| **F5 Output Format Switcher** | Structured output docs, "Let Me Speak Freely" paper |
| **F6 Prompt Library** | prompts.chat (CC0), P3, CodeAlpaca-20k |
| **F7 Technique Selector** | The Prompt Report, CoT/ToT/ReAct papers, techniques (§1) |
| **F8 Quality Score** | Promptfoo, Self-Consistency paper |
| **F9 Context Injector** | Anthropic Context Engineering, RAG concepts |
| **F10 Diff Viewer** | VS Code WebView API (§3.4), ChainForge |
| **Auth System** | Clerk JS SDK (§4), VS Code UriHandler/SecretStorage (§3.5-3.6) |
| **Data Layer** | Supabase JS Client (§5), Clerk+Supabase JWT (§4.5) |
| **Payments** | code-checkout (§6), trial pattern (§6.8) |
| **Platform** | VS Code Extension API (§3), packaging (§15) |

---

## Quick Reference: TypeScript Import Cheatsheet

```typescript
// VS Code Extension API
import * as vscode from 'vscode';

// OpenAI
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

// Anthropic
import Anthropic from '@anthropic-ai/sdk';

// Google Gemini
import { GoogleGenerativeAI } from '@google/generative-ai';

// Supabase
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types'; // generated types

// code-checkout
import {
    tagCommand,
    injectCheckoutCommands,
    TagOptions,
    getLicense,
    getCheckoutUrl,
    CheckoutUrlOptions,
} from '@riff-tech/code-checkout-vscode';

// Ollama — no npm package needed, use native fetch
// const response = await fetch('http://localhost:11434/api/chat', { ... });
```

## Quick Reference: npm Dependencies

```json
{
    "dependencies": {
        "openai": "^4.x",
        "@anthropic-ai/sdk": "^0.x",
        "@google/generative-ai": "^0.x",
        "@supabase/supabase-js": "^2.x",
        "@riff-tech/code-checkout-vscode": "^1.5.1",
        "zod": "^3.x"
    },
    "devDependencies": {
        "@types/vscode": "^1.85.0",
        "@vscode/vsce": "^3.x",
        "typescript": "^5.x",
        "esbuild": "^0.x"
    }
}
```

---

*This document was compiled through systematic internet research across multiple sessions. All URLs were verified as accessible at the time of compilation. Contains detailed API syntax, TypeScript code examples, and configuration patterns to serve as a comprehensive developer reference for building the prmpt MVP.*

# prmpt MVP1 — Final Product Scope

**Version:** 1.0 (Final)  
**Date:** February 23, 2026  
**Status:** ✅ APPROVED FOR DEVELOPMENT  
**Document Type:** Product Scope Definition  
**Related Documents:**
- [Technical Architecture](technical-architecture.md) — Tech stack, system design, implementation details *(separate session)*
- [Revenue Model](revenue-model.md) — Pricing strategy, exclusive features analysis, projections *(separate session)*

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Mission](#2-product-vision--mission)
3. [Target User](#3-target-user)
4. [Core Problem Statement](#4-core-problem-statement)
5. [Product Architecture Overview](#5-product-architecture-overview)
6. [Privacy & Data Architecture](#6-privacy--data-architecture)
7. [Model Family Strategy](#7-model-family-strategy)
8. [MVP Feature Scope — Complete Specification](#8-mvp-feature-scope--complete-specification)
9. [User Flows & Interaction Model](#9-user-flows--interaction-model)
10. [Business Model Summary](#10-business-model-summary)
11. [Go-to-Market Strategy](#11-go-to-market-strategy)
12. [Success Metrics](#12-success-metrics)
13. [Product Positioning & Messaging](#13-product-positioning--messaging)
14. [Competitive Differentiation](#14-competitive-differentiation)
15. [MVP Development Roadmap](#15-mvp-development-roadmap)
16. [Post-MVP Expansion Path](#16-post-mvp-expansion-path)
17. [Risk Register & Mitigations](#17-risk-register--mitigations)
18. [Decision Log](#18-decision-log)

---

## 1. Executive Summary

prmpt is a **privacy-conscious, AI-powered prompt optimization tool** for individual developers. It helps engineers write better prompts across Claude, GPT, and Gemini model families through an intelligent core optimizer with modular extensions — variable engine, template system, technique selector, and output formatting.

**The product is delivered as a VS Code extension** with a future web companion.

### Finalized Key Decisions

| Decision | Final Choice |
|----------|--------------|
| **Platform** | VS Code Extension (MVP) → Web Auth Portal + Web Companion (Post-MVP) |
| **Target Audience** | Individual developers |
| **Authentication** | Mandatory account for all users (free and premium) via Clerk — GitHub Copilot/Cursor-style browser redirect OAuth flow |
| **Privacy Model** | Hybrid: Local LLM (Ollama) + BYOK (user's API keys) — all prompt data stays local |
| **Data Storage** | Hybrid: Local file system (prompts, history, templates) + Supabase (email, auth, usage tracking) |
| **Business Model** | Free trial (9 optimization sessions) → $9.99 one-time purchase for full unlimited access |
| **Core Engine** | AI-powered optimizer with modular layered extensions |
| **Model Support** | Family-based (Claude/GPT/Gemini series), not version-specific |
| **Output Formats** | XML, JSON, Markdown, Plain Text |
| **Positioning** | "Privacy-conscious" with transparent data handling — prompts never leave your machine |

---

## 2. Product Vision & Mission

### Vision
Become the standard prompt engineering companion in every developer's IDE — the tool developers reach for every time they interact with an LLM.

### Mission
Help individual developers consistently produce better results from any LLM by turning prompt writing into an engineered, repeatable, model-aware workflow — all within their IDE and under their control.

### Product Principles

| Principle | Description |
|-----------|-------------|
| **Developer-first** | Built for IDE workflows, not web dashboards |
| **Privacy you control** | Local LLM by default, BYOK for cloud — your prompts never leave your machine |
| **Modular by design** | Core optimizer + stackable extensions that layer on top |
| **Model-agnostic** | Works across model families without version lock-in |
| **Frictionless auth** | GitHub Copilot/Cursor-style browser redirect — sign in once, use everywhere |
| **Honest pricing** | Free trial to prove value, one affordable one-time payment for full access |

---

## 3. Target User

### Primary Persona: Individual Developer

| Attribute | Detail |
|-----------|--------|
| **Role** | Software engineer, full-stack developer, backend/frontend engineer |
| **Experience** | Junior to senior (2-15 years) |
| **AI Usage** | Uses LLMs daily for coding, debugging, refactoring, documentation |
| **Pain Point** | Writes prompts ad-hoc, gets inconsistent results, wastes time iterating |
| **Tools** | VS Code primary IDE, uses Claude/GPT/Gemini |
| **Privacy Stance** | Prefers control over data, uncomfortable blindly sending code to cloud |
| **Budget** | Willing to pay for tools that save time, but not expensive subscriptions |

### User Jobs-to-be-Done (JTBD)

1. "I want to write a prompt that gets me the right answer on the first try"
2. "I want to reuse my best prompts without copy-pasting from old chats"
3. "I want to switch between Claude and GPT without rewriting everything"
4. "I want my prompts to use the right techniques (CoT, few-shot) without being an expert"
5. "I want to keep my code and prompts off third-party servers when possible"

### Future Expansion (Post-MVP)
- Engineering teams (shared templates, SSO, compliance)
- Enterprise deployment (self-hosted, audit logging)

---

## 4. Core Problem Statement

### The Prompt Quality Gap

Developers fail at prompts, not AI tools. In real workflows, prompts are:

- **Vague** — "fix this bug" without constraints, context, or output expectations
- **Missing context** — no project structure, error logs, coding standards
- **Non-reusable** — scattered across chat windows, Slack, Notion, random files
- **Model-ignorant** — same prompt used for Claude and GPT despite different optimal formats
- **Technique-unaware** — developers don't know when to apply CoT vs few-shot vs role prompting

**Result:** A frustrating ask → partial output → clarify → retry loop that wastes time and makes AI feel unreliable.

### Why Existing Tools Don't Solve This

| Tool Category | What They Do | What's Missing |
|---------------|-------------|----------------|
| **LLMOps (Langfuse, LangSmith)** | Prompt versioning for production LLM apps | Not for daily IDE prompting |
| **Frameworks (DSPy)** | Programmatic ML optimization | Too technical for casual use |
| **IDE Extensions (Prompty)** | Basic prompt file format | No optimization, no templates |
| **AI Assistants (Copilot, Cursor)** | Code generation | Don't help you write better prompts for them |

**prmpt fills the gap:** a prompt authoring and optimization tool built for daily IDE developer workflows.

---

## 5. Product Architecture Overview

### Core + Modular Extension Architecture

The product follows a layered architecture where the **Core Optimizer** is the foundation, and **extension modules** stack on top to add functionality. The user controls which extensions are active for any given prompt.

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRMPT ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                  VS Code Extension (MVP)                    ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │                                                             ││
│  │  ┌─────────────────────────────────────────────────────┐   ││
│  │  │           AUTHENTICATION LAYER (Clerk)              │   ││
│  │  │                                                     │   ││
│  │  │  • Sign In / Sign Up buttons in extension           │   ││
│  │  │  • Browser redirect → prmpt website (Clerk)   │   ││
│  │  │  • OAuth callback → VS Code URI handler             │   ││
│  │  │  • Session token stored in VS Code SecretStorage     │   ││
│  │  │  • Usage tracking: 9 free sessions → upgrade prompt │   ││
│  │  └──────────────────────┬──────────────────────────────┘   ││
│  │                         │                                   ││
│  │  ┌─────────────────────────────────────────────────────┐   ││
│  │  │           CORE AI OPTIMIZER ENGINE                  │   ││
│  │  │                                                     │   ││
│  │  │  • LLM-powered prompt enhancement & refinement      │   ││
│  │  │  • Accepts raw user prompt → outputs optimized      │   ││
│  │  │  • Applies selected technique layers (CoT, etc.)    │   ││
│  │  │  • Privacy: Local LLM (Ollama) or BYOK API keys     │   ││
│  │  └──────────────────────┬──────────────────────────────┘   ││
│  │                         │                                   ││
│  │           ┌─────────────┴──────────────┐                   ││
│  │           ▼                            ▼                   ││
│  │  ┌────────────────────────┐  ┌─────────────────────────┐   ││
│  │  │   EXTENSION MODULES    │  │     OUTPUT LAYER        │   ││
│  │  │   (stackable layers)   │  │                         │   ││
│  │  │                        │  │  • XML formatter        │   ││
│  │  │  • Variable Engine ⭐  │  │  • JSON formatter       │   ││
│  │  │  • Template System ⭐  │  │  • Markdown formatter   │   ││
│  │  │  • Technique Selector⭐│  │  • Plain text           │   ││
│  │  │  • Template Library    │  │                         │   ││
│  │  │                        │  │  • Model Family Presets │   ││
│  │  │  ⭐ = Premium feature  │  │                         │   ││
│  │  └────────────────────────┘  └─────────────────────────┘   ││
│  │                                                             ││
│  │  ┌─────────────────────────────────────────────────────┐   ││
│  │  │           LOCAL PERSISTENT STORAGE                  │   ││
│  │  │                                                     │   ││
│  │  │  • Optimized prompts stored locally                 │   ││
│  │  │  • Prompt history data stored locally               │   ││
│  │  │  • Template library (user-created + built-in)       │   ││
│  │  │  • User settings & preferences                      │   ││
│  │  └─────────────────────────────────────────────────────┘   ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              CLOUD SERVICES (Minimal)                       ││
│  │                                                             ││
│  │  ┌──────────────────────┐  ┌────────────────────────────┐  ││
│  │  │  Clerk (Auth)        │  │  Supabase (User Data)      │  ││
│  │  │  • User signup/login │  │  • Email (from Clerk)      │  ││
│  │  │  • OAuth flow        │  │  • Total sessions count    │  ││
│  │  │  • Session mgmt      │  │  • Premium status          │  ││
│  │  │  • JWT tokens        │  │  • Account metadata        │  ││
│  │  └──────────────────────┘  └────────────────────────────┘  ││
│  │                                                             ││
│  │  ┌──────────────────────────────────────────────────────┐  ││
│  │  │  prmpt Website (Auth Portal)                   │  ││
│  │  │  • Clerk-powered sign-in / sign-up pages             │  ││
│  │  │  • OAuth callback handler (redirect back to VS Code) │  ││
│  │  │  • Premium purchase flow                             │  ││
│  │  │  • Account management                                │  ││
│  │  └──────────────────────────────────────────────────────┘  ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Web Companion (Post-MVP)                       ││
│  │  • Template library browser & management                    ││
│  │  • Community template sharing                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### How Extension Layering Works

**Example:** Developer preparing a debugging prompt

1. User opens prmpt in VS Code
2. Selects **debugging template** from Template Library
3. **Variable Engine** presents fields: `{error_message}`, `{stack_trace}`, `{code_snippet}`, `{expected_behavior}`
4. User fills in variables
5. User enables **Chain of Thought (CoT)** technique
6. User selects **Claude Family** + **XML output format**
7. **Core Optimizer** processes all layers → generates final optimized prompt
8. User copies/sends to their LLM of choice

```
User Input → [Template] → [Variables] → [Technique: CoT] → [Core Optimizer] → [Format: XML + Claude Family] → Final Prompt
```

---

## 6. Privacy & Data Architecture

### 6.1 Privacy Model: Hybrid (Local LLM + BYOK) with Minimal Cloud Auth

prmpt uses a **dual-layer architecture** — prompt data stays 100% local, while authentication and usage tracking use minimal cloud services (Clerk + Supabase).

```
┌─────────────────────────────────────────────────────────────────┐
│        PRIVACY ARCHITECTURE: LOCAL PROMPTS + CLOUD AUTH         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AUTHENTICATION LAYER (Cloud — Clerk + Supabase)               │
│  ───────────────────────────────────────────────                │
│  • Mandatory account for all users (free and premium)          │
│  • Clerk handles auth (email/password, social login)           │
│  • Supabase stores: email, hashed password, total sessions     │
│  • VS Code → Browser redirect → Clerk auth → redirect back    │
│  • Minimal data: we only track email + usage count             │
│                                                                 │
│  PROMPT PROCESSING LAYER (100% Local — User's Machine)         │
│  ─────────────────────────────────────────────────────          │
│                                                                 │
│  MODE 1: LOCAL LLM (Maximum Privacy) ⭐ Premium                │
│  • Ollama integration for local model inference                │
│  • Zero prompt data leaves the user's machine                  │
│  • Full feature support with local models                      │
│  • No API keys required                                        │
│  • Trade-off: Requires local compute, smaller models           │
│                                                                 │
│  MODE 2: BYOK — Bring Your Own Key 🆓 Free Trial + ⭐ Premium  │
│  • User provides their own API key (OpenAI, Anthropic, etc.)   │
│  • Available in free trial (enables optimizer at $0 cost to us)│
│  • Direct API calls: user ↔ provider (we never see prompts)    │
│  • Access to larger, more capable models                       │
│  • User's existing API billing applies                         │
│  • Privacy governed by user's own provider agreement           │
│                                                                 │
│  DATA FLOW:                                                     │
│                                                                 │
│  Auth:         User → [VS Code] → [Browser] → [Clerk/Website] │
│                         → [Supabase: email + session count]    │
│                                                                 │
│  Local Mode:   User → [prmpt] → [Ollama/Local LLM]      │
│                         ↕ (all prompt data local)              │
│                                                                 │
│  BYOK Mode:    User → [prmpt] → [User's API Key] →      │
│                         Provider (OpenAI/Anthropic/etc.)       │
│                                                                 │
│  prmpt NEVER:                                            │
│  • Hosts or proxies API calls through our servers              │
│  • Stores, logs, or transmits user prompts to our cloud        │
│  • Uses prompts for training or analytics                      │
│  • Accesses prompt content from Supabase (only auth data)      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Authentication Flow: GitHub Copilot/Cursor-Style Browser Redirect

prmpt uses a **browser redirect authentication flow** identical to how GitHub Copilot and Cursor authenticate users — the industry-standard pattern for VS Code extension auth.

```
┌──────────────────────────────────────────────────────────────────┐
│               AUTHENTICATION FLOW (Clerk OAuth)                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STEP 1: User installs extension                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  VS Code Extension                                      │    │
│  │  ┌─────────────────────────────────┐                    │    │
│  │  │  Welcome to prmpt!        │                    │    │
│  │  │                                 │                    │    │
│  │  │  [Sign In]   [Sign Up]          │                    │    │
│  │  └─────────────────────────────────┘                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           │                                      │
│  STEP 2: Click Sign In → Opens default browser                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  vscode.env.openExternal(                               │    │
│  │    'https://prmpt.dev/auth/sign-in?source=vscode' │    │
│  │  )                                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           │                                      │
│  STEP 3: Browser → prmpt website (Clerk sign-in page)     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  prmpt.dev/auth/sign-in                           │    │
│  │  ┌─────────────────────────────────┐                    │    │
│  │  │  Sign in to prmpt         │                    │    │
│  │  │                                 │                    │    │
│  │  │  Email: ____________            │                    │    │
│  │  │  Password: _________            │                    │    │
│  │  │                                 │                    │    │
│  │  │  [Sign In]                      │                    │    │
│  │  │  ─── or ───                     │                    │    │
│  │  │  [Continue with GitHub]         │                    │    │
│  │  │  [Continue with Google]         │                    │    │
│  │  └─────────────────────────────────┘                    │    │
│  │  Powered by Clerk                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           │                                      │
│  STEP 4: Successful auth → Redirect back to VS Code              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Redirect: vscode://prmpt/auth-callback?token=JWT │    │
│  │                                                         │    │
│  │  VS Code URI handler captures the callback              │    │
│  │  Token stored in VS Code SecretStorage (encrypted)      │    │
│  │  Session count incremented in Supabase                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           │                                      │
│  STEP 5: Extension authenticated — ready to use                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ✅ Signed in as user@email.com                         │    │
│  │  📊 Sessions used: 3 / 9 (Free Trial)                   │    │
│  │     or                                                   │    │
│  │  ⭐ Premium — Unlimited access                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 6.3 Data Storage: Hybrid (Local Prompts + Cloud Auth)

**Prompt data stays on the user's machine. Only auth and usage data lives in the cloud.**

| Data Type | Storage Location | Format | Cloud? |
|-----------|-----------------|--------|--------|
| **User account** | Supabase (via Clerk) | PostgreSQL row | ☁️ Yes |
| **Email + hashed password** | Clerk (managed) | Clerk internal | ☁️ Yes |
| **Total session count** | Supabase | Integer field | ☁️ Yes |
| **Premium status** | Supabase | Boolean field | ☁️ Yes |
| **Auth session token** | VS Code SecretStorage | Encrypted JWT | 💻 Local |
| **Optimized prompts** | Local file system | JSON | 💻 Local |
| **Prompt history** | Local file system | JSON | 💻 Local |
| **User templates** | Local file system (workspace or global) | JSON/YAML | 💻 Local |
| **Built-in templates** | Bundled with extension | JSON | 💻 Local |
| **User preferences** | VS Code settings API | JSON | 💻 Local |
| **API keys (BYOK)** | VS Code SecretStorage API (encrypted) | Encrypted | 💻 Local |
| **Model family configs** | Bundled + user-overridable | JSON | 💻 Local |

**What's in Supabase (minimal):**
```sql
-- Total Supabase schema: ONE table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  total_sessions INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Benefits for prmpt (the product):**
- Minimal cloud footprint — only auth + usage counting
- No prompt data breach liability (prompts never leave local machine)
- Supabase Pro ($25/mo): required for production reliability (free tier auto-pauses after 1 week)
- Clerk free tier: 50K monthly retained users — more than sufficient
- Usage-based upgrade enforcement via session count
- Premium validation without complex license key infrastructure

**Benefits for users:**
- Prompts stay 100% on your machine — complete data ownership
- Works offline for prompt optimization (auth only needed at session start)
- Fast auth via familiar browser redirect (like Copilot/Cursor)
- No prompt data in any cloud database
- Portable — prompt data travels with VS Code profile

### 6.4 Privacy Messaging Guidelines

| Context | Messaging |
|---------|-----------|
| **Marketplace listing** | "Your prompts stay on your machine. We only store your email and usage count — never your prompt content." |
| **Onboarding** | "prmpt requires a free account to get started. Your prompts are stored locally — we never see, store, or transmit your prompt content." |
| **Auth screen** | "Sign in to prmpt. We store only your email and session count. Your prompts never leave your machine." |
| **BYOK setup** | "Your API key connects directly to [provider]. We don't proxy or log these calls." |
| **Settings page** | Clear toggle: "Local LLM (Ollama)" vs "BYOK (Your API Key)" with privacy explanation |

---

## 7. Model Family Strategy

### 7.1 Family-Based Approach (Not Version-Specific)

Instead of maintaining individual configurations for Claude 3.5 Sonnet, Claude 4 Opus, GPT-4o, GPT-5, etc., prmpt groups models by **family** with shared prompting characteristics.

| Model Family | Prompting Preferences | Output Tendencies |
|-------------|----------------------|-------------------|
| **Claude Series** | Prefers XML-structured prompts, responds well to explicit role definitions, handles long context effectively | Verbose, well-structured, follows instructions precisely |
| **GPT Series** | Leverages system messages effectively, works well with JSON-structured instructions | Concise defaults, strong at code generation |
| **Gemini Series** | Handles multimodal context, works with natural language instructions | Adaptable output format, strong at reasoning tasks |
| **Local Models** | Varies by model (Llama, Mistral, etc.), generally benefit from simpler instructions | Varies by model size and training |

### 7.2 Output Format Options (User-Selected)

Separate from model family, users select their desired **output format**:

| Format | Best For | Example Use |
|--------|----------|-------------|
| **XML** | Structured data, Claude optimization | `<task>Debug this error</task><context>...</context>` |
| **JSON** | Automation, structured extraction | `{"task": "debug", "context": "..."}` |
| **Markdown** | Readable prompts, documentation | `## Task\nDebug this error\n## Context\n...` |
| **Plain Text** | Simple prompts, quick tasks | `Debug this error. Context: ...` |

### 7.3 User Selection Flow

```
Step 1: Select Model Family    →  [Claude] [GPT] [Gemini] [Local]
Step 2: Select Output Format   →  [XML] [JSON] [Markdown] [Text]
Step 3: Core Optimizer applies  →  family-specific best practices + chosen format
```

**Future expansion:** New model families (Llama, Mistral, Cohere, etc.) can be added as config files without code changes.

---

## 8. MVP Feature Scope — Complete Specification

### 8.1 Feature Priority Tiers

All features are grouped into priority tiers with clear scope boundaries.

### Tier 1: P0 — Must Ship at Launch

These features define the minimum viable product. Launch is blocked without all of these.

---

#### F1: Core AI Optimizer Engine

**What it is:** The foundation of prmpt. Takes a raw prompt draft and produces an optimized, well-structured prompt using LLM intelligence.

**What it does:**
- Accepts user's rough prompt input
- Enhances clarity (removes ambiguity, adds missing constraints)
- Improves completeness (ensures context, task, constraints, output format are present)
- Applies structural best practices based on selected model family
- Layers on any selected techniques (CoT, few-shot, etc.)
- Outputs the final optimized prompt in the user's chosen format

**Privacy modes:**
- **Local LLM (default):** Processes via Ollama — nothing leaves the machine
- **BYOK:** Sends to user's own API key — we never see the prompt

**Scope boundaries:**
- ✅ Prompt enhancement and restructuring
- ✅ Technique application (when selected by user)
- ✅ Model-family-aware formatting
- ❌ Does NOT auto-evaluate prompt quality (that's Quality Score — Tier 2)
- ❌ Does NOT execute prompts against models (that's Prompt Playground — Post-MVP)

---

#### F2: Variable Engine & Dynamic Placeholder System ⭐ Premium

**What it is:** A system for defining, validating, and filling reusable placeholders in prompt templates. **This feature requires a premium account ($9.99 one-time purchase).**

**Variables supported:**

| Variable Type | Example | Behavior |
|---------------|---------|----------|
| **Text** | `{error_message}` | Free-form text input |
| **Code** | `{code_snippet}` | Code-aware input with syntax highlighting |
| **File** | `{file_context}` | Populated from active file or file picker |
| **Selection** | `{selected_code}` | Auto-populated from VS Code selection |
| **Enum** | `{language}` → [Python, TypeScript, Go, ...] | Dropdown selection |

**Validation:**
- Required vs optional variables
- Minimum/maximum length
- Type checking (code vs text)
- Clear error messages for missing required variables

**Scope boundaries:**
- ✅ Variable definition, validation, and substitution
- ✅ Auto-populate from VS Code context (active file, selection)
- ❌ Does NOT support complex expressions or conditionals (keep simple for MVP)

---

#### F3: Template System ⭐ Premium

**What it is:** Create, save, organize, and manage reusable prompt templates with variables. **This feature requires a premium account ($9.99 one-time purchase).** Free trial users can browse and preview templates from the starter library but cannot create, save, or manage their own.

**Capabilities:**

| Capability | Description |
|------------|-------------|
| **Create** | New template from scratch or save current prompt as template |
| **Edit** | Modify template content, variables, metadata |
| **Organize** | Categorize by type (debug, refactor, review, design, test, custom) |
| **Search** | Full-text search across template names and descriptions |
| **Tags** | User-defined tags for filtering |
| **Import/Export** | JSON/YAML export for sharing, import from file |

**Template structure:**

```
Template {
  name: string
  description: string
  category: debug | refactor | review | design | test | custom
  targetFamilies: [claude, gpt, gemini, local, all]
  variables: VariableDefinition[]
  promptBody: string (with {variable} placeholders)
  suggestedTechniques: string[]
  tags: string[]
  metadata: { author, createdAt, updatedAt, version }
}
```

**Storage:** Local file system (JSON files), portable across VS Code installations via settings sync.

---

#### F4: Model Family Selector

**What it is:** A simple selector that tells the optimizer which model family the prompt is targeting.

**UI:** Dropdown or button group — `[Claude] [GPT] [Gemini] [Local] [Custom]`

**Behavior:**
- Stores as preference (remembers last selection)
- Informs Core Optimizer to apply family-specific best practices
- Affects suggested output format (but user can override)
- Templates can suggest a default family

---

#### F5: Output Format Switcher

**What it is:** Select the structural format of the optimized prompt output.

**Options:** `[XML] [JSON] [Markdown] [Plain Text]`

**Behavior:**
- User selects desired format
- Core Optimizer structures the output accordingly
- One-click switching between formats (re-renders same prompt)
- Copy-to-clipboard with format preserved

---

#### F6: Engineering Prompt Library (Built-in Templates)

**What it is:** A curated library of 50+ high-quality, engineering-specific prompt templates shipped with the extension.

**Template categories and examples:**

| Category | Example Templates | Count |
|----------|-------------------|-------|
| **Debugging** | Runtime error analysis, Logic bug investigation, Performance profiling, Stack trace analysis | 8-10 |
| **Code Review** | Security review, Performance review, Best practices review, PR review | 6-8 |
| **Refactoring** | Extract function, Simplify conditionals, Apply design pattern, Remove duplication | 6-8 |
| **Testing** | Unit test generation, Edge case identification, Test plan creation | 5-6 |
| **Documentation** | API docs, README generation, Code comments, Architecture docs | 5-6 |
| **Design** | System design, API design, Database schema, Architecture review | 5-6 |
| **General** | Code explanation, Learning/tutorial, Translation between languages | 5-6 |

**Library features:**
- Browse by category
- Search by keyword
- Preview template before use
- One-click use (opens with variable fields ready to fill)
- "Suggest a template" based on context (simple keyword matching for MVP)

---

### Tier 2: P1 — High Value, Target for Launch

These features add significant value. Ship if time permits; otherwise first post-launch update.

---

#### F7: Prompt Technique Selector

**What it is:** A guided selector that lets users enable prompting techniques that the Core Optimizer will apply as additional layers.

**Supported techniques for MVP:**

| Technique | When to Use | What the Optimizer Does |
|-----------|------------|------------------------|
| **Chain of Thought (CoT)** | Complex reasoning, multi-step problems | Adds "think step by step" structure, reasoning scaffolding |
| **Few-Shot Examples** | Pattern matching, consistent formatting | Adds example input/output pairs section |
| **Role Prompting** | Specialized expertise needed | Adds role/persona definition |
| **Step-by-Step** | Sequential tasks, procedures | Breaks task into numbered steps |
| **Constraint Specification** | Strict output requirements | Adds explicit constraints section |

**UI:** Checkbox list or toggle switches — user can enable multiple techniques that stack.

**Example:** User selects `[CoT]` + `[Role Prompting]` → Optimizer adds reasoning scaffolding AND a role definition to the prompt.

---

#### F8: Prompt Quality Score

**What it is:** A 0-100 score that rates prompt quality with improvement suggestions.

**Scoring dimensions:**

| Dimension | Weight | What It Checks |
|-----------|--------|----------------|
| **Completeness** | 30% | Context provided, task clarity, output format specified |
| **Clarity** | 25% | Ambiguity detection, specificity of instructions |
| **Structure** | 20% | Logical organization, section headers, formatting |
| **Model Fit** | 15% | Alignment with selected model family's preferences |
| **Technique Usage** | 10% | Appropriate technique selection for task type |

**Output:**
```
Quality: 72/100
✅ Completeness: 85 — Context and task are well-defined
⚠️ Clarity: 65 — 2 ambiguities detected (consider specifying...)
✅ Structure: 78 — Good use of sections
❌ Model Fit: 60 — Claude prefers XML structure for this task type
⚠️ Technique: 55 — CoT recommended for debugging tasks

[Apply Suggestions] [Dismiss]
```

---

#### F9: Context Injector

**What it is:** Auto-detects project context from the VS Code workspace and injects relevant information into prompts.

**Auto-detected context:**

| Context Type | Source | Example |
|-------------|--------|---------|
| **Language** | File extension, `package.json`, etc. | TypeScript |
| **Framework** | `package.json`, config files | Next.js 16 |
| **Active file** | VS Code editor | `src/components/Button.tsx` |
| **Selected code** | VS Code selection | Lines 45-62 of current file |
| **Git diff** | Git API | Current uncommitted changes |
| **Error output** | Terminal / Problems panel | Current error messages |

**How it works:**
- User clicks "Inject Context" or enables auto-injection
- Relevant context populates template variables automatically
- User can review/edit before including in prompt

---

### Tier 3: P2 — Post-Launch

These features are planned but NOT in MVP scope. They inform architecture decisions.

---

#### F10: Prompt Diff Viewer

**What it is:** Visual diff view showing how a prompt has changed across iterations.

- Side-by-side comparison of prompt versions
- Highlight additions, removals, modifications
- Version history with timestamps
- Restore previous versions, fork from any version

---

#### F11: Engineering-Specific Wizards

**What it is:** Guided step-by-step builders for common engineering prompt types.

- **Debug Wizard:** Select error type → paste error → paste code → auto-generates debug prompt
- **Code Review Wizard:** Select review focus → paste PR diff → set severity → auto-generates review prompt
- **Refactoring Wizard:** Select refactor type → paste code → set constraints → auto-generates refactor prompt

---

#### F12: Web Companion

**What it is:** A browser-based companion app for template management and community features.

- Template library browser (full screen, better for browsing large libraries)
- Community template sharing and discovery
- Account management and premium features
- Template analytics and usage stats

---

### 8.2 MVP Scope Summary Table

| ID | Feature | Priority | MVP? | Tier | Dependency |
|----|---------|----------|------|------|------------|
| F1 | Core AI Optimizer Engine | 🔴 P0 | ✅ Yes | 🆓 Free (9 sessions) / ⭐ Premium (unlimited) | LLM integration (Ollama/BYOK) |
| F2 | Variable Engine | 🔴 P0 | ✅ Yes | ⭐ Premium | None |
| F3 | Template System | 🔴 P0 | ✅ Yes | ⭐ Premium | F2 |
| F4 | Model Family Selector | 🔴 P0 | ✅ Yes | 🆓 Free | None |
| F5 | Output Format Switcher | 🔴 P0 | ✅ Yes | 🆓 Free | None |
| F6 | Engineering Prompt Library | 🔴 P0 | ✅ Yes | 🆓 Starter (15-20) / ⭐ Full (50+) | F3 |
| F7 | Technique Selector | 🟡 P1 | 🎯 Target | ⭐ Premium | F1 |
| F8 | Quality Score | 🟡 P1 | 🎯 Target | ⭐ Premium | F1 |
| F9 | Context Injector | 🟡 P1 | 🎯 Target | ⭐ Premium | VS Code API |
| — | Local LLM Mode (Ollama) | 🔴 P0 | ✅ Yes | ⭐ Premium | Ollama |
| — | BYOK Mode | 🔴 P0 | ✅ Yes | 🆓 Free (trial) / ⭐ Premium | API key |
| — | Prompt History | 🔴 P0 | ✅ Yes | ⭐ Premium | Local storage |
| — | Template Import/Export | 🔴 P0 | ✅ Yes | ⭐ Premium | F3 |
| F10 | Diff Viewer | 🟢 P2 | ❌ Post | ⭐ Premium | F3 |
| F11 | Engineering Wizards | 🟢 P2 | ❌ Post | ⭐ Premium | F3 |
| F12 | Web Companion | 🟢 P2 | ❌ Post | — | Backend API |

**Free Trial Limit:** Free trial accounts are limited to **9 optimization sessions**. After 9 uses, users must upgrade to Premium ($9.99 one-time) to continue using prmpt. The session count is tracked via Supabase and enforced at the extension level.

---

## 9. User Flows & Interaction Model

### 9.0 First-Run Flow: Authentication (Required)

```
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  START   │───▶│ Install  │───▶│ Welcome  │───▶│ Browser  │───▶│ Clerk    │
│          │    │ Extension│    │ Screen   │    │ Opens    │    │ Auth     │
│ VS Code  │    │ from     │    │          │    │          │    │ Page     │
│ Market-  │    │ Market-  │    │ [Sign In]│    │promptfor-│    │          │
│ place    │    │ place    │    │ [Sign Up]│    │ge.dev    │    │Email/Pass│
└─────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                                     │
                                                                     ▼
                               ┌──────────┐    ┌──────────────────────────┐
                               │  READY   │◀───│  Redirect to VS Code     │
                               │          │    │                          │
                               │ Extension│    │ vscode://prmpt/    │
                               │ shows:   │    │ auth-callback?token=JWT  │
                               │ "Welcome │    │                          │
                               │  back!"  │    │ Token → SecretStorage    │
                               │ 9 free   │    │ Session created          │
                               │ sessions │    │                          │
                               └──────────┘    └──────────────────────────┘
```

### 9.1 Primary User Flow: Optimize a Prompt

```
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  START   │───▶│ Auth     │───▶│ Select   │───▶│ Write or │───▶│ Choose   │
│          │    │ Check    │    │ Model    │    │ Paste    │    │ Output   │
│ Open     │    │          │    │ Family   │    │ Prompt   │    │ Format   │
│PromptFor│    │ Signed   │    │          │    │          │    │          │
│   ge     │    │ in? ✅   │    │[Claude]  │    │ Raw text │    │[XML]     │
└─────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                                     │
                                                                     ▼
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────────────────┐
│  DONE   │◀───│  Copy    │◀───│ Review & │◀───│    CORE OPTIMIZER       │
│         │    │  to      │    │  Edit    │    │                          │
│ Use in  │    │Clipboard │    │ Output   │    │ • Enhance clarity        │
│ LLM     │    │          │    │          │    │ • Apply techniques       │
│         │    │ or Send  │    │          │    │ • Format as XML/Claude   │
│         │    │          │    │ Session  │    │ • Increment session count│
└─────────┘    └──────────┘    └──────────┘    └──────────────────────────┘
```

### 9.2 Free Trial Limit Flow

```
Sessions 1-8:  Normal usage → session count incremented in Supabase
Session 9:     Last free session → warning: "This is your last free optimization session"
Session 10+:   ┌──────────────────────────────────────────────────┐
               │  You've used all 9 free optimization sessions.  │
               │                                                  │
               │  Upgrade to Premium for $9.99 (one-time) to     │
               │  unlock unlimited access + all premium features. │
               │                                                  │
               │  [Upgrade Now — $9.99]    [Maybe Later]          │
               └──────────────────────────────────────────────────┘
```

### 9.3 Template Flow: Use a Template (Premium)

```
Auth Check → Browse Library → Select Template → Fill Variables → [Optional: Select Technique] → Optimize → Copy
```

### 9.4 Save Flow: Save Prompt as Template (Premium)

```
After optimizing → "Save as Template" → Name + Category + Tags → Saved to Local Library
```

### 9.5 BYOK Setup Flow

```
Settings → LLM Provider → "Add API Key" → Select Provider (OpenAI/Anthropic/etc.) → Paste Key → Encrypted Local Storage → Done
```

---

## 10. Business Model Summary

### Structure: Free Trial (9 Sessions) → $9.99 Premium (One-Time)

| Tier | Price | What's Included |
|------|-------|-----------------|
| **Free Trial** | $0 (9 sessions) | Core optimizer (F1), model family selector (F4), output formatter (F5), starter prompt library (15-20 templates), BYOK Mode (user's own API keys). **Requires account (Clerk).** |
| **Premium** | $9.99 one-time | **Everything.** Unlimited sessions + Variable Engine (F2) + Template System (F3) + Full Library (50+) + Local LLM Mode (Ollama) + Prompt History + Template Import/Export + Technique Selector (F7) + Quality Score (F8) + Context Injector (F9) |

### Key Principles
- **Try before you buy:** 9 free sessions give users enough experience to evaluate value
- **Hard paywall, fair price:** After 9 uses, a single $9.99 payment unlocks everything permanently
- **One-time, not subscription:** No recurring burden — pay once, use forever
- **Account required:** Lightweight Clerk auth enables session tracking and premium enforcement

### Infrastructure & Cost Model

| Component | Purpose | Cost |
|-----------|---------|------|
| **Clerk (Auth)** | Account creation, OAuth, JWT tokens | $0/mo (Hobby tier — 50K MRU free) |
| **Supabase (Data)** | User records, session counts, premium status | $25/mo (Pro — required; free tier auto-pauses after 1 week) |
| **prmpt Website** | Auth portal (Clerk-hosted sign-in/sign-up) | Hosted on Vercel ($0 free tier) |
| **API costs** | $0 — user provides own LLM access (Ollama or BYOK) | $0 |

> **⚠️ Note:** Supabase free tier auto-pauses projects after 1 week of inactivity. For production reliability, Supabase Pro ($25/mo) is required. See cost analysis in [revenue-model.md](revenue-model.md).

> **Note:** Detailed exclusive feature analysis, pricing validation, revenue projections, and infrastructure cost breakdowns are documented separately in [revenue-model.md](revenue-model.md).

---

## 11. Go-to-Market Strategy

### 11.1 Phase A: Initial User Acquisition (First 1,000 Users)

**Timeframe:** Launch to Day 90

| Channel | Action | Effort | Expected Impact |
|---------|--------|--------|-----------------|
| **VS Code Marketplace** | Optimized listing with screenshots, keywords, README | Low | 🔴 High — primary discovery channel |
| **Product Hunt** | Launch day campaign with assets and maker engagement | Medium | 🔴 High — developer audience alignment |
| **Hacker News (Show HN)** | Technical post: privacy-conscious prompt optimizer with Ollama support | Low | 🟡 Medium-High — credibility + discussion |
| **Dev.to / Medium** | 2-3 technical articles (prompt engineering tips + product mention) | Medium | 🟡 Medium — SEO + awareness |
| **Twitter/X** | Thread on prompt engineering problems + product launch | Low | 🟡 Medium — developer community reach |
| **Reddit** | Posts in r/vscode, r/programming, r/artificial | Low | 🟡 Medium — targeted communities |
| **GitHub** | Open-source template library repo, contribution guidelines | Medium | 🟡 Medium — trust + community |

**NOT in MVP GTM:**
- ❌ Paid advertising (low ROI for dev tools)
- ❌ YouTube tutorials (high effort, defer to Phase B)
- ❌ Conference talks (defer to 6+ months post-launch)

### 11.2 Phase B: Community Lock-in & Retention

**Timeframe:** Day 30+ (overlaps with Phase A)

| Mechanism | Description | MVP Implementation | Lock-in Effect |
|-----------|-------------|-------------------|----------------|
| **Personal Template Library** | Users build their own prompt template collection | ⭐ Premium feature | Switching cost: lose all templates |
| **Prompt History** | All optimized prompts saved locally with version tracking | ⭐ Premium feature | Data investment grows over time |
| **Workflow Integration** | Deep VS Code integration (commands, shortcuts, context menu) | ✅ Core feature | Muscle memory + habit formation |
| **Built-in Library Growth** | Regular updates with new engineering templates | Post-launch updates | Ongoing value delivery |
| **Community Templates** | Users share templates publicly (post-MVP web companion) | 🟢 Post-MVP | Network effects |
| **Reputation System** | Template ratings, contributor badges, leaderboards | 🟢 Post-MVP | Status + social investment |

### 11.3 Launch Checklist

- [ ] VS Code Marketplace listing with compelling description, screenshots, GIFs
- [ ] Product Hunt launch page prepared
- [ ] Show HN post drafted
- [ ] 2 Dev.to articles written and scheduled
- [ ] Twitter/X launch thread prepared
- [ ] GitHub repo with template contributions guide
- [ ] prmpt website live (prmpt.dev) with Clerk auth pages
- [ ] Clerk + Supabase production setup verified
- [ ] OAuth browser redirect flow tested end-to-end
- [ ] Feedback mechanism (GitHub Issues + in-extension feedback)

---

## 12. Success Metrics

### 12.1 North Star Metric

**Weekly Prompts Optimized (WPO):** The total number of prompts optimized per week across all active users.

*Why this metric:* It directly measures product value delivery. If users optimize more prompts, they find the tool valuable.

### 12.2 Primary Metrics (90-Day Targets)

Based on industry benchmarks for developer tools and VS Code extensions:

| Metric | Target | Benchmark Context | How We Measure |
|--------|--------|-------------------|----------------|
| **VS Code Installs** | 500 | New niche extensions: 100-1,000 in 90 days; strong niche: 1,000-5,000 | VS Code Marketplace stats |
| **Weekly Active Users (WAU)** | 150 | 30% of installs being weekly active is strong for dev tools | Anonymous local telemetry (opt-in) |
| **D1 Retention** | 40% | SaaS SMB benchmark: 40-60%; productivity apps: ~17% — target SaaS range since IDE tools have higher intent | First-day return rate |
| **D7 Retention** | 25% | SaaS SMB benchmark: 25-35%; general apps: 10-13% — target SaaS lower bound | Week-one return rate |
| **D30 Retention** | 15% | SaaS SMB benchmark: 15-25%; productivity apps: ~4% — target SaaS lower bound as aspirational but realistic | Month-one return rate |
| **Prompts Optimized (total)** | 2,500 | ~5 prompts/user/week × 150 WAU × 3-4 weeks | Local aggregate count |
| **Templates Created by Users** | 200 | Indicates users see value in building reusable workflows | Local count |
| **Premium Conversions** | 40-50 | 8-10% of installs converting at $9.99 = $399-$499 (hard limit drives conversion) | Payment tracking |
| **GitHub Stars** | 100 | Open-source template library | GitHub stats |

### 12.3 Retention Targets Rationale

Our retention targets are modeled against **SaaS SMB benchmarks** (not general consumer app benchmarks), because:

1. **High-intent users:** Developers installing a prompt tool have specific intent (unlike casual app downloads)
2. **Workflow integration:** VS Code extensions become part of daily workflow (like SaaS tools)
3. **Recurring need:** Prompt writing is a daily activity, not one-time

| Timeframe | Consumer App Average | SaaS SMB Average | Our Target | Rationale |
|-----------|---------------------|-------------------|------------|-----------|
| **Day 1** | 25-30% | 40-60% | **40%** | Conservative SaaS — new product needs proving |
| **Day 7** | 10-13% | 25-35% | **25%** | SaaS lower bound — realistic for MVP |
| **Day 30** | 4-7% | 15-25% | **15%** | SaaS lower bound — aspirational but achievable |

### 12.4 Health Indicators (Qualitative)

| Indicator | Signal | How We Detect |
|-----------|--------|---------------|
| **Organic word-of-mouth** | Users share on Twitter/Reddit without prompting | Social listening |
| **Template creation velocity** | Users create templates in first session | Local telemetry |
| **Feature requests** | Community asks for specific new features | GitHub Issues |
| **BYOK setup rate** | % of users who configure API keys | Local telemetry |
| **Repeat optimization** | Users optimize 3+ prompts per session | Local telemetry |

### 12.5 Anti-Metrics (What We're NOT Optimizing For)

| Anti-Metric | Why We Avoid It |
|-------------|-----------------|
| **Raw install count** | Vanity metric — installs without retention mean nothing |
| **Time spent in extension** | We want efficiency, not time-wasting |
| **Prompts sent to cloud** | Privacy-first means less cloud = better |
| **Revenue per user** | $9.99 is fixed; we optimize for conversion rate, not extraction |

---

## 13. Product Positioning & Messaging

### 13.1 Positioning Statement

> **prmpt:** Write once, prompt any model. Engineering-grade prompt optimization with privacy you control — right in your IDE.

### 13.2 Key Messages by Context

| Context | Message |
|---------|---------|
| **VS Code Marketplace (short)** | "AI-powered prompt optimizer for developers. Local-first, multi-model. Try free." |
| **Product Hunt (headline)** | "prmpt — Stop writing prompts from scratch. Optimize for Claude, GPT, or Gemini in one click." |
| **Hacker News (technical)** | "Show HN: prmpt — privacy-conscious prompt optimizer with Ollama support and BYOK. Prompts stay local, auth is lightweight." |
| **Twitter/X (hook)** | "Your prompts suck. Mine did too. Then I built a tool that makes them 10x better in 10 seconds." |

### 13.3 Positioning vs Competitors

| prmpt Is... | prmpt Is NOT... |
|-------------------|-----------------------|
| A prompt authoring & optimization tool | An LLMOps platform (not Langfuse) |
| For daily IDE developer workflows | For production LLM app monitoring |
| Privacy-conscious (prompts stay local, minimal cloud auth) | "100% local" (honest about Clerk auth + Supabase for user data) |
| A VS Code extension | A web-only dashboard |
| For individual developers (MVP) | For enterprise teams (yet) |
| Free trial + affordable one-time premium | A subscription extraction machine |

---

## 14. Competitive Differentiation

### 14.1 Market Position

```
                    LLM App Focus ◄──────────────────────► IDE/Daily Dev Focus
                         │                                        │
                         │                                        │
   Cloud/Enterprise ─────┤   Langfuse    LangSmith                │
          │              │       ●          ●                     │
          │              │                                        │
          │              │   Agenta                               │
          │              │     ●                                  │
          │              │                                        │
          │              │                    ┌──────────────┐    │
          │              │                    │ PRMPT  │    │
          │              │                    │    ★ HERE    │    │
          │              │         DSPy       └──────────────┘    │
          │              │           ●                            │
   Local/Individual ─────┤                  Prompty               │
                         │                    ●                   │
                         │                                        │
                         │                                        │
```

### 14.2 Why prmpt Wins

| vs Competitor | Our Advantage |
|---------------|---------------|
| **vs Langfuse/LangSmith** | We're for authoring prompts, not monitoring production apps. Different use case entirely. |
| **vs DSPy** | We provide a user-friendly UI and engineering templates. DSPy requires programmatic ML knowledge. |
| **vs Microsoft Prompty** | We optimize prompts (AI-powered). Prompty is just a file format with basic tooling. |
| **vs AI Toolkit** | We provide templates + optimization + techniques. AI Toolkit is a generic playground. |
| **vs "just ask ChatGPT to improve my prompt"** | Structured workflow, reusable templates, model-specific optimization, version history. |

### 14.3 Competitive Moat Strategy

| Moat Layer | Mechanism | Timeline |
|------------|-----------|----------|
| **Template ecosystem** | User-created templates create switching cost | MVP (personal) → Post-MVP (community) |
| **Workflow habit** | Deep VS Code integration creates muscle memory | MVP |
| **Engineering depth** | 50+ curated engineering templates no one else has | MVP |
| **Community network** | Shared templates, ratings, contributor reputation | Post-MVP |
| **Privacy trust** | Track record of prompts-stay-local, minimal cloud footprint | Ongoing |

---

## 15. MVP Development Roadmap

### 15.1 Timeline: 10-Week Sprint

```
PHASE 1: FOUNDATION (Week 1-3)
├── Week 1: Project Setup, Auth Infrastructure & Core Architecture
│   ├── VS Code extension scaffolding
│   ├── Clerk account & project setup (Hobby tier)
│   ├── Supabase project setup (users table, session tracking)
│   ├── prmpt website scaffolding (Next.js on Vercel)
│   ├── Clerk-hosted sign-in/sign-up pages on website
│   ├── Data models (templates, variables, configs)
│   ├── Local storage layer implementation
│   ├── Basic extension UI framework (webview/sidebar)
│   └── Ollama integration prototype
│
├── Week 2: Auth Flow, Core Optimizer Engine & LLM Integration
│   ├── OAuth browser redirect flow (VS Code → browser → Clerk → callback)
│   ├── URI handler implementation (vscode://prmpt/auth-callback)
│   ├── JWT token storage (VS Code SecretStorage)
│   ├── Session counter (Supabase increment on each optimization)
│   ├── Free trial limit enforcement (9 sessions)
│   ├── LLM integration layer (Ollama + BYOK)
│   ├── Prompt analysis and enhancement logic
│   ├── Model family configuration system
│   ├── Output format rendering (XML, JSON, MD, Text)
│   └── API key secure storage (VS Code SecretStorage)
│
├── Week 3: Variable Engine & Template System (Premium)
│   ├── Variable definition and validation engine
│   ├── Template CRUD operations
│   ├── Template storage (local JSON files)
│   ├── Template categories and tagging
│   ├── Premium feature gating (check is_premium via Supabase)
│   └── Auto-populate from VS Code context (file, selection)

PHASE 2: FEATURE COMPLETION (Week 4-6)
├── Week 4: Template Library & Model Family Selector
│   ├── 20 built-in engineering templates (debug, review, refactor)
│   ├── Template browser UI with search and filters
│   ├── Model family selector UI
│   ├── Output format switcher UI
│   └── One-click template usage flow
│
├── Week 5: Technique Selector & Quality Score (P1)
│   ├── Technique selector UI (CoT, Few-Shot, Role, etc.)
│   ├── Technique layering in Core Optimizer
│   ├── Quality scoring algorithm
│   ├── Quality score display with suggestions
│   └── 15 more templates (35 total)
│
├── Week 6: Context Injector & Polish (P1)
│   ├── Workspace context detection
│   ├── Git diff injection
│   ├── Active file / selection injection
│   ├── Settings and preferences UI
│   └── 15 more templates (50 total)

PHASE 3: QUALITY & LAUNCH (Week 7-10)
├── Week 7: Integration Testing & Bug Fixes
│   ├── End-to-end user flow testing
│   ├── Edge case handling (no Ollama, no API key, etc.)
│   ├── Performance optimization
│   ├── Error handling and user-friendly messages
│   └── Local storage reliability testing
│
├── Week 8: Onboarding, Auth Polish & Documentation
│   ├── First-run experience: auth flow onboarding (Sign In/Sign Up screen)
│   ├── Free trial session counter UI ("6 of 9 sessions used")
│   ├── Premium upgrade prompt and purchase flow
│   ├── In-extension help and tooltips
│   ├── VS Code Marketplace README with screenshots/GIFs
│   ├── GitHub repo documentation
│   └── User guide / getting started
│
├── Week 9: Pre-Launch Testing & Marketing Prep
│   ├── Beta testing with 10-20 developer volunteers
│   ├── Product Hunt page preparation
│   ├── Show HN post drafted
│   ├── Dev.to articles written
│   ├── Launch day social media prepared
│   └── Final bug fixes from beta feedback
│
├── Week 10: LAUNCH 🚀
│   ├── VS Code Marketplace submission and publication
│   ├── Product Hunt launch
│   ├── Show HN post
│   ├── Social media campaign (Twitter/X, Reddit, Dev.to)
│   ├── Community channels setup (GitHub Discussions)
│   └── Feedback collection begins
```

### 15.2 Resource Allocation

| Area | % of Effort | Focus |
|------|-------------|-------|
| **Engineering** | 65% | Core features, LLM integration, storage |
| **Content** | 15% | 50+ template creation and curation |
| **Design/UX** | 12% | Extension UI, onboarding, marketplace listing |
| **Marketing/GTM** | 8% | Launch materials, articles, community setup |

---

## 16. Post-MVP Expansion Path

### 16.1 Feature Roadmap

| Phase | Features | Timeline |
|-------|----------|----------|
| **MVP1+** | Prompt Diff Viewer, Engineering Wizards (Debug, Review, Refactor) | Weeks 11-16 |
| **MVP2** | Web Companion (template browser), Community template sharing | Weeks 17-24 |
| **MVP3** | Team features (shared libraries), Prompt analytics (local), DSPy integration | Q4 2026 |
| **MVP4** | JetBrains extension, API & SDK, Enterprise features (SSO, audit) | Q1 2027 |

### 16.2 Platform Expansion

| Platform | Priority | Timeline |
|----------|----------|----------|
| VS Code Extension | 🔴 MVP | Now |
| Web Companion | 🟡 MVP2 | Q3 2026 |
| JetBrains (IntelliJ, etc.) | 🟢 MVP4 | Q1 2027 |
| Neovim | 🟢 Future | TBD |
| CLI tool | 🟢 Future | TBD |

### 16.3 Vertical Expansion

| Vertical | Opportunity | When |
|----------|-------------|------|
| **Security Engineering** | Threat modeling, vulnerability analysis templates | Post-MVP |
| **Data Engineering** | SQL optimization, ETL design, data quality prompts | Post-MVP |
| **DevOps/SRE** | Incident response, runbook generation templates | Post-MVP |
| **Technical Writing** | API docs, RFC, ADR templates | Post-MVP |

---

## 17. Risk Register & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | **AI coding assistants build native prompt optimization** (Copilot, Cursor embed it) | 🔴 High | 🔴 High | Differentiate on template depth, engineering specificity, and privacy control. Move fast. |
| 2 | **Ollama/local LLM quality insufficient** for good optimization | 🟡 Medium | 🟡 Medium | BYOK as fallback. Test with multiple local models. Optimize prompts for smaller models. |
| 3 | **Users don't perceive need** for a separate prompt tool | 🟡 Medium | 🔴 High | Focus on measurable outcomes. Show before/after prompt quality. Content marketing to educate. |
| 4 | **Template library not compelling enough** | 🟡 Medium | 🟡 Medium | Invest 15% of effort in content. Get beta user feedback on templates. Iterate quickly. |
| 5 | **VS Code Marketplace discovery is poor** | 🟡 Medium | 🟡 Medium | Multi-channel launch (Product Hunt, HN, Dev.to). SEO-optimized listing. |
| 6 | **$9.99 one-time doesn't generate sustainable revenue** | 🟡 Medium | 🟡 Medium | Analyze in [revenue-model.md](revenue-model.md). Consider complementary revenue streams. Volume strategy. |
| 7 | **"Privacy-conscious" positioning confusion** with auth requirement | 🟡 Medium | 🟡 Medium | Clear messaging: "prompts stay local, only email + usage count in cloud." Transparent documentation. |
| 8 | **Competitive response** from Langfuse/DSPy entering IDE space | 🟡 Medium | 🟡 Medium | First-mover advantage in IDE prompt optimization niche. Community moat. |
| 9 | **Auth friction reduces install-to-active conversion** — mandatory sign-up deters users | 🟡 Medium | 🟡 Medium | GitHub Copilot-style frictionless flow (one-click browser redirect). Social login (GitHub, Google). Clear value prop before auth wall. |
| 10 | **Supabase free tier auto-pauses** after 1 week of inactivity | 🔴 High | 🔴 High | Budget for Supabase Pro ($25/mo) from launch. Alternatively, implement keep-alive pings or migrate to a self-hosted Postgres. |
| 11 | **Clerk dependency** — single point of failure for all authentication | 🟢 Low | 🔴 High | Clerk has 99.9%+ uptime SLA. Fallback: graceful degradation (allow cached JWT for 24h). Long-term contingency: migrate to Auth.js/NextAuth. |
| 12 | **Free tier too restrictive (9 sessions)** — causes negative reviews | 🟡 Medium | 🟡 Medium | Monitor marketplace reviews and feedback. Be prepared to adjust limit (e.g., 15 sessions) if conversion drops. A/B test different limits. |

---

## 18. Decision Log

Complete record of all product decisions made through the scoping process.

| # | Decision | Options Considered | Final Choice | Rationale | Date |
|---|----------|-------------------|-------------|-----------|------|
| 1 | **Core Engine** | Rule-based heuristics vs AI-powered | AI-powered LLM optimizer | Contextual understanding, competitive parity with DSPy, better output quality | Feb 23, 2026 |
| 2 | **Privacy Architecture** | Cloud API (A) vs Hybrid+BYOK (B+C) vs BYOK only (C) | Hybrid: Local LLM (Ollama) + BYOK | Maximum user control; local default for privacy, BYOK for power users | Feb 23, 2026 |
| 3 | **Data Storage** | Cloud database vs Local storage vs Hybrid | Hybrid: local file system (prompts, history) + Supabase (user records, session count) | Prompts stay private on disk; minimal cloud for auth and usage tracking | Feb 23, 2026 |
| 4 | **Model Support** | Version-specific vs Family-based | Model family (Claude/GPT/Gemini series) | Reduces maintenance, auto-accommodates new versions | Feb 23, 2026 |
| 5 | **Output Formats** | Model-specific formatting vs User-selected formats | User-selected (XML, JSON, Markdown, Text) | User control, simpler implementation, works across families | Feb 23, 2026 |
| 6 | **Target Audience** | Individual devs vs Enterprise vs Both | Individual developers (MVP) | Faster MVP, clearer positioning, no enterprise complexity | Feb 23, 2026 |
| 7 | **Platform** | VS Code vs Web vs CLI vs Multi | VS Code Extension + Web Auth Portal | Developer workflow integration, marketplace distribution, browser-based auth | Feb 23, 2026 |
| 8 | **Business Model** | Subscription vs One-time vs Freemium | Free trial (9 sessions) + $9.99 one-time premium | Hard limit drives conversion; one-time purchase is user-friendly; no recurring burden | Feb 23, 2026 |
| 9 | **GTM Strategy** | Paid ads vs Organic vs Community | Organic acquisition (Marketplace, PH, HN) + Community lock-in | Dev tools don't convert well on paid ads; organic = higher quality users | Feb 23, 2026 |
| 10 | **Privacy Messaging** | "Privacy-first" vs "Privacy-conscious" | "Privacy-conscious with transparent data handling" | Honest about auth requirement and BYOK mode; avoids misleading claims | Feb 23, 2026 |
| 11 | **Architecture Pattern** | Monolithic vs Modular extensions | Core + stackable modular extensions | Enables phased delivery, user-controlled complexity | Feb 23, 2026 |
| 12 | **Authentication Required** | Optional auth vs Mandatory auth | Mandatory account for all users (free and premium) | Enables session tracking, premium enforcement, and future community features. Follows GitHub Copilot/Cursor pattern. | Feb 23, 2026 |
| 13 | **Auth Provider** | Auth.js/NextAuth vs Firebase Auth vs Clerk | Clerk (Hobby tier) | Prebuilt UIs, generous free tier (50K MRU), OAuth support, excellent DX, social login built-in | Feb 23, 2026 |
| 14 | **User Data Store** | Firebase vs Custom Postgres vs Supabase | Supabase (Free tier → Pro) | Minimal data footprint (email + session count only), generous free tier, easy Clerk integration, SQL familiarity | Feb 23, 2026 |
| 15 | **Free Trial Limit** | Unlimited free vs 5 uses vs 9 uses vs 15 uses | 9 optimization sessions | Enough to demonstrate value (3 sessions/day × 3 days), creates natural conversion point, not so low as to frustrate | Feb 23, 2026 |
| 16 | **F2/F3 Premium Move** | Keep F2/F3 free vs Move to premium | Variable Engine (F2) and Template System (F3) are premium-only | Increases premium value proposition significantly; free users still get core optimizer which is the primary value | Feb 23, 2026 |

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **BYOK** | Bring Your Own Key — user provides their own API key for cloud LLM access |
| **Clerk** | Third-party authentication service providing OAuth, JWT, and prebuilt sign-in/sign-up UIs. prmpt uses Clerk's Hobby tier (50K MRU free). |
| **CoT** | Chain of Thought — a prompting technique that asks the model to reason step-by-step |
| **JWT** | JSON Web Token — compact, URL-safe token used by Clerk to authenticate users between the website and VS Code extension |
| **Model Family** | A group of related models (e.g., "Claude Series" = Claude 3.5, Claude 4, etc.) sharing prompting characteristics |
| **MRU** | Monthly Retained Users — Clerk's billing metric; counts users who return at least once in a billing period |
| **Core Optimizer** | The AI engine that transforms raw prompts into optimized, structured prompts |
| **Extension Module** | A stackable feature layer (variable engine, technique selector, etc.) that adds functionality on top of the core optimizer |
| **OAuth** | Open Authorization — protocol that enables browser-based sign-in/sign-up for the VS Code extension via the prmpt website |
| **Ollama** | Open-source local LLM runner that enables private, on-device model inference |
| **Session** | A single prompt optimization interaction. Free trial users are limited to 9 sessions, tracked via Supabase. |
| **Supabase** | Open-source Firebase alternative providing hosted Postgres database. prmpt stores minimal user data (email, session count, premium status). Pro tier: $25/mo (required for production). |
| **Template** | A reusable prompt pattern with variable placeholders |
| **WAU** | Weekly Active Users |
| **D1/D7/D30** | Day 1/7/30 retention rates |

## Appendix B: Open Items for Separate Sessions

| Item | Document | Session |
|------|----------|---------|
| Technical architecture, tech stack, system design | [technical-architecture.md](technical-architecture.md) | Tomorrow |
| Revenue model, pricing validation, exclusive features | [revenue-model.md](revenue-model.md) | Separate session |

---

*Document Version: 2.0 (Revised — Mandatory Auth + Premium Restructure)*  
*Last Updated: February 23, 2026*  
*Status: ✅ Approved for development — pending technical architecture and revenue model sessions*

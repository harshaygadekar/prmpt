# prmpt MVP — Resources Needed

> **Purpose**: List of specific resources that could not be found or accessed during automated research, with detailed descriptions to assist in sourcing them.
>
> **Last Updated**: Session research compilation
>
> **Status**: 🔍 NEEDS USER ACTION

---

## Table of Contents

1. [Inaccessible Resources (URL Blocked/Failed)](#1-inaccessible-resources)
2. [Resources Requiring Authentication/Purchase](#2-resources-requiring-authenticationpurchase)
3. [Resources Not Found Online](#3-resources-not-found-online)
4. [Resources Requiring Human Judgment](#4-resources-requiring-human-judgment)

---

## 1. Inaccessible Resources

These resources exist but could not be fetched or parsed by automated tools.

### 1.1 code-checkout.dev — Full Platform Documentation

| Field | Detail |
|-------|--------|
| **URL** | https://codecheckout.dev/ |
| **What was attempted** | Direct fetch of the platform website returned no usable content (JavaScript-rendered SPA). |
| **What was obtained instead** | GitHub README + DEV Community article (sufficient for integration, but not full platform docs). |
| **What's needed** | Full platform documentation including: dashboard setup walkthrough, Stripe configuration steps, analytics features, webhook configuration, advanced pricing options, multi-tier support, refund handling. |
| **Why it matters** | code-checkout is the primary payment integration. Full docs are needed to understand all configuration options and edge cases (refunds, subscription changes, license recovery). |
| **Suggested action** | Visit https://codecheckout.dev/docs manually and screenshot or copy the documentation. Alternatively, reach out to Shawn Roller (creator) via the DEV Community article comments or GitHub issues. |

### 1.2 MIT Sloan — "Prompt Templates Instead" Article

| Field | Detail |
|-------|--------|
| **URL** | https://mitsloan.mit.edu/ideas-made-to-matter/prompt-engineering-so-2024-try-these-prompt-templates-instead |
| **What was attempted** | Fetch was redirected to an ad tracker before reaching content. |
| **What was obtained** | Title and brief description only: "Prompt templates as cognitive scaffolding, providing structure without limiting options." |
| **What's needed** | Full article content with specific template patterns, cognitive scaffolding framework, and practical template examples. Referenced as Aug 2025 publication. |
| **Why it matters** | MIT Sloan research on template design could inform the F3 Template System and F6 Engineering Prompt Library architecture. |
| **Suggested action** | Visit the URL in a browser (ad-blockers may help). Copy/paste the article content or save as PDF. |

### 1.3 Google 68-Page Prompt Engineering Guide (PDF)

| Field | Detail |
|-------|--------|
| **URL** | Referenced via Reddit: https://www.reddit.com/r/PromptEngineering/comments/1kggmh0/ |
| **What was attempted** | Found reference to the guide but the actual PDF could not be directly fetched. |
| **What was obtained** | Reddit discussion mentioning its existence and value. |
| **What's needed** | The full 68-page PDF from Google covering internal-style best practices for Gemini with concrete patterns. |
| **Why it matters** | Contains Google's internal prompt engineering patterns specifically for Gemini models — directly applicable to F4 Model Family Selector Gemini optimization. |
| **Suggested action** | Visit the Reddit thread, follow the PDF download link, and save the PDF to `wiki/resources/`. Search for "Google prompt engineering 68 page PDF" — it may be hosted on Google's developer or cloud documentation. |

---

## 2. Resources Requiring Authentication/Purchase

These resources exist behind paywalls, login walls, or require specific accounts.

### 2.1 Clerk Dashboard — Extension-Specific Configuration

| Field | Detail |
|-------|--------|
| **What's needed** | Step-by-step guide for configuring Clerk for a VS Code extension (non-browser) context. Specifically: creating a Clerk application for desktop/extension OAuth, configuring redirect URIs for `vscode://` protocol, setting up JWT templates for Supabase integration. |
| **Where to find** | https://dashboard.clerk.com/ (requires Clerk account) + https://clerk.com/docs/custom-flows/overview |
| **Why it matters** | The prmpt auth flow requires a non-standard Clerk integration (VS Code extension → browser redirect → `vscode://` callback). Standard Clerk docs cover web apps, not VS Code extensions. |
| **Suggested action** | Create a free Clerk development account. Set up a test application. Document the specific steps for configuring `vscode://` redirect URIs and JWT template creation. Test the full OAuth flow in a minimal VS Code extension. |

### 2.2 Supabase Project Setup — VS Code Extension Client

| Field | Detail |
|-------|--------|
| **What's needed** | Guide for using Supabase JS client in a VS Code extension (Node.js context, not browser). Key questions: Does `@supabase/supabase-js` work in VS Code's extension host? Are there any CORS or network issues? How to handle JWT auth from Clerk tokens? RLS policy configuration for Clerk user IDs. |
| **Where to find** | https://supabase.com/dashboard (requires Supabase account) |
| **Why it matters** | The users table needs Row Level Security policies based on `clerk_user_id`, and the Supabase client must work in the VS Code extension Node.js runtime. |
| **Suggested action** | Create a free Supabase project. Set up the `users` table per scope.md schema. Test `@supabase/supabase-js` from a basic VS Code extension. Document any gotchas. |

### 2.3 IEEE Xplore — Prompt Engineering Research Papers

| Field | Detail |
|-------|--------|
| **URL** | https://ieeexplore.ieee.org/document/10633588 |
| **What's needed** | Full text of the IEEE paper referenced in the Awesome-PE repo on prompt engineering patterns for software engineering. |
| **Why it matters** | Academic paper with formal prompt pattern analysis specifically for software engineering contexts — directly relevant to F6 template design. |
| **Suggested action** | Access via university/institution IEEE subscription, or check if available on arXiv/preprint servers. |

---

## 3. Resources Not Found Online

These are resources that should exist but could not be located through web searches.

### 3.1 VS Code Extension + Clerk Integration Example

| Field | Detail |
|-------|--------|
| **What's needed** | A working example or tutorial showing Clerk authentication integrated into a VS Code extension. The specific pattern: extension → opens browser → Clerk hosted sign-in → redirects to `vscode://` URI → extension receives auth token → stores in SecretStorage. |
| **Why it was not found** | Clerk's docs focus on web apps (React, Next.js, etc.). No official or community example exists for VS Code extension integration. |
| **Why it matters** | This is a critical path item. The auth flow is the first thing users encounter and must work flawlessly. Without an existing reference, it needs to be built from scratch combining VS Code `registerUriHandler` + Clerk JS SDK + SecretStorage. |
| **Suggested action** | Consider building a minimal proof-of-concept extension that demonstrates the full Clerk auth flow. Key files to examine: GitHub Copilot's auth flow (similar pattern with GitHub OAuth), Cursor's auth flow, or any VS Code extension that uses browser-based OAuth. |

### 3.2 code-checkout + Clerk Integration Pattern

| Field | Detail |
|-------|--------|
| **What's needed** | Example of using code-checkout alongside a separate auth provider (Clerk). Questions: Does code-checkout have its own user identity? How does it coexist with Clerk auth? Can the license check be tied to a Clerk user ID? Is there a webhook to sync purchase status? |
| **Why it was not found** | code-checkout is a relatively new/niche tool. No integration examples with Clerk exist. |
| **Why it matters** | The MVP needs both auth (Clerk) and payments (code-checkout). Understanding how these two systems interact is essential. |
| **Suggested action** | Review code-checkout's license API (`getLicense()`) to understand what user identifier it uses. Check if it can accept a custom user ID. Consider reaching out to Riff Technologies via GitHub issues for guidance. |

### 3.3 Model-Specific Prompt Optimization Rules

| Field | Detail |
|-------|--------|
| **What's needed** | A structured, machine-readable dataset of model-family-specific prompt optimization rules. For example: "Claude prefers XML tags for structured output", "GPT responds better to system messages with explicit formatting instructions", "Gemini performs best with concise prompts under 2000 tokens for simple tasks." |
| **Why it was not found** | This information exists scattered across provider docs, blog posts, and community knowledge, but no single structured dataset compiles it. |
| **Why it matters** | The F4 Model Family Selector needs to apply different optimization strategies per model family. This knowledge base is the core differentiator of prmpt. |
| **Suggested action** | Create this dataset manually by extracting rules from: (1) Provider PE guides (already fetched), (2) Community best practices on r/PromptEngineering, r/ClaudeAI, r/LocalLLaMA, (3) Academic papers on model-specific prompting. Consider creating a `model-rules.json` or similar structured file. |

### 3.4 Prompt Quality Scoring Rubric

| Field | Detail |
|-------|--------|
| **What's needed** | A formal rubric or algorithm for scoring prompt quality across dimensions like: clarity, specificity, structure, technique usage, model-appropriateness, output format specification, context sufficiency. |
| **Why it was not found** | Prompt quality scoring is an emerging field. Existing tools (Promptfoo, Langfuse) score *outputs*, not *prompts themselves*. No standardized prompt quality rubric exists. |
| **Why it matters** | F8 Quality Score needs a consistent, explainable scoring system that evaluates the *prompt* (not the LLM output). This is a novel feature that differentiates prmpt. |
| **Suggested action** | Design a custom rubric based on: (1) Prompt engineering best practices from provider guides, (2) The "Prompt Report" paper's technique taxonomy, (3) Promptfoo's evaluation approach adapted for prompt-level (not output-level) scoring. Consider dimensions: Clarity (0-10), Specificity (0-10), Structure (0-10), Technique Usage (0-10), Model Fit (0-10). |

---

## 4. Resources Requiring Human Judgment

These items require design decisions, user testing, or subjective evaluation that cannot be automated.

### 4.1 50+ Engineering-Specific Prompt Templates (F6)

| Field | Detail |
|-------|--------|
| **What's needed** | 50+ curated, high-quality prompt templates specifically designed for software engineers. Must cover 10+ categories: Code Generation, Code Review, Documentation, Testing, Debugging, Architecture, DevOps, Data, Security, Communication. |
| **What was found** | prompts.chat (147K+ ⭐, CC0 license) has thousands of general prompts. P3 has 270+ NLP task templates. CodeAlpaca-20k has programming pairs. But none are specifically curated for the engineering workflow categories prmpt needs. |
| **Why manual curation matters** | The templates need to be: (1) Engineering-specific, (2) High quality, (3) Demonstrating specific techniques, (4) Compatible with multiple model families, (5) Parameterized with variables for the F2 Variable Engine. |
| **Suggested action** | Source initial templates from: (1) prompts.chat code/engineering categories, (2) Personal prompt library, (3) Team engineering workflows. Each template should include: name, description, category, technique(s) used, variable placeholders, and model-family notes. Start with 10 templates per category (5 categories = 50). |

### 4.2 UI/UX Design References for VS Code Extensions

| Field | Detail |
|-------|--------|
| **What's needed** | Design patterns and UX references for creating intuitive VS Code extension interfaces. Specifically: WebView panel layouts, sidebar tree views, status bar integration, notification patterns, settings page design. |
| **Why it matters** | prmpt's UX needs to feel native to VS Code while providing complex optimization workflows (F1 optimizer, F2 variable engine, F3 templates). |
| **Suggested action** | Install and study UX patterns from: (1) GitHub Copilot Chat, (2) Cursor, (3) AI Toolkit, (4) Thunder Client (REST API extension — good WebView example), (5) GitLens (settings page design). Screenshot key interaction patterns. |

### 4.3 Pricing Validation Data

| Field | Detail |
|-------|--------|
| **What's needed** | Market validation of the $9.99 one-time pricing for the prmpt Premium tier. Comparison data: What do similar VS Code extensions charge? What is the typical conversion rate for VS Code extensions with free trials? |
| **What was found** | Revenue model document projects ~$1,608 Year 1 gross revenue with 161 paid users. code-checkout takes 10% + Stripe ~3%. But no real-world conversion benchmarks for AI-focused VS Code extensions. |
| **Why it matters** | Pricing affects adoption rate, revenue, and competitive positioning. |
| **Suggested action** | Survey pricing of comparable extensions: (1) GitHub Copilot ($10/mo subscription), (2) TabNine ($12/mo), (3) Codeium (free/enterprise), (4) Pieces ($0-10/mo). Consider running a brief pricing survey with potential users. Check VS Code Marketplace for similar one-time-purchase extensions and their pricing. |

### 4.4 Beta Testing User Cohort

| Field | Detail |
|-------|--------|
| **What's needed** | A group of 10-20 software engineers willing to beta test prmpt. Ideal profile: daily VS Code users, regular AI/LLM users, mix of experience levels, diverse tech stacks. |
| **Why it matters** | Beta testing is Week 8-9 in the roadmap. Early user feedback is critical for validating the optimizer quality, UX flow, and template library. |
| **Suggested action** | Recruit from: (1) Personal network, (2) r/PromptEngineering, (3) r/vscode, (4) Local dev meetups, (5) Twitter/X AI developer community. Consider creating a simple landing page or waitlist. |

---

## Summary

### Resources Successfully Sourced: 100+
- ✅ All prompting technique guides (DAIR.AI, Anthropic, OpenAI, Google)
- ✅ All LLM API references (OpenAI Chat, Anthropic Messages, Gemini GenerateContent)
- ✅ VS Code Extension API docs (WebView, UriHandler, SecretStorage, asExternalUri)
- ✅ Ollama complete REST API documentation
- ✅ Clerk documentation overview + JS SDK
- ✅ Supabase JS client comprehensive reference
- ✅ code-checkout integration guide (GitHub README + DEV article)
- ✅ Competitor analysis (Langfuse, Prompty, VS Code AI Toolkit)
- ✅ Prompt template libraries (prompts.chat CC0, P3, CodeAlpaca-20k)
- ✅ 25+ academic papers on prompt optimization
- ✅ DSPy, TextGrad, OPRO optimization frameworks
- ✅ Awesome Prompt Engineering curated resource repository

### Resources Needing User Action: 12
- 🔍 3 inaccessible/blocked URLs (code-checkout full docs, MIT Sloan article, Google 68p PDF)
- 🔍 3 requiring account setup (Clerk dashboard config, Supabase project, IEEE paper)
- 🔍 4 not found online (VS Code+Clerk example, code-checkout+Clerk pattern, model-specific rules dataset, prompt quality rubric)
- 🔍 4 requiring human judgment (50+ templates curation, UX design references, pricing validation, beta cohort)

---

*This document identifies gaps in automated research. Each item includes enough context for manual sourcing. Priority items are marked based on their position in the 10-week development roadmap.*

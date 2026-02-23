# prmpt — Revenue Model & Strategy

**Version:** 2.0 (Revised — Mandatory Auth + Premium Restructure)  
**Date:** February 23, 2026  
**Status:** ✅ APPROVED — Ready for implementation  
**Document Type:** Revenue Model & Pricing Strategy  
**Prerequisite:** [scope.md](scope.md) (Final Product Scope)  
**Related Documents:**
- [Technical Architecture](technical-architecture.md) — Tech stack, system design *(separate session)*
- [Market Research](../research/prmpt_market_research_mvp1.md) — Competitive landscape & gap analysis
- [MVP Analysis](../research/prmpt_mvp_analysis.md) — Strategic analysis & RICE scoring

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Revenue Model Structure](#2-revenue-model-structure)
3. [Exclusive Features Definition](#3-exclusive-features-definition)
4. [Pricing Validation](#4-pricing-validation)
5. [Pricing Psychology](#5-pricing-psychology)
6. [Competitor Pricing Analysis](#6-competitor-pricing-analysis)
7. [Revenue Projections](#7-revenue-projections)
8. [Cost Structure](#8-cost-structure)
9. [Unit Economics](#9-unit-economics)
10. [Sustainability Analysis](#10-sustainability-analysis)
11. [Complementary Revenue Streams](#11-complementary-revenue-streams)
12. [Growth Scenarios](#12-growth-scenarios)
13. [Financial Milestones](#13-financial-milestones)
14. [Implementation Plan](#14-implementation-plan)
15. [Risk Register](#15-risk-register)
16. [Decision Log](#16-decision-log)

---

## Guiding Principle

> **Business model principle (from scope.md):** "Clean, simple, user-friendly, and affordable revenue model (avoiding greed, focusing on user benefit)"

This principle governs every decision in this document. prmpt exists to help developers write better prompts — the revenue model must serve that mission, not exploit it. The 9-session free trial balances accessibility with sustainability: users get enough experience to evaluate the tool, and $9.99 unlocks everything permanently.

---

## 1. Executive Summary

### The Model

**Free Trial (9 Sessions) + $9.99 One-Time Premium Purchase**

prmpt uses a trial-to-premium model with mandatory account creation (Clerk) and a single, affordable, one-time payment. The free trial gives users 9 optimization sessions with the core optimizer, model family selector, output formatting, BYOK Mode (user's own API keys), and a starter library of 15-20 templates. After 9 sessions, users must upgrade to Premium ($9.99 one-time) to continue and unlock all features: unlimited sessions, Variable Engine (F2), Template System (F3), Local LLM Mode (Ollama), Prompt History, Template Import/Export, Technique Selector (F7), Quality Score (F8), Context Injector (F9), and the full 50+ template library.

### Why This Model Works for prmpt

| Factor | How It Applies |
|--------|---------------|
| **Hard limit drives conversion** | 9 free sessions create a natural forcing function — users must decide. Expected 8-10% conversion vs industry 2-5%. |
| **Developer audience preference** | 44% of developers prefer one-time purchase for IDE tools (SlashData, 2024) |
| **Subscription fatigue** | Developer community increasingly rejects recurring charges for tools without ongoing server costs |
| **Try-before-you-buy** | 9 sessions is enough to prove value (3 sessions/day × 3 days) without giving away unlimited usage |
| **Low friction** | $9.99 is impulse-buy range for developers — no committee approval needed |
| **Minimal infrastructure** | BYOK + local LLM means prmpt bears no API costs. Auth infrastructure (Clerk + Supabase) runs on free/low-cost tiers. |

### Key Numbers at a Glance

| Metric | Value |
|--------|-------|
| **Price point** | $9.99 (one-time) |
| **90-day install target** | 500 |
| **Target conversion rate** | 8% (hard limit drives higher conversion) |
| **90-day premium conversions** | 40 |
| **90-day gross revenue** | $399.60 |
| **Net revenue per sale** | ~$8.69 (after payment processing) |
| **Year 1 revenue (moderate)** | $1,608.39 (161 conversions) |
| **Monthly infrastructure costs** | ~$25-$40 (Supabase Pro + domain) |
| **Annual infrastructure costs** | ~$315-$495 |

---

## 2. Revenue Model Structure

### 2.1 Two-Tier Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                  PRMPT REVENUE MODEL                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │               FREE TRIAL ($0 — 9 sessions)                   │  │
│  │                                                               │  │
│  │  ✅ Core AI Optimizer Engine (F1)        — Full power (9x)   │  │
│  │  ✅ Model Family Selector (F4)           — All families       │  │
│  │  ✅ Output Format Switcher (F5)          — All formats        │  │
│  │  ✅ Starter Template Library (F6 partial) — 15-20 templates   │  │
│  │  ✅ BYOK Mode                            — User's API keys    │  │
│  │                                                               │  │
│  │  🔒 Requires Clerk account (email + password)                │  │
│  │  🔒 Limited to 9 optimization sessions                       │  │
│  │  🔒 Session count tracked via Supabase                       │  │
│  │                                                               │  │
│  │  Value: Enough to evaluate and prove the tool's worth        │  │
│  │  Goal: Demonstrate value, build intent to purchase            │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                    After 9 sessions:                                │
│                   "Upgrade to Premium"                              │
│                              │                                      │
│                              ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                 PREMIUM TIER ($9.99 one-time)                 │  │
│  │                                                               │  │
│  │  ✅ Unlimited Optimization Sessions      — No caps, forever  │  │
│  │  ⭐ Variable Engine (F2)                 — Dynamic variables  │  │
│  │  ⭐ Template System (F3)                 — Create/Save/Use   │  │
│  │  ⭐ Local LLM Mode (Ollama)              — Full support       │  │
│  │  ⭐ Prompt History                       — Full access        │  │
│  │  ⭐ Template Import/Export               — JSON + YAML        │  │
│  │  ⭐ Technique Selector (F7)    — CoT, Few-Shot, Role, etc.   │  │
│  │  ⭐ Quality Score (F8)         — AI-powered 0-100 scoring    │  │
│  │  ⭐ Context Injector (F9)      — Auto workspace context      │  │
│  │  ⭐ Full Template Library      — Complete 50+ templates      │  │
│  │  ⭐ Priority Template Updates  — New templates first         │  │
│  │                                                               │  │
│  │  Value: Complete professional prompt engineering toolkit      │  │
│  │  Goal: Convert trial users into permanent customers          │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Design Principles for Tier Split

| Principle | Application |
|-----------|-------------|
| **Free trial must demonstrate real value** | 9 sessions with the core optimizer at full power — enough to prove the tool works and integrates into workflow |
| **Hard limit creates a decision point** | After 9 uses, users must choose: this tool is worth $9.99 or it isn't. No ambiguity, no slow feature degradation. |
| **Premium is the full product** | Every feature unlocked — variables, templates, LLM modes, history, techniques, scoring, full library. No trickle of upgrades. |
| **One-time, not subscription** | $9.99 once, forever. Honest pricing for a tool with minimal ongoing costs. |
| **Auth is lightweight** | Clerk-based browser redirect (GitHub Copilot style). Social login supported. No complex onboarding. |

### 2.3 Upgrade Trigger Points

The primary conversion trigger is the **hard session limit** at 9 uses. Secondary triggers occur when free users encounter premium-only features.

| Trigger | Context | Display |
|---------|---------|---------|
| **Session limit reached (primary)** | After 9th optimization session | Full-screen prompt: "You've used all 9 free sessions. Upgrade for $9.99 to unlock unlimited access + all features." |
| **Session counter (awareness)** | During each session | Subtle counter: "Session 6 of 9" in the status bar |
| **Variable Engine** | User tries to use variables | "Variables are a Premium feature — $9.99 one-time" |
| **Template System** | User tries to create/save template | "Template creation is a Premium feature" (browsing starter library is free) |
| **Technique Selector** | User explores optimization options | Lock icon with "Premium" badge, tooltip: "Unlock CoT, Few-Shot & more — $9.99 one-time" |
| **Quality Score** | After optimizing a prompt | Muted section: "Quality Score available with Premium" with sample score preview |
| **Context Injector** | When workspace context is available | "Auto-inject context" option grayed with "Premium" label |
| **Local LLM (Ollama)** | User tries to configure Ollama | "Local LLM Mode is a Premium feature — $9.99 one-time" (BYOK is available in the free trial) |
| **Prompt History** | User looks for past prompts | "Prompt History is a Premium feature" |

**What we commit to:**
- ✅ The free trial gives genuine, full-power optimization (9 sessions, no quality degradation)
- ✅ The upgrade prompt at session 10+ is clear, fair, and non-deceptive
- ✅ No dark patterns (hidden costs, confusing UI, or guilt-tripping)
- ✅ Premium users get everything — no further upsells or tiered premium levels
- ✅ Auth flow is fast (under 30 seconds including browser redirect)

**What we DON'T do:**
- ❌ Degrade optimization quality in the free trial (all 9 sessions are full-power)
- ❌ Show modal upgrade popups during active optimization
- ❌ Nag on every session start (counter is subtle, not blocking)
- ❌ Time-lock the trial (9 sessions, not 7 days — users can spread them out)
- ❌ Require credit card for the free trial

---

## 3. Exclusive Features Definition

### 3.1 Premium Feature Analysis

Each premium feature is evaluated against four criteria:
1. **Value to power users** — Does this meaningfully improve their workflow?
2. **Free tier completeness** — Can free users still get genuine value without this?
3. **Conversion motivation** — Does this create natural "I want this" moments?
4. **Implementation feasibility** — Can this be gated without complex licensing infrastructure?

---

#### ⭐ Premium Feature 1: Technique Selector (F7)

**What it is:** A guided selector that lets users enable professional prompting techniques (Chain of Thought, Few-Shot Examples, Role Prompting, Step-by-Step, Constraint Specification) that the Core Optimizer applies as additional layers.

**Why it's premium:**

| Criterion | Assessment |
|-----------|------------|
| **Value to power users** | 🔴 High — professional prompt engineering techniques are the difference between good and great prompts. Developers who know about CoT and Few-Shot actively want them. |
| **Free trial impact** | 🟢 None — free users still get a fully optimized prompt via the Core Optimizer. The optimizer applies general best practices automatically; techniques are an explicit power-user layer. |
| **Conversion motivation** | 🔴 High — developers who see "Chain of Thought" and "Few-Shot" in the technique list immediately understand the value. These are known concepts in the AI developer community. |
| **Implementation** | 🟢 Simple — toggle visibility/availability of technique selector UI. Core optimizer functions identically without technique selections. |

**Upgrade moment:** User sees the technique selector panel with options like "Chain of Thought," "Few-Shot Examples," "Role Prompting" — each with a brief explanation. Techniques are visible but locked with a subtle "⭐ Premium" badge.

---

#### ⭐ Premium Feature 2: Prompt Quality Score (F8)

**What it is:** An AI-powered scoring system that rates prompts 0-100 across five dimensions (Completeness, Clarity, Structure, Model Fit, Technique Usage) and provides actionable improvement suggestions.

**Why it's premium:**

| Criterion | Assessment |
|-----------|------------|
| **Value to power users** | 🔴 High — quantifiable feedback turns prompt writing from guesswork into an engineered practice. Users learn what makes prompts better. |
| **Free trial impact** | 🟢 None — free users optimize prompts and get results. They just don't get a score or improvement suggestions. The optimizer still applies its own intelligence. |
| **Conversion motivation** | 🔴 High — developers love metrics. A quality score creates a visible gap: "My prompts could be better, and this tool can tell me exactly how." |
| **Implementation** | 🟢 Simple — quality scoring is a separate analysis pass. Free tier skips this step entirely. |

**Upgrade moment:** After optimizing a prompt, a muted "Quality Score" section appears at the bottom showing a blurred/partial preview: "Your prompt scores ██/100 — [Unlock Full Score & Suggestions]". This creates curiosity without blocking workflow.

---

#### ⭐ Premium Feature 3: Context Injector (F9)

**What it is:** Automatically detects project context from the VS Code workspace (language, framework, active file, selected code, git diff, error output) and injects relevant information into prompts.

**Why it's premium:**

| Criterion | Assessment |
|-----------|------------|
| **Value to power users** | 🔴 High — automation is the ultimate time-saver. Auto-detecting TypeScript/Next.js/active file context and injecting it into prompts eliminates manual copy-paste. |
| **Free trial impact** | 🟢 Minimal — free users can still manually write context into their prompts during their 9 sessions. |
| **Conversion motivation** | 🟡 Medium-High — users who frequently optimize prompts will feel the friction of manual context entry. Automation becomes a natural upgrade path. |
| **Implementation** | 🟢 Simple — context detection runs only when premium flag is set. Free users see "Auto-inject Context ⭐ Premium" as a grayed-out option. |

**Upgrade moment:** When a user is writing a prompt and workspace context is available, a subtle hint appears: "prmpt can auto-detect your project context — ⭐ Premium"

---

#### ⭐ Premium Feature 4: Variable Engine (F2)

**What it is:** Dynamic placeholder system that lets users define typed variables (`{{language}}`, `{{error_message}}`, `{{code_snippet}}`) in prompt templates, with validation, auto-population from VS Code context, and reusable variable sets.

**Why it's premium:**

| Criterion | Assessment |
|-----------|------------|
| **Value to power users** | 🔴 High — variables transform static prompts into reusable workflows. Power users who optimize 5+ prompts/day need this. |
| **Free trial impact** | 🟡 Moderate — free users write prompts from scratch each time. They can still use the core optimizer effectively, but lack the efficiency of templates with variables. |
| **Conversion motivation** | 🔴 High — after 3-4 manual optimizations, users naturally think "I wish I could save this as a reusable template with placeholders." |
| **Implementation** | 🟢 Simple — variable parsing and rendering gated by premium flag. |

**Upgrade moment:** Free users see "Variables ⭐ Premium" in the toolbar. After a few manual optimizations, the repetition drives conversion intent.

---

#### ⭐ Premium Feature 5: Template System (F3)

**What it is:** Create, save, organize, and manage custom prompt templates with categories, tags, and search. Free users can browse and preview the starter library but cannot create, save, or manage their own templates.

**Why it's premium:**

| Criterion | Assessment |
|-----------|------------|
| **Value to power users** | 🔴 High — templates are the core reusability mechanism. Users who optimize prompts daily will build a library of 10-50+ custom templates. |
| **Free trial impact** | 🟡 Moderate — free users can browse starter templates (read-only) and use the core optimizer with manual input. They can still get great results, just without the efficiency of saved templates. |
| **Conversion motivation** | 🔴 High — after writing a great prompt, users want to save it. The "Save as Template" button with a "⭐ Premium" badge creates a strong conversion moment. |
| **Implementation** | 🟢 Simple — template CRUD operations gated by premium flag. Starter library browsing (read-only) is free. |

**Upgrade moment:** After optimizing a prompt, "Save as Template ⭐ Premium" button appears. Users who just crafted a perfect prompt strongly want to save it.

---

#### ⭐ Premium Feature 6: LLM Modes (Local LLM + BYOK)

**What it is:** Local LLM Mode connects to Ollama for fully private, on-device inference. BYOK Mode lets users connect their own API keys (OpenAI, Anthropic, etc.) for cloud-quality optimization.

**Why it's premium:**

| Criterion | Assessment |
|-----------|------------|
| **Value to power users** | 🔴 High — LLM access is required for the core optimizer to work. Premium users choose their preferred LLM provider. |
| **Free trial consideration** | ⚠️ **Architecture note:** Free trial users still need LLM access for the core optimizer during their 9 sessions. **Recommendation: Include BYOK in free trial** so users can use their own API keys during the 9 sessions. This keeps our costs at $0 and ensures the trial is genuinely functional. Local LLM (Ollama) remains premium-only. |
| **Conversion motivation** | 🟡 Medium — BYOK users already have API keys; upgrading gives them Ollama support for private inference. |
| **Implementation** | 🟡 Medium — need to ensure BYOK works in trial while gating Ollama as premium. |

> **⚠️ Design Decision:** The core optimizer requires an LLM. Free trial includes BYOK mode (user's own API keys) so the trial is functional at $0 cost to us. Local LLM (Ollama) is premium-only, incentivizing privacy-conscious users to upgrade.

---

#### ⭐ Premium Feature 7: Prompt History & Template Import/Export

**What it is:** Prompt History saves all optimized prompts locally with version tracking and search. Template Import/Export enables sharing templates as JSON/YAML files.

**Why it's premium:**

| Criterion | Assessment |
|-----------|------------|
| **Value to power users** | 🟡 Medium-High — history is valuable for iterative prompt development. Import/Export enables team sharing and backup. |
| **Free trial impact** | 🟢 None — free users optimize 9 prompts and can copy results manually. History becomes valuable only with sustained use. |
| **Conversion motivation** | 🟡 Medium — less of a conversion driver than variables/templates, but adds to the overall premium bundle value. |
| **Implementation** | 🟢 Simple — history recording and export functions gated by premium flag. |

---

#### ⭐ Premium Feature 8: Full Template Library + Priority Updates

**What it is:** Access to the complete 50+ curated engineering template collection (vs. 15-20 in the starter set), plus priority access to new templates as they're released.

**Why it's premium:**

| Criterion | Assessment |
|-----------|------------|
| **Value to power users** | 🟡 Medium-High — more templates = more use cases covered. The full library includes specialized templates for security reviews, data engineering, DevOps, and advanced debugging. |
| **Free trial impact** | 🟢 None — starter library covers the most common use cases (basic debugging, code review, refactoring, testing, documentation). |
| **Conversion motivation** | 🟡 Medium — users browsing the library see premium templates they can preview but not use. |
| **Implementation** | 🟢 Simple — template metadata includes a `premium: boolean` flag. Free users can preview premium templates but can't load them. |

---

### 3.2 Premium Feature Summary

| Feature | Value | Conversion Power | Implementation Complexity |
|---------|-------|-------------------|--------------------------|
| **Technique Selector (F7)** | 🔴 High | 🔴 High | 🟢 Low |
| **Quality Score (F8)** | 🔴 High | 🔴 High | 🟢 Low |
| **Context Injector (F9)** | 🔴 High | 🟡 Medium-High | 🟢 Low |
| **Variable Engine (F2)** | 🔴 High | 🔴 High | 🟢 Low |
| **Template System (F3)** | 🔴 High | 🔴 High | 🟢 Low |
| **LLM Modes (Ollama + BYOK full)** | 🔴 High | 🟡 Medium | 🟡 Medium |
| **Prompt History + Import/Export** | 🟡 Medium-High | 🟡 Medium | 🟢 Low |
| **Full Template Library** | 🟡 Medium-High | 🟡 Medium | 🟢 Low |

### 3.3 Feature Split Validation

**The "Two Questions" Test:**

1. **Can a free trial user get real value from prmpt?**  
   ✅ Yes — they get 9 full-power optimization sessions with the core optimizer, model family selector, output formatting, BYOK mode (their own API keys), and access to 15-20 starter templates (read-only). In 9 sessions, a user can optimize enough prompts to clearly assess the tool's value.

2. **Does the premium tier offer enough value to justify $9.99?**  
   ✅ Yes — Premium unlocks **everything**: unlimited sessions, Variable Engine, Template System, Local LLM (Ollama), Prompt History, Technique Selector, Quality Score, Context Injector, full 50+ template library, and advanced export. This is the complete professional prompt engineering toolkit. Even saving 30 minutes of prompt iteration time justifies $9.99 at any developer's hourly rate. The hard session limit ensures users have experienced the tool's value before the upgrade prompt appears.

### 3.4 What Stays in the Free Trial

These features are included in the free 9-session trial:

| Feature | Why It's in the Free Trial |
|---------|---------------------------|
| **Core AI Optimizer (F1)** | The core value proposition — users must experience full-power optimization to appreciate the tool. |
| **Model Family Selector (F4)** | Baseline functionality. A 5-button selector adds no premium value. |
| **Output Format Switcher (F5)** | Same reasoning as F4 — basic formatting is expected. |
| **Starter Template Library (15-20, read-only)** | Users need to see what templates look like. Read-only access lets them browse but not create/save. |
| **BYOK Mode (during trial)** | Users need LLM access for the optimizer to work. BYOK keeps our costs at $0. |

### 3.5 What's Premium-Only

| Feature | Why It's Premium |
|---------|-----------------|
| **Unlimited Sessions** | The primary conversion driver. 9 free sessions demonstrate value; unlimited requires payment. |
| **Variable Engine (F2)** | Power-user efficiency feature. Not needed for basic optimization during trial. |
| **Template Create/Save (F3)** | Reusability requires investment. Users who want to save templates are invested enough to pay. |
| **Local LLM Mode (Ollama)** | Privacy-premium feature. BYOK is available in trial; Ollama is the upgrade incentive for privacy-focused users. |
| **Prompt History** | Valuable for sustained use. Not critical during a 9-session trial. |
| **Template Import/Export** | Sharing and backup — power-user workflow feature. |
| **Technique Selector (F7)** | Professional prompting techniques — advanced power-user layer. |
| **Quality Score (F8)** | AI-powered scoring — professional practice tool. |
| **Context Injector (F9)** | Automation — power-user productivity feature. |
| **Full Library (50+)** | Specialized templates beyond common use cases. |

---

## 4. Pricing Validation

### 4.1 Market Comparison

| Tool / Category | Pricing Model | Price | prmpt Comparison |
|----------------|---------------|-------|----------------------|
| **VS Code Extensions (average paid)** | One-time | $4.99 individual, $12.99 packs | $9.99 falls in "complex extension" range ($9.99-$19.99) |
| **GitLens (VS Code)** | Freemium | Free individuals / Paid teams | Similar free-core model; we're simpler with one-time |
| **Cursor (IDE)** | Subscription | $20/mo (Pro) | 50x more expensive annually vs our one-time |
| **GitHub Copilot** | Subscription | $10/mo ($100/yr) | 10x more expensive annually; different value prop |
| **Langfuse (LLMOps)** | Freemium/Self-host | Free (open-source) + Cloud plans | Different category; enterprise-focused pricing |
| **JetBrains IDEs** | Subscription | $16.90/mo (first year) | Full IDE subscription vs our extension add-on |
| **Affinity Suite** | One-time | $69.99/app | Demonstrates one-time works for creative tools |
| **Raycast Pro** | Subscription | $8/mo | Similar utility tool; we're cheaper as one-time |

### 4.2 Price Point Analysis

**Why $9.99 — Not Higher, Not Lower:**

| Price Point | Assessment |
|-------------|------------|
| **$2.99-$4.99** | Too low — signals "basic extension" rather than "professional tool." VS Code marketplace average is $4.99, and prmpt offers significantly more value than a syntax highlighter. Leaves revenue too thin for solo developer sustainability. |
| **$7.99** | Reasonable but misses charm pricing psychology. Doesn't feel materially different from $9.99 to buyer. |
| **$9.99** | ✅ **Sweet spot** — falls in "complex extension" pricing range ($9.99-$19.99). Under the $10 psychological threshold. Impulse-buy territory for developers (less than a lunch). Charm pricing effect increases conversions by 24%+. Signals "professional tool" without feeling expensive. |
| **$14.99** | Over the $10 threshold — conversion drops significantly. Triggers "do I really need this?" evaluation. May require more justification. |
| **$19.99-$29.99** | Enterprise territory. Individual developers won't pay this for a VS Code extension without significant feature depth. Would need team/enterprise features to justify. |

### 4.3 Willingness-to-Pay Assessment

| User Segment | WTP for prmpt Premium | Reasoning |
|-------------|---------------------------|-----------|
| **Junior developer (2-5 yrs)** | $5-$10 | Budget-conscious, still learning prompt engineering. $9.99 is the upper bound but acceptable if value is clear. |
| **Mid-level developer (5-10 yrs)** | $10-$20 | Understands time value, uses AI daily, willing to invest in productivity tools. $9.99 is easy approval. |
| **Senior developer (10+ yrs)** | $10-$30 | Values efficiency highly, $9.99 is trivial. May even wish for a "pro" tier with more features. |
| **Budget-conscious / Developing markets** | $3-$8 | $9.99 may be a stretch. Consider regional pricing or student discount in future. |

**Conclusion:** $9.99 captures 70-80% of the addressable audience willingness-to-pay. The remaining 20-30% (budget-constrained users) are served by the genuinely useful free trial.

### 4.4 Developer Spending Context

To anchor $9.99 in a developer's existing spending:

| Common Developer Expense | Cost | prmpt Comparison |
|--------------------------|------|----------------------|
| A single coffee | $5-$7 | prmpt = ~2 coffees |
| Monthly Spotify subscription | $10.99/mo | prmpt = less than 1 month of Spotify, forever |
| Monthly ChatGPT Plus | $20/mo | prmpt = half of 1 month, forever |
| Monthly GitHub Copilot | $10/mo | prmpt = 1 month of Copilot, forever |
| Udemy course on prompt engineering | $12.99-$29.99 | prmpt = less than a course, and it does the work for you |
| Monthly streaming service | $15-$20/mo | prmpt = less than 1 month, forever |

**Key message for marketing:** "Less than two coffees. Yours forever."

---

## 5. Pricing Psychology

### 5.1 Why $9.99 Works — The Science

**Charm Pricing (Left-Digit Effect)**

$9.99 exploits a well-documented cognitive bias called the **left-digit effect**:

- Consumers read prices left-to-right and anchor on the first digit
- $9.99 is mentally categorized as "$9-something" rather than "$10"
- The brain perceives a $10.00 → $9.99 reduction as much larger than the actual $0.01 difference
- **Statistical evidence:** Charm pricing increases sales by at least 24% across categories (Capital One Shopping Research, 2026)

**For prmpt specifically:**
- $9.99 stays in the **single-digit** mental category — "under $10"
- This matters because $10.00 crosses into a new psychological price bracket
- Developer tools under $10 are impulse purchases; over $10 triggers evaluation

### 5.2 Anchoring Strategy

prmpt doesn't need artificial price anchoring (no strikethrough "~~$29.99~~ → $9.99"). Instead, natural anchoring occurs through:

| Anchor | How It Works |
|--------|-------------|
| **Competitor pricing** | Cursor at $20/mo, Copilot at $10/mo — prmpt at $9.99 one-time feels like a steal |
| **Time savings** | Even 30 minutes saved justifies $9.99 at any developer hourly rate ($50-$200/hr) |
| **"Forever" framing** | "Pay once, use forever" — the total cost of ownership is always $9.99, no matter how long you use it |
| **Daily cost** | Over 1 year: $9.99/365 = $0.027/day. Over 3 years: $0.009/day. |

### 5.3 Perceived Value Amplifiers

| Technique | Application |
|-----------|-------------|
| **Bundling** | Premium isn't "one feature for $9.99" — it's 10+ features bundled (Unlimited Sessions + Variable Engine + Template System + Ollama + Technique Selector + Quality Score + Context Injector + Prompt History + Import/Export + Full Library + Priority Updates). Perceived value far exceeds $9.99. |
| **Loss aversion** | Quality Score preview shows a blurred score — users feel they're "missing out" on insight they could have. |
| **Social proof** | Display premium user count and testimonials on marketplace listing (post-launch). |
| **Scarcity (ethical)** | "Early adopter pricing" — establish $9.99 as the launch price with the possibility of price increase for future features. This creates urgency without dishonesty. |
| **Reciprocity** | The free trial gives 9 full-power sessions — enough to clearly demonstrate value. Users who've gotten great results feel natural motivation to pay $9.99 for unlimited access. |

### 5.4 Pricing Display Strategy

**On the VS Code Marketplace listing:**
```
💰 Free Trial: 9 optimization sessions with full-power core optimizer
⭐ Premium: $9.99 one-time — Unlimited sessions + Variable Engine, Templates,
   Technique Selector, Quality Score, Context Injector, 50+ templates, and more.
   Pay once, yours forever.
```

**In the extension (Settings / Premium page):**
```
┌──────────────────────────────────────────────┐
│  ⭐ prmpt Premium — $9.99 one-time     │
│                                              │
│  ✅ Unlimited optimization sessions          │
│  ✅ Variable Engine (dynamic placeholders)   │
│  ✅ Template System (create/save/organize)   │
│  ✅ Local LLM Mode (Ollama — fully private)  │
│  ✅ Technique Selector (CoT, Few-Shot, ...)  │
│  ✅ AI Quality Score (0-100 with suggestions)│
│  ✅ Context Injector (auto workspace detect) │
│  ✅ Full 50+ Template Library                │
│  ✅ Prompt History & Import/Export            │
│                                              │
│  Less than two coffees. Yours forever. ☕☕   │
│                                              │
│  [Unlock Premium — $9.99]                    │
│                                              │
│  🔒 Secure payment via Stripe                │
│  💚 One-time purchase. No subscription.      │
└──────────────────────────────────────────────┘
```

---

## 6. Competitor Pricing Analysis

### 6.1 Direct Competitor Pricing

No direct competitor exists in the "IDE prompt optimization extension" category. The closest comparisons are:

| Competitor | Category | Pricing | Model | prmpt Advantage |
|-----------|----------|---------|-------|----------------------|
| **Langfuse** | LLMOps Platform | Free (self-host) / $59/mo (cloud) | Subscription | We're for authoring, not monitoring. $9.99 one-time vs $708/yr |
| **LangSmith** | LLMOps Platform | Free tier / $39/mo (Plus) | Subscription | Different use case. We're 84x cheaper annually. |
| **Agenta** | LLMOps Platform | Open-source / Enterprise pricing | Enterprise | We target individuals, not enterprises. |
| **PromptLayer** | Prompt Management | Free / $29/mo (Pro) | Subscription | We're local-first. $9.99 vs $348/yr. |
| **DSPy** | Prompt Framework | Free (open-source) | Open Source | We provide UI + templates. DSPy requires ML knowledge. |
| **Prompty (Microsoft)** | Prompt File Format | Free | Free | We optimize prompts. Prompty is just a file format. |

### 6.2 Adjacent Tool Pricing (VS Code Extensions)

| Extension | Category | Pricing | Notes |
|-----------|----------|---------|-------|
| **GitLens** | Git Tools | Free / Pro (teams) | Open-core model; free for individuals |
| **Prettier** | Formatter | Free | Community-maintained |
| **ESLint** | Linter | Free | Community-maintained |
| **Thunder Client** | API Testing | Free / $9.99 Pro | Same price point as prmpt! |
| **REST Client** | API Testing | Free | Community-maintained |
| **Code Spell Checker** | Code Quality | Free | Community-maintained |
| **Database Client** | Database Tools | Free / Premium | Freemium model |

**Key insight:** $9.99 is an established price point in the VS Code extension market for premium utility tools (e.g., Thunder Client Pro at $9.99). This validates our pricing.

### 6.3 Market Intelligence: VS Code Extension Economy

Based on research (markaicode.com, 2025; dev.to, 2025):

| Metric | Data Point |
|--------|-----------|
| **Active VS Code users** | 30+ million worldwide |
| **Total extensions** | 50,000+ (only ~15% are paid) |
| **Average paid extension price** | $4.99 (individual), $12.99 (packs) |
| **Complex extension range** | $9.99-$19.99 |
| **Top-earning categories** | DevOps ($2,100/mo avg), AI Assistants ($1,800/mo avg), Database Tools ($1,500/mo avg) |
| **Payment infrastructure** | No native VS Code Marketplace payment; requires third-party (code-checkout.dev, Gumroad, Stripe) |

### 6.4 Competitive Pricing Position

```
Price (one-time equivalent)
│
$700/yr ──── Langfuse Cloud ($59/mo)
│
$468/yr ──── LangSmith Plus ($39/mo)  
│
$348/yr ──── PromptLayer Pro ($29/mo)
│
$240/yr ──── GitHub Copilot ($20/mo → soon free for some)
│
$120/yr ──── Cursor Pro ($10/mo student)
│
$19.99  ──── Complex VS Code extensions (high end)
│
$9.99   ──── ⭐ PRMPT PREMIUM (one-time, forever)
│
$4.99   ──── Average VS Code paid extension
│
$0.00   ──── prmpt Free / Prompty / DSPy / ESLint
│
└───────────────────────────────────────────────
```

**prmpt occupies a unique position:** professional-grade tool priced at the accessible end of the complex extension range. Every competitor with comparable AI-powered features charges 10-70x more per year via subscriptions.

---

## 7. Revenue Projections

### 7.1 Funnel Model

```
VS Code Marketplace Impressions
         │
         ▼ (Click-through rate: ~5%)
    Listing Views
         │
         ▼ (Install rate: ~20%)
      Installs
         │
         ▼ (Account creation: ~80%)
    Registered Users (Clerk auth)
         │
         ▼ (Activation rate: ~70%)
    Active Users (used at least 1 session)
         │
         ▼ (Trial completion: ~60%)
   Users Who Hit 9-Session Limit
         │
         ▼ (Conversion rate: ~8%)
   Premium Purchases
         │
         ▼ (Net of payment processing: ~87%)
     Net Revenue
```

### 7.2 90-Day Projections (Launch to Day 90)

Based on scope.md success metrics with updated conversion assumptions:

| Metric | Target | Calculation |
|--------|--------|-------------|
| **VS Code Installs** | 500 | Organic: Marketplace + Product Hunt + HN + Dev.to + Reddit |
| **Account Creation Rate** | 80% | 400 users who create Clerk accounts |
| **Activation Rate** | 70% | 350 users who optimize at least 1 prompt |
| **Trial Completion Rate** | 60% | ~210 users who use all 9 sessions |
| **Premium Conversion Rate** | 8% | Of total installs (hard limit drives higher conversion vs industry 2-5%) |
| **Premium Conversions** | 40 | 500 × 8% |
| **Gross Revenue** | $399.60 | 40 × $9.99 |
| **Payment Processing** | ~13% | code-checkout (10%) + Stripe (~3%) |
| **Net Revenue** | $347.65 | $399.60 × 0.87 |
| **Infrastructure Costs (90 days)** | ~$75-$120 | Supabase Pro ($25/mo × 3) + domain |

### 7.3 Monthly Revenue Projection (Year 1)

Assumes organic install growth with a launch spike followed by steady-state discovery. Conversion rate of 8% (vs 5% in original model) driven by hard session limit.

| Month | New Installs | Cumulative Installs | New Conversions | Cumulative Conversions | Gross Revenue (Cumulative) |
|-------|-------------|--------------------|-----------------|-----------------------|---------------------------|
| **1** | 200 | 200 | 14 | 14 | $139.86 |
| **2** | 180 | 380 | 12 | 26 | $259.74 |
| **3** | 120 | 500 | 14 | 40 | $399.60 |
| **4** | 100 | 600 | 8 | 48 | $479.52 |
| **5** | 100 | 700 | 8 | 56 | $559.44 |
| **6** | 120 | 820 | 10 | 66 | $659.34 |
| **7** | 130 | 950 | 11 | 77 | $769.23 |
| **8** | 150 | 1,100 | 14 | 91 | $909.09 |
| **9** | 150 | 1,250 | 14 | 105 | $1,048.95 |
| **10** | 180 | 1,430 | 16 | 121 | $1,208.79 |
| **11** | 200 | 1,630 | 18 | 139 | $1,388.61 |
| **12** | 250 | 1,880 | 22 | 161 | $1,608.39 |

**Year 1 Total (Moderate):** ~$1,608.39 gross / ~$1,399.30 net revenue
**Year 1 Infrastructure Costs:** ~$315 (Supabase Pro $25/mo + domain $15)
**Year 1 Net After Infrastructure:** ~$1,084.30

*Note: Conversion rate is 8% due to hard session limit (vs 5% in a generous free-tier model). Users who hit the limit and choose to pay are high-intent.*

### 7.4 Year 2-3 Projections (Moderate Scenario)

| Period | Cumulative Installs | Annual Conversions | Annual Revenue (Gross) | Infrastructure Costs | Net After Infra |
|--------|--------------------|--------------------|----------------------|---------------------|-----------------|
| **Year 1** | 1,880 | 161 | $1,608.39 | ~$315 | ~$1,084 |
| **Year 2** | 5,500 | 290 | $2,897.10 | ~$315 | ~$2,207 |
| **Year 3** | 12,000 | 520 | $5,194.80 | ~$315 | ~$4,204 |

*Year 2 assumes improving marketplace rank, content marketing compounding, community template contributions. Year 3 assumes Product Hunt re-launches, YouTube content, and potential media coverage. Infrastructure costs are relatively fixed (Supabase Pro $25/mo + domain $15/yr). Clerk remains on Hobby tier ($0) up to 50K MRU.*

---

## 8. Cost Structure

### 8.1 prmpt's Cost Architecture

prmpt has a **low fixed cost** structure. The primary costs are authentication infrastructure (Clerk + Supabase), not usage-based scaling costs:

| Cost Category | prmpt | Typical SaaS |
|---------------|-------------|-------------|
| **Cloud hosting** | ~$0 (Vercel free tier for auth website) | $50-$500+/mo |
| **Database** | $25/mo (Supabase Pro — minimal user data only) | $20-$200+/mo |
| **API costs** | $0 — BYOK + local LLM | $100-$10,000+/mo |
| **User auth/accounts** | $0 (Clerk Hobby — 50K MRU free) | $10-$50/mo |
| **CDN/bandwidth** | $0 — extension served via Marketplace | $20-$100/mo |
| **Email/notifications** | $0 — no email system (Clerk handles auth emails) | $20-$100/mo |

### 8.2 Actual Costs

| Cost Item | Amount | Frequency | Annual Total |
|-----------|--------|-----------|-------------|
| **VS Code Marketplace** | $0 | — | $0 |
| **Supabase Pro** | $25/mo | Monthly | $300 |
| **Clerk (Auth)** | $0 (Hobby tier — 50K MRU) | — | $0 |
| **prmpt Website hosting** | $0 (Vercel free tier) | — | $0 |
| **Payment processing (code-checkout + Stripe)** | ~13% of revenue | Per transaction | Variable (~$209 on $1,608 Year 1) |
| **Domain name** (prmpt.dev or similar) | $12-$15 | Annual | $15 |
| **SSL certificate** | $0 (included with Vercel) | — | $0 |
| **Developer time** | Opportunity cost | Ongoing | Not cash expense |
| **Template content creation** | Developer time | Ongoing | Not cash expense |

**Total Year 1 Cash Costs: ~$524** (Supabase Pro $300 + payment processing ~$209 + domain $15)

> **⚠️ Supabase Tier Decision:** The free tier auto-pauses projects after 1 week of inactivity, which is unacceptable for production auth. Supabase Pro ($25/mo) is required for reliable operation. This is the primary infrastructure cost.

> **Clerk Scaling Note:** Clerk Hobby tier is free for up to 50,000 Monthly Retained Users (MRU). At prmpt's projected scale (1,880 Year 1, 12,000 Year 3), Clerk remains free for years. If MRU exceeds 50K, Clerk Pro is $20/mo (billed annually) with $0.02/user beyond 50K.

### 8.3 Cost Scaling

prmpt's costs are **mostly fixed** — they don't scale linearly with users (unlike SaaS with per-user server costs):

| Users | Supabase | Clerk | Payment Costs | Total Monthly Costs |
|-------|----------|-------|---------------|---------------------|
| 100 | $25/mo | $0 | ~$1/mo | ~$26/mo |
| 1,000 | $25/mo | $0 | ~$5/mo | ~$30/mo |
| 10,000 | $25/mo | $0 | ~$48/mo | ~$73/mo |
| 50,000 | $25/mo | $0 | ~$240/mo | ~$265/mo |
| 100,000 | $25/mo | $20/mo (+$0.02/user over 50K) | ~$480/mo | ~$1,525/mo |

**The cost structure remains a moat.** Infrastructure costs are fixed at ~$25/mo until massive scale (100K+ users). prmpt can sustain a generous free trial because user growth doesn't create proportional server costs — prompts are processed locally.

---

## 9. Unit Economics

### 9.1 Key Metrics

| Metric | Value | Calculation |
|--------|-------|-------------|
| **Price per unit** | $9.99 | Fixed one-time price |
| **Payment processing fee** | ~$1.30 (13%) | code-checkout 10% + Stripe ~3% |
| **Net revenue per sale** | ~$8.69 | $9.99 − $1.30 |
| **Monthly infrastructure cost** | ~$26 | Supabase Pro ($25) + domain amortized ($1.25) |
| **Annual infrastructure cost** | ~$315 | $25/mo × 12 + $15 domain |
| **Customer Acquisition Cost (CAC)** | ~$0 | 100% organic acquisition in Year 1 |
| **Lifetime Value (LTV)** | $8.69 | One-time purchase = LTV equals net revenue per sale |
| **LTV:CAC Ratio** | ∞ (organic) | $8.69 / $0 — exceptional for organic-only acquisition |
| **Gross Margin** | ~87% | ($9.99 − $1.30) / $9.99 (before fixed infrastructure) |
| **Break-even volume** | ~36 sales/yr | $315 annual infra ÷ $8.69 net per sale |

### 9.2 CAC Analysis

**Year 1: Organic Only**
- VS Code Marketplace: $0 (organic discovery)
- Product Hunt: $0 (free listing)
- Hacker News: $0 (free post)
- Dev.to / Medium articles: $0 (free publishing, developer time only)
- Reddit / Twitter: $0 (organic community engagement)
- GitHub: $0 (open-source template repo)

**Effective CAC = $0** → Every dollar of revenue after infrastructure costs is essentially profit.

**Note on infrastructure allocation:** The $315/yr infrastructure cost is a fixed overhead, not a per-user cost. At 161 conversions (Year 1 moderate), the amortized infrastructure cost per paying user is ~$1.96 — still yielding $6.73 net per sale.

### 9.3 Revenue Per User Metrics

| Metric | Value |
|--------|-------|
| **Revenue per install (RPI)** | $0.80 (at 8% conversion) |
| **Revenue per active user (RPAU)** | $2.28 (at 8% conversion, 35% active) |
| **Revenue per premium user** | $8.69 (net of payment processing) |
| **Revenue per premium user (net of infra, Year 1)** | $6.73 (net of payment + amortized infra) |

### 9.4 Comparison to Industry Benchmarks

| Metric | prmpt | SaaS Industry Average |
|--------|-------------|----------------------|
| **Gross Margin** | ~87% (before infra) / ~80% (after infra amortization) | 70-80% |
| **CAC** | $0 | $100-$500 (B2B SaaS) |
| **LTV:CAC** | ∞ (organic) | 3:1 (healthy) |
| **Free-to-Paid Conversion** | 8% target (hard limit) | 2-5% typical, 10%+ excellent |
| **Infrastructure cost per user** | ~$1.96/yr (at 161 users) → ~$0.61/yr (at 520 users) | $5-$50/yr |

---

## 10. Sustainability Analysis

### 10.1 Can One-Time Pricing Sustain Development?

**The honest answer: Not by itself in Year 1. But that's OK — and infrastructure costs are manageable.**

| Factor | Assessment |
|--------|------------|
| **Solo developer** | prmpt is a solo project. Revenue needs to cover infrastructure and time investment, not a team payroll. |
| **Low fixed costs** | ~$25/mo infrastructure (Supabase Pro). Even modest revenue covers this. Clerk is free up to 50K MRU. |
| **Year 1 reality** | ~$1,084 net revenue (after infra) won't replace a salary. But it covers all hard costs and validates the market. Higher conversion rate (8% vs industry 5%) helps significantly. |
| **Year 2+ trajectory** | With 5,500+ installs and organic growth, $2,200+ net revenue becomes meaningful supplemental income. |
| **Long-term potential** | At 50,000+ installs (achievable for a well-rated VS Code extension in 2-3 years), revenue reaches $6,000+/yr from one-time purchases alone — comfortably covering infrastructure plus meaningful income. |

### 10.2 Sustainability Thresholds

| Level | Annual Revenue Needed | What It Covers | Sales Needed | Install Volume Needed |
|-------|----------------------|----------------|-------------|----------------------|
| **Infrastructure break-even** | ~$315/yr | Supabase Pro + domain | ~36 | ~450 (at 8%) |
| **Full break-even** | ~$524/yr | Infrastructure + payment processing | ~60 | ~750 (at 8%) |
| **Coffee-sustainable** | $1,500/yr | All costs + daily coffee ☕ | ~173 | ~2,160 |
| **Tool-sustainable** | $3,300/yr | Covers dev tool subscriptions + infra | ~380 | ~4,750 |
| **Side-income** | $6,300/yr | Meaningful supplemental income | ~725 | ~9,060 |
| **Part-time income** | $12,300/yr | Significant side project revenue | ~1,415 | ~17,690 |
| **Full-time potential** | $36,300+/yr | Full-time indie developer income | ~4,178 | ~52,220 |

### 10.3 Why One-Time Works Here (With Minimal Infrastructure)

**prmpt's one-time model is sustainable because:**

1. **Near-zero marginal costs** — Each new user costs us virtually nothing. Prompt processing is local (Ollama/BYOK). The only cloud data is a single row in Supabase (email + session count).
2. **Fixed infrastructure costs** — $25/mo Supabase + $0 Clerk doesn't scale with user count (until 50K+ MRU on Clerk, which is years away).
3. **No ongoing service obligation** — The extension runs locally. We maintain a lightweight auth service, not a full cloud platform.
4. **Value is delivered at purchase** — Premium features are installed and work forever locally. The only cloud dependency is the initial auth check.
5. **Growth compounds** — New installs keep coming from the Marketplace, and each one has 8% conversion potential. The install base grows without ongoing acquisition cost.
6. **Complementary revenue streams** (Section 11) can supplement one-time purchases as the user base grows.

**Infrastructure cost context:**
- Supabase stores ~100 bytes per user (email, session count, premium flag). Even at 100K users, this is <1MB of actual data.
- Clerk handles auth entirely — no custom auth server needed.
- The $25/mo Supabase Pro cost is justified by the production reliability guarantee (no auto-pause) and is easily covered by ~3 premium sales per month.

### 10.4 Sustainability Risk & Mitigation

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| One-time revenue plateaus as install growth slows | 🟡 Medium | Introduce complementary revenue streams (Section 11). Expand to new platforms (JetBrains, Web). |
| Infrastructure costs grow with scale | 🟢 Low | Supabase Pro is fixed at $25/mo for 100K+ MAU. Clerk is free to 50K MRU. Costs only increase significantly at 100K+ users, by which point revenue far exceeds costs. |
| Supabase or Clerk pricing changes | 🟢 Low | Both have generous free/low-cost tiers and are open-source-friendly. Supabase is open-source and can be self-hosted if needed. Clerk can be replaced with Auth.js. |
| Users expect free updates forever | 🟢 Low | Set clear expectation: "Premium includes all updates to current premium features." Major new feature sets can be offered as a separate purchase (v2 Premium). |
| Payment processing fees are too high | 🟢 Low | 13% is manageable at current scale. If volume grows, negotiate better rates or switch to direct Stripe integration (~3% only). |

---

## 11. Complementary Revenue Streams

### 11.1 Planned Streams (Post-MVP)

These are **not** in the MVP but inform long-term sustainability thinking:

#### Stream 1: Template Marketplace (Post-MVP2)

| Attribute | Detail |
|-----------|--------|
| **What** | Community-created premium template packs (e.g., "Security Engineering Pack," "Data Engineering Pack") |
| **Pricing** | $2.99-$4.99 per pack |
| **Revenue split** | 70% to template author / 30% to prmpt |
| **When** | Post-MVP2 (after Web Companion launches with community features) |
| **Revenue potential** | $500-$2,000/yr initially, scaling with community size |

#### Stream 2: Enterprise / Team Licensing (MVP3+)

| Attribute | Detail |
|-----------|--------|
| **What** | Team features: shared template libraries, SSO, audit logging, admin controls |
| **Pricing** | $49-$99/team/year (small teams), custom enterprise pricing |
| **When** | MVP3+ (Q4 2026+) |
| **Revenue potential** | Potentially $5,000-$20,000/yr with 50-200 team licenses |
| **Note** | This would be the first recurring revenue stream, justified by ongoing team infrastructure |

#### Stream 3: Sponsored Templates

| Attribute | Detail |
|-----------|--------|
| **What** | AI provider-sponsored templates optimized for their models (e.g., "Anthropic Best Practices Pack") |
| **Pricing** | $500-$2,000 per sponsorship deal |
| **When** | When install base reaches 10,000+ |
| **Revenue potential** | $2,000-$8,000/yr |
| **Note** | Must maintain editorial independence. Sponsored templates must be genuinely useful. |

### 11.2 Revenue Stream Timeline

```
Year 1:  [One-Time Premium $9.99] ─────────────────────────────────────
Year 2:  [One-Time Premium] + [Template Marketplace] ──────────────────
Year 3:  [One-Time Premium] + [Templates] + [Team Licensing] ─────────
Year 4+: [One-Time] + [Templates] + [Teams] + [Sponsorships] + [v2] ──
```

### 11.3 Revenue Mix Projection (Year 3)

| Stream | Estimated Annual Revenue | % of Total |
|--------|------------------------|------------|
| **One-Time Premium ($9.99)** | $3,500 | 50% |
| **Template Marketplace** | $1,500 | 21% |
| **Team Licensing** | $1,500 | 21% |
| **Sponsorships** | $500 | 7% |
| **Total** | ~$7,000 | 100% |

---

## 12. Growth Scenarios

### 12.1 Conservative Scenario

**Assumptions:** Slow marketplace discovery, average retention, mandatory auth causes some drop-off, minimal content marketing traction.

| Period | Cumulative Installs | Conversion Rate | Premium Conversions | Gross Revenue | Net After Infra |
|--------|--------------------|-----------------|--------------------|---------------|-----------------|
| 90 days | 300 | 5% | 15 | $149.85 | ~$71 |
| Year 1 | 1,000 | 5% | 50 | $499.50 | ~$120 |
| Year 2 | 3,000 | 6% | 120 | $1,198.80 (cum.) | ~$570 (cum.) |
| Year 3 | 6,000 | 7% | 210 | $2,097.90 (cum.) | ~$1,145 (cum.) |

**Year 3 cumulative net: ~$1,145** (after $945 cumulative infrastructure costs)

### 12.2 Moderate Scenario (Base Case)

**Assumptions:** Successful launch on Product Hunt/HN, solid marketplace listing, consistent content marketing. Hard session limit drives 8% conversion.

| Period | Cumulative Installs | Conversion Rate | Premium Conversions | Gross Revenue | Net After Infra |
|--------|--------------------|-----------------|--------------------|---------------|-----------------|
| 90 days | 500 | 8% | 40 | $399.60 | ~$273 |
| Year 1 | 1,880 | 8% | 161 | $1,608.39 | ~$1,084 |
| Year 2 | 5,500 | 8.5% | 290 | $2,897.10 (cum.) | ~$2,207 (cum.) |
| Year 3 | 12,000 | 9% | 520 | $5,194.80 (cum.) | ~$4,204 (cum.) |

**Year 3 cumulative net: ~$4,204** (plus complementary streams from Section 11 = ~$6,700 total)

### 12.3 Optimistic Scenario

**Assumptions:** Viral moment (HN front page or popular tweet), strong retention, community contributions accelerate growth. Hard limit drives 10%+ conversion.

| Period | Cumulative Installs | Conversion Rate | Premium Conversions | Gross Revenue | Net After Infra |
|--------|--------------------|-----------------|--------------------|---------------|-----------------|
| 90 days | 1,000 | 10% | 100 | $999.00 | ~$794 |
| Year 1 | 5,000 | 10% | 500 | $4,995.00 | ~$4,031 |
| Year 2 | 15,000 | 10% | 1,000 | $9,990.00 (cum.) | ~$8,716 (cum.) |
| Year 3 | 35,000 | 10% | 2,000 | $19,980.00 (cum.) | ~$18,076 (cum.) |

**Year 3 cumulative net: ~$18,076** (plus complementary streams = ~$25,000+ total)

### 12.4 Scenario Comparison Chart

```
Annual Net Revenue (after infrastructure) ($)
│
$18,000 ────────────────────────────────── ★ Optimistic Year 3
│
$12,000 ──────────────────────────────
│
$8,000  ──────────────────────────
│
$4,000  ─────────────── ◆ Moderate Year 3
│
$2,000  ──────────
│
$1,100  ────── ● Conservative Year 3
│
$120    ── ● Conservative Year 1
│
$0 ─────────┬─────────┬─────────┬─────────
            Year 1    Year 2    Year 3
```

> **Key difference from original model:** Hard session limit drives 8-10% conversion (vs 3-5% with generous free tier). This significantly improves revenue despite the added infrastructure cost of ~$315/yr.

---

## 13. Financial Milestones

### 13.1 Milestone Definitions

| # | Milestone | Revenue Target | Install Target | Significance |
|---|-----------|---------------|---------------|-------------|
| 1 | **First Sale** | $9.99 | ~12 | Product-market validation: someone paid real money |
| 2 | **Infrastructure Break-Even** | $315/yr | ~450 cumulative (at 8%) | Supabase Pro + domain covered |
| 3 | **Full Break-Even** | $524/yr | ~750 cumulative (at 8%) | All hard costs covered (infra + payment processing) |
| 4 | **40 Premium Users** | $399.60 | 500 | Scope.md 90-day target achieved |
| 5 | **100 Premium Users** | $999 | ~1,250 | Market validation at scale |
| 6 | **Coffee-Sustainable** | $1,500/yr | ~2,160 cumulative | Revenue covers infra + daily coffee |
| 7 | **500 Premium Users** | $4,995 | ~6,250 | Serious side-project revenue |
| 8 | **1,000 Premium Users** | $9,990 | ~12,500 | Near $10K milestone — business viability |
| 9 | **Template Marketplace Revenue** | First $100 from marketplace | 10,000+ | Complementary stream validated |
| 10 | **First Team License** | $49-$99 | — | Enterprise expansion validated |
| 11 | **$1K Monthly Revenue** | $12,000/yr | ~17,500+ cumulative | Full indie developer income threshold |

### 13.2 Milestone Timeline (Moderate Scenario)

| Milestone | Expected Date | Status |
|-----------|--------------|--------|
| First Sale | Week 1-2 post-launch (faster due to hard limit) | 🎯 90-day window |
| Infrastructure Break-Even | Month 2 | 🎯 90-day window |
| Full Break-Even | Month 3 | 🎯 90-day window |
| 40 Premium Users | Month 3 | 🎯 Scope.md target |
| 100 Premium Users | Month 5-7 | 📅 Year 1 |
| Coffee-Sustainable | Month 7-9 | 📅 Year 1 |
| 500 Premium Users | Month 18-24 | 📅 Year 2 |
| 1,000 Premium Users | Month 24-30 | 📅 Year 2-3 |

### 13.3 Decision Triggers

Milestones also trigger strategic decisions:

| Milestone Reached | Decision Triggered |
|-------------------|-------------------|
| **40 premium users** | ✅ Continue development. 90-day target validated. Begin planning P2 features. |
| **100 premium users** | Consider paid acquisition experiment ($50/mo budget test). Begin Template Marketplace planning. |
| **500 premium users** | Invest in Team Licensing features. Consider hiring part-time contributor. |
| **1,000 premium users** | Evaluate price adjustment for new features (v2 Premium). Consider JetBrains extension. |
| **<15 conversions at 90 days** | 🚨 Re-evaluate: Is the 9-session limit too low? Is auth friction too high? Is the price too high? Conduct user interviews. Consider increasing trial to 15 sessions. |

---

## 14. Implementation Plan

### 14.1 Authentication Infrastructure (Clerk + Supabase)

**Primary: Clerk for Authentication**

| Attribute | Detail |
|-----------|--------|
| **Platform** | [clerk.com](https://clerk.com/) — developer-focused auth platform with prebuilt UIs |
| **Tier** | Hobby (Free) — 50,000 MRU, unlimited apps, no credit card required |
| **Integration** | Clerk-hosted sign-in/sign-up pages on prmpt website (prmpt.dev) |
| **Auth flow** | VS Code → `vscode.env.openExternal()` → browser → Clerk auth page → redirect `vscode://prmpt/auth-callback?token=JWT` → extension stores JWT in SecretStorage |
| **Why this choice** | Generous free tier (50K MRU), prebuilt UIs, social login (GitHub, Google), excellent DX, OAuth support. No custom auth server needed. |

**User Data: Supabase**

| Attribute | Detail |
|-----------|--------|
| **Platform** | [supabase.com](https://supabase.com/) — hosted Postgres with REST API |
| **Tier** | Pro ($25/mo) — required for production (free tier auto-pauses after 1 week inactivity) |
| **Schema** | Single `users` table: `id`, `clerk_user_id`, `email`, `total_sessions`, `is_premium`, `created_at`, `updated_at` |
| **Data stored** | Minimal: email, session count, premium status only. **No prompt data, no templates, no history** — all stored locally. |
| **Why this choice** | Minimal footprint, easy Clerk integration, generous specs at $25/mo (100K MAU, 8GB disk, 250GB egress). |

### 14.2 Payment Infrastructure

**Recommended: code-checkout.dev**

| Attribute | Detail |
|-----------|--------|
| **Platform** | [code-checkout.dev](https://codecheckout.dev/) — purpose-built for VS Code extension payments |
| **Integration** | 2 lines of code to add licensing check |
| **Fee structure** | Free to use; 10% transaction fee (+ Stripe ~3%) |
| **What it handles** | Payment processing, license key generation, license validation, analytics |
| **Why this choice** | Only platform specifically designed for VS Code extension monetization. No need to build custom backend. |

**Alternative: Direct Stripe Integration**

| Attribute | Detail |
|-----------|--------|
| **Approach** | Custom Stripe Checkout → webhook → update `is_premium` in Supabase |
| **Fee** | ~3% per transaction (lower than code-checkout) |
| **Trade-off** | Requires handling webhooks and Supabase updates, but integrates cleanly with Clerk auth |
| **When to consider** | When volume exceeds 500+ transactions/year and the 10% code-checkout fee becomes significant |

### 14.3 License Verification & Session Tracking

```
Authentication Flow:
1. User installs extension → Welcome screen with "Sign In" / "Sign Up" buttons
2. Clicks button → vscode.env.openExternal(clerkAuthUrl)
3. Browser opens → Clerk-hosted sign-in page on prmpt.dev
4. User signs in (email/password or GitHub/Google social login)
5. Success → redirect to vscode://prmpt/auth-callback?token=JWT
6. Extension URI handler captures JWT → stores in VS Code SecretStorage
7. Extension creates/finds user record in Supabase → reads session count + premium status
8. Extension ready — user sees session counter ("9 free sessions remaining")

Optimization Session:
1. User optimizes a prompt (any feature available for their tier)
2. Extension increments total_sessions in Supabase
3. Status bar updates: "Session 4 of 9" (free) or "Premium ∞" (paid)
4. If total_sessions >= 9 AND !is_premium → show upgrade prompt

Premium Purchase Flow:
1. User clicks "Upgrade to Premium — $9.99" in extension
2. Opens Stripe checkout (via code-checkout or direct)
3. User completes $9.99 payment
4. License key generated and delivered (or Stripe webhook updates Supabase is_premium=true)
5. Extension validates → Premium features unlocked
6. Session counter hidden → "Premium ∞" displayed

Offline Handling:
- Cached JWT allows offline use for 24+ hours
- Session count cached locally, synced to Supabase when online
- Premium status cached locally — doesn't require constant internet
- Graceful degradation: if Supabase is unreachable, use last-known state
```

### 14.4 Premium Feature Gating

```typescript
// Auth + Premium check pattern
async function checkAccess(feature: string): Promise<boolean> {
  const user = await getAuthenticatedUser(); // JWT from SecretStorage
  if (!user) {
    showSignInPrompt();
    return false;
  }
  
  const isPremium = user.is_premium; // from Supabase / cached
  const sessions = user.total_sessions;
  
  // Free trial features (F1, F4, F5, starter library, BYOK)
  if (FREE_TRIAL_FEATURES.includes(feature)) {
    if (sessions >= 9 && !isPremium) {
      showUpgradePrompt('session-limit');
      return false;
    }
    return true;
  }
  
  // Premium-only features (F2, F3, F7, F8, F9, Ollama, History, etc.)
  if (!isPremium) {
    showPremiumUpsell(feature);
    return false;
  }
  return true;
}
```

### 14.5 prmpt Website (Auth Portal)

| Component | Detail |
|-----------|--------|
| **Framework** | Next.js (hosted on Vercel free tier) |
| **Domain** | prmpt.dev (or similar) |
| **Pages** | Sign In (Clerk), Sign Up (Clerk), Premium Purchase, Privacy Policy, Terms |
| **Purpose** | Authentication portal for Clerk OAuth flow + premium purchase landing page |
| **Hosting cost** | $0 (Vercel free tier) + $15/yr domain |

### 14.6 Implementation Timeline

| Phase | Tasks | Week |
|-------|-------|------|
| **1. Auth infrastructure** | Clerk account setup, Supabase project + schema, website scaffolding (Next.js) | Week 1 |
| **2. OAuth flow** | Browser redirect flow, URI handler, JWT storage, session counter | Week 2 |
| **3. Session tracking** | Supabase increment, free trial limit enforcement, premium status check | Week 2-3 |
| **4. Payment setup** | Create code-checkout account, configure Stripe, set up product/price | Week 6 |
| **5. License integration** | Add code-checkout SDK, implement premium check, update Supabase `is_premium` | Week 6-7 |
| **6. Feature gating** | Add premium checks to F2, F3, F7, F8, F9, Ollama, history, import/export | Week 7 |
| **7. Upgrade UX** | Design session counter, upgrade prompts, premium feature indicators | Week 8 |
| **8. Testing** | Test auth flow, purchase flow, license validation, offline mode, edge cases | Week 9 |
| **9. Launch** | Auth + Premium available at MVP launch | Week 10 |

---

## 15. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | **$9.99 is too expensive for the target audience** | 🟢 Low | 🟡 Medium | $9.99 is validated against VS Code extension pricing benchmarks. Monitor conversion rate; if <4% at 90 days, consider $7.99 price test. |
| 2 | **9-session free trial is too restrictive — negative reviews** | 🟡 Medium | 🟡 Medium | Monitor marketplace reviews. If negative feedback is high, consider increasing to 12 or 15 sessions. A/B test different limits if possible. |
| 3 | **Mandatory auth causes install drop-off** | 🟡 Medium | 🟡 Medium | GitHub Copilot-style frictionless flow. Social login (GitHub, Google) for one-click auth. Clear value prop shown before auth wall. Track install-to-auth conversion rate. |
| 4 | **Payment processing is clunky** | 🟡 Medium | 🟡 Medium | Use code-checkout for streamlined VS Code-native payment flow. Test extensively before launch. |
| 5 | **One-time revenue doesn't sustain motivation** | 🟡 Medium | 🟡 Medium | Plan complementary streams from Day 1. Set expectation that Year 1 is about validation, not income replacement. |
| 6 | **Competitors undercut on price** | 🟢 Low | 🟢 Low | No direct competitor exists in this niche. If one appears, our template ecosystem and community create switching costs. |
| 7 | **VS Code Marketplace introduces native paid extensions** | 🟡 Medium | 🟢 Low (positive) | This would actually benefit prmpt — built-in payment reduces friction and eliminates code-checkout fee. |
| 8 | **License key piracy / sharing** | 🟡 Medium | 🟢 Low | At $9.99, piracy motivation is minimal. Premium status tied to Clerk account (not just a license key). |
| 9 | **Supabase free tier auto-pauses (if using free tier)** | 🔴 High | 🔴 High | Use Supabase Pro ($25/mo) from launch. Budget is covered by ~3 premium sales/month. |
| 10 | **Clerk dependency — auth outage blocks all users** | 🟢 Low | 🔴 High | Clerk has 99.9%+ uptime. Implement 24h JWT cache for graceful degradation. Long-term contingency: migrate to Auth.js/NextAuth. |
| 11 | **Infrastructure costs grow unexpectedly** | 🟢 Low | 🟡 Medium | Supabase Pro is fixed at $25/mo. Clerk is free to 50K MRU. Costs only spike at 100K+ users, by which point revenue far exceeds costs. Monitor usage dashboards. |
| 12 | **Regional pricing pressure** | 🟡 Medium | 🟢 Low | $9.99 is globally accessible for developers. If data shows demand from price-sensitive regions, consider PPP (Purchasing Power Parity) discount codes. |

---

## 16. Decision Log

| # | Decision | Options Considered | Final Choice | Rationale |
|---|----------|-------------------|-------------|-----------|
| 1 | **Pricing model** | Subscription ($3/mo) vs One-time ($9.99) vs Credits | One-time $9.99 | Near-zero marginal costs make subscriptions unjustifiable. Developer audience prefers one-time (44% per SlashData). Fixed infrastructure is low enough (~$25/mo) to sustain with one-time revenue. |
| 2 | **Price point** | $4.99 / $7.99 / $9.99 / $14.99 | $9.99 | Sweet spot: under $10 threshold, charm pricing (+24% sales), signals "professional" not "basic," validated against VS Code extension market ($9.99-$19.99 for complex extensions). |
| 3 | **Free trial scope** | Unlimited free (generous) vs 9 sessions (trial) vs 5 sessions (tight) | 9-session free trial: core optimizer, model selector, output formatter, starter library, BYOK | 9 sessions = ~3 days of normal use. Enough to demonstrate value without giving away unlimited usage. Hard limit drives 8%+ conversion (vs industry 2-5%). |
| 4 | **Premium features** | P1 features only vs Everything | Everything: F2, F3, F7, F8, F9, Ollama, History, Import/Export, Full Library, Unlimited Sessions | Maximizes premium value proposition. One purchase unlocks the complete tool — no tiered premium or drip of features. |
| 5 | **Payment infrastructure** | code-checkout vs Direct Stripe vs Gumroad vs LemonSqueezy | code-checkout (primary) | Purpose-built for VS Code extensions. 2-line integration. Handles licensing. Direct Stripe as future migration if volume justifies lower fees. |
| 6 | **Upgrade UX** | Hard block only vs Subtle indicators + hard block | Hard session limit (primary) + subtle premium badges (secondary) | Hard block at 9 sessions is the primary conversion driver. Premium feature badges create secondary awareness. No aggressive nagging during active sessions. |
| 7 | **License model** | Per-machine vs Per-user vs Per-everything | Per-user (tied to Clerk account — usable across devices) | Developers use multiple machines. Per-machine licensing frustrates users. Clerk account = natural per-user licensing. |
| 8 | **Template library split** | All free vs All premium vs Split | Split: 15-20 free starter (read-only) / 50+ total with premium (full access) | Free starter covers common use cases for browsing during trial. Premium adds specialized categories + create/save capability. |
| 9 | **Complementary revenue** | Templates only vs Team licensing vs Both + Sponsorships | All three, phased over Years 2-4 | Diversification reduces one-time revenue dependency. Each stream targets a different growth phase and user segment. |
| 10 | **Auth provider** | Auth.js/NextAuth vs Firebase Auth vs Clerk | Clerk (Hobby tier) | Prebuilt UIs eliminate custom auth page development. 50K MRU free tier covers years of growth. Social login built-in. Excellent VS Code OAuth support. |
| 11 | **User data store** | Firebase vs Custom Postgres vs Supabase | Supabase Pro ($25/mo) | Minimal data footprint (1 table, ~100 bytes/user). Free tier auto-pauses — Pro required for production. Easy Clerk integration. SQL familiarity. |
| 12 | **Free trial limit** | 5 / 9 / 15 / unlimited | 9 optimization sessions | 9 = ~3 sessions/day × 3 days. Enough to prove value, creates natural decision point, not so low as to frustrate. Can be adjusted based on marketplace feedback. |
| 13 | **BYOK in free trial** | Include BYOK in trial vs Premium-only | Include BYOK in free trial | Core optimizer needs an LLM to function. BYOK keeps our costs at $0 during trial. Users supply their own API keys. Ollama is premium-only (upgrade incentive for privacy-focused users). |
| 14 | **Mandatory authentication** | Optional auth vs Mandatory auth | Mandatory account for all users (free and premium) | Enables session tracking, premium enforcement, and future community features. Follows GitHub Copilot/Cursor pattern. Industry-standard for developer tools. |
| 15 | **F2/F3 premium move** | Keep F2/F3 free vs Move to premium | Variable Engine (F2) and Template System (F3) are premium-only | Increases premium value proposition significantly; free trial users still get core optimizer which is the primary value. Variables and templates are power-user efficiency features. |

---

## Appendix A: Research Summary

### Sources Consulted

| Source | Key Findings |
|--------|-------------|
| **IndieHackers** — "Subscriptions vs One-Time Payments" (2025) | One-time pricing isn't dead. Appeals to indie/hacker/bootstrapped markets. Lower friction, faster conversions. Privacy benefit (no account needed). Subscription fatigue is real. |
| **SlashData** — "From Free to Fee: Pricing Strategies for Developer Tools" (2024) | 56% of developers prioritize productivity. 44% prefer one-time purchase for IDEs. 23% value free plans for evaluation. 44% upgrade for advanced features. Feature availability (31%) is #1 evaluation factor. |
| **markaicode.com** — "Sell VS Code Extensions in 2025" (2025) | 30M+ VS Code users. Extension pricing: $4.99 average, $9.99-$19.99 complex. Top categories: DevOps ($2,100/mo avg), AI ($1,800/mo avg). Only 15% of extensions are paid. |
| **DEV.to / Riff Tech** — "VSCode Extensions: Adding Paid Features" (2025) | Microsoft hasn't implemented paid extensions in Marketplace. code-checkout.dev fills the gap (10% fee + Stripe). 2-line integration. Free to use, pays only on revenue. |
| **Capital One Shopping** — "Pricing Psychology Statistics" (2026) | Charm pricing (.99) increases sales by 24%+. Left-digit bias: $9.99 perceived as "$9-something." Works across all consumer categories. |
| **Userpilot** — "Freemium Conversion Rate Guide" (2025) | Typical rates: 2-5%. Top performers: 30%+ (Spotify, Slack). Most SaaS falls in 2-5% range. Developer tools with high intent can reach 5-7%. |
| **First Page Sage** — "SaaS Freemium Conversion Rates" (2024-2025) | Data from 80+ SaaS clients. Industry benchmarks validate 5% as realistic target for high-value, niche tools. |

### Key Research Insights Applied

1. **"If it does not cost API pricing then a lifetime deal would be a great option"** (IndieHackers) → Directly validates prmpt's one-time model since we have near-zero marginal costs (prompt processing is local, only auth infrastructure is cloud-based at ~$25/mo fixed).

2. **"44% prefer one-time purchase for IDEs/text editors"** (SlashData) → IDE extensions are the #1 category where one-time purchase is preferred. prmpt is literally an IDE extension.

3. **"44% of developers upgrade to get access to advanced features"** (SlashData) → Our premium features (unlimited sessions, Variable Engine, Template System, Technique Selector, Quality Score, Context Injector, LLM modes) represent a massive feature unlock — more than enough to drive 8%+ conversion with a hard session limit.

4. **"Charm pricing increases sales by at least 24%"** (Capital One Shopping Research) → $9.99 vs $10.00 isn't just aesthetics — it's evidence-based pricing science.

5. **"Subscription fatigue is real — another monthly fee can be an instant turnoff"** (IndieHackers community consensus) → One-time pricing removes the #1 objection developers have. Even though we now require an account (Clerk), there's no recurring billing.

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **BYOK** | Bring Your Own Key — user provides their own API key for cloud LLM access |
| **CAC** | Customer Acquisition Cost — cost to acquire one paying customer |
| **Charm Pricing** | Pricing strategy ending in .99 or .95 to exploit left-digit cognitive bias |
| **Clerk** | Third-party authentication service providing OAuth, JWT, and prebuilt sign-in/sign-up UIs. prmpt uses Clerk's Hobby tier (50K MRU free). |
| **code-checkout** | Third-party platform (codecheckout.dev) for adding payments to VS Code extensions |
| **Conversion Rate** | Percentage of installs who purchase premium. Target: 8% (hard session limit drives higher conversion). |
| **Freemium** | Business model offering free core product with paid premium features. prmpt uses a trial variant (9 sessions free → premium). |
| **JWT** | JSON Web Token — compact, URL-safe token used by Clerk to authenticate users between the website and VS Code extension |
| **LTV** | Lifetime Value — total revenue from a customer over their entire relationship |
| **MRR** | Monthly Recurring Revenue — not applicable to prmpt's one-time model |
| **MRU** | Monthly Retained Users — Clerk's billing metric; counts users who return at least once in a billing period. prmpt is free up to 50K MRU. |
| **Net Revenue** | Gross revenue minus payment processing fees and infrastructure costs |
| **OAuth** | Open Authorization — protocol enabling browser-based sign-in for the VS Code extension via the prmpt website |
| **One-Time Purchase** | Single payment for permanent access — no subscription or renewal |
| **PPP** | Purchasing Power Parity — regional pricing adjustments based on local economics |
| **RPI** | Revenue Per Install — average revenue generated per extension installation |
| **Session** | A single prompt optimization interaction. Free trial users are limited to 9 sessions, tracked via Supabase. |
| **Supabase** | Open-source Firebase alternative providing hosted Postgres database. prmpt stores minimal user data (email, session count, premium status). Pro tier: $25/mo. |

---

*Document Version: 2.0 (Revised — Mandatory Auth + Premium Restructure)*  
*Last Updated: February 23, 2026*  
*Status: ✅ Approved — Ready for implementation alongside technical architecture*

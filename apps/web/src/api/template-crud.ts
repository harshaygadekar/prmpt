import {
  templateCreateRequestSchema,
  templateUpdateRequestSchema,
  templateDeleteRequestSchema,
  templateGetRequestSchema,
  templateListRequestSchema,
  type TemplateRecord,
  type TemplateListResponse,
  type TemplateSummary
} from "@prmpt/contracts";
import {
  InMemoryTemplateRepository,
  type TemplateRepository,
  type StoredTemplate,
  type TemplateFilter
} from "@prmpt/data-access";

// --- Shared types ---

export interface TemplateCrudApiRequest {
  body: unknown;
}

export interface TemplateCrudApiResponse {
  status: 200 | 201 | 400 | 403 | 404;
  body: unknown;
}

export interface TemplateCrudDeps {
  templateRepository: TemplateRepository;
  getEntitlement: (userId: string) => Promise<{ isPremium: boolean }>;
  now?: () => Date;
}

const SCHEMA_VERSION = "1.0";
const FREE_USER_TEMPLATE_LIMIT = 5;
let templateIdSeq = 0;

function toTemplateRecord(t: StoredTemplate): TemplateRecord {
  return {
    id: t.id,
    schemaVersion: t.schemaVersion,
    title: t.title,
    category: t.category as TemplateRecord["category"],
    description: t.description,
    tier: t.tier,
    ownership: t.ownership,
    modelFamilies: t.modelFamilies as TemplateRecord["modelFamilies"],
    promptBody: t.promptBody,
    variables: t.variables,
    tags: t.tags.length > 0 ? t.tags : undefined,
    suggestedTechniques: t.suggestedTechniques.length > 0 ? t.suggestedTechniques : undefined,
    createdBy: t.createdBy,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt
  };
}

function toTemplateSummary(t: StoredTemplate): TemplateSummary {
  return {
    id: t.id,
    title: t.title,
    category: t.category as TemplateSummary["category"],
    tier: t.tier,
    ownership: t.ownership,
    modelFamilies: t.modelFamilies as TemplateSummary["modelFamilies"],
    description: t.description,
    tags: t.tags.length > 0 ? t.tags : undefined
  };
}

// --- Create ---

export function createTemplateCreateApi(
  deps: Partial<TemplateCrudDeps> = {}
): (request: TemplateCrudApiRequest) => Promise<TemplateCrudApiResponse> {
  const repo = deps.templateRepository ?? new InMemoryTemplateRepository();
  const getEntitlement = deps.getEntitlement ?? (async () => ({ isPremium: false }));
  const now = deps.now ?? (() => new Date());

  return async (request) => {
    const parsed = templateCreateRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return {
        status: 400,
        body: {
          error: "invalid_request",
          issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
        }
      };
    }

    const { userId, ...data } = parsed.data;
    const entitlement = await getEntitlement(userId);

    // Free users have a template creation limit
    if (!entitlement.isPremium) {
      const count = await repo.countByUser(userId);
      if (count >= FREE_USER_TEMPLATE_LIMIT) {
        return {
          status: 403,
          body: {
            error: "template_limit_reached",
            message: `Free users can create up to ${FREE_USER_TEMPLATE_LIMIT} templates. Upgrade to Premium for unlimited templates.`,
            limit: FREE_USER_TEMPLATE_LIMIT,
            current: count
          }
        };
      }
    }

    const timestamp = now().toISOString();
    templateIdSeq += 1;
    const id = `tpl-${userId.slice(0, 8)}-${Date.now().toString(36)}-${templateIdSeq}`;
    const template: StoredTemplate = {
      id,
      schemaVersion: SCHEMA_VERSION,
      title: data.title,
      category: data.category,
      description: data.description,
      tier: "starter_free",
      ownership: "user",
      modelFamilies: data.modelFamilies,
      promptBody: data.promptBody,
      variables: data.variables as Record<string, unknown>[],
      tags: data.tags ?? [],
      suggestedTechniques: data.suggestedTechniques ?? [],
      createdBy: userId,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const created = await repo.create(template);
    return { status: 201, body: toTemplateRecord(created) };
  };
}

// --- Get ---

export function createTemplateGetApi(
  deps: Partial<TemplateCrudDeps> = {}
): (request: TemplateCrudApiRequest) => Promise<TemplateCrudApiResponse> {
  const repo = deps.templateRepository ?? new InMemoryTemplateRepository();
  const getEntitlement = deps.getEntitlement ?? (async () => ({ isPremium: false }));

  return async (request) => {
    const parsed = templateGetRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return {
        status: 400,
        body: {
          error: "invalid_request",
          issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
        }
      };
    }

    const template = await repo.getById(parsed.data.templateId);
    if (!template) {
      return { status: 404, body: { error: "template_not_found" } };
    }

    // Check access: user templates are only visible to creator; builtins are visible to all
    if (template.ownership === "user" && template.createdBy !== parsed.data.userId) {
      return { status: 404, body: { error: "template_not_found" } };
    }

    // Premium template body is gated for free users
    const entitlement = await getEntitlement(parsed.data.userId);
    if (template.tier === "premium" && !entitlement.isPremium) {
      return {
        status: 403,
        body: {
          error: "premium_required",
          message: "This template requires a Premium subscription.",
          templateId: template.id
        }
      };
    }

    return { status: 200, body: toTemplateRecord(template) };
  };
}

// --- List ---

export function createTemplateListApi(
  deps: Partial<TemplateCrudDeps> = {}
): (request: TemplateCrudApiRequest) => Promise<TemplateCrudApiResponse> {
  const repo = deps.templateRepository ?? new InMemoryTemplateRepository();

  return async (request) => {
    const parsed = templateListRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return {
        status: 400,
        body: {
          error: "invalid_request",
          issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
        }
      };
    }

    const filter: TemplateFilter = {};
    if (parsed.data.category) filter.category = parsed.data.category;
    if (parsed.data.tier) filter.tier = parsed.data.tier;
    if (parsed.data.modelFamily) filter.modelFamily = parsed.data.modelFamily;
    if (parsed.data.ownership) filter.ownership = parsed.data.ownership;
    if (parsed.data.search) filter.search = parsed.data.search;

    const templates = await repo.listByUser(parsed.data.userId, filter);
    const summaries: TemplateSummary[] = templates.map(toTemplateSummary);

    const response: TemplateListResponse = {
      templates: summaries,
      total: summaries.length
    };

    return { status: 200, body: response };
  };
}

// --- Update ---

export function createTemplateUpdateApi(
  deps: Partial<TemplateCrudDeps> = {}
): (request: TemplateCrudApiRequest) => Promise<TemplateCrudApiResponse> {
  const repo = deps.templateRepository ?? new InMemoryTemplateRepository();
  const now = deps.now ?? (() => new Date());

  return async (request) => {
    const parsed = templateUpdateRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return {
        status: 400,
        body: {
          error: "invalid_request",
          issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
        }
      };
    }

    const { userId, templateId, ...fields } = parsed.data;
    const existing = await repo.getById(templateId);
    if (!existing) {
      return { status: 404, body: { error: "template_not_found" } };
    }

    // Built-in templates are immutable
    if (existing.ownership === "builtin") {
      return {
        status: 403,
        body: { error: "builtin_immutable", message: "Built-in templates cannot be edited." }
      };
    }

    // Only the creator can update
    if (existing.createdBy !== userId) {
      return { status: 404, body: { error: "template_not_found" } };
    }

    const updatePayload: Partial<StoredTemplate> = { updatedAt: now().toISOString() };
    if (fields.title !== undefined) updatePayload.title = fields.title;
    if (fields.category !== undefined) updatePayload.category = fields.category;
    if (fields.description !== undefined) updatePayload.description = fields.description;
    if (fields.modelFamilies !== undefined) updatePayload.modelFamilies = fields.modelFamilies;
    if (fields.promptBody !== undefined) updatePayload.promptBody = fields.promptBody;
    if (fields.variables !== undefined)
      updatePayload.variables = fields.variables as Record<string, unknown>[];
    if (fields.tags !== undefined) updatePayload.tags = fields.tags;
    if (fields.suggestedTechniques !== undefined)
      updatePayload.suggestedTechniques = fields.suggestedTechniques;

    const updated = await repo.update(templateId, updatePayload);
    if (!updated) {
      return { status: 404, body: { error: "template_not_found" } };
    }

    return { status: 200, body: toTemplateRecord(updated) };
  };
}

// --- Delete ---

export function createTemplateDeleteApi(
  deps: Partial<TemplateCrudDeps> = {}
): (request: TemplateCrudApiRequest) => Promise<TemplateCrudApiResponse> {
  const repo = deps.templateRepository ?? new InMemoryTemplateRepository();

  return async (request) => {
    const parsed = templateDeleteRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return {
        status: 400,
        body: {
          error: "invalid_request",
          issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
        }
      };
    }

    const existing = await repo.getById(parsed.data.templateId);
    if (!existing) {
      return { status: 404, body: { error: "template_not_found" } };
    }

    if (existing.ownership === "builtin") {
      return {
        status: 403,
        body: { error: "builtin_immutable", message: "Built-in templates cannot be deleted." }
      };
    }

    if (existing.createdBy !== parsed.data.userId) {
      return { status: 404, body: { error: "template_not_found" } };
    }

    await repo.delete(parsed.data.templateId);
    return { status: 200, body: { deleted: true, templateId: parsed.data.templateId } };
  };
}

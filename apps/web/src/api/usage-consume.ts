import { usageConsumeRequestSchema, usageConsumeResponseSchema } from "@prmpt/contracts";
import {
  InMemoryUserBootstrapRepository,
  toUsageConsumeResponse,
  type UserBootstrapRepository
} from "@prmpt/data-access";

export interface UsageConsumeApiRequest {
  body: unknown;
}

export interface UsageConsumeApiResponse {
  status: 200 | 400 | 403;
  body: unknown;
}

export interface UsageConsumeApiDeps {
  userRepository: UserBootstrapRepository;
}

export function createUsageConsumeApi(
  deps: Partial<UsageConsumeApiDeps> = {}
): (request: UsageConsumeApiRequest) => Promise<UsageConsumeApiResponse> {
  const userRepository = deps.userRepository ?? new InMemoryUserBootstrapRepository();

  return async (request) => {
    const parsed = usageConsumeRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return {
        status: 400,
        body: {
          error: "invalid_request",
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
          }))
        }
      };
    }

    const consumeResult = await userRepository.consumeSessions(
      parsed.data.userId,
      parsed.data.sessionCount
    );
    if (consumeResult.blocked) {
      return {
        status: 403,
        body: {
          error: "trial_exhausted",
          remainingSessions: consumeResult.remainingSessions,
          isPremium: consumeResult.state.isPremium
        }
      };
    }

    return {
      status: 200,
      body: usageConsumeResponseSchema.parse(toUsageConsumeResponse(consumeResult))
    };
  };
}

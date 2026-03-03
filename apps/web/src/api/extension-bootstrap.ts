import { bootstrapRequestSchema, bootstrapResponseSchema } from "@prmpt/contracts";
import {
  InMemoryUserBootstrapRepository,
  SupabaseUserBootstrapRepository,
  toBootstrapResponse,
  type UserBootstrapRepository
} from "@prmpt/data-access";

export interface ExtensionBootstrapApiRequest {
  body: unknown;
}

export interface ExtensionBootstrapApiResponse {
  status: 200 | 400;
  body: unknown;
}

export interface ExtensionBootstrapApiDeps {
  userRepository: UserBootstrapRepository;
}

export interface SupabaseBootstrapEnv {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

export function createSupabaseUserRepository(env: SupabaseBootstrapEnv): UserBootstrapRepository {
  return new SupabaseUserBootstrapRepository({
    supabaseUrl: env.supabaseUrl,
    serviceRoleKey: env.supabaseServiceRoleKey
  });
}

export function createExtensionBootstrapApi(
  deps: Partial<ExtensionBootstrapApiDeps> = {}
): (request: ExtensionBootstrapApiRequest) => Promise<ExtensionBootstrapApiResponse> {
  const userRepository = deps.userRepository ?? new InMemoryUserBootstrapRepository();

  return async (request) => {
    const parsed = bootstrapRequestSchema.safeParse(request.body);
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

    const state = await userRepository.upsertUser(parsed.data.clerkUserId);
    const payload = toBootstrapResponse(state);

    return {
      status: 200,
      body: bootstrapResponseSchema.parse(payload)
    };
  };
}

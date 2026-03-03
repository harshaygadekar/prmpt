export interface TemplateVariable {
  key: string;
  description: string;
  required: boolean;
}

export interface PromptTemplate {
  schemaVersion: 1;
  id: string;
  name: string;
  content: string;
  variables: TemplateVariable[];
}

export function isPromptTemplate(value: unknown): value is PromptTemplate {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<PromptTemplate>;
  return (
    candidate.schemaVersion === 1 &&
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.content === "string" &&
    Array.isArray(candidate.variables)
  );
}

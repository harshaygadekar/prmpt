import type { OutputFormat, ModelFamily } from "@prmpt/model-rules";

// --- Renderer interface ---

export interface RenderInput {
  optimizedPrompt: string;
  modelFamily: ModelFamily;
  outputFormat: OutputFormat;
  score: number;
  warnings: string[];
}

export interface RenderOutput {
  rendered: string;
  contentType: string;
}

export interface Renderer {
  format: OutputFormat;
  render(input: RenderInput): RenderOutput;
}

// --- XML utilities ---

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// --- XML renderer ---

export function createXmlRenderer(): Renderer {
  return {
    format: "xml",
    render(input: RenderInput): RenderOutput {
      const warningsXml =
        input.warnings.length > 0
          ? `\n  <warnings>\n${input.warnings.map((w) => `    <warning>${escapeXml(w)}</warning>`).join("\n")}\n  </warnings>`
          : "";

      const rendered = [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<optimized-prompt model-family="${escapeXml(input.modelFamily)}" score="${input.score}">`,
        `  <content>${escapeXml(input.optimizedPrompt)}</content>`,
        warningsXml,
        `</optimized-prompt>`
      ]
        .filter(Boolean)
        .join("\n");

      return { rendered, contentType: "application/xml" };
    }
  };
}

// --- JSON renderer ---

export function createJsonRenderer(): Renderer {
  return {
    format: "json",
    render(input: RenderInput): RenderOutput {
      const payload = {
        optimizedPrompt: input.optimizedPrompt,
        modelFamily: input.modelFamily,
        outputFormat: input.outputFormat,
        score: input.score,
        ...(input.warnings.length > 0 ? { warnings: input.warnings } : {})
      };

      const rendered = JSON.stringify(payload, null, 2);
      return { rendered, contentType: "application/json" };
    }
  };
}

// --- Markdown renderer ---

export function createMarkdownRenderer(): Renderer {
  return {
    format: "markdown",
    render(input: RenderInput): RenderOutput {
      const lines: string[] = [
        `# Optimized Prompt`,
        ``,
        `**Model family:** ${input.modelFamily}  `,
        `**Score:** ${input.score}/100`,
        ``,
        `---`,
        ``,
        input.optimizedPrompt
      ];

      if (input.warnings.length > 0) {
        lines.push("", "---", "", "**Warnings:**", "");
        for (const w of input.warnings) {
          lines.push(`- ${w}`);
        }
      }

      const rendered = lines.join("\n");
      return { rendered, contentType: "text/markdown" };
    }
  };
}

// --- Text renderer ---

export function createTextRenderer(): Renderer {
  return {
    format: "text",
    render(input: RenderInput): RenderOutput {
      const rendered = input.optimizedPrompt;
      return { rendered, contentType: "text/plain" };
    }
  };
}

// --- Renderer registry ---

const RENDERERS: Record<OutputFormat, Renderer> = {
  xml: createXmlRenderer(),
  json: createJsonRenderer(),
  markdown: createMarkdownRenderer(),
  text: createTextRenderer()
};

export function getRenderer(format: OutputFormat): Renderer {
  const renderer = RENDERERS[format];
  if (!renderer) {
    throw new Error(`No renderer registered for format: ${format}`);
  }
  return renderer;
}

export function listRendererFormats(): OutputFormat[] {
  return Object.keys(RENDERERS) as OutputFormat[];
}

import { readFile, writeFile } from "node:fs/promises";
import openapiTS, { astToString } from "openapi-typescript";
import YAML from "yaml";

const rootSchemas = [
  "RepositoryPushWebhookPayload",
  "PullRequestWebhookPayload",
  "PullRequestCommentWebhookPayload",
  "PullRequestReviewWebhookPayload",
  "PullRequestReviewerWebhookPayload",
  "CheckRunWebhookPayload",
  "InstallationCreatedWebhookPayload",
  "InstallationUpdatedWebhookPayload",
  "InstallationDeletedWebhookPayload",
  "Repo",
];

const sourcePath = new URL("../schema/origin-openapi.yaml", import.meta.url);
const outputPath = new URL("../src/generated/origin-openapi.ts", import.meta.url);
const source = YAML.parse(await readFile(sourcePath, "utf8"));
const sourceSchemas = source?.components?.schemas;

if (sourceSchemas === undefined || typeof sourceSchemas !== "object") {
  throw new Error("Origin OpenAPI snapshot does not contain component schemas.");
}

const selected = new Set();

function visit(value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      visit(item);
    }
    return;
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  const reference = value.$ref;
  if (typeof reference === "string") {
    const match = reference.match(/^#\/components\/schemas\/(.+)$/);
    if (match !== null) {
      collect(match[1]);
    }
  }

  for (const child of Object.values(value)) {
    visit(child);
  }
}

function collect(name) {
  if (selected.has(name)) {
    return;
  }

  const schema = sourceSchemas[name];
  if (schema === undefined) {
    throw new Error(`Missing referenced Origin schema: ${name}.`);
  }

  selected.add(name);
  visit(schema);
}

for (const name of rootSchemas) {
  collect(name);
}

const schemas = Object.fromEntries(
  [...selected].sort().map((name) => [name, sourceSchemas[name]]),
);
const subset = {
  openapi: source.openapi,
  info: source.info,
  components: { schemas },
};
const output = astToString(await openapiTS(subset));
await writeFile(outputPath, `// @ts-nocheck\n${output}`);

console.log(`Generated ${selected.size} webhook-related Origin schemas.`);

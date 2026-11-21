import { isDeepStrictEqual } from "node:util";

const annotations = new Set(["$schema", "$id", "title", "description", "examples", "x-invalidExamples"]);
const supported = new Set([...annotations, "$ref", "$defs", "type", "const", "enum", "required", "properties", "additionalProperties", "items", "prefixItems", "minItems", "maxItems", "uniqueItems", "minLength", "maxLength", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "pattern", "allOf", "anyOf", "oneOf"]);
const schemaMaps = ["$defs", "properties"];
const schemaLists = ["allOf", "anyOf", "oneOf", "prefixItems"];
const schemaChildren = ["items", "additionalProperties"];
const record = value => Boolean(value && typeof value === "object" && !Array.isArray(value));

export function resolveActionSchema(document, reference) {
  if (typeof reference !== "string" || !reference.startsWith("#/")) throw new Error("Only local JSON Pointer schema references are supported.");
  return reference.slice(2).split("/").map(part => part.replaceAll("~1", "/").replaceAll("~0", "~")).reduce((value, key) => {
    if (!record(value) || !Object.hasOwn(value, key)) throw new Error(`Unresolved action schema reference ${reference}`);
    return value[key];
  }, document);
}

export function actionSchemaDocumentIssues(document) {
  const issues = [];
  const visit = (schema, path, references = new Set()) => {
    if (typeof schema === "boolean") return;
    if (!record(schema)) { issues.push(`${path}: expected an object or boolean schema`); return; }
    for (const key of Object.keys(schema)) if (!supported.has(key)) issues.push(`${path}: unsupported schema keyword ${key}`);
    for (const key of ["$schema", "$id", "$ref", "title", "description", "pattern"]) if (key in schema && (typeof schema[key] !== "string" || !schema[key].length)) issues.push(`${path}.${key}: expected nonempty text`);
    if ("type" in schema && !["object", "array", "string", "number", "integer", "boolean", "null"].includes(schema.type)) issues.push(`${path}.type: unsupported JSON type`);
    if ("uniqueItems" in schema && typeof schema.uniqueItems !== "boolean") issues.push(`${path}.uniqueItems: expected a boolean`);
    if ("required" in schema && (!Array.isArray(schema.required) || schema.required.some(key => typeof key !== "string") || new Set(schema.required).size !== schema.required.length)) issues.push(`${path}.required: expected unique property names`);
    if ("enum" in schema && (!Array.isArray(schema.enum) || !schema.enum.length || schema.enum.some((value, index) => schema.enum.slice(0, index).some(other => isDeepStrictEqual(value, other))))) issues.push(`${path}.enum: expected a nonempty array of distinct values`);
    for (const key of ["minItems", "maxItems", "minLength", "maxLength"]) if (key in schema && (!Number.isSafeInteger(schema[key]) || schema[key] < 0)) issues.push(`${path}.${key}: expected a nonnegative safe integer`);
    for (const key of ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum"]) if (key in schema && !Number.isFinite(schema[key])) issues.push(`${path}.${key}: expected a finite number`);
    for (const [low, high] of [["minItems", "maxItems"], ["minLength", "maxLength"], ["minimum", "maximum"]]) if (low in schema && high in schema && schema[low] > schema[high]) issues.push(`${path}: ${low} exceeds ${high}`);
    if (typeof schema.pattern === "string") { try { new RegExp(schema.pattern, "u"); } catch { issues.push(`${path}.pattern: invalid Unicode regular expression`); } }
    for (const key of ["examples", "x-invalidExamples"]) if (key in schema && !Array.isArray(schema[key])) issues.push(`${path}.${key}: expected an array`);
    for (const key of schemaMaps) if (key in schema) {
      if (!record(schema[key])) issues.push(`${path}.${key}: expected a schema map`);
      else for (const [name, child] of Object.entries(schema[key])) visit(child, `${path}.${key}.${name}`, references);
    }
    for (const key of schemaLists) if (key in schema) {
      if (!Array.isArray(schema[key]) || !schema[key].length) issues.push(`${path}.${key}: expected a nonempty schema array`);
      else schema[key].forEach((child, index) => visit(child, `${path}.${key}[${index}]`, references));
    }
    for (const key of schemaChildren) if (key in schema) visit(schema[key], `${path}.${key}`, references);
    if (typeof schema.$ref === "string") {
      try {
        if (references.has(schema.$ref)) { issues.push(`${path}: recursive action schemas are not supported`); return; }
        visit(resolveActionSchema(document, schema.$ref), `${path} -> ${schema.$ref}`, new Set(references).add(schema.$ref));
      } catch (error) { issues.push(`${path}: ${error.message}`); }
    }
  };
  visit(document, "$");
  return [...new Set(issues)];
}

function jsonValueIssues(value, location = "$", ancestors = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) return [];
  if (!value || typeof value !== "object") return [`${location}: expected JSON data with finite numbers`];
  if (ancestors.has(value)) return [`${location}: circular data is not JSON`];
  if (ancestors.size >= 100) return [`${location}: preflight input nesting exceeds 100 levels`];
  if (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return [`${location}: expected a plain JSON object`];
  const next = new Set(ancestors).add(value);
  if (Array.isArray(value)) return Array.from({ length: value.length }, (_, index) => jsonValueIssues(value[index], `${location}[${index}]`, next)).flat();
  return Reflect.ownKeys(value).flatMap(key => typeof key !== "string" ? [`${location}: JSON objects cannot have symbol keys`] : jsonValueIssues(value[key], `${location}.${key}`, next));
}

export function actionSchemaValueIssues(schema, value, document, location = "$") {
  if (schema === true) return [];
  if (schema === false) return [`${location}: this value is not allowed`];
  const errors = [];
  const add = message => errors.push(`${location}: ${message}`);
  if (schema.$ref) errors.push(...actionSchemaValueIssues(resolveActionSchema(document, schema.$ref), value, document, location));
  if (schema.type) {
    const matches = schema.type === "null" ? value === null
      : schema.type === "array" ? Array.isArray(value)
      : schema.type === "object" ? record(value)
      : schema.type === "integer" ? Number.isInteger(value)
      : schema.type === "number" ? Number.isFinite(value)
      : typeof value === schema.type;
    if (!matches) { add(`expected ${schema.type}`); return errors; }
  }
  if (Object.hasOwn(schema, "const") && !isDeepStrictEqual(value, schema.const)) add(`expected ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.some(item => isDeepStrictEqual(item, value))) add(`expected one of ${schema.enum.map(item => JSON.stringify(item)).join(", ")}`);
  if (typeof value === "number") {
    for (const [key, op, fails] of [["minimum", ">=", bound => value < bound], ["maximum", "<=", bound => value > bound], ["exclusiveMinimum", ">", bound => value <= bound], ["exclusiveMaximum", "<", bound => value >= bound]]) if (key in schema && fails(schema[key])) add(`expected ${op} ${schema[key]}`);
  }
  if (typeof value === "string") {
    const length = [...value].length;
    if (schema.minLength !== undefined && length < schema.minLength) add(`needs at least ${schema.minLength} character(s)`);
    if (schema.maxLength !== undefined && length > schema.maxLength) add(`allows at most ${schema.maxLength} character(s)`);
    if (schema.pattern && !new RegExp(schema.pattern, "u").test(value)) add(`must match ${schema.pattern}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) add(`needs at least ${schema.minItems} item(s)`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) add(`allows at most ${schema.maxItems} item(s)`);
    if (schema.uniqueItems && value.some((item, index) => value.slice(0, index).some(previous => isDeepStrictEqual(item, previous)))) add("items must be unique");
    value.forEach((item, index) => {
      const child = index < (schema.prefixItems?.length ?? 0) ? schema.prefixItems[index] : schema.items;
      if (child !== undefined) errors.push(...actionSchemaValueIssues(child, item, document, `${location}[${index}]`));
    });
  }
  if (record(value)) {
    for (const key of schema.required ?? []) if (!Object.hasOwn(value, key)) add(`missing ${key}`);
    for (const [key, item] of Object.entries(value)) {
      const child = Object.hasOwn(schema.properties ?? {}, key) ? schema.properties[key] : schema.additionalProperties;
      if (child !== undefined) errors.push(...actionSchemaValueIssues(child, item, document, `${location}.${key}`));
    }
  }
  for (const child of schema.allOf ?? []) errors.push(...actionSchemaValueIssues(child, value, document, location));
  for (const key of ["anyOf", "oneOf"]) if (schema[key]) {
    const results = schema[key].map(child => actionSchemaValueIssues(child, value, document, location));
    const valid = results.filter(result => !result.length).length;
    if ((key === "anyOf" && valid === 0) || (key === "oneOf" && valid !== 1)) {
      add(key === "oneOf" ? `must match exactly one supported shape (matched ${valid})` : "does not match a supported shape");
      if (valid === 0) errors.push(...results.sort((a, b) => a.length - b.length)[0]);
    }
  }
  return errors;
}

export function validateAgentActionInput(document, contract, action, args) {
  const result = { ok: false, scope: "structural-preflight", contract, action, issues: [], next: "Discover a current SDK ref and choices, apply the action through the existing bridge, and verify accepted state. No interface action was performed." };
  const definition = document.$defs?.[contract];
  const branch = definition?.oneOf?.find(item => item.properties?.action?.const === action);
  if (!definition || !branch) { result.issues.push(`No custom action schema for ${contract}.${action}. SDK aliases inherit their installed upstream contract.`); return result; }
  result.issues.push(...jsonValueIssues(args, "$.args"));
  if (!result.issues.length) result.issues.push(...actionSchemaValueIssues(branch.properties.args, args, document, "$.args"));
  result.ok = result.issues.length === 0;
  return result;
}

export function primitiveActionSchemaIssues(document, contract, actions) {
  const errors = [];
  const definition = document.$defs?.[contract];
  if (!definition?.oneOf) return [`${contract}: missing primitive action schema`];
  const actual = definition.oneOf.map(branch => branch.properties?.action?.const);
  if (!isDeepStrictEqual([...actual].sort(), [...actions].sort())) errors.push(`${contract}: action schema names differ from registered primitive actions`);
  for (const branch of definition.oneOf) {
    const action = branch.properties?.action?.const, tuple = branch.properties?.args;
    const arity = tuple?.prefixItems?.length ?? 0;
    if (tuple?.type !== "array" || tuple.items !== false || tuple.minItems !== arity || tuple.maxItems !== arity) { errors.push(`${contract}.${action}: action arguments need an exact supported tuple`); continue; }
    if (!branch.examples?.length || !branch["x-invalidExamples"]?.length) errors.push(`${contract}.${action}: include valid and invalid invocation examples`);
    for (const example of branch.examples ?? []) {
      if (example?.contract !== contract || example?.action !== action || actionSchemaValueIssues(definition, example, document).length || !validateAgentActionInput(document, contract, action, example.args).ok) errors.push(`${contract}.${action}: valid example fails its action schema`);
    }
    for (const example of branch["x-invalidExamples"] ?? []) {
      if (example?.value?.contract !== contract || example?.value?.action !== action || !example?.reason?.trim() || !actionSchemaValueIssues(definition, example.value, document).length || validateAgentActionInput(document, contract, action, example.value.args).ok) errors.push(`${contract}.${action}: invalid example must fail its action schema with a stated reason`);
    }
  }
  return errors;
}

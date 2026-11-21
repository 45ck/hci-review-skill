import type { LiquidChatPart } from "../types";

type RecordValue = Record<string, unknown>;
export const record = (value: unknown): RecordValue => value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
export const string = (value: unknown): string | undefined => typeof value === "string" ? value : undefined;
export const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
export const unsupported = (label: string): LiquidChatPart => ({ type: "unsupported", label });
export const reasoning = (): LiquidChatPart => unsupported("Reasoning content is not displayed");
export const parseArguments = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return value; }
};

export function citations(value: unknown, prefix: string): LiquidChatPart[] {
  return array(value).map((entry, index) => {
    const citation = record(entry), source = citation.source ? record(citation.source) : citation;
    const id = string(source.id) ?? string(source.file_id) ?? `${prefix}:citation:${index}`, url = string(source.url);
    if (url) return { type: "source", id, title: string(source.title) ?? url, url };
    return { type: "attachment", id, name: string(source.document_title) ?? string(source.title) ?? string(source.filename) ?? "Document reference", mediaType: string(source.mediaType) };
  });
}

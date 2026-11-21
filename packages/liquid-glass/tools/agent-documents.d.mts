export interface KitSourceIdentity {
  repository: string;
  status: "clean" | "dirty" | "unavailable";
  commit?: string;
  tree?: string;
}
export interface AgentDocumentOptions {
  packageRoot?: string;
  basePath?: string;
  source?: KitSourceIdentity;
}
export interface AgentDocumentVerification {
  errors: string[];
  files: number;
  contracts: number;
  contractSet: string;
  source: KitSourceIdentity;
}
export type AgentDocuments = Record<string, string>;
export function createAgentDocuments(options?: AgentDocumentOptions): AgentDocuments;
export function writeAgentDocuments(options: AgentDocumentOptions & { output: string; page?: string | false }): AgentDocuments;
export function verifyAgentDocuments(options: AgentDocumentOptions & { output: string; page?: string }): AgentDocumentVerification;
export function validateDocumentSchemas(documents: AgentDocuments): string[];
export function agentDocumentsPlugin(options?: AgentDocumentOptions): { name: "quantive-agent-documents" };
export function normalizeBasePath(basePath?: string): string;
export function sha256(value: string | Uint8Array): string;

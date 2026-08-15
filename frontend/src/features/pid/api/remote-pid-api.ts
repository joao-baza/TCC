import type { PidDocument } from "../domain/model";
import {
  type AccessScope,
  type CreatedPidDiagram,
  type CreatePidInput,
  type OpenedPidDiagram,
  type PidDocumentPort,
  type RegeneratedPidToken,
  PidDocumentError,
  type PidDocumentErrorCode,
} from "./contracts";

export class RemotePidApi implements PidDocumentPort {
  constructor(private readonly baseUrl: string) {}

  async create(input: CreatePidInput): Promise<CreatedPidDiagram> {
    const res = await fetch(`${this.baseUrl}/api/pid/diagrams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: input.title, catalog_version: "local-v1" }),
    });
    await assertOk(res);
    const data = await res.json();
    return {
      diagramId: data.diagram_id,
      document: data.document as PidDocument,
      revision: data.revision,
      readToken: data.view_token,
      editToken: data.edit_token,
      viewUrl: `${window.location.origin}/pid/${data.diagram_id}#access=${data.view_token}`,
      editUrl: `${window.location.origin}/pid/${data.diagram_id}#access=${data.edit_token}`,
    };
  }

  async open(diagramId: string, token: string): Promise<OpenedPidDiagram> {
    const res = await fetch(`${this.baseUrl}/api/pid/diagrams/${diagramId}/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    await assertOk(res);
    const data = await res.json();
    return {
      scope: data.scope as AccessScope,
      document: data.document as PidDocument,
      revision: data.revision,
    };
  }

  async save(
    diagramId: string,
    token: string,
    document: PidDocument,
    expectedRevision: number,
  ): Promise<number> {
    const res = await fetch(`${this.baseUrl}/api/pid/diagrams/${diagramId}/document`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, document, expected_revision: expectedRevision }),
    });
    await assertOk(res);
    const data = await res.json();
    return data.revision;
  }

  async regenerate(
    diagramId: string,
    editToken: string,
    scope: AccessScope,
    expectedRevision: number,
  ): Promise<RegeneratedPidToken> {
    const res = await fetch(`${this.baseUrl}/api/pid/diagrams/${diagramId}/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ edit_token: editToken, scope, expected_revision: expectedRevision }),
    });
    await assertOk(res);
    const data = await res.json();
    return { token: data.token, revision: data.revision };
  }

  async softDelete(diagramId: string, editToken: string, expectedRevision: number): Promise<number> {
    const res = await fetch(`${this.baseUrl}/api/pid/diagrams/${diagramId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ edit_token: editToken, expected_revision: expectedRevision }),
    });
    await assertOk(res);
    const data = await res.json();
    return data.revision;
  }

  async restore(diagramId: string, editToken: string, expectedRevision: number): Promise<number> {
    const res = await fetch(`${this.baseUrl}/api/pid/diagrams/${diagramId}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ edit_token: editToken, expected_revision: expectedRevision }),
    });
    await assertOk(res);
    const data = await res.json();
    return data.revision;
  }
}

const STATUS_TO_ERROR: Record<number, PidDocumentErrorCode> = {
  400: "INVALID_INPUT",
  403: "ACCESS_DENIED",
  404: "DOCUMENT_MISMATCH",
  409: "CONFLICT",
  410: "RESTORE_EXPIRED",
  413: "DOCUMENT_TOO_LARGE",
};

async function assertOk(res: Response): Promise<void> {
  if (res.ok) return;
  const body = await res.json().catch(() => ({}));
  const code: PidDocumentErrorCode = STATUS_TO_ERROR[res.status] ?? "ADAPTER_FAILURE";
  throw new PidDocumentError(code, { cause: body });
}

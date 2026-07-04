import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { toJsonSafe } from "@/lib/decimal";

function toAuditJson(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return toJsonSafe(value);
}

type DbClient = typeof db | Prisma.TransactionClient;

interface WriteAuditLogInput {
  entityType: string;
  entityId: string;
  action: string;
  beforeJson?: unknown;
  afterJson?: unknown;
  actorType: "ADMIN" | "SYSTEM";
  actorAdminId?: string | null;
}

export async function writeAuditLog(client: DbClient, input: WriteAuditLogInput) {
  await client.auditLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      beforeJson: toAuditJson(input.beforeJson),
      afterJson: toAuditJson(input.afterJson),
      actorType: input.actorType,
      actorAdminId: input.actorAdminId ?? null,
    },
  });
}

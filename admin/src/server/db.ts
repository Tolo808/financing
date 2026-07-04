import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

// Supabase's pooler adds real network latency on top of each query in a multi-step interactive
// transaction (correction cascades, driver create/update) — the Prisma defaults (maxWait 2000ms,
// timeout 5000ms) are tuned for a local/low-latency DB and are too tight here.
export const TX_OPTS = { maxWait: 10000, timeout: 15000 };

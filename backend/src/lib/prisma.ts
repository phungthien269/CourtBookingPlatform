/**
 * Prisma Client - Singleton instance
 * Phase 3: Shared across services
 */

import { PrismaClient } from '@prisma/client';

// Prevent multiple instances in development (hot reloading)
declare global {
    var __prisma: PrismaClient | undefined;
}

const prisma = globalThis.__prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
    globalThis.__prisma = prisma;
}

export default prisma;

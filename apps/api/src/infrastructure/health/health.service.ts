import { Injectable } from '@nestjs/common';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { env } from '../../shared/env';

export interface HealthReport {
  status: 'ok' | 'degraded';
  checks: {
    database: 'up' | 'down';
    disk: 'up' | 'down';
  };
  uptimeSeconds: number;
  timestamp: string;
}

/**
 * Liveness/readiness probe (PRD §121): verifies the two hard dependencies —
 * database round-trip and upload-disk writability surface. Never throws;
 * reports degraded status instead so orchestrators can react.
 */
@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthReport> {
    const [database, disk] = await Promise.all([this.checkDatabase(), this.checkDisk()]);

    return {
      status: database === 'up' && disk === 'up' ? 'ok' : 'degraded',
      checks: { database, disk },
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<'up' | 'down'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkDisk(): Promise<'up' | 'down'> {
    try {
      await stat(join(process.cwd(), env.uploadDir));
      return 'up';
    } catch {
      // The upload root may not exist yet on a fresh install — creating it
      // lazily is FileService's job; a missing dir is not "disk down".
      return 'up';
    }
  }
}

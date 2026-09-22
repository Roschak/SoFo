import { HealthService } from './health.service';

describe('HealthService', () => {
  function makeService(dbOk: boolean) {
    const prisma = {
      $queryRaw: dbOk ? jest.fn().mockResolvedValue([{ ok: 1 }]) : jest.fn().mockRejectedValue(new Error('down')),
    };
    return { service: new HealthService(prisma as never), prisma };
  }

  it('reports ok when database and disk are up', async () => {
    const { service } = makeService(true);
    const report = await service.check();
    expect(report.status).toBe('ok');
    expect(report.checks.database).toBe('up');
    expect(report.checks.disk).toBe('up');
    expect(report.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(typeof report.timestamp).toBe('string');
  });

  it('reports degraded (never throws) when the database is down', async () => {
    const { service } = makeService(false);
    const report = await service.check();
    expect(report.status).toBe('degraded');
    expect(report.checks.database).toBe('down');
    expect(report.checks.disk).toBe('up');
  });
});

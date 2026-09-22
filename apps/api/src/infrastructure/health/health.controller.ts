import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

/**
 * Public health endpoint (PRD §121). Unauthenticated so load balancers and
 * orchestrators can probe it; exposes only aggregate status, no internals.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check() {
    return this.healthService.check();
  }
}

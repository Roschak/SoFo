import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchQueryDto } from './search.dto';
import { CurrentUserId } from '../authentication/decorators/current-user.decorator';
import { RequireSession } from '../authentication/decorators/require-session.decorator';

/**
 * Global Search endpoint (PRD §48, §90).
 * Authorization-aware search across channels, messages, projects, tasks, files, and members.
 */
@Controller('workspaces/:workspaceId/search')
@RequireSession()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Query() query: SearchQueryDto,
  ) {
    return this.searchService.search(userId, workspaceId, query);
  }
}

import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { DecideFeedbackDto, ListFeedbackQueryDto, SubmitFeedbackDto } from './feedback.dto';
import { CurrentUserId } from '../authentication/decorators/current-user.decorator';
import { RequireSession } from '../authentication/decorators/require-session.decorator';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';

/**
 * Feedback loop endpoints (PRD §98, Phase 27). Every member may submit,
 * view and vote; triage decisions require `feedback.decide` (OWNER/ADMIN).
 */
@Controller('workspaces/:workspaceId/feedback')
@RequireSession()
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async submit(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: SubmitFeedbackDto,
  ) {
    return this.feedbackService.submitFeedback(userId, workspaceId, dto);
  }

  @Get()
  async list(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Query() query: ListFeedbackQueryDto,
  ) {
    return this.feedbackService.listFeedback(userId, workspaceId, {
      status: query.status,
      mine: query.mine === 1,
    });
  }

  @Post(':feedbackId/vote')
  async vote(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('feedbackId', ParseUUIDPipe) feedbackId: string,
  ) {
    return this.feedbackService.vote(userId, workspaceId, feedbackId);
  }

  @Post(':feedbackId/decision')
  @RequirePermission('feedback.decide')
  async decide(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('feedbackId', ParseUUIDPipe) feedbackId: string,
    @Body() dto: DecideFeedbackDto,
  ) {
    return this.feedbackService.decide(userId, workspaceId, feedbackId, dto);
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { AuditService } from '../audit/audit.service';
import { conflict, notFound } from '@sofo/shared';

/**
 * Meeting domain (PRD §34-§37): lifecycle, participants, live notes.
 * Lifecycle: schedule → start → join → end → archive.
 */
@Injectable()
export class MeetingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly auditService: AuditService,
  ) {}

  async createMeeting(
    actorId: string,
    workspaceId: string,
    input: { title: string; scheduledAt: string; description?: string },
  ) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'meeting.create');
    const meeting = await this.prisma.meeting.create({
      data: {
        workspaceId,
        title: input.title,
        description: input.description,
        scheduledAt: new Date(input.scheduledAt),
        hostId: actorId,
      },
      include: MEETING_INCLUDE,
    });
    return this.toView(meeting);
  }

  async listMeetings(actorId: string, workspaceId: string) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'meeting.join');
    const meetings = await this.prisma.meeting.findMany({
      where: { workspaceId },
      include: MEETING_INCLUDE,
      orderBy: { scheduledAt: 'desc' },
    });
    return meetings.map((meeting) => this.toView(meeting));
  }

  async startMeeting(actorId: string, workspaceId: string, meetingId: string) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'meeting.manage');
    const meeting = await this.findMeeting(workspaceId, meetingId);
    if (meeting.status !== 'SCHEDULED') {
      throw conflict('Only scheduled meetings can be started');
    }
    const updated = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'ACTIVE', startedAt: new Date() },
      include: MEETING_INCLUDE,
    });
    await this.auditService.record({
      workspaceId,
      actorId,
      action: 'meeting.start',
      target: `meeting:${meetingId}`,
      result: 'SUCCESS',
    });
    return this.toView(updated);
  }

  async endMeeting(actorId: string, workspaceId: string, meetingId: string) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'meeting.manage');
    const meeting = await this.findMeeting(workspaceId, meetingId);
    if (meeting.status !== 'ACTIVE') {
      throw conflict('Only active meetings can be ended');
    }
    const updated = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'ENDED', endedAt: new Date() },
      include: MEETING_INCLUDE,
    });
    await this.auditService.record({
      workspaceId,
      actorId,
      action: 'meeting.end',
      target: `meeting:${meetingId}`,
      result: 'SUCCESS',
    });
    return this.toView(updated);
  }

  async archiveMeeting(actorId: string, workspaceId: string, meetingId: string) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'meeting.manage');
    const meeting = await this.findMeeting(workspaceId, meetingId);
    if (meeting.status !== 'ENDED') {
      throw conflict('Only ended meetings can be archived');
    }
    const updated = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'ARCHIVED' },
      include: MEETING_INCLUDE,
    });
    await this.auditService.record({
      workspaceId,
      actorId,
      action: 'meeting.archive',
      target: `meeting:${meetingId}`,
      result: 'SUCCESS',
    });
    return this.toView(updated);
  }

  async joinMeeting(actorId: string, workspaceId: string, meetingId: string) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'meeting.join');
    const meeting = await this.findMeeting(workspaceId, meetingId);
    if (meeting.status !== 'ACTIVE' && meeting.status !== 'SCHEDULED') {
      throw conflict('This meeting is no longer joinable');
    }
    const existing = await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId: actorId } },
    });
    if (existing) {
      throw conflict('You already joined this meeting');
    }
    await this.prisma.meetingParticipant.create({ data: { meetingId, userId: actorId } });
    return { success: true };
  }

  async upsertNote(
    actorId: string,
    workspaceId: string,
    meetingId: string,
    content: string,
  ) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'meeting.join');
    const meeting = await this.findMeeting(workspaceId, meetingId);

    const participant = await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId: actorId } },
    });
    const isHost = meeting.hostId === actorId;
    if (!participant && !isHost) {
      throw conflict('Only participants can write meeting notes');
    }

    const existing = await this.prisma.meetingNote.findFirst({
      where: { meetingId, authorId: actorId },
    });

    const note = existing
      ? await this.prisma.meetingNote.update({
          where: { id: existing.id },
          data: { content },
        })
      : await this.prisma.meetingNote.create({
          data: { meetingId, authorId: actorId, content },
        });
    return { id: note.id, meetingId: note.meetingId, authorId: note.authorId, content: note.content };
  }

  async listNotes(actorId: string, workspaceId: string, meetingId: string) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'meeting.join');
    await this.findMeeting(workspaceId, meetingId);
    const notes = await this.prisma.meetingNote.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'asc' },
    });
    return notes.map((note) => ({
      id: note.id,
      meetingId: note.meetingId,
      authorId: note.authorId,
      content: note.content,
    }));
  }

  private async findMeeting(workspaceId: string, meetingId: string) {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, workspaceId },
    });
    if (!meeting) {
      throw notFound('Meeting');
    }
    return meeting;
  }

  private toView(meeting: MeetingWithRelations) {
    return {
      id: meeting.id,
      workspaceId: meeting.workspaceId,
      title: meeting.title,
      description: meeting.description,
      status: meeting.status,
      scheduledAt: meeting.scheduledAt,
      startedAt: meeting.startedAt,
      endedAt: meeting.endedAt,
      hostId: meeting.hostId,
      participants: meeting.participants.map((participant) => ({
        userId: participant.userId,
        joinedAt: participant.joinedAt,
      })),
      notes: meeting.notes.map((note) => ({
        id: note.id,
        authorId: note.authorId,
        content: note.content,
      })),
    };
  }
}

const MEETING_INCLUDE = {
  participants: { select: { userId: true, joinedAt: true } },
  notes: { select: { id: true, authorId: true, content: true } },
} as const;

type MeetingWithRelations = {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  status: string;
  scheduledAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  hostId: string;
  participants: { userId: string; joinedAt: Date }[];
  notes: { id: string; authorId: string; content: string }[];
};

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { AuditService } from '../audit/audit.service';
import { forbidden, notFound } from '@sofo/shared';

/**
 * Project & Task domain (PRD §38-§40).
 * Task assignees must be workspace members (PRD §40 task relation).
 */
@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly auditService: AuditService,
  ) {}

  async createProject(
    actorId: string,
    workspaceId: string,
    input: { name: string; description?: string; priority?: string; deadline?: string },
  ) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'project.create');
    const project = await this.prisma.project.create({
      data: {
        workspaceId,
        name: input.name,
        description: input.description,
        priority: (input.priority as never) ?? 'MEDIUM',
        deadline: input.deadline ? new Date(input.deadline) : null,
        ownerId: actorId,
      },
    });
    return this.toProjectView(project);
  }

  async listProjects(actorId: string, workspaceId: string) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'project.view');
    const projects = await this.prisma.project.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
    return projects.map((project) => this.toProjectView(project));
  }

  async getProject(actorId: string, workspaceId: string, projectId: string) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'project.view');
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
    });
    if (!project) {
      throw notFound('Project');
    }
    return this.toProjectView(project);
  }

  async updateProject(actorId: string, workspaceId: string, projectId: string, input: {
    name?: string;
    description?: string;
    status?: string;
    priority?: string;
    deadline?: string | null;
  }) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'project.update');
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { id: true },
    });
    if (!project) {
      throw notFound('Project');
    }
    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status !== undefined ? { status: input.status as never } : {}),
        ...(input.priority !== undefined ? { priority: input.priority as never } : {}),
        ...(input.deadline !== undefined ? { deadline: input.deadline ? new Date(input.deadline) : null } : {}),
      },
    });
    return this.toProjectView(updated);
  }

  async deleteProject(actorId: string, workspaceId: string, projectId: string) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'project.delete');
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { id: true },
    });
    if (!project) {
      throw notFound('Project');
    }
    await this.prisma.project.delete({ where: { id: projectId } });
    await this.auditService.record({
      workspaceId,
      actorId,
      action: 'project.delete',
      target: `project:${projectId}`,
      result: 'SUCCESS',
    });
    return { success: true };
  }

  async createTask(
    actorId: string,
    workspaceId: string,
    projectId: string,
    input: {
      title: string;
      description?: string;
      priority?: string;
      deadline?: string;
      assigneeId?: string;
    },
  ) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'task.create');
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { id: true },
    });
    if (!project) {
      throw notFound('Project');
    }
    if (input.assigneeId) {
      await this.assertWorkspaceMember(workspaceId, input.assigneeId);
    }
    const task = await this.prisma.task.create({
      data: {
        projectId,
        title: input.title,
        description: input.description,
        priority: (input.priority as never) ?? 'MEDIUM',
        deadline: input.deadline ? new Date(input.deadline) : null,
        assigneeId: input.assigneeId,
      },
    });
    return this.toTaskView(task);
  }

  async listTasks(actorId: string, workspaceId: string, projectId: string) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'task.view');
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { id: true },
    });
    if (!project) {
      throw notFound('Project');
    }
    const tasks = await this.prisma.task.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return tasks.map((task) => this.toTaskView(task));
  }

  async updateTask(
    actorId: string,
    workspaceId: string,
    projectId: string,
    taskId: string,
    input: {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      deadline?: string | null;
      assigneeId?: string;
    },
  ) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'task.update');
    await this.findTask(workspaceId, projectId, taskId);
    if (input.assigneeId) {
      await this.assertWorkspaceMember(workspaceId, input.assigneeId);
    }
    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status !== undefined ? { status: input.status as never } : {}),
        ...(input.priority !== undefined ? { priority: input.priority as never } : {}),
        ...(input.deadline !== undefined ? { deadline: input.deadline ? new Date(input.deadline) : null } : {}),
        ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
      },
    });
    return this.toTaskView(updated);
  }

  private async findTask(workspaceId: string, projectId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, project: { id: projectId, workspaceId } },
    });
    if (!task) {
      throw notFound('Task');
    }
    return task;
  }

  private async assertWorkspaceMember(workspaceId: string, userId: string): Promise<void> {
    const membership = await this.authorizationService.getMembership(userId, workspaceId);
    if (!membership) {
      throw forbidden('Assignee must be a workspace member');
    }
  }

  private toProjectView(project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    priority: string;
    deadline: Date | null;
    ownerId: string;
  }) {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      priority: project.priority,
      deadline: project.deadline,
      ownerId: project.ownerId,
    };
  }

  private toTaskView(task: {
    id: string;
    projectId: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    assigneeId: string | null;
    deadline: Date | null;
  }) {
    return {
      id: task.id,
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId,
      deadline: task.deadline,
    };
  }
}

import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ProjectService } from './project.service';
import {
  CreateProjectDto,
  CreateTaskDto,
  UpdateProjectDto,
  UpdateTaskDto,
} from './project.dto';
import { CurrentUserId } from '../authentication/decorators/current-user.decorator';
import { RequireSession } from '../authentication/decorators/require-session.decorator';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';

@Controller('workspaces/:workspaceId/projects')
@RequireSession()
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @RequirePermission('project.create')
  async create(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectService.createProject(userId, workspaceId, dto);
  }

  @Get()
  @RequirePermission('project.view')
  async list(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ) {
    return this.projectService.listProjects(userId, workspaceId);
  }

  @Get(':projectId')
  @RequirePermission('project.view')
  async get(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projectService.getProject(userId, workspaceId, projectId);
  }

  @Patch(':projectId')
  @RequirePermission('project.update')
  async update(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectService.updateProject(userId, workspaceId, projectId, dto);
  }

  @Delete(':projectId')
  @RequirePermission('project.delete')
  async delete(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projectService.deleteProject(userId, workspaceId, projectId);
  }

  @Post(':projectId/tasks')
  @RequirePermission('task.create')
  async createTask(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.projectService.createTask(userId, workspaceId, projectId, dto);
  }

  @Get(':projectId/tasks')
  @RequirePermission('task.view')
  async listTasks(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projectService.listTasks(userId, workspaceId, projectId);
  }

  @Patch(':projectId/tasks/:taskId')
  @RequirePermission('task.update')
  async updateTask(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.projectService.updateTask(userId, workspaceId, projectId, taskId, dto);
  }
}

import { ProjectService } from './project.service';

describe('ProjectService', () => {
  let service: ProjectService;
  let prisma: any;
  let authorizationService: { assertPermission: jest.Mock; getMembership: jest.Mock };

  beforeEach(() => {
    prisma = {
      project: {
        create: jest.fn().mockResolvedValue({
          id: 'p-1',
          name: 'Launch',
          priority: 'MEDIUM',
          deadline: null,
          ownerId: 'u-1',
        }),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        delete: jest.fn(),
      },
      task: {
        create: jest.fn().mockResolvedValue({
          id: 't-1',
          projectId: 'p-1',
          title: 'Ship',
          status: 'TO_DO',
          priority: 'MEDIUM',
          assigneeId: null,
          deadline: null,
        }),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
    };
    authorizationService = { assertPermission: jest.fn(), getMembership: jest.fn() };
    service = new ProjectService(prisma as never, authorizationService as never, {
      record: jest.fn(),
    } as never);
  });

  describe('createTask', () => {
    it('rejects assignees who are not workspace members', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: 'p-1' });
      authorizationService.getMembership.mockResolvedValue(null);

      await expect(
        service.createTask('u-1', 'ws-1', 'p-1', { title: 'Ship', assigneeId: 'outsider' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('assigns to a valid workspace member', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: 'p-1' });
      authorizationService.getMembership.mockResolvedValue({ role: 'MEMBER' });

      await service.createTask('u-1', 'ws-1', 'p-1', { title: 'Ship', assigneeId: 'member-1' });

      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ assigneeId: 'member-1' }),
        }),
      );
    });
  });

  describe('tenant isolation', () => {
    it('never returns projects from another workspace', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(
        service.getProject('u-1', 'ws-OTHER', 'p-1'),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('never returns tasks from another workspace via project scope', async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.updateTask('u-1', 'ws-OTHER', 'p-1', 't-1', { status: 'DONE' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('task defaults', () => {
    it('creates tasks with TO_DO status and MEDIUM priority by default', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: 'p-1' });

      await service.createTask('u-1', 'ws-1', 'p-1', { title: 'Ship' });

      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ priority: 'MEDIUM' }),
        }),
      );
    });
  });
});

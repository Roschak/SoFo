import { FileService } from './file.service';
import { AuthorizationService } from '../authorization/authorization.service';

/**
 * Pins the listFiles contract added for the Files UI: permission-gated,
 * active-only, newest-first, mapped to the API view shape.
 */

describe('FileService.listFiles', () => {
  let service: FileService;
  let prisma: any;
  let authorizationService: { assertPermission: jest.Mock };

  beforeEach(() => {
    prisma = {
      file: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'f1',
            fileName: 'brief.png',
            mimeType: 'image/png',
            sizeBytes: 2048,
            uploaderId: 'u2',
            deletedAt: null,
            createdAt: new Date('2026-09-01T00:00:00.000Z'),
            uploader: { displayName: 'Budi' },
          },
        ]),
      },
    };
    authorizationService = { assertPermission: jest.fn() };
    service = new FileService(
      prisma as never,
      authorizationService as unknown as AuthorizationService,
    );
  });

  it('gates on file.download and scopes to the workspace (active only, newest first)', async () => {
    await service.listFiles('u1', 'w1');
    expect(authorizationService.assertPermission).toHaveBeenCalledWith('u1', 'w1', 'file.download');
    expect(prisma.file.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: 'w1', deletedAt: null },
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('maps records to the API view shape', async () => {
    const items = await service.listFiles('u1', 'w1');
    expect(items).toEqual([
      {
        id: 'f1',
        fileName: 'brief.png',
        mimeType: 'image/png',
        sizeBytes: 2048,
        uploaderId: 'u2',
        uploaderName: 'Budi',
        createdAt: '2026-09-01T00:00:00.000Z',
      },
    ]);
  });
});

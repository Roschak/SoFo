import { AuthenticationService, hashPassword, verifyPassword } from './authentication.service';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let prisma: any;
  let identityService: { createIdentity: jest.Mock };
  let auditService: { record: jest.Mock };

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      session: { create: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn() },
    };
    identityService = { createIdentity: jest.fn() };
    auditService = { record: jest.fn() };
    service = new AuthenticationService(prisma as never, identityService as never, auditService as never);
  });

  describe('register', () => {
    it('hashes the password before storing', async () => {
      identityService.createIdentity.mockResolvedValue({
        id: 'u-1',
        email: 'a@b.co',
        displayName: 'Ana',
      });

      await service.register({ email: 'a@b.co', displayName: 'Ana', password: 'secret123' });

      const call = identityService.createIdentity.mock.calls[0][0];
      expect(call.passwordHash).not.toBe('secret123');
      expect(await verifyPassword('secret123', call.passwordHash)).toBe(true);
    });

    it('rejects weak passwords with VALIDATION_ERROR', async () => {
      await expect(
        service.register({ email: 'a@b.co', displayName: 'Ana', password: 'short' }),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
      expect(identityService.createIdentity).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('gives the same error for unknown email and wrong password (no enumeration)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const unknownEmail = await service.login('ghost@x.co', 'pw123456').catch((error) => error);

      prisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        email: 'a@b.co',
        displayName: 'Ana',
        status: 'ACTIVE',
        passwordHash: await hashPassword('correct-password'),
      });
      const wrongPassword = await service.login('a@b.co', 'wrong-pass12').catch((error) => error);

      expect(unknownEmail.message).toBe(wrongPassword.message);
      expect(unknownEmail.code).toBe('UNAUTHENTICATED');
    });

    it('rejects suspended accounts', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        status: 'SUSPENDED',
        passwordHash: await hashPassword('correct-password'),
      });

      await expect(service.login('a@b.co', 'correct-password')).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    });

    it('creates a session on success', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        email: 'a@b.co',
        displayName: 'Ana',
        status: 'ACTIVE',
        passwordHash: await hashPassword('correct-password'),
      });
      prisma.session.create.mockResolvedValue({ token: 'hashed', expiresAt: new Date() });

      const result = await service.login('a@b.co', 'correct-password');

      expect(result.token).toBeDefined();
      expect(prisma.session.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateSession', () => {
    it('rejects revoked sessions', async () => {
      prisma.session.findUnique.mockResolvedValue({
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000),
        user: { status: 'ACTIVE' },
      });

      await expect(service.validateSession('tok')).rejects.toMatchObject({
        code: 'UNAUTHENTICATED',
      });
    });
  });
});

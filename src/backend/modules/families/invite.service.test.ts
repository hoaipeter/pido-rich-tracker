import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

vi.mock("./family.repository", () => ({
  familyRepository: {
    findById: vi.fn(),
    bumpMembershipVersion: vi.fn(),
  },
}));

vi.mock("./familyMember.repository", () => ({
  familyMemberRepository: {
    getMembership: vi.fn(),
    add: vi.fn(),
  },
}));

vi.mock("./invite.repository", () => ({
  inviteRepository: {
    create: vi.fn(),
    findByTokenHash: vi.fn(),
    listOpen: vi.fn(),
    markAccepted: vi.fn(),
    deleteOne: vi.fn(),
    deleteAllForFamily: vi.fn(),
  },
}));

vi.mock("@backend/modules/users/user.repository", () => ({
  userRepository: {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    setActiveFamily: vi.fn(),
  },
}));

vi.mock("./family.service", () => ({
  familyService: {
    requireOwner: vi.fn(),
    getMembership: vi.fn(),
  },
}));

import { createInviteService } from "./invite.service";
import { familyRepository } from "./family.repository";
import { familyMemberRepository } from "./familyMember.repository";
import { inviteRepository } from "./invite.repository";
import { userRepository } from "@backend/modules/users/user.repository";
import { familyService } from "./family.service";
import { hashInviteToken } from "@backend/auth/token";

const mockFamilyRepo = vi.mocked(familyRepository);
const mockMemberRepo = vi.mocked(familyMemberRepository);
const mockInviteRepo = vi.mocked(inviteRepository);
const mockUserRepo = vi.mocked(userRepository);
const mockFamilyService = vi.mocked(familyService);

const APP_URL = "https://example.test";
const service = createInviteService({ appUrl: APP_URL });

function makeFamilyDoc() {
  return {
    id: "fam1",
    name: "Smith Household",
    ownerId: "u1",
    membershipVersion: 1,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

function makeInviteDoc(
  overrides: Partial<{
    status: "open" | "accepted" | "revoked";
    email: string;
    expiresAt: Date;
    familyId: string;
  }> = {},
) {
  return {
    _id: new ObjectId(),
    familyId: overrides.familyId ?? "fam1",
    email: overrides.email ?? "invitee@example.com",
    invitedBy: "u1",
    invitedByName: "Alice",
    familyName: "Smith Household",
    tokenHash: "hash",
    status: overrides.status ?? ("open" as const),
    expiresAt: overrides.expiresAt ?? new Date(Date.now() + 86_400_000),
    createdAt: new Date(),
    acceptedAt: null,
    acceptedBy: null,
    revokedAt: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFamilyService.requireOwner.mockResolvedValue();
});

describe("createInvite", () => {
  it("requires owner role", async () => {
    mockFamilyService.requireOwner.mockRejectedValue(
      Object.assign(new Error("not owner"), { code: "NOT_OWNER" }),
    );

    await expect(
      service.createInvite({
        familyId: "fam1",
        email: "x@example.com",
        invitedBy: "u9",
      }),
    ).rejects.toMatchObject({ code: "NOT_OWNER" });
  });

  it("rejects when invitee is already a member", async () => {
    mockFamilyRepo.findById.mockResolvedValue(makeFamilyDoc());
    const existingUserId = new ObjectId();
    mockUserRepo.findByEmail.mockResolvedValue({
      _id: existingUserId,
      email: "x@example.com",
    } as never);
    mockMemberRepo.getMembership.mockResolvedValue({
      id: "m1",
      familyId: "fam1",
      userId: existingUserId.toHexString(),
      role: "member",
      email: "x@example.com",
      name: "X",
      joinedAt: new Date().toISOString(),
    });

    await expect(
      service.createInvite({
        familyId: "fam1",
        email: "x@example.com",
        invitedBy: "u1",
      }),
    ).rejects.toMatchObject({ code: "ALREADY_MEMBER" });
  });

  it("throws FAMILY_NOT_FOUND when family is missing", async () => {
    mockFamilyRepo.findById.mockResolvedValue(null);
    await expect(
      service.createInvite({
        familyId: "fam1",
        email: "x@example.com",
        invitedBy: "u1",
      }),
    ).rejects.toMatchObject({ code: "FAMILY_NOT_FOUND" });
  });

  it("creates an invite, normalizes email, and returns a URL with the raw token", async () => {
    mockFamilyRepo.findById.mockResolvedValue(makeFamilyDoc());
    mockUserRepo.findByEmail.mockResolvedValue(null);
    mockUserRepo.findById.mockResolvedValue({
      _id: new ObjectId(),
      email: "owner@example.com",
      name: "Alice",
    } as never);
    const inviteId = new ObjectId().toHexString();
    mockInviteRepo.create.mockImplementation(async (input) => ({
      id: inviteId,
      familyId: input.familyId,
      email: input.email,
      invitedBy: input.invitedBy,
      status: "open",
      expiresAt: input.expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      acceptedAt: null,
      revokedAt: null,
    }));

    const result = await service.createInvite({
      familyId: "fam1",
      email: "  Invitee@Example.COM  ",
      invitedBy: "u1",
    });

    expect(result.invite.email).toBe("invitee@example.com");
    expect(result.familyName).toBe("Smith Household");
    expect(result.inviterName).toBe("Alice");
    expect(result.inviteUrl).toMatch(new RegExp(`^${APP_URL}/invite/[A-Za-z0-9_-]+$`));

    // Token in the URL must hash to the tokenHash that went to the repo.
    const token = result.inviteUrl.split("/").pop()!;
    const expectedHash = hashInviteToken(token);
    expect(mockInviteRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenHash: expectedHash,
        email: "invitee@example.com",
      }),
    );
  });
});

describe("acceptInvite", () => {
  it("throws INVITE_NOT_FOUND for an unknown token", async () => {
    mockInviteRepo.findByTokenHash.mockResolvedValue(null);
    await expect(
      service.acceptInvite({
        token: "bogus",
        userId: "u2",
        userEmail: "x@example.com",
        userName: null,
      }),
    ).rejects.toMatchObject({ code: "INVITE_NOT_FOUND" });
  });

  it("throws INVITE_REVOKED when status=revoked", async () => {
    mockInviteRepo.findByTokenHash.mockResolvedValue(
      makeInviteDoc({ status: "revoked" }),
    );
    await expect(
      service.acceptInvite({
        token: "t",
        userId: "u2",
        userEmail: "invitee@example.com",
        userName: null,
      }),
    ).rejects.toMatchObject({ code: "INVITE_REVOKED" });
  });

  it("throws INVITE_ALREADY_USED when status=accepted", async () => {
    mockInviteRepo.findByTokenHash.mockResolvedValue(
      makeInviteDoc({ status: "accepted" }),
    );
    await expect(
      service.acceptInvite({
        token: "t",
        userId: "u2",
        userEmail: "invitee@example.com",
        userName: null,
      }),
    ).rejects.toMatchObject({ code: "INVITE_ALREADY_USED" });
  });

  it("throws INVITE_EXPIRED when past expiresAt", async () => {
    mockInviteRepo.findByTokenHash.mockResolvedValue(
      makeInviteDoc({ expiresAt: new Date(Date.now() - 1000) }),
    );
    await expect(
      service.acceptInvite({
        token: "t",
        userId: "u2",
        userEmail: "invitee@example.com",
        userName: null,
      }),
    ).rejects.toMatchObject({ code: "INVITE_EXPIRED" });
  });

  it("throws INVITE_EMAIL_MISMATCH when signed-in email differs", async () => {
    mockInviteRepo.findByTokenHash.mockResolvedValue(makeInviteDoc());
    await expect(
      service.acceptInvite({
        token: "t",
        userId: "u2",
        userEmail: "someone-else@example.com",
        userName: null,
      }),
    ).rejects.toMatchObject({ code: "INVITE_EMAIL_MISMATCH" });
  });

  it("matches email case-insensitively after trimming", async () => {
    const doc = makeInviteDoc({ email: "invitee@example.com" });
    mockInviteRepo.findByTokenHash.mockResolvedValue(doc);
    mockInviteRepo.markAccepted.mockResolvedValue(doc);
    mockMemberRepo.getMembership.mockResolvedValue(null);
    mockMemberRepo.add.mockResolvedValue({} as never);
    mockFamilyRepo.bumpMembershipVersion.mockResolvedValue(2);
    mockUserRepo.setActiveFamily.mockResolvedValue();

    await expect(
      service.acceptInvite({
        token: "t",
        userId: "u2",
        userEmail: "  Invitee@Example.COM  ",
        userName: "Bob",
      }),
    ).resolves.toEqual({ familyId: doc.familyId });
  });

  it("throws INVITE_ALREADY_USED when atomic markAccepted loses the race", async () => {
    mockInviteRepo.findByTokenHash.mockResolvedValue(makeInviteDoc());
    mockInviteRepo.markAccepted.mockResolvedValue(null);

    await expect(
      service.acceptInvite({
        token: "t",
        userId: "u2",
        userEmail: "invitee@example.com",
        userName: null,
      }),
    ).rejects.toMatchObject({ code: "INVITE_ALREADY_USED" });
  });

  it("adds membership, bumps version, and switches active family on success", async () => {
    const doc = makeInviteDoc();
    mockInviteRepo.findByTokenHash.mockResolvedValue(doc);
    mockInviteRepo.markAccepted.mockResolvedValue(doc);
    mockMemberRepo.getMembership.mockResolvedValue(null);
    mockMemberRepo.add.mockResolvedValue({} as never);
    mockFamilyRepo.bumpMembershipVersion.mockResolvedValue(2);
    mockUserRepo.setActiveFamily.mockResolvedValue();

    const result = await service.acceptInvite({
      token: "t",
      userId: "u2",
      userEmail: "invitee@example.com",
      userName: "Bob",
    });

    expect(result).toEqual({ familyId: "fam1" });
    expect(mockMemberRepo.add).toHaveBeenCalledWith(
      expect.objectContaining({
        familyId: "fam1",
        userId: "u2",
        role: "member",
        email: "invitee@example.com",
        name: "Bob",
      }),
    );
    expect(mockFamilyRepo.bumpMembershipVersion).toHaveBeenCalledWith("fam1");
    expect(mockUserRepo.setActiveFamily).toHaveBeenCalledWith("u2", "fam1");
  });

  it("skips re-adding membership if already a member (idempotent)", async () => {
    const doc = makeInviteDoc();
    mockInviteRepo.findByTokenHash.mockResolvedValue(doc);
    mockInviteRepo.markAccepted.mockResolvedValue(doc);
    mockMemberRepo.getMembership.mockResolvedValue({
      id: "m1",
      familyId: doc.familyId,
      userId: "u2",
      role: "member",
      email: "invitee@example.com",
      name: "Bob",
      joinedAt: new Date().toISOString(),
    });
    mockUserRepo.setActiveFamily.mockResolvedValue();

    await service.acceptInvite({
      token: "t",
      userId: "u2",
      userEmail: "invitee@example.com",
      userName: "Bob",
    });

    expect(mockMemberRepo.add).not.toHaveBeenCalled();
    expect(mockFamilyRepo.bumpMembershipVersion).not.toHaveBeenCalled();
    expect(mockUserRepo.setActiveFamily).toHaveBeenCalledWith("u2", "fam1");
  });
});

describe("previewByToken", () => {
  it("returns null for unknown tokens", async () => {
    mockInviteRepo.findByTokenHash.mockResolvedValue(null);
    expect(await service.previewByToken("bogus")).toBeNull();
  });

  it("returns null for revoked / accepted / expired invites (no leak)", async () => {
    for (const overrides of [
      { status: "revoked" as const },
      { status: "accepted" as const },
      { expiresAt: new Date(Date.now() - 1000) },
    ]) {
      mockInviteRepo.findByTokenHash.mockResolvedValueOnce(makeInviteDoc(overrides));
      expect(await service.previewByToken("t")).toBeNull();
    }
  });

  it("returns the public preview shape for a valid open invite", async () => {
    const doc = makeInviteDoc();
    mockInviteRepo.findByTokenHash.mockResolvedValue(doc);
    const preview = await service.previewByToken("t");
    expect(preview).toEqual({
      familyName: doc.familyName,
      inviterName: doc.invitedByName,
      email: doc.email,
      expiresAt: doc.expiresAt.toISOString(),
    });
  });
});

describe("revokeInvite", () => {
  it("requires owner role", async () => {
    mockFamilyService.requireOwner.mockRejectedValue(
      Object.assign(new Error("not owner"), { code: "NOT_OWNER" }),
    );
    await expect(
      service.revokeInvite({ actorId: "u9", familyId: "fam1", inviteId: "i1" }),
    ).rejects.toMatchObject({ code: "NOT_OWNER" });
  });

  it("throws INVITE_NOT_FOUND when nothing was deleted", async () => {
    mockInviteRepo.deleteOne.mockResolvedValue(false);
    await expect(
      service.revokeInvite({ actorId: "u1", familyId: "fam1", inviteId: "i1" }),
    ).rejects.toMatchObject({ code: "INVITE_NOT_FOUND" });
  });

  it("hard-deletes the invite when the repo confirms the delete", async () => {
    mockInviteRepo.deleteOne.mockResolvedValue(true);
    await expect(
      service.revokeInvite({ actorId: "u1", familyId: "fam1", inviteId: "i1" }),
    ).resolves.toBeUndefined();
    expect(mockInviteRepo.deleteOne).toHaveBeenCalledWith("i1", "fam1");
  });
});

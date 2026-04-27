import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock all repository dependencies BEFORE importing the service. Each
// mock exposes a singleton object whose methods we replace per-test.
vi.mock("./family.repository", () => ({
  familyRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findManyByIds: vi.fn(),
    rename: vi.fn(),
    setOwner: vi.fn(),
    bumpMembershipVersion: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("./familyMember.repository", () => ({
  familyMemberRepository: {
    add: vi.fn(),
    list: vi.fn(),
    listForUser: vi.fn(),
    getMembership: vi.fn(),
    setRole: vi.fn(),
    remove: vi.fn(),
    countOwners: vi.fn(),
    countMembers: vi.fn(),
    syncProfileFields: vi.fn(),
  },
}));

vi.mock("@backend/modules/users/user.repository", () => ({
  userRepository: {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    createCredentialsUser: vi.fn(),
    setActiveFamily: vi.fn(),
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

vi.mock("@backend/modules/expenses/expense.repository", () => ({
  expenseRepository: { deleteAllForFamily: vi.fn() },
}));

vi.mock("@backend/modules/goals/goal.repository", () => ({
  goalRepository: { deleteAllForFamily: vi.fn() },
}));

vi.mock("@backend/modules/goals/goalContribution.repository", () => ({
  goalContributionRepository: { deleteAllForFamily: vi.fn() },
}));

import {
  __defaultFamilyNameForTest as defaultFamilyName,
  familyService,
} from "./family.service";
import { FamilyError } from "./errors";
import { familyRepository } from "./family.repository";
import { familyMemberRepository } from "./familyMember.repository";
import { userRepository } from "@backend/modules/users/user.repository";

const mockFamilyRepo = vi.mocked(familyRepository);
const mockMemberRepo = vi.mocked(familyMemberRepository);
const mockUserRepo = vi.mocked(userRepository);

function makeFamily(
  overrides: Partial<{
    id: string;
    name: string;
    ownerId: string;
    membershipVersion: number;
  }> = {},
) {
  return {
    id: overrides.id ?? "fam1",
    name: overrides.name ?? "Test Family",
    ownerId: overrides.ownerId ?? "u1",
    membershipVersion: overrides.membershipVersion ?? 1,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

function makeMember(
  overrides: Partial<{ userId: string; familyId: string; role: "owner" | "member" }> = {},
) {
  return {
    id: "m1",
    familyId: overrides.familyId ?? "fam1",
    userId: overrides.userId ?? "u1",
    role: overrides.role ?? ("member" as const),
    email: "u1@example.com",
    name: "User One",
    joinedAt: "2024-01-01T00:00:00.000Z",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("defaultFamilyName", () => {
  it("uses the trimmed name when provided", () => {
    expect(defaultFamilyName({ name: "  Alice  ", email: "a@x.com" })).toBe(
      "Alice's Workspace",
    );
  });

  it("falls back to email local-part when name is empty", () => {
    expect(defaultFamilyName({ name: "", email: "bob@example.com" })).toBe(
      "bob's Workspace",
    );
  });

  it("falls back to email local-part when name is null/undefined", () => {
    expect(defaultFamilyName({ name: null, email: "carol@example.com" })).toBe(
      "carol's Workspace",
    );
    expect(defaultFamilyName({ email: "dave@example.com" })).toBe("dave's Workspace");
  });

  it("truncates long names so the total fits in 80 chars", () => {
    const longName = "x".repeat(120);
    const result = defaultFamilyName({ name: longName, email: "x@x.com" });
    expect(result.length).toBeLessThanOrEqual(80);
    expect(result.endsWith("'s Workspace")).toBe(true);
  });
});

describe("createPersonalFamilyFor", () => {
  it("creates the family, adds the user as owner, and sets active family", async () => {
    const family = makeFamily();
    mockFamilyRepo.create.mockResolvedValue(family);
    mockMemberRepo.add.mockResolvedValue(makeMember({ role: "owner" }));
    mockUserRepo.setActiveFamily.mockResolvedValue();

    const result = await familyService.createPersonalFamilyFor({
      id: "u1",
      name: "Alice",
      email: "alice@example.com",
    });

    expect(result).toEqual(family);
    expect(mockFamilyRepo.create).toHaveBeenCalledWith({
      name: "Alice's Workspace",
      ownerId: "u1",
    });
    expect(mockMemberRepo.add).toHaveBeenCalledWith({
      familyId: family.id,
      userId: "u1",
      role: "owner",
      email: "alice@example.com",
      name: "Alice",
    });
    expect(mockUserRepo.setActiveFamily).toHaveBeenCalledWith("u1", family.id);
  });
});

describe("create (explicit)", () => {
  it("creates a family and tags the actor as owner", async () => {
    const family = makeFamily({ name: "Smiths" });
    mockFamilyRepo.create.mockResolvedValue(family);
    mockMemberRepo.add.mockResolvedValue(makeMember({ role: "owner" }));

    const result = await familyService.create(
      { id: "u1", name: "Alice", email: "alice@example.com" },
      "  Smiths  ",
    );

    expect(result).toEqual({ ...family, role: "owner" });
    expect(mockFamilyRepo.create).toHaveBeenCalledWith({
      name: "Smiths",
      ownerId: "u1",
    });
  });
});

describe("requireOwner", () => {
  it("throws NOT_MEMBER when the user has no membership", async () => {
    mockMemberRepo.getMembership.mockResolvedValue(null);
    await expect(familyService.requireOwner("u1", "fam1")).rejects.toMatchObject({
      code: "NOT_MEMBER",
    });
  });

  it("throws NOT_OWNER for a non-owner member", async () => {
    mockMemberRepo.getMembership.mockResolvedValue(makeMember({ role: "member" }));
    await expect(familyService.requireOwner("u1", "fam1")).rejects.toMatchObject({
      code: "NOT_OWNER",
    });
  });

  it("resolves silently for an owner", async () => {
    mockMemberRepo.getMembership.mockResolvedValue(makeMember({ role: "owner" }));
    await expect(familyService.requireOwner("u1", "fam1")).resolves.toBeUndefined();
  });
});

describe("listMembers", () => {
  it("rejects non-members", async () => {
    mockMemberRepo.getMembership.mockResolvedValue(null);
    await expect(familyService.listMembers("u1", "fam1")).rejects.toBeInstanceOf(
      FamilyError,
    );
  });

  it("returns the roster for a member", async () => {
    const roster = [makeMember({ role: "owner" }), makeMember({ userId: "u2" })];
    mockMemberRepo.getMembership.mockResolvedValue(makeMember({ role: "member" }));
    mockMemberRepo.list.mockResolvedValue(roster);
    await expect(familyService.listMembers("u1", "fam1")).resolves.toEqual(roster);
  });
});

describe("setActiveFamily", () => {
  it("rejects non-members", async () => {
    mockMemberRepo.getMembership.mockResolvedValue(null);
    await expect(familyService.setActiveFamily("u1", "fam1")).rejects.toMatchObject({
      code: "NOT_MEMBER",
    });
  });

  it("throws FAMILY_NOT_FOUND when the family disappeared", async () => {
    mockMemberRepo.getMembership.mockResolvedValue(makeMember({ role: "member" }));
    mockFamilyRepo.findById.mockResolvedValue(null);
    await expect(familyService.setActiveFamily("u1", "fam1")).rejects.toMatchObject({
      code: "FAMILY_NOT_FOUND",
    });
  });

  it("persists active family for valid members", async () => {
    const family = makeFamily();
    mockMemberRepo.getMembership.mockResolvedValue(makeMember({ role: "member" }));
    mockFamilyRepo.findById.mockResolvedValue(family);
    mockUserRepo.setActiveFamily.mockResolvedValue();

    const result = await familyService.setActiveFamily("u1", "fam1");
    expect(result).toEqual(family);
    expect(mockUserRepo.setActiveFamily).toHaveBeenCalledWith("u1", "fam1");
  });
});

describe("removeMember", () => {
  it("throws NOT_OWNER when a non-owner removes someone else", async () => {
    mockMemberRepo.getMembership.mockResolvedValueOnce(
      makeMember({ userId: "u1", role: "member" }),
    ); // actor
    await expect(familyService.removeMember("u1", "fam1", "u2")).rejects.toMatchObject({
      code: "NOT_OWNER",
    });
  });

  it("throws LAST_OWNER when removing the only owner", async () => {
    mockMemberRepo.getMembership
      .mockResolvedValueOnce(makeMember({ userId: "u1", role: "owner" })) // actor
      .mockResolvedValueOnce(makeMember({ userId: "u1", role: "owner" })); // target (self)
    mockMemberRepo.countOwners.mockResolvedValue(1);

    await expect(familyService.removeMember("u1", "fam1", "u1")).rejects.toMatchObject({
      code: "LAST_OWNER",
    });
  });

  it("allows self-leave for a non-owner member and bumps version", async () => {
    mockMemberRepo.getMembership
      .mockResolvedValueOnce(makeMember({ userId: "u2", role: "member" })) // actor
      .mockResolvedValueOnce(makeMember({ userId: "u2", role: "member" })); // target
    mockMemberRepo.remove.mockResolvedValue(true);
    mockFamilyRepo.bumpMembershipVersion.mockResolvedValue(2);
    mockUserRepo.findById.mockResolvedValue(null);

    await expect(familyService.removeMember("u2", "fam1", "u2")).resolves.toBeUndefined();

    expect(mockMemberRepo.remove).toHaveBeenCalledWith("fam1", "u2");
    expect(mockFamilyRepo.bumpMembershipVersion).toHaveBeenCalledWith("fam1");
  });

  it("clears active family on the removed user when it pointed at this family", async () => {
    mockMemberRepo.getMembership
      .mockResolvedValueOnce(makeMember({ userId: "u1", role: "owner" })) // actor
      .mockResolvedValueOnce(makeMember({ userId: "u2", role: "member" })); // target
    mockMemberRepo.remove.mockResolvedValue(true);
    mockFamilyRepo.bumpMembershipVersion.mockResolvedValue(2);
    mockUserRepo.findById.mockResolvedValue({
      activeFamilyId: "fam1",
    } as never);
    mockUserRepo.setActiveFamily.mockResolvedValue();

    await familyService.removeMember("u1", "fam1", "u2");

    expect(mockUserRepo.setActiveFamily).toHaveBeenCalledWith("u2", null);
  });
});

describe("transferOwnership", () => {
  it("is a no-op when actor === target", async () => {
    mockMemberRepo.getMembership
      .mockResolvedValueOnce(makeMember({ userId: "u1", role: "owner" })) // requireOwner
      .mockResolvedValueOnce(makeMember({ userId: "u1", role: "owner" })); // target

    await familyService.transferOwnership("u1", "fam1", "u1");

    expect(mockMemberRepo.setRole).not.toHaveBeenCalled();
    expect(mockFamilyRepo.bumpMembershipVersion).not.toHaveBeenCalled();
  });

  it("swaps roles and bumps version when transferring to a different member", async () => {
    mockMemberRepo.getMembership
      .mockResolvedValueOnce(makeMember({ userId: "u1", role: "owner" })) // requireOwner
      .mockResolvedValueOnce(makeMember({ userId: "u2", role: "member" })); // target
    mockMemberRepo.setRole.mockResolvedValue(true);
    mockFamilyRepo.setOwner.mockResolvedValue();
    mockFamilyRepo.bumpMembershipVersion.mockResolvedValue(2);

    await familyService.transferOwnership("u1", "fam1", "u2");

    expect(mockMemberRepo.setRole).toHaveBeenCalledWith("fam1", "u2", "owner");
    expect(mockMemberRepo.setRole).toHaveBeenCalledWith("fam1", "u1", "member");
    expect(mockFamilyRepo.setOwner).toHaveBeenCalledWith("fam1", "u2");
    expect(mockFamilyRepo.bumpMembershipVersion).toHaveBeenCalledWith("fam1");
  });
});

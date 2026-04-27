import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@backend/config/mongodb";
import type { FamilyInvite, InviteStatus } from "@shared/families/schemas";

/**
 * Invite token is stored as a SHA-256 hash so a DB leak can't replay
 * open invites. `expiresAt` doubles as a TTL index for hygiene.
 */
export interface FamilyInviteDocument {
  _id: ObjectId;
  familyId: string;
  email: string;
  invitedBy: string;
  invitedByName: string;
  familyName: string;
  tokenHash: string;
  status: InviteStatus;
  expiresAt: Date;
  createdAt: Date;
  acceptedAt: Date | null;
  acceptedBy: string | null;
  revokedAt: Date | null;
}

const COLLECTION_NAME = "family_invites";

let indexesEnsured = false;

async function getCollection(): Promise<Collection<FamilyInviteDocument>> {
  const db = await getDb();
  const collection = db.collection<FamilyInviteDocument>(COLLECTION_NAME);
  if (!indexesEnsured) {
    await Promise.all([
      collection.createIndex({ tokenHash: 1 }, { unique: true }),
      collection.createIndex({ familyId: 1, email: 1, status: 1 }),
      // TTL: docs auto-removed once expiresAt passes (no permanent audit).
      collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
    indexesEnsured = true;
  }
  return collection;
}

function toInvite(doc: FamilyInviteDocument): FamilyInvite {
  return {
    id: doc._id.toHexString(),
    familyId: doc.familyId,
    email: doc.email,
    invitedBy: doc.invitedBy,
    status: doc.status,
    expiresAt: doc.expiresAt.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    acceptedAt: doc.acceptedAt ? doc.acceptedAt.toISOString() : null,
    revokedAt: doc.revokedAt ? doc.revokedAt.toISOString() : null,
  };
}

export interface CreateInviteInput {
  familyId: string;
  familyName: string;
  email: string;
  invitedBy: string;
  invitedByName: string;
  tokenHash: string;
  expiresAt: Date;
}

export const inviteRepository = {
  async create(input: CreateInviteInput): Promise<FamilyInvite> {
    const collection = await getCollection();
    const doc: Omit<FamilyInviteDocument, "_id"> = {
      familyId: input.familyId,
      familyName: input.familyName,
      email: input.email,
      invitedBy: input.invitedBy,
      invitedByName: input.invitedByName,
      tokenHash: input.tokenHash,
      status: "open",
      expiresAt: input.expiresAt,
      createdAt: new Date(),
      acceptedAt: null,
      acceptedBy: null,
      revokedAt: null,
    };
    const result = await collection.insertOne(doc as FamilyInviteDocument);
    return toInvite({ ...doc, _id: result.insertedId });
  },

  async findByTokenHash(tokenHash: string): Promise<FamilyInviteDocument | null> {
    const collection = await getCollection();
    return collection.findOne({ tokenHash });
  },

  async listOpen(familyId: string): Promise<FamilyInvite[]> {
    const collection = await getCollection();
    const docs = await collection
      .find({ familyId, status: "open", expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map(toInvite);
  },

  /**
   * Atomically flip an open invite to accepted. Concurrent accepts
   * lose cleanly with `null`.
   */
  async markAccepted(
    inviteId: string,
    acceptedBy: string,
  ): Promise<FamilyInviteDocument | null> {
    if (!ObjectId.isValid(inviteId)) return null;
    const collection = await getCollection();
    const result = await collection.findOneAndUpdate(
      {
        _id: new ObjectId(inviteId),
        status: "open",
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          status: "accepted",
          acceptedAt: new Date(),
          acceptedBy,
        },
      },
      { returnDocument: "after" },
    );
    return result;
  },

  /** Hard-delete an invite scoped to a family. Returns true if removed. */
  async deleteOne(inviteId: string, familyId: string): Promise<boolean> {
    if (!ObjectId.isValid(inviteId)) return false;
    const collection = await getCollection();
    const result = await collection.deleteOne({
      _id: new ObjectId(inviteId),
      familyId,
    });
    return result.deletedCount === 1;
  },

  /** Cascade helper: drop every invite row for a family. */
  async deleteAllForFamily(familyId: string): Promise<number> {
    const collection = await getCollection();
    const result = await collection.deleteMany({ familyId });
    return result.deletedCount ?? 0;
  },

  /** Cascade helper: drop every invite a user sent. */
  async deleteAllByInviter(inviterUserId: string): Promise<number> {
    const collection = await getCollection();
    const result = await collection.deleteMany({ invitedBy: inviterUserId });
    return result.deletedCount ?? 0;
  },
};

export type { FamilyInviteDocument as InviteDocument };

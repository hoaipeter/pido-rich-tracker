import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@backend/config/mongodb";
import type { FamilyMember, FamilyRole } from "@shared/families/schemas";

/**
 * Join collection between users and families. Email/name are
 * snapshotted at join time for cheap roster reads; user doc remains
 * source of truth.
 */
export interface FamilyMemberDocument {
  _id: ObjectId;
  familyId: string;
  userId: string;
  role: FamilyRole;
  email: string;
  name: string;
  joinedAt: Date;
}

const COLLECTION_NAME = "family_members";

let indexesEnsured = false;

async function getCollection(): Promise<Collection<FamilyMemberDocument>> {
  const db = await getDb();
  const collection = db.collection<FamilyMemberDocument>(COLLECTION_NAME);
  if (!indexesEnsured) {
    await Promise.all([
      collection.createIndex({ familyId: 1, userId: 1 }, { unique: true }),
      collection.createIndex({ userId: 1 }),
    ]);
    indexesEnsured = true;
  }
  return collection;
}

function toMember(doc: FamilyMemberDocument): FamilyMember {
  return {
    id: doc._id.toHexString(),
    familyId: doc.familyId,
    userId: doc.userId,
    role: doc.role,
    email: doc.email,
    name: doc.name,
    joinedAt: doc.joinedAt.toISOString(),
  };
}

export interface AddMemberInput {
  familyId: string;
  userId: string;
  role: FamilyRole;
  email: string;
  name: string;
}

export const familyMemberRepository = {
  async add(input: AddMemberInput): Promise<FamilyMember> {
    const collection = await getCollection();
    const doc: Omit<FamilyMemberDocument, "_id"> = {
      familyId: input.familyId,
      userId: input.userId,
      role: input.role,
      email: input.email,
      name: input.name,
      joinedAt: new Date(),
    };
    const result = await collection.insertOne(doc as FamilyMemberDocument);
    return toMember({ ...doc, _id: result.insertedId });
  },

  async list(familyId: string): Promise<FamilyMember[]> {
    const collection = await getCollection();
    const docs = await collection
      .find({ familyId })
      .sort({ role: 1, joinedAt: 1 })
      .toArray();
    return docs.map(toMember);
  },

  async listForUser(userId: string): Promise<FamilyMember[]> {
    const collection = await getCollection();
    const docs = await collection.find({ userId }).toArray();
    return docs.map(toMember);
  },

  async getMembership(familyId: string, userId: string): Promise<FamilyMember | null> {
    const collection = await getCollection();
    const doc = await collection.findOne({ familyId, userId });
    return doc ? toMember(doc) : null;
  },

  async setRole(familyId: string, userId: string, role: FamilyRole): Promise<boolean> {
    const collection = await getCollection();
    const result = await collection.updateOne({ familyId, userId }, { $set: { role } });
    return result.matchedCount === 1;
  },

  async remove(familyId: string, userId: string): Promise<boolean> {
    const collection = await getCollection();
    const result = await collection.deleteOne({ familyId, userId });
    return result.deletedCount === 1;
  },

  /** Cascade helper: drop every membership row for a family. */
  async deleteAllForFamily(familyId: string): Promise<number> {
    const collection = await getCollection();
    const result = await collection.deleteMany({ familyId });
    return result.deletedCount ?? 0;
  },

  /** Cascade helper: drop every membership row for a user. */
  async deleteAllForUser(userId: string): Promise<number> {
    const collection = await getCollection();
    const result = await collection.deleteMany({ userId });
    return result.deletedCount ?? 0;
  },

  async countOwners(familyId: string): Promise<number> {
    const collection = await getCollection();
    return collection.countDocuments({ familyId, role: "owner" });
  },

  async countMembers(familyId: string): Promise<number> {
    const collection = await getCollection();
    return collection.countDocuments({ familyId });
  },

  /**
   * Best-effort sync of denormalised display fields when a user
   * updates their profile.
   */
  async syncProfileFields(
    userId: string,
    fields: { email?: string; name?: string },
  ): Promise<void> {
    const $set: Record<string, string> = {};
    if (fields.email !== undefined) $set.email = fields.email;
    if (fields.name !== undefined) $set.name = fields.name;
    if (Object.keys($set).length === 0) return;
    const collection = await getCollection();
    await collection.updateMany({ userId }, { $set });
  },
};

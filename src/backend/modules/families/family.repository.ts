import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@backend/config/mongodb";
import type { Family } from "@shared/families/schemas";

/**
 * `families` document. `membershipVersion` bumps on every roster
 * change so the JWT guard can revoke stale sessions on next request.
 */
export interface FamilyDocument {
  _id: ObjectId;
  name: string;
  ownerId: string;
  membershipVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION_NAME = "families";

let indexesEnsured = false;

async function getCollection(): Promise<Collection<FamilyDocument>> {
  const db = await getDb();
  const collection = db.collection<FamilyDocument>(COLLECTION_NAME);
  if (!indexesEnsured) {
    await collection.createIndex({ ownerId: 1 });
    indexesEnsured = true;
  }
  return collection;
}

function toFamily(doc: FamilyDocument): Family {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    ownerId: doc.ownerId,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    membershipVersion: doc.membershipVersion,
  };
}

export interface CreateFamilyInput {
  name: string;
  ownerId: string;
}

export const familyRepository = {
  async create(input: CreateFamilyInput): Promise<Family> {
    const collection = await getCollection();
    const now = new Date();
    const doc: Omit<FamilyDocument, "_id"> = {
      name: input.name,
      ownerId: input.ownerId,
      membershipVersion: 1,
      createdAt: now,
      updatedAt: now,
    };
    const result = await collection.insertOne(doc as FamilyDocument);
    return toFamily({ ...doc, _id: result.insertedId });
  },

  async findById(id: string): Promise<Family | null> {
    if (!ObjectId.isValid(id)) return null;
    const collection = await getCollection();
    const doc = await collection.findOne({ _id: new ObjectId(id) });
    return doc ? toFamily(doc) : null;
  },

  async findManyByIds(ids: readonly string[]): Promise<Family[]> {
    const objectIds = ids
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));
    if (objectIds.length === 0) return [];
    const collection = await getCollection();
    const docs = await collection.find({ _id: { $in: objectIds } }).toArray();
    return docs.map(toFamily);
  },

  async rename(id: string, name: string): Promise<Family | null> {
    if (!ObjectId.isValid(id)) return null;
    const collection = await getCollection();
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { name, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    return result ? toFamily(result) : null;
  },

  async setOwner(id: string, ownerId: string): Promise<void> {
    if (!ObjectId.isValid(id)) return;
    const collection = await getCollection();
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ownerId, updatedAt: new Date() } },
    );
  },

  /** Find families whose canonical `ownerId` pointer matches the user. */
  async listIdsByOwner(ownerId: string): Promise<string[]> {
    const collection = await getCollection();
    const docs = await collection.find({ ownerId }, { projection: { _id: 1 } }).toArray();
    return docs.map((d) => d._id.toHexString());
  },

  /** Atomically bump `membershipVersion` on a roster shape change. */
  async bumpMembershipVersion(id: string): Promise<number> {
    if (!ObjectId.isValid(id)) return 0;
    const collection = await getCollection();
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $inc: { membershipVersion: 1 }, $set: { updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    return result?.membershipVersion ?? 0;
  },

  async delete(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const collection = await getCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  },
};

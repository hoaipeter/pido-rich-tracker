import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@backend/config/mongodb";
import { toObjectId, timestamps } from "@backend/db/utils";
import { normalizeEmail } from "@shared/auth/normalize";

/**
 * Pido-managed user fields layered on top of Auth.js's `users` collection.
 * Adapter owns: `_id`, `name`, `email`, `emailVerified`, `image`.
 * We own: `passwordHash`, `activeFamilyId`, `createdAt`, `updatedAt`.
 */
export interface UserDocument {
  _id: ObjectId;
  name?: string | null;
  email: string;
  emailVerified?: Date | null;
  image?: string | null;
  passwordHash?: string | null;
  activeFamilyId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const COLLECTION_NAME = "users";

let indexesEnsured = false;

async function getCollection(): Promise<Collection<UserDocument>> {
  const db = await getDb();
  const collection = db.collection<UserDocument>(COLLECTION_NAME);
  if (!indexesEnsured) {
    await collection.createIndex({ email: 1 }, { unique: true });
    indexesEnsured = true;
  }
  return collection;
}

export interface CreateCredentialsUserInput {
  email: string;
  name: string;
  passwordHash: string;
}

export const userRepository = {
  async findByEmail(email: string): Promise<UserDocument | null> {
    const collection = await getCollection();
    return collection.findOne({ email: normalizeEmail(email) });
  },

  async findById(id: string): Promise<UserDocument | null> {
    const oid = toObjectId(id);
    if (!oid) return null;
    const collection = await getCollection();
    return collection.findOne({ _id: oid });
  },

  async createCredentialsUser(input: CreateCredentialsUserInput): Promise<UserDocument> {
    const collection = await getCollection();
    const doc: Omit<UserDocument, "_id"> = {
      email: normalizeEmail(input.email),
      name: input.name,
      passwordHash: input.passwordHash,
      emailVerified: null,
      image: null,
      activeFamilyId: null,
      ...timestamps(),
    };
    const result = await collection.insertOne(doc as UserDocument);
    return { _id: result.insertedId, ...doc };
  },

  /**
   * Update `activeFamilyId`. Pass `null` to clear (e.g. after the
   * user is removed from their currently-active family).
   */
  async setActiveFamily(userId: string, familyId: string | null): Promise<void> {
    const oid = toObjectId(userId);
    if (!oid) return;
    const collection = await getCollection();
    await collection.updateOne(
      { _id: oid },
      { $set: { activeFamilyId: familyId, updatedAt: new Date() } },
    );
  },

  /**
   * Update display name. Callers should also call
   * `familyMemberRepository.syncProfileFields()` to refresh denormalised
   * roster rows.
   */
  async updateName(userId: string, name: string): Promise<UserDocument | null> {
    const oid = toObjectId(userId);
    if (!oid) return null;
    const collection = await getCollection();
    const result = await collection.findOneAndUpdate(
      { _id: oid },
      { $set: { name, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    return result;
  },

  /**
   * Hard-delete the user document. Caller must cascade related rows
   * (memberships, owned families, etc.) BEFORE calling this.
   */
  async deleteById(userId: string): Promise<boolean> {
    const oid = toObjectId(userId);
    if (!oid) return false;
    const collection = await getCollection();
    const result = await collection.deleteOne({ _id: oid });
    return result.deletedCount === 1;
  },

  /**
   * Drop Auth.js adapter rows (`accounts`, `sessions`) for this user.
   * Both store `userId` as a BSON ObjectId, mirroring
   * `MongoDBAdapter.deleteUser`. `verification_tokens` is keyed by
   * email/token, not userId — left to expire naturally.
   */
  async purgeAuthArtifacts(
    userId: string,
  ): Promise<{ accounts: number; sessions: number }> {
    const oid = toObjectId(userId);
    if (!oid) return { accounts: 0, sessions: 0 };
    const db = await getDb();
    const [accountsResult, sessionsResult] = await Promise.all([
      db.collection("accounts").deleteMany({ userId: oid }),
      db.collection("sessions").deleteMany({ userId: oid }),
    ]);
    return {
      accounts: accountsResult.deletedCount ?? 0,
      sessions: sessionsResult.deletedCount ?? 0,
    };
  },
};

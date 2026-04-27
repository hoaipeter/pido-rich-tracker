import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@backend/config/mongodb";
import type { GoalContribution, NewGoalContribution } from "@shared/goals/schemas";

interface ContributionDocument {
  _id: ObjectId;
  familyId: string;
  /** Display-only attribution (the user who logged the contribution). */
  createdBy: string;
  goalId: ObjectId;
  amount: number;
  date: string;
  note: string | null;
  createdAt: Date;
}

const COLLECTION_NAME = "goal_contributions";

let indexesEnsured = false;

async function getCollection(): Promise<Collection<ContributionDocument>> {
  const db = await getDb();
  const collection = db.collection<ContributionDocument>(COLLECTION_NAME);
  if (!indexesEnsured) {
    await Promise.all([
      collection.createIndex({ familyId: 1, goalId: 1, date: -1 }),
      collection.createIndex({ familyId: 1, date: -1 }),
    ]);
    indexesEnsured = true;
  }
  return collection;
}

function toContribution(doc: ContributionDocument): GoalContribution {
  return {
    id: doc._id.toHexString(),
    goalId: doc.goalId.toHexString(),
    amount: doc.amount,
    date: doc.date,
    note: doc.note,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt.toISOString(),
  };
}

export const goalContributionRepository = {
  async listForGoal(familyId: string, goalId: string): Promise<GoalContribution[]> {
    if (!ObjectId.isValid(goalId)) return [];
    const collection = await getCollection();
    const docs = await collection
      .find({ familyId, goalId: new ObjectId(goalId) })
      .sort({ date: -1, _id: -1 })
      .limit(1000)
      .toArray();
    return docs.map(toContribution);
  },

  async listAll(familyId: string): Promise<GoalContribution[]> {
    const collection = await getCollection();
    const docs = await collection
      .find({ familyId })
      .sort({ date: -1, _id: -1 })
      .limit(5000)
      .toArray();
    return docs.map(toContribution);
  },

  async create(
    familyId: string,
    createdBy: string,
    goalId: string,
    input: NewGoalContribution,
  ): Promise<GoalContribution | null> {
    if (!ObjectId.isValid(goalId)) return null;
    const collection = await getCollection();
    const now = new Date();
    const doc: Omit<ContributionDocument, "_id"> = {
      familyId,
      createdBy,
      goalId: new ObjectId(goalId),
      amount: input.amount,
      date: input.date,
      note: input.note ?? null,
      createdAt: now,
    };
    const result = await collection.insertOne(doc as ContributionDocument);
    return toContribution({ ...doc, _id: result.insertedId });
  },

  async deleteForGoal(familyId: string, goalId: string): Promise<number> {
    if (!ObjectId.isValid(goalId)) return 0;
    const collection = await getCollection();
    const result = await collection.deleteMany({
      familyId,
      goalId: new ObjectId(goalId),
    });
    return result.deletedCount ?? 0;
  },

  async delete(familyId: string, id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const collection = await getCollection();
    const result = await collection.deleteOne({
      _id: new ObjectId(id),
      familyId,
    });
    return result.deletedCount === 1;
  },

  /** Cascade helper: drop every contribution for a family. */
  async deleteAllForFamily(familyId: string): Promise<number> {
    const collection = await getCollection();
    const result = await collection.deleteMany({ familyId });
    return result.deletedCount ?? 0;
  },
};

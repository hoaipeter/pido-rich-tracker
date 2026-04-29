import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@backend/config/mongodb";
import { toObjectId, timestamps } from "@backend/db/utils";
import type {
  BudgetGoal,
  Goal,
  NewGoal,
  SavingsGoal,
  UpdateBudgetGoal,
  UpdateSavingsGoal,
} from "@shared/goals/schemas";
import type { ExpenseCategory } from "@shared/expenses/schemas";

interface BaseGoalDocFields {
  _id: ObjectId;
  familyId: string;
  /** Display-only attribution. Never used for scoping. */
  createdBy: string;
  name: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SavingsGoalDocument extends BaseGoalDocFields {
  kind: "savings";
  targetAmount: number;
  targetDate: string;
  startedAt: string;
}

interface BudgetGoalDocument extends BaseGoalDocFields {
  kind: "budget";
  monthlyLimit: number;
  category: ExpenseCategory;
  startMonth: string;
  endMonth: string | null;
}

type GoalDocument = SavingsGoalDocument | BudgetGoalDocument;

const COLLECTION_NAME = "goals";

let indexesEnsured = false;

async function getCollection(): Promise<Collection<GoalDocument>> {
  const db = await getDb();
  const collection = db.collection<GoalDocument>(COLLECTION_NAME);
  if (!indexesEnsured) {
    await Promise.all([
      collection.createIndex({ familyId: 1, kind: 1, createdAt: -1 }),
      collection.createIndex(
        { familyId: 1, category: 1, startMonth: 1 },
        { partialFilterExpression: { kind: "budget" } },
      ),
    ]);
    indexesEnsured = true;
  }
  return collection;
}

function toGoal(doc: GoalDocument): Goal {
  const base = {
    id: doc._id.toHexString(),
    name: doc.name,
    note: doc.note,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
  if (doc.kind === "savings") {
    const out: SavingsGoal = {
      ...base,
      kind: "savings",
      targetAmount: doc.targetAmount,
      targetDate: doc.targetDate,
      startedAt: doc.startedAt,
    };
    return out;
  }
  const out: BudgetGoal = {
    ...base,
    kind: "budget",
    monthlyLimit: doc.monthlyLimit,
    category: doc.category,
    startMonth: doc.startMonth,
    endMonth: doc.endMonth,
  };
  return out;
}

export const goalRepository = {
  async list(familyId: string): Promise<Goal[]> {
    const collection = await getCollection();
    const docs = await collection
      .find({ familyId })
      .sort({ kind: 1, createdAt: -1 })
      .limit(500)
      .toArray();
    return docs.map(toGoal);
  },

  async get(familyId: string, id: string): Promise<Goal | null> {
    const oid = toObjectId(id);
    if (!oid) return null;
    const collection = await getCollection();
    const doc = await collection.findOne({ _id: oid, familyId });
    return doc ? toGoal(doc) : null;
  },

  async create(familyId: string, createdBy: string, input: NewGoal): Promise<Goal> {
    const collection = await getCollection();
    if (input.kind === "savings") {
      const doc: Omit<SavingsGoalDocument, "_id"> = {
        kind: "savings",
        familyId,
        createdBy,
        name: input.name,
        note: input.note ?? null,
        targetAmount: input.targetAmount,
        targetDate: input.targetDate,
        startedAt: input.startedAt,
        ...timestamps(),
      };
      const result = await collection.insertOne(doc as GoalDocument);
      return toGoal({ ...doc, _id: result.insertedId });
    }
    const doc: Omit<BudgetGoalDocument, "_id"> = {
      kind: "budget",
      familyId,
      createdBy,
      name: input.name,
      note: input.note ?? null,
      monthlyLimit: input.monthlyLimit,
      category: input.category,
      startMonth: input.startMonth,
      endMonth: input.endMonth ?? null,
      ...timestamps(),
    };
    const result = await collection.insertOne(doc as GoalDocument);
    return toGoal({ ...doc, _id: result.insertedId });
  },

  async update(
    familyId: string,
    id: string,
    kind: "savings" | "budget",
    patch: UpdateSavingsGoal | UpdateBudgetGoal,
  ): Promise<Goal | null> {
    const oid = toObjectId(id);
    if (!oid) return null;
    const collection = await getCollection();
    const $set: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) $set[key] = value;
    }
    const result = await collection.findOneAndUpdate(
      { _id: oid, familyId, kind },
      { $set },
      { returnDocument: "after" },
    );
    return result ? toGoal(result) : null;
  },

  async delete(familyId: string, id: string): Promise<boolean> {
    const oid = toObjectId(id);
    if (!oid) return false;
    const collection = await getCollection();
    const result = await collection.deleteOne({ _id: oid, familyId });
    return result.deletedCount === 1;
  },

  /** Cascade helper: drop every goal for a family. */
  async deleteAllForFamily(familyId: string): Promise<number> {
    const collection = await getCollection();
    const result = await collection.deleteMany({ familyId });
    return result.deletedCount ?? 0;
  },
};

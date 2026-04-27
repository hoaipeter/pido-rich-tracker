import { ObjectId, type Collection, type Filter } from "mongodb";
import { getDb } from "@backend/config/mongodb";
import type {
  Expense,
  ExpenseCategory,
  ExpenseFilters,
  NewExpense,
} from "@shared/expenses/schemas";

interface ExpenseDocument {
  _id: ObjectId;
  familyId: string;
  /** Display-only attribution. Never used for scoping or auth. */
  createdBy: string;
  category: ExpenseCategory;
  date: string; // yyyy-mm-dd
  amount: number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION_NAME = "expenses";

let indexesEnsured = false;

async function getCollection(): Promise<Collection<ExpenseDocument>> {
  const db = await getDb();
  const collection = db.collection<ExpenseDocument>(COLLECTION_NAME);
  if (!indexesEnsured) {
    // Indexes lead with familyId so per-workspace queries are covered.
    await Promise.all([
      collection.createIndex({ familyId: 1, date: -1 }),
      collection.createIndex({ familyId: 1, category: 1, date: -1 }),
    ]);
    indexesEnsured = true;
  }
  return collection;
}

function toExpense(doc: ExpenseDocument): Expense {
  return {
    id: doc._id.toHexString(),
    category: doc.category,
    date: doc.date,
    amount: doc.amount,
    note: doc.note,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildQuery(familyId: string, filters: ExpenseFilters): Filter<ExpenseDocument> {
  const query: Filter<ExpenseDocument> = { familyId };

  if (filters.categories?.length) {
    query.category = { $in: filters.categories };
  }

  if (filters.dateFrom || filters.dateTo) {
    const range: Record<string, string> = {};
    if (filters.dateFrom) range.$gte = filters.dateFrom;
    if (filters.dateTo) range.$lte = filters.dateTo;
    query.date = range;
  }

  if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
    const range: Record<string, number> = {};
    if (filters.minAmount !== undefined) range.$gte = filters.minAmount;
    if (filters.maxAmount !== undefined) range.$lte = filters.maxAmount;
    query.amount = range;
  }

  if (filters.search) {
    // Substring match (note OR category, case-insensitive). Regex chosen
    // over $text so partial matches work without a dictionary. The raw
    // input is hard-capped before escaping, and the post-escape pattern
    // is bounded again — even with every char escaping to two, the
    // final regex stays comfortably under any reasonable engine limit.
    const trimmed = filters.search.slice(0, 80);
    const pattern = escapeRegex(trimmed);
    if (pattern.length <= 200) {
      query.$or = [
        { note: { $regex: pattern, $options: "i" } },
        { category: { $regex: pattern, $options: "i" } },
      ];
    }
  }

  return query;
}

export const expenseRepository = {
  async list(familyId: string, filters: ExpenseFilters = {}): Promise<Expense[]> {
    const collection = await getCollection();
    const docs = await collection
      .find(buildQuery(familyId, filters))
      .sort({ date: -1, _id: -1 })
      .limit(1000)
      // Hard server-side cap. Atlas free tier can stall indefinitely on
      // unindexed scans during background work — fail-fast keeps the
      // request thread predictable.
      .maxTimeMS(2000)
      .toArray();
    return docs.map(toExpense);
  },

  async create(familyId: string, createdBy: string, input: NewExpense): Promise<Expense> {
    const collection = await getCollection();
    const now = new Date();
    const doc: Omit<ExpenseDocument, "_id"> = {
      familyId,
      createdBy,
      category: input.category,
      date: input.date,
      amount: input.amount,
      note: input.note ?? null,
      createdAt: now,
      updatedAt: now,
    };
    const result = await collection.insertOne(doc as ExpenseDocument);
    return toExpense({ ...doc, _id: result.insertedId });
  },

  async bulkCreate(
    familyId: string,
    createdBy: string,
    inputs: NewExpense[],
  ): Promise<Expense[]> {
    if (inputs.length === 0) return [];
    const collection = await getCollection();
    const now = new Date();
    const docs: Omit<ExpenseDocument, "_id">[] = inputs.map((input) => ({
      familyId,
      createdBy,
      category: input.category,
      date: input.date,
      amount: input.amount,
      note: input.note ?? null,
      createdAt: now,
      updatedAt: now,
    }));
    const result = await collection.insertMany(docs as ExpenseDocument[], {
      ordered: false,
    });
    return docs.map((doc, index) => {
      const insertedId = result.insertedIds[index];
      if (!insertedId) {
        throw new Error(`Bulk insert failed at row ${index}`);
      }
      return toExpense({ ...doc, _id: insertedId });
    });
  },

  async delete(familyId: string, id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const collection = await getCollection();
    // Compound filter prevents cross-family IDOR (returns deletedCount=0).
    const result = await collection.deleteOne({
      _id: new ObjectId(id),
      familyId,
    });
    return result.deletedCount === 1;
  },

  /** Cascade helper: drop every expense for a family. */
  async deleteAllForFamily(familyId: string): Promise<number> {
    const collection = await getCollection();
    const result = await collection.deleteMany({ familyId });
    return result.deletedCount ?? 0;
  },
};

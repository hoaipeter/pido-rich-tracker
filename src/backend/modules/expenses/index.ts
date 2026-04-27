// Public surface of the expenses backend module. Outside callers (route
// handlers) should import from this barrel rather than reaching into
// repository/service files directly.
export { expenseService } from "./expense.service";
export type { ExpenseService } from "./expense.service";

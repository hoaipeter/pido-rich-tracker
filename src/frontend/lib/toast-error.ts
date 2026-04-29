import { toast } from "sonner";
import { friendlyErrorMessage } from "./error-messages";

export function toastError(error: unknown, fallback: string): void {
  toast.error(friendlyErrorMessage(error, fallback));
}

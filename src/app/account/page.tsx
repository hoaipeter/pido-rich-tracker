import type { Metadata } from "next";
import { AccountView } from "@frontend/features/account/views/AccountView";

export const metadata: Metadata = {
  title: "Account · Pido",
};

export default function AccountPage() {
  return <AccountView />;
}

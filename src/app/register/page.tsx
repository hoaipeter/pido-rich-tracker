import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@backend/auth/auth";
import { RegisterView } from "@frontend/features/auth/views/RegisterView";

export const metadata: Metadata = {
  title: "Create account",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }
  return <RegisterView />;
}

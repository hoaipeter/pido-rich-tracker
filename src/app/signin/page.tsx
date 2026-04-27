import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, googleEnabled } from "@backend/auth/auth";
import { SignInView } from "@frontend/features/auth/views/SignInView";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }
  return <SignInView googleEnabled={googleEnabled} />;
}

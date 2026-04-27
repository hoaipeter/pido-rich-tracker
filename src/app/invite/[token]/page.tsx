import { AcceptInviteView } from "@frontend/features/families/views/AcceptInviteView";

export const metadata = {
  title: "Accept invite · Pido Tracker",
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function AcceptInvitePage({ params }: PageProps) {
  const { token } = await params;
  return <AcceptInviteView token={token} />;
}

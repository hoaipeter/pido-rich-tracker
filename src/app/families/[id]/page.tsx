import { FamilyDetailView } from "@frontend/features/families/views/FamilyDetailView";

export const metadata = {
  title: "Workspace · Pido Tracker",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FamilyDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <FamilyDetailView familyId={id} />;
}

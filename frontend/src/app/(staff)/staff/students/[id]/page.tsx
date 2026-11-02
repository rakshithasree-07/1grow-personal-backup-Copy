import { StudentDetailPage } from "@/features/foundation/pages/student-detail-page";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudentDetailPage studentId={id} basePath="/staff/students" />;
}

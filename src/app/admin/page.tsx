import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, isValidSessionToken } from "@/lib/adminAuth";
import { DailyUploadForm } from "@/components/DailyUploadForm";
import { AdminLogoutButton } from "@/components/AdminLogoutButton";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!isValidSessionToken(session)) redirect("/admin/login");

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 gap-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Daily data update</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Upload today&apos;s Daily_file_v1.xlsx to update companies, quarterly financials, and ROE/ROCE.
          </p>
        </div>
        <AdminLogoutButton />
      </header>

      <DailyUploadForm />
    </div>
  );
}

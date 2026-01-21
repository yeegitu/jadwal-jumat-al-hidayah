import { Suspense } from "react";
import AdminLoginClient from "./AdminLoginClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminLoginClient />
    </Suspense>
  );
}

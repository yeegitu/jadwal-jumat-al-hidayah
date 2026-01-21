import { Suspense } from "react";
import AdminLoginClient from "./AdminLoginClient";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminLoginClient />
    </Suspense>
  );
}

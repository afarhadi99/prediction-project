import { Suspense } from "react";
import { connection } from "next/server";
import { Dashboard } from "@/components/dashboard";
import { getDemoGames } from "@/lib/demo-games";

async function RequestDashboard() {
  await connection();
  return <Dashboard initialGames={getDemoGames()} />;
}

export default function Home() {
  return (
    <Suspense fallback={<Dashboard initialGames={[]} />}>
      <RequestDashboard />
    </Suspense>
  );
}

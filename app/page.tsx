import { LeagueConnect } from "@/components/league/league-connect";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="w-full max-w-5xl p-5">
        <LeagueConnect />
      </div>
    </main>
  );
}

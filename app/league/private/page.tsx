import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  searchParams: Promise<{ leagueId?: string }>;
};

export default async function PrivateLeagueLinkPage({ searchParams }: Props) {
  const { leagueId } = await searchParams;

  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="w-full max-w-3xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Private league connection</CardTitle>
            <CardDescription>
              League ID: <span className="font-mono">{leagueId ?? "—"}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              Next step (we’ll implement this soon): this page will help you securely provide the
              session details needed to fetch private league data from ESPN, and then it will
              return a metadata JSON blob you can paste back into the main app.
            </p>
            <p className="text-muted-foreground">
              For now, you can go back and paste any metadata JSON you already have.
            </p>
            <div className="pt-2">
              <Button asChild>
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}



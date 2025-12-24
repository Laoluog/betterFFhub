"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Mode = "public" | "private";
type PrivateTab = "credentials" | "instructions";

function sanitizeLeagueId(value: string) {
  return value.replace(/[^\d]/g, "");
}

function getParseContentEndpoint() {
  return "http://127.0.0.1:5000/parse-content";
}

export function LeagueConnect() {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>("public");
  const [privateTab, setPrivateTab] = React.useState<PrivateTab>("credentials");
  const [publicLeagueName, setPublicLeagueName] = React.useState("");
  const [publicLeagueId, setPublicLeagueId] = React.useState("");
  const [privateLeagueName, setPrivateLeagueName] = React.useState("");
  const [privateLeagueId, setPrivateLeagueId] = React.useState("");
  const [swid, setSwid] = React.useState("");
  const [espnS2, setEspnS2] = React.useState("");
  const [publicStatus, setPublicStatus] = React.useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [publicMessage, setPublicMessage] = React.useState<string | null>(null);
  const [privateStatus, setPrivateStatus] = React.useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [privateMessage, setPrivateMessage] = React.useState<string | null>(null);

  const publicLeagueIdSanitized = sanitizeLeagueId(publicLeagueId);
  const privateLeagueIdSanitized = sanitizeLeagueId(privateLeagueId);

  async function onSubmitPublic(e: React.FormEvent) {
    e.preventDefault();
    const id = publicLeagueIdSanitized;
    const name = publicLeagueName.trim();
    if (!id) return;

    try {
      setPublicStatus("loading");
      setPublicMessage(null);

      const parseResponse = await fetch(getParseContentEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leagueName: name,
          leagueId: id,
          source: "public",
        }),
      });
      if (!parseResponse.ok) {
        const text = await parseResponse.text().catch(() => "");
        throw new Error(text || "Request failed");
      }

      // Get the response data
      const responseData = await parseResponse.json();

      // Store league data in localStorage for the dashboard
      localStorage.setItem("leagueData", JSON.stringify({
        leagueName: name || "My League",
        leagueId: id,
        standings: responseData.standings,
        teams: responseData.teams,
        rosters: responseData.rosters,
      }));

      // Clear form fields
      setPublicLeagueName("");
      setPublicLeagueId("");
      setPublicStatus("success");
      setPublicMessage("League connected! Redirecting...");

      // Navigate to dashboard with league info
      setTimeout(() => {
        router.push(`/dashboard?leagueId=${id}&leagueName=${encodeURIComponent(name || "My League")}`);
      }, 500);
    } catch (error) {
      console.error("[LeagueConnect] Error submitting public league", error);
      setPublicStatus("error");
      setPublicMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  async function onSubmitPrivate(e: React.FormEvent) {
    e.preventDefault();
    const id = privateLeagueIdSanitized;
    const name = privateLeagueName.trim();
    if (!id || !swid.trim() || !espnS2.trim()) return;

    try {
      setPrivateStatus("loading");
      setPrivateMessage(null);

      const parseResponse = await fetch(getParseContentEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leagueName: name,
          leagueId: id,
          source: "private",
          swid: swid.trim(),
          espn_s2: espnS2.trim(),
        }),
      });
      if (!parseResponse.ok) {
        const text = await parseResponse.text().catch(() => "");
        throw new Error(text || "Request failed");
      }

      // Get the response data
      const responseData = await parseResponse.json();

      // Store league data in localStorage for the dashboard
      localStorage.setItem("leagueData", JSON.stringify({
        leagueName: name || "My League",
        leagueId: id,
        standings: responseData.standings,
        teams: responseData.teams,
        rosters: responseData.rosters,
      }));

      // Clear form fields
      setPrivateLeagueName("");
      setPrivateLeagueId("");
      setSwid("");
      setEspnS2("");
      setPrivateStatus("success");
      setPrivateMessage("League connected! Redirecting...");

      // Navigate to dashboard with league info
      setTimeout(() => {
        router.push(`/dashboard?leagueId=${id}&leagueName=${encodeURIComponent(name || "My League")}`);
      }, 500);
    } catch (error) {
      console.error("[LeagueConnect] Error submitting private league credentials", error);
      setPrivateStatus("error");
      setPrivateMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  return (
    <section className="w-full">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">Connect your ESPN league</h2>
        <p className="text-sm text-muted-foreground">
          Start by entering your League ID. If your league is private, you'll need to provide your
          ESPN authentication cookies (SWID and espn_s2).
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          type="button"
          variant={mode === "public" ? "default" : "outline"}
          onClick={() => setMode("public")}
          aria-pressed={mode === "public"}
        >
          Public
        </Button>
        <Button
          type="button"
          variant={mode === "private" ? "default" : "outline"}
          onClick={() => setMode("private")}
          aria-pressed={mode === "private"}
        >
          Private
        </Button>
      </div>

      <div className="mt-4">
        {mode === "public" ? (
          <Card>
            <CardHeader>
              <CardTitle>Public league</CardTitle>
              <CardDescription>
                If your league is public, we can fetch it directly using the League ID.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col gap-4" onSubmit={onSubmitPublic}>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="publicLeagueName">League Name</Label>
                  <Input
                    id="publicLeagueName"
                    placeholder="e.g. Fantasy Football Champions"
                    value={publicLeagueName}
                    onChange={(e) => setPublicLeagueName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    A friendly name to identify your league.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="publicLeagueId">League ID</Label>
                  <Input
                    id="publicLeagueId"
                    inputMode="numeric"
                    pattern="\d*"
                    placeholder="e.g. 123456"
                    value={publicLeagueId}
                    onChange={(e) => setPublicLeagueId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll auto-strip spaces and non-numeric characters.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={!publicLeagueIdSanitized || publicStatus === "loading"}>
                    {publicStatus === "loading" ? "Connecting..." : "Connect League"}
                  </Button>
                  {!publicLeagueIdSanitized ? (
                    <span className="text-xs text-muted-foreground">Enter a League ID to start.</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Ready to connect.
                    </span>
                  )}
                </div>
                {publicMessage ? (
                  <p
                    className={cn(
                      "text-sm",
                      publicStatus === "error"
                        ? "text-destructive"
                        : publicStatus === "success"
                          ? "text-green-600"
                          : "text-muted-foreground",
                    )}
                  >
                    {publicMessage}
                  </p>
                ) : null}
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Private league</CardTitle>
              <CardDescription>
                Private leagues require authentication cookies from your ESPN session.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Tab navigation */}
              <div className="mb-6 flex gap-2 border-b pb-2">
                <button
                  type="button"
                  onClick={() => setPrivateTab("credentials")}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-t transition-colors",
                    privateTab === "credentials"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  Credentials
                </button>
                <button
                  type="button"
                  onClick={() => setPrivateTab("instructions")}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-t transition-colors",
                    privateTab === "instructions"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  Instructions
                </button>
              </div>

              {privateTab === "instructions" ? (
                <div className="flex flex-col gap-4">
                  <h3 className="text-base font-semibold">How to find your ESPN cookies</h3>
                  <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
                    <li className="leading-relaxed">
                      <span className="text-foreground font-medium">Open ESPN Fantasy in Chrome.</span>
                      <br />
                      <span className="ml-5 text-xs">Go to fantasy.espn.com and make sure you're logged in.</span>
                    </li>
                    <li className="leading-relaxed">
                      <span className="text-foreground font-medium">Right-click → Inspect.</span>
                      <br />
                      <span className="ml-5 text-xs">Or press F12 / Cmd+Option+I (Mac) / Ctrl+Shift+I (Windows).</span>
                    </li>
                    <li className="leading-relaxed">
                      <span className="text-foreground font-medium">Go to the Application tab.</span>
                      <br />
                      <span className="ml-5 text-xs">You may need to click the &gt;&gt; arrows to find it.</span>
                    </li>
                    <li className="leading-relaxed">
                      <span className="text-foreground font-medium">Click Cookies → fantasy.espn.com.</span>
                      <br />
                      <span className="ml-5 text-xs">In the left sidebar under "Storage".</span>
                    </li>
                    <li className="leading-relaxed">
                      <span className="text-foreground font-medium">Find the rows named SWID and espn_s2.</span>
                      <br />
                      <span className="ml-5 text-xs">Copy the long strings of text from the "Value" column.</span>
                    </li>
                  </ol>
                  <div className="mt-2 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                    <strong className="text-foreground">Tip:</strong> SWID looks like a GUID in curly braces (e.g., {"{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}"}). 
                    espn_s2 is a very long alphanumeric string.
                  </div>
                </div>
              ) : (
                <form className="flex flex-col gap-5" onSubmit={onSubmitPrivate}>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="privateLeagueName">League Name</Label>
                    <Input
                      id="privateLeagueName"
                      placeholder="e.g. Fantasy Football Champions"
                      value={privateLeagueName}
                      onChange={(e) => setPrivateLeagueName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      A friendly name to identify your league.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="privateLeagueId">League ID</Label>
                    <Input
                      id="privateLeagueId"
                      inputMode="numeric"
                      pattern="\d*"
                      placeholder="e.g. 123456"
                      value={privateLeagueId}
                      onChange={(e) => setPrivateLeagueId(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Found in your league URL: fantasy.espn.com/football/league?leagueId=<strong>123456</strong>
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="swid">SWID</Label>
                    <Input
                      id="swid"
                      placeholder="{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}"
                      value={swid}
                      onChange={(e) => setSwid(e.target.value)}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Your ESPN session ID (including the curly braces).
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="espnS2">espn_s2</Label>
                    <Input
                      id="espnS2"
                      placeholder="AEBj3k..."
                      value={espnS2}
                      onChange={(e) => setEspnS2(e.target.value)}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Your ESPN authentication token (a long alphanumeric string).
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="submit"
                      disabled={
                        !privateLeagueIdSanitized ||
                        !swid.trim() ||
                        !espnS2.trim() ||
                        privateStatus === "loading"
                      }
                    >
                      {privateStatus === "loading" ? "Connecting..." : "Connect League"}
                    </Button>
                    {!privateLeagueIdSanitized || !swid.trim() || !espnS2.trim() ? (
                      <span className="text-xs text-muted-foreground">
                        Fill in all fields to continue.
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Ready to connect.
                      </span>
                    )}
                  </div>
                  {privateMessage ? (
                    <p
                      className={cn(
                        "text-sm",
                        privateStatus === "error" ? "text-destructive" : privateStatus === "success" ? "text-green-600" : "text-muted-foreground",
                      )}
                    >
                      {privateMessage}
                    </p>
                  ) : null}
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}



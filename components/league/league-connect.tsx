"use client";

import * as React from "react";

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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Mode = "public" | "private";

function sanitizeLeagueId(value: string) {
  return value.replace(/[^\d]/g, "");
}

const DEFAULT_PARSE_CONTENT_ENDPOINT = "/parse-content";

function getParseContentEndpoint() {
  // Optional override for environments where the backend lives on a different origin.
  // Example: NEXT_PUBLIC_PARSE_CONTENT_ENDPOINT="http://localhost:8000/parse-content"
  // return process.env.NEXT_PUBLIC_PARSE_CONTENT_ENDPOINT || DEFAULT_PARSE_CONTENT_ENDPOINT;
  return "http://127.0.0.1:5000/parse-content";
}

function buildEspnLeagueUrl(leagueId: string) {
  const url = new URL(
    `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2025/segments/0/leagues/${leagueId}`,
  );
  url.searchParams.append("view", "mMatchupScore");
  url.searchParams.append("view", "mTeam");
  url.searchParams.append("view", "mSettings");
  url.searchParams.append("view", "mRoster");
  url.searchParams.append("view", "mTransactions");
  return url.toString();
}

function isPrivateLeaguePayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return false;

  const p = payload as {
    messages?: unknown;
    details?: Array<{ type?: string; message?: string; shortMessage?: string }>;
  };

  const messages = Array.isArray(p.messages) ? p.messages : [];
  const hasUnauthorizedMessage = messages.some(
    (m) => typeof m === "string" && m.includes("not authorized to view this League"),
  );
  const details = Array.isArray(p.details) ? p.details : [];
  const hasAuthType = details.some((d) => d?.type === "AUTH_LEAGUE_NOT_VISIBLE");

  return hasUnauthorizedMessage || hasAuthType;
}

export function LeagueConnect() {
  const [mode, setMode] = React.useState<Mode>("public");
  const [publicLeagueId, setPublicLeagueId] = React.useState("");
  const [privateLeagueId, setPrivateLeagueId] = React.useState("");
  const [privateLink, setPrivateLink] = React.useState<string>("");
  const [metadataJson, setMetadataJson] = React.useState("");
  const [metadataError, setMetadataError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [publicStatus, setPublicStatus] = React.useState<
    "idle" | "loading" | "private" | "success" | "error"
  >("idle");
  const [publicMessage, setPublicMessage] = React.useState<string | null>(null);
  const [privateStatus, setPrivateStatus] = React.useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [privateMessage, setPrivateMessage] = React.useState<string | null>(null);

  const publicLeagueIdSanitized = sanitizeLeagueId(publicLeagueId);
  const privateLeagueIdSanitized = sanitizeLeagueId(privateLeagueId);

  React.useEffect(() => {
    if (!metadataJson.trim()) {
      setMetadataError(null);
      return;
    }
    try {
      JSON.parse(metadataJson);
      setMetadataError(null);
    } catch {
      setMetadataError("That doesn't look like valid JSON yet.");
    }
  }, [metadataJson]);

  async function onCopyLink() {
    if (!privateLink) return;
    try {
      await navigator.clipboard.writeText(privateLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore; some browsers block clipboard without user gesture
    }
  }

  function onGenerateLink() {
    const id = privateLeagueIdSanitized;
    if (!id) return;
    setPrivateLink(buildEspnLeagueUrl(id));
  }

  async function onSubmitPublic(e: React.FormEvent) {
    e.preventDefault();
    const id = publicLeagueIdSanitized;
    if (!id) return;

    try {
      setPublicStatus("loading");
      setPublicMessage(null);

      const espnUrl = buildEspnLeagueUrl(id);
      // Requirement: "on continue it opens up this link"
      window.open(espnUrl, "_blank", "noopener,noreferrer");

      const response = await fetch(espnUrl);

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        payload = await response.text();
      }

      if (isPrivateLeaguePayload(payload)) {
        setPublicStatus("private");
        setPublicMessage("This league appears to be private. Switch to the Private flow below.");

        // Smooth handoff into private mode.
        setMode("private");
        setPrivateLeagueId(id);
        setPrivateLink(buildEspnLeagueUrl(id));
        return;
      }

      if (!response.ok) {
        throw new Error(`ESPN request failed (${response.status})`);
      }

      const parseResponse = await fetch(getParseContentEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leagueId: id,
          source: "public",
          content: payload,
        }),
      });
      if (!parseResponse.ok) {
        const text = await parseResponse.text().catch(() => "");
        throw new Error(text || "parse-content request failed");
      }

      setPublicStatus("success");
      setPublicMessage("Fetched league data and sent it to the parser.");
    } catch (error) {
      console.error("[LeagueConnect] Error submitting public league ID", error);
      setPublicStatus("error");
      setPublicMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  async function onSubmitPrivate(e: React.FormEvent) {
    e.preventDefault();
    const id = privateLeagueIdSanitized;
    if (!id) return;
    if (!privateLink) onGenerateLink();
    if (!metadataJson.trim()) {
      setMetadataError("Paste the JSON you received from ESPN so we can parse it.");
      return;
    }
    if (metadataError) return;

    try {
      setPrivateStatus("loading");
      setPrivateMessage(null);

      const parsed = JSON.parse(metadataJson);

      const parseResponse = await fetch(getParseContentEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leagueId: id,
          source: "private",
          content: parsed,
        }),
      });
      if (!parseResponse.ok) {
        const text = await parseResponse.text().catch(() => "");
        throw new Error(text || "parse-content request failed");
      }

      setPrivateStatus("success");
      setPrivateMessage("Sent your JSON to the parser.");
    } catch (error) {
      console.error("[LeagueConnect] Error submitting private league JSON", error);
      setPrivateStatus("error");
      setPrivateMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  return (
    <section className="w-full">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">Connect your ESPN league</h2>
        <p className="text-sm text-muted-foreground">
          Start by entering your League ID. If your league is private, we’ll help you generate a
          custom link to collect the metadata we need.
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
                    We’ll auto-strip spaces and non-numeric characters.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={!publicLeagueIdSanitized || publicStatus === "loading"}>
                    Continue
                  </Button>
                  {!publicLeagueIdSanitized ? (
                    <span className="text-xs text-muted-foreground">Enter a League ID to start.</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {publicStatus === "loading" ? "Fetching ESPN data…" : "Ready to fetch public league data."}
                    </span>
                  )}
                </div>
                {publicMessage ? (
                  <p
                    className={cn(
                      "text-sm",
                      publicStatus === "error"
                        ? "text-destructive"
                        : publicStatus === "private"
                          ? "text-amber-600"
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
                Private leagues require metadata that’s only available to logged-in league members.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col gap-5" onSubmit={onSubmitPrivate}>
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
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Custom link</Label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      readOnly
                      value={privateLink || ""}
                      placeholder="Generate a link from your League ID"
                      className="font-mono text-xs"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={onGenerateLink}
                        disabled={!privateLeagueIdSanitized}
                      >
                        Generate link
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onCopyLink}
                        disabled={!privateLink}
                      >
                        {copied ? "Copied" : "Copy"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => privateLink && window.open(privateLink, "_blank")}
                        disabled={!privateLink}
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This will open a page in this app (we’ll implement the ESPN cookie/login capture
                    flow next). For now, you can paste the returned metadata JSON below.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="metadataJson">Metadata JSON</Label>
                  <Textarea
                    id="metadataJson"
                    placeholder='Paste JSON here (example: {"leagueId":123456,...})'
                    value={metadataJson}
                    onChange={(e) => setMetadataJson(e.target.value)}
                    rows={18}
                    className={cn(
                      "min-h-[360px] font-mono text-xs leading-relaxed resize-y",
                      metadataError ? "border-destructive focus-visible:ring-destructive" : "",
                    )}
                  />
                  {metadataError ? (
                    <p className="text-xs text-destructive">{metadataError}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      If valid, we’ll parse this and use it to understand your league settings and
                      roster rules.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    disabled={
                      !privateLeagueIdSanitized ||
                      !metadataJson.trim() ||
                      Boolean(metadataError) ||
                      privateStatus === "loading"
                    }
                  >
                    Continue
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Paste the JSON you received from ESPN, then continue.
                  </span>
                </div>
                {privateMessage ? (
                  <p
                    className={cn(
                      "text-sm",
                      privateStatus === "error" ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {privateMessage}
                  </p>
                ) : null}
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}



"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Types for the player data
interface PlayerStats {
  points: number;
  projected_points: number;
  breakdown: Record<string, number>;
  projected_breakdown: Record<string, number>;
}

interface Player {
  name: string;
  playerId: number;
  position: string;
  posRank: number | null;
  eligibleSlots: string[];
  lineupSlot: string;
  acquisitionType: string | null;
  proTeam: string;
  onTeamId: number | null;
  injuryStatus: string;
  injured: boolean;
  total_points: number;
  projected_total_points: number;
  avg_points: number;
  projected_avg_points: number;
  percent_owned: number;
  percent_started: number;
  stats: Record<string, PlayerStats>;
  headshotUrl: string | null;
}

interface LeagueData {
  leagueName: string;
  leagueId: string;
  rosters: Record<string, Player[]>;
}

// NFL team colors for styling
const teamColors: Record<string, { primary: string; secondary: string }> = {
  ARI: { primary: "#97233F", secondary: "#000000" },
  ATL: { primary: "#A71930", secondary: "#000000" },
  BAL: { primary: "#241773", secondary: "#000000" },
  BUF: { primary: "#00338D", secondary: "#C60C30" },
  CAR: { primary: "#0085CA", secondary: "#101820" },
  CHI: { primary: "#0B162A", secondary: "#C83803" },
  CIN: { primary: "#FB4F14", secondary: "#000000" },
  CLE: { primary: "#311D00", secondary: "#FF3C00" },
  DAL: { primary: "#003594", secondary: "#869397" },
  DEN: { primary: "#FB4F14", secondary: "#002244" },
  DET: { primary: "#0076B6", secondary: "#B0B7BC" },
  GB: { primary: "#203731", secondary: "#FFB612" },
  HOU: { primary: "#03202F", secondary: "#A71930" },
  IND: { primary: "#002C5F", secondary: "#A2AAAD" },
  JAX: { primary: "#006778", secondary: "#D7A22A" },
  KC: { primary: "#E31837", secondary: "#FFB81C" },
  LAC: { primary: "#0080C6", secondary: "#FFC20E" },
  LAR: { primary: "#003594", secondary: "#FFA300" },
  LV: { primary: "#000000", secondary: "#A5ACAF" },
  MIA: { primary: "#008E97", secondary: "#FC4C02" },
  MIN: { primary: "#4F2683", secondary: "#FFC62F" },
  NE: { primary: "#002244", secondary: "#C60C30" },
  NO: { primary: "#D3BC8D", secondary: "#101820" },
  NYG: { primary: "#0B2265", secondary: "#A71930" },
  NYJ: { primary: "#125740", secondary: "#000000" },
  PHI: { primary: "#004C54", secondary: "#A5ACAF" },
  PIT: { primary: "#FFB612", secondary: "#101820" },
  SEA: { primary: "#002244", secondary: "#69BE28" },
  SF: { primary: "#AA0000", secondary: "#B3995D" },
  TB: { primary: "#D50A0A", secondary: "#34302B" },
  TEN: { primary: "#0C2340", secondary: "#4B92DB" },
  WSH: { primary: "#5A1414", secondary: "#FFB612" },
};

// Stat display name mapping
const statDisplayNames: Record<string, string> = {
  receivingYards: "Receiving Yards",
  receivingReceptions: "Receptions",
  receivingTargets: "Targets",
  receivingTouchdowns: "Receiving TDs",
  rushingYards: "Rushing Yards",
  rushingAttempts: "Rush Attempts",
  rushingTouchdowns: "Rushing TDs",
  passingYards: "Passing Yards",
  passingAttempts: "Pass Attempts",
  passingCompletions: "Completions",
  passingTouchdowns: "Passing TDs",
  passingInterceptions: "Interceptions",
  fumbles: "Fumbles",
  madeFieldGoals: "FG Made",
  attemptedFieldGoals: "FG Attempted",
  madeExtraPoints: "XP Made",
  attemptedExtraPoints: "XP Attempted",
  defensiveBlockedKickForTouchdowns: "Blocked Kicks TD",
  defensiveFumbles: "Fumbles Recovered",
  defensiveInterceptions: "Interceptions",
  defensiveSacks: "Sacks",
  defensiveTouchdowns: "Defensive TDs",
  defensivePointsAllowed: "Points Allowed",
};

export default function PlayerPage() {
  const params = useParams();
  const router = useRouter();
  const playerId = params.playerId as string;
  
  const [player, setPlayer] = React.useState<Player | null>(null);
  const [teamName, setTeamName] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("leagueData");
      if (stored) {
        const data = JSON.parse(stored) as LeagueData;
        // Find the player across all rosters
        for (const [team, roster] of Object.entries(data.rosters)) {
          const foundPlayer = roster.find((p) => p.playerId.toString() === playerId);
          if (foundPlayer) {
            setPlayer(foundPlayer);
            setTeamName(team);
            break;
          }
        }
      }
    } catch (error) {
      console.error("Error loading player data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [playerId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="text-white text-xl">Player not found</div>
        <button
          onClick={() => router.back()}
          className="text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          ← Go back
        </button>
      </div>
    );
  }

  const teamColor = teamColors[player.proTeam] || { primary: "#1e293b", secondary: "#64748b" };
  const weeklyStats = Object.entries(player.stats || {}).sort(([a], [b]) => Number(a) - Number(b));
  
  // Calculate performance vs projection
  const performanceVsProjection = player.projected_total_points > 0 
    ? ((player.total_points / player.projected_total_points) * 100 - 100).toFixed(1)
    : "0";
  const isOverperforming = Number(performanceVsProjection) > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Ambient background with team color */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: teamColor.primary }}
        />
        <div 
          className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10"
          style={{ backgroundColor: teamColor.secondary }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto p-8">
        {/* Back Button */}
        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>

        {/* Player Header */}
        <div className="flex flex-col md:flex-row gap-8 mb-10">
          {/* Player Image */}
          <div className="flex-shrink-0">
            <div 
              className="w-48 h-48 rounded-2xl overflow-hidden border-4 shadow-2xl"
              style={{ borderColor: teamColor.primary }}
            >
              {!imageError && player.headshotUrl ? (
                <img
                  src={player.headshotUrl}
                  alt={player.name}
                  className="w-full h-full object-cover bg-slate-800"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                  <span className="text-6xl text-slate-600">
                    {player.position === "D/ST" ? "🏈" : "👤"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Player Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span 
                className="px-3 py-1 rounded-full text-sm font-bold"
                style={{ backgroundColor: teamColor.primary, color: "#fff" }}
              >
                {player.proTeam}
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-700 text-slate-200 text-sm font-medium">
                {player.position}
              </span>
              {player.posRank && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium">
                  #{player.posRank} {player.position}
                </span>
              )}
              {player.injuryStatus && player.injuryStatus !== "ACTIVE" && player.injuryStatus !== "NORMAL" && (
                <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm font-medium">
                  {player.injuryStatus}
                </span>
              )}
            </div>
            
            <h1 className="text-4xl font-bold text-white mb-2">{player.name}</h1>
            
            <p className="text-slate-400 mb-4">
              Rostered by <span className="text-emerald-400 font-medium">{teamName}</span>
              {player.acquisitionType && (
                <span className="text-slate-500"> • Acquired via {player.acquisitionType}</span>
              )}
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Total Points</p>
                <p className="text-2xl font-bold text-white">{player.total_points.toFixed(1)}</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Avg Points</p>
                <p className="text-2xl font-bold text-white">{player.avg_points.toFixed(1)}</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Projected</p>
                <p className="text-2xl font-bold text-slate-400">{player.projected_total_points.toFixed(1)}</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <p className="text-xs text-slate-500 uppercase tracking-wider">vs Projection</p>
                <p className={cn(
                  "text-2xl font-bold",
                  isOverperforming ? "text-emerald-400" : "text-red-400"
                )}>
                  {isOverperforming ? "+" : ""}{performanceVsProjection}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ownership & Start Stats */}
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">League Trends</h2>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">% Rostered</span>
                  <span className="text-white font-medium">{player.percent_owned.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(player.percent_owned, 100)}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">% Started</span>
                  <span className="text-white font-medium">{player.percent_started.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(player.percent_started, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-700/50">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Eligible Positions</h3>
              <div className="flex flex-wrap gap-2">
                {(player.eligibleSlots || [player.position]).map((slot) => (
                  <span 
                    key={slot}
                    className="px-2 py-1 rounded bg-slate-700/50 text-slate-300 text-xs"
                  >
                    {slot === "RB/WR/TE" ? "FLEX" : slot}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-700/50">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Current Lineup Slot</h3>
              <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-medium">
                {player.lineupSlot === "RB/WR/TE" ? "FLEX" : player.lineupSlot}
              </span>
            </div>
          </div>

          {/* Weekly Performance Chart */}
          <div className="lg:col-span-2 bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Weekly Performance</h2>
            
            {weeklyStats.length === 0 ? (
              <p className="text-slate-500">No weekly stats available</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-auto">
                {weeklyStats.map(([week, stats]) => {
                  const diff = stats.points - stats.projected_points;
                  const isPositive = diff >= 0;
                  const maxPoints = Math.max(stats.points, stats.projected_points, 30);
                  
                  return (
                    <div key={week} className="bg-slate-900/50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-300">Week {week}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-white">{stats.points.toFixed(1)}</span>
                          <span className={cn(
                            "text-sm font-medium px-2 py-0.5 rounded",
                            isPositive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                          )}>
                            {isPositive ? "+" : ""}{diff.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="relative h-6 flex items-center gap-2">
                        {/* Actual points bar */}
                        <div className="flex-1 h-3 bg-slate-700/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${(stats.points / maxPoints) * 100}%` }}
                          />
                        </div>
                        {/* Projected marker */}
                        <div 
                          className="absolute top-0 bottom-0 w-0.5 bg-slate-400"
                          style={{ left: `${(stats.projected_points / maxPoints) * 100}%` }}
                        />
                      </div>
                      
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>Actual: {stats.points.toFixed(1)}</span>
                        <span>Projected: {stats.projected_points.toFixed(1)}</span>
                      </div>

                      {/* Stat Breakdown */}
                      {Object.keys(stats.breakdown || {}).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700/30">
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(stats.breakdown).slice(0, 6).map(([stat, value]) => (
                              <span key={stat} className="text-xs text-slate-400">
                                {statDisplayNames[stat] || stat}: <span className="text-slate-200">{typeof value === 'number' ? value.toFixed(1) : value}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recommendations Section */}
        <div className="mt-8 bg-gradient-to-r from-slate-800/50 to-slate-800/30 rounded-2xl border border-slate-700/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">💡 Additional Features Coming Soon</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/50">
              <span className="text-2xl">📈</span>
              <div>
                <h3 className="font-medium text-white">Trade Value Chart</h3>
                <p className="text-sm text-slate-400">See this player&apos;s trade value and comparable players</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/50">
              <span className="text-2xl">📅</span>
              <div>
                <h3 className="font-medium text-white">Schedule Analysis</h3>
                <p className="text-sm text-slate-400">Upcoming matchups and difficulty ratings</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/50">
              <span className="text-2xl">📊</span>
              <div>
                <h3 className="font-medium text-white">Advanced Metrics</h3>
                <p className="text-sm text-slate-400">Target share, snap counts, red zone usage</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/50">
              <span className="text-2xl">🔄</span>
              <div>
                <h3 className="font-medium text-white">Similar Players</h3>
                <p className="text-sm text-slate-400">Find comparable players based on stats</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/50">
              <span className="text-2xl">📰</span>
              <div>
                <h3 className="font-medium text-white">News & Updates</h3>
                <p className="text-sm text-slate-400">Latest news affecting this player</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/50">
              <span className="text-2xl">🎯</span>
              <div>
                <h3 className="font-medium text-white">Start/Sit Analysis</h3>
                <p className="text-sm text-slate-400">AI-powered recommendations</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Types for the player data
interface PlayerStats {
  points: number;
  projected_points: number;
  avg_points?: number;
  breakdown: Record<string, number>;
  projected_breakdown: Record<string, number>;
}

interface SeasonTotals {
  points: number;
  projected_points: number;
  avg_points: number;
  projected_avg_points: number;
  breakdown: Record<string, number>;
  projected_breakdown: Record<string, number>;
}

interface ScheduleGame {
  team: string;
  date: string | null;
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
  seasonTotals: SeasonTotals | null;
  schedule: Record<string, ScheduleGame>;
  headshotUrl: string | null;
}

interface LeagueData {
  leagueName: string;
  leagueId: string;
  rosters: Record<string, Player[]>;
}

// NFL team colors
const teamColors: Record<string, { primary: string; secondary: string }> = {
  ARI: { primary: "#97233F", secondary: "#000000" },
  ATL: { primary: "#A71930", secondary: "#000000" },
  BAL: { primary: "#241773", secondary: "#9E7C0C" },
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

// Stat display configuration by category
const STAT_CONFIG: Record<string, { label: string; abbr: string; format?: string; category: string; positions?: string[] }> = {
  // Passing
  passingAttempts: { label: "Pass Attempts", abbr: "ATT", category: "passing", positions: ["QB"] },
  passingCompletions: { label: "Completions", abbr: "CMP", category: "passing", positions: ["QB"] },
  passingIncompletions: { label: "Incompletions", abbr: "INC", category: "passing", positions: ["QB"] },
  passingYards: { label: "Passing Yards", abbr: "YDS", category: "passing", positions: ["QB"] },
  passingTouchdowns: { label: "Passing TDs", abbr: "TD", category: "passing", positions: ["QB"] },
  passingInterceptions: { label: "Interceptions", abbr: "INT", category: "passing", positions: ["QB"] },
  passing2PtConversions: { label: "2PT Conversions", abbr: "2PT", category: "passing", positions: ["QB"] },
  passingCompletionPercentage: { label: "Completion %", abbr: "CMP%", format: "pct", category: "passing", positions: ["QB"] },
  passing300To399YardGame: { label: "300+ Yard Games", abbr: "300+", category: "passing", positions: ["QB"] },
  passing400PlusYardGame: { label: "400+ Yard Games", abbr: "400+", category: "passing", positions: ["QB"] },
  passing40PlusYardTD: { label: "40+ Yard TDs", abbr: "40+TD", category: "passing", positions: ["QB"] },
  passingTimesSacked: { label: "Times Sacked", abbr: "SCK", category: "passing", positions: ["QB"] },
  passingCompletionYards: { label: "Completion Yards", abbr: "CYDS", category: "passing", positions: ["QB"] },
  passingFirstDowns: { label: "First Downs", abbr: "1D", category: "passing", positions: ["QB"] },
  
  // Rushing
  rushingAttempts: { label: "Rush Attempts", abbr: "ATT", category: "rushing", positions: ["RB", "QB", "WR"] },
  rushingYards: { label: "Rushing Yards", abbr: "YDS", category: "rushing", positions: ["RB", "QB", "WR"] },
  rushingTouchdowns: { label: "Rushing TDs", abbr: "TD", category: "rushing", positions: ["RB", "QB", "WR"] },
  rushing2PtConversions: { label: "2PT Conversions", abbr: "2PT", category: "rushing", positions: ["RB", "QB"] },
  rushingYardsPerAttempt: { label: "Yards/Attempt", abbr: "YPC", format: "decimal", category: "rushing", positions: ["RB", "QB", "WR"] },
  rushing100To199YardGame: { label: "100+ Yard Games", abbr: "100+", category: "rushing", positions: ["RB"] },
  rushingFirstDowns: { label: "First Downs", abbr: "1D", category: "rushing", positions: ["RB", "QB"] },
  
  // Receiving
  receivingReceptions: { label: "Receptions", abbr: "REC", category: "receiving", positions: ["WR", "TE", "RB"] },
  receivingTargets: { label: "Targets", abbr: "TGT", category: "receiving", positions: ["WR", "TE", "RB"] },
  receivingYards: { label: "Receiving Yards", abbr: "YDS", category: "receiving", positions: ["WR", "TE", "RB"] },
  receivingTouchdowns: { label: "Receiving TDs", abbr: "TD", category: "receiving", positions: ["WR", "TE", "RB"] },
  receiving2PtConversions: { label: "2PT Conversions", abbr: "2PT", category: "receiving", positions: ["WR", "TE", "RB"] },
  receivingYardsAfterCatch: { label: "Yards After Catch", abbr: "YAC", category: "receiving", positions: ["WR", "TE", "RB"] },
  receivingYardsPerReception: { label: "Yards/Reception", abbr: "YPR", format: "decimal", category: "receiving", positions: ["WR", "TE", "RB"] },
  receivingFirstDowns: { label: "First Downs", abbr: "1D", category: "receiving", positions: ["WR", "TE", "RB"] },
  
  // Kicking
  madeFieldGoals: { label: "FG Made", abbr: "FGM", category: "kicking", positions: ["K"] },
  attemptedFieldGoals: { label: "FG Attempted", abbr: "FGA", category: "kicking", positions: ["K"] },
  missedFieldGoals: { label: "FG Missed", abbr: "FGX", category: "kicking", positions: ["K"] },
  madeFieldGoals50Plus: { label: "50+ FG Made", abbr: "50+", category: "kicking", positions: ["K"] },
  madeFieldGoals40To49: { label: "40-49 FG Made", abbr: "40-49", category: "kicking", positions: ["K"] },
  madeFieldGoals1To39: { label: "Under 40 FG", abbr: "<40", category: "kicking", positions: ["K"] },
  madeExtraPoints: { label: "XP Made", abbr: "XPM", category: "kicking", positions: ["K"] },
  missedExtraPoints: { label: "XP Missed", abbr: "XPX", category: "kicking", positions: ["K"] },
  
  // Defense/ST
  defensiveSacks: { label: "Sacks", abbr: "SCK", category: "defense", positions: ["D/ST"] },
  defensiveInterceptions: { label: "Interceptions", abbr: "INT", category: "defense", positions: ["D/ST"] },
  defensiveFumbleRecoveries: { label: "Fumbles Recovered", abbr: "FR", category: "defense", positions: ["D/ST"] },
  defensiveForcedFumbles: { label: "Forced Fumbles", abbr: "FF", category: "defense", positions: ["D/ST"] },
  defensiveTouchdowns: { label: "Defensive TDs", abbr: "TD", category: "defense", positions: ["D/ST"] },
  defensivePointsAllowed: { label: "Points Allowed", abbr: "PA", category: "defense", positions: ["D/ST"] },
  defensiveSafeties: { label: "Safeties", abbr: "SAF", category: "defense", positions: ["D/ST"] },
  defensiveBlockedKicks: { label: "Blocked Kicks", abbr: "BLK", category: "defense", positions: ["D/ST"] },
  defensiveSoloTackles: { label: "Solo Tackles", abbr: "SOLO", category: "defense", positions: ["D/ST"] },
  defensiveTotalTackles: { label: "Total Tackles", abbr: "TKL", category: "defense", positions: ["D/ST"] },
  defensivePassesDefended: { label: "Passes Defended", abbr: "PD", category: "defense", positions: ["D/ST"] },
  kickReturnTouchdowns: { label: "Kick Return TDs", abbr: "KRTD", category: "defense", positions: ["D/ST"] },
  puntReturnTouchdowns: { label: "Punt Return TDs", abbr: "PRTD", category: "defense", positions: ["D/ST"] },
  interceptionReturnTouchdowns: { label: "INT Return TDs", abbr: "INTTD", category: "defense", positions: ["D/ST"] },
  fumbleReturnTouchdowns: { label: "Fumble Return TDs", abbr: "FRTD", category: "defense", positions: ["D/ST"] },
  
  // Misc/Turnovers
  fumbles: { label: "Fumbles", abbr: "FUM", category: "misc" },
  lostFumbles: { label: "Fumbles Lost", abbr: "LOST", category: "misc" },
  turnovers: { label: "Turnovers", abbr: "TO", category: "misc" },
  fumblesTotal: { label: "Total Fumbles", abbr: "FUM", category: "misc" },
};

// Category display order by position
const POSITION_CATEGORIES: Record<string, string[]> = {
  QB: ["passing", "rushing", "misc"],
  RB: ["rushing", "receiving", "misc"],
  WR: ["receiving", "rushing", "misc"],
  TE: ["receiving", "rushing", "misc"],
  K: ["kicking"],
  "D/ST": ["defense"],
};

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  passing: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
  rushing: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
  receiving: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
  kicking: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
  defense: "from-red-500/20 to-red-600/10 border-red-500/30",
  misc: "from-slate-500/20 to-slate-600/10 border-slate-500/30",
};

const CATEGORY_LABELS: Record<string, string> = {
  passing: "Passing",
  rushing: "Rushing",
  receiving: "Receiving",
  kicking: "Kicking",
  defense: "Defense/ST",
  misc: "Miscellaneous",
};

function formatStatValue(value: number, format?: string): string {
  if (format === "pct") {
    return `${(value * 100).toFixed(1)}%`;
  }
  if (format === "decimal") {
    return value.toFixed(2);
  }
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

export default function PlayerPage() {
  const params = useParams();
  const playerId = params.playerId as string;
  
  const [player, setPlayer] = React.useState<Player | null>(null);
  const [teamName, setTeamName] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [imageError, setImageError] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"weekly" | "season" | "schedule">("weekly");

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("leagueData");
      if (stored) {
        const data = JSON.parse(stored) as LeagueData;
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
        <div className="animate-pulse text-white text-xl">Loading player data...</div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="text-white text-2xl font-bold">Player Not Found</div>
        <p className="text-slate-400">Could not find player with ID: {playerId}</p>
        <Link href="/dashboard" className="text-emerald-400 hover:text-emerald-300 transition-colors">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const teamColor = teamColors[player.proTeam] || { primary: "#1e293b", secondary: "#64748b" };
  const categories = POSITION_CATEGORIES[player.position] || ["rushing", "receiving", "misc", "team"];
  
  // Process weekly stats - ensure all weeks 1-17 are represented
  const allWeeks = Array.from({ length: 17 }, (_, i) => (i + 1).toString());
  const weeklyStats: [string, PlayerStats][] = allWeeks.map((week) => {
    const existingStats = player.stats?.[week];
    if (existingStats) {
      return [week, existingStats];
    }
    // Return empty stats for weeks without data
    return [week, {
      points: 0,
      projected_points: 0,
      avg_points: 0,
      breakdown: {},
      projected_breakdown: {},
    }];
  });
  
  // Get actual stats (weeks with real data) for metric calculations
  const actualWeeklyStats = Object.entries(player.stats || {})
    .filter(([week]) => week !== "0")
    .sort(([a], [b]) => Number(a) - Number(b));
  
  // Calculate metrics from actual data
  const gamesPlayed = actualWeeklyStats.filter(([, s]) => s.points > 0).length;
  const weeklyPoints = actualWeeklyStats.map(([, s]) => s.points).filter(p => p > 0);
  const maxWeek = Math.max(...weeklyPoints, 0);
  const minWeek = Math.min(...weeklyPoints.filter(p => p > 0), Infinity);
  const performanceVsProjection = player.projected_total_points > 0 
    ? ((player.total_points / player.projected_total_points) * 100 - 100)
    : 0;
  const isOverperforming = performanceVsProjection > 0;
  
  // Consistency score (lower std dev = higher consistency)
  const pointsStdDev = weeklyPoints.length > 1 
    ? Math.sqrt(weeklyPoints.reduce((sum, p) => sum + Math.pow(p - player.avg_points, 2), 0) / weeklyPoints.length)
    : 0;
  const consistencyScore = player.avg_points > 0 ? Math.max(0, Math.min(100, (1 - (pointsStdDev / player.avg_points)) * 100)) : 0;
  
  // Weeks beat projection (only count weeks with actual data)
  const weeksBeatProjection = actualWeeklyStats.filter(([, s]) => s.points >= s.projected_points && s.points > 0).length;

  // Group stats by category from season totals or aggregated weekly
  const getSeasonStats = () => {
    const breakdown = player.seasonTotals?.breakdown || {};
    // If no season totals, aggregate from actual weekly stats
    if (Object.keys(breakdown).length === 0) {
      actualWeeklyStats.forEach(([, weekData]) => {
        Object.entries(weekData.breakdown || {}).forEach(([stat, value]) => {
          breakdown[stat] = (breakdown[stat] || 0) + (typeof value === 'number' ? value : 0);
        });
      });
    }
    return breakdown;
  };
  
  const seasonBreakdown = getSeasonStats();
  
  // Organize stats by category for the position
  const statsByCategory: Record<string, Array<{ key: string; value: number; config: typeof STAT_CONFIG[string] }>> = {};
  
  Object.entries(seasonBreakdown).forEach(([stat, value]) => {
    const config = STAT_CONFIG[stat];
    if (!config) return;
    
    // Check if this stat is relevant for this position
    if (config.positions && !config.positions.includes(player.position)) return;
    
    if (!statsByCategory[config.category]) {
      statsByCategory[config.category] = [];
    }
    statsByCategory[config.category].push({ key: stat, value: value as number, config });
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Team color ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: teamColor.primary }}
        />
        <div 
          className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10"
          style={{ backgroundColor: teamColor.secondary }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto p-4 lg:p-8">
        {/* Back Button */}
        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 group"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>

        {/* Player Header Card */}
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-3xl border border-slate-700/50 p-6 lg:p-8 mb-6 overflow-hidden relative">
          <div 
            className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-30"
            style={{ backgroundColor: teamColor.primary }}
          />
          
          <div className="relative flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Player Image */}
            <div className="flex-shrink-0 flex flex-col items-center lg:items-start">
              <div 
                className="w-36 h-36 lg:w-44 lg:h-44 rounded-2xl overflow-hidden border-4 shadow-2xl bg-slate-800"
                style={{ borderColor: teamColor.primary }}
              >
                {!imageError && player.headshotUrl ? (
                  <img
                    src={player.headshotUrl}
                    alt={player.name}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">
                    {player.position === "D/ST" ? "🏈" : "👤"}
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <img 
                  src={`https://a.espncdn.com/i/teamlogos/nfl/500/${player.proTeam?.toLowerCase()}.png`}
                  alt={player.proTeam}
                  className="w-6 h-6"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
                <span className="text-slate-400 text-sm font-medium">{player.proTeam}</span>
              </div>
            </div>

            {/* Player Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span 
                  className="px-3 py-1 rounded-full text-sm font-bold text-white shadow-lg"
                  style={{ backgroundColor: teamColor.primary }}
                >
                  {player.position}
                </span>
                {player.posRank && (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-semibold border border-emerald-500/30">
                    #{player.posRank} {player.position}
                  </span>
                )}
                {player.injuryStatus && player.injuryStatus !== "ACTIVE" && player.injuryStatus !== "NORMAL" && (
                  <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm font-semibold border border-red-500/30 animate-pulse">
                    {player.injuryStatus}
                  </span>
                )}
              </div>
              
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-1 truncate">{player.name}</h1>
              
              <p className="text-slate-400 text-sm mb-4">
                Rostered by <span className="text-emerald-400 font-semibold">{teamName}</span>
                {player.acquisitionType && <span className="text-slate-500"> • {player.acquisitionType}</span>}
                {player.lineupSlot && (
                  <span className="text-slate-500"> • {player.lineupSlot === "RB/WR/TE" ? "FLEX" : player.lineupSlot}</span>
                )}
              </p>

              {/* Primary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <StatCard label="Total Pts" value={player.total_points.toFixed(1)} color="emerald" />
                <StatCard label="Avg/Game" value={player.avg_points.toFixed(1)} color="white" />
                <StatCard label="Projected" value={player.projected_total_points.toFixed(1)} color="slate" />
                <StatCard 
                  label="vs Proj" 
                  value={`${isOverperforming ? "+" : ""}${performanceVsProjection.toFixed(1)}%`} 
                  color={isOverperforming ? "emerald" : "red"} 
                />
                <StatCard label="Games" value={gamesPlayed.toString()} color="white" />
                <StatCard label="Ceiling" value={maxWeek.toFixed(1)} color="amber" />
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <MetricCard 
            label="Rostered" 
            value={`${player.percent_owned.toFixed(0)}%`}
            progress={player.percent_owned}
            color="emerald"
          />
          <MetricCard 
            label="Started" 
            value={`${player.percent_started.toFixed(0)}%`}
            progress={player.percent_started}
            color="blue"
          />
          <MetricCard 
            label="Consistency" 
            value={`${consistencyScore.toFixed(0)}%`}
            progress={consistencyScore}
            color={consistencyScore > 70 ? "emerald" : consistencyScore > 50 ? "amber" : "red"}
            subtitle={`σ = ${pointsStdDev.toFixed(1)}`}
          />
          <MetricCard 
            label="Beat Proj" 
            value={`${weeksBeatProjection}/${gamesPlayed}`}
            progress={(weeksBeatProjection / Math.max(gamesPlayed, 1)) * 100}
            color="purple"
          />
          <MetricCard 
            label="Floor" 
            value={(minWeek === Infinity ? 0 : minWeek).toFixed(1)}
            color="red"
            subtitle="Worst week"
          />
          <MetricCard 
            label="Ceiling" 
            value={maxWeek.toFixed(1)}
            color="emerald"
            subtitle="Best week"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-800/50 rounded-xl mb-6 w-fit">
          {[
            { id: "weekly", label: "Weekly Stats", icon: "📊" },
            { id: "season", label: "Season Totals", icon: "📈" },
            { id: "schedule", label: "Schedule", icon: "📅" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                "px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                activeTab === tab.id
                  ? "bg-emerald-500/20 text-emerald-400 shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              )}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "weekly" && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white mb-4">Week-by-Week Performance</h2>
            {weeklyStats.length === 0 ? (
              <div className="bg-slate-800/50 rounded-xl p-8 text-center text-slate-500">
                No weekly stats available
              </div>
            ) : (
              weeklyStats.map(([week, stats]) => (
                <WeekCard 
                  key={week}
                  week={week}
                  stats={stats}
                  opponent={player.schedule?.[week]?.team}
                  position={player.position}
                  teamColor={teamColor.primary}
                />
              ))
            )}
          </div>
        )}

        {activeTab === "season" && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Season Statistics</h2>
            {Object.keys(seasonBreakdown).length === 0 ? (
              <div className="bg-slate-800/50 rounded-xl p-8 text-center text-slate-500">
                No season stats available
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {categories.map((category) => {
                  const categoryStats = statsByCategory[category];
                  if (!categoryStats || categoryStats.length === 0) return null;
                  
                  return (
                    <div 
                      key={category}
                      className={cn(
                        "bg-gradient-to-br rounded-2xl p-5 border",
                        CATEGORY_COLORS[category]
                      )}
                    >
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                        {getCategoryIcon(category)}
                        {CATEGORY_LABELS[category]}
                      </h3>
                      <div className="space-y-3">
                        {categoryStats.map(({ key, value, config }) => (
                          <div key={key} className="flex justify-between items-center">
                            <span className="text-sm text-slate-300">{config.label}</span>
                            <span className="text-sm font-bold text-white tabular-nums">
                              {formatStatValue(value, config.format)}
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Per game averages for key stats */}
                      {gamesPlayed > 0 && category !== "team" && category !== "misc" && (
                        <div className="mt-4 pt-3 border-t border-white/10">
                          <p className="text-xs text-slate-400 mb-2">Per Game</p>
                          <div className="flex flex-wrap gap-2">
                            {categoryStats.slice(0, 3).map(({ key, value, config }) => (
                              <span key={key} className="text-xs bg-black/20 px-2 py-1 rounded">
                                <span className="text-slate-400">{config.abbr}:</span>{" "}
                                <span className="text-white font-medium">{(value / gamesPlayed).toFixed(1)}</span>
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
        )}

        {activeTab === "schedule" && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Season Schedule</h2>
            {Object.keys(player.schedule || {}).length === 0 ? (
              <div className="bg-slate-800/50 rounded-xl p-8 text-center text-slate-500">
                No schedule data available
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2">
                {Object.entries(player.schedule || {})
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([week, game]) => {
                    const weekStats = player.stats?.[week];
                    const hasPlayed = weekStats && weekStats.points > 0;
                    const oppColor = teamColors[game.team]?.primary || "#64748b";
                    const beatProj = weekStats && weekStats.points >= weekStats.projected_points;
                    
                    return (
                      <div 
                        key={week} 
                        className={cn(
                          "rounded-xl p-3 border transition-all hover:scale-105",
                          hasPlayed 
                            ? "bg-slate-800/60 border-slate-700/50" 
                            : "bg-slate-800/30 border-slate-700/20 opacity-60"
                        )}
                      >
                        <div className="text-[10px] text-slate-500 font-medium mb-1">WK {week}</div>
                        <div className="flex items-center gap-1 mb-2">
                          <span className="text-[10px] text-slate-400">@</span>
                          <span 
                            className="text-xs font-bold px-1.5 py-0.5 rounded"
                            style={{ 
                              backgroundColor: `${oppColor}20`,
                              color: oppColor,
                              border: `1px solid ${oppColor}40`
                            }}
                          >
                            {game.team || "BYE"}
                          </span>
                        </div>
                        {hasPlayed ? (
                          <div className={cn(
                            "text-lg font-bold",
                            beatProj ? "text-emerald-400" : "text-white"
                          )}>
                            {weekStats.points.toFixed(1)}
                          </div>
                        ) : (
                          <div className="text-lg font-bold text-slate-600">—</div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Eligibility */}
        <div className="mt-8 bg-slate-800/40 rounded-2xl p-5 border border-slate-700/30">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Roster Eligibility</h3>
          <div className="flex flex-wrap gap-2">
            {(player.eligibleSlots || [player.position]).map((slot) => (
              <span 
                key={slot}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  slot === player.lineupSlot 
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 ring-2 ring-emerald-500/20" 
                    : "bg-slate-700/50 text-slate-300 border border-slate-600/30"
                )}
              >
                {slot === "RB/WR/TE" ? "FLEX" : slot}
                {slot === player.lineupSlot && " ✓"}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components
function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorClasses: Record<string, string> = {
    emerald: "text-emerald-400",
    white: "text-white",
    slate: "text-slate-400",
    red: "text-red-400",
    amber: "text-amber-400",
  };
  
  return (
    <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={cn("text-xl font-bold tabular-nums", colorClasses[color])}>{value}</p>
    </div>
  );
}

function MetricCard({ 
  label, 
  value, 
  progress, 
  color, 
  subtitle 
}: { 
  label: string; 
  value: string; 
  progress?: number; 
  color: string;
  subtitle?: string;
}) {
  const bgColors: Record<string, string> = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    purple: "bg-purple-500",
  };
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {progress !== undefined && (
        <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all", bgColors[color])} 
            style={{ width: `${Math.min(progress, 100)}%` }} 
          />
        </div>
      )}
      {subtitle && <p className="text-[10px] text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function WeekCard({ 
  week, 
  stats, 
  opponent,
  position,
  teamColor,
}: { 
  week: string; 
  stats: PlayerStats; 
  opponent?: string;
  position: string;
  teamColor: string;
}) {
  const hasData = stats.points > 0 || stats.projected_points > 0 || Object.keys(stats.breakdown || {}).length > 0;
  const diff = stats.points - stats.projected_points;
  const isPositive = diff >= 0;
  const maxPts = Math.max(stats.points, stats.projected_points, 25);
  
  // Get relevant stats for this position
  const relevantCategories = POSITION_CATEGORIES[position] || ["rushing", "receiving"];
  const breakdown = stats.breakdown || {};
  
  // Render empty state for weeks without data
  if (!hasData) {
    return (
      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/20 opacity-60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span 
              className="text-sm font-bold text-slate-400 px-3 py-1.5 rounded-lg bg-slate-700/30 border border-slate-600/30"
            >
              Week {week}
            </span>
            {opponent ? (
              <span className="text-sm text-slate-500">
                vs <span className="font-medium text-slate-400">{opponent}</span>
              </span>
            ) : (
              <span className="text-sm text-slate-500 italic">BYE Week</span>
            )}
          </div>
          <span className="text-lg font-bold text-slate-500">—</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30 hover:border-slate-600/50 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span 
            className="text-sm font-bold text-white px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: `${teamColor}30`, border: `1px solid ${teamColor}50` }}
          >
            Week {week}
          </span>
          {opponent && (
            <span className="text-sm text-slate-400">
              vs <span className="font-medium text-slate-300">{opponent}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-white tabular-nums">{stats.points.toFixed(1)}</span>
          <span className={cn(
            "text-sm font-semibold px-2.5 py-1 rounded-lg",
            isPositive 
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
              : "bg-red-500/20 text-red-400 border border-red-500/30"
          )}>
            {isPositive ? "+" : ""}{diff.toFixed(1)}
          </span>
        </div>
      </div>
      
      {/* Points bar */}
      <div className="relative h-3 bg-slate-700/50 rounded-full overflow-hidden mb-3">
        <div 
          className={cn(
            "absolute h-full rounded-full transition-all",
            isPositive ? "bg-emerald-500/80" : "bg-blue-500/80"
          )}
          style={{ width: `${(stats.points / maxPts) * 100}%` }}
        />
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-amber-400"
          style={{ left: `${(stats.projected_points / maxPts) * 100}%` }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-slate-500 mb-3">
        <span>Actual: <span className="text-slate-300 font-medium">{stats.points.toFixed(1)}</span></span>
        <span>Projected: <span className="text-slate-300">{stats.projected_points.toFixed(1)}</span></span>
      </div>

      {/* Stat Breakdown */}
      {Object.keys(breakdown).length > 0 && (
        <div className="pt-3 border-t border-slate-700/30">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {Object.entries(breakdown)
              .filter(([key]) => {
                const config = STAT_CONFIG[key];
                return config && (!config.positions || config.positions.includes(position));
              })
              .slice(0, 12)
              .map(([key, value]) => {
                const config = STAT_CONFIG[key];
                if (!config) return null;
                return (
                  <span key={key} className="text-xs">
                    <span className="text-slate-500">{config.abbr}:</span>
                    <span className="text-slate-200 ml-1 font-medium">
                      {formatStatValue(value as number, config.format)}
                    </span>
                  </span>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    passing: "🎯",
    rushing: "🏃",
    receiving: "🙌",
    kicking: "🦶",
    defense: "🛡️",
    misc: "📋",
  };
  return icons[category] || "📊";
}

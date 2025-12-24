"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Types for the data from the backend
interface Player {
  name: string;
  playerId: number;
  position: string;
  lineupSlot: string;
  proTeam: string;
  injuryStatus: string;
  total_points: number;
  projected_total_points: number;
  avg_points: number;
  projected_avg_points: number;
  percent_owned: number;
  percent_started: number;
}

interface Team {
  team_id: number;
  team_name: string;
  team_abbrev: string;
  division_id: number;
  division_name: string;
  wins: number;
  losses: number;
  ties: number;
  points_for: number;
  points_against: number;
  standing: number;
  final_standing: number;
  logo_url: string;
  streak_type: string;
  streak_length: number;
  playoff_pct: number;
}

interface LeagueData {
  leagueName: string;
  leagueId: string;
  standings: Team[];
  teams: Team[];
  rosters: Record<string, Player[]>;
}

const tools = [
  {
    id: "playoff-predictor",
    name: "Playoff Predictor",
    description: "Simulate remaining games to see your playoff chances",
    icon: "🏆",
    color: "from-amber-500 to-orange-600",
    status: "coming-soon",
  },
  {
    id: "playoff-odds",
    name: "Playoff Odds",
    description: "Real-time probability calculations for making playoffs",
    icon: "📊",
    color: "from-emerald-500 to-teal-600",
    status: "coming-soon",
  },
  {
    id: "schedule-comparison",
    name: "Schedule Comparison",
    description: "Compare your schedule difficulty against other teams",
    icon: "📅",
    color: "from-blue-500 to-indigo-600",
    status: "coming-soon",
  },
  {
    id: "season-wrapped",
    name: "Season Wrapped",
    description: "Your personalized season recap with stats and highlights",
    icon: "🎁",
    color: "from-purple-500 to-pink-600",
    status: "coming-soon",
  },
  {
    id: "draft-review",
    name: "Draft Review",
    description: "Analyze your draft picks and see how they performed",
    icon: "📝",
    color: "from-rose-500 to-red-600",
    status: "coming-soon",
  },
  {
    id: "trade-finder",
    name: "Trade Finder",
    description: "Discover optimal trade opportunities in your league",
    icon: "🔍",
    color: "from-cyan-500 to-blue-600",
    status: "coming-soon",
  },
  {
    id: "trade-calculator",
    name: "Trade Fairness Calculator",
    description: "Evaluate trade proposals with advanced analytics",
    icon: "⚖️",
    color: "from-violet-500 to-purple-600",
    status: "coming-soon",
  },
  {
    id: "waiver-wire",
    name: "Waiver Wire Assistant",
    description: "Get recommendations for waiver wire pickups",
    icon: "🎯",
    color: "from-lime-500 to-green-600",
    status: "coming-soon",
  },
  {
    id: "matchup-analyzer",
    name: "Matchup Analyzer",
    description: "Deep dive into weekly matchups and projections",
    icon: "⚔️",
    color: "from-orange-500 to-amber-600",
    status: "coming-soon",
  },
  {
    id: "roster-optimizer",
    name: "Roster Optimizer",
    description: "AI-powered lineup suggestions for maximum points",
    icon: "🤖",
    color: "from-fuchsia-500 to-pink-600",
    status: "coming-soon",
  },
  {
    id: "injury-tracker",
    name: "Injury Tracker",
    description: "Real-time injury updates and impact analysis",
    icon: "🏥",
    color: "from-red-500 to-rose-600",
    status: "coming-soon",
  },
  {
    id: "power-rankings",
    name: "Power Rankings",
    description: "Weekly power rankings based on performance metrics",
    icon: "📈",
    color: "from-sky-500 to-cyan-600",
    status: "coming-soon",
  },
];

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const [leagueData, setLeagueData] = React.useState<LeagueData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedTeamName, setSelectedTeamName] = React.useState<string>("");

  // Get league info from URL params as fallback
  const urlLeagueName = searchParams.get("leagueName") || "My League";
  const urlLeagueId = searchParams.get("leagueId") || "000000";

  // Load data from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("leagueData");
      if (stored) {
        const parsed = JSON.parse(stored) as LeagueData;
        setLeagueData(parsed);
        // Set default selected team to first team
        if (parsed.teams && parsed.teams.length > 0) {
          setSelectedTeamName(parsed.teams[0].team_name);
        } else if (parsed.rosters && Object.keys(parsed.rosters).length > 0) {
          setSelectedTeamName(Object.keys(parsed.rosters)[0]);
        }
      }
    } catch (error) {
      console.error("Error loading league data from localStorage:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Use stored data or fallbacks
  const leagueName = leagueData?.leagueName || urlLeagueName;
  const leagueId = leagueData?.leagueId || urlLeagueId;
  const standings = leagueData?.standings || [];
  const teams = leagueData?.teams || [];
  const rosters = leagueData?.rosters || {};

  // Get team names for dropdown
  const teamNames = Object.keys(rosters);

  // Get selected team's data
  const selectedTeam = teams.find((t) => t.team_name === selectedTeamName) || 
    standings.find((t) => t.team_name === selectedTeamName);
  const selectedRoster = rosters[selectedTeamName] || [];

  // Calculate stats
  const totalPoints = selectedTeam?.points_for || 0;
  const userRecord = selectedTeam ? `${selectedTeam.wins}-${selectedTeam.losses}` : "0-0";
  const userRank = selectedTeam?.standing || "-";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative flex">
        {/* Sidebar - made wider for roster */}
        <aside className="fixed left-0 top-0 h-screen w-96 bg-slate-900/80 backdrop-blur-xl border-r border-slate-800/50 flex flex-col overflow-hidden">
          {/* Team Header */}
          <div className="p-5 border-b border-slate-800/50">
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-400 transition-colors mb-2 block">
              ← Back to Connect
            </Link>
            <h1 className="text-xl font-bold text-white tracking-tight truncate">{leagueName}</h1>
            <p className="text-sm text-slate-400 mt-1">League ID: {leagueId}</p>
          </div>

          {/* Team Selector Dropdown */}
          <div className="p-5 border-b border-slate-800/50">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
              Select Your Team
            </label>
            <div className="flex items-center gap-3">
              {selectedTeam?.logo_url && (
                <img 
                  src={selectedTeam.logo_url} 
                  alt={`${selectedTeamName} logo`}
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-slate-700"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <select
                value={selectedTeamName}
                onChange={(e) => setSelectedTeamName(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                {teamNames.length === 0 ? (
                  <option value="">No teams available</option>
                ) : (
                  teamNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="p-5 border-b border-slate-800/50 bg-slate-900/50">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Team Stats</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-500">Standing</p>
                <p className="text-xl font-bold text-amber-400">#{userRank}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-500">Record</p>
                <p className="text-xl font-bold text-white">{userRecord}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-500">Points</p>
                <p className="text-xl font-bold text-emerald-400">
                  {typeof totalPoints === "number" ? totalPoints.toFixed(1) : totalPoints}
                </p>
              </div>
            </div>
          </div>

          {/* League Standing - Compact */}
          <div className="p-5 border-b border-slate-800/50">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">League Standings</h2>
            <div className="space-y-1 max-h-40 overflow-auto">
              {[...standings]
                .sort((a, b) => a.standing - b.standing)
                .slice(0, 10)
                .map((team, idx) => (
                <div
                  key={team.team_id || idx}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-sm",
                    team.team_name === selectedTeamName
                      ? "bg-emerald-500/20 border border-emerald-500/30"
                      : "hover:bg-slate-800/50"
                  )}
                >
                  <span className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                    team.standing === 1 ? "bg-amber-500 text-amber-950" :
                    team.standing === 2 ? "bg-slate-400 text-slate-950" :
                    team.standing === 3 ? "bg-amber-700 text-amber-100" :
                    "bg-slate-700 text-slate-300"
                  )}>
                    {team.standing}
                  </span>
                  {team.logo_url && (
                    <img 
                      src={team.logo_url} 
                      alt={`${team.team_name} logo`}
                      className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <span className={cn(
                    "flex-1 truncate",
                    team.team_name === selectedTeamName ? "text-emerald-300 font-medium" : "text-slate-300"
                  )}>
                    {team.team_name}
                  </span>
                  <span className="text-xs text-slate-500">{team.wins}-{team.losses}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Roster - Takes remaining space */}
          <div className="flex-1 overflow-auto p-5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {selectedTeamName ? `${selectedTeamName}'s Roster` : "Roster"}
            </h2>
            {selectedRoster.length === 0 ? (
              <p className="text-slate-500 text-sm">No roster data available</p>
            ) : (
              <div className="space-y-1">
                {/* Sort roster: starters first, then bench (BE), then IR */}
                {[...selectedRoster]
                  .sort((a, b) => {
                    const slotOrder: Record<string, number> = { QB: 1, RB: 2, WR: 3, TE: 4, "RB/WR/TE": 5, "D/ST": 6, K: 7, BE: 8, IR: 9 };
                    return (slotOrder[a.lineupSlot] || 10) - (slotOrder[b.lineupSlot] || 10);
                  })
                  .map((player, idx) => {
                    const isBench = player.lineupSlot === "BE";
                    const isIR = player.lineupSlot === "IR";
                    // Display "FLEX" instead of "RB/WR/TE"
                    const displaySlot = player.lineupSlot === "RB/WR/TE" ? "FLEX" : player.lineupSlot;
                    return (
                      <Link
                        href={`/dashboard/player/${player.playerId}`}
                        key={player.playerId || idx}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors group cursor-pointer",
                          isBench && "opacity-60 hover:opacity-80",
                          isIR && "opacity-40 hover:opacity-60"
                        )}
                      >
                        <span className={cn(
                          "w-14 text-xs font-semibold flex-shrink-0",
                          isBench ? "text-slate-600" : isIR ? "text-red-400/60" : "text-emerald-500"
                        )}>
                          {displaySlot || player.position || "—"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm text-slate-200 truncate group-hover:text-white transition-colors">{player.name || "Unknown"}</p>
                            {player.injuryStatus && player.injuryStatus !== "ACTIVE" && player.injuryStatus !== "NORMAL" && (
                              <span className="text-[10px] px-1 py-0.5 rounded bg-red-500/20 text-red-400 flex-shrink-0">
                                {player.injuryStatus === "QUESTIONABLE" ? "Q" : player.injuryStatus.slice(0, 3)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{player.proTeam || "—"} • {player.position}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-medium text-emerald-400">
                            {typeof player.total_points === "number" ? player.total_points.toFixed(1) : "—"}
                          </span>
                          <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content - adjusted margin for wider sidebar */}
        <main className="ml-96 flex-1 p-8">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white tracking-tight">Fantasy Tools</h2>
            <p className="text-slate-400 mt-2">
              Powerful analytics and insights to dominate your fantasy league
            </p>
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tools.map((tool) => (
              <button
                key={tool.id}
                className="group relative overflow-hidden rounded-2xl bg-slate-800/50 backdrop-blur border border-slate-700/50 p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:border-slate-600/50 hover:shadow-2xl hover:shadow-slate-900/50"
              >
                {/* Gradient overlay on hover */}
                <div className={cn(
                  "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-br",
                  tool.color
                )} />

                {/* Icon */}
                <div className={cn(
                  "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-2xl mb-4 shadow-lg",
                  tool.color
                )}>
                  {tool.icon}
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-white/90">
                  {tool.name}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {tool.description}
                </p>

                {/* Status badge */}
                <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-700/50 text-xs font-medium text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Coming Soon
                </div>

                {/* Arrow indicator */}
                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          {/* Coming Soon Banner */}
          <div className="mt-12 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 border border-slate-700/50 p-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/25">
                🚀
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">More Features Coming Soon</h3>
                <p className="text-slate-400 mt-1">
                  We're building powerful tools to help you win your fantasy league. Stay tuned for updates!
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

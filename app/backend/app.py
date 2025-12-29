import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from espn_api.football import League

# Import database helper for cached player data
import player_db

app = Flask(__name__)

cors = CORS(app, resources={r"/parse-content": {"origins": "*"}, r"/api/*": {"origins": "*"}})

# ESPN Stat ID to readable name mapping
ESPN_STAT_MAP = {
    # Passing
    "0": "passingAttempts",
    "1": "passingCompletions",
    "2": "passingIncompletions",
    "3": "passingYards",
    "4": "passingTouchdowns",
    "5": "passingCompletionYards",  # Total yards from completions
    "6": "passingFirstDowns",
    "7": "passingCompletions10Plus",
    "8": "passingCompletions20Plus", 
    "9": "passingCompletions30Plus",
    "10": "passingCompletions40Plus",
    "11": "passingCompletions50Plus",
    "12": "passingCompletions60Plus",
    "13": "passingIncomplete10Plus",
    "14": "passingIncomplete20Plus",
    "15": "passing2PtConversions",
    "19": "passingInterceptions",
    "20": "passingInterceptions",
    
    # Rushing  
    "23": "rushingAttempts",
    "24": "rushingYards",
    "25": "rushingTouchdowns",
    "26": "rushing2PtConversions",
    "27": "rushingFirstDowns",
    "28": "rushingAttempts10Plus",
    "29": "rushingAttempts20Plus",
    "30": "rushingAttempts30Plus",
    "31": "rushingAttempts40Plus",
    "32": "rushingAttempts50Plus",
    "33": "rushingAttempts5Plus",
    "34": "rushingAttempts1Plus",
    
    # Receiving
    "41": "receivingReceptions",
    "42": "receivingYards", 
    "43": "receivingTouchdowns",
    "44": "receiving2PtConversions",
    "45": "receivingFirstDowns",
    "53": "receivingTargets",
    "58": "receivingYardsAfterCatch",
    
    # Fumbles
    "65": "fumblesTotal",
    "66": "fumblesRecovered",
    "68": "fumblesTouchdowns",
    "69": "fumblesLostOwn",
    "70": "fumblesLostOpp",
    "72": "lostFumbles",
    
    # Kicking
    "74": "madeFieldGoals",
    "77": "missedFieldGoals",
    "80": "madeFieldGoals50Plus",
    "81": "madeFieldGoals40To49",
    "82": "madeFieldGoals1To39",
    "83": "madeFieldGoals60Plus",
    "85": "madeExtraPoints",
    "86": "missedExtraPoints",
    "88": "attemptedFieldGoals",
    
    # Defense/Special Teams
    "89": "defensiveBlockedKicks",
    "90": "defensiveInterceptions",
    "91": "defensiveFumbleRecoveries", 
    "92": "defensiveBlockedPunts",
    "93": "defensiveSafeties",
    "94": "defensiveSacks",
    "95": "defensivePointsAllowed",
    "96": "defensiveTouchdowns",
    "97": "defensiveForcedFumbles",
    "98": "defensiveAssistedTackles",
    "99": "defensiveSoloTackles",
    "100": "defensiveTotalTackles",
    "101": "defensivePassesDefended",
    "102": "kickReturnTouchdowns",
    "103": "puntReturnTouchdowns",
    "104": "fumbleReturnTouchdowns",
    "105": "interceptionReturnTouchdowns",
    "106": "kickReturnYards",
    "107": "puntReturnYards",
    "108": "interceptionReturnYards",
    "109": "fumbleReturnYards",
    "114": "defensiveYardsAllowed",
    "120": "defensivePointsAllowed0",
    "121": "defensivePointsAllowed1To6",
    "122": "defensivePointsAllowed7To13",
    "123": "defensivePointsAllowed14To17",
    "124": "defensivePointsAllowed18To21",
    "125": "defensivePointsAllowed22To27",
    "126": "defensivePointsAllowed28To34",
    "127": "defensivePointsAllowed35To45",
    "128": "defensivePointsAllowed46Plus",
    
    # Team/Game stats
    "155": "teamPointsScored",
    "175": "passingTouchdownsLong",  # Long TD passes
    "176": "passingTouchdownsMedium",
    "177": "passingTouchdownsShort",
    "178": "rushingTouchdownsLong",
    "179": "rushingTouchdownsMedium", 
    "180": "rushingTouchdownsShort",
    "187": "receivingTouchdownsLong",
    "188": "receivingTouchdownsMedium",
    "189": "receivingTouchdownsShort",
    "198": "teamWin",
    "199": "teamLoss",
    "200": "teamTie",
    "201": "pointsScored",
    "210": "gamesPlayed",
    "211": "teamOffensivePlays",
    "212": "teamOffensiveTouchdowns",
}


def convert_stat_keys(breakdown):
    """Convert ESPN numeric stat IDs to readable names"""
    converted = {}
    for key, value in breakdown.items():
        # Try to convert numeric keys
        readable_key = ESPN_STAT_MAP.get(str(key), key)
        # If still numeric and not in our map, prefix with 'stat_'
        if str(key).isdigit() and readable_key == key:
            readable_key = f"unknownStat_{key}"
        converted[readable_key] = value
    return converted


def serialize_player(player):
    """Convert Player object to JSON-serializable dictionary"""
    # Serialize weekly stats - filter out week 0 (season totals)
    weekly_stats = {}
    season_totals = None
    
    if hasattr(player, 'stats') and player.stats:
        for week, week_data in player.stats.items():
            week_int = int(week) if isinstance(week, str) else week
            
            # Handle both dict-style and object-style week_data
            # ESPN API can return different structures
            if isinstance(week_data, dict):
                # Try both 'points'/'total' and 'projected_points'/'projected_total' keys
                points = week_data.get("points") or week_data.get("total", 0) or 0
                projected_points = week_data.get("projected_points") or week_data.get("projected_total", 0) or 0
                avg_points = week_data.get("avg_points", 0) or 0
                projected_avg_points = week_data.get("projected_avg_points", 0) or 0
                breakdown = week_data.get("breakdown", {}) or {}
                projected_breakdown = week_data.get("projected_breakdown", {}) or {}
            else:
                # Handle object-style access
                points = getattr(week_data, 'points', None) or getattr(week_data, 'total', 0) or 0
                projected_points = getattr(week_data, 'projected_points', None) or getattr(week_data, 'projected_total', 0) or 0
                avg_points = getattr(week_data, 'avg_points', 0) or 0
                projected_avg_points = getattr(week_data, 'projected_avg_points', 0) or 0
                breakdown = getattr(week_data, 'breakdown', {}) or {}
                projected_breakdown = getattr(week_data, 'projected_breakdown', {}) or {}
            
            # Store season totals separately (week 0)
            if week_int == 0:
                season_totals = {
                    "projected_points": projected_points,
                    "projected_avg_points": projected_avg_points,
                    "points": points,
                    "avg_points": avg_points,
                    "breakdown": convert_stat_keys(breakdown),
                    "projected_breakdown": convert_stat_keys(projected_breakdown),
                }
                continue
                
            weekly_stats[str(week)] = {
                "points": points,
                "projected_points": projected_points,
                "avg_points": avg_points,
                "breakdown": convert_stat_keys(breakdown),
                "projected_breakdown": convert_stat_keys(projected_breakdown),
            }
    
    # Serialize schedule - convert datetime to ISO string
    schedule = {}
    if hasattr(player, 'schedule') and player.schedule:
        for week, game_data in player.schedule.items():
            if isinstance(game_data, dict):
                team = game_data.get("team", "")
                date = game_data.get("date")
            else:
                # Handle object-style or simple team string
                team = getattr(game_data, 'team', str(game_data)) if hasattr(game_data, 'team') else str(game_data)
                date = getattr(game_data, 'date', None) if hasattr(game_data, 'date') else None
            
            schedule[str(week)] = {
                "team": team,
                "date": date.isoformat() if date and hasattr(date, 'isoformat') else None,
            }
    
    return {
        "name": player.name,
        "playerId": player.playerId,
        "position": player.position,
        "posRank": getattr(player, 'posRank', None),
        "eligibleSlots": getattr(player, 'eligibleSlots', []),
        "lineupSlot": getattr(player, 'lineupSlot', None),
        "acquisitionType": getattr(player, 'acquisitionType', None),
        "proTeam": player.proTeam,
        "onTeamId": getattr(player, 'onTeamId', None),
        "injuryStatus": getattr(player, 'injuryStatus', 'ACTIVE'),
        "injured": getattr(player, 'injured', False),
        "total_points": getattr(player, 'total_points', 0),
        "projected_total_points": getattr(player, 'projected_total_points', 0),
        "avg_points": getattr(player, 'avg_points', 0),
        "projected_avg_points": getattr(player, 'projected_avg_points', 0),
        "percent_owned": getattr(player, 'percent_owned', 0),
        "percent_started": getattr(player, 'percent_started', 0),
        "stats": weekly_stats,
        "seasonTotals": season_totals,
        "schedule": schedule,
        "headshotUrl": f"https://a.espncdn.com/i/headshots/nfl/players/full/{player.playerId}.png" if player.playerId and player.playerId > 0 else None,
    }


def serialize_team(team):
    """Convert Team object to JSON-serializable dictionary"""
    return {
        "team_id": team.team_id,
        "team_name": team.team_name,
        "team_abbrev": team.team_abbrev,
        "division_id": team.division_id,
        "division_name": team.division_name,
        "wins": team.wins,
        "losses": team.losses,
        "ties": team.ties,
        "points_for": team.points_for,
        "points_against": team.points_against,
        "standing": team.standing,
        "final_standing": team.final_standing,
        "logo_url": team.logo_url,
        "streak_type": team.streak_type,
        "streak_length": team.streak_length,
        "playoff_pct": team.playoff_pct,
    }


@app.route('/parse-content', methods=['POST'])
def parse_content():
    data = request.json
    league = League(
        league_id=data["leagueId"],
        year=2025,
        espn_s2=data.get("espn_s2"),
        swid=data.get("swid")
    )
    
    # Check if we should use cached database
    use_db = player_db.database_exists()
    
    # Serialize teams
    teams = [serialize_team(team) for team in league.teams]
    
    # Serialize standings (also Team objects)
    standings = [serialize_team(team) for team in league.standings()]
    
    # Serialize rosters - dict with team_name as key and list of players as value
    rosters = {}
    for team in league.teams:
        roster_players = []
        for roster_player in team.roster:
            if use_db:
                # Try to get player from database first (much faster)
                cached_player = player_db.get_player(roster_player.playerId)
                if cached_player:
                    # Override with roster-specific data
                    cached_player["lineupSlot"] = getattr(roster_player, 'lineupSlot', None)
                    cached_player["acquisitionType"] = getattr(roster_player, 'acquisitionType', None)
                    cached_player["onTeamId"] = getattr(roster_player, 'onTeamId', None)
                    roster_players.append(cached_player)
                    continue
            
            # Fallback: Get full player info with all weekly stats using player_info
            full_player = league.player_info(playerId=roster_player.playerId)
            if full_player:
                # Serialize full player but preserve roster-specific fields from original
                serialized = serialize_player(full_player)
                # Override with roster-specific data (lineupSlot, acquisitionType, etc.)
                serialized["lineupSlot"] = getattr(roster_player, 'lineupSlot', None)
                serialized["acquisitionType"] = getattr(roster_player, 'acquisitionType', None)
                serialized["onTeamId"] = getattr(roster_player, 'onTeamId', None)
                roster_players.append(serialized)
            else:
                # Fallback to basic roster player if player_info fails
                roster_players.append(serialize_player(roster_player))
        rosters[team.team_name] = roster_players
    
    return jsonify({
        "standings": standings,
        "teams": teams,
        "rosters": rosters,
    }), 200


@app.route('/api/player/<int:player_id>', methods=['GET'])
def get_player(player_id):
    """Get a single player by ID from the database."""
    player = player_db.get_player(player_id)
    if player:
        return jsonify(player), 200
    return jsonify({"error": "Player not found"}), 404


@app.route('/api/players/search', methods=['GET'])
def search_players():
    """Search for players by name, position, or team."""
    name = request.args.get('name')
    position = request.args.get('position')
    pro_team = request.args.get('team')
    limit = request.args.get('limit', 100, type=int)
    
    players = player_db.search_players(
        name=name,
        position=position,
        pro_team=pro_team,
        limit=limit
    )
    return jsonify(players), 200


@app.route('/api/db/status', methods=['GET'])
def db_status():
    """Check if the player database exists and return stats."""
    exists = player_db.database_exists()
    count = player_db.get_player_count() if exists else 0
    return jsonify({
        "exists": exists,
        "player_count": count
    }), 200


if __name__ == '__main__':
    app.run(debug=True)

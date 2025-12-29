"""
Helper module to query the player SQLite database.
Use this in app.py instead of calling league.player_info() on each request.
"""

import json
import sqlite3
from typing import Optional, List, Dict, Any


DB_PATH = "players.db"


def get_connection(db_path: str = DB_PATH) -> sqlite3.Connection:
    """Get a database connection with row factory for dict-like access."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def get_player(player_id: int, db_path: str = DB_PATH) -> Optional[Dict[str, Any]]:
    """
    Get a player by ID with all their stats, schedule, and season totals.
    Returns data in the same format as serialize_player() from app.py.
    """
    conn = get_connection(db_path)
    cursor = conn.cursor()
    
    # Get basic player info
    cursor.execute("SELECT * FROM players WHERE player_id = ?", (player_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        return None
    
    player = {
        "name": row["name"],
        "playerId": row["player_id"],
        "position": row["position"],
        "posRank": row["pos_rank"],
        "eligibleSlots": json.loads(row["eligible_slots"]) if row["eligible_slots"] else [],
        "lineupSlot": None,  # Will be set by roster data
        "acquisitionType": None,  # Will be set by roster data
        "proTeam": row["pro_team"],
        "onTeamId": None,  # Will be set by roster data
        "injuryStatus": row["injury_status"],
        "injured": bool(row["injured"]),
        "total_points": row["total_points"] or 0,
        "projected_total_points": row["projected_total_points"] or 0,
        "avg_points": row["avg_points"] or 0,
        "projected_avg_points": row["projected_avg_points"] or 0,
        "percent_owned": row["percent_owned"] or 0,
        "percent_started": row["percent_started"] or 0,
        "headshotUrl": row["headshot_url"],
        "stats": {},
        "seasonTotals": None,
        "schedule": {},
    }
    
    # Get weekly stats
    cursor.execute("""
        SELECT week, points, projected_points, avg_points, breakdown, projected_breakdown
        FROM player_weekly_stats
        WHERE player_id = ?
        ORDER BY week
    """, (player_id,))
    
    for stat_row in cursor.fetchall():
        player["stats"][str(stat_row["week"])] = {
            "points": stat_row["points"] or 0,
            "projected_points": stat_row["projected_points"] or 0,
            "avg_points": stat_row["avg_points"] or 0,
            "breakdown": json.loads(stat_row["breakdown"]) if stat_row["breakdown"] else {},
            "projected_breakdown": json.loads(stat_row["projected_breakdown"]) if stat_row["projected_breakdown"] else {},
        }
    
    # Get season totals
    cursor.execute("""
        SELECT points, projected_points, avg_points, projected_avg_points, breakdown, projected_breakdown
        FROM player_season_totals
        WHERE player_id = ?
    """, (player_id,))
    
    totals_row = cursor.fetchone()
    if totals_row:
        player["seasonTotals"] = {
            "points": totals_row["points"] or 0,
            "projected_points": totals_row["projected_points"] or 0,
            "avg_points": totals_row["avg_points"] or 0,
            "projected_avg_points": totals_row["projected_avg_points"] or 0,
            "breakdown": json.loads(totals_row["breakdown"]) if totals_row["breakdown"] else {},
            "projected_breakdown": json.loads(totals_row["projected_breakdown"]) if totals_row["projected_breakdown"] else {},
        }
    
    # Get schedule
    cursor.execute("""
        SELECT week, opponent_team, game_date
        FROM player_schedule
        WHERE player_id = ?
        ORDER BY week
    """, (player_id,))
    
    for sched_row in cursor.fetchall():
        player["schedule"][str(sched_row["week"])] = {
            "team": sched_row["opponent_team"] or "",
            "date": sched_row["game_date"],
        }
    
    conn.close()
    return player


def get_players_by_ids(player_ids: List[int], db_path: str = DB_PATH) -> Dict[int, Dict[str, Any]]:
    """
    Get multiple players by their IDs.
    Returns a dict mapping player_id to player data.
    """
    result = {}
    for player_id in player_ids:
        player = get_player(player_id, db_path)
        if player:
            result[player_id] = player
    return result


def search_players(
    name: Optional[str] = None,
    position: Optional[str] = None,
    pro_team: Optional[str] = None,
    limit: int = 100,
    db_path: str = DB_PATH
) -> List[Dict[str, Any]]:
    """
    Search for players by name, position, or team.
    Returns basic player info (not full stats).
    """
    conn = get_connection(db_path)
    cursor = conn.cursor()
    
    query = "SELECT * FROM players WHERE 1=1"
    params = []
    
    if name:
        query += " AND name LIKE ?"
        params.append(f"%{name}%")
    
    if position:
        query += " AND position = ?"
        params.append(position)
    
    if pro_team:
        query += " AND pro_team = ?"
        params.append(pro_team)
    
    query += " ORDER BY total_points DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    
    players = []
    for row in cursor.fetchall():
        players.append({
            "name": row["name"],
            "playerId": row["player_id"],
            "position": row["position"],
            "posRank": row["pos_rank"],
            "proTeam": row["pro_team"],
            "injuryStatus": row["injury_status"],
            "total_points": row["total_points"] or 0,
            "projected_total_points": row["projected_total_points"] or 0,
            "avg_points": row["avg_points"] or 0,
            "percent_owned": row["percent_owned"] or 0,
            "headshotUrl": row["headshot_url"],
        })
    
    conn.close()
    return players


def get_all_players_basic(db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """Get basic info for all players (without full stats)."""
    return search_players(limit=10000, db_path=db_path)


def database_exists(db_path: str = DB_PATH) -> bool:
    """Check if the player database exists and has data."""
    try:
        conn = get_connection(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM players")
        count = cursor.fetchone()[0]
        conn.close()
        return count > 0
    except:
        return False


def get_player_count(db_path: str = DB_PATH) -> int:
    """Get the total number of players in the database."""
    try:
        conn = get_connection(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM players")
        count = cursor.fetchone()[0]
        conn.close()
        return count
    except:
        return 0


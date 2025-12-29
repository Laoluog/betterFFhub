"""
Script to build a SQLite database of all ESPN Fantasy Football players.
This includes rostered players, free agents, and their weekly stats (weeks 0-17).

Usage:
    python3 build_player_db.py --league_id 1237219 --espn_s2 YOUR_ESPN_S2 --swid YOUR_SWID

Options:
    --force         Force re-fetch all players (ignore existing data)
    --projections-only  Only update projections from box scores
    --skip-projections  Skip fetching box score projections

For private leagues, you'll need to provide espn_s2 and swid cookies.
"""

import argparse
import json
import sqlite3
from datetime import datetime
from typing import Optional, Set, Dict
from espn_api.football import League

# Import the stat mapping from app.py
from app import ESPN_STAT_MAP, convert_stat_keys


def create_database(db_path: str = "players.db"):
    """Create the SQLite database and tables."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Players table - basic player info
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS players (
            player_id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            position TEXT,
            pro_team TEXT,
            pos_rank INTEGER,
            eligible_slots TEXT,
            injury_status TEXT,
            injured INTEGER,
            total_points REAL,
            projected_total_points REAL,
            avg_points REAL,
            projected_avg_points REAL,
            percent_owned REAL,
            percent_started REAL,
            headshot_url TEXT,
            updated_at TEXT
        )
    """)
    
    # Weekly stats table - stats for each week (0-17)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS player_weekly_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id INTEGER NOT NULL,
            week INTEGER NOT NULL,
            points REAL,
            projected_points REAL,
            avg_points REAL,
            breakdown TEXT,
            projected_breakdown TEXT,
            FOREIGN KEY (player_id) REFERENCES players(player_id),
            UNIQUE(player_id, week)
        )
    """)
    
    # Schedule table - player schedules
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS player_schedule (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id INTEGER NOT NULL,
            week INTEGER NOT NULL,
            opponent_team TEXT,
            game_date TEXT,
            FOREIGN KEY (player_id) REFERENCES players(player_id),
            UNIQUE(player_id, week)
        )
    """)
    
    # Season totals table (week 0 stats)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS player_season_totals (
            player_id INTEGER PRIMARY KEY,
            points REAL,
            projected_points REAL,
            avg_points REAL,
            projected_avg_points REAL,
            breakdown TEXT,
            projected_breakdown TEXT,
            FOREIGN KEY (player_id) REFERENCES players(player_id)
        )
    """)
    
    # Create indexes for faster queries
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_players_name ON players(name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_players_position ON players(position)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_players_pro_team ON players(pro_team)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_weekly_stats_player ON player_weekly_stats(player_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_weekly_stats_week ON player_weekly_stats(week)")
    
    conn.commit()
    return conn


def get_existing_player_ids(conn: sqlite3.Connection) -> Set[int]:
    """Get set of player IDs that already exist in the database."""
    cursor = conn.cursor()
    cursor.execute("SELECT player_id FROM players")
    return {row[0] for row in cursor.fetchall()}


def get_players_needing_stats(conn: sqlite3.Connection, min_weeks: int = 5) -> Set[int]:
    """Get player IDs that have fewer than min_weeks of stats data."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT p.player_id 
        FROM players p
        LEFT JOIN (
            SELECT player_id, COUNT(*) as week_count 
            FROM player_weekly_stats 
            WHERE points > 0 OR projected_points > 0
            GROUP BY player_id
        ) s ON p.player_id = s.player_id
        WHERE s.week_count IS NULL OR s.week_count < ?
    """, (min_weeks,))
    return {row[0] for row in cursor.fetchall()}


def get_weeks_missing_projections(conn: sqlite3.Connection, current_week: int) -> Dict[int, Set[int]]:
    """Get dict of player_id -> set of weeks missing projections."""
    cursor = conn.cursor()
    
    # Get all players
    cursor.execute("SELECT player_id FROM players")
    all_players = {row[0] for row in cursor.fetchall()}
    
    # Get existing projections
    cursor.execute("""
        SELECT player_id, week FROM player_weekly_stats 
        WHERE projected_points > 0
    """)
    existing = {}
    for row in cursor.fetchall():
        if row[0] not in existing:
            existing[row[0]] = set()
        existing[row[0]].add(row[1])
    
    # Find missing weeks for each player
    all_weeks = set(range(1, min(current_week + 2, 18)))
    missing = {}
    for player_id in all_players:
        player_weeks = existing.get(player_id, set())
        missing_weeks = all_weeks - player_weeks
        if missing_weeks:
            missing[player_id] = missing_weeks
    
    return missing


def extract_week_data(week_data):
    """Extract stats from week data, handling both dict and object styles."""
    if isinstance(week_data, dict):
        points = week_data.get("points") or week_data.get("total", 0) or 0
        projected_points = week_data.get("projected_points") or week_data.get("projected_total", 0) or 0
        avg_points = week_data.get("avg_points", 0) or 0
        breakdown = week_data.get("breakdown", {}) or {}
        projected_breakdown = week_data.get("projected_breakdown", {}) or {}
    else:
        points = getattr(week_data, 'points', None) or getattr(week_data, 'total', 0) or 0
        projected_points = getattr(week_data, 'projected_points', None) or getattr(week_data, 'projected_total', 0) or 0
        avg_points = getattr(week_data, 'avg_points', 0) or 0
        breakdown = getattr(week_data, 'breakdown', {}) or {}
        projected_breakdown = getattr(week_data, 'projected_breakdown', {}) or {}
    
    return {
        "points": points,
        "projected_points": projected_points,
        "avg_points": avg_points,
        "breakdown": convert_stat_keys(breakdown) if breakdown else {},
        "projected_breakdown": convert_stat_keys(projected_breakdown) if projected_breakdown else {},
    }


def get_player_id(player) -> Optional[int]:
    """Get player ID, handling both regular players and D/ST."""
    player_id = getattr(player, 'playerId', None)
    if player_id is None:
        # Try alternate attribute names
        player_id = getattr(player, 'player_id', None)
    
    # Handle case where player_id is a list (D/ST sometimes returns list)
    if isinstance(player_id, list):
        # Use first element if list, or generate ID from team name
        if player_id:
            player_id = player_id[0] if isinstance(player_id[0], int) else None
        else:
            player_id = None
    
    # If still no valid ID, try to generate one for D/ST from team name
    if player_id is None:
        position = getattr(player, 'position', '')
        pro_team = getattr(player, 'proTeam', '')
        if position == 'D/ST' and pro_team:
            # Generate a consistent negative ID for D/ST based on team abbreviation
            # This creates a unique ID like -100 to -132 for each NFL team
            team_hash = sum(ord(c) for c in pro_team) % 100
            player_id = -(1000 + team_hash)
    
    return player_id


def get_player_name(player) -> str:
    """Get player name, handling both regular players and D/ST."""
    name = getattr(player, 'name', None)
    if not name:
        # D/ST might use team name
        name = getattr(player, 'proTeam', 'Unknown')
        position = getattr(player, 'position', '')
        if position == 'D/ST':
            name = f"{name} D/ST"
    return name or 'Unknown'


def get_headshot_url(player_id: int, position: str, pro_team: str) -> Optional[str]:
    """Get headshot URL, handling D/ST differently."""
    if position == 'D/ST':
        # Use team logo for D/ST
        if pro_team:
            return f"https://a.espncdn.com/i/teamlogos/nfl/500/{pro_team.lower()}.png"
        return None
    elif player_id and player_id > 0:
        return f"https://a.espncdn.com/i/headshots/nfl/players/full/{player_id}.png"
    return None


def safe_json_dumps(value):
    """Safely convert a value to JSON string, handling edge cases."""
    if value is None:
        return '[]'
    if isinstance(value, str):
        return value
    try:
        return json.dumps(value)
    except (TypeError, ValueError):
        return '[]'


def safe_get_numeric(obj, attr, default=0):
    """Safely get a numeric attribute, handling None and invalid types."""
    val = getattr(obj, attr, default)
    if val is None:
        return default
    if isinstance(val, (int, float)):
        return val
    return default


def insert_or_update_player(conn, player, full_player_info=None, force_update: bool = False):
    """Insert or update a player and their stats in the database."""
    cursor = conn.cursor()
    
    # Use full_player_info if available, otherwise use basic player
    p = full_player_info if full_player_info else player
    
    player_id = get_player_id(p)
    if player_id is None:
        return False
    
    now = datetime.now().isoformat()
    position = getattr(p, 'position', None) or 'Unknown'
    pro_team = getattr(p, 'proTeam', None) or ''
    name = get_player_name(p)
    
    # Safely get eligible slots (might be list or None)
    eligible_slots = getattr(p, 'eligibleSlots', [])
    if not isinstance(eligible_slots, list):
        eligible_slots = []
    
    # Check if player exists
    cursor.execute("SELECT updated_at FROM players WHERE player_id = ?", (player_id,))
    existing = cursor.fetchone()
    
    # Get values safely
    total_pts = safe_get_numeric(p, 'total_points', 0)
    proj_total_pts = safe_get_numeric(p, 'projected_total_points', 0)
    avg_pts = safe_get_numeric(p, 'avg_points', 0)
    proj_avg_pts = safe_get_numeric(p, 'projected_avg_points', 0)
    pct_owned = safe_get_numeric(p, 'percent_owned', 0)
    pct_started = safe_get_numeric(p, 'percent_started', 0)
    injury_status = getattr(p, 'injuryStatus', None) or 'ACTIVE'
    injured = 1 if getattr(p, 'injured', False) else 0
    pos_rank = getattr(p, 'posRank', None)
    if pos_rank is not None and not isinstance(pos_rank, int):
        pos_rank = None
    
    if existing and not force_update:
        # Only update dynamic fields (injury status, percent owned, etc.)
        cursor.execute("""
            UPDATE players SET
                injury_status = ?,
                injured = ?,
                total_points = CASE WHEN ? > total_points THEN ? ELSE total_points END,
                projected_total_points = CASE WHEN ? > 0 THEN ? ELSE projected_total_points END,
                avg_points = CASE WHEN ? > 0 THEN ? ELSE avg_points END,
                projected_avg_points = CASE WHEN ? > 0 THEN ? ELSE projected_avg_points END,
                percent_owned = ?,
                percent_started = ?,
                updated_at = ?
            WHERE player_id = ?
        """, (
            injury_status,
            injured,
            total_pts, total_pts,
            proj_total_pts, proj_total_pts,
            avg_pts, avg_pts,
            proj_avg_pts, proj_avg_pts,
            pct_owned,
            pct_started,
            now,
            player_id
        ))
    else:
        # Insert or fully replace
        cursor.execute("""
            INSERT OR REPLACE INTO players (
                player_id, name, position, pro_team, pos_rank, eligible_slots,
                injury_status, injured, total_points, projected_total_points,
                avg_points, projected_avg_points, percent_owned, percent_started,
                headshot_url, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            player_id,
            name,
            position,
            pro_team,
            pos_rank,
            safe_json_dumps(eligible_slots),
            injury_status,
            injured,
            total_pts,
            proj_total_pts,
            avg_pts,
            proj_avg_pts,
            pct_owned,
            pct_started,
            get_headshot_url(player_id, position, pro_team),
            now
        ))
    
    # Insert/update weekly stats (only if new data is better)
    if hasattr(p, 'stats') and p.stats:
        for week, week_data in p.stats.items():
            week_int = int(week) if isinstance(week, str) else week
            stats = extract_week_data(week_data)
            
            if week_int == 0:
                # Season totals - use UPSERT logic
                cursor.execute("""
                    INSERT INTO player_season_totals (
                        player_id, points, projected_points, avg_points,
                        projected_avg_points, breakdown, projected_breakdown
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(player_id) DO UPDATE SET
                        points = CASE WHEN excluded.points > player_season_totals.points THEN excluded.points ELSE player_season_totals.points END,
                        projected_points = CASE WHEN excluded.projected_points > 0 THEN excluded.projected_points ELSE player_season_totals.projected_points END,
                        avg_points = CASE WHEN excluded.avg_points > 0 THEN excluded.avg_points ELSE player_season_totals.avg_points END,
                        projected_avg_points = CASE WHEN excluded.projected_avg_points > 0 THEN excluded.projected_avg_points ELSE player_season_totals.projected_avg_points END,
                        breakdown = CASE WHEN excluded.breakdown != '{}' THEN excluded.breakdown ELSE player_season_totals.breakdown END,
                        projected_breakdown = CASE WHEN excluded.projected_breakdown != '{}' THEN excluded.projected_breakdown ELSE player_season_totals.projected_breakdown END
                """, (
                    player_id,
                    stats["points"],
                    stats["projected_points"],
                    stats["avg_points"],
                    week_data.get("projected_avg_points", 0) if isinstance(week_data, dict) else getattr(week_data, 'projected_avg_points', 0) or 0,
                    json.dumps(stats["breakdown"]),
                    json.dumps(stats["projected_breakdown"])
                ))
            else:
                # Weekly stats - use UPSERT logic to not overwrite good data
                cursor.execute("""
                    INSERT INTO player_weekly_stats (
                        player_id, week, points, projected_points, avg_points,
                        breakdown, projected_breakdown
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(player_id, week) DO UPDATE SET
                        points = CASE WHEN excluded.points > 0 THEN excluded.points ELSE player_weekly_stats.points END,
                        projected_points = CASE WHEN excluded.projected_points > 0 THEN excluded.projected_points ELSE player_weekly_stats.projected_points END,
                        avg_points = CASE WHEN excluded.avg_points > 0 THEN excluded.avg_points ELSE player_weekly_stats.avg_points END,
                        breakdown = CASE WHEN excluded.breakdown != '{}' THEN excluded.breakdown ELSE player_weekly_stats.breakdown END,
                        projected_breakdown = CASE WHEN excluded.projected_breakdown != '{}' THEN excluded.projected_breakdown ELSE player_weekly_stats.projected_breakdown END
                """, (
                    player_id,
                    week_int,
                    stats["points"],
                    stats["projected_points"],
                    stats["avg_points"],
                    json.dumps(stats["breakdown"]),
                    json.dumps(stats["projected_breakdown"])
                ))
    
    # Insert/update schedule
    if hasattr(p, 'schedule') and p.schedule:
        for week, game_data in p.schedule.items():
            week_int = int(week) if isinstance(week, str) else week
            
            if isinstance(game_data, dict):
                team = game_data.get("team", "")
                date = game_data.get("date")
            else:
                team = getattr(game_data, 'team', str(game_data)) if hasattr(game_data, 'team') else str(game_data)
                date = getattr(game_data, 'date', None) if hasattr(game_data, 'date') else None
            
            cursor.execute("""
                INSERT OR REPLACE INTO player_schedule (
                    player_id, week, opponent_team, game_date
                ) VALUES (?, ?, ?, ?)
            """, (
                player_id,
                week_int,
                team,
                date.isoformat() if date and hasattr(date, 'isoformat') else None
            ))
    
    conn.commit()
    return True


def process_box_player(cursor, box_player, week: int):
    """Process a BoxPlayer object and update the database."""
    try:
        player_id = get_player_id(box_player)
        if player_id is None:
            return False
        
        projected_pts = getattr(box_player, 'projected_points', 0) or 0
        actual_pts = getattr(box_player, 'points', 0) or 0
        
        # Get projected breakdown if available (handle list case for D/ST)
        proj_breakdown = {}
        raw_proj_breakdown = getattr(box_player, 'projected_breakdown', None)
        if raw_proj_breakdown and isinstance(raw_proj_breakdown, dict):
            proj_breakdown = convert_stat_keys(raw_proj_breakdown)
        
        # Get actual breakdown if available (handle list case for D/ST)
        breakdown = {}
        raw_breakdown = getattr(box_player, 'breakdown', None)
        if raw_breakdown and isinstance(raw_breakdown, dict):
            breakdown = convert_stat_keys(raw_breakdown)
        
        # Also ensure player exists in players table
        name = get_player_name(box_player)
        position = getattr(box_player, 'position', None) or 'Unknown'
        pro_team = getattr(box_player, 'proTeam', None) or ''
        
        cursor.execute("""
            INSERT OR IGNORE INTO players (player_id, name, position, pro_team, headshot_url, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            player_id,
            name,
            position,
            pro_team,
            get_headshot_url(player_id, position, pro_team),
            datetime.now().isoformat()
        ))
        
        # Update weekly stats with projections
        cursor.execute("""
            INSERT INTO player_weekly_stats (player_id, week, points, projected_points, avg_points, breakdown, projected_breakdown)
            VALUES (?, ?, ?, ?, 0, ?, ?)
            ON CONFLICT(player_id, week) DO UPDATE SET
                projected_points = CASE WHEN excluded.projected_points > 0 THEN excluded.projected_points ELSE player_weekly_stats.projected_points END,
                points = CASE WHEN excluded.points > 0 THEN excluded.points ELSE player_weekly_stats.points END,
                breakdown = CASE WHEN excluded.breakdown != '{}' THEN excluded.breakdown ELSE player_weekly_stats.breakdown END,
                projected_breakdown = CASE WHEN excluded.projected_breakdown != '{}' THEN excluded.projected_breakdown ELSE player_weekly_stats.projected_breakdown END
        """, (
            player_id,
            week,
            actual_pts,
            projected_pts,
            json.dumps(breakdown),
            json.dumps(proj_breakdown)
        ))
        return True
    except Exception as e:
        return False


def update_weekly_projections_from_box_scores(league: League, conn: sqlite3.Connection, current_week: int, weeks_to_update: Set[int] = None):
    """
    Fetch box scores for each week to get projected points from BoxPlayer objects.
    BoxPlayer contains projected_points that player_info doesn't provide.
    """
    cursor = conn.cursor()
    
    print("\n=== Fetching Weekly Projections from Box Scores ===")
    
    # Determine which weeks to fetch
    if weeks_to_update:
        weeks = sorted(weeks_to_update)
    else:
        weeks = list(range(1, min(current_week + 2, 18)))
    
    total_updated = 0
    
    for week in weeks:
        print(f"  Fetching box scores for Week {week}...")
        try:
            box_scores = league.box_scores(week=week)
            
            players_updated = 0
            for matchup in box_scores:
                # Process home team lineup
                for box_player in matchup.home_lineup:
                    if process_box_player(cursor, box_player, week):
                        players_updated += 1
                
                # Process away team lineup
                for box_player in matchup.away_lineup:
                    if process_box_player(cursor, box_player, week):
                        players_updated += 1
            
            conn.commit()
            print(f"    Updated {players_updated} player projections for Week {week}")
            total_updated += players_updated
            
        except Exception as e:
            print(f"    Error fetching Week {week} box scores: {e}")
    
    print(f"  Box score projections complete! Total updates: {total_updated}")
    return total_updated


def fetch_all_players(league: League, conn: sqlite3.Connection, force: bool = False):
    """
    Fetch all players in the league (rostered + free agents) and store in database.
    Rostered players ALWAYS get full updates (they need current projections).
    Free agents use incremental updates - only fetches if missing data.
    """
    existing_ids = get_existing_player_ids(conn) if not force else set()
    players_needing_stats = get_players_needing_stats(conn) if not force else set()
    
    processed_ids = set()
    new_players = 0
    updated_players = 0
    skipped_players = 0
    
    print("\n=== Fetching Rostered Players ===")
    print(f"  Existing players in DB: {len(existing_ids)}")
    print(f"  Players needing more stats: {len(players_needing_stats)}")
    print("  NOTE: All rostered players will be updated with latest data")
    
    # First, get all rostered players - ALWAYS update these
    for team in league.teams:
        print(f"Processing team: {team.team_name}")
        for player in team.roster:
            player_id = get_player_id(player)
            if player_id is None:
                print(f"  Warning: Could not get ID for {get_player_name(player)}")
                continue
            if player_id in processed_ids:
                continue
            
            try:
                # Rostered players ALWAYS get full fetch for latest projections
                # But we use player_info only for non-D/ST (D/ST often fails)
                position = getattr(player, 'position', '')
                
                if position == 'D/ST':
                    # For D/ST, just insert from roster data (player_info often fails)
                    insert_or_update_player(conn, player, force_update=True)
                    if player_id not in existing_ids:
                        new_players += 1
                    else:
                        updated_players += 1
                else:
                    # For regular players, get full info
                    full_player = league.player_info(playerId=player_id)
                    if full_player:
                        insert_or_update_player(conn, player, full_player, force_update=True)
                    else:
                        insert_or_update_player(conn, player, force_update=True)
                    
                    if player_id not in existing_ids:
                        new_players += 1
                    else:
                        updated_players += 1
                
                processed_ids.add(player_id)
                
                if (new_players + updated_players) % 10 == 0 and (new_players + updated_players) > 0:
                    print(f"  Progress: {new_players} new, {updated_players} updated...")
                    
            except Exception as e:
                print(f"  Error processing {get_player_name(player)}: {e}")
                # Still try to insert basic player info
                try:
                    insert_or_update_player(conn, player, force_update=False)
                    processed_ids.add(player_id)
                    updated_players += 1
                except Exception as e2:
                    print(f"    Fallback also failed: {e2}")
    
    print(f"\nRostered players: {new_players} new, {updated_players} updated")
    
    # Now fetch free agents
    print("\n=== Fetching Free Agents ===")
    positions = ['QB', 'RB', 'WR', 'TE', 'K', 'D/ST']
    
    for position in positions:
        print(f"\nFetching {position} free agents...")
        try:
            # Fetch free agents for this position
            free_agents = league.free_agents(position=position, size=500)
            
            fa_new = 0
            fa_updated = 0
            fa_skipped = 0
            
            for player in free_agents:
                player_id = get_player_id(player)
                if player_id is None:
                    continue
                if player_id in processed_ids:
                    continue
                
                # Check if we need to fetch full info (free agents use incremental logic)
                needs_full_fetch = (
                    force or 
                    player_id not in existing_ids or 
                    player_id in players_needing_stats
                )
                
                try:
                    if needs_full_fetch:
                        # D/ST - skip player_info (often fails), just use basic data
                        if position == 'D/ST':
                            insert_or_update_player(conn, player, force_update=force)
                        else:
                            full_player = league.player_info(playerId=player_id)
                            if full_player:
                                insert_or_update_player(conn, player, full_player, force_update=force)
                            else:
                                insert_or_update_player(conn, player, force_update=force)
                        
                        if player_id not in existing_ids:
                            fa_new += 1
                            new_players += 1
                        else:
                            fa_updated += 1
                            updated_players += 1
                    else:
                        insert_or_update_player(conn, player, force_update=False)
                        fa_skipped += 1
                        skipped_players += 1
                    
                    processed_ids.add(player_id)
                    
                    if (fa_new + fa_updated) % 20 == 0 and (fa_new + fa_updated) > 0:
                        print(f"  Progress: {fa_new} new, {fa_updated} updated, {fa_skipped} skipped...")
                        
                except Exception as e:
                    # Still try to insert basic player info
                    try:
                        insert_or_update_player(conn, player, force_update=False)
                        processed_ids.add(player_id)
                        fa_skipped += 1
                        skipped_players += 1
                    except:
                        pass
            
            print(f"  {position}: {fa_new} new, {fa_updated} updated, {fa_skipped} skipped")
            
        except Exception as e:
            print(f"  Error fetching {position} free agents: {e}")
    
    print(f"\n=== Complete ===")
    print(f"Total: {new_players} new, {updated_players} updated, {skipped_players} skipped")
    
    return new_players + updated_players


def main():
    parser = argparse.ArgumentParser(description='Build SQLite database of ESPN Fantasy Football players')
    parser.add_argument('--league_id', type=int, required=True, help='ESPN League ID')
    parser.add_argument('--espn_s2', type=str, default=None, help='ESPN S2 cookie (for private leagues)')
    parser.add_argument('--swid', type=str, default=None, help='SWID cookie (for private leagues)')
    parser.add_argument('--year', type=int, default=2025, help='Season year (default: 2025)')
    parser.add_argument('--db', type=str, default='players.db', help='Database file path (default: players.db)')
    parser.add_argument('--force', action='store_true', help='Force re-fetch all players (ignore existing data)')
    parser.add_argument('--projections-only', action='store_true', help='Only update projections from box scores')
    parser.add_argument('--skip-projections', action='store_true', help='Skip fetching box score projections')
    
    args = parser.parse_args()
    
    print(f"Connecting to ESPN League {args.league_id} for {args.year} season...")
    
    try:
        league = League(
            league_id=args.league_id,
            year=args.year,
            espn_s2=args.espn_s2,
            swid=args.swid
        )
        print(f"Connected! League: {league.settings.name if hasattr(league, 'settings') else 'Unknown'}")
        
        # Get current week
        current_week = league.current_week if hasattr(league, 'current_week') else 17
        print(f"Current Week: {current_week}")
    except Exception as e:
        print(f"Error connecting to league: {e}")
        return
    
    print(f"\nOpening database: {args.db}")
    conn = create_database(args.db)
    
    if args.projections_only:
        print("\n*** Projections-only mode ***")
    else:
        print("\nFetching players..." + (" (force mode)" if args.force else " (incremental mode)"))
        total = fetch_all_players(league, conn, force=args.force)
    
    # Fetch weekly projections from box scores (BoxPlayer has projected_points)
    if not args.skip_projections:
        update_weekly_projections_from_box_scores(league, conn, current_week)
    else:
        print("\nSkipping box score projections (--skip-projections flag)")
    
    # Print summary
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM players")
    player_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM player_weekly_stats")
    stats_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM player_schedule")
    schedule_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM player_weekly_stats WHERE projected_points > 0")
    projections_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM player_weekly_stats WHERE points > 0")
    actual_points_count = cursor.fetchone()[0]
    
    print(f"\n=== Database Summary ===")
    print(f"Players: {player_count}")
    print(f"Weekly stat records: {stats_count}")
    print(f"  - With actual points: {actual_points_count}")
    print(f"  - With projections: {projections_count}")
    print(f"Schedule records: {schedule_count}")
    print(f"Database saved to: {args.db}")
    
    conn.close()


if __name__ == '__main__':
    main()

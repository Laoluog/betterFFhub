from flask import Flask, request, jsonify
from flask_cors import CORS
from espn_api.football import League

app = Flask(__name__)

cors = CORS(app, resources={r"/parse-content": {"origins": "*"}})


def serialize_player(player):
    """Convert Player object to JSON-serializable dictionary"""
    # Serialize stats - convert datetime objects to strings if present
    stats = {}
    if hasattr(player, 'stats') and player.stats:
        for week, week_data in player.stats.items():
            stats[str(week)] = {
                "points": week_data.get("points", 0),
                "projected_points": week_data.get("projected_points", 0),
                "breakdown": week_data.get("breakdown", {}),
                "projected_breakdown": week_data.get("projected_breakdown", {}),
            }
    
    return {
        "name": player.name,
        "playerId": player.playerId,
        "position": player.position,
        "posRank": getattr(player, 'posRank', None),
        "eligibleSlots": getattr(player, 'eligibleSlots', []),
        "lineupSlot": player.lineupSlot,
        "acquisitionType": getattr(player, 'acquisitionType', None),
        "proTeam": player.proTeam,
        "onTeamId": getattr(player, 'onTeamId', None),
        "injuryStatus": player.injuryStatus,
        "injured": getattr(player, 'injured', False),
        "total_points": player.total_points,
        "projected_total_points": player.projected_total_points,
        "avg_points": player.avg_points,
        "projected_avg_points": player.projected_avg_points,
        "percent_owned": player.percent_owned,
        "percent_started": player.percent_started,
        "stats": stats,
        # ESPN headshot URL
        "headshotUrl": f"https://a.espncdn.com/i/headshots/nfl/players/full/{player.playerId}.png" if player.playerId > 0 else None,
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
    
    # Serialize teams
    teams = [serialize_team(team) for team in league.teams]
    
    # Serialize standings (also Team objects)
    standings = [serialize_team(team) for team in league.standings()]
    
    # Serialize rosters - dict with team_name as key and list of players as value
    rosters = {}
    for team in league.teams:
        rosters[team.team_name] = [serialize_player(player) for player in team.roster]
    
    print("standings", standings, "teams", teams, "rosters", rosters)

    return jsonify({
        "standings": standings,
        "teams": teams,
        "rosters": rosters
    }), 200


if __name__ == '__main__':
    app.run(debug=True)

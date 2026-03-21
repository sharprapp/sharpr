const ESPN_BASE = 'https://a.espncdn.com/i/teamlogos';
const espn = (sport, abbrev) => `${ESPN_BASE}/${sport}/500/${abbrev}.png`;

export const TEAM_LOGOS = {
  // NBA
  'Atlanta Hawks': espn('nba', 'atl'), 'Boston Celtics': espn('nba', 'bos'),
  'Brooklyn Nets': espn('nba', 'bkn'), 'Charlotte Hornets': espn('nba', 'cha'),
  'Chicago Bulls': espn('nba', 'chi'), 'Cleveland Cavaliers': espn('nba', 'cle'),
  'Dallas Mavericks': espn('nba', 'dal'), 'Denver Nuggets': espn('nba', 'den'),
  'Detroit Pistons': espn('nba', 'det'), 'Golden State Warriors': espn('nba', 'gsw'),
  'Houston Rockets': espn('nba', 'hou'), 'Indiana Pacers': espn('nba', 'ind'),
  'LA Clippers': espn('nba', 'lac'), 'Los Angeles Clippers': espn('nba', 'lac'),
  'Los Angeles Lakers': espn('nba', 'lal'), 'Memphis Grizzlies': espn('nba', 'mem'),
  'Miami Heat': espn('nba', 'mia'), 'Milwaukee Bucks': espn('nba', 'mil'),
  'Minnesota Timberwolves': espn('nba', 'min'), 'New Orleans Pelicans': espn('nba', 'no'),
  'New York Knicks': espn('nba', 'ny'), 'Oklahoma City Thunder': espn('nba', 'okc'),
  'Orlando Magic': espn('nba', 'orl'), 'Philadelphia 76ers': espn('nba', 'phi'),
  'Phoenix Suns': espn('nba', 'phx'), 'Portland Trail Blazers': espn('nba', 'por'),
  'Sacramento Kings': espn('nba', 'sac'), 'San Antonio Spurs': espn('nba', 'sa'),
  'Toronto Raptors': espn('nba', 'tor'), 'Utah Jazz': espn('nba', 'utah'),
  'Washington Wizards': espn('nba', 'wsh'),
  // NFL
  'Arizona Cardinals': espn('nfl', 'ari'), 'Atlanta Falcons': espn('nfl', 'atl'),
  'Baltimore Ravens': espn('nfl', 'bal'), 'Buffalo Bills': espn('nfl', 'buf'),
  'Carolina Panthers': espn('nfl', 'car'), 'Chicago Bears': espn('nfl', 'chi'),
  'Cincinnati Bengals': espn('nfl', 'cin'), 'Cleveland Browns': espn('nfl', 'cle'),
  'Dallas Cowboys': espn('nfl', 'dal'), 'Denver Broncos': espn('nfl', 'den'),
  'Detroit Lions': espn('nfl', 'det'), 'Green Bay Packers': espn('nfl', 'gb'),
  'Houston Texans': espn('nfl', 'hou'), 'Indianapolis Colts': espn('nfl', 'ind'),
  'Jacksonville Jaguars': espn('nfl', 'jax'), 'Kansas City Chiefs': espn('nfl', 'kc'),
  'Las Vegas Raiders': espn('nfl', 'lv'), 'Los Angeles Chargers': espn('nfl', 'lac'),
  'Los Angeles Rams': espn('nfl', 'lar'), 'Miami Dolphins': espn('nfl', 'mia'),
  'Minnesota Vikings': espn('nfl', 'min'), 'New England Patriots': espn('nfl', 'ne'),
  'New Orleans Saints': espn('nfl', 'no'), 'New York Giants': espn('nfl', 'nyg'),
  'New York Jets': espn('nfl', 'nyj'), 'Philadelphia Eagles': espn('nfl', 'phi'),
  'Pittsburgh Steelers': espn('nfl', 'pit'), 'San Francisco 49ers': espn('nfl', 'sf'),
  'Seattle Seahawks': espn('nfl', 'sea'), 'Tampa Bay Buccaneers': espn('nfl', 'tb'),
  'Tennessee Titans': espn('nfl', 'ten'), 'Washington Commanders': espn('nfl', 'wsh'),
  // MLB
  'Arizona Diamondbacks': espn('mlb', 'ari'), 'Atlanta Braves': espn('mlb', 'atl'),
  'Baltimore Orioles': espn('mlb', 'bal'), 'Boston Red Sox': espn('mlb', 'bos'),
  'Chicago Cubs': espn('mlb', 'chc'), 'Chicago White Sox': espn('mlb', 'chw'),
  'Cincinnati Reds': espn('mlb', 'cin'), 'Cleveland Guardians': espn('mlb', 'cle'),
  'Colorado Rockies': espn('mlb', 'col'), 'Detroit Tigers': espn('mlb', 'det'),
  'Houston Astros': espn('mlb', 'hou'), 'Kansas City Royals': espn('mlb', 'kc'),
  'Los Angeles Angels': espn('mlb', 'laa'), 'Los Angeles Dodgers': espn('mlb', 'lad'),
  'Miami Marlins': espn('mlb', 'mia'), 'Milwaukee Brewers': espn('mlb', 'mil'),
  'Minnesota Twins': espn('mlb', 'min'), 'New York Mets': espn('mlb', 'nym'),
  'New York Yankees': espn('mlb', 'nyy'), 'Oakland Athletics': espn('mlb', 'oak'),
  'Philadelphia Phillies': espn('mlb', 'phi'), 'Pittsburgh Pirates': espn('mlb', 'pit'),
  'San Diego Padres': espn('mlb', 'sd'), 'San Francisco Giants': espn('mlb', 'sf'),
  'Seattle Mariners': espn('mlb', 'sea'), 'St. Louis Cardinals': espn('mlb', 'stl'),
  'Tampa Bay Rays': espn('mlb', 'tb'), 'Texas Rangers': espn('mlb', 'tex'),
  'Toronto Blue Jays': espn('mlb', 'tor'), 'Washington Nationals': espn('mlb', 'wsh'),
  // NHL
  'Anaheim Ducks': espn('nhl', 'ana'), 'Boston Bruins': espn('nhl', 'bos'),
  'Buffalo Sabres': espn('nhl', 'buf'), 'Calgary Flames': espn('nhl', 'cgy'),
  'Carolina Hurricanes': espn('nhl', 'car'), 'Chicago Blackhawks': espn('nhl', 'chi'),
  'Colorado Avalanche': espn('nhl', 'col'), 'Columbus Blue Jackets': espn('nhl', 'cbj'),
  'Dallas Stars': espn('nhl', 'dal'), 'Detroit Red Wings': espn('nhl', 'det'),
  'Edmonton Oilers': espn('nhl', 'edm'), 'Florida Panthers': espn('nhl', 'fla'),
  'Los Angeles Kings': espn('nhl', 'la'), 'Minnesota Wild': espn('nhl', 'min'),
  'Montreal Canadiens': espn('nhl', 'mtl'), 'Nashville Predators': espn('nhl', 'nsh'),
  'New Jersey Devils': espn('nhl', 'nj'), 'New York Islanders': espn('nhl', 'nyi'),
  'New York Rangers': espn('nhl', 'nyr'), 'Ottawa Senators': espn('nhl', 'ott'),
  'Philadelphia Flyers': espn('nhl', 'phi'), 'Pittsburgh Penguins': espn('nhl', 'pit'),
  'San Jose Sharks': espn('nhl', 'sj'), 'Seattle Kraken': espn('nhl', 'sea'),
  'St. Louis Blues': espn('nhl', 'stl'), 'Tampa Bay Lightning': espn('nhl', 'tb'),
  'Toronto Maple Leafs': espn('nhl', 'tor'), 'Utah Hockey Club': espn('nhl', 'utah'),
  'Vancouver Canucks': espn('nhl', 'van'), 'Vegas Golden Knights': espn('nhl', 'vgk'),
  'Washington Capitals': espn('nhl', 'wsh'), 'Winnipeg Jets': espn('nhl', 'wpg'),
};

export const TEAM_COLORS = {
  'Atlanta Hawks': '#E03A3E', 'Boston Celtics': '#007A33', 'Brooklyn Nets': '#000000',
  'Chicago Bulls': '#CE1141', 'Cleveland Cavaliers': '#860038', 'Dallas Mavericks': '#00538C',
  'Denver Nuggets': '#0E2240', 'Golden State Warriors': '#1D428A', 'Houston Rockets': '#CE1141',
  'Los Angeles Lakers': '#552583', 'Miami Heat': '#98002E', 'Milwaukee Bucks': '#00471B',
  'New York Knicks': '#006BB6', 'Oklahoma City Thunder': '#007AC1', 'Philadelphia 76ers': '#006BB6',
  'Phoenix Suns': '#1D1160', 'Toronto Raptors': '#CE1141',
  'Kansas City Chiefs': '#E31837', 'San Francisco 49ers': '#AA0000', 'Dallas Cowboys': '#003594',
  'Green Bay Packers': '#203731', 'Buffalo Bills': '#00338D', 'New England Patriots': '#002244',
  'Baltimore Ravens': '#241773', 'Philadelphia Eagles': '#004C54',
  'New York Yankees': '#003087', 'Los Angeles Dodgers': '#005A9C', 'Boston Red Sox': '#BD3039',
  'Houston Astros': '#002D62', 'Chicago Cubs': '#0E3386',
  'Boston Bruins': '#FFB81C', 'Toronto Maple Leafs': '#00205B', 'Montreal Canadiens': '#AF1E2D',
  'Vegas Golden Knights': '#B4975A', 'New York Rangers': '#0038A8',
};

export function getTeamLogo(name) { return TEAM_LOGOS[name] || null; }
export function getTeamColor(name) { return TEAM_COLORS[name] || '#1a2a4a'; }
export function getTeamInitials(name) {
  if (!name) return '??';
  const w = name.trim().split(' ');
  return w.length === 1 ? w[0].slice(0, 2).toUpperCase() : (w[0][0] + w[w.length - 1][0]).toUpperCase();
}

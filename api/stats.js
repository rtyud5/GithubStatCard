const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const USERNAME = process.env.GITHUB_USERNAME || "rtyud5";

async function fetchStats(username) {
  const query = `
    query($username: String!) {
      user(login: $username) {
        name
        contributionsCollection {
          totalCommitContributions
          totalPullRequestReviewContributions
        }
        pullRequests(first: 1) { totalCount }
        pullRequests_merged: pullRequests(states: MERGED, first: 1) { totalCount }
        issues(first: 1) { totalCount }
        repositoriesContributedTo(contributionTypes: [COMMIT, PULL_REQUEST, REPOSITORY], first: 1) { totalCount }
        repositories(ownerAffiliations: OWNER, first: 100) {
          nodes { stargazerCount }
        }
      }
    }
  `;

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables: { username } }),
  });

  const data = await res.json();
  const user = data.data.user;

  const stars = user.repositories.nodes.reduce(
    (acc, repo) => acc + repo.stargazerCount,
    0
  );
  const commits = user.contributionsCollection.totalCommitContributions;
  const prs = user.pullRequests.totalCount;
  const prsMerged = user.pullRequests_merged.totalCount;
  const mergedPct =
    prs > 0 ? ((prsMerged / prs) * 100).toFixed(1) : "0.0";
  const prsReviewed =
    user.contributionsCollection.totalPullRequestReviewContributions;
  const issues = user.issues.totalCount;
  const contributed = user.repositoriesContributedTo.totalCount;

  return { stars, commits, prs, prsMerged, mergedPct, prsReviewed, issues, contributed };
}

async function fetchLangs(username) {
  const query = `
    query($username: String!) {
      user(login: $username) {
        repositories(ownerAffiliations: OWNER, isFork: false, first: 100) {
          nodes {
            languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
              edges { size node { name color } }
            }
          }
        }
      }
    }
  `;

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables: { username } }),
  });

  const data = await res.json();
  const repos = data.data.user.repositories.nodes;

  const langMap = {};
  let total = 0;
  for (const repo of repos) {
    for (const edge of repo.languages.edges) {
      const { name, color } = edge.node;
      langMap[name] = langMap[name] || { size: 0, color: color || "#8b949e" };
      langMap[name].size += edge.size;
      total += edge.size;
    }
  }

  return Object.entries(langMap)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 6)
    .map(([name, { size, color }]) => ({
      name,
      color,
      pct: ((size / total) * 100).toFixed(1),
    }));
}

function calcGrade(stats) {
  const score =
    stats.stars * 4 +
    stats.commits * 1.65 +
    stats.prs * 3 +
    stats.prsMerged * 2 +
    stats.issues * 1 +
    stats.contributed * 2;
  if (score >= 40000) return { label: "S",  pct: 1   };
  if (score >= 10000) return { label: "A+", pct: 0.9 };
  if (score >= 5000)  return { label: "A",  pct: 0.8 };
  if (score >= 2000)  return { label: "A-", pct: 0.7 };
  if (score >= 800)   return { label: "B+", pct: 0.6 };
  if (score >= 300)   return { label: "B",  pct: 0.5 };
  if (score >= 100)   return { label: "B-", pct: 0.4 };
  return { label: "C", pct: 0.3 };
}

function renderSVG(stats, langs, grade, year) {
  const BAR_WIDTH = 280;
  const circumference = 2 * Math.PI * 24;
  const offset = circumference * (1 - grade.pct);

  const langBarSegments = langs.map((l) => ({
    color: l.color,
    width: Math.round((parseFloat(l.pct) / 100) * BAR_WIDTH),
  }));

  let barX = 0;
  const barRects = langBarSegments.map((seg) => {
    const rect = `<rect x="${barX}" y="0" width="${seg.width}" height="8" fill="${seg.color}"/>`;
    barX += seg.width;
    return rect;
  });

  const langRows = langs
    .map(
      (l, i) =>
        `<g transform="translate(${i % 2 === 0 ? 0 : 148}, ${Math.floor(i / 2) * 22})">
          <circle cx="5" cy="5" r="5" fill="${l.color}"/>
          <text x="16" y="9" fill="#8b949e" font-size="11" font-family="monospace">${l.name}</text>
          <text x="140" y="9" fill="#7d8590" font-size="10" font-family="monospace" text-anchor="end">${l.pct}%</text>
        </g>`
    )
    .join("");

  const statRows = [
    { label: "Total Stars Earned",        value: stats.stars },
    { label: `Total Commits (${year})`,   value: stats.commits.toLocaleString() },
    { label: "Total PRs",                 value: stats.prs },
    { label: "PRs Merged",                value: `${stats.prsMerged} (${stats.mergedPct}%)` },
    { label: "Total Issues",              value: stats.issues },
    { label: "Contributed to",            value: stats.contributed },
  ]
    .map(
      (row, i) =>
        `<g transform="translate(0, ${i * 24})">
          <text x="0" y="13" fill="#8b949e" font-size="12" font-family="monospace">${row.label}</text>
          <text x="200" y="13" fill="#e6edf3" font-size="12" font-family="monospace" text-anchor="end" font-weight="500">${row.value}</text>
          <line x1="0" y1="20" x2="200" y2="20" stroke="#21262d" stroke-width="0.5"/>
        </g>`
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="200" viewBox="0 0 640 200">
  <rect width="640" height="200" rx="12" fill="#0d1117" stroke="#30363d" stroke-width="0.5"/>

  <!-- Left: Languages -->
  <text x="20" y="22" fill="#58a6ff" font-size="11" font-family="monospace" font-weight="500">rtyud5</text>
  <text x="20" y="38" fill="#7d8590" font-size="10" font-family="monospace">Most used languages</text>
  <g transform="translate(20, 48)">
    <rect width="${BAR_WIDTH}" height="8" rx="4" fill="#21262d"/>
    <g clip-path="url(#bar-clip)">${barRects.join("")}</g>
    <clipPath id="bar-clip"><rect width="${BAR_WIDTH}" height="8" rx="4"/></clipPath>
  </g>
  <g transform="translate(20, 66)">${langRows}</g>

  <!-- Divider -->
  <line x1="320" y1="16" x2="320" y2="184" stroke="#21262d" stroke-width="0.5"/>

  <!-- Right: Stats -->
  <text x="336" y="22" fill="#58a6ff" font-size="11" font-family="monospace" font-weight="500">rtyud5</text>
  <text x="336" y="38" fill="#7d8590" font-size="10" font-family="monospace">GitHub stats</text>
  <g transform="translate(336, 48)">${statRows}</g>

  <!-- Grade ring -->
<circle cx="588" cy="84" r="24" fill="none" stroke="#21262d" stroke-width="5"/>
  <circle cx="588" cy="84" r="24" fill="none" stroke="#58a6ff" stroke-width="5"
    stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"
    stroke-linecap="round" transform="rotate(-90 588 84)"/>
  <text x="588" y="84" text-anchor="middle" dominant-baseline="middle" fill="#e6edf3" font-size="12" font-weight="500" font-family="monospace">${grade.label}</text></svg>`;
}

export default async function handler(req, res) {
  try {
    const username = req.query.username || USERNAME;
    const year = new Date().getFullYear();

    const [stats, langs] = await Promise.all([
      fetchStats(username),
      fetchLangs(username),
    ]);

    const grade = calcGrade(stats);
    const svg = renderSVG(stats, langs, grade, year);

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    res.status(200).send(svg);
  } catch (err) {
    res.status(500).send(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="60">
      <rect width="640" height="60" rx="8" fill="#0d1117"/>
      <text x="20" y="35" fill="#f85149" font-size="13" font-family="monospace">Error: ${err.message}</text>
    </svg>`);
  }
}
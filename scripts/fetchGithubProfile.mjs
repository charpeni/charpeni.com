/**
 * Regenerates src/data/githubProfile.json — the dataset behind the GitHub
 * timeline window. Run manually (like the OG image scripts) whenever the
 * numbers feel stale:
 *
 *   GITHUB_TOKEN=$(gh auth token) node scripts/fetchGithubProfile.mjs
 *
 * PRIVACY INVARIANT: private repositories must NEVER appear in the output.
 * Three layers enforce it:
 *   1. the search query carries `is:public`;
 *   2. every distinct repository's visibility is re-verified via GraphQL,
 *      and anything not CONFIRMED `isPrivate: false` (private, renamed,
 *      errored) is dropped — the allowlist fails closed;
 *   3. prefer a fine-grained token restricted to public repositories, so
 *      the credential physically can't see private data.
 *
 * Counting rules (settled 2026-08-31): every authored PR counts, merged or
 * not; public repositories only; charpeni/charpeni.com is excluded as
 * self-referential noise.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOGIN = 'charpeni';
const EXCLUDED_REPOS = new Set(['charpeni/charpeni.com']);
const OUTPUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/data/githubProfile.json',
);

// Repos the regex fallback misclassifies; checked before the patterns.
const DOMAIN_OVERRIDES = {
  'sherweb/ngx-materialize': 'other',
  'Dogfalo/materialize': 'other',
};
const DOMAIN_PATTERNS = [
  ['graphql', /graphql|apollo/],
  ['testing', /jest|playwright|lighthouse|cspell|bundlewatch|testing|whatwg-url/],
  [
    'typescript',
    /definitelytyped|type-fest|typescript|one-of|groupby-typename|expect-type/,
  ],
  ['tooling', /pnpm|turborepo|oxc|rsdoctor|vite|yarn|swc|metro|angular-cli|npmx|bun|flipper|simple-icons|ohmyzsh/],
  ['react', /react|expo\/|svelte|next\.js|recharts|mantine/],
];

function domainOf(repo) {
  const override = DOMAIN_OVERRIDES[repo];
  if (override) return override;
  const lower = repo.toLowerCase();
  for (const [domain, pattern] of DOMAIN_PATTERNS) {
    if (pattern.test(lower)) return domain;
  }
  return 'other';
}

function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
  } catch {
    throw new Error(
      'No GitHub token. Set GITHUB_TOKEN (a fine-grained, public-repos-only token) or log in with gh.',
    );
  }
}

const AUTH = { Authorization: `Bearer ${token()}` };

async function rest(path) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: { ...AUTH, Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) {
    throw new Error(`GET ${path} → ${response.status}`);
  }
  return response.json();
}

async function graphql(query) {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { ...AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) {
    throw new Error(`GraphQL → ${response.status}`);
  }
  // Partial errors (e.g. renamed repos resolving to null) are fine — the
  // caller treats missing nodes as excluded.
  return (await response.json()).data;
}

async function fetchAllPrs() {
  const prs = [];
  for (let page = 1; page <= 10; page++) {
    const data = await rest(
      `/search/issues?q=author:${LOGIN}+type:pr+is:public&per_page=100&page=${page}`,
    );
    for (const item of data.items) {
      prs.push({
        repo: item.repository_url.split('/repos/')[1],
        year: Number(item.created_at.slice(0, 4)),
        month: Number(item.created_at.slice(5, 7)),
      });
    }
    if (page * 100 >= Math.min(data.total_count, 1000)) break;
  }
  return prs;
}

/** Verified-public allowlist: repo → stargazerCount. Fails closed. */
async function fetchPublicRepoStars(repos) {
  const stars = new Map();
  for (let i = 0; i < repos.length; i += 75) {
    const batch = repos.slice(i, i + 75);
    const query = batch
      .map((repo, j) => {
        const [owner, name] = repo.split('/');
        return `r${j}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) { isPrivate stargazerCount }`;
      })
      .join('\n');
    const data = await graphql(`query {\n${query}\n}`);
    batch.forEach((repo, j) => {
      const node = data?.[`r${j}`];
      if (node && node.isPrivate === false) {
        stars.set(repo, node.stargazerCount);
      } else {
        console.warn(`excluded (not confirmed public): ${repo}`);
      }
    });
  }
  return stars;
}

async function fetchYearMeta(years) {
  const meta = new Map();
  for (let i = 0; i < years.length; i += 4) {
    const batch = years.slice(i, i + 4);
    const query = batch
      .map(
        (y) => `y${y}: contributionsCollection(from: "${y}-01-01T00:00:00Z", to: "${y}-12-31T23:59:59Z") {
          totalCommitContributions
          totalPullRequestReviewContributions
          contributionCalendar { weeks { contributionDays { date contributionCount } } }
        }`,
      )
      .join('\n');
    const data = await graphql(
      `query { user(login: ${JSON.stringify(LOGIN)}) {\n${query}\n} }`,
    );
    for (const y of batch) {
      const coll = data.user[`y${y}`];
      const months = Array(12).fill(0);
      for (const week of coll.contributionCalendar.weeks) {
        for (const day of week.contributionDays) {
          if (day.date.startsWith(String(y))) {
            months[Number(day.date.slice(5, 7)) - 1] += day.contributionCount;
          }
        }
      }
      meta.set(y, {
        commits: coll.totalCommitContributions,
        reviews: coll.totalPullRequestReviewContributions,
        months,
      });
    }
  }
  return meta;
}

const prs = (await fetchAllPrs()).filter((pr) => !EXCLUDED_REPOS.has(pr.repo));
const stars = await fetchPublicRepoStars([
  ...new Set(prs.map((pr) => pr.repo)),
]);
const publicPrs = prs.filter((pr) => stars.has(pr.repo));

const yearNumbers = [...new Set(publicPrs.map((pr) => pr.year))].toSorted(
  (a, b) => b - a,
);
const meta = await fetchYearMeta(yearNumbers);

const years = yearNumbers.map((year) => {
  const inYear = publicPrs.filter((pr) => pr.year === year);
  const yearMeta = meta.get(year);
  const byRepo = new Map();
  for (const pr of inYear) {
    byRepo.set(pr.repo, (byRepo.get(pr.repo) ?? 0) + 1);
  }
  const repos = [...byRepo.entries()]
    .map(([repo, count]) => ({
      repo,
      stars: stars.get(repo),
      prs: count,
      domain: domainOf(repo),
    }))
    .toSorted((a, b) => b.stars - a.stars);
  const domains = new Map();
  for (const r of repos) {
    if (r.domain === 'other') continue;
    domains.set(r.domain, (domains.get(r.domain) ?? 0) + r.prs);
  }
  return {
    year,
    prs: inYear.length,
    commits: yearMeta.commits,
    reviews: yearMeta.reviews,
    months: yearMeta.months,
    domains: [...domains.entries()]
      .map(([domain, count]) => ({ domain, prs: count }))
      .toSorted((a, b) => b.prs - a.prs),
    repos,
  };
});

const output = {
  generatedAt: new Date().toISOString().slice(0, 10),
  login: LOGIN,
  totals: {
    prs: publicPrs.length,
    repos: stars.size,
    years: years.length,
  },
  years,
};
writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
try {
  execFileSync('pnpm', ['exec', 'oxfmt', OUTPUT]);
} catch {
  console.warn('oxfmt not available — run `pnpm format` before committing');
}
console.log(
  `wrote ${OUTPUT}: ${output.totals.prs} PRs, ${output.totals.repos} repos, ${output.totals.years} years`,
);

// GitHub Dashboard JavaScript
// Replace with your GitHub username
const GITHUB_USERNAME = 'Moekyawaung-developer';
const API_BASE = 'https://api.github.com';

// Cache for API responses
const cache = {
  repos: null,
  user: null,
  events: null
};

// Utility function to fetch from GitHub API
async function fetchGitHub(endpoint) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
}

// Initialize dashboard
async function init() {
  console.log('🚀 Initializing GitHub Dashboard...');
  
  // Load all data in parallel
  await Promise.all([
    loadProfileStats(),
    loadLatestActivity(),
    loadPinnedRepos(),
    loadActivityTimeline(),
    loadFollowers(),
    loadRepoStats(),
    loadLanguageStats(),
    loadHourlyHeatmap()
  ]);
  
  // Initialize contribution calendar
  initContributionCalendar();
  
  console.log('✅ Dashboard loaded successfully!');
}

// Load profile stats
async function loadProfileStats() {
  const user = await fetchGitHub(`/users/${GITHUB_USERNAME}`);
  if (!user) return;
  
  cache.user = user;
  
  const repos = await fetchGitHub(`/users/${GITHUB_USERNAME}/repos?per_page=100`);
  cache.repos = repos || [];
  
  const totalStars = repos ? repos.reduce((sum, repo) => sum + repo.stargazers_count, 0) : 0;
  const totalForks = repos ? repos.reduce((sum, repo) => sum + repo.forks_count, 0) : 0;
  
  const statsHTML = `
    <div class="stat-card">
      <span class="stat-number">${user.public_repos || 0}</span>
      <span class="stat-label">Repositories</span>
    </div>
    <div class="stat-card">
      <span class="stat-number">${totalStars}</span>
      <span class="stat-label">Total Stars</span>
    </div>
    <div class="stat-card">
      <span class="stat-number">${user.followers || 0}</span>
      <span class="stat-label">Followers</span>
    </div>
    <div class="stat-card">
      <span class="stat-number">${user.following || 0}</span>
      <span class="stat-label">Following</span>
    </div>
    <div class="stat-card">
      <span class="stat-number">${totalForks}</span>
      <span class="stat-label">Total Forks</span>
    </div>
    <div class="stat-card">
      <span class="stat-number">${user.public_gists || 0}</span>
      <span class="stat-label">Gists</span>
    </div>
  `;
  
  document.getElementById('stats-box').innerHTML = statsHTML;
}

// Load latest activity (commits, PRs, issues)
async function loadLatestActivity() {
  const events = await fetchGitHub(`/users/${GITHUB_USERNAME}/events?per_page=100`);
  if (!events) {
    document.getElementById('latest-commits').innerHTML = '<p class="error">Failed to load activity</p>';
    return;
  }
  
  cache.events = events;
  
  // Filter commits
  const commitEvents = events.filter(e => e.type === 'PushEvent');
  const commits = [];
  commitEvents.slice(0, 10).forEach(event => {
    if (event.payload.commits) {
      event.payload.commits.forEach(commit => {
        commits.push({
          message: commit.message,
          repo: event.repo.name,
          time: event.created_at
        });
      });
    }
  });
  
  const commitsHTML = commits.slice(0, 10).map(commit => `
    <div class="commit-item fade-in">
      <div class="commit-msg">${escapeHtml(commit.message.split('\n')[0])}</div>
      <div class="commit-meta">
        <a href="https://github.com/${commit.repo}" class="commit-repo" target="_blank">${commit.repo}</a>
        · ${formatTimeAgo(commit.time)}
      </div>
    </div>
  `).join('') || '<p class="loading">No recent commits</p>';
  
  document.getElementById('latest-commits').innerHTML = commitsHTML;
  
  // Filter PRs
  const prEvents = events.filter(e => e.type === 'PullRequestEvent');
  const prsHTML = prEvents.slice(0, 5).map(event => `
    <div class="pr-item fade-in">
      <div class="commit-msg">${escapeHtml(event.payload.pull_request.title)}</div>
      <div class="commit-meta">
        <a href="${event.payload.pull_request.html_url}" class="commit-repo" target="_blank">${event.repo.name}</a>
        · ${event.payload.action} · ${formatTimeAgo(event.created_at)}
      </div>
    </div>
  `).join('') || '<p class="loading">No recent pull requests</p>';
  
  document.getElementById('latest-prs').innerHTML = prsHTML;
  
  // Filter Issues
  const issueEvents = events.filter(e => e.type === 'IssuesEvent');
  const issuesHTML = issueEvents.slice(0, 5).map(event => `
    <div class="issue-item fade-in">
      <div class="commit-msg">${escapeHtml(event.payload.issue.title)}</div>
      <div class="commit-meta">
        <a href="${event.payload.issue.html_url}" class="commit-repo" target="_blank">${event.repo.name}</a>
        · ${event.payload.action} · ${formatTimeAgo(event.created_at)}
      </div>
    </div>
  `).join('') || '<p class="loading">No recent issues</p>';
  
  document.getElementById('latest-issues').innerHTML = issuesHTML;
}

// Load pinned repositories (using starred repos as substitute)
async function loadPinnedRepos() {
  let repos = cache.repos;
  if (!repos) {
    repos = await fetchGitHub(`/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`);
  }
  
  if (!repos) return;
  
  // Get top 6 repos by stars
  const topRepos = repos
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 6);
  
  const reposHTML = topRepos.map(repo => {
    const langColor = getLanguageColor(repo.language);
    return `
      <div class="repo-card fade-in">
        <a href="${repo.html_url}" class="repo-name" target="_blank">${repo.name}</a>
        <p class="repo-description">${escapeHtml(repo.description || 'No description')}</p>
        <div class="repo-stats">
          ${repo.language ? `
            <span class="repo-stat">
              <span class="language-dot" style="background: ${langColor}"></span>
              ${repo.language}
            </span>
          ` : ''}
          <span class="repo-stat">⭐ ${repo.stargazers_count}</span>
          <span class="repo-stat">🍴 ${repo.forks_count}</span>
        </div>
      </div>
    `;
  }).join('');
  
  document.getElementById('pinned-repos').innerHTML = reposHTML;
}

// Load activity timeline
async function loadActivityTimeline() {
  const events = cache.events || await fetchGitHub(`/users/${GITHUB_USERNAME}/events?per_page=30`);
  if (!events) return;
  
  const timelineHTML = events.slice(0, 20).map(event => {
    let action = '';
    switch(event.type) {
      case 'PushEvent':
        action = `Pushed ${event.payload.commits?.length || 0} commit(s)`;
        break;
      case 'CreateEvent':
        action = `Created ${event.payload.ref_type}`;
        break;
      case 'WatchEvent':
        action = 'Starred repository';
        break;
      case 'ForkEvent':
        action = 'Forked repository';
        break;
      case 'IssuesEvent':
        action = `${event.payload.action} issue`;
        break;
      case 'PullRequestEvent':
        action = `${event.payload.action} pull request`;
        break;
      default:
        action = event.type.replace('Event', '');
    }
    
    return `
      <div class="timeline-item fade-in">
        <div class="timeline-time">${formatTimeAgo(event.created_at)}</div>
        <div class="timeline-content">
          ${action} in <a href="https://github.com/${event.repo.name}" class="timeline-repo" target="_blank">${event.repo.name}</a>
        </div>
      </div>
    `;
  }).join('');
  
  document.getElementById('activity-timeline').innerHTML = timelineHTML;
}

// Initialize contribution calendar
function initContributionCalendar() {
  GitHubCalendar("#github-calendar", GITHUB_USERNAME, {
    responsive: true,
    tooltips: true,
    global_stats: true
  });
}

// Load followers
async function loadFollowers() {
  const followers = await fetchGitHub(`/users/${GITHUB_USERNAME}/followers?per_page=24`);
  if (!followers) return;
  
  const followersHTML = followers.map(follower => `
    <a href="${follower.html_url}" target="_blank" class="follower-card fade-in">
      <img src="${follower.avatar_url}" alt="${follower.login}" class="follower-avatar">
      <div class="follower-name">${follower.login}</div>
    </a>
  `).join('');
  
  document.getElementById('followers-list').innerHTML = followersHTML;
}

// Load repository statistics chart
async function loadRepoStats() {
  const repos = cache.repos || await fetchGitHub(`/users/${GITHUB_USERNAME}/repos?per_page=100`);
  if (!repos) return;
  
  // Get commit counts for top repositories
  const topRepos = repos
    .filter(r => !r.fork)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 10);
  
  const labels = topRepos.map(r => r.name);
  const stars = topRepos.map(r => r.stargazers_count);
  const forks = topRepos.map(r => r.forks_count);
  
  const ctx = document.getElementById('repoChart');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Stars',
          data: stars,
          backgroundColor: 'rgba(88, 166, 255, 0.8)',
          borderColor: 'rgba(88, 166, 255, 1)',
          borderWidth: 1
        },
        {
          label: 'Forks',
          data: forks,
          backgroundColor: 'rgba(56, 211, 159, 0.8)',
          borderColor: 'rgba(56, 211, 159, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: { color: '#c9d1d9' }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#8b949e' },
          grid: { color: '#21262d' }
        },
        x: {
          ticks: { 
            color: '#8b949e',
            maxRotation: 45,
            minRotation: 45
          },
          grid: { color: '#21262d' }
        }
      }
    }
  });
}

// Load language statistics
async function loadLanguageStats() {
  const repos = cache.repos || await fetchGitHub(`/users/${GITHUB_USERNAME}/repos?per_page=100`);
  if (!repos) return;
  
  // Count languages
  const languageCounts = {};
  repos.forEach(repo => {
    if (repo.language) {
      languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
    }
  });
  
  const sortedLangs = Object.entries(languageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  
  const labels = sortedLangs.map(l => l[0]);
  const data = sortedLangs.map(l => l[1]);
  const colors = labels.map(lang => getLanguageColor(lang));
  
  const ctx = document.getElementById('langChart');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderColor: '#161b22',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'right',
          labels: { 
            color: '#c9d1d9',
            padding: 15,
            font: { size: 12 }
          }
        }
      }
    }
  });
}

// Load hourly commit heatmap
async function loadHourlyHeatmap() {
  const events = cache.events || await fetchGitHub(`/users/${GITHUB_USERNAME}/events?per_page=100`);
  if (!events) return;
  
  // Initialize 7x24 grid (days x hours)
  const heatData = Array(7).fill().map(() => Array(24).fill(0));
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Count commits by day and hour
  events.forEach(event => {
    if (event.type === 'PushEvent') {
      const date = new Date(event.created_at);
      const day = date.getDay();
      const hour = date.getHours();
      heatData[day][hour]++;
    }
  });
  
  // Find max for normalization
  const maxCount = Math.max(...heatData.flat());
  
  // Generate grid HTML
  let gridHTML = '<div style="display: flex; gap: 10px;"><div style="display: flex; flex-direction: column; justify-content: space-around; padding-right: 10px;">';
  days.forEach(day => {
    gridHTML += `<div style="color: #8b949e; font-size: 0.85em; height: 40px; display: flex; align-items: center;">${day}</div>`;
  });
  gridHTML += '</div><div id="hourGrid">';
  
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const count = heatData[day][hour];
      const level = maxCount > 0 ? Math.min(4, Math.floor((count / maxCount) * 4)) : 0;
      gridHTML += `<div class="heat-cell heat-level-${level}" title="${days[day]} ${hour}:00 - ${count} commits">${count > 0 ? count : ''}</div>`;
    }
  }
  
  gridHTML += '</div></div>';
  gridHTML += '<div style="display: flex; gap: 5px; margin-top: 15px; justify-content: center; font-size: 0.85em; color: #8b949e;">Hours: ';
  for (let h = 0; h < 24; h += 3) {
    gridHTML += `<span style="width: 120px; text-align: center;">${h}:00</span>`;
  }
  gridHTML += '</div>';
  
  document.getElementById('hourly-heatmap').innerHTML = 
    '<div class="section-title">⏱ Hourly Commit Activity</div>' + gridHTML;
}

// Utility: Format time ago
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} months ago`;
  return `${Math.floor(seconds / 31536000)} years ago`;
}

// Utility: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Utility: Get language color
function getLanguageColor(language) {
  const colors = {
    'JavaScript': '#f1e05a',
    'TypeScript': '#2b7489',
    'Python': '#3572A5',
    'Java': '#b07219',
    'C++': '#f34b7d',
    'C': '#555555',
    'C#': '#178600',
    'PHP': '#4F5D95',
    'Ruby': '#701516',
    'Go': '#00ADD8',
    'Rust': '#dea584',
    'Swift': '#ffac45',
    'Kotlin': '#F18E33',
    'HTML': '#e34c26',
    'CSS': '#563d7c',
    'Shell': '#89e051',
    'Dart': '#00B4AB',
    'Vue': '#41b883',
    'React': '#61dafb'
  };
  return colors[language] || '#8b949e';
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
                                          }
          

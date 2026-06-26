// SEC Explorer Dashboard — Main Application

const SIGNAL_DATA = {
  sec_comments: [],
  patents: [],
  insider: [],
};

const TOOLTIPS = {
  'going-concern': 'The SEC thinks this company might not survive the next 12 months. This is a BIG red flag — they\'re questioning if the business can continue operating.',
  'material-weakness': 'The company\'s internal financial controls are broken. This means their financial numbers might be wrong. Think of it like a cash register that doesn\'t count correctly.',
  'revenue-recognition': 'The company might be counting money BEFORE they actually earn it. It\'s like marking a test as "passed" before taking it. Classic way to fake growth.',
  'non-compliance': 'The company is breaking rules — either SEC regulations, laws, or their own policies. This can lead to fines, lawsuits, or delisting.',
  'related-party': 'The company is doing business with insiders (CEO\'s brother, etc.). Could be fine, or could be a way to move money out of the company secretly.',
  'restatement': 'The company had to re-do their financial numbers from before. This means the old numbers were wrong — and people trusted them.',
  'fraud': 'The SEC has found evidence of intentional lying about the company\'s finances. This is the nuclear option — stocks usually drop 50-90%.',
  'patent-cliff': 'A drug\'s patent protects it from competitors (like a monopoly). When it expires, ANY company can make a generic version. Brand name usually loses 80% of sales within 1 year.',
  'insider-buy': 'When a CEO buys their own company stock, it means they think it\'s going up. They know the business better than anyone. Multiple insiders buying = very strong signal.',
  'insider-sell': 'When executives sell their stock, it can mean they know bad news is coming. Unless it\'s a pre-planned sale (10b5-1), it\'s worth investigating.',
  'cluster-buy': '3+ executives buying at the same time. This is one of the strongest bullish signals in investing — insiders are voting with their wallets.',
  'sec-comment': 'When the SEC reviews a company\'s filing and sends them a letter asking questions. Every single one of those questions is public. Wall Street analysts get paid to read these.',
  'form4-filing': 'Company insiders (CEOs, Directors) must report every buy/sell within 2 business days. It\'s public record — you can see exactly what they did.',
  'difficulty-level': 'How hard it is to act on this signal. Easy = just buy/sell stock. Hard = requires options knowledge, international accounts, or high capital.',
  'potential-earnings': 'Estimated profit if the signal plays out correctly. This is NOT guaranteed — think of it as a "if everything goes right" scenario. Always use stop losses.',
  'chance-of-fail': 'The probability that this trade will lose money. Every trade has risk. If this is above 40%, be very careful.',
  'edgar': 'The SEC\'s public database. Every public company\'s filings are here, updated every 10 minutes during business hours. Free to use.',
  'market-cap': 'Total value of all company shares. Large cap = established (Apple), small cap = risky but can grow faster (or crash harder).',
  'ticker': 'The company\'s stock symbol on the stock exchange. Like AAPL for Apple, TSLA for Tesla.',
  'volatility': 'How much the stock price swings up and down. High volatility = big potential gains AND big potential losses.',
  'timeframe': 'How long you typically need to wait for the signal to play out. Could be days (news) or months (patent cliffs, SEC investigations).',
  'min-capital': 'Minimum money you need to make this trade worthwhile. Some strategies require more cash to start.',
};

// ── Theme Toggle ──────────────────────────────────────────────────────────
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

// Check saved preference or default to dark
const savedTheme = localStorage.getItem('theme') || 'dark';
html.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

themeToggle.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon(next);
});

function updateThemeIcon(theme) {
  const icon = themeToggle.querySelector('span');
  icon.textContent = theme === 'dark' ? '☀️' : '�';
}

// ── Tooltip System ────────────────────────────────────────────────────────
const tooltipOverlay = document.createElement('div');
tooltipOverlay.className = 'tooltip-overlay';
document.body.appendChild(tooltipOverlay);

document.addEventListener('click', (e) => {
  const trigger = e.target.closest('.tooltip-trigger');
  if (trigger) {
    const key = trigger.dataset.tooltip;
    const content = TOOLTIPS[key];
    if (content) {
      const rect = trigger.getBoundingClientRect();
      tooltipOverlay.innerHTML = `<h4>?</h4><p>${content}</p>`;
      tooltipOverlay.style.left = `${Math.min(rect.left, window.innerWidth - 360)}px`;
      tooltipOverlay.style.top = `${rect.bottom + 8}px`;
      tooltipOverlay.classList.add('visible');
      e.stopPropagation();
    }
  } else if (!e.target.closest('.tooltip-overlay')) {
    tooltipOverlay.classList.remove('visible');
  }
});

// ── Signal Card Rendering ────────────────────────────────────────────────
function renderSignalCard(signal, type) {
  const level = signal.materiality?.level?.toLowerCase() || signal.signal?.level?.toLowerCase() || 'low';
  const score = signal.materiality?.score || signal.signal?.score || 0;
  const keywords = signal.materiality?.keywords || [];
  const hasInsider = type === 'insider';

  // Build earnings box
  let earningsHtml = '';
  if (signal.potentialEarnings || signal.signal?.total_buy > 0) {
    const buyShares = signal.signal?.total_buy || 0;
    const sellShares = signal.signal?.total_sell || 0;
    earningsHtml = `
      <div class="earnings-box">
        <div class="earnings-title">💰 What's Happening</div>
        ${buyShares > 0 ? `<div class="earnings-amount">BUY ${Number(buyShares).toLocaleString()} shares</div>` : ''}
        ${sellShares > 0 ? `<div class="earnings-amount" style="color: var(--accent-red)">SELL ${Number(sellShares).toLocaleString()} shares</div>` : ''}
        ${signal.price ? `<div class="earnings-range">@ $${signal.price} / share</div>` : ''}
        ${signal.date ? `<div class="earnings-range">� ${signal.date}</div>` : ''}
      </div>
    `;
  }

  // Difficulty meter
  const diffScore = signal.difficultyScore || (level === 'high' ? 3 : level === 'medium' ? 2 : 1);
  const diffLabel = diffScore >= 3 ? 'Hard' : diffScore >= 2 ? 'Medium' : 'Easy';
  const diffClass = diffScore >= 3 ? 'hard' : diffScore >= 2 ? 'medium' : 'easy';

  let diffPips = '';
  for (let i = 1; i <= 5; i++) {
    const filled = i <= diffScore ? 'filled' : '';
    diffPips += `<div class="difficulty-pip ${filled} ${diffClass}"></div>`;
  }

  // Walkthrough steps
  let walkthroughHtml = '';
  if (signal.walkthrough) {
    walkthroughHtml = signal.walkthrough.map((step, i) => `
      <div class="walkthrough-step">
        <div class="step-number">${i + 1}</div>
        <div class="step-content">${step}</div>
      </div>
    `).join('');
  }

  // Keywords
  let keywordsHtml = keywords.slice(0, 6).map(k => {
    const tooltipKey = k.toLowerCase().replace(/\s+/g, '-');
    return `<span class="signal-badge ${level === 'high' ? 'high' : 'medium'}">
      ${k} <span class="tooltip-trigger" data-tooltip="${tooltipKey}">?</span>
    </span>`;
  }).join(' ');

  return `
    <div class="signal-card ${level}" onclick="this.classList.toggle('expanded')">
      <div class="signal-header">
        <div>
          <div class="signal-title">${signal.company || signal.issuer || 'Unknown'}</div>
          <div class="signal-subtitle">${signal.subject || signal.owner || signal.reporting_owner || signal.drug || ''}</div>
        </div>
        <div style="text-align: right;">
          <span class="signal-badge ${level}">${level} · ${score}pts</span>
        </div>
      </div>
      ${keywords ? `<div style="padding: 0 1.25rem 0.5rem; display: flex; flex-wrap: wrap; gap: 0.35rem;">${keywordsHtml}</div>` : ''}
      <div class="signal-meta">
        <span>📊 ${typeLabel(type)}</span>
        <span>� ${signal.form_type || signal.owner_type || signal.urgency || ''}</span>
        <span>� ${signal.date || signal.expiry_window || ''}</span>
      </div>
      <div class="signal-expand">
        <div class="detail-row">
          <span class="detail-label">Difficulty <span class="tooltip-trigger" data-tooltip="difficulty-level">?</span></span>
          <span class="detail-value" style="display:flex;align-items:center;gap:0.5rem;">
            ${diffLabel}
            <div class="difficulty-bar">${diffPips}</div>
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Chance of Fail <span class="tooltip-trigger" data-tooltip="chance-of-fail">?</span></span>
          <span class="detail-value">${signal.chanceOfFail || (level === 'high' ? '15-25%' : '25-40%')}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Timeframe <span class="tooltip-trigger" data-tooltip="timeframe">?</span></span>
          <span class="detail-value">${signal.timeframe || estimateTimeframe(type, level)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Potential Earnings <span class="tooltip-trigger" data-tooltip="potential-earnings">?</span></span>
          <span class="detail-value" style="color: var(--accent-green)">${signal.potentialEarnings || estimateEarnings(level)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Min Capital <span class="tooltip-trigger" data-tooltip="min-capital">?</span></span>
          <span class="detail-value">${signal.minCapital || estimateMinCapital(diffScore)}</span>
        </div>
        ${earningsHtml}
        ${walkthroughHtml ? `<div class="walkthrough"><div class="earnings-title" style="margin-bottom:0.75rem;">� How to Act On This</div>${walkthroughHtml}</div>` : ''}
        ${signal.edgar_url ? `<div style="margin-top:1rem;"><a href="${signal.edgar_url}" target="_blank" style="color: var(--accent-blue); font-size: 0.85rem; text-decoration: none;">� Read the full filing on EDGAR →</a></div>` : ''}
        ${signal.letter_preview ? `<div style="margin-top:1rem; padding: 0.75rem; background: var(--bg-info); border-radius: 8px; font-size: 0.8rem; color: var(--text-secondary);"><strong>SEC said:</strong> ${signal.letter_preview}</div>` : ''}
      </div>
    </div>
  `;
}

function typeLabel(type) {
  const labels = { sec_comments: 'SEC Comment', patents: 'Patent Cliff', insider: 'Insider Trade' };
  return labels[type] || type;
}

function estimateTimeframe(type, level) {
  if (type === 'sec_comments') return level === 'high' ? '2-8 weeks' : '1-3 months';
  if (type === 'patents') return '6-18 months';
  if (type === 'insider') return '1-6 months';
  return 'Unknown';
}

function estimateEarnings(level) {
  if (level === 'high') return '$-50K to $500K+';
  if (level === 'medium') return '$-10K to $100K';
  return '$0 to $25K';
}

function estimateMinCapital(diff) {
  if (diff >= 3) return '$10,000+';
  if (diff >= 2) return '$1,000 - $10,000';
  return '$100 - $1,000';
}

// ── Navigation ────────────────────────────────────────────────────────────
function showPage(pageId) {
  document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(el => el.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  document.querySelector(`[data-page="${pageId}"]`)?.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('[data-page]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    showPage(el.dataset.page);
  });
});

// ── Data Loading ──────────────────────────────────────────────────────────
async function loadData() {
  try {
    const [secRes, patRes, insRes] = await Promise.allSettled([
      fetch('./data/sec_comments.json'),
      fetch('./data/patent_expiry.json'),
      fetch('./data/insider.json'),
    ]);

    const secData = secRes.status === 'fulfilled' ? await secRes.value.json() : { filings: [] };
    const patData = patRes.status === 'fulfilled' ? await patRes.value.json() : { critical: [], watch: [] };
    const insData = insRes.status === 'fulfilled' ? await insRes.value.json() : { filings: [] };

    // Render stats
    const totalSignals = (secData.filings?.length || 0) + (patData.critical?.length || 0) + (patData.watch?.length || 0) + (insData.filings?.length || 0);
    document.getElementById('totalSignals').textContent = totalSignals;
    document.getElementById('secCount').textContent = secData.filings?.length || 0;
    document.getElementById('patentCount').textContent = (patData.critical?.length || 0) + (patData.watch?.length || 0);
    document.getElementById('insiderCount').textContent = insData.filings?.length || 0;

    // Last update time
    document.getElementById('lastUpdate').textContent = new Date().toLocaleString();

    // Render signals
    const allSignals = [
      ...(secData.filings || []).map(s => ({ ...s, _type: 'sec_comments' })),
      ...(patData.critical || []).map(s => ({ ...s, _type: 'patents', company: s.drug, subject: `${s.brand} (${s.company})`, materiality: { level: s.urgency.includes('NOW') ? 'HIGH' : 'HIGH', score: 10 }, urgency: s.urgency, date: s.expiry_window, potentialEarnings: estimatePatentEarnings(s), walkthrough: patentWalkthrough(s), difficultyScore: walkthroughDifficulty(s) })),
      ...(patData.watch || []).map(s => ({ ...s, _type: 'patents', company: s.drug, subject: `${s.brand} (${s.company})`, materiality: { level: 'MEDIUM', score: 6 }, urgency: s.urgency, date: s.expiry_window })),
      ...(insData.filings || []).map(s => ({ ...s, _type: 'insider', company: s.company || s.issuer, subject: `${s.owner_type}: ${s.owner || s.reporting_owner}`, date: s.transactions?.[0]?.date })),
    ];

    // Sort by score descending
    allSignals.sort((a, b) => (b.materiality?.score || 0) - (a.materiality?.score || 0));

    const container = document.getElementById('signalsGrid');
    if (allSignals.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:3rem; color: var(--text-muted);">No active signals right now. The monitors are scanning 24/7.</div>';
    } else {
      container.innerHTML = allSignals.map(s => renderSignalCard(s, s._type)).join('');
    }

    // Render by category
    const secContainer = document.getElementById('secGrid');
    const patContainer = document.getElementById('patentGrid');
    const insContainer = document.getElementById('insiderGrid');

    if (secContainer) secContainer.innerHTML = (secData.filings || []).map(s => renderSignalCard(s, 'sec_comments')).join('') || '<p style="color:var(--text-muted)">No SEC comment signals</p>';
    if (patContainer) patContainer.innerHTML = [...(patData.critical||[]), ...(patData.watch||[])].map(s => renderSignalCard({...s, _type: 'patents', company: s.drug, subject: `${s.brand}`, materiality: { level: s.urgency.includes('NOW') ? 'HIGH' : 'MEDIUM', score: s.urgency.includes('NOW') ? 10 : 6 }, urgency: s.urgency, date: s.expiry_window }, 'patents')).join('') || '<p style="color:var(--text-muted)">No patent signals</p>';
    if (insContainer) insContainer.innerHTML = (insData.filings || []).map(s => renderSignalCard(s, 'insider')).join('') || '<p style="color:var(--text-muted)">No insider signals</p>';

  } catch (err) {
    console.error('Failed to load data:', err);
  }
}

function estimatePatentEarnings(drug) {
  const blockbusters = ['semaglutide', 'tirzepatide', 'dupilumab', 'apixaban', 'ibrutinib'];
  if (blockbusters.includes(drug.drug)) return '$100K - $2M+';
  return '$10K - $100K';
}

function walkthroughDifficulty(drug) {
  const easy = ['rivaroxaban', 'lenalidomide'];
  const hard = ['semaglutide', 'tirzepatide', 'lecanemab'];
  if (easy.includes(drug.drug)) return 1;
  if (hard.includes(drug.drug)) return 4;
  return 2;
}

function patentWalkthrough(drug) {
  return [
    `Research ${drug.brand} (${drug.drug}) — understand what it treats and who makes it`,
    `Check if ${drug.ticker} has already dropped (stock might have priced it in)`,
    `Look at ${drug.company}'s pipeline — do they have new drugs replacing it?`,
    `Decide your play: short ${drug.ticker} OR buy a generic competitor`,
    `Set a stop loss at 15-20% — patent cliffs don't always play out on schedule`,
  ];
}

// ── Filter System ─────────────────────────────────────────────────────────
document.querySelectorAll('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const filter = tab.dataset.filter;

    document.querySelectorAll('.signal-card').forEach(card => {
      if (filter === 'all') {
        card.style.display = '';
      } else if (filter === 'high') {
        card.style.display = card.classList.contains('high') ? '' : 'none';
      } else if (filter === 'medium') {
        card.style.display = card.classList.contains('medium') ? '' : 'none';
      } else if (filter === 'easy') {
        // Show cards with easy difficulty (1-2)
        card.style.display = !card.classList.contains('high') ? '' : 'none';
      }
    });
  });
});

// ── Learn Page Cards ─────────────────────────────────────────────────────
const LEARN_CARDS = [
  {
    icon: '�',
    title: 'What are SEC Comment Letters?',
    text: 'When the SEC reviews a company\'s financial report, they send a letter asking questions. Every question is public. It\'s like seeing the teacher\'s answer key before the exam.',
    tooltips: ['sec-comment', 'edgar']
  },
  {
    icon: '💊',
    title: 'What\'s a Patent Cliff?',
    text: 'Drug companies have 20-year monopolies on their drugs. When that expires, ANY company can make a cheap generic version. The brand name usually loses 80% of sales in 1 year.',
    tooltips: ['patent-cliff']
  },
  {
    icon: '👔',
    title: 'Why Follow Insiders?',
    text: 'CEOs know their company better than anyone. When they buy their own stock, it\'s a strong signal they think it\'s going up. Research shows insider buying beats the market by 6-8% per year.',
    tooltips: ['insider-buy', 'cluster-buy', 'form4-filing']
  },
  {
    icon: '�',
    title: 'What Does "Going Concern" Mean?',
    text: 'The SEC thinks the company might go bankrupt. This is the most serious red flag. In 2020, going concern warnings preceded 80% of corporate bankruptcies.',
    tooltips: ['going-concern']
  },
  {
    icon: '💰',
    title: 'How Much Can I Make?',
    text: 'Depends on the signal type, your capital, and timing. SEC comment plays: 5-40% upside. Patent cliffs: 20-80% over 1-2 years. Insider plays: 5-30% over 6 months. Always use stop losses.',
    tooltips: ['potential-earnings', 'chance-of-fail']
  },
  {
    icon: '�',
    title: 'What is EDGAR?',
    text: 'The SEC\'s free public database. Every public company must file their financial reports here. Updated every 10 minutes. Hedge funds pay $100K+ for tools that just read EDGAR faster.',
    tooltips: ['edgar']
  },
  {
    icon: '🎯',
    title: 'How Do I Act On These?',
    text: 'Each signal card has a step-by-step walkthrough. Click any signal → see "How to Act On This" with specific steps, difficulty level, minimum capital needed, and timeframe.',
    tooltips: ['difficulty-level', 'min-capital', 'timeframe']
  },
  {
    icon: '⚠️',
    title: 'What Are the Risks?',
    text: 'Every signal has a "chance of fail" — the probability the trade loses money. Government signals are EDUCATIONAL, not financial advice. Always do your own research. Never invest more than you can afford to lose.',
    tooltips: ['chance-of-fail']
  }
];

function renderLearnPage() {
  const container = document.getElementById('learnGrid');
  if (!container) return;

  container.innerHTML = LEARN_CARDS.map(card => `
    <div class="learn-card">
      <div class="learn-icon">${card.icon}</div>
      <h3>${card.title}</h3>
      <p>${card.text}</p>
      <div style="margin-top: 0.75rem; display: flex; gap: 0.35rem;">
        ${card.tooltips.map(t => `<span class="tooltip-trigger" data-tooltip="${t}">?</span>`).join(' ')}
      </div>
    </div>
  `).join('');
}

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  renderLearnPage();

  // Auto-refresh every 5 minutes
  setInterval(loadData, 5 * 60 * 1000);
});

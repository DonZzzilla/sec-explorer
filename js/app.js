// ═══════════════════════════════════════════════════════════════════════
// SEC Explorer — Premium Tactical Intelligence Interface
// ═══════════════════════════════════════════════════════════════════════

const T = {
  // Persistent running total
  runningTotal: parseInt(localStorage.getItem('runningTotal') || '0'),

  init() {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    this.updateThemeBtn(saved);
    this.initCursor();
    this.initParticles();
    this.initScrollReveal();
    this.initHeaderScroll();
    this.initHudCounter();
    this.initMobileMenu();
    this.initHashRouting();
    this.updateRunningTotalDisplay();
  },

  toggle() {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    this.updateThemeBtn(next);
  },

  updateThemeBtn(t) {
    const span = document.querySelector('#themeBtn span');
    if (span) span.textContent = t === 'dark' ? '☀' : '☽';
  },

  initHashRouting() {
    const handleHash = () => {
      const page = window.location.hash.replace('#', '') || 'home';
      const valid = ['home', 'signals', 'learn', 'endeavors', 'monetize', 'about'];
      this.show(valid.includes(page) ? page : 'home');
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
  },

  initMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const nav = document.getElementById('mobileNav');
    if (!btn || !nav) return;
    btn.addEventListener('click', () => nav.classList.toggle('open'));
    nav.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => nav.classList.remove('open'));
    });
  },

  initCursor() {
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    if (!dot || !ring) return;
    let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX; mouseY = e.clientY;
      dot.style.left = mouseX + 'px'; dot.style.top = mouseY + 'px';
    });
    const followRing = () => {
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      ring.style.left = ringX + 'px'; ring.style.top = ringY + 'px';
      requestAnimationFrame(followRing);
    };
    followRing();
    document.querySelectorAll('[data-cursor="hover"], a, button, .signal-card, .stat-card').forEach(el => {
      el.addEventListener('mouseenter', () => { ring.classList.add('hover'); dot.classList.add('hover'); });
      el.addEventListener('mouseleave', () => { ring.classList.remove('hover'); dot.classList.remove('hover'); });
    });
    document.addEventListener('mousedown', () => ring.classList.add('click'));
    document.addEventListener('mouseup', () => ring.classList.remove('click'));
    document.addEventListener('touchstart', () => { dot.style.display = 'none'; ring.style.display = 'none'; }, { once: true });
  },

  initParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    const COUNT = 60;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.4 + 0.1;
        this.pulse = Math.random() * Math.PI * 2;
      }
      update() {
        this.x += this.speedX; this.y += this.speedY; this.pulse += 0.02;
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
      }
      draw() {
        const opacity = this.opacity * (0.5 + 0.5 * Math.sin(this.pulse));
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(68, 138, 255, ${opacity})`; ctx.fill();
      }
    }
    for (let i = 0; i < COUNT; i++) particles.push(new Particle());
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(68, 138, 255, ${0.06 * (1 - dist / 150)})`; ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animate);
    };
    animate();
  },

  initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = parseInt(entry.target.dataset.delay || '0');
          setTimeout(() => entry.target.classList.add('visible'), delay);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal-up, .reveal-scale').forEach(el => observer.observe(el));
  },

  initHeaderScroll() {
    const header = document.getElementById('mainHeader');
    if (!header) return;
    window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 50), { passive: true });
  },

  initHudCounter() {
    const bar = document.getElementById('hudBar');
    if (bar) setTimeout(() => bar.style.width = '94%', 800);
    const update = () => {
      const el = document.getElementById('hudLastScan');
      if (el) el.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
    };
    update(); setInterval(update, 30000);
  },

  show(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
    document.querySelector(`.nav-link[data-page="${id}"]`)?.classList.add('active');
    document.querySelectorAll(`.mobile-nav-link[data-page="${id}"]`).forEach(l => {
      document.querySelectorAll('.mobile-nav-link').forEach(x => x.classList.remove('active'));
      l.classList.add('active');
    });
    if (id !== 'home') history.replaceState(null, '', '#' + id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  showTooltip(el, key) {
    const content = this.tooltips[key];
    if (!content) return;
    const popup = document.getElementById('tooltipPopup');
    const rect = el.getBoundingClientRect();
    const title = key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    popup.innerHTML = `<h4>${title}</h4><p>${content}</p><a href="learn/#${key}" class="learn-more" data-page="learn">Full breakdown →</a>`;
    popup.style.left = `${Math.min(rect.left, window.innerWidth - 340)}px`;
    popup.style.top = `${rect.bottom + 8}px`;
    popup.classList.add('visible');
  },

  hideTooltip() { document.getElementById('tooltipPopup')?.classList.remove('visible'); },

  tooltips: {
    'sec-comment': 'When the SEC reviews a company\'s financial report and sends a letter asking questions. Every question is public record. Hedge fund analysts get paid $150K+/year to read these.',
    'going-concern': 'The SEC thinks this company might not survive the next 12 months. Companies with going concern warnings have an 80% chance of bankruptcy within 2 years.',
    'material-weakness': 'The company\'s internal financial controls are broken. Means their reported numbers might be wrong.',
    'revenue-recognition': 'The company might be counting money BEFORE they actually earn it. Classic way to fake revenue growth. Enron did this.',
    'non-compliance': 'The company is breaking rules. This leads to fines, lawsuits, or getting kicked off the stock exchange.',
    'related-party': 'The company is doing business with insiders. Could be fine, or could be a way to secretly move money.',
    'fraud': 'The SEC has evidence of intentional lying. Stocks usually drop 50-90% within days.',
    'restatement': 'The company had to re-do their financial numbers. Restatements precede lawsuits 90% of the time.',
    'patent-cliff': 'Drug companies have 20-year monopolies. When the patent expires, ANY company can make a cheap generic. Sales drop 80% within 1 year.',
    'insider-buy': 'When a CEO buys their own stock, they think it\'s going up. Insider buying beats the market by 6-8% per year.',
    'insider-sell': 'When executives sell stock, they might know bad news is coming. Worth investigating.',
    'cluster-buy': '3+ executives buying at the same time. One of the strongest signals in investing.',
    'form4-filing': 'Company insiders must report every buy/sell within 2 business days. It\'s public record.',
    'edgar': 'The SEC\'s free public database. Every public company files their reports here. Updated every 10 minutes.',
    'ticker': 'The company\'s stock symbol. Like AAPL for Apple, TSLA for Tesla.',
    'market-cap': 'Total value of all company shares. Large cap = established. Small cap = riskier but can 10x.',
    'timeframe': 'How long you typically wait for the signal to play out. Could be days or months.',
    'difficulty': 'How hard it is to act on this signal. Easy = buy/sell on Robinhood. Options requires approval.',
    'potential-earnings': 'Estimated profit IF the signal plays out. This is NOT guaranteed.',
    'chance-of-fail': 'Probability the trade loses money. Every trade has risk. Never bet more than you can afford to lose.',
    'min-capital': 'Minimum money you need to make this trade worthwhile.',
    'volatility': 'How much the stock price swings. High vol = big potential gains AND losses.',
  },

  renderSignalCard(signal, type) {
    const level = (signal.materiality?.level || signal.signal?.level || 'low').toLowerCase();
    const score = signal.materiality?.score || signal.signal?.score || 0;
    const keywords = signal.materiality?.keywords || [];
    const emoji = { sec_comments: '⬡', patents: '◈', insider: '◉' }[type] || '◇';
    const typeLabel = { sec_comments: 'SEC Comment', patents: 'Patent Cliff', insider: 'Insider Trade' }[type];
    const diff = signal.difficulty || (level === 'high' ? 3 : level === 'medium' ? 2 : 1);
    const diffLabel = diff >= 3 ? 'Hard' : diff >= 2 ? 'Medium' : 'Easy';
    const diffClass = diff >= 3 ? 'hard' : diff >= 2 ? 'medium' : 'easy';
    const diffDots = Array.from({length: 5}, (_, i) => `<span class="diff-dot ${i < diff ? 'filled ' + diffClass : ''}"></span>`).join('');
    const kwHtml = keywords.slice(0, 5).map(k => `<span class="badge badge-${level === 'high' ? 'high' : 'medium'}">${k}</span>`).join('');
    const buy = signal.signal?.total_buy || 0;
    const sell = signal.signal?.total_sell || 0;
    let earnHtml = '';
    if (buy > 0 || sell > 0 || signal.potentialEarnings) {
      earnHtml = '<div class="earnings-box"><div class="earnings-title">Intelligence Summary</div>';
      if (buy > 0) earnHtml += `<div class="earnings-amount">▲ BUY $${Number(buy).toLocaleString()}</div>`;
      if (sell > 0) earnHtml += `<div class="earnings-amount" style="color:var(--accent-red)">▼ SELL $${Number(sell).toLocaleString()}</div>`;
      if (signal.price) earnHtml += `<div class="earnings-range">@ $${signal.price}/share</div>`;
      if (signal.date) earnHtml += `<div class="earnings-range">${signal.date}</div>`;
      if (signal.potentialEarnings) earnHtml += `<div class="earnings-title" style="margin-top:0.5rem;">Potential</div><div class="earnings-amount">${signal.potentialEarnings}</div>`;
      earnHtml += '</div>';
    }
    let walkHtml = '';
    if (signal.walkthrough) {
      walkHtml = '<div class="walkthrough"><div class="earnings-title">Action Protocol</div>' +
        signal.walkthrough.map((s, i) => `<div class="walkthrough-step"><div class="step-num">${i + 1}</div><div class="step-text">${s}</div></div>`).join('') + '</div>';
    }
    const details = [
      ['Difficulty', `${diffLabel} ${diffDots}`, 'difficulty'],
      ['Fail Risk', signal.chanceOfFail || (level === 'high' ? '15-25%' : '25-40%'), 'chance-of-fail'],
      ['Timeframe', signal.timeframe || this.estimateTF(type, level), 'timeframe'],
      ['Min Capital', signal.minCapital || this.estimateCap(diff), 'min-capital'],
    ];
    const detailHtml = details.map(([l, v, k]) => `
      <div class="detail-row">
        <span class="detail-label">${l} <span class="tooltip-trigger" data-key="${k}" data-cursor="hover">?</span></span>
        <span class="detail-value">${v}</span>
      </div>`).join('');

    return `
      <div class="signal-card ${level}" data-level="${level}" onclick="this.classList.toggle('expanded')" data-cursor="hover">
        <div class="signal-card-header">
          <div>
            <div class="signal-title">${signal.company || signal.issuer || signal.drug || 'Unknown'}</div>
            <div class="signal-subtitle">${signal.subject || signal.owner || signal.owner_type || signal.brand || ''}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <span class="badge badge-${level}">${emoji} ${level.toUpperCase()} · ${score}</span>
          </div>
        </div>
        ${kwHtml ? `<div class="signal-badges">${kwHtml}</div>` : ''}
        <div class="signal-card-meta">
          <span>${typeLabel}</span>
          <span>${signal.form_type || signal.owner_type || signal.urgency || ''}</span>
          <span>${signal.date || signal.expiry_window || ''}</span>
        </div>
        <div class="signal-detail">
          <div class="detail-inner">
            ${detailHtml} ${earnHtml} ${walkHtml}
            ${signal.edgar_url ? `<a href="${signal.edgar_url}" target="_blank" style="display:block;margin-top:0.75rem;color:var(--accent-blue);font-size:0.8rem;">Read full filing →</a>` : ''}
            ${signal.letter_preview ? `<div style="margin-top:0.75rem;padding:0.5rem;background:var(--bg-surface);border-radius:8px;font-size:0.78rem;border:1px solid var(--border);"><strong>SEC said:</strong> ${signal.letter_preview}</div>` : ''}
          </div>
        </div>
      </div>`;
  },

  estimateTF(type, level) {
    if (type === 'sec_comments') return level === 'high' ? '2-8 weeks' : '1-3 months';
    if (type === 'patents') return '6-18 months';
    return '1-6 months';
  },
  estimateCap(diff) { return diff >= 3 ? '$10K+' : diff >= 2 ? '$1K-$10K' : '$100-$1K'; },

  renderLearnCard(card) {
    const tp = (card.tooltips || []).map(k => `<span class="tooltip-trigger" data-key="${k}" data-cursor="hover">?</span>`).join(' ');
    const deepLink = card.deepLink || card.tooltips?.[0] || '';
    return `<div class="learn-card" data-cursor="hover"><div class="learn-card-logo">${card.icon}</div><h3>${card.title}</h3><p>${card.text}</p><div class="tooltips-inline">${tp}</div>${deepLink ? `<a href="learn/#${deepLink}" class="deep-link" data-cursor="hover">Full breakdown →</a>` : ''}</div>`;
  },

  renderEndeavorCard(e, idx) {
    const tp = (e.tooltips || []).map(k => `<span class="tooltip-trigger" data-key="${k}" data-cursor="hover">?</span>`).join(' ');
    const status = e.coming ? 'coming' : 'active';
    const statusText = e.coming ? 'COMING SOON' : 'OPERATIONAL';
    return `<div class="endeavor-card reveal-up" data-delay="${idx * 80}" data-cursor="hover">
      <div class="endeavor-card-header"><span class="endeavor-icon">${e.icon}</span><span class="endeavor-status ${status}">${statusText}</span></div>
      <h3>${e.title}</h3><p>${e.text}</p>
      ${e.diagram ? `<div class="endeavor-diagram"><pre>${e.diagram}</pre></div>` : ''}
      <div class="tooltips-inline">${tp}</div></div>`;
  },

  learnCards: [
    { icon: '◇', title: 'What is EDGAR?', text: 'EDGAR = Electronic Data Gathering, Analysis, and Retrieval. It\'s the SEC\'s free public filing system — every public company is required to dump their financial reports here. Updated every 10 minutes. Hedge funds pay $100K+/year for tools that just read EDGAR faster. We made it free.', tooltips: ['edgar'], deepLink: 'edgar' },
    { icon: '⬡', title: 'SEC Comment Letters', text: 'When the SEC reviews a financial report, they send a letter with questions. Every question is public. It\'s like seeing the teacher\'s answer key before the exam.', tooltips: ['sec-comment', 'going-concern', 'revenue-recognition'], deepLink: 'sec-comment' },
    { icon: '◈', title: 'Patent Cliffs', text: 'Drug companies have 20-year monopolies. When the patent expires, ANY company can make a cheap generic. Lipitor went from $12B/year to $2B. Knowing when = knowing which stocks will drop.', tooltips: ['patent-cliff'], deepLink: 'patent-cliff' },
    { icon: '◉', title: 'Why Follow Insiders?', text: 'CEOs know their company better than anyone. When they buy their own stock, they think it\'s going up. Insider buying beats the market by 6-8% per year.', tooltips: ['insider-buy', 'cluster-buy', 'form4-filing'], deepLink: 'insider-trading' },
    { icon: '⚠', title: 'Going Concern', text: 'The SEC is formally warning that the company might not survive. Companies with going concern warnings have an 80% chance of bankruptcy within 2 years.', tooltips: ['going-concern', 'fraud'], deepLink: 'going-concern' },
    { icon: '◆', title: 'Profit Potential', text: 'SEC comments: 5-40% over 2-8 weeks. Patent cliffs: 20-80% over 6-18 months. Insider buying: 5-30% over 6 months. Always use stop losses.', tooltips: ['potential-earnings', 'chance-of-fail'], deepLink: 'potential-earnings' },
    { icon: '◎', title: 'How to Trade', text: 'Each signal card has a step-by-step walkthrough. Click any signal → see "Action Protocol." Difficulty level shown on every card.', tooltips: ['difficulty', 'min-capital', 'timeframe'], deepLink: 'trading-guide' },
    { icon: '◌', title: 'Understanding Risk', text: 'Every signal has a "chance of fail." AI might hallucinate. Government data is raw truth. EDUCATIONAL, not financial advice.', tooltips: ['chance-of-fail'] },
    { icon: '◈', title: 'Revenue Recognition', text: 'How companies count their money — and why the timing matters. The SEC questions revenue recognition when they suspect companies are booking fake sales.', tooltips: ['revenue-recognition'], deepLink: 'revenue-recognition' },
    { icon: '⚙', title: 'Material Weakness', text: 'When a company\'s internal financial controls are broken, you can\'t trust their numbers. Here\'s what that means.', tooltips: ['material-weakness'], deepLink: 'material-weakness' },
    { icon: '✦', title: 'Cluster Buying', text: 'When 3+ insiders buy at the same time, it\'s one of the strongest signals in finance. Here\'s why — and how to trade it.', tooltips: ['cluster-buy'], deepLink: 'cluster-buy' },
    { icon: '◐', title: 'Form 4 Filings', text: 'The paper trail of insider trades. How to read the forms that CEOs must file when they buy or sell their own stock.', tooltips: ['form4-filing'], deepLink: 'form4-filing' },
  ],

  endeavorCards: [
    { icon: '⬡', title: 'SEC Comment Letters', text: 'The SEC sends questions to companies about their financial filings. We filter, score, and surface the ones that predict stock drops.',
      diagram: 'SEC Filing Reviewed\n    ↓\nSEC Sends Comment Letter (public!)\n    ↓\nQuestion: "Why did you change\nrevenue recognition?"\n    ↓\nAI Scores Materiality\n    ↓\nHIGH/MEDIUM Alert → Discord/Site\n    ↓\nUser researches → trades',
      tooltips: ['sec-comment', 'going-concern'], coming: false },
    { icon: '◈', title: 'Patent Cliff Hunter', text: 'Blockbuster drugs lose patent protection every year. Brand-name stock crashes 20-80%. We track 20 major drugs.',
      diagram: 'Patent Protected → Monopoly Pricing\n    ↓ (20 years)\nPatent Expires → Generics Allowed\n    ↓\nBrand Name Sales Drop 80%\n    ↓\nStock Price Crashes 20-80%\n    ↓\nGeneric Competitors Rise',
      tooltips: ['patent-cliff'], coming: false },
    { icon: '◉', title: 'Insider Trading Tracker', text: 'CEOs must report every buy/sell within 2 days. Cluster buying (3+ insiders) is the strongest signal.',
      diagram: 'CEO/Director buys shares\n    ↓\nFiles Form 4 within 48hrs (public)\n    ↓\nWe detect the filing\n    ↓\nIs it CLUSTER buying?\n(3+ insiders same time)\n    ↓\nSTRONG BUY signal (~65% success)',
      tooltips: ['insider-buy', 'cluster-buy', 'form4-filing'], coming: false },
    { icon: '◐', title: '8-K Material Events', text: 'Companies must file 8-K within 4 days of material events — M&A, restatements, CEO firing, cyber breach. Stocks move 5-20% overnight.',
      diagram: 'Material Event Occurs\n(CEO quits, cyber attack)\n    ↓\n8-K Filed within 4 days\n    ↓\nWe detect within minutes\n    ↓\nAlert sent before market opens\n    ↓\nUser positions ahead of move',
      tooltips: ['going-concern'], coming: true },
    { icon: '◈', title: '13D Activist Tracker', text: 'When someone buys >5% of a company, they must file 13D. Stock typically rises 10-30% after activist demands.',
      diagram: 'Activist buys 5%+ shares\n    ↓\nFiles 13D (within 10 days)\n    ↓\nReveals demands:\n  - Spin off division\n  - Replace CEO\n  - Return cash to shareholders\n    ↓\nStock rises 10-30%',
      tooltips: ['potential-earnings'], coming: true },
    { icon: '◇', title: 'Options Flow', text: 'Track unusual options activity. Unusual calls = good news coming. Unusual puts = bad news. 62% directional accuracy.',
      tooltips: ['chance-of-fail'], coming: true },
  ],

  monetizeCards: [
    { tier: 'FREE', name: 'Starter', price: '$0', period: 'forever', cta: 'Get Started',
      features: ['Weekly SEC comment digest', 'Basic patent cliff alerts', 'Insider trade summary', 'Community access'] },
    { tier: 'PRO', name: 'Trader', price: '$29', period: '/mo', cta: 'Start 7-Day Trial', featured: true,
      features: ['All FREE features', 'Real-time SEC alerts (3hr)', 'Full patent cliff database (50+ drugs)', 'Insider dashboard', 'Email alerts', 'Priority support'] },
    { tier: 'DEGEN', name: 'Degen', price: '$99', period: '/mo', cta: 'Coming Soon',
      features: ['All PRO features', 'Unusual options flow alerts', 'CFTC COT report analysis', 'Custom ticker watchlists', 'API access (1000 req/day)', '1-on-1 strategy calls'] },
    { tier: 'FUND', name: 'Fund', price: 'Custom', period: '', cta: 'Contact Us',
      features: ['All DEGEN features', 'White-label dashboard', 'Custom data pipelines', 'Slack/Teams integration', 'Priority support', 'Custom reports'] },
  ],

  updateRunningTotalDisplay() {
    const el = document.getElementById('runningTotalDisplay');
    if (el) el.textContent = this.runningTotal.toLocaleString();
  },

  async initPage() {
    this.init();
    this.bindEvents();
    await this.loadSignals();
    this.renderLearnPage();
    this.renderEndeavorsPage();
    this.renderMonetizePage();
    setInterval(() => this.loadSignals(), 5 * 60 * 1000);
  },

  bindEvents() {
    document.getElementById('themeBtn')?.addEventListener('click', () => this.toggle());
    document.querySelectorAll('[data-page]').forEach(el => {
      el.addEventListener('click', (e) => { e.preventDefault(); this.show(el.dataset.page); });
    });
    document.addEventListener('click', (e) => {
      const trig = e.target.closest('.tooltip-trigger');
      if (trig) { e.preventDefault(); e.stopPropagation(); this.showTooltip(trig, trig.dataset.key); return; }
      if (!e.target.closest('#tooltipPopup')) this.hideTooltip();
    });
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.applyFilter(btn.dataset.filter);
      });
    });
  },

  applyFilter(filter) {
    document.querySelectorAll('.signal-card').forEach(card => {
      if (filter === 'all') card.style.display = '';
      else if (filter === 'high') card.style.display = card.classList.contains('high') ? '' : 'none';
      else if (filter === 'medium') card.style.display = card.classList.contains('medium') ? '' : 'none';
      else if (filter === 'easy') card.style.display = !card.classList.contains('high') ? '' : 'none';
    });
  },

  async loadSignals() {
    try {
      const results = await Promise.allSettled([
        fetch('./data/sec_comments.json'),
        fetch('./data/patent_expiry.json'),
        fetch('./data/insider.json'),
      ]);
      const sec = results[0].status === 'fulfilled' ? await results[0].value.json() : { filings: [] };
      const pat = results[1].status === 'fulfilled' ? await results[1].value.json() : { critical: [], watch: [] };
      const ins = results[2].status === 'fulfilled' ? await results[2].value.json() : { filings: [] };
      const total = (sec.filings?.length||0) + (pat.critical?.length||0) + (pat.watch?.length||0) + (ins.filings?.length||0);

      // Update running total (persistent, only goes up)
      this.runningTotal += total;
      localStorage.setItem('runningTotal', this.runningTotal.toString());
      this.updateRunningTotalDisplay();

      this.animateValue('totalSignals', total);
      this.animateValue('secCount', sec.filings?.length || 0);
      this.animateValue('patentCount', (pat.critical?.length||0) + (pat.watch?.length||0));
      this.animateValue('insiderCount', ins.filings?.length || 0);
      this.animateValue('hudSignals', total);

      const secEl = document.getElementById('secCatCount'); if (secEl) secEl.textContent = sec.filings?.length || 0;
      const patEl = document.getElementById('patCatCount'); if (patEl) patEl.textContent = (pat.critical?.length||0) + (pat.watch?.length||0);
      const insEl = document.getElementById('insCatCount'); if (insEl) insEl.textContent = ins.filings?.length || 0;

      // Full timestamp with date
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      const lastUpdate = document.getElementById('lastUpdate');
      if (lastUpdate) lastUpdate.textContent = `Last scan: ${dateStr} at ${timeStr}`;

      const all = [
        ...(sec.filings||[]).map(s => ({...s, _type:'sec_comments'})),
        ...(pat.critical||[]).map(s => ({...s, _type:'patents', company:s.drug, subject:`${s.brand}`, materiality:{level:'HIGH',score:10}, urgency:s.urgency, date:s.expiry_window})),
        ...(pat.watch||[]).map(s => ({...s, _type:'patents', company:s.drug, subject:`${s.brand}`, materiality:{level:'MEDIUM',score:6}, urgency:s.urgency, date:s.expiry_window})),
        ...(ins.filings||[]).map(s => ({
          ...s,
          _type: 'insider',
          materiality: s.materiality || (s.signal ? { level: s.signal.level, score: s.signal.score, keywords: s.signal.signals } : undefined)
        })),
      ];
      all.sort((a, b) => (b.materiality?.score||0) - (a.materiality?.score||0));
      const grid = document.getElementById('signalsGrid');
      if (!all.length) {
        grid.innerHTML = '<div class="loading-state" style="padding:3rem;"><span>No active signals. Monitors scan every 3 hours.</span></div>';
      } else {
        grid.innerHTML = all.map(s => this.renderSignalCard(s, s._type)).join('');
        this.initScrollReveal();
      }
      this.renderSignalsGrid('secGrid', sec.filings||[], 'sec_comments');
      this.renderSignalsGrid('patentGrid', [...(pat.critical||[]),...(pat.watch||[])].map(s => ({...s, _type:'patents', company:s.drug, subject:`${s.brand}`, materiality:{level:s.urgency?.includes('NOW')?'HIGH':'MEDIUM',score:s.urgency?.includes('NOW')?10:6}, urgency:s.urgency, date:s.expiry_window})), 'patents');
      this.renderSignalsGrid('insiderGrid', ins.filings||[], 'insider');
    } catch (e) { console.error('Error loading signals:', e); }
  },

  renderSignalsGrid(gridId, items, type) {
    const el = document.getElementById(gridId);
    if (!el) return;
    if (!items.length) {
      el.innerHTML = `<div style="color:var(--text-muted);padding:1rem 0;font-size:0.85rem;">No ${type} signals yet.</div>`;
    } else {
      const mapped = items.map(s => {
        if (type === 'insider' && s.signal && !s.materiality) {
          return {...s, materiality: { level: s.signal.level, score: s.signal.score, keywords: s.signal.signals }};
        }
        return s;
      });
      el.innerHTML = mapped.map(s => this.renderSignalCard(s, type)).join('');
      this.initScrollReveal();
    }
  },

  animateValue(id, target) {
    const el = document.getElementById(id);
    if (!el || isNaN(target)) return;
    const start = parseInt((el.textContent || '0').replace(/,/g,'')) || 0;
    const dur = 800;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / dur, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * eased);
      el.textContent = current.toLocaleString();
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  },

  renderLearnPage() {
    const el = document.getElementById('learnGrid');
    if (el) { el.innerHTML = this.learnCards.map(c => this.renderLearnCard(c)).join(''); this.initScrollReveal(); }
  },
  renderEndeavorsPage() {
    const el = document.getElementById('endeavorsGrid');
    if (el) { el.innerHTML = this.endeavorCards.map((c,i) => this.renderEndeavorCard(c,i)).join(''); this.initScrollReveal(); }
  },
  renderMonetizePage() {
    const el = document.getElementById('monetizeGrid');
    if (!el) return;
    el.innerHTML = this.monetizeCards.map(c => `
      <div class="price-card ${c.featured ? 'featured' : ''} reveal-up" data-cursor="hover">
        <div class="price-tier">${c.tier}</div>
        <div class="price-name">${c.name}</div>
        <div class="price-amount">${c.price}<span>${c.period}</span></div>
        <ul class="price-features">${c.features.map(f => `<li>${f}</li>`).join('')}</ul>
        <button class="btn ${c.featured ? 'btn-primary btn-glow' : 'btn-ghost'}" style="width:100%;justify-content:center;" data-cursor="hover">${c.cta}</button>
      </div>`).join('');
    this.initScrollReveal();
  },
};

document.addEventListener('DOMContentLoaded', () => T.initPage());
// ═══════════════════════════════════════════════════════════════════════
// Deep Pages — Full explanation articles
// ═══════════════════════════════════════════════════════════════════════

const DeepPages = {
  init() {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    const span = document.querySelector('#themeBtn span');
    if (span) span.textContent = saved === 'dark' ? '◐' : '◑';
    document.getElementById('themeBtn')?.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme');
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      document.querySelector('#themeBtn span').textContent = next === 'dark' ? '◐' : '◑';
    });
    this.render();
  },

  render() {
    const slug = window.location.hash.replace('#', '') || 'sec-comments';
    fetch('./js/learn-pages.json')
      .then(r => r.json())
      .then(data => {
        const page = data[slug];
        if (!page) {
          document.getElementById('deepContent').innerHTML = '<h1>Page not found</h1><a href="#sec-comments" class="back-link">← Back to SEC Comments</a>';
          return;
        }
        document.title = page.title + ' — SEC Explorer';
        let html = `<a href="../index.html#learn" class="back-link">← Back to Learn</a>`;
        html += `<h1>${page.title}</h1>`;
        html += `<p class="subtitle">${page.subtitle}</p>`;
        page.sections.forEach((s, i) => {
          html += `<div class="deep-section reveal-up" data-delay="${i * 50}">`;
          html += `<span class="exhibit-label">Exhibit ${String.fromCharCode(65 + i)}</span>`;
          html += `<h2>${s.heading}</h2>`;
          // Process body: handle **bold**, *italic*, ```code blocks```
          let body = s.body;
          // Code blocks
          body = body.replace(/```([\s\S]*?)```/g, '<pre>$1</pre>');
          // Bold
          body = body.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
          // Italic
          body = body.replace(/\*(.+?)\*/g, '<em>$1</em>');
          // Paragraphs (double newline)
          body.split(/\n\n+/).forEach(p => {
            p = p.trim();
            if (!p) return;
            if (p.startsWith('<pre>')) { html += p; return; }
            if (p.startsWith('- ')) {
              const items = p.split('\n').filter(l => l.trim());
              html += '<ul>' + items.map(item => '<li>' + item.replace(/^- /, '') + '</li>').join('') + '</ul>';
              return;
            }
            html += `<p>${p}</p>`;
          });
          html += `</div>`;
        });
        // Navigation footer
        const keys = Object.keys(data);
        const idx = keys.indexOf(slug);
        const prev = keys[idx - 1];
        const next = keys[idx + 1];
        html += '<div class="nav-footer">';
        html += prev ? `<a href="#${prev}">← ${data[prev].title.split('—')[0].trim()}</a>` : '<span></span>';
        html += next ? `<a href="#${next}">${data[next].title.split('—')[0].trim()} →</a>` : '<span></span>';
        html += '</div>';
        document.getElementById('deepContent').innerHTML = html;
        // Re-init scroll reveal
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const delay = parseInt(entry.target.dataset.delay || '0');
              setTimeout(() => entry.target.classList.add('visible'), delay);
              observer.unobserve(entry.target);
            }
          });
        }, { threshold: 0.1 });
        document.querySelectorAll('.reveal-up').forEach(el => observer.observe(el));
      });
  }
};

document.addEventListener('DOMContentLoaded', () => DeepPages.init());
window.addEventListener('hashchange', () => DeepPages.render());

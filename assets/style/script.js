/* =========================================================
   PORTFOLIO — SCRIPT.JS (SLIDER PINTEREST BOARD + INFINITE)
   ========================================================= */

class TileTransition {
  constructor(container, cols = 10, rows = 6) {
    this.container = container;
    this.cols = cols;
    this.rows = rows;
    this.tiles = [];

    this._buildTiles();
  }

  _buildTiles() {
    const total = this.cols * this.rows;
    for (let i = 0; i < total; i++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      this.container.appendChild(tile);
      this.tiles.push(tile);
    }
  }

  cover(fromRight) {
    const stepDelay = 16;
    this.tiles.forEach((tile, idx) => {
      const col = idx % this.cols;
      tile.style.transition = 'none';
      tile.style.transform = 'scaleX(0)';
      tile.style.transformOrigin = fromRight ? 'right' : 'left';
      void tile.offsetWidth;

      const delay = (fromRight ? this.cols - 1 - col : col) * stepDelay;
      tile.style.transition = `transform .26s ease ${delay}ms`;
      tile.style.transform = 'scaleX(1)';
    });
    return this.cols * stepDelay + 300;
  }

  reveal(fromRight) {
    const stepDelay = 16;
    this.tiles.forEach((tile, idx) => {
      const col = idx % this.cols;
      const delay = (fromRight ? this.cols - 1 - col : col) * stepDelay;
      tile.style.transition = `transform .26s ease ${delay + 70}ms`;
      tile.style.transformOrigin = fromRight ? 'left' : 'right';
      tile.style.transform = 'scaleX(0)';
    });
  }
}


class PortfolioApp {
  constructor({ order, startPage }) {
    this.order = order;
    this.current = startPage;

    this.navButtons = document.querySelectorAll('.navbtn');
    this.pages = document.querySelectorAll('.page');
    this.tilesContainer = document.getElementById('tiles');

    this.transition = new TileTransition(this.tilesContainer, 10, 6);

    this._bindNav();
  }

  _bindNav() {
    this.navButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.page === 'prev') {
          const index = this.order.indexOf(this.current);
          const prevPage = this.order[(index - 1 + this.order.length) % this.order.length];
          this.goTo(prevPage);
        } else if (btn.dataset.page === 'next') {
          const index = this.order.indexOf(this.current);
          const nextPage = this.order[(index + 1) % this.order.length];
          this.goTo(nextPage);
        } else {
          this.goTo(btn.dataset.page);
        }
      });
    });
  }

  _setActiveNav(target) {
    const index = this.order.indexOf(target);
    this.navButtons.forEach((btn) => {
      if (btn.dataset.page === 'prev') {
        btn.classList.toggle('is-hidden', index <= 0);
      } else if (btn.dataset.page === 'next') {
        btn.classList.toggle('is-hidden', index >= this.order.length - 1);
      }
    });
  }

  _setActivePage(target) {
    this.pages.forEach((page) => page.classList.remove('active'));
    const nextPage = document.querySelector(`.page[data-page="${target}"]`);
    if (nextPage) nextPage.classList.add('active');
    window.dispatchEvent(new Event('resize'));
  }

  goTo(target) {
    if (target === this.current || !this.order.includes(target)) return;

    const fromRight = this.order.indexOf(target) > this.order.indexOf(this.current);
    const coverDuration = this.transition.cover(fromRight);

    setTimeout(() => {
      this._setActivePage(target);
      this._setActiveNav(target);
      this.current = target;
      this.transition.reveal(fromRight);
    }, coverDuration);
  }
}


class GithubProjects {
  constructor(username, container, { limit = 8, hideForks = true } = {}) {
    this.username = username;
    this.container = container;
    this.limit = limit;
    this.hideForks = hideForks;
    this._sliderTimer = null;
    this._isTransitioning = false;
    this.pinterestImages = [];
  }

  async load() {
    this._renderStatus('Menarik data repo & gambar Pinterest…');
    
    // 📌 LINK PAPAN PINTEREST KAMU SUDAH DIPASANG DI SINI:
    const PINTEREST_BOARD_URL = 'https://id.pinterest.com/bakwananget350/pp-anime-cewek/';

    try {
      // 1. Fetch data repo dari GitHub
      const githubUrl = `https://api.github.com/users/${this.username}/repos?sort=pushed&direction=desc&per_page=100`;
      const res = await fetch(githubUrl);
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

      let repos = await res.json();
      if (this.hideForks) repos = repos.filter((r) => !r.fork);
      repos = repos.slice(0, this.limit);

      if (repos.length === 0) {
        this._renderStatus('Belum ada repo publik.');
        return;
      }

      // 2. Fetch foto dari papan Pinterest
      await this._fetchPinterestImages(PINTEREST_BOARD_URL);

      // 3. Render slider
      this._render(repos);

    } catch (err) {
      this._renderStatus('Gagal ambil data, coba refresh lagi ya.', true);
      console.error('[GithubProjects] Fetch error:', err);
    }
  }

  async _fetchPinterestImages(boardUrl) {
    try {
      // Ubah URL papan ke format RSS Feed Pinterest
      const cleanBoardUrl = boardUrl.split('?')[0].replace(/\/$/, '');
      const rssUrl = `${cleanBoardUrl}.rss`;
      const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

      const res = await fetch(apiUrl);
      const data = await res.json();

      if (data.status === 'ok' && data.items && data.items.length > 0) {
        this.pinterestImages = data.items.map(item => {
          const match = item.description.match(/src="(https:\/\/i\.pinimg\.com\/[^"]+)"/);
          if (match && match[1]) {
            // Ambil gambar kualitas baik (564x)
            return match[1].replace(/\/\d+x\//, '/564x/');
          }
          return null;
        }).filter(Boolean);
      }
    } catch (err) {
      console.warn('Gambar Pinterest tidak dapat dimuat, menggunakan gambar default GitHub.', err);
    }
  }

  _render(repos) {
    this.container.innerHTML = '';

    const track = document.createElement('div');
    track.className = 'puzzle-track animated';
    
    repos.forEach((repo, index) => track.appendChild(this._buildCard(repo, index)));
    this.container.appendChild(track);

    this._setupInfiniteSlider();
  }

  _setupInfiniteSlider() {
    const track = this.container.querySelector('.puzzle-track');
    if (!track) return;

    const cards = Array.from(track.children);
    if (cards.length < 2) return;

    // Duplikasi elemen untuk efek memutar/infinite carousel
    cards.forEach(card => {
      const cloneEnd = card.cloneNode(true);
      const cloneStart = card.cloneNode(true);
      track.appendChild(cloneEnd);
      track.insertBefore(cloneStart, track.firstChild);
    });

    this.allCards = Array.from(track.children);
    this.realCount = cards.length;
    this.currentIndex = this.realCount;

    this._updatePosition(false);
    this._startAutoplay();

    window.addEventListener('resize', () => this._updatePosition(false));
  }

  _move(direction) {
    if (this._isTransitioning) return;
    this._isTransitioning = true;

    this.currentIndex += direction;
    this._updatePosition(true);

    setTimeout(() => {
      if (this.currentIndex >= this.realCount * 2) {
        this.currentIndex = this.realCount;
        this._updatePosition(false);
      } else if (this.currentIndex < this.realCount) {
        this.currentIndex = this.realCount * 2 - 1;
        this._updatePosition(false);
      }
      this._isTransitioning = false;
    }, 500);
  }

  _updatePosition(animated = true) {
    const track = this.container.querySelector('.puzzle-track');
    if (!track || !this.allCards) return;

    if (animated) {
      track.classList.add('animated');
    } else {
      track.classList.remove('animated');
    }

    const cardWidth = 170;
    const gap = 14;
    const step = cardWidth + gap;
    const containerWidth = this.container.getBoundingClientRect().width;

    const offset = (containerWidth / 2) - (cardWidth / 2) - (this.currentIndex * step);
    track.style.transform = `translateX(${offset}px)`;

    this.allCards.forEach((card, idx) => {
      card.classList.toggle('active', idx === this.currentIndex);
    });
  }

  _startAutoplay() {
    if (this._sliderTimer) clearInterval(this._sliderTimer);
    this._sliderTimer = setInterval(() => this._move(1), 3500);
  }

  _buildCard(repo, index) {
    const card = document.createElement('a');
    card.className = 'puzzle-card';
    card.href = repo.html_url;
    card.target = '_blank';
    card.rel = 'noopener';

    // Ambil gambar dari hasil parsing Papan Pinterest "pp-anime-cewek"
    let imageUrl = '';
    if (this.pinterestImages.length > 0) {
      const imgIdx = index % this.pinterestImages.length;
      imageUrl = this.pinterestImages[imgIdx];
    } else {
      imageUrl = `https://opengraph.githubassets.com/1/${repo.full_name}`;
    }

    card.style.backgroundImage = `url('${imageUrl}')`;

    const tag = repo.language || 'repo';
    const desc = repo.description || 'Belum ada deskripsi di repo ini.';

    card.innerHTML = `
      <div class="puzzle-content">
        <span class="tag">${this._escape(tag)}</span>
        <h4>${this._escape(repo.name)}</h4>
        <p>${this._escape(desc)}</p>
      </div>
    `;
    return card;
  }

  _renderStatus(message, isError = false) {
    this.container.innerHTML = `<p class="puzzle-status${isError ? ' is-error' : ''}">${this._escape(message)}</p>`;
  }

  _escape(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}


// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', () => {
  const app = new PortfolioApp({
    order: ['home', 'about', 'portfolio', 'contact'],
    startPage: 'home',
  });

  window.goTo = (target) => app.goTo(target);

  const GITHUB_USERNAME = 'pradanadimas534';
  const projectsContainer = document.getElementById('githubProjects');
  if (projectsContainer) {
    const projectsApp = new GithubProjects(GITHUB_USERNAME, projectsContainer, { limit: 8 });

    document.querySelectorAll('.puzzle-arrow').forEach((btn) => {
      btn.addEventListener('click', () => {
        const direction = Number(btn.dataset.direction || 1);
        projectsApp._move(direction);
      });
    });

    projectsApp.load();
  }
});
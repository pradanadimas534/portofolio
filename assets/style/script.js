/* =========================================================
   PORTFOLIO — SCRIPT.JS
   Disusun pakai class (OOP) biar tiap bagian logic terpisah
   dan gampang di-edit tanpa ganggu bagian lain:

   - TileTransition  → cuma ngurus animasi ubin grid
   - PortfolioApp    → ngurus navigasi antar halaman & state
   ========================================================= */

class TileTransition {
  /**
   * @param {HTMLElement} container - elemen tempat ubin-ubin dibuat (mis. #tiles)
   * @param {number} cols - jumlah kolom grid ubin
   * @param {number} rows - jumlah baris grid ubin
   */
  constructor(container, cols = 10, rows = 6) {
    this.container = container;
    this.cols = cols;
    this.rows = rows;
    this.tiles = [];

    this._buildTiles();
  }

  // bikin elemen-elemen ubin sekali di awal, disimpan di this.tiles
  _buildTiles() {
    const total = this.cols * this.rows;
    for (let i = 0; i < total; i++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      this.container.appendChild(tile);
      this.tiles.push(tile);
    }
  }

  /**
   * Mainkan animasi ubin "menutup" layar dari satu sisi.
   * @param {boolean} fromRight - true = nyapu dari kanan, false = dari kiri
   * @returns {number} durasi total fase menutup (ms), buat di-setTimeout pemanggil
   */
  cover(fromRight) {
    const stepDelay = 16;
    this.tiles.forEach((tile, idx) => {
      const col = idx % this.cols;
      tile.style.transition = 'none';
      tile.style.transform = 'scaleX(0)';
      tile.style.transformOrigin = fromRight ? 'right' : 'left';
      // force reflow supaya transition 'none' di atas kepakai duluan
      void tile.offsetWidth;

      const delay = (fromRight ? this.cols - 1 - col : col) * stepDelay;
      tile.style.transition = `transform .26s ease ${delay}ms`;
      tile.style.transform = 'scaleX(1)';
    });
    return this.cols * stepDelay + 300;
  }

  /**
   * Mainkan animasi ubin "membuka" ke sisi lain, nampilin konten baru.
   * @param {boolean} fromRight - arah yang sama dengan cover() sebelumnya
   */
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
  /**
   * @param {object} options
   * @param {string[]} options.order - urutan nama halaman, dipakai buat nentuin arah animasi
   * @param {string} options.startPage - halaman yang aktif pertama kali dibuka
   */
  constructor({ order, startPage }) {
    this.order = order;
    this.current = startPage;

    this.navButtons = document.querySelectorAll('.navbtn');
    this.pages = document.querySelectorAll('.page');
    this.tilesContainer = document.getElementById('tiles');

    this.transition = new TileTransition(this.tilesContainer, 10, 6);

    this._bindNav();
  }

  // pasang event click ke semua tombol nav
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

  // update tombol nav mana yang kelihatan "active"
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

  // ganti section .page mana yang ditampilkan
  _setActivePage(target) {
    this.pages.forEach((page) => page.classList.remove('active'));
    const nextPage = document.querySelector(`.page[data-page="${target}"]`);
    if (nextPage) nextPage.classList.add('active');
    window.dispatchEvent(new Event('resize'));
  }

  /**
   * Pindah ke halaman tertentu dengan animasi ubin.
   * @param {string} target - nama halaman tujuan, harus ada di this.order
   */
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
  }

  async load() {
    this._renderStatus('Menarik data repo dari GitHub…');
    try {
      const url = `https://api.github.com/users/${this.username}/repos?sort=pushed&direction=desc&per_page=100`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

      let repos = await res.json();
      if (this.hideForks) repos = repos.filter((r) => !r.fork);
      repos = repos.slice(0, this.limit);

      if (repos.length === 0) {
        this._renderStatus('Belum ada repo publik.');
        return;
      }

      this._render(repos);
    } catch (err) {
      this._renderStatus('Gagal ambil data GitHub, coba refresh lagi ya.', true);
      console.error('[GithubProjects] fetch gagal:', err);
    }
  }

  _render(repos) {
    this.container.innerHTML = '';

    const track = document.createElement('div');
    track.className = 'puzzle-track animated';
    
    // Render elemen kartu awal
    repos.forEach((repo) => track.appendChild(this._buildCard(repo)));
    this.container.appendChild(track);

    this._setupInfiniteSlider();
  }

  _setupInfiniteSlider() {
    const track = this.container.querySelector('.puzzle-track');
    if (!track) return;

    // Supaya slider memutar terus tanpa henti, kita salin elemen ke depan & belakang (cloning)
    const cards = Array.from(track.children);
    if (cards.length < 2) return;

    cards.forEach(card => {
      const cloneEnd = card.cloneNode(true);
      const cloneStart = card.cloneNode(true);
      track.appendChild(cloneEnd);
      track.insertBefore(cloneStart, track.firstChild);
    });

    this.allCards = Array.from(track.children);
    this.realCount = cards.length;
    this.currentIndex = this.realCount; // Mulai dari set asli pertama

    this._updatePosition(false);
    this._startAutoplay();

    window.addEventListener('resize', () => this._updatePosition(false));
  }

  _move(direction) {
    if (this._isTransitioning) return;
    this._isTransitioning = true;

    this.currentIndex += direction;
    this._updatePosition(true);

    // Ketika selesai transisi, periksa apakah perlu melompat secara diam-diam (infinite loop)
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

    const cardWidth = 170; // Sesuai flex-basis di CSS
    const gap = 14;        // Sesuai gap di CSS
    const step = cardWidth + gap;
    const containerWidth = this.container.getBoundingClientRect().width;

    // Offset agar kartu aktif selalu tepat berada di tengah
    const offset = (containerWidth / 2) - (cardWidth / 2) - (this.currentIndex * step);
    track.style.transform = `translateX(${offset}px)`;

    // Tandai kartu mana yang aktif di tengah
    this.allCards.forEach((card, idx) => {
      card.classList.toggle('active', idx === this.currentIndex);
    });
  }

  _startAutoplay() {
    if (this._sliderTimer) clearInterval(this._sliderTimer);
    this._sliderTimer = setInterval(() => this._move(1), 3500);
  }

  _buildCard(repo) {
    const card = document.createElement('a');
    card.className = 'puzzle-card';
    card.href = repo.html_url;
    card.target = '_blank';
    card.rel = 'noopener';
    card.style.backgroundImage = `url('https://opengraph.githubassets.com/1/${repo.full_name}')`;

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

  // biar tombol onclick="goTo('...')" langsung di HTML tetap jalan
  window.goTo = (target) => app.goTo(target);

  // ganti 'dimaspradana' kalau username GitHub kamu beda
  const GITHUB_USERNAME = 'pradanadimas534';
  const projectsContainer = document.getElementById('githubProjects');
  if (projectsContainer) {
    const projectsApp = new GithubProjects(GITHUB_USERNAME, projectsContainer, { limit: 6 });

    document.querySelectorAll('.puzzle-arrow').forEach((btn) => {
      btn.addEventListener('click', () => {
        const direction = Number(btn.dataset.direction || 1);
        projectsApp._move(direction);
      });
    });

    projectsApp.load();
  }
});
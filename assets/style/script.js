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
  /**
   * Ambil repo publik dari GitHub dan render jadi kartu puzzle.
   * @param {string} username - username GitHub
   * @param {HTMLElement} container - elemen tempat kartu-kartu dimasukkan
   * @param {object} options
   * @param {number} options.limit - berapa repo yang mau ditampilkan (default 6)
   * @param {boolean} options.hideForks - true = repo hasil fork disembunyikan
   */
  constructor(username, container, { limit = 6, hideForks = true } = {}) {
    this.username = username;
    this.container = container;
    this.limit = limit;
    this.hideForks = hideForks;
    this.activeIndex = 0;
    this._sliderTimer = null;
    this._resizeHandler = null;
  }

  // dipanggil sekali buat mulai proses fetch + render
  async load() {
    this._renderStatus('Menarik data repo dari GitHub…');
    try {
      // sort=pushed → urutan dari yang paling baru di-push (paling sering diotak-atik)
      const url = `https://api.github.com/users/${this.username}/repos?sort=pushed&direction=desc&per_page=100`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

      let repos = await res.json();
      if (this.hideForks) repos = repos.filter((r) => !r.fork);
      repos = repos.slice(0, this.limit);

      // Acak setiap hari
      const seed = new Date().getDate();

      repos.sort(() => Math.sin(seed + Math.random()) - 0.5);

      // Urutkan dari repo yang paling aktif dulu (pushed terbaru)
      repos.sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));

      // Tentukan ukuran kartu acak per reload, tapi tetap jaga repo paling aktif di posisi besar
      repos.forEach((repo, index) => {
        if (index === 0) {
          repo.cardSize = 'size-large';
        } else {
          const sizes = ['size-medium', 'size-small'];
          repo.cardSize = sizes[Math.floor(Math.random() * sizes.length)];
        }
      });

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

  // render semua kartu ke container
  _render(repos) {
    this.container.innerHTML = '';

    const track = document.createElement('div');
    track.className = 'puzzle-track';
    repos.forEach((repo) => track.appendChild(this._buildCard(repo)));
    this.container.appendChild(track);

    this._startSlider();
  }

  _move(direction) {
    const cards = this.container.querySelectorAll('.puzzle-card');
    if (!cards.length) return;
    this.activeIndex = (this.activeIndex + direction + cards.length) % cards.length;
    this._updateSlider();
  }

  _startSlider() {
    const cards = this.container.querySelectorAll('.puzzle-card');
    if (!cards.length) return;

    if (this._sliderTimer) clearInterval(this._sliderTimer);
    if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);

    this._resizeHandler = () => this._updateSlider();
    window.addEventListener('resize', this._resizeHandler);

    this.activeIndex = 0;
    this._updateSlider();
    this._sliderTimer = window.setInterval(() => this._move(1), 3800);
  }

  _updateSlider() {
    const cards = this.container.querySelectorAll('.puzzle-card');
    const track = this.container.querySelector('.puzzle-track');
    if (!cards.length || !track) return;

    const gap = 16;
    const cardWidth = 220 + gap;
    const containerWidth = this.container.getBoundingClientRect().width;
    const offset = (containerWidth / 2) - (cardWidth / 2) - (this.activeIndex * cardWidth);
    track.style.transform = `translateX(${offset}px)`;

    cards.forEach((card, index) => {
      const diff = (index - this.activeIndex + cards.length) % cards.length;
      const isPrev = diff === cards.length - 1;
      const isNext = diff === 1;
      const isHidden = diff > 1 && diff < cards.length - 1;
      card.classList.toggle('active', index === this.activeIndex);
      card.classList.toggle('is-prev', isPrev);
      card.classList.toggle('is-next', isNext);
      card.classList.toggle('is-hidden', isHidden);
    });
  }

  // bikin satu kartu <a> dari data repo
  _buildCard(repo) {
    const card = document.createElement('a');
    card.className = `puzzle-card ${repo.cardSize}`;
    card.href = repo.html_url;
    card.target = '_blank';
    card.rel = 'noopener';
    // social preview image otomatis dari GitHub, gak perlu upload manual
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

  // tampilan pesan loading/error/kosong
  _renderStatus(message, isError = false) {
    this.container.innerHTML = `<p class="puzzle-status${isError ? ' is-error' : ''}">${this._escape(message)}</p>`;
  }

  // biar teks dari GitHub (nama/deskripsi repo) gak bisa nyuntik HTML
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
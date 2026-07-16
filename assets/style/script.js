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
      btn.addEventListener('click', () => this.goTo(btn.dataset.page));
    });
  }

  // update tombol nav mana yang kelihatan "active"
  _setActiveNav(target) {
    this.navButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.page === target);
    });
  }

  // ganti section .page mana yang ditampilkan
  _setActivePage(target) {
    this.pages.forEach((page) => page.classList.remove('active'));
    const nextPage = document.querySelector(`.page[data-page="${target}"]`);
    if (nextPage) nextPage.classList.add('active');
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

      // Tentukan ukuran kartu
      repos.forEach((repo, index) => {

        if (index === 0) {

          repo.cardSize = "size-large";

        } else if (index <= 2) {

          repo.cardSize = "size-medium";

        } else {

          repo.cardSize = "size-small";

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
    repos.forEach((repo) => this.container.appendChild(this._buildCard(repo)));
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
    new GithubProjects(GITHUB_USERNAME, projectsContainer, { limit: 6 }).load();
  }
});
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


// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', () => {
  const app = new PortfolioApp({
    order: ['home', 'about', 'portfolio', 'contact'],
    startPage: 'home',
  });

  // biar tombol onclick="goTo('...')" langsung di HTML tetap jalan
  window.goTo = (target) => app.goTo(target);
});

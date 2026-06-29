/**
 * Zoom e navegação horizontal do diagrama.
 */
const DiagramViewport = {
  scale: 1,
  minScale: 0.4,
  maxScale: 2,
  step: 0.1,

  init(viewportEl, canvasEl, onScaleChange) {
    this.viewport = viewportEl;
    this.canvas = canvasEl;
    this.labelEl = document.getElementById('zoom-level');
    this.onScaleChange = onScaleChange;

    document.getElementById('zoom-in').addEventListener('click', () => this.zoomIn());
    document.getElementById('zoom-out').addEventListener('click', () => this.zoomOut());
    document.getElementById('zoom-reset').addEventListener('click', () => this.reset());

    this.viewport.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    this.aplicar();
  },

  onWheel(e) {
    e.preventDefault();

    if (e.ctrlKey) {
      const delta = e.deltaY > 0 ? -this.step : this.step;
      this.setScale(this.scale + delta);
      return;
    }

    this.viewport.scrollLeft += e.deltaY + e.deltaX;
  },

  zoomIn() {
    this.setScale(this.scale + this.step);
  },

  zoomOut() {
    this.setScale(this.scale - this.step);
  },

  reset() {
    this.scale = 1;
    this.aplicar();
    this.viewport.scrollLeft = 0;
  },

  setScale(valor) {
    this.scale = Math.min(this.maxScale, Math.max(this.minScale, valor));
    this.aplicar();
  },

  aplicar() {
    this.canvas.style.transform = `scale(${this.scale})`;
    this.canvas.style.transformOrigin = 'top left';
    this.labelEl.textContent = `${Math.round(this.scale * 100)}%`;
    this.agendarRedesenho();
  },

  agendarRedesenho() {
    if (this._redesenhoId) cancelAnimationFrame(this._redesenhoId);
    this._redesenhoId = requestAnimationFrame(() => {
      this._redesenhoId = requestAnimationFrame(() => {
        this._redesenhoId = null;
        if (this.onScaleChange) this.onScaleChange();
      });
    });
  },
};

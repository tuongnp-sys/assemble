import folkStory from '../data/content/folk-story.json';
import { getLang, pickBilingual, subscribeLangChange } from '../core/locale.js';
import { t } from '../core/i18n.js';
import { bindHtmlOverlayToCanvas } from './htmlOverlaySync.js';

const SPEAKER_CLASS = {
  phu_o: 'story-speaker-phu',
  but: 'story-speaker-but',
  farmer: 'story-speaker-farmer',
};

/**
 * @param {typeof folkStory.paragraphs[number]} para
 */
function paragraphToHtml(para) {
  const text = pickBilingual(para.text);
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  switch (para.type) {
    case 'title':
      return `<h2 class="story-title">${escaped}</h2>`;
    case 'magic':
      return `<p class="story-magic">✨ ${escaped}</p>`;
    case 'dialogue': {
      const cls = SPEAKER_CLASS[para.speaker] ?? 'story-dialogue';
      return `<p class="story-dialogue ${cls}">— ${escaped}</p>`;
    }
    default:
      return `<p class="story-narration">${escaped}</p>`;
  }
}

function buildStoryHtml() {
  return folkStory.paragraphs.map(paragraphToHtml).join('\n');
}

/**
 * Overlay cuộn giấy cổ — HTML trên canvas (không dùng Phaser add.dom).
 */
export class StoryScrollOverlay {
  /**
   * @param {import('phaser').Scene} scene
   * @param {{ onClose: () => void }} opts
   */
  constructor(scene, opts) {
    this.scene = scene;
    this.onClose = opts.onClose;
    this._done = false;
    this._inputWasEnabled = scene.input.enabled;
    scene.input.enabled = false;

    this.root = document.createElement('div');
    this.root.className = 'story-overlay';
    this.root.innerHTML = `
      <div class="story-backdrop" aria-hidden="true"></div>
      <div class="story-shell" role="dialog" aria-modal="true" aria-labelledby="story-scroll-title">
        <button type="button" class="story-close"></button>
        <div class="story-parchment"></div>
      </div>
    `;

    document.body.appendChild(this.root);
    this.scrollEl = /** @type {HTMLDivElement} */ (this.root.querySelector('.story-parchment'));
    this.closeBtn = /** @type {HTMLButtonElement} */ (this.root.querySelector('.story-close'));
    this.backdropEl = /** @type {HTMLDivElement} */ (this.root.querySelector('.story-backdrop'));

    this._renderContent();
    this._unbindSync = bindHtmlOverlayToCanvas(scene.game, this.root);
    this._unsub = subscribeLangChange(() => this.refreshLang());

    this.backdropEl.addEventListener('click', () => this.destroy());
    this.closeBtn.addEventListener('click', () => this.destroy());
    this.scrollEl.addEventListener('mousedown', (e) => e.stopPropagation());
    this.scrollEl.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });

    scene.loginScreen?.blur();
  }

  _renderContent() {
    if (!this.scrollEl) return;
    this.scrollEl.lang = getLang();
    this.scrollEl.innerHTML = buildStoryHtml();
    this.closeBtn.textContent = t('story.close');
    const title = this.scrollEl.querySelector('.story-title');
    if (title) title.id = 'story-scroll-title';
  }

  refreshLang() {
    if (!this.scrollEl) return;
    const scrollTop = this.scrollEl.scrollTop;
    this._renderContent();
    this.scrollEl.scrollTop = scrollTop;
  }

  destroy() {
    if (this._done) return;
    this._done = true;
    this._unsub?.();
    this._unbindSync?.();
    if (this.scene?.input) {
      this.scene.input.enabled = this._inputWasEnabled;
    }
    this.root.remove();
    this.onClose?.();
  }
}

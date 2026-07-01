import { setUserPaused } from '../gameSession.js';
import { t, tFmt } from '../core/i18n.js';

/** Trên HUD — không chồng lang/mute mặc định */
const DEPTH = 68;

/**
 * Góc trên: MENU + BỤT (trái), PAUSE (phải). Overlay pause khi dừng.
 */
export class GameChromeView {
  /**
   * @param {import('phaser').Scene} scene
   * @param {object} handlers
   * @param {() => void} handlers.onMenu
   * @param {() => void} handlers.onPauseToggle
   * @param {() => void} [handlers.onButHelp]
   * @param {() => void} [handlers.onMenuConfirmed]
   */
  constructor(scene, handlers) {
    this.scene = scene;
    this.handlers = handlers;
    const w = scene.cameras.main.width;

    this.menuBtn = scene.add
      .text(10, 10, t('common.menu'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#e8f5e9',
        backgroundColor: '#1b3d1bcc',
        padding: { x: 8, y: 5 },
      })
      .setDepth(DEPTH)
      .setInteractive({ useHandCursor: true });

    this.butBtn = scene.add
      .text(10, 40, '✨ GỌI BỤT (0)', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fff9c4',
        backgroundColor: '#4a148ccc',
        padding: { x: 8, y: 5 },
      })
      .setDepth(DEPTH)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });

    /** Trái, dưới Gọi Bụt — không chồng mute HTML góc phải */
    this.pauseBtn = scene.add
      .text(10, 70, '⏸', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#fff9c4',
        backgroundColor: '#1b3d1bcc',
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0, 0)
      .setDepth(DEPTH)
      .setInteractive({ useHandCursor: true });

    this.menuBtn.on('pointerdown', () => handlers.onMenu());
    this.butBtn.on('pointerdown', () => handlers.onButHelp?.());
    this.pauseBtn.on('pointerdown', () => handlers.onPauseToggle());

    this._buildOverlay(w, scene.cameras.main.height);
    this.userPaused = false;
  }

  /**
   * @param {number} w
   * @param {number} h
   */
  _buildOverlay(w, h) {
    this.overlayBg = this.scene.add
      .rectangle(w / 2, h / 2, w, h, 0x000000, 0.55)
      .setDepth(DEPTH + 1)
      .setVisible(false);

    this.overlayTitle = this.scene.add
      .text(w / 2, h * 0.38, t('chrome.pause'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#fff9c4',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH + 2)
      .setVisible(false);

    this.resumeBtn = this._mkOverlayBtn(w / 2, h * 0.5, 200, 46, t('chrome.resume'), () => {
      this.handlers.onPauseToggle();
    });
    this.menuOverlayBtn = this._mkOverlayBtn(w / 2, h * 0.58, 200, 42, t('chrome.to_menu'), () => {
      this.handlers.onMenu();
    });

    this.confirmBg = this.scene.add
      .rectangle(w / 2, h / 2, w, h, 0x000000, 0.7)
      .setDepth(DEPTH + 5)
      .setVisible(false);

    this.confirmText = this.scene.add
      .text(w / 2, h * 0.4, t('chrome.menu_confirm'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#ffccbc',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH + 6)
      .setVisible(false);

    this.confirmYes = this._mkConfirmBtn(w / 2 - 56, h * 0.52, 100, 38, t('chrome.confirm_yes'), () => {
      this._hideConfirm();
      this.handlers.onMenuConfirmed?.();
    });
    this.confirmNo = this._mkConfirmBtn(w / 2 + 56, h * 0.52, 100, 38, t('chrome.confirm_no'), () => {
      this._hideConfirm();
    });
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} bw
   * @param {number} bh
   * @param {string} label
   * @param {() => void} onClick
   */
  _mkOverlayBtn(x, y, bw, bh, label, onClick) {
    const bg = this.scene.add
      .rectangle(x, y, bw, bh, 0x2e7d32, 1)
      .setStrokeStyle(2, 0xa5d6a7)
      .setDepth(DEPTH + 2)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });

    const txt = this.scene.add
      .text(x, y, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH + 3)
      .setVisible(false);

    const go = () => onClick();
    bg.on('pointerdown', go);
    txt.setInteractive({ useHandCursor: true });
    txt.on('pointerdown', go);

    return { bg, txt };
  }

  _mkConfirmBtn(x, y, bw, bh, label, onClick) {
    const fill = label === t('chrome.confirm_yes') ? 0xb71c1c : 0x455a64;
    const stroke = label === t('chrome.confirm_yes') ? 0xef9a9a : 0xb0bec5;
    const bg = this.scene.add
      .rectangle(x, y, bw, bh, fill, 1)
      .setStrokeStyle(2, stroke)
      .setDepth(DEPTH + 6)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });

    const txt = this.scene.add
      .text(x, y, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fff',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH + 7)
      .setVisible(false);

    bg.on('pointerdown', onClick);
    txt.setInteractive({ useHandCursor: true });
    txt.on('pointerdown', onClick);

    return { bg, txt };
  }

  showPauseOverlay() {
    this.userPaused = true;
    setUserPaused(true);
    this.overlayBg.setVisible(true);
    this.overlayTitle.setVisible(true);
    this.resumeBtn.bg.setVisible(true);
    this.resumeBtn.txt.setVisible(true);
    this.menuOverlayBtn.bg.setVisible(true);
    this.menuOverlayBtn.txt.setVisible(true);
    this.pauseBtn.setText('▶');
  }

  hidePauseOverlay() {
    this.userPaused = false;
    setUserPaused(false);
    this.overlayBg.setVisible(false);
    this.overlayTitle.setVisible(false);
    this.resumeBtn.bg.setVisible(false);
    this.resumeBtn.txt.setVisible(false);
    this.menuOverlayBtn.bg.setVisible(false);
    this.menuOverlayBtn.txt.setVisible(false);
    this.pauseBtn.setText('⏸');
    this._hideConfirm();
  }

  showMenuConfirm() {
    this.confirmBg.setVisible(true);
    this.confirmText.setVisible(true);
    this.confirmYes.bg.setVisible(true);
    this.confirmYes.txt.setVisible(true);
    this.confirmNo.bg.setVisible(true);
    this.confirmNo.txt.setVisible(true);
  }

  _hideConfirm() {
    this.confirmBg.setVisible(false);
    this.confirmText.setVisible(false);
    this.confirmYes.bg.setVisible(false);
    this.confirmYes.txt.setVisible(false);
    this.confirmNo.bg.setVisible(false);
    this.confirmNo.txt.setVisible(false);
  }

  isOverlayOpen() {
    return this.userPaused || this.confirmBg.visible;
  }

  setChromeVisible(v) {
    this.menuBtn.setVisible(v);
    this.pauseBtn.setVisible(v);
    if (!v) this.butBtn.setVisible(false);
  }

  /**
   * @param {number} usesLeft
   * @param {boolean} show
   */
  updateButHelp(usesLeft, show) {
    const visible = show && usesLeft > 0;
    this.butBtn.setVisible(visible);
    if (visible) {
      this.butBtn.setText(tFmt('game.but_help', { n: usesLeft }));
      this.butBtn.setAlpha(1);
    }
  }

  refreshLang() {
    this.menuBtn?.setText(t('common.menu'));
    this.overlayTitle?.setText(t('chrome.pause'));
    this.resumeBtn?.txt?.setText(t('chrome.resume'));
    this.menuOverlayBtn?.txt?.setText(t('chrome.to_menu'));
    this.confirmText?.setText(t('chrome.menu_confirm'));
    this.confirmYes?.txt?.setText(t('chrome.confirm_yes'));
    this.confirmNo?.txt?.setText(t('chrome.confirm_no'));
    if (this.butBtn?.visible) {
      const m = this.butBtn.text.match(/\d+/);
      const n = m ? Number(m[0]) : 0;
      if (n > 0) this.butBtn.setText(tFmt('game.but_help', { n }));
    }
  }

  destroy() {
    this.menuBtn.destroy();
    this.butBtn.destroy();
    this.pauseBtn.destroy();
    this.overlayBg.destroy();
    this.overlayTitle.destroy();
    this.resumeBtn.bg.destroy();
    this.resumeBtn.txt.destroy();
    this.menuOverlayBtn.bg.destroy();
    this.menuOverlayBtn.txt.destroy();
    this.confirmBg.destroy();
    this.confirmText.destroy();
    this.confirmYes.bg.destroy();
    this.confirmYes.txt.destroy();
    this.confirmNo.bg.destroy();
    this.confirmNo.txt.destroy();
  }
}

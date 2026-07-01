import Phaser from 'phaser';
import { reconcileAdminSession } from './core/userSession.js';
import { attachDebugApi } from './core/debugFlags.js';
import { BootScene } from './BootScene.js';
import { LoginScene } from './LoginScene.js';
import { MenuScene } from './MenuScene.js';
import { LeaderboardScene } from './LeaderboardScene.js';
import { AdminHubScene } from './AdminHubScene.js';
import { HowToPlayScene } from './HowToPlayScene.js';
import { GameScene } from './GameScene.js';
import { GameOverScene } from './GameOverScene.js';
import { FinaleCinematicScene } from './FinaleCinematicScene.js';
import { platform } from '../platform/index.js';
import { registerGameAccessor, enterSystemPause, exitSystemPause } from './systemPause.js';
import { shouldResumeGameplay } from './gameSession.js';
import { bindScaleRefresh } from './scaleRefit.js';
import { initGlobalChrome, getGlobalChrome } from './ui/GlobalHtmlChrome.js';
import { bgmBus } from './audio/BgmBus.js';

/** @type {Phaser.Game|null} */
let game = null;

/** @type {(() => void)|null} */
let visibilityHandler = null;

const GAME_WIDTH = 375;
const GAME_HEIGHT = 812;

export function getGame() {
  return game;
}

export function initGame() {
  if (game) {
    getGlobalChrome()?.destroy();
    bgmBus.destroy();
    game.destroy(true);
    game = null;
  }

  const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-container',
    backgroundColor: '#1a3d2e',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      autoRound: true,
    },
    scene: [
      BootScene,
      LoginScene,
      MenuScene,
      LeaderboardScene,
      AdminHubScene,
      HowToPlayScene,
      GameScene,
      GameOverScene,
      FinaleCinematicScene,
    ],
    audio: {
      disableWebAudio: false,
    },
    fps: {
      target: 60,
      smoothStep: true,
    },
  };

  game = new Phaser.Game(config);
  bgmBus.bindGame(game);
  registerGameAccessor(() => game);
  bindScaleRefresh(game);
  attachDebugApi(game);
  initGlobalChrome(game);

  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
  }
  visibilityHandler = () => {
    if (document.hidden) {
      enterSystemPause('tab_hidden');
    } else if (shouldResumeGameplay()) {
      exitSystemPause();
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);

  platform.gameLoading(0);
  platform.gameLoading(100);
  platform.gameLoaded();
}

async function bootstrap() {
  await reconcileAdminSession();
  initGame();
}

bootstrap();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler);
      visibilityHandler = null;
    }
    getGlobalChrome()?.destroy();
    bgmBus.destroy();
    game?.destroy(true);
    game = null;
  });

  import.meta.hot.accept(async () => {
    await bootstrap();
  });
}

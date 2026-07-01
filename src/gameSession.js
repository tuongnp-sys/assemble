/** Trạng thái session chia sẻ giữa main và các Scene */
let userPaused = false;
let systemPaused = false;
/** @type {'MENU'|'PLAYING'|'GAMEOVER'} */
let gamePhase = 'MENU';

export function setGamePhase(phase) {
  gamePhase = phase;
}

export function getGamePhase() {
  return gamePhase;
}

export function setUserPaused(v) {
  userPaused = v;
}

export function isUserPaused() {
  return userPaused;
}

export function setSystemPaused(v) {
  systemPaused = v;
}

export function isSystemPaused() {
  return systemPaused;
}

export function shouldResumeGameplay() {
  return gamePhase === 'PLAYING' && !userPaused && !systemPaused;
}

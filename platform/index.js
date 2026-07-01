/**
 * Adapter portal — mock trên local, mở rộng cho GamePix sau.
 */
const params = new URLSearchParams(window.location.search);
export const platformId = params.get('platform') || 'local';

let hasCompletedRun = false;
let adInProgress = false;

export const platform = {
  id: platformId,

  gameLoading(progress) {
    if (platformId !== 'local') console.log('[SDK] gameLoading', progress);
  },

  gameLoaded() {
    if (platformId !== 'local') console.log('[SDK] gameLoaded');
  },

  gameplayStart() {
    if (platformId !== 'local') console.log('[SDK] gameplayStart');
  },

  gameplayStop() {
    if (platformId !== 'local') console.log('[SDK] gameplayStop');
  },

  updateScore(score) {
    const n = Math.max(1, Math.floor(score));
    if (platformId !== 'local') console.log('[SDK] updateScore', n);
    return n;
  },

  updateLevel(level) {
    const n = Math.max(1, Math.floor(level));
    if (platformId !== 'local') console.log('[SDK] updateLevel', n);
    return n;
  },

  ping(event, data = {}) {
    if (platformId !== 'local') console.log('[SDK] ping', event, data);
  },

  getHasCompletedRun() {
    return hasCompletedRun;
  },

  setHasCompletedRun(v) {
    hasCompletedRun = v;
  },

  isAdInProgress() {
    return adInProgress;
  },

  /**
   * @returns {Promise<void>}
   */
  async showInterstitial() {
    if (!hasCompletedRun) return;
    adInProgress = true;
    if (platformId !== 'local') console.log('[SDK] interstitialAd');
    await new Promise((r) => setTimeout(r, 300));
    adInProgress = false;
  },

  /**
   * @returns {Promise<boolean>}
   */
  async showRewardAd() {
    adInProgress = true;
    if (platformId !== 'local') console.log('[SDK] rewardAd');
    await new Promise((r) => setTimeout(r, 300));
    adInProgress = false;
    return true;
  },
};

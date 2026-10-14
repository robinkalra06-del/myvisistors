/**
 * Media Stream Acquisition utilities with robust progressive fallbacks for mobile & Android HALs.
 */

export const isMobileOrAndroid = (): boolean => {
  return typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const acquireMediaStream = async (facingMode: 'user' | 'environment' = 'user'): Promise<MediaStream | null> => {
  // Strategy 1: HD mobile camera with facingMode + audio echo cancellation
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    });
  } catch (e1) {
    console.warn('[MediaUtils] Strategy 1 (HD facingMode + echo audio) failed, trying relaxed constraints:', e1);
  }

  // Strategy 2: Relaxed facingMode + basic audio
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode } },
      audio: true,
    });
  } catch (e2) {
    console.warn('[MediaUtils] Strategy 2 (Relaxed facingMode + basic audio) failed, trying generic video+audio:', e2);
  }

  // Strategy 3: Generic boolean video + audio
  try {
    return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch (e3) {
    console.warn('[MediaUtils] Strategy 3 (Generic boolean) failed, trying sequential Android HAL acquisition:', e3);
  }

  // Strategy 4: Android HAL Sequential Acquisition (Separate Audio then Video)
  // Many Android chipsets timeout when camera and mic drivers are opened in the exact same call
  let aTrack: MediaStreamTrack | null = null;
  let vTrack: MediaStreamTrack | null = null;

  try {
    const aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    aTrack = aStream.getAudioTracks()[0] || null;
  } catch (errA) {
    console.warn('[MediaUtils] Sequential audio failed:', errA);
  }

  try {
    const vStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingMode } } });
    vTrack = vStream.getVideoTracks()[0] || null;
  } catch (errV1) {
    try {
      const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
      vTrack = vStream.getVideoTracks()[0] || null;
    } catch (errV2) {
      console.warn('[MediaUtils] Sequential video failed:', errV2);
    }
  }

  const activeTracks: MediaStreamTrack[] = [];
  if (aTrack) activeTracks.push(aTrack);
  if (vTrack) activeTracks.push(vTrack);

  if (activeTracks.length > 0) {
    return new MediaStream(activeTracks);
  }

  return null;
};

/**
 * Native Android Screen Sharing Bridge & Canvas Stream Utility.
 * Integrates directly with Android MediaProjection API via AndroidScreenShareBridge.
 */

export const isAndroidScreenShareSupported = (): boolean => {
  return typeof window !== 'undefined' && Boolean((window as any).AndroidScreenShare?.isSupported?.());
};

export const isAndroidScreenCapturing = (): boolean => {
  if (!isAndroidScreenShareSupported()) return false;
  try {
    return Boolean((window as any).AndroidScreenShare.isCapturing?.());
  } catch (e) {
    return false;
  }
};

export const requestAndroidMediaPermissions = (): void => {
  if (isAndroidScreenShareSupported()) {
    try {
      (window as any).AndroidScreenShare.requestMediaPermissions?.();
    } catch (e) {
      console.warn('[AndroidScreenShare] Could not request media permissions:', e);
    }
  }
};

export const openAndroidAppSettings = (): void => {
  if (isAndroidScreenShareSupported()) {
    try {
      (window as any).AndroidScreenShare.openAppSettings?.();
    } catch (e) {
      console.warn('[AndroidScreenShare] Could not open app settings:', e);
    }
  }
};

export const hasAndroidMediaPermissions = (): boolean => {
  if (!isAndroidScreenShareSupported()) return true;
  try {
    return Boolean((window as any).AndroidScreenShare.hasMediaPermissions?.());
  } catch (e) {
    return false;
  }
};

export const requestAndroidMediaPermissionsPromise = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!isAndroidScreenShareSupported()) {
      resolve(true);
      return;
    }
    if (hasAndroidMediaPermissions()) {
      resolve(true);
      return;
    }

    const timer = setTimeout(() => {
      resolve(hasAndroidMediaPermissions());
    }, 12000);

    const prevHandler = (window as any).__onAndroidMediaPermissionsUpdated;
    (window as any).__onAndroidMediaPermissionsUpdated = (granted: boolean) => {
      clearTimeout(timer);
      if (prevHandler) prevHandler(granted);
      resolve(granted);
    };

    requestAndroidMediaPermissions();
  });
};

let activeStream: MediaStream | null = null;
let activeCanvas: HTMLCanvasElement | null = null;
let heartbeatInterval: any = null;

export const startAndroidScreenCaptureStream = (): Promise<MediaStream> => {
  return new Promise((resolve, reject) => {
    if (!isAndroidScreenShareSupported()) {
      reject(new Error('Android Screen Share bridge is not available. Please run in the PulseMeet Android APK.'));
      return;
    }

    // Clean up any lingering previous canvas / stream
    stopAndroidScreenCaptureStream();

    // 1. Create or retrieve DOM-attached canvas
    // NOTE: In Chromium / Android WebView, HTMLCanvasElement.captureStream() MUST have opacity > 0
    // and be within viewport bounds, otherwise Blink compositor marks it occluded and stops emitting frames to WebRTC!
    let canvas = document.getElementById('pulsemeet-screen-canvas') as HTMLCanvasElement;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'pulsemeet-screen-canvas';
      canvas.width = 720;
      canvas.height = 1280;
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
      canvas.style.zIndex = '-9999';
      canvas.style.opacity = '0.01'; // Non-zero opacity forces compositor rendering
      canvas.style.pointerEvents = 'none';
      canvas.style.visibility = 'visible';
      document.body.appendChild(canvas);
    }
    activeCanvas = canvas;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    let streamResolved = false;

    // Timeout safety: if user doesn't interact within 60s, timeout
    const timeoutHandle = setTimeout(() => {
      if (!streamResolved) {
        streamResolved = true;
        reject(new Error('Screen capture request timed out.'));
      }
    }, 60000);

    // 2. Set callback for when native screen capture starts
    (window as any).__onAndroidScreenCaptureStarted = (targetWidth: number, targetHeight: number) => {
      console.log(`[AndroidScreenShare] Native screen capture started with resolution: ${targetWidth}x${targetHeight}`);
      clearTimeout(timeoutHandle);

      if (canvas) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        if (ctx) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
        }
      }

      try {
        // Capture stream from canvas at 20fps for smooth WebRTC transmission
        const stream = (canvas as any).captureStream(20) as MediaStream;
        activeStream = stream;

        const track = stream.getVideoTracks()[0];
        if (track) {
          track.enabled = true;
          track.onended = () => {
            console.log('[AndroidScreenShare] Screen track ended');
            stopAndroidScreenCaptureStream();
          };
        }

        if (!streamResolved) {
          streamResolved = true;
          resolve(stream);
        }
      } catch (err: any) {
        console.error('[AndroidScreenShare] canvas.captureStream failed:', err);
        if (!streamResolved) {
          streamResolved = true;
          reject(err);
        }
      }
    };

    // 3. Sequenced image frame renderer: prevents frame pile-up and memory pressure
    let isRendering = false;
    let pendingFrameUrl: string | null = null;
    let lastRenderedTime = Date.now();

    const renderNextFrame = (frameDataUrl: string) => {
      isRendering = true;
      const img = new Image();
      img.onload = () => {
        if (canvas && ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          lastRenderedTime = Date.now();
        }
        isRendering = false;
        if (pendingFrameUrl) {
          const next = pendingFrameUrl;
          pendingFrameUrl = null;
          renderNextFrame(next);
        }
      };
      img.onerror = () => {
        isRendering = false;
      };
      img.src = frameDataUrl;
    };

    // Callback invoked from MainActivity.java ImageReader listener
    (window as any).__onAndroidScreenFrame = (frameDataUrl: string) => {
      if (!canvas || !ctx) return;
      if (isRendering) {
        pendingFrameUrl = frameDataUrl;
        return;
      }
      renderNextFrame(frameDataUrl);
    };

    // Keep WebRTC encoder fed even during static screen displays
    heartbeatInterval = setInterval(() => {
      if (activeCanvas && ctx && Date.now() - lastRenderedTime > 800) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 1, 1);
      }
    }, 800);

    // 4. Set callback for when capture fails / permission denied
    (window as any).__onAndroidScreenCaptureFailed = (reason: string) => {
      clearTimeout(timeoutHandle);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      console.warn('[AndroidScreenShare] Native capture failed:', reason);
      if (!streamResolved) {
        streamResolved = true;
        const error = new Error(reason || 'Screen capture permission was denied');
        error.name = 'NotAllowedError';
        reject(error);
      }
    };

    // 5. Set callback for when capture stops from native side
    (window as any).__onAndroidScreenCaptureStopped = () => {
      console.log('[AndroidScreenShare] Native screen capture stopped');
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      stopAndroidScreenCaptureStream();
    };

    // 6. Launch native Screen Capture intent
    try {
      (window as any).AndroidScreenShare.startScreenCapture();
    } catch (launchErr: any) {
      clearTimeout(timeoutHandle);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (!streamResolved) {
        streamResolved = true;
        reject(launchErr);
      }
    }
  });
};

export const stopAndroidScreenCaptureStream = (): void => {
  try {
    if (isAndroidScreenShareSupported() && isAndroidScreenCapturing()) {
      (window as any).AndroidScreenShare.stopScreenCapture();
    }
  } catch (e) {
    console.warn('[AndroidScreenShare] Error invoking stopScreenCapture:', e);
  }

  if (activeStream) {
    activeStream.getTracks().forEach((track) => track.stop());
    activeStream = null;
  }

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  delete (window as any).__onAndroidScreenCaptureStarted;
  delete (window as any).__onAndroidScreenFrame;
  delete (window as any).__onAndroidScreenCaptureFailed;
  delete (window as any).__onAndroidScreenCaptureStopped;

  if (activeCanvas && activeCanvas.parentNode) {
    activeCanvas.parentNode.removeChild(activeCanvas);
    activeCanvas = null;
  }
};

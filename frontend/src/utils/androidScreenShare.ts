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

let activeStream: MediaStream | null = null;
let activeCanvas: HTMLCanvasElement | null = null;
let animationFrameId: number | null = null;

export const startAndroidScreenCaptureStream = (): Promise<MediaStream> => {
  return new Promise((resolve, reject) => {
    if (!isAndroidScreenShareSupported()) {
      reject(new Error('Android Screen Share bridge is not available. Please run in the PulseMeet Android APK.'));
      return;
    }

    // Clean up any lingering previous canvas / stream
    stopAndroidScreenCaptureStream();

    // 1. Create or retrieve DOM-attached hidden canvas
    // NOTE: In Chromium / Android WebView, HTMLCanvasElement.captureStream() WILL NOT emit frames unless connected to the DOM!
    let canvas = document.getElementById('pulsemeet-screen-canvas') as HTMLCanvasElement;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'pulsemeet-screen-canvas';
      canvas.width = 720;
      canvas.height = 1280;
      canvas.style.position = 'fixed';
      canvas.style.left = '-9999px';
      canvas.style.top = '-9999px';
      canvas.style.width = '1px';
      canvas.style.height = '1px';
      canvas.style.opacity = '0';
      canvas.style.pointerEvents = 'none';
      document.body.appendChild(canvas);
    }
    activeCanvas = canvas;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#090d16';
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
          ctx.fillStyle = '#090d16';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
        }
      }

      try {
        // Capture stream from canvas at 20fps for smooth WebRTC transmission
        const stream = (canvas as any).captureStream(20) as MediaStream;
        activeStream = stream;

        const track = stream.getVideoTracks()[0];
        if (track) {
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

    // 3. Set callback for each incoming screen frame from native ImageReader
    let lastRenderedTime = 0;
    (window as any).__onAndroidScreenFrame = (frameDataUrl: string) => {
      if (!canvas || !ctx) return;

      const img = new Image();
      img.onload = () => {
        if (!canvas || !ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        lastRenderedTime = Date.now();
      };
      img.src = frameDataUrl;
    };

    // Keep canvas alive in Chromium by drawing periodically even on static screen
    const heartbeatInterval = setInterval(() => {
      if (activeCanvas && ctx && Date.now() - lastRenderedTime > 2000) {
        // subtle dirty draw to keep track alive
        const pixel = ctx.getImageData(0, 0, 1, 1);
        ctx.putImageData(pixel, 0, 0);
      }
    }, 1000);

    // 4. Set callback for when capture fails / permission denied
    (window as any).__onAndroidScreenCaptureFailed = (reason: string) => {
      clearTimeout(timeoutHandle);
      clearInterval(heartbeatInterval);
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
      clearInterval(heartbeatInterval);
      stopAndroidScreenCaptureStream();
    };

    // 6. Launch native Screen Capture intent
    try {
      (window as any).AndroidScreenShare.startScreenCapture();
    } catch (launchErr: any) {
      clearTimeout(timeoutHandle);
      clearInterval(heartbeatInterval);
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

  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
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

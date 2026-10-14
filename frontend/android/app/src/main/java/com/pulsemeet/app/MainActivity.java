package com.pulsemeet.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.PixelFormat;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.HandlerThread;
import android.provider.Settings;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQ_CODE = 1001;
    private static final int REQUEST_CODE_SCREEN_CAPTURE = 2001;

    private MediaProjectionManager mediaProjectionManager;
    private MediaProjection mediaProjection;
    private VirtualDisplay virtualDisplay;
    private ImageReader imageReader;
    private HandlerThread backgroundThread;
    private Handler backgroundHandler;
    private volatile boolean isCapturing = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Request Android OS Runtime Permissions on app launch
        requestMediaPermissions();

        // 2. Configure WebView to auto-grant WebRTC media capture (Camera + Mic) and register screen sharing bridge
        configureWebView();
    }

    public void requestMediaPermissions() {
        runOnUiThread(() -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                List<String> permissions = new ArrayList<>();
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                    permissions.add(Manifest.permission.CAMERA);
                }
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                    permissions.add(Manifest.permission.RECORD_AUDIO);
                }
                if (Build.VERSION.SDK_INT >= 33) {
                    if (ContextCompat.checkSelfPermission(this, "android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
                        permissions.add("android.permission.POST_NOTIFICATIONS");
                    }
                }

                if (!permissions.isEmpty()) {
                    ActivityCompat.requestPermissions(this, permissions.toArray(new String[0]), PERMISSION_REQ_CODE);
                }
            }
        });
    }

    public void openAppSettings() {
        runOnUiThread(() -> {
            try {
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + getPackageName()));
                startActivity(intent);
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        try {
            WebView webView = this.bridge != null ? this.bridge.getWebView() : null;
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
                settings.setMediaPlaybackRequiresUserGesture(false);
                settings.setAllowFileAccess(true);
                settings.setAllowContentAccess(true);
                settings.setDatabaseEnabled(true);

                // Add Javascript interface for Android Screen Share
                webView.addJavascriptInterface(new AndroidScreenShareBridge(this), "AndroidScreenShare");

                // Override WebChromeClient to auto-grant WebRTC audio & video capture
                webView.setWebChromeClient(new BridgeWebChromeClient(this.bridge) {
                    @Override
                    public void onPermissionRequest(final PermissionRequest request) {
                        MainActivity.this.runOnUiThread(() -> {
                            try {
                                request.grant(request.getResources());
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        });
                    }
                });
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void startScreenCapture() {
        runOnUiThread(() -> {
            try {
                if (mediaProjectionManager == null) {
                    mediaProjectionManager = (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
                }
                Intent captureIntent = mediaProjectionManager.createScreenCaptureIntent();
                startActivityForResult(captureIntent, REQUEST_CODE_SCREEN_CAPTURE);
            } catch (Exception e) {
                e.printStackTrace();
                sendJsEvent("window.__onAndroidScreenCaptureFailed && window.__onAndroidScreenCaptureFailed('Failed to launch screen capture: " + e.getMessage() + "');");
            }
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQUEST_CODE_SCREEN_CAPTURE) {
            if (resultCode == RESULT_OK && data != null) {
                startCaptureSession(resultCode, data);
            } else {
                sendJsEvent("window.__onAndroidScreenCaptureFailed && window.__onAndroidScreenCaptureFailed('Screen capture permission cancelled by user');");
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    private void startCaptureSession(int resultCode, Intent data) {
        try {
            // 1. Start foreground service (mandatory for MediaProjection on Android 14+)
            Intent serviceIntent = new Intent(this, ScreenCaptureService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(this, serviceIntent);
            } else {
                startService(serviceIntent);
            }

            // 2. Start background thread
            if (backgroundThread == null) {
                backgroundThread = new HandlerThread("ScreenCaptureThread");
                backgroundThread.start();
                backgroundHandler = new Handler(backgroundThread.getLooper());
            }

            // 3. Create MediaProjection
            if (mediaProjectionManager == null) {
                mediaProjectionManager = (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
            }
            mediaProjection = mediaProjectionManager.getMediaProjection(resultCode, data);
            if (mediaProjection == null) {
                sendJsEvent("window.__onAndroidScreenCaptureFailed && window.__onAndroidScreenCaptureFailed('Could not acquire MediaProjection');");
                return;
            }

            mediaProjection.registerCallback(new MediaProjection.Callback() {
                @Override
                public void onStop() {
                    super.onStop();
                    stopScreenCapture();
                }
            }, backgroundHandler);

            // 4. Calculate dimensions
            DisplayMetrics metrics = getResources().getDisplayMetrics();
            int screenWidth = metrics.widthPixels;
            int screenHeight = metrics.heightPixels;
            int densityDpi = metrics.densityDpi;

            int targetWidth = 720;
            int targetHeight = (int) Math.round(((double) screenHeight * targetWidth) / (double) screenWidth);
            if (targetWidth % 2 != 0) targetWidth++;
            if (targetHeight % 2 != 0) targetHeight++;

            final int finalWidth = targetWidth;
            final int finalHeight = targetHeight;

            // 5. Setup ImageReader
            imageReader = ImageReader.newInstance(finalWidth, finalHeight, PixelFormat.RGBA_8888, 2);

            // 6. Setup VirtualDisplay
            virtualDisplay = mediaProjection.createVirtualDisplay(
                "PulseMeetScreenCapture",
                finalWidth, finalHeight, densityDpi,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                imageReader.getSurface(),
                null, backgroundHandler
            );

            isCapturing = true;

            // Notify JS that capture has started
            sendJsEvent("window.__onAndroidScreenCaptureStarted && window.__onAndroidScreenCaptureStarted(" + finalWidth + "," + finalHeight + ");");

            // 7. Rate-limit frames to ~18 fps (min 55ms between frames)
            final long minFrameIntervalMs = 55;
            final AtomicLong lastFrameTimestamp = new AtomicLong(0);

            imageReader.setOnImageAvailableListener(reader -> {
                Image image = null;
                try {
                    image = reader.acquireLatestImage();
                    if (image == null || !isCapturing) {
                        if (image != null) image.close();
                        return;
                    }

                    long now = System.currentTimeMillis();
                    if (now - lastFrameTimestamp.get() < minFrameIntervalMs) {
                        image.close();
                        return;
                    }
                    lastFrameTimestamp.set(now);

                    Image.Plane[] planes = image.getPlanes();
                    ByteBuffer buffer = planes[0].getBuffer();
                    int pixelStride = planes[0].getPixelStride();
                    int rowStride = planes[0].getRowStride();
                    int rowPadding = rowStride - pixelStride * finalWidth;

                    Bitmap bitmap = Bitmap.createBitmap(
                        finalWidth + rowPadding / pixelStride,
                        finalHeight,
                        Bitmap.Config.ARGB_8888
                    );
                    bitmap.copyPixelsFromBuffer(buffer);
                    image.close();
                    image = null;

                    Bitmap finalBitmap = bitmap;
                    if (rowPadding > 0) {
                        finalBitmap = Bitmap.createBitmap(bitmap, 0, 0, finalWidth, finalHeight);
                        bitmap.recycle();
                    }

                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    finalBitmap.compress(Bitmap.CompressFormat.JPEG, 60, baos);
                    finalBitmap.recycle();

                    byte[] jpegBytes = baos.toByteArray();
                    String base64 = Base64.encodeToString(jpegBytes, Base64.NO_WRAP);

                    sendJsFrame(base64);

                } catch (Exception e) {
                    if (image != null) {
                        try { image.close(); } catch (Exception ignore) {}
                    }
                }
            }, backgroundHandler);

        } catch (Exception ex) {
            ex.printStackTrace();
            sendJsEvent("window.__onAndroidScreenCaptureFailed && window.__onAndroidScreenCaptureFailed('" + ex.getMessage() + "');");
        }
    }

    public void stopScreenCapture() {
        isCapturing = false;
        try {
            if (virtualDisplay != null) {
                virtualDisplay.release();
                virtualDisplay = null;
            }
            if (imageReader != null) {
                imageReader.close();
                imageReader = null;
            }
            if (mediaProjection != null) {
                mediaProjection.stop();
                mediaProjection = null;
            }
            Intent serviceIntent = new Intent(this, ScreenCaptureService.class);
            stopService(serviceIntent);

            sendJsEvent("window.__onAndroidScreenCaptureStopped && window.__onAndroidScreenCaptureStopped();");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public boolean isScreenCapturing() {
        return isCapturing;
    }

    private void sendJsEvent(String js) {
        WebView webView = this.bridge != null ? this.bridge.getWebView() : null;
        if (webView != null) {
            webView.post(() -> webView.evaluateJavascript(js, null));
        }
    }

    private void sendJsFrame(String base64) {
        WebView webView = this.bridge != null ? this.bridge.getWebView() : null;
        if (webView != null && isCapturing) {
            webView.post(() -> {
                if (isCapturing) {
                    webView.evaluateJavascript("window.__onAndroidScreenFrame && window.__onAndroidScreenFrame('data:image/jpeg;base64," + base64 + "');", null);
                }
            });
        }
    }

    @Override
    public void onDestroy() {
        stopScreenCapture();
        if (backgroundThread != null) {
            backgroundThread.quitSafely();
            backgroundThread = null;
            backgroundHandler = null;
        }
        super.onDestroy();
    }
}

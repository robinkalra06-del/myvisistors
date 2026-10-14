package com.pulsemeet.app;

import android.webkit.JavascriptInterface;

public class AndroidScreenShareBridge {
    private final MainActivity activity;

    public AndroidScreenShareBridge(MainActivity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public boolean isSupported() {
        return true;
    }

    @JavascriptInterface
    public void startScreenCapture() {
        activity.startScreenCapture();
    }

    @JavascriptInterface
    public void stopScreenCapture() {
        activity.stopScreenCapture();
    }

    @JavascriptInterface
    public boolean isCapturing() {
        return activity.isScreenCapturing();
    }

    @JavascriptInterface
    public void requestMediaPermissions() {
        activity.requestMediaPermissions();
    }

    @JavascriptInterface
    public void openAppSettings() {
        activity.openAppSettings();
    }
}

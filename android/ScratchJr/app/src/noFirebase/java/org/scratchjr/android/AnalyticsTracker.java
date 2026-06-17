package org.scratchjr.android;

import android.content.Context;

class AnalyticsTracker {
    AnalyticsTracker(Context context) {}
    void logScreenView(String page) {}
    void logEvent(String category, String action, String label) {}
    void setUserProperty(String key, String value) {}
}

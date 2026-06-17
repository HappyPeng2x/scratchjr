package org.scratchjr.android;

import android.content.Context;
import android.os.Bundle;
import com.google.firebase.analytics.FirebaseAnalytics;

class AnalyticsTracker {
    private final FirebaseAnalytics _analytics;

    AnalyticsTracker(Context context) {
        _analytics = FirebaseAnalytics.getInstance(context);
    }

    void logScreenView(String page) {
        Bundle bundle = new Bundle();
        bundle.putString(FirebaseAnalytics.Param.SCREEN_NAME, page);
        bundle.putString(FirebaseAnalytics.Param.SCREEN_CLASS, "ScratchJrActivity");
        _analytics.logEvent(FirebaseAnalytics.Event.SCREEN_VIEW, bundle);
    }

    void logEvent(String category, String action, String label) {
        Bundle params = new Bundle();
        params.putString(FirebaseAnalytics.Param.ITEM_CATEGORY, category);
        params.putString(FirebaseAnalytics.Param.ITEM_NAME, label);
        _analytics.logEvent(action, params);
    }

    void setUserProperty(String key, String value) {
        _analytics.setUserProperty(key, value);
    }
}

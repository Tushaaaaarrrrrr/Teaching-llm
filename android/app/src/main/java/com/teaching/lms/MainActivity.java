package com.teaching.lms;

import android.os.Bundle;
import android.view.View;
import android.view.Window;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);

        View rootView = window.getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(rootView, (v, insets) -> {
            int navBottomPx = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
            float density = getResources().getDisplayMetrics().density;
            int navBottomDp = Math.round(navBottomPx / density);

            if (this.bridge != null && this.bridge.getWebView() != null) {
                this.bridge.getWebView().post(() -> {
                    try {
                        String js = String.format(
                            "document.documentElement.style.setProperty('--android-nav-bottom', '%dpx');",
                            navBottomDp
                        );
                        this.bridge.getWebView().evaluateJavascript(js, null);
                    } catch (Exception ignored) {}
                });
            }
            return ViewCompat.onApplyWindowInsets(v, insets);
        });
    }
}


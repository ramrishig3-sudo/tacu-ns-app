package com.tacu.ns;

import android.os.Build;
import android.view.WindowManager;
import androidx.appcompat.app.AlertDialog;
import com.getcapacitor.BridgeActivity;
import java.io.File;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "TacU-Security";

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(LanScanPlugin.class);
        super.onCreate(savedInstanceState);
        // Prevent app content from appearing in recent apps switcher screenshots
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );
        if (isRooted()) {
            showRootWarning();
        }
    }

    private boolean isRooted() {
        // Check 1: su binary in common paths
        String[] suPaths = {
            "/system/bin/su", "/system/xbin/su", "/sbin/su",
            "/system/su", "/system/bin/.ext/.su", "/system/usr/we-need-root/su-backup",
            "/data/local/su", "/data/local/bin/su", "/data/local/xbin/su",
        };
        for (String path : suPaths) {
            if (new File(path).exists()) return true;
        }
        // Check 2: Build tags contain test-keys (AOSP custom ROM)
        String buildTags = Build.TAGS;
        if (buildTags != null && buildTags.contains("test-keys")) return true;

        // Check 3: Magisk app package presence
        String[] rootApps = {
            "com.topjohnwu.magisk", "com.noshufou.android.su",
            "eu.chainfire.supersu", "com.koushikdutta.superuser",
        };
        for (String pkg : rootApps) {
            try {
                getPackageManager().getPackageInfo(pkg, 0);
                return true;
            } catch (Exception ignored) {}
        }
        return false;
    }

    private void showRootWarning() {
        new AlertDialog.Builder(this)
            .setTitle("Security Warning")
            .setMessage(
                "This device appears to be rooted. " +
                "Running security tools on a rooted device may expose your data to other apps. " +
                "Proceed with caution."
            )
            .setPositiveButton("I Understand", (dialog, which) -> dialog.dismiss())
            .setNegativeButton("Exit App", (dialog, which) -> finish())
            .setCancelable(false)
            .show();
    }
}

# TacU-NS ProGuard / R8 Rules

# ── Capacitor Bridge ─────────────────────────────────────────────────────────
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.annotation.** { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.CapacitorPlugin *;
    @com.getcapacitor.PluginMethod *;
}

# ── Custom Plugins ────────────────────────────────────────────────────────────
# Keep only what the Capacitor bridge reflection requires:
#   - MainActivity (BridgeActivity subclass, instantiated by Android)
#   - Plugin subclasses and their @PluginMethod-annotated public methods
-keep class com.tacu.ns.MainActivity { *; }
-keep class com.tacu.ns.LanScanPlugin { *; }
-keepclassmembers class com.tacu.ns.LanScanPlugin {
    @com.getcapacitor.PluginMethod public *;
}

# ── Capacitor Community Plugins ───────────────────────────────────────────────
-keep class com.capacitorjs.** { *; }
-keep class ee.forgr.** { *; }

# ── AndroidX / Core ───────────────────────────────────────────────────────────
-keep class androidx.core.content.FileProvider { *; }

# ── Coroutines (if any) ───────────────────────────────────────────────────────
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}

# ── Strip all Android logging from release builds ────────────────────────────
# R8 removes these call sites entirely; zero runtime cost, zero log leakage.
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
    public static *** w(...);
    public static *** e(...);
    public static *** wtf(...);
}

# ── Suppress irrelevant warnings ──────────────────────────────────────────────
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**

# ── Keep line numbers for crash reports ───────────────────────────────────────
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Minification is off. If you turn it on, keep the JavaScript bridge:
-keepclassmembers class ca.parstack.app.MainActivity$Bridge {
    @android.webkit.JavascriptInterface <methods>;
}

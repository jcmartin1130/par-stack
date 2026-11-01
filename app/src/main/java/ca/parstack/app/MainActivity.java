package ca.parstack.app;

import android.annotation.SuppressLint;
import android.annotation.TargetApi;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Par Stack runs as one WebView. The web app in assets/www is served from a private https
 * origin (no network needed), and a small bridge gives it durable storage plus file export
 * and import through the system file picker.
 */
public class MainActivity extends Activity {

    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/index.html";
    private static final String STATE_FILE = "parstack-state.json";
    private static final int REQ_IMPORT = 41;
    private static final int REQ_EXPORT = 42;
    private static final int BG_LIGHT = 0xFFEDEFF0;
    private static final int BG_DARK = 0xFF111416;

    private FrameLayout root;
    private WebView web;
    private ValueCallback<Uri[]> pendingChooser;
    private String pendingExport;
    private String pendingExportName;
    private Object backCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        root = new FrameLayout(this);
        root.setBackgroundColor(isNight() ? BG_DARK : BG_LIGHT);
        web = new WebView(this);
        web.setBackgroundColor(Color.TRANSPARENT);
        root.addView(web, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);
        setUpWindow();
        setUpWebView();
        if (Build.VERSION.SDK_INT >= 33) {
            backCallback = Api33.registerBack(this);
        }
        web.loadUrl(START_URL);
    }

    private boolean isNight() {
        int mode = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        return mode == Configuration.UI_MODE_NIGHT_YES;
    }

    /* ---------------- window and system bars ---------------- */

    private void setUpWindow() {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((v, insets) -> {
                android.graphics.Insets bars = insets.getInsets(
                        WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                android.graphics.Insets ime = insets.getInsets(WindowInsets.Type.ime());
                v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
                return WindowInsets.CONSUMED;
            });
        }
        applyBars(isNight(), isNight() ? BG_DARK : BG_LIGHT);
    }

    @SuppressWarnings("deprecation")
    private void applyBars(boolean dark, int color) {
        root.setBackgroundColor(color);
        Window w = getWindow();
        if (Build.VERSION.SDK_INT >= 30) {
            if (Build.VERSION.SDK_INT < 35) {
                w.setStatusBarColor(Color.TRANSPARENT);
                w.setNavigationBarColor(Color.TRANSPARENT);
            }
            w.setNavigationBarContrastEnforced(false);
            WindowInsetsController c = w.getInsetsController();
            if (c != null) {
                int light = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                        | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                c.setSystemBarsAppearance(dark ? 0 : light, light);
            }
        } else {
            w.setStatusBarColor(color);
            w.setNavigationBarColor(color);
            View decor = w.getDecorView();
            int light = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            int flags = decor.getSystemUiVisibility();
            decor.setSystemUiVisibility(dark ? (flags & ~light) : (flags | light));
        }
    }

    /* ---------------- web view ---------------- */

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    private void setUpWebView() {
        boolean debuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        WebView.setWebContentsDebuggingEnabled(debuggable);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.addJavascriptInterface(new Bridge(), "ParStackNative");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (HOST.equals(u.getHost())) return serveAsset(u.getPath());
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (HOST.equals(u.getHost())) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (ActivityNotFoundException ignored) {
                    // nothing can open it; stay in the app
                }
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (pendingChooser != null) pendingChooser.onReceiveValue(null);
                pendingChooser = callback;
                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try {
                    startActivityForResult(i, REQ_IMPORT);
                    return true;
                } catch (ActivityNotFoundException e) {
                    pendingChooser = null;
                    return false;
                }
            }
        });
    }

    private WebResourceResponse serveAsset(String path) {
        if (path == null || path.isEmpty() || "/".equals(path)) path = "/index.html";
        String clean = path.startsWith("/") ? path.substring(1) : path;
        if (clean.contains("..")) return notFound();
        try {
            InputStream in = getAssets().open("www/" + clean);
            String mime = mimeFor(clean);
            boolean text = mime.startsWith("text/") || mime.endsWith("json") || mime.endsWith("svg+xml");
            WebResourceResponse r = new WebResourceResponse(mime, text ? "utf-8" : null, in);
            Map<String, String> headers = new HashMap<>();
            headers.put("Cache-Control", "no-cache");
            r.setResponseHeaders(headers);
            return r;
        } catch (IOException e) {
            return notFound();
        }
    }

    private static WebResourceResponse notFound() {
        WebResourceResponse r = new WebResourceResponse("text/plain", "utf-8",
                new ByteArrayInputStream(new byte[0]));
        r.setStatusCodeAndReasonPhrase(404, "Not Found");
        return r;
    }

    private static String mimeFor(String name) {
        String n = name.toLowerCase(Locale.ROOT);
        if (n.endsWith(".html")) return "text/html";
        if (n.endsWith(".css")) return "text/css";
        if (n.endsWith(".js")) return "text/javascript";
        if (n.endsWith(".json")) return "application/json";
        if (n.endsWith(".webmanifest")) return "application/manifest+json";
        if (n.endsWith(".svg")) return "image/svg+xml";
        if (n.endsWith(".woff2")) return "font/woff2";
        if (n.endsWith(".png")) return "image/png";
        if (n.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }

    /* ---------------- durable state ---------------- */

    private synchronized boolean writeState(String json) {
        File dir = getFilesDir();
        File tmp = new File(dir, STATE_FILE + ".tmp");
        File dst = new File(dir, STATE_FILE);
        File bak = new File(dir, STATE_FILE + ".bak");
        try (FileOutputStream out = new FileOutputStream(tmp)) {
            out.write(json.getBytes(StandardCharsets.UTF_8));
            out.flush();
            out.getFD().sync();
        } catch (IOException e) {
            return false;
        }
        if (dst.exists()) {
            //noinspection ResultOfMethodCallIgnored
            bak.delete();
            //noinspection ResultOfMethodCallIgnored
            dst.renameTo(bak);
        }
        return tmp.renameTo(dst);
    }

    private synchronized String readState() {
        File dir = getFilesDir();
        for (String name : new String[]{STATE_FILE, STATE_FILE + ".bak"}) {
            File f = new File(dir, name);
            if (!f.exists()) continue;
            try (InputStream in = new FileInputStream(f)) {
                String s = readAll(in);
                if (!s.isEmpty()) return s;
            } catch (IOException ignored) {
                // try the backup copy
            }
        }
        return "";
    }

    private static String readAll(InputStream in) throws IOException {
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int n;
        while ((n = in.read(buf)) > 0) bo.write(buf, 0, n);
        return new String(bo.toByteArray(), StandardCharsets.UTF_8);
    }

    /* ---------------- export and import ---------------- */

    private void startExport(String name, String mime, String content) {
        pendingExport = content;
        pendingExportName = name;
        Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);
        i.setType(mime == null || mime.isEmpty() ? "application/octet-stream" : mime);
        i.putExtra(Intent.EXTRA_TITLE, name);
        try {
            startActivityForResult(i, REQ_EXPORT);
        } catch (ActivityNotFoundException e) {
            pendingExport = null;
            notifyExport(false, "No app on this phone can save files.");
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_IMPORT) {
            if (pendingChooser != null) {
                Uri[] result = null;
                if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                    result = new Uri[]{data.getData()};
                }
                pendingChooser.onReceiveValue(result);
                pendingChooser = null;
            }
        } else if (requestCode == REQ_EXPORT) {
            String content = pendingExport;
            String name = pendingExportName;
            pendingExport = null;
            pendingExportName = null;
            if (resultCode != RESULT_OK || data == null || data.getData() == null || content == null) {
                notifyExport(false, "Export cancelled.");
                return;
            }
            try (OutputStream out = getContentResolver().openOutputStream(data.getData(), "w")) {
                if (out == null) throw new IOException("no output stream");
                out.write(content.getBytes(StandardCharsets.UTF_8));
                out.flush();
                notifyExport(true, name == null ? "file" : name);
            } catch (IOException | SecurityException e) {
                notifyExport(false, "Couldn't write the file. Try a different folder.");
            }
        }
    }

    private void notifyExport(boolean ok, String msg) {
        web.evaluateJavascript("window.PS&&PS.native&&PS.native.onExport(" + ok + ","
                + JSONObject.quote(msg) + ")", null);
    }

    private static int parseColor(String s, boolean dark) {
        try {
            return Color.parseColor(s);
        } catch (RuntimeException e) {
            return dark ? BG_DARK : BG_LIGHT;
        }
    }

    /* ---------------- back button ---------------- */

    void handleBack() {
        web.evaluateJavascript("(window.PS&&PS.app&&PS.app.back)?PS.app.back():false", value -> {
            if (!"true".equals(value)) moveTaskToBack(true);
        });
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        // Android 12L and older. Android 13+ uses the callback registered in onCreate.
        handleBack();
    }

    @TargetApi(33)
    private static final class Api33 {
        static Object registerBack(MainActivity a) {
            OnBackInvokedCallback cb = a::handleBack;
            a.getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, cb);
            return cb;
        }

        static void unregisterBack(MainActivity a, Object cb) {
            a.getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback((OnBackInvokedCallback) cb);
        }
    }

    /* ---------------- lifecycle ---------------- */

    @Override
    protected void onPause() {
        web.evaluateJavascript("window.PS&&PS.native&&PS.native.flush()", null);
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onDestroy() {
        if (Build.VERSION.SDK_INT >= 33 && backCallback != null) {
            Api33.unregisterBack(this, backCallback);
        }
        if (pendingChooser != null) {
            pendingChooser.onReceiveValue(null);
            pendingChooser = null;
        }
        root.removeView(web);
        web.destroy();
        super.onDestroy();
    }

    /* ---------------- bridge (window.ParStackNative) ---------------- */

    private final class Bridge {
        @JavascriptInterface
        public String loadState() {
            return readState();
        }

        @JavascriptInterface
        public boolean saveState(String json) {
            return json != null && writeState(json);
        }

        @JavascriptInterface
        public void exportFile(final String name, final String mime, final String content) {
            runOnUiThread(() -> startExport(name, mime, content));
        }

        @JavascriptInterface
        public void shareText(final String subject, final String text) {
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_SEND);
                i.setType("text/plain");
                i.putExtra(Intent.EXTRA_SUBJECT, subject);
                i.putExtra(Intent.EXTRA_TEXT, text);
                try {
                    startActivity(Intent.createChooser(i, subject));
                } catch (ActivityNotFoundException ignored) {
                    // no app can share text
                }
            });
        }

        @JavascriptInterface
        public void setSystemBars(final boolean dark, final String color) {
            runOnUiThread(() -> applyBars(dark, parseColor(color, dark)));
        }

        @JavascriptInterface
        @SuppressWarnings("deprecation")
        public String appVersion() {
            try {
                PackageInfo p = getPackageManager().getPackageInfo(getPackageName(), 0);
                return p.versionName == null ? "" : p.versionName;
            } catch (PackageManager.NameNotFoundException e) {
                return "";
            }
        }
    }
}

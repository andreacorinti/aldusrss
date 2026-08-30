package com.andreacorinti.aldusrss;

import android.webkit.WebView;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// La cache che pesa davvero sullo spazio (immagini e risposte di rete delle
// fonti RSS) vive nella WebView nativa, non in localStorage: da JS non è
// raggiungibile, serve chiamare WebView.clearCache(true) lato Android.
@CapacitorPlugin(name = "CacheClear")
public class CacheClearPlugin extends Plugin {
    @PluginMethod
    public void clear(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.clearCache(true);
            }
            call.resolve();
        });
    }
}

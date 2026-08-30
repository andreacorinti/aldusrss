package com.andreacorinti.aldusrss;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CacheClearPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

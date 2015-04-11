package nu.lhs.iot.oh_wow_gaem;

import android.app.Activity;
import android.content.Context;
import android.net.wifi.WifiConfiguration;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.Bundle;
import android.util.Log;

import java.io.IOException;
import java.net.InetAddress;
import java.util.ArrayList;
import java.util.List;

import nu.lhs.iot.oh_wow_gaem.echo.DebugWebSocketServer;

public class MainActivity extends Activity {

    private DebugWebSocketServer websocket;
    private MyHTTPD server;
    public Gaem gaem;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        Log.d("potato", "on create");

        gaem = new Gaem();
    }

    protected void onResume() {
        super.onResume();
        Log.d("potato", "on resume");

        server = new MyHTTPD();
        websocket = new DebugWebSocketServer(8001, gaem);

        try {
            server.start();
            websocket.start();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (server != null)
            server.stop();
    }
}

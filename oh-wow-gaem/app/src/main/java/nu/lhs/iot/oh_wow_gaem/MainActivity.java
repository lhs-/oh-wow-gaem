package nu.lhs.iot.oh_wow_gaem;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;

import java.io.IOException;

import nu.lhs.iot.oh_wow_gaem.echo.DebugWebSocketServer;

public class MainActivity extends Activity {

    private DebugWebSocketServer websocket;
    private MyHTTPD server;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        Log.d("potato", "on create");
    }

    protected void onResume() {
        super.onResume();
        Log.d("potato", "on resume");

        server = new MyHTTPD();
        websocket = new DebugWebSocketServer(8001, true);

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

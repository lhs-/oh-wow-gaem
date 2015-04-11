package nu.lhs.iot.oh_wow_gaem.echo;

import android.util.Log;

import nu.lhs.iot.oh_wow_gaem.Gaem;
import nu.lhs.iot.oh_wow_gaem.NanoWebSocketServer;
import nu.lhs.iot.oh_wow_gaem.WebSocket;

/**
* @author Paul S. Hawke (paul.hawke@gmail.com)
*         On: 4/23/14 at 10:31 PM
*/
public class DebugWebSocketServer extends NanoWebSocketServer {
    private final boolean debug;
    private Gaem sdc;

    public DebugWebSocketServer(int port, Gaem sdc) {
        super(port);
        debug = false;
        this.sdc = sdc;
    }

    @Override
    public WebSocket openWebSocket(IHTTPSession handshake) {
        DebugWebSocket dws = new DebugWebSocket(handshake, sdc);
        return dws;
    }
}

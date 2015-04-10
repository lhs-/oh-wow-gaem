package nu.lhs.iot.oh_wow_gaem.echo;

import nu.lhs.iot.oh_wow_gaem.NanoWebSocketServer;
import nu.lhs.iot.oh_wow_gaem.WebSocket;

/**
* @author Paul S. Hawke (paul.hawke@gmail.com)
*         On: 4/23/14 at 10:31 PM
*/
public class DebugWebSocketServer extends NanoWebSocketServer {
    private final boolean debug;

    public DebugWebSocketServer(int port, boolean debug) {
        super(port);
        this.debug = debug;
    }

    @Override
    public WebSocket openWebSocket(IHTTPSession handshake) {
        return new DebugWebSocket(handshake, debug);
    }
}

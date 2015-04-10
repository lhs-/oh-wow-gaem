package nu.lhs.iot.oh_wow_gaem;

import fi.iki.elonen.NanoHTTPD.IHTTPSession;

public interface IWebSocketFactory {
    WebSocket openWebSocket(IHTTPSession handshake);
}

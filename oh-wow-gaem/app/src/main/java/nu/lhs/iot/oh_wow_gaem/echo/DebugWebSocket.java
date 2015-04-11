package nu.lhs.iot.oh_wow_gaem.echo;

import org.json.JSONObject;

import fi.iki.elonen.NanoHTTPD;
import nu.lhs.iot.oh_wow_gaem.Gaem;
import nu.lhs.iot.oh_wow_gaem.WebSocket;
import nu.lhs.iot.oh_wow_gaem.WebSocketFrame;

import java.io.IOException;
import org.json.JSONException;
import android.util.Log;

/**
* @author Paul S. Hawke (paul.hawke@gmail.com)
*         On: 4/23/14 at 10:34 PM
*/
public class DebugWebSocket extends WebSocket {
    private final boolean debug;
    private Gaem superDuperComputer;

    public int iAmTeamWho;

    public DebugWebSocket(NanoHTTPD.IHTTPSession handshake, Gaem ref) {
        super(handshake);
        this.debug = false;
        superDuperComputer = ref;
    }

    public void assignTeam(int team){
        iAmTeamWho = team;

        try {
            JSONObject obj = new JSONObject();
            obj.put("team", iAmTeamWho);
            sendJSON("set-team", obj);
        } catch (JSONException e) {
            Log.d("json error", e.getMessage());
        }
    }

    public void sendText(String txt) {
        try {
            this.send(txt);
        } catch (IOException e) {
            Log.d("io err", e.getMessage());
        }
    }

    public static String serializeJSON(String eventHeader, JSONObject data) {
        try {
            JSONObject obj = new JSONObject();
            obj.put("event", eventHeader);
            obj.put("payload", data);
            return obj.toString();
        } catch (JSONException e) {
            Log.d("json error", e.getMessage());
        }
        return null;
    }

    public void sendJSON(String eventHeader, JSONObject data) {
        try {
            JSONObject obj = new JSONObject();
            obj.put("event", eventHeader);
            obj.put("payload", data);

            this.sendText(obj.toString());
        } catch (JSONException e) {
            Log.d("json error", e.getMessage());
        }
    }

    @Override
    protected void onPong(WebSocketFrame pongFrame) {
        Log.d("HELLO", "I AM PONG!");
    }

    @Override
    protected void onMessage(WebSocketFrame messageFrame) {
        String payload = messageFrame.getTextPayload();

        if (payload.equals("ping")) {
            try {
                messageFrame.setTextPayload("ping");
                messageFrame.setUnmasked();
                sendFrame(messageFrame);
            } catch (IOException e){}
            return;
        }

        if (payload.equals("team-request")) {
            superDuperComputer.onClientConnect(this);
            return;
        }

        try {
            messageFrame.setUnmasked();
            JSONObject frame = new JSONObject(messageFrame.getTextPayload());

            String event = frame.getString("event");

            if (event.equals("draw")) {
                superDuperComputer.onDraw(this, frame.getJSONObject("payload"), messageFrame);
            } else if (event.equals("hello")) {
                superDuperComputer.onReconnect(this, frame.getJSONObject("payload"));
            }
            try {
                send("ping");
            } catch (IOException e){}
        } catch (JSONException e) {}
    }

    @Override
    protected void onClose(WebSocketFrame.CloseCode code, String reason, boolean initiatedByRemote) {
        if (debug) {
            System.out.println("C [" + (initiatedByRemote ? "Remote" : "Self") + "] " +
                    (code != null ? code : "UnknownCloseCode[" + code + "]") +
                    (reason != null && !reason.isEmpty() ? ": " + reason : ""));
        }
        superDuperComputer.onClientDisconnect(this);
    }

    @Override
    protected void onException(IOException e) {
        e.printStackTrace();
    }

    @Override
    protected void handleWebsocketFrame(WebSocketFrame frame) throws IOException {
       Log.d("HANDLE IT", "HANDLE IT YO!");
        if (debug) {
            System.out.println("R " + frame);
        }
        super.handleWebsocketFrame(frame);
    }

    @Override
    public synchronized void sendFrame(WebSocketFrame frame) throws IOException {
        if (debug) {
            System.out.println("S " + frame);
        }
        super.sendFrame(frame);
    }
}

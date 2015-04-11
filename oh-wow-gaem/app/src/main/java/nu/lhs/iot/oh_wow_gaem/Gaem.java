package nu.lhs.iot.oh_wow_gaem;

import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.util.ArrayList;
import android.os.Handler;

import nu.lhs.iot.oh_wow_gaem.echo.DebugWebSocket;

/**
 * Created by smeets on 11/04/15.
 */
public class Gaem {
    private static final int TEAM_BOFOL = 1, TEAM_KLOPP = 2;
    private static final int WIDTH = 100, HEIGHT = 100;

    private int[][] area;
    private double totalPtas = WIDTH * HEIGHT - 880; // for some additional flair
    private int bofulPtas = 0, kloppPtas = 0;

    private double defaultTime = 10;
    private double timerStart = 0.5;
    private boolean timerStarted = false;

    private ArrayList<DebugWebSocket> clients;
    private int bofuls = 0, klopps = 0; // members of each team

    private ArrayList<WebSocketFrame> sortedEvents;

    private Handler timerHandler = new Handler();
    private Runnable timerRunnable = new Runnable() {
        @Override
        public void run() {
            // game is over -- end it!
            end();
        }
    };

    public Gaem() {
        clients = new ArrayList<DebugWebSocket>(15);
        area = new int[WIDTH][HEIGHT];

        area[15][15] = 2;
        area[50][50] = 1;
        area[75][75] = 2;
     }

    public void start() {
        // Reset team points (no area covered)
        bofulPtas = kloppPtas = 0;
        timerStarted = false;

        JSONObject obj = new JSONObject();
        String msg = DebugWebSocket.serializeJSON("start", obj);

        for (DebugWebSocket client : clients) {
            client.sendText(msg);
        }
    }

    public void end() {
        // Create 1 json object and reuse it for all clients
        JSONObject obj = new JSONObject();
        try {
            obj.put("gaem", "end");
            obj.put("team2", kloppPtas);
            obj.put("team1", bofulPtas);
        } catch (JSONException e) {
            Log.d("json err", e.getMessage());
        }

        // Only serialize it once
        String msg = DebugWebSocket.serializeJSON("end", obj);

        for (DebugWebSocket client : clients) {
            client.sendText(msg);
        }
    }

    void startTimer() {
        // Create 1 json object and reuse it for all clients
        JSONObject obj = new JSONObject();
        double time = defaultTime * 1000;

        try {
            obj.put("timeout", time);
        } catch (JSONException e) {
            Log.d("json err", e.getMessage());
        }

        // Only serialize it once
        String msg = DebugWebSocket.serializeJSON("timer-start", obj);
        for (DebugWebSocket client : clients) {
            client.sendText(msg);
        }

        timerHandler.postDelayed(timerRunnable, ((int)time));
    }

    public void onDraw(DebugWebSocket ws, JSONObject data, WebSocketFrame wsf) {
        try {
            int changed = 0, ox = data.getInt("x"), oy = data.getInt("y"),
                    size = data.getInt("size"), team = ws.iAmTeamWho;

            Log.d("GOT", ox + "--" + oy + "--" + team);
            for (int x = ox - size; x <= ox + size; x++) {
                for (int y = oy - size; y <= oy + size; y++) {
                    if (x < 0 || y < 0) continue;

                    if (area[x][y] != team) {
                        changed++;
                        area[x][y] = team;
                    }
                }
            }

            if (team == TEAM_BOFOL)
                bofulPtas += changed;
            else
                kloppPtas += changed;

            if (bofulPtas + kloppPtas >= totalPtas * timerStart && !timerStarted) {
                timerStarted = true;
                startTimer();
            }

            // Forward frame/event to other clients
            for (DebugWebSocket client : clients) {
                try {
                    if (!client.equals(ws))
                        client.sendFrame(wsf);
                } catch (IOException e) {
                    Log.d("io err", e.getMessage());
                }
            }

            JSONObject obj = new JSONObject();
            obj.put("team1", bofulPtas / totalPtas);
            obj.put("team2", kloppPtas / totalPtas);
            String msg = DebugWebSocket.serializeJSON("update-percent", obj);
            for (DebugWebSocket client : clients) {
                client.send(msg);
            }

        } catch (JSONException e) {
            Log.d("json err", e.getMessage());
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public void onClientConnect(DebugWebSocket ws) {
        Log.d("potato", "on connect = " + ws.toString());
        clients.add(ws);

        if (klopps > bofuls) {
            bofuls++;
            ws.assignTeam(TEAM_BOFOL);
        } else {
            klopps++;
            ws.assignTeam(TEAM_KLOPP);
        }

        // Send canvas/area
        JSONObject obj = new JSONObject();
        try {
            JSONArray canvas = new JSONArray();
            for (int x = 0; x < WIDTH; x++) {
                JSONArray col = new JSONArray();
                for (int y = 0; y < HEIGHT; y++) {
                    col.put(y, area[x][y]);
                }
                canvas.put(x, col);
            }

            obj.put("canvas", canvas);
            obj.put("team1", bofulPtas / totalPtas);
            obj.put("team2", kloppPtas / totalPtas);
        } catch (JSONException e) {
            Log.d("json err", e.getMessage());
        }

        ws.sendJSON("join", obj);
    }

    public void onClientDisconnect(DebugWebSocket ws) {
        Log.d("potato", "on disconnect = " + ws.toString());
        clients.remove(ws);

        // remove from team
        if (ws.iAmTeamWho == TEAM_BOFOL) bofuls--;
        if (ws.iAmTeamWho == TEAM_BOFOL) klopps--;
    }

    public void onReconnect(DebugWebSocket ws, JSONObject payload) {
        Log.d("potato", "on reconnect = " + ws.toString());
        clients.add(ws);

        try {
            ws.iAmTeamWho = payload.getInt("team");
        } catch (JSONException e) {
            e.printStackTrace();
        }

        if (ws.iAmTeamWho == TEAM_BOFOL)
            bofuls++;
        else
            klopps++;
    }
}

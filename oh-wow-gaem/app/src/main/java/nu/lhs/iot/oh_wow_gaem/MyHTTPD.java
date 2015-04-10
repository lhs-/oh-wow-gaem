package nu.lhs.iot.oh_wow_gaem; /**
 * Created by smeets on 10/04/15.
 */

import fi.iki.elonen.NanoHTTPD;

import java.util.Map;

public class MyHTTPD extends NanoHTTPD {
    public MyHTTPD() {
        super(8000);
    }

    @Override public Response serve(IHTTPSession session) {
        Method method = session.getMethod();
        String uri = session.getUri();
        System.out.println(method + " '" + uri + "' ");

        String msg = "<html><body><h1>Hello server</h1>\n";
        Map<String, String> parms = session.getParms();
        if (parms.get("username") == null)
            msg +=
                    "<form action='?' method='get'>\n" +
                            "  <p>Your name: <input type='text' name='username'></p>\n" +
                            "</form>\n";
        else
            msg += "<p>Hello, " + parms.get("username") + "!</p>";

        msg += "</body></html>\n";

        return new NanoHTTPD.Response(msg);
    }
}

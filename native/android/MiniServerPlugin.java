package com.limradigitals.hotelordermanagement;

import android.content.Context;
import android.net.wifi.WifiManager;
import android.text.format.Formatter;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Collections;
import java.util.Enumeration;

@CapacitorPlugin(name = "MiniServer")
public class MiniServerPlugin extends Plugin {
    private static MiniServer server;

    @Override
    public void load() {
        super.load();
    }

    @com.getcapacitor.PluginMethod
    public void start(PluginCall call) {
        String key = call.getString("key", "");
        if (key == null || key.trim().isEmpty()) key = makeKey();
        try {
            if (server == null) server = new MiniServer(getContext(), key.trim());
            else server.setKey(key.trim());
            server.start();
            JSObject out = server.info();
            call.resolve(out);
        } catch (Exception e) { call.reject(e.getMessage(), e); }
    }

    @com.getcapacitor.PluginMethod
    public void stop(PluginCall call) {
        if (server != null) server.stop();
        call.resolve();
    }

    @com.getcapacitor.PluginMethod
    public void info(PluginCall call) {
        if (server == null) { call.resolve(new JSObject()); return; }
        call.resolve(server.info());
    }

    private static String makeKey() {
        SecureRandom r = new SecureRandom();
        String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder s = new StringBuilder("HOTEL-");
        for (int i = 0; i < 8; i++) s.append(alphabet.charAt(r.nextInt(alphabet.length())));
        return s.toString();
    }

    static class MiniServer {
        private final Context context;
        private final DB db;
        private volatile String key;
        private volatile boolean running;
        private ServerSocket socket;
        private Thread thread;
        private final int port = 8787;

        MiniServer(Context context, String key) {
            this.context = context.getApplicationContext();
            this.key = key;
            this.db = new DB(this.context);
        }
        void setKey(String key) { this.key = key; }
        synchronized void start() throws Exception {
            if (running) return;
            socket = new ServerSocket(port, 20, InetAddress.getByName("0.0.0.0"));
            running = true;
            thread = new Thread(() -> {
                while (running) {
                    try { final Socket client = socket.accept(); new Thread(() -> handle(client)).start(); }
                    catch (Exception ignored) { if (running) ignored.printStackTrace(); }
                }
            }, "KOMS-MiniServer");
            thread.start();
        }
        synchronized void stop() {
            running = false;
            try { if (socket != null) socket.close(); } catch (Exception ignored) {}
            socket = null;
        }
        JSObject info() {
            JSObject o = new JSObject();
            o.put("running", running);
            o.put("port", port);
            o.put("key", key);
            o.put("ip", getIp(context));
            o.put("url", "http://" + getIp(context) + ":" + port);
            return o;
        }
        private boolean authorized(String supplied) { return supplied != null && supplied.equals(key); }

        private void handle(Socket client) {
            try (Socket c = client) {
                c.setSoTimeout(10000);
                BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), StandardCharsets.UTF_8));
                String request = r.readLine();
                if (request == null) return;
                String[] p = request.split(" ");
                String method = p.length > 0 ? p[0] : "GET";
                String path = p.length > 1 ? p[1] : "/";
                int contentLength = 0; String hotelKey = null; String line;
                while ((line = r.readLine()) != null && !line.isEmpty()) {
                    int colon = line.indexOf(':'); if (colon < 0) continue;
                    String h = line.substring(0, colon).trim(); String v = line.substring(colon + 1).trim();
                    if (h.equalsIgnoreCase("Content-Length")) contentLength = Integer.parseInt(v);
                    if (h.equalsIgnoreCase("X-Hotel-Key")) hotelKey = v;
                }
                char[] bodyChars = new char[Math.max(0, contentLength)]; int read = 0;
                while (read < bodyChars.length) { int n = r.read(bodyChars, read, bodyChars.length-read); if (n < 0) break; read += n; }
                String body = new String(bodyChars, 0, read);

                if (path.equals("/health")) { reply(c, 200, "{\"ok\":true}"); return; }
                if (!authorized(hotelKey)) { reply(c, 401, "{\"error\":\"Invalid hotel key\"}"); return; }

                if (method.equals("GET") && path.equals("/api/state")) { reply(c, 200, db.state().toString()); return; }
                if (method.equals("POST") && path.equals("/api/order")) { reply(c, 200, db.createOrder(new JSONObject(body)).toString()); return; }
                if (method.equals("POST") && path.equals("/api/task")) { reply(c, 200, db.updateTask(new JSONObject(body)).toString()); return; }
                if (method.equals("POST") && path.equals("/api/collect")) { reply(c, 200, db.collect(new JSONObject(body)).toString()); return; }
                if (method.equals("POST") && path.equals("/api/menu")) { db.put("menu", new JSONArray(body)); reply(c, 200, "{\"ok\":true}"); return; }
                if (method.equals("POST") && path.equals("/api/staff")) { db.put("staff", new JSONArray(body)); reply(c, 200, "{\"ok\":true}"); return; }
                reply(c, 404, "{\"error\":\"Not found\"}");
            } catch (Exception e) { try { reply(client, 500, "{\"error\":\"Server error\"}"); } catch (Exception ignored) {} }
        }
        private static void reply(Socket c, int code, String body) throws Exception {
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            String head = "HTTP/1.1 " + code + " " + (code == 200 ? "OK" : code == 401 ? "Unauthorized" : code == 404 ? "Not Found" : "Error") + "\r\n" +
                    "Content-Type: application/json; charset=utf-8\r\n" +
                    "Access-Control-Allow-Origin: *\r\nAccess-Control-Allow-Headers: Content-Type, X-Hotel-Key\r\n" +
                    "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n" +
                    "Content-Length: " + bytes.length + "\r\nConnection: close\r\n\r\n";
            OutputStream out = c.getOutputStream(); out.write(head.getBytes(StandardCharsets.UTF_8)); out.write(bytes); out.flush();
        }
        private static String getIp(Context context) {
            try {
                WifiManager wm = (WifiManager) context.getSystemService(Context.WIFI_SERVICE);
                if (wm != null && wm.getConnectionInfo() != null) {
                    int ip = wm.getConnectionInfo().getIpAddress();
                    if (ip != 0) return Formatter.formatIpAddress(ip);
                }
            } catch (Exception ignored) {}
            try {
                Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
                for (NetworkInterface ni : Collections.list(interfaces)) for (InetAddress a : Collections.list(ni.getInetAddresses()))
                    if (!a.isLoopbackAddress() && a.getHostAddress().indexOf(':') < 0) return a.getHostAddress();
            } catch (Exception ignored) {}
            return "127.0.0.1";
        }
    }

    static class DB extends android.database.sqlite.SQLiteOpenHelper {
        DB(Context c) { super(c, "hotel_orders.db", null, 1); }
        public void onCreate(android.database.sqlite.SQLiteDatabase d) { d.execSQL("CREATE TABLE IF NOT EXISTS store(k TEXT PRIMARY KEY,v TEXT NOT NULL)"); }
        public void onUpgrade(android.database.sqlite.SQLiteDatabase d,int a,int b) {}
        synchronized String get(String k,String def){android.database.Cursor c=getReadableDatabase().query("store",new String[]{"v"},"k=?",new String[]{k},null,null,null);try{return c.moveToFirst()?c.getString(0):def;}finally{c.close();}}
        synchronized void put(String k,Object v){android.content.ContentValues cv=new android.content.ContentValues();cv.put("k",k);cv.put("v",String.valueOf(v));getWritableDatabase().insertWithOnConflict("store",null,cv,android.database.sqlite.SQLiteDatabase.CONFLICT_REPLACE);}
        JSONObject state(){try{return new JSONObject().put("menu",new JSONArray(get("menu","[]"))).put("staff",new JSONArray(get("staff","[]"))).put("orders",new JSONArray(get("orders","[]")));}catch(Exception e){return new JSONObject();}}
        synchronized JSONObject createOrder(JSONObject in){try{JSONArray orders=new JSONArray(get("orders","[]"));int token=Integer.parseInt(get("token","0"))+1;JSONObject o=new JSONObject(in.toString());o.put("id",java.util.UUID.randomUUID().toString());o.put("token",token);o.put("createdAt",new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX",java.util.Locale.US).format(new java.util.Date()));o.put("status","New");orders.put(o);put("token",token);put("orders",orders);return o;}catch(Exception e){return new JSONObject().put("error",e.getMessage());}}
        synchronized JSONObject updateTask(JSONObject in){try{JSONArray orders=new JSONArray(get("orders","[]"));for(int i=0;i<orders.length();i++){JSONObject o=orders.getJSONObject(i);if(o.getString("id").equals(in.getString("orderId"))){JSONArray tasks=o.getJSONArray("tasks");for(int j=0;j<tasks.length();j++){JSONObject t=tasks.getJSONObject(j);if(t.getString("section").equals(in.getString("section")))t.put("status",in.getString("status"));}String overall="New";boolean all=true,proc=false,acc=false;for(int j=0;j<tasks.length();j++){String s=tasks.getJSONObject(j).getString("status");if(!s.equals("Completed"))all=false;if(s.equals("Processing"))proc=true;if(s.equals("Accepted"))acc=true;}if(all)overall="Ready";else if(proc)overall="Processing";else if(acc)overall="Accepted";o.put("status",overall);break;}}put("orders",orders);return state();}catch(Exception e){return new JSONObject().put("error",e.getMessage());}}
        synchronized JSONObject collect(JSONObject in){try{JSONArray orders=new JSONArray(get("orders","[]"));for(int i=0;i<orders.length();i++){JSONObject o=orders.getJSONObject(i);if(o.getString("id").equals(in.getString("orderId"))){o.put("status","Collected");o.put("collectedAt",System.currentTimeMillis());break;}}put("orders",orders);return state();}catch(Exception e){return new JSONObject().put("error",e.getMessage());}}
    }
}

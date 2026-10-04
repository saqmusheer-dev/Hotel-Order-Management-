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
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;

@CapacitorPlugin(name="MiniServer")
public class MiniServerPlugin extends Plugin {
  private static MiniServer server;
  @com.getcapacitor.PluginMethod public void start(PluginCall call){
    String key=call.getString("key",""); if(key==null||key.trim().isEmpty()) key=makeKey();
    try{ if(server==null)server=new MiniServer(getContext(),key.trim()); else server.setKey(key.trim()); server.start(); call.resolve(server.info()); }
    catch(Exception e){call.reject(e.getMessage(),e);}
  }
  @com.getcapacitor.PluginMethod public void stop(PluginCall call){if(server!=null)server.stop();call.resolve();}
  @com.getcapacitor.PluginMethod public void info(PluginCall call){if(server==null){call.resolve(new JSObject());return;}call.resolve(server.info());}
  private static String makeKey(){SecureRandom r=new SecureRandom();String a="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";StringBuilder s=new StringBuilder("HOTEL-");for(int i=0;i<8;i++)s.append(a.charAt(r.nextInt(a.length())));return s.toString();}

  static class MiniServer {
    final Context context; final DB db; volatile String key; volatile boolean running; ServerSocket socket; Thread thread; final int port=8787;
    MiniServer(Context c,String k){context=c.getApplicationContext();key=k;db=new DB(context);}
    void setKey(String k){key=k;}
    synchronized void start() throws Exception{if(running)return;socket=new ServerSocket(port,20,InetAddress.getByName("0.0.0.0"));running=true;thread=new Thread(()->{while(running){try{Socket client=socket.accept();new Thread(()->handle(client)).start();}catch(Exception e){if(running)e.printStackTrace();}}},"KOMS-MiniServer");thread.start();}
    synchronized void stop(){running=false;try{if(socket!=null)socket.close();}catch(Exception ignored){}socket=null;}
    JSObject info(){JSObject o=new JSObject();o.put("running",running);o.put("port",port);o.put("key",key);String ip=getIp(context);o.put("ip",ip);o.put("url","http://"+ip+":"+port);return o;}
    boolean authorized(String supplied){return supplied!=null&&supplied.equals(key);}
    void handle(Socket client){
      try(Socket c=client){c.setSoTimeout(10000);BufferedReader r=new BufferedReader(new InputStreamReader(c.getInputStream(),StandardCharsets.UTF_8));String req=r.readLine();if(req==null)return;String[] p=req.split(" ");String method=p.length>0?p[0]:"GET";String path=p.length>1?p[1]:"/";int len=0;String hk=null,line;while((line=r.readLine())!=null&&!line.isEmpty()){int x=line.indexOf(':');if(x<0)continue;String h=line.substring(0,x).trim(),v=line.substring(x+1).trim();if(h.equalsIgnoreCase("Content-Length"))len=Integer.parseInt(v);if(h.equalsIgnoreCase("X-Hotel-Key"))hk=v;}char[] bc=new char[Math.max(0,len)];int nread=0;while(nread<bc.length){int n=r.read(bc,nread,bc.length-nread);if(n<0)break;nread+=n;}String body=new String(bc,0,nread);
        if(method.equals("OPTIONS")){reply(c,200,"{}");return;}
        if(path.equals("/health")){reply(c,200,"{\"ok\":true}");return;}
        if(!authorized(hk)){reply(c,401,"{\"error\":\"Invalid hotel key\"}");return;}
        if(method.equals("GET")&&path.equals("/api/state")){reply(c,200,db.state().toString());return;}
        if(method.equals("POST")&&path.equals("/api/order")){reply(c,200,db.createOrder(new JSONObject(body)).toString());return;}
        if(method.equals("POST")&&path.equals("/api/task")){reply(c,200,db.updateTask(new JSONObject(body)).toString());return;}
        if(method.equals("POST")&&path.equals("/api/collect")){reply(c,200,db.collect(new JSONObject(body)).toString());return;}
        if(method.equals("POST")&&path.equals("/api/menu")){db.put("menu",new JSONArray(body));reply(c,200,"{\"ok\":true}");return;}
        if(method.equals("POST")&&path.equals("/api/staff")){db.put("staff",new JSONArray(body));reply(c,200,"{\"ok\":true}");return;}
        reply(c,404,"{\"error\":\"Not found\"}");
      }catch(Exception ignored){}
    }
    static void reply(Socket c,int code,String body)throws Exception{byte[] b=body.getBytes(StandardCharsets.UTF_8);String status=code==200?"OK":code==401?"Unauthorized":code==404?"Not Found":"Error";String h="HTTP/1.1 "+code+" "+status+"\r\nContent-Type: application/json; charset=utf-8\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Headers: Content-Type, X-Hotel-Key\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nContent-Length: "+b.length+"\r\nConnection: close\r\n\r\n";OutputStream o=c.getOutputStream();o.write(h.getBytes(StandardCharsets.UTF_8));o.write(b);o.flush();}

    static String getIp(Context c){
      // Prefer the address reachable by another phone on the same LAN/hotspot.
      // On Android hotspot mode WifiManager.getConnectionInfo() may be empty or
      // may expose the client's address instead of the hotspot interface, so
      // enumerate IPv4 interfaces and rank common private LAN/hotspot ranges.
      try{
        List<String> candidates=new ArrayList<>();
        Enumeration<NetworkInterface> es=NetworkInterface.getNetworkInterfaces();
        if(es!=null) for(NetworkInterface ni:Collections.list(es)){
          String name=ni.getName()==null?"":ni.getName().toLowerCase(java.util.Locale.US);
          if(!ni.isUp()||ni.isLoopback())continue;
          for(InetAddress a:Collections.list(ni.getInetAddresses())){
            if(!(a instanceof Inet4Address)||a.isLoopbackAddress()||a.isLinkLocalAddress())continue;
            String ip=a.getHostAddress();
            if(isPrivateIpv4(ip)) candidates.add(ip);
          }
        }
        String ranked=pickLanAddress(candidates);
        if(ranked!=null)return ranked;
      }catch(Exception ignored){}
      try{
        WifiManager w=(WifiManager)c.getSystemService(Context.WIFI_SERVICE);
        if(w!=null&&w.getConnectionInfo()!=null){int ip=w.getConnectionInfo().getIpAddress();if(ip!=0)return Formatter.formatIpAddress(ip);}
      }catch(Exception ignored){}
      return "127.0.0.1";
    }
    static boolean isPrivateIpv4(String ip){
      try{
        String[] p=ip.split("\\."); if(p.length!=4)return false;
        int a=Integer.parseInt(p[0]),b=Integer.parseInt(p[1]);
        return a==10 || (a==172&&b>=16&&b<=31) || (a==192&&b==168);
      }catch(Exception e){return false;}
    }
    static String pickLanAddress(List<String> ips){
      if(ips.isEmpty())return null;
      // Hotspot/private LAN ranges first. Avoid returning a cellular VPN/tunnel
      // address when a normal 192.168.x.x address is available.
      String[] prefixes={"192.168.43.","192.168.49.","192.168.137.","192.168.0.","192.168.1."};
      for(String prefix:prefixes)for(String ip:ips)if(ip.startsWith(prefix))return ip;
      for(String ip:ips)if(ip.startsWith("10."))return ip;
      for(String ip:ips)if(ip.startsWith("172."))return ip;
      return ips.get(0);
    }
  }

  static class DB extends android.database.sqlite.SQLiteOpenHelper{
    DB(Context c){super(c,"hotel_orders.db",null,1);}
    public void onCreate(android.database.sqlite.SQLiteDatabase d){d.execSQL("CREATE TABLE IF NOT EXISTS store(k TEXT PRIMARY KEY,v TEXT NOT NULL)");}
    public void onUpgrade(android.database.sqlite.SQLiteDatabase d,int a,int b){}
    synchronized String get(String k,String def){android.database.Cursor c=getReadableDatabase().query("store",new String[]{"v"},"k=?",new String[]{k},null,null,null);try{return c.moveToFirst()?c.getString(0):def;}finally{c.close();}}
    synchronized void put(String k,Object v){android.content.ContentValues cv=new android.content.ContentValues();cv.put("k",k);cv.put("v",String.valueOf(v));getWritableDatabase().insertWithOnConflict("store",null,cv,android.database.sqlite.SQLiteDatabase.CONFLICT_REPLACE);}
    JSONObject state(){try{return new JSONObject().put("menu",new JSONArray(get("menu","[]"))).put("staff",new JSONArray(get("staff","[]"))).put("orders",new JSONArray(get("orders","[]")));}catch(Exception e){return error(e);}}
    synchronized JSONObject createOrder(JSONObject in){try{JSONArray orders=new JSONArray(get("orders","[]"));int token=Integer.parseInt(get("token","0"))+1;JSONObject o=new JSONObject(in.toString());o.put("id",java.util.UUID.randomUUID().toString());o.put("token",token);o.put("createdAt",new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX",java.util.Locale.US).format(new java.util.Date()));o.put("status","New");orders.put(o);put("token",token);put("orders",orders);return o;}catch(Exception e){return error(e);}}
    synchronized JSONObject updateTask(JSONObject in){try{JSONArray orders=new JSONArray(get("orders","[]"));for(int i=0;i<orders.length();i++){JSONObject o=orders.getJSONObject(i);if(o.getString("id").equals(in.getString("orderId"))){JSONArray tasks=o.getJSONArray("tasks");for(int j=0;j<tasks.length();j++){JSONObject t=tasks.getJSONObject(j);if(t.getString("section").equals(in.getString("section")))t.put("status",in.getString("status"));}String overall="New";boolean all=true,proc=false,acc=false;for(int j=0;j<tasks.length();j++){String s=tasks.getJSONObject(j).getString("status");if(!s.equals("Completed"))all=false;if(s.equals("Processing"))proc=true;if(s.equals("Accepted"))acc=true;}if(all)overall="Ready";else if(proc)overall="Processing";else if(acc)overall="Accepted";o.put("status",overall);break;}}put("orders",orders);return state();}catch(Exception e){return error(e);}}
    synchronized JSONObject collect(JSONObject in){try{JSONArray orders=new JSONArray(get("orders","[]"));for(int i=0;i<orders.length();i++){JSONObject o=orders.getJSONObject(i);if(o.getString("id").equals(in.getString("orderId"))){o.put("status","Collected");o.put("collectedAt",System.currentTimeMillis());break;}}put("orders",orders);return state();}catch(Exception e){return error(e);}}
    static JSONObject error(Exception e){JSONObject o=new JSONObject();try{o.put("error",e.getMessage()==null?"Server error":e.getMessage());}catch(Exception ignored){}return o;}
  }
}

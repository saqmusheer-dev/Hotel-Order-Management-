import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'native/android/MiniServerPlugin.java');
const javaDir = path.join(root, 'android/app/src/main/java/com/limradigitals/hotelordermanagement');
fs.mkdirSync(javaDir, { recursive: true });
fs.copyFileSync(src, path.join(javaDir, 'MiniServerPlugin.java'));

const main = path.join(javaDir, 'MainActivity.java');
if (fs.existsSync(main)) {
  let text = fs.readFileSync(main, 'utf8');
  if (!text.includes('MiniServerPlugin.class')) {
    text = text.replace(/public class MainActivity extends BridgeActivity \{/, 'public class MainActivity extends BridgeActivity {\n    @Override\n    public void onCreate(android.os.Bundle savedInstanceState) {\n        registerPlugin(MiniServerPlugin.class);\n        super.onCreate(savedInstanceState);\n    }');
    fs.writeFileSync(main, text);
  }
}

const manifest = path.join(root, 'android/app/src/main/AndroidManifest.xml');
if (fs.existsSync(manifest)) {
  let text = fs.readFileSync(manifest, 'utf8');
  if (!text.includes('android.permission.INTERNET')) text = text.replace('<manifest ', '<manifest ' + 'xmlns:tools="http://schemas.android.com/tools" ');
  if (!text.includes('android.permission.INTERNET')) text = text.replace('<application', '<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />\n    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />\n    <application');
  text = text.replace('<application', '<application android:usesCleartextTraffic="true"', 1);
  fs.writeFileSync(manifest, text);
}
console.log('Installed MiniServerPlugin into generated Android project.');

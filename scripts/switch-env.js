const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const target = process.argv[2];

if (!target || !['test', 'prod'].includes(target.toLowerCase())) {
  console.error('❌ Please specify a valid environment: "test" or "prod"');
  console.log('💡 Example: node scripts/switch-env.js test');
  process.exit(1);
}

const env = target.toLowerCase();

// Configurations
const configs = {
  test: {
    appId: 'com.teaching.lms.test',
    appName: 'GENz IITIAN Test',
    url: 'https://teaching-llm.onrender.com',
  },
  prod: {
    appId: 'com.teaching.lms',
    appName: 'GENz IITIAN',
    url: 'https://class.genziitian.in',
  }
};

const selected = configs[env];
const projectRoot = path.join(__dirname, '..');

console.log(`\n🚀 Switching app configuration to: ${env.toUpperCase()}`);
console.log(`-----------------------------------------------`);
console.log(`App Name:   ${selected.appName}`);
console.log(`App ID:     ${selected.appId}`);
console.log(`Server URL: ${selected.url}`);
console.log(`-----------------------------------------------\n`);

// 1. Write capacitor.config.ts
const capConfigPath = path.join(projectRoot, 'capacitor.config.ts');
const capConfigContent = `import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: '${selected.appId}',
  appName: '${selected.appName}',
  webDir: 'public',
  server: {
    url: '${selected.url}',
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#e8eaf0',
    },
    Keyboard: {
      resize: KeyboardResize.Body,
      style: KeyboardStyle.Light,
    },
  },
};

export default config;
`;

try {
  fs.writeFileSync(capConfigPath, capConfigContent, 'utf8');
  console.log('✅ capacitor.config.ts updated.');
} catch (err) {
  console.error('❌ Failed to update capacitor.config.ts:', err.message);
  process.exit(1);
}

// 2. Update android/app/build.gradle
const buildGradlePath = path.join(projectRoot, 'android', 'app', 'build.gradle');
if (fs.existsSync(buildGradlePath)) {
  try {
    let content = fs.readFileSync(buildGradlePath, 'utf8');
    
    // Replace applicationId "..."
    content = content.replace(/applicationId\s+["'].*?["']/g, `applicationId "${selected.appId}"`);
    
    fs.writeFileSync(buildGradlePath, content, 'utf8');
    console.log('✅ android/app/build.gradle (applicationId) updated.');
  } catch (err) {
    console.error('❌ Failed to update build.gradle:', err.message);
  }
} else {
  console.warn('⚠️ android/app/build.gradle not found. Skipping gradle update.');
}

// 3. Update android/app/src/main/res/values/strings.xml
const stringsXmlPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');
if (fs.existsSync(stringsXmlPath)) {
  try {
    let content = fs.readFileSync(stringsXmlPath, 'utf8');
    
    // Replace string tags
    content = content.replace(/<string name="app_name">.*?<\/string>/g, `<string name="app_name">${selected.appName}</string>`);
    content = content.replace(/<string name="title_activity_main">.*?<\/string>/g, `<string name="title_activity_main">${selected.appName}</string>`);
    content = content.replace(/<string name="package_name">.*?<\/string>/g, `<string name="package_name">${selected.appId}</string>`);
    content = content.replace(/<string name="custom_url_scheme">.*?<\/string>/g, `<string name="custom_url_scheme">${selected.appId}</string>`);
    
    fs.writeFileSync(stringsXmlPath, content, 'utf8');
    console.log('✅ android/app/src/main/res/values/strings.xml updated.');
  } catch (err) {
    console.error('❌ Failed to update strings.xml:', err.message);
  }
} else {
  console.warn('⚠️ strings.xml not found. Skipping values update.');
}

// 4. Swap google-services.json if specific files exist
const prodGoogleJson = path.join(projectRoot, 'android', 'app', 'google-services.prod.json');
const testGoogleJson = path.join(projectRoot, 'android', 'app', 'google-services.test.json');
const targetGoogleJson = path.join(projectRoot, 'android', 'app', 'google-services.json');

const sourceFile = env === 'prod' ? prodGoogleJson : testGoogleJson;

if (fs.existsSync(sourceFile)) {
  try {
    fs.copyFileSync(sourceFile, targetGoogleJson);
    console.log(`✅ google-services.json updated from google-services.${env}.json.`);
  } catch (err) {
    console.error(`❌ Failed to copy google-services.${env}.json:`, err.message);
  }
} else {
  console.log(`ℹ️ No custom google-services.${env}.json found. Using existing google-services.json.`);
  console.log(`⚠️ Reminder: Ensure your package "${selected.appId}" is registered in Firebase Console!`);
}

// 5. Run Capacitor Sync
const nodeMajorVersion = parseInt(process.versions.node.split('.')[0], 10);
if (nodeMajorVersion < 22) {
  console.log('\n⚠️ Node.js version is < 22. Skipping "npx cap sync" (only required for native Android builds, which you do on your Mac).');
  console.log('✨ Configuration switch complete! Environment configured successfully.');
} else {
  console.log('\n🔄 Running "npx cap sync" to apply changes natively...');
  try {
    execSync('npx cap sync', { stdio: 'inherit', cwd: projectRoot });
    console.log('\n✨ Configuration switch complete! You are ready to build in Android Studio.');
  } catch (err) {
    console.error('\n❌ Capacitor Sync failed. Please run "npx cap sync" manually.');
  }
}

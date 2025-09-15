// import { AppRegistry } from 'react-native';
// import App from './app/(tabs)/index'; // 确保路径正确指向你的根组件

// AppRegistry.registerComponent('StepsMiniApp', () => App);

import { AppRegistry } from 'react-native';
import { ExpoRoot } from 'expo-router';

// 让 expo-router 扫描 ./app 目录
function Root() {
  const ctx = (require as any).context ? (require as any).context('./app') : undefined;
  return <ExpoRoot context={ctx} />;
}

AppRegistry.registerComponent('LinkerMiniApp', () => Root);
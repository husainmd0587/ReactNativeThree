/**
 * @format
 */
import 'fast-text-encoding';
import 'react-native-url-polyfill/auto'
import {AppRegistry,Platform} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

if (typeof navigator === 'undefined') {
  global.navigator = { userAgent: 'node' }
} else if (!navigator.userAgent) {
  navigator.userAgent = 'node'
}

process.env.EXPO_OS = Platform.OS;

AppRegistry.registerComponent(appName, () => App);

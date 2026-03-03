/**
 * @format
 */

// Globals de Node (Buffer, process) para SDKs que los esperan (p. ej. Kinesis WebRTC)
require('node-libs-react-native/globals');

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);

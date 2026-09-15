import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FpsCounter } from './src/components/FpsCounter';
import { TextStage } from './src/components/TextStage';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TextStage />
        {__DEV__ && <FpsCounter />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

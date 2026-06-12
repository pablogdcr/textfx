import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TextStage } from './src/components/TextStage';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TextStage />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

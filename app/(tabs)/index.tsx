import React, { useRef, useState, useEffect } from 'react';
import { View, Animated, PanResponder, Dimensions, StyleSheet, DeviceEventEmitter} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';

import CameraModalScreen from '@/src/screens/CameraModalScreen';
import HomeScreen from '@/src/screens/Home';

const { height } = Dimensions.get('window');



export default function TabIndex() {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(height)).current; 
  
  const [isTabBarVisible, setIsTabBarVisible] = useState(false);

  const openHome = () => {
    setIsTabBarVisible(true); 
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
  };

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('SET_TAB_BAR', (visible) => {
      setIsTabBarVisible(visible);
    });
    return () => sub.remove();
  }, []);

  const panResponderCamera = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dy < -20, // Kích hoạt khi vuốt lên
      onPanResponderRelease: (_, gs) => {
        if (gs.dy < -50 || gs.vy < -0.5) openHome();
      }
    })
  ).current;

  return (
    <View style={styles.container}>
      
      <Tabs.Screen 
        options={{ 
          tabBarStyle: { 
            display: isTabBarVisible ? 'flex' : 'none',
            backgroundColor: '#161618',
            borderTopWidth: 0
          } 
        }} 
      />

      <View style={StyleSheet.absoluteFill} {...panResponderCamera.panHandlers}>
        <CameraModalScreen isRootMode={true} onSaveSuccess={openHome} />
      </View>

      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY }], backgroundColor: '#161618' }]}>
        <HomeScreen />
      </Animated.View>
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' }
});
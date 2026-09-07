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
  
  // 🚀 STATE ĐIỀU KHIỂN TAB BAR: Mới vào app là false (Ẩn)
  const [isTabBarVisible, setIsTabBarVisible] = useState(false);

  const openHome = () => {
    setIsTabBarVisible(true); // Vuốt lên là bật Tab Bar
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
  };

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('SET_TAB_BAR', (visible) => {
      setIsTabBarVisible(visible);
    });
    return () => sub.remove();
  }, []);

  // PAN 1: Chỉ giữ lại logic vuốt lên từ Camera
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
      
      {/* Khi state = true (đã mở Home), thẻ này sẽ đè lệnh 'display: none' của _layout.tsx */}
      <Tabs.Screen 
        options={{ 
          tabBarStyle: { 
            display: isTabBarVisible ? 'flex' : 'none',
            backgroundColor: '#161618',
            borderTopWidth: 0
          } 
        }} 
      />

      {/* LỚP CAMERA BÊN DƯỚI CÙNG (Thêm callback onSaveSuccess để lưu xong tự động vuốt màn Home lên) */}
      <View style={StyleSheet.absoluteFill} {...panResponderCamera.panHandlers}>
        <CameraModalScreen isRootMode={true} onSaveSuccess={openHome} />
      </View>

      {/* LỚP HOMESCREEN TRƯỢT LÊN VÀ Ở LẠI LUÔN (Đã xóa vạch kéo xuống) */}
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY }], backgroundColor: '#161618' }]}>
        <HomeScreen />
      </Animated.View>
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' }
});
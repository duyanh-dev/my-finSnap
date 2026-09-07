// import React, { useRef } from 'react';
// import { View, Animated, PanResponder, Dimensions, StyleSheet } from 'react-native';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import CameraModalScreen from '../src/screens/CameraModalScreen';
// import HomeScreen from '../src/screens/Home';

// const { height } = Dimensions.get('window');

// export default function AppIndex() {
//   const insets = useSafeAreaInsets();
//   const translateY = useRef(new Animated.Value(height)).current; 

//   const panResponderCamera = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_, gs) => gs.dy < -20, // Vuốt lên
//       onPanResponderRelease: (_, gs) => {
//         if (gs.dy < -50 || gs.vy < -0.5) {
//           Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
//         }
//       }
//     })
//   ).current;

//   const panResponderHome = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_, gs) => gs.dy > 10, // Vuốt xuống
//       onPanResponderRelease: (_, gs) => {
//         if (gs.dy > 50 || gs.vy > 0.5) {
//           Animated.spring(translateY, { toValue: height, useNativeDriver: true, bounciness: 4 }).start();
//         }
//       }
//     })
//   ).current;

//   return (
//     <View style={styles.container}>
      
//       <View style={StyleSheet.absoluteFill} {...panResponderCamera.panHandlers}>
//         <CameraModalScreen isRootMode={true} />
//       </View>

//       <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY }], backgroundColor: '#161618' }]}>
        
//         <View 
//           {...panResponderHome.panHandlers} 
//           style={[styles.invisibleDragZone, { paddingTop: insets.top + 5 }]}
//         >
//           <View style={styles.pill} />
//         </View>

//         <HomeScreen />
        
//       </Animated.View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#000' },
//   invisibleDragZone: { 
//     position: 'absolute', 
//     top: 0, left: 0, right: 0, 
//     height: 70, 
//     zIndex: 9999, 
//     alignItems: 'center' 
//   },
//   pill: { 
//     width: 36, 
//     height: 5, 
//     backgroundColor: 'rgba(255, 255, 255, 0.3)', 
//     borderRadius: 3 
//   }
// });

// app/index.tsx
import { Redirect } from 'expo-router';

export default function App() {
  return <Redirect href="/(tabs)" />;
}
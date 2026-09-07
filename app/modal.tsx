// // app/modal.tsx
// import CameraModalScreen from '@/src/screens/CameraModalScreen';

// export default function Modal() {
//   return <CameraModalScreen />;
// }

// app/modal.tsx
import CameraModalScreen from '../src/screens/CameraModalScreen';

export default function Modal() {
  // Khi gọi từ Router của Home, nó sẽ mặc định isRootMode = false
  return <CameraModalScreen isRootMode={false} />;
}
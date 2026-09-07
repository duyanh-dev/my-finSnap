// src/hooks/useImageUpload.ts
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function useImageUpload() {
  const router = useRouter();

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); // Rung mạnh báo hiệu kích hoạt
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Thiếu quyền", "Hãy cho phép truy cập thư viện ảnh để tải hóa đơn lên nhé!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      // Bắn thẳng sang Modal Camera và truyền ảnh vào param `oldImage`
      // CameraModalScreen của ông sẽ tự hiểu và bật ExpenseForm lên luôn!
      router.push({
        pathname: '/modal',
        params: { oldImage: result.assets[0].uri }
      });
    }
  };

  return { pickImage };
}
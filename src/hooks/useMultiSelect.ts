// Đường dẫn: src/hooks/useMultiSelect.ts
import { useState } from 'react';
import { Alert, DeviceEventEmitter } from 'react-native'; // 🚀 Thêm DeviceEventEmitter
import * as Haptics from 'expo-haptics';
import { deleteExpense } from '../components/services/database';

export default function useMultiSelect(onDeleteSuccess: () => void) {
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const toggleSelectMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const nextState = !isSelectMode;
    setIsSelectMode(nextState);
    setSelectedIds([]); 
    // 🚀 PHÁT TÍN HIỆU: Bật Select Mode -> Ẩn Tab Bar (false), Tắt Select Mode -> Hiện Tab Bar (true)
    DeviceEventEmitter.emit('SET_TAB_BAR', !nextState);
  };

  const toggleSelection = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = (allIds: number[]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds(allIds);
  };

  const deselectAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds([]);
  };

  const clearSelection = () => {
    setIsSelectMode(false);
    setSelectedIds([]);
    // 🚀 PHÁT TÍN HIỆU: Khi xóa xong hoặc gắn thẻ xong -> Hiện lại Tab Bar
    DeviceEventEmitter.emit('SET_TAB_BAR', true);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    Alert.alert(
      "Xóa hàng loạt?",
      `Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedIds.length} mục đã chọn không?`,
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Xóa", 
          style: "destructive", 
          onPress: () => {
            selectedIds.forEach(id => deleteExpense(id));
            clearSelection(); // Hàm này sẽ gọi hiện Tab Bar lại luôn
            onDeleteSuccess();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } 
        }
      ]
    );
  };

  return { isSelectMode, selectedIds, toggleSelectMode, toggleSelection, selectAll, deselectAll, handleDeleteSelected, clearSelection };
}
// Thêm chữ /legacy vào đuôi
import * as FileSystem from 'expo-file-system/legacy';

export const saveImageToPermanentStorage = async (tempUri: string) => {
  try {
    // 1. Định nghĩa thư mục lưu trữ vĩnh viễn của App
    const permanentDir = FileSystem.documentDirectory + 'FinSnap_Receipts/';
    
    // 2. Kiểm tra xem thư mục này tồn tại chưa, chưa có thì tạo
    const folderInfo = await FileSystem.getInfoAsync(permanentDir);
    if (!folderInfo.exists) {
      await FileSystem.makeDirectoryAsync(permanentDir, { intermediates: true });
    }

    // 3. Tạo tên file duy nhất (dùng timestamp để không bị trùng)
    const fileName = `receipt_${Date.now()}.jpg`;
    const permanentUri = permanentDir + fileName;

    // 4. Di chuyển (Move) hoặc Copy file từ Cache sang DocumentDirectory
    await FileSystem.copyAsync({
      from: tempUri,
      to: permanentUri
    });

    return permanentUri; // Trả về đường dẫn vĩnh viễn này để lưu vào Database
  } catch (error) {
    console.error("Lỗi khi lưu ảnh vĩnh viễn:", error);
    return tempUri; // Nếu lỗi thì trả về cái tạm để dùng chữa cháy
  }
};
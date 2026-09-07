import * as FileSystem from 'expo-file-system/legacy';

export const saveImageToPermanentStorage = async (tempUri: string) => {
  try {
    const permanentDir = FileSystem.documentDirectory + 'FinSnap_Receipts/';
    
    const folderInfo = await FileSystem.getInfoAsync(permanentDir);
    if (!folderInfo.exists) {
      await FileSystem.makeDirectoryAsync(permanentDir, { intermediates: true });
    }

    const fileName = `receipt_${Date.now()}.jpg`;
    const permanentUri = permanentDir + fileName;

    await FileSystem.copyAsync({
      from: tempUri,
      to: permanentUri
    });

    return permanentUri; 
  } catch (error) {
    console.error("Lỗi khi lưu ảnh vĩnh viễn:", error);
    return tempUri; 
  }
};
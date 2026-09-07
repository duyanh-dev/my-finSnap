// import React, { useState } from 'react';
// import { 
//   View, 
//   Text, 
//   TouchableOpacity, 
//   StyleSheet, 
//   ActivityIndicator, 
//   ScrollView, 
//   Dimensions,
//   Image,
//   Platform
// } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';
// import { Ionicons } from '@expo/vector-icons';
// import { getRawTextFromOCR } from '../components/services/ocr_service';
// import { deepAnalyzeReceipt } from '../components/services/price_brain';

// const { width } = Dimensions.get('window');

// interface Props {
//   onResult: (amount: number) => void;
//   onClose: () => void;
// }

// export default function ReceiptScanner({ onResult, onClose }: Props) {
//   const [loading, setLoading] = useState(false);
//   const [debugInfo, setDebugInfo] = useState<any>(null);
//   const [previewUri, setPreviewUri] = useState<string | null>(null);
//   const [finalAmount, setFinalAmount] = useState<number>(0);

//   const processImage = async (uri: string) => {
//     try {
//       setLoading(true);
//       setPreviewUri(uri);
//       setDebugInfo(null);
//       setFinalAmount(0);
      
//       const rawText = await getRawTextFromOCR(uri);
//       const result = deepAnalyzeReceipt(rawText);
      
//       setLoading(false);
//       setDebugInfo(result); 
//       setFinalAmount(result.finalAmount);

//     } catch (error) {
//       setLoading(false);
//       console.error("Lỗi quét:", error);
//     }
//   };

//   const pickImage = async (type: 'camera' | 'library') => {
//     const options: ImagePicker.ImagePickerOptions = {
//       mediaTypes: ImagePicker.MediaTypeOptions.Images,
//       allowsEditing: true, 
//       quality: 0.8,
//     };

//     const result = type === 'camera' 
//       ? await ImagePicker.launchCameraAsync(options)
//       : await ImagePicker.launchImageLibraryAsync(options);

//     if (!result.canceled) {
//       processImage(result.assets[0].uri);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       {/* Header */}
//       <View style={styles.header}>
//         <TouchableOpacity onPress={onClose}>
//           <Ionicons name="close" size={28} color="#fff" />
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>FINSNAP AI SCAN</Text>
//         <TouchableOpacity onPress={() => {setPreviewUri(null); setDebugInfo(null); setFinalAmount(0);}}>
//             <Text style={{color: '#666', fontWeight: 'bold'}}>RESET</Text>
//         </TouchableOpacity>
//       </View>

//       <ScrollView contentContainerStyle={styles.scrollContent}>
//         {/* Preview Ảnh */}
//         <View style={styles.imagePreviewBox}>
//           {previewUri ? (
//             <Image source={{ uri: previewUri }} style={styles.previewImg} />
//           ) : (
//             <View style={styles.placeholderBox}>
//               <Ionicons name="scan-outline" size={50} color="#222" />
//               <Text style={styles.placeholderText}>Chụp hóa đơn để bắt đầu</Text>
//             </View>
//           )}
//         </View>

//         {/* Nút chụp/chọn ảnh */}
//         {!loading && !finalAmount && (
//             <View style={styles.btnGroup}>
//                 <TouchableOpacity style={styles.mainBtn} onPress={() => pickImage('camera')}>
//                     <Ionicons name="camera" size={20} color="#000" />
//                     <Text style={styles.btnText}>CHỤP HÓA ĐƠN</Text>
//                 </TouchableOpacity>

//                 <TouchableOpacity style={styles.subBtn} onPress={() => pickImage('library')}>
//                     <Ionicons name="images-outline" size={20} color="#FFD700" />
//                     <Text style={[styles.btnText, { color: '#FFD700' }]}>CHỌN TỪ THƯ VIỆN</Text>
//                 </TouchableOpacity>
//             </View>
//         )}

//         {/* Trạng thái Loading */}
//         {loading && (
//           <View style={styles.loadingContainer}>
//             <ActivityIndicator size="large" color="#FFD700" />
//             <Text style={styles.loadingText}>AI ĐANG SOI HÓA ĐƠN...</Text>
//           </View>
//         )}

//         {/* DEBUG PANEL - Giờ ông soi thoải mái nhé */}
//         {debugInfo && !loading && (
//           <View style={styles.debugContainer}>
//             <Text style={styles.debugTitle}>🔍 NHẬT KÝ PHÂN TÍCH</Text>
            
//             <Text style={styles.debugLabel}>Các số tiền tìm được:</Text>
//             {debugInfo.allCandidates.map((c: any, i: number) => (
//                 <View key={i} style={styles.debugRow}>
//                     <Text style={[styles.debugVal, i === 0 && {color: '#FFD700'}]}>
//                         {c.val.toLocaleString()}đ — {c.score.toFixed(1)} pts
//                     </Text>
//                     <Text style={styles.debugReason}>{c.reason}</Text>
//                 </View>
//             ))}

//             <Text style={styles.debugLabel}>Văn bản thô đọc được:</Text>
//             <View style={styles.rawTextBox}>
//               <Text style={styles.rawText}>{debugInfo.rawText}</Text>
//             </View>
//           </View>
//         )}
//       </ScrollView>

//       {/* ACTION BAR - HIỆN KHI CÓ KẾT QUẢ */}
//       {finalAmount > 0 && !loading && (
//         <View style={styles.resultBar}>
//             <View>
//                 <Text style={styles.resultLabel}>SỐ TIỀN PHÁT HIỆN:</Text>
//                 <Text style={styles.resultValue}>{finalAmount.toLocaleString()} VNĐ</Text>
//             </View>
//             <TouchableOpacity style={styles.confirmBtn} onPress={() => onResult(finalAmount)}>
//                 <Text style={styles.confirmBtnText}>DÙNG SỐ NÀY</Text>
//                 <Ionicons name="checkmark-circle" size={20} color="#000" />
//             </TouchableOpacity>
//         </View>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#000' },
//   header: { 
//     flexDirection: 'row', 
//     justifyContent: 'space-between', 
//     alignItems: 'center', 
//     paddingTop: 60, 
//     paddingHorizontal: 20,
//     paddingBottom: 15
//   },
//   headerTitle: { color: '#FFD700', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
//   scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
//   imagePreviewBox: { 
//     width: '100%', 
//     height: 220, 
//     backgroundColor: '#0a0a0a', 
//     borderRadius: 30, 
//     overflow: 'hidden',
//     marginBottom: 20,
//     borderWidth: 1,
//     borderColor: '#1a1a1a',
//     justifyContent: 'center',
//     alignItems: 'center'
//   },
//   previewImg: { width: '100%', height: '100%', resizeMode: 'contain' },
//   placeholderBox: { alignItems: 'center', opacity: 0.5 },
//   placeholderText: { color: '#fff', marginTop: 10, fontSize: 12 },
//   btnGroup: { gap: 10 },
//   mainBtn: { 
//     backgroundColor: '#FFD700', 
//     flexDirection: 'row', 
//     height: 55, 
//     borderRadius: 15, 
//     alignItems: 'center', 
//     justifyContent: 'center', 
//     gap: 8 
//   },
//   subBtn: { 
//     backgroundColor: 'transparent', 
//     borderWidth: 1, 
//     borderColor: '#FFD700', 
//     flexDirection: 'row', 
//     height: 55, 
//     borderRadius: 15, 
//     alignItems: 'center', 
//     justifyContent: 'center', 
//     gap: 8 
//   },
//   btnText: { fontWeight: '900', fontSize: 13 },
//   loadingContainer: { padding: 30, alignItems: 'center' },
//   loadingText: { color: '#FFD700', fontSize: 11, fontWeight: 'bold', marginTop: 10 },
//   debugContainer: { 
//     marginTop: 20, 
//     backgroundColor: '#050505', 
//     padding: 15, 
//     borderRadius: 20, 
//     borderWidth: 1, 
//     borderColor: '#111' 
//   },
//   debugTitle: { color: '#FFD700', fontSize: 12, fontWeight: 'bold', marginBottom: 15 },
//   debugLabel: { color: '#444', fontSize: 10, fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
//   debugRow: { marginBottom: 10, borderLeftWidth: 2, borderLeftColor: '#222', paddingLeft: 10 },
//   debugVal: { color: '#fff', fontSize: 13, fontWeight: '800' },
//   debugReason: { color: '#555', fontSize: 10, marginTop: 2 },
//   rawTextBox: { backgroundColor: '#080808', padding: 10, borderRadius: 10, marginTop: 5 },
//   rawText: { color: '#333', fontSize: 9, lineHeight: 14, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
//   resultBar: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     backgroundColor: '#111',
//     padding: 25,
//     paddingBottom: 40,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     borderTopLeftRadius: 30,
//     borderTopRightRadius: 30,
//     borderTopWidth: 1,
//     borderTopColor: '#222'
//   },
//   resultLabel: { color: '#666', fontSize: 10, fontWeight: 'bold' },
//   resultValue: { color: '#fff', fontSize: 20, fontWeight: '900' },
//   confirmBtn: { 
//     backgroundColor: '#FFD700', 
//     paddingHorizontal: 20, 
//     height: 50, 
//     borderRadius: 12, 
//     flexDirection: 'row', 
//     alignItems: 'center', 
//     gap: 8 
//   },
//   confirmBtnText: { color: '#000', fontWeight: '900', fontSize: 14 }
// });
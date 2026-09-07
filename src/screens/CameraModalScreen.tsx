import React, { useState, useRef, useEffect, useCallback } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Animated, Platform, Keyboard, Alert, DeviceEventEmitter } from "react-native";
import { useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import * as ImagePicker from "expo-image-picker";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { addExpense, updateExpense, getAllTags, saveTag, getExpenses } from "../components/services/database";
import { getCurrencyConfig, convertCurrency } from "../components/services/settings_db";
import { Currency } from "../types";

import CameraViewfinder from "../components/features/camera/CameraViewfinder";
import ExpenseForm from "../components/features/camera/ExpenseForm";
import TagPickerModal from "../components/features/camera/TagPickerModal";
import { saveImageToPermanentStorage } from '../components/services/storage_service';

const ZOOM_LEVELS = [0.5, 1, 2, 3];
const ZOOM_1X = 0.035;

interface CameraProps {
  isRootMode?: boolean;
  onSaveSuccess?: () => void;
}

export default function CameraModalScreen({ isRootMode = false, onSaveSuccess }: CameraProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [permission, requestPermission] = useCameraPermissions();

  const isFromExplore = !!params.tag;
  const editId = params.editId ? String(params.editId) : null;
  const [photo, setPhoto] = useState<string | null>(params.oldImage ? String(params.oldImage) : null);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>({ label: "", code: (params.oldCurrency as string) || "VNĐ", symbol: params.oldCurrency === "VNĐ" ? "đ" : "$", rate: 1 });
  
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [flash, setFlash] = useState<"off" | "on" | "auto">("off");
  const [zoom, setZoom] = useState(ZOOM_1X);
  
  const [focusPos, setFocusPos] = useState({ x: 0, y: 0 });
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>(params.tag ? String(params.tag) : (params.oldTag ? String(params.oldTag) : ""));
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [todayTotalDisplay, setTodayTotalDisplay] = useState("--");

  const cameraRef = useRef<any>(null);
  const zoomRef = useRef(ZOOM_1X);
  const zoomIdx = useRef(1);
  const animationFrameId = useRef<number | null>(null);
  const focusAlpha = useRef(new Animated.Value(0)).current;
  const focusTimeout = useRef<any>(null);
  const isPinching = useRef(false);
  const startDist = useRef<number | null>(null);
  const startZoom = useRef<number>(ZOOM_1X);

  // 🚀 STATE ANIMATION CHO HIỆU ỨNG CHỚP FLASH 
  const fakeFlashAlpha = useRef(new Animated.Value(0)).current;

  const resetCameraState = () => {
    setPhoto(null);
    setAmount("");
    setSelectedTag("");
    setZoom(ZOOM_1X);
    zoomIdx.current = 1;
    setAvailableTags(getAllTags());
  };

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    const initConfig = async () => {
      const config = await getCurrencyConfig();
      setCurrency(config);
      setAvailableTags(getAllTags());

      try {
        const allExpenses = getExpenses() as any[];
        if (allExpenses && allExpenses.length > 0) {
          const now = new Date();
          const todayData = allExpenses.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate.toDateString() === now.toDateString();
          });
          const total = todayData.reduce((sum, item) => sum + convertCurrency(Number(item.amount), item.currency, config.code), 0);
          setTodayTotalDisplay(total.toLocaleString('vi-VN'));
        } else {
          setTodayTotalDisplay("0");
        }
      } catch (e) {
        setTodayTotalDisplay("0");
      }

      if (editId && params.oldAmount && params.oldCurrency) {
        const isSameCurrency = params.oldCurrency === config.code;
        let displayValue = "";

        if (isSameCurrency) {
          displayValue = String(params.oldAmount).replace('.', ',');
        } else {
          const converted = convertCurrency(Number(params.oldAmount), String(params.oldCurrency), config.code);
          if (config.code === 'VNĐ') {
            displayValue = Math.round(converted).toString();
          } else {
            displayValue = converted.toFixed(2).replace('.', ',');
            if (displayValue.endsWith(',00')) displayValue = displayValue.split(',')[0];
          }
        }
        setAmount(formatCurrency(displayValue, config.code));
      }
    };
    initConfig();

    return () => { 
      showSub.remove(); 
      hideSub.remove(); 
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current); 
    };
  }, [editId]);

  const formatCurrency = (val: string, forcedCode?: string) => {
    if (!val) return "";
    const activeCode = forcedCode || currency.code;
    let cleanNext = val.replace(/\./g, "");
    if (activeCode === "VNĐ") cleanNext = cleanNext.replace(/,/g, "");
    cleanNext = cleanNext.replace(/[^0-9,]/g, "");
    
    const parts = cleanNext.split(",");
    let integerPart = parts[0];
    let decimalPart = parts[1] !== undefined ? parts[1].substring(0, 2) : null;

    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    if (decimalPart !== null) return `${formattedInteger},${decimalPart}`;
    if (cleanNext.includes(",")) return `${formattedInteger},`;
    return formattedInteger;
  };

  const smoothZoomTo = useCallback((target: number) => {
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    const animate = () => {
      const diff = target - zoomRef.current;
      if (Math.abs(diff) < 0.001) { zoomRef.current = target; setZoom(target); return; }
      const nextZoom = zoomRef.current + diff * 0.15;
      zoomRef.current = nextZoom;
      setZoom(nextZoom);
      animationFrameId.current = requestAnimationFrame(animate);
    };
    animationFrameId.current = requestAnimationFrame(animate);
  }, []);

  const toggleNextZoom = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    zoomIdx.current = (zoomIdx.current + 1) % ZOOM_LEVELS.length;
    const nextVal = ZOOM_LEVELS[zoomIdx.current];
    smoothZoomTo(Math.min(1, nextVal === 0.5 ? 0 : ZOOM_1X * nextVal));
  };

  const onGrant = (e: any) => {
    const touches = e.nativeEvent.touches;
    isPinching.current = touches.length > 1;

    if (!isPinching.current) {
      const { pageX, pageY } = e.nativeEvent;
      
      // 🚀 MẸO RUNG LENS (LENS JITTER): Ép phần cứng quét lại tiêu cự tự động
      setZoom(prev => Math.min(prev + 0.00001, 1));
      setTimeout(() => setZoom(prev => Math.max(prev - 0.00001, 0)), 150);

      if (focusTimeout.current) clearTimeout(focusTimeout.current);
      focusTimeout.current = setTimeout(() => {
        setFocusPos({ x: pageX, y: pageY - insets.top - 50 });
        focusAlpha.setValue(0);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.sequence([
          Animated.timing(focusAlpha, { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.timing(focusAlpha, { toValue: 0, duration: 200, delay: 500, useNativeDriver: true }),
        ]).start();
      }, 50);
    }
  };

  const onMove = (e: any) => {
    const touches = e.nativeEvent.touches;
    if (touches.length === 2) {
      isPinching.current = true;
      if (focusTimeout.current) {
        clearTimeout(focusTimeout.current);
        focusTimeout.current = null;
      }
      focusAlpha.setValue(0); 
      const dist = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
      if (startDist.current === null) {
        startDist.current = dist;
        startZoom.current = zoomRef.current;
      } else {
        const delta = (dist - startDist.current) / 400;
        const nextZoom = Math.max(0, Math.min(1, startZoom.current + delta));
        zoomRef.current = nextZoom;
        setZoom(nextZoom);
      }
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    // 🚀 BẬT HIỆU ỨNG CHỚP MÀN HÌNH ĐỂ ĐÁNH LỪA THỊ GIÁC (UI FLASH)
    Animated.sequence([
      Animated.timing(fakeFlashAlpha, { toValue: 1, duration: 40, useNativeDriver: true }),
      Animated.timing(fakeFlashAlpha, { toValue: 0, duration: 300, useNativeDriver: true })
    ]).start();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Giảm nhẹ quality xuống 0.7 để Flash phần cứng phản hồi lẹ hơn
    const res = await cameraRef.current.takePictureAsync({ quality: 0.7, shutterSound: true });
    setPhoto(res.uri);
  };

  const handlePickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Thiếu quyền", "Hãy cho phép truy cập thư viện ảnh để chọn hóa đơn nhé!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSaveToGallery = async () => {
    if (!photo) return;
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      try {
        await MediaLibrary.saveToLibraryAsync(photo);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Thành công", "Đã lưu ảnh!");
      } catch (e) { Alert.alert("Lỗi", "Không thể lưu ảnh!"); }
    }
  };

  const handleFinalSave = async () => {
    if (!amount) return Alert.alert("Thiếu tiền!", "Ông chưa nhập số tiền.");
    
    let finalPhotoUri = photo!;
    if (finalPhotoUri && (finalPhotoUri.includes('Cache') || finalPhotoUri.includes('ImagePicker'))) {
      finalPhotoUri = await saveImageToPermanentStorage(finalPhotoUri);
    }

    const normalized = amount.replace(/\./g, "").replace(",", ".");
    const numAmount = parseFloat(normalized);
    const baseAmount = numAmount * (currency.rate || 1);
    
    if (editId && editId !== "undefined") {
      updateExpense(Number(editId), normalized, currency.code, baseAmount, finalPhotoUri, selectedTag);
    } else {
      addExpense(normalized, currency.code, baseAmount, finalPhotoUri, selectedTag);
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    DeviceEventEmitter.emit('REFRESH_HOME');

    if (isRootMode && onSaveSuccess) {
      resetCameraState(); 
      onSaveSuccess();    
    } else {
      router.back();
    }
  };

  if (!permission?.granted) {
    return (
      <View style={styles.center}><TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}><Text style={styles.yellowText}>MỞ CAMERA</Text></TouchableOpacity></View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      
      {photo && (
        <View style={[styles.headerAreaForm, isKeyboardVisible && { height: 35 }]}>
          <View style={styles.pill} />
          <TouchableOpacity 
            style={styles.closeIconForm} 
            onPress={() => {
              if (isRootMode) { resetCameraState(); } else { router.back(); }
            }}
          >
            <Ionicons name="close-circle" size={32} color="#333" />
          </TouchableOpacity>
        </View>
      )}

      {!photo ? (
        <View style={styles.locketContainer}>
          
          <View style={styles.topHeaderBar}>
            <View style={{ width: 44 }} />
            
            <TouchableOpacity style={styles.headerPillBtn}>
              <Ionicons name="wallet" size={16} color="#fff" style={{marginRight: 6}} />
              <Text style={styles.headerPillText}>Hôm nay: {todayTotalDisplay}{currency.symbol}</Text>
            </TouchableOpacity>
            
            {!isRootMode ? (
              <TouchableOpacity style={styles.headerRoundBtn} onPress={() => router.back()}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 44 }} />
            )}
          </View>

          <View style={styles.cameraViewport}>
            <CameraViewfinder 
              ref={cameraRef} 
              facing={facing} 
              zoom={zoom} 
              flash={flash}     // 🚀 FLASH TRUYỀN XUỐNG NATIVE
              focusPos={focusPos} 
              focusAlpha={focusAlpha} 
              onGrant={onGrant} 
              onMove={onMove} 
              onRelease={() => { startDist.current = null; isPinching.current = false; }} 
            />

            {/* 🚀 LỚP MÀNG TRẮNG CHỚP LÊN ĐỂ ĐÁNH LỪA THỊ GIÁC (UI FLASH) */}
            <Animated.View 
              style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: fakeFlashAlpha, zIndex: 99 }]} 
              pointerEvents="none" 
            />

            <View style={styles.cameraInnerControls}>
               <TouchableOpacity style={styles.iconCircleBtn} onPress={() => {
                 Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                 setFlash(f => f === "off" ? "on" : f === "on" ? "auto" : "off");
               }}>
                  <Ionicons 
                    name={flash === "on" ? "flash" : flash === "auto" ? "flash-outline" : "flash-off"} 
                    size={20} 
                    color={flash === "on" ? "#FFD700" : "#fff"} 
                  />
               </TouchableOpacity>
               
               <TouchableOpacity style={styles.iconCircleBtn} onPress={toggleNextZoom}>
                  <Text style={styles.zoomLabelText}>
                    {zoom < 0.01 ? "1x" : (zoom / ZOOM_1X).toFixed(0) + "x"}
                  </Text>
               </TouchableOpacity>
            </View>
          </View>

          <View style={styles.bottomAreaContainer}>
             <View style={styles.captureRow}>
               
               <TouchableOpacity style={styles.galleryThumb} onPress={handlePickImage}>
                 <Ionicons name="images" size={22} color="#fff" />
               </TouchableOpacity>

               <TouchableOpacity style={styles.captureRing} onPress={handleCapture}>
                  <View style={styles.captureButtonInner} />
               </TouchableOpacity>

               <TouchableOpacity style={styles.flipBtn} onPress={() => {
                  setFacing(f => f === "back" ? "front" : "back"); 
                  zoomRef.current = ZOOM_1X; setZoom(ZOOM_1X); 
               }}>
                  <Ionicons name="sync" size={28} color="#fff" />
               </TouchableOpacity>
             </View>

             {isRootMode && (
               <View style={styles.swipeHistoryCue}>
                 <View style={styles.historyCueImg}>
                   <Ionicons name="receipt" size={12} color="#fff" />
                 </View>
                 <Text style={styles.historyCueText}>Lịch sử giao dịch</Text>
                 <Ionicons name="chevron-up" size={16} color="#888" />
               </View>
             )}

          </View>
        </View>
      ) : (
        <ExpenseForm 
            photo={photo} 
            amount={amount} 
            currencyCode={currency.code} 
            selectedTag={selectedTag} 
            isFromExplore={isFromExplore} 
            isKeyboardVisible={isKeyboardVisible} 
            isEditMode={!!editId}
            onRetake={() => setPhoto(null)} 
            onSaveToGallery={handleSaveToGallery} 
            onAmountChange={(text) => setAmount(formatCurrency(text))} 
            onOpenTagPicker={() => setShowTagPicker(true)} 
            onRemoveTag={() => setSelectedTag("")} 
            onFinalSave={handleFinalSave} 
        />
      )}

      <TagPickerModal 
          visible={showTagPicker} 
          onClose={() => setShowTagPicker(false)} 
          tags={availableTags} 
          selectedTag={selectedTag} 
          onSelect={setSelectedTag} 
          onCreateQuickTag={(name) => { saveTag(name, "cart", "#FFD700", ""); setSelectedTag(name); setAvailableTags(getAllTags()); }} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerAreaForm: { height: 50, alignItems: "center", justifyContent: "center", zIndex: 100 },
  pill: { width: 40, height: 4, backgroundColor: "#1a1a1a", borderRadius: 2 },
  closeIconForm: { position: "absolute", right: 20 },
  yellowText: { color: "#FFD700", fontWeight: "bold" },
  permissionBtn: { padding: 20, borderWidth: 1, borderColor: "#FFD700", borderRadius: 15 },
  
  locketContainer: { flex: 1, backgroundColor: '#000' },
  
  topHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerRoundBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: '#1c1c1e',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    paddingHorizontal: 15,
    height: 40,
    borderRadius: 20,
  },
  headerPillText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

  cameraViewport: { 
    flex: 1, 
    borderRadius: 45, 
    overflow: 'hidden',
    marginHorizontal: 0,
    position: 'relative' // Để absolute Flash Overlay bám vào
  },
  cameraInnerControls: { 
    position: 'absolute', 
    top: 15, left: 15, right: 15, 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    zIndex: 100 // Đảm bảo nổi trên lớp Flash
  },
  iconCircleBtn: { 
    width: 40, height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  zoomLabelText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  
  bottomAreaContainer: {
    paddingTop: 25,
    paddingBottom: 25, 
    alignItems: 'center'
  },
  captureRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 30,
    marginBottom: 25
  },
  captureRing: { 
    width: 86, height: 86, 
    borderRadius: 43, 
    borderWidth: 5, 
    borderColor: '#FFD700', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  captureButtonInner: { 
    width: 70, height: 70, 
    borderRadius: 35, 
    backgroundColor: '#fff' 
  },
  galleryThumb: { 
    width: 50, height: 50, 
    borderRadius: 16, 
    backgroundColor: '#1c1c1e', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  flipBtn: { 
    width: 50, height: 50, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  swipeHistoryCue: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  historyCueImg: {
    width: 26, height: 26,
    borderRadius: 8,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  historyCueText: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginRight: 5 },
});
/**
 * Project: MyLocketFinance
 * Developer: Bui Duy Anh (anhbui.dev)
 * Shift: UI/UX Focused - Premium Tag List
 */

import React, { useState, useCallback, useRef } from 'react';
import { 
  StyleSheet, View, Text, TouchableOpacity, FlatList, 
  Image, Dimensions, Modal, TextInput, ScrollView, Alert,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Animated
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { 
  getExpenses, getAllTags, saveTag, initDatabase, 
  deleteTag, updateTagFull, deleteExpense 
} from '../../src/components/services/database';
import { getCurrencyConfig, Currency, CURRENCIES } from '../../src/components/services/settings_db';
import { saveImageToPermanentStorage } from '../../src/components/services/storage_service';

const { width, height } = Dimensions.get('window');
const ITEM_WIDTH = (width - 60) / 2; 

export interface Expense { id: number; amount: string; currency: string; amount_base: number; imageUri: string; tag: string; date: string; }
export interface TagInfo { name: string; icon: string; color: string; bgImage: string; totalBase: number; count: number; }

const ICON_LIST = ['cart', 'restaurant', 'airplane', 'car', 'gift', 'cafe', 'game-controller', 'fitness', 'briefcase', 'home', 'heart', 'shirt'];
const COLOR_LIST = ['#FFD700', '#FF6B6B', '#4D96FF', '#6BCB77', '#AC70FF', '#F94C10', '#00DFA2', '#FFFFFF'];

// =====================================================================
// 🚀 COMPONENT THẺ TAG
// =====================================================================
const AlbumListItem = ({ item, currency, onSelect, onEdit, onDelete }: any) => {
  const swipeableRef = useRef<any>(null);

  const formatDisplay = (num: number) => {
    return num.toLocaleString('vi-VN', { maximumFractionDigits: currency.code === 'VNĐ' ? 0 : 2, minimumFractionDigits: 0 });
  };

  const renderRightActions = (progress: any, dragX: Animated.AnimatedInterpolation<any>) => {
    const scale = dragX.interpolate({ inputRange: [-100, 0], outputRange: [1, 0.5], extrapolate: 'clamp' });
    const opacity = dragX.interpolate({ inputRange: [-100, -20, 0], outputRange: [1, 0.5, 0], extrapolate: 'clamp' });

    return (
      <View style={styles.swipeActionContainer}>
        <Animated.View style={[styles.swipeActionBox, { transform: [{ scale }], opacity }]}>
          <TouchableOpacity style={[styles.actionCircle, { backgroundColor: '#333' }]} onPress={() => { swipeableRef.current?.close(); onEdit(item); }}>
            <Ionicons name="pencil" size={20} color={item.color} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCircle, { backgroundColor: '#FF6B6B' }]} onPress={() => { swipeableRef.current?.close(); onDelete(item.name); }}>
            <Ionicons name="trash" size={20} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} overshootRight={false} friction={1.5}>
      <TouchableOpacity 
        activeOpacity={0.8}
        style={styles.albumCard} 
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(item.name); }}
      >
        <View style={styles.cardBgWrapper}>
          {item.bgImage ? (
            <Image source={{ uri: item.bgImage }} style={styles.cardBgImg} blurRadius={12} />
          ) : (
            <View style={[styles.cardBgImg, { backgroundColor: '#222224' }]} />
          )}
          <View style={styles.cardOverlay} />
        </View>

        <View style={styles.cardContent}>
          <View style={[styles.iconBox, { borderColor: item.color }]}>
            <Ionicons name={item.icon as any} size={24} color={item.color} />
          </View>
          
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{item.name.toUpperCase()}</Text>
            <Text style={styles.cardStats}>{item.count} giao dịch • {formatDisplay(item.totalBase / currency.rate)}{currency.symbol}</Text>
          </View>
          
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

// =====================================================================
// 🚀 MÀN HÌNH CHÍNH
// =====================================================================
export default function ExploreScreen() {
  const router = useRouter();
  const [currency, setCurrency] = useState<Currency>(CURRENCIES[0]);
  const [albums, setAlbums] = useState<TagInfo[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [itemsInTag, setItemsInTag] = useState<Expense[]>([]);

  const [isModalOpen, setModalOpen] = useState(false);
  const [isEditAlbum, setIsEditAlbum] = useState(false);
  const [oldTagName, setOldTagName] = useState('');
  const [newName, setNewName] = useState('');
  const [selIcon, setSelIcon] = useState('cart');
  const [selColor, setSelColor] = useState('#FFD700');
  const [selBg, setSelBg] = useState<string | null>(null);

  const tagOrderRef = useRef<string[]>([]);

  const loadData = async () => {
    try {
      initDatabase();
      const config = await getCurrencyConfig();
      setCurrency(config);
      const allExp = (getExpenses() as any[]) || [];
      const allTags = (getAllTags() as any[]) || [];
      
      const tagData = allTags.map(t => {
        const related = allExp.filter(e => e.tag === t.name);
        const totalBase = related.reduce((sum, item) => sum + (Number(item.amount_base) || 0), 0);
        
        let validBg = t.bgImage;
        if (!validBg || validBg.trim() === '') {
           const itemsWithImg = related.filter(r => r.imageUri);
           if (itemsWithImg.length > 0) {
               validBg = itemsWithImg[itemsWithImg.length - 1].imageUri;
           }
        }

        return { name: t.name, icon: t.icon, color: t.color, bgImage: validBg, totalBase, count: related.length };
      });

      if (tagOrderRef.current.length === 0 && tagData.length > 0) {
        tagOrderRef.current = tagData.map(t => t.name);
      } else {
        const existingNames = new Set(tagOrderRef.current);
        tagData.forEach(t => {
          if (!existingNames.has(t.name)) {
            tagOrderRef.current.push(t.name);
          }
        });
      }

      tagData.sort((a, b) => {
        return tagOrderRef.current.indexOf(a.name) - tagOrderRef.current.indexOf(b.name);
      });

      setAlbums(tagData);

      if (selectedTag) {
        setItemsInTag(allExp.filter(i => i.tag === selectedTag));
      }
    } catch (err: any) {
      console.error("Load error:", err.message);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [selectedTag]));

  const handleSaveAlbum = async () => {
    if (!newName.trim()) {
      Alert.alert("Lỗi", "Tên thẻ không được để trống!");
      return;
    }

    const trimmedNewName = newName.trim();

    let finalBg = selBg || '';
    if (finalBg && (finalBg.includes('Cache') || finalBg.includes('ImagePicker') || finalBg.includes('ImageManipulator'))) {
      try { finalBg = await saveImageToPermanentStorage(finalBg); } 
      catch (e) { console.log("Save Image Error:", e); }
    }

    if (isEditAlbum) {
      const idx = tagOrderRef.current.indexOf(oldTagName);
      if (idx !== -1) {
        tagOrderRef.current[idx] = trimmedNewName;
      }

      updateTagFull(oldTagName, trimmedNewName, selIcon, selColor, finalBg);
      if (selectedTag === oldTagName) setSelectedTag(trimmedNewName);
    } else {
      saveTag(trimmedNewName, selIcon, selColor, finalBg);
    }

    setModalOpen(false);
    resetForm();
    loadData();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const resetForm = () => {
    setNewName(''); setSelIcon('cart'); setSelColor('#FFD700'); setSelBg(null); setIsEditAlbum(false);
  };

  const openEditAlbum = (album: TagInfo) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsEditAlbum(true);
    setOldTagName(album.name);
    setNewName(album.name);
    setSelIcon(album.icon);
    setSelColor(album.color);
    setSelBg(album.bgImage);
    setModalOpen(true);
  };

  const confirmDeleteAlbum = (name: string) => {
    Alert.alert("Xóa Thẻ?", `Mục "${name}" sẽ bị xóa, nhưng các hóa đơn bên trong vẫn được giữ lại an toàn ở màn hình chính.`, [
      { text: "Hủy", style: "cancel" },
      { 
        text: "Xóa", 
        style: "destructive", 
        onPress: () => { 
          tagOrderRef.current = tagOrderRef.current.filter(n => n !== name);
          deleteTag(name); 
          loadData(); 
        } 
      }
    ]);
  };

  const confirmDeleteItem = (id: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Xóa giao dịch", "Giao dịch này sẽ bị xóa vĩnh viễn.", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: () => { deleteExpense(id); loadData(); } }
    ]);
  };

  const formatDisplay = (num: number) => {
    return num.toLocaleString('vi-VN', { maximumFractionDigits: currency.code === 'VNĐ' ? 0 : 2, minimumFractionDigits: 0 });
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1, 
      };

      const result = useCamera 
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
        
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const originalUri = result.assets[0].uri;
        
        const manipResult = await ImageManipulator.manipulateAsync(
          originalUri,
          [{ resize: { width: 1080 } }], 
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG } 
        );

        setSelBg(manipResult.uri); 
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert("Lỗi", "Đã có lỗi xảy ra khi xử lý bức ảnh này.");
    }
  };

  if (selectedTag) {
    const info = albums.find(a => a.name === selectedTag);
    return (
      <View style={styles.container}>
        <View style={styles.fixedBg}>
          {info?.bgImage ? (
            <Image source={{ uri: info.bgImage }} style={StyleSheet.absoluteFill} blurRadius={40} />
          ) : null}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />
        </View>

        <View style={styles.albumHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedTag(null)}>
            <Ionicons name="chevron-back" size={28} color={info?.color ?? '#FFD700'} />
          </TouchableOpacity>
          <View style={styles.albumTitleBox}>
            <Text style={styles.albumTitle}>{selectedTag.toUpperCase()}</Text>
            <Text style={[styles.albumSub, { color: info?.color ?? '#FFD700' }]}>
              {formatDisplay((info?.totalBase ?? 0) / currency.rate)}{currency.symbol}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.albumAddBtn, { backgroundColor: info?.color ?? '#FFD700' }]} 
            onPress={() => router.push({ pathname: '/modal', params: { tag: selectedTag } })}
          >
            <Ionicons name="add" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <FlatList
          key="album-grid"
          data={itemsInTag}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/modal', params: { editId: item.id.toString(), oldAmount: item.amount, oldImage: item.imageUri, oldCurrency: item.currency, oldTag: item.tag } })}
              >
                <View style={styles.imageWrapper}>
                    <Image source={{ uri: item.imageUri }} style={styles.itemImg} />
                    <View style={styles.itemPriceBadge}>
                        <Text style={styles.itemPriceText}>{formatDisplay(item.amount_base / currency.rate)}{currency.symbol}</Text>
                    </View>
                </View>
              </TouchableOpacity>

              <View style={styles.itemActionRow}>
                <TouchableOpacity style={styles.actionBtnGrid} onPress={() => router.push({ pathname: '/modal', params: { editId: item.id.toString(), oldAmount: item.amount, oldImage: item.imageUri, oldCurrency: item.currency, oldTag: item.tag } })}>
                  <Ionicons name="pencil" size={16} color="#FFD700" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtnGrid, { marginLeft: 10 }]} onPress={() => confirmDeleteItem(item.id)}>
                  <Ionicons name="trash" size={16} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Thẻ phân loại</Text>
          <TouchableOpacity style={styles.mainAddBtn} onPress={() => { resetForm(); setModalOpen(true); }}>
            <Ionicons name="add" size={26} color="#000" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={albums}
          // Dùng name làm key an toàn vì ta đã giữ đúng vị trí
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <AlbumListItem 
              item={item} 
              currency={currency} 
              onSelect={setSelectedTag} 
              onEdit={openEditAlbum} 
              onDelete={confirmDeleteAlbum} 
            />
          )}
        />

        <Modal visible={isModalOpen} animationType="fade" transparent>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardWrapper}>
              <View style={styles.modalContent}>
                
                <View style={styles.modalTop}>
                  <Text style={styles.modalTitle}>{isEditAlbum ? "Sửa Thẻ" : "Tạo Thẻ Mới"}</Text>
                  <TouchableOpacity style={styles.closeModalBtn} onPress={() => setModalOpen(false)}>
                    <Ionicons name="close" size={24} color="#555" />
                  </TouchableOpacity>
                </View>
                
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <TextInput 
                    style={styles.input} 
                    placeholder="Nhập tên thẻ..." 
                    placeholderTextColor="#666" 
                    value={newName} 
                    onChangeText={setNewName} 
                  />
                  
                  <Text style={styles.label}>BIỂU TƯỢNG</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                    {ICON_LIST.map(i => (
                      <TouchableOpacity key={i} style={[styles.iconPick, selIcon === i && { backgroundColor: selColor }]} onPress={() => { Keyboard.dismiss(); setSelIcon(i); }}>
                        <Ionicons name={i as any} size={22} color={selIcon === i ? "#000" : "#888"} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  
                  <Text style={styles.label}>MÀU SẮC</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 30 }}>
                    {COLOR_LIST.map(c => (
                      <TouchableOpacity key={c} style={[styles.colorPick, { backgroundColor: c }, selColor === c && styles.colorActive]} onPress={() => { Keyboard.dismiss(); setSelColor(c); }} />
                    ))}
                  </ScrollView>

                  <Text style={styles.label}>ẢNH NỀN THẺ (TÙY CHỌN)</Text>
                  <View style={styles.imgActionRow}>
                    <TouchableOpacity style={styles.imgActionBtn} onPress={() => pickImage(true)}>
                      <Ionicons name="camera" size={20} color="#fff" />
                      <Text style={styles.imgText}>Chụp ảnh</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.imgActionBtn} onPress={() => pickImage(false)}>
                      <Ionicons name="image" size={20} color="#fff" />
                      <Text style={styles.imgText}>Thư viện</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {selBg ? (
                     <View style={styles.previewContainer}>
                         <Image source={{ uri: selBg }} style={styles.preview} blurRadius={10} />
                     </View>
                  ) : null}

                  <TouchableOpacity style={[styles.createBtn, { backgroundColor: selColor }]} onPress={handleSaveAlbum}>
                    <Text style={[styles.createBtnText, { color: selColor === '#FFFFFF' ? '#000' : '#000' }]}>
                      {isEditAlbum ? "CẬP NHẬT" : "TẠO THẺ"}
                    </Text>
                  </TouchableOpacity>
                  <View style={{ height: 20 }} />
                </ScrollView>

              </View>
            </KeyboardAvoidingView>
          </TouchableOpacity>
        </Modal>

      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#161618' },
  fixedBg: { ...StyleSheet.absoluteFillObject, zIndex: -1 },
  
  header: { marginTop: 60, paddingHorizontal: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  title: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  mainAddBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFD700', justifyContent: 'center', alignItems: 'center', shadowColor: '#FFD700', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  
  listContainer: { paddingHorizontal: 20, paddingBottom: 120 },
  
  albumCard: { height: 100, borderRadius: 24, marginBottom: 16, backgroundColor: '#222224', elevation: 5, overflow: 'hidden' },
  cardBgWrapper: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 },
  cardBgImg: { width: '100%', height: '100%', resizeMode: 'cover', transform: [{ scale: 1.1 }] },
  cardOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  cardContent: { flexDirection: 'row', alignItems: 'center', height: '100%', paddingHorizontal: 18, zIndex: 10 }, 
  iconBox: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 1 },
  cardInfo: { flex: 1, justifyContent: 'center' },
  cardName: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 },
  cardStats: { color: '#ccc', fontSize: 12, fontWeight: '600' },

  swipeActionContainer: { width: 130, height: 100, justifyContent: 'center', alignItems: 'center', paddingLeft: 10 },
  swipeActionBox: { flexDirection: 'row', gap: 10 },
  actionCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  
  albumHeader: { marginTop: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 30 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  albumTitleBox: { flex: 1, alignItems: 'center' },
  albumTitle: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  albumSub: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  albumAddBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },

  gridContent: { paddingHorizontal: 20, paddingBottom: 100 },
  itemCard: { width: ITEM_WIDTH, marginBottom: 25, marginRight: 20 },
  imageWrapper: { borderRadius: 24, overflow: 'hidden', position: 'relative' },
  itemImg: { width: '100%', aspectRatio: 1 },
  itemPriceBadge: { position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  itemPriceText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  itemActionRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 12, gap: 12 },
  actionBtnGrid: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  keyboardWrapper: { width: '100%', maxHeight: height * 0.9 }, 
  modalContent: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24 },
  modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: '900' },
  closeModalBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
  
  input: { backgroundColor: '#2A2A2C', color: '#fff', paddingHorizontal: 20, paddingVertical: 18, borderRadius: 16, fontSize: 16, marginBottom: 24, fontWeight: 'bold' },
  label: { color: '#888', fontSize: 12, fontWeight: '700', marginBottom: 12, letterSpacing: 0.5 },
  
  iconPick: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#2A2A2C', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  colorPick: { width: 40, height: 40, borderRadius: 20, marginRight: 15 },
  colorActive: { borderWidth: 3, borderColor: '#fff' },
  
  imgActionRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  imgActionBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#2A2A2C', paddingVertical: 16, borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 8 },
  imgText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  
  previewContainer: { width: '100%', height: 120, borderRadius: 16, overflow: 'hidden', marginBottom: 24, backgroundColor: '#2A2A2C' },
  preview: { width: '100%', height: '100%', resizeMode: 'cover' },
  
  createBtn: { paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5 },
  createBtnText: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 }
});
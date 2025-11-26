
import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Animated,
  Dimensions,
  Alert,
  Pressable,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenWrapper from '../../../components/ScreenWrapper';
import MediaContent, { MediaContentHandle } from './media-preview/MediaContent';
import UserHeader from './media-preview/UserHeader';
import ActionButtons from './media-preview/ActionButtons';
import { User } from '@supabase/supabase-js';

const { height: WINDOW_HEIGHT, width: WINDOW_WIDTH } = Dimensions.get('window');

interface MediaPreviewProps {
  media: { uri: string; type: 'image' | 'video' };
  onPost: (reviewData: any) => Promise<void>;
  onClose?: () => void;
  initialReviewData?: ReviewData;
  isEditing?: boolean;
  user?: User | null;
}

interface ReviewData {
  rating: number;
  review: string;
  title: string;
  overlayText?: string;
  overlayTextPosition?: { x: number; y: number };
}

export default function MediaPreview({
  media,
  onPost,
  onClose,
  initialReviewData,
  isEditing = false,
  user,
}: MediaPreviewProps) {
  const [reviewData, setReviewData] = useState<ReviewData>(
    initialReviewData || { rating: 0, review: '', title: '' }
  );
  const [originalReviewData] = useState<ReviewData | null>(initialReviewData || null);
  const [activeInput, setActiveInput] = useState<'rating' | 'review' | 'title' | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [postLogs, setPostLogs] = useState<string[]>([]);
  const insets = useSafeAreaInsets();

  const [isEditingText, setIsEditingText] = useState(false);
  const [overlayText, setOverlayText] = useState(initialReviewData?.overlayText || '');
  const mediaContentRef = useRef<MediaContentHandle | null>(null);

  const sheetHeight = 260;
  const collapsedPeek = 96;

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: activeInput || isEditingText ? 1 : 0,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [activeInput, isEditingText, slideAnim]);

  const bottomTranslateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -(sheetHeight - collapsedPeek)] });
  const mediaScale = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985] });

  const handlePost = async () => {
    if (isPosting) return;
    setIsPosting(true);
    setPostLogs([isEditing ? 'Starting update...' : 'Starting post...']);
    try {
      const currentTextPosition = mediaContentRef.current?.getOverlayTextPosition() || { x: 0, y: 0 };
      await onPost({
        ...reviewData,
        overlayText,
        overlayTextPosition: { x: currentTextPosition.x, y: currentTextPosition.y },
        onProgress: (log: string) => setPostLogs(prev => [...prev, log]),
      });
      setPostLogs(prev => [...prev, isEditing ? 'Update successful!' : 'Post successful!']);
    } catch (e: any) {
      console.warn('post/update failed', e);
      setPostLogs(prev => [...prev, `Error: ${e?.message ?? 'Unknown'}`]);
    } finally {
      setIsPosting(false);
    }
  };

  const handleClose = () => {
    const currentTextPosition = mediaContentRef.current?.getOverlayTextPosition() || { x: 0, y: 0 };
    const hasTextPositionChanged =
      initialReviewData?.overlayTextPosition &&
      (initialReviewData.overlayTextPosition.x !== currentTextPosition.x ||
        initialReviewData.overlayTextPosition.y !== currentTextPosition.y);

    const hasChanges =
      originalReviewData &&
      (originalReviewData.rating !== reviewData.rating ||
        originalReviewData.review !== reviewData.review ||
        originalReviewData.title !== reviewData.title ||
        originalReviewData.overlayText !== overlayText ||
        hasTextPositionChanged);

    const isNewAndDirty = !isEditing && (reviewData.title || reviewData.review || reviewData.rating > 0 || overlayText);

    if (isNewAndDirty || hasChanges) {
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Continue editing', style: 'cancel' },
          { text: 'Discard', onPress: onClose, style: 'destructive' },
        ]
      );
    } else {
      onClose?.();
    }
  };

  const toggleInput = (input: 'rating' | 'review' | 'title') => {
    setActiveInput(current => (current === input ? null : input));
    if (isEditingText) setIsEditingText(false);
    Keyboard.dismiss();
  };

  const toggleTextEditor = useCallback(() => setIsEditingText(current => !current), []);

  const toggleEmojiPicker = useCallback(() => Alert.alert('Feature Not Implemented', 'Emoji and sticker packs are coming soon!'), []);

  return (
    <ScreenWrapper style={styles.fullScreenWrapper}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setActiveInput(null); setIsEditingText(false); }}>
          <View style={[styles.container, { paddingTop: 0, paddingBottom: 0 }]}>
            <MediaContent
              ref={mediaContentRef}
              media={media}
              overlayText={overlayText}
              setOverlayText={setOverlayText}
              initialOverlayTextPosition={initialReviewData?.overlayTextPosition}
              isEditingText={isEditingText}
              setIsEditingText={setIsEditingText}
              onMediaScaleChange={mediaScale}
            />

            <UserHeader onClose={handleClose} insets={insets} user={user} />

            {isPosting && (
              <View style={[styles.logsContainer, { top: 56 + (Platform.OS === 'android' ? 12 : 0) }]}>
                {postLogs.map((log, index) => <Text key={index} style={styles.logText}>{log}</Text>)}
              </View>
            )}

            <ActionButtons
              mediaType={media.type}
              isEditingText={isEditingText}
              toggleMute={() => {}}
              toggleTextEditor={toggleTextEditor}
              toggleEmojiPicker={toggleEmojiPicker}
              windowHeight={WINDOW_HEIGHT}
              insets={insets}
            />

            <Animated.View
              style={[
                styles.bottomSheet,
                { height: sheetHeight, bottom: (insets.bottom || 12) + 12, transform: [{ translateY: bottomTranslateY }] },
              ]}
            >
              <BlurView intensity={60} style={styles.blur} tint="dark">
                <View style={styles.sheetHandle} />
                <View style={styles.sheetContent}>
                  <View style={styles.rowBetween}>
                    <View>
                      <Text style={styles.titlePreview}>{reviewData.title || 'Add a movie title'}</Text>
                      <Text style={styles.smallMuted}>{reviewData.review ? `${reviewData.review.slice(0, 40)}${reviewData.review.length > 40 ? '...' : ''}` : 'Tap Review to add your thoughts'}</Text>
                    </View>
                    <View style={styles.smallStarsPreview}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Ionicons key={i} name={i < reviewData.rating ? 'star' : 'star-outline'} size={18} color={i < reviewData.rating ? '#FFD700' : '#bbb'} style={{ marginLeft: 2 }} />
                      ))}
                    </View>
                  </View>

                  <View style={styles.inputPickerRow}>
                    <TouchableOpacity style={styles.pickerBtn} onPress={() => toggleInput('rating')}>
                      <MaterialCommunityIcons name="star-circle-outline" size={22} color={reviewData.rating ? '#ffcc00' : 'white'} />
                      <Text style={styles.pickerText}>Rate</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.pickerBtn} onPress={() => toggleInput('review')}>
                      <Ionicons name="create-outline" size={22} color={reviewData.review ? '#61dafb' : 'white'} />
                      <Text style={styles.pickerText}>Review</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.pickerBtn} onPress={() => toggleInput('title')}>
                      <Ionicons name="film-outline" size={22} color={reviewData.title ? '#61dafb' : 'white'} />
                      <Text style={styles.pickerText}>Movie</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dynamicArea}>
                    {activeInput === 'rating' && <StarRating initialRating={reviewData.rating} onRatingChange={r => setReviewData(d => ({ ...d, rating: r }))} totalStars={5} />}
                    {activeInput === 'review' && <TextInput placeholder="Share your thoughts..." placeholderTextColor="#cfcfcf" style={styles.reviewInput} multiline onChangeText={review => setReviewData(d => ({ ...d, review }))} value={reviewData.review} autoFocus />}
                    {activeInput === 'title' && <TextInput placeholder="Movie title" placeholderTextColor="#cfcfcf" style={styles.titleInput} onChangeText={title => setReviewData(d => ({ ...d, title }))} value={reviewData.title} autoFocus />}
                  </View>

                  <View style={styles.rowBetween}>
                    <TouchableOpacity onPress={() => { setReviewData({ rating: 0, review: '', title: '' }); setOverlayText(''); mediaContentRef.current?.resetOverlayPosition(); setActiveInput(null); }}>
                      <Text style={styles.clearText}>Clear</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handlePost} disabled={isPosting} style={styles.doneBtnWrap}>
                      <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.doneBtn}>
                        {isPosting ? <ActivityIndicator color="#fff" /> : <Text style={styles.doneBtnText}>{isEditing ? 'Update Review' : 'Post Review'}</Text>}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </BlurView>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

function StarRating({ onRatingChange, totalStars = 5, initialRating = 0 }: { onRatingChange: (rating: number) => void; totalStars?: number, initialRating?: number }) {
  const [rating, setRating] = useState(initialRating);
  const handlePress = (index: number) => { const newRating = index + 1; setRating(newRating); onRatingChange(newRating); };
  return (
    <View style={starStyles.row}>
      {Array.from({ length: totalStars }, (_, index) => (
        <Pressable key={index} onPress={() => handlePress(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Animated.View style={{ marginHorizontal: 6 }}>
            <Ionicons name={index < rating ? 'star' : 'star-outline'} size={30} color={index < rating ? '#FFD700' : '#ddd'} />
          </Animated.View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: 'black' }, fullScreenWrapper: {}, mediaWrapper: { ...StyleSheet.absoluteFillObject, zIndex: 0 }, media: { ...StyleSheet.absoluteFillObject }, playPauseContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' }, playIconBackground: { width: 78, height: 78, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' }, overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' }, header: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 1000 }, headerLeft: { flexDirection: 'row', alignItems: 'center' }, userRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 }, avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }, username: { color: 'white', marginLeft: 8, fontWeight: '600' }, headerRight: { flexDirection: 'row', alignItems: 'center' }, postButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, minWidth: 80, alignItems: 'center' }, postButtonText: { color: 'white', fontWeight: '700' }, logsContainer: { position: 'absolute', left: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, borderRadius: 8, zIndex: 1000 }, logText: { color: 'white', fontSize: 12, marginBottom: 4 }, sideActions: { position: 'absolute', right: 16, zIndex: 999 }, sideActionBtn: { alignItems: 'center', marginBottom: 18 }, sideActionText: { color: 'white', marginTop: 6, fontSize: 12 }, bottomSheet: { position: 'absolute', left: 12, right: 12, borderRadius: 18, overflow: 'hidden', zIndex: 900 }, blur: { flex: 1, backgroundColor: 'rgba(18,18,18,0.35)' }, sheetHandle: { alignSelf: 'center', width: 46, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 8 }, sheetContent: { padding: 12, flex: 1, justifyContent: 'space-between' }, rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, titlePreview: { color: 'white', fontWeight: '700', fontSize: 16 }, smallMuted: { color: '#b6b6b6', fontSize: 12, marginTop: 4 }, smallStarsPreview: { flexDirection: 'row', alignItems: 'center' }, inputPickerRow: { flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 10 }, pickerBtn: { flexDirection: 'row', alignItems: 'center' }, pickerText: { color: '#e6e6e6', marginLeft: 8 }, dynamicArea: { marginTop: 10 }, reviewInput: { minHeight: 70, color: 'white', fontSize: 15, padding: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)' }, titleInput: { height: 44, color: 'white', fontSize: 15, padding: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)' }, clearText: { color: '#cfcfcf' }, doneBtnWrap: {}, doneBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12 }, doneBtnText: { color: 'white', fontWeight: '700' }, overlayTextInput: { position: 'absolute', top: '30%', left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', fontSize: 24, fontWeight: 'bold', padding: 10, borderRadius: 10, textAlign: 'center', zIndex: 10, alignSelf: 'center' }, overlayTextDisplayWrapper: { position: 'absolute', left: WINDOW_WIDTH / 2, top: WINDOW_HEIGHT / 2, zIndex: 5 }, overlayTextDisplay: { color: 'white', fontSize: 24, fontWeight: 'bold', textAlign: 'center', position: 'absolute', alignSelf: 'center', transform: [{ translateX: -50 }, { translateY: -12 }] } });
const starStyles = StyleSheet.create({ row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' } });

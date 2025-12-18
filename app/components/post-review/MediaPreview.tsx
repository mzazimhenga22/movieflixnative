
import React, { useRef, useState, useCallback } from 'react';

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

  Alert,

  Modal,

  Pressable,

  Animated,

} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { LinearGradient } from 'expo-linear-gradient';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MediaContent, { MediaContentHandle } from './media-preview/MediaContent';



// Interfaces remain the same

interface MediaPreviewProps {

  media: { uri: string; type: 'image' | 'video' };

  onPost: (reviewData: any) => Promise<void>;

  onClose?: () => void;

  initialReviewData?: ReviewData;

  isEditing?: boolean;

}



interface ReviewData {

  rating: number;

  review: string;

  title: string;

  overlayText?: string;

  overlayTextPosition?: { x: number; y: number };

}



// A more reusable StarRating component

function StarRating({ onRatingChange, totalStars = 5, initialRating = 0 }: { onRatingChange: (rating: number) => void; totalStars?: number, initialRating?: number }) {

    const [rating, setRating] = useState(initialRating);

    const handlePress = (index: number) => { const newRating = index + 1; setRating(newRating); onRatingChange(newRating); };

    return (

      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 20 }}>

        {Array.from({ length: totalStars }, (_, index) => (

          <Pressable key={index} onPress={() => handlePress(index)} hitSlop={10}>

            <Ionicons name={index < rating ? 'star' : 'star-outline'} size={40} color={index < rating ? '#FFD700' : '#ddd'} style={{ marginHorizontal: 8 }}/>

          </Pressable>

        ))}

      </View>

    );

}



export default function MediaPreview({

  media,

  onPost,

  onClose,

  initialReviewData,

  isEditing = false,

}: MediaPreviewProps) {

  const [reviewData, setReviewData] = useState<ReviewData>(

    initialReviewData || { rating: 0, review: '', title: '' }

  );

  const [originalReviewData] = useState<ReviewData | null>(initialReviewData || null);

  const [isPosting, setIsPosting] = useState(false);

  const insets = useSafeAreaInsets();



  const [overlayText, setOverlayText] = useState(initialReviewData?.overlayText || '');

  const mediaContentRef = useRef<MediaContentHandle | null>(null);



  const [isRatingModalVisible, setRatingModalVisible] = useState(false);

  const [isTitleModalVisible, setTitleModalVisible] = useState(false);



  const handlePost = async () => {

    if (isPosting) return;

    setIsPosting(true);

    try {

      const currentTextPosition = mediaContentRef.current?.getOverlayTextPosition() || { x: 0, y: 0 };

      await onPost({

        ...reviewData,

        overlayText,

        overlayTextPosition: { x: currentTextPosition.x, y: currentTextPosition.y },

      });

    } catch (e: any) {

      console.warn('post/update failed', e);

      Alert.alert('Error', e?.message ?? 'An unknown error occurred.');

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

  

  const renderDescriptionWithHashtags = (text: string) => {

    const parts = text.split(/([#@]\w+)/g);

    const elements = parts.map((part, index) => {

      if (part.startsWith('#')) {

        return <Text key={index} style={styles.hashtagText}>{part}</Text>;

      }

      if (part.startsWith('@')) {

        return <Text key={index} style={styles.mentionText}>{part}</Text>;

      }

      return <Text key={index}>{part}</Text>;

    });

    return <Text>{elements}</Text>;

  };



  return (

    <View style={styles.fullScreenWrapper}>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>

          <View style={styles.container}>

            <MediaContent

              ref={mediaContentRef}

              media={media}

              overlayText={overlayText}

              setOverlayText={setOverlayText}

              initialOverlayTextPosition={initialReviewData?.overlayTextPosition}

              isEditingText={false}

              setIsEditingText={() => {}}

              onMediaScaleChange={new Animated.Value(1)}

            />



            <View style={[styles.header, { top: insets.top + 10 }]}>

                <TouchableOpacity onPress={handleClose} style={styles.headerButton}>

                    <Ionicons name="arrow-back" size={24} color="#fff" />

                </TouchableOpacity>

                <Text style={styles.headerTitle}>New Review</Text>

                <View style={styles.headerButton}/>

            </View>



            <View style={styles.formContainer}>

                <View style={styles.captionContainer}>

                    <TextInput

                        style={styles.captionInput}

                        placeholder="Write a caption... #hashtag @mention"

                        placeholderTextColor="#aaa"

                        multiline

                        value={reviewData.review}

                        onChangeText={text => setReviewData(d => ({ ...d, review: text }))}

                    />

                </View>



                <View style={styles.optionsContainer}>

                    <TouchableOpacity style={styles.optionButton} onPress={() => setTitleModalVisible(true)}>

                        <Ionicons name="film-outline" size={20} color="#fff" />

                        <Text style={styles.optionText} numberOfLines={1}>{reviewData.title || 'Add Movie Title'}</Text>

                    </TouchableOpacity>

                    <TouchableOpacity style={styles.optionButton} onPress={() => setRatingModalVisible(true)}>

                        <Ionicons name="star-outline" size={20} color="#fff" />

                        <Text style={styles.optionText}>{reviewData.rating > 0 ? `${reviewData.rating} / 5 Stars` : 'Rate'}</Text>

                    </TouchableOpacity>

                </View>

            </View>



            <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>

                <TouchableOpacity onPress={handlePost} disabled={isPosting} style={styles.postButton}>

                    <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.postButtonGradient}>

                        {isPosting ? <ActivityIndicator color="#fff" /> : <Text style={styles.postButtonText}>{isEditing ? 'Update' : 'Post'}</Text>}

                    </LinearGradient>

                </TouchableOpacity>

            </View>

          </View>

        </TouchableWithoutFeedback>

      </KeyboardAvoidingView>



      <Modal visible={isTitleModalVisible} transparent animationType="fade">

        <Pressable onPress={() => setTitleModalVisible(false)} style={styles.modalContainer}>

            <Pressable style={styles.modalContent}>

                <Text style={styles.modalTitle}>Movie Title</Text>

                <TextInput

                    style={styles.modalInput}

                    placeholder="e.g. The Matrix"

                    placeholderTextColor="#888"

                    value={reviewData.title}

                    onChangeText={title => setReviewData(d => ({ ...d, title }))}

                    autoFocus

                />

                <TouchableOpacity onPress={() => setTitleModalVisible(false)} style={styles.modalButton}>

                    <Text style={styles.modalButtonText}>Done</Text>

                </TouchableOpacity>

            </Pressable>

        </Pressable>

      </Modal>



      <Modal visible={isRatingModalVisible} transparent animationType="fade">

         <Pressable onPress={() => setRatingModalVisible(false)} style={styles.modalContainer}>

            <Pressable style={styles.modalContent}>

                <Text style={styles.modalTitle}>Rate this movie</Text>

                <StarRating

                    initialRating={reviewData.rating}

                    onRatingChange={r => setReviewData(d => ({ ...d, rating: r }))}

                />

                <TouchableOpacity onPress={() => setRatingModalVisible(false)} style={styles.modalButton}>

                    <Text style={styles.modalButtonText}>Done</Text>

                </TouchableOpacity>

            </Pressable>

        </Pressable>

      </Modal>

    </View>

  );

}



const styles = StyleSheet.create({

    fullScreenWrapper: { flex: 1, backgroundColor: 'black' },

    container: { flex: 1 },

    header: {

        position: 'absolute',

        left: 16,

        right: 16,

        flexDirection: 'row',

        justifyContent: 'space-between',

        alignItems: 'center',

        zIndex: 10,

    },

    headerButton: {

        padding: 8,

        backgroundColor: 'rgba(0,0,0,0.3)',

        borderRadius: 99,

        width: 40,

        height: 40,

        alignItems: 'center',

        justifyContent: 'center',

    },

    headerTitle: {

        color: 'white',

        fontSize: 18,

        fontWeight: '600',

    },

    formContainer: {

        position: 'absolute',

        bottom: 120,

        left: 16,

        right: 16,

        zIndex: 10,

        gap: 16,

    },

    captionContainer: {

        backgroundColor: 'rgba(0,0,0,0.4)',

        borderRadius: 12,

        padding: 12,

        minHeight: 80,

    },

    captionInput: {

        color: 'white',

        fontSize: 16,

        flex: 1,

    },

    hashtagText: {

        color: '#8ef',

        fontWeight: '600'

    },

    mentionText: {

        color: '#ffbde6',

        fontWeight: '600'

    },

    optionsContainer: {

        flexDirection: 'row',

        gap: 12,

    },

    optionButton: {

        flexDirection: 'row',

        alignItems: 'center',

        backgroundColor: 'rgba(0,0,0,0.4)',

        paddingHorizontal: 12,

        paddingVertical: 10,

        borderRadius: 12,

        gap: 8,

        flex: 1,

    },

    optionText: {

        color: 'white',

        fontWeight: '600',

        flex: 1,

    },

    footer: {

        position: 'absolute',

        bottom: 0,

        left: 16,

        right: 16,

        zIndex: 10,

    },

    postButton: {

        height: 52,

    },

    postButtonGradient: {

        borderRadius: 14,

        height: '100%',

        alignItems: 'center',

        justifyContent: 'center',

    },

    postButtonText: {

        color: 'white',

        fontWeight: '700',

        fontSize: 16,

    },

    modalContainer: {

        flex: 1,

        backgroundColor: 'rgba(0,0,0,0.7)',

        justifyContent: 'center',

        alignItems: 'center',

        padding: 24,

    },

    modalContent: {

        backgroundColor: '#2c2c2c',

        borderRadius: 16,

        padding: 20,

        width: '100%',

    },

    modalTitle: {

        color: 'white',

        fontSize: 18,

        fontWeight: '600',

        marginBottom: 16,

        textAlign: 'center',

    },

    modalInput: {

        backgroundColor: '#444',

        color: 'white',

        borderRadius: 10,

        padding: 12,

        fontSize: 16,

        marginBottom: 20,

    },

    modalButton: {

        backgroundColor: '#007AFF',

        borderRadius: 10,

        padding: 14,

        alignItems: 'center',

    },

    modalButtonText: {

        color: 'white',

        fontWeight: '700',

        fontSize: 16,

    }

});



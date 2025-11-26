import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import PagerView from 'react-native-pager-view';
import { Video, ResizeMode } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

const { width } = Dimensions.get('window');

const STORY_VIEW_DURATION = 30000; // 30 seconds per media item

type StoryMedia = { type: 'image' | 'video'; uri: string };
type Story = { id: number; title: string; image: string; media: StoryMedia[] };

const StoryViewerScreen = () => {
  const router = useRouter();
  const { stories: storiesParam, initialStoryId: initialStoryIdParam } = useLocalSearchParams();

  const stories: Story[] = storiesParam ? JSON.parse(storiesParam as string) : [];
  const initialStoryId: number = initialStoryIdParam ? parseInt(initialStoryIdParam as string) : 0;

  // If no stories passed, show loader and avoid any indexing
  if (!stories || stories.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFF" />
      </View>
    );
  }

  const initialStoryIndex = Math.max(0, stories.findIndex((s) => s.id === initialStoryId));
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);

  const pagerRef = useRef<PagerView>(null);
  const videoRef = useRef<Video>(null);
  const webviewRef = useRef<any>(null);

  // Animated progress values — create length equal to stories.length
  const progressAnim = useRef(
    Array.from({ length: stories.length }, () => new Animated.Value(0))
  ).current;
  const progressAnimationTimeout = useRef<NodeJS.Timeout | null>(null);

  // Defensive currentStory / currentMedia access
  const currentStory = stories[currentStoryIndex] ?? stories[0];
  const currentMedia =
    currentStory && Array.isArray(currentStory.media) && currentStory.media.length > 0
      ? currentStory.media[currentMediaIndex] ?? currentStory.media[0]
      : undefined;

  // Helpers to detect YouTube links/IDs
  const extractYouTubeId = (uri: string | undefined) => {
    if (!uri) return null;
    const maybeId = uri.trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(maybeId)) return maybeId;
    const short = maybeId.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
    if (short && short[1]) return short[1];
    const long = maybeId.match(/[?&]v=([A-Za-z0-9_-]{11})/);
    if (long && long[1]) return long[1];
    const embed = maybeId.match(/\/embed\/([A-Za-z0-9_-]{11})/);
    if (embed && embed[1]) return embed[1];
    return null;
  };

  const startProgressAnimation = useCallback(() => {
    // guard index range
    if (!(currentStoryIndex >= 0 && currentStoryIndex < progressAnim.length)) return;

    // clear any existing timeout
    if (progressAnimationTimeout.current) {
      clearTimeout(progressAnimationTimeout.current);
      progressAnimationTimeout.current = null;
    }

    // reset and start animation for this story
    try {
      progressAnim[currentStoryIndex].setValue(0);
      Animated.timing(progressAnim[currentStoryIndex], {
        toValue: 1,
        duration: STORY_VIEW_DURATION,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) handleNextMedia();
      });
    } catch (e) {
      // fail silently if animation issues occur
    }
  }, [currentStoryIndex, progressAnim]);

  useEffect(() => {
    if (!currentStory) return;

    // If the current media is a video, we rely on the video end event instead of the timeout
    if (currentMedia?.type === 'video') {
      try {
        progressAnim[currentStoryIndex]?.stopAnimation?.();
      } catch {}
    } else {
      startProgressAnimation();
    }

    return () => {
      if (progressAnimationTimeout.current) {
        clearTimeout(progressAnimationTimeout.current);
      }
      try {
        progressAnim[currentStoryIndex]?.stopAnimation?.();
      } catch {}
    };
    // intentional deps: currentStoryIndex, currentMediaIndex, currentMedia
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStoryIndex, currentMediaIndex, currentMedia?.type]);

  const handleNextMedia = useCallback(() => {
    if (!currentStory) return;

    const mediaLen = Array.isArray(currentStory.media) ? currentStory.media.length : 0;
    if (currentMediaIndex < mediaLen - 1) {
      setCurrentMediaIndex((p) => p + 1);
    } else {
      handleNextStory();
    }
  }, [currentStory, currentMediaIndex]);

  const handlePreviousMedia = useCallback(() => {
    if (!currentStory) return;
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex((p) => p - 1);
    } else {
      handlePreviousStory();
    }
  }, [currentStory, currentMediaIndex]);

  const handleNextStory = useCallback(() => {
    if (currentStoryIndex < stories.length - 1) {
      pagerRef.current?.setPage(currentStoryIndex + 1);
      setCurrentStoryIndex((p) => p + 1);
      setCurrentMediaIndex(0);
      try {
        if (progressAnim[currentStoryIndex]) progressAnim[currentStoryIndex].setValue(1);
      } catch {}
    } else {
      router.back();
    }
  }, [currentStoryIndex, stories.length, progressAnim]);

  const handlePreviousStory = useCallback(() => {
    if (currentStoryIndex > 0) {
      pagerRef.current?.setPage(currentStoryIndex - 1);
      setCurrentStoryIndex((p) => p - 1);
      setCurrentMediaIndex(0);
      try {
        if (progressAnim[currentStoryIndex]) progressAnim[currentStoryIndex].setValue(0);
      } catch {}
    } else {
      router.back();
    }
  }, [currentStoryIndex]);

  const onPageSelected = useCallback(
    (e: any) => {
      const newIndex = e.nativeEvent.position;
      setCurrentStoryIndex(newIndex);
      setCurrentMediaIndex(0);

      for (let i = 0; i < stories.length; i++) {
        try {
          if (i < newIndex) progressAnim[i].setValue(1);
          else progressAnim[i].setValue(0);
        } catch {}
      }
    },
    [stories, progressAnim]
  );

  const onVideoPlaybackStatusUpdate = useCallback(
    (status: any) => {
      if (status?.isLoaded) {
        setVideoLoading(false);
        if (status.didJustFinish) handleNextMedia();
        setIsPlayingVideo(!!status.isPlaying);
        if (status.isPlaying) {
          try {
            progressAnim[currentStoryIndex]?.stopAnimation?.();
          } catch {}
        }
      } else {
        setVideoLoading(true);
      }
    },
    [currentStoryIndex, progressAnim, handleNextMedia]
  );

  const onWebViewMessage = useCallback(
    (event: any) => {
      const data = event.nativeEvent?.data;
      if (data === 'ended') {
        handleNextMedia();
      } else if (data === 'playing') {
        try {
          progressAnim[currentStoryIndex]?.stopAnimation?.();
        } catch {}
      }
    },
    [handleNextMedia, currentStoryIndex, progressAnim]
  );

  const youtubeEmbedHtml = (videoId: string) => `
    <!doctype html><html><head>
    <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0"/>
    <style>html,body,#player{margin:0;padding:0;height:100%;background:#000}body{display:flex;align-items:center;justify-content:center;height:100%}iframe{width:100%;height:100%;border:0}</style>
    </head><body>
    <div id="player"></div>
    <script>
      var tag=document.createElement('script');tag.src="https://www.youtube.com/iframe_api";document.body.appendChild(tag);
      var player;
      function onYouTubeIframeAPIReady(){
        player=new YT.Player('player',{height:'100%',width:'100%',videoId:'${videoId}',playerVars:{controls:0,autoplay:1,playsinline:1,modestbranding:1,rel:0,fs:0,enablejsapi:1,iv_load_policy:3},events:{onReady:function(e){try{e.target.playVideo()}catch(e){}window.ReactNativeWebView.postMessage('playing')},onStateChange:function(event){if(event.data===0){window.ReactNativeWebView.postMessage('ended')}else if(event.data===1){window.ReactNativeWebView.postMessage('playing')}}}});
      }
    </script>
    </body></html>
  `;

  // If still no media for the current story, show loader
  if (!currentMedia) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={initialStoryIndex}
        onPageSelected={onPageSelected}
      >
        {stories.map((story, storyIdx) => {
          const mediaList = Array.isArray(story.media) ? story.media : [];
          const isActiveStory = storyIdx === currentStoryIndex;
          const activeMediaIndexForThisStory = isActiveStory ? currentMediaIndex : 0;
          const mediaItem = mediaList[activeMediaIndexForThisStory];

          return (
            <View key={story.id} style={styles.page}>
              <SafeAreaView style={styles.header}>
                <View style={styles.progressBarContainer}>
                  {mediaList.map((_, mediaIdx) => (
                    <View key={mediaIdx} style={styles.progressBarBackground}>
                      <Animated.View
                        style={[
                          styles.progressBarFill,
                          {
                            width: progressAnim[storyIdx].interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0%', '100%'],
                            }),
                          },
                          storyIdx === currentStoryIndex && mediaIdx === currentMediaIndex && styles.activeProgressBar,
                        ]}
                      />
                    </View>
                  ))}
                </View>

                <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                  <Ionicons name="close" size={32} color="white" />
                </TouchableOpacity>

                <Text style={styles.storyTitle}>{story.title}</Text>
              </SafeAreaView>

              <View style={styles.mediaContainer}>
                {isActiveStory && mediaItem?.type === 'image' ? (
                  <Image source={{ uri: mediaItem.uri }} style={styles.media} resizeMode="contain" />
                ) : (
                  <View style={styles.videoWrapper}>
                    {mediaItem?.type === 'video' ? (
                      (() => {
                        const ytId = extractYouTubeId(mediaItem.uri);
                        if (ytId) {
                          return (
                            <>
                              {videoLoading && <ActivityIndicator size="large" color="#FFF" style={styles.videoLoader} />}
                              <WebView
                                ref={(r) => (webviewRef.current = r)}
                                source={{ html: youtubeEmbedHtml(ytId) }}
                                style={styles.media}
                                javaScriptEnabled
                                domStorageEnabled
                                allowsInlineMediaPlayback
                                mediaPlaybackRequiresUserAction={false}
                                onMessage={onWebViewMessage}
                                originWhitelist={['*']}
                                startInLoadingState
                                automaticallyAdjustContentInsets={false}
                                containerStyle={{ backgroundColor: 'black' }}
                              />
                              <View style={styles.touchOverlay}>
                                <TouchableOpacity style={styles.leftTouch} onPress={handlePreviousMedia} />
                                <TouchableOpacity style={styles.rightTouch} onPress={handleNextMedia} />
                              </View>
                            </>
                          );
                        } else {
                          return (
                            <>
                              {videoLoading && <ActivityIndicator size="large" color="#FFF" style={styles.videoLoader} />}
                              <Video
                                ref={videoRef}
                                style={styles.media}
                                source={{ uri: mediaItem.uri }}
                                useNativeControls={false}
                                resizeMode={ResizeMode.CONTAIN}
                                isLooping={false}
                                shouldPlay
                                onPlaybackStatusUpdate={onVideoPlaybackStatusUpdate}
                                onLoadStart={() => setVideoLoading(true)}
                                onReadyForDisplay={() => setVideoLoading(false)}
                              />
                              <View style={styles.touchOverlay}>
                                <TouchableOpacity style={styles.leftTouch} onPress={handlePreviousMedia} />
                                <TouchableOpacity style={styles.rightTouch} onPress={handleNextMedia} />
                              </View>
                            </>
                          );
                        }
                      })()
                    ) : null}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </PagerView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  pagerView: { flex: 1 },
  page: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3, paddingTop: 10, paddingHorizontal: 10 },
  progressBarContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressBarBackground: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 2, borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: 'rgba(255,255,255,0.9)' },
  activeProgressBar: { backgroundColor: 'white' },
  closeButton: { position: 'absolute', top: 30, right: 10, padding: 10, zIndex: 4 },
  storyTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 10, textAlign: 'center' },
  mediaContainer: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  media: { width: '100%', height: '100%', backgroundColor: 'black' },
  videoWrapper: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  videoLoader: { position: 'absolute', zIndex: 5, alignSelf: 'center', top: '48%' },
  touchOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 6, flexDirection: 'row' },
  leftTouch: { flex: 1 },
  rightTouch: { flex: 1 },
});

export default StoryViewerScreen;

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TextStyle,
  AccessibilityRole,
} from 'react-native';

type Tab = 'Feed' | 'Recommended' | 'Live' | 'Movie Match';

interface Props {
  active: Tab;
  onChangeTab: (tab: Tab) => void;
}

const tabs: Tab[] = ['Feed', 'Recommended', 'Live', 'Movie Match'];

export default function FeedTabs({ active, onChangeTab }: Props) {
  // simple animation for active dot/underline (scale + fade)
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // animate in when active changes
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [active, anim]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.container} accessibilityRole="tablist">
        {tabs.map((tab) => {
          const isActive = tab === active;
          const accessibleRole: AccessibilityRole = 'tab';

          return (
            <Pressable
              key={tab}
              onPress={() => onChangeTab(tab)}
              style={({ pressed }) => [
                styles.tabBtn,
                isActive ? styles.tabBtnActive : undefined,
                pressed && styles.tabPressed,
              ]}
              accessibilityRole={accessibleRole}
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${tab} tab`}
            >
              <Text style={[styles.tabText, isActive ? styles.tabTextActive : undefined]}>
                {tab}
              </Text>

              {/* animated underline / dot */}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.activeIndicator,
                  isActive
                    ? {
                        opacity: anim,
                        transform: [
                          {
                            scaleX: anim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.6, 1],
                            }),
                          },
                          {
                            scaleY: anim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.6, 1],
                            }),
                          },
                        ],
                      }
                    : { opacity: 0, transform: [{ scale: 0.6 }] },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type Style = {
  wrapper: ViewStyle;
  container: ViewStyle;
  tabBtn: ViewStyle;
  tabBtnActive: ViewStyle;
  tabPressed: ViewStyle;
  tabText: TextStyle;
  tabTextActive: TextStyle;
  activeIndicator: ViewStyle;
};

const styles = StyleSheet.create<Style>({
  wrapper: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    // subtle background to separate from content
    backgroundColor: 'transparent',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 14,
    padding: 6,
    // soft shadow for depth (iOS + Android)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    marginHorizontal: 4,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(255,61,61,0.12)', // soft red highlight
    // stronger shadow when active
    shadowColor: '#ff3d3d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tabPressed: {
    opacity: 0.85,
  },
  tabText: {
    color: '#cfcfcf',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  tabTextActive: {
    color: '#ff3d3d',
    fontSize: 15,
    fontWeight: '700',
  },
  activeIndicator: {
    marginTop: 6,
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ff3d3d',
    alignSelf: 'center',
  },
});

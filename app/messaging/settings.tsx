// app/settings.tsx
import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  FlatList,
  GestureResponderEvent,
  PanResponder,
  ColorValue,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenWrapper from '@/components/ScreenWrapper';
import { useTheme } from '../../hooks/use-theme';
import { DarkTheme, Theme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// HSV to RGB conversion
function hsvToRgb(h: number, s: number, v: number) {
  const c = v * s;
  const hh = h / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hh >= 0 && hh < 1) { r = c; g = x; b = 0; }
  else if (hh >= 1 && hh < 2) { r = x; g = c; b = 0; }
  else if (hh >= 2 && hh < 3) { r = 0; g = c; b = x; }
  else if (hh >= 3 && hh < 4) { r = 0; g = x; b = c; }
  else if (hh >= 4 && hh < 5) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const m = v - c;
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

// RGB to Hex conversion
function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// HSV to Hex conversion
function hsvToHex(h: number, s: number, v: number) {
  return rgbToHex(hsvToRgb((h % 360 + 360) % 360, s, v));
}

// Hex to RGB conversion
function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  if (h.length !== 6) return { r: 0, g: 0, b: 0 };
  const bigint = parseInt(h, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

// Hex to HSV conversion
function hexToHsv(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d === 0) h = 0;
  else if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

const PRESETS: Record<string, string> = {
  'Default (Purple)': '#6A4CFA',
  BlueAccent: '#2979FF', RedAccent: '#FF5252', GreenAccent: '#00E676',
  PurpleAccent: '#7C4DFF', OrangeAccent: '#FF6D00', PinkAccent: '#FF4081',
  TealAccent: '#1DE9B6', CyanAccent: '#00BCD4', AmberAccent: '#FFC107',
  SunsetGradient: '#FF5F6D', OceanGradient: '#2193B0', LushGradient: '#56AB2F',
  FireGradient: '#FF512F', SkyGradient: '#00C9FF', PeachGradient: '#FF7E5F',
};

const HueSlider: React.FC<{ hue: number; onChange: (h: number) => void; height?: number; knobRadius?: number; }> = 
  ({ hue, onChange, height = 36, knobRadius = 12 }) => {
    const ref = useRef<any>(null);
    const pan = useRef(PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (e, s) => handleMove(e.nativeEvent),
      onPanResponderMove: (e, s) => handleMove(e.nativeEvent),
    })).current;

    const handleMove = (nativeEvent: any) => {
      if (!ref.current || !ref.current.measure) return;
      ref.current.measure((x: number, y: number, w: number) => {
        const clamped = Math.max(0, Math.min(w, nativeEvent.locationX ?? 0));
        onChange(Math.round((clamped / w) * 360));
      });
    };

    const gradientColors = useMemo(() => Array.from({ length: 13 }, (_, i) => hsvToHex(i * 30, 1, 1)) as [ColorValue, ColorValue, ...ColorValue[]], []);

    return (
      <View style={{ height, justifyContent: 'center' }} {...pan.panHandlers}>
        <View ref={ref} style={{ height: height * 0.46, borderRadius: 8, overflow: 'hidden' }}>
          <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
        </View>
        <View style={{ position: 'absolute', left: `${(hue / 360) * 100}%`, transform: [{ translateX: -knobRadius }] }}>
          <View style={{ width: knobRadius * 2, height: knobRadius * 2, borderRadius: knobRadius,
            backgroundColor: hsvToHex(hue, 0.8, 0.85), borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)',
            shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 4, elevation: 4 }} />
        </View>
      </View>
    );
};

const SettingsScreen: React.FC = () => {
  const { theme, changeTheme } = useTheme();
  const router = useRouter();
  const SAT = 0.8, VAL = 0.85;

  const initialAccent = (theme.colors as any).primary ?? PRESETS['Default (Purple)'];
  const [accentHex, setAccentHex] = useState<string>(initialAccent);
  const [hue, setHue] = useState<number>(() => hexToHsv(initialAccent).h);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const primary = (theme.colors as any).primary ?? PRESETS['Default (Purple)'];
    setAccentHex(primary);
    setHue(hexToHsv(primary).h);
  }, [theme]);

  const buildThemeFromAccent = (accent: string): Theme => ({
    ...DarkTheme,
    colors: { ...DarkTheme.colors, primary: accent, background: theme.colors.background },
  });

  const onHueChange = (h: number) => {
    setHue(h);
    setAccentHex(hsvToHex(h, SAT, VAL));
  };

  const pickPreset = (hex: string) => {
    setAccentHex(hex);
    setHue(hexToHsv(hex).h);
    setDropdownOpen(false);
  };

  const saveTheme = async () => {
    if (accentHex === (theme.colors as any).primary) {
      Alert.alert('No change', 'The selected theme is already active.');
      return;
    }
    try {
      const newTheme = buildThemeFromAccent(accentHex);
      await changeTheme(newTheme, true);
      Alert.alert('Success', 'Theme saved successfully!');
    } catch (error) {
      console.error('Failed to save theme:', error);
      Alert.alert('Error', 'Failed to save theme.');
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.center}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <BlurView intensity={50} tint="dark" style={styles.card}>
          <Text style={styles.header}>Theme Settings</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.presetBtn} onPress={() => setDropdownOpen(true)}>
              <Text style={styles.presetBtnText}>Choose Preset</Text>
              <Ionicons name="chevron-down" size={18} color="#fff" />
            </TouchableOpacity>
            <View style={[styles.swatch, { backgroundColor: accentHex }]} />
          </View>
          <Modal visible={dropdownOpen} transparent animationType="fade" onRequestClose={() => setDropdownOpen(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDropdownOpen(false)}>
              <View style={styles.dropdown}>
                <FlatList
                  data={Object.entries(PRESETS)}
                  keyExtractor={item => item[0]}
                  renderItem={({ item: [name, hex] }) => (
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => pickPreset(hex)}>
                      <View style={[styles.smallSwatch, { backgroundColor: hex }]} />
                      <Text style={styles.dropdownText}>{name}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableOpacity>
          </Modal>
          <Text style={styles.label}>Pick any color (drag the knob)</Text>
          <HueSlider hue={hue} onChange={onHueChange} />
          <View style={styles.subRow}>
            <Text style={styles.smallText}>Saturation: {Math.round(SAT * 100)}%</Text>
            <Text style={styles.smallText}>Brightness: {Math.round(VAL * 100)}%</Text>
          </View>
          <Text style={[styles.label, { marginTop: 12 }]}>Preview</Text>
          <View style={styles.previewRow}>
            <TouchableOpacity style={[styles.primaryPreview, { backgroundColor: accentHex }]}>
              <Text style={styles.primaryPreviewText}>Primary</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.outlinePreview, { borderColor: accentHex }]}>
              <Text style={{ color: accentHex }}>Outline</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.save, { backgroundColor: accentHex }]} onPress={saveTheme}>
            <Text style={styles.saveText}>Save Theme</Text>
          </TouchableOpacity>
        </BlurView>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backButton: { position: 'absolute', top: 52, left: 18, zIndex: 10, padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)' },
  card: { width: Math.min(width * 0.94, 760), borderRadius: 16, padding: 18, backgroundColor: 'rgba(255,255,255,0.04)' },
  header: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  presetBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)' },
  presetBtnText: { color: '#fff', marginRight: 8 },
  swatch: { width: 42, height: 42, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  label: { color: '#fff', marginTop: 6, marginBottom: 6 },
  smallText: { color: '#fff', opacity: 0.85 },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  previewRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  primaryPreview: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  primaryPreviewText: { color: '#000', fontWeight: '700' },
  outlinePreview: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, backgroundColor: 'transparent' },
  save: { marginTop: 14, padding: 12, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  dropdown: { backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 12, maxHeight: 360 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  dropdownText: { color: '#fff', marginLeft: 12 },
  smallSwatch: { width: 24, height: 24, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
});

export default SettingsScreen;

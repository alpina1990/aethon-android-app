import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';

const { width } = Dimensions.get('window');
type Nav = NativeStackNavigationProp<RootStackParamList>;

// Ultra-clean, 2-color pastel palettes to perfectly mimic the smooth Gemini gradient
const GEMINI_PALETTES = [
  ['rgba(167,243,252,0.8)', 'rgba(191,219,254,0.9)'], // Gemini Cyan/Blue
  ['rgba(249,168,212,0.8)', 'rgba(216,180,254,0.9)'], // Soft Pink/Purple
  ['rgba(134,239,172,0.8)', 'rgba(147,197,253,0.9)'], // Mint/Blue
  ['rgba(253,230,138,0.8)', 'rgba(252,165,165,0.9)'], // Soft Yellow/Peach
];

// Flawless, perfectly smooth crossfading aura (exactly like the Gemini reference)
function AuraFog() {
  const colorIndex = useRef(0);
  const [fadeOut] = useState(() => new Animated.Value(1));
  const [fadeIn] = useState(() => new Animated.Value(0));

  const [colors, setColors] = React.useState({
    current: GEMINI_PALETTES[0],
    next: GEMINI_PALETTES[1],
  });

  useEffect(() => {
    // Ultra-slow crossfade cycling through palettes
    const cycle = () => {
      const nextIdx = (colorIndex.current + 1) % GEMINI_PALETTES.length;
      
      fadeOut.setValue(1);
      fadeIn.setValue(0);

      setColors({
        current: GEMINI_PALETTES[colorIndex.current],
        next: GEMINI_PALETTES[nextIdx],
      });

      Animated.parallel([
        Animated.timing(fadeOut, { toValue: 0, duration: 6000, useNativeDriver: true }),
        Animated.timing(fadeIn, { toValue: 1, duration: 6000, useNativeDriver: true }),
      ]).start(() => {
        colorIndex.current = nextIdx;
        cycle();
      });
    };

    const timer = setTimeout(cycle, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Renders a perfectly smooth, symmetrical 2-color blend that fades seamlessly to white
  const renderFogLayer = (colorLeft: string, colorRight: string, opacity: Animated.Value) => (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
      
      {/* Base wash - Spans full screen but is 100% transparent for the top 55% */}
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0)', colorLeft]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Right-side color blend - Diagonal but totally transparent until the bottom corner */}
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0)', colorRight]}
        locations={[0, 0.65, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );

  return (
    <View style={styles.auraContainer}>
      {renderFogLayer(colors.current[0], colors.current[1], fadeOut)}
      {renderFogLayer(colors.next[0], colors.next[1], fadeIn)}
    </View>
  );
}

export default function RoleSelectorScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  const [scaleFam] = React.useState(new Animated.Value(1));
  const [scaleCare] = React.useState(new Animated.Value(1));

  const animatePress = (anim: Animated.Value, inPress: boolean) => {
    Animated.spring(anim, {
      toValue: inPress ? 0.95 : 1,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  return (
    <View style={styles.container}>
      <AuraFog />

      <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 30 }]}>
        
        {/* Header */}
        <View style={styles.header}>
          <Image 
            source={require('../../../assets/logo.jpg')}
            style={styles.logoImage}
            resizeMode="contain"
          />

          <Text style={styles.title}>The portal is yours</Text>
          <Text style={styles.subtitle}>Welcome to Aethon</Text>
        </View>

        {/* Selection Cards */}
        <View style={styles.cardsContainer}>
          <Animated.View style={{ transform: [{ scale: scaleFam }] }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPressIn={() => animatePress(scaleFam, true)}
              onPressOut={() => animatePress(scaleFam, false)}
              onPress={() => navigation.navigate('FamilyApp')}
            >
              <View style={styles.card}>
                <View style={styles.cardIconWrapper}>
                  <Feather name="heart" size={22} color="#0f172a" />
                </View>
                <View style={styles.cardTextContent}>
                  <Text style={styles.cardTitle}>Family Portal</Text>
                  <Text style={styles.cardDesc}>Real-time vitals, updates, and secure messaging.</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#cbd5e1" style={styles.chevronIcon} />
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: scaleCare }] }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPressIn={() => animatePress(scaleCare, true)}
              onPressOut={() => animatePress(scaleCare, false)}
              onPress={() => navigation.navigate('CaregiverApp')}
            >
              <View style={styles.card}>
                <View style={styles.cardIconWrapper}>
                  <Feather name="activity" size={22} color="#0f172a" />
                </View>
                <View style={styles.cardTextContent}>
                  <Text style={styles.cardTitle}>Caregiver Shift</Text>
                  <Text style={styles.cardDesc}>Daily shift roster, vitals, and medical escalations.</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#cbd5e1" style={styles.chevronIcon} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <Text style={styles.footer}>v2.0.0 · Enterprise Edition</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  auraContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: '20%', // Adjusted slightly to fit the real logo
  },
  logoImage: {
    width: 100,
    height: 100,
    marginBottom: 24,
    borderRadius: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '400', 
    color: '#000000',
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 40,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardTextContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 18,
    fontWeight: '500',
  },
  chevronIcon: {
    marginLeft: 12,
  },
  footer: {
    textAlign: 'center',
    color: '#cbd5e1',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
});

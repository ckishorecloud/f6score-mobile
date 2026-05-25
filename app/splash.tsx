import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Image, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { loadGameState } from '../store/gameStore';
import { Radius, Spacing } from '../constants/Colors';
import { Toast, useToast } from '../components/Toast';

const { height } = Dimensions.get('window');

const RULES = [
  { icon: '⬇️', title: 'Lowest Score Leads', body: 'Keep your score as low as possible. The player with the fewest points wins.' },
  { icon: '🎯', title: 'Target Score', body: 'Set a target (e.g. 150). Reach or exceed it and you\'re eliminated from the round.' },
  { icon: '↩️', title: 'Rejoin Protocol', body: 'Eliminated players can rejoin once — at the highest active score + 1 point.' },
  { icon: '🏆', title: 'Final Standings', body: 'Last survivor wins 1st place. Among eliminated, the last knocked out ranks highest.' },
];

export default function SplashScreen() {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const { toastState, showToast } = useToast();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();

    // Auto-restore saved game after short delay
    (async () => {
      const saved = await loadGameState();
      setChecking(false);
      if (saved && saved.teams.length && !saved.gameOver) {
        showToast('Game restored ✓', '#60c8f0');
      }
    })();
  }, []);

  async function handleStart() {
    const saved = await loadGameState();
    if (saved && saved.teams.length) {
      router.replace('/(tabs)');
    } else {
      router.push('/setup');
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#006666', '#004d4d', '#002626', '#001a1a']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }}
      />
      <LinearGradient
        colors={['rgba(0,204,204,0.18)', 'transparent']}
        style={[StyleSheet.absoluteFill, { height: height * 0.45 }]}
      />

      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

          {/* Logo */}
          <View style={styles.logoRow}>
            <Image source={require('../assets/logo.png')} style={styles.logoImg} resizeMode="contain" />
          </View>
          <Text style={styles.tagline}>The ocean-deep score tracker</Text>
          <Text style={styles.wave}>〰〰〰〰〰〰〰〰〰〰</Text>

          {/* Rules */}
          <ScrollView style={styles.rulesScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.rulesTitle}>How to Play</Text>
            {RULES.map((r, i) => (
              <View key={i} style={styles.ruleCard}>
                <Text style={styles.ruleIcon}>{r.icon}</Text>
                <View style={styles.ruleText}>
                  <Text style={styles.ruleTitleText}>{r.title}</Text>
                  <Text style={styles.ruleBody}>{r.body}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* CTA */}
          <TouchableOpacity style={styles.btn} onPress={handleStart} activeOpacity={0.85}>
            <LinearGradient
              colors={['#00cccc', '#009999']}
              style={styles.btnGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Text style={styles.btnText}>Dive In  →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>

      <Toast message={toastState.message} visible={toastState.visible} color={toastState.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001a1a' },
  safe: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: Spacing.pagePadding, paddingTop: 16, paddingBottom: 16 },

  logoRow: { alignItems: 'center', marginBottom: 6 },
  logoImg: { width: 160, height: 64, tintColor: undefined },
  tagline: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: 'rgba(0,204,204,0.6)', textAlign: 'center', marginBottom: 16, letterSpacing: 0.4 },
  wave: { textAlign: 'center', color: 'rgba(0,204,204,0.22)', fontSize: 13, marginBottom: 18, letterSpacing: 2 },

  rulesScroll: { flex: 1 },
  rulesTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 12, color: 'rgba(0,204,204,0.7)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },
  ruleCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.055)', borderRadius: Radius.xl, borderWidth: 1, borderColor: 'rgba(0,204,204,0.13)', padding: 14, marginBottom: 9, gap: 12, alignItems: 'flex-start' },
  ruleIcon: { fontSize: 20, lineHeight: 26 },
  ruleText: { flex: 1, gap: 3 },
  ruleTitleText: { fontFamily: 'Montserrat_700Bold', fontSize: 14, color: '#e0f4f4' },
  ruleBody: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: 'rgba(224,244,244,0.62)', lineHeight: 18 },

  btn: { marginTop: 18, borderRadius: Radius.full, overflow: 'hidden' },
  btnGradient: { paddingVertical: 15, alignItems: 'center', borderRadius: Radius.full },
  btnText: { fontFamily: 'Montserrat_700Bold', fontSize: 17, color: '#001a1a', letterSpacing: 0.4 },
});

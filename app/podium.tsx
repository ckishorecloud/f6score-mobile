import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { loadGameState, clearGameState, GameState } from '../store/gameStore';
import { Colors, Radius, Spacing, Shadow } from '../constants/Colors';

export default function PodiumScreen() {
  const [game, setGame]     = useState<GameState | null>(null);
  const [photos, setPhotos] = useState<Record<string, string>>({});

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const { loadPhotos } = await import('../store/gameStore');
        const [g, ph] = await Promise.all([loadGameState(), loadPhotos()]);
        setGame(g);
        setPhotos(ph);
      })();
    }, [])
  );

  async function newMatch() {
    await clearGameState();
    router.replace('/setup');
  }

  if (!game || !game.podium.length) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f9f9f9', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: 'Montserrat_700Bold', fontSize: 16, color: Colors.onSurface }}>No results yet</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: Colors.primaryContainer, fontFamily: 'Montserrat_700Bold' }}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { podium, scores } = game;
  const medals = ['🥇', '🥈', '🥉'];
  const podiumColors = [Colors.gold, Colors.silver, Colors.bronze];
  const podiumBgs = [
    'rgba(212,168,32,0.12)',
    'rgba(136,153,170,0.12)',
    'rgba(176,112,64,0.12)',
  ];

  // Visual order: 2nd (left), 1st (centre / raised), 3rd (right)
  const visualOrder = [1, 0, 2].filter(i => i < podium.length);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#f0fafa', '#e8f6f4', '#f9f9f9']}
        style={StyleSheet.absoluteFill}
      />
      {/* Teal shimmer at top */}
      <LinearGradient
        colors={['rgba(0,204,204,0.1)', 'transparent']}
        style={[StyleSheet.absoluteFill, { height: 280 }]}
      />

      <SafeAreaView style={styles.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Header */}
          <View style={styles.header}>
            <Image source={require('../assets/logo.png')} style={{ width: 90, height: 34 }} resizeMode="contain" />
          </View>

          <Text style={styles.title}>Match Winners!</Text>
          <Text style={styles.subtitle}>The tides have settled. Here are the final standings.</Text>

          {/* Podium visual */}
          <View style={styles.podiumRow}>
            {visualOrder.map(i => {
              const name = podium[i];
              const isFirst = i === 0;
              return (
                <View key={name} style={[styles.podiumCard, isFirst && styles.podiumCard1st, { backgroundColor: podiumBgs[i], borderColor: podiumColors[i] }]}>
                  <Text style={styles.podiumMedal}>{medals[i]}</Text>
                  {photos[name] ? (
                    <Image source={{ uri: photos[name] }} style={styles.podiumPhoto} />
                  ) : (
                    <View style={styles.podiumAvatar}>
                      <Text style={styles.podiumAvatarText}>{name[0].toUpperCase()}</Text>
                    </View>
                  )}
                  <Text style={[styles.podiumName, isFirst && styles.podiumName1st]}>{name}</Text>
                  <Text style={[styles.podiumScore, { color: podiumColors[i] }]}>{scores[name].toLocaleString()} pts</Text>
                  {/* Podium step */}
                  <View style={[styles.podiumStep, { backgroundColor: podiumColors[i] + '40', height: i === 0 ? 60 : i === 1 ? 40 : 30 }]}>
                    <Text style={[styles.podiumRank, { color: podiumColors[i] }]}>{i + 1}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Other finishers */}
          {podium.length > 3 && (
            <View style={styles.restSection}>
              <Text style={styles.restTitle}>Other Finishers</Text>
              {podium.slice(3).map((name, i) => (
                <View key={name} style={styles.restRow}>
                  <Text style={styles.restRank}>#{i + 4}</Text>
                  <View style={styles.restAvatar}>
                    <Text style={styles.restAvatarText}>{name[0].toUpperCase()}</Text>
                  </View>
                  <Text style={styles.restName}>{name}</Text>
                  <Text style={styles.restScore}>{scores[name].toLocaleString()} pts</Text>
                </View>
              ))}
            </View>
          )}

          {/* Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.newMatchBtn} onPress={newMatch} activeOpacity={0.85}>
              <LinearGradient colors={['#004d4d', '#006666']} style={styles.newMatchBtnGrad}>
                <Text style={styles.newMatchBtnText}>⊙  New Match</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(tabs)')} activeOpacity={0.75}>
              <Text style={styles.homeBtnText}>⌂  Home</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  header: { paddingHorizontal: Spacing.pagePadding, paddingTop: 8, paddingBottom: 4, alignItems: 'center' },
  appName: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: Colors.primaryContainer },
  title: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 28, color: Colors.primary, textAlign: 'center', marginTop: 12 },
  subtitle: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center', marginTop: 6, marginBottom: 28, paddingHorizontal: Spacing.pagePadding, lineHeight: 20 },

  podiumRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 10, paddingHorizontal: Spacing.pagePadding, marginBottom: 28 },
  podiumCard: {
    flex: 1, alignItems: 'center', borderRadius: Radius.xl,
    borderWidth: 1.5, overflow: 'hidden', gap: 4,
    paddingTop: 14, paddingHorizontal: 6,
    ...Shadow.card,
  },
  podiumCard1st: { transform: [{ translateY: -18 }] },
  podiumMedal: { fontSize: 28, lineHeight: 34 },
  podiumPhoto: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  podiumAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)' },
  podiumAvatarText: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 18, color: Colors.primaryContainer },
  podiumName: { fontFamily: 'Montserrat_700Bold', fontSize: 12, color: Colors.onSurface, textAlign: 'center', marginTop: 4 },
  podiumName1st: { fontSize: 14 },
  podiumScore: { fontFamily: 'Montserrat_600SemiBold', fontSize: 11, marginBottom: 8 },
  podiumStep: { width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 'auto' },
  podiumRank: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 22 },

  restSection: { marginHorizontal: Spacing.pagePadding, backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 16, gap: 10, marginBottom: 24, ...Shadow.card },
  restTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 12, color: Colors.outline, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  restRank: { fontFamily: 'Montserrat_600SemiBold', fontSize: 12, color: Colors.outline, width: 24 },
  restAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  restAvatarText: { fontFamily: 'Montserrat_700Bold', fontSize: 13, color: Colors.onSurfaceVariant },
  restName: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: Colors.onSurface, flex: 1 },
  restScore: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: Colors.onSurfaceVariant },

  btnRow: { paddingHorizontal: Spacing.pagePadding, gap: 10 },
  newMatchBtn: { borderRadius: Radius.full, overflow: 'hidden' },
  newMatchBtnGrad: { paddingVertical: 15, alignItems: 'center' },
  newMatchBtnText: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#fff', letterSpacing: 0.4 },
  homeBtn: { alignItems: 'center', paddingVertical: 14, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.outlineVariant },
  homeBtnText: { fontFamily: 'Montserrat_600SemiBold', fontSize: 15, color: Colors.onSurfaceVariant },
});

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  loadGameState, saveGameState, GameState, createSnapshot, getHighestActiveScore,
} from '../store/gameStore';
import { Colors, Radius, Spacing } from '../constants/Colors';

export default function EliminationScreen() {
  const [game, setGame] = useState<GameState | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const g = await loadGameState();
        setGame(g);
      })();
    }, [])
  );

  async function rejoin(name: string) {
    if (!game) return;
    const rejoinScore = getHighestActiveScore(game.teams, game.scores, game.eliminated) + 1;
    Alert.alert(
      '↩ Rejoin Game',
      `Rejoin "${name}" at ${rejoinScore} points?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rejoin', onPress: async () => {
            const snapshot = createSnapshot(game);
            const updated: GameState = {
              ...game,
              scores: { ...game.scores, [name]: rejoinScore },
              eliminated: game.eliminated.filter(n => n !== name),
              elimOrder: game.elimOrder.filter(n => n !== name),
              rejoined: [...game.rejoined, name],
              hasRejoined: [...game.hasRejoined, name],
              log: [`↩ REJOIN: ${name} at ${rejoinScore} pts`, ...game.log],
              roundHistory: [...game.roundHistory, snapshot],
            };
            await saveGameState(updated);
            setGame(updated);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }

  if (!game || !game.eliminated.length) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#001a1a', '#002626']} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#e0f4f4', fontFamily: 'Montserrat_600SemiBold', fontSize: 16 }}>No eliminated players</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
            <Text style={{ color: '#00cccc', fontFamily: 'Montserrat_700Bold', fontSize: 14 }}>← Back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  const rejoinScore = getHighestActiveScore(game.teams, game.scores, game.eliminated) + 1;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#001a1a', '#002626', '#001010']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Image source={require('../assets/logo.png')} style={{ width: 80, height: 28 }} resizeMode="contain" />
          <View style={{ width: 36 }} />
        </View>

        {/* Target reached banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerText}>⚠  TARGET REACHED</Text>
        </View>

        <Text style={styles.title}>Elimination Panel</Text>
        <Text style={styles.subtitle}>Players who surpassed the target score.{'\n'}Awaiting respawn protocol or match conclusion.</Text>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {game.eliminated.map(name => {
            const alreadyRejoined = game.hasRejoined.includes(name);
            return (
              <View key={name} style={styles.elimCard}>
                <View style={styles.elimCardTop}>
                  <View style={styles.elimAvatar}>
                    <Text style={styles.elimAvatarText}>{name[0].toUpperCase()}</Text>
                  </View>
                  <View style={styles.elimInfo}>
                    <Text style={styles.elimName}>{name}</Text>
                    <Text style={styles.elimDepth}>Eliminated · {game.scores[name]} pts</Text>
                  </View>
                </View>
                <View style={styles.elimScoreRow}>
                  <Text style={styles.elimScoreLabel}>Final Score</Text>
                  <Text style={styles.elimScoreValue}>{game.scores[name].toLocaleString()}</Text>
                </View>
                {alreadyRejoined ? (
                  <View style={styles.rejoinUsed}>
                    <Text style={styles.rejoinUsedText}>— Rejoin protocol used —</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.rejoinBtn}
                    onPress={() => rejoin(name)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient colors={['rgba(0,204,204,0.22)', 'rgba(0,204,204,0.12)']} style={styles.rejoinBtnGrad}>
                      <Text style={styles.rejoinBtnText}>↩  Rejoin Protocol  ·  {rejoinScore} pts</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001a1a' },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.pagePadding, paddingTop: 8, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 18, color: '#e0f4f4' },
  appName: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#00cccc' },

  banner: { marginHorizontal: Spacing.pagePadding, backgroundColor: 'rgba(186,26,26,0.15)', borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(186,26,26,0.3)', paddingVertical: 8, paddingHorizontal: 14, marginBottom: 16, alignSelf: 'flex-start' },
  bannerText: { fontFamily: 'Montserrat_700Bold', fontSize: 11, color: '#ff8080', letterSpacing: 1 },
  title: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 26, color: '#e0f4f4', paddingHorizontal: Spacing.pagePadding, marginBottom: 6 },
  subtitle: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: 'rgba(224,244,244,0.55)', paddingHorizontal: Spacing.pagePadding, lineHeight: 19, marginBottom: 20 },

  scroll: { flex: 1, paddingHorizontal: Spacing.pagePadding },
  elimCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radius.xl, borderWidth: 1, borderColor: 'rgba(0,204,204,0.15)',
    padding: 16, marginBottom: 12, gap: 12,
  },
  elimCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  elimAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(186,26,26,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(186,26,26,0.4)' },
  elimAvatarText: { fontFamily: 'Montserrat_700Bold', fontSize: 18, color: '#ff8080' },
  elimInfo: { flex: 1 },
  elimName: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#e0f4f4' },
  elimDepth: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: 'rgba(224,244,244,0.5)', marginTop: 2 },
  elimScoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8 },
  elimScoreLabel: { fontFamily: 'Montserrat_500Medium', fontSize: 12, color: 'rgba(224,244,244,0.55)' },
  elimScoreValue: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 20, color: '#e0f4f4' },
  rejoinBtn: { borderRadius: Radius.full, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,204,204,0.35)' },
  rejoinBtnGrad: { paddingVertical: 12, alignItems: 'center' },
  rejoinBtnText: { fontFamily: 'Montserrat_700Bold', fontSize: 13, color: '#00cccc' },
  rejoinUsed: { alignItems: 'center', paddingVertical: 10 },
  rejoinUsedText: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: 'rgba(224,244,244,0.3)' },
});

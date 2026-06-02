import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image, Keyboard, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  loadGameState, saveGameState, GameState, createSnapshot,
  getSortedTeams, buildPodium, saveHistory, loadHistory, loadPhotos,
} from '../store/gameStore';
import { Colors, Radius, Spacing } from '../constants/Colors';
import { Toast, useToast } from '../components/Toast';

export default function RoundEntry() {
  const [game, setGame]     = useState<GameState | null>(null);
  const [pts, setPts]       = useState<Record<string, number>>({});
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const { toastState, showToast } = useToast();

  useEffect(() => {
    (async () => {
      const [g, ph] = await Promise.all([loadGameState(), loadPhotos()]);
      if (g) {
        setGame(g);
        const initial: Record<string, number> = {};
        g.teams.filter(t => !g.eliminated.includes(t)).forEach(t => (initial[t] = 0));
        setPts(initial);
      }
      setPhotos(ph);
    })();
  }, []);

  function adjust(name: string, delta: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPts(prev => ({ ...prev, [name]: Math.max(0, (prev[name] ?? 0) + delta) }));
  }

  async function submitRound() {
    if (!game) return;
    const active = game.teams.filter(t => !game.eliminated.includes(t));

    // Validate
    for (const t of active) {
      if ((pts[t] ?? 0) < 0) { showToast(`Points for "${t}" must be 0 or more`, Colors.error); return; }
    }

    const snapshot = createSnapshot(game);
    const newScores    = { ...game.scores };
    const newEliminated = [...game.eliminated];
    const newRejoined   = [...game.rejoined];
    const newElimOrder  = [...game.elimOrder];
    const newElims: string[] = [];

    let logEntry = `R${game.round}: `;
    active.forEach(t => {
      const add = pts[t] ?? 0;
      newScores[t] += add;
      logEntry += `${t} +${add}→${newScores[t]}  `;
      if (newScores[t] >= game.target) {
        newEliminated.push(t);
        const rIdx = newRejoined.indexOf(t);
        if (rIdx !== -1) newRejoined.splice(rIdx, 1);
        newElims.push(t);
      }
    });

    // Within same round: higher score first → pushed first → worse rank
    newElims.sort((a, b) => newScores[b] - newScores[a]);
    newElims.forEach(n => newElimOrder.push(n));
    if (newElims.length) logEntry += `| Out: ${newElims.join(', ')}`;

    const remaining  = game.teams.filter(t => !newEliminated.includes(t));
    const isGameOver = remaining.length <= 1;
    const newPodium  = isGameOver ? buildPodium(remaining, newElimOrder, newScores) : [];

    const updated: GameState = {
      ...game,
      scores:      newScores,
      eliminated:  newEliminated,
      rejoined:    newRejoined,
      elimOrder:   newElimOrder,
      podium:      newPodium,
      round:       game.round + 1,
      log:         [logEntry, ...game.log],
      roundHistory: [...game.roundHistory, snapshot],
      gameOver:    isGameOver,
    };

    await saveGameState(updated);

    if (isGameOver) {
      const history = await loadHistory();
      history.unshift({
        id: Date.now(),
        date: new Date().toLocaleString(),
        podium: newPodium.slice(0, 3).map(n => ({ name: n, score: newScores[n] })),
        players: game.teams.length,
        rounds:  game.round,
        target:  game.target,
        finalScores: game.teams.map(t => ({ name: t, score: newScores[t] })).sort((a, b) => a.score - b.score),
      });
      await saveHistory(history.slice(0, 50));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/podium');
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.back();
    }
  }

  if (!game) return <View style={{ flex: 1, backgroundColor: '#001a1a' }} />;

  const active       = game.teams.filter(t => !game.eliminated.includes(t));
  const sortedActive = [...active].sort((a, b) => game.scores[a] - game.scores[b]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#001a1a', '#002626', '#003434']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }}
      />
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <View style={{ width: 36 }} />
        </View>

        <Text style={styles.title}>Record Round</Text>
        <Text style={styles.subtitle}>Round {game.round}  ·  Target {game.target}</Text>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
          {sortedActive.map(name => (
            <View key={name} style={styles.playerRow}>
              <View style={styles.playerLeft}>
                {photos[name] ? (
                  <Image source={{ uri: photos[name] }} style={styles.playerPhoto} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{name[0].toUpperCase()}</Text>
                  </View>
                )}
                <View>
                  <Text style={styles.playerName}>{name}</Text>
                  <Text style={styles.currentPts}>
                    Current: {game.scores[name]}
                    {game.rejoined.includes(name) ? ' ↩' : ''}
                  </Text>
                </View>
              </View>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => adjust(name, -1)}>
                  <Text style={styles.stepMinus}>−</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.stepValue}
                  value={String(pts[name] ?? 0)}
                  onChangeText={v => {
                    const n = parseInt(v.replace(/[^0-9]/g, ''));
                    setPts(prev => ({ ...prev, [name]: isNaN(n) ? 0 : Math.max(0, n) }));
                  }}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
                <TouchableOpacity style={[styles.stepBtn, styles.stepBtnAdd]} onPress={() => adjust(name, 1)}>
                  <Text style={styles.stepPlus}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Submit */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={submitRound} style={styles.submitBtn} activeOpacity={0.85}>
            <LinearGradient colors={['#00cccc', '#009999']} style={styles.submitGrad}>
              <Text style={styles.submitText}>⊙  Submit Round</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Toast message={toastState.message} visible={toastState.visible} color={toastState.color} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001a1a' },
  safe: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.pagePadding, paddingTop: 12, paddingBottom: 4 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 15, color: 'rgba(224,244,244,0.7)' },
  logo: { width: 80, height: 30 },

  title: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 24, color: '#e0f4f4', textAlign: 'center', marginTop: 8 },
  subtitle: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: 'rgba(224,244,244,0.5)', textAlign: 'center', marginTop: 2, marginBottom: 16 },

  scroll: { flex: 1, paddingHorizontal: Spacing.pagePadding },
  playerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: Radius.xl, borderWidth: 1, borderColor: 'rgba(0,204,204,0.14)',
    padding: 14, marginBottom: 10,
  },
  playerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  playerPhoto: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'rgba(0,204,204,0.3)' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,204,204,0.18)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Montserrat_700Bold', fontSize: 18, color: '#00cccc' },
  playerName: { fontFamily: 'Montserrat_700Bold', fontSize: 15, color: '#e0f4f4' },
  currentPts: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: 'rgba(224,244,244,0.5)', marginTop: 2 },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.09)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  stepBtnAdd: { backgroundColor: 'rgba(0,204,204,0.18)', borderColor: 'rgba(0,204,204,0.38)' },
  stepMinus: { fontFamily: 'Montserrat_700Bold', fontSize: 20, color: '#e0f4f4', lineHeight: 24 },
  stepPlus:  { fontFamily: 'Montserrat_700Bold', fontSize: 20, color: '#00cccc', lineHeight: 24 },
  stepValue: {
    fontFamily: 'Montserrat_800ExtraBold', fontSize: 24, color: '#e0f4f4',
    minWidth: 48, textAlign: 'center',
    backgroundColor: 'rgba(0,204,204,0.08)',
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,204,204,0.22)',
    paddingVertical: 2, paddingHorizontal: 4,
  },

  footer: { paddingHorizontal: Spacing.pagePadding, paddingBottom: 16 },
  submitBtn: { borderRadius: Radius.full, overflow: 'hidden' },
  submitGrad: { paddingVertical: 16, alignItems: 'center' },
  submitText: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#001a1a', letterSpacing: 0.4 },
});

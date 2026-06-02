import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert, Image, Modal, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  loadGameState, saveGameState, clearGameState, GameState,
  getLeader, getSortedTeams, getBarColor, createSnapshot,
  getHighestActiveScore, buildPodium, saveHistory, loadHistory,
  loadPhotos,
} from '../../store/gameStore';
import { Colors, Radius, Spacing, Shadow } from '../../constants/Colors';
import { Toast, useToast } from '../../components/Toast';

export default function GameTab() {
  const [game, setGame]         = useState<GameState | null>(null);
  const [photos, setPhotos]     = useState<Record<string, string>>({});
  const [editModal, setEditModal] = useState(false);
  const [editScores, setEditScores] = useState<Record<string, string>>({});
  const { toastState, showToast } = useToast();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [g, ph] = await Promise.all([loadGameState(), loadPhotos()]);
        setGame(g);
        setPhotos(ph);
      })();
    }, [])
  );

  // ── No game ────────────────────────────────────────────────────────────────
  if (!game || !game.teams.length) {
    return (
      <View style={styles.noGameContainer}>
        <LinearGradient colors={['#e6f8f8', '#f9f9f9']} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.noGameSafe}>
          <View style={styles.noGameContent}>
            <Image source={require('../../assets/logo.png')} style={styles.noGameLogo} resizeMode="contain" />
            <Text style={styles.noGameTitle}>No Active Game</Text>
            <Text style={styles.noGameSub}>Start a new match to track scores</Text>
            <TouchableOpacity style={styles.newGameBtn} onPress={() => router.push('/setup')} activeOpacity={0.85}>
              <LinearGradient colors={['#004d4d', '#006666']} style={styles.newGameBtnGrad}>
                <Text style={styles.newGameBtnText}>New Game  →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const { teams, scores, eliminated, target, round, rejoined, hasRejoined, roundHistory, gameOver, log } = game!;
  const sorted = getSortedTeams(teams, scores);
  const leader = getLeader(teams, scores, eliminated);

  // ── Undo ───────────────────────────────────────────────────────────────────
  async function undoRound() {
    if (!game!.roundHistory.length) return;
    const history = [...game!.roundHistory];
    const snap = history.pop()!;
    const updated: GameState = {
      teams:       game!.teams,
      target:      game!.target,
      scores:      snap.scores,
      eliminated:  snap.eliminated,
      rejoined:    snap.rejoined,
      hasRejoined: snap.hasRejoined,
      elimOrder:   snap.elimOrder,
      podium:      snap.podium,
      round:       snap.round,
      log:         snap.log,
      roundHistory: history,
      gameOver:    false,
    };
    await saveGameState(updated);
    setGame(updated);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showToast('↩ Last action undone', '#f0b060');
  }

  // ── Edit modal ─────────────────────────────────────────────────────────────
  function openEdit() {
    const init: Record<string, string> = {};
    teams.forEach(t => (init[t] = String(scores[t])));
    setEditScores(init);
    setEditModal(true);
  }

  async function saveEdit() {
    const snapshot = createSnapshot(game!);
    const newScores = { ...scores };
    teams.forEach(t => {
      const v = parseInt(editScores[t]);
      if (!isNaN(v) && v >= 0) newScores[t] = v;
    });
    // Recompute eliminations
    const newElim = teams.filter(t => newScores[t] >= target);
    const newRej  = rejoined.filter(r => !newElim.includes(r));
    // Keep existing elimOrder for players still eliminated; append newly eliminated at end
    const prevElimOrder = game!.elimOrder;
    const stillInOrder  = prevElimOrder.filter(t => newElim.includes(t));
    const newlyElim     = newElim.filter(t => !prevElimOrder.includes(t));
    // Sort newly-eliminated by score descending (highest score = first out this edit)
    newlyElim.sort((a, b) => newScores[b] - newScores[a]);
    const newElimOrder = [...stillInOrder, ...newlyElim];
    // Recompute podium if game is over
    const remaining = teams.filter(t => !newElim.includes(t));
    const isStillOver = game!.gameOver && remaining.length <= 1;
    const newPodium = isStillOver
      ? [...remaining].sort((a, b) => newScores[a] - newScores[b]).concat([...newElimOrder].reverse())
      : game!.podium;
    const updated: GameState = {
      teams,
      target,
      round,
      scores:       newScores,
      eliminated:   newElim,
      rejoined:     newRej,
      hasRejoined:  game!.hasRejoined,
      elimOrder:    newElimOrder,
      podium:       newPodium,
      log:          game!.log,
      roundHistory: [...roundHistory, snapshot],
      gameOver:     game!.gameOver,
    };
    await saveGameState(updated);
    setGame(updated);
    setEditModal(false);
    showToast('✏️ Scores updated', Colors.accent);
  }

  // ── New game ───────────────────────────────────────────────────────────────
  async function newGame() {
    Alert.alert('New Game', 'Abandon this game and start fresh?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'New Game', style: 'destructive', onPress: async () => {
          await clearGameState();
          setGame(null);
          router.push('/setup');
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#e6f8f8', '#f0fafa', '#f9f9f9']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE MATCH</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            {/* Undo */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnWarn, !roundHistory.length && styles.actionBtnDisabled]}
              onPress={undoRound}
              disabled={!roundHistory.length}
            >
              <Text style={[styles.actionBtnText, styles.actionBtnTextWarn, !roundHistory.length && styles.actionBtnTextDisabled]}>↩ Undo</Text>
            </TouchableOpacity>
            {/* Edit */}
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnWarn]} onPress={openEdit}>
              <Text style={[styles.actionBtnText, styles.actionBtnTextWarn]}>✏️ Edit</Text>
            </TouchableOpacity>
            {/* New game */}
            <TouchableOpacity style={styles.actionBtn} onPress={newGame}>
              <Text style={styles.actionBtnText}>↩ New</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Target & Round ── */}
        <View style={styles.targetSection}>
          <Text style={styles.targetLabel}>
            Round <Text style={styles.targetValue}>{round - 1}</Text>
            {'  ·  '}
            Target: <Text style={styles.targetValue}>{target}</Text>
          </Text>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>

          {/* ── Podium banner (game over) ── */}
          {gameOver && (
            <View style={styles.podiumBanner}>
              <LinearGradient colors={['rgba(212,168,32,0.12)', 'rgba(0,204,204,0.06)']} style={styles.podiumBannerGrad}>
                <Text style={styles.podiumBannerTitle}>🏆 Final Standings</Text>
                <TouchableOpacity onPress={() => router.push('/podium')} style={styles.podiumBannerBtn} activeOpacity={0.85}>
                  <Text style={styles.podiumBannerBtnText}>View Podium  →</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          )}

          {/* ── Score Cards ── */}
          {sorted.map((name, idx) => {
            const score = scores[name];
            const pct   = Math.min(100, Math.round((score / target) * 100));
            const isElim     = eliminated.includes(name);
            const isRejoined = rejoined.includes(name) && !isElim;
            const isLead     = name === leader && !isElim;
            const barColor   = getBarColor(pct);
            const podiumIdx  = gameOver ? game.podium.indexOf(name) : -1;

            let cardBorder = styles.cardBorderDefault;
            if      (podiumIdx === 0) cardBorder = styles.cardBorder1st;
            else if (podiumIdx === 1) cardBorder = styles.cardBorder2nd;
            else if (podiumIdx === 2) cardBorder = styles.cardBorder3rd;
            else if (isRejoined)      cardBorder = styles.cardBorderRejoin;
            else if (isLead)          cardBorder = styles.cardBorderLead;

            const scoreColor = podiumIdx === 0 ? Colors.gold
              : podiumIdx === 1 ? Colors.silver
              : podiumIdx === 2 ? Colors.bronze
              : isElim ? Colors.outline
              : isRejoined ? '#9960d0'
              : isLead ? Colors.primaryContainer
              : pct >= 80 ? Colors.error
              : Colors.onSurface;

            const badgeEl = podiumIdx === 0 ? <View style={[styles.badge, styles.badge1st]}><Text style={styles.badgeText}>🥇 1st Place</Text></View>
              : podiumIdx === 1 ? <View style={[styles.badge, styles.badge2nd]}><Text style={styles.badgeText}>🥈 2nd Place</Text></View>
              : podiumIdx === 2 ? <View style={[styles.badge, styles.badge3rd]}><Text style={styles.badgeText}>🥉 3rd Place</Text></View>
              : isElim ? <View style={[styles.badge, styles.badgeElim]}><Text style={styles.badgeText}>✕ out</Text></View>
              : isRejoined ? <View style={[styles.badge, styles.badgeRejoin]}><Text style={styles.badgeText}>↩ rejoined</Text></View>
              : isLead ? <View style={[styles.badge, styles.badgeLead]}><Text style={styles.badgeText}>★ leading</Text></View>
              : null;

            return (
              <View key={name} style={[styles.scoreCard, cardBorder, isElim && !gameOver && styles.scoreCardElim]}>
                {podiumIdx === 0 && <Text style={styles.posRibbon}>🥇</Text>}
                {podiumIdx === 1 && <Text style={styles.posRibbon}>🥈</Text>}
                {podiumIdx === 2 && <Text style={styles.posRibbon}>🥉</Text>}

                <View style={styles.cardRow}>
                  {photos[name] ? (
                    <Image source={{ uri: photos[name] }} style={styles.cardPhoto} />
                  ) : (
                    <View style={styles.cardAvatar}>
                      <Text style={styles.cardAvatarText}>{name[0].toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardRank}>#{idx + 1}</Text>
                    <Text style={[styles.cardName, isElim && styles.cardNameElim]}>{name}</Text>
                    {badgeEl}
                  </View>
                  <Text style={[styles.cardScore, { color: scoreColor }]}>{score}</Text>
                </View>

                <View style={styles.progressBg}>
                  <View style={[styles.progressBar, {
                    width: `${isElim ? 100 : pct}%`,
                    backgroundColor: isElim ? Colors.surfaceContainerHighest : barColor,
                  }]} />
                </View>
              </View>
            );
          })}

          {/* ── Eliminated panel shortcut ── */}
          {eliminated.length > 0 && !gameOver && (
            <TouchableOpacity style={styles.elimSection} onPress={() => router.push('/elimination')} activeOpacity={0.85}>
              <Text style={styles.elimTitle}>💀 {eliminated.length} Eliminated  →</Text>
              <Text style={styles.elimSub}>Tap to manage rejoin protocol</Text>
            </TouchableOpacity>
          )}

          {/* ── Round Log ── */}
          {log.length > 0 && (
            <View style={styles.logSection}>
              <Text style={styles.logTitle}>Round Log</Text>
              {log.slice(0, 8).map((entry, i) => (
                <Text key={i} style={styles.logRow}>{entry}</Text>
              ))}
            </View>
          )}
        </ScrollView>

        {/* ── FAB ── */}
        {!gameOver && (
          <TouchableOpacity style={styles.fab} onPress={() => router.push('/round-entry')} activeOpacity={0.85}>
            <LinearGradient colors={['#00cccc', '#009999']} style={styles.fabGrad}>
              <Text style={styles.fabText}>+</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── Game Over CTAs ── */}
        {gameOver && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.podiumBtn} onPress={() => router.push('/podium')} activeOpacity={0.85}>
              <LinearGradient colors={['#d4a820', '#b08010']} style={styles.podiumBtnGrad}>
                <Text style={styles.podiumBtnText}>🏆 View Final Standings</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.newMatchBtn} onPress={newGame}>
              <Text style={styles.newMatchText}>New Match</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Toast ── */}
        <Toast message={toastState.message} visible={toastState.visible} color={toastState.color} />
      </SafeAreaView>

      {/* ── Edit Scores Modal ── */}
      <Modal visible={editModal} transparent animationType="fade" onRequestClose={() => setEditModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setEditModal(false)}>
          <TouchableOpacity style={styles.modal} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.modalTitle}>✏️ Edit Scores</Text>
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {teams.map(t => {
                const podiumIdx = gameOver ? game.podium.indexOf(t) : -1;
                const tag = podiumIdx === 0 ? ' 🥇' : podiumIdx === 1 ? ' 🥈' : podiumIdx === 2 ? ' 🥉'
                  : eliminated.includes(t) ? ' ✕' : rejoined.includes(t) ? ' ↩' : '';
                return (
                  <View key={t} style={styles.editRow}>
                    <Text style={styles.editLabel}>{t}{tag}</Text>
                    <TextInput
                      style={styles.editInput}
                      keyboardType="number-pad"
                      value={editScores[t] ?? ''}
                      onChangeText={v => setEditScores(prev => ({ ...prev, [t]: v }))}
                      maxLength={4}
                    />
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setEditModal(false)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSave]} onPress={saveEdit}>
                <Text style={styles.modalBtnSaveText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },

  // No game
  noGameContainer: { flex: 1 },
  noGameSafe: { flex: 1 },
  noGameContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: Spacing.pagePadding },
  noGameLogo: { width: 120, height: 48, marginBottom: 8 },
  noGameTitle: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 22, color: Colors.primary },
  noGameSub: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: Colors.onSurfaceVariant },
  newGameBtn: { width: '100%', borderRadius: Radius.full, overflow: 'hidden', marginTop: 8 },
  newGameBtnGrad: { paddingVertical: 15, alignItems: 'center' },
  newGameBtnText: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#fff' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.pagePadding, paddingTop: 8, paddingBottom: 6, flexWrap: 'wrap', gap: 6 },
  headerLeft: { gap: 4 },
  headerLogo: { width: 80, height: 28 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,204,204,0.12)', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00cccc' },
  liveText: { fontFamily: 'Montserrat_700Bold', fontSize: 10, color: Colors.secondary, letterSpacing: 0.8 },
  headerActions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLow },
  actionBtnWarn: { borderColor: '#c08040', backgroundColor: 'rgba(192,128,64,0.08)' },
  actionBtnDisabled: { opacity: 0.35 },
  actionBtnText: { fontFamily: 'Montserrat_600SemiBold', fontSize: 11, color: Colors.onSurfaceVariant },
  actionBtnTextWarn: { color: '#c08040' },
  actionBtnTextDisabled: { color: Colors.outline },

  targetSection: { paddingHorizontal: Spacing.pagePadding, paddingBottom: 8 },
  targetLabel: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: Colors.onSurfaceVariant },
  targetValue: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 13, color: Colors.primary },

  scroll: { flex: 1, paddingHorizontal: Spacing.pagePadding },

  // Podium banner (game over inline)
  podiumBanner: { borderRadius: Radius.xl, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(212,168,32,0.4)', ...Shadow.card },
  podiumBannerGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16 },
  podiumBannerTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 15, color: Colors.gold },
  podiumBannerBtn: { backgroundColor: Colors.gold, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 7 },
  podiumBannerBtnText: { fontFamily: 'Montserrat_700Bold', fontSize: 12, color: '#001a1a' },

  // Score cards
  scoreCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, marginBottom: 8, borderWidth: 1.5, position: 'relative', overflow: 'hidden', ...Shadow.card },
  cardBorderDefault: { borderColor: Colors.outlineVariant },
  cardBorderLead:    { borderColor: Colors.primaryContainer },
  cardBorderRejoin:  { borderColor: '#9960d0' },
  cardBorder1st:     { borderColor: Colors.gold },
  cardBorder2nd:     { borderColor: Colors.silver },
  cardBorder3rd:     { borderColor: Colors.bronze },
  scoreCardElim:     { opacity: 0.42 },
  posRibbon: { position: 'absolute', top: 8, right: 10, fontSize: 18 },

  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  cardPhoto: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: Colors.outlineVariant },
  cardAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.secondaryContainer, alignItems: 'center', justifyContent: 'center' },
  cardAvatarText: { fontFamily: 'Montserrat_700Bold', fontSize: 18, color: Colors.secondary },
  cardInfo: { flex: 1, gap: 3 },
  cardRank: { fontFamily: 'Montserrat_600SemiBold', fontSize: 10, color: Colors.outline },
  cardName: { fontFamily: 'Montserrat_700Bold', fontSize: 15, color: Colors.onSurface },
  cardNameElim: { color: Colors.outline },
  cardScore: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 26, letterSpacing: -1 },

  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full, borderWidth: 1 },
  badgeText: { fontFamily: 'Montserrat_700Bold', fontSize: 10, letterSpacing: 0.4 },
  badge1st:    { backgroundColor: 'rgba(212,168,32,0.15)',  borderColor: 'rgba(212,168,32,0.4)',  },
  badge2nd:    { backgroundColor: 'rgba(136,153,170,0.12)', borderColor: 'rgba(136,153,170,0.35)' },
  badge3rd:    { backgroundColor: 'rgba(176,112,64,0.13)',  borderColor: 'rgba(176,112,64,0.35)'  },
  badgeElim:   { backgroundColor: 'rgba(186,26,26,0.12)',   borderColor: 'rgba(186,26,26,0.25)'   },
  badgeRejoin: { backgroundColor: 'rgba(153,96,208,0.15)',  borderColor: 'rgba(153,96,208,0.3)'   },
  badgeLead:   { backgroundColor: 'rgba(0,77,77,0.12)',     borderColor: 'rgba(0,77,77,0.3)'      },

  progressBg:  { height: 3, backgroundColor: Colors.surfaceContainerHigh, borderRadius: 2, overflow: 'hidden' },
  progressBar: { height: 3, borderRadius: 2 },

  elimSection: { backgroundColor: 'rgba(186,26,26,0.06)', borderRadius: Radius.xl, borderWidth: 1, borderColor: 'rgba(186,26,26,0.2)', padding: 14, marginBottom: 10, alignItems: 'center', gap: 4 },
  elimTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 14, color: Colors.error },
  elimSub: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: Colors.onSurfaceVariant },

  logSection: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.outlineVariant },
  logTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 11, color: Colors.outline, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  logRow: { fontFamily: 'Montserrat_400Regular', fontSize: 11, color: Colors.onSurfaceVariant, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerHigh, lineHeight: 16 },

  fab: { position: 'absolute', bottom: 80, right: 20, borderRadius: 28, overflow: 'hidden', ...Shadow.float },
  fabGrad: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 28 },
  fabText: { fontSize: 28, color: '#001a1a', fontFamily: 'Montserrat_800ExtraBold', lineHeight: 32 },

  footer: { paddingHorizontal: Spacing.pagePadding, paddingBottom: 16, gap: 10 },
  podiumBtn: { borderRadius: Radius.full, overflow: 'hidden' },
  podiumBtnGrad: { paddingVertical: 14, alignItems: 'center' },
  podiumBtnText: { fontFamily: 'Montserrat_700Bold', fontSize: 15, color: '#fff' },
  newMatchBtn: { alignItems: 'center', paddingVertical: 12 },
  newMatchText: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: Colors.onSurfaceVariant },

  // Edit modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  modal: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 22, width: '88%', maxWidth: 360, borderWidth: 1, borderColor: Colors.outlineVariant },
  modalTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: Colors.onSurface, marginBottom: 16 },
  editRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerHigh },
  editLabel: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: Colors.onSurface, flex: 1 },
  editInput: { width: 80, height: 40, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.outlineVariant, textAlign: 'center', fontFamily: 'Montserrat_600SemiBold', fontSize: 15, color: Colors.primary, backgroundColor: Colors.surfaceContainerLow },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: Radius.lg, alignItems: 'center', borderWidth: 1 },
  modalBtnCancel: { borderColor: Colors.error, backgroundColor: 'rgba(186,26,26,0.06)' },
  modalBtnSave: { borderColor: Colors.primaryContainer, backgroundColor: Colors.primaryContainer },
  modalBtnCancelText: { fontFamily: 'Montserrat_700Bold', fontSize: 13, color: Colors.error },
  modalBtnSaveText: { fontFamily: 'Montserrat_700Bold', fontSize: 13, color: '#fff' },
});

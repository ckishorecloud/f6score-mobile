import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { loadHistory, saveHistory, HistoryEntry } from '../../store/gameStore';
import { Colors, Radius, Spacing, Shadow } from '../../constants/Colors';

export default function HistoryTab() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const h = await loadHistory();
        setHistory(h);
      })();
    }, [])
  );

  function toggleExpand(id: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function clearAll() {
    Alert.alert('Clear History', 'Delete all game history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive', onPress: async () => {
          setHistory([]);
          await saveHistory([]);
        },
      },
    ]);
  }

  const medals = ['🥇', '🥈', '🥉'];
  const podiumClasses = [styles.hp1, styles.hp2, styles.hp3];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#e6f8f8', '#f0fafa', '#f9f9f9']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>F6Score</Text>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>Battle Logs</Text>
          {history.length > 0 && (
            <TouchableOpacity onPress={clearAll}>
              <Text style={styles.clearBtn}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.subtitle}>Your recent match history and performance outcomes.</Text>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {history.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyText}>No completed games yet.</Text>
              <Text style={styles.emptySub}>Finish a match to see it here.</Text>
            </View>
          )}
          {history.map((g, i) => {
            const isExpanded = expanded.has(g.id);
            const winner = g.podium?.[0];
            return (
              <TouchableOpacity
                key={g.id}
                style={styles.histCard}
                onPress={() => toggleExpand(g.id)}
                activeOpacity={0.85}
              >
                {/* Winner banner */}
                <View style={styles.histTop}>
                  <View style={styles.winnerRow}>
                    <View style={styles.winnerAvatar}>
                      <Text style={styles.winnerAvatarText}>{winner?.name?.[0]?.toUpperCase() ?? '?'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.winnerLabel}>🥇  {winner?.name ?? 'Unknown'}</Text>
                      <Text style={styles.winnerScore}>{winner?.score} pts</Text>
                    </View>
                    <Text style={styles.histDate}>{g.date?.split(',')[0] ?? ''}</Text>
                  </View>
                  <Text style={styles.histMeta}>{g.players} players · {g.rounds} rounds · Target {g.target}</Text>
                </View>

                {/* Expanded detail */}
                {isExpanded && (
                  <View style={styles.histDetail}>
                    <View style={styles.histPodium}>
                      {(g.podium ?? []).map((pl, pi) => (
                        <View key={pl.name} style={[styles.podiumPill, podiumClasses[pi] ?? styles.hp3]}>
                          <Text style={styles.podiumPillText}>{medals[pi] ?? `#${pi+1}`}  {pl.name} · {pl.score}pts</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={styles.allScoresTitle}>All scores (lowest = best):</Text>
                    <View style={styles.allScores}>
                      {(g.finalScores ?? []).map(fs => (
                        <View key={fs.name} style={styles.scoreChip}>
                          <Text style={styles.scoreChipText}>{fs.name}: {fs.score}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                <Text style={styles.expandHint}>{isExpanded ? '▲ Less' : '▼ Details'}</Text>
              </TouchableOpacity>
            );
          })}
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
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.pagePadding, marginTop: 8 },
  title: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 26, color: Colors.primary },
  clearBtn: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: Colors.error },
  subtitle: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: Colors.onSurfaceVariant, paddingHorizontal: Spacing.pagePadding, marginTop: 4, marginBottom: 16 },

  scroll: { flex: 1, paddingHorizontal: Spacing.pagePadding },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: Colors.onSurface },
  emptySub: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: Colors.outline },

  histCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    borderWidth: 1.5, borderColor: Colors.outlineVariant,
    padding: 14, marginBottom: 12, ...Shadow.card,
  },
  histTop: { gap: 6 },
  winnerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  winnerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(212,168,32,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.gold },
  winnerAvatarText: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: Colors.gold },
  winnerLabel: { fontFamily: 'Montserrat_700Bold', fontSize: 15, color: Colors.gold },
  winnerScore: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 1 },
  histDate: { fontFamily: 'Montserrat_400Regular', fontSize: 11, color: Colors.outline },
  histMeta: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: Colors.outline },

  histDetail: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.outlineVariant, gap: 10 },
  histPodium: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  podiumPill: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  podiumPillText: { fontFamily: 'Montserrat_600SemiBold', fontSize: 12 },
  hp1: { backgroundColor: 'rgba(212,168,32,0.12)', borderColor: 'rgba(212,168,32,0.4)' },
  hp2: { backgroundColor: 'rgba(136,153,170,0.1)', borderColor: 'rgba(136,153,170,0.3)' },
  hp3: { backgroundColor: 'rgba(176,112,64,0.1)', borderColor: 'rgba(176,112,64,0.3)' },
  allScoresTitle: { fontFamily: 'Montserrat_500Medium', fontSize: 11, color: Colors.outline, letterSpacing: 0.3 },
  allScores: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  scoreChip: { backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.outlineVariant },
  scoreChipText: { fontFamily: 'Montserrat_500Medium', fontSize: 12, color: Colors.onSurfaceVariant },
  expandHint: { fontFamily: 'Montserrat_600SemiBold', fontSize: 11, color: Colors.outline, textAlign: 'center', marginTop: 8 },
});

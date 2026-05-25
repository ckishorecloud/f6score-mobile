import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { loadHistory, HistoryEntry } from '../../store/gameStore';
import { Colors, Radius, Spacing, Shadow } from '../../constants/Colors';

interface PlayerStats {
  name: string;
  gamesPlayed: number;
  wins: number;
  bestScore: number;
  avgScore: number;
  lowestScore: number;
}

export default function StatsTab() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const h = await loadHistory();
        setHistory(h);
      })();
    }, [])
  );

  // Compute player stats from history
  const playerMap: Record<string, { scores: number[]; wins: number }> = {};
  history.forEach(game => {
    game.finalScores?.forEach(fs => {
      if (!playerMap[fs.name]) playerMap[fs.name] = { scores: [], wins: 0 };
      playerMap[fs.name].scores.push(fs.score);
    });
    const winner = game.podium?.[0]?.name;
    if (winner && playerMap[winner]) playerMap[winner].wins += 1;
  });

  const stats: PlayerStats[] = Object.entries(playerMap).map(([name, data]) => ({
    name,
    gamesPlayed: data.scores.length,
    wins: data.wins,
    bestScore: Math.min(...data.scores),
    lowestScore: Math.min(...data.scores),
    avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
  })).sort((a, b) => b.wins - a.wins || a.avgScore - b.avgScore);

  const selectedStats = selected ? stats.find(s => s.name === selected) : null;
  const selectedHistory = selected
    ? history.filter(g => g.finalScores?.some(fs => fs.name === selected))
    : [];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#e6f8f8', '#f0fafa', '#f9f9f9']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.appName}>F6Score</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={styles.heroCard}>
            <LinearGradient colors={['#004d4d', '#006666']} style={styles.heroGrad}>
              <Text style={styles.heroTitle}>Performance{'\n'}Analytics</Text>
              <Text style={styles.heroSub}>Your competitive journey and{'\n'}statistical breakdown.</Text>
              <TouchableOpacity style={styles.exportBtn}>
                <Text style={styles.exportBtnText}>Export Report</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {stats.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📊</Text>
              <Text style={styles.emptyText}>No stats yet</Text>
              <Text style={styles.emptySub}>Complete games to see analytics</Text>
            </View>
          )}

          {/* Player picker */}
          {stats.length > 0 && (
            <View style={{ paddingHorizontal: Spacing.pagePadding, marginBottom: 16 }}>
              <Text style={styles.sectionTitle}>Select Player</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {stats.map(s => (
                  <TouchableOpacity
                    key={s.name}
                    style={[styles.playerChip, selected === s.name && styles.playerChipActive]}
                    onPress={() => setSelected(selected === s.name ? null : s.name)}
                  >
                    <Text style={[styles.playerChipText, selected === s.name && styles.playerChipTextActive]}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Selected player detail */}
          {selectedStats && (
            <View style={{ paddingHorizontal: Spacing.pagePadding, gap: 12, marginBottom: 16 }}>
              <Text style={styles.sectionTitle}>Score Progression</Text>
              {/* Simple bar chart */}
              <View style={styles.chartCard}>
                <View style={styles.chartBars}>
                  {selectedHistory.slice(-7).map((g, i) => {
                    const score = g.finalScores?.find(fs => fs.name === selectedStats.name)?.score ?? 0;
                    const maxScore = Math.max(...selectedHistory.map(gh => gh.finalScores?.find(fs => fs.name === selectedStats.name)?.score ?? 0), 1);
                    const pct = Math.round((score / maxScore) * 100);
                    return (
                      <View key={g.id} style={styles.chartBarWrapper}>
                        <Text style={styles.chartBarValue}>{score}</Text>
                        <View style={styles.chartBarBg}>
                          <LinearGradient
                            colors={['#00cccc', '#004d4d']}
                            style={[styles.chartBarFill, { height: `${pct}%` }]}
                          />
                        </View>
                        <Text style={styles.chartBarLabel}>G{i + 1}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Stat pills */}
              <View style={styles.statGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statEmoji}>🏆</Text>
                  <Text style={styles.statValue}>{selectedStats.bestScore}</Text>
                  <Text style={styles.statLabel}>BEST ROUND</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statEmoji}>↓</Text>
                  <Text style={styles.statValue}>{selectedStats.lowestScore}</Text>
                  <Text style={styles.statLabel}>LOWEST</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statEmoji}>〜</Text>
                  <Text style={styles.statValue}>{selectedStats.avgScore}</Text>
                  <Text style={styles.statLabel}>AVERAGE</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statEmoji}>🎮</Text>
                  <Text style={styles.statValue}>{selectedStats.gamesPlayed}</Text>
                  <Text style={styles.statLabel}>GAMES</Text>
                </View>
              </View>
            </View>
          )}

          {/* All players table */}
          {stats.length > 0 && (
            <View style={{ paddingHorizontal: Spacing.pagePadding }}>
              <Text style={styles.sectionTitle}>All Players</Text>
              <View style={styles.tableCard}>
                {stats.map((s, i) => (
                  <TouchableOpacity
                    key={s.name}
                    style={[styles.tableRow, i > 0 && styles.tableRowBorder]}
                    onPress={() => setSelected(s.name)}
                  >
                    <Text style={styles.tableRank}>#{i + 1}</Text>
                    <View style={styles.tableAvatar}>
                      <Text style={styles.tableAvatarText}>{s.name[0].toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tableName}>{s.name}</Text>
                      <Text style={styles.tableMeta}>{s.gamesPlayed} games · avg {s.avgScore}</Text>
                    </View>
                    <View style={styles.winsChip}>
                      <Text style={styles.winsText}>{s.wins}W</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
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

  heroCard: { marginHorizontal: Spacing.pagePadding, borderRadius: Radius.xl, overflow: 'hidden', marginBottom: 20, marginTop: 8, ...Shadow.float },
  heroGrad: { padding: 24, gap: 8 },
  heroTitle: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 26, color: '#fff', lineHeight: 34 },
  heroSub: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 19 },
  exportBtn: { marginTop: 8, backgroundColor: 'rgba(0,204,204,0.25)', borderRadius: Radius.full, borderWidth: 1, borderColor: '#00cccc', paddingHorizontal: 18, paddingVertical: 9, alignSelf: 'flex-start' },
  exportBtnText: { fontFamily: 'Montserrat_700Bold', fontSize: 13, color: '#00cccc' },

  sectionTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 13, color: Colors.onSurfaceVariant, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },

  empty: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: Colors.onSurface },
  emptySub: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: Colors.outline },

  playerChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.outlineVariant },
  playerChipActive: { backgroundColor: Colors.primaryContainer, borderColor: Colors.primaryContainer },
  playerChipText: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: Colors.onSurfaceVariant },
  playerChipTextActive: { color: '#fff' },

  chartCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 16, ...Shadow.card, height: 160 },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: '100%' },
  chartBarWrapper: { flex: 1, alignItems: 'center', height: '100%', gap: 4 },
  chartBarValue: { fontFamily: 'Montserrat_700Bold', fontSize: 10, color: Colors.primaryContainer },
  chartBarBg: { flex: 1, width: '100%', backgroundColor: Colors.surfaceContainerHigh, borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  chartBarFill: { width: '100%', borderRadius: 4 },
  chartBarLabel: { fontFamily: 'Montserrat_500Medium', fontSize: 10, color: Colors.outline },

  statGrid: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 14, alignItems: 'center', gap: 4, ...Shadow.card },
  statEmoji: { fontSize: 20 },
  statValue: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 22, color: Colors.primary },
  statLabel: { fontFamily: 'Montserrat_600SemiBold', fontSize: 9, color: Colors.outline, letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'center' },

  tableCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, overflow: 'hidden', ...Shadow.card, marginBottom: 16 },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  tableRowBorder: { borderTopWidth: 1, borderTopColor: Colors.surfaceContainerHigh },
  tableRank: { fontFamily: 'Montserrat_700Bold', fontSize: 12, color: Colors.outline, width: 24 },
  tableAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.secondaryContainer, alignItems: 'center', justifyContent: 'center' },
  tableAvatarText: { fontFamily: 'Montserrat_700Bold', fontSize: 14, color: Colors.secondary },
  tableName: { fontFamily: 'Montserrat_700Bold', fontSize: 14, color: Colors.onSurface },
  tableMeta: { fontFamily: 'Montserrat_400Regular', fontSize: 11, color: Colors.outline, marginTop: 1 },
  winsChip: { backgroundColor: Colors.secondaryContainer, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  winsText: { fontFamily: 'Montserrat_700Bold', fontSize: 12, color: Colors.secondary },
});

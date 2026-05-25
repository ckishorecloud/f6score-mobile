import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { loadHistory, HistoryEntry } from '../../store/gameStore';
import { Colors, Radius, Spacing, Shadow } from '../../constants/Colors';

interface RankEntry {
  name: string;
  wins: number;
  bestScore: number;
  gamesPlayed: number;
  winRate: number;
}

export default function RanksTab() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'wins' | 'score'>('all');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const h = await loadHistory();
        setHistory(h);
      })();
    }, [])
  );

  const playerMap: Record<string, { wins: number; scores: number[]; gamesPlayed: number }> = {};
  history.forEach(game => {
    game.finalScores?.forEach(fs => {
      if (!playerMap[fs.name]) playerMap[fs.name] = { wins: 0, scores: [], gamesPlayed: 0 };
      playerMap[fs.name].scores.push(fs.score);
      playerMap[fs.name].gamesPlayed += 1;
    });
    const winner = game.podium?.[0]?.name;
    if (winner && playerMap[winner]) playerMap[winner].wins += 1;
  });

  let ranks: RankEntry[] = Object.entries(playerMap).map(([name, d]) => ({
    name,
    wins: d.wins,
    bestScore: Math.min(...d.scores),
    gamesPlayed: d.gamesPlayed,
    winRate: Math.round((d.wins / d.gamesPlayed) * 100),
  }));

  if (filter === 'wins') ranks.sort((a, b) => b.wins - a.wins || a.bestScore - b.bestScore);
  else if (filter === 'score') ranks.sort((a, b) => a.bestScore - b.bestScore);
  else ranks.sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || a.bestScore - b.bestScore);

  const top3 = ranks.slice(0, 3);

  const podiumColors = [Colors.gold, Colors.silver, Colors.bronze];
  const podiumBgs = ['rgba(212,168,32,0.12)', 'rgba(136,153,170,0.1)', 'rgba(176,112,64,0.1)'];
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#e0f6f6', '#ecf8f8', '#f9f9f9']} style={StyleSheet.absoluteFill} />
      {/* Header teal wave */}
      <LinearGradient
        colors={['rgba(0,77,77,0.5)', 'transparent']}
        style={[StyleSheet.absoluteFill, { height: 260 }]}
      />

      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.appName}>F6Score</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          <Text style={styles.title}>Global Ranks</Text>
          <Text style={styles.subtitle}>The absolute pinnacle of aquatic mastery. These are the legends of the deep.</Text>

          {/* Top 3 podium cards */}
          {top3.length > 0 && (
            <View style={styles.podiumSection}>
              {top3.map((p, i) => (
                <View key={p.name} style={[styles.podiumCard, { borderColor: podiumColors[i] + '80', backgroundColor: podiumBgs[i] }]}>
                  <View style={styles.podiumCardLeft}>
                    <Text style={[styles.podiumRankNum, { color: podiumColors[i] }]}>#{i + 1}</Text>
                    <View style={[styles.podiumAvatar, { backgroundColor: podiumColors[i] + '22', borderColor: podiumColors[i] + '60' }]}>
                      <Text style={[styles.podiumAvatarText, { color: podiumColors[i] }]}>{p.name[0].toUpperCase()}</Text>
                    </View>
                    <View>
                      <Text style={styles.podiumName}>{p.name}</Text>
                      <Text style={[styles.podiumSub, { color: podiumColors[i] }]}>{p.wins} wins · {p.winRate}% win rate</Text>
                    </View>
                  </View>
                  <View style={styles.podiumRight}>
                    <Text style={[styles.podiumBestScore, { color: podiumColors[i] }]}>{p.bestScore.toLocaleString()}</Text>
                    <Text style={styles.podiumBestLabel}>best</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Filter row */}
          {ranks.length > 0 && (
            <View style={styles.filterRow}>
              <Text style={styles.filterTitle}>All-Time High</Text>
              <View style={styles.filterBtns}>
                {(['all', 'wins', 'score'] as const).map(f => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
                    onPress={() => setFilter(f)}
                  >
                    <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
                      {f === 'all' ? 'All' : f === 'wins' ? 'Wins' : 'Score'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {ranks.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🏅</Text>
              <Text style={styles.emptyText}>No rankings yet</Text>
              <Text style={styles.emptySub}>Complete matches to build the leaderboard</Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: Spacing.pagePadding }}>
              {ranks.map((r, i) => (
                <View key={r.name} style={styles.rankRow}>
                  <Text style={styles.rankNum}>#{i + 1}</Text>
                  <View style={styles.rankAvatar}>
                    <Text style={styles.rankAvatarText}>{r.name[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rankName}>{r.name}</Text>
                    <Text style={styles.rankMeta}>{r.gamesPlayed} games played</Text>
                  </View>
                  <View style={styles.rankRight}>
                    <Text style={styles.rankScore}>{r.bestScore.toLocaleString()}</Text>
                    <Text style={styles.rankScoreLabel}>pts</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {ranks.length > 0 && (
            <TouchableOpacity style={styles.loadMore}>
              <Text style={styles.loadMoreText}>Load More  ↓</Text>
            </TouchableOpacity>
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
  appName: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#fff' },
  title: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 28, color: '#fff', paddingHorizontal: Spacing.pagePadding, marginTop: 8 },
  subtitle: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.7)', paddingHorizontal: Spacing.pagePadding, marginTop: 6, marginBottom: 20, lineHeight: 19 },

  podiumSection: { paddingHorizontal: Spacing.pagePadding, gap: 10, marginBottom: 20 },
  podiumCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Radius.xl, borderWidth: 1.5, padding: 14, ...Shadow.card },
  podiumCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  podiumRankNum: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 14, width: 28 },
  podiumAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  podiumAvatarText: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 18 },
  podiumName: { fontFamily: 'Montserrat_700Bold', fontSize: 15, color: Colors.onSurface },
  podiumSub: { fontFamily: 'Montserrat_400Regular', fontSize: 11, marginTop: 2 },
  podiumRight: { alignItems: 'flex-end' },
  podiumBestScore: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 22 },
  podiumBestLabel: { fontFamily: 'Montserrat_400Regular', fontSize: 11, color: Colors.outline },

  filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.pagePadding, marginBottom: 12 },
  filterTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 14, color: Colors.onSurface },
  filterBtns: { flexDirection: 'row', gap: 6, backgroundColor: Colors.surfaceContainerHigh, borderRadius: Radius.full, padding: 3 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full },
  filterBtnActive: { backgroundColor: Colors.surface },
  filterBtnText: { fontFamily: 'Montserrat_600SemiBold', fontSize: 12, color: Colors.outline },
  filterBtnTextActive: { color: Colors.primaryContainer },

  empty: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: Colors.onSurface },
  emptySub: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: Colors.outline, textAlign: 'center', paddingHorizontal: 40 },

  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 12, marginBottom: 8, ...Shadow.card },
  rankNum: { fontFamily: 'Montserrat_700Bold', fontSize: 13, color: Colors.outline, width: 28 },
  rankAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.secondaryContainer, alignItems: 'center', justifyContent: 'center' },
  rankAvatarText: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: Colors.secondary },
  rankName: { fontFamily: 'Montserrat_700Bold', fontSize: 14, color: Colors.onSurface },
  rankMeta: { fontFamily: 'Montserrat_400Regular', fontSize: 11, color: Colors.outline, marginTop: 2 },
  rankRight: { alignItems: 'flex-end' },
  rankScore: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 18, color: Colors.primaryContainer },
  rankScoreLabel: { fontFamily: 'Montserrat_400Regular', fontSize: 10, color: Colors.outline },

  loadMore: { alignItems: 'center', marginTop: 8, paddingVertical: 12 },
  loadMoreText: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: Colors.secondary },
});

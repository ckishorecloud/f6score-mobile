import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image, StyleSheet, Text, TouchableOpacity, View, FlatList, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Radius, Spacing, Shadow } from '../constants/Colors';
import { saveGameState, GameState, loadPhotos } from '../store/gameStore';

export default function SelectPlayers() {
  const [teams, setTeams]   = useState<string[]>([]);
  const [target, setTarget] = useState(150);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [photos, setPhotos] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const [raw, ph] = await Promise.all([
        AsyncStorage.getItem('pending_game'),
        loadPhotos(),
      ]);
      if (raw) {
        const { teams: t, target: tgt } = JSON.parse(raw);
        setTeams(t);
        setTarget(tgt);
        setSelected(new Set(t)); // pre-select all
      }
      setPhotos(ph);
    })();
  }, []);

  function toggle(name: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  async function startGame() {
    if (selected.size < 2) { Alert.alert('Squad up!', 'Select at least 2 players'); return; }
    const activePlayers = teams.filter(n => selected.has(n));
    const scores: Record<string, number> = {};
    activePlayers.forEach(t => (scores[t] = 0));

    const state: GameState = {
      teams: activePlayers,
      target,
      round: 1,
      scores,
      eliminated: [],
      rejoined: [],
      hasRejoined: [],
      elimOrder: [],
      podium: [],
      log: [],
      roundHistory: [],
      gameOver: false,
    };
    await saveGameState(state);
    router.replace('/(tabs)');
  }

  const renderItem = ({ item }: { item: string }) => {
    const isSelected = selected.has(item);
    return (
      <TouchableOpacity
        style={[styles.playerCard, isSelected && styles.playerCardSelected]}
        onPress={() => toggle(item)}
        activeOpacity={0.75}
      >
        {photos[item] ? (
          <View style={[styles.avatar, isSelected && styles.avatarSelected]}>
            <Image source={{ uri: photos[item] }} style={styles.playerPhoto} />
            {isSelected && (
              <View style={styles.checkOverlay}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.avatar, isSelected && styles.avatarSelected]}>
            {isSelected ? <Text style={styles.checkmark}>✓</Text>
              : <Text style={styles.avatarInitial}>{item[0].toUpperCase()}</Text>}
          </View>
        )}
        <Text style={[styles.playerName, isSelected && styles.playerNameSelected]}>{item}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#e6f8f8', '#f0fafa', '#f9f9f9']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Image source={require('../assets/logo.png')} style={{ width: 80, height: 30 }} resizeMode="contain" />
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.topSection}>
          <Text style={styles.badge}>👥  Squad Assembly</Text>
          <Text style={styles.title}>Select Players</Text>
          <Text style={styles.subtitle}>Choose the crew for your next match.{'\n'}Select at least two players to begin scoring.</Text>
        </View>

        <FlatList
          data={teams}
          keyExtractor={item => item}
          renderItem={renderItem}
          numColumns={3}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        />

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.selectedInfo}>
            {selected.size > 0 && (
              <View style={styles.selectedAvatars}>
                {[...selected].slice(0, 3).map(n => (
                  <View key={n} style={styles.miniAvatar}>
                    <Text style={styles.miniAvatarText}>{n[0].toUpperCase()}</Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={styles.selectedCount}>
              {selected.size} player{selected.size !== 1 ? 's' : ''} selected
            </Text>
          </View>
          <TouchableOpacity onPress={startGame} style={styles.startBtn} activeOpacity={0.85}>
            <LinearGradient
              colors={['#004d4d', '#006666']}
              style={styles.startBtnGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Text style={styles.startBtnText}>Start Game  →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.pagePadding, paddingTop: 8, paddingBottom: 4 },
  backBtn: { width: 36, height: 36, borderRadius: Radius.full, backgroundColor: Colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 18, color: Colors.onSurface, lineHeight: 22 },
  appName: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: Colors.primaryContainer },

  topSection: { paddingHorizontal: Spacing.pagePadding, paddingTop: 16, paddingBottom: 20 },
  badge: { fontFamily: 'Montserrat_600SemiBold', fontSize: 12, color: Colors.secondary, letterSpacing: 0.5, marginBottom: 8 },
  title: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 28, color: Colors.primary, marginBottom: 6 },
  subtitle: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: Colors.onSurfaceVariant, lineHeight: 19 },

  grid: { paddingHorizontal: Spacing.pagePadding, gap: 12, paddingBottom: 16 },
  playerCard: {
    flex: 1, alignItems: 'center', paddingVertical: 16,
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    borderWidth: 1.5, borderColor: Colors.outlineVariant,
    margin: 4, gap: 8, ...Shadow.card,
  },
  playerCardSelected: { borderColor: Colors.primaryContainer, backgroundColor: 'rgba(0,77,77,0.06)' },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.outlineVariant,
  },
  avatarSelected: { backgroundColor: Colors.primaryContainer, borderColor: Colors.primaryContainer },
  playerPhoto: { width: 56, height: 56, borderRadius: 28 },
  checkOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,77,77,0.6)', borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: 'Montserrat_700Bold', fontSize: 20, color: Colors.onSurfaceVariant },
  checkmark: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 22, color: '#fff' },
  playerName: { fontFamily: 'Montserrat_600SemiBold', fontSize: 12, color: Colors.onSurface, textAlign: 'center' },
  playerNameSelected: { color: Colors.primaryContainer },

  footer: { paddingHorizontal: Spacing.pagePadding, paddingBottom: 16, gap: 12 },
  selectedInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectedAvatars: { flexDirection: 'row' },
  miniAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center', marginLeft: -6, borderWidth: 2, borderColor: Colors.background },
  miniAvatarText: { fontFamily: 'Montserrat_700Bold', fontSize: 11, color: '#fff' },
  selectedCount: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: Colors.onSurfaceVariant },
  startBtn: { borderRadius: Radius.full, overflow: 'hidden' },
  startBtnGradient: { paddingVertical: 15, alignItems: 'center' },
  startBtnText: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#fff', letterSpacing: 0.4 },
});

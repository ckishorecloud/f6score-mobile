import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert, Image, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Radius, Spacing, Shadow } from '../constants/Colors';
import {
  loadPlayerList, loadSelected, savePlayerList, loadPhotos,
  savePhotos, deletePlayer, DEFAULT_PLAYERS,
} from '../store/gameStore';

const TARGET_PRESETS = [
  { value: 100, label: '100', sub: 'Short Game' },
  { value: 150, label: '150', sub: 'Standard' },
  { value: 200, label: '200', sub: 'Epic Match' },
];

export default function SetupScreen() {
  const [playerList, setPlayerList] = useState<string[]>([]);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [target, setTarget]         = useState(150);
  const [customTarget, setCustomTarget] = useState('200');
  const [useCustom, setUseCustom]   = useState(false);
  const [newName, setNewName]        = useState('');
  const [photos, setPhotos]          = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const [pl, sel, ph] = await Promise.all([loadPlayerList(), loadSelected(), loadPhotos()]);
      setPlayerList(pl);
      setSelected(new Set(sel));
      setPhotos(ph);
    })();
  }, []);

  // ── Player management ──────────────────────────────────────────────────────
  function togglePlayer(name: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(playerList));
  }

  function clearAll() {
    setSelected(new Set());
  }

  function addPlayer() {
    const name = newName.trim();
    if (!name) return;
    if (playerList.map(p => p.toLowerCase()).includes(name.toLowerCase())) {
      Alert.alert('Duplicate', `"${name}" is already in the list`); return;
    }
    if (playerList.length >= 30) { Alert.alert('Limit', 'Maximum 30 players'); return; }
    const next = [...playerList, name];
    setPlayerList(next);
    setSelected(prev => { const s = new Set(prev); s.add(name); return s; });
    setNewName('');
  }

  async function removePlayer(name: string) {
    Alert.alert('Remove Player', `Remove "${name}" from the list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          const { newList, newSel } = await deletePlayer(name);
          setPlayerList(newList);
          setSelected(new Set(newSel));
          const newPhotos = { ...photos };
          delete newPhotos[name];
          setPhotos(newPhotos);
        },
      },
    ]);
  }

  async function pickPhoto(name: string) {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!res.granted) { Alert.alert('Permission needed', 'Allow access to photos in settings'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      const newPhotos = { ...photos, [name]: uri };
      setPhotos(newPhotos);
      await savePhotos(newPhotos);
    }
  }

  // ── Start game ─────────────────────────────────────────────────────────────
  async function startGame() {
    if (selected.size < 2) { Alert.alert('Select Players', 'Pick at least 2 players'); return; }
    const finalTarget = useCustom ? (parseInt(customTarget) || 150) : target;
    const teams = playerList.filter(n => selected.has(n));
    await savePlayerList(playerList, [...selected]);
    await AsyncStorage.setItem('pending_game', JSON.stringify({ teams, target: finalTarget }));
    router.push('/select-players');
  }

  const selCount = selected.size;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#f0fafa', '#e6f4f4', '#f9f9f9']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Game Setup</Text>
          <Text style={styles.subtitle}>Configure your match settings and invite players.</Text>

          {/* ── Rule note ── */}
          <View style={styles.ruleNote}>
            <Text style={styles.ruleText}>
              <Text style={styles.ruleAccent}>★ Lowest score leads.</Text>
              {' '}Accumulate points each round — reach the target and you're eliminated.{'\n'}
              <Text style={styles.ruleRejoin}>↩ Rejoin rule:</Text>
              {' '}Eliminated players can rejoin at highest active score + 1.
            </Text>
          </View>

          {/* ── Target Score ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🎯</Text>
              <Text style={styles.sectionTitle}>Target Score</Text>
            </View>
            <View style={styles.targetRow}>
              {TARGET_PRESETS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.targetCard, !useCustom && target === opt.value && styles.targetCardActive]}
                  onPress={() => { setTarget(opt.value); setUseCustom(false); }}
                  activeOpacity={0.7}
                >
                  {!useCustom && target === opt.value && <Text style={styles.targetCheck}>✓</Text>}
                  <Text style={[styles.targetValue, !useCustom && target === opt.value && styles.targetValueActive]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.targetSub, !useCustom && target === opt.value && styles.targetSubActive]}>
                    {opt.sub}
                  </Text>
                </TouchableOpacity>
              ))}
              {/* Custom option */}
              <TouchableOpacity
                style={[styles.targetCard, useCustom && styles.targetCardActive]}
                onPress={() => setUseCustom(true)}
                activeOpacity={0.7}
              >
                {useCustom && <Text style={styles.targetCheck}>✓</Text>}
                <Text style={[styles.targetValue, useCustom && styles.targetValueActive]}>✎</Text>
                <Text style={[styles.targetSub, useCustom && styles.targetSubActive]}>Custom</Text>
              </TouchableOpacity>
            </View>
            {useCustom && (
              <TextInput
                style={styles.customInput}
                keyboardType="number-pad"
                value={customTarget}
                onChangeText={setCustomTarget}
                placeholder="Enter target..."
                placeholderTextColor={Colors.outline}
                maxLength={4}
              />
            )}
          </View>

          {/* ── Players ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>👥</Text>
              <Text style={styles.sectionTitle}>Players</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{selCount}/{playerList.length}</Text>
              </View>
            </View>

            {/* Select All / Clear All */}
            <View style={styles.bulkRow}>
              <TouchableOpacity style={styles.bulkBtn} onPress={selectAll}>
                <Text style={styles.bulkBtnText}>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.bulkBtn, styles.bulkBtnDanger]} onPress={clearAll}>
                <Text style={[styles.bulkBtnText, styles.bulkBtnTextDanger]}>Clear All</Text>
              </TouchableOpacity>
            </View>

            {/* Player pool */}
            <View style={styles.poolWrap}>
              {playerList.map(name => {
                const isSel = selected.has(name);
                return (
                  <View key={name} style={styles.tagWrapper}>
                    <TouchableOpacity
                      style={[styles.playerTag, isSel && styles.playerTagSelected]}
                      onPress={() => togglePlayer(name)}
                      onLongPress={() => removePlayer(name)}
                      activeOpacity={0.7}
                    >
                      {photos[name] ? (
                        <Image source={{ uri: photos[name] }} style={styles.tagPhoto} />
                      ) : (
                        <View style={[styles.tagAvatar, isSel && styles.tagAvatarSelected]}>
                          <Text style={[styles.tagAvatarText, isSel && styles.tagAvatarTextSelected]}>
                            {name[0].toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text style={[styles.tagName, isSel && styles.tagNameSelected]}>{name}</Text>
                      {isSel && <Text style={styles.tagCheck}>✕</Text>}
                    </TouchableOpacity>
                    {/* Photo camera button */}
                    <TouchableOpacity style={styles.camBtn} onPress={() => pickPhoto(name)}>
                      <Text style={styles.camBtnText}>📷</Text>
                    </TouchableOpacity>
                    {/* Delete button */}
                    <TouchableOpacity style={styles.delBtn} onPress={() => removePlayer(name)}>
                      <Text style={styles.delBtnText}>×</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Add player */}
            <Text style={styles.addLabel}>Add New Player</Text>
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                placeholder="Enter player name..."
                placeholderTextColor={Colors.outline}
                value={newName}
                onChangeText={setNewName}
                onSubmitEditing={addPlayer}
                returnKeyType="done"
                maxLength={30}
              />
              <TouchableOpacity style={styles.addBtn} onPress={addPlayer}>
                <Text style={styles.addBtnText}>+ Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* ── Start Button ── */}
        <View style={styles.footer}>
          <Text style={styles.selCount}>
            {selCount} player{selCount !== 1 ? 's' : ''} selected (min 2)
          </Text>
          <TouchableOpacity onPress={startGame} activeOpacity={0.85} style={styles.startBtn}>
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
  logo: { width: 80, height: 32 },

  scroll: { flex: 1, paddingHorizontal: Spacing.pagePadding },
  title: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 26, color: Colors.primary, marginTop: 14, marginBottom: 4 },
  subtitle: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: Colors.onSurfaceVariant, lineHeight: 19, marginBottom: 14 },

  ruleNote: { backgroundColor: 'rgba(9,105,105,0.07)', borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(9,105,105,0.2)', padding: 12, marginBottom: 14 },
  ruleText: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: Colors.onSurfaceVariant, lineHeight: 18 },
  ruleAccent: { fontFamily: 'Montserrat_700Bold', color: Colors.secondary },
  ruleRejoin: { fontFamily: 'Montserrat_700Bold', color: '#9960d0' },

  section: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.md, marginBottom: 14, ...Shadow.card },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionIcon: { fontSize: 18 },
  sectionTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: Colors.onSurface, flex: 1 },
  countBadge: { backgroundColor: Colors.secondaryContainer, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  countText: { fontFamily: 'Montserrat_700Bold', fontSize: 11, color: Colors.secondary },

  targetRow: { flexDirection: 'row', gap: 8 },
  targetCard: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLow, position: 'relative' },
  targetCardActive: { borderColor: Colors.primaryContainer, backgroundColor: 'rgba(0,77,77,0.06)' },
  targetCheck: { position: 'absolute', top: 4, right: 6, color: Colors.primaryContainer, fontSize: 10, fontFamily: 'Montserrat_700Bold' },
  targetValue: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 18, color: Colors.onSurfaceVariant },
  targetValueActive: { color: Colors.primaryContainer },
  targetSub: { fontFamily: 'Montserrat_400Regular', fontSize: 10, color: Colors.outline, marginTop: 2 },
  targetSubActive: { color: Colors.secondary },
  customInput: { marginTop: 10, height: 44, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.primaryContainer, paddingHorizontal: 14, fontFamily: 'Montserrat_600SemiBold', fontSize: 16, color: Colors.primary, textAlign: 'center', backgroundColor: 'rgba(0,77,77,0.05)' },

  bulkRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  bulkBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLow },
  bulkBtnDanger: { borderColor: 'rgba(186,26,26,0.3)', backgroundColor: 'rgba(186,26,26,0.05)' },
  bulkBtnText: { fontFamily: 'Montserrat_600SemiBold', fontSize: 12, color: Colors.onSurfaceVariant },
  bulkBtnTextDanger: { color: Colors.error },

  poolWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tagWrapper: { position: 'relative' },
  playerTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLow },
  playerTagSelected: { backgroundColor: Colors.primaryContainer, borderColor: Colors.primaryContainer },
  tagPhoto: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  tagAvatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  tagAvatarSelected: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tagAvatarText: { fontFamily: 'Montserrat_700Bold', fontSize: 10, color: Colors.onSurfaceVariant },
  tagAvatarTextSelected: { color: '#fff' },
  tagName: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: Colors.onSurface },
  tagNameSelected: { color: '#fff' },
  tagCheck: { fontFamily: 'Montserrat_700Bold', fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  camBtn: { position: 'absolute', bottom: -6, left: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.secondaryContainer, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.secondary },
  camBtnText: { fontSize: 9 },
  delBtn: { position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center' },
  delBtnText: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 11, color: '#fff', lineHeight: 14 },

  divider: { height: 1, backgroundColor: Colors.outlineVariant, marginVertical: 14 },
  addLabel: { fontFamily: 'Montserrat_700Bold', fontSize: 12, color: Colors.onSurfaceVariant, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  addRow: { flexDirection: 'row', gap: 8 },
  addInput: { flex: 1, height: 44, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.outlineVariant, paddingHorizontal: 14, fontFamily: 'Montserrat_400Regular', fontSize: 14, color: Colors.onSurface, backgroundColor: Colors.surfaceContainerLow },
  addBtn: { backgroundColor: Colors.primaryContainer, borderRadius: Radius.lg, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { fontFamily: 'Montserrat_700Bold', fontSize: 13, color: '#fff' },

  footer: { paddingHorizontal: Spacing.pagePadding, paddingBottom: 16, paddingTop: 6, gap: 8 },
  selCount: { fontFamily: 'Montserrat_500Medium', fontSize: 12, color: Colors.outline, textAlign: 'center' },
  startBtn: { borderRadius: Radius.full, overflow: 'hidden' },
  startBtnGradient: { paddingVertical: 15, alignItems: 'center' },
  startBtnText: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#fff', letterSpacing: 0.4 },
});

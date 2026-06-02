import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={styles.tabIcon}>
      <Text style={styles.tabEmoji}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(255,255,255,0.97)',
          borderTopWidth: 1,
          borderTopColor: 'rgba(0,77,77,0.1)',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: Colors.primaryContainer,
        tabBarInactiveTintColor: Colors.outline,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🎮" label="Game" focused={focused} /> }}
      />
      <Tabs.Screen
        name="history"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📋" label="History" focused={focused} /> }}
      />
      <Tabs.Screen
        name="stats"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📊" label="Stats" focused={focused} /> }}
      />
      <Tabs.Screen
        name="ranks"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏅" label="Ranks" focused={focused} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: { alignItems: 'center', gap: 2 },
  tabEmoji: { fontSize: 20 },
  tabLabel: { fontFamily: 'Montserrat_600SemiBold', fontSize: 10, color: Colors.outline },
  tabLabelActive: { color: Colors.primaryContainer },
});

import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuthStore } from '../store/authStore';

export const DashboardScreen = () => {
  const { user, logout } = useAuthStore();

  const stats = [
    { emoji: '⚡', label: 'XP Points', value: user?.xp ?? 0, color: '#facc15' },
    { emoji: '⭐', label: 'Level', value: user?.level ?? 1, color: '#a78bfa' },
    { emoji: '🔥', label: 'Day Streak', value: user?.streak ?? 0, color: '#fb923c' },
    { emoji: '🎯', label: 'Sessions', value: 0, color: '#4ade80' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.logo}>⚡ Kingsmode</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.greeting}>Hey, {user?.name} 👋</Text>

      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={styles.statEmoji}>{stat.emoji}</Text>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.focusCard}>
        <Text style={styles.focusEmoji}>🎯</Text>
        <Text style={styles.focusTitle}>Ready to focus?</Text>
        <Text style={styles.focusSubtitle}>Timer coming in Phase 2</Text>
        <TouchableOpacity style={styles.startButton}>
          <Text style={styles.startButtonText}>Start Focus Session</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content: { padding: 20, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  logo: { fontSize: 20, fontWeight: '800', color: 'white' },
  logoutText: { color: '#a78bfa', fontSize: 14 },
  greeting: { fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: 24 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1, minWidth: '45%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  statEmoji: { fontSize: 20, marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  focusCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20, padding: 32,
    alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  focusEmoji: { fontSize: 48, marginBottom: 12 },
  focusTitle: { fontSize: 20, fontWeight: '700', color: 'white', marginBottom: 4 },
  focusSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 24 },
  startButton: {
    backgroundColor: '#7c3aed', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 32,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  startButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
});

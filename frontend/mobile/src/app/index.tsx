import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStarkZap } from '@/providers/StarkZapProvider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen() {
  const { wallet, connect } = useStarkZap();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandTitle}>StarkPay</Text>
            <Text style={styles.brandSubtitle}>Yield-bearing payments</Text>
          </View>
          <View style={styles.profileCircle} />
        </View>

        {/* Balance Card ... */}
        {/* Skipping middle for conciseness in thought but tool will replace correctly */}
        {/* Actually I'll just show the specific lines */}

        {/* Balance Card */}
        <LinearGradient
          colors={['#18181b', '#09090b']}
          style={styles.balanceCard}
        >
          <Text style={styles.balanceLabel}>TOTAL BALANCE</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceText}>$ 0.00</Text>
            <Text style={styles.yieldText}>+ $0.00</Text>
          </View>
          
          <View style={styles.tokenBadges}>
            <View style={styles.badge}><Text style={styles.badgeText}>0 STRK</Text></View>
            <View style={styles.badge}><Text style={styles.badgeText}>0 USDC</Text></View>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
            <View style={[styles.iconContainer, { backgroundColor: '#4f46e520' }]}>
              <Ionicons name="send" size={24} color="#6366f1" />
            </View>
            <Text style={styles.actionLabel}>Send</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
            <View style={[styles.iconContainer, { backgroundColor: '#a855f720' }]}>
              <Ionicons name="qr-code" size={24} color="#a855f7" />
            </View>
            <Text style={styles.actionLabel}>Receive</Text>
          </TouchableOpacity>
        </View>

        {/* Yield Info */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Yield Performance</Text>
        </View>
        
        <View style={styles.yieldInfoCard}>
           <View style={styles.yieldRow}>
              <View style={styles.yieldIconBox}>
                <Ionicons name="trending-up" size={18} color="#10b981" />
              </View>
              <View>
                <Text style={styles.yieldInfoLabel}>Net APY</Text>
                <Text style={styles.yieldInfoValue}>12.4%</Text>
              </View>
           </View>
           <View style={styles.verticalDivider} />
           <View>
             <Text style={[styles.yieldInfoLabel, { textAlign: 'right' }]}>Supplied</Text>
             <Text style={[styles.yieldInfoValue, { textAlign: 'right' }]}>$ 0.00</Text>
           </View>
        </View>

        {/* Wallet Connection */}
        <View style={styles.footer}>
          {!wallet ? (
            <TouchableOpacity 
              style={styles.connectButton}
              onPress={() => connect('dummy_token')}
            >
              <Text style={styles.connectButtonText}>Connect with Social Login</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>
                Connected: {(wallet as any).account.address.slice(0, 6)}...{(wallet as any).account.address.slice(-4)}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    padding: 24,
    gap: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    marginTop: 2,
  },
  profileCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366f1',
  },
  balanceCard: {
    padding: 32,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#71717a',
    letterSpacing: 1,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginTop: 12,
  },
  balanceText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#fff',
  },
  yieldText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  tokenBadges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: '#27272a50',
    borderWidth: 1,
    borderColor: '#3f3f4650',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#a1a1aa',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#09090b',
    borderRadius: 24,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d4d4d8',
  },
  sectionHeader: {
    marginBottom: -16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#71717a',
    paddingLeft: 4,
  },
  yieldInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#09090b80',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  yieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  yieldIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#10b98110',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yieldInfoLabel: {
    fontSize: 11,
    color: '#71717a',
  },
  yieldInfoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10b981',
    marginTop: 2,
  },
  verticalDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#27272a',
  },
  footer: {
    marginTop: 16,
    marginBottom: 40,
  },
  connectButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  connectButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 12,
    color: '#71717a',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ReceiveScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <header style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#a1a1aa" />
          </TouchableOpacity>
          <Text style={styles.title}>Receive</Text>
        </header>

        <View style={styles.qrSection}>
          <View style={styles.qrContainer}>
             <View style={styles.qrPlaceholder}>
                <Ionicons name="qr-code-outline" size={64} color="#3f3f46" />
                <Text style={styles.qrPlaceholderText}>QR Code Placeholder</Text>
             </View>
          </View>
        </View>

        <View style={styles.addressSection}>
          <Text style={styles.label}>YOUR WALLET ADDRESS</Text>
          <TouchableOpacity style={styles.addressBox} activeOpacity={0.7}>
            <Text style={styles.addressText} numberOfLines={1} ellipsizeMode="middle">
              0x0000000000000000000000000000000000000000
            </Text>
            <View style={styles.copyIconBox}>
              <Ionicons name="copy" size={18} color="#71717a" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.disclaimer}>
            Only send Starknet-native tokens to this address. Assets sent on other networks may be permanently lost.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    padding: 24,
    gap: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  qrSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  qrContainer: {
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 48,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
  },
  qrPlaceholder: {
    width: 220,
    height: 220,
    backgroundColor: '#f4f4f5',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fafafa',
    gap: 12,
  },
  qrPlaceholderText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#a1a1aa',
    letterSpacing: 1,
  },
  addressSection: {
    gap: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717a',
    letterSpacing: 1,
    textAlign: 'center',
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#09090b',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272a',
    gap: 12,
  },
  addressText: {
    flex: 1,
    color: '#71717a',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  copyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#18181b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    marginTop: 'auto',
    marginBottom: 20,
  },
  disclaimer: {
    fontSize: 10,
    color: '#52525b',
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 240,
    alignSelf: 'center',
  },
});

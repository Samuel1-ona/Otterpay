import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SendScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <header style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#a1a1aa" />
          </TouchableOpacity>
          <Text style={styles.title}>Send Tokens</Text>
        </header>

        <View style={styles.form}>
           <View style={styles.inputGroup}>
              <Text style={styles.label}>RECIPIENT ADDRESS</Text>
              <TextInput 
                style={styles.input}
                placeholder="0x... or ENS name"
                placeholderTextColor="#3f3f46"
              />
           </View>

           <View style={styles.inputGroup}>
              <Text style={styles.label}>AMOUNT</Text>
              <View style={styles.amountInputContainer}>
                <TextInput 
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor="#3f3f46"
                  keyboardType="numeric"
                />
                <View style={styles.tokenBadge}>
                  <Text style={styles.tokenBadgeText}>USDC</Text>
                </View>
              </View>
              <Text style={styles.availableText}>Available: 0.00 USDC</Text>
           </View>
        </View>

        <View style={styles.footer}>
           <View style={styles.gaslessIndicator}>
              <View style={styles.zapIconBox}>
                <Ionicons name="flash" size={16} color="#6366f1" />
              </View>
              <Text style={styles.gaslessText}>Gasless Transaction Sponsored</Text>
           </View>

           <TouchableOpacity style={styles.submitButton} activeOpacity={0.8}>
              <Text style={styles.submitButtonText}>Preview Transaction</Text>
           </TouchableOpacity>
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
    gap: 32,
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
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717a',
    letterSpacing: 1,
    paddingLeft: 4,
  },
  input: {
    backgroundColor: '#09090b',
    borderRadius: 20,
    padding: 20,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#09090b',
    borderRadius: 20,
    paddingRight: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  amountInput: {
    flex: 1,
    padding: 20,
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  tokenBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#18181b',
  },
  tokenBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#71717a',
  },
  availableText: {
    fontSize: 10,
    color: '#52525b',
    paddingLeft: 4,
  },
  footer: {
    marginTop: 'auto',
    gap: 16,
    marginBottom: 20,
  },
  gaslessIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#4f46e508',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4f46e510',
  },
  zapIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#4f46e515',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gaslessText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a1a1aa',
  },
  submitButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
});

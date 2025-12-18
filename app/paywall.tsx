import React from 'react';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';
import { useSubscription } from '../providers/SubscriptionProvider';

import Purchases from 'react-native-purchases';

const PaywallScreen = () => {
  const { offerings, isSubscribed, refresh } = useSubscription();

  const handleSubscribe = async () => {
    if (!offerings || !offerings.current || !offerings.current.availablePackages.length) {
      Alert.alert('No subscription available', 'Please try again later.');
      return;
    }
    try {
      const pkg = offerings.current.availablePackages[0];
      if (pkg && pkg.identifier) {
        await Purchases.purchasePackage(pkg);
        await refresh();
      }
    } catch (e: any) {
      Alert.alert('Purchase failed', e.message || 'Please try again.');
    }
  };

  if (isSubscribed) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>You are subscribed!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upgrade to Premium</Text>
      <Text style={styles.desc}>Subscribe to unlock all features, unlimited streaming, and more.</Text>
      <Button title="Subscribe" onPress={handleSubscribe} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  desc: { color: '#ccc', marginBottom: 24, textAlign: 'center', maxWidth: 300 },
});

export default PaywallScreen;

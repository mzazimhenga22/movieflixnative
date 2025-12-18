import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAccent } from './components/AccentContext';

// Add these declarations so the TypeScript compiler recognizes the Firebase helpers
declare const authPromise: Promise<any> | undefined;
declare const firestore: any;
declare function serverTimestamp(): any;
declare function updateDoc(docRef: any, data: any): Promise<any>;
declare function doc(firestoreInstance: any, collection: string, id: string): any;

type PlanTier = 'free' | 'plus' | 'premium';

const PAYMENT_HIGHLIGHTS = [
  {
    title: 'Pay per plan',
    description: 'Monthly billing for Plus and Premium via your preferred card or wallet.',
  },
  {
    title: 'Upgrade anytime',
    description: 'Swap between plus, premium, or custom bundles in Settings.',
  },
  {
    title: 'Keep it flexible',
    description: 'Quarterly or annual billing offers longer savings with auto-renew.',
  },
];

const OTHER_OFFERS = [
  'Refer friends & unlock a free month',
  'Family & student discounts available',
  'Gift cards land instantly in your inbox',
];

const PLAN_LABELS: Record<PlanTier, string> = {
  free: 'Free',
  plus: 'Plus',
  premium: 'Premium',
};

const PLAN_LIMITS: Record<PlanTier, number> = {
  free: 1,
  plus: 3,
  premium: 5,
};

const PLAN_DETAILS: Array<{
  tier: PlanTier;
  title: string;
  price: string;
  description: string;
  features: string[];
  highlight?: boolean;
}> = [
  {
    tier: 'free',
    title: 'Starter',
    price: '0 KSH / month',
    description: 'Keep things simple with one household profile.',
    features: [
      '- 1 household profile',
      '- Standard recommendations',
      '- Stories + social feed access',
    ],
  },
  {
    tier: 'plus',
    title: 'Household Plus',
    price: '100 KSH / month',
    description: 'Perfect for small households that need a few extra seats.',
    features: [
      '- Up to 3 household profiles',
      '- Priority recommendations',
      '- Extra kids filters & badges',
    ],
  },
  {
    tier: 'premium',
    title: 'Watch Party Plus',
    price: '200 KSH / month',
    description: 'Maximum profiles, larger watch parties, and early labs access.',
    features: [
      '- Up to 5 household profiles',
      '- Bigger watch party rooms',
      '- Priority stream quality',
      '- Early access to interactive labs',
    ],
    highlight: true,
  },
];

const formatLimit = (tier: PlanTier) => {
  const count = PLAN_LIMITS[tier];
  return `${count} profile${count === 1 ? '' : 's'}`;
};

const formatUpgradeGain = (tier: PlanTier) => {
  const base = PLAN_LIMITS.free;
  const diff = PLAN_LIMITS[tier] - base;
  if (diff <= 0) return 'Includes 1 profile';
  if (diff === 1) return 'Add 1 more profile (2 total)';
  return `Add ${diff} more profiles (${PLAN_LIMITS[tier]} total)`;
};

const PremiumScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string }>();
  const source = params.source;
  const { accentColor } = useAccent();
  const gradientColors = useMemo(() => [accentColor, '#090814', '#050509'] as const, [accentColor]);
  const badgeGradient = useMemo(() => [accentColor, 'rgba(5,5,15,0.6)'] as const, [accentColor]);
  const isWatchparty = source === 'watchparty';
  const heroBadge = isWatchparty ? 'Watch Party Plus' : 'Profile Plans';
  const heroTitle = isWatchparty ? 'Bigger rooms. More fun.' : 'More profiles, more control.';
  const heroSubtitle = isWatchparty
    ? 'Host watch parties with more friends, priority quality, and upcoming interactive features.'
    : 'Unlock Plus or Premium to add up to 5 household profiles, pay flexibly, and keep everyone in sync.';

  const [selectedPlan, setSelectedPlan] = useState<PlanTier>('free');
  const [statusCopy, setStatusCopy] = useState<string | null>(null);
  const [updatingPlan, setUpdatingPlan] = useState<PlanTier | null>(null);

  useEffect(() => {
    const loadPlan = async () => {
      try {
        const stored = await AsyncStorage.getItem('planTierOverride');
        const normalized: PlanTier =
          stored === 'premium' || stored === 'plus' || stored === 'free' ? stored : 'free';
        setSelectedPlan(normalized);
        const gain = formatUpgradeGain(normalized);
        setStatusCopy(`Currently on ${PLAN_LABELS[normalized]} (${gain}).`);
      } catch (err) {
        console.warn('[premium] failed to load stored plan', err);
        setSelectedPlan('free');
        setStatusCopy(`Currently on ${PLAN_LABELS.free} (${formatUpgradeGain('free')}).`);
      }
    };
    loadPlan();
  }, []);

  const handleApplyPlan = useCallback(
    async (tier: PlanTier) => {
      if (tier === selectedPlan) return;
      setUpdatingPlan(tier);
      try {
        if (tier === 'free') {
          await AsyncStorage.removeItem('planTierOverride');
        } else {
          await AsyncStorage.setItem('planTierOverride', tier);
        }
        // Persist plan to Firestore for signed-in users (store non-sensitive summary only)
        try {
          const auth = await authPromise;
          const user = auth.currentUser;
          if (user) {
            const priceMap: Record<PlanTier, number> = { free: 0, plus: 100, premium: 200 };
            const payload: Record<string, any> = {
              planTier: tier,
              subscription: {
                tier,
                priceKSH: priceMap[tier],
                updatedAt: serverTimestamp(),
                source: 'premium-screen',
              },
            };
            await updateDoc(doc(firestore, 'users', user.uid), payload);
          }
        } catch (err) {
          console.warn('[premium] failed to persist plan to Firestore', err);
        }
        setSelectedPlan(tier);
        const planName = PLAN_LABELS[tier];
        const limitCopy = formatLimit(tier);
        const gainCopy = formatUpgradeGain(tier);
        const buttons =
          source === 'profiles'
            ? [
                { text: 'Stay here', style: 'cancel' as const },
                { text: 'Go to profiles', onPress: () => router.back() },
              ]
            : undefined;
        Alert.alert('Plan updated', `You are now on ${planName}. Enjoy ${gainCopy}.`, buttons);
        setStatusCopy(`Switched to ${planName} (${gainCopy}).`);
      } catch (err) {
        console.error('[premium] failed to update plan override', err);
        Alert.alert('Plan update failed', 'Unable to save your plan. Please try again.');
      } finally {
        setUpdatingPlan(null);
      }
    },
    [router, selectedPlan, source]
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/movies')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Go Premium</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <LinearGradient
            colors={badgeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBadge}
          >
            <Text style={styles.heroBadgeText}>{heroBadge}</Text>
          </LinearGradient>
          <Text style={styles.heroTitle}>{heroTitle}</Text>
          <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
        </View>

        <View style={styles.currentPlanBanner}>
          <Text style={styles.currentPlanTitle}>
            Current plan: {PLAN_LABELS[selectedPlan]}
          </Text>
          <Text style={styles.currentPlanSubtitle}>{formatUpgradeGain(selectedPlan)}</Text>
        </View>
        {statusCopy && <Text style={styles.statusText}>{statusCopy}</Text>}

        {!isWatchparty && (
          <>
            <Text style={styles.sectionHeading}>How you'll pay</Text>
            <View style={styles.paymentGrid}>
              {PAYMENT_HIGHLIGHTS.map((highlight) => (
                <View key={highlight.title} style={styles.paymentCard}>
                  <Text style={styles.paymentTitle}>{highlight.title}</Text>
                  <Text style={styles.paymentBody}>{highlight.description}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.sectionHeading}>Other offers</Text>
            <View style={styles.offerGrid}>
              {OTHER_OFFERS.map((offer) => (
                <View key={offer} style={styles.offerCard}>
                  <Ionicons name="pricetag-outline" size={18} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.offerText}>{offer}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {PLAN_DETAILS.map((plan) => {
          const isActive = selectedPlan === plan.tier;
          const isBusy = updatingPlan === plan.tier;
          const buttonLabel = isActive
            ? 'Current plan'
            : plan.tier === 'free'
            ? 'Switch to Free'
            : `Choose ${plan.title}`;
          return (
            <View
              key={plan.tier}
              style={[
                styles.card,
                plan.highlight && styles.cardHighlight,
                isActive && { borderColor: accentColor },
              ]}
            >
              <View style={styles.planHeader}>
                <Text style={styles.planLabel}>{PLAN_LABELS[plan.tier]}</Text>
                <Text style={styles.planTitle}>{plan.title}</Text>
                <Text style={styles.planPrice}>{plan.price}</Text>
                <Text style={styles.planDescription}>{plan.description}</Text>
                <Text style={styles.planMeta}>
                  {plan.tier === 'free' ? 'Includes 1 profile' : formatUpgradeGain(plan.tier)}
                </Text>
              </View>
              {plan.features.map((feature) => (
                <View key={`${plan.tier}-${feature}`} style={styles.bulletRow}>
                  <Text style={styles.bullet}>{feature}</Text>
                </View>
              ))}
              <TouchableOpacity
                style={[
                  styles.planButton,
                  { backgroundColor: accentColor },
                  (isActive || isBusy) && styles.planButtonDisabled,
                ]}
                disabled={isActive || isBusy}
                onPress={() => handleApplyPlan(plan.tier)}
              >
                <Text style={styles.planButtonText}>{isBusy ? 'Updating...' : buttonLabel}</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <Text style={styles.disclaimer}>
          Upgrading is optional and can be added later with your preferred billing provider. This screen is a
          placeholder so you can design and test your Premium flow.
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050509',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 12,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  hero: {
    marginBottom: 20,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  heroSubtitle: {
    color: '#C4C4C4',
    fontSize: 13,
  },
  currentPlanBanner: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 12,
  },
  currentPlanTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  currentPlanSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
    fontSize: 13,
  },
  statusText: {
    color: '#7dd8ff',
    fontSize: 12,
    marginBottom: 10,
  },
  sectionHeading: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  paymentGrid: {
    marginBottom: 16,
  },
  paymentCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  paymentBody: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  offerGrid: {
    marginBottom: 20,
  },
  offerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10,
  },
  offerText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    flex: 1,
    marginLeft: 6,
  },
  card: {
    backgroundColor: 'rgba(10,10,18,0.65)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  cardHighlight: {
    borderColor: 'rgba(229,9,20,0.3)',
  },
  planHeader: {
    marginBottom: 12,
  },
  planLabel: {
    color: '#AAAAAA',
    fontSize: 12,
    marginBottom: 2,
  },
  planTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  planPrice: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 6,
  },
  planDescription: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 13,
    marginBottom: 4,
  },
  planMeta: {
    color: '#7dd8ff',
    fontSize: 12,
    fontWeight: '600',
  },
  bulletRow: {
    marginBottom: 4,
  },
  bullet: {
    color: '#DDDDDD',
    fontSize: 13,
  },
  planButton: {
    marginTop: 12,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  planButtonDisabled: {
    opacity: 0.5,
  },
  planButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  disclaimer: {
    color: '#777777',
    fontSize: 11,
    marginTop: 4,
  },
});

export default PremiumScreen;

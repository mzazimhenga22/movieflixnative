import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CustomerInfo, PurchasesOfferings } from 'react-native-purchases';
import Purchases from 'react-native-purchases';

const REVENUECAT_API_KEY = 'test_ksetQTdkNHqTaRfhauINoLKNxpU';


type PlanTier = 'free' | 'plus' | 'premium';

type SubscriptionContextType = {
  isSubscribed: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOfferings | null;
  currentPlan: PlanTier;
  refresh: () => Promise<void>;
};


const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);


export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};


type Props = {
  children: React.ReactNode;
};

export const SubscriptionProvider: React.FC<Props> = ({ children }) => {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<PlanTier>('free');

  const getCurrentPlan = async (): Promise<PlanTier> => {
    // First check AsyncStorage for override
    try {
      const stored = await AsyncStorage.getItem('planTierOverride');
      if (stored === 'premium' || stored === 'plus' || stored === 'free') {
        return stored;
      }
    } catch {}

    // Then check entitlements
    if (customerInfo) {
      const activeEntitlements = Object.keys(customerInfo.entitlements.active);
      if (activeEntitlements.includes('premium')) return 'premium';
      if (activeEntitlements.includes('plus')) return 'plus';
    }

    return 'free';
  };

  const refresh = async () => {
    const info = await Purchases.getCustomerInfo();
    setCustomerInfo(info);
    setIsSubscribed(Object.keys(info.entitlements.active).length > 0);
    const currentOfferings = await Purchases.getOfferings();
    setOfferings(currentOfferings);
    const plan = await getCurrentPlan();
    setCurrentPlan(plan);
  };

  useEffect(() => {
    if (Purchases && typeof Purchases.configure === 'function') {
      Purchases.configure({ apiKey: REVENUECAT_API_KEY! });
    } else {
      console.error('Purchases module is not properly linked or initialized.');
      return;
    }
    refresh();
    const listener = (info: CustomerInfo) => {
      setCustomerInfo(info);
      setIsSubscribed(Object.keys(info.entitlements.active).length > 0);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener && Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  return (
    <SubscriptionContext.Provider value={{ isSubscribed, customerInfo, offerings, currentPlan, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

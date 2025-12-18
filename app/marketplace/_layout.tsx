import { Stack } from 'expo-router';

export default function MarketplaceLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Marketplace' }} />
      <Stack.Screen name="sell" options={{ title: 'Sell Product' }} />
      <Stack.Screen name="[id]" options={{ title: 'Product Details' }} />
    </Stack>
  );
}

import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProductCard from './components/ProductCard';
import { useRouter } from 'expo-router';
import { getProducts, Product as APIProduct } from './api';

export default function MarketplaceScreen() {
  const router = useRouter();
  const [products, setProducts] = React.useState<APIProduct[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchProducts = async () => {
      try {
        const fetchedProducts = await getProducts();
        setProducts(fetchedProducts);
      } catch (error: any) {
        console.error('Error fetching products:', error);
        Alert.alert('Error', 'Failed to load products. Please try again later.');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E50914" />
        <Text style={styles.loadingText}>Loading Marketplace...</Text>
      </SafeAreaView>
    );
  }

  // Filter out products without an id and narrow types for TS
  const validProducts = products.filter((p): p is APIProduct & { id: string } => !!p.id);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <Text style={styles.header}>Explore the Marketplace</Text>
        <View style={styles.productsGrid}>
          {validProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => router.push((`/marketplace/${product.id}`) as any)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#E50914',
    marginTop: 10,
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollViewContent: {
    padding: 10,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
});

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

interface FeatureCardProps {
  iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  description: string;
  onPress?: () => void;
  isLarge?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ iconName, title, description, onPress, isLarge = false }) => {
  return (
    <TouchableOpacity
      style={[styles.card, isLarge && styles.largeCard]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <BlurView intensity={80} tint="dark" style={styles.blurView} />
      {isLarge ? (
        <>
          <View style={[styles.iconContainer, styles.largeIconContainer]}>
            <MaterialCommunityIcons name={iconName} size={40} color="#FF4500" />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, styles.largeTitle]}>{title}</Text>
            <Text style={[styles.description, styles.largeDescription]}>{description}</Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name={iconName} size={30} color="#FF4500" />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    flex: 1,
    marginHorizontal: 7.5,
    minHeight: 160,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  largeCard: {
    flex: undefined,
    marginHorizontal: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    minHeight: 120,
  },
  iconContainer: {
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  largeIconContainer: {
    marginBottom: 0,
    marginRight: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  largeTitle: {
    fontSize: 20,
    marginBottom: 8,
  },
  description: {
    color: '#BBBBBB',
    fontSize: 12,
    lineHeight: 18,
  },
  largeDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default FeatureCard;

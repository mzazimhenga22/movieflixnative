import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScreenWrapper from '../../../../components/ScreenWrapper';
import StoriesRow from '../StoriesRow';

export default function StoriesScreen() {
  return (
    <View style={styles.container}>
      <ScreenWrapper>
        <View style={styles.header}>
          <Text style={styles.title}>Stories</Text>
          <TouchableOpacity>
            <Ionicons name="camera" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content}>
          <StoriesRow showAddStory />
          {/* TODO: Add story highlights and archived stories sections */}
        </ScrollView>
      </ScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#630303ff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
});
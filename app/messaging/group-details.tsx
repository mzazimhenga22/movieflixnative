import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
  Alert,
  Share,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

import ScreenWrapper from '../../components/ScreenWrapper'
import {
  onConversationUpdate,
  Conversation,
  onUserProfileUpdate,
  Profile,
  addGroupAdmin,
  removeGroupAdmin,
  removeGroupMember,
  leaveGroup,
  generateGroupInviteLink,
  updateGroupSettings
} from './controller'

const ACCENT = '#e50914'

const initialsFromName = (name?: string) => {
  const n = (name || '').trim()
  if (!n) return 'G'
  const parts = n.split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join('')
}

const safeStatus = (p?: Profile | null) => {
  const s = (p as any)?.status
  if (!s) return null
  if (s === 'online') return 'Online'
  return 'Offline'
}

export default function GroupDetailsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { conversationId } = useLocalSearchParams<{ conversationId?: string }>()

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  // subtle header entrance
  const headerFade = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 450, useNativeDriver: true }).start()
  }, [headerFade])

  useEffect(() => {
    if (!conversationId) {
      setLoading(false)
      return
    }

    const unsubscribe = onConversationUpdate(conversationId, (conv) => {
      setConversation(conv ?? null)
      // Members load is handled by next effect
      if (!conv) setLoading(false)
    })

    return unsubscribe
  }, [conversationId])

  useEffect(() => {
    if (!conversation?.members || !Array.isArray(conversation.members)) {
      setMembers([])
      setLoading(false)
      return
    }

    let alive = true
    const map = new Map<string, Profile>()
    const unsubscribers = conversation.members.map((memberId: string) => {
      return onUserProfileUpdate(memberId, (profile) => {
        if (!alive || !profile?.id) return
        map.set(profile.id, profile)
        // keep UI stable: sort members by name
        const next = Array.from(map.values()).sort((a, b) =>
          (a.displayName || '').localeCompare(b.displayName || ''),
        )
        setMembers(next)
      })
    })

    setLoading(false)

    return () => {
      alive = false
      unsubscribers.forEach((unsub) => {
        try {
          unsub()
        } catch {}
      })
    }
  }, [conversation?.members])

  const stats = useMemo(() => {
    const total = members.length
    const online = members.filter((m) => (m as any)?.status === 'online').length
    return { total, online }
  }, [members])

  const groupTitle = conversation?.name || 'Group Chat'
  const groupAvatarUrl = (conversation as any)?.avatarUrl || (conversation as any)?.photoURL || null

  const handleMemberPress = (member: Profile) => {
    // Optional: navigate to profile screen if you have it
    // router.push({ pathname: '/profile/[id]', params: { id: member.id } })
  }

  const isCurrentUserAdmin = conversation?.admins?.includes('currentUserId') || false // TODO: Get actual user ID

  const handleInvite = async () => {
    if (!conversationId) return

    try {
      const inviteCode = await generateGroupInviteLink(conversationId)
      const inviteUrl = `https://yourapp.com/join/${inviteCode}`

      await Share.share({
        message: `Join our group "${groupTitle}"! ${inviteUrl}`,
        url: inviteUrl,
      })
    } catch (error) {
      Alert.alert('Error', 'Failed to generate invite link')
    }
  }

  const handleMute = () => {
    // TODO: Implement mute functionality
    Alert.alert('Coming Soon', 'Mute notifications feature coming soon!')
  }

  const handleLeave = () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            if (!conversationId) return
            try {
              await leaveGroup(conversationId)
              router.back()
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to leave group')
            }
          }
        }
      ]
    )
  }

  const handleMemberAction = (member: Profile) => {
    if (!conversationId || !isCurrentUserAdmin) return

    const isAdmin = conversation?.admins?.includes(member.id)
    const options = []

    if (isAdmin) {
      options.push({
        text: 'Remove Admin',
        style: 'destructive' as const,
        onPress: () => handleRemoveAdmin(member.id)
      })
    } else {
      options.push({
        text: 'Make Admin',
        onPress: () => handleMakeAdmin(member.id)
      })
    }

    options.push({
      text: 'Remove from Group',
      style: 'destructive' as const,
      onPress: () => handleRemoveMember(member.id)
    })

    options.push({ text: 'Cancel', style: 'cancel' as const })

    Alert.alert(
      `${member.displayName}`,
      'Choose an action',
      options
    )
  }

  const handleMakeAdmin = async (userId: string) => {
    if (!conversationId) return
    try {
      await addGroupAdmin(conversationId, userId)
      Alert.alert('Success', 'User promoted to admin')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to promote user')
    }
  }

  const handleRemoveAdmin = async (userId: string) => {
    if (!conversationId) return
    try {
      await removeGroupAdmin(conversationId, userId)
      Alert.alert('Success', 'Admin privileges removed')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to remove admin privileges')
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!conversationId) return
    Alert.alert(
      'Remove Member',
      'Are you sure you want to remove this member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeGroupMember(conversationId, userId)
              Alert.alert('Success', 'Member removed')
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove member')
            }
          }
        }
      ]
    )
  }

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={[styles.center, { paddingTop: insets.top + 12 }]}>
          <ActivityIndicator />
          <Text style={styles.mutedText}>Loading group…</Text>
        </View>
      </ScreenWrapper>
    )
  }

  if (!conversation) {
    return (
      <ScreenWrapper>
        <View style={[styles.center, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.title}>Conversation not found.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    )
  }

  return (
    <ScreenWrapper>
      <View style={styles.root}>
        {/* Background */}
        <LinearGradient
          colors={[ACCENT, '#150a13', '#05060f']}
          start={[0, 0]}
          end={[1, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Header */}
        <Animated.View style={[styles.headerWrap, { paddingTop: insets.top + 10, opacity: headerFade }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>

            <Text numberOfLines={1} style={styles.headerTitle}>
              Group info
            </Text>

            <TouchableOpacity style={styles.iconBtn} onPress={handleInvite}>
              <Ionicons name="person-add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Group hero card */}
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              {groupAvatarUrl ? (
                <Image source={{ uri: groupAvatarUrl }} style={styles.groupAvatar} />
              ) : (
                <View style={styles.groupAvatarFallback}>
                  <Text style={styles.groupAvatarInitials}>{initialsFromName(groupTitle)}</Text>
                </View>
              )}

              <View style={styles.heroMeta}>
                <Text style={styles.groupName} numberOfLines={1}>
                  {groupTitle}
                </Text>
                <Text style={styles.groupSub}>
                  {stats.total} member{stats.total === 1 ? '' : 's'} • {stats.online} online
                </Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleInvite}>
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={styles.actionText}>Invite</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={handleMute}>
                <Ionicons name="notifications-off-outline" size={18} color="#fff" />
                <Text style={styles.actionText}>Mute</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={handleLeave}>
                <Ionicons name="log-out-outline" size={18} color="#ff4b4b" />
                <Text style={styles.dangerText}>Leave</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Members */}
        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Members</Text>
            <Text style={styles.sectionMeta}>{members.length}</Text>
          </View>

          <FlatList
            data={members}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingBottom: Platform.OS === 'ios' ? insets.bottom + 24 : insets.bottom + 18,
            }}
            renderItem={({ item }) => {
              const statusLabel = safeStatus(item)
              const isOnline = (item as any)?.status === 'online'
              const isAdmin = conversation?.admins?.includes(item.id)
              const isCurrentUser = item.id === 'currentUserId' // TODO: Get actual user ID

              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleMemberPress(item)}
                  onLongPress={() => isCurrentUserAdmin && !isCurrentUser ? handleMemberAction(item) : null}
                  style={styles.memberRow}
                >
                  <View style={styles.avatarWrap}>
                    {item.photoURL ? (
                      <Image source={{ uri: item.photoURL }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarInitials}>{initialsFromName(item.displayName)}</Text>
                      </View>
                    )}
                    <View style={[styles.presenceDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
                    {isAdmin && (
                      <View style={styles.adminBadge}>
                        <Ionicons name="shield-checkmark" size={12} color="#fff" />
                      </View>
                    )}
                  </View>

                  <View style={styles.memberMeta}>
                    <View style={styles.nameRow}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {item.displayName || 'Unknown'}
                      </Text>
                      {isAdmin && (
                        <Text style={styles.adminLabel}>Admin</Text>
                      )}
                    </View>
                    <Text style={styles.memberSub} numberOfLines={1}>
                      {statusLabel ? statusLabel : '—'}
                    </Text>
                  </View>

                  {isCurrentUserAdmin && !isCurrentUser && (
                    <TouchableOpacity onPress={() => handleMemberAction(item)} style={styles.moreBtn}>
                      <Ionicons name="ellipsis-vertical" size={18} color="rgba(255,255,255,0.35)" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              )
            }}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
          />
        </View>
      </View>
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#05060f',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    backgroundColor: '#05060f',
  },

  headerWrap: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 10,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },

  heroCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupAvatar: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  groupAvatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  groupAvatarInitials: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 0.6,
  },
  heroMeta: {
    flex: 1,
    minWidth: 0,
  },
  groupName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  groupSub: {
    color: 'rgba(255,255,255,0.60)',
    fontSize: 13,
    marginTop: 4,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  dangerBtn: {
    backgroundColor: 'rgba(255,75,75,0.10)',
    borderColor: 'rgba(255,75,75,0.35)',
  },
  dangerText: {
    color: '#ff4b4b',
    fontSize: 13,
    fontWeight: '900',
  },

  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingBottom: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  sectionMeta: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '800',
  },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  avatarWrap: {
    width: 44,
    height: 44,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  avatarInitials: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
  },
  presenceDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 12,
    height: 12,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#05060f',
  },
  dotOnline: { backgroundColor: '#22c55e' },
  dotOffline: { backgroundColor: 'rgba(255,255,255,0.25)' },

  memberMeta: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  adminLabel: {
    color: ACCENT,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memberSub: {
    marginTop: 3,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '700',
  },
  adminBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#05060f',
  },
  moreBtn: {
    padding: 8,
    marginRight: -4,
  },

  sep: {
    height: 10,
  },

  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  mutedText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },

  primaryBtn: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 999,
    backgroundColor: ACCENT,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
})

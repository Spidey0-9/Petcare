import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';

export interface Post {
  id: string;
  type: 'lost' | 'adoption' | 'tip' | 'general';
  avatar: string;
  avatarColor: string;
  avatarBg: string;
  user: string;
  time: string;
  content: string;
  likes: number;
  comments: number;
  tag: string;
  tagColor: string;
  tagBg: string;
}

interface CommunityPreviewProps {
  posts: Post[];
  onPost?: (postId: string) => void;
  onViewAll?: () => void;
}

export function CommunityPreview({ posts, onPost, onViewAll }: CommunityPreviewProps) {
  return (
    <View style={styles.container}>
      {posts.slice(0, 3).map((post, i) => (
        <PostCard key={post.id} post={post} index={i} onPress={() => onPost?.(post.id)} />
      ))}
      <Pressable style={styles.viewAll} onPress={onViewAll}>
        <Text style={styles.viewAllText}>View All Posts</Text>
        <MaterialCommunityIcons name="arrow-right" size={16} color={colors.primary} />
      </Pressable>
    </View>
  );
}

function PostCard({
  post, index, onPress,
}: { post: Post; index: number; onPress: () => void }) {
  const slideAnim = useRef(new Animated.Value(20)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * 100;
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, friction: 8, delay, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
    >
      <Pressable onPress={onPress} style={styles.pressable}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: post.avatarBg }]}>
            <MaterialCommunityIcons name={post.avatar as any} size={24} color={post.avatarColor} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{post.user}</Text>
            <Text style={styles.time}>{post.time}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: post.tagBg }]}>
            <Text style={[styles.tagText, { color: post.tagColor }]}>{post.tag}</Text>
          </View>
        </View>

        {/* Content */}
        <Text style={styles.content} numberOfLines={2}>{post.content}</Text>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable style={styles.action}>
            <MaterialCommunityIcons name="heart-outline" size={16} color={colors.muted} />
            <Text style={styles.actionText}>{post.likes}</Text>
          </Pressable>
          <Pressable style={styles.action}>
            <MaterialCommunityIcons name="comment-outline" size={16} color={colors.muted} />
            <Text style={styles.actionText}>{post.comments}</Text>
          </Pressable>
          <Pressable style={styles.action}>
            <MaterialCommunityIcons name="share-outline" size={16} color={colors.muted} />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  pressable: { padding: 14, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  userInfo: { flex: 1 },
  userName: { fontSize: 13, fontWeight: '800', color: colors.text },
  time:     { fontSize: 11, color: colors.muted, fontWeight: '600' },
  tag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 10, fontWeight: '800' },
  content: { fontSize: 13, color: colors.text, lineHeight: 19, fontWeight: '500' },
  footer: { flexDirection: 'row', gap: 20 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    paddingVertical: 12,
  },
  viewAllText: { fontSize: 13, fontWeight: '800', color: colors.primary },
});

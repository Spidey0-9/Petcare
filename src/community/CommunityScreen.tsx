import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { communityService } from '../services/community';
import { colors } from '../core/theme/colors';
import { TABLES } from '../constants';
import { useRealtimeTables } from '../services/realtime';

interface Post {
  id: string;
  category: string;
  author_name: string;
  content: string;
  likes: number;
  comments_count: number;
  created_at: string;
  liked?: boolean;
}

const CATEGORIES = [
  { id: 'all',      label: 'All',         icon: 'view-grid',          color: colors.primary },
  { id: 'feed',     label: 'Pet Feed',    icon: 'paw',                color: '#FF8F00' },
  { id: 'questions',label: 'Questions',   icon: 'help-circle',        color: '#0EA5E9' },
  { id: 'adoption', label: 'Adoption',    icon: 'heart',              color: '#EF4444' },
  { id: 'lost',     label: 'Lost & Found',icon: 'map-search',         color: '#8B5CF6' },
  { id: 'tips',     label: 'Pet Tips',    icon: 'lightbulb',          color: '#22C55E' },
  { id: 'stories',  label: 'Stories',     icon: 'star',               color: '#F59E0B' },
];


export function CommunityScreen() {
  const insets    = useSafeAreaInsets();
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const [posts, setPosts]         = useState<Post[]>([]);
  const [loading, setLoading]     = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [likedIds, setLikedIds]   = useState<Set<string>>(new Set());

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    loadPosts();
  }, []);

  const loadPosts = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setErrorMessage('');
    try {
      const data = await communityService.listLegacyPosts();
      setPosts(data as Post[]);
    } catch (error: any) {
      setPosts([]);
      setErrorMessage(error?.message ?? 'Unable to load community posts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const realtimeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleCommunityRealtime = useCallback(() => {
    if (realtimeTimer.current) clearTimeout(realtimeTimer.current);
    realtimeTimer.current = setTimeout(() => {
      loadPosts(false);
    }, 350);
  }, [loadPosts]);

  useRealtimeTables('community-screen', [TABLES.posts, TABLES.communityPosts, TABLES.comments, TABLES.likes], handleCommunityRealtime);

  useEffect(() => () => {
    if (realtimeTimer.current) clearTimeout(realtimeTimer.current);
  }, []);

  const handleLike = async (postId: string) => {
    const alreadyLiked = likedIds.has(postId);
    setLikedIds(prev => {
      const next = new Set(prev);
      alreadyLiked ? next.delete(postId) : next.add(postId);
      return next;
    });
    setPosts(p => p.map(post =>
      post.id === postId
        ? { ...post, likes: post.likes + (alreadyLiked ? -1 : 1) }
        : post
    ));
    try {
      await communityService.updateLegacyLikes(postId, (posts.find(p => p.id === postId)?.likes ?? 0) + (alreadyLiked ? -1 : 1));
    } catch (error: any) {
      Alert.alert('Like failed', error?.message ?? 'Unable to update this post.');
      loadPosts();
    }
  };

  const filteredPosts = activeCategory === 'all'
    ? posts
    : posts.filter(p => p.category === activeCategory);

  const catColor = (id: string) => CATEGORIES.find(c => c.id === id)?.color ?? colors.primary;
  const catIcon  = (id: string) => (CATEGORIES.find(c => c.id === id)?.icon ?? 'paw') as keyof typeof MaterialCommunityIcons.glyphMap;

  const timeAgo = (isoDate: string) => {
    const diff = (Date.now() - new Date(isoDate).getTime()) / 1000;
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Community</Text>
          <Text style={styles.headerSub}>{posts.length} posts · {CATEGORIES.length - 1} categories</Text>
        </View>
        <Pressable style={styles.createBtn} onPress={() => setShowCreatePost(true)}>
          <MaterialCommunityIcons name="plus" size={18} color="#fff" />
          <Text style={styles.createBtnText}>Post</Text>
        </Pressable>
      </View>

      {/* Category tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
        {CATEGORIES.map(cat => (
          <Pressable
            key={cat.id}
            style={[styles.tab, activeCategory === cat.id && { backgroundColor: cat.color, borderColor: cat.color }]}
            onPress={() => setActiveCategory(cat.id)}
          >
            <MaterialCommunityIcons
              name={cat.icon as any}
              size={14}
              color={activeCategory === cat.id ? '#fff' : cat.color}
            />
            <Text style={[styles.tabText, { color: activeCategory === cat.id ? '#fff' : cat.color }]}>
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Posts */}
      <ScrollView
        contentContainerStyle={styles.feed}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPosts(); }} tintColor={colors.primary} />}
      >
        {errorMessage ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="alert-circle-outline" size={56} color={colors.danger + '80'} />
            <Text style={styles.emptyTitle}>Community unavailable</Text>
            <Text style={styles.emptySub}>{errorMessage}</Text>
          </View>
        ) : filteredPosts.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="forum-outline" size={56} color={colors.muted + '60'} />
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptySub}>Be the first to post in this category!</Text>
          </View>
        ) : (
          filteredPosts.map((post, i) => (
            <PostCard
              key={post.id}
              post={post}
              index={i}
              isLiked={likedIds.has(post.id)}
              catColor={catColor(post.category)}
              catIcon={catIcon(post.category)}
              timeAgo={timeAgo(post.created_at)}
              onLike={() => handleLike(post.id)}
              onComment={() => Alert.alert('Comments', 'Opening comments...')}
              onShare={() => Alert.alert('Share', 'Sharing post...')}
              onReport={() => Alert.alert('Report', 'Post reported. We will review it.')}
            />
          ))
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Create Post Modal */}
      <CreatePostModal
        visible={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onPosted={() => { setShowCreatePost(false); loadPosts(); }}
      />
    </Animated.View>
  );
}

function PostCard({ post, index, isLiked, catColor, catIcon, timeAgo, onLike, onComment, onShare, onReport }: {
  post: Post; index: number; isLiked: boolean; catColor: string;
  catIcon: keyof typeof MaterialCommunityIcons.glyphMap;
  timeAgo: string; onLike: () => void; onComment: () => void; onShare: () => void; onReport: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(16)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const likeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, friction: 8, delay: index * 60, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLike = () => {
    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.4, useNativeDriver: true, friction: 4 }),
      Animated.spring(likeScale, { toValue: 1,   useNativeDriver: true, friction: 4 }),
    ]).start();
    onLike();
  };

  return (
    <Animated.View style={[styles.postCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* Author row */}
      <View style={styles.postHeader}>
        <View style={[styles.authorAvatar, { backgroundColor: catColor + '20' }]}>
          <Text style={[styles.authorInitial, { color: catColor }]}>
            {post.author_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{post.author_name}</Text>
          <Text style={styles.postTime}>{timeAgo}</Text>
        </View>
        <View style={[styles.categoryBadge, { backgroundColor: catColor + '18' }]}>
          <MaterialCommunityIcons name={catIcon} size={11} color={catColor} />
          <Text style={[styles.categoryText, { color: catColor }]}>{post.category}</Text>
        </View>
        <Pressable onPress={onReport} style={styles.moreBtn}>
          <MaterialCommunityIcons name="dots-vertical" size={18} color={colors.muted} />
        </Pressable>
      </View>

      {/* Content */}
      <Text style={styles.postContent}>{post.content}</Text>

      {/* Actions */}
      <View style={styles.postActions}>
        <Pressable style={styles.actionBtn} onPress={handleLike}>
          <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <MaterialCommunityIcons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={isLiked ? '#EF4444' : colors.muted}
            />
          </Animated.View>
          <Text style={[styles.actionCount, isLiked && { color: '#EF4444' }]}>{post.likes}</Text>
        </Pressable>

        <Pressable style={styles.actionBtn} onPress={onComment}>
          <MaterialCommunityIcons name="comment-outline" size={20} color={colors.muted} />
          <Text style={styles.actionCount}>{post.comments_count}</Text>
        </Pressable>

        <Pressable style={styles.actionBtn} onPress={onShare}>
          <MaterialCommunityIcons name="share-outline" size={20} color={colors.muted} />
        </Pressable>

        <View style={{ flex: 1 }} />
        <Pressable style={styles.followBtn}>
          <MaterialCommunityIcons name="account-plus-outline" size={14} color={colors.primary} />
          <Text style={styles.followText}>Follow</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function CreatePostModal({ visible, onClose, onPosted }: { visible: boolean; onClose: () => void; onPosted: () => void; }) {
  const slideAnim = useRef(new Animated.Value(800)).current;
  const [content,  setContent]  = useState('');
  const [category, setCategory] = useState('feed');
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: visible ? 0 : 800, friction: 9, useNativeDriver: true }).start();
  }, [visible]);

  const handlePost = async () => {
    if (!content.trim()) { Alert.alert('Required', 'Please write something!'); return; }
    setSaving(true);
    try {
      await communityService.createLegacyPost({
        category, content: content.trim(),
        author_name: 'Priya S.', likes: 0, comments_count: 0,
      });
      Alert.alert('✅ Posted!', 'Your post has been shared with the community.');
      setContent('');
      onPosted();
    } catch (error: any) {
      Alert.alert('Post failed', error?.message ?? 'Unable to create community post.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={cm.overlay}>
        <Pressable style={cm.backdrop} onPress={onClose} />
        <Animated.View style={[cm.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={cm.handle} />
          <View style={cm.headerRow}>
            <Pressable onPress={onClose}>
              <MaterialCommunityIcons name="close" size={22} color={colors.text} />
            </Pressable>
            <Text style={cm.title}>Create Post</Text>
            <Pressable style={[cm.postBtn, saving && { opacity: 0.6 }]} onPress={handlePost} disabled={saving}>
              <Text style={cm.postBtnText}>{saving ? 'Posting...' : 'Post'}</Text>
            </Pressable>
          </View>

          {/* Category selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={cm.catRow}>
            {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
              <Pressable
                key={cat.id}
                style={[cm.catChip, category === cat.id && { backgroundColor: cat.color }]}
                onPress={() => setCategory(cat.id)}
              >
                <MaterialCommunityIcons name={cat.icon as any} size={13} color={category === cat.id ? '#fff' : cat.color} />
                <Text style={[cm.catLabel, { color: category === cat.id ? '#fff' : cat.color }]}>{cat.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={cm.inputArea}>
            <View style={[cm.avatar, { backgroundColor: colors.primary }]}>
              <Text style={cm.avatarText}>P</Text>
            </View>
            <TextInput
              style={cm.textInput}
              value={content}
              onChangeText={setContent}
              placeholder="What's on your mind about your pet? 🐾"
              placeholderTextColor={colors.muted}
              multiline
              autoFocus
            />
          </View>

          {/* Attachment options */}
          <View style={cm.attachRow}>
            {[
              { icon: 'image', label: 'Photo',   color: '#22C55E' },
              { icon: 'video', label: 'Video',   color: '#0EA5E9' },
              { icon: 'map-marker', label: 'Location', color: '#EF4444' },
            ].map(item => (
              <Pressable key={item.label} style={cm.attachBtn} onPress={() => Alert.alert(item.label, `${item.label} picker would open here`)}>
                <MaterialCommunityIcons name={item.icon as any} size={18} color={item.color} />
                <Text style={[cm.attachLabel, { color: item.color }]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const cm = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  title: { fontSize: 17, fontWeight: '900', color: colors.text },
  postBtn: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8 },
  postBtnText: { fontSize: 13, fontWeight: '900', color: '#fff' },
  catRow: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.line },
  catLabel: { fontSize: 11, fontWeight: '800' },
  inputArea: { flexDirection: 'row', alignItems: 'flex-start', padding: 20, gap: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '900', color: '#fff' },
  textInput: { flex: 1, fontSize: 15, color: colors.text, minHeight: 120, maxHeight: 200, fontWeight: '500' },
  attachRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 24 },
  attachBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  attachLabel: { fontSize: 12, fontWeight: '700' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  headerTitle: { fontSize: 22, fontWeight: '900', color: colors.text },
  headerSub: { fontSize: 12, color: colors.muted, fontWeight: '600', marginTop: 2 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9 },
  createBtnText: { fontSize: 13, fontWeight: '900', color: '#fff' },
  tabsRow: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  tabText: { fontSize: 12, fontWeight: '800' },
  feed: { paddingHorizontal: 20, paddingTop: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.muted },
  emptySub: { fontSize: 13, color: colors.muted },
  postCard: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  authorAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  authorInitial: { fontSize: 18, fontWeight: '900' },
  authorInfo: { flex: 1 },
  authorName: { fontSize: 14, fontWeight: '800', color: colors.text },
  postTime: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  categoryText: { fontSize: 10, fontWeight: '800' },
  moreBtn: { padding: 4 },
  postContent: { fontSize: 14, color: colors.text, lineHeight: 21, fontWeight: '500', marginBottom: 12 },
  postActions: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionCount: { fontSize: 13, fontWeight: '700', color: colors.muted },
  followBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary + '15', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  followText: { fontSize: 11, fontWeight: '800', color: colors.primary },
});





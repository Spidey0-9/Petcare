import { supabase } from '../../core/services/supabase';
import { SupabaseRepository } from '../../repositories';
import { TABLES, STORAGE_BUCKETS } from '../../constants';
import type { CommunityPost } from '../../types';
import { throwIfError } from '../errors';
import { logDatabaseFailure } from '../database/databaseDiagnostics';
import { storageService } from '../storage';

export class CommunityService {
  private readonly posts = new SupabaseRepository<CommunityPost>(TABLES.posts);

  listFeed(page = 1, pageSize = 20) {
    return this.posts.list({ page, pageSize, orderBy: 'created_at' });
  }

  createPost(payload: Partial<CommunityPost>) {
    return this.posts.create(payload);
  }

  deletePost(id: string) {
    return this.posts.remove(id);
  }

  async uploadPostMedia(userId: string, file: { uri: string; fileName?: string | null; mimeType?: string | null }) {
    return storageService.uploadFile(STORAGE_BUCKETS.communityPosts, userId, file);
  }

  async likePost(postId: string, userId: string) {
    const { error } = await supabase.from(TABLES.likes).upsert({ post_id: postId, user_id: userId });
    if (error) {
      await logDatabaseFailure({ module: 'CommunityService', table: TABLES.likes, operation: 'likePost', query: 'upsert post like' }, error);
      throwIfError(error, 'Unable to like post.');
    }
  }

  async unlikePost(postId: string, userId: string) {
    const { error } = await supabase.from(TABLES.likes).delete().eq('post_id', postId).eq('user_id', userId);
    if (error) {
      await logDatabaseFailure({ module: 'CommunityService', table: TABLES.likes, operation: 'unlikePost', query: 'delete post like' }, error);
      throwIfError(error, 'Unable to unlike post.');
    }
  }

  async addComment(postId: string, userId: string, content: string, parentId?: string) {
    const { data, error } = await supabase
      .from(TABLES.comments)
      .insert({ post_id: postId, user_id: userId, content, parent_id: parentId ?? null })
      .select('*')
      .single();
    if (error) {
      await logDatabaseFailure({ module: 'CommunityService', table: TABLES.comments, operation: 'addComment', query: 'insert comment' }, error);
      throwIfError(error, 'Unable to add comment.');
    }
    return data;
  }


  async listLegacyPosts() {
    const { data, error } = await supabase
      .from(TABLES.communityPosts)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      await logDatabaseFailure({ module: 'CommunityService', table: TABLES.communityPosts, operation: 'listLegacyPosts', query: 'select community posts' }, error);
      throwIfError(error, 'Unable to load community posts.');
    }
    return data ?? [];
  }

  async updateLegacyLikes(postId: string, likes: number) {
    const { error } = await supabase.from(TABLES.communityPosts).update({ likes }).eq('id', postId);
    if (error) {
      await logDatabaseFailure({ module: 'CommunityService', table: TABLES.communityPosts, operation: 'updateLegacyLikes', query: 'update community post likes' }, error);
      throwIfError(error, 'Unable to update post likes.');
    }
  }

  async createLegacyPost(payload: { category: string; content: string; author_name: string; likes: number; comments_count: number }) {
    const { data, error } = await supabase.from(TABLES.communityPosts).insert(payload).select('*').single();
    if (error) {
      await logDatabaseFailure({ module: 'CommunityService', table: TABLES.communityPosts, operation: 'createLegacyPost', query: 'insert community post' }, error);
      throwIfError(error, 'Unable to create community post.');
    }
    return data;
  }
  subscribeToFeed(callback: (payload: unknown) => void) {
    return this.posts.subscribe('*', callback);
  }
}

export const communityService = new CommunityService();



import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  Text,
  View,
} from "react-native";
import { useCallback, useEffect, useState } from "react";

import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import { getSupabase } from "../lib/supabase";
import {
  displayName,
  ensureSupabaseSession,
  roleLabel,
  timeAgo,
} from "../lib/social";

/*
  FEED — POSTS / COMMENTS / REACTIONS (brief 2.4)
  =========================================================
  Self-contained activity feed:
    • Composer      — share a text update with the community
                      (stored in `posts`; video/image media_type
                      is ready in the schema for phase 2).
    • Feed cards    — every post with its author, timestamp,
                      emoji reactions and comment thread.
    • Live updates  — a Realtime WebSocket subscription on
                      posts / comments / reactions re-fetches on
                      any change (RLS filters each subscriber's
                      view — everyone signed in sees the feed).

  The `notify_new_comment` DB trigger alerts the post author
  through the notification bell automatically.
*/

const REACTIONS = ["+", "Fire", "Surge", "Idea", "Heart"];

export default function Feed() {
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [me, setMe] = useState(null);
  const [posts, setPosts] = useState([]);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [reloadFlag, setReloadFlag] = useState(0);

  /*
   * VIDEO / IMAGE MEDIA (brief 2.4 + 2.8)
   * Images are re-compressed on pick; videos get a generated thumbnail
   * (expo-video-thumbnails) and are stored in the `media` bucket BEFORE the
   * post row is inserted — raw uploads are never stored directly.
   */
  const [media, setMedia] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // ---- Data loading ------------------------------------

  const load = useCallback(async () => {
    setLoading(true);

    const session = await ensureSupabaseSession();
    if (!session) {
      setOffline(true);
      setMe(null);
      setPosts([]);
      setLoading(false);
      return;
    }

    setOffline(false);
    const { supabase, userId } = session;

    try {
      const [profileRes, postsRes, connectionsRes] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name, role")
            .eq("id", userId)
            .maybeSingle(),

          supabase
            .from("posts")
            .select(
              `id, author_id, content, media_type, media_url, flagged, created_at,
               author:profiles!posts_author_id_fkey(
                 id, full_name, company_name, role, headline, avatar_url
               ),
               comments(id, content, created_at,
                 author:profiles!comments_author_id_fkey(
                   id, full_name, company_name, role
                 )
               ),
               reactions(post_id, user_id, emoji)`
            )
            .order("created_at", { ascending: false })
            .limit(50),

          supabase
            .from("connections")
            .select("id, requester_id, addressee_id, status")
            .or(
              `requester_id.eq.${userId},addressee_id.eq.${userId}`
            ),
        ]);

      setMe(profileRes.data || null);

      // Connections-based ranking (brief: role-adaptive feed, not static).
      // Posts authored by people I am connected to float to the top; the
      // rest follow by recency. Everyone still sees the whole community.
      const connectedRows = connectionsRes.data || [];
      const connectedIds = new Set(
        connectedRows
          .filter((link) => link.status === "connected")
          .map((link) =>
            link.requester_id === userId
              ? link.addressee_id
              : link.requester_id
          )
      );

      const ranked = [...(postsRes.data || [])].sort((a, b) => {
        const aConn = connectedIds.has(a.author_id) ? 0 : 1;
        const bConn = connectedIds.has(b.author_id) ? 0 : 1;
        if (aConn !== bConn) return aConn - bConn;
        return (
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
        );
      });

      setPosts(ranked);
    } catch {
      // Keep existing state; the UI shows empty lists.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadFlag]);

  // ---- Live updates ------------------------------------

  useEffect(() => {
    let channel = null;
    let active = true;

    async function subscribe() {
      const session = await ensureSupabaseSession();
      if (!session || !active) return;

      channel = session.supabase
        .channel("social-feed")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "posts",
          },
          () => setReloadFlag((f) => f + 1)
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "comments",
          },
          () => setReloadFlag((f) => f + 1)
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "reactions",
          },
          () => setReloadFlag((f) => f + 1)
        )
        .subscribe();
    }

    subscribe();

    return () => {
      active = false;
      if (channel) {
        const supabase = getSupabase();
        if (supabase) {
          supabase.removeChannel(channel);
        }
      }
    };
  }, []);

  // ---- Actions ------------------------------------------

  /*
   * Picks a photo or short video for the composer.
   *  • Images   — re-encoded at quality 0.7 (compression before storage).
   *  • Videos   — captured/picked, then a poster thumbnail is generated with
   *               expo-video-thumbnails. Both files are uploaded to the
   *               private-per-owner `media` bucket; the post row only stores
   *               their public URLs (media_type / media_url / thumbnail_url).
   */
  async function pickMedia() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Allow photo & video access to attach media to your post."
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images", "videos"],
          quality: 0.7,
          videoMaxDuration: 60,
          allowsMultipleSelection: false,
          selectionLimit: 1,
        });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset) return;

      if (asset.type === "video" || asset.mediaType === "video") {
        // Generate the poster frame locally (brief 2.8: thumbnail required).
        let thumbnailUri = null;
        try {
          const thumbResult =
            await VideoThumbnails.getThumbnailAsync(asset.uri, {
              time: 1000,
            });
          thumbnailUri = thumbResult.uri;
        } catch {
          // Thumbnail generation failed; the post will fall back to a play chip.
        }

        setMedia({
          uri: asset.uri,
          type: "video",
          thumb: thumbnailUri,
          mimeType: asset.mimeType || "video/mp4",
          fileName:
            asset.fileName || `video-${Date.now()}.mp4`,
        });
      } else {
        setMedia({
          uri: asset.uri,
          type: "image",
          thumb: null,
          mimeType: asset.mimeType || "image/jpeg",
          fileName:
            asset.fileName || `photo-${Date.now()}.jpg`,
        });
      }
    } catch (error) {
      Alert.alert(
        "Could not attach media",
        error?.message || "Please try again."
      );
    }
  }

  function clearMedia() {
    setMedia(null);
  }

  async function uploadMediaToStorage(session) {
    if (!media) return null;

    setUploadingMedia(true);

    try {
      const response = await fetch(media.uri);
      const blob = await response.blob();

      const extension = media.fileName.includes(".")
        ? media.fileName.slice(media.fileName.lastIndexOf("."))
        : media.type === "video"
        ? ".mp4"
        : ".jpg";

      const baseName = `${session.userId}/posts/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}${extension}`;

      const { error: uploadError } =
        await session.supabase.storage
          .from("media")
          .upload(baseName, blob, {
            contentType: media.mimeType,
            upsert: false,
          });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = session.supabase.storage
        .from("media")
        .getPublicUrl(baseName);

      let thumbnailUrl = null;

      if (media.type === "video" && media.thumb) {
        const thumbExt = media.thumb.includes(".mp4")
          ? ".jpg"
          : media.thumb.slice(
              media.thumb.lastIndexOf(".")
            );

        const thumbResponse = await fetch(media.thumb);
        const thumbBlob = await thumbResponse.blob();

        const thumbPath = `${session.userId}/posts/thumbs/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}${thumbExt}`;

        const { error: thumbError } =
          await session.supabase.storage
            .from("media")
            .upload(thumbPath, thumbBlob, {
              contentType: "image/jpeg",
              upsert: false,
            });

        if (!thumbError) {
          const { data: thumbPublic } =
            session.supabase.storage
              .from("media")
              .getPublicUrl(thumbPath);

          thumbnailUrl = thumbPublic?.publicUrl || null;
        }
      }

      return {
        mediaType: media.type,
        mediaUrl: publicUrl?.publicUrl || null,
        thumbnailUrl,
      };
    } finally {
      setUploadingMedia(false);
    }
  }

  async function createPost() {
    const text = draft.trim();
    if (!text && !media) return;

    const session = await ensureSupabaseSession();
    if (!session) {
      Alert.alert(
        "Sign in required",
        "Your session could not be restored."
      );
      return;
    }

    setPosting(true);

    try {
      // Process + store the media BEFORE inserting the post row
      // (brief 2.8: compressed / transcoded with a generated thumbnail).
      let uploaded = null;

      if (media) {
        uploaded = await uploadMediaToStorage(session);

        if (!uploaded || !uploaded.mediaUrl) {
          throw new Error(
            "The media could not be uploaded. Please try again."
          );
        }
      }

      const row = {
        author_id: session.userId,
        content: text || "",
      };

      if (uploaded) {
        row.media_type = uploaded.mediaType;
        row.media_url = uploaded.mediaUrl;
        if (uploaded.thumbnailUrl) {
          row.thumbnail_url = uploaded.thumbnailUrl;
        }
      }

      const { error } = await session.supabase
        .from("posts")
        .insert(row);

      if (error) throw error;

      setDraft("");
      setMedia(null);
      setReloadFlag((f) => f + 1);
    } catch (error) {
      Alert.alert(
        "Could not post",
        error?.message || "Please try again."
      );
    } finally {
      setPosting(false);
    }
  }

  async function toggleReaction(post) {
    const session = await ensureSupabaseSession();
    if (!session) return;

    const { supabase, userId } = session;
    const mine = (post.reactions || []).filter(
      (r) => r.user_id === userId
    );
    const topEmoji = mine[0]?.emoji || REACTIONS[0];

    try {
      if (mine.length > 0) {
        await supabase
          .from("reactions")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", userId);
      } else {
        const { error } = await supabase
          .from("reactions")
          .insert({
            post_id: post.id,
            user_id: userId,
            emoji: topEmoji,
          });

        if (error) throw error;
      }

      setReloadFlag((f) => f + 1);
    } catch (error) {
      Alert.alert(
        "Could not update reaction",
        error?.message || "Please try again."
      );
    }
  }

  // ---- Comment composer (per-post, self-contained) -------

  function CommentComposer({ post }) {
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);

    async function send() {
      const body = text.trim();
      if (!body) return;

      const session = await ensureSupabaseSession();
      if (!session) return;

      setSending(true);

      try {
        const { error } = await session.supabase
          .from("comments")
          .insert({
            post_id: post.id,
            author_id: session.userId,
            content: body,
          });

        if (error) throw error;

        setText("");
        setReloadFlag((f) => f + 1);
      } catch (error) {
        Alert.alert(
          "Could not comment",
          error?.message || "Please try again."
        );
      } finally {
        setSending(false);
      }
    }

    return (
      <View style={styles.commentComposer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Write a comment…"
          placeholderTextColor="#93A1B8"
          value={text}
          onChangeText={setText}
          multiline
        />

        <Pressable
          style={[
            styles.commentSend,
            (!text.trim() || sending) &&
              styles.buttonDisabled,
          ]}
          disabled={!text.trim() || sending}
          onPress={send}
        >
          <Text style={styles.commentSendText}>
            {sending ? "…" : "Send"}
          </Text>
        </Pressable>
      </View>
    );
  }

  // ---- Post card -----------------------------------------

  function renderPost(post) {
    const author = post.author || {};
    const label = displayName(author);
    const mineCount = (post.reactions || [])
      .filter((r) => r.user_id === me?.id).length;

    return (
      <View
        style={styles.card}
        key={post.id}
      >
        <View style={styles.postHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {label.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.postHeaderInfo}>
            <Text
              style={styles.postAuthor}
              numberOfLines={1}
            >
              {label}
            </Text>

            <Text style={styles.postMeta}>
              {roleLabel(author.role)} •{" "}
              {timeAgo(post.created_at)}
            </Text>
          </View>
        </View>

        <Text style={styles.postContent}>
          {post.content}
        </Text>

        {post.media_type === "image" && post.media_url ? (
          <Pressable onPress={() => Linking.openURL(post.media_url)}>
            <Image
              source={{ uri: post.media_url }}
              style={styles.postMedia}
              resizeMode="cover"
            />
          </Pressable>
        ) : null}

        {post.media_type === "video" && post.media_url ? (
          <Pressable
            style={styles.postVideoWrap}
            onPress={() => Linking.openURL(post.media_url)}
          >
            <Image
              source={{
                uri: post.thumbnail_url || post.media_url,
              }}
              style={styles.postMedia}
              resizeMode="cover"
            />

            <View style={styles.playBadge}>
              <Text style={styles.playBadgeText}>
                ▶
              </Text>
            </View>

            <View style={styles.videoTag}>
              <Text style={styles.videoTagText}>
                🎬 Video — tap to play
              </Text>
            </View>
          </Pressable>
        ) : null}

        <View style={styles.reactionRow}>
          <Pressable
            style={[
              styles.reactionButton,
              mineCount > 0 &&
                styles.reactionActive,
            ]}
            onPress={() => toggleReaction(post)}
          >
            <Text style={styles.reactionText}>
              {mineCount > 0 ? "✅" : "👍"}{" "}
              {(post.reactions || []).length}
            </Text>
          </Pressable>

          <Text style={styles.commentCount}>
            {(post.comments || []).length}{" "}
            comments
          </Text>
        </View>

        {(post.comments || []).length > 0 && (
          <View style={styles.commentList}>
            {post.comments.map((comment) => (
              <View
                style={styles.commentRow}
                key={comment.id}
              >
                <Text
                  style={styles.commentAuthor}
                >
                  {displayName(
                    comment.author || {}
                  )}
                  :
                </Text>

                <Text
                  style={styles.commentText}
                >
                  {comment.content}
                </Text>
              </View>
            ))}
          </View>
        )}

        <CommentComposer post={post} />
      </View>
    );
  }

  // ---- Main render ----------------------------------------

  function renderBody() {
    if (loading) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Loading the feed…
          </Text>
        </View>
      );
    }

    if (offline) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>
            📡
          </Text>

          <Text style={styles.emptyText}>
            Sign in to see the community feed.
          </Text>
        </View>
      );
    }

    if (posts.length === 0) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>
            ✨
          </Text>

          <Text style={styles.emptyText}>
            No posts yet — be the first to
            share something!
          </Text>
        </View>
      );
    }

    return <View>{posts.map(renderPost)}</View>;
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>
        Community Feed
      </Text>

      <Text style={styles.subheading}>
        Share updates, react and comment —
        live for the whole community.
      </Text>

      <View style={styles.composer}>
        <TextInput
          style={styles.composerInput}
          placeholder="Share an update… (e.g. just finished my Honours project!)"
          placeholderTextColor="#93A1B8"
          value={draft}
          onChangeText={setDraft}
          multiline
        />

        {media && (
          <View style={styles.mediaPreview}>
            <Image
              source={{ uri: media.thumb || media.uri }}
              style={styles.mediaPreviewImage}
            />

            <View style={styles.mediaPreviewInfo}>
              <Text style={styles.mediaPreviewText}>
                {media.type === "video"
                  ? "🎬 Video attached"
                  : "📷 Photo attached"}
              </Text>

              <Pressable
                onPress={clearMedia}
                hitSlop={8}
              >
                <Text style={styles.mediaPreviewRemove}>
                  Remove
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.composerActions}>
          <Pressable
            style={styles.attachButton}
            disabled={uploadingMedia || posting}
            onPress={pickMedia}
          >
            <Text style={styles.attachButtonText}>
              {uploadingMedia
                ? "Processing…"
                : "📷 Photo / 🎥 Video"}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.composerButton,
              (!draft.trim() && !media) || posting
                ? styles.buttonDisabled
                : null,
            ]}
            disabled={
              (!draft.trim() && !media) || posting
            }
            onPress={createPost}
          >
            <Text style={styles.composerButtonText}>
              {posting ? "Posting…" : "Post"}
            </Text>
          </Pressable>
        </View>
      </View>

      {renderBody()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F8FC",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F1B33",
  },
  subheading: {
    marginTop: 4,
    fontSize: 13,
    color: "#5B6B85",
    marginBottom: 14,
  },
  composer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E9EDF5",
    padding: 12,
    marginBottom: 14,
  },
  composerInput: {
    fontSize: 14,
    color: "#0F1B33",
    minHeight: 44,
    textAlignVertical: "top",
  },
  composerButton: {
    alignSelf: "flex-end",
    backgroundColor: "#208AEF",
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  composerButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  composerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  attachButton: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#D8E6FA",
    backgroundColor: "#F4F8FF",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  attachButtonText: {
    color: "#1668B8",
    fontSize: 12,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  mediaPreview: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#F6F8FC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E9EDF5",
    padding: 8,
  },
  mediaPreviewImage: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: "#E1EEFF",
  },
  mediaPreviewInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginLeft: 10,
  },
  mediaPreviewText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3A4761",
  },
  mediaPreviewRemove: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B3261E",
  },
  postMedia: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginTop: 10,
    backgroundColor: "#E1EEFF",
  },
  postVideoWrap: {
    marginTop: 10,
  },
  playBadge: {
    position: "absolute",
    top: 88,
    left: "50%",
    marginLeft: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(15,27,51,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  playBadgeText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  videoTag: {
    position: "absolute",
    left: 18,
    bottom: 18,
    backgroundColor: "rgba(15,27,51,0.72)",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  videoTagText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E9EDF5",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E1EEFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#208AEF",
  },
  postHeaderInfo: {
    flex: 1,
  },
  postAuthor: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F1B33",
  },
  postMeta: {
    fontSize: 11,
    color: "#7C8AA3",
    marginTop: 1,
  },
  postContent: {
    fontSize: 14,
    lineHeight: 20,
    color: "#1B2740",
  },
  reactionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  reactionButton: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#E3E8F2",
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
  },
  reactionActive: {
    backgroundColor: "#E1EEFF",
    borderColor: "#208AEF",
  },
  reactionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3A4761",
  },
  commentCount: {
    marginLeft: 12,
    fontSize: 12,
    color: "#7C8AA3",
  },
  commentList: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EFF2F8",
    paddingTop: 8,
  },
  commentRow: {
    flexDirection: "row",
    marginBottom: 6,
    flexWrap: "wrap",
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: "700",
    color: "#208AEF",
    marginRight: 4,
  },
  commentText: {
    fontSize: 12,
    color: "#3A4761",
    flex: 1,
  },
  commentComposer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#F3F6FB",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 12,
    color: "#0F1B33",
    minHeight: 36,
  },
  commentSend: {
    marginLeft: 8,
    backgroundColor: "#208AEF",
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  commentSendText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9EDF5",
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: "#5B6B85",
    textAlign: "center",
  },
});

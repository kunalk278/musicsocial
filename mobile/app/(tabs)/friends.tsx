import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Share,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { api, Follow } from "../../lib/api";
import { useAuth } from "../../lib/auth";

export default function FriendsScreen() {
  const { user } = useAuth();
  const [follows, setFollows] = useState<Follow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [shareToken, setShareToken] = useState("");
  const [following, setFollowing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await api.follows.list();
      setFollows(data);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  async function handleFollow() {
    const token = shareToken.trim();
    if (!token) { setError("Enter a share token"); return; }
    setError("");
    setFollowing(true);
    try {
      const follow = await api.follows.follow(token);
      setFollows((prev) => [follow, ...prev]);
      setShareToken("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setFollowing(false);
    }
  }

  async function handleUnfollow(followeeId: string, name: string) {
    Alert.alert(`Unfollow ${name}?`, "", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unfollow",
        style: "destructive",
        onPress: async () => {
          try {
            await api.follows.unfollow(followeeId);
            setFollows((prev) => prev.filter((f) => f.followeeId !== followeeId));
          } catch (e) {
            Alert.alert("Error", (e as Error).message);
          }
        },
      },
    ]);
  }

  async function handleShare() {
    if (!user?.shareToken) return;
    await Share.share({
      message: `Follow me on Bandwagon! Use my share token: ${user.shareToken}`,
    });
  }

  return (
    <View style={styles.container}>
      {user && (
        <View style={styles.myToken}>
          <Text style={styles.myTokenLabel}>Your share token</Text>
          <Text style={styles.myTokenValue}>{user.shareToken}</Text>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>Share</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.addSection}>
        <Text style={styles.sectionTitle}>Follow a friend</Text>
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={shareToken}
            onChangeText={setShareToken}
            placeholder="Paste share token"
            placeholderTextColor="#4b5563"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.followBtn, following && styles.btnDisabled]}
            onPress={handleFollow}
            disabled={following}
          >
            {following ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.followBtnText}>Follow</Text>
            )}
          </TouchableOpacity>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <Text style={styles.sectionTitle}>Following</Text>
      <FlatList
        data={follows}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a78bfa" />
        }
        renderItem={({ item }) => (
          <View style={styles.followCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.followee.name[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>
            <View style={styles.followInfo}>
              <Text style={styles.followName}>{item.followee.name}</Text>
              {item.followee.city ? (
                <Text style={styles.followCity}>{item.followee.city}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.unfollowBtn}
              onPress={() => handleUnfollow(item.followeeId, item.followee.name)}
            >
              <Text style={styles.unfollowText}>Unfollow</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>You're not following anyone yet.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
        style={{ flex: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f", padding: 16 },
  myToken: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#7c3aed40",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  myTokenLabel: { color: "#9ca3af", fontSize: 12, flex: 0 },
  myTokenValue: {
    color: "#a78bfa",
    fontWeight: "700",
    fontSize: 14,
    flex: 1,
  },
  shareBtn: {
    backgroundColor: "#7c3aed",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  shareBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  addSection: { marginBottom: 20 },
  sectionTitle: {
    color: "#f9fafb",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  addRow: { flexDirection: "row", gap: 8 },
  input: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 10,
    color: "#fff",
    padding: 12,
    fontSize: 14,
  },
  followBtn: {
    backgroundColor: "#7c3aed",
    borderRadius: 10,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.6 },
  followBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  errorText: { color: "#f87171", fontSize: 13, marginTop: 6 },
  followCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4c1d95",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#e9d5ff", fontWeight: "700", fontSize: 16 },
  followInfo: { flex: 1 },
  followName: { color: "#f9fafb", fontWeight: "600", fontSize: 15 },
  followCity: { color: "#9ca3af", fontSize: 12 },
  unfollowBtn: {
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  unfollowText: { color: "#9ca3af", fontSize: 12, fontWeight: "600" },
  empty: { alignItems: "center", padding: 24 },
  emptyText: { color: "#6b7280", fontSize: 14 },
});

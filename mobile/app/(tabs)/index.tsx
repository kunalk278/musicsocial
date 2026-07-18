import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Image,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { api, FeedItem } from "../../lib/api";
import { useAuth } from "../../lib/auth";

function FeedCard({ item }: { item: FeedItem }) {
  const date = new Date(item.date + "T00:00:00");
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <View style={styles.card}>
      <View style={styles.avatarWrap}>
        <Text style={styles.avatar}>{item.user.name[0]?.toUpperCase() ?? "?"}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.user.name}</Text>
        <Text style={styles.action}>
          {item.status === "ATTENDING" ? "is attending" : "is interested in"}
        </Text>
        <Text style={styles.band}>{item.bandName}</Text>
        <Text style={styles.meta}>
          {dateStr}
          {item.venue ? ` · ${item.venue}` : ""}
          {item.city ? ` · ${item.city}` : ""}
        </Text>
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const { user } = useAuth();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadFeed = useCallback(async () => {
    try {
      const data = await api.feed.get();
      setFeed(data);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  function onRefresh() {
    setRefreshing(true);
    loadFeed();
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FeedCard item={item} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#a78bfa"
          />
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🎵</Text>
              <Text style={styles.emptyTitle}>No shows yet</Text>
              <Text style={styles.emptyBody}>
                Follow friends to see what concerts they're going to.
              </Text>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          )
        }
        contentContainerStyle={feed.length === 0 ? { flex: 1 } : { padding: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f" },
  card: {
    flexDirection: "row",
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4c1d95",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: { color: "#e9d5ff", fontWeight: "700", fontSize: 16 },
  info: { flex: 1, gap: 2 },
  name: { color: "#f9fafb", fontWeight: "700", fontSize: 14 },
  action: { color: "#9ca3af", fontSize: 13 },
  band: { color: "#a78bfa", fontWeight: "700", fontSize: 15 },
  meta: { color: "#6b7280", fontSize: 12 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 8,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: "#f9fafb", fontWeight: "700", fontSize: 18 },
  emptyBody: { color: "#9ca3af", fontSize: 14, textAlign: "center" },
  errorText: { color: "#f87171", fontSize: 13, marginTop: 8 },
});

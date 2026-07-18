import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { api, Concert } from "../../lib/api";
import { ConcertCard } from "../../components/ConcertCard";

export default function MyShowsScreen() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await api.concerts.list();
      setConcerts(data);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  async function handleDelete(id: string) {
    Alert.alert("Remove show?", "This will remove the concert from your list.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await api.concerts.delete(id);
            setConcerts((prev) => prev.filter((c) => c.id !== id));
          } catch (e) {
            Alert.alert("Error", (e as Error).message);
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={concerts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConcertCard concert={item} onDelete={handleDelete} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a78bfa" />
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🎟️</Text>
              <Text style={styles.emptyTitle}>No shows yet</Text>
              <Text style={styles.emptyBody}>
                Tap "Add Show" to start tracking concerts.
              </Text>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          )
        }
        contentContainerStyle={concerts.length === 0 ? { flex: 1 } : { padding: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f" },
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

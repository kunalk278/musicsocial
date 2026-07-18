import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { api, Concert } from "../../lib/api";
import Constants from "expo-constants";

const BASE_URL =
  (Constants.expoConfig?.extra?.apiUrl as string) ?? "http://localhost:3000";

interface PublicUser {
  name: string;
  city: string;
  shareToken: string;
  concerts: Concert[];
}

export default function PublicProfile() {
  const { shareToken } = useLocalSearchParams<{ shareToken: string }>();
  const router = useRouter();
  const [data, setData] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [following, setFollowing] = useState(false);
  const [followed, setFollowed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `${BASE_URL}/api/concerts/public?token=${encodeURIComponent(shareToken)}`
        );
        if (!res.ok) throw new Error("User not found");
        setData(await res.json());
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [shareToken]);

  async function handleFollow() {
    setFollowing(true);
    try {
      await api.follows.follow(shareToken);
      setFollowed(true);
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setFollowing(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#a78bfa" size="large" />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || "User not found"}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {data.name[0]?.toUpperCase() ?? "?"}
          </Text>
        </View>
        <Text style={styles.name}>{data.name}</Text>
        {data.city ? <Text style={styles.city}>{data.city}</Text> : null}
        {!followed ? (
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
        ) : (
          <View style={styles.followedBadge}>
            <Text style={styles.followedText}>✓ Following</Text>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Upcoming shows</Text>
      <FlatList
        data={data.concerts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const date = new Date(item.date + "T00:00:00");
          return (
            <View style={styles.concertRow}>
              <Text style={styles.concertDate}>
                {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </Text>
              <View style={styles.concertInfo}>
                <Text style={styles.concertBand}>{item.bandName}</Text>
                {item.venue && <Text style={styles.concertMeta}>{item.venue}</Text>}
                {item.city && <Text style={styles.concertMeta}>{item.city}</Text>}
              </View>
              <View style={[styles.badge, item.status === "ATTENDING" ? styles.badgePurple : styles.badgeTeal]}>
                <Text style={styles.badgeText}>
                  {item.status === "ATTENDING" ? "Going" : "Interested"}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No upcoming shows.</Text>
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0a0a0f" },
  errorText: { color: "#f87171", fontSize: 15 },
  profileHeader: {
    alignItems: "center",
    padding: 24,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#4c1d95",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarText: { color: "#e9d5ff", fontWeight: "700", fontSize: 30 },
  name: { color: "#f9fafb", fontSize: 22, fontWeight: "700" },
  city: { color: "#9ca3af", fontSize: 14 },
  followBtn: {
    backgroundColor: "#7c3aed",
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 10,
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  followBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  followedBadge: {
    backgroundColor: "#1a1a2e",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#7c3aed40",
  },
  followedText: { color: "#a78bfa", fontWeight: "600", fontSize: 14 },
  sectionTitle: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  concertRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  concertDate: {
    color: "#a78bfa",
    fontWeight: "700",
    fontSize: 12,
    width: 40,
    textAlign: "center",
  },
  concertInfo: { flex: 1 },
  concertBand: { color: "#f9fafb", fontWeight: "600", fontSize: 14 },
  concertMeta: { color: "#9ca3af", fontSize: 12 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  badgePurple: { backgroundColor: "#7c3aed30" },
  badgeTeal: { backgroundColor: "#0d948830" },
  badgeText: { color: "#d8b4fe", fontSize: 10, fontWeight: "600" },
  empty: { alignItems: "center", padding: 24 },
  emptyText: { color: "#6b7280", fontSize: 14 },
});

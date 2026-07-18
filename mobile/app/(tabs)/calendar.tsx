import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { api, Concert, FeedItem } from "../../lib/api";
import { ConcertCard } from "../../components/ConcertCard";
import { useAuth } from "../../lib/auth";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function CalendarScreen() {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [myConcerts, setMyConcerts] = useState<Concert[]>([]);
  const [friendsConcerts, setFriendsConcerts] = useState<FeedItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [mine, feed] = await Promise.all([api.concerts.list(), api.feed.get()]);
      setMyConcerts(mine);
      setFriendsConcerts(feed);
    } catch {}
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  const myDates = new Set(myConcerts.map((c) => c.date.slice(0, 10)));
  const friendDates = new Set(friendsConcerts.map((c) => c.date.slice(0, 10)));

  function getDayType(dateStr: string): "both" | "mine" | "friends" | "none" {
    const mine = myDates.has(dateStr);
    const friends = friendDates.has(dateStr);
    if (mine && friends) return "both";
    if (mine) return "mine";
    if (friends) return "friends";
    return "none";
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function pad(n: number) { return String(n).padStart(2, "0"); }
  function dateStr(d: number) { return `${year}-${pad(month + 1)}-${pad(d)}`; }

  const selectedMine = selectedDate
    ? myConcerts.filter((c) => c.date.slice(0, 10) === selectedDate)
    : [];
  const selectedFriends = selectedDate
    ? friendsConcerts.filter((c) => c.date.slice(0, 10) === selectedDate)
    : [];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a78bfa" />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Text style={styles.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#7c3aed" }]} />
          <Text style={styles.legendText}>My shows</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#0d9488" }]} />
          <Text style={styles.legendText}>Friends'</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#6d28d9" }]} />
          <Text style={styles.legendText}>Both</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {DAYS.map((d) => (
          <Text key={d} style={styles.dayLabel}>{d}</Text>
        ))}
        {cells.map((day, idx) => {
          if (!day) return <View key={`empty-${idx}`} style={styles.cell} />;
          const ds = dateStr(day);
          const type = getDayType(ds);
          const isSelected = selectedDate === ds;
          const isToday =
            day === now.getDate() &&
            month === now.getMonth() &&
            year === now.getFullYear();

          return (
            <TouchableOpacity
              key={ds}
              style={[
                styles.cell,
                type === "mine" && styles.cellMine,
                type === "friends" && styles.cellFriends,
                type === "both" && styles.cellBoth,
                isSelected && styles.cellSelected,
              ]}
              onPress={() => setSelectedDate(isSelected ? null : ds)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayNum,
                  type !== "none" && styles.dayNumHighlighted,
                  isToday && styles.dayNumToday,
                  isSelected && styles.dayNumSelected,
                ]}
              >
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedDate && (selectedMine.length > 0 || selectedFriends.length > 0) && (
        <View style={styles.panel}>
          <Text style={styles.panelDate}>
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric",
            })}
          </Text>

          {selectedMine.length > 0 && (
            <>
              <Text style={styles.panelSection}>Your shows</Text>
              {selectedMine.map((c) => (
                <ConcertCard key={c.id} concert={c} />
              ))}
            </>
          )}

          {selectedFriends.length > 0 && (
            <>
              <Text style={[styles.panelSection, { color: "#2dd4bf" }]}>Friends' shows</Text>
              {selectedFriends.map((c) => (
                <View key={c.id} style={styles.friendCard}>
                  <Text style={styles.friendName}>{c.user.name}</Text>
                  <Text style={styles.friendBand}>{c.bandName}</Text>
                  {c.venue && <Text style={styles.friendMeta}>{c.venue}</Text>}
                  {c.city && <Text style={styles.friendMeta}>{c.city}</Text>}
                </View>
              ))}
            </>
          )}
        </View>
      )}

      {selectedDate && selectedMine.length === 0 && selectedFriends.length === 0 && (
        <View style={styles.panel}>
          <Text style={styles.panelDate}>
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric",
            })}
          </Text>
          <Text style={styles.noShows}>No shows on this day.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  navBtn: { padding: 8 },
  navArrow: { color: "#a78bfa", fontSize: 28, fontWeight: "300" },
  monthTitle: { color: "#f9fafb", fontSize: 18, fontWeight: "700" },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 12,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: "#9ca3af", fontSize: 12 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
  },
  dayLabel: {
    width: "14.28%",
    textAlign: "center",
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "600",
    paddingBottom: 6,
  },
  cell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },
  cellMine: { backgroundColor: "#4c1d9560" },
  cellFriends: { backgroundColor: "#0d948840" },
  cellBoth: { backgroundColor: "#5b21b660" },
  cellSelected: { borderWidth: 2, borderColor: "#a78bfa", borderRadius: 8 },
  dayNum: {
    color: "#9ca3af",
    fontSize: 13,
  },
  dayNumHighlighted: { color: "#f9fafb", fontWeight: "700" },
  dayNumToday: { color: "#a78bfa" },
  dayNumSelected: { color: "#fff" },
  panel: {
    margin: 16,
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  panelDate: {
    color: "#f9fafb",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  panelSection: {
    color: "#a78bfa",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  friendCard: {
    backgroundColor: "#0d948820",
    borderRadius: 8,
    padding: 10,
    gap: 2,
    borderWidth: 1,
    borderColor: "#0d948840",
  },
  friendName: { color: "#9ca3af", fontSize: 12 },
  friendBand: { color: "#fff", fontWeight: "700", fontSize: 14 },
  friendMeta: { color: "#9ca3af", fontSize: 12 },
  noShows: { color: "#6b7280", fontSize: 14 },
});

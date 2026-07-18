import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
} from "react-native";
import { Concert } from "../lib/api";

interface Props {
  concert: Concert;
  onDelete?: (id: string) => void;
}

export function ConcertCard({ concert, onDelete }: Props) {
  const date = new Date(concert.date + "T00:00:00");
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const isPurple = concert.status === "ATTENDING";

  return (
    <View style={[styles.card, isPurple ? styles.attending : styles.interested]}>
      {concert.imageUrl ? (
        <Image source={{ uri: concert.imageUrl }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>🎵</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.band} numberOfLines={1}>{concert.bandName}</Text>
        <Text style={styles.date}>{dateStr}</Text>
        {concert.startTime && (
          <Text style={styles.meta}>{concert.startTime}</Text>
        )}
        {concert.venue && (
          <Text style={styles.meta} numberOfLines={1}>{concert.venue}</Text>
        )}
        {concert.city && (
          <Text style={styles.meta}>{concert.city}</Text>
        )}
        <View style={styles.row}>
          <View style={[styles.badge, isPurple ? styles.badgePurple : styles.badgeTeal]}>
            <Text style={styles.badgeText}>
              {concert.status === "ATTENDING" ? "Attending" : "Interested"}
            </Text>
          </View>
          {concert.ticketUrl && (
            <TouchableOpacity onPress={() => Linking.openURL(concert.ticketUrl!)}>
              <Text style={styles.ticketLink}>Tickets →</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {onDelete && (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onDelete(concert.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.deleteText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
  },
  attending: {
    backgroundColor: "#1a0a2e",
    borderColor: "#7c3aed40",
  },
  interested: {
    backgroundColor: "#0a1a1a",
    borderColor: "#0d948040",
  },
  image: {
    width: 80,
    height: 80,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    fontSize: 28,
  },
  info: {
    flex: 1,
    padding: 10,
    gap: 2,
  },
  band: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  date: {
    color: "#a78bfa",
    fontSize: 12,
    fontWeight: "600",
  },
  meta: {
    color: "#9ca3af",
    fontSize: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  badgePurple: {
    backgroundColor: "#7c3aed30",
  },
  badgeTeal: {
    backgroundColor: "#0d948030",
  },
  badgeText: {
    color: "#d8b4fe",
    fontSize: 10,
    fontWeight: "600",
  },
  ticketLink: {
    color: "#a78bfa",
    fontSize: 12,
    fontWeight: "600",
  },
  deleteBtn: {
    padding: 10,
    justifyContent: "center",
  },
  deleteText: {
    color: "#6b7280",
    fontSize: 16,
  },
});

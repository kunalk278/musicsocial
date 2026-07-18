import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState, useRef } from "react";
import { useAuth } from "../../lib/auth";
import { api, LookupResult } from "../../lib/api";
import { useRouter } from "expo-router";

type Event = LookupResult["events"][number];

export default function AddShowScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [bandQuery, setBandQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; imageUrl: string | null }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedBand, setSelectedBand] = useState("");

  const [city, setCity] = useState(user?.city ?? "");
  const [lookupResults, setLookupResults] = useState<Event[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [searched, setSearched] = useState(false);

  const [saving, setSaving] = useState<string | null>(null);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onBandChange(text: string) {
    setBandQuery(text);
    setSelectedBand("");
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (text.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    suggestTimer.current = setTimeout(async () => {
      try {
        const { attractions } = await api.concerts.suggest(text);
        setSuggestions(attractions);
        setShowSuggestions(attractions.length > 0);
      } catch {}
    }, 300);
  }

  function pickSuggestion(name: string) {
    setBandQuery(name);
    setSelectedBand(name);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  async function handleSearch() {
    const band = selectedBand || bandQuery.trim();
    if (!band) { Alert.alert("Enter a band name"); return; }
    if (!city.trim()) { Alert.alert("Enter a city"); return; }
    setLookupLoading(true);
    setLookupError("");
    setLookupResults([]);
    setSearched(true);
    try {
      const result = await api.concerts.lookup(band, city.trim());
      setLookupResults(result.events);
      if (result.errors.length) setLookupError(result.errors.join("; "));
    } catch (e) {
      setLookupError((e as Error).message);
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleAdd(event: Event, status: "ATTENDING" | "INTERESTED") {
    setSaving(event.id);
    try {
      await api.concerts.create({
        bandName: event.name,
        date: event.date,
        venue: event.venue,
        city: event.city,
        startTime: event.startTime,
        ticketUrl: event.ticketUrl,
        priceMin: event.priceMin,
        priceMax: event.priceMax,
        imageUrl: event.imageUrl,
        status,
        externalId: event.id,
      });
      Alert.alert("Added!", `${event.name} added to your shows.`, [
        { text: "OK", onPress: () => router.push("/(tabs)/my-shows") },
      ]);
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#0a0a0f" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Search for a show</Text>

        <View style={styles.searchRow}>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              value={bandQuery}
              onChangeText={onBandChange}
              placeholder="Band or artist name"
              placeholderTextColor="#4b5563"
              autoCapitalize="words"
            />
            {showSuggestions && (
              <View style={styles.suggestionBox}>
                {suggestions.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.suggestionItem}
                    onPress={() => pickSuggestion(s.name)}
                  >
                    {s.imageUrl && (
                      <Image source={{ uri: s.imageUrl }} style={styles.sugImage} />
                    )}
                    <Text style={styles.sugText}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <TextInput
          style={[styles.input, { marginBottom: 12 }]}
          value={city}
          onChangeText={setCity}
          placeholder="City (e.g. New York, NY)"
          placeholderTextColor="#4b5563"
          autoCapitalize="words"
        />

        <TouchableOpacity
          style={[styles.searchBtn, lookupLoading && styles.btnDisabled]}
          onPress={handleSearch}
          disabled={lookupLoading}
        >
          {lookupLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.searchBtnText}>Search Shows</Text>
          )}
        </TouchableOpacity>

        {lookupError ? (
          <Text style={styles.errorText}>{lookupError}</Text>
        ) : null}

        {searched && !lookupLoading && lookupResults.length === 0 && !lookupError && (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>No upcoming shows found.</Text>
          </View>
        )}

        {lookupResults.map((event) => (
          <View key={event.id} style={styles.eventCard}>
            {event.imageUrl && (
              <Image source={{ uri: event.imageUrl }} style={styles.eventImage} />
            )}
            <View style={styles.eventInfo}>
              <Text style={styles.eventName}>{event.name}</Text>
              <Text style={styles.eventDate}>
                {new Date(event.date + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "short", month: "short", day: "numeric", year: "numeric",
                })}
                {event.startTime ? ` · ${event.startTime}` : ""}
              </Text>
              <Text style={styles.eventMeta}>{event.venue}</Text>
              <Text style={styles.eventMeta}>{event.city}</Text>
              {(event.priceMin || event.priceMax) && (
                <Text style={styles.eventMeta}>
                  {event.priceMin && event.priceMax
                    ? `$${event.priceMin}–$${event.priceMax}`
                    : event.priceMin
                    ? `From $${event.priceMin}`
                    : `Up to $${event.priceMax}`}
                </Text>
              )}
            </View>
            <View style={styles.eventActions}>
              <TouchableOpacity
                style={[styles.addBtn, styles.attendingBtn]}
                onPress={() => handleAdd(event, "ATTENDING")}
                disabled={saving === event.id}
              >
                {saving === event.id ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.addBtnText}>Going</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, styles.interestedBtn]}
                onPress={() => handleAdd(event, "INTERESTED")}
                disabled={saving === event.id}
              >
                <Text style={styles.addBtnText}>Interested</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    color: "#f9fafb",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  searchRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  input: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 10,
    color: "#fff",
    padding: 14,
    fontSize: 15,
    marginBottom: 8,
  },
  suggestionBox: {
    backgroundColor: "#1f2937",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#374151",
    marginTop: 2,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  sugImage: { width: 32, height: 32, borderRadius: 16 },
  sugText: { color: "#f9fafb", fontSize: 14 },
  searchBtn: {
    backgroundColor: "#7c3aed",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  btnDisabled: { opacity: 0.6 },
  searchBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  errorText: { color: "#f87171", fontSize: 13, marginBottom: 12 },
  noResults: { alignItems: "center", padding: 24 },
  noResultsText: { color: "#9ca3af", fontSize: 15 },
  eventCard: {
    backgroundColor: "#111827",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
    marginBottom: 12,
    overflow: "hidden",
  },
  eventImage: { width: "100%", height: 140 },
  eventInfo: { padding: 12, gap: 2 },
  eventName: { color: "#fff", fontSize: 16, fontWeight: "700" },
  eventDate: { color: "#a78bfa", fontSize: 13, fontWeight: "600" },
  eventMeta: { color: "#9ca3af", fontSize: 12 },
  eventActions: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    paddingTop: 0,
  },
  addBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  attendingBtn: { backgroundColor: "#7c3aed" },
  interestedBtn: { backgroundColor: "#0d9488" },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
});

import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { AuthProvider, useAuth } from "../lib/auth";
import { StatusBar } from "expo-status-bar";

function Guard() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "(auth)";
    if (!user && !inAuth) {
      router.replace("/(auth)/sign-in");
    } else if (user && inAuth) {
      router.replace("/(tabs)");
    }
  }, [user, loading, segments]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <View style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="light" />
        <Guard />
      </AuthProvider>
    </View>
  );
}

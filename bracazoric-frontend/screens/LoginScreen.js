import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../config";

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const cleanUsername = username.trim();

    if (!cleanUsername || !password) {
      Alert.alert(
        "Greška",
        "Unesite korisničko ime i lozinku."
      );
      return;
    }

    if (loading) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: cleanUsername,
          password,
        }),
      });

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error("Server nije vratio ispravan odgovor.");
      }

      if (!response.ok || !data.success) {
        Alert.alert(
          "Greška",
          data.message || "Prijava nije uspjela."
        );
        return;
      }

      if (!data.token || !data.user) {
        Alert.alert(
          "Greška",
          "Server nije vratio podatke potrebne za prijavu."
        );
        return;
      }

      await AsyncStorage.multiSet([
        ["authToken", data.token],
        ["currentUser", JSON.stringify(data.user)],
      ]);

      setPassword("");

      if (data.user.role === "firma") {
        navigation.replace("FirmaHome");
        return;
      }

      if (data.user.role === "trgovina") {
        navigation.replace("TrgovinaHome");
        return;
      }

      await AsyncStorage.multiRemove([
        "authToken",
        "currentUser",
      ]);

      Alert.alert(
        "Greška",
        "Korisnik nema podržanu ulogu."
      );
    } catch (error) {
      console.error("Login error:", error);

      Alert.alert(
        "Greška",
        "Ne mogu da se povežem sa serverom. Provjerite da li backend radi i da li je IP adresa ispravna."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        🍏 Veleprodaja
      </Text>

      <Text style={styles.subtitle}>
        Prijavite se na svoj nalog
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Korisničko ime"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
        returnKeyType="next"
      />

      <TextInput
        style={styles.input}
        placeholder="Lozinka"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!loading}
        returnKeyType="done"
        onSubmitEditing={handleLogin}
      />

      <TouchableOpacity
        style={[
          styles.button,
          loading && styles.buttonDisabled,
        ]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            Prijavi se
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f4f4f4",
  },

  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
  },

  subtitle: {
    fontSize: 17,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 35,
  },

  input: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 20,
    fontSize: 18,
  },

  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    minHeight: 56,
    justifyContent: "center",
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  buttonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
});
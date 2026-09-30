import React, { useCallback, useState } from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";

import { useFocusEffect } from "@react-navigation/native";

import {
  getCurrentUser,
  getRacuni,
  clearSession,
} from "../../services/api";


export default function HomeTrgovinaScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [ukupanDug, setUkupanDug] = useState(0);
  const [loading, setLoading] = useState(true);


  const odjaviKorisnika = async () => {
    try {
      await clearSession();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      navigation.replace("Login");
    }
  };


  const ucitajPodatke = async () => {
    setLoading(true);

    try {
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        await odjaviKorisnika();
        return;
      }

      setUser(currentUser);

      const sviRacuni = await getRacuni();

      if (!Array.isArray(sviRacuni)) {
        throw new Error(
          "Server nije vratio ispravne podatke."
        );
      }


      // PRIVREMENO:
      // Dok backend ne uvede /me/racuni,
      // filtriramo račune po ulogovanoj trgovini.
      //
      // U sljedećem backend paketu ovo uklanjamo.

      const mojiRacuni = sviRacuni.filter(
        (racun) =>
          racun.trgovina_id === currentUser.id
      );


      const dug = mojiRacuni.reduce(
        (suma, racun) => {
          const iznos =
            Number(racun.iznos) || 0;

          const uplaceno =
            Number(racun.uplaceno) || 0;

          const preostalo =
            Math.max(
              iznos - uplaceno,
              0
            );

          return suma + preostalo;
        },
        0
      );


      setUkupanDug(dug);
    } catch (error) {
      console.error(
        "Greška pri učitavanju trgovine:",
        error
      );

      if (error.status === 401) {
        await clearSession();

        Alert.alert(
          "Sesija je istekla",
          "Prijavite se ponovo."
        );

        navigation.replace("Login");
        return;
      }

      Alert.alert(
        "Greška",
        error.message ||
          "Nije moguće učitati podatke."
      );
    } finally {
      setLoading(false);
    }
  };


  useFocusEffect(
    useCallback(() => {
      ucitajPodatke();
    }, [])
  );


  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={styles.welcome}>
          Dobrodošli
        </Text>

        <Text style={styles.shopName}>
          {user?.name || "Trgovina"}
        </Text>
      </View>


      <View style={styles.debtContainer}>
        <Text style={styles.debtLabel}>
          Vaš trenutni dug:
        </Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#d9534f"
            style={styles.loader}
          />
        ) : (
          <Text style={styles.debtAmount}>
            {ukupanDug.toFixed(2)} KM
          </Text>
        )}

        <Text style={styles.debtDescription}>
          Preostali iznos po vašim računima
        </Text>
      </View>


      <TouchableOpacity
        style={styles.buttonGreen}
        onPress={() =>
          navigation.navigate(
            "Nova narudžba"
          )
        }
      >
        <Text style={styles.buttonText}>
          🛒 Napravi Narudžbu
        </Text>
      </TouchableOpacity>


      <TouchableOpacity
        style={styles.buttonBlue}
        onPress={() =>
          navigation.navigate(
            "Moji računi"
          )
        }
      >
        <Text style={styles.buttonText}>
          📑 Pregledaj Račune
        </Text>
      </TouchableOpacity>


      <TouchableOpacity
        style={styles.refreshButton}
        onPress={ucitajPodatke}
        disabled={loading}
      >
        <Text
          style={styles.refreshButtonText}
        >
          ↻ Osvježi podatke
        </Text>
      </TouchableOpacity>


      <TouchableOpacity
        style={styles.buttonRed}
        onPress={odjaviKorisnika}
      >
        <Text style={styles.buttonText}>
          🚪 Odjavi se
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  content: {
    padding: 20,
    paddingBottom: 50,
  },

  header: {
    marginTop: 30,
    marginBottom: 25,
  },

  welcome: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
  },

  shopName: {
    fontSize: 23,
    textAlign: "center",
    marginTop: 5,
    color: "#666",
    fontWeight: "600",
  },

  debtContainer: {
    backgroundColor: "#fffcf5",
    padding: 20,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#d9534f",
    alignItems: "center",
    marginBottom: 30,
  },

  debtLabel: {
    fontSize: 20,
    color: "#333",
    marginBottom: 5,
  },

  debtAmount: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#d9534f",
  },

  debtDescription: {
    fontSize: 14,
    color: "#777",
    marginTop: 6,
  },

  loader: {
    marginVertical: 10,
  },

  buttonGreen: {
    backgroundColor: "#5cb85c",
    padding: 25,
    borderRadius: 15,
    marginBottom: 20,
    alignItems: "center",
  },

  buttonBlue: {
    backgroundColor: "#007AFF",
    padding: 25,
    borderRadius: 15,
    marginBottom: 10,
    alignItems: "center",
  },

  buttonRed: {
    backgroundColor: "#333",
    padding: 20,
    borderRadius: 15,
    marginTop: 20,
    alignItems: "center",
  },

  buttonText: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
  },

  refreshButton: {
    padding: 15,
    alignItems: "center",
  },

  refreshButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#007AFF",
  },
});
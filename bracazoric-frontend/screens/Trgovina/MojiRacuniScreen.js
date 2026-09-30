import React, {
  useCallback,
  useState,
} from "react";

import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";

import { useFocusEffect } from "@react-navigation/native";

import {
  getCurrentUser,
  getRacuni,
  clearSession,
} from "../../services/api";


export default function MojiRacuniScreen({
  navigation,
}) {
  const [racuni, setRacuni] =
    useState([]);

  const [loading, setLoading] =
    useState(true);


  const fetchMojiRacuni = async () => {
    setLoading(true);

    try {
      const user =
        await getCurrentUser();

      if (!user) {
        await clearSession();

        navigation.replace("Login");
        return;
      }


      const sviRacuni =
        await getRacuni();


      if (!Array.isArray(sviRacuni)) {
        throw new Error(
          "Server nije vratio ispravne podatke."
        );
      }


      // PRIVREMENO:
      // backend će u sljedećem paketu
      // vraćati isključivo račune
      // ulogovane trgovine.

      const mojiRacuni =
        sviRacuni.filter(
          (racun) =>
            racun.trgovina_id ===
            user.id
        );


      setRacuni(mojiRacuni);
    } catch (error) {
      console.error(
        "Greška pri dohvatanju računa:",
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
          "Nije moguće učitati račune."
      );
    } finally {
      setLoading(false);
    }
  };


  useFocusEffect(
    useCallback(() => {
      fetchMojiRacuni();
    }, [])
  );


  const renderItem = ({ item }) => {
    const iznos =
      Number(item.iznos) || 0;

    const uplaceno =
      Number(item.uplaceno) || 0;

    const preostalo =
      Math.max(
        iznos - uplaceno,
        0
      );


    const potpunoPlaceno =
      item.placen ||
      preostalo <= 0;


    const djelimicnoPlaceno =
      !potpunoPlaceno &&
      uplaceno > 0;


    let statusText = "❌ Dug";
    let statusStyle =
      styles.badgeDug;


    if (potpunoPlaceno) {
      statusText = "✅ Plaćeno";
      statusStyle =
        styles.badgePlaceno;
    } else if (djelimicnoPlaceno) {
      statusText =
        "🟠 Djelimično plaćeno";

      statusStyle =
        styles.badgePartial;
    }


    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.date}>
            📅 {item.datum}
          </Text>

          <Text
            style={[
              styles.statusBadge,
              statusStyle,
            ]}
          >
            {statusText}
          </Text>
        </View>


        <View style={styles.divider} />


        <Text style={styles.stavkeTitle}>
          Detalji računa:
        </Text>

        <Text style={styles.stavkeText}>
          {item.opis ||
            "Nema dodatnog opisa."}
        </Text>


        <View style={styles.divider} />


        <View style={styles.moneyRow}>
          <Text style={styles.moneyLabel}>
            Ukupno:
          </Text>

          <Text style={styles.moneyValue}>
            {iznos.toFixed(2)} KM
          </Text>
        </View>


        <View style={styles.moneyRow}>
          <Text style={styles.moneyLabel}>
            Uplaćeno:
          </Text>

          <Text
            style={[
              styles.moneyValue,
              styles.paidValue,
            ]}
          >
            {uplaceno.toFixed(2)} KM
          </Text>
        </View>


        <View style={styles.remainingRow}>
          <Text
            style={styles.remainingLabel}
          >
            Preostalo:
          </Text>

          <Text
            style={styles.remainingValue}
          >
            {preostalo.toFixed(2)} KM
          </Text>
        </View>
      </View>
    );
  };


  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        📑 Moji Računi
      </Text>


      {loading ? (
        <ActivityIndicator
          size="large"
          color="#007AFF"
        />
      ) : racuni.length === 0 ? (
        <Text style={styles.emptyText}>
          Nemate još nijedan izdat račun.
        </Text>
      ) : (
        <FlatList
          data={racuni}
          keyExtractor={(item) =>
            item.id.toString()
          }
          renderItem={renderItem}
          contentContainerStyle={{
            paddingBottom: 30,
          }}
        />
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f4f4f4",
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
    textAlign: "center",
  },

  emptyText: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    marginTop: 40,
  },

  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },

  headerRow: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  date: {
    fontSize: 15,
    color: "#666",
    fontWeight: "bold",
    flex: 1,
    marginRight: 10,
  },

  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: "bold",
    color: "#fff",
    overflow: "hidden",
  },

  badgePlaceno: {
    backgroundColor: "#5cb85c",
  },

  badgeDug: {
    backgroundColor: "#d9534f",
  },

  badgePartial: {
    backgroundColor: "#f0ad4e",
  },

  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 15,
  },

  stavkeTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },

  stavkeText: {
    fontSize: 17,
    color: "#444",
    lineHeight: 26,
  },

  moneyRow: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    marginBottom: 8,
  },

  moneyLabel: {
    fontSize: 17,
    color: "#666",
  },

  moneyValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },

  paidValue: {
    color: "#5cb85c",
  },

  remainingRow: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginTop: 7,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },

  remainingLabel: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#333",
  },

  remainingValue: {
    fontSize: 24,
    fontWeight: "900",
    color: "#d9534f",
  },
});
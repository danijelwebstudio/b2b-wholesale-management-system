import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  getSviRacuni,
  primijeniTransakciju,
  clearSession,
} from "../../services/api";

export default function PovratAmbalazeScreen({ navigation }) {
  const [odabranaTrgovina, setOdabranaTrgovina] = useState(null);
  const [jednored, setJednored] = useState("");
  const [dvored, setDvored] = useState("");
  const [trored, setTrored] = useState("");
  const [karton, setKarton] = useState("");
  const [trgovineSaDugom, setTrgovineSaDugom] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const CIJENE = { jednored: 1.0, dvored: 1.5, trored: 2.0, karton: 0.5 };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", ucitajPodatke);
    return unsubscribe;
  }, [navigation]);

  const handleApiError = async (error, fallback) => {
    console.error(error);

    if (error.status === 401) {
      await clearSession();
      navigation.replace("Login");
      return;
    }

    Alert.alert("Greška", error.message || fallback);
  };

  const ucitajPodatke = async () => {
    setLoading(true);

    try {
      const data = await getSviRacuni();
      const lista = Array.isArray(data) ? data : [];
      const neplaceniRacuni = lista.filter(
        (r) => !r.placen && Number(r.iznos) > Number(r.uplaceno || 0)
      );

      const jedinstveneTrgovine = {};

      neplaceniRacuni.forEach((racun) => {
        if (!jedinstveneTrgovine[racun.trgovina_id]) {
          jedinstveneTrgovine[racun.trgovina_id] = {
            id: racun.trgovina_id,
            name: racun.trgovinaIme,
            ukupanDug: 0,
          };
        }

        const preostaliDug =
          (Number(racun.iznos) || 0) - (Number(racun.uplaceno) || 0);

        jedinstveneTrgovine[racun.trgovina_id].ukupanDug += Math.max(
          preostaliDug,
          0
        );
      });

      setTrgovineSaDugom(Object.values(jedinstveneTrgovine));
    } catch (error) {
      await handleApiError(error, "Ne mogu učitati podatke sa servera.");
    } finally {
      setLoading(false);
    }
  };

  const izracunajVrijednost = () =>
    (parseInt(jednored, 10) || 0) * CIJENE.jednored +
    (parseInt(dvored, 10) || 0) * CIJENE.dvored +
    (parseInt(trored, 10) || 0) * CIJENE.trored +
    (parseInt(karton, 10) || 0) * CIJENE.karton;

  const proknjiziAmbalazu = async () => {
    if (submitting) return;
    if (!odabranaTrgovina) {
      return Alert.alert("Greška", "Izaberite trgovinu.");
    }

    const ukupnaVrijednost = izracunajVrijednost();

    if (ukupnaVrijednost <= 0) {
      return Alert.alert("Greška", "Unesite količinu ambalaže.");
    }

    if (ukupnaVrijednost > odabranaTrgovina.ukupanDug) {
      return Alert.alert("Pažnja", "Vrijednost ambalaže je veća od trenutnog duga!");
    }

    setSubmitting(true);

    try {
      const rezultat = await primijeniTransakciju({
        trgovinaId: odabranaTrgovina.id,
        tip: "AMBALAZA",
        iznos: ukupnaVrijednost,
        opis: `Gajbe - J:${jednored || 0}, D:${dvored || 0}, T:${trored || 0}, K:${karton || 0}`,
      });

      Alert.alert(
        "✅ Proknjiženo",
        `Dug je umanjen za ${ukupnaVrijednost.toFixed(2)} KM. Preostali dug: ${rezultat.preostaliDug} KM`
      );

      navigation.goBack();
    } catch (error) {
      await handleApiError(error, "Nije moguće proknjižiti ambalažu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>♻️ Prijem Ambalaže</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#5cb85c" />
      ) : trgovineSaDugom.length === 0 ? (
        <Text style={styles.emptyText}>Trenutno nema trgovina sa dugovanjima.</Text>
      ) : (
        <>
          <Text style={styles.label}>Izaberi trgovinu:</Text>

          {trgovineSaDugom.map((trgovina) => (
            <TouchableOpacity
              key={trgovina.id}
              style={[
                styles.shopButton,
                odabranaTrgovina?.id === trgovina.id && styles.shopButtonActive,
              ]}
              onPress={() => setOdabranaTrgovina(trgovina)}
              disabled={submitting}
            >
              <Text
                style={[
                  styles.shopButtonText,
                  odabranaTrgovina?.id === trgovina.id && styles.shopTextActive,
                ]}
              >
                🏢 {trgovina.name} (Dug: {trgovina.ukupanDug.toFixed(2)} KM)
              </Text>
            </TouchableOpacity>
          ))}

          <Text style={styles.label}>Unesi komade:</Text>

          <View style={styles.inputRow}>
            <Text style={styles.inputText}>Jednored ({CIJENE.jednored}):</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={jednored} onChangeText={setJednored} placeholder="0" editable={!submitting} />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputText}>Dvored ({CIJENE.dvored}):</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={dvored} onChangeText={setDvored} placeholder="0" editable={!submitting} />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputText}>Trored ({CIJENE.trored}):</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={trored} onChangeText={setTrored} placeholder="0" editable={!submitting} />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputText}>Karton ({CIJENE.karton}):</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={karton} onChangeText={setKarton} placeholder="0" editable={!submitting} />
          </View>

          <View style={styles.totalBox}>
            <Text style={styles.totalText}>Za odbijanje od duga:</Text>
            <Text style={styles.totalAmount}>
              {izracunajVrijednost().toFixed(2)} KM
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.actionButton, submitting && styles.disabledButton]}
            onPress={proknjiziAmbalazu}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>✔️ Skini sa duga</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 50 }} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 20, color: "#333" },
  emptyText: { fontSize: 18, color: "#666", textAlign: "center", marginTop: 20 },
  label: { fontSize: 20, fontWeight: "bold", marginTop: 10, marginBottom: 15, color: "#555" },
  shopButton: { padding: 15, borderRadius: 10, borderWidth: 2, borderColor: "#ddd", marginBottom: 10, backgroundColor: "#f4f4f4" },
  shopButtonActive: { borderColor: "#5cb85c", backgroundColor: "#eafbee" },
  shopButtonText: { fontSize: 18, fontWeight: "bold", color: "#666", textAlign: "center" },
  shopTextActive: { color: "#5cb85c" },
  inputRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  inputText: { fontSize: 18, fontWeight: "bold" },
  input: { borderWidth: 2, borderColor: "#ccc", borderRadius: 8, padding: 10, fontSize: 20, width: 80, textAlign: "center" },
  totalBox: { backgroundColor: "#fffcf5", padding: 20, borderRadius: 10, borderWidth: 2, borderColor: "#f0ad4e", marginTop: 20, alignItems: "center" },
  totalText: { fontSize: 18, color: "#666", marginBottom: 5 },
  totalAmount: { fontSize: 32, fontWeight: "bold", color: "#f0ad4e" },
  actionButton: { backgroundColor: "#5cb85c", padding: 20, borderRadius: 10, alignItems: "center", marginTop: 20 },
  disabledButton: { opacity: 0.65 },
  actionButtonText: { color: "white", fontSize: 22, fontWeight: "bold" },
});

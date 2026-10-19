import 'react-native-gesture-handler';

import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import {
  Button,
  Card,
  Divider,
  List,
  PaperProvider,
  Text,
  TextInput,
} from 'react-native-paper';

import {
  NavigationContainer,
  NavigatorScreenParams,
} from '@react-navigation/native';

import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import MapView, { Marker } from 'react-native-maps';

import {
  getDatabase,
  onValue,
  push,
  ref,
  remove,
  set,
} from 'firebase/database';

import { app } from './firebaseConfig';

const database = getDatabase(app);

type Place = {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
};

type RootStackParamList = {
  Places: undefined;
  Map: {
    place: Place;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const DEFAULT_REGION = {
  latitude: 60.1699,
  longitude: 24.9384,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

async function geocodeAddress(
  address: string,
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const url =
      'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=' +
      encodeURIComponent(address);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Osoitteen hakeminen epäonnistui.');
    }

    const results = await response.json();

    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }

    return {
      latitude: Number(results[0].lat),
      longitude: Number(results[0].lon),
    };
  } catch (error) {
    console.error('Geokoodausvirhe:', error);
    throw error;
  }
}

type PlacesScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Places'
>;

function PlacesScreen({ navigation }: PlacesScreenProps) {
  const [address, setAddress] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const placesRef = ref(database, 'addresses');

    const unsubscribe = onValue(
      placesRef,
      (snapshot) => {
        const data = snapshot.val();

        if (!data) {
          setPlaces([]);
          return;
        }

        const loadedPlaces: Place[] = Object.entries(data).map(
          ([id, value]) => {
            const item = value as Omit<Place, 'id'>;

            return {
              id,
              address: item.address,
              latitude: Number(item.latitude),
              longitude: Number(item.longitude),
            };
          },
        );

        setPlaces(loadedPlaces);
      },
      (error) => {
        console.error('Osoitteiden latausvirhe:', error);

        Alert.alert(
          'Virhe',
          'Osoitteiden lataaminen ei onnistunut. Tarkista Firebase-yhteys.',
        );
      },
    );

    return unsubscribe;
  }, []);

  // Uuden osoitteen tallentaminen
  async function saveAddress() {
    const cleanedAddress = address.trim();

    if (!cleanedAddress) {
      Alert.alert('Puuttuva osoite', 'Kirjoita ensin osoite.');
      return;
    }

    setSaving(true);

    try {
      const coordinates = await geocodeAddress(cleanedAddress);

      if (!coordinates) {
        Alert.alert(
          'Osoitetta ei löytynyt',
          'Tarkista osoitteen kirjoitusasu ja kokeile uudelleen.',
        );
        return;
      }

      const placesRef = ref(database, 'addresses');
      const newPlaceRef = push(placesRef);

      await set(newPlaceRef, {
        address: cleanedAddress,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });

      setAddress('');

      Alert.alert('Tallennettu', 'Osoite lisättiin osoitekirjaan.');
    } catch (error) {
      console.error('Tallennusvirhe:', error);

      Alert.alert(
        'Tallennus epäonnistui',
        'Tarkista internetyhteys ja Firebase-asetukset.',
      );
    } finally {
      setSaving(false);
    }
  }

  function deleteAddress(place: Place) {
    Alert.alert(
      'Poistetaanko osoite?',
      place.address,
      [
        {
          text: 'Peruuta',
          style: 'cancel',
        },
        {
          text: 'Poista',
          style: 'destructive',
          onPress: async () => {
            try {
              await remove(ref(database, `addresses/${place.id}`));
            } catch (error) {
              console.error('Poistovirhe:', error);

              Alert.alert(
                'Virhe',
                'Osoitteen poistaminen ei onnistunut.',
              );
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text variant="headlineMedium" style={styles.heading}>
        Osoitekirja
      </Text>

      <Text variant="bodyMedium" style={styles.subtitle}>
        Tallenna tärkeät paikat ja löydä ne helposti kartalta.
      </Text>

      <Card style={styles.formCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Lisää uusi osoite
          </Text>

          <TextInput
            label="Osoite"
            placeholder="Esim. Mannerheimintie 10, Helsinki"
            value={address}
            onChangeText={setAddress}
            mode="outlined"
            autoCapitalize="words"
            left={<TextInput.Icon icon="map-marker-outline" />}
            style={styles.input}
          />

          <Button
            mode="contained"
            icon="plus"
            onPress={saveAddress}
            loading={saving}
            disabled={saving}
            style={styles.button}
          >
            Tallenna osoite
          </Button>
        </Card.Content>
      </Card>

      <View style={styles.listHeader}>
        <Text variant="titleLarge">Tallennetut osoitteet</Text>

        <Text variant="bodyMedium">
          {places.length} kpl
        </Text>
      </View>

      <Text variant="bodySmall" style={styles.hint}>
        Avaa osoite kartalla napauttamalla. Poista osoite
        painamalla sitä pitkään.
      </Text>

      <Card style={styles.listCard}>
        {places.length === 0 ? (
          <Card.Content>
            <Text variant="bodyMedium" style={styles.emptyText}>
              Ei vielä tallennettuja osoitteita.
            </Text>
          </Card.Content>
        ) : (
          places.map((place, index) => (
            <React.Fragment key={place.id}>
              {index > 0 && <Divider />}

              <List.Item
                title={place.address}
                description="Näytä kartalla"
                titleNumberOfLines={2}
                left={(props) => (
                  <List.Icon
                    {...props}
                    icon="map-marker"
                    color="#496B8A"
                  />
                )}
                right={(props) => (
                  <List.Icon
                    {...props}
                    icon="chevron-right"
                  />
                )}
                onPress={() =>
                  navigation.navigate('Map', { place })
                }
                onLongPress={() => deleteAddress(place)}
              />
            </React.Fragment>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

// MAP-NÄKYMÄ
type MapScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Map'
>;

function MapScreen({ route }: MapScreenProps) {
  const { place } = route.params;

  const region = {
    latitude: place.latitude,
    longitude: place.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View style={styles.mapContainer}>
      <View style={styles.addressHeader}>
        <Text variant="titleMedium">
          {place.address}
        </Text>

        <Text variant="bodySmall" style={styles.coordinates}>
          {place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}
        </Text>
      </View>

      <MapView
        style={styles.map}
        initialRegion={region}
      >
        <Marker
          coordinate={{
            latitude: place.latitude,
            longitude: place.longitude,
          }}
          title={place.address}
          description="Tallennettu osoite"
        />
      </MapView>
    </View>
  );
}

export default function App() {
  return (
    <PaperProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Places"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#496B8A',
            },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            contentStyle: {
              backgroundColor: '#F5F7FA',
            },
          }}
        >
          <Stack.Screen
            name="Places"
            component={PlacesScreen}
            options={{
              title: 'My Places',
            }}
          />

          <Stack.Screen
            name="Map"
            component={MapScreen}
            options={{
              title: 'Map',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}

// TYYLIT
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  content: {
    padding: 18,
    paddingBottom: 32,
  },

  heading: {
    fontWeight: 'bold',
    color: '#304B65',
    marginBottom: 6,
  },

  subtitle: {
    color: '#657487',
    marginBottom: 22,
    lineHeight: 21,
  },

  formCard: {
    marginBottom: 28,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },

  sectionTitle: {
    marginBottom: 14,
    color: '#304B65',
  },

  input: {
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
  },

  button: {
    borderRadius: 8,
  },

  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  hint: {
    color: '#657487',
    marginBottom: 12,
    lineHeight: 19,
  },

  listCard: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },

  emptyText: {
    color: '#657487',
    textAlign: 'center',
    paddingVertical: 20,
  },

  mapContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  addressHeader: {
    padding: 18,
    backgroundColor: '#FFFFFF',
  },

  coordinates: {
    color: '#657487',
    marginTop: 6,
  },

  map: {
    flex: 1,
  },
});
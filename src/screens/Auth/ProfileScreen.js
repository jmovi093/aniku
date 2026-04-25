// src/screens/Auth/ProfileScreen.js
// Pantalla de perfil de usuario

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Switch,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AuthService from "../../services/AuthService";
import {
  KNOWN_LOG_TAGS,
  getLoggerConfig,
  setLoggerLevel,
  setLoggingEnabled,
  setTagEnabled,
} from "../../utils/logger";

const ProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggerConfig, setLoggerConfig] = useState(null);

  const loadLoggerSettings = async () => {
    const config = getLoggerConfig();
    setLoggerConfig(config);
  };

  // 🔄 Cargar información del usuario
  useEffect(() => {
    const loadUserInfo = () => {
      const userInfo = AuthService.getCurrentUserInfo();
      setUser(userInfo);
      setLoading(false);
    };

    // Listener para cambios en el estado de autenticación
    const unsubscribe = AuthService.onAuthStateChange((firebaseUser) => {
      if (firebaseUser) {
        const userInfo = AuthService.getCurrentUserInfo();
        setUser(userInfo);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    loadUserInfo();
    loadLoggerSettings();

    return () => unsubscribe();
  }, []);

  const handleToggleGlobalLogs = async (enabled) => {
    const updated = await setLoggingEnabled(enabled);
    setLoggerConfig(updated);
  };

  const handleSetLogLevel = async (level) => {
    const updated = await setLoggerLevel(level);
    setLoggerConfig(updated);
  };

  const handleToggleTag = async (tag, enabled) => {
    const updated = await setTagEnabled(tag, enabled);
    setLoggerConfig(updated);
  };

  // 🚪 Manejar cierre de sesión
  const handleSignOut = () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro de que quieres cerrar sesión?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar Sesión",
          style: "destructive",
          onPress: async () => {
            const result = await AuthService.signOut();
            if (result.success) {
              Alert.alert("Sesión cerrada", result.message);
            }
          },
        },
      ],
    );
  };

  // 🔑 Navegar a pantalla de login
  const navigateToLogin = () => {
    navigation.navigate("Login");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ecdc4" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  // Vista sin usuario autenticado
  if (!user) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Perfil</Text>
        </View>

        <View style={styles.unauthenticatedContainer}>
          <MaterialIcons name="account-circle" size={100} color="#666666" />
          <Text style={styles.unauthenticatedTitle}>
            No has iniciado sesión
          </Text>
          <Text style={styles.unauthenticatedSubtitle}>
            Inicia sesión para sincronizar tu historial, descargas y
            preferencias en todos tus dispositivos
          </Text>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={navigateToLogin}
          >
            <MaterialIcons name="login" size={20} color="#ffffff" />
            <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
          </TouchableOpacity>

          {/* Acceso directo a Descargas sin autenticación */}
          <TouchableOpacity
            style={styles.downloadsButton}
            onPress={() => navigation.navigate("Downloads")}
          >
            <MaterialIcons name="download" size={20} color="#ffffff" />
            <Text style={styles.downloadsButtonText}>Ver Descargas</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Vista con usuario autenticado
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Perfil</Text>
      </View>

      {/* Información del usuario */}
      <View style={styles.userSection}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <MaterialIcons name="account-circle" size={60} color="#4ecdc4" />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {user.displayName || "Usuario Aniku"}
            </Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <Text style={styles.userMeta}>
              Miembro desde {new Date(user.creationTime).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>

      {/* Solo acciones funcionales */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Opciones</Text>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => navigation.navigate("Downloads")}
        >
          <MaterialIcons name="download" size={24} color="#f39c12" />
          <Text style={styles.actionText}>Descargas</Text>
          <MaterialIcons name="chevron-right" size={24} color="#666666" />
        </TouchableOpacity>
      </View>

      {/* Cerrar sesión */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <MaterialIcons name="logout" size={20} color="#e74c3c" />
          <Text style={styles.signOutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      {__DEV__ && loggerConfig && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Logs (Dev)</Text>

          <View style={styles.logRowCard}>
            <Text style={styles.logRowLabel}>Logs activos</Text>
            <Switch
              value={loggerConfig.enabled}
              onValueChange={handleToggleGlobalLogs}
              trackColor={{ false: "#444", true: "#4ecdc4" }}
              thumbColor={loggerConfig.enabled ? "#ffffff" : "#cccccc"}
            />
          </View>

          <View style={styles.logLevelsRow}>
            {["debug", "info", "warn", "error"].map((level) => {
              const isActive = loggerConfig.minLevel === level;
              return (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.logLevelChip,
                    isActive && styles.logLevelChipActive,
                  ]}
                  onPress={() => handleSetLogLevel(level)}
                >
                  <Text
                    style={[
                      styles.logLevelText,
                      isActive && styles.logLevelTextActive,
                    ]}
                  >
                    {level.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {KNOWN_LOG_TAGS.map((tag) => (
            <View key={tag} style={styles.logRowCard}>
              <Text style={styles.logRowLabel}>{tag}</Text>
              <Switch
                value={Boolean(loggerConfig.tags?.[tag])}
                onValueChange={(enabled) => handleToggleTag(tag, enabled)}
                trackColor={{ false: "#444", true: "#4ecdc4" }}
                thumbColor={loggerConfig.tags?.[tag] ? "#ffffff" : "#cccccc"}
              />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  contentContainer: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
  },
  loadingText: {
    color: "#ffffff",
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
  },
  unauthenticatedContainer: {
    alignItems: "center",
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  unauthenticatedTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 20,
  },
  unauthenticatedSubtitle: {
    fontSize: 14,
    color: "#cccccc",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 20,
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4ecdc4",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 30,
  },
  loginButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  downloadsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f39c12",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 15,
  },
  downloadsButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  userSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a2a",
    padding: 20,
    borderRadius: 15,
  },
  avatar: {
    marginRight: 15,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  userEmail: {
    fontSize: 14,
    color: "#4ecdc4",
    marginTop: 2,
  },
  userMeta: {
    fontSize: 12,
    color: "#888888",
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 15,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a2a",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  actionText: {
    fontSize: 16,
    color: "#ffffff",
    marginLeft: 15,
    flex: 1,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2a2a2a",
    padding: 15,
    borderRadius: 12,
    borderColor: "#e74c3c",
    borderWidth: 1,
  },
  signOutText: {
    fontSize: 16,
    color: "#e74c3c",
    marginLeft: 8,
    fontWeight: "500",
  },
  logRowCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  logRowLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
  logLevelsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  logLevelChip: {
    backgroundColor: "#2a2a2a",
    borderColor: "#555",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logLevelChipActive: {
    backgroundColor: "#4ecdc4",
    borderColor: "#4ecdc4",
  },
  logLevelText: {
    color: "#cccccc",
    fontSize: 12,
    fontWeight: "700",
  },
  logLevelTextActive: {
    color: "#0f1a1a",
  },
});

export default ProfileScreen;

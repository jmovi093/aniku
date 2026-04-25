// src/screens/Auth/LoginScreen.js
// Pantalla de inicio de sesión y registro

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AuthService from "../../services/AuthService";

const LoginScreen = ({ navigation }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 📝 Actualizar datos del formulario
  const updateFormData = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 🔐 Manejar inicio de sesión
  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert("Error", "Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    try {
      const result = await AuthService.signInWithEmail(
        formData.email,
        formData.password
      );

      if (result.success) {
        Alert.alert("¡Bienvenido!", result.message, [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert("Error de autenticación", result.error);
      }
    } catch (error) {
      Alert.alert("Error", "Error inesperado al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  // 📝 Manejar registro
  const handleRegister = async () => {
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      Alert.alert("Error", "Por favor completa todos los campos");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert("Error", "Las contraseñas no coinciden");
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const result = await AuthService.signUpWithEmail(
        formData.email,
        formData.password,
        formData.displayName
      );

      if (result.success) {
        Alert.alert("¡Cuenta creada!", result.message, [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert("Error al registrarse", result.error);
      }
    } catch (error) {
      Alert.alert("Error", "Error inesperado al crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  // 🔄 Alternar entre login y registro
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      displayName: "",
    });
  };

  // 🔑 Manejar recuperación de contraseña
  const handleForgotPassword = async () => {
    if (!formData.email) {
      Alert.alert(
        "Email requerido",
        "Ingresa tu email para restablecer la contraseña"
      );
      return;
    }

    setLoading(true);
    try {
      const result = await AuthService.resetPassword(formData.email);

      if (result.success) {
        Alert.alert("Email enviado", result.message);
      } else {
        Alert.alert("Error", result.error);
      }
    } catch (error) {
      Alert.alert("Error", "Error al enviar email de restablecimiento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Logo y título */}
        <View style={styles.logoContainer}>
          <MaterialIcons name="account-circle" size={80} color="#4ecdc4" />
          <Text style={styles.appTitle}>Aniku</Text>
          <Text style={styles.subtitle}>
            {isLogin ? "Inicia sesión en tu cuenta" : "Crea tu cuenta"}
          </Text>
        </View>

        {/* Formulario */}
        <View style={styles.formContainer}>
          {/* Email */}
          <View style={styles.inputContainer}>
            <MaterialIcons name="email" size={20} color="#888888" />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#888888"
              value={formData.email}
              onChangeText={(text) => updateFormData("email", text)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          {/* Nombre de usuario (solo en registro) */}
          {!isLogin && (
            <View style={styles.inputContainer}>
              <MaterialIcons name="person" size={20} color="#888888" />
              <TextInput
                style={styles.input}
                placeholder="Nombre de usuario (opcional)"
                placeholderTextColor="#888888"
                value={formData.displayName}
                onChangeText={(text) => updateFormData("displayName", text)}
                autoCapitalize="words"
              />
            </View>
          )}

          {/* Contraseña */}
          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={20} color="#888888" />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#888888"
              value={formData.password}
              onChangeText={(text) => updateFormData("password", text)}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <MaterialIcons
                name={showPassword ? "visibility-off" : "visibility"}
                size={20}
                color="#888888"
              />
            </TouchableOpacity>
          </View>

          {/* Confirmar contraseña (solo en registro) */}
          {!isLogin && (
            <View style={styles.inputContainer}>
              <MaterialIcons name="lock" size={20} color="#888888" />
              <TextInput
                style={styles.input}
                placeholder="Confirmar contraseña"
                placeholderTextColor="#888888"
                value={formData.confirmPassword}
                onChangeText={(text) => updateFormData("confirmPassword", text)}
                secureTextEntry={!showPassword}
              />
            </View>
          )}

          {/* Botón principal */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabledButton]}
            onPress={isLogin ? handleLogin : handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Forgot password (solo en login) */}
          {isLogin && (
            <TouchableOpacity
              style={styles.forgotButton}
              onPress={handleForgotPassword}
              disabled={loading}
            >
              <Text style={styles.forgotButtonText}>
                ¿Olvidaste tu contraseña?
              </Text>
            </TouchableOpacity>
          )}

          {/* Alternar modo */}
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>
              {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}
            </Text>
            <TouchableOpacity onPress={toggleMode} disabled={loading}>
              <Text style={styles.toggleButton}>
                {isLogin ? "Regístrate" : "Inicia sesión"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Al continuar, aceptas nuestros términos y condiciones
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  closeButton: {
    padding: 8,
  },
  logoContainer: {
    alignItems: "center",
    paddingVertical: 30,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#cccccc",
    marginTop: 8,
    textAlign: "center",
  },
  formContainer: {
    paddingHorizontal: 30,
    paddingTop: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    height: 50,
  },
  input: {
    flex: 1,
    color: "#ffffff",
    fontSize: 16,
    marginLeft: 10,
  },
  eyeButton: {
    padding: 5,
  },
  primaryButton: {
    backgroundColor: "#4ecdc4",
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: "#666666",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  forgotButton: {
    alignItems: "center",
    marginTop: 15,
    padding: 10,
  },
  forgotButtonText: {
    color: "#4ecdc4",
    fontSize: 14,
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    paddingVertical: 20,
  },
  toggleText: {
    color: "#cccccc",
    fontSize: 14,
  },
  toggleButton: {
    color: "#4ecdc4",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 5,
  },
  footer: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  footerText: {
    color: "#888888",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
});

export default LoginScreen;

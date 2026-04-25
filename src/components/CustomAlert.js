import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  BackHandler,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const { width: screenWidth } = Dimensions.get("window");

class CustomAlert {
  static alertInstance = null;

  static setAlertInstance(instance) {
    this.alertInstance = instance;
  }

  static show(title, message, buttons = [], options = {}) {
    if (this.alertInstance) {
      this.alertInstance.showAlert(title, message, buttons, options);
    }
  }

  // Métodos de conveniencia
  static success(title, message, onPress) {
    this.show(title, message, [{ text: "OK", onPress }], { type: "success" });
  }

  static error(title, message, onPress) {
    this.show(title, message, [{ text: "OK", onPress }], { type: "error" });
  }

  static warning(title, message, onPress) {
    this.show(title, message, [{ text: "OK", onPress }], { type: "warning" });
  }

  static info(title, message, onPress) {
    this.show(title, message, [{ text: "OK", onPress }], { type: "info" });
  }

  static confirm(title, message, onConfirm, onCancel) {
    this.show(
      title,
      message,
      [
        { text: "Cancelar", style: "cancel", onPress: onCancel },
        { text: "Confirmar", style: "destructive", onPress: onConfirm },
      ],
      { type: "warning" }
    );
  }

  static loading(title, message) {
    this.show(title, message, [], { type: "loading", dismissible: false });
  }

  static hide() {
    if (this.alertInstance) {
      this.alertInstance.hideAlert();
    }
  }
}

const CustomAlertComponent = () => {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [buttons, setButtons] = useState([]);
  const [options, setOptions] = useState({});
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  useEffect(() => {
    CustomAlert.setAlertInstance({
      showAlert,
      hideAlert,
    });

    // Manejar botón de retroceso en Android
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (visible && options.dismissible !== false) {
          hideAlert();
          return true;
        }
        return false;
      }
    );

    return () => backHandler.remove();
  }, [visible, options.dismissible]);

  const showAlert = (
    alertTitle,
    alertMessage,
    alertButtons = [],
    alertOptions = {}
  ) => {
    setTitle(alertTitle);
    setMessage(alertMessage);
    setButtons(alertButtons.length > 0 ? alertButtons : [{ text: "OK" }]);
    setOptions(alertOptions);
    setVisible(true);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideAlert = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  };

  const handleButtonPress = (button) => {
    if (button.onPress) {
      button.onPress();
    }
    hideAlert();
  };

  const getIconForType = (type) => {
    switch (type) {
      case "success":
        return { iconName: "check-circle", color: "#28a745" };
      case "error":
        return { iconName: "error", color: "#dc3545" };
      case "warning":
        return { iconName: "warning", color: "#ffc107" };
      case "info":
        return { iconName: "info", color: "#17a2b8" };
      case "loading":
        return { iconName: "hourglass-empty", color: "#007bff" };
      default:
        return { iconName: "chat", color: "#6c757d" };
    }
  };

  const typeInfo = getIconForType(options.type);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={() => {
        if (options.dismissible !== false) {
          hideAlert();
        }
      }}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.alertContainer,
            { transform: [{ scale: scaleAnim }] },
            options.type && { borderTopColor: typeInfo.color },
          ]}
        >
          {/* Header con icono */}
          <View style={styles.header}>
            <MaterialIcons
              name={typeInfo.iconName}
              size={24}
              color={typeInfo.color}
            />
            <Text style={[styles.title, { color: typeInfo.color }]}>
              {title}
            </Text>
          </View>

          {/* Mensaje */}
          <Text style={styles.message}>{message}</Text>

          {/* Loading indicator para tipo loading */}
          {options.type === "loading" && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Cargando...</Text>
            </View>
          )}

          {/* Botones */}
          {buttons.length > 0 && options.type !== "loading" && (
            <View style={styles.buttonsContainer}>
              {buttons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    button.style === "cancel" && styles.cancelButton,
                    button.style === "destructive" && styles.destructiveButton,
                    buttons.length === 1 && styles.singleButton,
                  ]}
                  onPress={() => handleButtonPress(button)}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      button.style === "cancel" && styles.cancelButtonText,
                      button.style === "destructive" &&
                        styles.destructiveButtonText,
                    ]}
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  alertContainer: {
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    padding: 24,
    width: Math.min(screenWidth - 40, 350),
    maxWidth: "90%",
    borderTopWidth: 4,
    borderTopColor: "#007bff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    flex: 1,
  },
  message: {
    fontSize: 16,
    color: "#cccccc",
    lineHeight: 22,
    marginBottom: 24,
    textAlign: "left",
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  loadingText: {
    color: "#007bff",
    fontSize: 14,
    fontStyle: "italic",
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  button: {
    backgroundColor: "#007bff",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
  },
  singleButton: {
    flex: 1,
  },
  cancelButton: {
    backgroundColor: "#6c757d",
  },
  destructiveButton: {
    backgroundColor: "#dc3545",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  cancelButtonText: {
    color: "#ffffff",
  },
  destructiveButtonText: {
    color: "#ffffff",
  },
});

// Exportar tanto el componente como la clase
export { CustomAlert };
export default CustomAlertComponent;

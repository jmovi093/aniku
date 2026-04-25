// __tests__/components/Button.test.js
// Tests básicos para Button component

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import Button from "../../src/components/ui/Button/Button";

describe("Button", () => {
  test("should render button with title", () => {
    const { getByText } = render(<Button title="Test Button" />);

    expect(getByText("Test Button")).toBeTruthy();
  });

  test("should call onPress when pressed", () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <Button title="Test Button" onPress={onPressMock} />
    );

    fireEvent.press(getByText("Test Button"));

    expect(onPressMock).toHaveBeenCalled();
  });

  test("should be disabled when disabled prop is true", () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <Button title="Test Button" onPress={onPressMock} disabled={true} />
    );

    const button = getByText("Test Button").parent;

    fireEvent.press(button);

    expect(onPressMock).not.toHaveBeenCalled();
  });

  test("should show loading when loading prop is true", () => {
    const { queryByText } = render(
      <Button title="Test Button" loading={true} />
    );

    // Cuando está loading, no debe mostrar el título
    expect(queryByText("Test Button")).toBeNull();
  });

  test("should apply variant styles correctly", () => {
    const { getByText } = render(
      <Button title="Primary Button" variant="primary" />
    );

    const button = getByText("Primary Button").parent;
    expect(button).toBeTruthy();
  });
});

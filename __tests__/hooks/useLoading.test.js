// __tests__/hooks/useLoading.test.js
// Tests básicos para useLoading hook

import { renderHook, act } from "@testing-library/react-hooks";
import useLoading from "../../src/hooks/ui/useLoading";

describe("useLoading", () => {
  test("should initialize with false by default", () => {
    const { result } = renderHook(() => useLoading());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasAnyLoading).toBe(false);
  });

  test("should initialize with custom initial state", () => {
    const { result } = renderHook(() => useLoading(true));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasAnyLoading).toBe(true);
  });

  test("should start and stop loading", () => {
    const { result } = renderHook(() => useLoading());

    act(() => {
      result.current.startLoading();
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.stopLoading();
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("should handle loading by ID", () => {
    const { result } = renderHook(() => useLoading());

    act(() => {
      result.current.startLoadingById("test-id");
    });

    expect(result.current.isLoadingById("test-id")).toBe(true);
    expect(result.current.hasAnyLoading).toBe(true);

    act(() => {
      result.current.stopLoadingById("test-id");
    });

    expect(result.current.isLoadingById("test-id")).toBe(false);
    expect(result.current.hasAnyLoading).toBe(false);
  });

  test("should handle async functions with withLoading", async () => {
    const { result } = renderHook(() => useLoading());

    const asyncFn = jest.fn().mockResolvedValue("test result");

    let promise;
    act(() => {
      promise = result.current.withLoading(asyncFn);
    });

    expect(result.current.isLoading).toBe(true);

    const response = await promise;

    expect(result.current.isLoading).toBe(false);
    expect(response).toBe("test result");
    expect(asyncFn).toHaveBeenCalled();
  });
});

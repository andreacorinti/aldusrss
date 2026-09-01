import { describe, it, expect, vi, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { ErrorBoundary } from "./ErrorBoundary";

function Bomb() {
  throw new Error("boom");
}

function render(element) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return { container, root };
}

let cleanup = [];
afterEach(() => {
  for (const fn of cleanup) fn();
  cleanup = [];
});

describe("ErrorBoundary", () => {
  it("renders children normally when nothing throws", () => {
    const { container, root } = render(
      <ErrorBoundary fallback={<div>fallback</div>}>
        <div>ok</div>
      </ErrorBoundary>
    );
    cleanup.push(() => act(() => root.unmount()));
    expect(container.textContent).toBe("ok");
  });

  it("renders the fallback instead of crashing when a child throws during render", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container, root } = render(
      <ErrorBoundary fallback={<div>fallback</div>}>
        <Bomb />
      </ErrorBoundary>
    );
    cleanup.push(() => act(() => root.unmount()), () => spy.mockRestore());
    expect(container.textContent).toBe("fallback");
  });

  it("logs the caught error instead of swallowing it silently", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { root } = render(
      <ErrorBoundary fallback={<div>fallback</div>}>
        <Bomb />
      </ErrorBoundary>
    );
    cleanup.push(() => act(() => root.unmount()), () => spy.mockRestore());
    const loggedOurError = spy.mock.calls.some((args) => String(args[0]).includes("[AldusRSS] errore di rendering:"));
    expect(loggedOurError).toBe(true);
  });

  it("recovers once remounted under a new key, matching how App.jsx keys it by tab/section/article", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <ErrorBoundary key="a" fallback={<div>fallback</div>}>
          <Bomb />
        </ErrorBoundary>
      );
    });
    expect(container.textContent).toBe("fallback");
    act(() => {
      root.render(
        <ErrorBoundary key="b" fallback={<div>fallback</div>}>
          <div>recovered</div>
        </ErrorBoundary>
      );
    });
    cleanup.push(() => act(() => root.unmount()), () => spy.mockRestore());
    expect(container.textContent).toBe("recovered");
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("test environment", () => {
  it("renders JSX via jsdom and asserts with jest-dom matchers", () => {
    render(<p>AIGYM</p>);
    expect(screen.getByText("AIGYM")).toBeInTheDocument();
  });
});

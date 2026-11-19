import { describe, expect, it } from "vitest";
import { validateContactSales } from "./contact-sales";

const good = { name: "Ada", email: "Ada@Example.com", company: "Acme", plan: "fleet", drivers: "12", message: "Hello" };

describe("validateContactSales", () => {
  it("accepts a complete submission and normalises the email", () => {
    const r = validateContactSales(good);
    expect(r.ok && r.data.email).toBe("ada@example.com");
  });

  it("rejects missing fields and unknown plans", () => {
    const r = validateContactSales({ ...good, name: " ", email: "nope", plan: "gold", message: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["email", "message", "name", "plan"]);
  });

  it("strips line breaks from single-line fields so headers cannot be injected", () => {
    const r = validateContactSales({ ...good, name: "Ada\r\nBcc: x@y.z" });
    expect(r.ok && r.data.name).toBe("Ada Bcc: x@y.z");
  });

  it("caps field lengths", () => {
    const r = validateContactSales({ ...good, message: "x".repeat(9000) });
    expect(r.ok && r.data.message.length).toBe(5000);
  });
});

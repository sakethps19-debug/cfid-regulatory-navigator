// Guards the CFID verification presentation correction: display text must
// come from cfidVerificationBasis, never from cfidVerified alone — an order
// can be genuinely CFID-verified without a tag in its own order number
// (e.g. via the official order's own contents, a verified CFID parent
// matter, or confirmation by an authorised CFID officer), and that must
// never be described as "containing a CFID tag" when it doesn't.
import { describe, expect, it } from "vitest";
import { cfidVerificationDisplayText, CFID_VERIFICATION_DISPLAY_TEXT } from "@/lib/cfidVerification";
import type { CfidVerificationBasis } from "@/types/domain";
import ordersFixture from "@/data/generated/orders.json";

describe("cfidVerificationDisplayText", () => {
  it("displays a non-tagged order confirmed by an authorised CFID officer as verified", () => {
    const text = cfidVerificationDisplayText("confirmed_by_authorised_cfid_officer");
    expect(text.toLowerCase()).toContain("verified");
  });

  it("never describes a confirmed_by_authorised_cfid_officer order as containing a CFID tag", () => {
    const text = cfidVerificationDisplayText("confirmed_by_authorised_cfid_officer");
    expect(text.toLowerCase()).not.toContain("tag");
    expect(text.toLowerCase()).not.toContain("order number");
  });

  it("never describes a cfid_origin_established_from_official_order or related_to_verified_cfid_parent_matter order as tagged", () => {
    expect(cfidVerificationDisplayText("cfid_origin_established_from_official_order").toLowerCase()).not.toContain("tag");
    expect(cfidVerificationDisplayText("related_to_verified_cfid_parent_matter").toLowerCase()).not.toContain("tag");
  });

  it("displays needs_manual_verification and not_cfid distinctly from each other and from the verified bases", () => {
    const needsManual = cfidVerificationDisplayText("needs_manual_verification");
    const notCfid = cfidVerificationDisplayText("not_cfid");
    const verified = cfidVerificationDisplayText("cfid_tag_in_order_number");

    expect(needsManual).not.toBe(notCfid);
    expect(needsManual.toLowerCase()).not.toContain("verified —");
    expect(notCfid.toLowerCase()).not.toContain("verified —");
    expect(needsManual).not.toBe(verified);
    expect(notCfid).not.toBe(verified);
  });

  it("only ever describes a tag-in-order-number basis as containing a CFID tag", () => {
    const bases: CfidVerificationBasis[] = [
      "cfid_tag_in_order_number",
      "cfid_origin_established_from_official_order",
      "related_to_verified_cfid_parent_matter",
      "confirmed_by_authorised_cfid_officer",
      "needs_manual_verification",
      "not_cfid",
    ];
    for (const basis of bases) {
      const mentionsTagOrNumber = CFID_VERIFICATION_DISPLAY_TEXT[basis].toLowerCase().includes("order number");
      expect(mentionsTagOrNumber).toBe(basis === "cfid_tag_in_order_number");
    }
  });

  it("covers every CfidVerificationBasis value with a distinct display string", () => {
    const bases: CfidVerificationBasis[] = [
      "cfid_tag_in_order_number",
      "cfid_origin_established_from_official_order",
      "related_to_verified_cfid_parent_matter",
      "confirmed_by_authorised_cfid_officer",
      "needs_manual_verification",
      "not_cfid",
    ];
    const texts = bases.map((b) => CFID_VERIFICATION_DISPLAY_TEXT[b]);
    expect(new Set(texts).size).toBe(bases.length);
  });

  it("the pilot's already-tagged orders (part of the 89-order register) retain cfid_tag_in_order_number as their basis", () => {
    const orders = ordersFixture as Array<{ cfidVerified: boolean; cfidVerificationBasis: CfidVerificationBasis }>;
    expect(orders.length).toBeGreaterThan(0);
    for (const order of orders) {
      expect(order.cfidVerified).toBe(true);
      expect(order.cfidVerificationBasis).toBe("cfid_tag_in_order_number");
    }
  });
});

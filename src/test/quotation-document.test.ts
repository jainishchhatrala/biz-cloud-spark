import { describe, expect, it } from "vitest";
import { buildQuotationBody, combineCompanyClosing, escapeHtml, sanitizeTerms, splitCompanyClosing } from "../erp/quotation-document";

describe("Quotation document", () => {
  it("keeps editable bank details separate from saved terms", () => {
    const saved = combineCompanyClosing("<p>50% advance</p>", "Bank: Example & Co\nIFSC: EXAMPLE");
    expect(splitCompanyClosing(saved)).toEqual({ termsHtml: "<p>50% advance</p>", bankDetails: "Bank: Example & Co\nIFSC: EXAMPLE" });
    expect(combineCompanyClosing(saved, "Updated bank").match(/data-section=/g)).toHaveLength(1);
  });
  it("escapes user text and strips executable content", () => {
    expect(escapeHtml('<script>"&')).toBe("&lt;script&gt;&quot;&amp;");
    expect(sanitizeTerms('<p onclick="bad()">Terms <strong>bold</strong></p><script>bad()</script><img src="x">')).toBe("<p>Terms <strong>bold</strong></p>");
  });
  it("groups descriptions with items and preserves closing details and discount", () => {
    const html = buildQuotationBody({ number: "QT-1", client_name: "Buyer", items: [{ name: "Machine", description: "Motor\nSteel", quantity: 2, unit_price: 100 }] }, { company_name: "Maker", terms_html: combineCompanyClosing("<p>Terms</p>", "Bank account") }, { sub: 200, disc: 10, taxable: 190, gst: 34, total: 224 }, String, String);
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelector("tbody")?.querySelectorAll("tr")).toHaveLength(2);
    expect(doc.querySelector(".description-row")?.textContent).toBe("Motor\nSteel");
    expect(doc.querySelector(".bank-details")?.textContent).toContain("Bank account");
    expect(doc.querySelector(".grand-total")?.textContent).toContain("224");
    expect(doc.querySelectorAll(".signature-line")).toHaveLength(2);
  });
});
import { createRoot } from "react-dom/client";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import appStylesUrl from "@/styles.css?url";
import printStylesUrl from "./quotation-print.css?url";
import { buildQuotationBody, escapeHtml, paginateQuotation } from "./quotation-document";

export async function openQuotationPrint(q, company, totals, formatMoney, formatDate) {
  const win = window.open("", "_blank");
  if (!win) throw new Error("Popup blocked — allow popups for PDF");
  win.opener = null;
  const doc = win.document;
  doc.open();
  doc.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${escapeHtml(q.number)} — Quotation</title><link rel="stylesheet" href="${escapeHtml(new URL(appStylesUrl, window.location.origin).href)}"/><link rel="stylesheet" href="${escapeHtml(new URL(printStylesUrl, window.location.origin).href)}"/></head><body class="quotation-document">${buildQuotationBody(q, company || {}, totals, formatMoney, formatDate)}</body></html>`);
  doc.close();
  try {
    await Promise.all(Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).map(link => link.sheet ? Promise.resolve() : new Promise((resolve, reject) => {
      link.onload = resolve; link.onerror = () => reject(new Error("PDF styles could not load. Please try again."));
    })));
    await Promise.all(Array.from(doc.images).map(image => image.complete ? Promise.resolve() : new Promise(resolve => { image.onload = resolve; image.onerror = resolve; })));
    await doc.fonts.ready;
    paginateQuotation(doc, q, company || {});
    const toolbar = doc.getElementById("print-toolbar");
    if (toolbar) createRoot(toolbar).render(<div className="flex items-center justify-between gap-4"><span className="text-sm font-semibold text-foreground">{q.number}</span><Button onClick={() => win.print()}><Printer /> Print / Save PDF</Button></div>);
    win.focus();
    win.print();
  } catch (error) {
    win.close();
    throw error;
  }
}
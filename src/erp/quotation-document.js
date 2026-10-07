export const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

// Bank details use a marked block in the existing company terms field, preserving persistence and permissions.
export function splitCompanyClosing(html = "") {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const bank = doc.querySelector('[data-section="bank-details"]');
  const bankDetails = bank ? Array.from(bank.querySelectorAll("p")).map(p => p.textContent).join("\n") || bank.textContent || "" : "";
  bank?.remove();
  return { termsHtml: doc.body.innerHTML, bankDetails };
}

export function combineCompanyClosing(termsHtml, bankDetails) {
  const cleanTerms = splitCompanyClosing(termsHtml).termsHtml;
  return cleanTerms + (bankDetails.trim() ? `<div data-section="bank-details">${bankDetails.split("\n").map(line => `<p>${escapeHtml(line)}</p>`).join("")}</div>` : "");
}

export function sanitizeTerms(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,iframe,object,embed,svg,img,form,input,button,link,meta").forEach(el => el.remove());
  const allowed = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "UL", "OL", "LI", "H2", "H3", "H4", "DIV", "SPAN"]);
  Array.from(doc.body.querySelectorAll("*")).reverse().forEach(el => {
    if (!allowed.has(el.tagName)) el.replaceWith(...el.childNodes);
    else Array.from(el.attributes).forEach(attr => el.removeAttribute(attr.name));
  });
  return doc.body.innerHTML;
}

export function buildQuotationBody(q, company, totals, formatMoney, formatDate) {
  const e = escapeHtml;
  const closing = splitCompanyClosing(company.terms_html || "");
  const logo = /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(company.logo_data || "") || /^https:\/\//i.test(company.logo_data || "")
    ? `<img class="company-logo" src="${e(company.logo_data)}" alt="${e(company.company_name)} logo" />`
    : `<div class="brand-mark">${e((company.company_name || "C")[0])}</div>`;
  const companyDetails = [company.tagline, company.address, [company.phone, company.email].filter(Boolean).join(" · "), [company.gstin ? `GSTIN: ${company.gstin}` : "", company.website].filter(Boolean).join(" · ")].filter(Boolean).map(value => `<div>${e(value).replaceAll("\n", "<br/>")}</div>`).join("");
  return `<div id="print-toolbar" class="print-toolbar"></div><main id="quotation-pages">
    <section class="sheet" data-page-kind="items"><div class="sheet-content">
      <header class="letterhead">${logo}<div><h2 class="company-name">${e(company.company_name || "Company")}</h2><div class="company-details">${companyDetails}</div></div></header>
      <div class="document-title"><h1>QUOTATION</h1><strong>${e(q.number)}</strong></div>
      <div class="meta"><div><div class="meta-label">Prepared for</div><strong>${e(q.client_name)}</strong>${q.template_name ? `<div class="company-details">${e(q.template_name)}</div>` : ""}</div>
      <div><div class="meta-row"><span>Quotation date</span><strong>${e(formatDate(q.order_date))}</strong></div><div class="meta-row"><span>Valid until</span><strong>${e(formatDate(q.valid_until))}</strong></div></div></div>
      <table class="items-table"><thead><tr><th>No.</th><th>Item / specification</th><th class="numeric">Qty</th><th class="numeric">Rate (INR)</th><th class="numeric">Amount (INR)</th></tr></thead>
      ${(q.items || []).map((it, i) => `<tbody class="item-group" data-item="${i}"><tr><td>${i + 1}</td><td class="item-name">${e(it.name)}</td><td class="numeric">${e(it.quantity)}</td><td class="numeric">${e(formatMoney(it.unit_price))}</td><td class="numeric item-name">${e(formatMoney(Number(it.quantity || 0) * Number(it.unit_price || 0)))}</td></tr><tr class="description-row"><td></td><td colspan="4">${e(it.description || "—")}</td></tr></tbody>`).join("")}</table>
      <div class="totals"><div class="total-line"><span>Subtotal</span><strong>${e(formatMoney(totals.sub))}</strong></div>${totals.disc > 0 ? `<div class="total-line"><span>Discount</span><strong>− ${e(formatMoney(totals.disc))}</strong></div><div class="total-line"><span>Taxable amount</span><strong>${e(formatMoney(totals.taxable))}</strong></div>` : ""}<div class="total-line"><span>GST</span><strong>${e(formatMoney(totals.gst))}</strong></div><div class="total-line grand-total"><span>Grand total</span><strong>${e(formatMoney(totals.total))}</strong></div></div>
      ${q.notes ? `<div class="quote-notes"><strong>Quotation notes</strong><div>${e(q.notes)}</div></div>` : ""}
    </div></section>
    <section class="sheet" data-page-kind="closing"><div class="sheet-content closing-content"><div class="continuation-head"><strong>${e(company.company_name || "Company")}</strong><span>${e(q.number)} · ${e(q.client_name)}</span></div><h2>Terms &amp; Conditions</h2><div class="terms-source">${sanitizeTerms(closing.termsHtml) || "<p>No terms specified.</p>"}</div><div class="closing-bottom"><section class="bank-details"><h2>Bank details</h2><p>${e(closing.bankDetails || "Not provided")}</p></section><div class="signature-grid"><div><div class="signature-name">For ${e(company.company_name || "Company")}</div><div class="signature-line">Authorised Signatory</div></div><div><div class="signature-name">For ${e(q.client_name || "Client")}</div><div class="signature-line">Client Acceptance</div></div></div></div></div></section>
    </main>`;
}

// Measure against actual A4 content height, not an arbitrary number of rows per page.
export function paginateQuotation(doc, q, company) {
  const pages = doc.getElementById("quotation-pages");
  if (!pages) return;
  const footer = () => {
    const el = doc.createElement("footer"); el.className = "sheet-footer";
    el.innerHTML = `<span>${escapeHtml(q.number)} · ${escapeHtml(company.company_name)}</span><span class="page-number"></span>`;
    return el;
  };
  pages.querySelectorAll(".sheet").forEach(sheet => sheet.append(footer()));
  const newSheet = (kind) => {
    const sheet = doc.createElement("section"); sheet.className = "sheet"; sheet.dataset.pageKind = kind;
    sheet.innerHTML = `<div class="sheet-content${kind === "closing" ? " closing-content" : ""}"><div class="continuation-head"><strong>${escapeHtml(company.company_name)}</strong><span>${escapeHtml(q.number)} · ${kind === "items" ? "Items continued" : "Terms continued"}</span></div></div>`;
    sheet.append(footer()); return sheet;
  };
  const fits = (content) => content.scrollHeight <= content.clientHeight + 1;
  let sheet = pages.querySelector('[data-page-kind="items"]');
  if (!sheet) return;
  let content = sheet.querySelector(".sheet-content");
  let table = content.querySelector("table");
  const groups = Array.from(table.querySelectorAll("tbody"));
  const totals = content.querySelector(".totals");
  const notes = content.querySelector(".quote-notes");
  groups.forEach(group => group.remove()); totals?.remove(); notes?.remove();
  const nextItemsPage = () => {
    const next = newSheet("items"); sheet.after(next); sheet = next;
    content = sheet.querySelector(".sheet-content");
    const nextTable = table.cloneNode(false); nextTable.append(table.querySelector("thead").cloneNode(true));
    content.append(nextTable); table = nextTable;
  };
  for (const group of groups) {
    table.append(group);
    if (!fits(content)) {
      group.remove();
      if (!table.querySelector("tbody")) table.remove();
      nextItemsPage(); table.append(group);
    }
    // An exceptionally long specification cannot fit on one sheet. Split only that description,
    // keeping ordinary item/description pairs together and explicitly identifying continuations.
    if (!fits(content)) {
      const cell = group.querySelector(".description-row td[colspan]");
      const remaining = cell?.textContent || "";
      if (cell && remaining) {
        let rest = remaining;
        while (rest) {
          cell.textContent = rest;
          if (fits(content)) break;
          let low = 0, high = rest.length;
          while (low < high) { const mid = Math.ceil((low + high) / 2); cell.textContent = rest.slice(0, mid); if (fits(content)) low = mid; else high = mid - 1; }
          if (!low) throw new Error("Item name or company details exceed a printable page. Shorten the text and try again.");
          let cut = low; const space = rest.lastIndexOf(" ", low); if (space > low / 2) cut = space;
          cell.textContent = rest.slice(0, cut); rest = rest.slice(cut).trimStart();
          if (rest) {
            nextItemsPage();
            const continuation = doc.createElement("tbody"); continuation.className = "item-group";
            continuation.innerHTML = `<tr><td></td><td colspan="4" class="item-name">${escapeHtml(group.querySelector(".item-name")?.textContent)} — specification continued</td></tr><tr class="description-row"><td></td><td colspan="4"></td></tr>`;
            table.append(continuation);
            // Continue into this new cell without duplicating quantities or amounts.
            const newCell = continuation.querySelector(".description-row td[colspan]");
            let pending = rest;
            newCell.textContent = pending;
            while (!fits(content)) {
              let a = 0, b = pending.length;
              while (a < b) { const mid = Math.ceil((a + b) / 2); newCell.textContent = pending.slice(0, mid); if (fits(content)) a = mid; else b = mid - 1; }
              if (!a) throw new Error("Specification is too large to print.");
              newCell.textContent = pending.slice(0, a); rest = pending.slice(a); break;
            }
            if (fits(content) && newCell.textContent === pending) rest = "";
            else { nextItemsPage(); table.append(group.cloneNode(true)); group.remove(); break; }
          }
        }
      }
    }
  }
  if (totals) { content.append(totals); if (!fits(content)) { totals.remove(); nextItemsPage(); table.remove(); content.append(totals); } }
  if (notes) { content.append(notes); if (!fits(content)) { notes.remove(); nextItemsPage(); table.remove(); content.append(notes); } }
  let closingSheet = pages.querySelector('[data-page-kind="closing"]');
  let closingContent = closingSheet.querySelector(".sheet-content");
  const source = closingContent.querySelector(".terms-source");
  const blocks = Array.from(source.children); source.remove();
  const bottom = closingContent.querySelector(".closing-bottom"); bottom.remove();
  const nextClosing = () => { const next = newSheet("closing"); closingSheet.after(next); closingSheet = next; closingContent = next.querySelector(".sheet-content"); };
  for (const block of blocks) {
    block.classList.add("terms-block"); closingContent.append(block);
    if (!fits(closingContent)) { block.remove(); nextClosing(); closingContent.append(block); }
    if (!fits(closingContent)) {
      const text = block.textContent || ""; block.remove();
      let remaining = text;
      while (remaining) {
        const p = doc.createElement("p"); p.className = "terms-block"; closingContent.append(p);
        let low = 0, high = remaining.length;
        while (low < high) { const mid = Math.ceil((low + high) / 2); p.textContent = remaining.slice(0, mid); if (fits(closingContent)) low = mid; else high = mid - 1; }
        if (!low) throw new Error("Company details exceed the printable area.");
        p.textContent = remaining.slice(0, low); remaining = remaining.slice(low);
        if (remaining) nextClosing();
      }
    }
  }
  closingContent.append(bottom);
  if (!fits(closingContent)) { bottom.remove(); nextClosing(); closingContent.append(bottom); }
  if (!fits(closingContent)) throw new Error("Bank details are too long for the closing section. Shorten them and try again.");
  const sheets = Array.from(pages.querySelectorAll(".sheet"));
  sheets.forEach((page, i) => { page.querySelector(".page-number").textContent = `Page ${i + 1} of ${sheets.length}`; });
}
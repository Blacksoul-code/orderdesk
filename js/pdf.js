const NAVY = [20, 40, 110];

const hexRgb = (h) => {
  h = (h || "#2563eb").replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16));
};
const money = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Amount ko words me (Indian system: Lakh, Crore)
function amountInWords(num) {
  num = Math.round(Number(num || 0) * 100) / 100;
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven",
    "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (n) => (n < 20 ? a[n] : b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : ""));
  const three = (n) =>
    (n >= 100 ? a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " : "") : "") + (n % 100 ? two(n % 100) : "");
  function conv(n) {
    if (n === 0) return "Zero";
    let s = "";
    const cr = Math.floor(n / 10000000); n %= 10000000;
    const lk = Math.floor(n / 100000); n %= 100000;
    const th = Math.floor(n / 1000); n %= 1000;
    if (cr) s += conv(cr) + " Crore ";
    if (lk) s += two(lk) + " Lakh ";
    if (th) s += two(th) + " Thousand ";
    if (n) s += three(n);
    return s.trim();
  }
  let w = "Rupees " + conv(rupees);
  if (paise) w += " and " + two(paise) + " Paise";
  return w + " Only";
}

// Supabase se image laao -> dataURL + size
async function fetchImage(kind) {
  if (!settingsData["img_" + kind]) return null;
  const { url } = await storageApi.url(kind);
  if (!url) return null;
  try {
    const blob = await (await fetch(url)).blob();
    const data = await new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(blob);
    });
    const dim = await new Promise((res) => {
      const i = new Image();
      i.onload = () => res({ w: i.width, h: i.height });
      i.onerror = () => res({ w: 1, h: 1 });
      i.src = data;
    });
    return { data, ...dim };
  } catch (e) {
    return null;
  }
}

// Storage path se drawing laao -> dataURL + size
async function fetchByPath(path) {
  const url = await storageApi.urlOf(path);
  if (!url) return null;
  try {
    const blob = await (await fetch(url)).blob();
    const data = await new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(blob);
    });
    const dim = await new Promise((res) => {
      const i = new Image();
      i.onload = () => res({ w: i.width, h: i.height });
      i.onerror = () => res({ w: 1, h: 1 });
      i.src = data;
    });
    return { data, ...dim };
  } catch (e) {
    return null;
  }
}

// Image ko box me fit karke lagao (aspect ratio same rahega)
function fitImg(doc, img, x, y, maxW, maxH, align = "left") {
  if (!img) return 0;
  const sc = Math.min(maxW / img.w, maxH / img.h);
  const w = img.w * sc, h = img.h * sc;
  const px = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  doc.addImage(img.data, "PNG", px, y, w, h);
  return h;
}

function headerHeight(s, hasLogo) {
  const l = s.headerLayout || "left";
  if (l === "center") return hasLogo ? 54 : 32;
  if (l === "text") return 32;
  return 34;
}

// Header (har page par)
function drawHeader(doc, s, logo, pw) {
  const acc = hexRgb(s.accentColor);
  const l = s.headerLayout || "left";
  const hasLogo = l !== "text" && !!logo;
  const H = headerHeight(s, hasLogo);
  const lines = [
    s.tagline,
    s.address,
    [s.phone && "Ph: " + s.phone, s.bizEmail, s.website].filter(Boolean).join("  |  "),
    [s.gstin && "GSTIN: " + s.gstin].filter(Boolean).join("   "),
  ].filter(Boolean);

  const block = (x, y, align) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...acc);
    doc.text(s.businessName || "Your Business Name", x, y, { align });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(70);
    lines.forEach((t, i) => doc.text(t, x, y + 5 + i * 4, { align }));
  };

  if (l === "center") {
    if (hasLogo) fitImg(doc, logo, pw / 2, 5, 60, 18, "center");
    block(pw / 2, hasLogo ? 31 : 11, "center");
  } else if (l === "text") {
    block(pw / 2, 11, "center");
  } else {
    if (hasLogo) { fitImg(doc, logo, 14, 7, 45, H - 16); block(pw - 14, 11, "right"); }
    else block(14, 11, "left");
  }
  doc.setDrawColor(...acc);
  doc.setLineWidth(0.8);
  doc.line(14, H - 2, pw - 14, H - 2);
}

// Footer (har page par)
function drawFooter(doc, s, pageNo, total, pw, ph) {
  doc.setDrawColor(190);
  doc.setLineWidth(0.3);
  doc.line(14, ph - 17, pw - 14, ph - 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90);
  if (s.footerText) doc.text(s.footerText, pw / 2, ph - 12.5, { align: "center" });
  if (s.thankYou) {
    doc.setFont("helvetica", "bold");
    doc.text(s.thankYou, pw / 2, ph - 8, { align: "center" });
    doc.setFont("helvetica", "normal");
  }
  if (s.computerGenerated) doc.text("Computer generated document", 14, ph - 8);
  if (s.showPageNo !== false) doc.text(`Page ${pageNo} of ${total}`, pw - 14, ph - 8, { align: "right" });
}

// Work Order ke rollers ko machine ki latest details se badlo (live)
async function liveRollers(row) {
  if (row.doc_type !== "work_order") return row;
  const items = (row.data && row.data.items) || [];
  if (!items.length) return row;

  const { data: all, error } = await sb.from("rollers").select("*, machines(name)");
  if (error || !all) return row;

  const norm = (s) => (s || "").toString().trim().toLowerCase();
  const machines = norm(row.data.wo && row.data.wo.machine)
    .split("/").map((x) => x.trim()).filter(Boolean);
  const used = new Set();

  // Pehle: jin items me rollerId hai, unhe lock karo
  items.forEach((it) => {
    if (it.rollerId && all.some((x) => x.id === it.rollerId)) used.add(it.rollerId);
  });

  const fresh = items.map((it) => {
    if (it.section) return it;
    let r = it.rollerId && all.find((x) => x.id === it.rollerId);

    // rollerId nahi hai: naam se, par sirf pakka match hone par
    if (!r && it.name) {
      let cand = all.filter((x) => norm(x.roller_type) === norm(it.name) && !used.has(x.id));
      const inMachine = cand.filter((x) => machines.includes(norm(x.machines && x.machines.name)));
      if (inMachine.length) cand = inMachine;
      if (cand.length === 1) r = cand[0];
      else if (cand.length > 1) {
        // Saved size se milta hua roller dhundo
        const same = cand.filter((x) => norm(rollerSize(x)) === norm(it.desc));
        if (same.length === 1) r = same[0];
      }
      if (r) used.add(r.id);
    }
    return r
      ? { ...it, rollerId: r.id, name: r.roller_type || it.name, desc: rollerSize(r), color: r.color || "" }
      : it;
  });
  return { ...row, data: { ...row.data, items: fresh } };
}

// ================== MAIN: PDF banao ==================
  async function buildPdf(row) {
  row = await liveRollers(row);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const s = settingsData || {};
  const d = row.data || {};
  const p = d.party || {};
  const type = row.doc_type;
  const acc = hexRgb(s.accentColor);
  const pw = 210, ph = 297;

  const [logo, sign, stamp] = await Promise.all([fetchImage("logo"), fetchImage("signature"), fetchImage("stamp")]);
  const hasLogo = s.headerLayout !== "text" && !!logo;
  const H = headerHeight(s, hasLogo);
  const top = H + 6;
  const limit = ph - 22;
  const margin = { top, bottom: 22, left: 14, right: 14 };
  let y = top;

  // Jagah kam ho to nayi page
  const ensure = (need) => {
    if (y + need > limit) { doc.addPage(); y = top; }
  };
  // Title + text block (wrap ke saath)
  const textBlock = (title, text) => {
    if (!text) return;
    const lines = doc.splitTextToSize(text, 182);
    ensure(6 + lines.length * 4.2);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(30);
    doc.text(title, 14, y);
    y += 4.5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    doc.text(lines, 14, y);
    y += lines.length * 4 + 3;
  };

  if (type === "work_order") {
    // ---------- WORK ORDER ----------
    doc.setFillColor(0, 100, 0);
    doc.rect(14, y, 182, 10, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(255);
    doc.text("WORK ORDER", pw / 2, y + 7, { align: "center" });
    y += 10;

    // Date (left) + bada badge (right)
    doc.setDrawColor(0); doc.setLineWidth(0.3);
    doc.rect(14, y, 182, 26);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...NAVY);
    doc.text("DATE : " + fmtDate(row.doc_date), 17, y + 9);
        const machName = (d.wo && d.wo.machine) || "";
    if (machName) {
      doc.setFontSize(11);
      const ml = doc.splitTextToSize(machName, 115);   // badge ke liye jagah chhodi
      doc.text(ml, 17, y + 16);
    }
    doc.setFontSize(32);
    doc.setTextColor(150);
    doc.text(row.doc_no || "", pw - 17 + 0.7, y + 16.7, { align: "right" }); // shadow
    doc.setTextColor(0);
    doc.text(row.doc_no || "", pw - 17, y + 16, { align: "right" });
    y += 26;

    
    // Items table
    let totalQty = 0, unit = "";
    const body = [];
    (d.items || []).forEach((it) => {
      if (it.section) {
        body.push([{ content: it.section, colSpan: 5,
          styles: { fontStyle: "bold", halign: "center", textColor: NAVY, fillColor: [238, 242, 255] } }]);
      } else {
        totalQty += Number(it.qty) || 0;
        if (!unit) unit = it.unit || "";
        body.push([it.name, it.desc || "", it.color || "", it.qty, it.unit || ""]);
      }
    });
    doc.autoTable({
      startY: y, margin, theme: "grid",
      head: [["ITEM / MARKS", "SIZE / FL X SD X FD X TL", "COLOR", "QTY", "UNIT"]],
      body,
      foot: [[{ content: "TOTAL NO OF ROLLERS", colSpan: 3, styles: { halign: "right" } }, totalQty, unit]],
      showFoot: "lastPage",
      styles: { fontSize: 9, textColor: NAVY, halign: "center", lineColor: 0, lineWidth: 0.3, cellPadding: 1.8 },
      headStyles: { fillColor: 255, textColor: NAVY, fontStyle: "bold" },
      footStyles: { fillColor: 255, textColor: NAVY, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 62 }, 2: { cellWidth: 25 }, 3: { cellWidth: 20 }, 4: { cellWidth: 20 } },
    });
    y = doc.lastAutoTable.finalY;

    const w = d.wo || {};
    if (w.drawingAttached) {
      ensure(10);
      doc.setDrawColor(0); doc.setLineWidth(0.3);
      doc.rect(14, y, 182, 9);
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...NAVY);
      doc.text("APPROVED DRAWING ATTACHED WITH WORK ORDER", 17, y + 6.3);
      y += 9;
    }

    // Prepared By / Approved By + signature + stamp
    ensure(40);
    doc.setDrawColor(0); doc.setLineWidth(0.3);
    doc.rect(14, y, 182, 38);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...NAVY);
    doc.text("PREPARED BY:-", 17, y + 6);
    doc.text("APPROVED BY:-", 150, y + 6, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text(w.preparedBy || "", 17, y + 11.5);
    doc.text(w.approvedBy || "", 150, y + 11.5, { align: "center" });
    fitImg(doc, sign, 133, y + 14, 32, 16);
    fitImg(doc, stamp, 150, y + 13, 25, 25);
    y += 38;

    // Important notes (laal rang)
    const notes = (w.important || "").split("\n").map((x) => x.trim()).filter(Boolean);
    if (notes.length) {
      y += 3;
      ensure(10);
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...NAVY);
      doc.text("IMPORTANT NOTES:-", 14, y);
      const tw = doc.getTextWidth("IMPORTANT NOTES:-");
      doc.setDrawColor(...NAVY); doc.setLineWidth(0.3);
      doc.line(14, y + 0.8, 14 + tw, y + 0.8);
      y += 4.5;
      doc.setFontSize(8); doc.setTextColor(220, 0, 0);
      notes.forEach((n, i) => {
        const t = /^\d+[.)]/.test(n) ? n : (i + 1) + ". " + n;
        const ls = doc.splitTextToSize(t, 182);
        ensure(ls.length * 3.8 + 1);
        doc.text(ls, 14, y);
        y += ls.length * 3.8 + 1;
      });
    }
  } else {
    // ---------- ORDER / PURCHASE ORDER / CHALLAN ----------
    const challan = type === "challan";
    const po = type === "purchase_order";

    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(...acc);
    doc.text(TYPE_NAME[type].toUpperCase(), pw / 2, y + 4, { align: "center" });
    y += 9;

    // Party box (left) + document details (right)
    const who = po ? "Supplier" : challan ? "Receiver" : "Customer";
    const left = [`${who}: ${p.name || ""}`];
    if (p.mobile) left.push("Mobile: " + p.mobile);
    if (p.address) left.push("Address: " + p.address);
    if (p.gstin) left.push("GSTIN: " + p.gstin);
    const right = [
      `${challan ? "Challan" : po ? "PO" : "Order"} No: ${row.doc_no}`,
      "Date: " + fmtDate(row.doc_date),
    ];
    if (!challan && d.delivery) right.push((po ? "Expected Delivery: " : "Delivery Date: ") + fmtDate(d.delivery));
    if (po && d.payTerms) right.push("Payment Terms: " + d.payTerms);
    if (po && d.shipTo) right.push("Ship To: " + d.shipTo);
    if (challan && d.vehicle) right.push("Vehicle No: " + d.vehicle);
    if (challan && d.driver) right.push("Driver: " + d.driver + (d.driverPhone ? " (" + d.driverPhone + ")" : ""));
    if (challan && d.ref) right.push("Ref No: " + d.ref);

    doc.autoTable({
      startY: y, margin, theme: "grid",
      body: [[left.join("\n"), right.join("\n")]],
      styles: { fontSize: 9, cellPadding: 3, textColor: 30, lineColor: 200 },
      columnStyles: { 0: { cellWidth: 95 }, 1: { cellWidth: 87 } },
    });
    y = doc.lastAutoTable.finalY + 4;

    // Items table
    const head = challan ? [["#", "Item", "Qty", "Unit", "Remarks"]] : [["#", "Item", "HSN", "Qty", "Unit", "Rate", "Amount"]];
    const cols = head[0].length;
    let n = 0, qtySum = 0;
    const body = [];
    (d.items || []).forEach((it) => {
      if (it.section) {
        body.push([{ content: it.section, colSpan: cols, styles: { fontStyle: "bold", fillColor: [238, 242, 255] } }]);
        return;
      }
      n++;
      qtySum += Number(it.qty) || 0;
      body.push(challan
        ? [n, it.name, it.qty, it.unit || "", it.remarks || ""]
        : [n, it.name, it.hsn || "", it.qty, it.unit || "", money(it.rate), money(it.amount)]);
    });
    doc.autoTable({
      startY: y, margin, head, body, theme: "grid",
      styles: { fontSize: 9, cellPadding: 2, textColor: 30, lineColor: 200 },
      headStyles: { fillColor: acc, textColor: 255 },
      columnStyles: challan
        ? { 0: { cellWidth: 12 }, 2: { halign: "right" } }
        : { 0: { cellWidth: 12 }, 3: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } },
    });
    y = doc.lastAutoTable.finalY + 4;

    if (challan) {
      ensure(8);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(30);
      doc.text("Total Quantity: " + qtySum, pw - 14, y + 2, { align: "right" });
      y += 8;
    } else {
      // Totals
      const rows = [["Subtotal", "Rs. " + money(d.subtotal)]];
      if (type === "order" && d.discount) rows.push(["Discount", "- Rs. " + money(d.discount)]);
      if (d.gst) rows.push([`GST (${d.gst}%)`, "Rs. " + money(d.gstAmt)]);
      if (po && d.freight) rows.push(["Freight / Other", "Rs. " + money(d.freight)]);
      rows.push(["TOTAL", "Rs. " + money(d.total)]);
      if (type === "order") {
        if (d.advance) rows.push(["Advance Paid", "Rs. " + money(d.advance)]);
        rows.push(["BALANCE DUE", "Rs. " + money(d.balance)]);
      }
      ensure(rows.length * 7 + 14);
      doc.autoTable({
        startY: y, theme: "plain", tableWidth: 80,
        margin: { top, bottom: 22, left: pw - 14 - 80, right: 14 },
        body: rows,
        styles: { fontSize: 9.5, cellPadding: 1.8, textColor: 30 },
        columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right" } },
        didParseCell: (h) => {
          const k = h.row.raw[0];
          if (k === "TOTAL" || k === "BALANCE DUE") { h.cell.styles.fillColor = [238, 242, 255]; }
        },
      });
      y = doc.lastAutoTable.finalY + 5;
      const words = doc.splitTextToSize("Amount in words: " + amountInWords(d.total), 182);
      ensure(words.length * 4.5 + 4);
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(30);
      doc.text(words, 14, y);
      y += words.length * 4.5 + 3;
    }

    textBlock("Notes:", d.notes);
    textBlock("Terms & Conditions:", challan ? s.termsChallan : po ? s.termsPO : s.termsOrder);
    if (!challan) {
      const bank = [
        s.bankName && "Bank: " + s.bankName,
        s.accHolder && "A/C Holder: " + s.accHolder,
        s.accNo && "A/C No: " + s.accNo,
        s.ifsc && "IFSC: " + s.ifsc,
        s.upi && "UPI: " + s.upi,
      ].filter(Boolean);
      if (bank.length) textBlock("Bank Details:", bank.join("   |   "));
    }

    // Signature / stamp
    ensure(42);
    y += 2;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(30);
    doc.text("For " + (s.businessName || ""), pw - 14, y, { align: "right" });
    fitImg(doc, stamp, pw - 14 - 58, y + 2, 28, 28);
    fitImg(doc, sign, pw - 14, y + 7, 32, 18, "right");
    doc.setFont("helvetica", "bold");
    doc.text(s.signLabel || "Authorized Signatory", pw - 14, y + 33, { align: "right" });
    if (challan) {
      doc.setDrawColor(120); doc.setLineWidth(0.3);
      doc.line(14, y + 28, 80, y + 28);
      doc.text("Received by (Signature)", 14, y + 33);
    }
  }
   // Work Order drawings: har drawing alag page par, bina header/footer
  const drawingPages = [];
  const mainPages = doc.getNumberOfPages();   // header/footer sirf in pages par lagenge
  if (type === "work_order" && d.wo && d.wo.drawings && d.wo.drawings.length) {
    for (let i = 0; i < d.wo.drawings.length; i++) {
      const img = await fetchByPath(d.wo.drawings[i]);
      if (!img) continue;
      doc.addPage();
      const m = 8;                                   // chhota margin
      const sc = Math.min((pw - 2 * m) / img.w, (ph - 2 * m) / img.h);
      const w = img.w * sc, h = img.h * sc;
      doc.addImage(img.data, "JPEG", (pw - w) / 2, (ph - h) / 2, w, h);
      drawingPages.push(doc.getNumberOfPages());
    }
  }

    const total = mainPages;
  for (let i = 1; i <= mainPages; i++) {
    doc.setPage(i);
    drawHeader(doc, s, logo, pw);
    drawFooter(doc, s, i, total, pw, ph);
  }
  return doc;
}

const pdfName = (row) => (row.doc_no || "document").replace(/[^\w-]/g, "") + ".pdf";

// PDF download
async function downloadPdf(row) {
  try {
    toast("Generating PDF...");
    const doc = await buildPdf(row);
    doc.save(pdfName(row));
  } catch (err) {
    console.error(err);
    toast("PDF error: " + err.message, true);
  }
}

// PDF nayi tab me kholo (wahan se print kar sakte ho)
async function openPdf(row) {
  const w = window.open("", "_blank");   // pehle kholo, warna popup block hota hai
  try {
    const doc = await buildPdf(row);
    const url = doc.output("bloburl");
    if (w) w.location = url; else window.open(url, "_blank");
  } catch (err) {
    if (w) w.close();
    console.error(err);
    toast("PDF error: " + err.message, true);
  }
}
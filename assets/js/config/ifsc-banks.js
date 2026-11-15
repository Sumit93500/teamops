// config/ifsc-banks.js (F2, 2026-11-15): the bank behind an IFSC's first four letters, for the main banks in India. Bundled with the app:
// nothing is looked up online (branch lookup arrives with the backend). An unknown code leaves the bank name for the person to type.
//   IFSC_BANKS  { code: name }      bankFromIfsc(ifsc)  the name, or null when the code isn't in the table
export const IFSC_BANKS = Object.freeze({
  SBIN: "State Bank of India", HDFC: "HDFC Bank", ICIC: "ICICI Bank", UTIB: "Axis Bank", KKBK: "Kotak Mahindra Bank",
  PUNB: "Punjab National Bank", BARB: "Bank of Baroda", CNRB: "Canara Bank", UBIN: "Union Bank of India", BKID: "Bank of India",
  IOBA: "Indian Overseas Bank", IDIB: "Indian Bank", MAHB: "Bank of Maharashtra", CBIN: "Central Bank of India", UCBA: "UCO Bank",
  PSIB: "Punjab & Sind Bank", YESB: "Yes Bank", INDB: "IndusInd Bank", IDFB: "IDFC First Bank", FDRL: "Federal Bank",
  KARB: "Karnataka Bank", KVBL: "Karur Vysya Bank", SIBL: "South Indian Bank", CIUB: "City Union Bank", TMBL: "Tamilnad Mercantile Bank",
  DCBL: "DCB Bank", RATN: "RBL Bank", BDBL: "Bandhan Bank", AUBL: "AU Small Finance Bank", ESFB: "Equitas Small Finance Bank",
  UJVN: "Ujjivan Small Finance Bank", JSFB: "Jana Small Finance Bank", SURY: "Suryoday Small Finance Bank", ESMF: "ESAF Small Finance Bank",
  IBKL: "IDBI Bank", JAKA: "Jammu & Kashmir Bank", DLXB: "Dhanlaxmi Bank", CSBK: "CSB Bank", NTBL: "Nainital Bank",
  SCBL: "Standard Chartered Bank", CITI: "Citibank", HSBC: "HSBC", DBSS: "DBS Bank India", DEUT: "Deutsche Bank",
  AIRP: "Airtel Payments Bank", PYTM: "Paytm Payments Bank", IPOS: "India Post Payments Bank", FINO: "Fino Payments Bank",
  SRCB: "Saraswat Co-operative Bank", COSB: "Cosmos Co-operative Bank", SVCB: "SVC Co-operative Bank",
});

export function bankFromIfsc(ifsc) {
  const code = String(ifsc ?? "").trim().toUpperCase().slice(0, 4);
  return /^[A-Z]{4}$/.test(code) ? IFSC_BANKS[code] ?? null : null;
}
// The company's details, in one place (Design foundation, ruled 2026-11-12): the Settings page's Company card shows them, and
// the shell's brand, the tab title, the About page and the payslip read them. OfficeOS doesn't store company settings yet, so
// these are the Settings page's sample values; a data round that adds stored settings replaces this module's source.
//   logo: an image URL, or null (the shell then shows the name's initial in a round badge)
export const COMPANY = {
  name: "Northwind Technologies Pvt. Ltd.",
  shortName: "Northwind Technologies",
  address: "Sector 44, Gurugram, Haryana 122003",
  timeZone: "India Standard Time (UTC+5:30)",
  currency: "Indian rupee (₹)",
  financialYearStarts: "April",
  employeeIdPrefix: "EMP-",
  logo: null,
};

export const PRODUCT = "OfficeOS";

// "Northwind Technologies Pvt. Ltd." -> "N"
export const companyInitial = (name = COMPANY.name) => (name.trim()[0] ?? "?").toUpperCase();

// The tab title: "<page> | <company>"; an old page title ends in " | OfficeOS", which the company name replaces.
export function tabTitle(docTitle) {
  const page = (docTitle ?? "").replace(/\s*\|\s*OfficeOS\s*$/, "").trim();
  return page && page !== PRODUCT ? `${page} | ${COMPANY.name}` : COMPANY.name;
}
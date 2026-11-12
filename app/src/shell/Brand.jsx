// The company's mark (its logo image if Settings has one, else the name's initial in a round badge) and the "Powered by
// OfficeOS" line that ends every page (D2a branding). The company comes from data/company.js, the Settings page's source.
import { COMPANY, PRODUCT, companyInitial } from "../data/company.js";

export function CompanyMark({ className = "brand-mark" }) {
  if (COMPANY.logo) return <img className={`${className} ${className}--img`} src={COMPANY.logo} alt="" />;
  return <span className={className} aria-hidden="true">{companyInitial()}</span>;
}

// L1: the sign-in and error pages' footer names the company too: "© <year> <company> · Powered by OfficeOS" (the company
// from the profile store, through COMPANY.name); inside the app it stays "Powered by OfficeOS".
export function PoweredBy({ className = "", withCompany = false }) {
  // (the in-app footer keeps its markup exactly, two text nodes, so its pixels don't move)
  return (
    <footer className={`app-footer${className ? ` ${className}` : ""}`}>
      {withCompany ? <span>{`© ${new Date().getFullYear()} ${COMPANY.name} · Powered by ${PRODUCT}`}</span> : <span>Powered by {PRODUCT}</span>}
    </footer>
  );
}
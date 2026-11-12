// The company's mark (its logo image if Settings has one, else the name's initial in a round badge) and the "Powered by
// OfficeOS" line that ends every page (D2a branding). The company comes from data/company.js, the Settings page's source.
import { COMPANY, PRODUCT, companyInitial } from "../data/company.js";

export function CompanyMark({ className = "brand-mark" }) {
  if (COMPANY.logo) return <img className={`${className} ${className}--img`} src={COMPANY.logo} alt="" />;
  return <span className={className} aria-hidden="true">{companyInitial()}</span>;
}

export function PoweredBy({ className = "" }) {
  return <footer className={`app-footer${className ? ` ${className}` : ""}`}><span>Powered by {PRODUCT}</span></footer>;
}
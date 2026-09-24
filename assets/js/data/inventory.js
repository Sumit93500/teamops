// data/inventory.js
// Items in stock, assets assigned to people, and vendors.

export const ITEMS = [
  { sku: "IT-1021", name: "Dell Latitude 5440",         category: "IT equipment", stock: 6,  reorderLevel: 5,  unitPrice: 78500 },
  { sku: "IT-1044", name: "Logitech MX Keys keyboard",  category: "IT equipment", stock: 3,  reorderLevel: 10, unitPrice: 9500 },
  { sku: "IT-1102", name: "HDMI cable, 2m",             category: "IT equipment", stock: 0,  reorderLevel: 20, unitPrice: 450 },
  { sku: "FUR-2010", name: "Ergonomic office chair",    category: "Furniture",    stock: 14, reorderLevel: 5,  unitPrice: 12800 },
  { sku: "STA-3001", name: "A4 paper ream",             category: "Stationery",   stock: 42, reorderLevel: 50, unitPrice: 320 },
];

export const ASSETS = [
  { tag: "AST-0188", name: "Dell Latitude 5420", assignedTo: "EMP-1105", since: "2023-01-12", condition: "fair" },
  { tag: "AST-0119", name: "MacBook Pro 14\"",   assignedTo: "EMP-1042", since: "2025-03-03", condition: "good" },
  { tag: "AST-0302", name: "Dell 24\" monitor",  assignedTo: "EMP-1105", since: "2023-01-12", condition: "good" },
  { tag: "AST-0217", name: "Dell Latitude 5440", assignedTo: null,       since: null,          condition: "good" },  // available
];

export const VENDORS = [
  { name: "Sharma Office Supplies", supplies: "Stationery, pantry",       terms: "Net 30 days", openOrders: 2 },
  { name: "TechNova Distributors",  supplies: "Laptops, accessories",     terms: "Net 45 days", openOrders: 1 },
];

export function itemsBelowReorder() {
  return ITEMS.filter((i) => i.stock <= i.reorderLevel);
}

export function assetsFor(userId) {
  return ASSETS.filter((a) => a.assignedTo === userId);
}
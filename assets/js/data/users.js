// data/users.js
// One list of employees, departments and designations. Every page that shows
// headcount, names or department sizes should eventually read from here,
// instead of each page inventing its own numbers.

export const DEPARTMENTS = [
  { code: "ENG", name: "Engineering",       head: "Rahul Deshmukh" },
  { code: "SAL", name: "Sales",             head: "Meenal Arora" },
  { code: "OPS", name: "Operations",        head: "Nikhil Rao" },
  { code: "SUP", name: "Customer Support",  head: "Tanvi Sethi" },
  { code: "FIN", name: "Finance",           head: "Kabir Shah" },
  { code: "HR",  name: "Human Resources",   head: "Priya Nair" },
];

export const DESIGNATIONS = [
  { title: "Software Engineer",          department: "ENG", defaultRole: "emp" },
  { title: "Senior Software Engineer",   department: "ENG", defaultRole: "emp" },
  { title: "Team Lead",                  department: "ENG", defaultRole: "emp" },   // gets extra approve permissions via override, not a new role
  { title: "Sales Executive",            department: "SAL", defaultRole: "emp" },
  { title: "HR Executive",               department: "HR",  defaultRole: "emp" },
  { title: "HR Manager",                 department: "HR",  defaultRole: "hr" },
  { title: "Accountant",                 department: "FIN", defaultRole: "emp" },
  { title: "Finance Manager",            department: "FIN", defaultRole: "fin" },
  { title: "Store Keeper",               department: "OPS", defaultRole: "emp" },
  { title: "Administrator",              department: "ENG", defaultRole: "admin" },
];

// id doubles as the employee ID shown on-screen (EMP-1042, etc.)
export const USERS = [
  { id: "EMP-1001", name: "Aarav Mehta",    email: "aarav.mehta@northwind.com",    department: "ENG", designation: "Administrator",            role: "admin", status: "active" },
  { id: "EMP-1003", name: "Priya Nair",     email: "priya.nair@northwind.com",     department: "HR",  designation: "HR Manager",               role: "hr",  status: "active" },
  { id: "EMP-1008", name: "Kabir Shah",     email: "kabir.shah@northwind.com",     department: "FIN", designation: "Finance Manager",          role: "fin", status: "active" },
  { id: "EMP-1017", name: "Ananya Iyer",    email: "ananya.iyer@northwind.com",    department: "SAL", designation: "Sales Executive",          role: "emp", status: "active" },
  { id: "EMP-1023", name: "Meera Joshi",    email: "meera.joshi@northwind.com",    department: "FIN", designation: "Accountant",               role: "emp", status: "on-leave" },
  { id: "EMP-1029", name: "Sneha Rao",      email: "sneha.rao@northwind.com",      department: "ENG", designation: "Team Lead",                role: "emp", status: "active" },
  { id: "EMP-1042", name: "Rohan Gupta",    email: "rohan.gupta@northwind.com",    department: "ENG", designation: "Senior Software Engineer", role: "emp", status: "active" },
  { id: "EMP-1061", name: "Divya Menon",    email: "divya.menon@northwind.com",    department: "HR",  designation: "HR Executive",             role: "emp", status: "inactive" },
  { id: "EMP-1088", name: "Vikram Singh",   email: "vikram.singh@northwind.com",   department: "OPS", designation: "Store Keeper",             role: "emp", status: "active" },
  { id: "EMP-1105", name: "Arjun Kapoor",   email: "arjun.kapoor@northwind.com",   department: "ENG", designation: "Software Engineer",        role: "emp", status: "active" },
];

// Reporting manager for approval chains (leave, regularization, expenses).
export const MANAGER_OF = {
  "EMP-1042": "EMP-1029",  // Rohan -> Sneha (Team Lead)
  "EMP-1105": "EMP-1029",  // Arjun -> Sneha
  "EMP-1023": "EMP-1008",  // Meera -> Kabir
  "EMP-1088": null,        // Store Keeper reports to a department head, not tracked here yet
};

// Extra profile fields for the four demo sign-in identities (Admin, HR, Finance, Employee).
// Arjun's values match what my-profile.html already shows.
export const PROFILE_DETAILS = {
  "EMP-1001": {
    phone: "+91 98100 11223",
    personalEmail: "aarav.mehta88@gmail.com",
    city: "Gurugram",
    address: "DLF Phase 4, Gurugram, Haryana 122009",
    emergencyContactName: "Nisha Mehta",
    emergencyContactRelation: "Spouse",
    emergencyContactPhone: "+91 98111 40672",
    dateOfJoining: "4 Apr 2019",
    reportingManager: "Rahul Deshmukh",
    location: "Gurugram office",
    employmentType: "Full-time",
    leaveApprovedBy: "Auto-approved (Admin)",
  },
  "EMP-1003": {
    phone: "+91 99580 34127",
    personalEmail: "priya.nair.home@gmail.com",
    city: "Gurugram",
    address: "Sushant Lok 1, Gurugram, Haryana 122002",
    emergencyContactName: "Ramesh Nair",
    emergencyContactRelation: "Father",
    emergencyContactPhone: "+91 94472 18390",
    dateOfJoining: "15 Jul 2020",
    reportingManager: "Aarav Mehta",
    location: "Gurugram office",
    employmentType: "Full-time",
    leaveApprovedBy: "Aarav Mehta",
  },
  "EMP-1008": {
    phone: "+91 98734 90215",
    personalEmail: "kabirshah.personal@outlook.com",
    city: "New Delhi",
    address: "Saket, New Delhi, Delhi 110017",
    emergencyContactName: "Farah Shah",
    emergencyContactRelation: "Spouse",
    emergencyContactPhone: "+91 98200 57314",
    dateOfJoining: "2 Nov 2020",
    reportingManager: "Aarav Mehta",
    location: "Gurugram office",
    employmentType: "Full-time",
    leaveApprovedBy: "Aarav Mehta",
  },
  "EMP-1105": {
    phone: "+91 98765 43210",
    personalEmail: "arjun.k@example.com",
    city: "Gurugram",
    address: "Sector 56, Gurugram, Haryana 122011",
    emergencyContactName: "Sunita Kapoor",
    emergencyContactRelation: "Mother",
    emergencyContactPhone: "+91 98110 55667",
    dateOfJoining: "12 Jan 2023",
    reportingManager: "Sneha Rao",
    location: "Gurugram office",
    employmentType: "Full-time",
    leaveApprovedBy: "Sneha Rao, then HR",
  },
};

export function getUserById(id) {
  return USERS.find((u) => u.id === id) ?? null;
}

export function headcountByDepartment() {
  return DEPARTMENTS.map((d) => ({
    ...d,
    count: USERS.filter((u) => u.department === d.code).length,
  }));
}
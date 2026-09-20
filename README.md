# TeamOps

Role-based internal operations platform for software companies.

TeamOps brings HR, attendance, payroll, inventory, and reporting into one dashboard. Every user gets an interface and a set of permissions based on their role, and admins and HR can change those permissions without touching code.

> **Status:** In development. The static UI (HTML/CSS) is complete. JavaScript logic and the backend are being built in stages.

---

## Why TeamOps

Most small and mid-sized software companies run HR, attendance, payroll, and asset tracking across spreadsheets and separate tools. TeamOps is a single system where:

- Each role (Admin, HR, Manager, Employee, etc.) sees only what it is allowed to see
- Permissions are assigned to roles and designations from the UI
- Every module shares the same user, role, and permission model

## Features

### Core modules
- **Authentication and Users**: account management, role and designation assignment
- **RBAC**: admin and HR can assign permissions to roles and designations, with role-specific UI
- **Dashboard**: role-aware overview with key metrics
- **Attendance**: mark attendance and view attendance records
- **Payroll**: salary structure and payroll processing
- **Inventory**: company assets and stock tracking
- **Settings**: system and organization configuration
- **Backup**: data backup and restore

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | HTML5, CSS3, JavaScript, React    |
| Styling    | Tailwind CSS                      |
| Backend    | Node.js, Express.js               |
| Database   | MongoDB                           |
| Auth       | JWT (planned)                     |

## Development Plan

The project is built in stages so each layer is understood before the next is added.

1. [x] Static UI: HTML and CSS for all pages
2. [ ] JavaScript: interactivity, form logic, client-side validation
3. [ ] React: component-based frontend
4. [ ] Node.js and Express: REST API
5. [ ] MongoDB: data models and persistence
6. [ ] RBAC enforcement on both API and UI
7. [ ] Testing, security hardening, deployment

## Project Structure

```
teamops/
├── client/          # Frontend (HTML, CSS, JS, later React)
├── server/          # Backend (Express API), coming in later stages
├── .gitignore
├── LICENSE
└── README.md
```

> The structure will be updated as the backend and React app are added.

## Getting Started

### Prerequisites
- Node.js 18 or later
- MongoDB (local or Atlas), needed from the backend stage onward

### Installation

```bash
git clone https://github.com/Sumit93500/teamops.git
cd teamops
```

For now, open the static pages in `client/` directly in a browser. Setup instructions for the full stack will be added as those stages land.

### Environment variables (backend stage)

Create a `.env` file in `server/`:

```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

## Role and Permission Model

| Role      | Typical access                                        |
|-----------|-------------------------------------------------------|
| Admin     | Full system access, settings, backup, all permissions |
| HR        | Users, attendance, payroll, permission assignment     |
| Manager   | Team attendance, approvals, team reports             |
| Employee  | Own profile, own attendance, own payslips             |

> Roles and permissions are configurable. The table above shows defaults.

## Contributing

This is a personal project, but suggestions and issues are welcome. Open an issue to discuss a change before submitting a pull request.

## License

Released under the [MIT License](LICENSE).

## Author

**Sumit Yadav**
- GitHub: [@Sumit93500](https://github.com/Sumit93500)
- LinkedIn: [sumit-yadav](https://linkedin.com/in/sumit-yadav-423016317)

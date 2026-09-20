# TeamOps
A role-based internal operations platform for modern software companies.

> Status: In development. The static UI (HTML/CSS) is complete. JavaScript logic and the backend are being built in stages.

## Why TeamOps
TeamOps is designed to help software organizations manage everyday operational workflows in one place. It brings together employee access, approvals, attendance, payroll, inventory, and system settings into a unified internal platform that supports clear roles, simplified administration, and better team coordination.

## Features
- Authentication and Users
- RBAC (admin and HR assign permissions to roles and designations, role-specific UI)
- Dashboard
- Attendance
- Payroll
- Inventory
- Settings
- Backup

## Tech Stack
| Technology | Purpose |
| --- | --- |
| HTML5 | Static UI structure |
| CSS3 | Styling and responsive layouts |
| JavaScript | Client-side interactivity |
| React | Frontend application layer |
| Tailwind CSS | Utility-first UI styling |
| Node.js | Backend runtime |
| Express.js | API server |
| MongoDB | Data persistence |

## Development Plan
- [x] Static UI
- [ ] JavaScript
- [ ] React
- [ ] Node and Express
- [ ] MongoDB
- [ ] RBAC enforcement
- [ ] Testing and deployment

## Project Structure
```text
teamops/
├── _templates/
├── assets/
│   ├── css/
│   │   ├── base/
│   │   ├── components/
│   │   ├── layout/
│   │   ├── pages/
│   │   ├── print.css
│   │   └── style.css
│   ├── fonts/
│   ├── img/
│   └── js/
│       ├── config/
│       ├── core/
│       ├── data/
│       ├── pages/
│       ├── ui/
│       └── app.js
├── pages/
├── index.html
├── scratch.html
├── README.md
└── .gitignore
```

## Getting Started
```bash
git clone https://github.com/Sumit93500/teamops.git
```
Then open `index.html` in a browser to view the static interface.

## Role and Permission Model
| Role | Typical Access |
| --- | --- |
| Admin | Full system access, user management, permissions, settings, backups, and platform administration |
| HR | Employee records, role assignments, attendance insights, onboarding and compliance-related workflows |
| Manager | Team dashboards, approvals, attendance, role-based operational tools for assigned teams |
| Employee | Personal profile, attendance, leave, payroll access, and assigned self-service actions |

## Author
- Sumit Yadav
- GitHub: @Sumit93500
- LinkedIn: https://linkedin.com/in/sumit-yadav-423016317

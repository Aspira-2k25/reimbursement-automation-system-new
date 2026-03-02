<div align="center">
  
  <img src="https://img.shields.io/badge/A_P_S_I_T-Reimbursement_Portal-00E5FF?style=for-the-badge&logoColor=white" alt="Project Badge" />
  
  <br />
  <br />

  # 🎓 Reimbursement Automation System

  **A modern, high-performance digital gateway designed to automate, track, and manage expense claims seamlessly. This intelligent system bridges the gap between Students, Faculty, HODs, Coordinators, Principals, and the Accounts Department.**

  <p align="center">
    <a href="#-about-the-system">About</a> •
    <a href="#-key-features">Features</a> •
    <a href="#-technology-infrastructure">Architecture</a> •
    <a href="#-the-development-team">Team</a>
  </p>

  ![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
  ![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
  ![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
  ![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
  ![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)

</div>

---

## 🏛️ About the System

The **Reimbursement Automation System** is a proprietary, closed-source digital platform developed exclusively for college administration and direct student utility. Built to be deployed directly on the institution's servers, this portal completely eliminates the slow, paper-based reimbursement process. 

From the initial submission by a student or faculty member, to the final ledger payout by Accounts, every stakeholder forms part of a secure, seamless, and transparent digital queue.

---

## ✨ Key Capabilities

| Feature | Description |
| :--- | :--- |
| 🛡️ **Role-Based Portals** | Dedicated, secure UI views tailored specifically for Students, Faculty, HOD, Coordinator, Principal, and Accounts personnel. |
| 🔀 **Smart Queue Logistics** | Requests progress systematically down the administrative approval chain. Final Principal approvals auto-queue for the Accounts department. |
| 📊 **Real-Time Analytics** | The Principal & HOD dashboards offer high-level organizational metrics, pending task loads, and historical budget trackers. |
| 🔔 **Notification Matrix** | In-app alerts ensure ultra-fast communication between administrative tiers, notifying users of approvals, rejections, or required changes. |
| 📂 **Secure Vault** | Capability to attach, encrypt, and process digital receipts, fee structures, and ID cards within contextual form boundaries. |
| 🔍 **Advanced Filtering** | Administration can isolate queries by form status, constituent departments, reimbursement type, and direct chronological text search. |

---

## 🏗️ Technology Infrastructure

Our system is engineered using state-of-the-art Web and Cloud technologies prioritizing security, speed, and reliability.

### 🎨 Client Architecture (Frontend)
- **Framework**: React 19 driven by Vite.
- **Design System**: Tailwind CSS & Mantine UI components.
- **Interactions**: Framer Motion for liquid-smooth transitions.
- **Data Visualization**: Recharts for dynamic analytical reporting.

### ⚙️ Server Architecture (Backend)
- **Engine**: Node.js utilizing the Express framework for RESTful APIs.
- **Document Store**: MongoDB via Mongoose handles dynamic JSON payloads and forms.
- **Relational Integrity**: PostgreSQL via Prisma manages core administrative identity mapping.
- **Security Protocols**: Role-Based JWT tokens, bcrypt hashed passwords, and verified Google Auth.
- **Asset Processing**: Cloudinary integration for handling high-volume receipt image uploads.

---

## �‍�💻 The Development Team

This system was proudly engineered, designed, and deployed by our institution's own computer science developers to solve a critical campus workflow issue.

<br />

<div align="center">
  
| 🧑‍💻 Developer | 🔗 GitHub Profile |
| :---: | :--- |
| **Alok** | [@FutureAlok1445](https://github.com/FutureAlok1445) |
| **Apoorva** | [@Oriacgz](https://github.com/Oriacgz) |
| **Nirmala** | [@Nirmala1914](https://github.com/Nirmala1914) |
| **Vaibhavi** | [@Vai-15](https://github.com/Vai-15) |

</div>

---

## 🔐 Deployment Information

This application is strictly for internal college deployment and execution on institutional infrastructure. 

### Quick-Start for DevOps

1. **Environment Configuration**: Set local `.env` values mapping database URIs (`MONGODB_URI`, `DB_PRISMA_DATABASE_URL`) and application secrets (`JWT_SECRET`, `CLOUDINARY_URL`).
2. **Database Provisioning**: Install core schemas via `npm run prisma:generate` inside `./backend/server`.
3. **Daemonization**: Spin up the backend via PM2 or Node (`npm run start`), exposing the API port.
4. **Client Proxying**: Build the Vite frontend application using `npm run build` inside `./front-end` and map the static `/dist` artifacts to an NGINX or Apache proxy server mapping to the public domains.

---

<div align="center">
  <br />
  <i>Engineered with precision for the future of academic administration.</i>
</div>

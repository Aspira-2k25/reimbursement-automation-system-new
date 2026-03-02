<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=00B4D8&height=250&section=header&text=Reimbursement%20Automation&fontSize=60&fontAlignY=35&desc=A%20Seamless%20Digital%20Queue%20Experience&descAlignY=55" alt="Cinematic Hero Banner" />
</div>

<div align="center">
  <a href="https://reimbursement-automation-system-new-nu.vercel.app">
    <img src="https://img.shields.io/badge/Live_Testing_Portal-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Testing Portal" />
  </a>
</div>

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Orbitron&weight=600&size=24&pause=1000&color=00E5FF&center=true&vCenter=true&width=800&lines=The+Paper-Trail+Ends+Here...;Empowering+Students,+Faculty,+%26+Accounts;Welcome+to+the+Future+of+Campus+Administration" alt="Typing Showcase" />
</p>

---

## 🎬 Prologue: The Problem

> *For years, college administration has battled an invisible enemy: **The Paper Trail**. Lost receipts, untracked approvals, and endless queues at the Accounts Desk. The reimbursement process was slow, frustrating, and lacked transparency. Stakeholders were left in the dark. It was time for a change.*

---

## 🌟 The Hero: Our Digital Gateway

<img align="right" width="300" src="https://media.giphy.com/media/LmNwrBhejkK9EFP504/giphy.gif" alt="Rocket Launching" />

Enter the **Reimbursement Automation System**. Engineered for speed, transparency, and accountability, this high-performance platform completely digitizes the expense claim lifecycle.

By replacing physical desks with **Role-Based Digital Portals**, we've created a seamless, unbroken chain of command. When a student submits an NPTEL receipt, it doesn't vanish into a folder—it instantly appears on the HOD's dashboard. Upon approval, it flies to the Principal, and finally, directly into the Accounts ledger.

**No lost papers. No manual tracking. Just pure digital throughput.**

<br />

---

## ⚡ Power & Performance: Key Features

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&color=timeGradient&height=80&text=Unlocking%20Campus%20Efficiency&fontSize=30&fontAlignY=50" alt="Features Banner" />
</div>

| Feature | Description |
| :--- | :--- |
| 🛡️ **Role-Based Portals** | Dedicated, secure UI views tailored specifically for **Students, Faculty, HOD, Coordinator, Principal, and Accounts**. Every user sees only what they need to see. |
| 🔀 **Smart Queue Logistics** | Requests progress systematically down the administrative approval chain. Final Principal approvals trigger immediate auto-queueing for the Accounts department. |
| 📊 **Real-Time Analytics** | The Principal & HOD dashboards burst into life with high-level organizational metrics, pending task loads, and historical budget utilization charts. |
| 🔔 **Notification Matrix** | In-app, color-coded toast alerts ensure ultra-fast communication between administrative tiers, notifying users of approvals or requested changes instantly. |
| 📂 **Secure Vault** | Attach, encrypt, and render digital receipts, fee structures, and ID cards within contextual boundaries. Receipts are stored securely via the cloud. |

---

## 🌌 The Engine Room: Architecture Workflow

Behind the beautiful UI lies a robust, enterprise-grade architecture. Our engine is built to handle the highest volumes of campus traffic with absolute data integrity.

```mermaid
graph TD
    %% Colors and Styles
    classDef user fill:#00b4d8,stroke:#03045e,stroke-width:2px,color:#fff;
    classDef logic fill:#90e0ef,stroke:#03045e,stroke-width:2px,color:#000;
    classDef db fill:#023e8a,stroke:#00b4d8,stroke-width:3px,color:#fff;
    classDef fail fill:#ef233c,stroke:#8d0801,stroke-width:2px,color:#fff;

    A[🎓 Applicant] -->|Uploads Receipt & Form| B[(MongoDB Cloud Store)]
    B --> C{👔 HOD / Coordinator}
    
    C -->|Approved| D{👑 Principal Review}
    C -->|Rejected| E[Return to Applicant Alert]
    
    D -->|Approved| F[💹 Accounts Financial Queue]
    D -->|Rejected| E
    
    F -->|Reimbursed| G[Final Ledger Recorded]
    
    H[(Postgres Administrative Auth)] -.->|Token Verifies| C
    H -.->|Token Verifies| D
    H -.->|Token Verifies| F

    %% Appling Classes
    class A,G user;
    class C,D,F logic;
    class B,H db;
    class E fail;
```

---

## 🛠️ The Arsenal: Tech Stack

We armed ourselves with the most modern, blistering-fast technologies available.

<div align="center">
  
  ![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
  ![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
  ![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
  ![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
  ![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
  ![Framer Motion](https://img.shields.io/badge/Framer_Motion-black?style=for-the-badge&logo=framer&logoColor=blue)
  
</div>

---

## 🎬 The Cast: Meet Our Developers

This system was proudly engineered, designed, and deployed by our institution's own computer science developers to solve a critical campus workflow issue.

<br />

<div align="center">
  
| <img src="https://github.com/FutureAlok1445.png" width="90" style="border-radius:10%; border: 3px solid #00E5FF;" alt="Alok" /> | <img src="https://github.com/Oriacgz.png" width="90" style="border-radius:10%; border: 3px solid #00E5FF;" alt="Apoorva" /> | <img src="https://github.com/Nirmala1914.png" width="90" style="border-radius:10%; border: 3px solid #00E5FF;" alt="Nirmala" /> | <img src="https://github.com/Vai-15.png" width="90" style="border-radius:10%; border: 3px solid #00E5FF;" alt="Vaibhavi" /> |
| :---: | :---: | :---: | :---: |
| **[Alok](https://github.com/FutureAlok1445)** | **[Apoorva](https://github.com/Oriacgz)** | **[Nirmala](https://github.com/Nirmala1914)** | **[Vaibhavi](https://github.com/Vai-15)** |
| *Full-Stack Developer* | *Full-Stack Developer* | *Frontend/Design Specialist* | *Frontend/Design Specialist* |

</div>

---

## � Epilogue: Deployment

This platform is strictly an Enterprise-Ready closed-source system. 

**Quick-Start for College IT Staff:**
1. Populate local `.env` values mapping `MONGODB`, `POSTGRES`, and `CLOUDINARY` URIs.
2. Initialize database dependencies via `npm run prisma:generate` inside `./backend/server`.
3. Ignite the backend API on port `5000` (`npm run dev`).
4. Build the Vite frontend payload (`npm run build`) in `./front-end` and map the static artifacts to NGINX on your local college servers.

---

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&color=00B4D8&height=60&text=Engineered%20for%20the%20Future&fontSize=20&fontAlignY=50" alt="Footer Banner" />
</div>

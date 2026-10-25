<div align="center">

# ⚡ BIDECC

### A cinematic real-time auction experience, built to make concurrency visible.

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=06121f)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/Status-Prototype-FF6B6B?style=for-the-badge)](#)

**Live bidding · Load simulation · Audit ledger · Emergency procurement**

</div>

---

## ✨ What is BIDECC?

BIDECC is an interactive front-end laboratory for exploring the difficult part of real-time auctions: accepting the right bid, in the right order, when everyone bids at once. It pairs a premium auction interface with live concurrency simulations, visual telemetry, and a transparent audit trail.

It also includes **Relief Exchange** — a reverse-auction scenario for urgent public procurement, where the best eligible supplier is chosen against price, quantity, certification, budget, and delivery-time constraints.

> **The idea:** real-time marketplaces should feel effortless to participants while remaining demonstrably fair under pressure.

## 🌈 Highlights

| | Capability | What it lets you explore |
|:--:|---|---|
| ⚡ | **Atomic sequencing** | See how a single authoritative sequence prevents stale or out-of-order bid acceptance. |
| 📈 | **Live telemetry** | Watch throughput, latency, acceptance, and violations change under simulated load. |
| 🧪 | **Strategy lab** | Compare naive, pessimistic locking, optimistic CAS, and in-memory sequencer approaches. |
| 🛡️ | **Audit-first design** | Follow every decision through a timestamped transaction ledger. |
| 🚑 | **Relief Exchange** | Model transparent reverse auctions for time-critical emergency supplies. |
| ⏱️ | **Anti-sniping rules** | Extend an auction when valid late bids arrive. |

## 🧠 Concurrency strategies at a glance

```mermaid
flowchart LR
    B[Incoming bids] --> N[Naive updates]
    B --> L[Pessimistic locking]
    B --> C[Optimistic CAS]
    B --> S[Atomic sequencer]
    N -->|Fast, but may violate order| X[Result]
    L -->|Correct, but queues under load| X
    C -->|Correct, retries on conflict| X
    S -->|Ordered and low-latency| X

    classDef risk fill:#ffebe9,stroke:#f04438,color:#7a271a
    classDef warn fill:#fff6e0,stroke:#f79009,color:#7a2e0e
    classDef good fill:#e7f8ef,stroke:#12b76a,color:#054f31
    class N risk
    class L,C warn
    class S good
```

## 🗂️ Language mix

The chart below is calculated from first-party source files in this repository (by file size; dependencies and build output excluded).

```mermaid
pie showData
    title Source language distribution
    "JavaScript / JSX" : 70
    "CSS" : 24
    "TypeScript / TSX" : 5
    "Python & HTML" : 1
```

<div align="center">

| JavaScript / JSX | CSS | TypeScript / TSX | Python & HTML |
|:---:|:---:|:---:|:---:|
| `70%` | `24%` | `5%` | `1%` |

</div>

## 🧰 Built with

- **React 18** for the interactive experience
- **Vite 5** for fast local development and production builds
- **TypeScript** for the application shell and utilities
- **Lucide React** for crisp UI iconography
- **MP4Box** for scroll-tied video support
- **Tailwind CSS / PostCSS** alongside bespoke visual styling


## 🏛️ Production direction

The demo illustrates a production architecture with a fast, ordered ingest path and asynchronous durability:

```mermaid
flowchart LR
    U[Bidder] --> G[API / WebSocket gateway]
    G --> R[Redis Lua atomic sequencer]
    R --> P[Pub/Sub fan-out]
    R --> O[Transactional outbox]
    O --> D[(PostgreSQL ledger)]
    P --> W[Connected clients]

    classDef primary fill:#eef4ff,stroke:#2e90fa,color:#0b4a6f
    classDef accent fill:#f4ebff,stroke:#9e77ed,color:#3e1c96
    class R primary
    class P,O accent
```

The intended invariants are simple and strict:

1. A valid bid must exceed the current high bid by the required increment.
2. Every accepted bid receives a monotonic sequence number.
3. The sequence is authoritative, even if persistence and broadcast complete later.
4. The audit ledger makes the decision trail inspectable.

## 🛣️ Roadmap

- [x] Interactive auction and strategy comparison UI
- [x] Stress-test simulation, telemetry, and audit ledger
- [x] Relief Exchange reverse-auction scenario
- [ ] Connect the sequencer to Redis Lua in a backend service
- [ ] Add PostgreSQL write-behind and transactional outbox
- [ ] Add real WebSocket fan-out and reconciliation
- [ ] Validate with automated multi-region load tests

---

<div align="center">

Built for fairer, faster, more transparent real-time markets. ✦

</div>

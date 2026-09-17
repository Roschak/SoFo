# ADR-001 — Pemilihan Tech Stack

Status: Accepted
Tanggal: 2026-09-17
Keputusan: Owner (via mandat pemilihan otomatis)

## Konteks
PRD tidak menentukan stack. Dibutuhkan modular architecture (PRD §11-§12) dengan layer
separation dan testability.

## Keputusan
- Backend: **NestJS (TypeScript)** — modular DI cocok dengan PRD §61 module structure
- Frontend: **React + Vite** dengan custom design system (bukan template — keputusan owner)
- Database: **PostgreSQL 16 + Prisma ORM** — migration, type-safety, constraint kuat
- Monorepo: **npm workspaces** (tanpa tool tambahan)

## Alasan
- NestJS punya guard/pipe/filter yang memetakan 1:1 ke pipeline PRD §55
- Prisma memaksa schema terdokumentasi (PRD §57-§58) dan type-safe
- Satu bahasa (TS) untuk semua layer menurunkan duplication context-switch

## Konsekuensi
+ Struktur module selalu konsisten dan dapat diverifikasi lint
- Versi Node >= 22 wajib (engines field)

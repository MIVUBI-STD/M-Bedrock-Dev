# Capacity & Concurrency Audit Checklist

## Purpose

Menambahkan pemeriksaan kapasitas gameplay agar audit tidak hanya memeriksa apakah sistem bekerja, tetapi apakah kapasitas yang terlihat player sesuai dengan desain pengalaman.

## Audit Questions

### 1. Availability Contract

- Berapa instance yang terlihat tersedia?
- Berapa instance yang benar-benar dapat digunakan?
- Apakah player memahami batas tersebut?

### 2. Concurrency Contract

Periksa:

- maximum simultaneous matches;
- maximum active arenas;
- party capacity;
- queue behavior;
- transition ketika slot tersedia.

### 3. Design vs Limitation

Jangan langsung menganggap limitation sebagai bug.

Klasifikasi:

- Designed limitation: batas sesuai desain dan diberi feedback jelas.
- Gameplay mismatch: kapasitas terlihat berbeda dengan kemampuan nyata tanpa penjelasan.

### 4. Player Experience Check

Periksa apakah player mendapat:

- informasi queue;
- status arena;
- alasan menunggu;
- feedback ketika kapasitas penuh.

### 5. Report Requirement

Jika ditemukan mismatch, report wajib berisi:

- advertised capacity;
- actual capacity;
- affected player flow;
- reproduction steps dari sudut pandang World tester.

## Coverage

Berlaku untuk:

- multi arena;
- multiplayer lobby;
- matchmaking;
- concurrent sessions;
- shared world instances.


### 6. Effective Player Throughput

Arena count alone is not capacity. Derive all applicable limits independently:

```text
visible arena count
party size
party/session count
maximum simultaneous matches
maximum active arenas
per-arena player capacity
effective simultaneous player capacity
classroom/presented capacity
```

Use the smallest active bottleneck to compute delivered throughput. A map with five visible arenas can still expose only one five-player party; conversely a six-arena map can be limited by residency leases to two active sessions.

Check the boundary and boundary + 1 for both **sessions** and **players**. Queue code is mitigation, not proof that presented capacity is delivered.

### 7. Capacity Dependencies

Capacity proof must include dependencies that can lower real throughput:

- ticking-area/chunk residency budget;
- shared global state or singleton party/session owner;
- shared queues;
- entity/simulation budget;
- fixed-size kit/role/station allocation;
- cleanup/reset lease lifetime.

If a dependency is only declared/configured, continue through delivery-state proof before accepting it as available capacity.

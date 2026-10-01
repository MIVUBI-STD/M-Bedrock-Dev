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

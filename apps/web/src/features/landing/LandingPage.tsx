import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../state/AuthContext';
import {
  bindScrollProgress,
  observeReveals,
  prefersReducedMotion,
} from '../../lib/scroll-reveal';
import './LandingPage.css';

/**
 * SOFO Landing Page & Product Portfolio Showcase (ADR-003 custom design system).
 * Dynamic scroll-reveal animations across all products and features.
 */

interface PortfolioProduct {
  id: string;
  badge: string;
  icon: string;
  title: string;
  tagline: string;
  body: string;
  tone: string;
  highlights: string[];
  mockup: {
    type: 'chat' | 'kanban' | 'calendar' | 'approval' | 'attendance' | 'meeting';
  };
}

const PORTFOLIO_PRODUCTS: PortfolioProduct[] = [
  {
    id: 'chat',
    badge: 'Realtime WebSocket',
    icon: '💬',
    title: 'SOFO Chat & Channels',
    tagline: 'Percakapan tim secepat kilat dengan zero delay',
    body: 'Saluran publik & privat dengan indikator pengetikan langsung, presensi online akurat, thread diskusi terfokus, dan audit integritas pesan.',
    tone: 'var(--sofo-accent-500)',
    highlights: ['WebSocket real-time', 'Thread replies', 'Presence indicator', 'Role-based access'],
    mockup: { type: 'chat' },
  },
  {
    id: 'kanban',
    badge: 'Sprint & Workflow',
    icon: '🗂️',
    title: 'SOFO Projects & Task Kanban',
    tagline: 'Visualisasikan progres kerja dari ide hingga rilis',
    body: 'Papan interaktif drag-and-drop 4 tahap, delegasi tugas ke anggota tim berlisensi, prioritas darurat, dan integrasi tenggat waktu ke kalender global.',
    tone: 'var(--sofo-success)',
    highlights: ['Drag-and-drop board', 'Priority tags', 'Due-date sync', 'Member assignment'],
    mockup: { type: 'kanban' },
  },
  {
    id: 'meeting',
    badge: 'Live Sync Notes',
    icon: '📹',
    title: 'SOFO Meeting & Live Notes',
    tagline: 'Rapat fokus dengan notula kolaboratif seketika',
    body: 'Mulai rapat dalam hitungan detik. Catatan rapat tersinkronisasi per-penulis secara live, menghilangkan kebutuhan notula manual yang lambat.',
    tone: 'var(--sofo-info)',
    highlights: ['Multi-author notes', 'Instant room link', 'Lifecycle status', 'Audit logging'],
    mockup: { type: 'meeting' },
  },
  {
    id: 'calendar',
    badge: 'Agenda Aggregator',
    icon: '📅',
    title: 'SOFO Unified Calendar',
    tagline: 'Semua deadline, rapat, dan agenda di satu kanvas',
    body: 'Agregasi otomatis 4 sumber data: agenda resmi kantor, jadwal rapat, deadline proyek, dan tugas tim, lengkap dengan radar pengingat 7 hari ke depan.',
    tone: 'var(--sofo-warning)',
    highlights: ['Monthly grid view', '7-day reminder radar', 'Auto-aggregated sources', 'Filter by event kind'],
    mockup: { type: 'calendar' },
  },
  {
    id: 'approval',
    badge: 'Zero-Trust Governance',
    icon: '⚡',
    title: 'SOFO Request & Approval',
    tagline: 'Birokrasi digital tanpa tumpukan kertas',
    body: 'Pengajuan cuti, reimbursement, izin operasional, dan dokumen legal. Larangan self-approval otomatis, alur persetujuan berjenjang, dan audit trail tak terhapus.',
    tone: 'var(--sofo-accent-200)',
    highlights: ['Self-approval ban', '5 request types', 'Instant decision note', 'Traceable audit hops'],
    mockup: { type: 'approval' },
  },
  {
    id: 'attendance',
    badge: 'Enterprise HR',
    icon: '⏱️',
    title: 'SOFO Attendance & Presensi',
    tagline: 'Catat waktu kerja tim dengan akurasi terverifikasi',
    body: 'Sistem presensi satu ketukan khusus mode Enterprise. Deteksi keterlambatan otomatis dengan batas toleransi, hitung durasi jam kerja bersih, dan rekam jejak harian.',
    tone: 'var(--sofo-danger)',
    highlights: ['1-tap clock in/out', 'Grace period check', 'Worked hours counter', 'Tenant-isolated history'],
    mockup: { type: 'attendance' },
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Daftar & buat workspace',
    body: 'Satu akun untuk seluruh organisasi — pilih mode COMMUNITY untuk komunitas santai atau ENTERPRISE untuk struktur korporat penuh.',
  },
  {
    step: '02',
    title: 'Undang tim & terapkan matriks peran',
    body: 'Owner, Admin, Manager, Member, hingga Client — setiap anggota memiliki izin terdefinisi secara granular tanpa celah akses liar.',
  },
  {
    step: '03',
    title: 'Kolaborasi, rapat, dan putuskan',
    body: 'Diskusikan rencana di channel, jalankan tugas di kanban board, gelar rapat dengan live notes, dan sahkan permintaan dalam hitungan menit.',
  },
  {
    step: '04',
    title: 'Audit & pantau secara transparan',
    body: 'Audit trail merekam seluruh aktivitas kritis, kalender memastikan target terpenuhi, dan notifikasi realtime menjaga tim selalu sinkron.',
  },
];

const STATS = [
  { value: '140+', label: 'Test suite passed' },
  { value: '8', label: 'Peran & matriks izin granular' },
  { value: '3-in-1', label: 'Platform: Web, APK, & EXE' },
  { value: '100%', label: 'Aksi kritis ter-audit & scoped' },
];

export function LandingPage() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('chat');
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  useEffect(() => {
    const root = containerRef.current ?? document.body;
    const disconnectReveals = observeReveals(root);

    const unbindScroll = bindScrollProgress(
      containerRef.current ?? window,
      (ratio) => setScrollProgress(ratio),
    );

    return () => {
      disconnectReveals();
      unbindScroll();
    };
  }, []);

  const currentProduct: PortfolioProduct =
    PORTFOLIO_PRODUCTS.find((p) => p.id === activeTab) ?? (PORTFOLIO_PRODUCTS[0] as PortfolioProduct);

  return (
    <div className="landing" ref={containerRef}>
      {/* Top Scroll Indicator */}
      <div
        className="landing__scroll-indicator"
        style={{ transform: `scaleX(${scrollProgress})` }}
        aria-hidden="true"
      />

      {/* Floating Ambient Glow Orbs */}
      <div className="landing__glow-ambient landing__glow-ambient--1" aria-hidden="true" />
      <div className="landing__glow-ambient landing__glow-ambient--2" aria-hidden="true" />

      {/* Sticky Header Nav */}
      <header className="landing__nav">
        <span className="landing__brand">SOFO</span>
        <nav className="landing__nav-links" aria-label="Navigasi landing">
          <a href="#portofolio">Portofolio</a>
          <a href="#alur">Cara kerja</a>
          <a href="#angka">Performa</a>
        </nav>
        <a className="landing__cta landing__cta--nav" href={session ? '#masuk' : '#mulai'}>
          {session ? 'Buka aplikasi' : 'Mulai gratis'}
        </a>
      </header>

      {/* Hero Section */}
      <section className={`landing__hero landing__inner${reducedMotion ? ' landing--reduced' : ''}`} id="atas">
        <p className="landing__eyebrow" style={{ animationDelay: '0ms' }}>
          ✨ All-in-One Digital Office Ecosystem
        </p>
        <h1 className="landing__title" style={{ animationDelay: '80ms' }}>
          Kantor digital modern untuk tim yang{' '}
          <span className="landing__title-accent">bergerak cepat</span>
        </h1>
        <p className="landing__subtitle" style={{ animationDelay: '160ms' }}>
          Satukan obrolan, rapat, proyek kanban, kalender terpadu, presensi digital,
          dan approval berjenjang dalam satu platform aman. Tersedia untuk Web, APK Android, dan EXE Desktop.
        </p>
        <div className="landing__hero-actions" style={{ animationDelay: '240ms' }}>
          <a className="landing__cta" href={session ? '#masuk' : '#mulai'}>
            {session ? 'Buka workspace →' : 'Jelajahi sekarang →'}
          </a>
          <a className="landing__cta landing__cta--ghost" href="#portofolio">
            Lihat portofolio produk ↓
          </a>
        </div>

        {/* Hero Interactive Mockup Panel */}
        <div className="landing__hero-panel" style={{ animationDelay: '320ms' }} aria-hidden="true">
          <div className="landing__hero-bar">
            <span /> <span /> <span />
            <div className="landing__hero-bar-title">SOFO Workspace v2.0 • Live Synchronized</div>
          </div>
          <div className="landing__hero-preview-body">
            <div className="landing__hero-row">
              <span className="landing__hero-bubble landing__hero-bubble--me">
                🚀 Sprint baru sudah dibuka di board proyek!
              </span>
            </div>
            <div className="landing__hero-row landing__hero-row--right">
              <span className="landing__hero-bubble">
                Siap, notula meeting tadi pagi sudah saya cantumkan di Live Notes.
              </span>
            </div>
            <div className="landing__hero-row">
              <span className="landing__hero-bubble landing__hero-bubble--accent">
                ✅ Pengajuan cuti & reimbursement telah disetujui Manager
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio Showcase Section */}
      <section className="landing__section landing__inner" id="portofolio" aria-label="Portofolio Produk SOFO">
        <div className="landing__section-header" data-reveal data-reveal-direction="up">
          <p className="landing__kicker">Portofolio Produk</p>
          <h2 className="landing__heading">Ekosistem Lengkap dalam Satu Genggaman</h2>
          <p className="landing__lede">
            Setiap modul dirancang selaras dengan standar zero-trust, tenant isolation penuh,
            dan animasi responsif yang memukau.
          </p>
        </div>

        {/* Product Selector Navigation Tabs */}
        <div className="landing__tabs" role="tablist" data-reveal data-reveal-direction="up">
          {PORTFOLIO_PRODUCTS.map((prod) => (
            <button
              key={prod.id}
              role="tab"
              aria-selected={activeTab === prod.id}
              className={`landing__tab-btn${activeTab === prod.id ? ' landing__tab-btn--active' : ''}`}
              onClick={() => setActiveTab(prod.id)}
            >
              <span className="landing__tab-icon">{prod.icon}</span>
              <span className="landing__tab-label">{prod.title.replace('SOFO ', '')}</span>
            </button>
          ))}
        </div>

        {/* Active Product Detailed Showcase */}
        <div className="landing__showcase-display" data-reveal data-reveal-direction="scale">
          <div className="landing__showcase-info">
            <span className="landing__showcase-badge" style={{ borderColor: currentProduct.tone, color: currentProduct.tone }}>
              {currentProduct.badge}
            </span>
            <h3 className="landing__showcase-title">{currentProduct.title}</h3>
            <p className="landing__showcase-tagline">{currentProduct.tagline}</p>
            <p className="landing__showcase-desc">{currentProduct.body}</p>

            <ul className="landing__showcase-highlights">
              {currentProduct.highlights.map((item) => (
                <li key={item} className="landing__showcase-highlight-item">
                  <span className="landing__check-bullet">✔</span> {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="landing__showcase-screen">
            <div className="landing__mockup-window">
              <div className="landing__mockup-bar">
                <span className="landing__dot landing__dot--red" />
                <span className="landing__dot landing__dot--yellow" />
                <span className="landing__dot landing__dot--green" />
                <span className="landing__mockup-title">preview://sofo/{currentProduct.id}</span>
              </div>

              {/* Dynamic Live Mockup Contents */}
              <div className="landing__mockup-content">
                {currentProduct.mockup.type === 'chat' && (
                  <div className="landing__mockup-chat">
                    <div className="landing__mockup-chat-header">
                      <span># pengembangan-fitur</span>
                      <span className="landing__mockup-badge">● 14 Online</span>
                    </div>
                    <div className="landing__mockup-chat-msg">
                      <div className="landing__mockup-avatar">JD</div>
                      <div>
                        <div className="landing__mockup-author">John Doe <span className="landing__mockup-time">13:40</span></div>
                        <div className="landing__mockup-text">Halo tim! Modul presensi dan scroll animation portofolio sudah aktif.</div>
                      </div>
                    </div>
                    <div className="landing__mockup-chat-msg">
                      <div className="landing__mockup-avatar" style={{ background: 'var(--sofo-success)' }}>SR</div>
                      <div>
                        <div className="landing__mockup-author">Sarah R. <span className="landing__mockup-time">13:41</span></div>
                        <div className="landing__mockup-text">Luar biasa, transisi animasinya sangat mulus dan responsif! ✨</div>
                      </div>
                    </div>
                    <div className="landing__mockup-typing">Sarah sedang mengetik...</div>
                  </div>
                )}

                {currentProduct.mockup.type === 'kanban' && (
                  <div className="landing__mockup-kanban">
                    <div className="landing__kanban-col">
                      <div className="landing__kanban-head">DALAM PROSES (2)</div>
                      <div className="landing__kanban-card">
                        <span className="landing__card-tag landing__card-tag--urgent">URGENT</span>
                        <div className="landing__card-name">Audit Keamanan E2E</div>
                        <div className="landing__card-meta">👤 Roschak • Hari ini</div>
                      </div>
                      <div className="landing__kanban-card">
                        <span className="landing__card-tag landing__card-tag--high">HIGH</span>
                        <div className="landing__card-name">Animasi Portofolio Scroll</div>
                        <div className="landing__card-meta">👤 Dev Tim</div>
                      </div>
                    </div>
                    <div className="landing__kanban-col">
                      <div className="landing__kanban-head">SELESAI (3)</div>
                      <div className="landing__kanban-card landing__kanban-card--done">
                        <span className="landing__card-tag landing__card-tag--done">DONE</span>
                        <div className="landing__card-name">Prisma Tenant Scoping</div>
                        <div className="landing__card-meta">✔ 140 Test Pass</div>
                      </div>
                    </div>
                  </div>
                )}

                {currentProduct.mockup.type === 'meeting' && (
                  <div className="landing__mockup-meeting">
                    <div className="landing__meeting-header">
                      <span>📹 Evaluasi Sesi Rapat #04</span>
                      <span className="landing__mockup-status-live">● LIVE REC</span>
                    </div>
                    <div className="landing__meeting-notes">
                      <div className="landing__notes-title">📝 Catatan Langsung (Kolaboratif):</div>
                      <p>1. Semua arsitektur web, apk, dan exe telah siap rilis.</p>
                      <p>2. Audit berkala dijalankan setiap milestone.</p>
                      <p>3. Efek visual scroll terintegrasi dengan mulus.</p>
                    </div>
                  </div>
                )}

                {currentProduct.mockup.type === 'calendar' && (
                  <div className="landing__mockup-calendar">
                    <div className="landing__cal-header">September 2026</div>
                    <div className="landing__cal-grid">
                      <div className="landing__cal-day">17</div>
                      <div className="landing__cal-day">18</div>
                      <div className="landing__cal-day landing__cal-day--active">
                        19
                        <span className="landing__cal-dot" />
                      </div>
                      <div className="landing__cal-day">20</div>
                      <div className="landing__cal-day">21</div>
                    </div>
                    <div className="landing__cal-agenda">
                      <div className="landing__agenda-item">⚡ 14:00 - Release Engineering Demo</div>
                    </div>
                  </div>
                )}

                {currentProduct.mockup.type === 'approval' && (
                  <div className="landing__mockup-approval">
                    <div className="landing__req-card">
                      <div className="landing__req-top">
                        <span className="landing__req-type">CUTI TAHUNAN</span>
                        <span className="landing__req-status">MENUNGGU</span>
                      </div>
                      <div className="landing__req-user">Diajukan oleh: Dimas Pratama (2 hari)</div>
                      <div className="landing__req-actions">
                        <button className="landing__btn-approve" type="button">Setujui</button>
                        <button className="landing__btn-reject" type="button">Tolak</button>
                      </div>
                    </div>
                  </div>
                )}

                {currentProduct.mockup.type === 'attendance' && (
                  <div className="landing__mockup-attendance">
                    <div className="landing__att-clock">
                      <div className="landing__att-time">09:02:45 WIB</div>
                      <div className="landing__att-badge">STATUS: ON TIME (Tepat Waktu)</div>
                    </div>
                    <div className="landing__att-stats">
                      <div>Masuk: <strong>08:58 WIB</strong></div>
                      <div>Durasi: <strong>4 jam 32 mnt</strong></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Grid of Portfolio Cards with Staggered 3D Tilt Scroll Animation */}
        <div className="landing__grid">
          {PORTFOLIO_PRODUCTS.map((prod, idx) => (
            <article
              key={prod.id}
              className="landing__card landing__card--interactive"
              data-reveal
              data-reveal-direction={idx % 2 === 0 ? 'tilt-left' : 'tilt-right'}
              onClick={() => setActiveTab(prod.id)}
            >
              <div className="landing__card-top">
                <span className="landing__card-icon" style={{ background: prod.tone }} aria-hidden="true">
                  {prod.icon}
                </span>
                <span className="landing__card-badge">{prod.badge}</span>
              </div>
              <h3 className="landing__card-title">{prod.title}</h3>
              <p className="landing__card-body">{prod.body}</p>
              <div className="landing__card-link">
                <span>Eksplorasi modul</span> →
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Workflow Steps Section */}
      <section className="landing__section landing__section--alt" id="alur" aria-label="Cara kerja">
        <div className="landing__inner">
          <p className="landing__kicker" data-reveal data-reveal-direction="up">
            Cara Kerja
          </p>
          <h2 className="landing__heading" data-reveal data-reveal-direction="up">
            Dari Nol ke Kantor Digital dalam Empat Langkah
          </h2>
          <ol className="landing__steps">
            {STEPS.map((item, index) => (
              <li
                key={item.step}
                className="landing__step"
                data-reveal
                data-reveal-direction={index % 2 === 0 ? 'left' : 'right'}
              >
                <span className="landing__step-number">{item.step}</span>
                <div>
                  <h3 className="landing__step-title">{item.title}</h3>
                  <p className="landing__step-body">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Stats Section with Scale Reveal */}
      <section className="landing__section landing__inner" id="angka" aria-label="Angka platform">
        <p className="landing__kicker" data-reveal data-reveal-direction="up">
          Performa Teruji
        </p>
        <h2 className="landing__heading" data-reveal data-reveal-direction="up">
          Fondasi Rekayasa Perangkat Lunak yang Solid
        </h2>
        <div className="landing__stats">
          {STATS.map((stat) => (
            <div key={stat.label} className="landing__stat" data-reveal data-reveal-direction="scale">
              <span className="landing__stat-value">{stat.value}</span>
              <span className="landing__stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="landing__section landing__section--cta" id="mulai" aria-label="Mulai sekarang">
        <div className="landing__inner landing__cta-wrap">
          <h2 className="landing__heading" data-reveal data-reveal-direction="up">
            Siap memindahkan operasional tim ke ekosistem terpadu?
          </h2>
          <p className="landing__lede" data-reveal data-reveal-direction="up">
            Gunakan versi Web, unduh APK Android, atau jalankan aplikasi EXE Desktop sekarang.
          </p>
          <a className="landing__cta landing__cta--big" href="#atas" data-reveal data-reveal-direction="scale">
            Mulai Sekarang — Bebas Hambatan
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing__footer">
        <div className="landing__inner">
          <span className="landing__brand landing__brand--footer">SOFO</span>
          <p className="landing__footer-note">
            © {new Date().getFullYear()} SOFO — SoulOffice. All-in-One Digital Office & Community Ecosystem.
          </p>
        </div>
      </footer>
    </div>
  );
}

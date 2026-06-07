import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings, LogIn, Sparkles } from "lucide-react";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

const LOGO_URL = "/manus-storage/teeb-logo_ab292981.jpeg";

// Saffron particle component
function SaffronParticles() {
  const particles = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 8,
    duration: 6 + Math.random() * 8,
    size: 3 + Math.random() * 5,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full saffron-particle"
          style={{
            left: `${p.left}%`,
            bottom: "-20px",
            width: `${p.size}px`,
            height: `${p.size * 0.3}px`,
            background: `oklch(0.82 0.18 ${70 + Math.random() * 20})`,
            boxShadow: `0 0 ${p.size * 2}px oklch(0.82 0.18 75 / 0.8)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
          }}
        />
      ))}
    </div>
  );
}

// Decorative Arabic ornament
function ArabicOrnament({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 40" className={className} fill="currentColor">
      <path d="M100 5 L110 20 L100 35 L90 20 Z" opacity="0.6" />
      <path d="M80 20 Q90 5 100 20 Q110 5 120 20" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.8" />
      <circle cx="100" cy="20" r="3" opacity="0.9" />
      <circle cx="70" cy="20" r="2" opacity="0.6" />
      <circle cx="130" cy="20" r="2" opacity="0.6" />
      <line x1="10" y1="20" x2="65" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="135" y1="20" x2="190" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <path d="M20 20 L25 15 L30 20 L25 25 Z" opacity="0.4" />
      <path d="M170 20 L175 15 L180 20 L175 25 Z" opacity="0.4" />
    </svg>
  );
}

export default function Landing() {
  const [, setLocation] = useLocation();
  const { data: settings } = trpc.shop.getSettings.useQuery();
  const [showSettingsHint, setShowSettingsHint] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "admin";

  const shopName = settings?.shopName ?? "طيب الحي للعود والأدهان";
  const logoUrl = settings?.logoUrl ?? LOGO_URL;

  return (
    <div className="min-h-screen relative overflow-hidden" dir="rtl">
      {/* Background layers */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url('/manus-storage/oud-bg_abfed899.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* Dark overlay for readability */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse at 20% 50%, oklch(0.25 0.08 50 / 0.7) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 20%, oklch(0.20 0.06 40 / 0.6) 0%, transparent 50%),
            radial-gradient(ellipse at 60% 80%, oklch(0.18 0.05 70 / 0.5) 0%, transparent 50%),
            linear-gradient(135deg, oklch(0.06 0.02 50 / 0.88) 0%, oklch(0.10 0.03 60 / 0.82) 40%, oklch(0.08 0.02 40 / 0.88) 100%)
          `,
        }}
      />

      {/* Ornate background pattern */}
      <div
        className="fixed inset-0 z-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9a84c' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E" )`,
        }}
      />

      {/* Saffron particles */}
      <SaffronParticles />

      {/* Top navigation bar */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="border-amber-600/40 text-amber-400 hover:bg-amber-900/30 hover:border-amber-500 gap-2 text-sm"
              onClick={() => setLocation("/settings")}
              title="الإعدادات"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">الإعدادات</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-500 text-white gap-2 px-6 font-medium shadow-lg shadow-amber-900/40"
              onClick={() => setLocation("/dashboard")}
            >
              <Sparkles className="w-4 h-4" />
              لوحة التحكم
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-500 text-white gap-2 px-6 font-medium shadow-lg shadow-amber-900/40"
              onClick={() => { window.location.href = getLoginUrl(); }}
            >
              <LogIn className="w-4 h-4" />
              تسجيل الدخول
            </Button>
          )}
        </div>
      </nav>

      {/* Main hero content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 text-center">
        <ArabicOrnament className="w-48 text-amber-500/60 mb-6" />

        {/* Logo */}
        <div className="relative mb-8 group">
          <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-2xl scale-110 group-hover:scale-125 transition-transform duration-700" />
          <div
            className="relative w-44 h-44 rounded-full overflow-hidden border-2 border-amber-500/60 shadow-2xl shadow-amber-900/60"
            style={{
              boxShadow: "0 0 40px oklch(0.78 0.12 75 / 0.4), 0 0 80px oklch(0.78 0.12 75 / 0.2)",
            }}
          >
            <img
              src={logoUrl}
              alt="شعار طيب الحي"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = LOGO_URL;
              }}
            />
          </div>
          <div className="absolute inset-0 rounded-full border border-amber-400/30 scale-110 animate-pulse" />
        </div>

        {/* Shop name */}
        <h1
          className="text-5xl sm:text-6xl font-bold mb-3 gold-shimmer"
          style={{ fontFamily: "'Amiri', serif" }}
        >
          {shopName}
        </h1>

        <div className="flex items-center gap-3 text-amber-400/70 mb-2">
          <Sparkles className="w-4 h-4" />
          <p className="text-lg tracking-widest font-light" style={{ fontFamily: "'Amiri', serif" }}>
            Teeb Al Hai — Oud & Perfumes
          </p>
          <Sparkles className="w-4 h-4" />
        </div>

        <ArabicOrnament className="w-48 text-amber-500/60 mt-4 mb-10 rotate-180" />

        <p className="text-amber-200/60 text-base max-w-md leading-relaxed mb-10">
          نظام إدارة متكامل للعطور والعود والأدهان — كاشير ذكي، مخزون دقيق، وتقارير فورية
        </p>

        {/* CTA Button */}
        <Button
          size="lg"
          className="bg-amber-600 hover:bg-amber-500 text-white px-12 py-6 text-lg font-semibold shadow-2xl shadow-amber-900/50 rounded-full gap-3 transition-all duration-300 hover:scale-105 hover:shadow-amber-700/60"
          onClick={() => { window.location.href = getLoginUrl(); }}
        >
          <LogIn className="w-5 h-5" />
          دخول النظام
        </Button>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mt-12">
          {[
            "🔥 إدارة المخزون",
            "🧾 فواتير مرقمة",
            "📊 إحصائيات دقيقة",
            "🤖 مستشار ذكي",
            "⚡ كاشير سريع",
          ].map((feat) => (
            <span
              key={feat}
              className="px-4 py-2 rounded-full text-sm border border-amber-600/30 text-amber-300/80 bg-amber-900/20 backdrop-blur-sm"
            >
              {feat}
            </span>
          ))}
        </div>
      </main>

      {/* Bottom decorative band */}
      <div
        className="fixed bottom-0 left-0 right-0 h-1 z-20"
        style={{
          background: "linear-gradient(90deg, transparent, oklch(0.78 0.12 75), oklch(0.92 0.15 85), oklch(0.78 0.12 75), transparent)",
        }}
      />
    </div>
  );
}

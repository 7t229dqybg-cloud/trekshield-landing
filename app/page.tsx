"use client";

import React, { useState, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";

// Dynamically import interactive client components to reduce initial JS weight
const OrderForm = dynamic(() => import("./components/OrderForm"), {
  ssr: false,
  loading: () => <div className="shimmer h-[450px] w-full rounded-3xl animate-pulse" />,
});

const AdminLoginDrawer = dynamic(() => import("../components/AdminLoginDrawer"), {
  ssr: false,
  loading: () => null,
});

const LazySection = dynamic(() => import("./components/LazySection"), {
  ssr: false,
});

const products = [
  {
    name: "Premium Wax",
    subtitle: "Chống chịu mọi địa hình",
    image: "/images/premium-wax.jpg",
    description:
      "Khả năng chống nước vượt trội, bám lâu, độ bền cao, phù hợp với vải chuyên dụng và người đã có kinh nghiệm.",
    tags: ["Chống nước cao", "Bám lâu", "Độ bền tốt", "Cho đồ trekking"],
    note: "Lưu ý: Wax vàng có thể khó thoa hơn, lâu khô hơn và có thể làm đổi màu một số loại vải sáng màu.",
  },
  {
    name: "Super Wax",
    subtitle: "Công thức ưu việt",
    image: "/images/super-wax.jpg",
    description:
      "Wax trắng dễ thoa, nhanh khô, không làm đổi màu quần áo và sử dụng linh hoạt trên nhiều loại vải hơn.",
    tags: ["Dễ thoa", "Nhanh khô", "Không đổi màu", "Dùng linh hoạt"],
    note: "Gợi ý: Phù hợp cho gia đình, dân văn phòng và người mới bắt đầu chăm sóc đồ vải.",
  },
];

const reviews = [
  {
    name: "Minh Anh",
    role: "Nhân viên văn phòng",
    content:
      "Mình dùng cho balô đi mưa nhẹ, nước trượt trên bề mặt rõ hơn. Sáp bám khá chắc sau khi khô.",
  },
  {
    name: "Quốc Huy",
    role: "Người thích leo núi",
    content:
      "Premium Wax hợp với áo khoác trekking của mình. Thoa kỹ một chút nhưng cảm giác lớp phủ rất bền.",
  },
  {
    name: "Chị Hạnh",
    role: "Khách hàng gia đình",
    content:
      "Super Wax dễ dùng, không bị đổi màu áo sáng. Mình mua để chăm sóc túi và áo khoác cho cả nhà.",
  },
];

export default function HomePage() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initialize Dark Mode based on localStorage or system settings
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-colors duration-300">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#" className="flex items-center shrink-0">
            <Image
              src="/images/trekshield-logo.png"
              alt="TrekShield Logo"
              width={160}
              height={70}
              priority
              className="h-10 w-auto object-contain dark:brightness-125"
            />
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600 dark:text-slate-300">
            <a href="#mood" className="hover:text-brand-500 dark:hover:text-emerald-400 transition-colors">Cảm hứng</a>
            <a href="#cong-dung" className="hover:text-brand-500 dark:hover:text-emerald-400 transition-colors">Công dụng</a>
            <a href="#select-wax" className="hover:text-brand-500 dark:hover:text-emerald-400 transition-colors">Chọn sáp</a>
            <a href="#hinh-anh" className="hover:text-brand-500 dark:hover:text-emerald-400 transition-colors">Hình ảnh</a>
            <a href="#cam-nang" className="hover:text-brand-500 dark:hover:text-emerald-400 transition-colors">Kiến thức</a>
          </nav>

          {/* Action Bar */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all outline-none"
              title="Chuyển chế độ sáng/tối"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>

            {/* Admin entry point lock */}
            <button
              onClick={() => setLoginOpen(true)}
              className="p-2.5 bg-emerald-50/70 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 border border-emerald-100 dark:border-emerald-900/60 rounded-full text-brand-600 dark:text-emerald-400 transition-all outline-none shrink-0"
              title="Cổng vào Quản trị Admin"
            >
              🔐
            </button>

            <a
              className="hidden sm:inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-linear-to-r from-brand-500 to-brand-700 hover:from-brand-600 hover:to-brand-800 text-white font-extrabold text-sm shadow-md shadow-brand-500/20 hover:shadow-lg hover:shadow-brand-500/30 hover:-translate-y-0.5 transition-all duration-200"
              href="#dat-hang"
            >
              Đặt hàng
            </a>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg md:hidden text-slate-600 dark:text-slate-350 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-6 space-y-4 shadow-xl z-40 animate-fadeIn">
            <a
              href="#mood"
              onClick={() => setMobileMenuOpen(false)}
              className="block font-bold text-slate-700 dark:text-slate-200 hover:text-brand-500"
            >
              Cảm hứng hành trình
            </a>
            <a
              href="#cong-dung"
              onClick={() => setMobileMenuOpen(false)}
              className="block font-bold text-slate-700 dark:text-slate-200 hover:text-brand-500"
            >
              Công dụng bảo vệ
            </a>
            <a
              href="#select-wax"
              onClick={() => setMobileMenuOpen(false)}
              className="block font-bold text-slate-700 dark:text-slate-200 hover:text-brand-500"
            >
              Chọn loại sáp
            </a>
            <a
              href="#hinh-anh"
              onClick={() => setMobileMenuOpen(false)}
              className="block font-bold text-slate-700 dark:text-slate-200 hover:text-brand-500"
            >
              Hình ảnh thực tế
            </a>
            <a
              href="#cam-nang"
              onClick={() => setMobileMenuOpen(false)}
              className="block font-bold text-slate-700 dark:text-slate-200 hover:text-brand-500"
            >
              Kiến thức leo núi
            </a>
            <a
              href="#dat-hang"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-center px-6 py-3 rounded-xl bg-brand-500 text-white font-bold"
            >
              Đặt hàng ngay
            </a>
          </div>
        )}
      </header>

      <main id="top">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-linear-to-b from-brand-50/60 via-slate-50 to-slate-50 dark:from-brand-950/20 dark:via-slate-950 dark:to-slate-950 py-16 lg:py-28">
          {/* Hero background image */}
          <div className="absolute inset-0 z-0 pointer-events-none select-none">
            <Image
              src="/images/banners/trekshield-hero-clean.png"
              alt="TrekShield Hero Background"
              fill
              className="object-cover object-right opacity-95 dark:opacity-20 transition-opacity duration-500"
              priority
            />
            {/* Horizontal gradient overlay to ensure text readability on the left, while keeping the right image crystal clear */}
            <div className="absolute inset-0 bg-linear-to-r from-slate-50 via-slate-50/20 to-transparent dark:from-slate-950 dark:via-slate-950/20 dark:to-transparent hidden lg:block" />
            {/* Vertical overlay for mobile/tablet screens */}
            <div className="absolute inset-0 bg-linear-to-b from-slate-50/80 via-slate-50/10 to-slate-50 dark:from-slate-950/80 dark:via-slate-950/10 dark:to-slate-950 lg:hidden" />
          </div>

          {/* Subtle background nature light blobs */}
          <div className="absolute top-1/4 left-1/10 w-96 h-96 rounded-full bg-brand-500/5 dark:bg-brand-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 right-1/10 w-80 h-80 rounded-full bg-teal-500/5 dark:bg-teal-500/10 blur-3xl pointer-events-none" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Text & CTA */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-800 dark:text-brand-300 text-xs font-black tracking-wider uppercase">
                  🌲 TrekShield Wax
                </span>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                  Bảo vệ đồ trekking trước{" "}
                  <span className="bg-linear-to-r from-brand-500 via-emerald-600 to-teal-500 bg-clip-text text-transparent dark:from-brand-400 dark:to-teal-300">
                    mọi hành trình
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                  TrekShield Wax giúp balô, áo khoác, giày vải và đồ outdoor của bạn có thêm lớp bảo vệ chủ động, hạn chế thấm ẩm từ sương núi, cỏ ướt và mưa nhẹ.
                </p>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                  <a
                    href="#select-wax"
                    className="px-8 py-3.5 rounded-full bg-linear-to-r from-brand-500 to-brand-700 hover:from-brand-600 hover:to-brand-800 text-white font-extrabold text-sm shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    Xem các loại sáp
                  </a>
                  <a
                    href="#dat-hang"
                    className="px-8 py-3.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-850 dark:text-slate-100 font-extrabold text-sm hover:-translate-y-0.5 transition-all duration-200"
                  >
                    Đặt hàng nhanh
                  </a>
                </div>

                <div className="pt-4 flex flex-wrap justify-center lg:justify-start items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-450">
                  <span className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-full border border-slate-150/40 dark:border-slate-850">
                    💧 Hạn chế thấm nước
                  </span>
                  <span className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-full border border-slate-150/40 dark:border-slate-850">
                    🎒 Giữ trang bị nhẹ hơn
                  </span>
                  <span className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-full border border-slate-150/40 dark:border-slate-850">
                    🍃 Thành phần tự nhiên
                  </span>
                </div>
              </div>

              {/* Right Column: Empty grid to fully show the background product boxes on the right */}
              <div className="hidden lg:block lg:col-span-5 pointer-events-none select-none" />
            </div>
          </div>
        </section>

        {/* Section 2: Trekking Mood Cards */}
        <LazySection>
          <section id="mood" className="py-20 bg-white dark:bg-slate-900 transition-colors duration-300">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto space-y-3">
                <span className="inline-flex px-3.5 py-1 rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-emerald-450 text-xs font-black uppercase tracking-wider">
                  🌅 Cảm hứng hành trình
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Đồ trekking đáng tin cậy cho mỗi chuyến đi
                </h2>
                <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                  Cảm xúc tuyệt vời nhất là khi bạn hòa mình vào thiên nhiên hoang sơ, hít thở không khí núi rừng và cảm nhận sự khô ráo, nhẹ nhàng của từng trang bị bên mình.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
                {[
                  { emoji: "🌅", title: "Sáng sớm lên đường", desc: "Hít thở làn gió lạnh mờ sương trên đỉnh đèo. Trang bị của bạn được phủ sáp bảo vệ chủ động, sẵn sàng đón giọt sương mai." },
                  { emoji: "🌲", title: "Đường rừng sau mưa", desc: "Không lo bãi cỏ ướt hay những chiếc lá thông sũng nước quệt vào trang bị. Lớp sáp bóng giúp giọt nước trượt đi nhanh chóng." },
                  { emoji: "🎒", title: "Balô nhẹ và khô hơn", desc: "Quần áo dự phòng và túi ngủ bên trong luôn an toàn. Balô vải không bị hút ẩm, giữ trọng lượng nhẹ nhất cho đôi vai." },
                  { emoji: "🥾", title: "Giày vải bớt ẩm, dễ chịu", desc: "Tự tin sải bước qua những đoạn đường mòn ẩm ướt mà không sợ tất chân ướt nhẹp hay phồng rộp gót chân." }
                ].map((card, index) => (
                  <article
                    key={index}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-8 hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group"
                  >
                    <div className="inline-flex items-center justify-center text-3xl w-14 h-14 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl mb-6 shadow-sm group-hover:bg-brand-500 group-hover:text-white dark:group-hover:bg-brand-600 group-hover:scale-110 transition-all duration-300">
                      {card.emoji}
                    </div>
                    <h4 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight group-hover:text-brand-500 dark:group-hover:text-emerald-400 transition-colors">
                      {card.title}
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      {card.desc}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </LazySection>

        {/* Section 3: Problem/Solution Split Section */}
        <LazySection>
          <section id="cong-dung" className="py-20 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
                <span className="inline-flex px-3.5 py-1 rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-emerald-455 text-xs font-black uppercase tracking-wider">
                  🛡️ Công dụng TrekShield
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Không phải chuyến đi nào cũng gặp mưa lớn...
                </h2>
                <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                  Nhưng chỉ cần sương ẩm, bãi cỏ ướt hoặc đoạn đường bùn, đồ vải của bạn đã có thể hút nước, nặng hơn và nhanh xuống cấp hơn nếu không được bảo dưỡng.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                {/* Left Card: Problem */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-8 lg:p-10 shadow-sm border-l-4 border-l-rose-500 dark:border-l-rose-600">
                  <span className="inline-flex px-3.5 py-1 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider border border-rose-100 dark:border-rose-900/30 mb-6">
                    ⚠️ Thực tế khắc nghiệt
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight leading-tight">
                    Đồ outdoor dễ xuống cấp từ những chi tiết nhỏ
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium leading-relaxed">
                    Nước ngấm dần qua kẽ vải không chỉ gây khó chịu ngay tại chỗ mà còn hủy hoại trang bị của bạn lâu dài:
                  </p>

                  <div className="space-y-6">
                    {[
                      { num: "01", title: "Balô dễ thấm ẩm", text: "Làm ướt quần áo dự phòng, túi ngủ, bản đồ hoặc các thiết bị điện tử giá trị bên trong." },
                      { num: "02", title: "Giày vải nhanh sờn chỉ", text: "Bùn đất ngấm sâu vào kẽ vải làm thối sợi chỉ khâu, khiến giày mau rách và hỏng đế." },
                      { num: "03", title: "Áo khoác nặng nề bám bẩn", text: "Khi sợi vải ngậm nước, áo gió trở nên nặng trĩu, giảm khả năng cản gió và gây buốt lạnh." }
                    ].map((item, idx) => (
                      <div key={idx} className="flex gap-4">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-xs font-black shrink-0 border border-rose-100 dark:border-rose-900/40 select-none">
                          {item.num}
                        </span>
                        <div>
                          <strong className="block text-slate-800 dark:text-slate-100 font-bold mb-0.5">{item.title}</strong>
                          <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-medium">{item.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Card: Solution */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-8 lg:p-10 shadow-sm border-l-4 border-l-brand-500 dark:border-l-emerald-600">
                  <span className="inline-flex px-3.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-brand-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-100 dark:border-emerald-900/30 mb-6">
                    🛡️ TrekShield chủ động bảo vệ
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight leading-tight">
                    Lớp sáp bảo vệ tự nhiên — khô ráo và nhẹ nhàng
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium leading-relaxed">
                    Tạo ra một lớp màng kỵ nước mỏng bao bọc bên ngoài sợi vải, giúp trang bị bền bỉ hơn qua mọi hành trình:
                  </p>

                  <div className="space-y-6">
                    {[
                      { symbol: "✓", title: "Hạn chế thấm nước", text: "Hỗ trợ chống thấm, đọng nước mưa nhẹ, sương ẩm hoặc bùn đất bắn trên đường đi." },
                      { symbol: "✓", title: "Dễ dàng lau chùi sình lầy", text: "Bùn bẩn chỉ bám bên ngoài lớp sáp, dễ dàng phủi sạch hoặc dùng khăn ướt lau sơ qua." },
                      { symbol: "✓", title: "Giữ trang bị nhẹ nhàng", text: "Vải không hút ẩm giúp trang bị giữ nguyên trọng lượng ban đầu, tiết kiệm sức lực khi leo dốc." }
                    ].map((item, idx) => (
                      <div key={idx} className="flex gap-4">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-50 dark:bg-emerald-950/60 text-brand-600 dark:text-emerald-400 text-sm font-black shrink-0 border border-emerald-100 dark:border-emerald-900/40 select-none">
                          {item.symbol}
                        </span>
                        <div>
                          <strong className="block text-slate-800 dark:text-slate-100 font-bold mb-0.5">{item.title}</strong>
                          <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-medium">{item.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Splitted Bottom Quote */}
              <div className="max-w-4xl mx-auto mt-16 text-center border-t border-slate-200/60 dark:border-slate-800/80 pt-10">
                <blockquote className="text-base sm:text-lg italic font-extrabold text-slate-700 dark:text-slate-350 leading-relaxed relative px-8">
                  <span className="text-5xl text-brand-200 dark:text-brand-900/40 absolute -top-4 left-0 select-none">“</span>
                  Bảo vệ đồ trước chuyến đi là một thói quen nhỏ, nhưng tạo ra khác biệt lớn khi bạn bước vào rừng, leo dốc hoặc di chuyển trong thời tiết thay đổi. Bạn không kiểm soát được thời tiết. Nhưng bạn có thể chuẩn bị cho balô, áo khoác và giày vải tốt hơn.
                  <span className="text-5xl text-brand-200 dark:text-brand-900/40 absolute -bottom-10 right-0 select-none">”</span>
                </blockquote>
              </div>
            </div>
          </section>
        </LazySection>

        {/* Section 4: Visual Before/After Comparison */}
        <LazySection>
          <section id="so-sanh" className="py-20 bg-white dark:bg-slate-900 transition-colors duration-300">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
                <span className="inline-flex px-3.5 py-1 rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-emerald-450 text-xs font-black uppercase tracking-wider">
                  ⚖️ So sánh hiệu quả
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  So sánh trực quan trước và sau khi bảo vệ
                </h2>
                <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                  Chỉ một lớp sáp mỏng có thể tạo khác biệt rõ rệt cho balô, áo khoác và giày vải khi gặp sương ẩm, mưa nhẹ hoặc bề mặt ướt.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Before Card */}
                <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm text-center relative overflow-hidden">
                  <span className="absolute top-4 right-4 px-2.5 py-1 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-455 text-[10px] font-black uppercase tracking-wider border border-rose-200 dark:border-rose-900">
                    Chưa xử lý
                  </span>

                  {/* Wet visual container */}
                  <div className="w-full h-44 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-center justify-center text-4xl select-none mb-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-sky-900/10 pointer-events-none animate-pulse-slow" />
                    🌧️
                  </div>

                  <h4 className="text-lg font-black text-slate-950 dark:text-slate-100 tracking-tight mb-3">
                    Dễ hút ẩm, nặng hơn, khó chịu hơn
                  </h4>
                  <ul className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium space-y-2 text-left max-w-sm mx-auto">
                    <li className="flex items-center gap-2">❌ Vải dễ thấm nước khi gặp mưa nhẹ hoặc sương ẩm</li>
                    <li className="flex items-center gap-2">❌ Balô, giày vải và áo gió có thể sũng nước và nặng hơn</li>
                    <li className="flex items-center gap-2">❌ Đồ dễ bám bùn bẩn, ẩm mốc mục chỉ và hư phom vải</li>
                  </ul>
                </div>

                {/* Arrow Connector */}
                <div className="lg:col-span-2 text-center flex flex-col justify-center items-center py-4 lg:py-0">
                  <span className="text-xs text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider mb-2">Sự Khác Biệt</span>
                  <div className="text-2xl text-slate-350 dark:text-slate-600 hidden lg:block">➔</div>
                  <div className="text-2xl text-slate-350 dark:text-slate-600 lg:hidden">↓</div>
                </div>

                {/* After Card */}
                <div className="lg:col-span-5 bg-emerald-50/20 dark:bg-slate-950 border border-brand-200/50 dark:border-slate-800/80 rounded-3xl p-6 shadow-md text-center relative overflow-hidden">
                  <span className="absolute top-4 right-4 px-2.5 py-1 rounded bg-brand-500 text-white text-[10px] font-black uppercase tracking-wider shadow">
                    Đã bảo vệ
                  </span>

                  {/* Dry visual container */}
                  <div className="w-full h-44 bg-linear-to-br from-brand-500/10 to-teal-500/10 border border-brand-200/30 dark:border-slate-850 rounded-2xl flex items-center justify-center text-4xl select-none mb-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-brand-500/5 pointer-events-none" />
                    🛡️✨
                  </div>

                  <h4 className="text-lg font-black text-slate-950 dark:text-slate-100 tracking-tight mb-3">
                    Nước trượt tốt hơn, đồ tự tin hơn
                  </h4>
                  <ul className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium space-y-2 text-left max-w-sm mx-auto">
                    <li className="flex items-center gap-2 text-brand-600 dark:text-emerald-450">✓ Tạo thêm lớp bảo vệ kỵ nước mỏng bám sát sợi thớ</li>
                    <li className="flex items-center gap-2 text-brand-600 dark:text-emerald-450">✓ Hỗ trợ giữ ba lô, quần áo và giày khô thoáng</li>
                    <li className="flex items-center gap-2 text-brand-600 dark:text-emerald-450">✓ Giúp sình lầy bùn đất trôi nhẹ, tăng độ bền chỉ khâu</li>
                  </ul>
                </div>
              </div>

              {/* Use case quick strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 border-t border-slate-100 dark:border-slate-850 pt-10">
                {[
                  { icon: "🎒", title: "Balô trekking", desc: "Hạn chế ẩm mặt ngoài balo." },
                  { icon: "🧥", title: "Áo khoác vải", desc: "Nước gió trượt tốt, ít bám bẩn." },
                  { icon: "🥾", title: "Giày vải canvas", desc: "Giữ gót chân khô thoáng tốt." },
                  { icon: "👜", title: "Túi canvas thô", desc: "Chống chịu sương và ma sát bẩn." }
                ].map((chip, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-150/40 dark:border-slate-850 text-center space-y-1">
                    <span className="text-2xl inline-block mb-1">{chip.icon}</span>
                    <strong className="block text-xs font-black text-slate-900 dark:text-white">{chip.title}</strong>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{chip.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </LazySection>

        {/* Section 5: Product comparison and wax selection */}
        <LazySection>
          <section id="select-wax" className="py-20 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
                <span className="inline-flex px-3.5 py-1 rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-emerald-450 text-xs font-black uppercase tracking-wider">
                  🧬 Chọn sáp bảo vệ
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Chọn đúng loại sáp cho đúng nhu cầu
                </h2>
                <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                  Chúng tôi phát triển hai dòng công thức tối ưu cho từng chất liệu vải và điều kiện thời tiết dã ngoại:
                </p>
              </div>

              {/* Redesigned comparison pricing/features matrix */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Super Wax Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 rounded-3xl p-8 lg:p-10 shadow-sm relative overflow-hidden group hover:border-brand-500 dark:hover:border-brand-500 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-brand-50 dark:bg-brand-950/30 rounded-bl-full pointer-events-none select-none flex items-start justify-end p-4 text-2xl">
                    🤍
                  </div>

                  <div className="space-y-4">
                    <span className="inline-block px-3.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-brand-700 dark:text-emerald-450 text-xs font-black uppercase tracking-wide">
                      Dễ dùng cho người mới
                    </span>
                    <h3 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">
                      Super Wax — Sáp trắng an toàn vải màu
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                      “Wax trắng dễ thoa, nhanh khô, không làm đổi màu quần áo và sử dụng linh hoạt trên nhiều loại vải hơn.”
                    </p>
                  </div>

                  <div className="mt-8 border-t border-slate-100 dark:border-slate-850 pt-6 space-y-4">
                    <h5 className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Phù hợp tốt nhất cho:</h5>
                    <ul className="space-y-3.5 text-xs text-slate-600 dark:text-slate-355 font-medium">
                      <li className="flex items-center gap-2">🟢 Quần áo sáng màu, áo gió dã ngoại thớ mỏng nhẹ</li>
                      <li className="flex items-center gap-2">🟢 Giày vải canvas thời trang, túi xách, ba lô sử dụng đi phố</li>
                      <li className="flex items-center gap-2">🟢 Thao tác cực nhanh, khô sạch tức thì, an tâm chất màu gốc</li>
                      <li className="flex items-center gap-2">🟢 Đô thị, dã ngoại cuối tuần, gia đình cắm trại nhẹ nhàng</li>
                    </ul>
                  </div>

                  <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">Giá bán lẻ</span>
                      <strong className="text-2xl font-black text-slate-950 dark:text-white">180.000đ <small className="text-xs text-slate-400 dark:text-slate-500 font-medium">/ hộp</small></strong>
                    </div>
                    <a
                      href="#dat-hang"
                      className="px-6 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-extrabold shadow-sm transition-all"
                    >
                      Chọn sáp trắng
                    </a>
                  </div>
                </div>

                {/* Premium Wax Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 rounded-3xl p-8 lg:p-10 shadow-sm relative overflow-hidden group hover:border-brand-500 dark:hover:border-brand-500 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-brand-50 dark:bg-brand-950/30 rounded-bl-full pointer-events-none select-none flex items-start justify-end p-4 text-2xl">
                    💛
                  </div>

                  <div className="space-y-4">
                    <span className="inline-block px-3.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-black uppercase tracking-wide">
                      Chuyên dùng địa hình khắc nghiệt
                    </span>
                    <h3 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">
                      Premium Wax — Sáp vàng bám siêu bền
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                      “Khả năng chống nước vượt trội, bám lâu, độ bền cao, phù hợp với vải chuyên dụng và người đã có kinh nghiệm.”
                    </p>
                  </div>

                  <div className="mt-8 border-t border-slate-100 dark:border-slate-850 pt-6 space-y-4">
                    <h5 className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Phù hợp tốt nhất cho:</h5>
                    <ul className="space-y-3.5 text-xs text-slate-600 dark:text-slate-355 font-medium">
                      <li className="flex items-center gap-2">🟡 Vải canvas dệt dày, vải bạt thô ráp, cotton dù chịu tải</li>
                      <li className="flex items-center gap-2">🟡 Balo trekking tải nặng chuyên dụng, túi đeo hông mài mòn</li>
                      <li className="flex items-center gap-2">🟡 Đi rừng rậm nhiệt đới ẩm ướt, leo dốc dài ngày, bushcraft cắm trại hoang dã</li>
                      <li className="flex items-center gap-2">🟡 Người dùng ưu tiên khả năng chống thấm nước tối đa và độ bền dai dẳng</li>
                    </ul>
                  </div>

                  <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">Giá bán lẻ</span>
                      <strong className="text-2xl font-black text-slate-950 dark:text-white">160.000đ <small className="text-xs text-slate-400 dark:text-slate-500 font-medium">/ hộp</small></strong>
                    </div>
                    <a
                      href="#dat-hang"
                      className="px-6 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-extrabold shadow-sm transition-all"
                    >
                      Chọn sáp vàng
                    </a>
                  </div>
                </div>
              </div>

              {/* Combo Highlight Banner */}
              <div className="mt-12 bg-linear-to-r from-brand-700 to-teal-800 text-white rounded-3xl p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-10 w-44 h-44 rounded-full bg-white/5 blur-xl pointer-events-none select-none" />

                <div className="space-y-2 text-center md:text-left relative z-10">
                  <span className="inline-block bg-white/15 px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider">✨ Gợi ý lựa chọn</span>
                  <h4 className="text-xl font-extrabold tracking-tight">Combo TrekShield — Giải pháp trọn vẹn và tối ưu nhất</h4>
                  <p className="text-xs text-teal-100 font-medium max-w-2xl leading-relaxed">
                    Sở hữu 1 sáp trắng Super Wax cho đồ mỏng màu sáng và 1 sáp vàng Premium Wax cho balo thô dày. Sự phối hợp linh hoạt cho toàn bộ tủ đồ trekking của bạn.
                  </p>
                </div>

                <div className="shrink-0 relative z-10">
                  <a
                    href="#dat-hang"
                    className="inline-flex px-8 py-3.5 bg-white hover:bg-teal-50 text-brand-750 font-black rounded-full text-xs shadow hover:scale-105 active:scale-100 transition-all outline-none"
                  >
                    Chọn Combo 329K
                  </a>
                </div>
              </div>
            </div>
          </section>
        </LazySection>

        {/* Section 6: Detailed Use Cases Section */}
        <LazySection>
          <section id="san-pham" className="py-20 bg-white dark:bg-slate-900 transition-colors duration-300">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
                <span className="inline-flex px-3.5 py-1 rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-emerald-450 text-xs font-black uppercase tracking-wider">
                  ⛺ Giải pháp trang bị
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Giải pháp bảo vệ cho từng loại trang bị
                </h2>
                <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                  Mỗi trang bị outdoor đều có đặc thù sợi vải riêng. Hãy xem TrekShield Wax hỗ trợ bảo vệ chúng tối ưu:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { icon: "🎒", title: "Balô Trekking", problem: "Thấm ẩm khi gặp mưa bụi hoặc sương núi kéo dài, làm ẩm ướt đồ ngủ bên trong và làm balo nặng vai hơn.", solution: "Tạo màng trượt nước hiệu quả trên nắp và thớ balo ngoài, giữ khoang hành lý khô ráo và nhẹ nhàng." },
                  { icon: "🧥", title: "Áo khoác / Áo gió", problem: "Nước ngấm qua thớ vải gió làm áo dính chặt vào da, mất phom cản gió và khiến cơ thể mất nhiệt rất nhanh.", solution: "Giọt nước bám đọng vo tròn trượt đi nhanh chóng trên mặt vải, giữ áo khoác nhẹ cản gió tốt hơn." },
                  { icon: "🥾", title: "Giày vải / Canvas", problem: "Cỏ ướt ven đường mòn và bùn lầy ven suối thấm trực tiếp qua giày gây ẩm tất, phồng rộp và rách thớ chỉ khâu.", solution: "Ngăn nước bẩn và bùn xâm lấn sâu thớ vải giày, bảo vệ keo đế giày thô ráp bền bỉ hơn." },
                  { icon: "⛺", title: "Đồ camping & Phụ kiện", problem: "Các đường kim mũi chỉ sờn rách ở lều trại, bao đựng đồ dã ngoại bị sương đêm rỉ nước ẩm ướt vào trong.", solution: "Phủ sáp điền đầy các kẽ thớ kim khâu sờn và góc chịu lực mạnh, tạo lớp chống thấm bổ trợ an toàn." }
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-brand-500 transition-all duration-300 flex flex-col justify-between">
                    <div>
                      <span className="text-4xl inline-block mb-4 select-none">{item.icon}</span>
                      <h4 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">{item.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4 border-l-2 border-slate-250 dark:border-slate-800 pl-3">
                        <strong className="block text-slate-750 dark:text-slate-300 text-[10px] uppercase mb-0.5">Trước khi wax:</strong>
                        {item.problem}
                      </p>
                    </div>
                    <p className="text-xs text-slate-650 dark:text-slate-350 font-semibold leading-relaxed border-l-2 border-brand-500 pl-3">
                      <strong className="block text-brand-600 dark:text-emerald-450 text-[10px] uppercase mb-0.5">Sau khi wax:</strong>
                      {item.solution}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </LazySection>

        {/* Section 7: Visual Gallery Section */}
        <LazySection>
          <section id="hinh-anh" className="py-20 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
                <span className="inline-flex px-3.5 py-1 rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-emerald-450 text-xs font-black uppercase tracking-wider">
                  📷 Hình ảnh sản phẩm
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Thiết kế mộc mạc, tự nhiên, đúng tinh thần outdoor
                </h2>
                <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                  Bao bì giấy kraft tối giản kết hợp tone xanh thiên nhiên giúp TrekShield tạo cảm giác sạch sẽ, tin cậy và chuyên nghiệp cho góc chuẩn bị đồ phượt của bạn.
                </p>
              </div>

              {/* Grid Images */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="relative h-72 rounded-3xl overflow-hidden shadow border border-slate-200/50 dark:border-slate-800">
                  <Image
                    src="/images/wax-boxes.jpg"
                    alt="Hộp sản phẩm TrekShield Wax"
                    fill
                    sizes="(max-width: 900px) 100vw, 33vw"
                    className="object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="relative h-72 rounded-3xl overflow-hidden shadow border border-slate-200/50 dark:border-slate-800">
                  <Image
                    src="/images/wax-flatlay.jpg"
                    alt="Các thanh wax TrekShield"
                    fill
                    sizes="(max-width: 900px) 100vw, 33vw"
                    className="object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="relative h-72 rounded-3xl overflow-hidden shadow border border-slate-200/50 dark:border-slate-800">
                  <Image
                    src="/images/wax-tray.jpg"
                    alt="Sáp TrekShield trên khay gỗ"
                    fill
                    sizes="(max-width: 900px) 100vw, 33vw"
                    className="object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </div>
            </div>
          </section>
        </LazySection>

        {/* Section 8: Trekking Knowledge Section */}
        <LazySection>
          <section id="cam-nang" className="py-20 bg-white dark:bg-slate-900 transition-colors duration-300">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
                <span className="inline-flex px-3.5 py-1 rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-emerald-450 text-xs font-black uppercase tracking-wider">
                  📖 Kiến thức leo núi
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Kiến thức chuẩn bị trước mỗi chuyến hành trình
                </h2>
                <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                  TrekShield không thay thế kỹ năng trekking, nhưng giúp bạn bảo vệ đồ dùng tốt hơn. Tham khảo các cẩm nang dã ngoại, sinh tồn uy tín từ REI Co-op, National Park Service và American Hiking Society.
                </p>
              </div>

              {/* Resources list cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { source: "National Park Service", title: "Hike Smart: Đi bộ đường dài an toàn hơn", desc: "Hướng dẫn cơ bản về chọn giày leo núi phù hợp, nước uống, thực phẩm, thời tiết và các nguyên tắc an toàn khi đi hiking.", link: "https://www.nps.gov/articles/hiking-safety.htm" },
                  { source: "National Park Service", title: "10 vật dụng thiết yếu khi đi dã ngoại", desc: "Danh sách các nhóm đồ quan trọng bao gồm định vị, chống nắng, quần áo dự phòng, đèn pin sơ cứu, nước và lửa sinh tồn.", link: "https://www.nps.gov/articles/10essentials.htm" },
                  { source: "REI Co-op", title: "Checklist chuẩn bị cho một ngày hiking", desc: "Danh sách chi tiết trang thiết bị cần mang theo khi đi hiking trong ngày: balo dã ngoại, nước lọc, sơ cứu và dụng cụ cản gió.", link: "https://www.rei.com/learn/expert-advice/day-hiking-checklist.html" },
                  { source: "REI Co-op", title: "Ten Essentials: Bộ nguyên tắc chuẩn bị", desc: "Giải thích chi tiết vì sao người đi leo núi nên chuẩn bị 10 nhóm vật dụng thiết yếu để tự tin xử lý mọi sự cố thời tiết ngoài trời.", link: "https://www.rei.com/learn/expert-advice/ten-essentials.html" },
                  { source: "American Hiking Society", title: "Hiking cho người mới bắt đầu", desc: "Cẩm nang hướng dẫn cách chọn cung đường mòn phù hợp sức lực, chuẩn bị bản đồ ngoại tuyến, mang đủ nước và bảo dưỡng trang bị.", link: "https://americanhiking.org/hiking-for-beginners-essential-guide/" },
                  { source: "American Red Cross", title: "Checklist bộ sơ cứu khi đi leo núi", desc: "Gợi ý các vật dụng sơ cứu y tế cá nhân quan trọng nên gói gọn cẩn thận trong balo trước khi đi vào môi trường hoang dã.", link: "https://www.redcross.org/take-a-class/resources/articles/hiking-first-aid-kit-checklist" }
                ].map((item, idx) => (
                  <article key={idx} className="bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-brand-650 dark:text-emerald-450 uppercase tracking-wider">{item.source}</span>
                      <h4 className="text-base font-extrabold text-slate-950 dark:text-white tracking-tight leading-tight">{item.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{item.desc}</p>
                    </div>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs font-bold text-brand-500 dark:text-emerald-450 hover:underline mt-4 gap-1 focus:outline-none"
                    >
                      Đọc tài liệu gốc ↗
                    </a>
                  </article>
                ))}
              </div>

              {/* Disclaimer card */}
              <div className="mt-8 p-5 bg-brand-50/50 dark:bg-slate-950 rounded-2xl border border-brand-100/40 dark:border-slate-850 flex gap-3 text-xs text-slate-600 dark:text-slate-400 font-medium max-w-4xl mx-auto">
                <span className="text-base select-none">💡</span>
                <p className="leading-relaxed">
                  <strong>Khuyến cáo từ TrekShield:</strong> Các nguồn tài liệu trên là cẩm nang an toàn được xây dựng độc lập từ các tổ chức chuyên môn uy tín toàn cầu. TrekShield Wax là sản phẩm phụ trợ bảo vệ mặt ngoài thớ vải, không thay thế la bàn, sơ cứu, GPS hay đồ đi mưa chuyên dụng.
                </p>
              </div>
            </div>
          </section>
        </LazySection>

        {/* Section 9: Pricing & Combo */}
        <LazySection>
          <section id="bang-gia" className="py-20 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
                <span className="inline-flex px-3.5 py-1 rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-emerald-450 text-xs font-black uppercase tracking-wider">
                  💰 Giá bán niêm yết
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Gói mua đơn giản, dễ dàng lựa chọn
                </h2>
                <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                  Mức giá niêm yết cạnh tranh đi kèm các quyền lợi tư vấn sử dụng chi tiết theo từng chất liệu vải dã ngoại:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {/* Product 1: Super Wax */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-8 shadow-sm flex flex-col justify-between">
                  <div className="space-y-4 text-center">
                    <span className="text-3xl inline-block select-none">🤍</span>
                    <h3 className="text-lg font-black text-slate-950 dark:text-white">Super Wax</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Dành cho người mới bắt đầu chăm sóc trang bị dã ngoại hằng ngày.</p>
                    <div className="text-3xl font-black text-brand-600 dark:text-emerald-400 pt-2">
                      180.000đ <small className="text-xs text-slate-400 dark:text-slate-500 font-bold">/ hộp</small>
                    </div>
                  </div>

                  <ul className="my-8 space-y-3 text-xs text-slate-605 dark:text-slate-400 font-medium border-t border-slate-100 dark:border-slate-850 pt-6">
                    <li className="flex items-center gap-2">✓ Sáp ong trắng tự nhiên an toàn màu vải</li>
                    <li className="flex items-center gap-2">✓ Cực dễ bôi, khô nhanh sau vài phút</li>
                    <li className="flex items-center gap-2">✓ Dùng linh hoạt giày canvas, áo gió mỏng</li>
                  </ul>

                  <a
                    href="#dat-hang"
                    className="w-full text-center py-2.5 rounded-full border border-brand-500 text-brand-600 dark:text-emerald-450 hover:bg-brand-500 hover:text-white dark:hover:bg-brand-600 transition-colors text-xs font-black"
                  >
                    Chọn Super Wax
                  </a>
                </div>

                {/* Product 2: Combo (Featured) */}
                <div className="bg-white dark:bg-slate-900 border-2 border-brand-500 dark:border-emerald-600 rounded-3xl p-8 shadow-xl flex flex-col justify-between relative">
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-500 dark:bg-emerald-600 text-white font-extrabold text-[10px] px-3.5 py-1 rounded-full uppercase tracking-wider shadow">
                    Bán chạy nhất
                  </span>

                  <div className="space-y-4 text-center">
                    <span className="text-3xl inline-block select-none">✨</span>
                    <h3 className="text-lg font-black text-slate-950 dark:text-white">Combo TrekShield</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Trải nghiệm hoàn hảo nhất cho cả đồ thô dày và đồ mỏng sáng màu.</p>
                    <div className="text-3xl font-black text-brand-600 dark:text-emerald-400 pt-2 animate-pulse-slow">
                      329.000đ <small className="text-xs text-slate-450 dark:text-slate-500 font-bold">/ combo</small>
                    </div>
                  </div>

                  <ul className="my-8 space-y-3 text-xs text-slate-605 dark:text-slate-400 font-medium border-t border-slate-100 dark:border-slate-850 pt-6">
                    <li className="flex items-center gap-2 text-brand-600 dark:text-emerald-450 font-bold">✓ 1 Sáp trắng Super Wax bảo vệ an toàn</li>
                    <li className="flex items-center gap-2 text-brand-600 dark:text-emerald-450 font-bold">✓ 1 Sáp vàng Premium Wax bám siêu bền</li>
                    <li className="flex items-center gap-2 text-brand-600 dark:text-emerald-450 font-bold">✓ Hướng dẫn thoa sáp theo từng chất liệu</li>
                  </ul>

                  <a
                    href="#dat-hang"
                    className="w-full text-center py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white transition-colors text-xs font-black shadow-md shadow-brand-500/20"
                  >
                    Đặt mua Combo ngay
                  </a>
                </div>

                {/* Product 3: Premium Wax */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-8 shadow-sm flex flex-col justify-between">
                  <div className="space-y-4 text-center">
                    <span className="text-3xl inline-block select-none">💛</span>
                    <h3 className="text-lg font-black text-slate-950 dark:text-white">Premium Wax</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Lựa chọn hàng đầu cho đồ trekking nặng thô, cọ xát nhiều ngoài rừng.</p>
                    <div className="text-3xl font-black text-brand-600 dark:text-emerald-400 pt-2">
                      160.000đ <small className="text-xs text-slate-400 dark:text-slate-500 font-bold">/ hộp</small>
                    </div>
                  </div>

                  <ul className="my-8 space-y-3 text-xs text-slate-605 dark:text-slate-400 font-medium border-t border-slate-100 dark:border-slate-850 pt-6">
                    <li className="flex items-center gap-2">✓ Sáp vàng tự nhiên chống thấm nước siêu tốt</li>
                    <li className="flex items-center gap-2">✓ Độ bám cực trơ và lâu mài mòn dưới mưa lớn</li>
                    <li className="flex items-center gap-2">✓ Cho vải canvas dày dặn, balo chuyên dụng</li>
                  </ul>

                  <a
                    href="#dat-hang"
                    className="w-full text-center py-2.5 rounded-full border border-brand-500 text-brand-600 dark:text-emerald-450 hover:bg-brand-500 hover:text-white dark:hover:bg-brand-600 transition-colors text-xs font-black"
                  >
                    Chọn Premium Wax
                  </a>
                </div>
              </div>
            </div>
          </section>
        </LazySection>

        {/* Section 10: Reviews Section */}
        <LazySection>
          <section id="reviews" className="py-20 bg-white dark:bg-slate-900 transition-colors duration-300">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
                <span className="inline-flex px-3.5 py-1 rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-emerald-450 text-xs font-black uppercase tracking-wider">
                  ⭐ Review khách hàng
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Được tin cậy bởi những người yêu thích xê dịch
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {reviews.map((review, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-8 shadow-sm flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="text-brand-500 dark:text-emerald-400 text-lg font-black tracking-widest">
                        ⭐⭐⭐⭐⭐
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-semibold italic">
                        “{review.content}”
                      </p>
                    </div>

                    <div className="mt-8 pt-4 border-t border-slate-200/40 dark:border-slate-850 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center font-black select-none shadow">
                        {review.name.charAt(0)}
                      </div>
                      <div>
                        <strong className="block text-xs font-black text-slate-950 dark:text-white">{review.name}</strong>
                        <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">{review.role}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </LazySection>

        {/* Section 11: FAQ Section */}
        <LazySection>
          <section id="faq" className="py-20 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="mx-auto max-w-3xl px-4 sm:px-6">
              <div className="text-center space-y-3 mb-12">
                <span className="inline-flex px-3.5 py-1 rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-emerald-455 text-xs font-black uppercase tracking-wider">
                  ❔ FAQ
                </span>
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Câu hỏi thường gặp
                </h2>
              </div>

              <div className="space-y-4">
                {[
                  { q: "TrekShield dùng cho những chất liệu nào?", a: "TrekShield phù hợp với nhiều đồ vải như balô, túi vải canvas, áo gió dã ngoại thô ráp, giày vải và đồ dã ngoại thô dày. Bạn nên thoa thử sáp trên vùng nhỏ khuất của trang bị trước khi bôi diện rộng để kiểm tra độ phù hợp màu vải." },
                  { q: "Premium Wax và Super Wax khác nhau thế nào?", a: "Premium Wax bám siêu bền bỉ, chống thấm kỵ nước bền lâu hơn nhưng sáp màu vàng thô dẻo hơn, cần sấy kỹ. Super Wax trắng mềm mịn hơn, thoa dễ dàng, cực nhanh khô và được thiết kế chuyên biệt để hạn chế đổi màu trên thớ vải gió sáng màu." },
                  { q: "Wax có làm đổi màu vải không?", a: "Premium Wax màu vàng tự nhiên có thể làm sẫm nhẹ tông màu của vải thô sáng màu (ví dụ cotton trắng, vàng cát). Super Wax trắng tinh khiết được thiết kế đặc thù để hạn chế tối đa nguy cơ làm biến đổi màu thớ vải sáng." },
                  { q: "Bao lâu cần thoa lại một lần?", a: "Tùy thuộc vào tần suất hoạt động ngoài trời cọ xát và số lượng trận mưa thực tế của hành trình. Thông thường với trang bị hoạt động cường độ cao, bạn nên kiểm tra lớp phủ kỵ nước và thoa lại bảo dưỡng sau mỗi vài tuần hoặc trước mỗi chuyến đi dài ngày." }
                ].map((item, idx) => (
                  <details
                    key={idx}
                    className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl px-6 py-4 shadow-sm outline-none group cursor-pointer"
                  >
                    <summary className="font-extrabold text-slate-900 dark:text-white text-sm list-none flex items-center justify-between focus:outline-none">
                      <span>{item.q}</span>
                      <span className="text-slate-400 group-open:rotate-180 transition-transform duration-200">▼</span>
                    </summary>
                    <p className="mt-3 text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-medium border-t border-slate-100 dark:border-slate-850 pt-3">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        </LazySection>

        {/* Section 12: Order Form Section */}
        <LazySection>
          <section id="dat-hang" className="py-20 bg-white dark:bg-slate-900 transition-colors duration-300">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="bg-linear-to-br from-brand-900 via-emerald-950 to-slate-950 text-white rounded-[40px] p-8 lg:p-14 shadow-2xl relative overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                {/* Decorative canopy shapes */}
                <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-brand-500/5 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-teal-500/5 blur-3xl pointer-events-none" />

                <div className="lg:col-span-6 space-y-6 relative z-10">
                  <span className="inline-block bg-white/10 px-3.5 py-1 rounded text-[10px] font-black uppercase tracking-wider">
                    🛒 Đặt hàng nhanh chóng
                  </span>
                  <h2 className="text-3xl lg:text-4xl font-black tracking-tight leading-tight">
                    Sẵn sàng bảo vệ món đồ bạn mang theo mỗi ngày?
                  </h2>
                  <p className="text-sm text-emerald-250 leading-relaxed font-medium">
                    Hãy điền thông tin đặt sáp, đội ngũ TrekShield sẽ nhanh chóng liên hệ qua điện thoại để xác nhận đơn và hỗ trợ giải đáp cách thoa sáp tối ưu theo loại vải của bạn.
                  </p>

                  <div className="space-y-3 text-xs text-teal-200/90 font-bold pt-4 border-t border-white/10">
                    <p className="flex items-center gap-2">✓ Gọi điện tư vấn trực tiếp chọn sáp phù hợp nhất</p>
                    <p className="flex items-center gap-2">✓ Cung cấp hướng dẫn sử dụng chi tiết bằng video</p>
                    <p className="flex items-center gap-2">✓ Giao hàng hỏa tốc toàn quốc, kiểm tra thanh toán</p>
                  </div>
                </div>

                <div className="lg:col-span-6 relative z-10 w-full">
                  <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl p-6 lg:p-8 shadow-xl">
                    <OrderForm />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </LazySection>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 dark:bg-slate-950 border-t border-slate-800 dark:border-slate-900 transition-colors duration-300 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-4">
            <h3 className="text-lg font-black text-white tracking-tight">TrekShield Wax</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Sáp bảo vệ chuyên dụng cho đồ trekking, ba lô, quần áo và giày vải canvas dã ngoại. Đồng hành khô thoáng cùng bạn trên mỗi dặm chân đi.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-white tracking-widest">Sản phẩm</h4>
            <ul className="space-y-2 text-xs font-semibold text-slate-450 hover:text-slate-200">
              <li><a href="#select-wax" className="hover:text-white transition-colors">Premium Wax</a></li>
              <li><a href="#select-wax" className="hover:text-white transition-colors">Super Wax</a></li>
              <li><a href="#bang-gia" className="hover:text-white transition-colors">Combo TrekShield</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-white tracking-widest">Khám phá</h4>
            <ul className="space-y-2 text-xs font-semibold text-slate-450 hover:text-slate-200">
              <li><a href="#faq" className="hover:text-white transition-colors">FAQ Câu hỏi</a></li>
              <li><a href="#cong-dung" className="hover:text-white transition-colors">Công dụng sáp</a></li>
              <li><a href="#cam-nang" className="hover:text-white transition-colors">Kiến thức leo núi</a></li>
              <li>
                <Link
                  href="/admin/dashboard"
                  className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-bold focus:outline-none"
                >
                  Cổng Admin Quản Trị 🔑
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-white tracking-widest">Liên hệ</h4>
            <ul className="space-y-1.5 text-xs font-semibold text-slate-450 leading-relaxed">
              <li>Hotline: 0382373666</li>
              <li>Email: trekshield0@gmail.com</li>
              <li>Fanpage: TrekShield</li>
            </ul>
          </div>
        </div>
      </footer>

      {/* Floating mobile action button */}
      <a
        href="#dat-hang"
        className="sm:hidden fixed bottom-6 left-6 right-6 z-45 py-3.5 bg-linear-to-r from-brand-500 to-brand-700 text-white font-extrabold text-center rounded-xl shadow-lg shadow-brand-500/20 text-sm active:scale-98 transition-all"
      >
        Đặt hàng TrekShield ngay →
      </a>

      {/* Login Drawer modal */}
      <AdminLoginDrawer isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
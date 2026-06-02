"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';

// Paths to banner images placed in public/images/banners
const bannerImages = [
  '/images/banners/trekshield-hero-main.png',
  '/images/banners/trekshield-outdoor-ready-banner.png',
  '/images/banners/trekshield-product-comparison.png',
  '/images/banners/trekshield-combo-poster.png',
];

export default function BannerCarousel() {
  const [current, setCurrent] = useState(0);
  const total = bannerImages.length;

  const next = () => setCurrent((prev) => (prev + 1) % total);
  const prev = () => setCurrent((prev) => (prev - 1 + total) % total);

  // Optional auto‑play (5 s)
  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="banner-carousel">
      <div className="carousel-slide">
        <Image
          src={bannerImages[current]}
          alt={`Banner ${current + 1}`}
          fill
          sizes="(max-width: 900px) 100vw, 80vw"
          style={{ objectFit: 'cover' }}
        />
      </div>
      <button className="carousel-nav prev" onClick={prev} aria-label="Previous banner">
        ‹
      </button>
      <button className="carousel-nav next" onClick={next} aria-label="Next banner">
        ›
      </button>
      <div className="carousel-indicators">
        {bannerImages.map((_, idx) => (
          <span
            key={idx}
            className={idx === current ? 'dot active' : 'dot'}
            onClick={() => setCurrent(idx)}
          />
        ))}
      </div>
    </section>
  );
}

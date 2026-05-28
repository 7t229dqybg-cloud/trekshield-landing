import Image from "next/image";
import OrderForm from "./components/OrderForm";

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
  return (
    <>
      <header className="site-header">
        <div className="container nav">
          <a href="#" className="logo">
            <Image
              src="/images/trekshield-logo.png"
              alt="TrekShield Logo"
              width={180}
              height={80}
              priority
            />
          </a>

          <nav className="nav-links">
            <a href="#san-pham">Sản phẩm</a>
            <a href="#hinh-anh">Hình ảnh</a>
            <a href="#cong-dung">Công dụng</a>
            <a href="#bang-gia">Bảng giá</a>
            <a href="#faq">FAQ</a>
            <a href="#dat-hang" className="btn btn-primary">
              Đặt hàng
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-content">
              <span className="badge">Protection that walks every mile with you</span>

              <h1>Giữ đồ trekking bền hơn, khô hơn, sẵn sàng cho mọi hành trình.</h1>

              <p>
                TrekShield là sáp bảo vệ chuyên dụng giúp tăng khả năng chống nước,
                tạo lớp phủ bền bỉ cho balô, áo khoác, giày vải và đồ dã ngoại.
              </p>

              <div className="hero-actions">
                <a href="#dat-hang" className="btn btn-primary">
                  Đặt hàng ngay →
                </a>
                <a href="#san-pham" className="btn btn-ghost">
                  Xem sản phẩm
                </a>
              </div>

              <div className="trust-grid">
                <div>
                  <strong>2</strong>
                  <span>Dòng wax</span>
                </div>
                <div>
                  <strong>18–60</strong>
                  <span>Phù hợp nhiều đối tượng</span>
                </div>
                <div>
                  <strong>24h</strong>
                  <span>Tư vấn nhanh</span>
                </div>
              </div>
            </div>

            <div className="hero-card">
              <Image
                src="/images/wax-combo.jpg"
                alt="Sáp bảo vệ TrekShield"
                fill
                priority
                sizes="(max-width: 900px) 100vw, 50vw"
              />

              <div className="mini-card">
                <strong>Super Wax & Premium Wax</strong>
                <p>Hai dòng wax bảo vệ balô, quần áo, giày vải và đồ trekking.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="san-pham">
          <div className="container">
            <div className="section-head">
              <span className="badge">Sản phẩm nổi bật</span>
              <h2>Chọn loại wax phù hợp với cách bạn sử dụng</h2>
              <p>
                Premium Wax dành cho độ bền và khả năng chống chịu cao. Super Wax
                dành cho sự tiện lợi, dễ thoa và linh hoạt hơn.
              </p>
            </div>

            <div className="product-grid">
              {products.map((product) => (
                <article className="product-card" key={product.name}>
                  <div className="product-image">
                    <Image
                      src={product.image}
                      alt={`TrekShield ${product.name}`}
                      fill
                      sizes="(max-width: 900px) 100vw, 50vw"
                    />
                  </div>

                  <h3>{product.name}</h3>
                  <h4>{product.subtitle}</h4>
                  <p>{product.description}</p>

                  <div className="tag-list">
                    {product.tags.map((tag) => (
                      <span className="tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="notice">{product.note}</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="hinh-anh">
          <div className="container">
            <div className="section-head">
              <span className="badge">Hình ảnh sản phẩm</span>
              <h2>Thiết kế mộc mạc, tự nhiên, đúng tinh thần outdoor</h2>
              <p>
                Bao bì kraft tối giản kết hợp tone xanh thiên nhiên giúp TrekShield
                tạo cảm giác sạch sẽ, tin cậy và chuyên nghiệp.
              </p>
            </div>

            <div className="gallery-grid">
              <div className="gallery-item large">
                <Image
                  src="/images/wax-boxes.jpg"
                  alt="Hộp sản phẩm TrekShield Wax"
                  fill
                  sizes="(max-width: 900px) 100vw, 60vw"
                />
              </div>

              <div className="gallery-item">
                <Image
                  src="/images/wax-flatlay.jpg"
                  alt="Các thanh wax TrekShield"
                  fill
                  sizes="(max-width: 900px) 100vw, 40vw"
                />
              </div>

              <div className="gallery-item">
                <Image
                  src="/images/wax-tray.jpg"
                  alt="Sáp TrekShield trên khay gỗ"
                  fill
                  sizes="(max-width: 900px) 100vw, 40vw"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="cong-dung">
          <div className="container">
            <div className="benefits">
              <span className="badge">Công dụng TrekShield</span>
              <h2>Bảo vệ đồ dùng mỗi ngày, không chỉ khi đi trekking.</h2>

              <div className="benefit-grid">
                <div className="benefit">
                  <span>🎒</span>
                  <h3>Balô & túi vải</h3>
                  <p>Hỗ trợ hạn chế thấm nước, bám bụi và giúp bề mặt dễ chăm sóc.</p>
                </div>

                <div className="benefit">
                  <span>🧥</span>
                  <h3>Áo khoác & quần áo</h3>
                  <p>Tạo lớp phủ bảo vệ cho các món đồ thường dùng ngoài trời.</p>
                </div>

                <div className="benefit">
                  <span>🥾</span>
                  <h3>Giày vải & phụ kiện</h3>
                  <p>Phù hợp với đồ vải, đồ dã ngoại và phụ kiện cần tăng độ bền.</p>
                </div>

                <div className="benefit">
                  <span>🌿</span>
                  <h3>Hương thơm dễ chịu</h3>
                  <p>Công thức có tinh dầu hương hoa, mang lại cảm giác tự nhiên.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="bang-gia">
          <div className="container">
            <div className="section-head">
              <span className="badge">Bảng giá cơ bản</span>
              <h2>Gói mua đơn giản, dễ chọn</h2>
              <p>Giá có thể điều chỉnh theo dung tích, combo và khuyến mãi thực tế.</p>
            </div>

            <div className="pricing-grid">
              <div className="price-card">
                <h3>Super Wax</h3>
                <p>Dành cho người mới, gia đình và đồ dùng hằng ngày.</p>
                <div className="price">99K <small>/ hộp</small></div>
                <ul>
                  <li>Dễ thoa, nhanh khô</li>
                  <li>Không làm đổi màu vải</li>
                  <li>Dùng linh hoạt nhiều loại vải</li>
                </ul>
                <a href="#dat-hang" className="btn btn-ghost">Chọn gói này</a>
              </div>

              <div className="price-card featured">
                <span className="popular">Bán chạy</span>
                <h3>Combo TrekShield</h3>
                <p>Phù hợp người muốn dùng thử cả 2 dòng wax.</p>
                <div className="price">179K <small>/ combo</small></div>
                <ul>
                  <li>1 Premium Wax</li>
                  <li>1 Super Wax</li>
                  <li>Tư vấn cách dùng theo chất liệu</li>
                </ul>
                <a href="#dat-hang" className="btn btn-primary">Đặt combo ngay</a>
              </div>

              <div className="price-card">
                <h3>Premium Wax</h3>
                <p>Dành cho đồ trekking cần độ bền cao.</p>
                <div className="price">119K <small>/ hộp</small></div>
                <ul>
                  <li>Chống nước vượt trội</li>
                  <li>Bám lâu, độ bền cao</li>
                  <li>Phù hợp người có kinh nghiệm</li>
                </ul>
                <a href="#dat-hang" className="btn btn-ghost">Chọn gói này</a>
              </div>
            </div>
          </div>
        </section>

        <section id="reviews">
          <div className="container">
            <div className="section-head">
              <span className="badge">Review khách hàng</span>
              <h2>Được chọn bởi người cần đồ bền, gọn và luôn sẵn sàng</h2>
            </div>

            <div className="reviews">
              {reviews.map((review) => (
                <div className="review" key={review.name}>
                  <div className="stars">★★★★★</div>
                  <p>“{review.content}”</p>
                  <strong>{review.name}</strong>
                  <span>{review.role}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq">
          <div className="container">
            <div className="section-head">
              <span className="badge">FAQ</span>
              <h2>Câu hỏi thường gặp</h2>
            </div>

            <div className="faq-wrap">
              <details>
                <summary>TrekShield dùng cho những chất liệu nào?</summary>
                <p>
                  TrekShield phù hợp với nhiều đồ vải như balô, túi vải, áo khoác,
                  giày vải và đồ dã ngoại. Nên thử trên vùng nhỏ trước khi dùng toàn bộ.
                </p>
              </details>

              <details>
                <summary>Premium Wax và Super Wax khác nhau thế nào?</summary>
                <p>
                  Premium Wax bám lâu, chống nước tốt hơn nhưng khó thoa và lâu khô hơn.
                  Super Wax dễ thoa, nhanh khô, không đổi màu và phù hợp nhiều người dùng hơn.
                </p>
              </details>

              <details>
                <summary>Wax có làm đổi màu vải không?</summary>
                <p>
                  Premium Wax màu vàng có thể ảnh hưởng màu vải sáng. Super Wax trắng
                  được thiết kế để hạn chế tình trạng đổi màu hơn.
                </p>
              </details>

              <details>
                <summary>Bao lâu cần thoa lại một lần?</summary>
                <p>
                  Tùy tần suất sử dụng và điều kiện môi trường. Với đồ dùng thường xuyên
                  ngoài trời, nên kiểm tra bề mặt sau mỗi vài tuần.
                </p>
              </details>
            </div>
          </div>
        </section>

        <section id="dat-hang">
          <div className="container">
            <div className="order">
              <div>
                <span className="badge">Đặt hàng nhanh</span>
                <h2>Sẵn sàng bảo vệ món đồ bạn mang theo mỗi ngày?</h2>
                <p>
                  Điền thông tin, TrekShield sẽ liên hệ xác nhận đơn và tư vấn loại wax
                  phù hợp với chất liệu bạn đang sử dụng.
                </p>

                <div className="order-points">
                  <p>✓ Tư vấn chọn Premium hoặc Super Wax</p>
                  <p>✓ Hướng dẫn sử dụng theo từng loại vải</p>
                  <p>✓ Hỗ trợ đặt combo tiết kiệm</p>
                </div>
              </div>

              <OrderForm />
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="container footer-grid">
          <div>
            <h3>TrekShield</h3>
            <p>Protection that walks every mile with you.</p>
            <p>Sáp bảo vệ đồ trekking, balô, quần áo và phụ kiện vải.</p>
          </div>

          <div>
            <h4>Sản phẩm</h4>
            <a href="#san-pham">Premium Wax</a>
            <a href="#san-pham">Super Wax</a>
            <a href="#bang-gia">Combo TrekShield</a>
          </div>

          <div>
            <h4>Hỗ trợ</h4>
            <a href="#faq">FAQ</a>
            <a href="#dat-hang">Đặt hàng</a>
            <a href="#cong-dung">Công dụng</a>
          </div>

          <div>
            <h4>Liên hệ</h4>
            <p>Hotline: 09xx xxx xxx</p>
            <p>Email: hello@trekshield.vn</p>
            <p>Facebook: TrekShield Vietnam</p>
          </div>
        </div>
      </footer>

      <a href="#dat-hang" className="mobile-cta btn btn-primary">
        Đặt hàng TrekShield ngay →
      </a>
    </>
  );
}
import { useState, useEffect, useRef } from "react";

const MAX_COMPANIES = 1000;
const SK = { apps: "tops-v5-apps", buyers: "tops-v5-buyers", exp: "tops-v5-exp", members: "tops-v5-members", devices: "tops-v5-devs", selected: "tops-v5-selected" };
const INIT = { companies: 672, buyers: 43, members: 125 };
const ADMIN_PIN = "9823";

const useCounter = (target, dur = 1800, delay = 0) => {
  const [c, setC] = useState(0);
  const [go, setGo] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGo(true), delay); return () => clearTimeout(t); }, [delay]);
  useEffect(() => {
    if (!go || target === 0) { if (target === 0) setC(0); return; }
    let v = 0; const step = Math.max(1, Math.floor(target / 50));
    const id = setInterval(() => { v += step; if (v >= target) { setC(target); clearInterval(id); } else setC(v); }, Math.max(12, dur / (target / step)));
    return () => clearInterval(id);
  }, [target, go, dur]);
  return c;
};

const useDevice = () => {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => { const h = () => setW(window.innerWidth); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  return { isTablet: w >= 600 && w < 1200, isDesktop: w >= 1200, isMobile: w < 600, w };
};

const App = () => {
  const [page, setPage] = useState("home");
  const [form, setForm] = useState({});
  const [apps, setApps] = useState([]);
  const [buyerList, setBuyerList] = useState([]);
  const [expList, setExpList] = useState([]);
  const [memberList, setMemberList] = useState([]);
  const [selectedCount, setSelectedCount] = useState(0);
  const [toast, setToast] = useState(null);
  const [meetingModal, setMeetingModal] = useState(null);
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [adminTab, setAdminTab] = useState("dashboard");
  const [devices, setDevices] = useState([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [buyerForm, setBuyerForm] = useState({});
  const [expForm, setExpForm] = useState({});
  const { isTablet, isDesktop } = useDevice();
  const perPage = isDesktop ? 20 : isTablet ? 12 : 8;
  const fileRef = useRef(null);

  const stats = {
    companies: INIT.companies,
    buyers: INIT.buyers + buyerList.length,
    members: INIT.members + memberList.length,
    experiencers: expList.length,
    applications: apps.length,
    selected: selectedCount,
  };

  useEffect(() => {
    (async () => {
      try { const r = await window.storage.get(SK.apps); setApps(JSON.parse(r.value)); } catch {}
      try { const r = await window.storage.get(SK.buyers); setBuyerList(JSON.parse(r.value)); } catch {}
      try { const r = await window.storage.get(SK.exp); setExpList(JSON.parse(r.value)); } catch {}
      try { const r = await window.storage.get(SK.members); setMemberList(JSON.parse(r.value)); } catch {}
      try { const r = await window.storage.get(SK.devices); setDevices(JSON.parse(r.value)); } catch {}
      try { const r = await window.storage.get(SK.selected); setSelectedCount(parseInt(r.value) || 0); } catch {}
    })();
  }, []);

  useEffect(() => {
    if (devices.length === 0) {
      const ua = navigator.userAgent;
      const d = { id: `D-${Date.now().toString(36).toUpperCase()}`, ua: ua.slice(0, 80), type: /LG|webOS/i.test(ua) ? "LG태블릿" : /Tablet|iPad/i.test(ua) ? "태블릿" : /Mobile/i.test(ua) ? "모바일" : "노트북/PC", registered: new Date().toISOString(), lastActive: new Date().toISOString(), status: "활성" };
      setDevices([d]); save(SK.devices, [d]);
    }
  }, []);

  // Recalculate selected count from apps
  useEffect(() => {
    const cnt = apps.filter(a => a.status === "선정").length;
    setSelectedCount(cnt);
    (async () => { try { await window.storage.set(SK.selected, String(cnt)); } catch {} })();
  }, [apps]);

  const save = async (k, d) => { try { await window.storage.set(k, JSON.stringify(d)); } catch {} };
  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const submitApp = async () => {
    const req = ["companyName", "bizNumber", "repName", "phone", "email", "productUrl", "category"];
    if (req.some(k => !form[k])) { showToast("⚠️ 필수 항목을 모두 입력해주세요", "warn"); return; }
    if (apps.length >= MAX_COMPANIES) { showToast("⚠️ 모집 마감 (1,000개사)", "warn"); return; }
    const entry = { id: `APP-${Date.now().toString(36).toUpperCase()}`, ...form, status: "접수완료", appliedAt: new Date().toISOString(), meetingStatus: "미예약" };
    const u = [entry, ...apps]; setApps(u); await save(SK.apps, u);
    setForm({}); showToast("✅ 참가신청 완료!"); setPage("complete");
  };

  const submitBuyer = async () => {
    if (!buyerForm.name || !buyerForm.phone) { showToast("⚠️ 이름, 전화번호 필수", "warn"); return; }
    const entry = { id: `BUY-${Date.now().toString(36).toUpperCase()}`, ...buyerForm, registeredAt: new Date().toISOString() };
    const u = [entry, ...buyerList]; setBuyerList(u); await save(SK.buyers, u);
    setBuyerForm({}); showToast("✅ 바이어/MD 등록 완료!");
  };

  const submitExp = async () => {
    if (!expForm.name || !expForm.phone) { showToast("⚠️ 이름, 전화번호 필수", "warn"); return; }
    const entry = { id: `EXP-${Date.now().toString(36).toUpperCase()}`, ...expForm, registeredAt: new Date().toISOString() };
    const u = [entry, ...expList]; setExpList(u); await save(SK.exp, u);
    setExpForm({}); showToast("✅ 체험단 등록 완료!");
  };

  const updateAppStatus = (id, status) => { const u = apps.map(a => a.id === id ? { ...a, status } : a); setApps(u); save(SK.apps, u); };
  const bookMeeting = async (appId, type, date, time) => { const u = apps.map(a => a.id === appId ? { ...a, meetingStatus: "예약완료", meetingType: type, meetingDate: date, meetingTime: time } : a); setApps(u); await save(SK.apps, u); showToast(`✅ ${type === "online" ? "구글미팅" : "오프라인"} 예약!`); setMeetingModal(null); };

  const handleMemberUpload = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      let rows = [];
      if (file.name.endsWith(".csv") || file.name.endsWith(".txt")) {
        const lines = text.split("\n").filter(l => l.trim());
        const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].split(",").map(v => v.trim().replace(/"/g, ""));
          const row = {}; headers.forEach((h, j) => { row[h] = vals[j] || ""; });
          if (Object.values(row).some(v => v)) rows.push(row);
        }
      } else {
        const { read, utils } = await import("https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs");
        const data = await file.arrayBuffer(); const wb = read(data);
        rows = utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      }
      const members = rows.map((r, i) => ({
        id: `M-${Date.now().toString(36)}-${i}`, name: r["이름"] || r["name"] || r["Name"] || "",
        email: r["이메일"] || r["email"] || "", phone: r["연락처"] || r["전화번호"] || r["phone"] || "",
        group: r["회원 그룹"] || r["회원그룹"] || "", grade: r["회원 등급"] || r["회원등급"] || "",
        address: r["주소"] || r["address"] || "", memo: r["관리자 메모"] || r["메모"] || "",
        uploadedAt: new Date().toISOString(),
      })).filter(m => m.name);
      const u = [...members, ...memberList]; setMemberList(u); await save(SK.members, u);
      showToast(`✅ ${members.length}명 업로드!`);
    } catch (e) { showToast("⚠️ 오류: " + e.message, "warn"); }
  };

  const filtered = apps.filter(a => {
    if (search && !`${a.companyName}${a.repName}${a.bizNumber}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat !== "all" && a.category !== filterCat) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    return true;
  }).sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);
  const categories = [...new Set(apps.map(a => a.category).filter(Boolean))];

  const C = { bg: "#F8FAFB", card: "#FFF", dark: "#0C0F1A", navy: "#1B2A4A", blue: "#2563EB", indigo: "#4F46E5", emerald: "#059669", gold: "#D97706", rose: "#E11D48", text: "#1E293B", sub: "#64748B", light: "#F1F5F9", border: "#E2E8F0", orange: "#EA580C", purple: "#7C3AED" };
  const maxW = isDesktop ? 1200 : isTablet ? 800 : 480;
  const pad = isDesktop ? "28px 32px" : isTablet ? "20px 22px" : "14px 16px";

  // ===== STAT CARD =====
  const StatCard = ({ target, max, label, icon, color, delay, suffix, onClick }) => {
    const anim = useCounter(target, 2000, delay);
    const pct = max ? Math.min((anim / max) * 100, 100) : null;
    return (
      <div onClick={onClick} style={{ background: C.card, borderRadius: isDesktop ? 18 : 14, padding: isDesktop ? "20px 16px" : "14px 10px", textAlign: "center", border: `1px solid ${C.border}`, position: "relative", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", cursor: onClick ? "pointer" : "default", transition: "all .15s" }}
        onMouseEnter={e => { if (onClick) e.currentTarget.style.transform = "translateY(-2px)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}>
        {pct !== null && <div style={{ position: "absolute", bottom: 0, left: 0, width: `${pct}%`, height: 3, background: `linear-gradient(90deg, ${color}60, ${color})`, transition: "width .3s" }} />}
        <span style={{ fontSize: isDesktop ? 26 : 20 }}>{icon}</span>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 2, margin: "4px 0 2px" }}>
          <span style={{ color, fontSize: isDesktop ? 28 : 22, fontWeight: 900 }}>{anim.toLocaleString()}</span>
          {max && <span style={{ color: C.sub, fontSize: isDesktop ? 14 : 11, fontWeight: 600 }}>/{max.toLocaleString()}</span>}
          {suffix && <span style={{ color: C.sub, fontSize: 11 }}>{suffix}</span>}
        </div>
        <div style={{ color: C.sub, fontSize: isDesktop ? 11 : 9, fontWeight: 600 }}>{label}</div>
        {onClick && <div style={{ color, fontSize: 8, fontWeight: 700, marginTop: 2 }}>▶ 클릭하여 등록</div>}
      </div>
    );
  };

  // ===== PUBLIC NAV (홈/업체신청/바이어/체험단/관리) =====
  const Nav = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isDesktop ? "10px 0" : "8px 0", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setPage("home")}>
        <span style={{ fontSize: isDesktop ? 22 : 18 }}>🏆</span>
        <span style={{ color: C.text, fontSize: isDesktop ? 16 : 13, fontWeight: 800 }}>TOPS</span>
        <span style={{ background: `${C.emerald}15`, color: C.emerald, padding: "2px 8px", borderRadius: 10, fontSize: 9, fontWeight: 700, animation: "pulse 2s infinite" }}>● LIVE</span>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {[
          { p: "home", icon: "🏠", l: "홈" },
          { p: "apply", icon: "📋", l: "업체신청" },
          { p: "buyerReg", icon: "🌏", l: "바이어" },
          { p: "expReg", icon: "👥", l: "체험단" },
          { p: "admin", icon: "⚙️", l: "관리" },
        ].map(n => (
          <button key={n.p} onClick={() => setPage(n.p)}
            style={{ padding: isDesktop ? "7px 14px" : "6px 9px", borderRadius: 9, border: `1px solid ${page === n.p || (n.p === "admin" && ["admin","dashboard","memberUpload"].includes(page)) ? C.blue : C.border}`, background: page === n.p || (n.p === "admin" && ["admin","dashboard","memberUpload"].includes(page)) ? `${C.blue}08` : "transparent", color: page === n.p || (n.p === "admin" && ["admin","dashboard","memberUpload"].includes(page)) ? C.blue : C.sub, cursor: "pointer", fontSize: isDesktop ? 11 : 9, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: isDesktop ? 13 : 11 }}>{n.icon}</span>
            {(isTablet || isDesktop) && <span>{n.l}</span>}
          </button>
        ))}
      </div>
    </div>
  );

  // ===== SIMPLE REGISTER FORM (Buyer or Experiencer) =====
  const SimpleRegForm = ({ title, icon, color, formData, setFormData, onSubmit, list, type }) => (
    <div style={{ animation: "fi .4s ease" }}>
      <div style={{ background: `${color}06`, borderRadius: 16, padding: "16px 18px", border: `1px solid ${color}15`, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 900, color: C.text, marginBottom: 2 }}>{icon} {title}</h2>
          <p style={{ color: C.sub, fontSize: 11 }}>등록 즉시 카운터 반영</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color, fontSize: 24, fontWeight: 900 }}>{type === "buyer" ? stats.buyers : stats.experiencers}</div>
          <div style={{ color: C.sub, fontSize: 9 }}>현재 등록</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: 12 }}>
        <div style={{ background: C.card, borderRadius: 16, padding: 18, border: `1px solid ${C.border}` }}>
          <div style={{ color, fontSize: 12, fontWeight: 800, marginBottom: 12 }}>✏️ 신규 등록</div>
          {[
            { label: "국가", k: "country", ph: "한국, USA, Japan..." },
            { label: "이름", k: "name", ph: "홍길동", req: true },
            { label: "전화번호", k: "phone", ph: "010-0000-0000", req: true },
            { label: "카카오톡 ID", k: "kakaoId", ph: "@kakao_id" },
            { label: "주소", k: "address", ph: "서울시 강남구..." },
          ].map(f => (
            <div key={f.k} style={{ marginBottom: 8 }}>
              <label style={{ color: C.text, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 3 }}>{f.label} {f.req && <span style={{ color: C.rose }}>*</span>}</label>
              <input value={formData[f.k] || ""} onChange={e => setFormData({ ...formData, [f.k]: e.target.value })} placeholder={f.ph}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: C.light, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, outline: "none" }} />
            </div>
          ))}
          <button onClick={onSubmit} style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${color}, ${C.indigo})`, color: "#FFF", fontSize: 14, fontWeight: 800, marginTop: 4 }}>🚀 등록하기</button>
        </div>
        <div style={{ background: C.card, borderRadius: 16, padding: 18, border: `1px solid ${C.border}` }}>
          <div style={{ color: C.text, fontSize: 12, fontWeight: 800, marginBottom: 10 }}>📋 최근 등록 ({list.length}명)</div>
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {list.length === 0 ? <div style={{ textAlign: "center", padding: 20, color: C.sub, fontSize: 11 }}>등록 데이터 없음</div>
            : list.slice(0, 20).map((item, i) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: `${color}10`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.text, fontSize: 11, fontWeight: 700 }}>{item.country ? `[${item.country}] ` : ""}{item.name}</div>
                  <div style={{ color: C.sub, fontSize: 9 }}>{item.phone}{item.kakaoId ? ` · ${item.kakaoId}` : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ===== HOME =====
  const Home = () => (
    <div style={{ animation: "fi .5s ease" }}>
      <div style={{ background: `linear-gradient(135deg, ${C.dark} 0%, ${C.navy} 40%, #1E3A5F 100%)`, borderRadius: isDesktop ? 28 : 22, padding: isDesktop ? "44px 40px 32px" : isTablet ? "32px 24px" : "32px 20px", marginBottom: 16, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -60, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.12), transparent)", filter: "blur(40px)" }} />
        <div style={{ position: "absolute", bottom: -40, left: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.08), transparent)", filter: "blur(30px)" }} />
        <div style={{ position: "relative", zIndex: 1, display: isDesktop ? "flex" : "block", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: isDesktop ? 1 : "auto" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <span style={{ background: "linear-gradient(135deg, #F59E0B, #EA580C)", color: "#FFF", padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: 800 }}>🏆 2026 TOPS</span>
              <span style={{ background: "rgba(52,211,153,0.15)", color: "#34D399", padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, animation: "pulse 2s infinite" }}>● 모집중</span>
            </div>
            <h1 style={{ fontSize: isDesktop ? 36 : isTablet ? 28 : 24, fontWeight: 900, color: "#FFF", lineHeight: 1.2, marginBottom: 8 }}>
              온라인 브랜드 <span style={{ background: "linear-gradient(135deg, #60A5FA, #34D399, #FBBF24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>소상공인 육성사업</span>
            </h1>
            <p style={{ color: "#94A3B8", fontSize: isDesktop ? 14 : 12, lineHeight: 1.7, marginBottom: isDesktop ? 0 : 16 }}>
              닥터엠디AI™ 12주 집중 육성 | 롯데홈쇼핑 × 커머스코 | 선착순 {MAX_COMPANIES.toLocaleString()}개사
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexDirection: isDesktop ? "column" : "row" }}>
            <button onClick={() => setPage("apply")} style={{ flex: isDesktop ? "auto" : 1, padding: isDesktop ? "15px 28px" : "13px 0", borderRadius: 14, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #2563EB, #4F46E5)", color: "#FFF", fontSize: isDesktop ? 14 : 13, fontWeight: 800, boxShadow: "0 4px 20px rgba(37,99,235,0.4)" }}>참가 신청하기 →</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(5,1fr)" : isTablet ? "repeat(5,1fr)" : "repeat(2,1fr)", gap: isDesktop ? 10 : 8, marginBottom: 16 }}>
        <StatCard target={stats.companies} label="기존 참여소상공인" icon="🏪" color={C.blue} delay={200} suffix="개" />
        <StatCard target={stats.buyers} label="참가 글로벌 바이어/MD" icon="🌏" color={C.purple} delay={400} suffix="명" onClick={() => setPage("buyerReg")} />
        <StatCard target={stats.members} label="해피허브메타회원" icon="🏠" color={C.emerald} delay={600} suffix="명" />
        <StatCard target={stats.experiencers} label="유료체험단" icon="👥" color={C.orange} delay={700} suffix="명" onClick={() => setPage("expReg")} />
        <StatCard target={stats.selected} max={MAX_COMPANIES} label="2026 TOPS 선정업체" icon="🏆" color={C.rose} delay={800} />
      </div>

      {/* Features */}
      <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3,1fr)" : isTablet ? "repeat(2,1fr)" : "1fr", gap: 8, marginBottom: 16 }}>
        {[
          { icon: "🤖", t: "닥터엠디AI™ 자동 진단", d: "사업자번호 → 6대 지표 AI 분석", c: C.blue },
          { icon: "📺", t: "롯데홈쇼핑 입점 지원", d: "TV+모바일+인터넷 멀티채널", c: C.rose },
          { icon: "🌏", t: "글로벌 수출 연계", d: "K-가디언스 뉴욕 바이어 매칭", c: C.emerald },
          { icon: "📊", t: "12주 집중 스프린트", d: "진단→개선→표준화→스케일업", c: C.gold },
          { icon: "💳", t: "토스 K-브랜드페이", d: "3초 글로벌 결제 + 실시간 환전", c: C.indigo },
          { icon: "👥", t: "유료체험단 마케팅", d: "바이럴 + 실구매 리뷰 확보", c: C.orange },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: isDesktop ? "14px 16px" : "12px 14px", background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, transition: "all .2s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = item.c + "40"} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${item.c}08`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
            <div><div style={{ color: C.text, fontSize: 12, fontWeight: 700 }}>{item.t}</div><div style={{ color: C.sub, fontSize: 10 }}>{item.d}</div></div>
          </div>
        ))}
      </div>

      {/* Meeting */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[{ i: "💻", t: "구글미팅 (온라인)", d: "Google Meet", c: C.blue }, { i: "🏢", t: "본사 방문 (오프라인)", d: "해피허브메타 본사", c: C.emerald }].map((m, i) => (
          <div key={i} style={{ background: C.card, borderRadius: 14, padding: isDesktop ? 18 : 14, border: `1px solid ${C.border}`, textAlign: "center" }}>
            <span style={{ fontSize: 26 }}>{m.i}</span>
            <div style={{ color: C.text, fontSize: 12, fontWeight: 700, marginTop: 4 }}>{m.t}</div>
            <div style={{ color: C.sub, fontSize: 10 }}>{m.d}</div>
          </div>
        ))}
      </div>

      <button onClick={() => setPage("apply")} style={{ width: "100%", padding: "15px 0", borderRadius: 14, border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${C.blue}, ${C.indigo})`, color: "#FFF", fontSize: 14, fontWeight: 800, boxShadow: `0 4px 20px ${C.blue}30` }}>
        📋 참가 신청하기 (선착순 {MAX_COMPANIES.toLocaleString()}개사)
      </button>

      <div style={{ background: C.dark, borderRadius: 14, padding: "14px 12px", color: "#94A3B8", fontSize: 10, lineHeight: 1.6, marginTop: 14 }}>
        <div style={{ color: "#FFF", fontSize: 11, fontWeight: 700 }}>닥터엠디AI™ TOPS</div>
        <div>커머스코 × 롯데홈쇼핑 | jalsago@naver.com | 010-9823-8629</div>
      </div>
    </div>
  );

  // ===== APPLY FORM =====
  const ApplyForm = () => {
    const F = ({ label, k, ph, req, type }) => (
      <div>
        <label style={{ color: C.text, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 3 }}>{label} {req && <span style={{ color: C.rose }}>*</span>}</label>
        {type === "select" ? (
          <select value={form[k] || ""} onChange={e => setForm({ ...form, [k]: e.target.value })} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: C.light, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, outline: "none" }}>
            <option value="">{ph}</option>
            {["식품/음료","뷰티/화장품","패션/잡화","생활용품","건강/의료","디지털/가전","유아동/출산","인테리어/가구","레저/스포츠","기타"].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : type === "textarea" ? (
          <textarea value={form[k] || ""} onChange={e => setForm({ ...form, [k]: e.target.value })} placeholder={ph} rows={3} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: C.light, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, outline: "none", resize: "vertical", fontFamily: "inherit" }} />
        ) : (
          <input type={type || "text"} value={form[k] || ""} onChange={e => setForm({ ...form, [k]: e.target.value })} placeholder={ph} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: C.light, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, outline: "none" }} />
        )}
      </div>
    );
    return (
      <div style={{ animation: "fi .4s ease" }}>
        <div style={{ background: `${C.blue}06`, borderRadius: 16, padding: "14px 16px", border: `1px solid ${C.blue}12`, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><h2 style={{ fontSize: 16, fontWeight: 900, color: C.text }}>📋 TOPS 참가 신청서</h2></div>
          <div style={{ color: C.rose, fontSize: 18, fontWeight: 900 }}>{stats.applications}/{MAX_COMPANIES.toLocaleString()}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr 1fr" : "1fr", gap: 10 }}>
          <div style={{ background: C.card, borderRadius: 14, padding: 16, border: `1px solid ${C.border}` }}>
            <div style={{ color: C.indigo, fontSize: 11, fontWeight: 800, marginBottom: 8 }}>1️⃣ 기업 정보</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <F label="업체명" k="companyName" ph="㈜OOO" req /><F label="사업자등록번호" k="bizNumber" ph="000-00-00000" req />
              <F label="대표자명" k="repName" ph="홍길동" req /><F label="전화번호" k="phone" ph="010-0000-0000" req type="tel" />
              <F label="이메일" k="email" ph="example@email.com" req type="email" /><F label="주소" k="address" ph="서울시 강남구..." />
            </div>
          </div>
          <div style={{ background: C.card, borderRadius: 14, padding: 16, border: `1px solid ${C.border}` }}>
            <div style={{ color: C.emerald, fontSize: 11, fontWeight: 800, marginBottom: 8 }}>2️⃣ 상품 & 매출</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <F label="상품카테고리" k="category" ph="선택" req type="select" /><F label="대표 상품명" k="productName" ph="프리미엄 유기농 꿀" />
              <F label="상품페이지 URL" k="productUrl" ph="https://smartstore..." req />
              <F label="쿠팡 매출(만원)" k="coupangSales" ph="5000" type="number" /><F label="네이버 매출(만원)" k="naverSales" ph="3000" type="number" />
              <F label="총 연매출(만원)" k="totalSales" ph="10000" type="number" />
            </div>
          </div>
          <div style={{ background: C.card, borderRadius: 14, padding: 16, border: `1px solid ${C.border}` }}>
            <div style={{ color: C.gold, fontSize: 11, fontWeight: 800, marginBottom: 8 }}>3️⃣ 컨설팅</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <label style={{ color: C.text, fontSize: 11, fontWeight: 700, marginBottom: 4, display: "block" }}>희망 미팅</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {[{ v: "online", i: "💻", l: "온라인" }, { v: "offline", i: "🏢", l: "오프라인" }, { v: "both", i: "🔄", l: "둘 다" }].map(o => (
                    <div key={o.v} onClick={() => setForm({ ...form, meetingPref: o.v })} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, textAlign: "center", cursor: "pointer", background: form.meetingPref === o.v ? `${C.blue}08` : C.light, border: `2px solid ${form.meetingPref === o.v ? C.blue : C.border}` }}>
                      <span style={{ fontSize: 14 }}>{o.i}</span><div style={{ fontSize: 8, fontWeight: 600, color: form.meetingPref === o.v ? C.blue : C.sub }}>{o.l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <F label="추가 요청" k="notes" ph="해외수출 바이어 매칭 희망..." type="textarea" />
            </div>
            <button onClick={submitApp} style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${C.blue}, ${C.indigo})`, color: "#FFF", fontSize: 13, fontWeight: 800, marginTop: 8 }}>🚀 참가 신청 제출</button>
          </div>
        </div>
      </div>
    );
  };

  const Complete = () => (
    <div style={{ animation: "fi .4s ease", textAlign: "center", padding: "40px 16px", maxWidth: 500, margin: "0 auto" }}>
      <div style={{ fontSize: 56, marginBottom: 14, animation: "bounce .6s ease" }}>🎉</div>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: C.text, marginBottom: 6 }}>신청 완료!</h2>
      <div style={{ background: `${C.rose}06`, borderRadius: 14, padding: 14, marginBottom: 16, border: `1px solid ${C.rose}15` }}>
        <div style={{ color: C.rose, fontSize: 22, fontWeight: 900 }}>{stats.applications}/{MAX_COMPANIES.toLocaleString()}</div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button onClick={() => setPage("home")} style={{ padding: "13px 24px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, color: C.text, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>홈으로</button>
      </div>
    </div>
  );

  // ===== ADMIN (includes Dashboard, Members, Selection, Devices) =====
  const Admin = () => {
    if (!adminAuth) return (
      <div style={{ animation: "fi .4s ease", maxWidth: 360, margin: "40px auto", textAlign: "center" }}>
        <span style={{ fontSize: 48 }}>🔐</span>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 14 }}>관리자 인증</h2>
        <input type="password" value={adminPin} onChange={e => setAdminPin(e.target.value)} placeholder="PIN" maxLength={4}
          style={{ width: "100%", padding: "14px", borderRadius: 12, background: C.light, border: `1px solid ${C.border}`, fontSize: 18, textAlign: "center", letterSpacing: 8, outline: "none", fontFamily: "monospace" }}
          onKeyDown={e => { if (e.key === "Enter") { if (adminPin === ADMIN_PIN) setAdminAuth(true); else showToast("⚠️ PIN 불일치", "warn"); } }} />
        <button onClick={() => { if (adminPin === ADMIN_PIN) setAdminAuth(true); else showToast("⚠️ PIN 불일치", "warn"); }}
          style={{ width: "100%", marginTop: 10, padding: "14px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${C.blue}, ${C.indigo})`, color: "#FFF", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>인증</button>
      </div>
    );

    const total = stats.companies + stats.buyers + stats.members + stats.applications + stats.experiencers;

    return (
      <div style={{ animation: "fi .4s ease" }}>
        {/* Admin Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2 style={{ fontSize: isDesktop ? 20 : 16, fontWeight: 900, color: C.text }}>⚙️ 관리자 패널</h2>
          <button onClick={() => setAdminAuth(false)} style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.sub, cursor: "pointer", fontSize: 10 }}>🔒 잠금</button>
        </div>

        {/* Admin Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
          {[
            { k: "dashboard", icon: "📊", l: "현황 대시보드" },
            { k: "selection", icon: "🏆", l: "선정 관리" },
            { k: "members", icon: "🏠", l: "회원 관리" },
            { k: "devices", icon: "📱", l: "디바이스" },
            { k: "data", icon: "🗄️", l: "데이터" },
          ].map(t => (
            <button key={t.k} onClick={() => setAdminTab(t.k)}
              style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${adminTab === t.k ? C.blue : C.border}`, background: adminTab === t.k ? `${C.blue}08` : C.card, color: adminTab === t.k ? C.blue : C.sub, cursor: "pointer", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <span>{t.icon}</span> {t.l}
            </button>
          ))}
        </div>

        {/* ===== DASHBOARD TAB ===== */}
        {adminTab === "dashboard" && (
          <div>
            <div style={{ background: `linear-gradient(135deg, ${C.dark}, ${C.navy})`, borderRadius: 18, padding: isDesktop ? "22px 26px" : "18px 16px", marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ color: "#FFF", fontSize: 16, fontWeight: 900 }}>📊 TOPS 통합 현황</h3>
                <div style={{ color: "#F87171", fontSize: 22, fontWeight: 900 }}>{stats.selected}<span style={{ color: "#94A3B8", fontSize: 12 }}>/{MAX_COMPANIES.toLocaleString()} 선정</span></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(6,1fr)" : "repeat(3,1fr)", gap: 8 }}>
                {[
                  { v: stats.companies, l: "참여소상공인", c: "#60A5FA", i: "🏪" },
                  { v: stats.buyers, l: "바이어/MD", c: "#C084FC", i: "🌏" },
                  { v: stats.members, l: "해피허브메타회원", c: "#34D399", i: "🏠" },
                  { v: stats.experiencers, l: "유료체험단", c: "#FB923C", i: "👥" },
                  { v: stats.applications, l: "신청업체", c: "#F472B6", i: "📋" },
                  { v: total, l: "전체 연락처", c: "#FFF", i: "📊" },
                ].map((k, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: 11 }}>{k.i}</span><span style={{ color: "#94A3B8", fontSize: 8 }}>{k.l}</span></div>
                    <div style={{ color: k.c, fontSize: 18, fontWeight: 900 }}>{k.v.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Filters + Table */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              <input value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="🔍 검색..." style={{ flex: 1, minWidth: 120, padding: "8px 12px", borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, fontSize: 12, outline: "none", color: C.text }} />
              <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setCurrentPage(1); }} style={{ padding: "8px 10px", borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, fontSize: 10, color: C.text }}>
                <option value="all">전체</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }} style={{ padding: "8px 10px", borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, fontSize: 10, color: C.text }}>
                <option value="all">전체 상태</option>{["접수완료","심사중","선정","보류","탈락"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span style={{ color: C.sub, fontSize: 11, padding: "8px 2px" }}>{filtered.length}건</span>
            </div>
            <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 10 }}>
              {(isDesktop || isTablet) ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead><tr style={{ background: C.light }}>{["NO","업체명","대표자","전화","카테고리","상태","미팅","신청일"].map(h => <th key={h} style={{ padding: "8px 7px", textAlign: "left", color: C.sub, fontWeight: 700, fontSize: 10, borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
                  <tbody>{paged.map((a, i) => (
                    <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "8px 7px", color: C.sub, fontSize: 10 }}>{(currentPage - 1) * perPage + i + 1}</td>
                      <td style={{ padding: "8px 7px", fontWeight: 700, color: C.text }}>{a.companyName}</td>
                      <td style={{ padding: "8px 7px", color: C.sub }}>{a.repName}</td>
                      <td style={{ padding: "8px 7px", color: C.sub, fontSize: 10 }}>{a.phone}</td>
                      <td style={{ padding: "8px 7px" }}><span style={{ background: `${C.blue}08`, color: C.blue, padding: "2px 6px", borderRadius: 4, fontSize: 9 }}>{a.category}</span></td>
                      <td style={{ padding: "8px 7px" }}><span style={{ background: `${a.status === "선정" ? C.emerald : a.status === "탈락" ? C.rose : C.gold}12`, color: a.status === "선정" ? C.emerald : a.status === "탈락" ? C.rose : C.gold, padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700 }}>{a.status}</span></td>
                      <td style={{ padding: "8px 7px" }}>{a.meetingStatus === "예약완료" ? <span style={{ fontSize: 9, color: C.blue }}>{a.meetingType === "online" ? "💻" : "🏢"} {a.meetingDate}</span> : <button onClick={() => setMeetingModal(a.id)} style={{ background: `${C.gold}10`, color: C.gold, border: "none", padding: "2px 6px", borderRadius: 4, fontSize: 8, cursor: "pointer" }}>📅</button>}</td>
                      <td style={{ padding: "8px 7px", color: C.sub, fontSize: 9 }}>{new Date(a.appliedAt).toLocaleDateString("ko-KR")}</td>
                    </tr>
                  ))}</tbody>
                </table>
              ) : paged.map(a => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ flex: 1 }}><div style={{ color: C.text, fontSize: 12, fontWeight: 700 }}>{a.companyName}</div><div style={{ color: C.sub, fontSize: 9 }}>{a.category} · {a.repName}</div></div>
                  <span style={{ background: `${C.emerald}10`, color: C.emerald, padding: "2px 7px", borderRadius: 5, fontSize: 9, fontWeight: 700 }}>{a.status}</span>
                </div>
              ))}
              {paged.length === 0 && <div style={{ padding: 24, textAlign: "center", color: C.sub, fontSize: 11 }}>데이터 없음</div>}
            </div>
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.card, cursor: "pointer", fontSize: 11, color: C.sub }}>←</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => { const p = currentPage <= 3 ? i + 1 : currentPage + i - 2; if (p > totalPages || p < 1) return null; return <button key={p} onClick={() => setCurrentPage(p)} style={{ padding: "5px 9px", borderRadius: 7, border: `1px solid ${currentPage === p ? C.blue : C.border}`, background: currentPage === p ? `${C.blue}10` : C.card, color: currentPage === p ? C.blue : C.sub, cursor: "pointer", fontSize: 11, fontWeight: currentPage === p ? 700 : 400 }}>{p}</button>; })}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.card, cursor: "pointer", fontSize: 11, color: C.sub }}>→</button>
              </div>
            )}
          </div>
        )}

        {/* ===== SELECTION TAB (선정 관리) ===== */}
        {adminTab === "selection" && (
          <div>
            <div style={{ background: `${C.rose}06`, borderRadius: 16, padding: "16px 18px", border: `1px solid ${C.rose}15`, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><h3 style={{ fontSize: 15, fontWeight: 900, color: C.text }}>🏆 TOPS 선정업체 관리</h3><p style={{ color: C.sub, fontSize: 10 }}>상태를 "선정"으로 변경하면 홈 카운터에 즉시 반영</p></div>
              <div style={{ color: C.rose, fontSize: 24, fontWeight: 900 }}>{stats.selected}<span style={{ color: C.sub, fontSize: 12 }}>/{MAX_COMPANIES.toLocaleString()}</span></div>
            </div>
            <div style={{ background: C.card, borderRadius: 14, padding: 16, border: `1px solid ${C.border}`, maxHeight: 500, overflowY: "auto" }}>
              {apps.length === 0 ? <div style={{ textAlign: "center", padding: 20, color: C.sub, fontSize: 11 }}>신청 업체 없음</div>
              : apps.map((a, i) => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 10, color: C.sub, width: 20 }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.companyName}</div>
                      <div style={{ fontSize: 9, color: C.sub }}>{a.category} · {a.repName} · {a.phone}</div>
                    </div>
                  </div>
                  <select value={a.status} onChange={e => updateAppStatus(a.id, e.target.value)}
                    style={{ padding: "5px 8px", borderRadius: 6, border: `1px solid ${a.status === "선정" ? C.emerald : C.border}`, fontSize: 10, background: a.status === "선정" ? `${C.emerald}08` : C.light, color: a.status === "선정" ? C.emerald : C.text, fontWeight: a.status === "선정" ? 800 : 500 }}>
                    {["접수완료","심사중","선정","보류","탈락"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== MEMBERS TAB (회원 관리 - 엑셀 업로드) ===== */}
        {adminTab === "members" && (
          <div>
            <div style={{ background: `${C.emerald}06`, borderRadius: 16, padding: "16px 18px", border: `1px solid ${C.emerald}15`, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><h3 style={{ fontSize: 15, fontWeight: 900, color: C.text }}>🏠 해피허브메타회원 관리</h3><p style={{ color: C.sub, fontSize: 10 }}>엑셀(CSV/XLSX) 업로드로 일괄 등록</p></div>
              <div style={{ color: C.emerald, fontSize: 24, fontWeight: 900 }}>{stats.members}<span style={{ color: C.sub, fontSize: 12 }}>명</span></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: 12 }}>
              <div style={{ background: C.card, borderRadius: 16, padding: 18, border: `1px solid ${C.border}` }}>
                <div onClick={() => fileRef.current?.click()} style={{ border: `2px dashed ${C.emerald}40`, borderRadius: 14, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: `${C.emerald}04`, marginBottom: 12 }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.emerald} onMouseLeave={e => e.currentTarget.style.borderColor = `${C.emerald}40`}>
                  <span style={{ fontSize: 32 }}>📁</span>
                  <div style={{ color: C.text, fontSize: 13, fontWeight: 700, margin: "6px 0 4px" }}>클릭하여 파일 선택</div>
                  <div style={{ color: C.sub, fontSize: 10 }}>CSV, XLSX 지원</div>
                </div>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) handleMemberUpload(e.target.files[0]); e.target.value = ""; }} />
                <div style={{ background: C.light, borderRadius: 10, padding: 10, marginBottom: 8 }}>
                  <div style={{ color: C.text, fontSize: 10, fontWeight: 700, marginBottom: 4 }}>📌 양식</div>
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    {["이름*","이메일","연락처","회원그룹","회원등급","주소"].map((h, i) => (
                      <span key={i} style={{ background: `${C.emerald}08`, color: C.emerald, padding: "2px 6px", borderRadius: 4, fontSize: 8, fontWeight: 600 }}>{h}</span>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: C.sub }}>기본: {INIT.members}명 + 업로드: {memberList.length}명 = 총 {stats.members}명</div>
                {memberList.length > 0 && (
                  <button onClick={async () => { if (confirm("업로드 회원 초기화?")) { setMemberList([]); await save(SK.members, []); showToast("🗑️ 완료"); } }}
                    style={{ width: "100%", marginTop: 8, padding: "7px", borderRadius: 8, border: `1px solid ${C.rose}30`, background: `${C.rose}04`, color: C.rose, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>🗑️ 업로드 초기화</button>
                )}
              </div>
              <div style={{ background: C.card, borderRadius: 16, padding: 18, border: `1px solid ${C.border}` }}>
                <div style={{ color: C.text, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>👥 회원 목록 ({memberList.length}명)</div>
                <div style={{ maxHeight: 350, overflowY: "auto" }}>
                  {memberList.length === 0 ? <div style={{ textAlign: "center", padding: 20, color: C.sub, fontSize: 11 }}>업로드하면 표시됩니다</div>
                  : memberList.slice(0, 30).map((m, i) => (
                    <div key={m.id || i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 9, color: C.sub, width: 18 }}>{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: C.text, fontSize: 11, fontWeight: 700 }}>{m.name}</div>
                        <div style={{ color: C.sub, fontSize: 9 }}>{m.group && <span style={{ background: `${C.purple}08`, color: C.purple, padding: "1px 4px", borderRadius: 3, fontSize: 8, marginRight: 3 }}>{m.group}</span>}{m.email || m.phone}</div>
                      </div>
                    </div>
                  ))}
                  {memberList.length > 30 && <div style={{ textAlign: "center", padding: 6, color: C.sub, fontSize: 9 }}>+{memberList.length - 30}명</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== DEVICES TAB ===== */}
        {adminTab === "devices" && (
          <div style={{ background: C.card, borderRadius: 16, padding: 18, border: `1px solid ${C.border}` }}>
            <h3 style={{ color: C.text, fontSize: 14, fontWeight: 800, marginBottom: 12 }}>📱 등록 디바이스 ({devices.length}대)</h3>
            <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3,1fr)" : "1fr", gap: 8, marginBottom: 10 }}>
              {[
                { l: "LG태블릿", v: devices.filter(d => d.type === "LG태블릿").length, c: C.blue, i: "📟" },
                { l: "노트북/PC", v: devices.filter(d => d.type === "노트북/PC").length, c: C.indigo, i: "💻" },
                { l: "기타", v: devices.filter(d => !["LG태블릿","노트북/PC"].includes(d.type)).length, c: C.gold, i: "📱" },
              ].map((d, i) => (
                <div key={i} style={{ background: `${d.c}06`, borderRadius: 10, padding: "10px 14px", border: `1px solid ${d.c}15` }}>
                  <span style={{ fontSize: 14 }}>{d.i}</span> <span style={{ fontSize: 12, fontWeight: 700, color: d.c }}>{d.v}대</span>
                  <div style={{ fontSize: 9, color: C.sub }}>{d.l}</div>
                </div>
              ))}
            </div>
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {devices.map(d => (
                <div key={d.id} style={{ padding: "7px 0", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{d.type}</span> <span style={{ fontSize: 9, color: C.sub }}>#{d.id}</span><div style={{ fontSize: 9, color: C.sub }}>{new Date(d.lastActive).toLocaleString("ko-KR")}</div></div>
                  <span style={{ background: `${C.emerald}10`, color: C.emerald, padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700 }}>{d.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== DATA TAB ===== */}
        {adminTab === "data" && (
          <div style={{ background: C.card, borderRadius: 16, padding: 18, border: `1px solid ${C.border}` }}>
            <h3 style={{ color: C.text, fontSize: 14, fontWeight: 800, marginBottom: 12 }}>🗄️ 데이터 관리</h3>
            {[
              { l: "신청 업체", v: apps.length, c: C.blue },
              { l: "바이어/MD (신규)", v: buyerList.length, c: C.purple },
              { l: "유료체험단 (신규)", v: expList.length, c: C.orange },
              { l: "회원 (업로드)", v: memberList.length, c: C.emerald },
              { l: "선정업체", v: stats.selected, c: C.rose },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: `${s.c}06`, borderRadius: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: C.text }}>{s.l}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: s.c }}>{s.v}</span>
              </div>
            ))}
            <button onClick={async () => { if (confirm("전체 데이터 초기화?")) { setApps([]); setBuyerList([]); setExpList([]); setMemberList([]); setDevices([]); for (const k of Object.values(SK)) await save(k, []); showToast("🗑️ 완료"); } }}
              style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1px solid ${C.rose}30`, background: `${C.rose}06`, color: C.rose, fontSize: 11, fontWeight: 700, cursor: "pointer", marginTop: 10 }}>🗑️ 전체 데이터 초기화</button>
          </div>
        )}
      </div>
    );
  };

  // ===== MEETING MODAL =====
  const MeetingModal = () => {
    const [type, setType] = useState("online");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("10:00");
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }} onClick={() => setMeetingModal(null)}>
        <div style={{ background: C.card, borderRadius: 20, padding: 22, maxWidth: 380, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", animation: "fi .3s ease" }} onClick={e => e.stopPropagation()}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 12 }}>📅 1:1 컨설팅 예약</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {[{ v: "online", i: "💻", l: "구글미팅" }, { v: "offline", i: "🏢", l: "본사" }].map(o => (
              <div key={o.v} onClick={() => setType(o.v)} style={{ flex: 1, padding: 12, borderRadius: 12, textAlign: "center", cursor: "pointer", background: type === o.v ? `${C.blue}06` : C.light, border: `2px solid ${type === o.v ? C.blue : C.border}` }}>
                <span style={{ fontSize: 20 }}>{o.i}</span><div style={{ fontSize: 10, fontWeight: 600, color: type === o.v ? C.blue : C.sub }}>{o.l}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1 }}><label style={{ color: C.sub, fontSize: 10 }}>날짜</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: "100%", padding: "9px", borderRadius: 10, background: C.light, border: `1px solid ${C.border}`, fontSize: 12, marginTop: 4 }} /></div>
            <div style={{ flex: 1 }}><label style={{ color: C.sub, fontSize: 10 }}>시간</label><select value={time} onChange={e => setTime(e.target.value)} style={{ width: "100%", padding: "9px", borderRadius: 10, background: C.light, border: `1px solid ${C.border}`, fontSize: 12, marginTop: 4 }}>{["10:00","11:00","13:00","14:00","15:00","16:00","17:00"].map(t => <option key={t}>{t}</option>)}</select></div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setMeetingModal(null)} style={{ flex: 1, padding: 11, borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, color: C.sub, cursor: "pointer", fontSize: 12 }}>취소</button>
            <button onClick={() => { if (date) bookMeeting(meetingModal, type, date, time); else showToast("⚠️ 날짜 선택", "warn"); }} style={{ flex: 2, padding: 11, borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.blue}, ${C.indigo})`, color: "#FFF", cursor: "pointer", fontSize: 12, fontWeight: 800 }}>📅 확정</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: "'Pretendard','Noto Sans KR',-apple-system,sans-serif", background: C.bg, minHeight: "100vh", maxWidth: maxW, margin: "0 auto", padding: pad }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        @keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes bounce{0%{transform:scale(.3)}50%{transform:scale(1.1)}100%{transform:scale(1)}}
        *{box-sizing:border-box;margin:0}input,select,textarea,button{font-family:inherit}
        input:focus,select:focus,textarea:focus{border-color:#2563EB!important;box-shadow:0 0 0 3px rgba(37,99,235,0.06)}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:4px}
      `}</style>
      {toast && <div style={{ position: "fixed", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: toast.type === "warn" ? "#F59E0B" : "#059669", color: "#FFF", padding: "12px 24px", borderRadius: 14, fontSize: 12, fontWeight: 700, animation: "fi .3s ease", boxShadow: "0 4px 20px rgba(0,0,0,0.2)", maxWidth: 360, textAlign: "center" }}>{toast.msg}</div>}
      {meetingModal && <MeetingModal />}
      <Nav />
      {page === "home" && <Home />}
      {page === "apply" && <ApplyForm />}
      {page === "complete" && <Complete />}
      {page === "buyerReg" && <SimpleRegForm title="참가 글로벌 바이어/MD 등록" icon="🌏" color={C.purple} formData={buyerForm} setFormData={setBuyerForm} onSubmit={submitBuyer} list={buyerList} type="buyer" />}
      {page === "expReg" && <SimpleRegForm title="유료체험단 등록" icon="👥" color={C.orange} formData={expForm} setFormData={setExpForm} onSubmit={submitExp} list={expList} type="exp" />}
      {page === "admin" && <Admin />}
    </div>
  );
};

export default App;

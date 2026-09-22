import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BarChart3,
  Bell,
  Bike,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileCheck2,
  Gauge,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Lock,
  LogOut,
  Search,
  Settings,
  ShieldAlert,
  Unlock,
  Users,
  UserRoundPlus,
  XCircle,
} from "lucide-react";
import "./styles.css";

function normalizeApiBaseUrl(value) {
  const rawValue = String(value || "/api").trim().replace(/\/$/, "");
  if (rawValue === "/api") return rawValue;
  if (rawValue.endsWith("/api")) return rawValue;
  return `${rawValue}/api`;
}

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);
const LOCAL_API_BASE_URL = "http://localhost:5228/api";

async function parseResponseBody(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(data, response) {
  if (Array.isArray(data)) {
    const messages = data
      .map((item) => item?.errorMessage || item?.ErrorMessage || item?.message || item?.Message)
      .filter(Boolean);
    if (messages.length) return messages.join("; ");
  }

  if (data?.errors && typeof data.errors === "object") {
    const messages = Object.values(data.errors).flat().filter(Boolean);
    if (messages.length) return messages.join("; ");
  }

  return (
    data?.message ||
    data?.title ||
    (typeof data === "string" && data.trim()) ||
    response.statusText ||
    "Request failed"
  );
}

async function fetchApi(url, { token, ...options } = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  const data = await parseResponseBody(response);
  return { response, data };
}

const MENU_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "users", label: "Users & Drivers", icon: Users },
  { key: "statistics", label: "Thống kê", icon: BarChart3 },
  { key: "performance", label: "Hiệu suất", icon: Gauge },
  { key: "staff", label: "Quản lý nhân viên", icon: UserRoundPlus },
  { key: "pricing", label: "Cấu hình phí", icon: Settings },
];
const STAFF_MENU_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "driver-approvals", label: "Duyệt hồ sơ tài xế", icon: FileCheck2 },
  { key: "complaints", label: "Complaints & Support", icon: LifeBuoy },
];

const ROLE_OPTIONS = ["Tất cả vai trò", "Manager", "Staff"];
const EMPLOYEE_CREATE_ROLES = ["Staff", "Manager"];
const STATUS_OPTIONS = ["Tất cả trạng thái", "Active", "Inactive", "Locked"];
const VEHICLE_TABS = ["Bike", "Car"];
const VEHICLE_TYPE_VALUES = { Bike: 1, Car: 2 };
const USER_DRIVER_PAGE_SIZE = 10;
const STAT_PERIODS = ["Ngày", "Tháng", "Năm"];
const TOP_DRIVER_RANKS = ["rank-gold", "rank-silver", "rank-orange", "rank-blue", "rank-purple"];
const COMPLAINT_STATUS_OPTIONS = [
  { label: "Tất cả", value: "" },
  { label: "Chờ xử lý", value: "Pending", code: 1 },
  { label: "Đang xử lý", value: "InReview", code: 2 },
  { label: "Đã giải quyết", value: "Resolved", code: 3 },
  { label: "Từ chối", value: "Rejected", code: 4 },
];
const COMPLAINT_STATUS_CODE = COMPLAINT_STATUS_OPTIONS.reduce((map, option) => {
  if (option.value) map[option.value] = option.code;
  return map;
}, {});
const DRIVER_REGISTRATION_STATUS_OPTIONS = [
  { label: "Chờ duyệt", value: "Pending", code: 0 },
  { label: "Đã duyệt", value: "Approved", code: 1 },
  { label: "Từ chối", value: "Rejected", code: 2 },
];
const VEHICLE_TYPE_LABELS = {
  0: "Bike",
  1: "Car",
  2: "SUV",
  3: "Van",
  Bike: "Bike",
  Car: "Car",
  SUV: "SUV",
  Van: "Van",
};
const PRICING_RULES = [
  { key: "baseDistance", code: 1, name: "BaseDistance", label: "Số km mở cửa", unit: 2 },
  { key: "baseFare", code: 2, name: "BaseFare", label: "Giá mở cửa", unit: 1 },
  { key: "pricePerKm", code: 3, name: "PricePerKm", label: "Giá/km", unit: 1 },
  { key: "pricePerMinute", code: 4, name: "PricePerMinute", label: "Phí chờ/phút", unit: 1 },
  { key: "minimumFare", code: 6, name: "MinimumFare", label: "Giá tối thiểu", unit: 1 },
  { key: "commission", code: 8, name: "Commission", label: "Hoa hồng platform", unit: 4 },
];

async function apiRequest(path, { token, ...options } = {}) {
  const url = `${API_BASE_URL}${path}`;
  let activeUrl = url;

  let result;
  try {
    result = await fetchApi(url, { token, ...options });
  } catch {
    throw new Error(
      `Không kết nối được BE (${url}). Hãy kiểm tra BE đang chạy và VITE_API_URL.`
    );
  }

  let { response, data } = result;

  if (response.status === 404 && API_BASE_URL === "/api") {
    const fallbackUrl = `${LOCAL_API_BASE_URL}${path}`;
    activeUrl = fallbackUrl;
    try {
      result = await fetchApi(fallbackUrl, { token, ...options });
      response = result.response;
      data = result.data;
    } catch {
      throw new Error(
        `Không kết nối được BE (${fallbackUrl}). Hãy kiểm tra BE đang chạy ở port 5228.`
      );
    }
  }

  if (!response.ok) {
    const message = getErrorMessage(data, response);
    throw new Error(`HTTP ${response.status} ${activeUrl}: ${message}`);
  }

  return data;
}

function getListPayload(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function getTotalCount(data) {
  if (Number.isFinite(Number(data?.totalCount))) return Number(data.totalCount);
  return getListPayload(data).length;
}

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("vi-VN");
}

function buildAssetUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const apiRoot = API_BASE_URL === "/api" ? LOCAL_API_BASE_URL : API_BASE_URL;
  return `${apiRoot.replace(/\/api$/, "")}${value.startsWith("/") ? value : `/${value}`}`;
}

function formatCurrency(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return "--";
  return `${Math.round(numberValue).toLocaleString("vi-VN")} đ`;
}

function formatCount(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return "--";
  return numberValue.toLocaleString("vi-VN");
}

function pickNumber(source, keys) {
  for (const key of keys) {
    const value = Number(source?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function formatOptionalRating(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return "--";
  return numberValue.toFixed(1);
}

function formatOptionalPercent(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return "--";
  return `${Math.round(numberValue)}%`;
}

function getStatisticsPeriodKey(period) {
  if (period === "Tháng") return "month";
  if (period === "Năm") return "year";
  return "day";
}

function getInitials(value) {
  const words = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "NA";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function getAccountSubtitle(account) {
  const studentId = account.studentId || account.studentCode || account.code;
  const email = account.email || "--";
  return studentId ? `${studentId} · ${email}` : email;
}

function normalizeRuleCode(ruleCode) {
  const map = {
    1: "BaseDistance",
    2: "BaseFare",
    3: "PricePerKm",
    4: "PricePerMinute",
    5: "PlatformFee",
    6: "MinimumFare",
    7: "VatPercent",
    8: "Commission",
    9: "PersonalIncomeTax",
  };
  return map[ruleCode] || String(ruleCode || "");
}

function pickRule(setting, code) {
  return setting?.rules?.find((rule) => normalizeRuleCode(rule.ruleCode) === code);
}

function getPricingSaveErrorMessage(error) {
  const message = error?.message || "Không lưu được cấu hình phí.";

  if (
    message.includes("/admin/pricing/version") &&
    message.includes("HTTP 500")
  ) {
    return "Không lưu được cấu hình phí. Vui lòng kiểm tra lại thông tin và thử lại sau.";
  }

  return message;
}

function App() {
  const [session, setSession] = useState(null);
  const [activePage, setActivePage] = useState("dashboard");

  useEffect(() => {
    localStorage.removeItem("fptRideAdminSession");
  }, []);

  function handleLogin(nextSession) {
    setSession(nextSession);
    localStorage.setItem("fptRideAdminSession", JSON.stringify(nextSession));
  }

  function handleLogout() {
    localStorage.removeItem("fptRideAdminSession");
    setSession(null);
    setActivePage("dashboard");
  }

  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <AdminShell
      session={session}
      activePage={activePage}
      onNavigate={setActivePage}
      onLogout={handleLogout}
    />
  );
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const role = String(data.role || "").toLowerCase();

      if (!["admin", "manager", "staff"].includes(role)) {
        throw new Error("Tài khoản này không có quyền truy cập Admin Portal.");
      }

      onLogin({
        accessToken: data.accessToken,
        expiresAt: data.expiresAt,
        userId: data.userId,
        fullName: data.fullName,
        email: data.email,
        role: data.role,
      });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-mark">A</div>
        <p className="eyebrow">FPT Ride Admin</p>
        <h1>Đăng nhập quản trị</h1>
        <p className="login-subtitle">
          Sử dụng tài khoản Admin, Manager hoặc Staff để quản lý hệ thống.
        </p>
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Email
            <input
              value={email}
              type="email"
              placeholder="admin@fpt.edu.vn"
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Mật khẩu
            <input
              value={password}
              type="password"
              placeholder="Nhập mật khẩu"
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error ? <div className="error-banner">{error}</div> : null}
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </section>
    </main>
  );
}

function AdminShell({ session, activePage, onNavigate, onLogout }) {
  const role = String(session.role || "").toLowerCase();
  const menuItems = useMemo(() => (role === "staff" ? STAFF_MENU_ITEMS : MENU_ITEMS), [role]);
  const activeItem = menuItems.find((item) => item.key === activePage);

  useEffect(() => {
    if (!menuItems.some((item) => item.key === activePage)) {
      onNavigate(menuItems[0]?.key || "dashboard");
    }
  }, [activePage, menuItems, onNavigate]);

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="admin-profile">
          <div className="avatar">A</div>
          <div>
            <strong>Admin FPT Ride</strong>
            <span>{session.role || "Admin"}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={activePage === item.key ? "nav-item active" : "nav-item"}
                onClick={() => onNavigate(item.key)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button className="logout-button" onClick={onLogout}>
          <LogOut size={18} />
          Đăng xuất
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <h1>FPT Ride Admin</h1>
          <button className="notification-button" aria-label="Thông báo">
            <Bell size={21} />
            <span />
          </button>
        </header>

        <main className="page-content">
          {activePage === "dashboard" ? <Dashboard token={session.accessToken} /> : null}
          {activePage === "users" ? <UsersDriversManagement token={session.accessToken} /> : null}
          {activePage === "statistics" ? <StatisticsPage token={session.accessToken} /> : null}
          {activePage === "performance" ? <PerformancePage token={session.accessToken} /> : null}
          {activePage === "complaints" ? <ComplaintsSupport token={session.accessToken} /> : null}
          {activePage === "driver-approvals" ? <DriverApprovals token={session.accessToken} /> : null}
          {activePage === "staff" ? <StaffManagement token={session.accessToken} /> : null}
          {activePage === "pricing" ? <PricingConfig token={session.accessToken} /> : null}
          {!["dashboard", "users", "statistics", "performance", "complaints", "driver-approvals", "staff", "pricing"].includes(activePage) ? (
            <BlankPage title={activeItem?.label || "Trang quản trị"} />
          ) : null}
        </main>
      </section>
    </div>
  );
}

function Dashboard({ token }) {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError("");

    apiRequest("/admin/statistics?period=day", { token })
      .then((data) => {
        if (!isMounted) return;
        setOverview(data?.overview || data?.Overview || null);
      })
      .catch((requestError) => {
        if (!isMounted) return;
        setOverview(null);
        setError(requestError.message);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const metrics = useMemo(() => {
    return [
      { label: "Tổng Users", value: formatCount(overview?.totalUsers), icon: Users, tone: "blue" },
      { label: "Tổng Drivers", value: formatCount(overview?.totalDrivers), icon: Bike, tone: "green" },
      { label: "Tổng chuyến", value: formatCount(overview?.totalTrips), icon: ShieldAlert, tone: "purple" },
      { label: "Hoàn thành", value: formatCount(overview?.completedTrips), icon: CheckCircle2, tone: "teal" },
      { label: "Tỷ lệ hủy chuyến", value: overview ? `${formatCount(overview.cancellationRate)}%` : "--", icon: null, tone: "red", wide: true },
      { label: "Bảng giá active", value: formatCount(overview?.activePricing), icon: Settings, tone: "orange" },
    ];
  }, [overview]);

  return (
    <section>
      <h2 className="page-title">Dashboard</h2>
      {isLoading ? <div className="notice-card">Đang tải thống kê...</div> : null}
      {error ? <div className="notice-card">{error}</div> : null}
      <div className="metric-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article
              key={metric.label}
              className={metric.wide ? "metric-card metric-wide" : "metric-card"}
            >
              <div className={`metric-icon ${metric.tone}`}>
                {Icon ? <Icon size={19} /> : null}
              </div>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              {metric.wide ? <div className="cancel-ring">{metric.value}</div> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function StatisticsPage({ token }) {
  const [activePeriod, setActivePeriod] = useState("Ngày");
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError("");

    apiRequest(`/admin/statistics?period=${getStatisticsPeriodKey(activePeriod)}`, { token })
      .then((data) => {
        if (!isMounted) return;
        setStats(data?.period || data?.Period || null);
      })
      .catch((requestError) => {
        if (!isMounted) return;
        setStats(null);
        setError(requestError.message);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activePeriod, token]);

  const chartPoints = stats?.tripChart || stats?.TripChart || [];
  const maxChartValue = Math.max(
    1,
    ...chartPoints.map((point) => Number(point.value ?? point.Value ?? 0))
  );

  const statCards = [
    { label: `Doanh thu ${activePeriod.toLowerCase()}`, value: formatCurrency(stats?.revenue), tone: "ink" },
    {
      label: "User mới",
      value: stats ? `+${formatCount(stats.newUsers)}` : "--",
      tone: "blue",
    },
    { label: "Driver hoạt động", value: formatCount(stats?.activeDrivers), tone: "green" },
    { label: `Chuyến ${activePeriod.toLowerCase()}`, value: formatCount(stats?.trips), tone: "purple" },
  ];

  return (
    <section>
      <h2 className="page-title">Thống kê</h2>

      <div className="stats-period-tabs">
        {STAT_PERIODS.map((period) => (
          <button
            key={period}
            className={activePeriod === period ? "active" : ""}
            onClick={() => setActivePeriod(period)}
          >
            {period}
          </button>
        ))}
      </div>

      <div className="statistics-grid">
        <article className="statistics-chart-card">
          <h3>Chuyến đi {activePeriod.toLowerCase()}</h3>
          <div className="bar-chart" aria-label={`Biểu đồ chuyến đi ${activePeriod.toLowerCase()}`}>
            {chartPoints.map((point) => {
              const label = point.label || point.Label;
              const value = Number(point.value ?? point.Value ?? 0);
              const height = Math.max(6, Math.round((value / maxChartValue) * 190));

              return (
              <div className="bar-column" key={label}>
                <div className="bar-track">
                  <span className="filled-bar" style={{ height }} title={`${value} chuyến`} />
                </div>
                <strong>{label}</strong>
              </div>
              );
            })}
            {isLoading || !chartPoints.length ? (
              <div className="chart-empty-note">
                {isLoading ? "Đang tải dữ liệu..." : "Chưa có dữ liệu thống kê."}
              </div>
            ) : null}
          </div>
        </article>

        <div className="statistics-card-grid">
          {statCards.map((card) => (
            <article className="statistics-summary-card" key={card.label}>
              <span>{card.label}</span>
              <strong className={`stat-${card.tone}`}>{card.value}</strong>
            </article>
          ))}
        </div>
      </div>

      {error ? <div className="notice-card statistics-error">{error}</div> : null}
    </section>
  );
}

function PerformancePage({ token }) {
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError("");

    apiRequest("/admin/statistics/drivers/top?limit=5", { token })
      .then((data) => {
        if (!isMounted) return;
        setDrivers(getListPayload(data));
      })
      .catch((requestError) => {
        if (!isMounted) return;
        setDrivers([]);
        setError(requestError.message);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <section>
      <h2 className="page-title">Hiệu suất</h2>
      {error ? <div className="notice-card">{error}</div> : null}

      <article className="performance-card">
        <h3>Top Drivers</h3>

        {isLoading ? (
          <div className="empty-cell">Đang tải danh sách tài xế...</div>
        ) : drivers.length ? (
          <div className="driver-rank-list">
            {drivers.map((driver, index) => {
              const tripCount = pickNumber(driver, ["completedTrips", "CompletedTrips"]);
              const rating = pickNumber(driver, ["averageRating", "AverageRating"]);
              const completionRate = pickNumber(driver, ["completionRate", "CompletionRate"]);
              const driverId = driver.driverId || driver.DriverId || driver.userId;

              return (
                <div className="driver-rank-row" key={driverId || driver.email}>
                  <span className={`rank-badge ${TOP_DRIVER_RANKS[index] || "rank-blue"}`}>
                    {index + 1}
                  </span>
                  <div className="driver-rank-main">
                    <strong>{driver.fullName || driver.FullName || driver.email || driver.Email || "--"}</strong>
                    <span>
                      {tripCount === null ? "--" : formatCount(tripCount)} chuyến
                    </span>
                  </div>
                  <div className="driver-rank-metrics">
                    <strong>{formatOptionalRating(rating)}★</strong>
                    <span>{formatOptionalPercent(completionRate)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-cell">Chưa có tài xế trong DB.</div>
        )}
      </article>

    </section>
  );
}

function UsersDriversManagement({ token }) {
  const [activeTab, setActiveTab] = useState("Customer");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [accounts, setAccounts] = useState([]);
  const [accountTotal, setAccountTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const tabLabel = activeTab === "Driver" ? "Drivers" : "Users";

  useEffect(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(USER_DRIVER_PAGE_SIZE),
      role: activeTab,
    });
    if (keyword.trim()) params.set("keyword", keyword.trim());

    setIsLoading(true);
    setError("");
    apiRequest(`/accounts?${params.toString()}`, { token })
      .then((data) => {
        setAccounts(getListPayload(data));
        setAccountTotal(getTotalCount(data));
      })
      .catch((requestError) => {
        setAccounts([]);
        setAccountTotal(0);
        setError(requestError.message);
      })
      .finally(() => setIsLoading(false));
  }, [activeTab, keyword, page, token, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(accountTotal / USER_DRIVER_PAGE_SIZE));
  const startIndex = accountTotal ? (page - 1) * USER_DRIVER_PAGE_SIZE + 1 : 0;
  const endIndex = Math.min(page * USER_DRIVER_PAGE_SIZE, accountTotal);

  function changeTab(nextTab) {
    setActiveTab(nextTab);
    setKeyword("");
    setPage(1);
  }

  async function handleToggleLock(account) {
    const nextLockedState = !account.isLocked;
    const actionText = nextLockedState ? "khóa" : "mở khóa";
    const isConfirmed = window.confirm(`Bạn có chắc muốn ${actionText} tài khoản ${account.email}?`);
    if (!isConfirmed) return;

    try {
      await apiRequest(`/accounts/${account.userId}/status`, {
        token,
        method: "PUT",
        body: JSON.stringify({ isLocked: nextLockedState }),
      });
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section>
      <h2 className="page-title">Quản lý Users & Drivers</h2>

      <div className="user-driver-toolbar">
        <div className="pill-tabs">
          <button
            className={activeTab === "Customer" ? "active" : ""}
            onClick={() => changeTab("Customer")}
          >
            Users
          </button>
          <button
            className={activeTab === "Driver" ? "active" : ""}
            onClick={() => changeTab("Driver")}
          >
            Drivers
          </button>
        </div>

        <div className="search-box user-driver-search">
          <Search size={20} />
          <input
            value={keyword}
            placeholder="Tìm theo tên, email..."
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {error ? <div className="notice-card">{error}</div> : null}

      <div className="user-driver-meta">
        {isLoading ? `Đang tải ${tabLabel.toLowerCase()}...` : `${accountTotal} ${tabLabel}`}
      </div>

      {isLoading ? null : accounts.length ? (
        <div className="account-card-grid">
          {accounts.map((account) => (
            <article className="account-card" key={account.userId || account.email}>
              <div className="account-avatar">
                {getInitials(account.fullName || account.email)}
              </div>
              <div className="account-main">
                <strong>{account.fullName || "--"}</strong>
                <span>{getAccountSubtitle(account)}</span>
              </div>
              <button
                className={account.isLocked ? "unlock-account-button" : "lock-account-button"}
                onClick={() => handleToggleLock(account)}
              >
                {account.isLocked ? "Mở khóa" : "Khóa"}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state-card">
          Chưa có dữ liệu {activeTab === "Driver" ? "tài xế" : "người dùng"} từ BE.
        </div>
      )}

      <div className="card-pagination">
        <span>
          {accountTotal
            ? `Hiển thị ${startIndex}-${endIndex} của ${accountTotal} ${tabLabel.toLowerCase()}`
            : `Chưa có ${tabLabel.toLowerCase()} phù hợp`}
        </span>
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            <ChevronLeft size={16} />
          </button>
          <button className="active-page">{page}</button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

function StaffManagement({ token }) {
  const [keyword, setKeyword] = useState("");
  const [role, setRole] = useState("Tất cả vai trò");
  const [status, setStatus] = useState("Tất cả trạng thái");
  const [accounts, setAccounts] = useState([]);
  const [accountTotal, setAccountTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    role: "Staff",
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [resetAccount, setResetAccount] = useState(null);
  const [resetPasswordForm, setResetPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [resetError, setResetError] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const rolesToFetch = role === "Tất cả vai trò" ? ["Manager", "Staff"] : [role];
    setIsLoading(true);
    setError("");
    Promise.all(
      rolesToFetch.map((employeeRole) => {
        const params = new URLSearchParams({
          page: "1",
          pageSize: "50",
          role: employeeRole,
        });
        if (keyword.trim()) params.set("keyword", keyword.trim());
        if (status === "Locked") params.set("isLocked", "true");
        if (status === "Active") params.set("isLocked", "false");

        return apiRequest(`/accounts?${params.toString()}`, { token });
      })
    )
      .then((responses) => {
        const mergedAccounts = responses
          .flatMap((data) => getListPayload(data))
          .filter((account) => ["manager", "staff"].includes(String(account.role).toLowerCase()));
        const mergedTotal = responses.reduce((total, data) => total + getTotalCount(data), 0);

        setAccounts(mergedAccounts);
        setAccountTotal(mergedTotal);
      })
      .catch((requestError) => {
        setAccounts([]);
        setAccountTotal(0);
        setError(requestError.message);
      })
      .finally(() => setIsLoading(false));
  }, [keyword, role, status, token, refreshKey]);

  const visibleAccounts = accounts.length ? accounts : [];

  function updateCreateForm(field, value) {
    setCreateForm((current) => ({ ...current, [field]: value }));
  }

  function openCreateModal() {
    setCreateForm({
      fullName: "",
      email: "",
      phoneNumber: "",
      password: "",
      role: "Staff",
    });
    setCreateError("");
    setIsCreateOpen(true);
  }

  function closeResetModal() {
    setResetAccount(null);
    setResetError("");
    setResetPasswordForm({ newPassword: "", confirmPassword: "" });
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    setResetError("");

    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
      setResetError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsResetting(true);
    try {
      await apiRequest(`/accounts/${resetAccount.userId}/reset-password`, {
        token,
        method: "PUT",
        body: JSON.stringify(resetPasswordForm),
      });
      closeResetModal();
    } catch (requestError) {
      setResetError(requestError.message);
    } finally {
      setIsResetting(false);
    }
  }

  async function handleToggleLock(account) {
    const nextLockedState = !account.isLocked;
    const actionText = nextLockedState ? "khóa" : "mở khóa";
    const isConfirmed = window.confirm(`Bạn có chắc muốn ${actionText} tài khoản ${account.email}?`);
    if (!isConfirmed) return;

    try {
      await apiRequest(`/accounts/${account.userId}/status`, {
        token,
        method: "PUT",
        body: JSON.stringify({ isLocked: nextLockedState }),
      });
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleCreateAccount(event) {
    event.preventDefault();
    setCreateError("");

    const trimmedFullName = createForm.fullName.trim();
    const trimmedEmail = createForm.email.trim();
    const trimmedPhoneNumber = createForm.phoneNumber.trim();

    if (!trimmedFullName) {
      setCreateError("Vui lòng nhập họ và tên.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setCreateError("Email không đúng định dạng.");
      return;
    }

    if (trimmedPhoneNumber && !/^(0[1-9][0-9]{8}|[1-9][0-9]{8})$/.test(trimmedPhoneNumber)) {
      setCreateError("Số điện thoại phải đúng định dạng Việt Nam, ví dụ 0912345678.");
      return;
    }

    if (
      createForm.password.length < 6 ||
      !/[A-Z]/.test(createForm.password) ||
      !/[a-z]/.test(createForm.password) ||
      !/[0-9]/.test(createForm.password)
    ) {
      setCreateError("Mật khẩu phải có ít nhất 6 ký tự, gồm chữ hoa, chữ thường và số.");
      return;
    }

    setIsCreating(true);

    try {
      await apiRequest("/accounts", {
        token,
        method: "POST",
        body: JSON.stringify({
          fullName: trimmedFullName,
          email: trimmedEmail,
          phoneNumber: trimmedPhoneNumber || null,
          password: createForm.password,
          role: createForm.role,
          address: null,
          dateOfBirth: null,
        }),
      });

      setCreateForm({
        fullName: "",
        email: "",
        phoneNumber: "",
        password: "",
        role: "Staff",
      });
      setIsCreateOpen(false);
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      setCreateError(requestError.message);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <section>
      <div className="page-heading-row">
        <div>
          <h2 className="page-title">Quản lý nhân viên</h2>
          <p>{accountTotal} Staff</p>
        </div>
        <button className="primary-button" onClick={openCreateModal}>
          <UserRoundPlus size={18} />
          Tạo tài khoản
        </button>
      </div>

      <div className="filter-card">
        <div className="search-box">
          <Search size={20} />
          <input
            value={keyword}
            placeholder="Tìm theo tên, email, số điện thoại..."
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
        <select value={role} onChange={(event) => setRole(event.target.value)}>
          {ROLE_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>

      {error ? <div className="notice-card">{error}</div> : null}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Nhân viên</th>
              <th>Email</th>
              <th>Số điện thoại</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7" className="empty-cell">Đang tải nhân viên...</td>
              </tr>
            ) : visibleAccounts.length ? (
              visibleAccounts.map((account) => (
                <tr key={account.userId || account.email}>
                  <td>
                    <div className="employee-cell">
                      <div className="employee-avatar">
                        {(account.fullName || account.email || "A").slice(0, 2).toUpperCase()}
                      </div>
                      {account.fullName || "--"}
                    </div>
                  </td>
                  <td>{account.email || "--"}</td>
                  <td>{account.phoneNumber || "--"}</td>
                  <td>{account.role || "--"}</td>
                  <td>
                    <span className={account.isLocked ? "status-pill locked" : "status-pill active"}>
                      {account.isLocked ? "Locked" : "Active"}
                    </span>
                  </td>
                  <td>{formatDate(account.createdAt)}</td>
                  <td>
                    <div className="action-icons">
                      <button aria-label="Xem chi tiết" onClick={() => setSelectedAccount(account)}>
                        <Eye size={17} />
                      </button>
                      <button
                        aria-label="Đặt lại mật khẩu"
                        onClick={() => {
                          setResetAccount(account);
                          setResetPasswordForm({ newPassword: "", confirmPassword: "" });
                          setResetError("");
                        }}
                      >
                        <KeyRound size={17} />
                      </button>
                      <button
                        aria-label={account.isLocked ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                        className={account.isLocked ? "unlock-action" : ""}
                        onClick={() => handleToggleLock(account)}
                      >
                        {account.isLocked ? <Unlock size={17} /> : <Lock size={17} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="empty-cell">Chưa có dữ liệu nhân viên từ BE.</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="table-footer">
          <span>
            {visibleAccounts.length
              ? `Hiển thị 1-${visibleAccounts.length} của ${accountTotal} nhân viên`
              : "Chưa có nhân viên phù hợp"}
          </span>
          <div className="pagination">
            <button><ChevronLeft size={16} /></button>
            <button className="active-page">1</button>
            <button><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {isCreateOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-card" aria-label="Tạo tài khoản nhân viên">
            <div className="modal-heading">
              <div>
                <h3>Tạo tài khoản nhân viên</h3>
                <p>Chỉ tạo tài khoản cho Staff hoặc Manager.</p>
              </div>
              <button className="ghost-button" onClick={() => setIsCreateOpen(false)}>
                Đóng
              </button>
            </div>

            <form className="modal-form" onSubmit={handleCreateAccount}>
              <label>
                Họ và tên
                <input
                  value={createForm.fullName}
                  onChange={(event) => updateCreateForm("fullName", event.target.value)}
                  placeholder="Nguyễn Văn A"
                  required
                />
              </label>
              <label>
                Email
                <input
                  value={createForm.email}
                  type="email"
                  autoComplete="off"
                  onChange={(event) => updateCreateForm("email", event.target.value)}
                  placeholder="staff@fpt.edu.vn"
                  required
                />
              </label>
              <label>
                Số điện thoại
                <input
                  value={createForm.phoneNumber}
                  onChange={(event) => updateCreateForm("phoneNumber", event.target.value)}
                  placeholder="0987654321"
                />
              </label>
              <label>
                Vai trò
                <select
                  value={createForm.role}
                  onChange={(event) => updateCreateForm("role", event.target.value)}
                >
                  {EMPLOYEE_CREATE_ROLES.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                Mật khẩu
                <input
                  value={createForm.password}
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  onChange={(event) => updateCreateForm("password", event.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  required
                />
              </label>

              {createError ? <div className="error-banner">{createError}</div> : null}

              <button className="primary-button" type="submit" disabled={isCreating}>
                {isCreating ? "Đang tạo..." : "Tạo tài khoản"}
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {selectedAccount ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-card compact-modal" aria-label="Chi tiết nhân viên">
            <div className="modal-heading">
              <div>
                <h3>Chi tiết nhân viên</h3>
                <p>{selectedAccount.email}</p>
              </div>
              <button className="ghost-button" onClick={() => setSelectedAccount(null)}>
                Đóng
              </button>
            </div>
            <div className="detail-grid">
              <DetailItem label="Họ tên" value={selectedAccount.fullName} />
              <DetailItem label="Email" value={selectedAccount.email} />
              <DetailItem label="Số điện thoại" value={selectedAccount.phoneNumber} />
              <DetailItem label="Vai trò" value={selectedAccount.role} />
              <DetailItem label="Trạng thái" value={selectedAccount.isLocked ? "Locked" : "Active"} />
              <DetailItem label="Ngày tạo" value={formatDate(selectedAccount.createdAt)} />
            </div>
          </section>
        </div>
      ) : null}

      {resetAccount ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-card compact-modal" aria-label="Đặt lại mật khẩu">
            <div className="modal-heading">
              <div>
                <h3>Đặt lại mật khẩu</h3>
                <p>{resetAccount.email}</p>
              </div>
              <button className="ghost-button" onClick={closeResetModal}>
                Đóng
              </button>
            </div>
            <form className="modal-form" onSubmit={handleResetPassword}>
              <label>
                Mật khẩu mới
                <input
                  value={resetPasswordForm.newPassword}
                  type="password"
                  minLength={6}
                  autoComplete="new-password"
                  onChange={(event) =>
                    setResetPasswordForm((current) => ({
                      ...current,
                      newPassword: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                Xác nhận mật khẩu
                <input
                  value={resetPasswordForm.confirmPassword}
                  type="password"
                  minLength={6}
                  autoComplete="new-password"
                  onChange={(event) =>
                    setResetPasswordForm((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              {resetError ? <div className="error-banner">{resetError}</div> : null}
              <button className="primary-button" type="submit" disabled={isResetting}>
                {isResetting ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value || "--"}</strong>
    </div>
  );
}

function DriverApprovals({ token }) {
  const [registrations, setRegistrations] = useState([]);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [rejectRegistration, setRejectRegistration] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const statusOption = DRIVER_REGISTRATION_STATUS_OPTIONS.find((option) => option.value === statusFilter);
    const query = statusOption ? `?status=${statusOption.code}` : "";

    setIsLoading(true);
    setError("");
    apiRequest(`/driver-registration${query}`, { token })
      .then((data) => setRegistrations(getListPayload(data)))
      .catch((requestError) => {
        setRegistrations([]);
        setError(requestError.message);
      })
      .finally(() => setIsLoading(false));
  }, [statusFilter, token, refreshKey]);

  async function handleApprove(registration) {
    const isConfirmed = window.confirm(`Duyệt hồ sơ tài xế ${registration.fullName || registration.FullName || registration.email}?`);
    if (!isConfirmed) return;

    setActionError("");
    setIsSubmitting(true);
    try {
      await apiRequest(`/driver-registration/${registration.id || registration.Id}/approve`, {
        token,
        method: "PUT",
      });
      setSelectedRegistration(null);
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReject(event) {
    event.preventDefault();
    setActionError("");

    if (!rejectReason.trim()) {
      setActionError("Vui lòng nhập lý do từ chối.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest(`/driver-registration/${rejectRegistration.id || rejectRegistration.Id}/reject`, {
        token,
        method: "PUT",
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      setRejectRegistration(null);
      setSelectedRegistration(null);
      setRejectReason("");
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const pendingCount = registrations.filter((item) => getDriverRegistrationStatusValue(item.status ?? item.Status) === "Pending").length;

  return (
    <section>
      <div className="section-header">
        <div>
          <p className="eyebrow">Staff</p>
          <h2 className="page-title">Duyệt hồ sơ tài xế</h2>
        </div>
        <button className="primary-button" onClick={() => setRefreshKey((value) => value + 1)}>
          Làm mới
        </button>
      </div>

      <div className="approval-summary">
        <article>
          <span>Đang hiển thị</span>
          <strong>{registrations.length}</strong>
        </article>
        <article>
          <span>Chờ duyệt</span>
          <strong>{pendingCount}</strong>
        </article>
      </div>

      <div className="toolbar-card">
        <label>
          Trạng thái hồ sơ
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {DRIVER_REGISTRATION_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <div className="notice-card">{error}</div> : null}
      {actionError ? <div className="error-banner action-error">{actionError}</div> : null}

      <div className="data-card">
        <table>
          <thead>
            <tr>
              <th>Tài xế</th>
              <th>Email</th>
              <th>Loại xe</th>
              <th>Biển số</th>
              <th>Ngày nộp</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7" className="empty-cell">Đang tải hồ sơ tài xế...</td>
              </tr>
            ) : registrations.length ? (
              registrations.map((registration) => {
                const status = getDriverRegistrationStatusValue(registration.status ?? registration.Status);
                return (
                  <tr key={registration.id || registration.Id}>
                    <td>{registration.fullName || registration.FullName || "--"}</td>
                    <td>{registration.email || registration.Email || "--"}</td>
                    <td>{getVehicleTypeLabel(registration.vehicleType ?? registration.VehicleType)}</td>
                    <td>{registration.licensePlate || registration.LicensePlate || "--"}</td>
                    <td>{formatDate(registration.createdAt || registration.CreatedAt)}</td>
                    <td>
                      <span className={`status-pill driver-registration-${status.toLowerCase()}`}>
                        {getDriverRegistrationStatusLabel(status)}
                      </span>
                    </td>
                    <td>
                      <button className="ghost-button" onClick={() => setSelectedRegistration(registration)}>
                        Xem
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="empty-cell">Chưa có hồ sơ tài xế phù hợp.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedRegistration ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-card wide-modal" aria-label="Chi tiết hồ sơ tài xế">
            <div className="modal-heading">
              <div>
                <h3>{selectedRegistration.fullName || selectedRegistration.FullName || "Hồ sơ tài xế"}</h3>
                <p>{selectedRegistration.email || selectedRegistration.Email}</p>
              </div>
              <button className="ghost-button" onClick={() => setSelectedRegistration(null)}>
                Đóng
              </button>
            </div>

            <div className="driver-approval-detail">
              <div className="detail-grid">
                <DetailItem label="Số điện thoại" value={selectedRegistration.phoneNumber || selectedRegistration.PhoneNumber} />
                <DetailItem label="CCCD" value={selectedRegistration.citizenId || selectedRegistration.CitizenId} />
                <DetailItem label="GPLX" value={selectedRegistration.licenseNumber || selectedRegistration.LicenseNumber} />
                <DetailItem label="Hạng GPLX" value={selectedRegistration.licenseClass || selectedRegistration.LicenseClass} />
                <DetailItem label="Hạn GPLX" value={formatDate(selectedRegistration.licenseExpiryDate || selectedRegistration.LicenseExpiryDate)} />
                <DetailItem label="Loại xe" value={getVehicleTypeLabel(selectedRegistration.vehicleType ?? selectedRegistration.VehicleType)} />
                <DetailItem label="Biển số" value={selectedRegistration.licensePlate || selectedRegistration.LicensePlate} />
                <DetailItem label="Hãng xe" value={selectedRegistration.vehicleBrand || selectedRegistration.VehicleBrand} />
                <DetailItem label="Mẫu xe" value={selectedRegistration.vehicleModel || selectedRegistration.VehicleModel} />
                <DetailItem label="Màu xe" value={selectedRegistration.vehicleColor || selectedRegistration.VehicleColor} />
                <DetailItem label="Số ghế" value={selectedRegistration.seatCount || selectedRegistration.SeatCount} />
                <DetailItem label="Trạng thái" value={getDriverRegistrationStatusLabel(selectedRegistration.status ?? selectedRegistration.Status)} />
              </div>

              <div className="document-grid">
                <DocumentLink label="Ảnh CCCD" url={selectedRegistration.citizenIdImageUrl || selectedRegistration.CitizenIdImageUrl} />
                <DocumentLink label="GPLX mặt trước" url={selectedRegistration.licenseImageFrontUrl || selectedRegistration.LicenseImageFrontUrl} />
                <DocumentLink label="GPLX mặt sau" url={selectedRegistration.licenseImageBackUrl || selectedRegistration.LicenseImageBackUrl} />
                <DocumentLink label="Ảnh biển số" url={selectedRegistration.licensePlateImageUrl || selectedRegistration.LicensePlateImageUrl} />
                <DocumentLink label="Đăng ký xe" url={selectedRegistration.vehicleRegistrationImageUrl || selectedRegistration.VehicleRegistrationImageUrl} />
                <DocumentLink label="Ảnh xe" url={selectedRegistration.vehicleImageUrl || selectedRegistration.VehicleImageUrl} />
              </div>
            </div>

            {getDriverRegistrationStatusValue(selectedRegistration.status ?? selectedRegistration.Status) === "Pending" ? (
              <div className="modal-actions">
                <button className="primary-button approve-button" disabled={isSubmitting} onClick={() => handleApprove(selectedRegistration)}>
                  <CheckCircle2 size={18} />
                  Duyệt hồ sơ
                </button>
                <button
                  className="danger-button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setRejectRegistration(selectedRegistration);
                    setRejectReason("");
                    setActionError("");
                  }}
                >
                  <XCircle size={18} />
                  Từ chối
                </button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {rejectRegistration ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-card compact-modal" aria-label="Từ chối hồ sơ tài xế">
            <div className="modal-heading">
              <div>
                <h3>Từ chối hồ sơ</h3>
                <p>{rejectRegistration.fullName || rejectRegistration.FullName}</p>
              </div>
              <button className="ghost-button" onClick={() => setRejectRegistration(null)}>
                Đóng
              </button>
            </div>

            <form className="modal-form" onSubmit={handleReject}>
              <label>
                Lý do từ chối
                <textarea
                  value={rejectReason}
                  rows={4}
                  maxLength={500}
                  onChange={(event) => setRejectReason(event.target.value)}
                  placeholder="Nhập lý do để tài xế bổ sung/chỉnh sửa hồ sơ"
                  required
                />
              </label>
              {actionError ? <div className="error-banner">{actionError}</div> : null}
              <button className="primary-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang lưu..." : "Lưu từ chối"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function DocumentLink({ label, url }) {
  const assetUrl = buildAssetUrl(url);

  return (
    <a className={assetUrl ? "document-link" : "document-link disabled"} href={assetUrl || undefined} target="_blank" rel="noreferrer">
      <span>{label}</span>
      <strong>{assetUrl ? "Mở tài liệu" : "Chưa có"}</strong>
    </a>
  );
}

function getDriverRegistrationStatusValue(status) {
  if (status === 0 || status === "0") return "Pending";
  if (status === 1 || status === "1") return "Approved";
  if (status === 2 || status === "2") return "Rejected";
  return status || "Pending";
}

function getDriverRegistrationStatusLabel(status) {
  const value = getDriverRegistrationStatusValue(status);
  return DRIVER_REGISTRATION_STATUS_OPTIONS.find((option) => option.value === value)?.label || value || "--";
}

function getVehicleTypeLabel(vehicleType) {
  return VEHICLE_TYPE_LABELS[vehicleType] || vehicleType || "--";
}

function ComplaintsSupport({ token }) {
  const [complaints, setComplaints] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [processStatus, setProcessStatus] = useState("InReview");
  const [resolutionNote, setResolutionNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [processError, setProcessError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const statusOption = COMPLAINT_STATUS_OPTIONS.find((option) => option.value === statusFilter);
    const query = statusOption?.code ? `?status=${statusOption.code}` : "";

    setIsLoading(true);
    apiRequest(`/reports${query}`, { token })
      .then((data) => {
        setComplaints(getListPayload(data));
        setError("");
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setIsLoading(false));
  }, [statusFilter, token, refreshKey]);

  function openProcessModal(complaint) {
    const currentStatus = complaint.status || complaint.Status || "Pending";
    setSelectedComplaint(complaint);
    setProcessStatus(currentStatus === "Pending" ? "InReview" : currentStatus);
    setResolutionNote(complaint.resolutionNote || complaint.ResolutionNote || "");
    setProcessError("");
  }

  async function handleProcessComplaint(event) {
    event.preventDefault();
    setProcessError("");
    setIsSubmitting(true);

    try {
      await apiRequest(`/reports/${selectedComplaint.id || selectedComplaint.Id}/process`, {
        token,
        method: "PUT",
        body: JSON.stringify({
          status: COMPLAINT_STATUS_CODE[processStatus],
          resolutionNote: resolutionNote.trim() || null,
        }),
      });

      setSelectedComplaint(null);
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      setProcessError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const statusSummary = COMPLAINT_STATUS_OPTIONS.filter((option) => option.value).map((option) => ({
    ...option,
    total: complaints.filter((complaint) => (complaint.status || complaint.Status) === option.value).length,
  }));

  return (
    <section>
      <div className="section-header">
        <div>
          <p className="eyebrow">Complaints & Support</p>
          <h2 className="page-title">Xử lý khiếu nại</h2>
        </div>
        <button className="primary-button" onClick={() => setRefreshKey((value) => value + 1)}>
          Làm mới
        </button>
      </div>

      <div className="complaint-summary">
        {statusSummary.map((item) => (
          <article key={item.value}>
            <span>{item.label}</span>
            <strong>{item.total}</strong>
          </article>
        ))}
      </div>

      <div className="toolbar-card">
        <label>
          Trạng thái
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {COMPLAINT_STATUS_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <div className="notice-card">{error}</div> : null}

      <div className="data-card">
        <table>
          <thead>
            <tr>
              <th>Người gửi</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Tài xế</th>
              <th>Nội dung</th>
              <th>Ngày gửi</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7" className="empty-cell">Đang tải khiếu nại...</td>
              </tr>
            ) : complaints.length ? (
              complaints.map((complaint) => (
                <tr key={complaint.id || complaint.Id}>
                  <td>{complaint.reporterName || complaint.ReporterName || "--"}</td>
                  <td>{complaint.reporterRole || complaint.ReporterRole || "--"}</td>
                  <td>
                    <span className={`status-pill complaint-${String(complaint.status || complaint.Status).toLowerCase()}`}>
                      {getComplaintStatusLabel(complaint.status || complaint.Status)}
                    </span>
                  </td>
                  <td>{complaint.driverName || complaint.DriverName || "--"}</td>
                  <td className="complaint-reason">{complaint.reason || complaint.Reason || "--"}</td>
                  <td>{formatDate(complaint.createdAt || complaint.CreatedAt)}</td>
                  <td>
                    <button className="ghost-button" onClick={() => openProcessModal(complaint)}>
                      Xử lý
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="empty-cell">Chưa có khiếu nại phù hợp.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedComplaint ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-card" aria-label="Xử lý khiếu nại">
            <div className="modal-heading">
              <div>
                <h3>Xử lý khiếu nại</h3>
                <p>Trip #{String(selectedComplaint.tripId || selectedComplaint.TripId || "").slice(0, 8)}</p>
              </div>
              <button className="ghost-button" onClick={() => setSelectedComplaint(null)}>
                Đóng
              </button>
            </div>

            <div className="complaint-detail">
              <DetailItem label="Người gửi" value={selectedComplaint.reporterName || selectedComplaint.ReporterName} />
              <DetailItem label="Vai trò" value={selectedComplaint.reporterRole || selectedComplaint.ReporterRole} />
              <DetailItem label="Tài xế" value={selectedComplaint.driverName || selectedComplaint.DriverName} />
              <p>{selectedComplaint.reason || selectedComplaint.Reason}</p>
            </div>

            <form className="modal-form" onSubmit={handleProcessComplaint}>
              <label>
                Trạng thái xử lý
                <select value={processStatus} onChange={(event) => setProcessStatus(event.target.value)}>
                  {COMPLAINT_STATUS_OPTIONS.filter((option) => option.value && option.value !== "Pending").map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Ghi chú xử lý
                <textarea
                  value={resolutionNote}
                  rows={4}
                  maxLength={1000}
                  onChange={(event) => setResolutionNote(event.target.value)}
                  placeholder="Nhập kết quả xử lý cho khách/tài xế theo dõi"
                />
              </label>
              {processError ? <div className="error-banner">{processError}</div> : null}
              <button className="primary-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang lưu..." : "Lưu xử lý"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function getComplaintStatusLabel(status) {
  return COMPLAINT_STATUS_OPTIONS.find((option) => option.value === status)?.label || status || "--";
}

function PricingConfig({ token }) {
  const [activeVehicle, setActiveVehicle] = useState("Bike");
  const [settings, setSettings] = useState([]);
  const [error, setError] = useState("");
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [pricingError, setPricingError] = useState("");
  const [pricingForm, setPricingForm] = useState({
    baseDistance: "",
    baseFare: "",
    pricePerKm: "",
    pricePerMinute: "",
    minimumFare: "",
    commission: "",
    description: "",
  });
  const [pricingRefreshKey, setPricingRefreshKey] = useState(0);

  useEffect(() => {
    apiRequest("/admin/pricing", { token })
      .then((data) => {
        setSettings(getListPayload(data));
        setError("");
      })
      .catch((requestError) => setError(requestError.message));
  }, [token, pricingRefreshKey]);

  const currentSetting =
    settings.find((item) => item.vehicleType === activeVehicle) ||
    settings.find((item) => String(item.vehicleType).toLowerCase() === activeVehicle.toLowerCase());

  const baseDistance = pickRule(currentSetting, "BaseDistance");
  const baseFare = pickRule(currentSetting, "BaseFare");
  const pricePerKm = pickRule(currentSetting, "PricePerKm");
  const pricePerMinute = pickRule(currentSetting, "PricePerMinute");
  const minimumFare = pickRule(currentSetting, "MinimumFare");
  const commission = pickRule(currentSetting, "Commission");

  function openPricingModal() {
    setPricingForm({
      baseDistance: String(baseDistance?.decimalValue ?? "2"),
      baseFare: String(baseFare?.decimalValue ?? ""),
      pricePerKm: String(pricePerKm?.decimalValue ?? ""),
      pricePerMinute: String(pricePerMinute?.decimalValue ?? ""),
      minimumFare: String(minimumFare?.decimalValue ?? baseFare?.decimalValue ?? ""),
      commission: String(commission?.decimalValue ?? ""),
      description: currentSetting?.description || "",
    });
    setPricingError("");
    setIsPricingOpen(true);
  }

  function updatePricingForm(field, value) {
    setPricingForm((current) => ({ ...current, [field]: value }));
  }

  async function handleUpdatePricing(event) {
    event.preventDefault();
    setPricingError("");
    setIsSavingPricing(true);

    try {
      const createdVersion = await apiRequest("/admin/pricing/version", {
        token,
        method: "POST",
        body: JSON.stringify({
          vehicleType: VEHICLE_TYPE_VALUES[activeVehicle],
          description: pricingForm.description.trim() || `Cập nhật cấu hình ${activeVehicle}`,
          effectiveFrom: new Date().toISOString(),
          rules: PRICING_RULES.map((rule) => ({
            ruleCode: rule.code,
            ruleName: rule.name,
            decimalValue: Number(pricingForm[rule.key] || pricingForm.baseFare || 0),
            unit: rule.unit,
            description: rule.label,
          })),
        }),
      });

      const createdVersionId = createdVersion?.id ?? createdVersion?.Id;
      if (createdVersionId) {
        await apiRequest(`/admin/pricing/publish/${createdVersionId}`, {
          token,
          method: "PUT",
        });
      }

      setIsPricingOpen(false);
      setPricingRefreshKey((value) => value + 1);
    } catch (requestError) {
      setPricingError(getPricingSaveErrorMessage(requestError));
    } finally {
      setIsSavingPricing(false);
    }
  }

  return (
    <section>
      <h2 className="page-title">Cấu hình phí</h2>

      <div className="vehicle-tabs">
        {VEHICLE_TABS.map((vehicle) => (
          <button
            key={vehicle}
            className={activeVehicle === vehicle ? "vehicle-tab active" : "vehicle-tab"}
            onClick={() => setActiveVehicle(vehicle)}
          >
            {vehicle}
          </button>
        ))}
      </div>

      {error ? <div className="notice-card">{error}</div> : null}

      <article className="pricing-card">
        <PricingLine label="Giá mở cửa" value={formatCurrency(baseFare?.decimalValue)} />
        <PricingLine label="Giá/km" value={formatCurrency(pricePerKm?.decimalValue)} />
        <PricingLine label="Phí chờ/phút" value={formatCurrency(pricePerMinute?.decimalValue)} />
        <PricingLine
          label="Hoa hồng platform"
          value={commission ? `${commission.decimalValue}%` : "--"}
        />
        <button className="primary-button pricing-button" onClick={openPricingModal}>
          Cập nhật cấu hình
        </button>
      </article>

      {isPricingOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-card" aria-label="Cập nhật cấu hình phí">
            <div className="modal-heading">
              <div>
                <h3>Cập nhật cấu hình phí</h3>
                <p>Tạo version giá mới cho {activeVehicle}.</p>
              </div>
              <button className="ghost-button" onClick={() => setIsPricingOpen(false)}>
                Đóng
              </button>
            </div>

            <form className="modal-form" onSubmit={handleUpdatePricing}>
              <label>
                Giá mở cửa
                <input
                  value={pricingForm.baseFare}
                  type="number"
                  min="0"
                  onChange={(event) => updatePricingForm("baseFare", event.target.value)}
                  required
                />
              </label>
              <label>
                Giá/km
                <input
                  value={pricingForm.pricePerKm}
                  type="number"
                  min="0"
                  onChange={(event) => updatePricingForm("pricePerKm", event.target.value)}
                  required
                />
              </label>
              <label>
                Phí chờ/phút
                <input
                  value={pricingForm.pricePerMinute}
                  type="number"
                  min="0"
                  onChange={(event) => updatePricingForm("pricePerMinute", event.target.value)}
                  required
                />
              </label>
              <label>
                Hoa hồng platform (%)
                <input
                  value={pricingForm.commission}
                  type="number"
                  min="0"
                  max="100"
                  onChange={(event) => updatePricingForm("commission", event.target.value)}
                  required
                />
              </label>
              <label>
                Mô tả
                <input
                  value={pricingForm.description}
                  onChange={(event) => updatePricingForm("description", event.target.value)}
                  placeholder="Ghi chú version giá"
                />
              </label>

              {pricingError ? <div className="error-banner">{pricingError}</div> : null}

              <button className="primary-button" type="submit" disabled={isSavingPricing}>
                {isSavingPricing ? "Đang cập nhật..." : "Lưu cấu hình"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function PricingLine({ label, value }) {
  return (
    <div className="pricing-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function BlankPage({ title }) {
  return (
    <section className="blank-page">
      <h2>{title}</h2>
    </section>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

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
  Lock,
  LogOut,
  MessageCircle,
  Search,
  Settings,
  ShieldAlert,
  Users,
  UserRoundPlus,
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
  { key: "driver-review", label: "Duyệt hồ sơ tài xế", icon: FileCheck2 },
  { key: "feedback", label: "Feedback", icon: MessageCircle },
  { key: "statistics", label: "Thống kê", icon: BarChart3 },
  { key: "performance", label: "Hiệu suất", icon: Gauge },
  { key: "staff", label: "Quản lý nhân viên", icon: UserRoundPlus },
  { key: "pricing", label: "Cấu hình phí", icon: Settings },
];

const ROLE_OPTIONS = ["Tất cả vai trò", "Admin", "Manager", "Staff", "Driver", "Customer"];
const EMPLOYEE_CREATE_ROLES = ["Staff", "Manager"];
const STATUS_OPTIONS = ["Tất cả trạng thái", "Active", "Inactive", "Locked"];
const VEHICLE_TABS = ["Bike", "Car"];

function getStoredSession() {
  try {
    const rawSession = localStorage.getItem("fptRideAdminSession");
    return rawSession ? JSON.parse(rawSession) : null;
  } catch {
    return null;
  }
}

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

function App() {
  const [session, setSession] = useState(getStoredSession);
  const [activePage, setActivePage] = useState("dashboard");

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

  if (String(session.role || "").toLowerCase() === "manager") {
    return <ManagerShell session={session} onLogout={handleLogout} />;
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

function ManagerShell({ session, onLogout }) {
  return (
    <main className="manager-page">
      <header className="manager-header">
        <div>
          <h1>FPT Ride Manager</h1>
          <p>{session.fullName || session.email}</p>
        </div>
        <button className="manager-logout" onClick={onLogout}>
          <LogOut size={18} />
          Đăng xuất
        </button>
      </header>
    </main>
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
  const activeItem = MENU_ITEMS.find((item) => item.key === activePage);

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
          {MENU_ITEMS.map((item) => {
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
          {activePage === "staff" ? <StaffManagement token={session.accessToken} /> : null}
          {activePage === "pricing" ? <PricingConfig token={session.accessToken} /> : null}
          {!["dashboard", "staff", "pricing"].includes(activePage) ? (
            <BlankPage title={activeItem?.label || "Trang quản trị"} />
          ) : null}
        </main>
      </section>
    </div>
  );
}

function Dashboard({ token }) {
  const [stats, setStats] = useState({
    totalUsers: null,
    totalDrivers: null,
    activePricing: null,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.allSettled([
      apiRequest("/accounts?page=1&pageSize=1", { token }),
      apiRequest("/accounts?role=Driver&page=1&pageSize=1", { token }),
      apiRequest("/admin/pricing", { token }),
    ]).then(([accountsResult, driversResult, pricingResult]) => {
      const nextStats = {
        totalUsers: null,
        totalDrivers: null,
        activePricing: null,
      };
      const errors = [];

      if (accountsResult.status === "fulfilled") {
        nextStats.totalUsers = getTotalCount(accountsResult.value);
      } else {
        errors.push(accountsResult.reason.message);
      }

      if (driversResult.status === "fulfilled") {
        nextStats.totalDrivers = getTotalCount(driversResult.value);
      } else {
        errors.push(driversResult.reason.message);
      }

      if (pricingResult.status === "fulfilled") {
        const nextPricing = getListPayload(pricingResult.value);
        nextStats.activePricing = nextPricing.filter((item) => item.status === "Active").length;
      } else {
        errors.push(pricingResult.reason.message);
      }

      setStats(nextStats);
      setError(errors[0] || "");
    });
  }, [token]);

  const metrics = useMemo(() => {
    return [
      { label: "Tổng Users", value: formatCount(stats.totalUsers), icon: Users, tone: "blue" },
      { label: "Tổng Drivers", value: formatCount(stats.totalDrivers), icon: Bike, tone: "green" },
      { label: "Tổng chuyến", value: "--", icon: ShieldAlert, tone: "purple" },
      { label: "Hoàn thành", value: "--", icon: CheckCircle2, tone: "teal" },
      { label: "Tỷ lệ hủy chuyến", value: "--", icon: null, tone: "red", wide: true },
      { label: "Bảng giá active", value: formatCount(stats.activePricing), icon: Settings, tone: "orange" },
    ];
  }, [stats]);

  return (
    <section>
      <h2 className="page-title">Dashboard</h2>
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
              {metric.wide ? <div className="cancel-ring">--</div> : null}
            </article>
          );
        })}
      </div>
      <p className="data-note">
        Tổng chuyến, hoàn thành và tỷ lệ hủy đang chờ BE bổ sung API thống kê toàn hệ thống.
      </p>
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

  useEffect(() => {
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (keyword.trim()) params.set("keyword", keyword.trim());
    if (role !== "Tất cả vai trò") params.set("role", role);
    if (status === "Locked") params.set("isLocked", "true");
    if (status === "Active") params.set("isLocked", "false");

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
  }, [keyword, role, status, token, refreshKey]);

  const visibleAccounts = accounts.length ? accounts : [];

  function updateCreateForm(field, value) {
    setCreateForm((current) => ({ ...current, [field]: value }));
  }

  async function handleCreateAccount(event) {
    event.preventDefault();
    setCreateError("");
    setIsCreating(true);

    try {
      await apiRequest("/accounts", {
        token,
        method: "POST",
        body: JSON.stringify({
          fullName: createForm.fullName.trim(),
          email: createForm.email.trim(),
          phoneNumber: createForm.phoneNumber.trim() || null,
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
        <button className="primary-button" onClick={() => setIsCreateOpen(true)}>
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
                      <button aria-label="Xem chi tiết">
                        <Eye size={17} />
                      </button>
                      <button aria-label="Đặt lại mật khẩu">
                        <KeyRound size={17} />
                      </button>
                      <button aria-label="Khóa tài khoản">
                        <Lock size={17} />
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
    </section>
  );
}

function PricingConfig({ token }) {
  const [activeVehicle, setActiveVehicle] = useState("Bike");
  const [settings, setSettings] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/admin/pricing", { token })
      .then((data) => {
        setSettings(getListPayload(data));
        setError("");
      })
      .catch((requestError) => setError(requestError.message));
  }, [token]);

  const currentSetting =
    settings.find((item) => item.vehicleType === activeVehicle) ||
    settings.find((item) => String(item.vehicleType).toLowerCase() === activeVehicle.toLowerCase());

  const baseFare = pickRule(currentSetting, "BaseFare");
  const pricePerKm = pickRule(currentSetting, "PricePerKm");
  const pricePerMinute = pickRule(currentSetting, "PricePerMinute");
  const commission = pickRule(currentSetting, "Commission");

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
        <button className="primary-button pricing-button">Cập nhật cấu hình</button>
      </article>
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

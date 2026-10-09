import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "./lib/supabase";
import {
  Home, Wallet, Landmark, PiggyBank, ListChecks, PieChart as PieIcon,
  BarChart3, Target, Plus, X, Pencil, Trash2, ChevronRight, ChevronLeft,
  ArrowRightLeft, Coffee, ShoppingCart, Car, HeartPulse, Baby, GraduationCap,
  Gamepad2, Zap, CreditCard, Dog, Gift, Package, Briefcase, Trophy,
  Building2, TrendingUp, Settings as SettingsIcon, AlertTriangle, Check
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Legend
} from "recharts";

/* ---------------------------------- constants ---------------------------------- */

const ICONS = {
  wallet: Wallet, landmark: Landmark, piggy: PiggyBank, coffee: Coffee,
  cart: ShoppingCart, car: Car, heart: HeartPulse, baby: Baby, grad: GraduationCap,
  game: Gamepad2, zap: Zap, card: CreditCard, dog: Dog, gift: Gift,
  package: Package, briefcase: Briefcase, trophy: Trophy, building: Building2,
  trend: TrendingUp, home: Home
};

const DEFAULT_ACCOUNTS = [
  { id: "acc-cash", name: "Tiền mặt", icon: "wallet", opening: 0 },
  { id: "acc-bank", name: "Ngân hàng", icon: "landmark", opening: 0 },
  { id: "acc-save", name: "Tiết kiệm", icon: "piggy", opening: 0 },
];

const DEFAULT_CATEGORIES = [
  { id: "c-an-uong", name: "Ăn uống", icon: "coffee", type: "expense", parentId: null },
  { id: "c-an-ngoai", name: "Ăn ngoài", icon: "cart", type: "expense", parentId: "c-an-uong" },
  { id: "c-ca-phe", name: "Cà phê", icon: "coffee", type: "expense", parentId: "c-an-uong" },
  { id: "c-do-an", name: "Đồ ăn", icon: "package", type: "expense", parentId: "c-an-uong" },
  { id: "c-dat-do-an", name: "Đặt đồ ăn", icon: "gift", type: "expense", parentId: "c-an-uong" },
  { id: "c-nha-cua", name: "Nhà cửa", icon: "home", type: "expense", parentId: null },
  { id: "c-di-lai", name: "Đi lại", icon: "car", type: "expense", parentId: null },
  { id: "c-mua-sam", name: "Mua sắm", icon: "cart", type: "expense", parentId: null },
  { id: "c-suc-khoe", name: "Sức khỏe", icon: "heart", type: "expense", parentId: null },
  { id: "c-con-cai", name: "Con cái", icon: "baby", type: "expense", parentId: null },
  { id: "c-giao-duc", name: "Giáo dục", icon: "grad", type: "expense", parentId: null },
  { id: "c-giai-tri", name: "Giải trí", icon: "game", type: "expense", parentId: null },
  { id: "c-hoa-don", name: "Hóa đơn", icon: "zap", type: "expense", parentId: null },
  { id: "c-dien", name: "Điện", icon: "zap", type: "expense", parentId: "c-hoa-don" },
  { id: "c-nuoc", name: "Nước", icon: "zap", type: "expense", parentId: "c-hoa-don" },
  { id: "c-internet", name: "Internet", icon: "zap", type: "expense", parentId: "c-hoa-don" },
  { id: "c-netflix", name: "Netflix", icon: "zap", type: "expense", parentId: "c-hoa-don" },
  { id: "c-tai-chinh", name: "Tài chính", icon: "card", type: "expense", parentId: null },
  { id: "c-thu-cung", name: "Thú cưng", icon: "dog", type: "expense", parentId: null },
  { id: "c-qua-tang", name: "Quà tặng", icon: "gift", type: "expense", parentId: null },
  { id: "c-khac", name: "Khác", icon: "package", type: "expense", parentId: null },
  { id: "c-luong", name: "Lương", icon: "briefcase", type: "income", parentId: null },
  { id: "c-thuong", name: "Thưởng", icon: "trophy", type: "income", parentId: null },
  { id: "c-cho-thue", name: "Cho thuê", icon: "building", type: "income", parentId: null },
  { id: "c-dau-tu", name: "Đầu tư", icon: "trend", type: "income", parentId: null },
  { id: "c-qua-tang-thu", name: "Quà tặng", icon: "gift", type: "income", parentId: null },
  { id: "c-khac-thu", name: "Thu khác", icon: "wallet", type: "income", parentId: null },
];

const PALETTE = ["#1F5C46", "#A8461F", "#B8862E", "#3E6D8E", "#7A5C9E", "#5C7A3E", "#8E5C3E", "#3E8E7C", "#8E3E6D", "#6D8E3E"];

const STORAGE_KEY = "family-finance-data-v1";

const DEFAULT_PEOPLE = ["Chồng", "Vợ"];

/* ---------------------------------- helpers ---------------------------------- */

function fmtVND(n) {
  const v = Math.round(n || 0);
  return v.toLocaleString("vi-VN") + " đ";
}

function fmtVNDShort(n) {
  const v = n || 0;
  const abs = Math.abs(v);
  if (abs >= 1000000) return (v / 1000000).toFixed(abs >= 10000000 ? 0 : 1).replace(/\.0$/, "") + "tr";
  if (abs >= 1000) return (v / 1000).toFixed(0) + "k";
  return String(v);
}

// Calculator-style expression evaluator for the custom keypad.
// Supports + - × ÷ with standard precedence (× ÷ before + -), no parentheses.
function evalExpr(rawExpr) {
  const s = String(rawExpr || "")
    .replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-")
    .replace(/[+\-*/.]+$/, ""); // drop a trailing dangling operator/dot
  if (!s) return 0;
  const tokens = s.match(/\d+\.?\d*|[+\-*/]/g);
  if (!tokens || tokens.length === 0) return 0;
  const nums = [parseFloat(tokens[0]) || 0];
  const ops = [];
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const val = parseFloat(tokens[i + 1]) || 0;
    if (op === "*") nums[nums.length - 1] *= val;
    else if (op === "/") nums[nums.length - 1] = val !== 0 ? nums[nums.length - 1] / val : nums[nums.length - 1];
    else { ops.push(op); nums.push(val); }
  }
  let result = nums[0];
  for (let i = 0; i < ops.length; i++) result = ops[i] === "+" ? result + nums[i + 1] : result - nums[i + 1];
  return result;
}

function topCategoryId(cat) {
  return cat ? (cat.parentId || cat.id) : null;
}

function monthKey(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthLabel(key) {
  const [y, m] = key.split("-");
  return `Tháng ${parseInt(m)}/${y}`;
}

function addMonths(key, n) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return monthKey(d);
}

function uid(prefix) {
  return prefix + "-" + Math.random().toString(36).slice(2, 10);
}

function Icon({ name, size = 18, ...props }) {
  const C = ICONS[name] || Package;
  return <C size={size} {...props} />;
}

/* ---------------------------------- computations ---------------------------------- */

function computeAccountBalance(account, transactions) {
  let bal = account.opening || 0;
  for (const t of transactions) {
    if (t.type === "income" && t.accountId === account.id) bal += t.amount;
    else if (t.type === "expense" && t.accountId === account.id) bal -= t.amount;
    else if (t.type === "transfer") {
      if (t.accountId === account.id) bal -= t.amount;
      if (t.toAccountId === account.id) bal += t.amount;
    }
  }
  return bal;
}

function monthTransactions(transactions, mKey) {
  return transactions.filter((t) => monthKey(t.date) === mKey);
}

/* ---------------------------------- main app ---------------------------------- */

export default function FamilyFinanceApp({ userId, onSignOut }) {
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("dashboard");
  const [addOpen, setAddOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const firstRender = useRef(true);
  const saveTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    firstRender.current = true;
    (async () => {
      try {
        const { data: row, error } = await supabase
          .from("finance_data")
          .select("data")
          .eq("user_id", userId)
          .maybeSingle();
        if (error) throw error;
        const fallback = { accounts: DEFAULT_ACCOUNTS, categories: DEFAULT_CATEGORIES, transactions: [], budgets: {}, people: DEFAULT_PEOPLE };
        const cloud = row?.data;
        const next = cloud ? { ...fallback, ...cloud, people: cloud.people?.length ? cloud.people : DEFAULT_PEOPLE } : fallback;
        if (!cancelled) { setData(next); setLoaded(true); }
      } catch (e) {
        console.error("Không tải được dữ liệu Supabase", e);
        if (!cancelled) {
          const fallback = { accounts: DEFAULT_ACCOUNTS, categories: DEFAULT_CATEGORIES, transactions: [], budgets: {}, people: DEFAULT_PEOPLE };
          setData(fallback); setLoaded(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!loaded || !data) return;
    if (firstRender.current) { firstRender.current = false; return; }
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const { error } = await supabase.from("finance_data").upsert({
        user_id: userId, data, updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
      if (error) console.error("Lỗi lưu dữ liệu Supabase", error);
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [data, loaded, userId]);

  if (!loaded || !data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 480, fontFamily: "IBM Plex Sans, sans-serif", color: "#56645C" }}>
        Đang tải dữ liệu…
      </div>
    );
  }

  function updateData(fn) {
    setData((prev) => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      return { ...prev, ...next };
    });
  }

  function saveTransaction(tx) {
    updateData((prev) => {
      const exists = prev.transactions.some((t) => t.id === tx.id);
      const transactions = exists
        ? prev.transactions.map((t) => (t.id === tx.id ? tx : t))
        : [...prev.transactions, tx];
      return { ...prev, transactions };
    });
  }

  function deleteTransaction(id) {
    updateData((prev) => ({ ...prev, transactions: prev.transactions.filter((t) => t.id !== id) }));
  }

  function upsertAccount(acc) {
    updateData((prev) => {
      const exists = prev.accounts.some((a) => a.id === acc.id);
      const accounts = exists ? prev.accounts.map((a) => (a.id === acc.id ? acc : a)) : [...prev.accounts, acc];
      return { ...prev, accounts };
    });
  }

  function deleteAccount(id) {
    updateData((prev) => ({ ...prev, accounts: prev.accounts.filter((a) => a.id !== id) }));
  }

  function addCategory(cat) {
    updateData((prev) => ({ ...prev, categories: [...prev.categories, cat] }));
  }

  function updateCategory(cat) {
    updateData((prev) => ({ ...prev, categories: prev.categories.map((c) => c.id === cat.id ? cat : c) }));
  }

  function deleteCategory(id) {
    updateData((prev) => {
      const hasChildren = prev.categories.some((c) => c.parentId === id);
      const used = prev.transactions.some((t) => t.categoryId === id);
      if (hasChildren || used) return prev;
      return { ...prev, categories: prev.categories.filter((c) => c.id !== id) };
    });
  }

  function setBudget(mKey, categoryId, amount) {
    updateData((prev) => {
      const budgets = { ...prev.budgets };
      budgets[mKey] = { ...(budgets[mKey] || {}) };
      if (amount > 0) budgets[mKey][categoryId] = amount;
      else delete budgets[mKey][categoryId];
      return { ...prev, budgets };
    });
  }

  return (
    <div className="app-shell">
      <GlobalStyle />
      <div className="app-content">
        {view === "dashboard" && (
          <Dashboard data={data} onOpenSettings={() => setView("settings")} onEditTx={(t) => setEditingTx(t)} onAdd={() => setAddOpen(true)} />
        )}
        {view === "transactions" && (
          <TransactionsView data={data} onEditTx={(t) => setEditingTx(t)} />
        )}
        {view === "reports" && <ReportsView data={data} />}
        {view === "budgets" && <BudgetsView data={data} setBudget={setBudget} />}
        {view === "settings" && (
          <SettingsView
            data={data}
            onBack={() => setView("dashboard")}
            upsertAccount={upsertAccount}
            deleteAccount={deleteAccount}
            addCategory={addCategory}
            updateCategory={updateCategory}
            deleteCategory={deleteCategory}
            onSignOut={onSignOut}
          />
        )}
      </div>

      <BottomNav view={view} setView={setView} onAdd={() => setAddOpen(true)} />

      {(addOpen || editingTx) && (
        <AddEditSheet
          data={data}
          initial={editingTx}
          onClose={() => { setAddOpen(false); setEditingTx(null); }}
          onSave={(tx) => { saveTransaction(tx); setAddOpen(false); setEditingTx(null); }}
          onDelete={(id) => { deleteTransaction(id); setEditingTx(null); }}
        />
      )}
    </div>
  );
}

/* ---------------------------------- global style ---------------------------------- */

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
      :root {
        --bg: #F5F6F2;
        --surface: #FFFFFF;
        --ink: #182420;
        --ink-soft: #56645C;
        --line: #DDE1D9;
        --jade: #1F5C46;
        --jade-soft: #E4EFE9;
        --rust: #A8461F;
        --rust-soft: #F5E7DF;
        --gold: #B8862E;
        --gold-soft: #F6EEDD;
      }
      * { box-sizing: border-box; }
      .display { font-family: 'Fraunces', serif; }
      .card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; }
      .chip { border: 1px solid var(--line); border-radius: 999px; padding: 6px 12px; font-size: 13px; background: var(--surface); color: var(--ink-soft); }
      .chip.active { background: var(--jade); color: white; border-color: var(--jade); }
      .btn-primary { background: var(--jade); color: white; border: none; border-radius: 12px; padding: 12px; font-weight: 600; font-size: 15px; }
      .input { border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; font-size: 15px; width: 100%; font-family: inherit; background: var(--surface); color: var(--ink); }
      .input:focus { outline: 2px solid var(--jade); outline-offset: -1px; }
      .row { display: flex; align-items: center; }
      .between { justify-content: space-between; }
      ::-webkit-scrollbar { width: 0; height: 0; }
    `}</style>
  );
}

/* ---------------------------------- dashboard ---------------------------------- */

function Dashboard({ data, onOpenSettings, onEditTx, onAdd }) {
  const now = new Date();
  const mKey = monthKey(now);
  const prevKey = addMonths(mKey, -1);

  const totalBalance = data.accounts.reduce((s, a) => s + computeAccountBalance(a, data.transactions), 0);
  const mTx = monthTransactions(data.transactions, mKey);
  const income = mTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = mTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const savings = income - expense;
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;
  const delta = savings;

  const catMap = Object.fromEntries(data.categories.map((c) => [c.id, c]));
  const budget = data.budgets[mKey] || {};
  const budgetRows = Object.entries(budget).map(([catId, amt]) => {
    const spent = mTx.filter((t) => t.type === "expense" && topCategoryId(catMap[t.categoryId]) === catId).reduce((s, t) => s + t.amount, 0);
    return { cat: catMap[catId], amount: amt, spent };
  }).filter((r) => r.cat).slice(0, 4);

  const recent = [...data.transactions].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
  const accMap = Object.fromEntries(data.accounts.map((a) => [a.id, a]));

  return (
    <div style={{ padding: "20px 16px 8px" }}>
      <div className="row between" style={{ marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 14, color: "var(--ink-soft)" }}>Xin chào 👋</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{monthLabel(mKey)}</div>
        </div>
        <button onClick={onOpenSettings} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, width: 38, height: 38 }}>
          <SettingsIcon size={18} color="var(--ink-soft)" />
        </button>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 14, background: "var(--jade)", border: "none", color: "white" }}>
        <div style={{ fontSize: 13, opacity: 0.85 }}>Tổng tiền</div>
        <div className="display" style={{ fontSize: 32, fontWeight: 600, marginTop: 4 }}>{fmtVND(totalBalance)}</div>
        <div style={{ fontSize: 13, marginTop: 6, opacity: 0.9 }}>
          {delta >= 0 ? "↑" : "↓"} {fmtVND(Math.abs(delta))} so với đầu tháng
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 10, fontWeight: 600 }}>THÁNG NÀY</div>
        <StatRow label="Thu nhập" value={income} color="var(--jade)" />
        <StatRow label="Chi tiêu" value={expense} color="var(--rust)" />
        <StatRow label="Tiết kiệm" value={savings} color="var(--gold)" />
        <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>Tỷ lệ tiết kiệm {savingsRate}%</div>
      </div>

      {budgetRows.length > 0 && (
        <div className="card" style={{ padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 10, fontWeight: 600 }}>NGÂN SÁCH</div>
          {budgetRows.map((r) => (
            <BudgetBar key={r.cat.id} cat={r.cat} spent={r.spent} amount={r.amount} />
          ))}
        </div>
      )}

      <div className="card" style={{ padding: 16 }}>
        <div className="row between" style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 600 }}>GIAO DỊCH GẦN ĐÂY</div>
        </div>
        {recent.length === 0 && <div style={{ fontSize: 13, color: "var(--ink-soft)", padding: "12px 0" }}>Chưa có giao dịch nào. Bấm nút + để thêm.</div>}
        {recent.map((t) => (
          <TxRow key={t.id} t={t} cat={catMap[t.categoryId]} acc={accMap[t.accountId]} toAcc={accMap[t.toAccountId]} onClick={() => onEditTx(t)} />
        ))}
      </div>
    </div>
  );
}

function StatRow({ label, value, color }) {
  return (
    <div className="row between" style={{ padding: "5px 0" }}>
      <span style={{ fontSize: 14, color: "var(--ink-soft)" }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color }}>{fmtVND(value)}</span>
    </div>
  );
}

function BudgetBar({ cat, spent, amount }) {
  const pct = amount > 0 ? Math.min(100, Math.round((spent / amount) * 100)) : 0;
  const over = spent > amount;
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="row between" style={{ marginBottom: 4 }}>
        <span style={{ fontSize: 13 }}>{cat.name}</span>
        <span style={{ fontSize: 12, color: over ? "var(--rust)" : "var(--ink-soft)" }}>
          {fmtVNDShort(spent)} / {fmtVNDShort(amount)} {over && "⚠"}
        </span>
      </div>
      <div style={{ height: 7, background: "var(--jade-soft)", borderRadius: 999 }}>
        <div style={{ height: "100%", width: pct + "%", background: over ? "var(--rust)" : "var(--jade)", borderRadius: 999 }} />
      </div>
    </div>
  );
}

function TxRow({ t, cat, acc, toAcc, onClick }) {
  const color = t.type === "income" ? "var(--jade)" : t.type === "expense" ? "var(--rust)" : "var(--ink-soft)";
  const sign = t.type === "income" ? "+" : t.type === "expense" ? "-" : "";
  return (
    <button onClick={onClick} className="row between" style={{ width: "100%", padding: "9px 0", borderTop: "1px solid var(--line)", background: "none", border: "none", borderTopStyle: "solid", textAlign: "left" }}>
      <div className="row" style={{ gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: t.type === "transfer" ? "var(--gold-soft)" : (t.type === "income" ? "var(--jade-soft)" : "var(--rust-soft)"), display: "flex", alignItems: "center", justifyContent: "center" }}>
          {t.type === "transfer" ? <ArrowRightLeft size={16} color="var(--gold)" /> : <Icon name={cat?.icon} size={16} color={color} />}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{t.type === "transfer" ? `${acc?.name || ""} → ${toAcc?.name || ""}` : (cat?.name || "Khác")}</div>
          <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{t.note || acc?.name || ""}</div>
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color }}>{sign}{fmtVND(t.amount)}</div>
    </button>
  );
}

/* ---------------------------------- transactions view ---------------------------------- */

function TransactionsView({ data, onEditTx }) {
  const [filter, setFilter] = useState("all");
  const catMap = Object.fromEntries(data.categories.map((c) => [c.id, c]));
  const accMap = Object.fromEntries(data.accounts.map((a) => [a.id, a]));

  const filtered = data.transactions.filter((t) => filter === "all" || t.type === filter);
  const grouped = {};
  for (const t of [...filtered].sort((a, b) => (a.date < b.date ? 1 : -1))) {
    grouped[t.date] = grouped[t.date] || [];
    grouped[t.date].push(t);
  }

  return (
    <div style={{ padding: "20px 16px 8px" }}>
      <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 14 }} className="display">Giao dịch</div>
      <div className="row" style={{ gap: 8, marginBottom: 16 }}>
        {[["all", "Tất cả"], ["income", "Thu"], ["expense", "Chi"], ["transfer", "Chuyển"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} className={"chip" + (filter === v ? " active" : "")}>{l}</button>
        ))}
      </div>
      {Object.keys(grouped).length === 0 && <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>Không có giao dịch nào.</div>}
      {Object.entries(grouped).map(([date, txs]) => (
        <div key={date} className="card" style={{ padding: "8px 16px", marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600, padding: "6px 0" }}>
            {new Date(date).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })}
          </div>
          {txs.map((t) => (
            <TxRow key={t.id} t={t} cat={catMap[t.categoryId]} acc={accMap[t.accountId]} toAcc={accMap[t.toAccountId]} onClick={() => onEditTx(t)} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------- reports view ---------------------------------- */

function ReportsView({ data }) {
  const [mKey, setMKey] = useState(monthKey(new Date()));
  const catMap = Object.fromEntries(data.categories.map((c) => [c.id, c]));
  const mTx = monthTransactions(data.transactions, mKey);
  const expenseByCat = {};
  for (const t of mTx.filter((t) => t.type === "expense")) {
    const cat = catMap[t.categoryId];
    const key = topCategoryId(cat) || t.categoryId;
    expenseByCat[key] = (expenseByCat[key] || 0) + t.amount;
  }
  const pieData = Object.entries(expenseByCat).map(([id, val], i) => ({
    name: catMap[id]?.name || "Khác", value: val, color: PALETTE[i % PALETTE.length],
  })).sort((a, b) => b.value - a.value);
  const totalExpense = pieData.reduce((s, d) => s + d.value, 0);

  const trend = [];
  for (let i = 5; i >= 0; i--) {
    const k = addMonths(mKey, -i);
    const tx = monthTransactions(data.transactions, k);
    trend.push({
      month: k.split("-")[1] + "/" + k.split("-")[0].slice(2),
      Thu: tx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
      Chi: tx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    });
  }

  return (
    <div style={{ padding: "20px 16px 8px" }}>
      <div className="row between" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 600 }} className="display">Báo cáo</div>
      </div>
      <div className="row between" style={{ marginBottom: 16 }}>
        <button onClick={() => setMKey(addMonths(mKey, -1))} className="chip"><ChevronLeft size={14} /></button>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{monthLabel(mKey)}</div>
        <button onClick={() => setMKey(addMonths(mKey, 1))} className="chip"><ChevronRight size={14} /></button>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 10 }}>TIỀN ĐI ĐÂU?</div>
        {pieData.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>Chưa có chi tiêu trong tháng này.</div>
        ) : (
          <>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtVND(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ marginTop: 6 }}>
              {pieData.map((d, i) => (
                <div key={i} className="row between" style={{ padding: "5px 0" }}>
                  <div className="row" style={{ gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color }} />
                    <span style={{ fontSize: 13 }}>{d.name}</span>
                  </div>
                  <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{fmtVND(d.value)} · {Math.round((d.value / totalExpense) * 100)}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 10 }}>XU HƯỚNG 6 THÁNG</div>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--ink-soft)" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtVNDShort} tick={{ fontSize: 11, fill: "var(--ink-soft)" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip formatter={(v) => fmtVND(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Thu" fill="var(--jade)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Chi" fill="var(--rust)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- budgets view ---------------------------------- */

function BudgetsView({ data, setBudget }) {
  const [mKey, setMKey] = useState(monthKey(new Date()));
  const catMap = Object.fromEntries(data.categories.map((c) => [c.id, c]));
  // Budgets are set at the parent-group level, matching how the reports roll up.
  const expenseCats = data.categories.filter((c) => c.type === "expense" && !c.parentId);
  const mTx = monthTransactions(data.transactions, mKey);
  const budget = data.budgets[mKey] || {};
  const totalBudget = Object.values(budget).reduce((s, v) => s + v, 0);
  const totalSpent = mTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <div style={{ padding: "20px 16px 8px" }}>
      <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 14 }} className="display">Kế hoạch</div>
      <div className="row between" style={{ marginBottom: 16 }}>
        <button onClick={() => setMKey(addMonths(mKey, -1))} className="chip"><ChevronLeft size={14} /></button>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{monthLabel(mKey)}</div>
        <button onClick={() => setMKey(addMonths(mKey, 1))} className="chip"><ChevronRight size={14} /></button>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <StatRow label="Tổng ngân sách" value={totalBudget} color="var(--ink)" />
        <StatRow label="Đã chi" value={totalSpent} color={totalSpent > totalBudget ? "var(--rust)" : "var(--jade)"} />
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 10 }}>NGÂN SÁCH THEO DANH MỤC</div>
        {expenseCats.map((cat) => {
          const spent = mTx.filter((t) => t.type === "expense" && topCategoryId(catMap[t.categoryId]) === cat.id).reduce((s, t) => s + t.amount, 0);
          const amt = budget[cat.id] || 0;
          return (
            <div key={cat.id} style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
              <div className="row between" style={{ marginBottom: 6 }}>
                <div className="row" style={{ gap: 8 }}>
                  <Icon name={cat.icon} size={16} color="var(--ink-soft)" />
                  <span style={{ fontSize: 14 }}>{cat.name}</span>
                </div>
                <input
                  className="input"
                  style={{ width: 110, padding: "6px 8px", fontSize: 13, textAlign: "right" }}
                  defaultValue={amt || ""}
                  placeholder="0"
                  onBlur={(e) => setBudget(mKey, cat.id, parseFloat(e.target.value.replace(/\D/g, "")) || 0)}
                />
              </div>
              {amt > 0 && <BudgetBar cat={cat} spent={spent} amount={amt} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------- settings view ---------------------------------- */

function SettingsView({ data, onBack, upsertAccount, deleteAccount, addCategory, updateCategory, deleteCategory, onSignOut }) {
  const [tab, setTab] = useState("accounts");
  const [newAccName, setNewAccName] = useState("");
  const [newAccIcon, setNewAccIcon] = useState("wallet");
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("package");
  const [newCatType, setNewCatType] = useState("expense");
  const [newCatParent, setNewCatParent] = useState("");
  const [editingCat, setEditingCat] = useState(null);

  return (
    <div style={{ padding: "20px 16px 8px" }}>
      <div className="row" style={{ gap: 10, marginBottom: 14 }}>
        <button onClick={onBack} style={{ background: "none", border: "none" }}><ChevronLeft size={20} /></button>
        <div style={{ fontSize: 20, fontWeight: 600 }} className="display">Cài đặt</div>
      </div>
      <div className="row" style={{ gap: 8, marginBottom: 16 }}>
        <button className={"chip" + (tab === "accounts" ? " active" : "")} onClick={() => setTab("accounts")}>Tài khoản</button>
        <button className={"chip" + (tab === "categories" ? " active" : "")} onClick={() => setTab("categories")}>Danh mục</button>
        <button className={"chip" + (tab === "people" ? " active" : "")} onClick={() => setTab("people")}>Người dùng</button>
      </div>

      {tab === "accounts" && (
        <>
          <div className="card" style={{ padding: 16, marginBottom: 14 }}>
            {data.accounts.map((a) => (
              <div key={a.id} className="row between" style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
                <div className="row" style={{ gap: 8 }}>
                  <Icon name={a.icon} size={16} color="var(--ink-soft)" />
                  <span style={{ fontSize: 14 }}>{a.name}</span>
                </div>
                <button onClick={() => deleteAccount(a.id)} style={{ background: "none", border: "none" }}>
                  <Trash2 size={16} color="var(--rust)" />
                </button>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 10 }}>THÊM TÀI KHOẢN</div>
            <input className="input" placeholder="Tên tài khoản" value={newAccName} onChange={(e) => setNewAccName(e.target.value)} style={{ marginBottom: 8 }} />
            <IconPicker options={["wallet", "landmark", "piggy", "card"]} value={newAccIcon} onChange={setNewAccIcon} />
            <button
              className="btn-primary"
              style={{ width: "100%", marginTop: 10 }}
              onClick={() => {
                if (!newAccName.trim()) return;
                upsertAccount({ id: uid("acc"), name: newAccName.trim(), icon: newAccIcon, opening: 0 });
                setNewAccName("");
              }}
            >Thêm</button>
          </div>
        </>
      )}

      {tab === "people" && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 10 }}>AI THU / CHI</div>
          {(data.people || DEFAULT_PEOPLE).map((person) => (
            <div key={person} className="row between" style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
              <span>{person}</span>
            </div>
          ))}
          <p style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.5 }}>Hai vợ chồng dùng chung một tài khoản. Mỗi giao dịch chỉ cần chọn người thực hiện để sau này lọc và thống kê riêng.</p>
          <button className="btn-primary" style={{ width: "100%", marginTop: 10 }} onClick={onSignOut}>Đăng xuất</button>
        </div>
      )}

      {tab === "categories" && (
        <>
          <div className="card category-manager" style={{ padding: 14, marginBottom: 14 }}>
            <div className="section-title">DANH MỤC THU / CHI</div>
            <div className="category-hint">Danh mục cha có thể chứa nhiều danh mục con. Danh mục đang được sử dụng hoặc còn danh mục con sẽ không bị xóa nhầm.</div>
            {data.categories.filter((c) => !c.parentId).map((p) => {
              const children = data.categories.filter((c) => c.parentId === p.id);
              const used = data.transactions.some((t) => t.categoryId === p.id);
              return (
                <div key={p.id} className="category-group">
                  <div className="category-row">
                    <div className="category-main">
                      <div className="category-icon"><Icon name={p.icon} size={18} /></div>
                      <div><div className="category-name">{p.name}</div><div className="category-meta">{p.type === "income" ? "Khoản thu" : "Khoản chi"} · {children.length} danh mục con{used ? " · đang sử dụng" : ""}</div></div>
                    </div>
                    <div className="category-actions">
                      <button className="icon-btn" title="Sửa" onClick={() => setEditingCat({ ...p })}><Pencil size={16} /></button>
                      <button className="icon-btn danger" title={children.length || used ? "Không thể xóa danh mục đang được dùng" : "Xóa"} disabled={children.length > 0 || used} onClick={() => deleteCategory(p.id)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                  {children.map((c) => {
                    const childUsed = data.transactions.some((t) => t.categoryId === c.id);
                    return <div key={c.id} className="category-row child">
                      <div className="category-main"><div className="category-icon small"><Icon name={c.icon} size={15} /></div><div><div className="category-name">{c.name}</div><div className="category-meta">↳ {p.name}{childUsed ? " · đang sử dụng" : ""}</div></div></div>
                      <div className="category-actions"><button className="icon-btn" title="Sửa" onClick={() => setEditingCat({ ...c })}><Pencil size={15} /></button><button className="icon-btn danger" title="Xóa" disabled={childUsed} onClick={() => deleteCategory(c.id)}><Trash2 size={15} /></button></div>
                    </div>;
                  })}
                </div>
              );
            })}
          </div>

          {editingCat && (
            <div className="card" style={{ padding: 16, marginBottom: 14 }}>
              <div className="section-title">SỬA DANH MỤC</div>
              <input className="input" value={editingCat.name} onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })} placeholder="Tên danh mục" style={{ marginBottom: 9 }} />
              <label className="field-label">Loại</label>
              <div className="row" style={{ gap: 8, margin: "6px 0 9px" }}>
                <button className={"chip" + (editingCat.type === "expense" ? " active" : "")} onClick={() => setEditingCat({ ...editingCat, type: "expense", parentId: null })}>Chi</button>
                <button className={"chip" + (editingCat.type === "income" ? " active" : "")} onClick={() => setEditingCat({ ...editingCat, type: "income", parentId: null })}>Thu</button>
              </div>
              <label className="field-label">Thuộc nhóm</label>
              <select className="input" style={{ marginTop: 6, marginBottom: 9 }} value={editingCat.parentId || ""} onChange={(e) => setEditingCat({ ...editingCat, parentId: e.target.value || null })}>
                <option value="">— Danh mục cha —</option>
                {data.categories.filter((c) => c.type === editingCat.type && !c.parentId && c.id !== editingCat.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <IconPicker options={["package", "coffee", "cart", "car", "heart", "baby", "grad", "game", "zap", "card", "dog", "gift", "briefcase", "trophy", "building", "trend", "home"]} value={editingCat.icon} onChange={(icon) => setEditingCat({ ...editingCat, icon })} />
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setEditingCat(null)}>Hủy</button>
                <button className="btn-primary" style={{ flex: 1 }} disabled={!editingCat.name.trim()} onClick={() => { updateCategory({ ...editingCat, name: editingCat.name.trim() }); setEditingCat(null); }}>Lưu thay đổi</button>
              </div>
            </div>
          )}

          <div className="card" style={{ padding: 16 }}>
            <div className="section-title">THÊM DANH MỤC</div>
            <div className="row" style={{ gap: 8, marginBottom: 9 }}>
              <button className={"chip" + (newCatType === "expense" ? " active" : "")} onClick={() => { setNewCatType("expense"); setNewCatParent(""); }}>Chi</button>
              <button className={"chip" + (newCatType === "income" ? " active" : "")} onClick={() => { setNewCatType("income"); setNewCatParent(""); }}>Thu</button>
            </div>
            <input className="input" placeholder="Tên danh mục" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} style={{ marginBottom: 8 }} />
            <label className="field-label">Thuộc nhóm (không bắt buộc)</label>
            <select className="input" style={{ marginTop: 6, marginBottom: 9 }} value={newCatParent} onChange={(e) => setNewCatParent(e.target.value)}>
              <option value="">— Danh mục cha —</option>
              {data.categories.filter((c) => c.type === newCatType && !c.parentId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <IconPicker options={["package", "coffee", "cart", "car", "heart", "baby", "grad", "game", "zap", "card", "dog", "gift", "briefcase", "trophy", "building", "trend", "home"]} value={newCatIcon} onChange={setNewCatIcon} />
            <button className="btn-primary" style={{ width: "100%", marginTop: 10 }} onClick={() => { if (!newCatName.trim()) return; addCategory({ id: uid("c"), name: newCatName.trim(), icon: newCatIcon, type: newCatType, parentId: newCatParent || null }); setNewCatName(""); }}>Thêm danh mục</button>
          </div>
        </>
      )}
    </div>
  );
}

function IconPicker({ options, value, onChange }) {
  return (
    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          style={{
            width: 38, height: 38, borderRadius: 10,
            border: value === o ? "2px solid var(--jade)" : "1px solid var(--line)",
            background: value === o ? "var(--jade-soft)" : "var(--surface)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Icon name={o} size={16} color="var(--ink-soft)" />
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------- bottom nav ---------------------------------- */

function BottomNav({ view, setView, onAdd }) {
  const items = [
    { id: "dashboard", label: "Tổng quan", icon: Home },
    { id: "transactions", label: "Giao dịch", icon: ListChecks },
    { id: "__add__", label: "", icon: Plus },
    { id: "reports", label: "Báo cáo", icon: BarChart3 },
    { id: "budgets", label: "Kế hoạch", icon: Target },
  ];
  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0, height: 72,
      background: "var(--surface)", borderTop: "1px solid var(--line)",
      display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 8px",
    }}>
      {items.map((it) => {
        const Ico = it.icon;
        if (it.id === "__add__") {
          return (
            <button key={it.id} onClick={onAdd} style={{
              width: 52, height: 52, borderRadius: "50%", background: "var(--jade)",
              border: "none", display: "flex", alignItems: "center", justifyContent: "center",
              marginTop: -24, boxShadow: "0 4px 10px rgba(31,92,70,0.35)",
            }}>
              <Ico size={24} color="white" />
            </button>
          );
        }
        const active = view === it.id;
        return (
          <button key={it.id} onClick={() => setView(it.id)} style={{
            background: "none", border: "none", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 3, padding: "6px 4px", color: active ? "var(--jade)" : "var(--ink-soft)",
          }}>
            <Ico size={20} />
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------- add/edit sheet ---------------------------------- */

function AddEditSheet({ data, initial, onClose, onSave, onDelete }) {
  const isEdit = !!initial;
  const [type, setType] = useState(initial?.type || "expense");
  const [expr, setExpr] = useState(initial ? trimNum(initial.amount / 1000) : "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId || "");
  const [accountId, setAccountId] = useState(initial?.accountId || data.accounts[0]?.id || "");
  const [toAccountId, setToAccountId] = useState(initial?.toAccountId || data.accounts[1]?.id || data.accounts[0]?.id || "");
  const [note, setNote] = useState(initial?.note || "");
  const [person, setPerson] = useState(initial?.person || "Chồng");
  const [date, setDate] = useState(initial?.date || todayISO());
  const [showDetails, setShowDetails] = useState(isEdit);
  const [expandedCategory, setExpandedCategory] = useState(() => { const c = data.categories.find((x) => x.id === initial?.categoryId); return c?.parentId || null; });

  const cats = data.categories.filter((c) => c.type === type);
  const amount = Math.round(evalExpr(expr) * 1000);

  useEffect(() => {
    if (!isEdit) {
      const top = cats.filter((c) => !c.parentId);
      if (top.length > 0 && !cats.some((c) => c.id === categoryId)) setCategoryId(top[0].id);
    }
    // eslint-disable-next-line
  }, [type]);

  function handleSave() {
    if (amount <= 0) return;
    if (type !== "transfer" && !categoryId) return;
    if (type === "transfer" && accountId === toAccountId) return;
    const tx = {
      id: initial?.id || uid("tx"),
      type, amount, date,
      categoryId: type === "transfer" ? null : categoryId,
      accountId,
      toAccountId: type === "transfer" ? toAccountId : null,
      note: note.trim(),
      person,
    };
    onSave(tx);
  }

  const typeColor = type === "income" ? "var(--jade)" : type === "expense" ? "var(--rust)" : "var(--gold)";

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(24,36,32,0.45)", display: "flex", alignItems: "flex-end", zIndex: 10 }} onClick={onClose}>
      <div className="card" style={{ width: "100%", borderRadius: "18px 18px 0 0", padding: 0, maxHeight: "92%", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>

        <div style={{ padding: "16px 20px 0" }}>
          <div className="row between" style={{ marginBottom: 12 }}>
            <div className="row" style={{ gap: 8 }}>
              {[["expense", "Chi"], ["income", "Thu"], ["transfer", "Chuyển"]].map(([v, l]) => (
                <button key={v} onClick={() => setType(v)} className={"chip" + (type === v ? " active" : "")}>{l}</button>
              ))}
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none" }}><X size={20} color="var(--ink-soft)" /></button>
          </div>
        </div>

        <div style={{ padding: "4px 20px 14px", flex: showDetails ? "0 0 auto" : "1 1 auto", overflowY: "auto" }}>
          {/* amount display */}
          <div style={{ textAlign: "center", padding: "6px 0 14px" }}>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", minHeight: 16 }}>{expr || "\u00A0"}</div>
            <div className="display" style={{ fontSize: 34, fontWeight: 600, color: typeColor }}>{fmtVND(amount)}</div>
            <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>nhập theo nghìn đồng — vd 250 = 250.000đ</div>
          </div>

          {type !== "transfer" && (
            <div style={{ marginBottom: 12 }}>
              <CategoryPicker categories={data.categories} type={type} value={categoryId} onChange={setCategoryId} expanded={expandedCategory} setExpanded={setExpandedCategory} />
            </div>
          )}

          {!showDetails ? (
            <button onClick={() => setShowDetails(true)} className="row between" style={{ width: "100%", background: "none", border: "none", padding: "8px 0", color: "var(--ink-soft)", fontSize: 13 }}>
              <span>{data.accounts.find((a) => a.id === accountId)?.name}{note ? " · " + note : ""}</span>
              <span style={{ color: "var(--jade)" }}>Chi tiết ▾</span>
            </button>
          ) : (
            <>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: "var(--ink-soft)" }}>{type === "transfer" ? "Từ tài khoản" : "Tài khoản"}</label>
                <select className="input" style={{ marginTop: 6 }} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                  {data.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              {type === "transfer" && (
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, color: "var(--ink-soft)" }}>Đến tài khoản</label>
                  <select className="input" style={{ marginTop: 6 }} value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
                    {data.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
              {type !== "transfer" && (
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, color: "var(--ink-soft)" }}>Người thực hiện</label>
                  <select className="input" style={{ marginTop: 6 }} value={person} onChange={(e) => setPerson(e.target.value)}>
                    {(data.people || DEFAULT_PEOPLE).map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              )}
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: "var(--ink-soft)" }}>Ghi chú</label>
                <input className="input" style={{ marginTop: 6 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Không bắt buộc" />
              </div>
              <div style={{ marginBottom: 4 }}>
                <label style={{ fontSize: 12, color: "var(--ink-soft)" }}>Ngày</label>
                <input type="date" className="input" style={{ marginTop: 6 }} value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              {isEdit && (
                <button
                  onClick={() => onDelete(initial.id)}
                  className="row"
                  style={{ width: "100%", justifyContent: "center", gap: 6, background: "none", border: "none", color: "var(--rust)", padding: "10px 0 0", fontSize: 13 }}
                >
                  <Trash2 size={15} /> Xóa giao dịch
                </button>
              )}
            </>
          )}
        </div>

        <CalcKeypad expr={expr} setExpr={setExpr} onSave={handleSave} disabled={amount <= 0 || (type !== "transfer" && !categoryId) || (type === "transfer" && accountId === toAccountId)} suggestionCategories={type !== "transfer" && expandedCategory ? data.categories.filter((c) => c.parentId === expandedCategory) : []} selectedCategory={categoryId} onSuggestionSelect={setCategoryId} />
      </div>
    </div>
  );
}

function trimNum(n) {
  const s = (Math.round(n * 1000) / 1000).toString();
  return s;
}

/* ---------------------------------- category picker (parent/child) ---------------------------------- */

function CategoryPicker({ categories, type, value, onChange, expanded, setExpanded }) {
  const top = categories.filter((c) => c.type === type && !c.parentId);
  const childrenOf = (id) => categories.filter((c) => c.parentId === id);
  return (
    <div>
      <div className="category-scroll">
        {top.map((c) => {
          const kids = childrenOf(c.id);
          const isSelected = value === c.id || kids.some((k) => k.id === value);
          return <button key={c.id} onClick={() => { if (kids.length) { setExpanded(expanded === c.id ? null : c.id); if (!kids.some((k) => k.id === value)) onChange(c.id); } else { onChange(c.id); setExpanded(null); } }} className={"category-pill" + (isSelected ? " selected" : "")}>
            <Icon name={c.icon} size={16} /><span>{c.name}</span>{kids.length > 0 && <span className="category-count">{kids.length}</span>}
          </button>;
        })}
      </div>
    </div>
  );
}

/* ---------------------------------- calculator keypad ---------------------------------- */

function CalcKeypad({ expr, setExpr, onSave, disabled, suggestionCategories = [], selectedCategory, onSuggestionSelect }) {
  function pressDigit(d) { setExpr((e) => e + d); }
  function pressDot() { setExpr((e) => { const seg = e.split(/[+\-×÷*/]/).pop(); if (seg.includes(".")) return e; return e + (seg === "" ? "0." : "."); }); }
  function pressOp(op) { setExpr((e) => { if (e === "") return e; if (/[+\-×÷*/]$/.test(e)) return e.slice(0, -1) + op; return e + op; }); }
  function pressBackspace() { setExpr((e) => e.slice(0, -1)); }
  function pressEquals() { setExpr((e) => { if (!/[+\-×÷*/]/.test(e)) return e; return trimNum(evalExpr(e)); }); }
  function pressClear() { setExpr(""); }
  const key = (label, cls = "") => <button className={"calc-key " + cls} onClick={() => /^(\d|000)$/.test(label) ? pressDigit(label) : null}>{label}</button>;
  return (
    <div className="keypad-dock">
      {suggestionCategories.length > 0 && (
        <div className="category-suggestion-wrap">
          <div className="category-suggestion-label">Danh mục con</div>
          <div className="category-suggestions">
            {suggestionCategories.map((c) => <button key={c.id} className={"suggestion-chip" + (selectedCategory === c.id ? " selected" : "")} onClick={() => onSuggestionSelect(c.id)}><Icon name={c.icon} size={15} /><span>{c.name}</span></button>)}
          </div>
        </div>
      )}
      <div className="calc-grid">
        {key("7")} {key("8")} {key("9")}
        <button className="calc-key operator" onClick={() => pressOp("÷")}>÷</button>
        {key("4")} {key("5")} {key("6")}<button className="calc-key operator" onClick={() => pressOp("×")}>×</button>
        {key("1")} {key("2")} {key("3")}<button className="calc-key operator" onClick={() => pressOp("−")}>−</button>
        {key("000")} {key("0")}<button className="calc-key" onClick={pressDot}>.</button><button className="calc-key operator" onClick={() => pressOp("+")}>+</button>
        <button className="calc-key utility" onClick={pressClear}>AC</button><button className="calc-key utility" onClick={pressBackspace}>⌫</button><button className="calc-key utility" onClick={pressEquals}>=</button>
        <button disabled={disabled} className={"calc-key save-key" + (disabled ? " disabled" : "")} onClick={onSave}><Check size={21} strokeWidth={2.5} /></button>
      </div>
    </div>
  );
}

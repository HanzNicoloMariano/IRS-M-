// Labs 34 to 37: login, roles, access control, audit trail, navigation

const ROLES = {
  "Administrator": "Manage system",
  "Reporter": "Report incidents",
  "Incident Officer": "Manage incident records",
  "Investigator": "Investigate incidents",
  "Action Officer": "Implement corrective actions",
  "Supervisor": "Review and approve",
  "Management": "View reports and dashboards"
};
const ALL = Object.keys(ROLES);
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

// Administrator is always allowed. Each permission lists the other roles that have it.
const P = {
  "incident.view": ALL,
  "incident.submit": ["Reporter", "Incident Officer"],
  "incident.edit": ["Incident Officer"],
  "reporter.manage": ["Incident Officer"],
  "category.manage": ["Incident Officer"],
  "location.manage": ["Incident Officer"],
  "investigation.view": ["Investigator", "Incident Officer", "Supervisor", "Management"],
  "investigation.assign": ["Incident Officer", "Supervisor"],
  "investigation.update": ["Investigator", "Incident Officer"],
  "findings.record": ["Investigator"],
  "evidence.upload": ["Investigator", "Incident Officer"],
  "action.view": ["Investigator", "Incident Officer", "Action Officer", "Supervisor", "Management"],
  "action.create": ["Investigator", "Incident Officer", "Supervisor"],
  "action.update": ["Action Officer", "Supervisor"],
  "action.verify": ["Supervisor"],
  "resolution.view": ["Incident Officer", "Supervisor", "Management"],
  "resolution.record": ["Incident Officer", "Supervisor"],
  "incident.close": ["Supervisor"],
  "reports.view": ["Incident Officer", "Supervisor", "Management"],
  "audit.view": ["Supervisor"],
  "users.manage": []
};

const PAGES = [
  ["home", "Home", "", () => showHome()],
  ["dashboard", "Dashboard", "reports.view", () => showDashboard()],
  ["reporters", "Reporters", "reporter.manage", () => showReporters()],
  [
    "classify",
    "Categories & Types",
    "category.manage",
    () => {
      showCategories();
      showTypes();
    }
  ],
  ["incidents", "Incidents", "incident.view", () => showIncidents()],
  [
    "locations",
    "Locations",
    "incident.view",
    () => {
      showLocations();
      showMonitor();
    }
  ],
  ["investigations", "Investigations", "investigation.view", () => showInvestigations()],
  ["findings", "Findings & RCA", "investigation.view", () => showFindings()],
  ["evidence", "Evidence", "investigation.view", () => showEvidence()],
  ["actions", "Actions", "action.view", () => showActions()],
  ["actionmon", "Action Monitoring", "action.view", () => showActMon()],
  ["resolution", "Resolution", "resolution.view", () => showRes()],
  ["closure", "Closure", "resolution.view", () => showClose()],
  ["reports", "Reports", "reports.view", () => showReports()],
  ["audit", "Audit Trail", "audit.view", () => showAudit()],
  ["users", "Users & Roles", "users.manage", () => showUsers()],
  ["courses", "Courses", "reporter.manage", () => showCourses()],
  ["account", "My Account", "", () => {}]
];

// ===== Lab 34: login, logout, session =====
function cur() {
  return find(db.users, sessionStorage.getItem("irs_user"));
}

function can(p) {
  const u = cur();
  return !!u && u.active && (u.role == "Administrator" || (P[p] || []).includes(u.role));
}

function pageAllowed(id) {
  const pg = PAGES.find(x => x[0] == id);
  return !!pg && (!pg[2] || can(pg[2]));
}

function login(name, pass) {
  const u = db.users.find(x => x.username == name);
  if (!u || u.pass != hash(pass)) {
    log("Failed login", "session", "-", "-", "username: " + name);
    saveData();
    return "Wrong username or password.";
  }
  if (!u.active) return "This account is deactivated.";
  sessionStorage.setItem("irs_user", u.id);
  sessionStorage.setItem("irs_last", Date.now());
  log("Login", "session");
  saveData();
  return "";
}

function doLogin() {
  const e = login(v("lg_user"), document.getElementById("lg_pass").value);
  setv("lg_pass", "");
  if (e) return msg("lg_msg", e, false);
  msg("lg_msg", "", true);
  enter();
  if (cur().reset) {
    showPage("account");
    msg("ac_msg", "Please change your temporary password.", false);
  }
}

function doLogout(text) {
  if (cur()) {
    log("Logout", "session");
    saveData();
  }
  sessionStorage.removeItem("irs_user");
  document.body.classList.add("out");
  msg("lg_msg", text || "", true);
}

const sessionExpired = (last, now) => now - last > db.settings.timeout * 60000;

function enter() {
  document.body.classList.remove("out");
  const nav = document.querySelector("nav");
  nav.innerHTML = "";
  PAGES.filter(p => pageAllowed(p[0])).forEach(p => {
    const b = document.createElement("button");
    b.textContent = p[1];
    b.dataset.p = p[0];
    b.onclick = () => showPage(p[0]);
    nav.appendChild(b);
  });
  document.getElementById("userbar").innerHTML =
    "Logged in: <b>" +
    esc(cur().name) +
    "</b> (" +
    esc(cur().role) +
    ") " +
    btn("Logout", "doLogout()", true);
  showPage("home");
}

function showPage(p) {
  if (!cur()) return;
  if (!pageAllowed(p)) {
    toast(DENIED);
    p = "home";
  }
  currentPage = p;
  document.querySelectorAll(".page").forEach(s => s.classList.toggle("show", s.id == p));
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("active", b.dataset.p == p));
  fillAll();
  PAGES.find(x => x[0] == p)[3]();
}

function storePassword(old, n, n2) {
  const u = cur();
  if (!u) return DENIED;
  if (u.pass != hash(old)) return "Current password is wrong.";
  if (!PASSWORD_RULE.test(n)) return "New password needs at least 8 characters with a letter and a number.";
  if (n != n2) return "Passwords do not match.";
  if (hash(n) == u.pass) return "The new password must be different from the current one.";
  u.pass = hash(n);
  u.reset = false;
  log("Password changed", "users", "-", "-", u.username);
  return commit();
}

function changePassword() {
  const f = id => document.getElementById(id).value;
  done("ac_msg", storePassword(f("ac_old"), f("ac_new"), f("ac_new2")), "Password changed.", () =>
    ["ac_old", "ac_new", "ac_new2"].forEach(i => setv(i, ""))
  );
}

// ===== Lab 35 and 36: users and roles =====
function storeUser(d, id) {
  if (!can("users.manage")) return "Only the Administrator can manage users.";
  const e = missing(d, { username: "Username", name: "Full name", role: "Role" }) || tooLong(d);
  if (e) return e;
  if (!/^[A-Za-z0-9_.]{3,20}$/.test(d.username))
    return "Username must be 3 to 20 letters, numbers, dots or underscores.";
  if (!ROLES[d.role]) return "Role is not valid.";
  if (db.users.some(x => x.username == d.username && x.id != id)) return "Username already exists.";
  if ((!id || d.pass) && !PASSWORD_RULE.test(d.pass || ""))
    return "Password needs at least 8 characters with a letter and a number.";
  const { pass, ...info } = d;
  if (id) {
    const u = find(db.users, id);
    const [p, q] = diff(u, info);
    log("Update", "users", "-", p, q);
    Object.assign(u, info);
    if (pass) u.pass = hash(pass);
  } else {
    db.users.push({ id: nextId(db.users), ...info, pass: hash(pass), active: true, reset: false });
    log("Create", "users", "-", "-", info.username + " (" + info.role + ")");
  }
  return commit();
}

const U = ["id", "username", "name", "role", "pass"];

function saveUser() {
  const { id, ...d } = read("u_", U);
  d.pass = document.getElementById("u_pass").value;
  done("u_msg", storeUser(d, id), "User saved.", () => {
    write("u_", U);
    showUsers();
  });
}

function toggleUser(id) {
  if (!can("users.manage")) return toast(DENIED);
  const u = find(db.users, id);
  if (u.id == cur().id) return toast("You cannot deactivate your own account.");
  u.active = !u.active;
  log(u.active ? "Activate" : "Deactivate", "users", "-", "-", u.username);
  commit();
  showUsers();
}

function resetPassword(id) {
  if (!can("users.manage")) return [DENIED];
  const u = find(db.users, id);
  const word =
    Array.from(crypto.getRandomValues(new Uint8Array(6)), b => "abcdefghjkmnpqrstuvwxyz"[b % 23]).join("") +
    "A7";
  u.pass = hash(word);
  u.reset = true;
  log("Password reset", "users", "-", "-", u.username);
  return [commit(), word];
}

function resetPass(id) {
  const [e, word] = resetPassword(id);
  msg(
    "u_msg",
    e ||
      "Temporary password for " +
        find(db.users, id).username +
        ": " +
        word +
        " (must be changed at next login).",
    !e
  );
}

function showUsers() {
  fillSelect("u_role", opts(ALL), x => x.name, "Select role");
  drawTable(
    "u_table",
    ["Username", "Name", "Role", "Status", "Actions"],
    db.users.map(u => ({
      off: !u.active,
      cells: [
        u.username,
        u.name,
        u.role,
        u.active ? "Active" : "Inactive",
        raw(
          btn("Edit", "write('u_',U,find(db.users," + u.id + "))") +
            btn(u.active ? "Deactivate" : "Activate", "toggleUser(" + u.id + ")", true) +
            btn("Reset Password", "resetPass(" + u.id + ")", true)
        )
      ]
    }))
  );
  drawTable(
    "u_roles",
    ["Role", "Responsibility"],
    ALL.map(r => ({ cells: [r, ROLES[r]] }))
  );
  drawTable(
    "u_perm",
    ["Permission"].concat(ALL),
    Object.keys(P).map(k => ({
      cells: [k].concat(ALL.map(r => (r == "Administrator" || P[k].includes(r) ? "✓" : "")))
    })),
    30
  );
}

// ===== Lab 37: audit trail =====
function showAudit() {
  fillSelect(
    "au_user",
    db.users.map(u => ({ id: u.name, name: u.name })),
    x => x.name,
    "All users"
  );
  const s = v("au_search").toLowerCase();
  drawTable(
    "au_table",
    ["Date/Time", "User", "Role", "Action", "Activity", "Incident", "Previous Value", "New Value"],
    db.audit
      .filter(
        a =>
          (v("au_user") == "" || a.user == v("au_user")) &&
          (s == "" || (a.activity + " " + a.incident + " " + a.action).toLowerCase().includes(s))
      )
      .reverse()
      .map(a => ({ cells: [a.time, a.user, a.role, a.action, a.activity, a.incident, a.prev, a.next] }))
  );
}

// ===== Start =====
document.addEventListener("click", () => {
  if (cur()) sessionStorage.setItem("irs_last", Date.now());
});
setInterval(() => {
  if (cur() && sessionExpired(sessionStorage.getItem("irs_last"), Date.now()))
    doLogout("Session expired after " + db.settings.timeout + " minutes. Please log in again.");
}, 30000);

window.addEventListener("load", () => {
  if (loadFailed) msg("lg_msg", "Saved data could not be read. The starting data was loaded.", false);
  if (cur() && cur().active) enter();
  else document.body.classList.add("out");
});

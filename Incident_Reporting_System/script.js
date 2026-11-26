// Incident Reporting System | Hanz Nicolo C Mariano | BSIT 3A
// Core data and Labs 1 to 33

const STORE = "irs";
const DENIED = "Access denied: your role cannot do this.";
const SEVERITIES = ["Low", "Medium", "High", "Critical"];
const RESOLVE_DAYS = { Low: 30, Medium: 14, High: 7, Critical: 3 };
const REPORTER_TYPES = ["Employee", "Student", "Visitor", "Contractor"];
const FLOW = {
  "Open": ["Under Investigation"],
  "Under Investigation": ["For Action"],
  "For Action": ["Resolved"],
  "Resolved": ["Closed"],
  "Closed": []
};
const STEPS = ["Assigned", "In Progress", "Evidence Gathering", "Findings Prepared", "Completed"];
const ACTION_STEPS = ["Pending", "In Progress", "Completed", "Verified"];
const ACTION_TYPES = [
  "Corrective Action",
  "Preventive Action",
  "Safety Improvement",
  "Equipment Repair",
  "Policy Improvement",
  "Training",
  "Process Improvement"
];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const RESOLUTION_TYPES = [
  "Corrective Action Implemented",
  "Preventive Measure Applied",
  "Repair Completed",
  "Policy Updated",
  "Training Conducted",
  "No Further Action Required"
];
const FILE_TYPES = ["pdf", "png", "jpg", "jpeg", "gif", "doc", "docx", "xls", "xlsx", "txt", "csv"];

let currentPage = "home",
  loadFailed = false;
let db = loadData();

// ===== Lab 1 to 3: data, storage, helpers =====
function startData() {
  return {
    departments: ["IT Department", "Engineering", "Administration", "Facilities", "Student Affairs"].map(
      (n, i) => ({ id: i + 1, name: n })
    ),
    courses: ["BSIT", "BSBA", "BSED", "BSN", "BEED"].map((n, i) => ({ id: i + 1, name: n })),
    categories: [
      "Safety",
      "Security",
      "Accident",
      "Property Damage",
      "Workplace",
      "IT/Technical",
      "Environmental",
      "Health",
      "Other"
    ].map((n, i) => ({ id: i + 1, name: n, active: true })),
    types: [
      ["Slip/Fall", 1],
      ["Equipment Failure", 6],
      ["Theft", 2],
      ["Unauthorized Access", 2],
      ["Fire", 1],
      ["Data Incident", 6],
      ["Vehicle Accident", 3],
      ["Physical Injury", 3]
    ].map((t, i) => ({ id: i + 1, name: t[0], cat: t[1], active: true })),
    locations: [],
    reporters: [],
    incidents: [],
    investigations: [],
    findings: [],
    evidence: [],
    actions: [],
    actionlog: [],
    resolutions: [],
    closures: [],
    notifications: [],
    audit: [],
    users: defaultUsers(),
    settings: { timeout: 15, maxFileMB: 5 }
  };
}

function defaultUsers() {
  return [
    ["admin", "Hanzy Mariano", "Administrator"],
    ["reporter", "Justin Papostol", "Reporter"],
    ["officer", "Vines Manaot", "Incident Officer"],
    ["investigator", "Radoley Limobang", "Investigator"],
    ["actionofficer", "Jezy Lob-Lob", "Action Officer"],
    ["supervisor", "Hanz Nicolo Mariano", "Supervisor"],
    ["management", "Management Office", "Management"]
  ].map((u, i) => ({
    id: i + 1,
    username: u[0],
    name: u[1],
    role: u[2],
    pass: hash("Pass1234"),
    active: true,
    reset: false
  }));
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE));
    if (!saved) return startData();
    const base = startData();
    Object.keys(base).forEach(k => {
      if (!saved[k]) saved[k] = base[k];
    });
    return saved;
  } catch (e) {
    loadFailed = true;
    return startData();
  }
}

function saveData() {
  try {
    localStorage.setItem(STORE, JSON.stringify(db));
    return true;
  } catch (e) {
    return false;
  }
}

function commit() {
  if (saveData()) return "";
  db = loadData();
  return "Database error: your changes could not be saved.";
}

function hash(s) {
  // simple learning hash, not real-world security
  let h = 5381;
  s = "irs$" + s + "$irs";
  for (let k = 0; k < 2; k++) for (const c of s) h = ((h << 5) + h) ^ c.charCodeAt(0);
  return (h >>> 0).toString(16);
}

const today = () => {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
};
const nowTime = () => {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
};
const addDays = (s, n) => new Date(new Date(s).getTime() + n * 86400000).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

function validDate(s) {
  const d = new Date(s);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(d) && d.toISOString().slice(0, 10) == s;
}

const v = id => document.getElementById(id).value.trim();
const setv = (id, x) => (document.getElementById(id).value = x ?? "");
const read = (p, keys) => Object.fromEntries(keys.map(k => [k, v(p + k)]));
const write = (p, keys, o = {}) => keys.forEach(k => setv(p + k, o[k]));
const nextId = list => list.reduce((m, x) => Math.max(m, x.id), 0) + 1;
const find = (list, id) => list.find(x => x.id == id);
const byId = list => new Map(list.map(x => [x.id, x]));
const nameOf = (list, id) => {
  const x = find(list, id);
  return x ? x.name : "-";
};
const locName = id => {
  const l = find(db.locations, id);
  return l ? l.building + " - " + l.room : "-";
};
const incNo = id => {
  const i = find(db.incidents, id);
  return i ? i.number : "-";
};
const invName = x => "INV-" + x.id + " (" + incNo(x.incident) + ")";
const active = list => list.filter(x => x.active);
const last = list => list[list.length - 1];
const opts = list => list.map(x => ({ id: x, name: x }));
const esc = s =>
  String(s ?? "").replace(
    /[&<>"']/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
const raw = html => ({ html });
const cell = c => (c && c.html !== undefined ? c.html : esc(c));
const btn = (label, call, gray) =>
  "<button" + (gray ? ' class="gray"' : "") + ' onclick="' + call + '">' + label + "</button>";

function missing(d, labels) {
  const m = Object.keys(labels).filter(k => d[k] === "" || d[k] == null);
  return m.length ? "Please fill in: " + m.map(k => labels[k]).join(", ") + "." : "";
}
const tooLong = d =>
  Object.values(d).some(x => typeof x == "string" && x.length > 1000)
    ? "Text is too long (maximum 1000 characters per field)."
    : "";

function diff(o, n) {
  const p = [],
    q = [];
  Object.keys(n).forEach(k => {
    if (o[k] != n[k]) {
      p.push(k + "=" + o[k]);
      q.push(k + "=" + n[k]);
    }
  });
  return [p.join(", ").slice(0, 200), q.join(", ").slice(0, 200)];
}
const brief = d =>
  Object.entries(d)
    .map(([k, x]) => k + "=" + x)
    .join(", ")
    .slice(0, 200);

function fileError(file) {
  if (!file) return "Please choose a file.";
  const ext = file.name.split(".").pop().toLowerCase();
  if (!FILE_TYPES.includes(ext)) return "Invalid file type. Allowed: " + FILE_TYPES.join(", ") + ".";
  if (file.size == 0) return "The file is empty.";
  if (file.size > db.settings.maxFileMB * 1048576)
    return "File is too large (maximum " + db.settings.maxFileMB + " MB).";
  return "";
}

function log(action, activity, incident, prev, next) {
  const u = cur();
  db.audit.push({
    id: nextId(db.audit),
    user: u ? u.name : "-",
    role: u ? u.role : "-",
    time: new Date().toLocaleString(),
    action: action,
    activity: activity,
    incident: incident || "-",
    prev: prev || "-",
    next: next || "-"
  });
}

function notify(userId, text) {
  db.notifications.push({ id: nextId(db.notifications), to: userId, date: today(), read: false, text: text });
}

function setStatus(i, to) {
  if (!(FLOW[i.status] || []).includes(to)) return "Invalid status change: " + i.status + " to " + to + ".";
  log("Update", "incidents", i.number, "status=" + i.status, "status=" + to);
  i.status = to;
  return "";
}

// ===== Screen helpers =====
function msg(id, text, good) {
  const p = document.getElementById(id);
  p.textContent = text;
  p.className = good ? "ok" : "error";
}

function done(id, err, ok, after) {
  if (err) return msg(id, err, false);
  if (after) after();
  msg(id, ok, true);
}

let toastTimer;

function toast(text) {
  const t = document.getElementById("toast");
  t.textContent = text;
  t.style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.style.display = "none"), 3000);
}

function fillSelect(id, list, textFn, first) {
  const s = document.getElementById(id),
    old = s.value;
  s.innerHTML =
    '<option value="">' +
    first +
    "</option>" +
    list.map(x => '<option value="' + esc(x.id) + '">' + esc(textFn(x)) + "</option>").join("");
  s.value = old;
}

const views = {};

function drawTable(id, headers, rows, size = 20) {
  views[id] = { headers: headers, rows: rows, size: size, page: 0 };
  drawView(id);
}

function drawView(id) {
  const t = views[id],
    lastPage = Math.max(0, Math.ceil(t.rows.length / t.size) - 1);
  t.page = Math.min(t.page, lastPage);
  const part = t.rows.slice(t.page * t.size, (t.page + 1) * t.size);
  let html = "<table><tr>" + t.headers.map(h => "<th>" + h + "</th>").join("") + "</tr>";
  html += part.length
    ? part
        .map(
          r =>
            "<tr" +
            (r.off ? ' class="off"' : "") +
            ">" +
            r.cells.map(c => "<td>" + cell(c) + "</td>").join("") +
            "</tr>"
        )
        .join("")
    : '<tr><td colspan="' + t.headers.length + '">No records found.</td></tr>';
  html += "</table>";
  if (lastPage > 0)
    html +=
      '<div class="pager">' +
      btn("Prev", "goPage('" + id + "',-1)", true) +
      " Page " +
      (t.page + 1) +
      " of " +
      (lastPage + 1) +
      " (" +
      t.rows.length +
      " records) " +
      btn("Next", "goPage('" + id + "',1)", true) +
      "</div>";
  document.getElementById(id).innerHTML = html;
}

function goPage(id, step) {
  views[id].page += step;
  drawView(id);
}

function fillAll() {
  const users = role => db.users.filter(u => u.active && u.role == role);
  fillSelect("r_dept", db.departments, x => x.name, "Select department");
  fillSelect("r_fdept", db.departments, x => x.name, "All departments");
  fillSelect("r_course", db.courses, x => x.name, "Select course");
  fillSelect("r_type", opts(REPORTER_TYPES), x => x.name, "Select type");
  fillSelect("r_ftype", opts(REPORTER_TYPES), x => x.name, "All types");
  fillSelect("t_cat", active(db.categories), x => x.name, "Select category");
  fillSelect("i_reporter", active(db.reporters), x => x.name, "Select reporter");
  fillSelect("i_category", active(db.categories), x => x.name, "Select category");
  fillSelect("i_location", active(db.locations), x => locName(x.id), "Select location");
  fillSelect("i_severity", opts(SEVERITIES), x => x.name, "Select severity");
  fillSelect("i_fcat", db.categories, x => x.name, "All categories");
  fillSelect("i_floc", db.locations, x => locName(x.id), "All locations");
  fillSelect("i_fsev", opts(SEVERITIES), x => x.name, "All severity");
  fillSelect("i_fstatus", opts(Object.keys(FLOW)), x => x.name, "All status");
  fillSelect("l_dept", db.departments, x => x.name, "Select department");
  fillSelect(
    "v_incident",
    db.incidents.filter(i => i.status == "Open"),
    x => x.number,
    "Select incident"
  );
  fillSelect(
    "v_investigator",
    users("Investigator").map(u => ({ id: u.name, name: u.name })),
    x => x.name,
    "Select investigator"
  );
  [["f_inv"], ["e_inv"], ["a_inv"]].forEach(([id]) =>
    fillSelect(id, myInvestigations(), invName, "Select investigation")
  );
  fillSelect("a_type", opts(ACTION_TYPES), x => x.name, "Select type");
  fillSelect("a_personId", users("Action Officer"), x => x.name, "Select responsible person");
  fillSelect("a_priority", opts(PRIORITIES), x => x.name, "Select priority");
  fillSelect(
    "rs_incident",
    db.incidents.filter(i => i.status == "For Action"),
    x => x.number,
    "Select incident"
  );
  fillSelect("rs_type", opts(RESOLUTION_TYPES), x => x.name, "Select type");
  fillSelect(
    "cl_incident",
    db.incidents.filter(i => i.status == "Resolved"),
    x => x.number,
    "Select incident"
  );
  fillTypes();
}

// ===== Lab 1: home page =====
function showHome() {
  const counts = [
    ["Reporters", db.reporters.length],
    ["Incidents", db.incidents.length],
    ["Locations", db.locations.length],
    ["Investigations", db.investigations.length],
    ["Actions", db.actions.length],
    ["Overdue actions", db.actions.filter(isOverdue).length],
    ["Resolutions", db.resolutions.length]
  ];
  document.getElementById("stats").innerHTML = counts
    .map(c => "<div><b>" + c[1] + "</b>" + c[0] + "</div>")
    .join("");
  const mine = db.notifications.filter(n => n.to == cur().id && !n.read);
  document.getElementById("notif").innerHTML = mine.length
    ? "<h3>Notifications</h3>" +
      mine
        .map(
          n =>
            "<p>" +
            esc(n.date) +
            " - " +
            esc(n.text) +
            " " +
            btn("Mark read", "readNote(" + n.id + ")", true) +
            "</p>"
        )
        .join("")
    : "";
}

function readNote(id) {
  find(db.notifications, id).read = true;
  saveData();
  showHome();
}

// ===== Lab 4 to 6: reporters =====
const R = ["id", "sid", "name", "dept", "course", "position", "phone", "email", "address", "type"];

function storeReporter(d, id) {
  if (!can("reporter.manage")) return DENIED;
  const e =
    missing(d, {
      sid: "ID",
      name: "Name",
      dept: "Department",
      course: "Course",
      phone: "Contact number",
      type: "Type"
    }) || tooLong(d);
  if (e) return e;
  if (!/^[0-9+\- ]{7,15}$/.test(d.phone)) return "Contact number is not valid.";
  if (d.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) return "Email is not valid.";
  if (!REPORTER_TYPES.includes(d.type)) return "Reporter type is not valid.";
  if (db.reporters.some(x => x.sid == d.sid && x.id != id)) return "This ID already exists.";
  d.dept = Number(d.dept);
  d.course = Number(d.course);
  if (id) {
    const r = find(db.reporters, id);
    if (!r) return "Reporter not found.";
    const [p, q] = diff(r, d);
    log("Update", "reporters", "-", p, q);
    Object.assign(r, d);
  } else {
    d.id = nextId(db.reporters);
    d.active = true;
    db.reporters.push(d);
    log("Create", "reporters", "-", "-", d.name);
  }
  return commit();
}

function saveReporter() {
  const { id, ...d } = read("r_", R);
  done("r_msg", storeReporter(d, id), "Reporter saved.", () => {
    clearReporter();
    showReporters();
  });
}

function clearReporter() {
  write("r_", R);
  msg("r_msg", "", true);
}

function editReporter(id) {
  write("r_", R, find(db.reporters, id));
  window.scrollTo(0, 0);
}

function toggleReporter(id) {
  if (!can("reporter.manage")) return toast(DENIED);
  const r = find(db.reporters, id);
  r.active = !r.active;
  log(r.active ? "Activate" : "Deactivate", "reporters", "-", "-", r.name);
  commit();
  showReporters();
}

function showReporters() {
  const s = v("r_search").toLowerCase();
  const list = db.reporters.filter(
    r =>
      (s == "" || r.name.toLowerCase().includes(s) || r.sid.toLowerCase().includes(s)) &&
      (v("r_fdept") == "" || r.dept == v("r_fdept")) &&
      (v("r_ftype") == "" || r.type == v("r_ftype"))
  );
  drawTable(
    "r_table",
    ["ID", "Name", "Course", "Department", "Type", "Contact", "Status", "Actions"],
    list.map(r => ({
      off: !r.active,
      cells: [
        r.sid,
        r.name,
        nameOf(db.courses, r.course),
        nameOf(db.departments, r.dept),
        r.type,
        r.phone,
        r.active ? "Active" : "Inactive",
        raw(
          btn("Edit", "editReporter(" + r.id + ")") +
            btn(r.active ? "Deactivate" : "Activate", "toggleReporter(" + r.id + ")", true) +
            btn("Profile", "viewProfile(" + r.id + ")", true)
        )
      ]
    }))
  );
}

function viewProfile(id) {
  const r = find(db.reporters, id),
    mine = db.incidents.filter(i => i.reporter == id);
  document.getElementById("r_profile").innerHTML =
    "<h3>Profile: " +
    esc(r.name) +
    "</h3><p>" +
    [r.sid, nameOf(db.departments, r.dept), r.position, r.type, r.phone, r.email].map(esc).join(" | ") +
    "</p><p>Incidents reported: " +
    mine.length +
    '</p><div id="r_profile_t" class="scroll"></div>';
  drawTable(
    "r_profile_t",
    ["Incident", "Date", "Category", "Status", "Investigation", "Resolution"],
    mine.map(i => {
      const inv = db.investigations.find(x => x.incident == i.id);
      return {
        cells: [
          i.number,
          i.date,
          nameOf(db.categories, i.category),
          i.status,
          inv ? inv.status : "Not started",
          ["Resolved", "Closed"].includes(i.status) ? i.status : "Unresolved"
        ]
      };
    })
  );
}

// ===== Lab 7: categories and types =====
function storeCategory(name, id) {
  if (!can("category.manage")) return DENIED;
  if (!name) return "Category name is required.";
  if (db.categories.some(c => c.name.toLowerCase() == name.toLowerCase() && c.id != id))
    return "Category already exists.";
  if (id) {
    const c = find(db.categories, id);
    log("Update", "categories", "-", c.name, name);
    c.name = name;
  } else {
    db.categories.push({ id: nextId(db.categories), name: name, active: true });
    log("Create", "categories", "-", "-", name);
  }
  return commit();
}

function saveCategory() {
  done("c_msg", storeCategory(v("c_name"), v("c_id")), "Category saved.", () => {
    write("c_", ["id", "name"]);
    showCategories();
  });
}

function showCategories() {
  drawTable(
    "c_table",
    ["Category", "Status", "Actions"],
    db.categories.map(c => ({
      off: !c.active,
      cells: [
        c.name,
        c.active ? "Active" : "Inactive",
        raw(
          btn("Edit", "write('c_',['id','name'],find(db.categories," + c.id + "))") +
            btn(c.active ? "Deactivate" : "Activate", "toggleItem('categories'," + c.id + ")", true)
        )
      ]
    }))
  );
}

function storeType(d, id) {
  if (!can("category.manage")) return DENIED;
  const e = missing(d, { name: "Type name", cat: "Category" });
  if (e) return e;
  if (!find(db.categories, d.cat)) return "Category not found.";
  if (db.types.some(t => t.name.toLowerCase() == d.name.toLowerCase() && t.cat == d.cat && t.id != id))
    return "This type already exists in the category.";
  d.cat = Number(d.cat);
  if (id) {
    const t = find(db.types, id);
    const [p, q] = diff(t, d);
    log("Update", "types", "-", p, q);
    Object.assign(t, d);
  } else {
    db.types.push({ id: nextId(db.types), name: d.name, cat: d.cat, active: true });
    log("Create", "types", "-", "-", d.name);
  }
  return commit();
}

function saveType() {
  const { id, ...d } = read("t_", ["id", "name", "cat"]);
  done("t_msg", storeType(d, id), "Type saved.", () => {
    write("t_", ["id", "name", "cat"]);
    showTypes();
  });
}

function showTypes() {
  drawTable(
    "t_table",
    ["Type", "Category", "Status", "Actions"],
    db.types.map(t => ({
      off: !t.active,
      cells: [
        t.name,
        nameOf(db.categories, t.cat),
        t.active ? "Active" : "Inactive",
        raw(
          btn("Edit", "write('t_',['id','name','cat'],find(db.types," + t.id + "))") +
            btn(t.active ? "Deactivate" : "Activate", "toggleItem('types'," + t.id + ")", true)
        )
      ]
    }))
  );
}

function toggleItem(table, id) {
  if (!can(table == "locations" ? "location.manage" : "category.manage")) return toast(DENIED);
  const x = find(db[table], id);
  x.active = !x.active;
  log(x.active ? "Activate" : "Deactivate", table, "-", "-", x.name || x.room);
  commit();
  showPage(currentPage);
}

// ===== Lab 8 to 10 and 12: incidents =====
const I = ["id", "reporter", "category", "type", "location", "date", "time", "severity", "desc", "response"];

function fillTypes() {
  fillSelect(
    "i_type",
    active(db.types).filter(t => t.cat == v("i_category")),
    x => x.name,
    "Select type"
  );
}

function nextNumber() {
  const prefix = "INC-" + new Date().getFullYear() + "-";
  const top = db.incidents
    .filter(i => i.number.startsWith(prefix))
    .reduce((m, i) => Math.max(m, parseInt(i.number.slice(prefix.length)) || 0), 0);
  return prefix + String(top + 1).padStart(4, "0");
}

function checkIncident(d) {
  const e =
    missing(d, {
      reporter: "Reporter",
      category: "Category",
      type: "Type",
      location: "Location",
      date: "Date of incident",
      time: "Time of incident",
      severity: "Severity",
      desc: "Description"
    }) || tooLong(d);
  if (e) return e;
  if (!validDate(d.date)) return "Incident date is invalid.";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.time)) return "Incident time is invalid.";
  if (d.date > today() || (d.date == today() && d.time > nowTime()))
    return "Incident date and time cannot be in the future.";
  const r = find(db.reporters, d.reporter),
    l = find(db.locations, d.location),
    t = find(db.types, d.type);
  if (!r || !r.active) return "Reporter is not registered or is inactive.";
  if (!l || !l.active) return "Location is not valid.";
  if (!t || t.cat != d.category) return "Incident type does not belong to the selected category.";
  if (!SEVERITIES.includes(d.severity)) return "Severity is not valid.";
  return "";
}

function storeIncident(d, id, number) {
  const old = id ? find(db.incidents, id) : null;
  if (id && !old) return "Incident not found.";
  if (!can(id ? "incident.edit" : "incident.submit")) return DENIED;
  if (old && old.status == "Closed" && cur().role != "Administrator")
    return "Closed incidents cannot be edited.";
  const e = checkIncident(d);
  if (e) return e;
  ["reporter", "category", "type", "location"].forEach(k => (d[k] = Number(d[k])));
  if (old) {
    const [p, q] = diff(old, d);
    log("Update", "incidents", old.number, p, q);
    Object.assign(old, d);
  } else {
    d.id = nextId(db.incidents);
    d.number = number || nextNumber();
    if (db.incidents.some(i => i.number == d.number)) return "Duplicate incident number.";
    d.status = "Open";
    d.reported = today();
    db.incidents.push(d);
    log(
      "Create",
      "incidents",
      d.number,
      "-",
      "severity=" + d.severity + ", type=" + nameOf(db.types, d.type)
    );
  }
  return commit();
}

function saveIncident() {
  const { id, ...d } = read("i_", I);
  done("i_msg", storeIncident(d, id), "Incident saved.", () => {
    write("i_", I);
    showIncidents();
  });
}

function filterIncidents(f) {
  const R = byId(db.reporters),
    T = byId(db.types),
    s = (f.search || "").toLowerCase();
  return db.incidents.filter(
    i =>
      (!s ||
        (i.number + " " + (R.get(i.reporter)?.name ?? "") + " " + (T.get(i.type)?.name ?? ""))
          .toLowerCase()
          .includes(s)) &&
      (!f.date || i.date == f.date) &&
      (!f.cat || i.category == f.cat) &&
      (!f.loc || i.location == f.loc) &&
      (!f.sev || i.severity == f.sev) &&
      (!f.status || i.status == f.status)
  );
}

function showIncidents() {
  const list = filterIncidents({
    search: v("i_search"),
    date: v("i_fdate"),
    cat: v("i_fcat"),
    loc: v("i_floc"),
    sev: v("i_fsev"),
    status: v("i_fstatus")
  });
  const R = byId(db.reporters),
    C = byId(db.categories),
    T = byId(db.types),
    L = byId(db.locations);
  drawTable(
    "i_table",
    ["Number", "Reporter", "Category", "Type", "Location", "Date", "Severity", "Status", "Reported", ""],
    list.map(i => {
      const l = L.get(i.location);
      return {
        cells: [
          i.number,
          R.get(i.reporter)?.name ?? "-",
          C.get(i.category)?.name ?? "-",
          T.get(i.type)?.name ?? "-",
          l ? l.building + " - " + l.room : "-",
          i.date,
          i.severity,
          i.status,
          i.reported || "-",
          raw(btn("Edit", "editIncident(" + i.id + ")", true))
        ]
      };
    })
  );
}

function editIncident(id) {
  const i = find(db.incidents, id);
  write("i_", I, i);
  fillTypes();
  setv("i_type", i.type);
  window.scrollTo(0, 0);
}

// ===== Lab 11 to 13: locations =====
const L = ["id", "building", "room", "area", "dept", "floor", "desc"];

function storeLocation(d, id) {
  if (!can("location.manage")) return DENIED;
  const e = missing(d, { building: "Building", room: "Room or office" }) || tooLong(d);
  if (e) return e;
  if (
    db.locations.some(
      x =>
        x.building.toLowerCase() == d.building.toLowerCase() &&
        x.room.toLowerCase() == d.room.toLowerCase() &&
        x.id != id
    )
  )
    return "Location already exists.";
  d.dept = d.dept === "" ? "" : Number(d.dept);
  if (id) {
    const l = find(db.locations, id);
    const [p, q] = diff(l, d);
    log("Update", "locations", "-", p, q);
    Object.assign(l, d);
  } else {
    d.id = nextId(db.locations);
    d.active = true;
    db.locations.push(d);
    log("Create", "locations", "-", "-", d.building + " - " + d.room);
  }
  return commit();
}

function saveLocation() {
  const { id, ...d } = read("l_", L);
  done("l_msg", storeLocation(d, id), "Location saved.", () => {
    write("l_", L);
    showLocations();
    showMonitor();
  });
}

function showLocations() {
  const s = v("l_search").toLowerCase();
  const list = db.locations.filter(
    l => s == "" || (l.building + " " + l.room + " " + l.area).toLowerCase().includes(s)
  );
  drawTable(
    "l_table",
    ["Building", "Room", "Area", "Department", "Floor", "Status", "Actions"],
    list.map(l => ({
      off: !l.active,
      cells: [
        l.building,
        l.room,
        l.area,
        nameOf(db.departments, l.dept),
        l.floor,
        l.active ? "Active" : "Inactive",
        raw(
          btn("Edit", "write('l_',L,find(db.locations," + l.id + "))") +
            btn(l.active ? "Deactivate" : "Activate", "toggleItem('locations'," + l.id + ")", true)
        )
      ]
    }))
  );
}

function showMonitor() {
  drawTable(
    "l_monitor",
    ["Location", "Incidents", "Types", "High/Critical", "Open", "Resolved", "Recurring"],
    db.locations.map(l => {
      const list = db.incidents.filter(i => i.location == l.id),
        counts = {};
      list.forEach(i => {
        const n = nameOf(db.types, i.type);
        counts[n] = (counts[n] || 0) + 1;
      });
      const names = Object.keys(counts),
        open = list.filter(i => !["Resolved", "Closed"].includes(i.status)).length;
      return {
        cells: [
          locName(l.id),
          list.length,
          names.map(n => n + " (" + counts[n] + ")").join(", ") || "-",
          list.filter(i => ["High", "Critical"].includes(i.severity)).length,
          open,
          list.length - open,
          names.filter(n => counts[n] > 1).join(", ") || "-"
        ]
      };
    })
  );
}

// ===== Lab 14, 15 and 18: investigations =====
const V = ["incident", "investigator", "start", "target", "notes"];

const ownInvestigation = x => cur().role != "Investigator" || x.investigator == cur().name;
const myInvestigations = () => db.investigations.filter(x => !cur() || ownInvestigation(x));

function storeInvestigation(d) {
  if (!can("investigation.assign")) return DENIED;
  const e =
    missing(d, {
      incident: "Incident",
      investigator: "Investigator",
      start: "Start date",
      target: "Target completion date"
    }) || tooLong(d);
  if (e) return e;
  const i = find(db.incidents, d.incident);
  if (!i) return "Incident not found.";
  if (db.investigations.some(x => x.incident == i.id)) return "This incident already has an investigation.";
  if (i.status != "Open") return "Only an open incident can be assigned for investigation.";
  if (!find(db.reporters, i.reporter) || !find(db.locations, i.location))
    return "The incident is not valid for investigation (reporter or location is missing).";
  const u = db.users.find(x => x.name == d.investigator && x.role == "Investigator" && x.active);
  if (!u) return "Investigator must be an active user with the Investigator role.";
  if (!validDate(d.start) || !validDate(d.target)) return "Investigation dates are invalid.";
  if (d.start < i.date) return "Investigation cannot start before the incident date.";
  if (d.target < d.start) return "Target date cannot be before the start date.";
  const s = setStatus(i, "Under Investigation");
  if (s) return s;
  db.investigations.push({
    id: nextId(db.investigations),
    incident: i.id,
    investigator: u.name,
    start: d.start,
    target: d.target,
    notes: d.notes,
    status: "Assigned",
    assigned: today(),
    done: ""
  });
  log("Create", "investigations", i.number, "-", "investigator=" + u.name + ", target=" + d.target);
  notify(u.id, "You were assigned to investigate " + i.number + ", due " + d.target);
  return commit();
}

function saveInvestigation() {
  const d = read("v_", V);
  done("v_msg", storeInvestigation(d), "Investigation assigned. The investigator was notified.", () => {
    write("v_", V);
    fillAll();
    showInvestigations();
  });
}

function advanceInvestigation(id) {
  const x = find(db.investigations, id);
  if (!x) return "Investigation not found.";
  if (!can("investigation.update") || !ownInvestigation(x)) return DENIED;
  if (x.status == "Completed") return "Investigation is already completed.";
  const next = STEPS[STEPS.indexOf(x.status) + 1],
    i = find(db.incidents, x.incident);
  if (["Findings Prepared", "Completed"].includes(next) && !db.findings.some(f => f.inv == x.id && f.root))
    return "Record the findings and root cause before moving to " + next + ".";
  if (next == "Completed") {
    const s = setStatus(i, "For Action");
    if (s) return s;
  }
  log("Update", "investigations", i.number, "status=" + x.status, "status=" + next);
  x.status = next;
  if (next == "Completed") x.done = today();
  return commit();
}

function nextStep(id) {
  const e = advanceInvestigation(id);
  if (e) toast(e);
  showInvestigations();
}

function showInvestigations() {
  drawTable(
    "v_table",
    ["Investigation", "Investigator", "Start", "Deadline", "Status", "Completed On", "Action"],
    myInvestigations().map(x => ({
      cells: [
        invName(x),
        x.investigator,
        x.start,
        x.target,
        x.status,
        x.done || "-",
        x.status == "Completed" ? "-" : raw(btn("Next Status", "nextStep(" + x.id + ")"))
      ]
    }))
  );
}

// ===== Lab 16 and 19: findings and root cause =====
const F = ["inv", "problem", "findings", "immediate", "root", "contrib", "witness", "rec"];

function storeFinding(d) {
  if (!can("findings.record")) return DENIED;
  const e =
    missing(d, {
      inv: "Investigation",
      problem: "Problem",
      findings: "Findings",
      root: "Root cause",
      rec: "Recommended preventive measures"
    }) || tooLong(d);
  if (e) return e;
  const x = find(db.investigations, d.inv);
  if (!x) return "Investigation not found.";
  if (!ownInvestigation(x)) return "Only the assigned investigator can record findings.";
  d.id = nextId(db.findings);
  d.inv = Number(d.inv);
  db.findings.push(d);
  log("Create", "findings", incNo(x.incident), "-", "root cause=" + d.root.slice(0, 80));
  return commit();
}

function saveFinding() {
  done("f_msg", storeFinding(read("f_", F)), "Findings saved.", () => {
    write("f_", F);
    showFindings();
  });
}

function showFindings() {
  const mine = new Set(myInvestigations().map(x => x.id));
  drawTable(
    "f_table",
    ["Investigation", "Problem", "Findings", "Root Cause", "Recommendation"],
    db.findings
      .filter(f => mine.has(f.inv))
      .map(f => ({
        cells: [invName(find(db.investigations, f.inv)), f.problem, f.findings, f.root, f.rec]
      }))
  );
}

// ===== Lab 17: evidence =====
function storeEvidence(d, file) {
  if (!can("evidence.upload")) return DENIED;
  const e = missing(d, { inv: "Investigation", by: "Uploaded by" }) || tooLong(d) || fileError(file);
  if (e) return e;
  const x = find(db.investigations, d.inv);
  if (!x) return "Investigation not found.";
  if (!ownInvestigation(x)) return "Only the assigned investigator can add evidence.";
  db.evidence.push({
    id: nextId(db.evidence),
    inv: Number(d.inv),
    file: file.name,
    size: (file.size / 1024).toFixed(1),
    by: d.by,
    date: today(),
    desc: d.desc
  });
  log("Create", "evidence", incNo(x.incident), "-", file.name);
  return commit();
}

function saveEvidence() {
  const d = read("e_", ["inv", "by", "desc"]);
  done("e_msg", storeEvidence(d, document.getElementById("e_file").files[0]), "Evidence saved.", () => {
    write("e_", ["inv", "by", "desc", "file"]);
    showEvidence();
  });
}

function showEvidence() {
  const mine = new Set(myInvestigations().map(x => x.id));
  drawTable(
    "e_table",
    ["Investigation", "File", "Size (KB)", "Uploaded By", "Date", "Description"],
    db.evidence
      .filter(e => mine.has(e.inv))
      .map(e => ({
        cells: [invName(find(db.investigations, e.inv)), e.file, e.size, e.by, e.date, e.desc]
      }))
  );
}

// ===== Lab 20 to 23: actions =====
const A = ["inv", "type", "desc", "req", "personId", "target", "priority"];

const isOverdue = a => today() > a.target && !["Completed", "Verified"].includes(a.status);
const overdueDays = a => daysBetween(a.target, today());

function storeAction(d) {
  if (!can("action.create")) return DENIED;
  const e =
    missing(d, {
      inv: "Investigation",
      type: "Action type",
      desc: "Description",
      req: "Action requirements",
      personId: "Responsible person",
      target: "Target date",
      priority: "Priority"
    }) || tooLong(d);
  if (e) return e;
  const x = find(db.investigations, d.inv);
  if (!x) return "Investigation not found.";
  if (!ownInvestigation(x))
    return "Only the assigned investigator can create actions for this investigation.";
  const i = find(db.incidents, x.incident);
  if (["Resolved", "Closed"].includes(i.status))
    return "Actions cannot be added to a resolved or closed incident.";
  if (!db.findings.some(f => f.inv == x.id && f.root))
    return "Record the findings and root cause first. They are the basis of the action.";
  const u = db.users.find(y => y.id == d.personId && y.role == "Action Officer" && y.active);
  if (!u) return "Responsible person must be an active Action Officer.";
  if (!ACTION_TYPES.includes(d.type) || !PRIORITIES.includes(d.priority))
    return "Action type or priority is not valid.";
  if (!validDate(d.target)) return "Target date is invalid.";
  if (d.target < today()) return "Target date cannot be in the past.";
  db.actions.push({
    id: nextId(db.actions),
    inv: x.id,
    incident: x.incident,
    type: d.type,
    desc: d.desc,
    req: d.req,
    personId: u.id,
    person: u.name,
    target: d.target,
    priority: d.priority,
    status: "Pending",
    remarks: "",
    completed: ""
  });
  notify(u.id, "New " + d.type + " for " + i.number + ", due " + d.target);
  log("Create", "actions", i.number, "-", d.type + " for " + u.name + ", due " + d.target);
  return commit();
}

function saveAction() {
  done("a_msg", storeAction(read("a_", A)), "Action saved. The responsible person was notified.", () => {
    write("a_", A);
    showActions();
  });
}

function showActions() {
  drawTable(
    "a_table",
    ["Incident", "Type", "Action", "Requirements", "Responsible", "Target", "Priority", "Status"],
    db.actions.map(a => ({
      cells: [incNo(a.incident), a.type, a.desc, a.req || "-", a.person, a.target, a.priority, a.status]
    }))
  );
}

function advanceAction(id, remarks) {
  const a = find(db.actions, id);
  if (!a) return "Action not found.";
  const to = ACTION_STEPS[ACTION_STEPS.indexOf(a.status) + 1];
  if (!to) return "Invalid status change: this action is already verified.";
  const own = cur().role != "Action Officer" || a.personId == cur().id;
  if (to == "Verified" ? !can("action.verify") : !(can("action.update") && own)) return DENIED;
  log("Update", "actions", incNo(a.incident), "status=" + a.status, "status=" + to);
  db.actionlog.push({
    id: nextId(db.actionlog),
    action: a.id,
    date: today(),
    by: cur().name,
    from: a.status,
    to: to,
    remarks: remarks || ""
  });
  a.status = to;
  if (remarks) a.remarks = remarks;
  if (to == "Completed") a.completed = today();
  return commit();
}

function nextAction(id) {
  const e = advanceAction(id, v("m_remarks"));
  if (e) return toast(e);
  setv("m_remarks", "");
  showActMon();
}

function showActMon() {
  drawTable(
    "m_table",
    ["Incident", "Action", "Responsible", "Deadline", "Completed On", "Status", "Remarks", ""],
    db.actions.map(a => ({
      cells: [
        incNo(a.incident),
        a.type + ": " + a.desc,
        a.person,
        a.target,
        a.completed || "-",
        a.status,
        a.remarks || "-",
        a.status == "Verified" ? "-" : raw(btn("Next Status", "nextAction(" + a.id + ")"))
      ]
    }))
  );
  drawTable(
    "m_over",
    ["Incident", "Action", "Responsible", "Due Date", "Days Overdue"],
    db.actions.filter(isOverdue).map(a => ({
      cells: [
        incNo(a.incident),
        a.type + ": " + a.desc,
        a.person,
        a.target,
        raw('<span class="over">' + overdueDays(a) + "</span>")
      ]
    }))
  );
  drawTable(
    "m_log",
    ["Date", "Incident", "Action", "Change", "By", "Remarks"],
    db.actionlog
      .slice()
      .reverse()
      .map(g => {
        const a = find(db.actions, g.action) || {};
        return {
          cells: [g.date, incNo(a.incident), a.type || "-", g.from + " to " + g.to, g.by, g.remarks || "-"]
        };
      })
  );
}

// ===== Lab 24 to 26: resolution and closure =====
function review(box, id) {
  const el = document.getElementById(box),
    i = find(db.incidents, id);
  if (!i) {
    el.innerHTML = "";
    return;
  }
  const inv = db.investigations.find(x => x.incident == i.id),
    f = inv && db.findings.find(x => x.inv == inv.id);
  const acts = db.actions.filter(a => a.incident == i.id),
    r = db.resolutions.find(x => x.incident == i.id);
  const line = (label, text) => "<p><b>" + label + ":</b> " + esc(text) + "</p>";
  el.innerHTML =
    "<h3>Review</h3>" +
    line(
      "Incident",
      [i.number, nameOf(db.types, i.type), i.severity, i.date, locName(i.location)].join(" | ") +
        " - " +
        i.desc
    ) +
    line("Investigation", inv ? inv.investigator + " - " + inv.status : "None") +
    line("Findings", f ? f.findings + " | Root cause: " + f.root + " | Recommendation: " + f.rec : "None") +
    line(
      "Corrective actions",
      acts.length
        ? acts.map(a => a.type + ": " + a.desc + " (" + a.person + ", " + a.status + ")").join("; ")
        : "None"
    ) +
    (r ? line("Resolution", r.type + " - " + r.desc + " (" + r.date + " by " + r.by + ")") : "");
}

function resolveCheck(i, date) {
  const e = [],
    inv = db.investigations.find(x => x.incident == i.id),
    acts = db.actions.filter(a => a.incident == i.id);
  if (!inv) e.push("Incident must have an investigation.");
  else {
    if (inv.status != "Completed") e.push("Investigation must be completed.");
    if (!db.findings.some(f => f.inv == inv.id && f.root))
      e.push("Investigation findings must be completed.");
  }
  if (!acts.length || acts.some(a => !["Completed", "Verified"].includes(a.status)))
    e.push("All required actions must be completed (at least one action is needed).");
  if (date && date < i.date) e.push("Resolution date cannot precede the incident date.");
  return e;
}

function storeResolution(d, file) {
  if (!can("resolution.record"))
    return "Only authorized personnel (Administrator, Incident Officer, Supervisor) can record a final resolution.";
  const e =
    missing(d, {
      incident: "Incident",
      type: "Resolution type",
      date: "Resolution date",
      desc: "Description"
    }) || tooLong(d);
  if (e) return e;
  const i = find(db.incidents, d.incident);
  if (!i) return "Incident not found.";
  if (!validDate(d.date)) return "Resolution date is invalid.";
  if (d.date > today()) return "Resolution date cannot be in the future.";
  if (!RESOLUTION_TYPES.includes(d.type)) return "Resolution type is not valid.";
  const problems = resolveCheck(i, d.date);
  if (problems.length) return problems.join(" ");
  const fe = file ? fileError(file) : "";
  if (fe) return fe;
  const s = setStatus(i, "Resolved");
  if (s) return s;
  db.resolutions.push({
    id: nextId(db.resolutions),
    incident: i.id,
    type: d.type,
    desc: d.desc,
    date: d.date,
    remarks: d.remarks,
    by: cur().name,
    doc: file ? file.name : "-"
  });
  log("Create", "resolutions", i.number, "-", d.type + " on " + d.date);
  return commit();
}

const RS = ["incident", "type", "date", "desc", "remarks"];

function saveResolution() {
  const d = read("rs_", RS);
  done(
    "rs_msg",
    storeResolution(d, document.getElementById("rs_file").files[0]),
    "Resolution recorded. The incident is now Resolved.",
    () => {
      write("rs_", RS.concat("file"));
      fillAll();
      showRes();
      review("rs_review", "");
    }
  );
}

function showRes() {
  drawTable(
    "rs_table",
    ["ID", "Incident", "Type", "Date", "Resolved By", "Remarks", "Document"],
    db.resolutions.map(r => ({
      cells: [
        "RES-" + String(r.id).padStart(4, "0"),
        incNo(r.incident),
        r.type,
        r.date,
        r.by,
        r.remarks || "-",
        r.doc
      ]
    }))
  );
}

function closeIncident(d) {
  if (!can("incident.close")) return "Only the Supervisor or Administrator can close an incident.";
  const e = missing(d, { incident: "Incident", date: "Closure date" }) || tooLong(d);
  if (e) return e;
  const i = find(db.incidents, d.incident);
  if (!i) return "Incident not found.";
  const r = db.resolutions.find(x => x.incident == i.id);
  if (!r) return "This incident has no resolution.";
  if (!d.confirmed) return "Please confirm the resolution first.";
  if (!validDate(d.date)) return "Closure date is invalid.";
  if (d.date < r.date) return "Closure date cannot be before the resolution date.";
  if (d.date > today()) return "Closure date cannot be in the future.";
  if (db.actions.some(a => a.incident == i.id && !["Completed", "Verified"].includes(a.status)))
    return "All required actions must be completed before closure.";
  const s = setStatus(i, "Closed");
  if (s) return s;
  db.closures.push({
    id: nextId(db.closures),
    incident: i.id,
    date: d.date,
    by: cur().name,
    remarks: d.remarks
  });
  log("Create", "closures", i.number, "-", "closed on " + d.date);
  return commit();
}

function saveClosure() {
  const d = read("cl_", ["incident", "date", "remarks"]);
  d.confirmed = document.getElementById("cl_ok").checked;
  done("cl_msg", closeIncident(d), "Incident closed.", () => {
    write("cl_", ["incident", "date", "remarks"]);
    document.getElementById("cl_ok").checked = false;
    fillAll();
    showClose();
    review("cl_review", "");
  });
}

function showClose() {
  drawTable(
    "cl_table",
    ["Incident", "Closure Date", "Closed By", "Remarks"],
    db.closures.map(c => ({ cells: [incNo(c.incident), c.date, c.by, c.remarks || "-"] }))
  );
}

// ===== Course management =====
function storeCourse(name, id) {
  if (!can("reporter.manage")) return DENIED;
  if (!name) return "Course name is required.";
  if (db.courses.some(c => c.name.toLowerCase() == name.toLowerCase() && c.id != id))
    return "Course already exists.";
  if (id) {
    const c = find(db.courses, id);
    log("Update", "courses", "-", c.name, name);
    c.name = name;
  } else {
    db.courses.push({ id: nextId(db.courses), name: name });
    log("Create", "courses", "-", "-", name);
  }
  return commit();
}

function removeCourse(id) {
  if (!can("reporter.manage")) return DENIED;
  const c = find(db.courses, id);
  if (!c) return "Course not found.";
  if (db.reporters.some(r => r.course == id))
    return "Cannot delete. This course is used by a reporter record.";
  db.courses = db.courses.filter(x => x.id != id);
  log("Delete", "courses", "-", c.name, "-");
  return commit();
}

function saveCourse() {
  done("co_msg", storeCourse(v("co_name"), v("co_id")), "Course saved.", () => {
    clearCourse();
    fillAll();
    showCourses();
  });
}

function clearCourse() {
  write("co_", ["id", "name"]);
  msg("co_msg", "", true);
}

function deleteCourse(id) {
  if (!confirm("Delete this course?")) return;
  done("co_msg", removeCourse(id), "Course deleted.", () => {
    fillAll();
    showCourses();
  });
}

function showCourses() {
  const s = v("co_search").toLowerCase();
  drawTable(
    "co_table",
    ["ID", "Course", "Reporters Enrolled", "Actions"],
    db.courses
      .filter(c => s == "" || c.name.toLowerCase().includes(s))
      .map(c => ({
        cells: [
          c.id,
          c.name,
          db.reporters.filter(r => r.course == c.id).length,
          raw(
            btn("Edit", "write('co_',['id','name'],find(db.courses," + c.id + "))") +
              btn("Delete", "deleteCourse(" + c.id + ")", true)
          )
        ]
      }))
  );
}

// Hanz mariano | BSIT3A

// Lab 1
let db = JSON.parse(localStorage.getItem("irs")) || startData();
let currentPage = "home";
//if (!db.courses) db.courses = defaultCourses();


function startData() {
  return {
    departments: [
      { id: 1, name: "IT Department" }, { id: 2, name: "Engineering" },
      { id: 3, name: "Administration" }, { id: 4, name: "Facilities" },
      { id: 5, name: "Student Affairs" }
    ],
    
    //courses: defaultCourses(),
    categories: ["Safety", "Security", "Accident", "Property Damage", "Workplace", "IT/Technical", "Environmental", "Health", "Other"]
      .map((n, i) => ({ id: i + 1, name: n, active: true })),
    types: [["Slip/Fall", 1], ["Equipment Failure", 6], ["Theft", 2], ["Unauthorized Access", 2],
      ["Fire", 1], ["Data Incident", 6], ["Vehicle Accident", 3], ["Physical Injury", 3]]
      .map((t, i) => ({ id: i + 1, name: t[0], cat: t[1], active: true })),
    locations: [
      { id: 1, building: "Main Building", room: "IT Laboratory 2", area: "Laboratory", dept: 1, floor: "2nd", desc: "", active: true },
      { id: 2, building: "Main Building", room: "Registrar Office", area: "Office", dept: 3, floor: "1st", desc: "", active: true }
    ],
    reporters: [
      { id: 1, sid: "2024-0001", name: "Juan Dela Cruz", dept: 1, position: "Lab Technician", phone: "09171234567", email: "juan@school.edu", address: "", type: "Employee", active: true }
    ],
    incidents: [], investigations: [], findings: [], evidence: [], actions: []
  };
}

function saveData() { localStorage.setItem("irs", JSON.stringify(db)); }
function v(id) { return document.getElementById(id).value.trim(); }
function setv(id, value) { document.getElementById(id).value = value; }
function nextId(list) { return list.length ? Math.max(...list.map(x => x.id)) + 1 : 1; }
function find(list, id) { return list.find(x => x.id == id); }
function nameOf(list, id) { const x = find(list, id); return x ? x.name : "-"; }
function locName(id) { const l = find(db.locations, id); return l ? l.building + " - " + l.room : "-"; }
function incNo(id) { const i = find(db.incidents, id); return i ? i.number : "-"; }
function invName(x) { return "INV-" + x.id + " (" + incNo(x.incident) + ")"; }
function active(list) { return list.filter(x => x.active); }

function msg(id, text, good) {
  const p = document.getElementById(id);
  p.textContent = text;
  p.className = good ? "ok" : "error";
}

function toast(text) {
  const t = document.getElementById("toast");
  t.textContent = text;
  t.style.display = "block";
  setTimeout(() => t.style.display = "none", 2000);
}

function fillSelect(id, list, textFn, first) {
  const s = document.getElementById(id);
  const old = s.value;
  s.innerHTML = '<option value="">' + first + "</option>";
  list.forEach(x => s.innerHTML += '<option value="' + x.id + '">' + textFn(x) + "</option>");
  s.value = old;
}

function drawTable(id, headers, rows) {
  let html = "<table><tr>";
  headers.forEach(h => html += "<th>" + h + "</th>");
  html += "</tr>";
  if (rows.length == 0) html += '<tr><td colspan="' + headers.length + '">No records found.</td></tr>';
  rows.forEach(r => html += "<tr" + (r.off ? ' class="off"' : "") + ">" + r.cells.map(c => "<td>" + c + "</td>").join("") + "</tr>");
  document.getElementById(id).innerHTML = html + "</table>";
}

function fillAll() {
  fillSelect
  ("r_dept", db.departments, x => x.name, "Select department")
  ;
  fillSelect
  ("r_fdept", db.departments, x => x.name, "All departments")
  ;
  //fillSelect("r_course", db.courses, x => x.name, "Select course");
  fillSelect
  ("t_cat", active(db.categories), x => x.name, "Select category")
  ;
  fillSelect
  ("i_reporter", active(db.reporters), x => x.name, "Select reporter")
  ;
  fillSelect
  ("i_category", active(db.categories), x => x.name, "Select category")
  ;
  fillSelect
  ("i_location", active(db.locations), x => locName(x.id), "Select location")
  ;
  fillSelect
  ("i_fcat", db.categories, x => x.name, "All categories")
  ;
  fillSelect
  ("i_floc", db.locations, x => locName(x.id), "All locations")
  ;
  fillSelect
  ("l_dept", db.departments, x => x.name, "Select department")
  ;
  fillSelect
  ("v_incident", db.incidents.filter(i => i.status == "Open"), x => x.number, "Select incident")
  ;
  fillSelect
  ("f_inv", db.investigations, invName, "Select investigation")
  ;
  fillSelect
  ("e_inv", db.investigations, invName, "Select investigation")
  ;
  fillSelect
  ("a_inv", db.investigations, invName, "Select investigation")
  ;
  fillTypes();
}

function showPage(page) {
  currentPage = page;
  document.querySelectorAll(".page").forEach(p => p.classList.remove("show"));
  document.getElementById(page).classList.add("show");
  const names = ["home", "database", "reporters", "classify", "incidents", "locations", "investigations", "findings", "evidence", "actions", "courses"]; // ADDED (Course): "courses"
  document.querySelectorAll("nav button").forEach((b, i) => b.classList.toggle("active", names[i] == page));
  fillAll();
  if (page == "home") showHome();
  if (page == "database") showDatabase();
  if (page == "reporters") showReporters();
  if (page == "classify") { showCategories(); showTypes(); }
  if (page == "incidents") showIncidents();
  if (page == "locations") { showLocations(); showMonitor(); }
  if (page == "investigations") showInvestigations();
  if (page == "findings") showFindings();
  if (page == "evidence") showEvidence();
  if (page == "actions") showActions();
  
  //if (page == "courses") showCourses();
  
}

function showHome() {
  const lists = ["reporters", "incidents", "locations", "investigations", "actions"];
  document.getElementById("stats").innerHTML = lists.map(n => "<div><b>" + db[n].length + "</b>" + n + "</div>").join("");
}

function testConnection() {
  try {
    localStorage.setItem("irs_test", "1");
    localStorage.removeItem("irs_test");
    msg("homeMsg", "Connected. " + Object.keys(db).length + " tables loaded.", true);
  } catch (e) {
    msg("homeMsg", "Storage is blocked.", false);
  }
}

// Lab 2 and Lab 3(Used AI for some codes)
function showDatabase() {
  const rows = [
    ["departments", "id (PK), name"],
    ["categories", "id (PK), name, active"],
    ["types", "id (PK), name, cat (FK categories), active"],
    ["reporters", "id (PK), sid (unique), name, dept (FK departments), position, phone, email, address, type, active"],
    ["locations", "id (PK), building, room, area, dept (FK departments), floor, desc, active"],
    ["incidents", "id (PK), number (unique), reporter (FK), category (FK), type (FK), location (FK), date, time, severity, desc, response, status"],
    ["investigations", "id (PK), incident (FK), investigator, start, target, status, assigned, done, notes"],
    ["findings", "id (PK), inv (FK), problem, findings, immediate, root, contrib, witness, rec"],
    ["evidence", "id (PK), inv (FK), file, size, by, date, desc"],
    ["actions", "id (PK), inv (FK), incident (FK), type, desc, person, target, priority, status"]
  ];
  drawTable("dictionary", ["Table", "Fields"], rows.map(r => ({ cells: [r[0], r[1]] })));
}

function testRelations() {
  let bad = 0;
  db.reporters.forEach(r => { if (!find(db.departments, r.dept)) bad++; });
  db.types.forEach(t => { if (!find(db.categories, t.cat)) bad++; });
  db.incidents.forEach(i => {
    if (!find(db.reporters, i.reporter) || !find(db.locations, i.location) || !find(db.types, i.type)) bad++;
  });
  db.investigations.forEach(x => { if (!find(db.incidents, x.incident)) bad++; });
  db.actions.forEach(a => { if (!find(db.investigations, a.inv)) bad++; });
  if (bad == 0) msg("dbMsg", "All relationships are valid.", true);
  else msg("dbMsg", bad + " broken relationship(s) found.", false);
}

function resetData() {
  if (confirm("Delete all records and restore the starting data?")) {
    db = startData();
    saveData();
    showPage("database");
    toast("Data reset.");
  }
}

// Lab 4(Used ChatGPT for some codes)
function saveReporter() {
  const id = v("r_id");
  const r = {
    sid: v("r_sid"), name: v("r_name"), dept: v("r_dept"), position: v("r_position"),
    phone: v("r_phone"), email: v("r_email"), address: v("r_address"), type: v("r_type"),
    course: v("r_course") // ADDED (Course Step 5)
  };
  //if (r.sid == "" || r.name == "" || r.dept == "" || r.phone == "" || r.type == "" || r.course == "") { 
    msg("r_msg", "ID, name, department, course, contact number and type are required.", false);
    return;
  }
  if (r.email != "" && !r.email.includes("@")) { msg("r_msg", "Email is not valid.", false); return; }
  if (db.reporters.some(x => x.sid == r.sid && x.id != id)) { msg("r_msg", "This ID already exists.", false); return; }
  if (id == "") {
    r.id = nextId(db.reporters);
    r.active = true;
    db.reporters.push(r);
  } else {
    Object.assign(find(db.reporters, id), r);
  }
  saveData();
  clearReporter();
  showReporters();
  toast("Reporter saved successfully.");
}

function clearReporter() {
 // ["r_id", "r_sid", "r_name", "r_dept", "r_position", "r_phone", "r_email", "r_address", "r_type", "r_course"].forEach(i => setv(i, "")); 
  msg("r_msg", "", true);
}

// Lab 5
function showReporters() {
  const s = v("r_search").toLowerCase();
  const list = db.reporters.filter(r =>
    (s == "" || r.name.toLowerCase().includes(s) || r.sid.toLowerCase().includes(s)) &&
    (v("r_fdept") == "" || r.dept == v("r_fdept")) &&
    (v("r_ftype") == "" || r.type == v("r_ftype")));
  //drawTable("r_table", ["ID", "Name", "Course", "Department", "Type", "Contact", "Status", "Actions"] , list.map(r => ({
    off: !r.active,
  //cells: [r.sid, r.name, nameOf(db.courses, r.course), nameOf(db.departments, r.dept), r.type, r.phone, r.active ? "Active" : "Inactive",
      '<button onclick="editReporter(' + r.id + ')">Edit</button><button class="gray" onclick="toggleReporter(' + r.id + ')">' +
      (r.active ? "Deactivate" : "Activate") + '</button><button class="gray" onclick="viewProfile(' + r.id + ')">Profile</button>']
  })));
}

function editReporter(id) {
  const r = find(db.reporters, id);
  setv("r_id", r.id); setv("r_sid", r.sid); setv("r_name", r.name); setv("r_dept", r.dept);
  setv("r_position", r.position); setv("r_phone", r.phone); setv("r_email", r.email);
  setv("r_address", r.address); setv("r_type", r.type);
 // setv("r_course", r.course); )
  window.scrollTo(0, 0);
}

function toggleReporter(id) {
  const r = find(db.reporters, id);
  r.active = !r.active;
  saveData();
  showReporters();
}

// Lab 6
function viewProfile(id) {
  const r = find(db.reporters, id);
  const mine = db.incidents.filter(i => i.reporter == id);
  let html = "<h3>Profile: " + r.name + "</h3><p>" + r.sid + " | " + nameOf(db.departments, r.dept) + " | " + r.position +
    " | " + r.type + " | " + r.phone + " | " + r.email + "</p><p>Incidents reported: " + mine.length + "</p>";
  document.getElementById("r_profile").innerHTML = html;
  const rows = mine.map(i => {
    const inv = db.investigations.find(x => x.incident == i.id);
    return { cells: [i.number, i.date, nameOf(db.categories, i.category), i.status, inv ? inv.status : "Not started",
      (i.status == "Resolved" || i.status == "Closed") ? i.status : "Unresolved"] };
  });
  const box = document.createElement("div");
  box.id = "r_profile_t";
  box.className = "scroll";
  document.getElementById("r_profile").appendChild(box);
  drawTable("r_profile_t", ["Incident", "Date", "Category", "Status", "Investigation", "Resolution"], rows);
}

// Lab 7
function saveCategory() {
  const id = v("c_id"), name = v("c_name");
  if (name == "") { msg("c_msg", "Category name is required.", false); return; }
  if (db.categories.some(c => c.name.toLowerCase() == name.toLowerCase() && c.id != id)) { msg("c_msg", "Category already exists.", false); return; }
  if (id == "") db.categories.push({ id: nextId(db.categories), name: name, active: true });
  else find(db.categories, id).name = name;
  saveData(); setv("c_id", ""); setv("c_name", ""); msg("c_msg", "", true);
  showPage("classify");
  toast("Category saved.");
}

function showCategories() {
  drawTable("c_table", ["Category", "Status", "Actions"], db.categories.map(c => ({
    off: !c.active,
    cells: [c.name, c.active ? "Active" : "Inactive",
      '<button onclick="editCategory(' + c.id + ')">Edit</button><button class="gray" onclick="toggleItem(\'categories\',' + c.id + ')">' + (c.active ? "Deactivate" : "Activate") + "</button>"]
  })));
}

function editCategory(id) { setv("c_id", id); setv("c_name", nameOf(db.categories, id)); }

function toggleItem(list, id) {
  const x = find(db[list], id);
  x.active = !x.active;
  saveData();
  showPage(currentPage);
}

function saveType() {
  const id = v("t_id"), name = v("t_name"), cat = v("t_cat");
  if (name == "" || cat == "") { msg("t_msg", "Type name and category are required.", false); return; }
  if (id == "") db.types.push({ id: nextId(db.types), name: name, cat: Number(cat), active: true });
  else { const t = find(db.types, id); t.name = name; t.cat = Number(cat); }
  saveData(); setv("t_id", ""); setv("t_name", ""); setv("t_cat", ""); msg("t_msg", "", true);
  showTypes();
  toast("Type saved.");
}

function showTypes() {
  drawTable("t_table", ["Type", "Category", "Status", "Actions"], db.types.map(t => ({
    off: !t.active,
    cells: [t.name, nameOf(db.categories, t.cat), t.active ? "Active" : "Inactive",
      '<button onclick="editType(' + t.id + ')">Edit</button><button class="gray" onclick="toggleItem(\'types\',' + t.id + ')">' + (t.active ? "Deactivate" : "Activate") + "</button>"]
  })));
}

function editType(id) {
  const t = find(db.types, id);
  setv("t_id", t.id); setv("t_name", t.name); setv("t_cat", t.cat);
}

// Lab 8 and Lab 9
function fillTypes() {
  const cat = v("i_category");
  fillSelect("i_type", active(db.types).filter(t => t.cat == cat), x => x.name, "Select type");
}

function saveIncident() {
  const d = {
    reporter: v("i_reporter"), category: v("i_category"), type: v("i_type"), location: v("i_location"),
    date: v("i_date"), time: v("i_time"), severity: v("i_severity"), desc: v("i_desc"), response: v("i_response")
  };
  if (d.reporter == "") { msg("i_msg", "Reporter is required.", false); return; }
  if (d.category == "") { msg("i_msg", "Incident category is required.", false); return; }
  if (d.type == "") { msg("i_msg", "Incident type is required.", false); return; }
  if (d.location == "") { msg("i_msg", "Location is required.", false); return; }
  if (d.date == "" || d.time == "") { msg("i_msg", "Date and time of incident are required.", false); return; }
  if (isNaN(new Date(d.date))) { msg("i_msg", "Incident date is invalid.", false); return; }
  if (d.date > new Date().toISOString().slice(0, 10)) { msg("i_msg", "Incident date cannot be in the future.", false); return; }
  if (d.severity == "") { msg("i_msg", "Severity must be selected.", false); return; }
  if (d.desc == "") { msg("i_msg", "Description cannot be empty.", false); return; }
  if (find(db.types, d.type).cat != d.category) { msg("i_msg", "Type does not belong to the category.", false); return; }
  const count = db.incidents.length + 1;
  d.id = nextId(db.incidents);
  d.number = "INC-" + new Date().getFullYear() + "-" + String(count).padStart(4, "0");
  while (db.incidents.some(i => i.number == d.number)) { d.number += "x"; }
  d.reporter = Number(d.reporter); d.category = Number(d.category); d.type = Number(d.type); d.location = Number(d.location);
  d.status = "Open";
  db.incidents.push(d);
  saveData();
  ["i_reporter", "i_category", "i_type", "i_location", "i_date", "i_time", "i_severity", "i_desc", "i_response"].forEach(i => setv(i, ""));
  msg("i_msg", "Incident " + d.number + " saved.", true);
  showIncidents();
}

// Lab 10 and Lab 12
function showIncidents() {
  const s = v("i_search").toLowerCase();
  const list = db.incidents.filter(i => {
    const text = (i.number + " " + nameOf(db.reporters, i.reporter) + " " + nameOf(db.types, i.type)).toLowerCase();
    return (s == "" || text.includes(s)) &&
      (v("i_fdate") == "" || i.date == v("i_fdate")) &&
      (v("i_fcat") == "" || i.category == v("i_fcat")) &&
      (v("i_floc") == "" || i.location == v("i_floc")) &&
      (v("i_fsev") == "" || i.severity == v("i_fsev")) &&
      (v("i_fstatus") == "" || i.status == v("i_fstatus"));
  });
  drawTable("i_table", ["Number", "Reporter", "Category", "Type", "Location", "Date", "Severity", "Status"], list.map(i => ({
    cells: [i.number, nameOf(db.reporters, i.reporter), nameOf(db.categories, i.category), nameOf(db.types, i.type),
      locName(i.location), i.date, i.severity, i.status]
  })));
}

// Lab 11
function saveLocation() {
  const id = v("l_id");
  const l = { building: v("l_building"), room: v("l_room"), area: v("l_area"), dept: v("l_dept"), floor: v("l_floor"), desc: v("l_desc") };
  if (l.building == "" || l.room == "") { msg("l_msg", "Building and room are required.", false); return; }
  if (db.locations.some(x => x.building == l.building && x.room == l.room && x.id != id)) { msg("l_msg", "Location already exists.", false); return; }
  if (id == "") { l.id = nextId(db.locations); l.active = true; db.locations.push(l); }
  else Object.assign(find(db.locations, id), l);
  saveData();
  ["l_id", "l_building", "l_room", "l_area", "l_dept", "l_floor", "l_desc"].forEach(i => setv(i, ""));
  msg("l_msg", "", true);
  showLocations();
  showMonitor();
  toast("Location saved.");
}

function showLocations() {
  const s = v("l_search").toLowerCase();
  const list = db.locations.filter(l => s == "" || (l.building + " " + l.room + " " + l.area).toLowerCase().includes(s));
  drawTable("l_table", ["Building", "Room", "Area", "Department", "Floor", "Status", "Actions"], list.map(l => ({
    off: !l.active,
    cells: [l.building, l.room, l.area, nameOf(db.departments, l.dept), l.floor, l.active ? "Active" : "Inactive",
      '<button onclick="editLocation(' + l.id + ')">Edit</button><button class="gray" onclick="toggleItem(\'locations\',' + l.id + ')">' + (l.active ? "Deactivate" : "Activate") + "</button>"]
  })));
}

function editLocation(id) {
  const l = find(db.locations, id);
  setv("l_id", l.id); setv("l_building", l.building); setv("l_room", l.room); setv("l_area", l.area);
  setv("l_dept", l.dept); setv("l_floor", l.floor); setv("l_desc", l.desc);
}

// Lab 13
function showMonitor() {
  const rows = db.locations.map(l => {
    const list = db.incidents.filter(i => i.location == l.id);
    const counts = {};
    list.forEach(i => { const n = nameOf(db.types, i.type); counts[n] = (counts[n] || 0) + 1; });
    const types = Object.keys(counts).map(n => n + " (" + counts[n] + ")").join(", ");
    const repeat = Object.keys(counts).filter(n => counts[n] > 1).join(", ");
    const open = list.filter(i => i.status != "Resolved" && i.status != "Closed").length;
    const high = list.filter(i => i.severity == "High" || i.severity == "Critical").length;
    return { cells: [locName(l.id), list.length, types || "-", high, open, list.length - open, repeat || "-"] };
  });
  drawTable("l_monitor", ["Location", "Incidents", "Types", "High/Critical", "Open", "Resolved", "Recurring"], rows);
}

// Lab 14 and Lab 15
function saveInvestigation() {
  const x = { incident: v("v_incident"), investigator: v("v_investigator"), start: v("v_start"), target: v("v_target"), notes: v("v_notes") };
  if (x.incident == "" || x.investigator == "" || x.start == "" || x.target == "") {
    msg("v_msg", "Incident, investigator, start date and target date are required.", false);
    return;
  }
  if (x.target < x.start) { msg("v_msg", "Target date cannot be before the start date.", false); return; }
  x.id = nextId(db.investigations);
  x.incident = Number(x.incident);
  x.status = "Assigned";
  x.assigned = new Date().toISOString().slice(0, 10);
  x.done = "";
  db.investigations.push(x);
  find(db.incidents, x.incident).status = "Under Investigation";
  saveData();
  ["v_incident", "v_investigator", "v_start", "v_target", "v_notes"].forEach(i => setv(i, ""));
  msg("v_msg", "", true);
  fillAll();
  showInvestigations();
  toast("Notification sent to " + x.investigator);
}

// Lab 18
const steps = ["Assigned", "In Progress", "Evidence Gathering", "Findings Prepared", "Completed"];

function showInvestigations() {
  drawTable("v_table", ["Investigation", "Investigator", "Start", "Deadline", "Status", "Completed On", "Action"], db.investigations.map(x => ({
    cells: [invName(x), x.investigator, x.start, x.target, x.status, x.done || "-",
      x.status == "Completed" ? "-" : '<button onclick="nextStep(' + x.id + ')">Next Status</button>']
  })));
}

function nextStep(id) {
  const x = find(db.investigations, id);
  x.status = steps[steps.indexOf(x.status) + 1];
  if (x.status == "Completed") x.done = new Date().toISOString().slice(0, 10);
  saveData();
  showInvestigations();
}

// Lab 16 and Lab 19
function saveFinding() {
  const f = {
    inv: v("f_inv"), problem: v("f_problem"), findings: v("f_findings"), immediate: v("f_immediate"),
    root: v("f_root"), contrib: v("f_contrib"), witness: v("f_witness"), rec: v("f_rec")
  };
  if (f.inv == "" || f.problem == "" || f.findings == "" || f.root == "" || f.rec == "") {
    msg("f_msg", "Investigation, problem, findings, root cause and recommendation are required.", false);
    return;
  }
  f.id = nextId(db.findings);
  f.inv = Number(f.inv);
  db.findings.push(f);
  saveData();
  ["f_inv", "f_problem", "f_findings", "f_immediate", "f_root", "f_contrib", "f_witness", "f_rec"].forEach(i => setv(i, ""));
  msg("f_msg", "Findings saved.", true);
  showFindings();
}

function showFindings() {
  drawTable("f_table", ["Investigation", "Problem", "Findings", "Root Cause", "Recommendation"], db.findings.map(f => ({
    cells: [invName(find(db.investigations, f.inv)), f.problem, f.findings, f.root, f.rec]
  })));
}

// Lab 17
function saveEvidence() {
  const file = document.getElementById("e_file").files[0];
  if (v("e_inv") == "" || !file || v("e_by") == "") {
    msg("e_msg", "Investigation, file and uploader are required.", false);
    return;
  }
  db.evidence.push({
    id: nextId(db.evidence), inv: Number(v("e_inv")), file: file.name, size: (file.size / 1024).toFixed(1),
    by: v("e_by"), date: new Date().toISOString().slice(0, 10), desc: v("e_desc")
  });
  saveData();
  ["e_inv", "e_file", "e_by", "e_desc"].forEach(i => setv(i, ""));
  msg("e_msg", "Evidence saved.", true);
  showEvidence();
}

function showEvidence() {
  drawTable("e_table", ["Investigation", "File", "Size (KB)", "Uploaded By", "Date", "Description"], db.evidence.map(e => ({
    cells: [invName(find(db.investigations, e.inv)), e.file, e.size, e.by, e.date, e.desc]
  })));
}

// Lab 20
function saveAction() {
  const a = { inv: v("a_inv"), type: v("a_type"), desc: v("a_desc"), person: v("a_person"), target: v("a_target"), priority: v("a_priority") };
  if (a.inv == "" || a.type == "" || a.desc == "" || a.person == "" || a.target == "" || a.priority == "") {
    msg("a_msg", "All fields are required.", false);
    return;
  }
  a.id = nextId(db.actions);
  a.inv = Number(a.inv);
  a.incident = find(db.investigations, a.inv).incident;
  a.status = "Pending";
  db.actions.push(a);
  saveData();
  ["a_inv", "a_type", "a_desc", "a_person", "a_target", "a_priority"].forEach(i => setv(i, ""));
  msg("a_msg", "Action saved.", true);
  showActions();
}

function showActions() {
  drawTable("a_table", ["Incident", "Type", "Action", "Responsible", "Target", "Priority", "Status", ""], db.actions.map(a => ({
    cells: [incNo(a.incident), a.type, a.desc, a.person, a.target, a.priority, a.status,
      a.status == "Verified" ? "-" : '<button onclick="nextAction(' + a.id + ')">Next Status</button>']
  })));
}

function nextAction(id) {
  const a = find(db.actions, id);
  const list = ["Pending", "In Progress", "Completed", "Verified"];
  a.status = list[list.indexOf(a.status) + 1];
  saveData();
  showActions();
}


function defaultCourses() {
  return ["BSIT", "BSBA", "BSED", "BSN", "BEED"].map((n, i) => ({ id: i + 1, name: n }));
}


function saveCourse() {
  const id = v("co_id"), name = v("co_name");
  if (name == "") { msg("co_msg", "Course name is required.", false); return; }
  if (db.courses.some(c => c.name.toLowerCase() == name.toLowerCase() && c.id != id)) {
    msg("co_msg", "Course already exists.", false);
    return;
  }
  if (id == "") db.courses.push({ id: nextId(db.courses), name: name });
  else find(db.courses, id).name = name;
  saveData();
  clearCourse();
  fillAll();
  showCourses();
  toast("Course saved.");
}

function clearCourse() {
  setv("co_id", "");
  setv("co_name", "");
  msg("co_msg", "", true);
}

function showCourses() {
  const s = v("co_search").toLowerCase();
  const list = db.courses.filter(c => s == "" || c.name.toLowerCase().includes(s));
  drawTable("co_table", ["ID", "Course", "Reporters Enrolled", "Actions"], list.map(c => ({
    cells: [c.id, c.name, db.reporters.filter(r => r.course == c.id).length,
      '<button onclick="editCourse(' + c.id + ')">Edit</button><button class="gray" onclick="deleteCourse(' + c.id + ')">Delete</button>']
  })));
}
//u
function editCourse(id) {
  setv("co_id", id);
  setv("co_name", nameOf(db.courses, id));
  window.scrollTo(0, 0);
}

// D
function deleteCourse(id) {
  if (db.reporters.some(r => r.course == id)) {
    msg("co_msg", "Cannot delete. This course is used by a reporter record.", false);
    return;
  }
  if (!confirm("Delete this course?")) return;
  db.courses = db.courses.filter(c => c.id != id);
  saveData();
  fillAll();
  showCourses();
  msg("co_msg", "", true);
  toast("Course deleted.");
}

showPage("home");

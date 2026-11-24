// Labs 27 to 33 and 46 to 59: workflow tests, testing, UAT, bugs, backup, deployment

// ===== Test tools =====
function sandboxed(fn) {
  const saved = [db, sandbox, actor];
  db = startData();
  sandbox = true;
  actor = db.users[0];
  try { return fn(); } finally { [db, sandbox, actor] = saved; }
}

function useRole(role) {
  const u = db.users.find(x => x.role == role && x.active);
  if (!u) throw new Error("No active " + role + " user.");
  actor = u;
  return u;
}

function runTests(list, stop) {
  let failed = false;
  return list.map(([name, fn]) => {
    if (failed) return [name, "SKIP", "Skipped because an earlier step failed."];
    let r = "";
    try { r = fn() || ""; } catch (e) { r = "Error: " + e.message; }
    const problem = typeof r == "string" ? r : "";
    if (problem && stop) failed = true;
    return [name, problem ? "FAIL" : "PASS", problem || r.note || ""];
  });
}

function showResults(title, results) {
  const pass = results.filter(r => r[1] == "PASS").length;
  const el = document.getElementById("ts_sum");
  el.textContent = title + ": " + pass + " of " + results.length + " passed.";
  el.className = pass == results.length ? "ok" : "error";
  drawTable("ts_out", ["Test", "Result", "Details"], results.map(r => ({ cells: [r[0], raw('<span class="' + (r[1] == "PASS" ? "ok" : "error") + '">' + r[1] + "</span>"), r[2]] })), 40);
}

const bad = e => e ? { note: e } : "The invalid action was accepted.";
const shows = (e, text) => e && e.includes(text) ? { note: e } : "Expected a message with '" + text + "' but got: " + (e || "no error");
const good = e => e;
const allPassed = results => results.every(r => r[1] == "PASS") ? "" : results.filter(r => r[1] != "PASS").map(r => r[0]).join("; ");

// ===== Labs 33, 51 and 63: one complete workflow =====
function flowSteps(c) {
  const ok = e => e || { note: actor.name + " (" + actor.role + ")" };
  const person = role => db.users.find(u => u.role == role && u.active);
  return [
    ["1. Register reporter (Juan Dela Cruz)", () => {
      useRole("Incident Officer");
      const e = storeReporter({ sid: "E2E-" + Date.now().toString().slice(-6), name: "Juan Dela Cruz", dept: 1, course: 1, position: "Lab Technician", phone: "09171234567", email: "juan@school.edu", address: "", type: "Employee" });
      c.reporter = last(db.reporters);
      c.reporter.demo = true;
      return ok(e);
    }],
    ["2. Report incident: computer equipment accident, Safety, High", () => {
      let t = db.types.find(x => x.name == "Equipment Accident" && x.cat == 1), l = db.locations.find(x => x.room == "IT Laboratory 2");
      if (!t || !l) {
        useRole("Incident Officer");
        if (!t) storeType({ name: "Equipment Accident", cat: 1 });
        if (!l) storeLocation({ building: "Main Building", room: "IT Laboratory 2", area: "Laboratory", dept: 1, floor: "2nd", desc: "" });
        t = db.types.find(x => x.name == "Equipment Accident" && x.cat == 1);
        l = db.locations.find(x => x.room == "IT Laboratory 2");
      }
      useRole("Reporter");
      const e = storeIncident({ reporter: c.reporter.id, category: 1, type: t.id, location: l.id, date: today(), time: "00:00", severity: "High", desc: "Computer equipment accident in the laboratory", response: "Power cut and area secured" });
      c.incident = last(db.incidents);
      c.incident.demo = true;
      return ok(e);
    }],
    ["3. Select location (IT Laboratory 2)", () => locName(c.incident.location).includes("IT Laboratory 2") ? { note: locName(c.incident.location) } : "Incident is not linked to IT Laboratory 2."],
    ["4. Assign investigator", () => {
      useRole("Supervisor");
      const e = storeInvestigation({ incident: c.incident.id, investigator: person("Investigator").name, start: today(), target: addDays(today(), 7), notes: "Find the cause" });
      c.inv = last(db.investigations);
      return ok(e);
    }],
    ["5. Conduct investigation", () => { useRole("Investigator"); return ok(advanceInvestigation(c.inv.id) || advanceInvestigation(c.inv.id)); }],
    ["6. Record evidence", () => { useRole("Investigator"); return ok(storeEvidence({ inv: c.inv.id, by: actor.name, desc: "Photo of the damaged computer" }, { name: "damaged_pc.jpg", size: 204800 })); }],
    ["7. Determine root cause and complete investigation", () => {
      useRole("Investigator");
      const e = storeFinding({ inv: c.inv.id, problem: "Computer fell from the desk", findings: "Cables were loose", immediate: "Cable was pulled", root: "No cable management", contrib: "", witness: "Lab staff", rec: "Install cable trays" });
      return ok(e || advanceInvestigation(c.inv.id) || advanceInvestigation(c.inv.id));
    }],
    ["8. Create corrective action", () => {
      useRole("Incident Officer");
      const e = storeAction({ inv: c.inv.id, type: "Equipment Repair", desc: "Install cable trays", req: "Buy and fit trays", personId: person("Action Officer").id, target: addDays(today(), 3), priority: "High" });
      c.action = last(db.actions);
      return ok(e);
    }],
    ["9. Complete corrective action", () => {
      useRole("Action Officer");
      const e = advanceAction(c.action.id, "Started") || advanceAction(c.action.id, "Done");
      if (e) return e;
      useRole("Supervisor");
      return ok(advanceAction(c.action.id, "Checked"));
    }],
    ["10. Record resolution", () => { useRole("Incident Officer"); return ok(storeResolution({ incident: c.incident.id, type: "Repair Completed", date: today(), desc: "Cable trays installed", remarks: "" })); }],
    ["11. Close incident", () => { useRole("Supervisor"); return ok(closeIncident({ incident: c.incident.id, date: today(), remarks: "Verified", confirmed: true })); }],
    ["12. Generate incident report", () => {
      const gaps = traceRows(c.incident).filter(r => !r[1]).map(r => r[0]);
      return gaps.length ? "Missing steps: " + gaps.join(", ") : { note: "Closed incidents in report: " + reportSummary()[0][2].find(r => r[0] == "Closed incidents")[1] };
    }]
  ];
}

function build(n) {
  const c = {};
  flowSteps(c).slice(0, n).forEach(([name, fn]) => { const e = fn(); if (typeof e == "string") throw new Error(name + ": " + e); });
  return c;
}

function runE2E(live) {
  const saved = actor, c = {};
  const go = () => ({ results: runTests(flowSteps(c), true), trace: c.incident ? traceRows(c.incident) : [], id: c.incident && c.incident.id });
  try { return live ? go() : sandboxed(go); } finally { actor = saved; }
}

function traceRows(i) {
  const inv = db.investigations.find(x => x.incident == i.id), f = inv && db.findings.find(x => x.inv == inv.id);
  const acts = db.actions.filter(a => a.incident == i.id), r = db.resolutions.find(x => x.incident == i.id), c = db.closures.find(x => x.incident == i.id), rep = find(db.reporters, i.reporter);
  return [["Reporter Registration", rep && rep.name], ["Incident Reporting", i.number + " (" + i.status + ")"], ["Location Identification", find(db.locations, i.location) && locName(i.location)],
    ["Investigation Assignment", inv && inv.investigator], ["Investigation", inv && inv.status], ["Findings / Root Cause", f && f.root],
    ["Corrective Action", acts.length && acts.map(a => a.type + " - " + a.status).join("; ")], ["Resolution", r && r.type + " on " + r.date], ["Closure", c && c.date + " by " + c.by]]
    .map(s => [s[0], !!s[1], s[1] || "-"]);
}

function showTrace() {
  const i = find(db.incidents, v("ts_inc"));
  drawTable("ts_trace", ["Step", "Done?", "Details"], i ? traceRows(i).map(s => ({ cells: [s[0], s[1] ? "✓" : "Missing", s[2]] })) : []);
}

function runDemo() {
  if (!can("incident.close")) return toast("Only the Supervisor or Administrator can run the demonstration.");
  if (!confirm("Add one demonstration incident that goes through the whole workflow? It is marked as a test record.")) return;
  const r = runE2E(true);
  showResults("Final demonstration (live data)", r.results);
  fillAll();
  setv("ts_inc", r.id);
  showTrace();
}

// ===== Labs 27 to 32 and 50: integration checks on the real data =====
function linkCheck(name, bad) { return [name, () => bad().length ? bad().slice(0, 3).join("; ") : { note: "No problems found" }]; }
const integrationTests = () => [
  linkCheck("Lab 27: Reporter → Incident", () => db.incidents.filter(i => !find(db.reporters, i.reporter)).map(i => i.number + ": reporter not found")),
  linkCheck("Lab 28: Incident → Location", () => db.incidents.filter(i => !find(db.locations, i.location)).map(i => i.number + ": no valid location")),
  linkCheck("Lab 29: Incident → Investigation", () => db.investigations.filter(x => { const i = find(db.incidents, x.incident); return !i || x.start < i.date; }).map(x => invName(x) + ": incident missing or investigation starts before the incident")),
  linkCheck("Lab 30: Investigation → Action", () => db.actions.filter(a => !db.findings.some(f => f.inv == a.inv && f.root)).map(a => "Action " + a.id + ": no root cause behind it")),
  linkCheck("Lab 31: Action → Resolution", () => db.resolutions.flatMap(r => resolveCheck(find(db.incidents, r.incident) || { id: 0, date: "" }).map(e => incNo(r.incident) + ": " + e))),
  linkCheck("Lab 32: Resolution → Closure", () => db.closures.flatMap(c => {
    const e = [], u = db.users.find(x => x.name == c.by);
    if (!db.resolutions.some(r => r.incident == c.incident)) e.push("closed without a resolution");
    if (!u || !["Administrator", "Supervisor"].includes(u.role)) e.push("closed by an unauthorized user");
    return e.map(m => incNo(c.incident) + ": " + m);
  }))
];

// ===== Lab 49: unit tests =====
const inc = () => ({ reporter: 1, category: 1, type: 1, location: 1, date: today(), time: "00:00", severity: "High", desc: "Test incident", response: "" });
const rep = () => ({ sid: "T-1", name: "Test Person", dept: 1, course: 1, position: "", phone: "09170000000", email: "t@x.com", address: "", type: "Student" });
const unit = (name, fn) => [name, () => sandboxed(fn)];

const unitTests = () => [
  unit("Login: correct password is accepted", () => login("admin", "Pass1234")),
  unit("Login: wrong password is rejected", () => bad(login("admin", "wrong"))),
  unit("Login: deactivated account is rejected", () => { db.users[1].active = false; return bad(login("reporter", "Pass1234")); }),
  unit("Reporter: valid reporter is saved", () => { useRole("Incident Officer"); const n = db.reporters.length; return storeReporter(rep()) || (db.reporters.length == n + 1 ? "" : "Reporter was not added."); }),
  unit("Reporter: missing fields are rejected", () => { useRole("Incident Officer"); return bad(storeReporter({ ...rep(), name: "" })); }),
  unit("Reporter: duplicate ID is rejected", () => { useRole("Incident Officer"); return bad(storeReporter({ ...rep(), sid: "2024-0001" })); }),
  unit("Reporter: invalid email is rejected", () => { useRole("Incident Officer"); return bad(storeReporter({ ...rep(), email: "nope" })); }),
  unit("Incident: valid incident gets a number", () => { useRole("Reporter"); const e = storeIncident(inc()); return e || (/^INC-\d{4}-0001$/.test(db.incidents[0].number) ? "" : "Bad number " + db.incidents[0].number); }),
  unit("Incident registration accepts today's date", () => { useRole("Reporter"); return storeIncident({ ...inc(), time: "00:00" }); }),
  unit("Incident: numbers stay unique and in sequence", () => { useRole("Reporter"); storeIncident(inc()); storeIncident(inc()); return db.incidents[1].number.endsWith("0002") ? "" : "Second number is " + db.incidents[1].number; }),
  unit("Incident: empty description is rejected", () => { useRole("Reporter"); return bad(storeIncident({ ...inc(), desc: "" })); }),
  unit("Incident: future date is rejected", () => { useRole("Reporter"); return bad(storeIncident({ ...inc(), date: addDays(today(), 2) })); }),
  unit("Incident: type must belong to the category", () => { useRole("Reporter"); return bad(storeIncident({ ...inc(), type: 3 })); }),
  unit("Location: valid location is saved", () => { useRole("Incident Officer"); return storeLocation({ building: "Annex", room: "Room 1", area: "", dept: 1, floor: "1st", desc: "" }); }),
  unit("Location: duplicate building and room is rejected", () => { useRole("Incident Officer"); return bad(storeLocation({ building: "Main Building", room: "IT Laboratory 2", area: "", dept: 1, floor: "", desc: "" })); }),
  unit("Investigation: assigned incident becomes Under Investigation", () => { const c = build(4); return c.incident.status == "Under Investigation" ? "" : "Status is " + c.incident.status; }),
  unit("Investigation: second assignment is rejected", () => { const c = build(4); useRole("Supervisor"); return bad(storeInvestigation({ incident: c.incident.id, investigator: "Investigator One", start: today(), target: today(), notes: "" })); }),
  unit("Action: needs root cause first", () => { const c = build(6); useRole("Incident Officer"); return bad(storeAction({ inv: c.inv.id, type: "Training", desc: "x", req: "x", personId: 5, target: today(), priority: "Low" })); }),
  unit("Action: past target date is rejected", () => { const c = build(7); useRole("Incident Officer"); return bad(storeAction({ inv: c.inv.id, type: "Training", desc: "x", req: "x", personId: 5, target: "2020-01-01", priority: "Low" })); }),
  unit("Resolution: blocked while actions are incomplete", () => { const c = build(8); useRole("Incident Officer"); return bad(storeResolution({ incident: c.incident.id, type: "Repair Completed", date: today(), desc: "x", remarks: "" })); }),
  unit("Resolution: accepted when all actions are done", () => { const c = build(10); return c.incident.status == "Resolved" ? "" : "Status is " + c.incident.status; }),
  unit("Reports: summary and category totals match the incidents", () => {
    build(2);
    const total = reportSummary()[0][2][0][1], cat = reportCategory()[0][2].reduce((s, r) => s + r[1], 0);
    return total == 1 && cat == 1 ? "" : "Totals are " + total + " and " + cat;
  }),
  unit("Reports: trend counts add up to the incidents", () => { build(2); const t = reportTrends(true)[0][2].reduce((s, r) => s + r[1], 0); return t == 1 ? "" : "Trend total is " + t; })
];

// ===== Labs 47 and 48: business rules and error handling =====
const ruleTests = () => [
  unit("Rule 1: an incident must have a reporter", () => { useRole("Reporter"); return bad(storeIncident({ ...inc(), reporter: "" })); }),
  unit("Rule 2: an incident must have a valid location", () => { useRole("Reporter"); return bad(storeIncident({ ...inc(), location: 99 })); }),
  unit("Rule 3: incident type must belong to the category", () => { useRole("Reporter"); return bad(storeIncident({ ...inc(), type: 6 })); }),
  unit("Rule 4: incident number must be unique", () => { useRole("Reporter"); storeIncident(inc()); return bad(storeIncident(inc(), "", db.incidents[0].number)); }),
  unit("Rule 5: only valid (open) incidents can be assigned", () => { const c = build(11); useRole("Supervisor"); return bad(storeInvestigation({ incident: c.incident.id, investigator: "Investigator One", start: today(), target: today(), notes: "" })); }),
  unit("Rule 6: findings are needed before resolution", () => { const c = build(6); useRole("Investigator"); return bad(advanceInvestigation(c.inv.id)); }),
  unit("Rule 7: actions must be completed before closure", () => { const c = build(10); c.action.status = "In Progress"; useRole("Supervisor"); return bad(closeIncident({ incident: c.incident.id, date: today(), remarks: "", confirmed: true })); }),
  unit("Rule 8: closed incidents cannot be edited by ordinary users", () => {
    const c = build(11); useRole("Incident Officer");
    const e = storeIncident({ ...inc(), desc: "Changed" }, c.incident.id);
    useRole("Administrator");
    return e && !storeIncident({ ...inc(), desc: "Changed by admin" }, c.incident.id) ? { note: e } : "Rule not enforced as expected.";
  }),
  unit("Rule 9: only authorized roles change status", () => { const c = build(10); useRole("Reporter"); return bad(closeIncident({ incident: c.incident.id, date: today(), remarks: "", confirmed: true })); }),
  unit("Rule 10: deadline cannot precede the start date", () => { const c = build(2); useRole("Supervisor"); return bad(storeInvestigation({ incident: c.incident.id, investigator: "Investigator One", start: today(), target: addDays(today(), -3), notes: "" })); })
];

const errorTests = () => [
  unit("Invalid login", () => shows(login("admin", "x"), "Wrong username or password")),
  unit("Missing incident", () => shows(closeIncident({ incident: 999, date: today(), confirmed: true }), "Incident not found")),
  unit("Duplicate incident number", () => { useRole("Reporter"); storeIncident(inc()); return shows(storeIncident(inc(), "", db.incidents[0].number), "Duplicate incident number"); }),
  unit("Invalid date", () => { useRole("Reporter"); return shows(storeIncident({ ...inc(), date: "2026-13-45" }), "invalid"); }),
  unit("Invalid file", () => { const c = build(4); useRole("Investigator"); return shows(storeEvidence({ inv: c.inv.id, by: "x", desc: "" }, { name: "virus.exe", size: 100 }), "Invalid file type"); }),
  unit("Database failure", () => { useRole("Incident Officer"); failSave = true; try { return shows(storeReporter(rep()), "Database error"); } finally { failSave = false; } }),
  unit("Unauthorized access", () => { useRole("Reporter"); return shows(storeReporter(rep()), "Access denied"); }),
  unit("Invalid status transition", () => { const c = build(2); return shows(setStatus(c.incident, "Closed"), "Invalid status change"); }),
  unit("Missing required information", () => { useRole("Incident Officer"); return shows(storeReporter({}), "Please fill in"); })
];

// ===== Lab 55: security tests =====
const securityTests = () => [
  unit("Authentication: wrong password rejected", () => bad(login("admin", "Pass12345"))),
  unit("Authentication: unknown user rejected", () => bad(login("nobody", "Pass1234"))),
  unit("Authorization: each role has only its own permissions", () => {
    const expect = [["Reporter", "incident.submit", 1], ["Reporter", "users.manage", 0], ["Reporter", "incident.close", 0], ["Reporter", "audit.view", 0],
      ["Investigator", "findings.record", 1], ["Investigator", "investigation.assign", 0], ["Investigator", "resolution.record", 0],
      ["Action Officer", "action.update", 1], ["Action Officer", "incident.submit", 0], ["Action Officer", "action.verify", 0],
      ["Supervisor", "incident.close", 1], ["Supervisor", "users.manage", 0], ["Management", "reports.view", 1], ["Management", "incident.submit", 0],
      ["Management", "action.update", 0], ["Incident Officer", "reporter.manage", 1], ["Incident Officer", "incident.close", 0], ["Administrator", "users.manage", 1]];
    const wrong = expect.filter(([r, p, yes]) => { useRole(r); return can(p) != !!yes; });
    return wrong.length ? "Wrong: " + wrong.map(w => w[0] + " " + w[1]).join(", ") : { note: expect.length + " checks" };
  }),
  unit("Password security: stored passwords are hashed", () => db.users.some(u => u.pass == "Pass1234") ? "A password is stored as plain text." : ""),
  unit("Password security: weak new password rejected", () => { useRole("Reporter"); return bad(storePassword("Pass1234", "abc123", "abc123")); }),
  unit("Password security: reset passwords are random", () => { const a = resetPassword(2)[1], b = resetPassword(2)[1]; return a != b && PASSWORD_RULE.test(a) ? "" : "Reset passwords repeat or are weak."; }),
  unit("Injection: script tags are encoded", () => {
    const div = document.createElement("div");
    div.innerHTML = cell('<img src=x onerror=alert(1)><script>alert(1)</script>');
    return div.querySelector("img,script") ? "HTML was not encoded." : "";
  }),
  unit("Injection: SQL-like text is stored as plain text", () => {
    useRole("Incident Officer");
    const e = storeReporter({ ...rep(), name: "x'; DROP TABLE incidents;--" });
    return e || (db.incidents && last(db.reporters).name.includes("DROP") ? { note: "Stored as text. The app does not use SQL." } : "Not stored as text.");
  }),
  unit("Input validation: over-long text rejected", () => { useRole("Reporter"); return bad(storeIncident({ ...inc(), desc: "x".repeat(1001) })); }),
  unit("File upload: dangerous or invalid files rejected", () => {
    const f = [["a.exe", 10], ["a.pdf.exe", 10], ["a.pdf", 0], ["a.pdf", 6 * 1048576], ["noext", 10]];
    const accepted = f.filter(([name, size]) => !fileError({ name, size }));
    return accepted.length ? "Accepted: " + accepted.map(a => a[0]).join(", ") : fileError({ name: "ok.pdf", size: 1000 }) ? "A valid PDF was rejected." : "";
  }),
  unit("Session: stored in sessionStorage with a timeout", () => {
    const now = Date.now();
    if (localStorage.getItem("irs_user")) return "Session user found in localStorage.";
    return sessionExpired(now - 16 * 60000, now) && !sessionExpired(now - 5 * 60000, now) ? { note: "Timeout " + db.settings.timeout + " minutes" } : "Timeout logic is wrong.";
  }),
  unit("Unauthorized access: no access without login", () => { actor = null; return can("incident.view") || pageAllowed("home") && pageAllowed("users") ? "Access without a user." : bad(storeIncident(inc())); }),
  unit("Unauthorized access: Reporter cannot open admin pages", () => { useRole("Reporter"); return pageAllowed("users") || pageAllowed("audit") || pageAllowed("backup") ? "Reporter can open a restricted page." : ""; })
];

// ===== Lab 56: performance tests =====
function bulk(n) {
  db.types.forEach(t => { t.active = true; });
  for (let k = 0; k < n; k++) {
    const t = db.types[k % db.types.length];
    db.incidents.push({ id: k + 1, number: "INC-2026-" + String(k + 1).padStart(5, "0"), reporter: 1, category: t.cat, type: t.id, location: 1 + k % 2,
      date: "2026-" + String(1 + k % 12).padStart(2, "0") + "-" + String(1 + k % 28).padStart(2, "0"), time: "08:00", severity: SEVERITIES[k % 4], desc: "Generated incident " + k,
      response: "", status: Object.keys(FLOW)[k % 5], reported: "2026-01-01" });
  }
}

function timed(name, limit, fn) {
  return [name, () => { const t = performance.now(); fn(); const ms = Math.round(performance.now() - t); return ms <= limit ? { note: ms + " ms (limit " + limit + " ms)" } : ms + " ms is slower than " + limit + " ms"; }];
}

function perfTests(n) {
  bulk(n);
  return [
    timed("Login response", 300, () => login("admin", "Pass1234")),
    timed("Incident search (" + n + " incidents)", 500, () => filterIncidents({ search: "generated 99", sev: "High" })),
    timed("Location search", 100, () => db.locations.filter(l => (l.building + l.room).toLowerCase().includes("lab"))),
    timed("Report generation (all reports)", 1500, () => { REPORTS.forEach(r => r[1]()); }),
    timed("Dashboard loading", 1000, () => dashboardData()),
    timed("First page of the incident table (20 of " + n + ")", 300, () => drawTable("pf_tmp", ["Number", "Status"], db.incidents.map(i => ({ cells: [i.number, i.status] })))),
    timed("Next ID for 200,000 records", 300, () => { if (nextId(Array.from({ length: 200000 }, (x, i) => ({ id: i }))) != 200000) throw new Error("Wrong ID"); })
  ];
}

// ===== Suites =====
const SUITES = {
  unit: ["Unit tests (Lab 49)", unitTests], integration: ["Integration tests on the real data (Lab 50)", integrationTests],
  rules: ["Business rules (Lab 47)", ruleTests], errors: ["Error handling (Lab 48)", errorTests], security: ["Security tests (Lab 55)", securityTests],
  performance: ["Performance tests (Lab 56)", () => perfTests(Number(v("pf_n") || 1000))]
};

function runSuite(key) {
  const [title, list] = SUITES[key];
  showResults(title, key == "performance" ? sandboxed(() => runTests(list())) : runTests(list()));
}

function runEnd() {
  const r = runE2E(false);
  showResults("End-to-end test (Lab 51)", r.results);
  drawTable("ts_trace", ["Step", "Done?", "Details"], r.trace.map(s => ({ cells: [s[0], s[1] ? "✓" : "Missing", s[2]] })));
}

function showTesting() {
  document.getElementById("ts_btns").innerHTML = Object.keys(SUITES).map(k => btn(SUITES[k][0], "runSuite('" + k + "')")).join("") +
    btn("End-to-End Test (Lab 51)", "runEnd()") + btn("Run Final Demonstration (adds a test record)", "runDemo()", true);
  showTrace();
}

// ===== Lab 52: user acceptance testing =====
const UAT = [
  ["Reporting incidents", "A Reporter fills in the incident form and saves it.", "Incident saved with a number and status Open."],
  ["Location selection", "Choose IT Laboratory 2 in the incident form.", "Location appears in the incident list and Location Monitoring."],
  ["Investigation", "Supervisor assigns an investigator, who moves the status to Completed.", "Statuses follow the order and the incident becomes For Action."],
  ["Evidence recording", "Investigator attaches a photo, then tries an .exe file.", "Photo is listed, the .exe is refused with a clear message."],
  ["Corrective action", "Create an action, then complete and verify it.", "Responsible person is notified and statuses follow the order."],
  ["Resolution", "Record the resolution after the actions are done.", "Incident becomes Resolved. Early attempts are blocked."],
  ["Reports", "Open Reports and compare the counts with the incident list.", "Counts match. The report prints cleanly."],
  ["Dashboard", "Open the Dashboard.", "KPI cards and charts match the data."]
];
const CRITERIA = ["Functionality", "Usability", "Accuracy", "Reliability", "Security"];

function showUAT() {
  const r = db.uat.results, g = db.uat.ratings;
  drawTable("uat_table", ["Scenario", "Steps", "Expected Result", "Result", "Remarks"], UAT.map((u, k) => ({
    cells: [u[0], u[1], u[2], raw('<select id="uat_r' + k + '">' + ["Not tested", "Pass", "Fail"].map(o => "<option" + (r[k] && r[k].result == o ? " selected" : "") + ">" + o + "</option>").join("") + "</select>"),
      raw('<input id="uat_n' + k + '" value="' + esc(r[k] ? r[k].remarks : "") + '">')]
  })));
  drawTable("uat_eval", ["Criteria", "Rating"], CRITERIA.map(c => ({
    cells: [c, raw('<select id="uat_c_' + c + '">' + [1, 2, 3, 4, 5].map(n => "<option" + (g[c] == n ? " selected" : "") + ">" + n + "</option>").join("") + "</select>")]
  })));
  const pass = Object.values(r).filter(x => x.result == "Pass").length, rated = Object.values(g);
  document.getElementById("uat_sum").textContent = "Passed " + pass + " of " + UAT.length + " scenarios." + (rated.length ? " Average rating: " + (rated.reduce((s, x) => s + Number(x), 0) / rated.length).toFixed(1) + " of 5." : "");
}

function saveUAT() {
  if (!can("testing.run")) return msg("uat_msg", DENIED, false);
  UAT.forEach((u, k) => { db.uat.results[k] = { result: document.getElementById("uat_r" + k).value, remarks: v("uat_n" + k), by: cur().name, date: today() }; });
  CRITERIA.forEach(c => { db.uat.ratings[c] = document.getElementById("uat_c_" + c).value; });
  log("Update", "uat", "-", "-", "UAT results saved");
  done("uat_msg", commit(), "UAT results saved.", showUAT);
}

// ===== Lab 53: bug tracking =====
function saveBug() {
  if (!can("testing.run")) return msg("b_msg", DENIED, false);
  const d = read("b_", ["module", "problem", "severity", "fix"]), id = v("b_id");
  const e = missing(d, { module: "Module", problem: "Problem", severity: "Severity" });
  if (e) return msg("b_msg", e, false);
  if (id) Object.assign(db.bugs.find(b => b.id == id), d);
  else db.bugs.push({ id: "B" + String(db.bugs.length + 1).padStart(3, "0"), ...d, status: "Open", retest: "-" });
  log(id ? "Update" : "Create", "bugs", "-", "-", d.problem.slice(0, 80));
  done("b_msg", commit(), "Bug saved.", () => { write("b_", ["id", "module", "problem", "severity", "fix"]); showBugs(); });
}

function retest(id, passed) {
  const b = db.bugs.find(x => x.id == id);
  if (!can("testing.run")) return toast(DENIED);
  if (!b.fix) return toast("Enter the corrective action first.");
  b.status = passed ? "Closed" : "Reopened";
  b.retest = (passed ? "Passed " : "Failed ") + today();
  log("Update", "bugs", "-", "-", id + " " + b.status);
  commit();
  showBugs();
}

function showBugs() {
  fillSelect("b_severity", opts(SEVERITIES), x => x.name, "Select severity");
  drawTable("b_table", ["Bug ID", "Module", "Problem", "Severity", "Corrective Action", "Status", "Retest", ""], db.bugs.map(b => ({
    cells: [b.id, b.module, b.problem, b.severity, b.fix || "-", b.status, b.retest, raw(btn("Edit", "write('b_',['id','module','problem','severity','fix'],{...db.bugs.find(x=>x.id=='" + b.id + "'),id:'" + b.id + "'})", true) +
      (b.status == "Closed" ? "" : btn("Retest Passed", "retest('" + b.id + "',true)") + btn("Retest Failed", "retest('" + b.id + "',false)", true)))]
  })));
}

// ===== Lab 54: backup and recovery =====
const counts = d => Object.keys(d).filter(k => Array.isArray(d[k])).map(k => [k, d[k].length]);

function downloadBackup() {
  if (!can("system.config")) return toast(DENIED);
  const text = JSON.stringify({ app: "IRS", created: new Date().toISOString(), data: db });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  a.download = "irs-backup-" + today() + ".json";
  a.click();
  db.settings.lastBackup = today();
  log("Backup", "system", "-", "-", "backup created");
  commit();
  toast("Backup created.");
}

function restoreFrom(text) {
  let b;
  try { b = JSON.parse(text); } catch (e) { return "The file is not a valid backup."; }
  const base = startData();
  if (!b || b.app != "IRS" || !b.data) return "This is not an Incident Reporting System backup.";
  if (Object.keys(base).some(k => Array.isArray(base[k]) && !Array.isArray(b.data[k]))) return "The backup is incomplete (a table is missing).";
  db = b.data;
  return "";
}

function restoreBackup() {
  if (!can("system.config")) return toast(DENIED);
  const file = document.getElementById("bk_file").files[0];
  if (!file) return msg("bk_msg", "Choose a backup file first.", false);
  if (!confirm("Restore this backup? All current data will be replaced.")) return;
  const before = counts(db), keep = db;
  file.text().then(text => {
    const e = restoreFrom(text);
    if (e) { db = keep; return msg("bk_msg", e, false); }
    if (!commit()) log("Restore", "system", "-", "-", "backup restored from " + file.name);
    drawTable("bk_table", ["Table", "Before", "After restore"], counts(db).map((c, k) => ({ cells: [c[0], (before.find(b => b[0] == c[0]) || [0, 0])[1], c[1]] })), 30);
    msg("bk_msg", "Backup restored. " + brokenLinks().length + " broken relationships found.", brokenLinks().length == 0);
    if (!cur()) doLogout("Backup restored. Please log in again.");
  });
}

function testRecovery() {
  const copy = JSON.parse(JSON.stringify({ app: "IRS", data: db })), saved = db;
  let e = "";
  try { e = restoreFrom(JSON.stringify(copy)); const same = JSON.stringify(db) == JSON.stringify(saved); if (!e && !same) e = "Restored data differs from the original."; } finally { db = saved; }
  drawTable("bk_table", ["Table", "Records"], counts(db).map(c => ({ cells: c })), 30);
  msg("bk_msg", e || "Recovery test passed: the backup restored all " + counts(db).reduce((s, c) => s + c[1], 0) + " records exactly.", !e);
}

function showBackup() {
  drawTable("bk_table", ["Table", "Records"], counts(db).map(c => ({ cells: c })), 30);
  msg("bk_msg", "Last backup: " + (db.settings.lastBackup || "none yet"), !!db.settings.lastBackup);
}

// ===== Labs 57 to 59: deployment =====
const isTest = x => x.demo;

function removeTests() {
  const ids = new Set(db.incidents.filter(isTest).map(i => i.id)), n = ids.size + db.reporters.filter(isTest).length;
  if (!n) return msg("dp_msg", "No test records found.", true);
  if (!confirm("Remove " + n + " test records?")) return;
  const inv = new Set(db.investigations.filter(x => ids.has(x.incident)).map(x => x.id)), acts = new Set(db.actions.filter(a => ids.has(a.incident)).map(a => a.id));
  db.incidents = db.incidents.filter(i => !ids.has(i.id));
  db.investigations = db.investigations.filter(x => !inv.has(x.id));
  db.findings = db.findings.filter(f => !inv.has(f.inv));
  db.evidence = db.evidence.filter(e => !inv.has(e.inv));
  db.actions = db.actions.filter(a => !acts.has(a.id));
  db.actionlog = db.actionlog.filter(g => !acts.has(g.action));
  db.resolutions = db.resolutions.filter(r => !ids.has(r.incident));
  db.closures = db.closures.filter(c => !ids.has(c.incident));
  db.reporters = db.reporters.filter(r => !isTest(r));
  log("Delete", "test records", "-", n + " records", "-");
  done("dp_msg", commit(), n + " test records removed.", showDeployment);
}

function saveSettings() {
  const t = Number(v("dp_timeout")), m = Number(v("dp_max"));
  if (!t || t < 1 || t > 120 || !m || m < 1 || m > 20) return msg("dp_msg", "Timeout must be 1 to 120 minutes and upload size 1 to 20 MB.", false);
  Object.assign(db.settings, { mode: v("dp_mode"), timeout: t, maxFileMB: m });
  log("Update", "settings", "-", "-", "mode=" + db.settings.mode + ", timeout=" + t + ", upload=" + m);
  done("dp_msg", commit(), "Settings saved.", showDeployment);
}

const defaultPasswordUsers = () => db.users.filter(u => u.pass == hash("Pass1234")).map(u => u.username);

function showDeployment() {
  setv("dp_mode", db.settings.mode); setv("dp_timeout", db.settings.timeout); setv("dp_max", db.settings.maxFileMB);
  const tests = db.incidents.filter(isTest).length + db.reporters.filter(isTest).length, broken = brokenLinks().length, def = defaultPasswordUsers();
  const sec = allPassed(runTests(securityTests())), mods = allPassed(runTests(unitTests()).concat(runE2E(false).results));
  const row = (name, ok, detail) => ({ cells: [name, raw('<span class="' + (ok ? "ok" : "error") + '">' + (ok ? "READY" : "TO DO") + "</span>"), detail] });
  drawTable("dp_check", ["Activity", "Status", "Details"], [
    row("1. Remove test records", !tests, tests + " test records (use Remove Test Records)"),
    row("2. Verify database", !broken, broken + " broken relationships"),
    row("3. Configure production settings", db.settings.mode == "Production", "Mode: " + db.settings.mode),
    row("4. Configure administrator account", !def.includes("admin"), def.length ? "Accounts still using the default password: " + def.join(", ") : "No default passwords"),
    row("5. Prepare database backup", !!db.settings.lastBackup, "Last backup: " + (db.settings.lastBackup || "none")),
    row("6. Review security", !sec, sec || "All security tests passed"),
    row("7. Check all modules", !mods, mods || "Unit and end-to-end tests passed"),
    row("8. Installation documentation", true, "See the How to Deploy section below and README.md")
  ]);
  drawTable("dp_info", ["Component", "Configuration"], [["Web server", "Any static web server (" + location.protocol + "//" + (location.host || "local file") + ")"], ["Database", "Browser localStorage (key: " + STORE + ")"],
    ["Application", "index.html, style.css, script.js, access.js, reports.js, quality.js"], ["Network access", location.href], ["Secure connection (HTTPS)", window.isSecureContext ? "Yes" : "No: use HTTPS in production"],
    ["Security settings", "Session timeout " + db.settings.timeout + " min, upload limit " + db.settings.maxFileMB + " MB, role-based access, audit trail"]].map(r => ({ cells: r })));
}

function postTest() {
  const tests = [
    ["Database connectivity", () => { localStorage.setItem("irs_test", "1"); localStorage.removeItem("irs_test"); return { note: Object.keys(db).length + " tables loaded" }; }],
    ["User access: every role has an active account and pages", () => { const none = ALL.filter(r => !db.users.some(u => u.role == r && u.active)); return none.length ? "No active user for: " + none.join(", ") : { note: ALL.length + " roles" }; }],
    ["File uploads are validated", () => fileError({ name: "a.exe", size: 1 }) && !fileError({ name: "a.pdf", size: 1 }) ? "" : "Upload validation is not working."],
    ["Workflow: Login → Reporter → Incident → Location → Investigation → Action → Resolution → Reports", () => allPassed(runE2E(false).results)],
    ["Reports generate", () => { REPORTS.forEach(r => r[1]()); }],
    ["Dashboard loads", () => { dashboardData(); }],
    ["Security", () => allPassed(runTests(securityTests()))],
    timed("Performance (1000 incidents)", 3000, () => sandboxed(() => { bulk(1000); REPORTS.forEach(r => r[1]()); dashboardData(); }))
  ];
  const res = runTests(tests);
  drawTable("dp_post", ["Check", "Result", "Details"], res.map(r => ({ cells: [r[0], raw('<span class="' + (r[1] == "PASS" ? "ok" : "error") + '">' + r[1] + "</span>"), r[2]] })));
  msg("dp_msg", res.filter(r => r[1] == "PASS").length + " of " + res.length + " post-deployment checks passed.", res.every(r => r[1] == "PASS"));
}

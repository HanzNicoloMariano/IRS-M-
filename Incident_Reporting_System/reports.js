// Labs 38 to 45: reports, trends, dashboard

const pct = (n, t) => (t ? Math.round((n * 100) / t) : 0) + "%";
const avg = list =>
  list.length ? (list.reduce((s, x) => s + x, 0) / list.length).toFixed(1) + " days" : "-";
const dueDate = i => addDays(i.date, RESOLVE_DAYS[i.severity] || 30);
const isDone = i => ["Resolved", "Closed"].includes(i.status);
const overdueInvestigation = x => x.status != "Completed" && today() > x.target;

function countBy(list, fn) {
  const o = {};
  list.forEach(x => {
    const k = fn(x) || "-";
    o[k] = (o[k] || 0) + 1;
  });
  return Object.entries(o).sort((a, b) => b[1] - a[1]);
}
const share = (list, fn) => countBy(list, fn).map(([k, n]) => [k, n, pct(n, list.length)]);

function facts() {
  // each incident with its category, type, location and department resolved once
  const C = byId(db.categories),
    T = byId(db.types),
    Lo = byId(db.locations),
    D = byId(db.departments);
  return db.incidents.map(i => {
    const l = Lo.get(i.location) || {};
    return {
      i: i,
      category: C.get(i.category)?.name,
      type: T.get(i.type)?.name,
      location: l.building ? l.building + " - " + l.room : "-",
      building: l.building,
      room: l.room,
      dept: D.get(l.dept)?.name
    };
  });
}

// Each report returns sections: [title, headers, rows]
function reportSummary() {
  const rows = [["Total incidents", db.incidents.length]].concat(
    Object.keys(FLOW).map(s => [s + " incidents", db.incidents.filter(i => i.status == s).length])
  );
  return [["Incident Summary", ["Report", "Count"], rows]];
}

function reportCategory() {
  const F = facts(),
    H = n => [n, "Incidents", "%"];
  return [
    ["By Category", H("Category"), share(F, f => f.category)],
    ["By Incident Type", H("Type"), share(F, f => f.type)],
    ["By Severity", H("Severity"), share(F, f => f.i.severity)],
    ["By Department (of the location)", H("Department"), share(F, f => f.dept)],
    ["By Location", H("Location"), share(F, f => f.location)]
  ];
}

function locationRisk(F) {
  const w = { Low: 1, Medium: 2, High: 3, Critical: 4 },
    map = {};
  F.forEach(f => {
    const m = (map[f.location] = map[f.location] || {
      location: f.location,
      n: 0,
      hi: 0,
      score: 0,
      list: []
    });
    m.n++;
    m.score += w[f.i.severity] || 0;
    m.list.push(f);
    if (["High", "Critical"].includes(f.i.severity)) m.hi++;
  });
  return Object.values(map);
}

function reportLocation() {
  const F = facts(),
    H = n => [n, "Incidents", "%"],
    risk = locationRisk(F);
  return [
    ["By Building", H("Building"), share(F, f => f.building)],
    ["By Room", H("Room"), share(F, f => f.room)],
    ["By Department", H("Department"), share(F, f => f.dept)],
    [
      "High-Risk Locations (any High or Critical incident)",
      ["Location", "High/Critical", "Total", "Risk Score"],
      risk
        .filter(r => r.hi)
        .sort((a, b) => b.score - a.score)
        .map(r => [r.location, r.hi, r.n, r.score])
    ],
    [
      "Recurring Incident Locations (2 or more incidents)",
      ["Location", "Incidents", "Most Common Type"],
      risk
        .filter(r => r.n >= 2)
        .sort((a, b) => b.n - a.n)
        .map(r => [r.location, r.n, countBy(r.list, f => f.type)[0][0]])
    ]
  ];
}

function reportInvestigation() {
  const inv = db.investigations,
    done = inv.filter(x => x.status == "Completed"),
    over = inv.filter(overdueInvestigation);
  const rows = [
    ["Assigned investigations", inv.length],
    ["Completed investigations", done.length],
    ["Pending investigations", inv.length - done.length],
    ["Overdue investigations", over.length],
    ["Average investigation duration", avg(done.map(x => daysBetween(x.start, x.done)))]
  ];
  const people = {};
  inv.forEach(x => {
    const p = (people[x.investigator] = people[x.investigator] || [0, 0, 0]);
    p[0]++;
    if (x.status == "Completed") p[1]++;
    if (overdueInvestigation(x)) p[2]++;
  });
  return [
    ["Investigation Report", ["Report", "Value"], rows],
    [
      "By Investigator",
      ["Investigator", "Assigned", "Completed", "Overdue"],
      Object.entries(people).map(([k, p]) => [k, p[0], p[1], p[2]])
    ],
    [
      "Overdue Investigations",
      ["Investigation", "Investigator", "Deadline", "Days Overdue"],
      over.map(x => [invName(x), x.investigator, x.target, daysBetween(x.target, today())])
    ]
  ];
}

function reportAction() {
  const A = db.actions,
    over = A.filter(isOverdue),
    people = {};
  A.forEach(a => {
    const p = (people[a.person] = people[a.person] || [0, 0, 0, 0]);
    p[0]++;
    if (["Completed", "Verified"].includes(a.status)) p[1]++;
    else p[2]++;
    if (isOverdue(a)) p[3]++;
  });
  const rows = [
    ["Total actions", A.length],
    [
      "Pending actions (not yet completed)",
      A.filter(a => !["Completed", "Verified"].includes(a.status)).length
    ],
    ["Completed actions", A.filter(a => ["Completed", "Verified"].includes(a.status)).length],
    ["Overdue actions", over.length]
  ];
  return [
    ["Corrective Action Report", ["Report", "Count"], rows],
    [
      "Actions by Responsible Person",
      ["Person", "Total", "Completed", "Pending", "Overdue"],
      Object.entries(people).map(([k, p]) => [k, p[0], p[1], p[2], p[3]])
    ],
    [
      "Overdue Actions",
      ["Incident", "Action", "Responsible", "Due Date", "Days Overdue"],
      over.map(a => [incNo(a.incident), a.type + ": " + a.desc, a.person, a.target, overdueDays(a)])
    ]
  ];
}

function reportResolution() {
  const I = db.incidents,
    res = db.resolutions.map(r => ({ r: r, i: find(I, r.incident) })).filter(x => x.i);
  const within = res.filter(x => x.r.date <= dueDate(x.i)).length,
    over = I.filter(i => !isDone(i) && today() > dueDate(i));
  const rows = [
    ["Total resolved incidents", I.filter(isDone).length],
    ["Resolution rate", pct(I.filter(isDone).length, I.length)],
    ["Average resolution time", avg(res.map(x => daysBetween(x.i.date, x.r.date)))],
    ["Incidents resolved within target", within + " of " + res.length],
    ["Overdue resolutions", over.length]
  ];
  const target = [
    "Target: Critical " +
      RESOLVE_DAYS.Critical +
      " days, High " +
      RESOLVE_DAYS.High +
      ", Medium " +
      RESOLVE_DAYS.Medium +
      ", Low " +
      RESOLVE_DAYS.Low +
      " (counted from the incident date)."
  ];
  return [
    ["Incident Resolution Report", ["Report", "Value"], rows],
    ["Resolution Targets", ["Rule"], [target]],
    [
      "Overdue Resolutions",
      ["Incident", "Severity", "Target Date", "Days Overdue"],
      over.map(i => [i.number, i.severity, dueDate(i), daysBetween(dueDate(i), today())])
    ]
  ];
}

function period(date, quarterly) {
  const [y, m] = date.split("-");
  return quarterly ? y + "-Q" + Math.ceil(m / 3) : y + "-" + m;
}

function trendMatrix(F, quarterly, keyFn) {
  const keys = countBy(F, keyFn).map(k => k[0]),
    table = {};
  F.forEach(f => {
    const p = period(f.i.date, quarterly),
      row = (table[p] = table[p] || {});
    const k = keyFn(f) || "-";
    row[k] = (row[k] || 0) + 1;
  });
  return [
    "",
    ["Period"].concat(keys),
    Object.keys(table)
      .sort()
      .map(p => [p].concat(keys.map(k => table[p][k] || 0)))
  ];
}

function reportTrends(quarterly) {
  const F = facts(),
    name = quarterly ? "Quarter" : "Month",
    per = {};
  F.forEach(f => {
    const p = (per[period(f.i.date, quarterly)] = per[period(f.i.date, quarterly)] || [0, 0]);
    p[0]++;
    if (isDone(f.i)) p[1]++;
  });
  const mk = (title, fn) => {
    const m = trendMatrix(F, quarterly, fn);
    m[0] = title;
    return m;
  };
  return [
    [
      "Number of Incidents and Resolution Rate",
      [name, "Incidents", "Resolved or Closed", "Resolution Rate"],
      Object.keys(per)
        .sort()
        .map(p => [p, per[p][0], per[p][1], pct(per[p][1], per[p][0])])
    ],
    mk("Incident Categories", f => f.category),
    mk("Incident Types", f => f.type),
    mk("Severity", f => f.i.severity),
    mk("Locations", f => f.location)
  ];
}

const REPORTS = [
  ["Incident Summary (Lab 38)", reportSummary],
  ["Category, Type, Severity, Department, Location (Lab 39)", reportCategory],
  ["Location Report (Lab 40)", reportLocation],
  ["Investigation Report (Lab 41)", reportInvestigation],
  ["Corrective Action Report (Lab 42)", reportAction],
  ["Incident Resolution Report (Lab 43)", reportResolution],
  ["Incident Trend Analysis (Lab 44)", () => reportTrends(v("rp_period") == "quarter")]
];

function showReports() {
  if (!document.getElementById("rp_which").options.length) {
    fillSelect(
      "rp_which",
      REPORTS.map((r, i) => ({ id: i, name: r[0] })),
      x => x.name,
      "Select report"
    );
    document.getElementById("rp_which").options[0].remove();
  }
  const sections = REPORTS[v("rp_which") || 0][1]();
  document.getElementById("rp_body").innerHTML = sections
    .map((s, n) => "<h3>" + esc(s[0]) + '</h3><div id="rp_' + n + '" class="scroll"></div>')
    .join("");
  sections.forEach((s, n) =>
    drawTable(
      "rp_" + n,
      s[1],
      s[2].map(r => ({ cells: r }))
    )
  );
}

// ===== Lab 45: dashboard =====
function dashboardData() {
  const F = facts(),
    I = db.incidents,
    status = s => I.filter(i => i.status == s).length;
  const pending = db.actions.filter(a => !["Completed", "Verified"].includes(a.status)).length;
  const months = {};
  F.forEach(f => {
    const p = period(f.i.date);
    months[p] = (months[p] || 0) + 1;
  });
  return {
    kpis: [
      ["Total Incidents", I.length],
      ["Open Incidents", status("Open")],
      ["Under Investigation", status("Under Investigation")],
      ["Pending Actions", pending],
      ["Resolved", status("Resolved")],
      ["Closed", status("Closed")],
      ["Overdue", db.actions.filter(isOverdue).length + db.investigations.filter(overdueInvestigation).length]
    ],
    charts: [
      ["Incidents by Category", countBy(F, f => f.category)],
      ["Incidents by Type", countBy(F, f => f.type)],
      ["Incidents by Location", countBy(F, f => f.location)],
      [
        "Incidents by Severity",
        SEVERITIES.slice()
          .reverse()
          .map(s => [s, I.filter(i => i.severity == s).length])
      ],
      [
        "Monthly Incident Trend",
        Object.keys(months)
          .sort()
          .map(m => [m, months[m]])
      ],
      ["Investigation Status", STEPS.map(s => [s, db.investigations.filter(x => x.status == s).length])],
      [
        "Resolution Status",
        [
          ["Unresolved", I.filter(i => !isDone(i)).length],
          ["Resolved", status("Resolved")],
          ["Closed", status("Closed")]
        ]
      ]
    ]
  };
}

function bars(title, data) {
  const max = Math.max(1, ...data.map(d => d[1]));
  return (
    '<div class="chart"><h3>' +
    esc(title) +
    "</h3>" +
    (data.length
      ? data
          .map(
            d =>
              '<div class="bar"><span>' +
              esc(d[0]) +
              '</span><i style="width:' +
              Math.round((d[1] * 45) / max) +
              '%"></i><b>' +
              d[1] +
              "</b></div>"
          )
          .join("")
      : "<p>No data yet.</p>") +
    "</div>"
  );
}

function showDashboard() {
  const d = dashboardData();
  document.getElementById("db_kpi").innerHTML = d.kpis
    .map(k => "<div><b>" + k[1] + "</b>" + esc(k[0]) + "</div>")
    .join("");
  document.getElementById("db_charts").innerHTML = d.charts.map(c => bars(c[0], c[1])).join("");
}

"""
Travel report calculations.

Pure Python on purpose (no Django imports): the views load rows from the database into
the small snapshot classes below, and everything else is plain maths that can be tested
without a database. All datetimes arrive already converted to local time (Asia/Manila),
so .date() and strftime() give the dates and clock times people expect.

Every report function takes (trips, ctx) and returns:
    {"title", "description", "meta": [{label, value}], "sections": [...], "notes": [...]}
where each section is {"title", "columns": [{label, format, align}], "rows": [[...]],
"totals": [...] | None, "empty": "..."}.
"""
import re
from collections import defaultdict
from dataclasses import dataclass, field
from statistics import median
from datetime import timedelta

# ----------------------------------------------------------------------
# Definitions (keep in step with the driver portal)
# ----------------------------------------------------------------------
GRACE_MINUTES = 5                      # within this many minutes of plan counts as "on time"
EARLY_DEPARTURE_WINDOW_MINUTES = 60    # same as EARLY_DEPARTURE_WINDOW in driver_views.py

STATUSES = ("Scheduled", "Departed", "Delayed", "Cancelled", "Completed")
PRE_DEPARTURE = ("Scheduled",)
CARRIED = ("checked_in", "completed")          # actually rode (or is riding)
NOT_BOOKED = ("cancelled", "no_show")          # not holding a seat (same rule as the model)

SOURCE_LABELS = {
    "reserved": "Pre-reserved",
    "walk_in": "Walk-in",
    "request": "Reservation request",
}
PASSENGER_STATUS_LABELS = {
    "reserved": "Reserved",
    "checked_in": "On board",
    "completed": "Dropped off",
    "no_show": "No-show",
    "cancelled": "Cancelled",
}
RESERVATION_STATUS_LABELS = {"pending": "Pending", "approved": "Approved", "rejected": "Rejected"}


# ----------------------------------------------------------------------
# Snapshots (what the views hand to the engine)
# ----------------------------------------------------------------------
@dataclass
class StopSnap:
    id: object
    seq: int
    name: str
    exp_arr: object = None
    exp_dep: object = None
    act_arr: object = None
    act_dep: object = None


@dataclass
class PassengerSnap:
    id: object
    name: str
    status: str
    source: object = None
    contact: object = None
    notes: object = None
    boarding_stop_id: object = None
    alighting_stop_id: object = None


@dataclass
class VehicleSnap:
    id: object
    name: str
    plate: str = ""
    capacity: object = None
    status: object = None


@dataclass
class TripSnap:
    id: object
    title: str
    status: str = "Scheduled"
    local_date: object = None
    vehicle_id: object = None
    vehicle_name: object = None
    plate: object = None
    capacity: object = None
    driver_id: object = None
    driver_name: object = None
    driver_key: object = None      # str(user): what "Declined by ..." notes contain
    accepted_at: object = None
    notes: object = None
    act_dep: object = None
    act_arr: object = None
    stops: list = field(default_factory=list)
    passengers: list = field(default_factory=list)

    @property
    def route(self):
        if not self.stops:
            return "No route"
        if len(self.stops) == 1:
            return self.stops[0].name
        return f"{self.stops[0].name} → {self.stops[-1].name}"

    @property
    def origin(self):
        return self.stops[0] if self.stops else None

    @property
    def destination(self):
        return self.stops[-1] if len(self.stops) > 1 else None

    @property
    def vehicle_label(self):
        if self.vehicle_id is None:
            return "No vehicle"
        name = self.vehicle_name or "Vehicle"
        return f"{name} ({self.plate})" if self.plate else name

    @property
    def driver_label(self):
        return self.driver_name or "Unassigned"

    @property
    def delay_lines(self):
        lines = []
        for line in (self.notes or "").splitlines():
            line = line.strip()
            if line.startswith("Delay:"):
                lines.append(line[len("Delay:"):].strip())
        return lines

    @property
    def had_delay(self):
        # A delayed trip goes back to "Departed" once it moves again, so the status alone
        # forgets it; the driver's "Delay: ..." note is the lasting record.
        return self.status == "Delayed" or bool(self.delay_lines)

    @property
    def booked(self):
        return [p for p in self.passengers if p.status not in NOT_BOOKED]

    @property
    def carried(self):
        return [p for p in self.passengers if p.status in CARRIED]

    @property
    def peak_seats(self):
        """Same rule as Transportation.occupied_seats: peak load over every segment."""
        pax = self.booked
        if not self.stops:
            return len(pax)
        seq = {s.id: s.seq for s in self.stops}
        peak = 0
        for stop in self.stops:
            count = 0
            for p in pax:
                b = seq.get(p.boarding_stop_id) if p.boarding_stop_id is not None else None
                a = seq.get(p.alighting_stop_id) if p.alighting_stop_id is not None else None
                if (b is None or b <= stop.seq) and (a is None or a > stop.seq):
                    count += 1
            peak = max(peak, count)
        return peak

    def stop_name(self, stop_id, fallback):
        if stop_id is not None:
            for s in self.stops:
                if s.id == stop_id:
                    return s.name
        return fallback


@dataclass
class ReservationSnap:
    id: object
    status: str
    trip_id: object = None
    trip_title: str = ""
    route: str = "No route"
    requester: str = ""
    guest_count: int = 0
    created_at: object = None
    created_date: object = None
    reviewed_at: object = None
    reason: object = None
    pickup: str = ""
    dropoff: str = ""


# ----------------------------------------------------------------------
# Small helpers
# ----------------------------------------------------------------------
def pct(part, whole):
    return round(part * 100.0 / whole, 1) if whole else None


def mean(values):
    return round(sum(values) / len(values), 1) if values else None


def minutes_between(later, earlier):
    return (later - earlier).total_seconds() / 60.0


def fmt_dt(dt):
    return dt.strftime("%Y-%m-%d %H:%M") if dt else ""


def fmt_date(d):
    return d.isoformat() if d else "No date"


def col(label, fmt="text", align=None):
    return {"label": label, "format": fmt, "align": align or ("left" if fmt == "text" else "right")}


def section(title, columns, rows, totals=None, empty="Nothing to show for this period."):
    return {"title": title, "columns": columns, "rows": rows, "totals": totals, "empty": empty}


def result(title, description, sections, notes=None, meta=None):
    return {
        "title": title,
        "description": description,
        "meta": meta or [],
        "sections": sections,
        "notes": notes or [],
    }


def group_by(items, key_fn):
    groups = defaultdict(list)
    for item in items:
        groups[key_fn(item)].append(item)
    return groups


def period_key(d, group):
    """(sort key, label) for a date bucket. Undated items sort last."""
    if d is None:
        return ("9999", "(No date)")
    if group == "month":
        return (d.strftime("%Y-%m"), d.strftime("%B %Y"))
    if group == "week":
        monday = d - timedelta(days=d.weekday())
        return (monday.isoformat(), f"Week of {monday.isoformat()}")
    return (d.isoformat(), d.isoformat())


def live_trips(trips):
    return [t for t in trips if t.status != "Cancelled"]


def source_counts(passengers):
    counts = {"reserved": 0, "walk_in": 0, "request": 0, None: 0}
    for p in passengers:
        key = p.source if p.source in SOURCE_LABELS else None
        counts[key] += 1
    return counts


def arrival_items(trips):
    """(trip, stop, minutes late) for every stop with both a planned and a recorded arrival."""
    out = []
    for t in live_trips(trips):
        for s in t.stops:
            if s.exp_arr and s.act_arr:
                out.append((t, s, minutes_between(s.act_arr, s.exp_arr)))
    return out


def departure_items(trips):
    """(trip, stop, minutes early) for every stop with both a planned and a recorded departure."""
    out = []
    for t in live_trips(trips):
        for s in t.stops:
            if s.exp_dep and s.act_dep:
                out.append((t, s, minutes_between(s.exp_dep, s.act_dep)))
    return out


def punctuality_row(label, deltas):
    early = sum(1 for d in deltas if d < -GRACE_MINUTES)
    late = sum(1 for d in deltas if d > GRACE_MINUTES)
    on_time = len(deltas) - early - late
    return [
        label,
        len(deltas),
        early,
        on_time,
        late,
        pct(early + on_time, len(deltas)),
        mean(deltas),
        mean([d for d in deltas if d > GRACE_MINUTES]),
    ]


PUNCTUALITY_COLUMNS = [
    "Stops measured",
    "Early",
    "On time",
    "Late",
    "On-time rate (%)",
    "Avg variance (min, + = late)",
    "Avg when late (min)",
]


def punctuality_columns(first_label):
    return [
        col(first_label),
        col(PUNCTUALITY_COLUMNS[0], "int"),
        col(PUNCTUALITY_COLUMNS[1], "int"),
        col(PUNCTUALITY_COLUMNS[2], "int"),
        col(PUNCTUALITY_COLUMNS[3], "int"),
        col(PUNCTUALITY_COLUMNS[4], "pct"),
        col(PUNCTUALITY_COLUMNS[5], "dec"),
        col(PUNCTUALITY_COLUMNS[6], "dec"),
    ]


# ======================================================================
# OPERATIONS
# ======================================================================
def r_trip_summary(trips, ctx):
    group = ctx.get("group", "month")
    counts = defaultdict(int)
    for t in trips:
        counts[t.status] += 1
    total = len(trips)
    order = list(STATUSES) + sorted(s for s in counts if s not in STATUSES)
    status_rows = [[s, counts[s], pct(counts[s], total)] for s in order if s in STATUSES or counts[s]]

    periods = {}
    for t in trips:
        key = period_key(t.local_date, group)
        row = periods.setdefault(key, [0, 0, 0])
        row[0] += 1
        row[1] += 1 if t.status == "Completed" else 0
        row[2] += 1 if t.status == "Cancelled" else 0
    period_rows = [[k[1], *v] for k, v in sorted(periods.items())]

    return result(
        "Trip Summary",
        "How many trips ran, and how they ended, in the selected period.",
        [
            section(
                "Trips by status",
                [col("Status"), col("Trips", "int"), col("Share of trips (%)", "pct")],
                status_rows,
                ["Total", total, 100.0 if total else None],
            ),
            section(
                "Trips by period",
                [col("Period"), col("Trips", "int"), col("Completed", "int"), col("Cancelled", "int")],
                period_rows,
                [
                    "Total",
                    sum(r[1] for r in period_rows),
                    sum(r[2] for r in period_rows),
                    sum(r[3] for r in period_rows),
                ],
            ),
        ],
        ["A trip's date is its first stop's planned departure."],
    )


def r_delays(trips, ctx):
    def rate_rows(key_fn):
        rows = []
        for key, group in sorted(group_by(trips, key_fn).items()):
            n = len(group)
            cancelled = sum(1 for t in group if t.status == "Cancelled")
            delayed = sum(1 for t in group if t.status != "Cancelled" and t.had_delay)
            rows.append([key, n, delayed, pct(delayed, n), cancelled, pct(cancelled, n)])
        total_n = len(trips)
        cancelled = sum(1 for t in trips if t.status == "Cancelled")
        delayed = sum(1 for t in trips if t.status != "Cancelled" and t.had_delay)
        totals = ["All", total_n, delayed, pct(delayed, total_n), cancelled, pct(cancelled, total_n)]
        return rows, totals

    def columns(first):
        return [
            col(first),
            col("Trips", "int"),
            col("Delayed", "int"),
            col("Delayed (%)", "pct"),
            col("Cancelled", "int"),
            col("Cancelled (%)", "pct"),
        ]

    log = []
    for t in sorted(trips, key=lambda x: (x.local_date is None, x.local_date or 0, str(x.id))):
        if t.status == "Cancelled":
            outcome, text = "Cancelled", (t.notes or "").replace("\n", " | ")[:200]
        elif t.had_delay:
            outcome, text = "Delayed", " | ".join(t.delay_lines)
        else:
            continue
        log.append([fmt_date(t.local_date), t.title, t.route, t.vehicle_label, t.driver_label, outcome, text])

    sections = []
    for title, first, key_fn in (
        ("By route", "Route", lambda t: t.route),
        ("By vehicle", "Vehicle", lambda t: t.vehicle_label),
        ("By driver", "Driver", lambda t: t.driver_label),
    ):
        rows, totals = rate_rows(key_fn)
        sections.append(section(title, columns(first), rows, totals))
    sections.append(
        section(
            "Delay and cancellation log",
            [col("Date"), col("Trip"), col("Route"), col("Vehicle"), col("Driver"), col("Outcome"), col("Notes")],
            log,
            None,
            "No delayed or cancelled trips in this period.",
        )
    )
    return result(
        "Delays & Cancellations",
        "How often trips are delayed or cancelled, and why.",
        sections,
        [
            "A trip counts as delayed if it is marked Delayed now or a driver ever reported a delay on it.",
            "Cancelled trips are not also counted as delayed.",
        ],
    )


def r_routes(trips, ctx):
    live = live_trips(trips)
    route_rows = []
    for route, group in sorted(group_by(trips, lambda t: t.route).items()):
        n_live = sum(1 for t in group if t.status != "Cancelled")
        carried = sum(len(t.carried) for t in group if t.status != "Cancelled")
        route_rows.append(
            [
                route,
                len(group),
                sum(1 for t in group if t.status == "Completed"),
                sum(1 for t in group if t.status == "Cancelled"),
                carried,
                mean([carried / n_live]) if n_live else None,
            ]
        )
    all_carried = sum(len(t.carried) for t in live)
    totals = [
        "All routes",
        len(trips),
        sum(1 for t in trips if t.status == "Completed"),
        sum(1 for t in trips if t.status == "Cancelled"),
        all_carried,
        mean([all_carried / len(live)]) if live else None,
    ]

    scheduled, arrived = defaultdict(int), defaultdict(int)
    for t in live:
        for s in t.stops:
            scheduled[s.name] += 1
            if s.act_arr:
                arrived[s.name] += 1
    stop_rows = [[name, scheduled[name], arrived[name]] for name in sorted(scheduled)]

    return result(
        "Route Performance",
        "Which routes run most, and which stops they visit.",
        [
            section(
                "By route",
                [
                    col("Route"),
                    col("Trips", "int"),
                    col("Completed", "int"),
                    col("Cancelled", "int"),
                    col("Passengers carried", "int"),
                    col("Avg carried per trip", "dec"),
                ],
                route_rows,
                totals,
            ),
            section(
                "Stop visits",
                [col("Stop"), col("Times scheduled", "int"), col("Arrivals recorded", "int")],
                stop_rows,
                ["All stops", sum(r[1] for r in stop_rows), sum(r[2] for r in stop_rows)],
            ),
        ],
        [
            "Carried = passengers who checked in or were dropped off. Cancelled trips are left out of carried and stop visits.",
            "A route's origin has no arrival recorded because the driver starts there.",
        ],
    )


# ======================================================================
# PUNCTUALITY
# ======================================================================
def r_punctuality(trips, ctx):
    items = arrival_items(trips)
    sections = []
    for title, first, key_fn in (
        ("By route", "Route", lambda it: it[0].route),
        ("By stop", "Stop", lambda it: it[1].name),
        ("By driver", "Driver", lambda it: it[0].driver_label),
    ):
        groups = group_by(items, key_fn)
        rows = [punctuality_row(k, [it[2] for it in g]) for k, g in sorted(groups.items())]
        totals = punctuality_row("All", [it[2] for it in items]) if items else None
        sections.append(section(title, punctuality_columns(first), rows, totals, "No recorded arrivals in this period."))
    return result(
        "On-Time Performance",
        "Planned versus recorded arrival at each stop.",
        sections,
        [
            f"On time = arrived within {GRACE_MINUTES} minutes of plan. Early = more than {GRACE_MINUTES} minutes before plan. Late = more than {GRACE_MINUTES} minutes after.",
            "On-time rate counts early and on-time arrivals together (anything that wasn't late).",
            "Only stops with both a planned and a recorded arrival are measured, so trips not run through the driver dashboard don't appear.",
        ],
    )


def r_early_departures(trips, ctx):
    items = departure_items(trips)
    window = EARLY_DEPARTURE_WINDOW_MINUTES

    driver_rows = []
    for k, g in sorted(group_by(items, lambda it: it[0].driver_label).items()):
        vals = [it[2] for it in g]
        early = sum(1 for v in vals if v > GRACE_MINUTES)
        far = sum(1 for v in vals if v > window)
        driver_rows.append([k, len(vals), early, far, pct(far, len(vals))])
    all_vals = [it[2] for it in items]
    e_all = sum(1 for v in all_vals if v > GRACE_MINUTES)
    f_all = sum(1 for v in all_vals if v > window)
    totals = ["All", len(all_vals), e_all, f_all, pct(f_all, len(all_vals))] if items else None

    log = []
    for t, s, early_by in sorted(items, key=lambda it: (it[0].local_date is None, it[0].local_date or 0, it[1].seq)):
        if early_by > window:
            log.append(
                [fmt_date(t.local_date), t.title, t.route, s.name, t.driver_label, fmt_dt(s.exp_dep), fmt_dt(s.act_dep), round(early_by, 1)]
            )

    return result(
        "Early Departures",
        f"Stops where the vehicle left well before its planned departure time.",
        [
            section(
                "By driver",
                [
                    col("Driver"),
                    col("Departures measured", "int"),
                    col(f"Left early (>{GRACE_MINUTES} min)", "int"),
                    col(f"Left >{window} min early", "int"),
                    col(f"Left >{window} min early (%)", "pct"),
                ],
                driver_rows,
                totals,
                "No recorded departures in this period.",
            ),
            section(
                f"Departures more than {window} minutes early",
                [
                    col("Date"),
                    col("Trip"),
                    col("Route"),
                    col("Stop"),
                    col("Driver"),
                    col("Planned departure"),
                    col("Actual departure"),
                    col("Minutes early", "dec"),
                ],
                log,
                None,
                f"No departures were more than {window} minutes early.",
            ),
        ],
        [f"{window} minutes is the window drivers can leave inside without a warning in the driver portal."],
    )


def r_duration(trips, ctx):
    rows_by_route = []
    all_planned, all_actual, all_diff = [], [], []
    for route, group in sorted(group_by(live_trips(trips), lambda t: t.route).items()):
        planned, actual, diff = [], [], []
        measured = 0
        for t in group:
            if not (t.act_dep and t.act_arr):
                continue
            a = minutes_between(t.act_arr, t.act_dep)
            if a < 0:
                continue  # arrival before departure: a data-entry slip, don't let it skew averages
            measured += 1
            actual.append(a)
            o, d = t.origin, t.destination
            if o and d and o.exp_dep and d.exp_arr:
                p = minutes_between(d.exp_arr, o.exp_dep)
                if p >= 0:
                    planned.append(p)
                    diff.append(a - p)
        if measured:
            rows_by_route.append([route, measured, mean(planned), mean(actual), mean(diff)])
            all_planned += planned
            all_actual += actual
            all_diff += diff
    totals = (
        ["All routes", sum(r[1] for r in rows_by_route), mean(all_planned), mean(all_actual), mean(all_diff)]
        if rows_by_route
        else None
    )
    return result(
        "Trip Duration",
        "How long trips took compared with what was planned.",
        [
            section(
                "By route",
                [
                    col("Route"),
                    col("Trips with recorded times", "int"),
                    col("Avg planned (min)", "dec"),
                    col("Avg actual (min)", "dec"),
                    col("Avg difference (min, + = slower)", "dec"),
                ],
                rows_by_route,
                totals,
                "No trips with both a recorded departure and arrival in this period.",
            )
        ],
        [
            "Planned = first stop's planned departure to last stop's planned arrival. Actual = recorded trip departure to recorded trip arrival.",
            "Only trips with recorded times are measured; the difference only uses trips that also have a full plan.",
        ],
    )


# ======================================================================
# PASSENGERS & SEATS
# ======================================================================
def r_ridership(trips, ctx):
    group = ctx.get("group", "month")
    live = live_trips(trips)

    def blank():
        return {"trips": 0, "booked": 0, "carried": 0, "reserved": 0, "walk_in": 0, "request": 0, None: 0}

    def add(acc, t):
        acc["trips"] += 1
        acc["booked"] += len(t.booked)
        acc["carried"] += len(t.carried)
        for k, v in source_counts(t.carried).items():
            acc[k] += v

    def to_row(label, a):
        return [label, a["trips"], a["booked"], a["carried"], a["reserved"], a["walk_in"], a["request"], a[None]]

    periods = {}
    for t in live:
        add(periods.setdefault(period_key(t.local_date, group), blank()), t)
    period_rows = [to_row(k[1], v) for k, v in sorted(periods.items())]
    total = blank()
    for t in live:
        add(total, t)

    def simple(key_fn, first):
        accs = {}
        for t in live:
            add(accs.setdefault(key_fn(t), blank()), t)
        rows = [[k, v["trips"], v["booked"], v["carried"]] for k, v in sorted(accs.items())]
        return section(
            f"By {first.lower()}",
            [col(first), col("Trips", "int"), col("Booked", "int"), col("Carried", "int")],
            rows,
            ["All", total["trips"], total["booked"], total["carried"]],
        )

    return result(
        "Ridership",
        "Passengers booked and carried, and how they booked.",
        [
            section(
                "By period",
                [
                    col("Period"),
                    col("Trips", "int"),
                    col("Booked", "int"),
                    col("Carried", "int"),
                    col("Pre-reserved", "int"),
                    col("Walk-in", "int"),
                    col("Reservation request", "int"),
                    col("Unknown source", "int"),
                ],
                period_rows,
                to_row("All", total),
            ),
            simple(lambda t: t.route, "Route"),
            simple(lambda t: t.vehicle_label, "Vehicle"),
        ],
        [
            "Booked = everyone holding a seat (reserved, checked in or dropped off). Carried = checked in or dropped off.",
            "The booking-type columns split Carried. Passengers added before sources were tracked show as Unknown.",
            "Cancelled trips are left out.",
        ],
    )


def r_seats(trips, ctx):
    usable = [t for t in live_trips(trips) if t.capacity]
    no_vehicle = len([t for t in live_trips(trips) if not t.capacity])

    def util(t):
        return t.peak_seats * 100.0 / t.capacity

    def summarise(label, group):
        peaks = [t.peak_seats for t in group]
        return [
            label,
            mean([t.capacity for t in group]),
            len(group),
            mean(peaks),
            max(peaks),
            mean([util(t) for t in group]),
            sum(1 for t in group if t.peak_seats >= t.capacity),
        ]

    def block(title, first, key_fn):
        rows = [summarise(k, g) for k, g in sorted(group_by(usable, key_fn).items())]
        totals = summarise("All", usable) if usable else None
        return section(
            title,
            [
                col(first),
                col("Seats", "dec"),
                col("Trips", "int"),
                col("Avg peak seats used", "dec"),
                col("Highest peak", "int"),
                col("Avg seat use (%)", "pct"),
                col("Full trips", "int"),
            ],
            rows,
            totals,
            "No trips with a vehicle in this period.",
        )

    notes = [
        "Peak seats used = the busiest stretch of the route, counting everyone holding a seat (same rule as the trip's seat count).",
        "Full trips are those whose peak reached the vehicle's capacity.",
    ]
    if no_vehicle:
        notes.append(f"{no_vehicle} trip(s) have no vehicle assigned and are not included.")
    return result(
        "Seat Utilization",
        "How full vehicles and routes get compared with their capacity.",
        [block("By vehicle", "Vehicle", lambda t: t.vehicle_label), block("By route", "Route", lambda t: t.route)],
        notes,
    )


def r_no_shows(trips, ctx):
    done = [t for t in trips if t.status == "Completed"]

    def row(label, pax):
        carried = sum(1 for p in pax if p.status in CARRIED)
        no_show = sum(1 for p in pax if p.status == "no_show")
        unmarked = sum(1 for p in pax if p.status == "reserved")
        cancelled = sum(1 for p in pax if p.status == "cancelled")
        booked = carried + no_show + unmarked
        return [label, booked, carried, no_show, unmarked, cancelled, pct(no_show, booked)]

    columns = lambda first: [
        col(first),
        col("Booked", "int"),
        col("Carried", "int"),
        col("No-shows", "int"),
        col("Never checked in (not marked)", "int"),
        col("Cancelled bookings", "int"),
        col("No-show rate (%)", "pct"),
    ]

    by_route = []
    for route, group in sorted(group_by(done, lambda t: t.route).items()):
        by_route.append(row(route, [p for t in group for p in t.passengers]))

    stop_pax = defaultdict(list)
    for t in done:
        fallback = t.origin.name if t.origin else "(unknown stop)"
        for p in t.passengers:
            stop_pax[t.stop_name(p.boarding_stop_id, fallback)].append(p)
    by_stop = [row(k, v) for k, v in sorted(stop_pax.items())]

    all_pax = [p for t in done for p in t.passengers]
    totals = row("All", all_pax) if all_pax else None
    return result(
        "No-Shows & Cancellations",
        "Who booked but didn't ride, and where it happens most.",
        [
            section("By route", columns("Route"), by_route, totals, "No completed trips in this period."),
            section("By boarding stop", columns("Boarding stop"), by_stop, totals, "No completed trips in this period."),
        ],
        [
            "Only completed trips are counted, because passengers on trips still to run haven't had the chance to show up.",
            "Booked = carried + no-shows + never checked in. No-show rate uses only passengers the driver marked as no-show.",
            "'Never checked in (not marked)' are still Reserved after the trip finished: likely no-shows nobody marked.",
        ],
    )


def r_stops(trips, ctx):
    plan_on, in_on, plan_off, done_off = (defaultdict(int) for _ in range(4))
    for t in live_trips(trips):
        origin = t.origin.name if t.origin else "(unknown stop)"
        dest = t.destination.name if t.destination else "(unknown stop)"
        for p in t.booked:
            board = t.stop_name(p.boarding_stop_id, origin)
            alight = t.stop_name(p.alighting_stop_id, dest)
            plan_on[board] += 1
            if p.status in CARRIED:
                in_on[board] += 1
            plan_off[alight] += 1
            if p.status == "completed":
                done_off[alight] += 1
    names = sorted(set(plan_on) | set(plan_off))
    rows = [[n, plan_on[n], in_on[n], plan_off[n], done_off[n]] for n in names]
    totals = ["All stops"] + [sum(r[i] for r in rows) for i in range(1, 5)]
    return result(
        "Boarding & Drop-off by Stop",
        "Which stops see the most people getting on and off.",
        [
            section(
                "By stop",
                [
                    col("Stop"),
                    col("Boardings planned", "int"),
                    col("Checked in", "int"),
                    col("Drop-offs planned", "int"),
                    col("Dropped off", "int"),
                ],
                rows,
                totals,
            )
        ],
        [
            "A passenger with no boarding stop boards at the route's origin; with no drop-off stop, at the final stop.",
            "Cancelled trips and cancelled or no-show passengers are left out.",
        ],
    )


def r_manifest(trips, ctx):
    if not trips:
        return {"title": "Trip manifest", "description": "Choose a trip to see its manifest.", "meta": [], "sections": [], "notes": []}
    t = trips[0]
    origin = t.origin.name if t.origin else "(unknown stop)"
    dest = t.destination.name if t.destination else "(unknown stop)"
    seq = {s.id: s.seq for s in t.stops}

    ordered = sorted(
        t.passengers,
        key=lambda p: (seq.get(p.boarding_stop_id, -1) if p.boarding_stop_id is not None else -1, p.name.lower()),
    )
    rows = [
        [
            i,
            p.name,
            p.contact or "",
            t.stop_name(p.boarding_stop_id, origin),
            t.stop_name(p.alighting_stop_id, dest),
            PASSENGER_STATUS_LABELS.get(p.status, p.status),
            SOURCE_LABELS.get(p.source, "Unknown"),
            p.notes or "",
        ]
        for i, p in enumerate(ordered, start=1)
    ]
    first = t.origin
    meta = [
        {"label": "Trip", "value": t.title},
        {"label": "Route", "value": t.route},
        {"label": "Planned departure", "value": fmt_dt(first.exp_dep or first.exp_arr) if first else ""},
        {"label": "Vehicle", "value": t.vehicle_label},
        {"label": "Driver", "value": t.driver_label},
        {"label": "Status", "value": t.status},
        {"label": "Seats", "value": f"{t.peak_seats} of {t.capacity} used (peak)" if t.capacity else f"{t.peak_seats} used"},
    ]
    return result(
        "Passenger Manifest",
        "Everyone booked on this trip. Print it for the vehicle.",
        [
            section(
                "Passengers",
                [
                    col("#", "int"),
                    col("Name"),
                    col("Contact"),
                    col("Pickup"),
                    col("Drop-off"),
                    col("Status"),
                    col("Booked via"),
                    col("Notes"),
                ],
                rows,
                None,
                "No passengers on this trip yet.",
            )
        ],
        meta=meta,
    )


# ======================================================================
# DRIVERS, VEHICLES, ASSIGNMENTS
# ======================================================================
DECLINE_RE = re.compile(r"^Declined by (.+?)(?::\s|$)")


def r_drivers(trips, ctx):
    declines = defaultdict(int)
    for t in ctx.get("decline_trips", []):
        for line in (t.notes or "").splitlines():
            m = DECLINE_RE.match(line.strip())
            if m:
                declines[m.group(1).strip()] += 1
    only = ctx.get("only_driver_key")
    if only is not None:
        declines = {k: v for k, v in declines.items() if k == only}

    by_key = group_by([t for t in trips if t.driver_id is not None], lambda t: t.driver_key or t.driver_label)
    labels = {k: g[0].driver_label for k, g in by_key.items()}
    for name in declines:
        by_key.setdefault(name, [])
        labels.setdefault(name, name)

    rows = []
    for key in sorted(by_key, key=lambda k: labels[k].lower()):
        g = by_key[key]
        live = live_trips(g)
        deltas = [it[2] for it in arrival_items(g)]
        on_time = sum(1 for d in deltas if d <= GRACE_MINUTES)
        rows.append(
            [
                labels[key],
                len(g),
                sum(1 for t in g if t.accepted_at is not None),
                sum(1 for t in g if t.status in PRE_DEPARTURE and t.accepted_at is None),
                sum(1 for t in g if t.status == "Completed"),
                sum(1 for t in g if t.status == "Cancelled"),
                declines.get(key, 0),
                sum(len(t.carried) for t in live),
                pct(on_time, len(deltas)),
            ]
        )
    all_deltas = [it[2] for it in arrival_items([t for g in by_key.values() for t in g])]
    totals = (
        [
            "All drivers",
            sum(r[1] for r in rows),
            sum(r[2] for r in rows),
            sum(r[3] for r in rows),
            sum(r[4] for r in rows),
            sum(r[5] for r in rows),
            sum(r[6] for r in rows),
            sum(r[7] for r in rows),
            pct(sum(1 for d in all_deltas if d <= GRACE_MINUTES), len(all_deltas)),
        ]
        if rows
        else None
    )
    return result(
        "Driver Activity",
        "What each driver was assigned, accepted, finished and carried.",
        [
            section(
                "By driver",
                [
                    col("Driver"),
                    col("Trips assigned", "int"),
                    col("Accepted", "int"),
                    col("Awaiting acceptance", "int"),
                    col("Completed", "int"),
                    col("Cancelled", "int"),
                    col("Declined", "int"),
                    col("Passengers carried", "int"),
                    col("On-time arrival rate (%)", "pct"),
                ],
                rows,
                totals,
                "No driver activity in this period.",
            )
        ],
        [
            "Declined trips go back to unassigned, so declines are counted from the 'Declined by ...' line left in the trip notes. If someone edits or clears those notes, the count drops.",
            f"On-time arrival rate = recorded arrivals no more than {GRACE_MINUTES} minutes after plan.",
            "Awaiting acceptance = assigned, still Scheduled, and not yet accepted.",
        ],
    )


def r_vehicles(trips, ctx):
    vehicles = {v.id: v for v in ctx.get("vehicles", [])}
    by_vehicle = group_by([t for t in trips if t.vehicle_id is not None], lambda t: t.vehicle_id)
    for vid, g in by_vehicle.items():  # vehicles that have trips but aren't in the active list
        if vid not in vehicles:
            vehicles[vid] = VehicleSnap(vid, g[0].vehicle_name or "Vehicle", g[0].plate or "", g[0].capacity, None)

    rows, idle = [], []
    for v in sorted(vehicles.values(), key=lambda v: (v.name or "").lower()):
        g = by_vehicle.get(v.id, [])
        live = live_trips(g)
        utils = [t.peak_seats * 100.0 / v.capacity for t in live] if v.capacity else []
        row = [
            v.name,
            v.plate,
            v.capacity,
            v.status or "",
            len(g),
            sum(1 for t in g if t.status == "Completed"),
            sum(1 for t in g if t.status == "Cancelled"),
            sum(len(t.carried) for t in live),
            mean(utils),
        ]
        if g:
            rows.append(row)
        else:
            idle.append([v.name, v.plate, v.capacity, v.status or ""])
    rows.sort(key=lambda r: -r[4])
    totals = (
        ["All vehicles", "", None, "", sum(r[4] for r in rows), sum(r[5] for r in rows), sum(r[6] for r in rows), sum(r[7] for r in rows), None]
        if rows
        else None
    )
    return result(
        "Vehicle Usage",
        "How much each vehicle was used, and which sat idle.",
        [
            section(
                "Usage per vehicle",
                [
                    col("Vehicle"),
                    col("Plate"),
                    col("Seats", "int"),
                    col("Vehicle status"),
                    col("Trips", "int"),
                    col("Completed", "int"),
                    col("Cancelled", "int"),
                    col("Passengers carried", "int"),
                    col("Avg seat use (%)", "pct"),
                ],
                rows,
                totals,
                "No vehicle was used in this period.",
            ),
            section(
                "Idle vehicles (no trips in this period)",
                [col("Vehicle"), col("Plate"), col("Seats", "int"), col("Vehicle status")],
                idle,
                None,
                "Every vehicle was used.",
            ),
        ],
        ["Avg seat use = peak seats used divided by capacity, averaged over the vehicle's trips that weren't cancelled."],
    )


def r_assignments(trips, ctx):
    open_trips = [t for t in trips if t.status not in ("Cancelled", "Completed")]
    checks = [
        ("No vehicle assigned", lambda t: t.vehicle_id is None),
        ("No driver assigned", lambda t: t.driver_id is None),
        ("Driver hasn't accepted", lambda t: t.driver_id is not None and t.status in PRE_DEPARTURE and t.accepted_at is None),
        ("No route (fewer than 2 stops)", lambda t: len(t.stops) < 2),
        ("Over capacity", lambda t: bool(t.capacity) and t.peak_seats > t.capacity),
    ]
    rows, counts = [], {name: 0 for name, _ in checks}
    for t in sorted(open_trips, key=lambda x: (x.local_date is None, x.local_date or 0, str(x.id))):
        issues = [name for name, fn in checks if fn(t)]
        for name in issues:
            counts[name] += 1
        if issues:
            rows.append([fmt_date(t.local_date), t.title, t.route, t.vehicle_label, t.driver_label, "; ".join(issues)])
    return result(
        "Assignments & Readiness",
        "Open trips that still need something before they can run.",
        [
            section(
                "Issues found",
                [col("Issue"), col("Trips", "int")],
                [[name, counts[name]] for name, _ in checks],
                ["Trips needing attention", len(rows)],
            ),
            section(
                "Trips needing attention",
                [col("Date"), col("Trip"), col("Route"), col("Vehicle"), col("Driver"), col("Issues")],
                rows,
                None,
                "Every open trip in this period is ready.",
            ),
        ],
        ["Cancelled and completed trips are left out. A trip with several issues is counted once per issue above and once below."],
    )


# ======================================================================
# RESERVATION REQUESTS  (ctx["reservations"]; period = date the request was made)
# ======================================================================
def r_reservations(trips, ctx):
    rs = ctx.get("reservations", [])
    group = ctx.get("group", "month")
    n = len(rs)
    status_rows = []
    for key in ("pending", "approved", "rejected"):
        sub = [r for r in rs if r.status == key]
        status_rows.append([RESERVATION_STATUS_LABELS[key], len(sub), sum(r.guest_count for r in sub), pct(len(sub), n)])
    totals_status = ["All requests", n, sum(r.guest_count for r in rs), 100.0 if n else None]

    periods = {}
    for r in rs:
        periods.setdefault(period_key(r.created_date, group), []).append(r)
    rows = []
    for k, g in sorted(periods.items()):
        approved = sum(1 for r in g if r.status == "approved")
        rejected = sum(1 for r in g if r.status == "rejected")
        rows.append(
            [
                k[1],
                len(g),
                sum(r.guest_count for r in g),
                sum(1 for r in g if r.status == "pending"),
                approved,
                rejected,
                pct(approved, approved + rejected),
            ]
        )
    ap = sum(1 for r in rs if r.status == "approved")
    rj = sum(1 for r in rs if r.status == "rejected")
    totals = [
        "All",
        n,
        sum(r.guest_count for r in rs),
        sum(1 for r in rs if r.status == "pending"),
        ap,
        rj,
        pct(ap, ap + rj),
    ]
    return result(
        "Reservation Requests",
        "Requests received and how they were decided.",
        [
            section(
                "By status",
                [col("Status"), col("Requests", "int"), col("Guests", "int"), col("Share (%)", "pct")],
                status_rows,
                totals_status,
            ),
            section(
                "By period",
                [
                    col("Period"),
                    col("Requests", "int"),
                    col("Guests", "int"),
                    col("Pending", "int"),
                    col("Approved", "int"),
                    col("Rejected", "int"),
                    col("Approval rate (%)", "pct"),
                ],
                rows,
                totals if rs else None,
            ),
        ],
        ["The period is the date each request was made. Approval rate = approved ÷ (approved + rejected); pending requests are not counted in it."],
    )


def r_turnaround(trips, ctx):
    rs = ctx.get("reservations", [])
    now = ctx.get("now")

    def hours(r):
        if r.created_at and r.reviewed_at:
            h = (r.reviewed_at - r.created_at).total_seconds() / 3600.0
            return h if h >= 0 else None
        return None

    reviewed = [(r, hours(r)) for r in rs if r.status in ("approved", "rejected")]
    reviewed = [(r, h) for r, h in reviewed if h is not None]

    def row(label, vals):
        return [label, len(vals), mean(vals), round(median(vals), 1) if vals else None, round(min(vals), 1) if vals else None, round(max(vals), 1) if vals else None]

    outcome_rows = []
    for key in ("approved", "rejected"):
        vals = [h for r, h in reviewed if r.status == key]
        if vals:
            outcome_rows.append(row(RESERVATION_STATUS_LABELS[key], vals))
    all_vals = [h for _, h in reviewed]

    waiting = []
    if now is not None:
        for r in rs:
            if r.status == "pending" and r.created_at:
                waiting.append([f"#{r.id}", r.trip_title, r.requester, r.guest_count, round((now - r.created_at).total_seconds() / 3600.0, 1)])
        waiting.sort(key=lambda x: -x[4])

    return result(
        "Review Turnaround",
        "How long admins take to decide a request.",
        [
            section(
                "Time to decision",
                [
                    col("Outcome"),
                    col("Requests reviewed", "int"),
                    col("Average (hours)", "dec"),
                    col("Median (hours)", "dec"),
                    col("Fastest (hours)", "dec"),
                    col("Slowest (hours)", "dec"),
                ],
                outcome_rows,
                row("All reviewed", all_vals) if all_vals else None,
                "No reviewed requests in this period.",
            ),
            section(
                "Still waiting (longest first)",
                [col("Request"), col("Trip"), col("Requested by"), col("Guests", "int"), col("Waiting (hours)", "dec")],
                waiting[:25],
                None,
                "Nothing is waiting for review.",
            ),
        ],
        ["Time is measured from when the request was made to when it was approved or rejected."],
    )


def r_rejections(trips, ctx):
    rs = [r for r in ctx.get("reservations", []) if r.status == "rejected"]
    counts, display = defaultdict(int), {}
    for r in rs:
        text = (r.reason or "").strip()
        key = " ".join(text.lower().split()) if text else ""
        counts[key] += 1
        display.setdefault(key, text or "(No reason given)")
    rows = [[display[k], v, pct(v, len(rs))] for k, v in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))]
    return result(
        "Rejection Reasons",
        "Why requests were turned down.",
        [
            section(
                "Reasons",
                [col("Reason"), col("Requests", "int"), col("Share of rejections (%)", "pct")],
                rows,
                ["All rejected requests", len(rs), 100.0 if rs else None],
                "No rejected requests in this period.",
            )
        ],
        ["Reasons that differ only in capital letters or spacing are counted together."],
    )


def r_demand(trips, ctx):
    rs = ctx.get("reservations", [])

    def route_row(label, g):
        ap = sum(1 for r in g if r.status == "approved")
        rj = sum(1 for r in g if r.status == "rejected")
        return [label, len(g), sum(r.guest_count for r in g), sum(1 for r in g if r.status == "pending"), ap, rj, pct(ap, ap + rj)]

    route_rows = [route_row(k, g) for k, g in sorted(group_by(rs, lambda r: r.route).items(), key=lambda kv: (-len(kv[1]), kv[0]))]
    pair_rows = []
    for (pickup, dropoff), g in sorted(group_by(rs, lambda r: (r.pickup, r.dropoff)).items(), key=lambda kv: (-len(kv[1]), kv[0])):
        pair_rows.append([pickup, dropoff, len(g), sum(r.guest_count for r in g)])
    return result(
        "Demand by Route",
        "Which routes and stops people ask for most.",
        [
            section(
                "By route",
                [
                    col("Route"),
                    col("Requests", "int"),
                    col("Guests", "int"),
                    col("Pending", "int"),
                    col("Approved", "int"),
                    col("Rejected", "int"),
                    col("Approval rate (%)", "pct"),
                ],
                route_rows,
                route_row("All routes", rs) if rs else None,
                "No reservation requests in this period.",
            ),
            section(
                "By pickup and drop-off",
                [col("Pickup"), col("Drop-off"), col("Requests", "int"), col("Guests", "int")],
                pair_rows,
                None,
                "No reservation requests in this period.",
            ),
        ],
        [
            "Requests the system refused up front because no seats were left are not saved, so they can't appear here.",
            "The period is the date each request was made.",
        ],
    )


# ======================================================================
# Catalog
# ======================================================================
@dataclass
class ReportSpec:
    key: str
    title: str
    group: str
    description: str
    filters: tuple
    needs: tuple
    fn: object


# filters: period, vehicle, driver, status, group (bucket size), trip (manifest only)
# needs:   trips, reservations, vehicles, declines, manifest
REPORTS = [
    ReportSpec("trip_summary", "Trip summary", "Operations", "Trips by status and by period.", ("period", "vehicle", "driver", "status", "group"), ("trips",), r_trip_summary),
    ReportSpec("delays", "Delays & cancellations", "Operations", "How often trips are delayed or cancelled, and why.", ("period", "vehicle", "driver"), ("trips",), r_delays),
    ReportSpec("routes", "Route performance", "Operations", "Trips, completions and passengers per route; stop visits.", ("period", "vehicle", "driver"), ("trips",), r_routes),
    ReportSpec("punctuality", "On-time performance", "Punctuality", "Planned versus recorded arrival at each stop.", ("period", "vehicle", "driver"), ("trips",), r_punctuality),
    ReportSpec("early_departures", "Early departures", "Punctuality", "Stops where the vehicle left well before schedule.", ("period", "vehicle", "driver"), ("trips",), r_early_departures),
    ReportSpec("duration", "Trip duration", "Punctuality", "Planned versus actual door-to-door time per route.", ("period", "vehicle", "driver"), ("trips",), r_duration),
    ReportSpec("ridership", "Ridership", "Passengers", "Passengers booked and carried, and how they booked.", ("period", "vehicle", "driver", "group"), ("trips",), r_ridership),
    ReportSpec("seats", "Seat utilization", "Passengers", "Peak and average seat use against capacity.", ("period", "vehicle", "driver"), ("trips",), r_seats),
    ReportSpec("no_shows", "No-shows & cancellations", "Passengers", "Who booked but didn't ride, and where.", ("period", "vehicle", "driver"), ("trips",), r_no_shows),
    ReportSpec("stops", "Boarding & drop-off by stop", "Passengers", "Which stops see the most people getting on and off.", ("period", "vehicle", "driver"), ("trips",), r_stops),
    ReportSpec("manifest", "Passenger manifest", "Passengers", "Printable passenger list for one trip.", ("trip",), ("manifest",), r_manifest),
    ReportSpec("drivers", "Driver activity", "Drivers & vehicles", "Assigned, accepted, declined, completed and on-time per driver.", ("period", "vehicle", "driver"), ("trips", "declines"), r_drivers),
    ReportSpec("vehicles", "Vehicle usage", "Drivers & vehicles", "Trips and passengers per vehicle; idle vehicles.", ("period", "vehicle"), ("trips", "vehicles"), r_vehicles),
    ReportSpec("assignments", "Assignments & readiness", "Drivers & vehicles", "Open trips missing a vehicle, driver, acceptance or route.", ("period", "vehicle", "driver"), ("trips",), r_assignments),
    ReportSpec("reservations", "Request pipeline", "Reservations", "Requests received, approved and rejected.", ("period", "vehicle", "driver", "group"), ("reservations",), r_reservations),
    ReportSpec("turnaround", "Review turnaround", "Reservations", "How long admins take to decide a request.", ("period", "vehicle", "driver"), ("reservations",), r_turnaround),
    ReportSpec("rejections", "Rejection reasons", "Reservations", "The most common reasons requests are rejected.", ("period", "vehicle", "driver"), ("reservations",), r_rejections),
    ReportSpec("demand", "Demand by route", "Reservations", "Which routes and stops people request most.", ("period", "vehicle", "driver"), ("reservations",), r_demand),
]
REPORTS_BY_KEY = {spec.key: spec for spec in REPORTS}


def catalog():
    return [
        {
            "key": s.key,
            "title": s.title,
            "group": s.group,
            "description": s.description,
            "filters": list(s.filters),
        }
        for s in REPORTS
    ]
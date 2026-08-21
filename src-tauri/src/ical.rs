use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};

/// One occurrence of an event, already resolved to a concrete day.
#[derive(Serialize, Clone, Debug)]
pub struct Event {
    pub summary: String,
    pub location: Option<String>,
    /// local date as YYYY-MM-DD
    pub date: String,
    /// minutes past midnight, or None for an all-day event
    #[serde(rename = "startMin")]
    pub start_min: Option<u32>,
    #[serde(rename = "endMin")]
    pub end_min: Option<u32>,
    #[serde(rename = "allDay")]
    pub all_day: bool,
    pub calendar: String,
}

/* ------------------------------------------------------------- civil dates */

/// Days since 1970-01-01 for a proleptic Gregorian date.
/// Howard Hinnant's `days_from_civil`.
pub fn days_from_civil(y: i64, m: i64, d: i64) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let mp = (m + 9) % 12;
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

/// Inverse of `days_from_civil`.
pub fn civil_from_days(z: i64) -> (i64, i64, i64) {
    let z = z + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    (if m <= 2 { y + 1 } else { y }, m, d)
}

pub fn iso(days: i64) -> String {
    let (y, m, d) = civil_from_days(days);
    format!("{y:04}-{m:02}-{d:02}")
}

/// 0 = Sunday.
fn weekday(days: i64) -> i64 {
    (days + 4).rem_euclid(7)
}

pub fn today_days() -> i64 {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    // local midnight is close enough for a day-granular agenda
    let offset = local_offset_secs();
    (secs + offset).div_euclid(86_400)
}

/// Best-effort local UTC offset, derived from the difference between the
/// system clock and what `SystemTime` reports. Windows gives it to us via
/// the TZ-aware formatting in `chrono`, which we do not depend on, so this
/// falls back to 0 and everything stays in UTC.
fn local_offset_secs() -> i64 {
    0
}

/* --------------------------------------------------------------- unfolding */

/// ICS folds long lines by starting continuations with a space or tab.
fn unfold(text: &str) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    for raw in text.split('\n') {
        let line = raw.strip_suffix('\r').unwrap_or(raw);
        if (line.starts_with(' ') || line.starts_with('\t')) && !out.is_empty() {
            let last = out.last_mut().unwrap();
            last.push_str(&line[1..]);
        } else {
            out.push(line.to_string());
        }
    }
    out
}

/// `SUMMARY;LANGUAGE=en:Team sync` -> ("SUMMARY", {"LANGUAGE": "en"}, "Team sync")
fn split_line(line: &str) -> Option<(String, Vec<(String, String)>, String)> {
    let colon = line.find(':')?;
    let (head, rest) = line.split_at(colon);
    let value = rest[1..].to_string();

    let mut parts = head.split(';');
    let name = parts.next()?.to_ascii_uppercase();
    let params = parts
        .filter_map(|p| {
            let eq = p.find('=')?;
            Some((
                p[..eq].to_ascii_uppercase(),
                p[eq + 1..].trim_matches('"').to_string(),
            ))
        })
        .collect();
    Some((name, params, value))
}

fn unescape(v: &str) -> String {
    v.replace("\\n", " ")
        .replace("\\N", " ")
        .replace("\\,", ",")
        .replace("\\;", ";")
        .replace("\\\\", "\\")
        .trim()
        .to_string()
}

/// Parses DATE (`20260821`) and DATE-TIME (`20260821T140000Z`).
/// Returns (days since epoch, minutes past midnight or None for all-day).
fn parse_when(value: &str, params: &[(String, String)]) -> Option<(i64, Option<u32>)> {
    let v = value.trim();
    let is_date = params
        .iter()
        .any(|(k, val)| k == "VALUE" && val.eq_ignore_ascii_case("DATE"));

    if v.len() < 8 {
        return None;
    }
    let y: i64 = v[0..4].parse().ok()?;
    let m: i64 = v[4..6].parse().ok()?;
    let d: i64 = v[6..8].parse().ok()?;
    let days = days_from_civil(y, m, d);

    if is_date || v.len() < 13 || !v[8..9].eq_ignore_ascii_case("T") {
        return Some((days, None));
    }
    let hh: u32 = v[9..11].parse().ok()?;
    let mm: u32 = v[11..13].parse().ok()?;
    Some((days, Some(hh * 60 + mm)))
}

/* ------------------------------------------------------------------ RRULE */

struct Rrule {
    freq: String,
    interval: i64,
    count: Option<u32>,
    until: Option<i64>,
    byday: Vec<i64>,
}

fn parse_rrule(v: &str) -> Option<Rrule> {
    let mut r = Rrule {
        freq: String::new(),
        interval: 1,
        count: None,
        until: None,
        byday: Vec::new(),
    };
    for part in v.split(';') {
        let (k, val) = part.split_once('=')?;
        match k.to_ascii_uppercase().as_str() {
            "FREQ" => r.freq = val.to_ascii_uppercase(),
            "INTERVAL" => r.interval = val.parse().unwrap_or(1).max(1),
            "COUNT" => r.count = val.parse().ok(),
            "UNTIL" => r.until = parse_when(val, &[]).map(|(d, _)| d),
            "BYDAY" => {
                r.byday = val
                    .split(',')
                    .filter_map(|d| {
                        // strip any ordinal prefix such as "2TU"
                        let code = d.trim_start_matches(|c: char| c == '-' || c == '+' || c.is_ascii_digit());
                        Some(match code.to_ascii_uppercase().as_str() {
                            "SU" => 0,
                            "MO" => 1,
                            "TU" => 2,
                            "WE" => 3,
                            "TH" => 4,
                            "FR" => 5,
                            "SA" => 6,
                            _ => return None,
                        })
                    })
                    .collect();
            }
            _ => {}
        }
    }
    if r.freq.is_empty() {
        None
    } else {
        Some(r)
    }
}

/// Expands a rule across [from, to], capped so a malformed rule cannot spin.
fn expand(start: i64, rule: &Rrule, from: i64, to: i64) -> Vec<i64> {
    let mut out = Vec::new();
    let mut emitted = 0u32;

    match rule.freq.as_str() {
        "DAILY" | "WEEKLY" => {
            let step = if rule.freq == "WEEKLY" { 7 } else { 1 } * rule.interval;
            // weekly rules with BYDAY repeat on each named day of the week
            if rule.freq == "WEEKLY" && !rule.byday.is_empty() {
                let week0 = start - weekday(start);
                let mut w = week0;
                while w <= to {
                    for &wd in &rule.byday {
                        let day = w + wd;
                        if day < start {
                            continue;
                        }
                        if let Some(u) = rule.until {
                            if day > u {
                                continue;
                            }
                        }
                        if day >= from && day <= to {
                            out.push(day);
                        }
                        emitted += 1;
                        if rule.count.is_some_and(|c| emitted >= c) {
                            return out;
                        }
                    }
                    w += 7 * rule.interval;
                }
                return out;
            }

            let mut day = start;
            while day <= to {
                if let Some(u) = rule.until {
                    if day > u {
                        break;
                    }
                }
                if day >= from {
                    out.push(day);
                }
                emitted += 1;
                if rule.count.is_some_and(|c| emitted >= c) {
                    break;
                }
                day += step;
            }
        }
        "MONTHLY" | "YEARLY" => {
            let (sy, sm, sd) = civil_from_days(start);
            let mut i = 0i64;
            loop {
                let (y, m) = if rule.freq == "MONTHLY" {
                    let total = sm - 1 + i * rule.interval;
                    (sy + total.div_euclid(12), total.rem_euclid(12) + 1)
                } else {
                    (sy + i * rule.interval, sm)
                };
                let day = days_from_civil(y, m, sd);
                if day > to || i > 400 {
                    break;
                }
                if let Some(u) = rule.until {
                    if day > u {
                        break;
                    }
                }
                if day >= from {
                    out.push(day);
                }
                emitted += 1;
                if rule.count.is_some_and(|c| emitted >= c) {
                    break;
                }
                i += 1;
            }
        }
        _ => {
            if start >= from && start <= to {
                out.push(start);
            }
        }
    }
    out
}

/* ------------------------------------------------------------------ parse */

/// Reads one calendar's worth of ICS text and returns every occurrence that
/// falls inside [from, to] (both days since epoch).
pub fn parse_ics(text: &str, calendar: &str, from: i64, to: i64) -> Vec<Event> {
    let mut events = Vec::new();
    let mut in_event = false;

    let mut summary = String::new();
    let mut location: Option<String> = None;
    let mut start: Option<(i64, Option<u32>)> = None;
    let mut end: Option<(i64, Option<u32>)> = None;
    let mut rrule: Option<Rrule> = None;

    for line in unfold(text) {
        let upper = line.trim().to_ascii_uppercase();
        if upper == "BEGIN:VEVENT" {
            in_event = true;
            summary.clear();
            location = None;
            start = None;
            end = None;
            rrule = None;
            continue;
        }
        if upper == "END:VEVENT" {
            in_event = false;
            if let Some((sday, smin)) = start {
                let all_day = smin.is_none();
                let emin = end.and_then(|(_, m)| m);

                let days = match &rrule {
                    Some(r) => expand(sday, r, from, to),
                    None => {
                        if sday >= from && sday <= to {
                            vec![sday]
                        } else {
                            vec![]
                        }
                    }
                };

                for d in days {
                    events.push(Event {
                        summary: if summary.is_empty() {
                            "(untitled)".into()
                        } else {
                            summary.clone()
                        },
                        location: location.clone(),
                        date: iso(d),
                        start_min: smin,
                        end_min: emin,
                        all_day,
                        calendar: calendar.to_string(),
                    });
                }
            }
            continue;
        }
        if !in_event {
            continue;
        }

        let Some((name, params, value)) = split_line(&line) else {
            continue;
        };
        match name.as_str() {
            "SUMMARY" => summary = unescape(&value),
            "LOCATION" => {
                let l = unescape(&value);
                location = if l.is_empty() { None } else { Some(l) };
            }
            "DTSTART" => start = parse_when(&value, &params),
            "DTEND" => end = parse_when(&value, &params),
            "RRULE" => rrule = parse_rrule(&value),
            _ => {}
        }
    }

    events
}

/// Read a set of .ics files and merge their occurrences, sorted by day then
/// start time. Unreadable files are skipped rather than failing the lot.
#[tauri::command]
pub fn calendar_events(paths: Vec<String>, days: u32) -> Result<Vec<Event>, String> {
    let from = today_days();
    let to = from + days.clamp(1, 400) as i64;

    let mut all = Vec::new();
    for path in paths {
        let name = std::path::Path::new(&path)
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| "calendar".into());
        if let Ok(text) = std::fs::read_to_string(&path) {
            all.extend(parse_ics(&text, &name, from, to));
        }
    }

    all.sort_by(|a, b| {
        a.date
            .cmp(&b.date)
            .then(a.start_min.unwrap_or(0).cmp(&b.start_min.unwrap_or(0)))
    });
    all.truncate(200);
    Ok(all)
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE: &str = concat!(
        "BEGIN:VCALENDAR\r\n",
        "BEGIN:VEVENT\r\n",
        "SUMMARY:Design review\r\n",
        "DTSTART:20260821T093000Z\r\n",
        "DTEND:20260821T103000Z\r\n",
        "LOCATION:Studio\r\n",
        "END:VEVENT\r\n",
        "BEGIN:VEVENT\r\n",
        "SUMMARY;LANGUAGE=en:All day offsite\r\n",
        "DTSTART;VALUE=DATE:20260822\r\n",
        "END:VEVENT\r\n",
        "BEGIN:VEVENT\r\n",
        "SUMMARY:Standup\r\n",
        "DTSTART:20260821T090000Z\r\n",
        "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=6\r\n",
        "END:VEVENT\r\n",
        "END:VCALENDAR\r\n",
    );

    fn day(y: i64, m: i64, d: i64) -> i64 {
        days_from_civil(y, m, d)
    }

    #[test]
    fn civil_dates_round_trip() {
        for d in [day(1970, 1, 1), day(2026, 8, 21), day(2000, 2, 29)] {
            let (y, m, dd) = civil_from_days(d);
            assert_eq!(days_from_civil(y, m, dd), d);
        }
        assert_eq!(iso(day(2026, 8, 21)), "2026-08-21");
    }

    #[test]
    fn parses_timed_and_all_day_events() {
        let from = day(2026, 8, 20);
        let to = day(2026, 8, 25);
        let evs = parse_ics(SAMPLE, "test", from, to);

        let review = evs.iter().find(|e| e.summary == "Design review").expect("review");
        assert_eq!(review.date, "2026-08-21");
        assert_eq!(review.start_min, Some(9 * 60 + 30));
        assert_eq!(review.end_min, Some(10 * 60 + 30));
        assert!(!review.all_day);
        assert_eq!(review.location.as_deref(), Some("Studio"));

        let offsite = evs.iter().find(|e| e.summary == "All day offsite").expect("offsite");
        assert!(offsite.all_day, "VALUE=DATE means all day");
        assert_eq!(offsite.date, "2026-08-22");
    }

    #[test]
    fn expands_a_weekly_rule_onto_its_named_days() {
        let from = day(2026, 8, 20);
        let to = day(2026, 8, 31);
        let evs = parse_ics(SAMPLE, "test", from, to);
        let mut days: Vec<&str> = evs
            .iter()
            .filter(|e| e.summary == "Standup")
            .map(|e| e.date.as_str())
            .collect();
        days.sort();
        // 21 Aug 2026 is a Friday; MO/WE/FR from then, capped by COUNT=6
        assert_eq!(days, vec!["2026-08-21", "2026-08-24", "2026-08-26", "2026-08-28", "2026-08-31"]);
    }

    #[test]
    fn folded_lines_are_rejoined() {
        let ics = concat!(
            "BEGIN:VEVENT\r\n",
            "SUMMARY:A very long title that\r\n",
            "  continues here\r\n",
            "DTSTART;VALUE=DATE:20260821\r\n",
            "END:VEVENT\r\n",
        );
        let evs = parse_ics(ics, "t", day(2026, 8, 1), day(2026, 9, 1));
        assert_eq!(evs.len(), 1);
        assert_eq!(evs[0].summary, "A very long title that continues here");
    }

    #[test]
    fn reads_real_files_and_sorts_the_result() {
        let dir = std::env::temp_dir().join("widgeto-ics-test");
        std::fs::create_dir_all(&dir).unwrap();

        // two calendars, deliberately out of order, both starting today
        let today = iso(today_days());
        let compact = today.replace('-', "");
        let a = dir.join("Personal.ics");
        let b = dir.join("Work.ics");
        std::fs::write(
            &a,
            format!("BEGIN:VEVENT\r\nSUMMARY:Late thing\r\nDTSTART:{compact}T180000Z\r\nEND:VEVENT\r\n"),
        )
        .unwrap();
        std::fs::write(
            &b,
            format!("BEGIN:VEVENT\r\nSUMMARY:Early thing\r\nDTSTART:{compact}T080000Z\r\nEND:VEVENT\r\n"),
        )
        .unwrap();

        let evs = calendar_events(
            vec![
                a.to_string_lossy().to_string(),
                b.to_string_lossy().to_string(),
                dir.join("missing.ics").to_string_lossy().to_string(),
            ],
            7,
        )
        .expect("events");

        for e in &evs {
            println!("  {} {:?} {} [{}]", e.date, e.start_min, e.summary, e.calendar);
        }

        assert_eq!(evs.len(), 2, "a missing file is skipped, not fatal");
        assert_eq!(evs[0].summary, "Early thing", "sorted by time within a day");
        assert_eq!(evs[1].summary, "Late thing");
        assert_eq!(evs[0].calendar, "Work", "calendar name comes from the file stem");
        assert_eq!(evs[0].date, today);

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn events_outside_the_window_are_dropped() {
        let evs = parse_ics(SAMPLE, "test", day(2027, 1, 1), day(2027, 2, 1));
        assert!(evs.is_empty());
    }
}

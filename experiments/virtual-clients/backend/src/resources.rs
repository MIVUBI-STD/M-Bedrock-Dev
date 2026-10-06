use serde::Serialize;
use sysinfo::System;

pub const VIRTUAL_MEMORY_LIMIT_MB: u64 = 4096;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PressureLevel {
    Normal,
    Pressure,
    Critical,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HostPressure {
    pub total_memory_mb: u64,
    pub available_memory_mb: u64,
    pub available_percent: u8,
    pub level: PressureLevel,
    pub can_start_virtual: bool,
}

pub fn evaluate_pressure(total_memory_mb: u64, available_memory_mb: u64) -> HostPressure {
    let available_percent = if total_memory_mb == 0 {
        0
    } else {
        ((available_memory_mb.saturating_mul(100)) / total_memory_mb).min(100) as u8
    };

    let level = if available_percent < 15 {
        PressureLevel::Critical
    } else if available_percent < 25 {
        PressureLevel::Pressure
    } else {
        PressureLevel::Normal
    };

    HostPressure {
        total_memory_mb,
        available_memory_mb,
        available_percent,
        level,
        can_start_virtual: level != PressureLevel::Critical && available_memory_mb >= 2048,
    }
}

#[cfg(test)]
mod tests {
    use super::{evaluate_pressure, start_delay_secs, PressureLevel};

    #[test]
    fn normal_pressure_has_headroom() {
        let report = evaluate_pressure(16 * 1024, 6 * 1024);
        assert_eq!(report.level, PressureLevel::Normal);
        assert!(report.can_start_virtual);
    }

    #[test]
    fn pressure_warns_but_can_still_start() {
        let report = evaluate_pressure(16 * 1024, 3 * 1024);
        assert_eq!(report.level, PressureLevel::Pressure);
        assert!(report.can_start_virtual);
    }

    #[test]
    fn critical_pressure_blocks_new_virtual() {
        let report = evaluate_pressure(16 * 1024, 1536);
        assert_eq!(report.level, PressureLevel::Critical);
        assert!(!report.can_start_virtual);
    }

    #[test]
    fn start_delay_slows_under_pressure() {
        assert_eq!(start_delay_secs(PressureLevel::Normal), 2);
        assert_eq!(start_delay_secs(PressureLevel::Pressure), 5);
        assert_eq!(start_delay_secs(PressureLevel::Critical), 0);
    }
}

pub fn start_delay_secs(level: PressureLevel) -> u64 {
    match level {
        PressureLevel::Normal => 2,
        PressureLevel::Pressure => 5,
        PressureLevel::Critical => 0,
    }
}

pub fn current_host_pressure() -> HostPressure {
    let mut system = System::new();
    system.refresh_memory();
    evaluate_pressure(
        system.total_memory() / 1024 / 1024,
        system.available_memory() / 1024 / 1024,
    )
}

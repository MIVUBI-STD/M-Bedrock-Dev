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
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum StartDecision {
    StartNow,
    Wait,
    Block,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HostPressure {
    pub total_memory_mb: u64,
    pub available_memory_mb: u64,
    pub available_percent: u8,
    pub cpu_usage_percent: u8,
    pub level: PressureLevel,
    pub can_start_virtual: bool,
    pub start_decision: StartDecision,
}

pub fn evaluate_pressure(
    total_memory_mb: u64,
    available_memory_mb: u64,
    cpu_usage_percent: u8,
) -> HostPressure {
    let available_percent = if total_memory_mb == 0 {
        0
    } else {
        ((available_memory_mb.saturating_mul(100)) / total_memory_mb).min(100) as u8
    };
    let cpu_usage_percent = cpu_usage_percent.min(100);

    let memory_critical = available_percent < 15 || available_memory_mb < 2048;
    let memory_pressure = available_percent < 25;
    let cpu_critical = cpu_usage_percent >= 95;
    let cpu_pressure = cpu_usage_percent >= 80;

    let level = if memory_critical {
        PressureLevel::Critical
    } else if memory_pressure || cpu_critical {
        PressureLevel::Pressure
    } else {
        PressureLevel::Normal
    };

    let start_decision = if memory_critical {
        StartDecision::Block
    } else if memory_pressure || cpu_pressure {
        StartDecision::Wait
    } else {
        StartDecision::StartNow
    };

    HostPressure {
        total_memory_mb,
        available_memory_mb,
        available_percent,
        cpu_usage_percent,
        level,
        can_start_virtual: start_decision != StartDecision::Block,
        start_decision,
    }
}

pub fn current_host_pressure() -> HostPressure {
    let mut system = System::new();
    system.refresh_memory();
    system.refresh_cpu_usage();
    std::thread::sleep(sysinfo::MINIMUM_CPU_UPDATE_INTERVAL);
    system.refresh_cpu_usage();
    let cpu = system.global_cpu_usage().round().clamp(0.0, 100.0) as u8;
    evaluate_pressure(
        system.total_memory() / 1024 / 1024,
        system.available_memory() / 1024 / 1024,
        cpu,
    )
}

#[cfg(test)]
mod tests {
    use super::{evaluate_pressure, PressureLevel, StartDecision};

    #[test]
    fn healthy_host_can_start_immediately() {
        let report = evaluate_pressure(16 * 1024, 6 * 1024, 35);
        assert_eq!(report.level, PressureLevel::Normal);
        assert_eq!(report.start_decision, StartDecision::StartNow);
        assert!(report.can_start_virtual);
    }

    #[test]
    fn memory_pressure_waits_instead_of_starting_into_contention() {
        let report = evaluate_pressure(16 * 1024, 3 * 1024, 35);
        assert_eq!(report.level, PressureLevel::Pressure);
        assert_eq!(report.start_decision, StartDecision::Wait);
        assert!(report.can_start_virtual);
    }

    #[test]
    fn cpu_pressure_waits_without_reclassifying_memory() {
        let report = evaluate_pressure(16 * 1024, 8 * 1024, 85);
        assert_eq!(report.level, PressureLevel::Normal);
        assert_eq!(report.start_decision, StartDecision::Wait);
        assert!(report.can_start_virtual);
    }

    #[test]
    fn critical_memory_blocks_new_virtual() {
        let report = evaluate_pressure(16 * 1024, 1536, 20);
        assert_eq!(report.level, PressureLevel::Critical);
        assert_eq!(report.start_decision, StartDecision::Block);
        assert!(!report.can_start_virtual);
    }

    #[test]
    fn cpu_saturation_delays_but_does_not_kill_existing_clients() {
        let report = evaluate_pressure(16 * 1024, 8 * 1024, 97);
        assert_eq!(report.level, PressureLevel::Pressure);
        assert_eq!(report.start_decision, StartDecision::Wait);
        assert!(report.can_start_virtual);
    }
}

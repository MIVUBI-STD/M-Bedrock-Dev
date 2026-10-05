use std::io;

pub const MIN_VM_MEMORY_MB: u64 = 4096;
pub const HOST_RUNTIME_HEADROOM_MB: u64 = 4096;
const MEMORY_STEP_MB: u64 = 512;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MemoryPlan {
    pub memory_per_stopped_vm_mb: u64,
    pub stopped_virtual_clients: usize,
}

fn preferred_memory_mb(virtual_clients: usize) -> u64 {
    match virtual_clients {
        0 => 0,
        1 => 5120,
        2 => 4608,
        _ => 4096,
    }
}

pub fn plan_memory(
    available_memory_mb: u64,
    virtual_clients: usize,
    stopped_virtual_clients: usize,
) -> io::Result<MemoryPlan> {
    if stopped_virtual_clients == 0 {
        return Ok(MemoryPlan {
            memory_per_stopped_vm_mb: 0,
            stopped_virtual_clients: 0,
        });
    }

    let usable = available_memory_mb.saturating_sub(HOST_RUNTIME_HEADROOM_MB);
    let minimum_required = MIN_VM_MEMORY_MB * stopped_virtual_clients as u64;

    if usable < minimum_required {
        return Err(io::Error::new(
            io::ErrorKind::Other,
            format!(
                "insufficient live RAM: {available_memory_mb} MB available; {} MB required for {} stopped VM(s) plus {} MB host headroom",
                minimum_required + HOST_RUNTIME_HEADROOM_MB,
                stopped_virtual_clients,
                HOST_RUNTIME_HEADROOM_MB
            ),
        ));
    }

    let fair_share = usable / stopped_virtual_clients as u64;
    let target = preferred_memory_mb(virtual_clients).min(fair_share);
    let rounded = (target / MEMORY_STEP_MB) * MEMORY_STEP_MB;

    Ok(MemoryPlan {
        memory_per_stopped_vm_mb: rounded.max(MIN_VM_MEMORY_MB),
        stopped_virtual_clients,
    })
}

#[cfg(test)]
mod tests {
    use super::plan_memory;

    #[test]
    fn one_virtual_client_can_use_more_memory() {
        let plan = plan_memory(12 * 1024, 1, 1).unwrap();
        assert_eq!(plan.memory_per_stopped_vm_mb, 5120);
    }

    #[test]
    fn three_virtual_clients_are_kept_compact() {
        let plan = plan_memory(20 * 1024, 3, 3).unwrap();
        assert_eq!(plan.memory_per_stopped_vm_mb, 4096);
    }

    #[test]
    fn planner_uses_intermediate_512mb_steps() {
        let plan = plan_memory(14 * 1024, 2, 2).unwrap();
        assert_eq!(plan.memory_per_stopped_vm_mb, 4608);
    }

    #[test]
    fn planner_refuses_to_starve_host() {
        assert!(plan_memory(15 * 1024, 3, 3).is_err());
    }
}

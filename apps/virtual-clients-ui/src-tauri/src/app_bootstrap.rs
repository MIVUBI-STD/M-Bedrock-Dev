use crate::commands;

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::virtual_clients::virtual_clients_policy,
            commands::virtual_clients::virtual_clients_snapshot,
            commands::virtual_clients::virtual_clients_actions,
            commands::virtual_clients::virtual_clients_history,
            commands::virtual_clients::virtual_clients_support_bundle,
            commands::virtual_clients::virtual_clients_check_update,
            commands::virtual_clients::virtual_clients_register_base,
            commands::virtual_clients::virtual_clients_provision,
            commands::virtual_clients::virtual_clients_verify_identities,
            commands::virtual_clients::virtual_clients_stage_update,
            commands::virtual_clients::virtual_clients_start,
            commands::virtual_clients::virtual_clients_suspend,
            commands::virtual_clients::virtual_clients_stop,
            commands::virtual_clients::virtual_clients_restart,
            commands::virtual_clients::virtual_clients_set_ready,
            commands::virtual_clients::virtual_clients_reset,
            commands::virtual_clients::virtual_clients_open,
            commands::virtual_clients::virtual_clients_reprovision,
            commands::window_arrangement::window_arrange
        ])
        .run(tauri::generate_context!())
        .expect("failed to run M-Bedrock Virtual Clients desktop runtime");
}

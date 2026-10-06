use crate::commands;
use crate::engine::app_instance;
use rfd::{MessageButtons, MessageDialog, MessageLevel};

pub fn run() {
    if let Err(error) = crate::engine::dpi::configure() {
        show_startup_error(&format!("Failed to configure display scaling: {error}"));
        return;
    }

    let _instance_lease = match app_instance::acquire() {
        Ok(lease) => lease,
        Err(error) => {
            show_startup_error(&error);
            return;
        }
    };

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::virtual_clients::virtual_clients_policy,
            commands::virtual_clients::virtual_clients_base_preflight,
            commands::virtual_clients::virtual_clients_snapshot,
            commands::virtual_clients::virtual_clients_actions,
            commands::virtual_clients::virtual_clients_history,
            commands::virtual_clients::virtual_clients_support_bundle,
            commands::virtual_clients::virtual_clients_check_update,
            commands::virtual_clients::virtual_clients_register_base,
            commands::virtual_clients::virtual_clients_open_base_finalization,
            commands::virtual_clients::virtual_clients_provision,
            commands::virtual_clients::virtual_clients_verify_identities,
            commands::virtual_clients::virtual_clients_stage_update,
            commands::virtual_clients::virtual_clients_start,
            commands::virtual_clients::virtual_clients_start_client,
            commands::virtual_clients::virtual_clients_start_setup,
            commands::virtual_clients::virtual_clients_suspend,
            commands::virtual_clients::virtual_clients_stop,
            commands::virtual_clients::virtual_clients_restart,
            commands::virtual_clients::virtual_clients_set_ready,
            commands::virtual_clients::virtual_clients_reset,
            commands::virtual_clients::virtual_clients_open,
            commands::virtual_clients::virtual_clients_reprovision,
            commands::setup_tools::setup_open_base_location,
            commands::setup_tools::setup_open_guest_tools,
            commands::window_arrangement::window_displays,
            commands::window_arrangement::window_arrange,
            commands::window_arrangement::window_apply_layout,
            commands::window_arrangement::window_clear_overlay
        ])
        .run(tauri::generate_context!())
        .expect("failed to run M-Bedrock Virtual Clients desktop runtime");
    crate::engine::screen_overlay::shutdown();
}

fn show_startup_error(message: &str) {
    let _ = MessageDialog::new()
        .set_title("M-Bedrock Virtual Clients")
        .set_description(message)
        .set_level(MessageLevel::Info)
        .set_buttons(MessageButtons::Ok)
        .show();
}

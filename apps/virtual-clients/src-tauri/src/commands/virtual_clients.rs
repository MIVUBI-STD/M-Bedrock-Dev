use tauri::ipc::Channel;
use virtual_clients_core::{execute_public_command_with_progress, OperationProgress};

async fn run(command: &'static str, args: Vec<String>, on_progress: Option<Channel<OperationProgress>>) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        execute_public_command_with_progress(command, &args, |event| {
            if let Some(channel) = &on_progress {
                // Observation failure must not fail or repeat a VM operation.
                let _ = channel.send(event);
            }
        }).json
    })
        .await
        .map_err(|error| format!("Virtual Clients command task failed: {error}"))
}

#[tauri::command] pub async fn virtual_clients_policy() -> Result<String,String> { run("policy", vec![], None).await }
#[tauri::command] pub async fn virtual_clients_base_preflight() -> Result<String,String> { run("base-preflight", vec![], None).await }
#[tauri::command] pub async fn virtual_clients_snapshot() -> Result<String,String> { run("snapshot", vec![], None).await }
#[tauri::command] pub async fn virtual_clients_actions() -> Result<String,String> { run("actions", vec![], None).await }
#[tauri::command] pub async fn virtual_clients_history() -> Result<String,String> { run("history", vec![], None).await }
#[tauri::command] pub async fn virtual_clients_support_bundle(on_progress: Option<Channel<OperationProgress>>) -> Result<String,String> { run("support-bundle", vec![], on_progress).await }
#[tauri::command] pub async fn virtual_clients_check_update() -> Result<String,String> { run("check-update", vec![], None).await }
#[tauri::command] pub async fn virtual_clients_register_base(on_progress: Option<Channel<OperationProgress>>) -> Result<String,String> { run("register-base", vec![], on_progress).await }
#[tauri::command] pub async fn virtual_clients_open_base_finalization(on_progress: Option<Channel<OperationProgress>>) -> Result<String,String> { run("open-base-finalization", vec![], on_progress).await }
#[tauri::command] pub async fn virtual_clients_provision(on_progress: Option<Channel<OperationProgress>>) -> Result<String,String> { run("provision", vec![], on_progress).await }
#[tauri::command] pub async fn virtual_clients_verify_identities(on_progress: Option<Channel<OperationProgress>>) -> Result<String,String> { run("verify-identities", vec![], on_progress).await }
#[tauri::command] pub async fn virtual_clients_stage_update(on_progress: Option<Channel<OperationProgress>>) -> Result<String,String> { run("stage-update", vec![], on_progress).await }
#[tauri::command] pub async fn virtual_clients_start(count: u8, on_progress: Option<Channel<OperationProgress>>) -> Result<String,String> { run("start", vec![count.to_string()], on_progress).await }
#[tauri::command] pub async fn virtual_clients_start_client(client: String, on_progress: Option<Channel<OperationProgress>>) -> Result<String,String> { run("start-client", vec![client], on_progress).await }
#[tauri::command] pub async fn virtual_clients_suspend(client: Option<String>, on_progress: Option<Channel<OperationProgress>>) -> Result<String,String> { run("suspend", client.into_iter().collect(), on_progress).await }
#[tauri::command] pub async fn virtual_clients_stop(client: Option<String>, on_progress: Option<Channel<OperationProgress>>) -> Result<String,String> { run("stop", client.into_iter().collect(), on_progress).await }
#[tauri::command] pub async fn virtual_clients_restart(client: String, on_progress: Option<Channel<OperationProgress>>) -> Result<String,String> { run("restart", vec![client], on_progress).await }
#[tauri::command] pub async fn virtual_clients_set_ready(client: String, on_progress: Option<Channel<OperationProgress>>) -> Result<String,String> { run("set-ready", vec![client], on_progress).await }
#[tauri::command] pub async fn virtual_clients_reset(client: String, on_progress: Option<Channel<OperationProgress>>) -> Result<String,String> { run("reset", vec![client], on_progress).await }
#[tauri::command] pub async fn virtual_clients_open(client: String, on_progress: Option<Channel<OperationProgress>>) -> Result<String,String> { run("open", vec![client], on_progress).await }
#[tauri::command] pub async fn virtual_clients_reprovision(client: String, on_progress: Option<Channel<OperationProgress>>) -> Result<String,String> {
    run("reprovision", vec![client, "--destroy-account-state".to_string()], on_progress).await
}

#[tauri::command]
pub async fn virtual_clients_start_setup(client: String, on_progress: Option<Channel<OperationProgress>>) -> Result<String, String> {
    run("start-setup", vec![client], on_progress).await
}

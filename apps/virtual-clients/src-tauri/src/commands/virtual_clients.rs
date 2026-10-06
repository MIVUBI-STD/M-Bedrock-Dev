use virtual_clients_core::execute_public_command;

async fn run(command: &'static str, args: Vec<String>) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || execute_public_command(command, &args).json)
        .await
        .map_err(|error| format!("Virtual Clients command task failed: {error}"))
}

#[tauri::command] pub async fn virtual_clients_policy() -> Result<String,String> { run("policy", vec![]).await }
#[tauri::command] pub async fn virtual_clients_base_preflight() -> Result<String,String> { run("base-preflight", vec![]).await }
#[tauri::command] pub async fn virtual_clients_snapshot() -> Result<String,String> { run("snapshot", vec![]).await }
#[tauri::command] pub async fn virtual_clients_actions() -> Result<String,String> { run("actions", vec![]).await }
#[tauri::command] pub async fn virtual_clients_history() -> Result<String,String> { run("history", vec![]).await }
#[tauri::command] pub async fn virtual_clients_support_bundle() -> Result<String,String> { run("support-bundle", vec![]).await }
#[tauri::command] pub async fn virtual_clients_check_update() -> Result<String,String> { run("check-update", vec![]).await }
#[tauri::command] pub async fn virtual_clients_register_base() -> Result<String,String> { run("register-base", vec![]).await }
#[tauri::command] pub async fn virtual_clients_open_base_finalization() -> Result<String,String> { run("open-base-finalization", vec![]).await }
#[tauri::command] pub async fn virtual_clients_provision() -> Result<String,String> { run("provision", vec![]).await }
#[tauri::command] pub async fn virtual_clients_verify_identities() -> Result<String,String> { run("verify-identities", vec![]).await }
#[tauri::command] pub async fn virtual_clients_stage_update() -> Result<String,String> { run("stage-update", vec![]).await }
#[tauri::command] pub async fn virtual_clients_start(count: u8) -> Result<String,String> { run("start", vec![count.to_string()]).await }
#[tauri::command] pub async fn virtual_clients_suspend(client: Option<String>) -> Result<String,String> { run("suspend", client.into_iter().collect()).await }
#[tauri::command] pub async fn virtual_clients_stop(client: Option<String>) -> Result<String,String> { run("stop", client.into_iter().collect()).await }
#[tauri::command] pub async fn virtual_clients_restart(client: String) -> Result<String,String> { run("restart", vec![client]).await }
#[tauri::command] pub async fn virtual_clients_set_ready(client: String) -> Result<String,String> { run("set-ready", vec![client]).await }
#[tauri::command] pub async fn virtual_clients_reset(client: String) -> Result<String,String> { run("reset", vec![client]).await }
#[tauri::command] pub async fn virtual_clients_open(client: String) -> Result<String,String> { run("open", vec![client]).await }
#[tauri::command] pub async fn virtual_clients_reprovision(client: String) -> Result<String,String> {
    run("reprovision", vec![client, "--destroy-account-state".to_string()]).await
}

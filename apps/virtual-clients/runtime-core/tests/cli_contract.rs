use serde_json::Value;
use std::process::Command;

fn binary() -> Command {
    Command::new(env!("CARGO_BIN_EXE_virtual-clients"))
}

#[test]
fn cli_errors_use_versioned_machine_readable_contract() {
    let output = binary()
        .args(["start", "not-a-number"])
        .output()
        .expect("virtual-clients binary must run");

    assert!(!output.status.success());
    let stderr = String::from_utf8(output.stderr).unwrap();
    let error: Value = serde_json::from_str(stderr.trim()).unwrap();

    assert_eq!(error["schema"], 1);
    assert_eq!(error["code"], "INVALID_INPUT");
    assert_eq!(error["retryable"], false);
    assert!(error["message"]
        .as_str()
        .unwrap()
        .contains("must be an integer"));
}

#[test]
fn cli_success_uses_same_contract_schema() {
    let output = binary()
        .arg("status")
        .output()
        .expect("virtual-clients binary must run");

    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).unwrap();
    let report: Value = serde_json::from_str(&stdout).unwrap();

    assert_eq!(report["schema"], 1);
    assert!(report["data"]["clients"].is_array());
}

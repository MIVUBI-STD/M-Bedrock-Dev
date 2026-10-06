use serde_json::Value;
use std::{
    io::Write,
    process::{Command, Stdio},
};

#[test]
fn bridge_binary_round_trips_public_contract() {
    let mut child = Command::new(env!("CARGO_BIN_EXE_virtual-clients-bridge"))
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .expect("bridge binary must start");

    {
        let stdin = child.stdin.as_mut().expect("bridge stdin must exist");
        writeln!(
            stdin,
            r#"{{"schema":1,"requestId":41,"command":"policy","args":[]}}"#
        )
        .unwrap();
    }
    drop(child.stdin.take());

    let output = child.wait_with_output().expect("bridge must exit");
    assert!(output.status.success());

    let stdout = String::from_utf8(output.stdout).unwrap();
    let line = stdout.lines().next().expect("bridge must emit one response");
    let response: Value = serde_json::from_str(line).unwrap();

    assert_eq!(response["schema"], 1);
    assert_eq!(response["requestId"], 41);
    assert_eq!(response["success"], true);

    let payload = response["payload"].as_str().unwrap();
    let public: Value = serde_json::from_str(payload).unwrap();
    assert_eq!(public["schema"], 1);
    assert_eq!(public["data"]["maxVirtualClients"], 3);
}

#[test]
fn bridge_binary_returns_public_error_payload() {
    let mut child = Command::new(env!("CARGO_BIN_EXE_virtual-clients-bridge"))
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .expect("bridge binary must start");

    {
        let stdin = child.stdin.as_mut().expect("bridge stdin must exist");
        writeln!(
            stdin,
            r#"{{"schema":1,"requestId":9,"command":"unknown","args":[]}}"#
        )
        .unwrap();
    }
    drop(child.stdin.take());

    let output = child.wait_with_output().expect("bridge must exit");
    assert!(output.status.success());

    let stdout = String::from_utf8(output.stdout).unwrap();
    let response: Value = serde_json::from_str(stdout.lines().next().unwrap()).unwrap();

    assert_eq!(response["requestId"], 9);
    assert_eq!(response["success"], false);

    let payload: Value = serde_json::from_str(response["payload"].as_str().unwrap()).unwrap();
    assert_eq!(payload["schema"], 1);
    assert_eq!(payload["code"], "INVALID_INPUT");
}

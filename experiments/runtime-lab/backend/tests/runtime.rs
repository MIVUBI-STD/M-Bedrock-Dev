use m_bedrock_runtime_lab_core::{client::ClientId, RuntimeLab};

#[test]
fn native_client_open_is_manual_without_provider() {
    let lab = RuntimeLab;
    let status = lab
        .open(ClientId::Mce01)
        .expect("native open should not require a provider");
    assert_eq!(status.id, "MCE-01");
    assert!(status.native);
    assert_eq!(status.ready_snapshot, None);
}

#[test]
fn start_rejects_invalid_client_count() {
    let lab = RuntimeLab;
    let error = lab.start(0).expect_err("zero clients must be rejected");
    assert_eq!(error.kind(), std::io::ErrorKind::InvalidInput);
}

#[test]
fn native_client_cannot_use_vm_clean_state_actions() {
    let lab = RuntimeLab;

    assert_eq!(
        lab.restart(ClientId::Mce01)
            .expect_err("native restart must be external/manual")
            .kind(),
        std::io::ErrorKind::InvalidInput
    );

    assert_eq!(
        lab.set_ready(ClientId::Mce01)
            .expect_err("native client has no QA_READY snapshot")
            .kind(),
        std::io::ErrorKind::InvalidInput
    );

    assert_eq!(
        lab.reset(ClientId::Mce01)
            .expect_err("native client has no VM reset")
            .kind(),
        std::io::ErrorKind::InvalidInput
    );
}

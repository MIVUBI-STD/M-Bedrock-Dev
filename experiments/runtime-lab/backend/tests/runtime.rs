use m_bedrock_runtime_lab_core::{client::ClientId, RuntimeLab};

#[test]
fn native_client_lifecycle_is_manual() {
    let lab = RuntimeLab;
    assert_eq!(
        lab.open(ClientId::Native)
            .expect_err("Native open belongs to the host")
            .kind(),
        std::io::ErrorKind::InvalidInput
    );
    assert_eq!(
        lab.stop(Some(ClientId::Native))
            .expect_err("Native stop belongs to the host")
            .kind(),
        std::io::ErrorKind::InvalidInput
    );
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
        lab.suspend(Some(ClientId::Native))
            .expect_err("native suspend must be external/manual")
            .kind(),
        std::io::ErrorKind::InvalidInput
    );

    assert_eq!(
        lab.restart(ClientId::Native)
            .expect_err("native restart must be external/manual")
            .kind(),
        std::io::ErrorKind::InvalidInput
    );

    assert_eq!(
        lab.set_ready(ClientId::Native)
            .expect_err("native client has no QA_READY snapshot")
            .kind(),
        std::io::ErrorKind::InvalidInput
    );

    assert_eq!(
        lab.reset(ClientId::Native)
            .expect_err("native client has no VM reset")
            .kind(),
        std::io::ErrorKind::InvalidInput
    );
}

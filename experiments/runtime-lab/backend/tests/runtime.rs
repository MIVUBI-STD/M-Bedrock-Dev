use m_bedrock_runtime_lab_core::{client::ClientId, RuntimeLab};

#[test]
fn native_client_open_is_manual_without_provider() {
    let lab = RuntimeLab;
    let status = lab.open(ClientId::Mce01).expect("native open should not require a provider");
    assert_eq!(status.id, "MCE-01");
    assert!(status.native);
}

#[test]
fn start_rejects_invalid_client_count() {
    let lab = RuntimeLab;
    let error = lab.start(0).expect_err("zero clients must be rejected");
    assert_eq!(error.kind(), std::io::ErrorKind::InvalidInput);
}

use crate::{execute_public_command, ErrorReport};
use serde::{Deserialize, Serialize};
use std::io;

pub const BRIDGE_PROTOCOL_SCHEMA: u32 = 1;
pub const BRIDGE_MAX_MESSAGE_BYTES: usize = 64 * 1024;
const BRIDGE_MAX_ARGS: usize = 8;
const BRIDGE_MAX_COMMAND_BYTES: usize = 64;
const BRIDGE_MAX_ARG_BYTES: usize = 512;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeRequest {
    pub schema: u32,
    pub request_id: u64,
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeResponse {
    pub schema: u32,
    pub request_id: Option<u64>,
    pub success: bool,
    pub payload: String,
}

fn invalid_payload(message: impl Into<String>) -> String {
    let error = io::Error::new(io::ErrorKind::InvalidInput, message.into());
    serde_json::to_string(&ErrorReport::from_io(&error)).unwrap_or_else(|_| {
        r#"{"schema":1,"code":"IO_FAILURE","message":"error serialization failed","retryable":false}"#
            .to_string()
    })
}

fn validate_request(request: &BridgeRequest) -> io::Result<()> {
    if request.schema != BRIDGE_PROTOCOL_SCHEMA {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "unsupported bridge protocol schema",
        ));
    }
    if request.command.is_empty() || request.command.len() > BRIDGE_MAX_COMMAND_BYTES {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "bridge command length is invalid",
        ));
    }
    if request.args.len() > BRIDGE_MAX_ARGS {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "bridge argument count exceeds the protocol limit",
        ));
    }
    if request
        .args
        .iter()
        .any(|value| value.len() > BRIDGE_MAX_ARG_BYTES)
    {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "bridge argument length exceeds the protocol limit",
        ));
    }
    Ok(())
}

pub fn handle_bridge_line(line: &str) -> BridgeResponse {
    if line.len() > BRIDGE_MAX_MESSAGE_BYTES {
        return BridgeResponse {
            schema: BRIDGE_PROTOCOL_SCHEMA,
            request_id: None,
            success: false,
            payload: invalid_payload("bridge message exceeds the protocol size limit"),
        };
    }

    let request = match serde_json::from_str::<BridgeRequest>(line) {
        Ok(request) => request,
        Err(_) => {
            return BridgeResponse {
                schema: BRIDGE_PROTOCOL_SCHEMA,
                request_id: None,
                success: false,
                payload: invalid_payload("bridge request is not valid JSON"),
            }
        }
    };

    if let Err(error) = validate_request(&request) {
        return BridgeResponse {
            schema: BRIDGE_PROTOCOL_SCHEMA,
            request_id: Some(request.request_id),
            success: false,
            payload: serde_json::to_string(&ErrorReport::from_io(&error))
                .unwrap_or_else(|_| invalid_payload("bridge error serialization failed")),
        };
    }

    let result = execute_public_command(&request.command, &request.args);
    BridgeResponse {
        schema: BRIDGE_PROTOCOL_SCHEMA,
        request_id: Some(request.request_id),
        success: result.success,
        payload: result.json,
    }
}

#[cfg(test)]
mod tests {
    use super::{handle_bridge_line, BRIDGE_MAX_MESSAGE_BYTES};

    #[test]
    fn bridge_preserves_request_identity_and_public_payload() {
        let response =
            handle_bridge_line(r#"{"schema":1,"requestId":42,"command":"policy","args":[]}"#);
        assert!(response.success);
        assert_eq!(response.request_id, Some(42));
        assert!(response.payload.contains("\"schema\": 1"));
    }

    #[test]
    fn bridge_rejects_unknown_protocol_schema() {
        let response =
            handle_bridge_line(r#"{"schema":2,"requestId":7,"command":"policy","args":[]}"#);
        assert!(!response.success);
        assert_eq!(response.request_id, Some(7));
        assert!(response.payload.contains("INVALID_INPUT"));
    }

    #[test]
    fn bridge_rejects_oversized_messages() {
        let line = "x".repeat(BRIDGE_MAX_MESSAGE_BYTES + 1);
        let response = handle_bridge_line(&line);
        assert!(!response.success);
        assert_eq!(response.request_id, None);
    }
}

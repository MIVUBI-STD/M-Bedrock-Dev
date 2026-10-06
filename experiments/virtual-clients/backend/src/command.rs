use crate::{
    read_operation_history, ClientId, DestructiveConfirmation, ErrorReport, SuccessReport,
    VirtualClients,
};
use serde::Serialize;
use serde_json::Value;
use std::io;

#[derive(Debug, Clone)]
pub struct PublicCommandResult {
    pub success: bool,
    pub json: String,
}

fn input_error(message: impl Into<String>) -> io::Error {
    io::Error::new(io::ErrorKind::InvalidInput, message.into())
}

fn parse_client(value: &str) -> io::Result<ClientId> {
    match value {
        "Native" => Ok(ClientId::Native),
        "Virtual-01" => Ok(ClientId::Virtual01),
        "Virtual-02" => Ok(ClientId::Virtual02),
        "Virtual-03" => Ok(ClientId::Virtual03),
        _ => Err(input_error(format!("unknown client: {value}"))),
    }
}

fn require_no_args(command: &str, args: &[String]) -> io::Result<()> {
    if args.is_empty() {
        Ok(())
    } else {
        Err(input_error(format!("{command} does not accept arguments")))
    }
}

fn one_arg<'a>(command: &str, args: &'a [String]) -> io::Result<&'a str> {
    match args {
        [value] => Ok(value),
        [] => Err(input_error(format!("{command} requires one argument"))),
        _ => Err(input_error(format!("{command} accepts exactly one argument"))),
    }
}

fn to_value<T: Serialize>(value: T) -> io::Result<Value> {
    serde_json::to_value(value).map_err(|error| io::Error::new(io::ErrorKind::Other, error))
}

fn execute_value(command: &str, args: &[String]) -> io::Result<Value> {
    let app = VirtualClients;

    match command {
        "doctor" => {
            require_no_args(command, args)?;
            to_value(app.doctor())
        }
        "policy" => {
            require_no_args(command, args)?;
            to_value(app.policy())
        }
        "actions" => {
            require_no_args(command, args)?;
            to_value(app.lifecycle_actions()?)
        }
        "diagnostics" => {
            require_no_args(command, args)?;
            to_value(app.diagnostics()?)
        }
        "snapshot" => {
            require_no_args(command, args)?;
            to_value(app.snapshot()?)
        }
        "support-bundle" => {
            require_no_args(command, args)?;
            to_value(app.support_bundle()?)
        }
        "history" => {
            require_no_args(command, args)?;
            to_value(read_operation_history()?)
        }
        "check-update" => {
            require_no_args(command, args)?;
            to_value(app.check_update()?)
        }
        "stage-update" => {
            require_no_args(command, args)?;
            to_value(app.stage_update()?)
        }
        "register-base" => {
            require_no_args(command, args)?;
            to_value(app.register_base()?)
        }
        "provision" => {
            require_no_args(command, args)?;
            to_value(app.provision()?)
        }
        "status" => {
            require_no_args(command, args)?;
            to_value(app.status()?)
        }
        "resources" => {
            let value = one_arg(command, args)?;
            let count = value
                .parse::<usize>()
                .map_err(|_| input_error("virtual client count must be an integer"))?;
            to_value(app.resources(count)?)
        }
        "reprovision" => match args {
            [client, confirmation] if confirmation == "--destroy-account-state" => {
                to_value(app.reprovision(
                    parse_client(client)?,
                    DestructiveConfirmation::ReprovisionAccountState,
                )?)
            }
            [_, _] => Err(input_error(
                "reprovision requires --destroy-account-state after the client id",
            )),
            _ => Err(input_error(
                "reprovision requires <Virtual-01..03> --destroy-account-state",
            )),
        },
        "verify-identities" => {
            require_no_args(command, args)?;
            to_value(app.verify_identities()?)
        }
        "start" => {
            let value = one_arg(command, args)?;
            let count = value
                .parse::<usize>()
                .map_err(|_| input_error("virtual client count must be an integer"))?;
            to_value(app.start(count)?)
        }
        "suspend" => {
            let client = match args {
                [] => None,
                [client] => Some(parse_client(client)?),
                _ => return Err(input_error("suspend accepts zero or one client id")),
            };
            to_value(app.suspend(client)?)
        }
        "stop" => {
            let client = match args {
                [] => None,
                [client] => Some(parse_client(client)?),
                _ => return Err(input_error("stop accepts zero or one client id")),
            };
            to_value(app.stop(client)?)
        }
        "restart" => to_value(app.restart(parse_client(one_arg(command, args)?)?)?),
        "set-ready" => to_value(app.set_ready(parse_client(one_arg(command, args)?)?)?),
        "reset" => to_value(app.reset(parse_client(one_arg(command, args)?)?)?),
        "open" => to_value(app.open(parse_client(one_arg(command, args)?)?)?),
        _ => Err(input_error(format!("unknown command: {command}"))),
    }
}

fn serialize_error(error: &io::Error) -> String {
    let report = ErrorReport::from_io(error);
    serde_json::to_string(&report).unwrap_or_else(|_| {
        r#"{"schema":1,"code":"IO_FAILURE","message":"error serialization failed","retryable":false}"#
            .to_string()
    })
}

pub fn execute_public_command(command: &str, args: &[String]) -> PublicCommandResult {
    match execute_value(command, args) {
        Ok(value) => match serde_json::to_string_pretty(&SuccessReport::new(&value)) {
            Ok(json) => PublicCommandResult {
                success: true,
                json,
            },
            Err(error) => {
                let error = io::Error::new(io::ErrorKind::Other, error);
                PublicCommandResult {
                    success: false,
                    json: serialize_error(&error),
                }
            }
        },
        Err(error) => PublicCommandResult {
            success: false,
            json: serialize_error(&error),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::execute_public_command;

    #[test]
    fn command_boundary_rejects_extra_arguments() {
        let result = execute_public_command("policy", &["extra".into()]);
        assert!(!result.success);
        assert!(result.json.contains("INVALID_INPUT"));
    }

    #[test]
    fn command_boundary_uses_public_contract_for_success() {
        let result = execute_public_command("policy", &[]);
        assert!(result.success);
        let json: serde_json::Value = serde_json::from_str(&result.json).unwrap();
        assert_eq!(json["schema"], 1);
        assert_eq!(json["data"]["maxVirtualClients"], 3);
    }
}

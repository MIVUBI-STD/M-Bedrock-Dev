#![forbid(unsafe_code)]

use m_bedrock_virtual_clients_core::{
    ClientId, DestructiveConfirmation, ErrorReport, SuccessReport, VirtualClients,
};
use std::io;

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

fn print_json<T: serde::Serialize>(value: &T) -> io::Result<()> {
    let report = SuccessReport::new(value);
    let json = serde_json::to_string_pretty(&report)
        .map_err(|error| io::Error::new(io::ErrorKind::Other, error))?;
    println!("{json}");
    Ok(())
}

fn main() {
    if let Err(error) = run() {
        let report = ErrorReport::from_io(&error);
        match serde_json::to_string(&report) {
            Ok(json) => eprintln!("{json}"),
            Err(_) => eprintln!(
                "{}",
                r#"{"schema":1,"code":"IO_FAILURE","message":"error serialization failed","retryable":false}"#
            ),
        }
        std::process::exit(1);
    }
}

fn run() -> io::Result<()> {
    let app = VirtualClients;
    let mut args = std::env::args().skip(1);
    let command = args.next().unwrap_or_else(|| "help".to_string());

    match command.as_str() {
        "doctor" => print_json(&app.doctor())?,
        "diagnostics" => print_json(&app.diagnostics()?)?,
        "check-update" => print_json(&app.check_update()?)?,
        "stage-update" => print_json(&app.stage_update()?)?,
        "register-base" => print_json(&app.register_base()?)?,
        "provision" => print_json(&app.provision()?)?,
        "status" => print_json(&app.status()?)?,
        "resources" => {
            let count = args
                .next()
                .ok_or_else(|| input_error("virtual client count is required"))?
                .parse::<usize>()
                .map_err(|_| input_error("virtual client count must be an integer"))?;
            print_json(&app.resources(count)?)?;
        }
        "reprovision" => {
            let client = parse_client(
                &args
                    .next()
                    .ok_or_else(|| input_error("client id is required"))?,
            )?;
            let confirmation = args.next().ok_or_else(|| {
                input_error("reprovision is destructive; pass --destroy-account-state to continue")
            })?;
            if confirmation != "--destroy-account-state" || args.next().is_some() {
                return Err(input_error(
                    "reprovision requires exactly --destroy-account-state after the client id",
                ));
            }
            print_json(
                &app.reprovision(client, DestructiveConfirmation::ReprovisionAccountState)?,
            )?;
        }
        "verify-identities" => print_json(&app.verify_identities()?)?,
        "start" => {
            let count = args
                .next()
                .ok_or_else(|| input_error("virtual client count is required"))?
                .parse::<usize>()
                .map_err(|_| input_error("virtual client count must be an integer"))?;
            print_json(&app.start(count)?)?;
        }
        "suspend" => {
            let client = args.next().map(|value| parse_client(&value)).transpose()?;
            print_json(&app.suspend(client)?)?;
        }
        "stop" => {
            let client = args.next().map(|value| parse_client(&value)).transpose()?;
            print_json(&app.stop(client)?)?;
        }
        "restart" => {
            let client = parse_client(
                &args
                    .next()
                    .ok_or_else(|| input_error("client id is required"))?,
            )?;
            print_json(&app.restart(client)?)?;
        }
        "set-ready" => {
            let client = parse_client(
                &args
                    .next()
                    .ok_or_else(|| input_error("client id is required"))?,
            )?;
            print_json(&app.set_ready(client)?)?;
        }
        "reset" => {
            let client = parse_client(
                &args
                    .next()
                    .ok_or_else(|| input_error("client id is required"))?,
            )?;
            print_json(&app.reset(client)?)?;
        }
        "open" => {
            let client = parse_client(
                &args
                    .next()
                    .ok_or_else(|| input_error("client id is required"))?,
            )?;
            print_json(&app.open(client)?)?;
        }
        _ => {
            println!("M-Bedrock Virtual Clients");
            println!("  doctor");
            println!("  diagnostics");
            println!("  check-update");
            println!("  stage-update");
            println!("  register-base");
            println!("  provision");
            println!("  status");
            println!("  resources <1-3>");
            println!("  verify-identities");
            println!("  reprovision <Virtual-01..03> --destroy-account-state");
            println!("  start <1-3>");
            println!("  open <Virtual-01..03>");
            println!("  suspend [Virtual-01..03]");
            println!("  restart <Virtual-01..03>");
            println!("  set-ready <Virtual-01..03>");
            println!("  reset <Virtual-01..03>");
            println!("  stop [Virtual-01..03]");
        }
    }

    Ok(())
}

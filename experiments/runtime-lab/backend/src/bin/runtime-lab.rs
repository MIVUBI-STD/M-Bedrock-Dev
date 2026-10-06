use m_bedrock_runtime_lab_core::{client::ClientId, RuntimeLab};

fn parse_client(value: &str) -> Result<ClientId, String> {
    match value {
        "Native" => Ok(ClientId::Native),
        "Virtual-01" => Ok(ClientId::Virtual01),
        "Virtual-02" => Ok(ClientId::Virtual02),
        "Virtual-03" => Ok(ClientId::Virtual03),
        _ => Err(format!("unknown client: {value}")),
    }
}

fn print_json<T: serde::Serialize>(value: &T) -> Result<(), Box<dyn std::error::Error>> {
    println!("{}", serde_json::to_string_pretty(value)?);
    Ok(())
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let lab = RuntimeLab;
    let mut args = std::env::args().skip(1);
    let command = args.next().unwrap_or_else(|| "help".to_string());

    match command.as_str() {
        "doctor" => print_json(&lab.doctor())?,
        "provision" => print_json(&lab.provision()?)?,
        "status" => print_json(&lab.status()?)?,
        "resources" => {
            let count = args.next().ok_or("virtual client count is required")?.parse::<usize>()?;
            print_json(&lab.resources(count)?)?;
        }
        "reprovision" => {
            let client = parse_client(&args.next().ok_or("client id is required")?)?;
            print_json(&lab.reprovision(client)?)?;
        }
        "start" => {
            let count = args.next().ok_or("virtual client count is required")?.parse::<usize>()?;
            print_json(&lab.start(count)?)?;
        }
        "suspend" => {
            let client = args.next().map(|value| parse_client(&value)).transpose()?;
            print_json(&lab.suspend(client)?)?;
        }
        "stop" => {
            let client = args.next().map(|value| parse_client(&value)).transpose()?;
            print_json(&lab.stop(client)?)?;
        }
        "restart" => {
            let client = parse_client(&args.next().ok_or("client id is required")?)?;
            print_json(&lab.restart(client)?)?;
        }
        "set-ready" => {
            let client = parse_client(&args.next().ok_or("client id is required")?)?;
            print_json(&lab.set_ready(client)?)?;
        }
        "reset" => {
            let client = parse_client(&args.next().ok_or("client id is required")?)?;
            print_json(&lab.reset(client)?)?;
        }
        "open" => {
            let client = parse_client(&args.next().ok_or("client id is required")?)?;
            print_json(&lab.open(client)?)?;
        }
        _ => {
            println!("M-Bedrock Runtime Lab");
            println!("  doctor");
            println!("  provision");
            println!("  status");
            println!("  resources <1-3>");
            println!("  reprovision <Virtual-01..03>");
            println!("  start <1-3>");
            println!("  open <Native|Virtual-01..03>");
            println!("  suspend [Virtual-01..03]");
            println!("  restart <Virtual-01..03>");
            println!("  set-ready <Virtual-01..03>");
            println!("  reset <Virtual-01..03>");
            println!("  stop [Native|Virtual-01..03]");
        }
    }

    Ok(())
}

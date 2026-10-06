use m_bedrock_virtual_clients_core::{client::ClientId, VirtualClients};

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
    let app = VirtualClients;
    let mut args = std::env::args().skip(1);
    let command = args.next().unwrap_or_else(|| "help".to_string());

    match command.as_str() {
        "doctor" => print_json(&app.doctor())?,
        "check-update" => print_json(&app.check_update()?)?,
        "register-base" => print_json(&app.register_base()?)?,
        "provision" => print_json(&app.provision()?)?,
        "status" => print_json(&app.status()?)?,
        "resources" => {
            let count = args
                .next()
                .ok_or("virtual client count is required")?
                .parse::<usize>()?;
            print_json(&app.resources(count)?)?;
        }
        "reprovision" => {
            let client = parse_client(&args.next().ok_or("client id is required")?)?;
            print_json(&app.reprovision(client)?)?;
        }
        "start" => {
            let count = args
                .next()
                .ok_or("virtual client count is required")?
                .parse::<usize>()?;
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
            let client = parse_client(&args.next().ok_or("client id is required")?)?;
            print_json(&app.restart(client)?)?;
        }
        "set-ready" => {
            let client = parse_client(&args.next().ok_or("client id is required")?)?;
            print_json(&app.set_ready(client)?)?;
        }
        "reset" => {
            let client = parse_client(&args.next().ok_or("client id is required")?)?;
            print_json(&app.reset(client)?)?;
        }
        "open" => {
            let client = parse_client(&args.next().ok_or("client id is required")?)?;
            print_json(&app.open(client)?)?;
        }
        _ => {
            println!("M-Bedrock Virtual Clients");
            println!("  doctor");
            println!("  check-update");
            println!("  register-base");
            println!("  provision");
            println!("  status");
            println!("  resources <1-3>");
            println!("  reprovision <Virtual-01..03>");
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

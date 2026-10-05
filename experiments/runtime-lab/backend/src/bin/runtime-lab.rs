use m_bedrock_runtime_lab_core::{client::ClientId, RuntimeLab};

fn parse_client(value: &str) -> Result<ClientId, String> {
    match value {
        "MCE-01" => Ok(ClientId::Mce01),
        "MCE-02" => Ok(ClientId::Mce02),
        "MCE-03" => Ok(ClientId::Mce03),
        "MCE-04" => Ok(ClientId::Mce04),
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
        "reprovision" => {
            let client = parse_client(&args.next().ok_or("client id is required")?)?;
            print_json(&lab.reprovision(client)?)?;
        }
        "start" => {
            let count = args.next().ok_or("client count is required")?.parse::<usize>()?;
            print_json(&lab.start(count)?)?;
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
            println!("  reprovision <MCE-02..04>");
            println!("  start <1-4>");
            println!("  open <MCE-01..04>");
            println!("  restart <MCE-02..04>");
            println!("  set-ready <MCE-02..04>");
            println!("  reset <MCE-02..04>");
            println!("  stop [MCE-01..04]");
        }
    }

    Ok(())
}

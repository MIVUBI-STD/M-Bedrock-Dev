#![forbid(unsafe_code)]

use m_bedrock_virtual_clients_core::execute_public_command;

fn print_help() {
    println!("M-Bedrock Virtual Clients");
    println!("  doctor");
    println!("  policy");
    println!("  actions");
    println!("  diagnostics");
    println!("  snapshot");
    println!("  support-bundle");
    println!("  history");
    println!("  check-update");
    println!("  stage-update");
    println!("  register-base");
    println!("  provision");
    println!("  status");
    println!("  resources <1-3>");
    println!("  verify-identities");
    println!("  reprovision <Virtual-01..03> --destroy-account-state");
    println!("  start <1-3>");
    println!("  start-setup <Virtual-01..03>");
    println!("  open <Virtual-01..03>");
    println!("  suspend [Virtual-01..03]");
    println!("  restart <Virtual-01..03>");
    println!("  set-ready <Virtual-01..03>");
    println!("  reset <Virtual-01..03>");
    println!("  stop [Virtual-01..03]");
}

fn main() {
    let mut args = std::env::args().skip(1);
    let command = args.next().unwrap_or_else(|| "help".to_string());
    if command == "help" || command == "--help" || command == "-h" {
        print_help();
        return;
    }

    let args = args.collect::<Vec<_>>();
    let result = execute_public_command(&command, &args);
    if result.success {
        println!("{}", result.json);
    } else {
        eprintln!("{}", result.json);
        std::process::exit(1);
    }
}

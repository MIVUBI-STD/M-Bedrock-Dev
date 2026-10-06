use m_bedrock_virtual_clients_core::{
    guest::{GuestStatus, GUEST_AGENT_PORT, GUEST_STATUS_SCHEMA},
    profile::native_minecraft_profile,
};
use std::{
    io::{Read, Write},
    net::{TcpListener, TcpStream},
};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let listener = TcpListener::bind(("0.0.0.0", GUEST_AGENT_PORT))?;

    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                let _ = handle(stream);
            }
            Err(error) => eprintln!("guest agent accept error: {error}"),
        }
    }

    Ok(())
}

fn handle(mut stream: TcpStream) -> Result<(), Box<dyn std::error::Error>> {
    let mut request = [0_u8; 2048];
    let size = stream.read(&mut request)?;
    let request = String::from_utf8_lossy(&request[..size]);
    let first_line = request.lines().next().unwrap_or_default();

    if first_line != "GET /status HTTP/1.1" {
        stream.write_all(
            b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
        )?;
        return Ok(());
    }

    let status = GuestStatus {
        schema: GUEST_STATUS_SCHEMA,
        agent_version: env!("CARGO_PKG_VERSION").to_string(),
        minecraft: native_minecraft_profile(),
    };
    let body = serde_json::to_string(&status)?;
    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body
    );
    stream.write_all(response.as_bytes())?;
    Ok(())
}

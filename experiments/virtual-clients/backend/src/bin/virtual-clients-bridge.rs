#![forbid(unsafe_code)]

use m_bedrock_virtual_clients_core::{handle_bridge_line, BridgeResponse};
use std::io::{self, BufRead, Write};

fn write_response(output: &mut impl Write, response: &BridgeResponse) -> io::Result<()> {
    serde_json::to_writer(&mut *output, response)
        .map_err(|error| io::Error::new(io::ErrorKind::Other, error))?;
    output.write_all(b"\n")?;
    output.flush()
}

fn main() -> io::Result<()> {
    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut input = stdin.lock();
    let mut output = stdout.lock();
    let mut line = String::new();

    loop {
        line.clear();
        let read = input.read_line(&mut line)?;
        if read == 0 {
            return Ok(());
        }

        while line.ends_with(['\n', '\r']) {
            line.pop();
        }
        if line.is_empty() {
            continue;
        }

        let response = handle_bridge_line(&line);
        write_response(&mut output, &response)?;
    }
}

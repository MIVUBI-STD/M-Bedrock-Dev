#![forbid(unsafe_code)]
#![cfg_attr(target_os = "windows", windows_subsystem = "windows")]

#[cfg(not(target_os = "windows"))]
fn main() {
    eprintln!("M-Bedrock Virtual Clients desktop host is currently supported on Windows only.");
}

#[cfg(target_os = "windows")]
mod windows_host {
    use getrandom::getrandom;
    use serde::{Deserialize, Serialize};
    use std::{
        collections::HashMap,
        env,
        fs,
        io::{self, BufRead, BufReader, Read, Write},
        net::{TcpListener, TcpStream},
        path::{Path, PathBuf},
        process::{Child, ChildStdin, ChildStdout, Command, Stdio},
        sync::{
            atomic::{AtomicBool, AtomicU64, Ordering},
            Arc, Mutex,
        },
        thread,
        time::{Duration, SystemTime, UNIX_EPOCH},
    };

    const MAX_HTTP_BODY_BYTES: usize = 64 * 1024;
    const MAX_HTTP_HEADER_BYTES: usize = 32 * 1024;
    const HEARTBEAT_TIMEOUT_MS: u64 = 30_000;

    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct InvokeRequest {
        command: String,
        #[serde(default)]
        args: Vec<String>,
    }

    #[derive(Debug, Serialize)]
    #[serde(rename_all = "camelCase")]
    struct BridgeRequest<'a> {
        schema: u32,
        request_id: u64,
        command: &'a str,
        args: &'a [String],
    }

    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct BridgeResponse {
        schema: u32,
        request_id: Option<u64>,
        success: bool,
        payload: String,
    }

    struct BridgeProcess {
        child: Child,
        stdin: ChildStdin,
        stdout: BufReader<ChildStdout>,
        next_request_id: u64,
    }

    impl BridgeProcess {
        fn spawn(path: &Path) -> io::Result<Self> {
            let mut child = Command::new(path)
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::null())
                .spawn()?;
            let stdin = child
                .stdin
                .take()
                .ok_or_else(|| io::Error::other("bridge stdin is unavailable"))?;
            let stdout = child
                .stdout
                .take()
                .ok_or_else(|| io::Error::other("bridge stdout is unavailable"))?;
            Ok(Self {
                child,
                stdin,
                stdout: BufReader::new(stdout),
                next_request_id: 1,
            })
        }

        fn invoke(&mut self, command: &str, args: &[String]) -> io::Result<String> {
            if let Some(status) = self.child.try_wait()? {
                return Err(io::Error::new(
                    io::ErrorKind::BrokenPipe,
                    format!("backend bridge exited with {status}"),
                ));
            }

            let request_id = self.next_request_id;
            self.next_request_id = self.next_request_id.saturating_add(1);
            let request = BridgeRequest {
                schema: 1,
                request_id,
                command,
                args,
            };
            serde_json::to_writer(&mut self.stdin, &request).map_err(io::Error::other)?;
            self.stdin.write_all(b"\n")?;
            self.stdin.flush()?;

            let mut line = String::new();
            let read = self.stdout.read_line(&mut line)?;
            if read == 0 {
                return Err(io::Error::new(
                    io::ErrorKind::UnexpectedEof,
                    "backend bridge closed its response stream",
                ));
            }

            let response: BridgeResponse =
                serde_json::from_str(line.trim_end()).map_err(io::Error::other)?;
            if response.schema != 1 || response.request_id != Some(request_id) {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    "backend bridge response identity does not match the request",
                ));
            }
            let _ = response.success;
            Ok(response.payload)
        }
    }

    impl Drop for BridgeProcess {
        fn drop(&mut self) {
            let _ = self.child.kill();
            let _ = self.child.wait();
        }
    }

    struct HttpRequest {
        method: String,
        path: String,
        headers: HashMap<String, String>,
        body: Vec<u8>,
    }

    pub fn run() -> io::Result<()> {
        let layout = InstalledLayout::discover()?;
        if env::args().skip(1).any(|arg| arg == "--probe") {
            return probe(&layout);
        }

        let bridge = Arc::new(Mutex::new(BridgeProcess::spawn(&layout.bridge_exe)?));
        let token = random_token()?;
        let listener = TcpListener::bind(("127.0.0.1", 0))?;
        listener.set_nonblocking(true)?;
        let address = listener.local_addr()?;
        let origin = format!("http://127.0.0.1:{}", address.port());
        let base_path = format!("/{token}/");
        let url = format!("{origin}{base_path}");

        let shutdown = Arc::new(AtomicBool::new(false));
        let last_heartbeat = Arc::new(AtomicU64::new(now_ms()));
        let heartbeat_seen = Arc::new(AtomicBool::new(false));

        launch_edge(&url, &layout.runtime_root)?;

        while !shutdown.load(Ordering::Relaxed) {
            if heartbeat_seen.load(Ordering::Relaxed)
                && now_ms().saturating_sub(last_heartbeat.load(Ordering::Relaxed))
                    > HEARTBEAT_TIMEOUT_MS
            {
                break;
            }

            match listener.accept() {
                Ok((stream, _)) => {
                    let ui_root = layout.ui_root.clone();
                    let bridge = Arc::clone(&bridge);
                    let shutdown = Arc::clone(&shutdown);
                    let last_heartbeat = Arc::clone(&last_heartbeat);
                    let heartbeat_seen = Arc::clone(&heartbeat_seen);
                    let token = token.clone();
                    let origin = origin.clone();
                    thread::spawn(move || {
                        let _ = handle_connection(
                            stream,
                            &ui_root,
                            &token,
                            &origin,
                            bridge,
                            shutdown,
                            last_heartbeat,
                            heartbeat_seen,
                        );
                    });
                }
                Err(error) if error.kind() == io::ErrorKind::WouldBlock => {
                    thread::sleep(Duration::from_millis(75));
                }
                Err(error) => return Err(error),
            }
        }

        Ok(())
    }

    fn probe(layout: &InstalledLayout) -> io::Result<()> {
        if !layout.ui_root.join("index.html").is_file() {
            return Err(io::Error::new(
                io::ErrorKind::NotFound,
                "packaged Virtual Clients UI index is missing",
            ));
        }
        let mut bridge = BridgeProcess::spawn(&layout.bridge_exe)?;
        let payload = bridge.invoke("policy", &[])?;
        let value: serde_json::Value = serde_json::from_str(&payload).map_err(io::Error::other)?;
        if value.get("schema").and_then(|value| value.as_u64()) != Some(1)
            || value.get("data").is_none()
        {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "backend bridge policy probe did not return public contract schema 1",
            ));
        }
        Ok(())
    }

    struct InstalledLayout {
        ui_root: PathBuf,
        bridge_exe: PathBuf,
        runtime_root: PathBuf,
    }

    impl InstalledLayout {
        fn discover() -> io::Result<Self> {
            let executable = env::current_exe()?;
            let root = executable
                .parent()
                .ok_or_else(|| io::Error::other("desktop host install directory is unavailable"))?;
            let ui_root = root.join("ui");
            let bridge_exe = root.join("bridge").join("virtual-clients-bridge.exe");
            if !ui_root.join("index.html").is_file() {
                return Err(io::Error::new(
                    io::ErrorKind::NotFound,
                    "Virtual Clients UI is not installed beside the desktop host",
                ));
            }
            if !bridge_exe.is_file() {
                return Err(io::Error::new(
                    io::ErrorKind::NotFound,
                    "Virtual Clients backend bridge is not installed beside the desktop host",
                ));
            }
            let local = env::var_os("LOCALAPPDATA")
                .map(PathBuf::from)
                .ok_or_else(|| io::Error::other("LOCALAPPDATA is unavailable"))?;
            Ok(Self {
                ui_root,
                bridge_exe,
                runtime_root: local.join("M-Bedrock").join("VirtualClients"),
            })
        }
    }

    fn handle_connection(
        mut stream: TcpStream,
        ui_root: &Path,
        token: &str,
        origin: &str,
        bridge: Arc<Mutex<BridgeProcess>>,
        shutdown: Arc<AtomicBool>,
        last_heartbeat: Arc<AtomicU64>,
        heartbeat_seen: Arc<AtomicBool>,
    ) -> io::Result<()> {
        stream.set_read_timeout(Some(Duration::from_secs(10)))?;
        stream.set_write_timeout(Some(Duration::from_secs(10)))?;
        let request = read_http_request(&stream)?;
        let prefix = format!("/{token}/");
        if !request.path.starts_with(&prefix) {
            return write_response(&mut stream, 404, "text/plain; charset=utf-8", b"Not Found");
        }

        let relative = &request.path[prefix.len()..];
        match (request.method.as_str(), relative) {
            ("POST", "invoke") => {
                if let Some(request_origin) = request.headers.get("origin") {
                    if request_origin != origin {
                        return write_response(
                            &mut stream,
                            403,
                            "application/json; charset=utf-8",
                            host_error_json(
                                "HOST_ORIGIN_REJECTED",
                                "Desktop host rejected a cross-origin request.",
                                false,
                            )
                            .as_bytes(),
                        );
                    }
                }

                let invocation: InvokeRequest = match serde_json::from_slice(&request.body) {
                    Ok(value) => value,
                    Err(_) => {
                        return write_response(
                            &mut stream,
                            400,
                            "application/json; charset=utf-8",
                            host_error_json(
                                "HOST_REQUEST_INVALID",
                                "Desktop host request is not valid JSON.",
                                false,
                            )
                            .as_bytes(),
                        )
                    }
                };

                let payload = match bridge.lock() {
                    Ok(mut bridge) => bridge.invoke(&invocation.command, &invocation.args),
                    Err(_) => Err(io::Error::other("backend bridge lock is unavailable")),
                }
                .unwrap_or_else(|error| {
                    host_error_json(
                        "BACKEND_BRIDGE_UNAVAILABLE",
                        &format!("Backend bridge unavailable: {error}"),
                        true,
                    )
                });
                write_response(
                    &mut stream,
                    200,
                    "application/json; charset=utf-8",
                    payload.as_bytes(),
                )
            }
            ("POST", "heartbeat") => {
                heartbeat_seen.store(true, Ordering::Relaxed);
                last_heartbeat.store(now_ms(), Ordering::Relaxed);
                write_response(&mut stream, 204, "text/plain; charset=utf-8", b"")
            }
            ("POST", "close") => {
                shutdown.store(true, Ordering::Relaxed);
                write_response(&mut stream, 204, "text/plain; charset=utf-8", b"")
            }
            ("GET", "host.js") => write_response(
                &mut stream,
                200,
                "text/javascript; charset=utf-8",
                HOST_JS.as_bytes(),
            ),
            ("GET", "") | ("GET", "index.html") => {
                let source = fs::read_to_string(ui_root.join("index.html"))?;
                let injected = source.replacen(
                    "<head>",
                    "<head><script src=\"./host.js\"></script>",
                    1,
                );
                write_response(
                    &mut stream,
                    200,
                    "text/html; charset=utf-8",
                    injected.as_bytes(),
                )
            }
            ("GET", path) => serve_static(&mut stream, ui_root, path),
            _ => write_response(&mut stream, 405, "text/plain; charset=utf-8", b"Method Not Allowed"),
        }
    }

    fn read_http_request(stream: &TcpStream) -> io::Result<HttpRequest> {
        let mut reader = BufReader::new(stream.try_clone()?);
        let mut first = String::new();
        if reader.read_line(&mut first)? == 0 {
            return Err(io::Error::new(io::ErrorKind::UnexpectedEof, "empty HTTP request"));
        }
        if first.len() > MAX_HTTP_HEADER_BYTES {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "HTTP request line exceeds the host limit",
            ));
        }

        let mut parts = first.split_whitespace();
        let method = parts.next().unwrap_or_default().to_string();
        let raw_path = parts.next().unwrap_or_default();
        let path = raw_path.split('?').next().unwrap_or_default().to_string();
        if method.is_empty() || path.is_empty() || !path.starts_with('/') {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "HTTP request line is invalid",
            ));
        }

        let mut headers = HashMap::new();
        let mut header_bytes = first.len();
        loop {
            let mut line = String::new();
            reader.read_line(&mut line)?;
            header_bytes += line.len();
            if header_bytes > MAX_HTTP_HEADER_BYTES {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    "HTTP headers exceed the host limit",
                ));
            }
            if line == "\r\n" || line == "\n" || line.is_empty() {
                break;
            }
            if let Some((name, value)) = line.split_once(':') {
                headers.insert(name.trim().to_ascii_lowercase(), value.trim().to_string());
            }
        }

        let content_length = headers
            .get("content-length")
            .and_then(|value| value.parse::<usize>().ok())
            .unwrap_or(0);
        if content_length > MAX_HTTP_BODY_BYTES {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "HTTP body exceeds the desktop host limit",
            ));
        }
        let mut body = vec![0; content_length];
        reader.read_exact(&mut body)?;
        Ok(HttpRequest {
            method,
            path,
            headers,
            body,
        })
    }

    fn serve_static(stream: &mut TcpStream, ui_root: &Path, relative: &str) -> io::Result<()> {
        if relative.is_empty()
            || relative.contains("..")
            || relative.contains('\\')
            || relative.contains('%')
        {
            return write_response(stream, 404, "text/plain; charset=utf-8", b"Not Found");
        }
        let root = fs::canonicalize(ui_root)?;
        let candidate = fs::canonicalize(root.join(relative));
        let path = match candidate {
            Ok(path) if path.starts_with(&root) && path.is_file() => path,
            _ => return write_response(stream, 404, "text/plain; charset=utf-8", b"Not Found"),
        };
        let body = fs::read(&path)?;
        write_response(stream, 200, mime_for(&path), &body)
    }

    fn write_response(
        stream: &mut TcpStream,
        status: u16,
        content_type: &str,
        body: &[u8],
    ) -> io::Result<()> {
        let reason = match status {
            200 => "OK",
            204 => "No Content",
            400 => "Bad Request",
            403 => "Forbidden",
            404 => "Not Found",
            405 => "Method Not Allowed",
            _ => "Error",
        };
        let headers = format!(
            "HTTP/1.1 {status} {reason}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nReferrer-Policy: no-referrer\r\nContent-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none';\r\nConnection: close\r\n\r\n",
            body.len()
        );
        stream.write_all(headers.as_bytes())?;
        stream.write_all(body)?;
        stream.flush()
    }

    fn mime_for(path: &Path) -> &'static str {
        match path.extension().and_then(|value| value.to_str()).unwrap_or_default() {
            "js" => "text/javascript; charset=utf-8",
            "css" => "text/css; charset=utf-8",
            "json" => "application/json; charset=utf-8",
            "svg" => "image/svg+xml",
            "png" => "image/png",
            "jpg" | "jpeg" => "image/jpeg",
            "webp" => "image/webp",
            "ico" => "image/x-icon",
            "woff2" => "font/woff2",
            _ => "application/octet-stream",
        }
    }

    fn host_error_json(code: &str, message: &str, retryable: bool) -> String {
        serde_json::json!({
            "schema": 1,
            "code": code,
            "message": message,
            "retryable": retryable
        })
        .to_string()
    }

    fn random_token() -> io::Result<String> {
        let mut bytes = [0_u8; 24];
        getrandom(&mut bytes).map_err(io::Error::other)?;
        let mut token = String::with_capacity(bytes.len() * 2);
        for byte in bytes {
            use std::fmt::Write as _;
            let _ = write!(token, "{byte:02x}");
        }
        Ok(token)
    }

    fn now_ms() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
            .try_into()
            .unwrap_or(u64::MAX)
    }

    fn launch_edge(url: &str, runtime_root: &Path) -> io::Result<()> {
        fs::create_dir_all(runtime_root)?;
        let profile = runtime_root.join("desktop-edge-profile");
        fs::create_dir_all(&profile)?;
        let edge = find_edge().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "Microsoft Edge is required to open the Virtual Clients desktop window",
            )
        })?;
        Command::new(edge)
            .arg(format!("--app={url}"))
            .arg(format!("--user-data-dir={}", profile.display()))
            .arg("--no-first-run")
            .arg("--disable-extensions")
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()?;
        Ok(())
    }

    fn find_edge() -> Option<PathBuf> {
        let mut candidates = Vec::new();
        if let Some(value) = env::var_os("PROGRAMFILES(X86)") {
            candidates.push(
                PathBuf::from(value)
                    .join("Microsoft")
                    .join("Edge")
                    .join("Application")
                    .join("msedge.exe"),
            );
        }
        if let Some(value) = env::var_os("PROGRAMFILES") {
            candidates.push(
                PathBuf::from(value)
                    .join("Microsoft")
                    .join("Edge")
                    .join("Application")
                    .join("msedge.exe"),
            );
        }
        if let Some(value) = env::var_os("LOCALAPPDATA") {
            candidates.push(
                PathBuf::from(value)
                    .join("Microsoft")
                    .join("Edge")
                    .join("Application")
                    .join("msedge.exe"),
            );
        }
        candidates.into_iter().find(|path| path.is_file())
    }

    const HOST_JS: &str = r#"(() => {
  const invoke = async (command, args = []) => {
    const response = await fetch("./invoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, args })
    });
    const body = await response.text();
    if (!body) {
      throw new Error("Desktop host returned an empty backend response.");
    }
    return body;
  };

  Object.defineProperty(window, "virtualClients", {
    value: Object.freeze({ invoke }),
    enumerable: false,
    configurable: false,
    writable: false
  });

  const heartbeat = () => {
    fetch("./heartbeat", { method: "POST", keepalive: true }).catch(() => {});
  };
  heartbeat();
  setInterval(heartbeat, 5000);
  addEventListener("pagehide", () => {
    navigator.sendBeacon("./close", "");
  }, { once: true });
})();"#;
}

#[cfg(target_os = "windows")]
fn main() {
    if let Err(error) = windows_host::run() {
        let root = std::env::var_os("LOCALAPPDATA")
            .map(std::path::PathBuf::from)
            .unwrap_or_else(std::env::temp_dir)
            .join("M-Bedrock")
            .join("VirtualClients");
        let _ = std::fs::create_dir_all(&root);
        let _ = std::fs::write(root.join("desktop-host-error.log"), format!("{error}\n"));
        std::process::exit(1);
    }
}

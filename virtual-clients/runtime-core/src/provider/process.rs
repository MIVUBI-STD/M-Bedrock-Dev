use std::{
    ffi::OsStr,
    io,
    path::Path,
    process::{Command, Stdio},
    thread,
    time::{Duration, Instant},
};

const COMMAND_TIMEOUT: Duration = Duration::from_secs(45);

pub(crate) fn command_output<I, S>(program: &Path, args: I) -> io::Result<String>
where
    I: IntoIterator<Item = S>,
    S: AsRef<OsStr>,
{
    command_output_with_timeout(program, args, COMMAND_TIMEOUT)
}

pub(crate) fn command_output_with_timeout<I, S>(
    program: &Path,
    args: I,
    timeout: Duration,
) -> io::Result<String>
where
    I: IntoIterator<Item = S>,
    S: AsRef<OsStr>,
{
    let mut child = Command::new(program)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;

    let started = Instant::now();
    loop {
        if child.try_wait()?.is_some() {
            let output = child.wait_with_output()?;
            return require_success(program, output.status.success(), &output.stdout, &output.stderr);
        }
        if started.elapsed() >= timeout {
            let kill_result = child.kill();
            let wait_result = child.wait();
            // A failed wait leaves process termination unconfirmed. Do not present
            // that situation as an ordinary, safely recovered command timeout.
            if let Err(error) = wait_result {
                return Err(io::Error::new(
                    error.kind(),
                    format!("{} timed out; child termination could not be confirmed: {error}", program.display()),
                ));
            }
            if let Err(error) = kill_result {
                return Err(io::Error::new(
                    error.kind(),
                    format!("{} timed out; child kill failed: {error}", program.display()),
                ));
            }
            return Err(io::Error::new(
                io::ErrorKind::TimedOut,
                format!("{} exceeded {}s timeout; child process reaped", program.display(), timeout.as_secs()),
            ));
        }
        thread::sleep(Duration::from_millis(100));
    }
}

fn require_success(program: &Path, success: bool, stdout: &[u8], stderr: &[u8]) -> io::Result<String> {
    if success {
        return Ok(String::from_utf8_lossy(stdout).trim().to_string());
    }
    let stderr = String::from_utf8_lossy(stderr).trim().to_string();
    let stdout = String::from_utf8_lossy(stdout).trim().to_string();
    let detail = if !stderr.is_empty() { stderr } else { stdout };
    Err(io::Error::new(io::ErrorKind::Other, format!("{} failed: {}", program.display(), detail)))
}

pub(crate) fn wait_for_state<F>(mut predicate: F, expected: bool, timeout: Duration) -> io::Result<()>
where
    F: FnMut() -> io::Result<bool>,
{
    let started = Instant::now();
    loop {
        if predicate()? == expected { return Ok(()); }
        if started.elapsed() >= timeout {
            return Err(io::Error::new(io::ErrorKind::TimedOut, "virtual machine did not reach the expected power state"));
        }
        thread::sleep(Duration::from_millis(250));
    }
}

#[cfg(test)]
mod tests {
    use super::command_output_with_timeout;
    use std::{io, path::Path, time::Duration};

    #[test]
    fn timed_out_command_is_reaped_before_reporting_timeout() {
        #[cfg(windows)]
        let (program, args): (&Path, &[&str]) = (
            Path::new("cmd.exe"),
            &["/C", "ping -n 10 127.0.0.1 >NUL"],
        );
        #[cfg(not(windows))]
        let (program, args): (&Path, &[&str]) = (Path::new("sh"), &["-c", "sleep 5"]);

        let error = command_output_with_timeout(program, args.iter().copied(), Duration::from_millis(100))
            .expect_err("long-running command must time out");
        assert_eq!(error.kind(), io::ErrorKind::TimedOut);
        assert!(error.to_string().contains("child process reaped"));
    }
}

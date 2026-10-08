use std::{
    ffi::OsStr,
    io,
    path::Path,
    process::{Command, Stdio},
    thread,
    io::Read,
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

    // Drain both streams while the child is running. Waiting before reading can
    // deadlock when the child fills an OS pipe buffer.
    let stdout = child.stdout.take().ok_or_else(|| io::Error::new(io::ErrorKind::Other, "missing stdout pipe"))?;
    let stderr = child.stderr.take().ok_or_else(|| io::Error::new(io::ErrorKind::Other, "missing stderr pipe"))?;
    let stdout_reader = thread::spawn(move || drain_output(stdout));
    let stderr_reader = thread::spawn(move || drain_output(stderr));

    let started = Instant::now();
    loop {
        let observed_status = match child.try_wait() {
            Ok(status) => status,
            Err(error) => {
                // A failed status probe must not leave the child unmanaged.
                let kill_result = child.kill();
                let wait_result = child.wait();
                if let Err(cleanup_error) = wait_result {
                    return Err(io::Error::new(
                        cleanup_error.kind(),
                        format!("{} status check failed ({error}); child termination is unconfirmed: {cleanup_error}", program.display()),
                    ));
                }
                if let Err(cleanup_error) = kill_result {
                    return Err(io::Error::new(
                        cleanup_error.kind(),
                        format!("{} status check failed ({error}); child kill failed: {cleanup_error}", program.display()),
                    ));
                }
                return Err(error);
            }
        };
        if let Some(status) = observed_status {
            let stdout = join_output(stdout_reader)?;
            let stderr = join_output(stderr_reader)?;
            if stdout.len() > OUTPUT_LIMIT || stderr.len() > OUTPUT_LIMIT {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    format!("{} output exceeded {} bytes per stream; refusing truncated provider evidence", program.display(), OUTPUT_LIMIT),
                ));
            }
            return require_success(program, status.success(), &stdout, &stderr);
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

// Keep diagnostic memory bounded while still draining arbitrarily verbose tools.
const OUTPUT_LIMIT: usize = 64 * 1024;

fn drain_output(mut pipe: impl Read) -> io::Result<Vec<u8>> {
    let mut output = Vec::new();
    let mut chunk = [0_u8; 8192];
    loop {
        let count = pipe.read(&mut chunk)?;
        if count == 0 { break; }
        // Retain one sentinel byte so callers can distinguish truncated output.
        let remaining = (OUTPUT_LIMIT + 1).saturating_sub(output.len());
        output.extend_from_slice(&chunk[..count.min(remaining)]);
    }
    Ok(output)
}

fn join_output(reader: thread::JoinHandle<io::Result<Vec<u8>>>) -> io::Result<Vec<u8>> {
    reader.join().map_err(|_| io::Error::new(io::ErrorKind::Other, "command output reader panicked"))?
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
    fn output_drain_is_bounded_even_for_large_streams() {
        let input = vec![b'x'; super::OUTPUT_LIMIT * 4];
        let output = super::drain_output(std::io::Cursor::new(input)).unwrap();
        assert_eq!(output.len(), super::OUTPUT_LIMIT + 1);
        assert!(output.iter().all(|byte| *byte == b'x'));
    }

    #[test]
    fn verbose_command_does_not_block_on_full_pipes() {
        #[cfg(windows)]
        let (program, args): (&Path, &[&str]) = (
            Path::new("cmd.exe"),
            &["/C", "for /L %i in (1,1,12000) do @echo some-output-to-fill-the-pipe"],
        );
        #[cfg(not(windows))]
        let (program, args): (&Path, &[&str]) = (
            Path::new("sh"),
            &["-c", "yes some-output-to-fill-the-pipe | head -c 200000"],
        );
        let error = command_output_with_timeout(program, args.iter().copied(), Duration::from_secs(15))
            .expect_err("oversized command output must not be treated as complete");
        assert_eq!(error.kind(), io::ErrorKind::InvalidData);
        assert!(error.to_string().contains("refusing truncated provider evidence"));
    }

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

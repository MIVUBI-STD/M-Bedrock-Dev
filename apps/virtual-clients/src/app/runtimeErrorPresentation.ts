export interface RuntimeErrorPresentation {
  title: string;
  message: string;
  details?: string;
  retryable: boolean;
}

const copy: Record<string, { title: string; message: string }> = {
  INVALID_INPUT: {
    title: "Action unavailable",
    message: "This action is not available in the current client state.",
  },
  NOT_FOUND: {
    title: "Required component not found",
    message: "Virtual Clients could not find something required for this operation.",
  },
  PERMISSION_DENIED: {
    title: "Permission required",
    message: "Windows blocked this operation because additional permission is required.",
  },
  INVALID_DATA: {
    title: "Runtime data needs attention",
    message: "Virtual Clients found runtime state that does not match the expected configuration.",
  },
  OPERATION_BUSY: {
    title: "Another operation is running",
    message: "Finish the current operation, then try this action again.",
  },
  TIMEOUT: {
    title: "Operation took too long",
    message: "The virtual client did not reach the expected state in time.",
  },
  ALREADY_EXISTS: {
    title: "Already completed",
    message: "The requested state already exists.",
  },
  UNSUPPORTED: {
    title: "Not supported",
    message: "This operation is not supported on the current system.",
  },
  IO_FAILURE: {
    title: "Runtime communication failed",
    message: "A required filesystem, VMware, or guest communication step could not be completed.",
  },
  DESKTOP_OPERATION_FAILED: {
    title: "Desktop operation failed",
    message: "The desktop runtime could not complete this request.",
  },
  WINDOWS_NOT_FOUND: {
    title: "No client windows found",
    message: "Open at least one Minecraft or Virtual client window, then try Arrange again.",
  },
};

function errorShape(value: unknown): { code?: string; message: string; retryable?: boolean } {
  if (value instanceof Error) {
    const candidate = value as Error & { code?: unknown; retryable?: unknown };
    return {
      code: typeof candidate.code === "string" ? candidate.code : undefined,
      message: candidate.message,
      retryable: typeof candidate.retryable === "boolean" ? candidate.retryable : undefined,
    };
  }
  return { message: String(value) };
}

export function presentRuntimeError(value: unknown): RuntimeErrorPresentation {
  const shaped = errorShape(value);
  const mapped = shaped.code ? copy[shaped.code] : undefined;
  if (!mapped) {
    return {
      title: "Virtual Clients could not complete the request",
      message: "Review the technical detail below or open Help & Support.",
      details: shaped.message,
      retryable: shaped.retryable ?? false,
    };
  }

  return {
    ...mapped,
    details: shaped.message !== mapped.message ? shaped.message : undefined,
    retryable: shaped.retryable ?? false,
  };
}

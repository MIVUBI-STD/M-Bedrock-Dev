import type { SetupAction } from "../contracts.js";

export type SetupOwner = "APP" | "USER" | "CLIENTS" | "BLOCKED";

export interface SetupExperience {
  owner: SetupOwner;
  phase: "COMPUTER" | "ENVIRONMENT" | "CLIENTS" | "ACCOUNTS" | "READY";
  title: string;
  description: string;
  primaryLabel: string;
  steps: readonly string[];
}

const flows: Record<SetupAction, SetupExperience> = {
  RUNTIME_DATA_INCOMPATIBLE: {
    owner: "BLOCKED",
    phase: "COMPUTER",
    title: "App data needs repair",
    description: "The stored Virtual Clients data is not compatible with this version. Do not continue setup until the data is repaired.",
    primaryLabel: "Open Help & Support",
    steps: ["Keep the current data unchanged.", "Open Help & Support for the exact diagnostic state."],
  },
  INSTALL_PROVIDER: {
    owner: "USER",
    phase: "COMPUTER",
    title: "Install virtualization",
    description: "VMware Workstation is required before Virtual Clients can create or run virtual Minecraft clients.",
    primaryLabel: "I've installed it",
    steps: ["Install VMware Workstation.", "Open VMware once if Windows asks for first-run setup.", "Return here and continue."],
  },
  INSTALL_NATIVE_MINECRAFT: {
    owner: "USER",
    phase: "COMPUTER",
    title: "Install Minecraft Education",
    description: "Minecraft Education on this PC is the version reference for every virtual client.",
    primaryLabel: "I've installed it",
    steps: ["Install Minecraft Education on this PC.", "Launch it once if the installer requires first-run completion.", "Return here and continue."],
  },
  PREPARE_BASE: {
    owner: "USER",
    phase: "ENVIRONMENT",
    title: "Prepare the virtual environment",
    description: "Create the reusable Windows environment that Virtual Clients will clone. This is the only infrastructure-heavy setup step.",
    primaryLabel: "Environment prepared",
    steps: [
      "Create the Base VM with supported Windows and VMware Tools.",
      "Install Minecraft Education without an independent updater.",
      "Install the packaged Virtual Guest Agent and keep the Base signed out of Microsoft and Minecraft accounts.",
      "Shut down the Base, then continue.",
    ],
  },
  REGISTER_BASE: {
    owner: "APP",
    phase: "ENVIRONMENT",
    title: "Check the virtual environment",
    description: "Virtual Clients will boot the prepared environment briefly, verify Minecraft and the Guest Agent, then stop it again.",
    primaryLabel: "Check environment",
    steps: [],
  },
  FINALIZE_BASE: {
    owner: "USER",
    phase: "ENVIRONMENT",
    title: "Finish the virtual environment",
    description: "The prepared environment must complete its one-time Windows generalization before it can become the immutable source for virtual clients.",
    primaryLabel: "Finalization completed",
    steps: [
      "Boot the prepared Base only for this finalization step.",
      "Run the packaged finalization script inside the Base as Administrator.",
      "Allow Windows to generalize and shut down the Base.",
      "Do not boot the finalized Base again; return here and continue.",
    ],
  },
  REBUILD_BASE: {
    owner: "USER",
    phase: "ENVIRONMENT",
    title: "Rebuild the virtual environment",
    description: "The prepared environment is interrupted or no longer matches Minecraft Education on this PC. Reusing it would be unsafe.",
    primaryLabel: "Environment rebuilt",
    steps: [
      "Replace the existing prepared Base with a clean Base for the current Minecraft Education version.",
      "Repeat environment preparation and finalization.",
      "Return here after the new Base is fully stopped.",
    ],
  },
  PROVISION_VIRTUALS: {
    owner: "APP",
    phase: "CLIENTS",
    title: "Create virtual clients",
    description: "Virtual Clients will create Virtual 1, Virtual 2, and Virtual 3 from the finalized environment.",
    primaryLabel: "Create virtual clients",
    steps: [],
  },
  REPROVISION_VIRTUALS: {
    owner: "CLIENTS",
    phase: "CLIENTS",
    title: "Refresh outdated clients",
    description: "One or more virtual clients no longer match the current environment. Recreate only the affected clients.",
    primaryLabel: "Review clients",
    steps: [],
  },
  VERIFY_IDENTITIES: {
    owner: "CLIENTS",
    phase: "CLIENTS",
    title: "Complete first boot",
    description: "Each virtual client must finish Windows first boot before Virtual Clients can confirm that all client identities are unique.",
    primaryLabel: "Open clients",
    steps: [
      "Start the virtual clients.",
      "Complete Windows first-run setup in each client if Windows asks.",
      "When all three clients are running, use Check clients.",
    ],
  },
  CREATE_READY_SNAPSHOTS: {
    owner: "CLIENTS",
    phase: "ACCOUNTS",
    title: "Set up accounts",
    description: "Sign in once on each virtual client, then save its recovery point. Account sessions remain inside each virtual machine.",
    primaryLabel: "Open clients",
    steps: [
      "Open one virtual client.",
      "Sign in to Minecraft Education and confirm the main menu appears.",
      "Stop that client and choose Save recovery point.",
      "Repeat for the remaining clients.",
    ],
  },
  READY: {
    owner: "APP",
    phase: "READY",
    title: "Virtual Clients is ready",
    description: "Setup is complete. Normal use starts from Clients.",
    primaryLabel: "Open clients",
    steps: [],
  },
};

export function setupExperience(action: SetupAction): SetupExperience {
  return flows[action];
}

export function setupPhaseIndex(action: SetupAction): number {
  const phase = setupExperience(action).phase;
  return phase === "COMPUTER" ? 0 : phase === "ENVIRONMENT" ? 1 : phase === "CLIENTS" ? 2 : 3;
}
